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
  FileCheck2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '../../../core/themeContext';
import { PDF_TOOLS_CONTENT, PdfToolContentData } from '../../../core/pdfToolsContent';

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
  toolId?: string;
  toolName?: string;
  tagline?: string;
  steps?: GuideStep[];
  tips?: GuideTip[];
  faqs?: GuideFaq[];
  privacyNotes?: string[];
}

export const PdfToolGuideSection: React.FC<PdfToolGuideSectionProps> = ({
  toolId,
  toolName: customToolName,
  tagline: customTagline,
  steps: customSteps,
  tips: customTips = [],
  faqs: customFaqs,
  privacyNotes: customPrivacyNotes,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Resolve content data either from centralized PDF_TOOLS_CONTENT or props
  const contentData: PdfToolContentData | undefined = toolId ? PDF_TOOLS_CONTENT[toolId] : undefined;

  const toolName = contentData?.toolName || customToolName || 'PDF Utility';
  const tagline = contentData?.tagline || customTagline || 'Fast, private, in-browser PDF document processing.';
  const steps: GuideStep[] = contentData
    ? contentData.steps.map((s) => ({ step: s.step, title: s.title, description: s.desc }))
    : customSteps || [];
  const tips: GuideTip[] = contentData
    ? contentData.proTips.map((t) => ({ title: t.title, description: t.desc }))
    : customTips;
  const faqs: GuideFaq[] = contentData ? contentData.faqs : customFaqs || [];

  return (
    <div className="w-full max-w-7xl mx-auto mt-14 pt-10 border-t border-zinc-200 dark:border-zinc-800 space-y-14 animate-in fade-in duration-300 select-none">
      {/* ========================================================= */}
      {/* 1. Client-Side Privacy Guarantee (Sleek Borderless Strip) */}
      {/* ========================================================= */}
      <div className="py-4 border-y border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  100% Client-Side Privacy &amp; Zero Server Uploads
                </h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Local RAM
                </span>
              </div>
              <p className={`text-xs mt-0.5 leading-relaxed max-w-2xl ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {toolName} executes entirely inside your browser using HTML5 Canvas &amp; WebAssembly.
                Your private files never leave your device and are discarded from RAM as soon as you finish.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Lock className="w-3 h-3 text-emerald-500" />
              <span>No Log Storage</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Cpu className="w-3 h-3 text-emerald-500" />
              <span>WebAssembly Speed</span>
            </span>
          </div>
        </div>

        {customPrivacyNotes && customPrivacyNotes.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {customPrivacyNotes.map((note, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. OVERVIEW & WHO NEEDS THIS TOOL */}
      {/* ========================================================= */}
      {contentData && (
        <div className="space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 mb-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Document Processing Guide</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              About {contentData.toolName}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed max-w-4xl">
              {contentData.whatItDoes}
            </p>
          </div>

          <div
            className={`p-5 rounded-xl space-y-2.5 ${
              isDark ? 'bg-zinc-850/60' : 'bg-zinc-100/70'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-2">
              Who Needs This Tool:
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              {contentData.targetAudience.map((audience, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{audience}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. STEP-BY-STEP ACTIONABLE GUIDE (Unboxed Open Columns) */}
      {/* ========================================================= */}
      {steps.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>How to Use {toolName} in {steps.length} Simple Steps</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {tagline}
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              {steps.length} Simple Steps
            </span>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 ${steps.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8`}>
            {steps.map((st) => (
              <div
                key={st.step}
                className="group flex flex-col items-start space-y-3 select-none"
              >
                <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
                  0{st.step}
                </div>
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {st.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                  {st.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. VERIFIED TECHNICAL SPECIFICATIONS MATRIX */}
      {/* ========================================================= */}
      {contentData && (
        <div className="space-y-4">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 mb-1.5">
              <span>Technical Standards &amp; Architecture</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Technical Specifications &amp; Compatibility
            </h2>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b font-mono text-[11px] uppercase tracking-wider text-zinc-500 border-zinc-200 dark:border-zinc-800">
                  <th className="py-2.5 px-3 font-semibold">Specification</th>
                  <th className="py-2.5 px-3 font-semibold">Implementation Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono text-xs">
                <tr>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">Core Library / Engine</td>
                  <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">{contentData.technicalSpecs.library}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">Document Standards</td>
                  <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">{contentData.technicalSpecs.standards}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">Processing Mode</td>
                  <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-medium">{contentData.technicalSpecs.processingMode}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">Supported Inputs</td>
                  <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">{contentData.technicalSpecs.supportedInputs}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">Output Formats</td>
                  <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">{contentData.technicalSpecs.outputFormats}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">File Capacity &amp; Limits</td>
                  <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">{contentData.technicalSpecs.fileSizeGuidance}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">Privacy Model</td>
                  <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">{contentData.technicalSpecs.privacyGuarantee}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. PRO TIPS & BEST PRACTICES (Unboxed Open Columns) */}
      {/* ========================================================= */}
      {tips.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Pro Tips &amp; Best Practices
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tips.map((tip, idx) => (
              <div
                key={idx}
                className="group flex flex-col items-start space-y-2.5 select-none"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {tip.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                  {tip.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. COMMON MISTAKES & TROUBLESHOOTING (Soft Tiles) */}
      {/* ========================================================= */}
      {contentData && contentData.commonMistakes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Common Errors &amp; Troubleshooting Guide
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Avoid these common PDF processing mistakes to achieve clean, error-free results.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentData.commonMistakes.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl space-y-2 text-left ${
                  isDark ? 'bg-zinc-850/60' : 'bg-zinc-100/70'
                }`}
              >
                <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.title}</span>
                </h3>
                <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400">
                  <p>
                    <strong className="text-zinc-800 dark:text-zinc-200">The Problem: </strong>
                    {item.mistake}
                  </p>
                  <p>
                    <strong className="text-emerald-600 dark:text-emerald-400">How to Fix: </strong>
                    {item.fix}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. SUPPORTED FORMATS & LIMITATIONS (Soft Tile) */}
      {/* ========================================================= */}
      {contentData && (
        <div
          className={`p-5 rounded-xl space-y-3 ${
            isDark ? 'bg-zinc-850/60' : 'bg-zinc-100/70'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Supported Formats &amp; Technical Capabilities</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {contentData.supportedFormats}
          </p>
          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <span className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Real-World Technical Limitations:</span>
            <ul className="list-disc list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-1 mt-1">
              {contentData.limitations.map((lim, idx) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. EXPANDABLE FAQS (100% Consistent with Schema.org) */}
      {/* ========================================================= */}
      {faqs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-zinc-500" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Frequently Asked Questions &amp; Troubleshooting
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Practical answers to common technical, privacy, and formatting questions.
          </p>

          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <details
                  key={idx}
                  open={isOpen}
                  onToggle={(e) => {
                    const isNowOpen = e.currentTarget.open;
                    if (isNowOpen) {
                      setOpenFaqIndex(idx);
                    } else if (openFaqIndex === idx) {
                      setOpenFaqIndex(null);
                    }
                  }}
                  className={`group rounded-xl border transition-colors ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}
                >
                  <summary className="w-full p-4 text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors list-none [&::-webkit-details-marker]:hidden select-none">
                    <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-zinc-900 dark:text-white' : ''
                      }`}
                    />
                  </summary>
                  <div
                    className={`px-4 pb-4 text-xs sm:text-sm leading-relaxed border-t ${
                      isDark ? 'text-zinc-400 border-zinc-800' : 'text-zinc-600 border-zinc-100'
                    }`}
                  >
                    {faq.answer}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. RELATED PDF & DOCUMENT UTILITIES */}
      {/* ========================================================= */}
      {contentData && contentData.relatedTools.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Related PDF &amp; Document Utilities
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Switch to sibling tools to complete your document workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {contentData.relatedTools.map((tool, idx) => (
              <a
                key={idx}
                href={tool.url}
                className={`p-3.5 rounded-lg border transition-all duration-150 block text-left group ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
                    : 'bg-white border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {tool.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {tool.desc}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. COMPLIANCE & NON-AFFILIATION DISCLAIMER */}
      {/* ========================================================= */}
      {contentData && (
        <div
          className={`p-4 rounded-lg border text-xs text-left leading-relaxed ${
            isDark
              ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
              : 'bg-zinc-100/70 border-zinc-200 text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            <ShieldCheck className="w-4 h-4 text-zinc-500" />
            <span>Format Standards &amp; Privacy Disclaimer</span>
          </div>
          <p>{contentData.disclaimer}</p>
        </div>
      )}
    </div>
  );
};
