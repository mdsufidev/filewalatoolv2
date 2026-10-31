/**
 * Ultra-lightweight Authentication & Admin storage utilities.
 * 100% Client-side local storage operations with ZERO Firebase SDK dependencies.
 * Used for instant, zero-latency initial page loads.
 */

export const DEFAULT_ADMIN_EMAILS: string[] = [
  'sufi111729@gmail.com',
];

export interface AuthUserProfile {
  uid: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string;
  role?: 'admin' | 'user';
}

export const AUTH_STORAGE_KEY = 'filewala_auth_user';

export function checkIsAdmin(email?: string | null, role?: string | null): boolean {
  if (role === 'admin') return true;
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  if (DEFAULT_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === cleanEmail)) {
    return true;
  }
  try {
    if (typeof window !== 'undefined') {
      const localAdmins = JSON.parse(localStorage.getItem('filewala_admin_emails') || '[]');
      if (Array.isArray(localAdmins) && localAdmins.includes(cleanEmail)) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export function grantLocalAdmin(email: string): void {
  try {
    if (typeof window === 'undefined') return;
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
    if (typeof window === 'undefined') return;
    const clean = email.toLowerCase().trim();
    const existing = JSON.parse(localStorage.getItem('filewala_admin_emails') || '[]');
    const filtered = existing.filter((e: string) => e !== clean);
    localStorage.setItem('filewala_admin_emails', JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

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
