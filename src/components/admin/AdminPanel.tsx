import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Shield,
  Users,
  FolderOpen,
  Mail,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Upload,
  ArrowLeft,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileCheck,
  Clock,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  AlertTriangle,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  fetchAllUsers,
  updateAdminUserRecord,
  deleteAdminUserRecord,
  createAdminUserRecord,
  fetchContactMessages,
  updateContactStatus,
  deleteContactMessage,
  fetchUserFiles,
  saveUserFileRecord,
  deleteUserFileRecord,
  grantLocalAdmin,
  checkIsAdmin,
  checkFirestoreHealth,
  syncAllLocalUsersToFirestore,
  type AppUserRecord,
  type ContactInquiry,
  type UserFileRecord,
  type AuthUserProfile,
  type FirestoreHealthStatus,
} from '../../core/firebase';
import type { UserProfile } from '../auth/SignInModal';
import { UserAvatar } from '../ui/UserAvatar';

interface AdminPanelProps {
  currentUser: UserProfile | null;
  onBackHome: () => void;
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

type AdminTab = 'overview' | 'users' | 'files' | 'messages';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onBackHome,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Admin access state
  const isMasterAdmin = checkIsAdmin(currentUser?.email, currentUser?.role);

  // Data states
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [messages, setMessages] = useState<ContactInquiry[]>([]);
  const [allFiles, setAllFiles] = useState<UserFileRecord[]>([]);
  const [selectedUserForFiles, setSelectedUserForFiles] = useState<AppUserRecord | null>(null);
  const [userFiles, setUserFiles] = useState<UserFileRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [firestoreHealth, setFirestoreHealth] = useState<FirestoreHealthStatus>({
    isReady: false,
    status: 'connecting',
  });
  const [isSyncingFirestore, setIsSyncingFirestore] = useState<boolean>(false);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [messageSearch, setMessageSearch] = useState('');
  const [messageStatusFilter, setMessageStatusFilter] = useState<'all' | 'unread' | 'read' | 'resolved'>('all');

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUserRecord | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactInquiry | null>(null);
  const [previewFile, setPreviewFile] = useState<UserFileRecord | null>(null);
  const [isUploadFileModalOpen, setIsUploadFileModalOpen] = useState(false);

  // Form states for Add/Edit User
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserStatus, setNewUserStatus] = useState<'active' | 'suspended'>('active');

  // File Upload Form
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadToolUsed, setUploadToolUsed] = useState('Manual Upload');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFileBase64, setUploadFileBase64] = useState<string | null>(null);
  const [uploadFileSize, setUploadFileSize] = useState<number>(0);
  const [uploadFileType, setUploadFileType] = useState<string>('application/octet-stream');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data from Firebase Firestore & Local Resilience Registry
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [health, loadedUsers, loadedMessages] = await Promise.all([
        checkFirestoreHealth(),
        fetchAllUsers(),
        fetchContactMessages(),
      ]);
      setFirestoreHealth(health);

      // Guarantee currentUser (Master Admin) is in users list immediately
      const finalUsers = [...loadedUsers];
      if (
        currentUser?.email &&
        !finalUsers.some((u) => u.email.toLowerCase() === currentUser.email.toLowerCase())
      ) {
        const adminRec: AppUserRecord = {
          uid: currentUser.uid || 'master-admin',
          name: currentUser.name || 'Admin',
          email: currentUser.email,
          role: 'admin',
          status: 'active',
          emailVerified: Boolean(currentUser.emailVerified),
          avatarUrl: currentUser.avatarUrl,
          lastLoginAt: new Date().toISOString(),
        };
        finalUsers.unshift(adminRec);
      }

      setUsers(finalUsers);
      setMessages(loadedMessages);

      // If a user is already selected for files, reload their files
      if (selectedUserForFiles) {
        const files = await fetchUserFiles(selectedUserForFiles.uid);
        setUserFiles(files);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      onNotify?.('Data Sync Notice', err?.message || 'Using resilient local mode', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSyncFirestore = async () => {
    setIsSyncingFirestore(true);
    try {
      const health = await checkFirestoreHealth();
      setFirestoreHealth(health);

      if (!health.isReady) {
        if (health.status === 'permission_denied') {
          onNotify?.(
            'Rules Locked (Missing Permissions)',
            'Firestore database is active! Now update the "Rules" tab in Firebase Console so FileWala can write user data.',
            'error'
          );
        } else {
          onNotify?.(
            'Firestore Setup Required',
            'Please create the Firestore database in Firebase Console first.',
            'error'
          );
        }
        return;
      }

      const res = await syncAllLocalUsersToFirestore();
      if (res.error) {
        onNotify?.('Sync Issue', res.error, 'error');
      } else {
        onNotify?.(
          'Firebase Synced Successfully',
          `Synced ${res.synced} user records directly into Cloud Firestore!`,
          'success'
        );
      }
      loadAdminData();
    } catch (err: any) {
      onNotify?.('Sync Failed', err?.message || 'Could not sync with Firestore', 'error');
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  const handleCopySecurityRules = () => {
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;
    navigator.clipboard.writeText(rules);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
    onNotify?.('Rules Copied', 'Firestore rules copied! Paste in Firebase Console > Firestore > Rules tab and click Publish.', 'success');
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // When selected user for files changes, fetch their files
  useEffect(() => {
    if (selectedUserForFiles) {
      fetchUserFiles(selectedUserForFiles.uid)
        .then((files) => setUserFiles(files))
        .catch(() => setUserFiles([]));
    } else {
      setUserFiles([]);
    }
  }, [selectedUserForFiles]);

  // Handle granting current email admin rights (one-click dev/setup bypass)
  const handleMakeSelfAdmin = () => {
    if (currentUser?.email) {
      grantLocalAdmin(currentUser.email);
      onNotify?.(
        'Admin Access Granted',
        `${currentUser.email} has been granted administrator access.`,
        'success'
      );
      loadAdminData();
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  // Filtered Messages
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(messageSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(messageSearch.toLowerCase()) ||
        (m.subject || '').toLowerCase().includes(messageSearch.toLowerCase()) ||
        m.message.toLowerCase().includes(messageSearch.toLowerCase());
      const matchesStatus =
        messageStatusFilter === 'all' || m.status === messageStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [messages, messageSearch, messageStatusFilter]);

  // User Actions (CRUD)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    try {
      const mockUid = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now();
      await createAdminUserRecord({
        uid: mockUid,
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        status: newUserStatus,
        emailVerified: true,
      });
      onNotify?.('User Created', `User ${newUserName} added successfully`, 'success');
      setIsAddUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      loadAdminData();
    } catch (err: any) {
      onNotify?.('Error', err?.message || 'Could not add user', 'error');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateAdminUserRecord(editingUser.uid, {
        name: editingUser.name,
        role: editingUser.role,
        status: editingUser.status,
      });
      onNotify?.('User Updated', `Updated profile for ${editingUser.name}`, 'success');
      setEditingUser(null);
      loadAdminData();
    } catch (err: any) {
      onNotify?.('Update Failed', err?.message || 'Could not update user', 'error');
    }
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) return;
    try {
      await deleteAdminUserRecord(uid);
      onNotify?.('User Deleted', `User ${name} removed from Firestore`, 'info');
      if (selectedUserForFiles?.uid === uid) {
        setSelectedUserForFiles(null);
      }
      loadAdminData();
    } catch (err: any) {
      onNotify?.('Delete Failed', err?.message || 'Could not delete user', 'error');
    }
  };

  // Jump directly to User File Management
  const handleOpenUserFiles = (user: AppUserRecord) => {
    setSelectedUserForFiles(user);
    setActiveTab('files');
  };

  // File Upload for User
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setUploadFileSize(file.size);
    setUploadFileType(file.type || 'application/octet-stream');

    const reader = new FileReader();
    reader.onload = () => {
      setUploadFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadUserFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForFiles || !uploadFileName || !uploadFileBase64) {
      onNotify?.('Incomplete File', 'Please select a file to upload.', 'error');
      return;
    }

    try {
      await saveUserFileRecord({
        userId: selectedUserForFiles.uid,
        userEmail: selectedUserForFiles.email,
        fileName: uploadFileName,
        fileSize: uploadFileSize,
        fileType: uploadFileType,
        fileDataUrl: uploadFileBase64,
        toolUsed: uploadToolUsed,
        notes: uploadNotes,
      });

      onNotify?.('File Uploaded', `File "${uploadFileName}" added for ${selectedUserForFiles.name}`, 'success');
      setIsUploadFileModalOpen(false);
      setUploadFileName('');
      setUploadFileBase64(null);
      setUploadNotes('');
      // Reload files
      const files = await fetchUserFiles(selectedUserForFiles.uid);
      setUserFiles(files);
    } catch (err: any) {
      onNotify?.('Upload Failed', err?.message || 'Could not save file record', 'error');
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Delete file "${fileName}"?`)) return;
    try {
      await deleteUserFileRecord(fileId);
      onNotify?.('File Deleted', `Removed ${fileName}`, 'info');
      if (selectedUserForFiles) {
        const files = await fetchUserFiles(selectedUserForFiles.uid);
        setUserFiles(files);
      }
    } catch (err: any) {
      onNotify?.('Delete Failed', err?.message || 'Could not remove file', 'error');
    }
  };

  const handleDownloadFile = (file: UserFileRecord) => {
    if (!file.fileDataUrl) {
      onNotify?.('Download Error', 'No raw file data available for this record.', 'error');
      return;
    }
    const a = document.createElement('a');
    a.href = file.fileDataUrl;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Message Actions
  const handleUpdateMessageStatus = async (id: string, status: 'unread' | 'read' | 'resolved') => {
    try {
      await updateContactStatus(id, status);
      onNotify?.('Status Updated', `Message marked as ${status}`, 'success');
      loadAdminData();
    } catch (err: any) {
      onNotify?.('Error', err?.message || 'Could not update status', 'error');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Delete this contact inquiry?')) return;
    try {
      await deleteContactMessage(id);
      onNotify?.('Message Deleted', 'Inquiry removed from Firebase', 'info');
      if (selectedMessage?.id === id) setSelectedMessage(null);
      loadAdminData();
    } catch (err: any) {
      onNotify?.('Error', err?.message || 'Could not delete message', 'error');
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // If user is not admin, show restricted card
  if (!isMasterAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-lg border border-zinc-200 bg-white text-zinc-900 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-950">Restricted Admin Access</h2>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            This console is restricted to administrators of Firebase project <code>promptwala-9146f</code>.
          </p>

          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md text-xs font-mono text-zinc-700 text-left space-y-1">
            <p><strong>Logged-in:</strong> {currentUser?.email || 'Not Signed In'}</p>
            <p><strong>Role:</strong> {currentUser?.role || 'Guest / User'}</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            {currentUser?.email && (
              <button
                type="button"
                onClick={handleMakeSelfAdmin}
                className="px-4 py-2 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer"
              >
                Grant Admin to {currentUser.email}
              </button>
            )}
            <button
              type="button"
              onClick={onBackHome}
              className="px-4 py-2 rounded-md border border-zinc-200 bg-white text-zinc-700 text-xs font-medium hover:bg-zinc-50 cursor-pointer"
            >
              Return to Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
            <span className="text-zinc-300">/</span>
            <span className="text-xs font-mono text-zinc-500">Console</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
              FileWala Admin Console
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 bg-zinc-100 text-zinc-700 font-semibold uppercase">
              Admin
            </span>
            {firestoreHealth.status === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Firestore Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Local Resilience Active</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block text-xs">
            <p className="font-semibold text-zinc-900">{currentUser?.name}</p>
            <p className="text-[11px] font-mono text-zinc-500">{currentUser?.email}</p>
          </div>
          <button
            type="button"
            onClick={loadAdminData}
            disabled={isLoading}
            className="p-2 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 cursor-pointer transition-colors"
            title="Refresh Firestore Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-zinc-900' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cloud Firestore Activation & Security Rules Notification Card */}
      {firestoreHealth.status !== 'connected' && (
        <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50/80 text-zinc-900 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900">
                  {firestoreHealth.status === 'permission_denied'
                    ? 'Cloud Firestore Active! Final Step: Publish Security Rules'
                    : 'Cloud Firestore Database Needs 1-Click Activation in Firebase Console'}
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed max-w-3xl">
                  {firestoreHealth.status === 'permission_denied' ? (
                    <>
                      Great news! Cloud Firestore is active on <strong>promptwala-9146f</strong>. However, default security rules are currently in locked mode (<code className="px-1 py-0.5 rounded bg-amber-100 text-[11px] font-mono">Missing or insufficient permissions</code>). To allow FileWala to save and load user accounts and files, please paste the rules below into your <strong>Rules</strong> tab and click <strong>Publish</strong>.
                    </>
                  ) : (
                    <>
                      Firebase Authentication is working. However, <strong>Cloud Firestore</strong> (where user database documents, user files, and contact messages are stored in the cloud) has not yet been initialized on your Firebase project <strong>promptwala-9146f</strong>. FileWala is currently displaying your account and users safely in <strong>Resilient Mode</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {firestoreHealth.status === 'permission_denied' && (
            <div className="p-2.5 rounded bg-white border border-amber-200 font-mono text-[11px] text-zinc-800 overflow-x-auto">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100 text-zinc-500 text-[10px]">
                <span>Firebase Security Rules (Paste in Console &gt; Firestore &gt; Rules)</span>
                <button
                  type="button"
                  onClick={handleCopySecurityRules}
                  className="text-zinc-900 font-semibold underline hover:opacity-80 cursor-pointer"
                >
                  {copiedRules ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <pre className="text-zinc-900 whitespace-pre">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
              </pre>
            </div>
          )}

          <div className="pt-2 border-t border-amber-200/70 flex flex-wrap items-center gap-2.5">
            <a
              href={
                firestoreHealth.status === 'permission_denied'
                  ? 'https://console.firebase.google.com/project/promptwala-9146f/firestore/rules'
                  : 'https://console.firebase.google.com/project/promptwala-9146f/firestore'
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {firestoreHealth.status === 'permission_denied'
                  ? '1. Open Firebase Rules Tab'
                  : '1. Open Firebase Console to Create Firestore'}
              </span>
            </a>

            <button
              type="button"
              onClick={handleCopySecurityRules}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-medium cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-zinc-500" />
              <span>{copiedRules ? 'Rules Copied!' : '2. Copy Firestore Security Rules'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualSyncFirestore}
              disabled={isSyncingFirestore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-300 bg-amber-100/70 hover:bg-amber-100 text-amber-900 text-xs font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
              <span>{isSyncingFirestore ? 'Checking...' : '3. Verify & Sync with Cloud'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-zinc-950 text-zinc-950 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'border-zinc-950 text-zinc-950 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Management</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-200 text-zinc-600">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'files'
              ? 'border-zinc-950 text-zinc-950 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>User File Management</span>
          {selectedUserForFiles && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-white">
              {selectedUserForFiles.name.split(' ')[0]}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'messages'
              ? 'border-zinc-950 text-zinc-950 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Contact Messages</span>
          {messages.filter((m) => m.status === 'unread').length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold">
              {messages.filter((m) => m.status === 'unread').length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Stat Cards (Flat 2D) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-zinc-200 bg-white">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Registered Users</span>
                <Users className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-zinc-950">{users.length}</p>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                {users.filter((u) => u.role === 'admin').length} Admin · {users.filter((u) => u.status === 'active').length} Active
              </p>
            </div>

            <div className="p-4 rounded-lg border border-zinc-200 bg-white">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Contact Inquiries</span>
                <Mail className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-zinc-950">{messages.length}</p>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                {messages.filter((m) => m.status === 'unread').length} Unread · {messages.filter((m) => m.status === 'resolved').length} Resolved
              </p>
            </div>

            <div className="p-4 rounded-lg border border-zinc-200 bg-white">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Managed User Files</span>
                <FolderOpen className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-zinc-950">{userFiles.length}</p>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                Active user file records
              </p>
            </div>

            <div className="p-4 rounded-lg border border-zinc-200 bg-white">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Firebase Database</span>
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-zinc-950 truncate">promptwala-9146f</p>
              <p className="text-[11px] text-emerald-600 mt-1 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live Firestore Active
              </p>
            </div>
          </div>

          {/* Quick Actions & Recent Users Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 p-5 rounded-lg border border-zinc-200 bg-white space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h3 className="text-sm font-semibold text-zinc-950">Recent Registered Users</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className="text-xs text-zinc-600 hover:text-zinc-950 font-medium"
                >
                  View All ({users.length}) →
                </button>
              </div>

              {users.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No users registered yet.</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.uid} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          src={u.avatarUrl}
                          name={u.name}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">{u.name}</p>
                          <p className="text-[11px] font-mono text-zinc-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          u.role === 'admin' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}>
                          {u.role}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenUserFiles(u)}
                          className="px-2 py-1 rounded border border-zinc-200 hover:bg-zinc-100 text-[11px] font-medium text-zinc-700 cursor-pointer"
                        >
                          Files
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 p-5 rounded-lg border border-zinc-200 bg-white space-y-4">
              <h3 className="text-sm font-semibold text-zinc-950 pb-3 border-b border-zinc-100">
                Quick Shortcuts
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('users');
                    setIsAddUserModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-left text-xs font-medium text-zinc-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-zinc-500" />
                  <span>Create / Add New User</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('messages');
                    setMessageStatusFilter('unread');
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-left text-xs font-medium text-zinc-800 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <span>Review Unread Inquiries</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (users.length > 0) {
                      setSelectedUserForFiles(users[0]);
                    }
                    setActiveTab('files');
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-left text-xs font-medium text-zinc-800 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-zinc-500" />
                  <span>User File Manager</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER MANAGEMENT (CRUD) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium cursor-pointer transition-colors w-full sm:w-auto justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New User</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="border border-zinc-200 rounded-lg overflow-x-auto bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Verified</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      No users match your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={u.avatarUrl}
                            name={u.name}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 truncate">{u.name}</p>
                            <p className="text-[11px] font-mono text-zinc-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          u.role === 'admin'
                            ? 'bg-zinc-900 text-white border-zinc-900 font-semibold'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          u.status === 'suspended'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.emailVerified ? (
                          <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Unverified</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenUserFiles(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] font-medium cursor-pointer transition-colors"
                            title="Manage Files for this user"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Files</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.uid, u.name)}
                            className="p-1 rounded border border-zinc-200 bg-white hover:bg-rose-50 text-rose-600 cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: USER FILE MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* User File Selector Bar */}
          <div className="p-4 rounded-lg border border-zinc-200 bg-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono text-zinc-500 uppercase">Target User Account:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={selectedUserForFiles?.uid || ''}
                    onChange={(e) => {
                      const user = users.find((u) => u.uid === e.target.value) || null;
                      setSelectedUserForFiles(user);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border border-zinc-200 bg-white text-zinc-900 focus:outline-none"
                  >
                    <option value="">-- Choose a user to manage files --</option>
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedUserForFiles && (
                <button
                  type="button"
                  onClick={() => setIsUploadFileModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Attach / Upload File</span>
                </button>
              )}
            </div>

            {selectedUserForFiles && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-100 text-xs text-zinc-600 font-mono">
                <div className="flex items-center gap-1.5">
                  <UserAvatar
                    src={selectedUserForFiles.avatarUrl}
                    name={selectedUserForFiles.name}
                    size="xs"
                  />
                  <span>Selected: <strong className="text-zinc-900">{selectedUserForFiles.name}</strong></span>
                </div>
                <span>•</span>
                <span>Total Files: <strong>{userFiles.length}</strong></span>
                <span>•</span>
                <span>
                  Storage Used:{' '}
                  <strong>
                    {formatBytes(userFiles.reduce((acc, f) => acc + (f.fileSize || 0), 0))}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Files List */}
          {!selectedUserForFiles ? (
            <div className="p-12 text-center border border-zinc-200 rounded-lg bg-white text-zinc-500 space-y-2">
              <FolderOpen className="w-8 h-8 mx-auto text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-800">Select a user above</p>
              <p className="text-xs">Choose a registered user from the dropdown to review and manage their processed files.</p>
            </div>
          ) : userFiles.length === 0 ? (
            <div className="p-12 text-center border border-zinc-200 rounded-lg bg-white text-zinc-500 space-y-3">
              <FileText className="w-8 h-8 mx-auto text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-800">No files stored for {selectedUserForFiles.name}</p>
              <p className="text-xs">Upload an image, PDF or document directly for this user account.</p>
              <button
                type="button"
                onClick={() => setIsUploadFileModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload First File</span>
              </button>
            </div>
          ) : (
            <div className="border border-zinc-200 rounded-lg overflow-x-auto bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">File</th>
                    <th className="py-2.5 px-3 font-semibold">Size</th>
                    <th className="py-2.5 px-3 font-semibold">Tool</th>
                    <th className="py-2.5 px-3 font-semibold">Notes</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {userFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                            {file.fileType.includes('pdf') ? (
                              <FileArchive className="w-3.5 h-3.5 text-zinc-700" />
                            ) : file.fileType.includes('image') ? (
                              <ImageIcon className="w-3.5 h-3.5 text-zinc-700" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-zinc-700" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 truncate max-w-[200px] sm:max-w-xs">
                              {file.fileName}
                            </p>
                            <p className="text-[10px] font-mono text-zinc-400">{file.fileType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-600">
                        {formatBytes(file.fileSize)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-zinc-200 bg-zinc-50 text-zinc-600">
                          {file.toolUsed || 'Workspace'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-500 text-xs truncate max-w-[150px]">
                        {file.notes || '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {file.fileDataUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewFile(file)}
                              className="p-1 rounded border border-zinc-200 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                              title="Preview File"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file)}
                            className="p-1 rounded border border-zinc-200 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id!, file.fileName)}
                            className="p-1 rounded border border-zinc-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                            title="Delete File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONTACT INQUIRIES */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 bg-white">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search inquiries..."
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['all', 'unread', 'read', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setMessageStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs rounded border capitalize transition-colors cursor-pointer ${
                    messageStatusFilter === st
                      ? 'bg-zinc-900 text-white border-zinc-900 font-semibold'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Table */}
          <div className="border border-zinc-200 rounded-lg overflow-x-auto bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Sender</th>
                  <th className="py-2.5 px-3 font-semibold">Subject &amp; Message</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500">
                      No contact inquiries found.
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-zinc-900">{msg.name}</p>
                        <a
                          href={`mailto:${msg.email}`}
                          className="text-[11px] font-mono text-zinc-500 hover:underline"
                        >
                          {msg.email}
                        </a>
                      </td>
                      <td className="py-3 px-3 max-w-sm">
                        <p className="font-semibold text-zinc-900 truncate">
                          {msg.subject || 'General Inquiry'}
                        </p>
                        <p className="text-zinc-500 text-xs truncate max-w-xs">{msg.message}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase font-semibold ${
                            msg.status === 'unread'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : msg.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          {msg.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedMessage(msg)}
                            className="px-2 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-[11px] font-medium cursor-pointer"
                          >
                            View
                          </button>
                          {msg.status === 'unread' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateMessageStatus(msg.id!, 'read')}
                              className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 cursor-pointer"
                              title="Mark Read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateMessageStatus(msg.id!, 'resolved')}
                              className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-emerald-600 cursor-pointer"
                              title="Mark Resolved"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <a
                            href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || 'FileWala Support')}`}
                            className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-blue-600 cursor-pointer"
                            title="Reply via Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id!)}
                            className="p-1 rounded border border-zinc-200 bg-white hover:bg-rose-50 text-rose-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-950">Add User Record</h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Priya Patel"
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="priya@example.com"
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 focus:outline-none"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Status</label>
                  <select
                    value={newUserStatus}
                    onChange={(e) => setNewUserStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-950">Edit User ({editingUser.name})</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 focus:outline-none"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Status</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {isUploadFileModalOpen && selectedUserForFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-950">
                Attach File for {selectedUserForFiles.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadFileModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadUserFile} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Choose File</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelected}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-200 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-zinc-100 file:text-xs file:font-semibold hover:file:bg-zinc-200 cursor-pointer"
                />
              </div>

              {uploadFileName && (
                <div className="p-2 rounded bg-zinc-50 border border-zinc-200 font-mono text-[11px] text-zinc-600">
                  <p><strong>Name:</strong> {uploadFileName}</p>
                  <p><strong>Size:</strong> {formatBytes(uploadFileSize)}</p>
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Associated Tool</label>
                <input
                  type="text"
                  value={uploadToolUsed}
                  onChange={(e) => setUploadToolUsed(e.target.value)}
                  placeholder="e.g. UPSC Photo Maker, PDF Compress"
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Admin Notes</label>
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="e.g. Client requested 35x45mm sizing"
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadFileModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFileBase64}
                  className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-medium"
                >
                  Save File Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-lg p-5 max-w-2xl w-full space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-zinc-950 truncate">{previewFile.fileName}</h3>
                <p className="text-[11px] font-mono text-zinc-500">
                  {formatBytes(previewFile.fileSize)} • {previewFile.toolUsed}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-zinc-50 rounded border border-zinc-100 min-h-[300px]">
              {previewFile.fileType.includes('image') && previewFile.fileDataUrl ? (
                <img
                  src={previewFile.fileDataUrl}
                  alt={previewFile.fileName}
                  className="max-h-[60vh] max-w-full object-contain rounded border border-zinc-200"
                />
              ) : previewFile.fileType.includes('pdf') && previewFile.fileDataUrl ? (
                <iframe
                  src={previewFile.fileDataUrl}
                  title={previewFile.fileName}
                  className="w-full h-[50vh] border border-zinc-200 rounded"
                />
              ) : (
                <div className="text-center text-zinc-500 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-zinc-400" />
                  <p className="text-xs">No direct browser preview for {previewFile.fileType}.</p>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(previewFile)}
                    className="px-3 py-1.5 rounded bg-zinc-900 text-white text-xs font-medium cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadFile(previewFile)}
                className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Contact Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-lg p-5 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-950">Inquiry Details</h3>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded">
                <div>
                  <span className="font-semibold text-zinc-500 uppercase text-[10px] block">Sender</span>
                  <span className="font-bold text-zinc-900">{selectedMessage.name}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-500 uppercase text-[10px] block">Email</span>
                  <a href={`mailto:${selectedMessage.email}`} className="font-mono text-blue-600 hover:underline">
                    {selectedMessage.email}
                  </a>
                </div>
              </div>

              <div>
                <span className="font-semibold text-zinc-500 uppercase text-[10px] block mb-1">Subject</span>
                <p className="font-medium text-zinc-900">{selectedMessage.subject || 'General Inquiry'}</p>
              </div>

              <div>
                <span className="font-semibold text-zinc-500 uppercase text-[10px] block mb-1">Message</span>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-zinc-100">
              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject || 'FileWala Support')}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Reply to {selectedMessage.name}</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateMessageStatus(selectedMessage.id!, 'resolved');
                    setSelectedMessage(null);
                  }}
                  className="px-2.5 py-1.5 rounded border border-zinc-200 hover:bg-zinc-100 text-xs font-medium text-zinc-700"
                >
                  Mark Resolved
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="px-2.5 py-1.5 rounded border border-zinc-200 hover:bg-zinc-100 text-xs font-medium text-zinc-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
