'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error locally in dev mode without throwing
    if (process.env.NODE_ENV === 'development') {
      console.error('AppErrorBoundary caught an unhandled exception:', error, errorInfo);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] w-full flex items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20">
            <div className="w-10 h-10 mx-auto mb-4 rounded-md bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-5 h-5 stroke-[1.8]" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white mb-2">
              {this.props.fallbackTitle || 'Workspace Error Encountered'}
            </h3>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              An unexpected issue occurred while rendering this tool. Your browser memory remains secure and no files were uploaded.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition-colors duration-150 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Tool</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
