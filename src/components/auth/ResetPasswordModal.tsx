import React, { useState, useEffect } from 'react';
import { X, Lock, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTheme } from '../../core/themeContext';
import { verifyResetCode, resetPasswordWithCode } from '../../core/firebase';

interface ResetPasswordModalProps {
  isOpen: boolean;
  oobCode: string;
  onClose: () => void;
  onSuccess: (email?: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  oobCode,
  onClose,
  onSuccess,
}) => {
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(true);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isOpen || !oobCode) return;

    setIsVerifyingCode(true);
    setCodeError(null);

    verifyResetCode(oobCode)
      .then((email) => {
        setTargetEmail(email);
      })
      .catch((err) => {
        setCodeError(
          err?.message || 'The password reset link is invalid or has expired. Please request a new one.'
        );
      })
      .finally(() => {
        setIsVerifyingCode(false);
      });
  }, [isOpen, oobCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (newPassword.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordWithCode(oobCode, newPassword);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(targetEmail);
        onClose();
      }, 1600);
    } catch (err: any) {
      setSubmitError(
        err?.message || 'Failed to reset password. The link might have expired. Please try again.'
      );
    } finally {
      setIsLoading(false);
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

        {/* Verification Loader */}
        {isVerifyingCode ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 font-mono">Verifying reset link security code...</p>
          </div>
        ) : codeError ? (
          /* Invalid / Expired Code Screen */
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Invalid or Expired Link
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed">{codeError}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : isSuccess ? (
          /* Success Screen */
          <div className="space-y-4 text-center py-2 animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Password Reset Successfully!
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Your new password has been saved. Redirecting to sign in...
              </p>
            </div>
          </div>
        ) : (
          /* Set New Password Form */
          <>
            <div className="space-y-1 text-center">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[11px] font-mono mb-1">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Password Update</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Set New Password
              </h2>
              {targetEmail && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  For account <strong className="text-zinc-900 dark:text-zinc-100">{targetEmail}</strong>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full text-xs rounded-md pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full text-xs rounded-md pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center text-xs py-2"
                isLoading={isLoading}
              >
                Save New Password
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
