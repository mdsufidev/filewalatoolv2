import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  applyActionCode,
  checkActionCode,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAINPVDbyIx8FMf1Z89jH43iVzIGEWbPqg",
  authDomain: "promptwala-9146f.firebaseapp.com",
  projectId: "promptwala-9146f",
  storageBucket: "promptwala-9146f.firebasestorage.app",
  messagingSenderId: "224103029912",
  appId: "1:224103029912:web:bf88216e5e2db6ff5dc4ed",
  measurementId: "G-73LNWXRH44"
};

// Initialize Firebase (guard against re-initialization)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth, Google Provider & Firestore
export const auth = getAuth(app);

// Explicitly ensure local persistence so user session survives page reloads & hard refresh
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase auth persistence setup notice:', err);
  });
}

export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Analytics safely
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((yes) => {
      if (yes) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics unsupported
    });
}

// =========================================================================
// ADMIN RECOGNITION & PERMISSIONS
// =========================================================================
export const DEFAULT_ADMIN_EMAILS: string[] = [
  'sufi111729@gmail.com',
];

export function checkIsAdmin(email?: string | null, role?: string | null): boolean {
  if (role === 'admin') return true;
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  if (DEFAULT_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === cleanEmail)) {
    return true;
  }
  try {
    const localAdmins = JSON.parse(localStorage.getItem('filewala_admin_emails') || '[]');
    if (Array.isArray(localAdmins) && localAdmins.includes(cleanEmail)) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function grantLocalAdmin(email: string): void {
  try {
    const clean = email.toLowerCase().trim();
    const existing = JSON.parse(localStorage.getItem('filewala_admin_emails') || '[]');
    if (!existing.includes(clean)) {
      existing.push(clean);
      localStorage.setItem('filewala_admin_emails', JSON.stringify(existing));
    }
  } catch {
    // ignore
  }
}

export function revokeLocalAdmin(email: string): void {
  try {
    const clean = email.toLowerCase().trim();
    const existing = JSON.parse(localStorage.getItem('filewala_admin_emails') || '[]');
    const filtered = existing.filter((e: string) => e !== clean);
    localStorage.setItem('filewala_admin_emails', JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

// User Profile interface aligned with App state
export interface AuthUserProfile {
  uid: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string;
  role?: 'admin' | 'user';
}

export const AUTH_STORAGE_KEY = 'filewala_auth_user';

export function getStoredAuthUser(): AuthUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUserProfile;
  } catch {
    return null;
  }
}

export function saveStoredAuthUser(user: AuthUserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearStoredAuthUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function formatFirebaseUser(user: User, role?: 'admin' | 'user'): AuthUserProfile {
  const displayName =
    user.displayName ||
    user.providerData?.find((p) => Boolean(p.displayName))?.displayName ||
    (user.email ? user.email.split('@')[0] : 'User');

  // Extract avatar URL with providerData fallback (Google OAuth profile pictures)
  let avatarUrl: string | undefined = user.photoURL || undefined;
  if (!avatarUrl && user.providerData && user.providerData.length > 0) {
    const providerWithPhoto = user.providerData.find((p) => Boolean(p.photoURL));
    if (providerWithPhoto?.photoURL) {
      avatarUrl = providerWithPhoto.photoURL;
    }
  }

  const isAdmin = checkIsAdmin(user.email, role);
  return {
    uid: user.uid,
    name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
    email: user.email || '',
    emailVerified: Boolean(user.emailVerified),
    avatarUrl,
    role: isAdmin ? 'admin' : (role || 'user'),
  };
}

// =========================================================================
// FIRESTORE USER PROFILE & SYNC WITH LOCAL FALLBACK RESILIENCE
// =========================================================================
export interface AppUserRecord {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  emailVerified: boolean;
  avatarUrl?: string;
  createdAt?: any;
  lastLoginAt?: any;
}

const LOCAL_USERS_KEY = 'filewala_registered_users';

export function getLocalUsersRegistry(): AppUserRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUserRegistry(user: AppUserRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalUsersRegistry();
    const idx = existing.findIndex(
      (u) =>
        (u.uid && u.uid === user.uid) ||
        (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
    );
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...user };
    } else {
      existing.unshift(user);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export function removeLocalUserRegistry(uid: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalUsersRegistry().filter((u) => u.uid !== uid);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export async function syncUserToFirestore(user: AuthUserProfile): Promise<AppUserRecord> {
  const isAdmin = checkIsAdmin(user.email, user.role);
  const fallbackRecord: AppUserRecord = {
    uid: user.uid,
    name: user.name,
    email: user.email,
    role: isAdmin ? 'admin' : (user.role || 'user'),
    status: 'active',
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    lastLoginAt: new Date().toISOString(),
  };

  // Always persist locally first so Admin Panel immediately sees user
  saveLocalUserRegistry(fallbackRecord);

  // Then sync to Cloud Firestore
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const existing = snap.data() as AppUserRecord;
      const updatedRole = existing.role === 'admin' || isAdmin ? 'admin' : existing.role || 'user';
      const updated: Partial<AppUserRecord> = {
        name: user.name || existing.name,
        email: user.email || existing.email,
        avatarUrl: user.avatarUrl || existing.avatarUrl,
        emailVerified: user.emailVerified,
        role: updatedRole,
        lastLoginAt: serverTimestamp(),
      };
      await updateDoc(userRef, updated);
      const finalRec = { ...existing, ...updated } as AppUserRecord;
      saveLocalUserRegistry(finalRec);
      return finalRec;
    } else {
      const newRecord: AppUserRecord = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: isAdmin ? 'admin' : 'user',
        status: 'active',
        emailVerified: user.emailVerified,
        avatarUrl: user.avatarUrl,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };
      await setDoc(userRef, newRecord);
      saveLocalUserRegistry(newRecord);
      return newRecord;
    }
  } catch {
    return fallbackRecord;
  }
}

// =========================================================================
// CONTACT US INQUIRIES API (WITH LOCAL RESILIENCE & 30-DAY AUTO-CLEANUP)
// =========================================================================
export interface ContactInquiry {
  id?: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  userId?: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt?: any;
  expiresAt?: any; // Automatically calculated 30 days from creation
}

const LOCAL_CONTACT_KEY = 'filewala_contact_messages';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getLocalContactMessages(): ContactInquiry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_CONTACT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalContactMessage(msg: ContactInquiry): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalContactMessages();
    existing.unshift(msg);
    localStorage.setItem(LOCAL_CONTACT_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export async function saveContactMessage(
  data: Omit<ContactInquiry, 'status' | 'createdAt' | 'expiresAt'>
): Promise<string> {
  const localId = `local-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const expiresAtDate = new Date(Date.now() + THIRTY_DAYS_MS);

  const localMsg: ContactInquiry = {
    ...data,
    id: localId,
    status: 'unread',
    createdAt: new Date().toISOString(),
    expiresAt: expiresAtDate.toISOString(),
  };
  saveLocalContactMessage(localMsg);

  try {
    const docRef = await addDoc(collection(db, 'contact_messages'), {
      ...data,
      status: 'unread',
      createdAt: serverTimestamp(),
      expiresAt: expiresAtDate,
    });
    return docRef.id;
  } catch {
    return localId;
  }
}

export async function autoCleanupExpiredContactMessages(): Promise<number> {
  const now = Date.now();
  let deletedCount = 0;

  // 1. Clean local messages older than 30 days (1 month)
  try {
    const existing = getLocalContactMessages();
    const valid = existing.filter((m) => {
      let createdTime = now;
      if (m.createdAt) {
        createdTime = typeof m.createdAt === 'string' ? new Date(m.createdAt).getTime() : now;
      }
      const isExpired = now - createdTime > THIRTY_DAYS_MS;
      if (isExpired) deletedCount++;
      return !isExpired;
    });
    if (deletedCount > 0) {
      localStorage.setItem(LOCAL_CONTACT_KEY, JSON.stringify(valid));
    }
  } catch {
    // ignore
  }

  // 2. Clean Firestore messages older than 30 days
  try {
    const thirtyDaysAgo = new Date(now - THIRTY_DAYS_MS);
    const q = query(
      collection(db, 'contact_messages'),
      where('createdAt', '<', thirtyDaysAgo)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, 'contact_messages', d.id));
        deletedCount++;
      }
    }
  } catch {
    // ignore
  }

  return deletedCount;
}

export async function fetchContactMessages(): Promise<ContactInquiry[]> {
  // Fire 30-day auto cleanup in the background
  autoCleanupExpiredContactMessages().catch(() => {});

  const local = getLocalContactMessages();
  try {
    let snapshot;
    try {
      const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
      snapshot = await getDocs(q);
    } catch {
      snapshot = await getDocs(collection(db, 'contact_messages'));
    }
    if (snapshot && !snapshot.empty) {
      return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ContactInquiry));
    }
  } catch (err) {
    console.warn('Firestore fetchContactMessages fallback active:', err);
  }
  return local;
}

export async function updateContactStatus(
  id: string,
  status: 'unread' | 'read' | 'resolved'
): Promise<void> {
  // Update local
  try {
    const msgs = getLocalContactMessages().map((m) =>
      m.id === id ? { ...m, status } : m
    );
    localStorage.setItem(LOCAL_CONTACT_KEY, JSON.stringify(msgs));
  } catch {
    // ignore
  }

  // Update Firestore
  try {
    if (!id.startsWith('local-msg-')) {
      await updateDoc(doc(db, 'contact_messages', id), { status });
    }
  } catch {
    // ignore
  }
}

export async function deleteContactMessage(id: string): Promise<void> {
  // Delete local
  try {
    const msgs = getLocalContactMessages().filter((m) => m.id !== id);
    localStorage.setItem(LOCAL_CONTACT_KEY, JSON.stringify(msgs));
  } catch {
    // ignore
  }

  // Delete Firestore
  try {
    if (!id.startsWith('local-msg-')) {
      await deleteDoc(doc(db, 'contact_messages', id));
    }
  } catch {
    // ignore
  }
}

// =========================================================================
// USER FILE MANAGEMENT API (Per User File Records with Local Fallback)
// =========================================================================
export interface UserFileRecord {
  id?: string;
  userId: string;
  userEmail?: string;
  fileName: string;
  fileSize: number; // in bytes
  fileType: string;
  category?: string;
  fileDataUrl?: string; // Preview data URL or storage reference
  downloadUrl?: string;
  uploadedAt?: any;
  toolUsed?: string;
  notes?: string;
}

const LOCAL_FILES_KEY = 'filewala_admin_files';

export function getLocalUserFiles(userId?: string): UserFileRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_FILES_KEY);
    const all = raw ? (JSON.parse(raw) as UserFileRecord[]) : [];
    return userId ? all.filter((f) => f.userId === userId) : all;
  } catch {
    return [];
  }
}

export function saveLocalUserFile(file: UserFileRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getLocalUserFiles();
    all.unshift(file);
    localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function deleteLocalUserFile(fileId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getLocalUserFiles().filter((f) => f.id !== fileId);
    localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export async function fetchUserFiles(userId: string): Promise<UserFileRecord[]> {
  try {
    const q = query(collection(db, 'user_files'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as UserFileRecord));
    }
  } catch {
    // ignore
  }
  return getLocalUserFiles(userId);
}

export async function fetchAllFiles(): Promise<UserFileRecord[]> {
  try {
    let snapshot;
    try {
      const q = query(collection(db, 'user_files'), orderBy('uploadedAt', 'desc'));
      snapshot = await getDocs(q);
    } catch {
      snapshot = await getDocs(collection(db, 'user_files'));
    }
    if (snapshot && !snapshot.empty) {
      return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as UserFileRecord));
    }
  } catch {
    // ignore
  }
  return getLocalUserFiles();
}

export async function saveUserFileRecord(
  record: Omit<UserFileRecord, 'id' | 'uploadedAt'>
): Promise<string> {
  const localId = `local-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fileWithId: UserFileRecord = {
    ...record,
    id: localId,
    uploadedAt: new Date().toISOString(),
  };
  saveLocalUserFile(fileWithId);

  try {
    const docRef = await addDoc(collection(db, 'user_files'), {
      ...record,
      uploadedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch {
    return localId;
  }
}

export async function deleteUserFileRecord(fileId: string): Promise<void> {
  deleteLocalUserFile(fileId);
  try {
    if (!fileId.startsWith('local-file-')) {
      await deleteDoc(doc(db, 'user_files', fileId));
    }
  } catch {
    // ignore
  }
}

// =========================================================================
// ADMIN USER CRUD API (Merged Cloud Firestore + Resilient Local Store)
// =========================================================================
export async function fetchAllUsers(): Promise<AppUserRecord[]> {
  const usersMap = new Map<string, AppUserRecord>();

  // 1. Load local registry users first
  const localList = getLocalUsersRegistry();
  for (const u of localList) {
    if (u.uid || u.email) {
      const role = checkIsAdmin(u.email, u.role) ? 'admin' : (u.role || 'user');
      usersMap.set(u.uid || u.email, { ...u, role });
    }
  }

  // 2. Ensure current signed-in user (especially Master Admin sufi111729@gmail.com) is in list
  const current = auth.currentUser;
  if (current) {
    const currentRec: AppUserRecord = {
      uid: current.uid,
      name: current.displayName || current.email?.split('@')[0] || 'User',
      email: current.email || '',
      role: checkIsAdmin(current.email) ? 'admin' : 'user',
      status: 'active',
      emailVerified: Boolean(current.emailVerified),
      avatarUrl: current.photoURL || undefined,
      lastLoginAt: new Date().toISOString(),
    };
    usersMap.set(current.uid, currentRec);
    saveLocalUserRegistry(currentRec);
  }

  // 3. Try fetching from Cloud Firestore
  try {
    let snapshot;
    try {
      const q = query(collection(db, 'users'), orderBy('lastLoginAt', 'desc'));
      snapshot = await getDocs(q);
    } catch {
      snapshot = await getDocs(collection(db, 'users'));
    }

    if (snapshot && !snapshot.empty) {
      for (const d of snapshot.docs) {
        const data = d.data() as AppUserRecord;
        const item: AppUserRecord = {
          ...data,
          uid: d.id,
          role: checkIsAdmin(data.email, data.role) ? 'admin' : (data.role || 'user'),
        };
        usersMap.set(d.id, item);
        saveLocalUserRegistry(item);
      }
    }
  } catch (err) {
    console.warn('Firestore fetchAllUsers fallback active:', err);
  }

  return Array.from(usersMap.values());
}

export async function updateAdminUserRecord(
  uid: string,
  updates: Partial<AppUserRecord>
): Promise<void> {
  // Update local
  try {
    const existing = getLocalUsersRegistry();
    const updated = existing.map((u) => (u.uid === uid ? { ...u, ...updates } : u));
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  // Update Firestore
  try {
    await updateDoc(doc(db, 'users', uid), updates);
  } catch {
    // ignore
  }
}

export async function deleteAdminUserRecord(uid: string): Promise<void> {
  removeLocalUserRegistry(uid);
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch {
    // ignore
  }
}

export async function createAdminUserRecord(
  userData: Omit<AppUserRecord, 'createdAt' | 'lastLoginAt'>
): Promise<void> {
  const fullRecord: AppUserRecord = {
    ...userData,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
  saveLocalUserRegistry(fullRecord);

  try {
    await setDoc(doc(db, 'users', userData.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } catch {
    // ignore
  }
}

// =========================================================================
// FIRESTORE HEALTH DIAGNOSTIC & SYNC HELPERS
// =========================================================================
export interface FirestoreHealthStatus {
  isReady: boolean;
  status: 'connected' | 'not_enabled' | 'permission_denied' | 'connecting' | 'error';
  errorMessage?: string;
}

export async function checkFirestoreHealth(): Promise<FirestoreHealthStatus> {
  try {
    const testDoc = await getDoc(doc(db, '_health_check_', 'ping'));
    // If it succeeds or doc doesn't exist, Firestore API is active & reachable
    return { isReady: true, status: 'connected' };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (
      msg.includes('Cloud Firestore API has not been used') ||
      msg.includes('disabled') ||
      msg.includes('not been used in project') ||
      msg.includes('The database (default) does not exist') ||
      msg.includes('unavailable')
    ) {
      return {
        isReady: false,
        status: 'not_enabled',
        errorMessage: msg,
      };
    }
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      return {
        isReady: false,
        status: 'permission_denied',
        errorMessage: msg,
      };
    }
    return {
      isReady: false,
      status: 'error',
      errorMessage: msg,
    };
  }
}

export async function syncAllLocalUsersToFirestore(): Promise<{ synced: number; error?: string }> {
  const localList = getLocalUsersRegistry();
  let count = 0;
  for (const u of localList) {
    try {
      await setDoc(doc(db, 'users', u.uid), {
        ...u,
        lastLoginAt: serverTimestamp(),
      });
      count++;
    } catch (err: any) {
      return { synced: count, error: err?.message || String(err) };
    }
  }
  return { synced: count };
}

// =========================================================================
// FIREBASE AUTH SERVICE FUNCTIONS
// =========================================================================
export async function loginWithEmail(email: string, password: string): Promise<AuthUserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const formatted = formatFirebaseUser(cred.user);
  saveStoredAuthUser(formatted);
  syncUserToFirestore(formatted).catch(() => {});
  return formatted;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ user: AuthUserProfile; verificationSent: boolean }> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name.trim()) {
    try {
      await updateProfile(cred.user, { displayName: name.trim() });
    } catch {
      // ignore
    }
  }

  let verificationSent = false;
  try {
    await sendEmailVerification(cred.user, {
      url: window.location.origin,
      handleCodeInApp: false,
    });
    verificationSent = true;
  } catch {
    // Non-fatal if verification email fails initially
  }

  const formatted = formatFirebaseUser(cred.user);
  saveStoredAuthUser(formatted);
  syncUserToFirestore(formatted).catch(() => {});
  return { user: formatted, verificationSent };
}

export async function sendUserVerificationEmail(): Promise<void> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('No user is currently signed in.');
  }
  await sendEmailVerification(current, {
    url: window.location.origin,
    handleCodeInApp: false,
  });
}

export async function reloadCurrentUser(): Promise<AuthUserProfile | null> {
  const current = auth.currentUser;
  if (!current) return null;
  await current.reload();
  const formatted = formatFirebaseUser(current);
  saveStoredAuthUser(formatted);
  syncUserToFirestore(formatted).catch(() => {});
  return formatted;
}

export async function verifyEmailWithActionCode(oobCode: string): Promise<void> {
  await applyActionCode(auth, oobCode);
  if (auth.currentUser) {
    await auth.currentUser.reload();
  }
}

export async function sendResetPasswordEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim(), {
    url: window.location.origin,
    handleCodeInApp: false,
  });
}

export async function verifyResetCode(oobCode: string): Promise<string> {
  return await verifyPasswordResetCode(auth, oobCode);
}

export async function resetPasswordWithCode(oobCode: string, newPassword: string): Promise<void> {
  await confirmPasswordReset(auth, oobCode, newPassword);
}

// Email Change & Security Recovery Functions
export async function changeUserEmail(
  newEmail: string,
  currentPassword?: string
): Promise<{ previousEmail: string; newEmail: string }> {
  const current = auth.currentUser;
  if (!current || !current.email) {
    throw new Error('No user is currently signed in.');
  }

  const previousEmail = current.email;

  if (currentPassword) {
    const cred = EmailAuthProvider.credential(previousEmail, currentPassword);
    await reauthenticateWithCredential(current, cred);
  }

  await verifyBeforeUpdateEmail(current, newEmail.trim(), {
    url: window.location.origin,
    handleCodeInApp: false,
  });

  return {
    previousEmail,
    newEmail: newEmail.trim(),
  };
}

export async function recoverUserEmail(oobCode: string): Promise<string> {
  const info = await checkActionCode(auth, oobCode);
  const restoredEmail = (info.data as any)?.email || '';
  await applyActionCode(auth, oobCode);
  if (auth.currentUser) {
    await auth.currentUser.reload();
  }
  return restoredEmail;
}

export async function updateUserDisplayName(name: string): Promise<AuthUserProfile> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('No user is currently signed in.');
  }
  await updateProfile(current, { displayName: name.trim() });
  await current.reload();
  const formatted = formatFirebaseUser(current);
  saveStoredAuthUser(formatted);
  syncUserToFirestore(formatted).catch(() => {});
  return formatted;
}

export async function loginWithGoogle(): Promise<AuthUserProfile> {
  const cred = await signInWithPopup(auth, googleProvider);
  const formatted = formatFirebaseUser(cred.user);
  saveStoredAuthUser(formatted);
  syncUserToFirestore(formatted).catch(() => {});
  return formatted;
}

export async function logoutUser(): Promise<void> {
  clearStoredAuthUser();
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: AuthUserProfile | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      // 1. Immediately emit user profile so UI never waits or flickers on refresh
      const initialRole: 'admin' | 'user' = checkIsAdmin(firebaseUser.email) ? 'admin' : 'user';
      const formatted = formatFirebaseUser(firebaseUser, initialRole);
      saveStoredAuthUser(formatted);
      callback(formatted);

      // 2. Non-blocking Firestore role check & profile sync in background
      getDoc(doc(db, 'users', firebaseUser.uid))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const resolvedRole =
              data.role === 'admin' || checkIsAdmin(firebaseUser.email)
                ? 'admin'
                : data.role || initialRole;
            if (resolvedRole !== formatted.role) {
              const updated = { ...formatted, role: resolvedRole };
              saveStoredAuthUser(updated);
              callback(updated);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          syncUserToFirestore(formatted).catch(() => {});
        });
    } else {
      clearStoredAuthUser();
      callback(null);
    }
  });
}
