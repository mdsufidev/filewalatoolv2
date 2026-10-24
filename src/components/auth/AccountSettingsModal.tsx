'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LogOut,
  BadgeCheck,
  Sparkles,
  KeyRound,
  Shield,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useTheme } from '../../core/themeContext';
import {
  changeUserEmail,
  updateUserDisplayName,
  sendUserVerificationEmail,
  type AuthUserProfile,
} from '../../core/firebase';
import type { UserProfile } from './SignInModal';
import { UserAvatar } from '../ui/UserAvatar';

interface AccountSettingsModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onUserUpdated: (user: UserProfile) => void;
  onSignOut: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onUserUpdated,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'email'>('profile');

  // Profile Name State
  const [name, setName] = useState(currentUser.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameNotice, setNameNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState<{
    previousEmail: string;
    newEmail: string;
  } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Verification resend state
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameNotice(null);
    if (!name.trim()) return;

    setIsUpdatingName(true);
    try {
      const updated = await updateUserDisplayName(name.trim());
      onUserUpdated(updated);
      setNameNotice({ text: 'Display name updated successfully.', type: 'success' });
    } catch (err: any) {
      setNameNotice({ text: err?.message || 'Failed to update name.', type: 'error' });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailChangeSuccess(null);

    if (!newEmail.trim()) {
      setEmailError('Please enter a new email address.');
      return;
    }

    if (newEmail.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      setEmailError('New email address must be different from your current address.');
      return;
    }

    setIsSubmittingEmail(true);
    try {
      const result = await changeUserEmail(newEmail.trim(), currentPassword || undefined);
      setEmailChangeSuccess(result);
      setNewEmail('');
      setCurrentPassword('');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setEmailError('Current password is incorrect. Please re-enter.');
      } else if (code === 'auth/email-already-in-use') {
        setEmailError('An account with this new email address already exists.');
      } else if (code === 'auth/requires-recent-login') {
        setEmailError('For security, please enter your current password to confirm this change.');
      } else {
        setEmailError(err?.message || 'Failed to update email. Please try again.');
      }
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleResendCurrentVerification = async () => {
    setIsResendingVerification(true);
    setVerificationNotice(null);
    try {
      await sendUserVerificationEmail();
      setVerificationNotice('Verification link resent to your email inbox.');
    } catch (err: any) {
      setVerificationNotice(err?.message || 'Failed to resend verification email.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xl overflow-hidden animate-in zoom-in-98 duration-100"
        role="dialog"
        aria-modal="true"
        aria-label="Account Settings"
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-950 dark:text-white">
                Account Settings
              </h2>
              <p className="text-[11px] text-zinc-500">
                Manage your profile details and sign-in credentials
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Identity Snippet */}
        <div className="px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-zinc-950 dark:text-white truncate">
                  {currentUser.name}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/60 font-bold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {currentUser.role === 'admin' ? 'Administrator' : 'Free Member'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                {currentUser.email}
              </p>
            </div>
          </div>

          <div>
            {currentUser.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                <BadgeCheck className="w-3 h-3" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                <span>Unverified</span>
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher (Flat 2D Segmented Control) */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 p-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/60 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-1.5 font-medium rounded transition-colors duration-150 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              Profile &amp; Display Name
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`py-1.5 font-medium rounded transition-colors duration-150 cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              Change Sign-In Email
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* =========================================================================
              TAB 1: PROFILE DETAILS & VERIFICATION
          ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Email Verification Status Banner if Unverified */}
              {!currentUser.emailVerified && (
                <div className="p-3 rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Email Verification Pending</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResendCurrentVerification}
                      disabled={isResendingVerification}
                      className="text-[11px] underline hover:opacity-80 cursor-pointer disabled:opacity-50"
                    >
                      {isResendingVerification ? 'Sending...' : 'Resend link'}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    Please verify your email address to ensure account recovery and secure login.
                  </p>
                </div>
              )}

              {verificationNotice && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-md border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{verificationNotice}</span>
                </p>
              )}

              {/* Display Name Edit Form */}
              <form onSubmit={handleUpdateName} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Full Display Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full text-xs rounded-md pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    This name is used for user greeting and session identity.
                  </p>
                </div>

                {nameNotice && (
                  <p
                    className={`text-xs p-2 rounded border font-mono ${
                      nameNotice.type === 'success'
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                    }`}
                  >
                    {nameNotice.text}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center text-xs py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-md cursor-pointer"
                  isLoading={isUpdatingName}
                >
                  Save Display Name
                </Button>
              </form>

              {/* Privacy Architecture Guarantee Card */}
              <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-[11px] space-y-1 text-zinc-500">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>100% Client-Side Privacy Guarantee</span>
                </div>
                <p className="leading-relaxed">
                  Your files, marksheets, signatures, and biometrics are processed in device RAM only. FileWala never stores or logs your documents on cloud disks.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: CHANGE SIGN-IN EMAIL
          ========================================================================= */}
          {activeTab === 'email' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {emailChangeSuccess ? (
                <div className="space-y-3.5 text-center py-2">
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Verification Sent to New Address
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      We sent a confirmation link to{' '}
                      <strong className="text-zinc-900 dark:text-zinc-100 font-mono">
                        {emailChangeSuccess.newEmail}
                      </strong>
                      . Click the link in that email to finalize the change.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailChangeSuccess(null);
                      setActiveTab('profile');
                    }}
                    className="w-full py-2 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Return to Profile
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestEmailChange} className="space-y-3.5">
                  <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    A confirmation link will be delivered to your new email, and a security alert will be sent to your current address (
                    <strong className="text-zinc-900 dark:text-zinc-100 font-mono">
                      {currentUser.email}
                    </strong>
                    ) allowing you to revert if unauthorized.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      New Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new@domain.com"
                        className="w-full text-xs rounded-md pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Current Password (for security verification)
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full text-xs rounded-md pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                      />
                    </div>
                  </div>

                  {emailError && (
                    <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{emailError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full justify-center text-xs py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-md cursor-pointer"
                    isLoading={isSubmittingEmail}
                  >
                    Request Email Change
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Danger Zone: Sign Out Action */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-500 text-[11px]">Finished your work session?</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-900/50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
