'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Zap,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../../../core/themeContext';
import { useLanguage } from '../../../core/languageContext';
import { GOV_TOOLS_CONTENT, GovToolContentData } from '../../../core/govToolsContent';

interface GovToolGuideSectionProps {
  toolId: string;
}

export const GovToolGuideSection: React.FC<GovToolGuideSectionProps> = ({ toolId }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { language } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const data: GovToolContentData | undefined = GOV_TOOLS_CONTENT[toolId];
  if (!data) return null;

  return (
    <section className="w-full max-w-7xl mx-auto space-y-14 select-none pt-10 border-t border-zinc-200 dark:border-zinc-800">
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
                  Gov-Safe Local
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-2xl leading-relaxed">
                Your government identity documents, Aadhaar cards, passport photos, and signatures never leave your browser RAM. All byte compression and DPI embedding occur locally via WebAssembly and HTML5 Canvas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Lock className="w-3 h-3 text-emerald-500" />
              <span>0 Bytes Transmitted</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. OVERVIEW & TARGET AUDIENCE */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Official Portal Guidelines &amp; Standards</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            About {data.toolName}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed max-w-4xl">
            {data.whatItDoes}
          </p>
        </div>

        {/* Target Audience Badges */}
        <div className="pt-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-2">
            Applicable Portals &amp; Candidate Categories:
          </div>
          <div className="flex flex-wrap gap-2">
            {data.targetAudience.map((audience, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100/80 dark:bg-zinc-850/80 text-zinc-800 dark:text-zinc-200"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{audience}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Visual SEO Infographic for KB Resizer */}
      {toolId === 'kb-resizer' && (
        <figure className="w-full my-6 flex flex-col items-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white p-3 sm:p-5 shadow-sm">
            <img
              src="/image-compress-to-kb.png"
              alt="Image Compress to KB - FileWala Tool Before and After File Size Reduction (1MB to 300KB)"
              loading="lazy"
              decoding="async"
              width={1024}
              height={512}
              className="w-full h-auto object-contain rounded-xl"
            />
          </div>
          <figcaption className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400 text-center font-mono">
            Figure: Reduce 1MB photo down to 300KB (or custom target KB) with instant in-browser compression.
          </figcaption>
        </figure>
      )}

      {/* ========================================================= */}
      {/* 3. STEP-BY-STEP ACTIONABLE GUIDE (Unboxed Open Columns) */}
      {/* ========================================================= */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>How to Use This Tool in 4 Simple Steps</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Follow this practical walkthrough to prepare your file without portal rejection.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {data.steps.map((step, idx) => (
            <div
              key={idx}
              className="group flex flex-col items-start space-y-3 select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
                0{idx + 1}
              </div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {step.title}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. VERIFIED OFFICIAL REQUIREMENTS MATRIX */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 mb-1.5">
              <span>Official Verification Matrix</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Official Portal Specifications &amp; Requirements
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Source Verified: 2026 Guidelines
          </span>
        </div>

        {data.recommendationNotice && (
          <div className="flex items-start gap-2.5 pl-3 border-l-2 border-blue-500/80 py-1 text-xs text-zinc-700 dark:text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{data.recommendationNotice}</p>
          </div>
        )}

        {/* Responsive 2D Portal Compliance Cards Grid (Zero Sideways Scroll, Zero Empty Space) */}
        <div className={`grid grid-cols-1 ${data.officialMatrix.length > 1 ? 'lg:grid-cols-2' : ''} gap-4`}>
          {data.officialMatrix.map((matrix, idx) => (
            <div
              key={idx}
              className={`p-4 sm:p-5 rounded-xl border space-y-3.5 transition-colors duration-150 ${
                isDark
                  ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
              }`}
            >
              {/* Header: Portal Name + Direct Working Official Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50">
                    {matrix.portalName}
                  </h3>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    {matrix.applicableForms}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <a
                    href={matrix.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open official portal for ${matrix.portalName}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer select-none"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                    {matrix.accessDate}
                  </span>
                </div>
              </div>

              {/* 4-Metric High-Density Spec Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                    Dimensions
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                    {matrix.dimensions}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                    File Size
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                    {matrix.fileSizeRange}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                    Resolution (DPI)
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                    {matrix.dpi}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                    Format
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                    {matrix.format}
                  </span>
                </div>
              </div>

              {/* Special Rules & Active FileWala Preset */}
              <div className="pt-1 space-y-2 text-xs">
                <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  <strong className="text-zinc-800 dark:text-zinc-200">Mandatory Rule: </strong>
                  {matrix.specialRules}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/70 text-[11px]">
                  <span className="font-mono text-zinc-500 uppercase text-[10px]">FileWala Preset:</span>
                  <span className="px-2 py-0.5 rounded font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px]">
                    {matrix.fileWalaPreset}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Applicant Reminder (Editorial Left Accent Note, Zero Outer Box) */}
        <div className="flex items-start gap-2.5 pl-3 border-l-2 border-amber-500/80 py-1 text-xs text-zinc-700 dark:text-zinc-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Important Applicant Notice:</strong> {data.applicantReminder}
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. COMMON REJECTION MISTAKES (Soft Borderless Tiles) */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <span>Common Mistakes That Lead to Portal Upload Rejection</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Avoid these frequent file-preparation errors to ensure your upload passes automated portal verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.commonMistakes.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-lg space-y-2 text-left ${
                isDark ? 'bg-zinc-850/40' : 'bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-rose-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                <strong className="text-rose-600 dark:text-rose-400 font-semibold">The Trap: </strong>
                {item.mistake}
              </p>
              <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded leading-relaxed font-normal">
                <strong className="font-semibold text-emerald-900 dark:text-emerald-200">The Fix: </strong>
                {item.fix}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. SUPPORTED FORMATS & CLIENT-SIDE LIMITATIONS (Unboxed Clean Section) */}
      {/* ========================================================= */}
      <div className="py-4 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Local Engine &amp; Device Compatibility</span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {data.supportedFormats}
        </p>
        <div className="pt-1.5">
          <span className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">Real-World Notes:</span>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {data.limitations.map((lim, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
              >
                • {lim}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. GENUINE EXPANDABLE FAQS (100% Consistent with Schema) */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-zinc-500" />
            <span>Frequently Asked Questions</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Answers to common questions regarding specifications, privacy, and file formatting.
          </p>
        </div>

        <div className="space-y-2">
          {data.faqs.map((faq, idx) => {
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

      {/* ========================================================= */}
      {/* 8. RELATED FILEWALA UTILITIES (Internal Linking Silo) */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Related Government &amp; Identity Utilities
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Switch to sibling tools to complete your document submission package.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {data.relatedTools.map((tool, idx) => (
            <a
              key={idx}
              href={tool.url}
              className={`p-4 rounded-xl transition-colors duration-150 group flex flex-col justify-between ${
                isDark
                  ? 'bg-zinc-900/60 hover:bg-zinc-850'
                  : 'bg-zinc-100/70 hover:bg-zinc-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors">
                    {tool.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 9. MANDATORY NON-AFFILIATION DISCLAIMER BANNER */}
      {/* ========================================================= */}
      <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic leading-relaxed text-center">
          {data.disclaimer}
        </p>
      </div>
    </section>
  );
};
