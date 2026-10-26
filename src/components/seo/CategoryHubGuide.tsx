import React, { useState } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../../core/themeContext';
import { useLanguage } from '../../core/languageContext';
import {
  CATEGORY_HUBS_CONTENT,
  CategoryHubData,
} from '../../core/categoryHubsContent';

interface CategoryHubGuideProps {
  categoryId: 'image-tools' | 'pdf-tools' | 'convert';
  onLaunchTool?: (
    section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools',
    subToolId: string
  ) => void;
  className?: string;
}

export const CategoryHubGuide: React.FC<CategoryHubGuideProps> = ({
  categoryId,
  onLaunchTool,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { language } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const hubData: CategoryHubData = CATEGORY_HUBS_CONTENT[categoryId];

  if (!hubData) return null;

  return (
    <section className={`w-full space-y-12 select-none ${className}`}>
      {/* =========================================================
          1. TECHNICAL OVERVIEW & ARCHITECTURE
      ========================================================= */}
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
            <Cpu className="w-3.5 h-3.5" />
            <span>{hubData.badge}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {hubData.overviewHeading}
          </h2>

          <div className="space-y-3 pt-1 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {hubData.overviewParagraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </div>

        {/* 4 Architecture Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {hubData.architecturePoints.map((point, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-lg border text-left space-y-1.5 ${
                isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {point.title}
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {point.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================
          2. FEATURED WORKFLOWS (Internal Canonical Links & Quick Launch)
      ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {hubData.workflowsHeading}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Quickly navigate to verified client-side tools with guaranteed zero server uploads.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {hubData.workflows.map((wf, idx) => (
            <a
              key={idx}
              href={wf.slug}
              onClick={(e) => {
                if (onLaunchTool) {
                  e.preventDefault();
                  onLaunchTool(wf.actionSection, wf.subToolId);
                }
              }}
              className={`group p-4 rounded-lg border text-left flex flex-col justify-between transition-colors duration-150 cursor-pointer ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 shadow-2xs'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors">
                    {wf.title}
                  </h3>
                  {wf.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shrink-0">
                      {wf.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {wf.description}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                <span className="font-mono text-zinc-400">{wf.slug}</span>
                <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Launch Tool</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* =========================================================
          3. SPECIFICATIONS & CAPABILITIES MATRIX
      ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {hubData.matrixHeading}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Technical execution characteristics and verified privacy levels.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/60 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                <th className="py-2.5 px-4 font-semibold">Utility Name</th>
                <th className="py-2.5 px-4 font-semibold">Supported Formats</th>
                <th className="py-2.5 px-4 font-semibold">Primary Use Case</th>
                <th className="py-2.5 px-4 font-semibold">Execution Engine</th>
                <th className="py-2.5 px-4 font-semibold">Privacy Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {hubData.matrixRows.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/30 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {row.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                    {row.format}
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                    {row.primaryUse}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                    {row.processingEngine}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{row.privacyGuarantee}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          4. FREQUENTLY ASKED QUESTIONS (Native <details> with SSR answers)
      ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {hubData.faqsHeading}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Authoritative answers regarding privacy, file limits, and client-side processing performance.
          </p>
        </div>

        <div className="space-y-2">
          {hubData.faqs.map((faq, idx) => {
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
                className={`group rounded-lg border transition-colors ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <summary className="w-full p-4 text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors list-none [&::-webkit-details-marker]:hidden select-none">
                  <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-zinc-900 dark:text-white' : ''
                    }`}
                  />
                </summary>
                <div
                  className={`px-4 pb-4 text-xs sm:text-sm leading-relaxed border-t pt-3 ${
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
    </section>
  );
};
