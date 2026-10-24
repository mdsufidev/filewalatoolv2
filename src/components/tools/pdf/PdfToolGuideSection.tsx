'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  HelpCircle,
  ChevronDown,
  Lightbulb,
  CheckCircle2,
  Lock,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../../../core/themeContext';

export interface GuideStep {
  step: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideTip {
  title: string;
  description: string;
}

export interface PdfToolGuideSectionProps {
  toolName: string;
  tagline: string;
  steps: GuideStep[];
  tips?: GuideTip[];
  faqs: GuideFaq[];
  privacyNotes?: string[];
}

export const PdfToolGuideSection: React.FC<PdfToolGuideSectionProps> = ({
  toolName,
  tagline,
  steps,
  tips = [],
  faqs,
  privacyNotes,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="mt-12 pt-8 border-t border-slate-800/80 space-y-10 animate-in fade-in duration-300">
      {/* 1. Client-Side Privacy Guarantee Banner */}
      <div
        className={`relative overflow-hidden rounded-lg border p-5 md:p-6 ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-9 h-9 rounded-md border flex items-center justify-center shrink-0 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  100% Client-Side Privacy & Zero Server Uploads
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Local Processing
                </span>
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {toolName} executes entirely inside your browser using HTML5 Canvas & WebAssembly.
                Your private files never leave your device, are never transmitted to any external cloud,
                and are discarded from RAM as soon as you finish.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-zinc-500" /> No Log Storage
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-zinc-500" /> WebAssembly Speed
            </span>
          </div>
        </div>

        {privacyNotes && privacyNotes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {privacyNotes.map((note, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Step-by-Step Visual Guide (1-2-3 cards) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className={`text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              How to Use {toolName}
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {tagline || 'Follow these quick steps to get optimal results in seconds.'}
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            {steps.length} Simple Steps
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {steps.map((st) => (
            <div
              key={st.step}
              className={`relative rounded-lg p-4 border transition-colors ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold border ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                  }`}
                >
                  {st.step}
                </span>
                {st.icon && (
                  <div className={`p-1.5 rounded ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {st.icon}
                  </div>
                )}
              </div>
              <h4 className={`text-sm font-semibold mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {st.title}
              </h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {st.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Interactive Tips & Best Practices Bar */}
      {tips.length > 0 && (
        <div
          className={`rounded-lg p-4 border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-zinc-500" />
            <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Pro Tips & Best Practices
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tips.map((tip, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {tip.title}
                </div>
                <div className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {tip.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Expandable FAQ & Troubleshooting Accordion */}
      {faqs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-zinc-500" />
            <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Frequently Asked Questions & Troubleshooting
            </h3>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-md border transition-colors overflow-hidden ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800'
                      : 'bg-white border-zinc-200'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-400' : isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className={`px-4 pb-3 pt-1 text-xs leading-relaxed border-t ${
                        isDark
                          ? 'text-slate-400 border-slate-800/60 bg-slate-950/20'
                          : 'text-slate-600 border-slate-100 bg-slate-50/50'
                      }`}
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
