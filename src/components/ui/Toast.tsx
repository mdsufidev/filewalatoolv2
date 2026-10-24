import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useTheme } from '../../core/themeContext';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border transition-colors duration-150 animate-in fade-in slide-in-from-bottom-2 ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold">{toast.title}</h4>
              {toast.description && (
                <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className={`p-1 -mr-1 -mt-1 rounded-md transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
              }`}
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
