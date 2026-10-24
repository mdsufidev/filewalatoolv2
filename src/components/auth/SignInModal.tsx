import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Send,
  RefreshCw,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useTheme } from '../../core/themeContext';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  sendUserVerificationEmail,
  reloadCurrentUser,
  sendResetPasswordEmail,
  type AuthUserProfile,
} from '../../core/firebase';

export interface UserProfile {
  name: string;
  email: string;
  emailVerified?: boolean;
  avatarUrl?: string;
  uid?: string;
  role?: 'admin' | 'user';
}

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialEmail?: string;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = '',
}) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification Screen State
  const [verificationPendingUser, setVerificationPendingUser] = useState<AuthUserProfile | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  // Password Reset State
  const [resetEmail, setResetEmail] = useState(initialEmail);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      setResetEmail(initialEmail);
    }
  }, [initialEmail]);

  // Cooldown countdown timer for resending verification email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const getFriendlyErrorMessage = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try signing in.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before completing.';
      case 'auth/popup-blocked':
        return 'Google sign-in popup was blocked by browser. Please allow popups.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Too many requests. Please wait a moment before trying again.';
      default:
        return err?.message || 'Authentication request failed. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendNotice(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (tab === 'signup') {
        const { user } = await registerWithEmail(name, email.trim(), password);
        onSuccess(user);
        // Show verification prompt screen
        setVerificationPendingUser(user);
        setResendCooldown(60);
      } else {
        const user = await loginWithEmail(email.trim(), password);
        onSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const target = resetEmail.trim() || email.trim();
    if (!target) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsSendingReset(true);
    try {
      await sendResetPasswordEmail(target);
      setResetSuccess(true);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await loginWithGoogle();
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setResendNotice(null);
    setIsLoading(true);
    try {
      await sendUserVerificationEmail();
      setResendNotice('Confirmation link resent! Check your inbox or spam folder.');
      setResendCooldown(60);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerificationStatus = async () => {
    setIsCheckingStatus(true);
    setError(null);
    try {
      const updatedUser = await reloadCurrentUser();
      if (updatedUser?.emailVerified) {
        setIsVerifiedSuccess(true);
        onSuccess(updatedUser);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError('Email not yet verified. Please click the link received in your email.');
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-sm rounded-lg border p-6 space-y-5 transition-colors ${
          isDark
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* =========================================================================
            SCREEN 1: EMAIL VERIFICATION CONFIRMATION (After Sign Up)
        ========================================================================= */}
        {verificationPendingUser ? (
          <div className="space-y-4 text-center animate-in fade-in duration-150">
            {/* Header Icon */}
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              {isVerifiedSuccess ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <Mail className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
              )}
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {isVerifiedSuccess ? 'Email Verified Successfully!' : 'Verify Your Email Address'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {isVerifiedSuccess ? (
                  'Your account is now fully verified. Redirecting to your workspace...'
                ) : (
                  <>
                    We sent a confirmation email to{' '}
                    <strong className="text-zinc-900 dark:text-zinc-100">
                      {verificationPendingUser.email}
                    </strong>
                    . Follow the link inside to verify your account.
                  </>
                )}
              </p>
            </div>

            {/* Sender & Security Notice */}
            {!isVerifiedSuccess && (
              <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-left space-y-1.5 text-[11px] font-mono text-zinc-500">
                <div className="flex items-center justify-between">
                  <span>From:</span>
                  <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[180px]">
                    noreply@promptwala-9146f.firebaseapp.com
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subject:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">Verify your email for FileWala</span>
                </div>
              </div>
            )}

            {/* Notices / Errors */}
            {resendNotice && (
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs text-left">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{resendNotice}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs text-left">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            {!isVerifiedSuccess && (
              <div className="space-y-2 pt-1">
                {/* Check verification status button */}
                <button
                  type="button"
                  onClick={handleCheckVerificationStatus}
                  disabled={isCheckingStatus}
                  className="w-full py-2 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingStatus ? 'Checking Status...' : "I've Verified My Email"}</span>
                </button>

                {/* Resend verification button */}
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0 || isLoading}
                  className="w-full py-2 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>
                    {resendCooldown > 0
                      ? `Resend link in ${resendCooldown}s`
                      : 'Resend Confirmation Email'}
                  </span>
                </button>

                {/* Continue to workspace anyway */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  Continue to Workspace (Verify Later)
                </button>
              </div>
            )}
          </div>
        ) : tab === 'forgot' ? (
          /* =========================================================================
              SCREEN 2: FORGOT PASSWORD RECOVERY
          ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="space-y-1 text-center">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[11px] font-mono mb-1">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Password Recovery</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Reset Your Password
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Enter your registered email and we&apos;ll send you a password reset link.
              </p>
            </div>

            {resetSuccess ? (
              <div className="space-y-3.5 text-center animate-in fade-in duration-150">
                <div className="w-11 h-11 rounded-full mx-auto flex items-center justify-center border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Reset Email Sent
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    We sent a password reset link to{' '}
                    <strong className="text-zinc-900 dark:text-zinc-100">
                      {resetEmail || email}
                    </strong>
                    . Follow the link to choose a new password.
                  </p>
                </div>
                <div className="p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-[11px] font-mono text-zinc-500 text-left space-y-1">
                  <div>From: noreply@promptwala-9146f.firebaseapp.com</div>
                  <div>Subject: Reset your password for FileWala</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setError(null);
                    setResetSuccess(false);
                  }}
                  className="w-full py-2 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendPasswordReset} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={resetEmail || email}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        setEmail(e.target.value);
                      }}
                      placeholder="you@domain.com"
                      className="w-full text-xs rounded-md pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center text-xs py-2"
                  isLoading={isSendingReset}
                >
                  Send Reset Link
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setError(null);
                  }}
                  className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          /* =========================================================================
              SCREEN 3: STANDARD SIGN IN & SIGN UP FORM
          ========================================================================= */
          <>
            {/* Header */}
            <div className="space-y-1 text-center">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[11px] font-mono mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>FileWala Account</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {tab === 'signin' ? 'Sign In to FileWala' : 'Create Free Account'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {tab === 'signin'
                  ? 'Access saved preferences and cloud sync.'
                  : 'Sign up to manage custom presets across sessions.'}
              </p>
            </div>

            {/* Tab Switcher (Flat 2D Segmented Control) */}
            <div className="grid grid-cols-2 p-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setError(null);
                }}
                className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  tab === 'signin'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setError(null);
                }}
                className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  tab === 'signup'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {tab === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Mohammad Sufiyan"
                      className="w-full text-xs rounded-md pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setResetEmail(e.target.value);
                    }}
                    placeholder="you@domain.com"
                    className="w-full text-xs rounded-md pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  {tab === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot');
                        setResetEmail(email);
                        setError(null);
                        setResetSuccess(false);
                      }}
                      className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs rounded-md pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center text-xs py-2"
                isLoading={isLoading}
              >
                {tab === 'signin' ? 'Sign In' : 'Create Account & Verify'}
              </Button>
            </form>

            <div className="relative text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <span className="relative text-[10px] px-2 font-mono uppercase tracking-wider bg-white dark:bg-zinc-950 text-zinc-400">
                Or Continue With
              </span>
            </div>

            {/* Google Sign-in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
