'use client';

import React from 'react';
import {
  Upload,
  Crop,
  Download,
  Check,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../../core/themeContext';

export type ComplianceStep = 1 | 2 | 3;

export interface ComplianceProgressBarProps {
  currentStep: ComplianceStep;
  toolName?: string;
  step1Label?: string;
  step2Label?: string;
  step3Label?: string;
  step1Desc?: string;
  step2Desc?: string;
  step3Desc?: string;
  onReset?: () => void;
  onReAdjust?: () => void;
  className?: string;
}

export const ComplianceProgressBar: React.FC<ComplianceProgressBarProps> = ({
  currentStep,
  toolName = 'Portal Compliance Process',
  step1Label = 'Upload Document',
  step2Label = 'Adjust & Crop',
  step3Label = 'Download Ready',
  step1Desc = 'Select original image or PDF',
  step2Desc = 'Align in interactive viewport',
  step3Desc = 'Save portal-compliant output',
  onReset,
  onReAdjust,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Calculate percentage width for continuous progress indicator
  const progressPercent = currentStep === 1 ? 25 : currentStep === 2 ? 65 : 100;

  const steps = [
    {
      num: 1 as const,
      label: step1Label,
      desc: step1Desc,
      icon: Upload,
    },
    {
      num: 2 as const,
      label: step2Label,
      desc: step2Desc,
      icon: Crop,
    },
    {
      num: 3 as const,
      label: step3Label,
      desc: step3Desc,
      icon: Download,
    },
  ];

  const getStatusBadge = () => {
    switch (currentStep) {
      case 1:
        return {
          text: 'Step 1 of 3: Waiting for Upload',
          color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        };
      case 2:
        return {
          text: 'Step 2 of 3: Align & Position',
          color: 'bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold',
        };
      case 3:
        return {
          text: 'Step 3 of 3: Compliant & Ready',
          color: 'bg-zinc-900 text-white border-zinc-900 font-semibold',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white p-4 sm:p-5 transition-colors ${className}`}
    >
      {/* Top Header Row with status badge and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs border ${
              currentStep === 3
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                {toolName}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${badge.color}`}
              >
                {badge.text}
              </span>
            </div>
          </div>
        </div>

        {/* Quick action buttons if file is already loaded */}
        <div className="flex items-center gap-2">
          {currentStep === 3 && onReAdjust && (
            <button
              onClick={onReAdjust}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Crop className="w-3.5 h-3.5 text-zinc-600" />
              <span>Adjust Again</span>
            </button>
          )}

          {currentStep > 1 && onReset && (
            <button
              onClick={onReset}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change File</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Track Line (Solid 2D Minimal) */}
      <div className="relative mb-5">
        <div className="h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full bg-zinc-900 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3 Step Nodes Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((st) => {
          const isDone = currentStep > st.num;
          const isCurrent = currentStep === st.num;
          const Icon = st.icon;

          return (
            <div
              key={st.num}
              className={`relative flex items-center gap-3 p-3 rounded-lg border transition-colors duration-150 ${
                isCurrent
                  ? 'bg-zinc-50 border-zinc-900 text-zinc-950 font-semibold'
                  : isDone
                    ? 'bg-white border-zinc-200 text-zinc-800'
                    : 'bg-zinc-50/60 border-zinc-200 text-zinc-400'
              }`}
            >
              {/* Step indicator box */}
              <div
                className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center font-bold text-xs border transition-colors ${
                  isCurrent
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : isDone
                      ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                      : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Icon className="w-3.5 h-3.5" />}
              </div>

              {/* Text content */}
              <div className="min-w-0 flex-1">
                <span
                  className={`text-xs block truncate ${
                    isCurrent
                      ? 'text-zinc-950 font-bold'
                      : isDone
                        ? 'text-zinc-800 font-medium'
                        : 'text-zinc-500'
                  }`}
                >
                  {st.label}
                </span>
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">{st.desc}</p>
              </div>

              {/* Step number badge */}
              <div
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  isCurrent
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : isDone
                      ? 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      : 'bg-transparent text-zinc-400 border-zinc-200'
                }`}
              >
                0{st.num}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
