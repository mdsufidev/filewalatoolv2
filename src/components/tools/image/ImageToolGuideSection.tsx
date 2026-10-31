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
  Layers,
} from 'lucide-react';
import { useTheme } from '../../../core/themeContext';
import { getImageToolContent, ImageToolContentData } from '../../../core/imageToolsContent';

export interface GuideStep {
  step: number;
  title: string;
  description: string;
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideTip {
  title: string;
  description: string;
}

export interface ImageToolGuideSectionProps {
  toolId?: string;
  customToolName?: string;
  customTagline?: string;
  customSteps?: GuideStep[];
  customTips?: GuideTip[];
  customFaqs?: GuideFaq[];
}

export const ImageToolGuideSection: React.FC<ImageToolGuideSectionProps> = ({
  toolId,
  customToolName,
  customTagline,
  customSteps,
  customTips = [],
  customFaqs,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Resolve content data from centralized IMAGE_TOOLS_CONTENT
  const contentData: ImageToolContentData | undefined = toolId ? getImageToolContent(toolId) : undefined;

  const toolName = contentData?.toolName || customToolName || 'Image Utility';
  const tagline = contentData?.tagline || customTagline || 'Fast, private, client-side in-browser image processing.';
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-2xl leading-relaxed">
                Your images and personal photographs never leave your device. All pixel calculations, cropping, compression, and conversions run directly in your local browser memory using HTML5 Canvas 2D and WebAssembly.
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
      {/* 2. OVERVIEW & WHAT IT DOES */}
      {/* ========================================================= */}
      {contentData && (
        toolId === 'compress-image' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: About Image Compressor */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Educational Guide &amp; Technical Capabilities</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                About {toolName}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {contentData.whatItDoes}
              </p>

              {/* Key Highlights / Feature Chips */}
              <div className="pt-2 space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Target KB Quota Solving:</strong> Set exact file sizes (20KB, 50KB, 100KB) with automatic binary search quantization.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>100% Client-Side Privacy:</strong> Execution occurs inside local browser RAM—zero files are ever sent to a server.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Live Split Slider Inspection:</strong> Drag the interactive comparison bar to verify pixel sharpness before downloading.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Infographic Card */}
            <div className="lg:col-span-5">
              <figure className="w-full flex flex-col items-center">
                <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
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
                <figcaption className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 text-center font-mono">
                  Figure: Reduce 1MB photo down to 300KB (or custom target KB) with instant in-browser compression.
                </figcaption>
              </figure>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>Educational Guide &amp; Technical Capabilities</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              About {toolName}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
              {contentData.whatItDoes}
            </p>
          </div>
        )
      )}

      {/* ========================================================= */}
      {/* 3. STEP-BY-STEP ACTIONABLE GUIDE (Unboxed Open Columns) */}
      {/* ========================================================= */}
      {steps.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>How to Use {toolName} in 3 Simple Steps</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Step-by-step instructions for fast, private, and compliant image processing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="group flex flex-col items-start space-y-3 select-none"
              >
                <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
                  0{s.step}
                </div>
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {s.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TECHNICAL SPECIFICATIONS MATRIX */}
      {/* ========================================================= */}
      {contentData && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              <span>Technical Architecture &amp; Specifications</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Empirical standards, processing libraries, and performance boundaries.
            </p>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b font-mono text-[11px] uppercase tracking-wider text-zinc-500 border-zinc-200 dark:border-zinc-800">
                  <th className="py-2.5 px-3 font-semibold">Parameter</th>
                  <th className="py-2.5 px-3 font-semibold">Implementation Specification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                <tr>
                  <td className="py-2 px-3 font-mono font-medium text-zinc-500 dark:text-zinc-400">Processing Engine</td>
                  <td className="py-2 px-3 font-medium">{contentData.technicalSpecs.engine}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-medium text-zinc-500 dark:text-zinc-400">Standard Specifications</td>
                  <td className="py-2 px-3">{contentData.technicalSpecs.standards}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-medium text-zinc-500 dark:text-zinc-400">Execution Mode</td>
                  <td className="py-2 px-3 flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{contentData.technicalSpecs.processingMode}</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-medium text-zinc-500 dark:text-zinc-400">Supported Inputs</td>
                  <td className="py-2 px-3">{contentData.technicalSpecs.supportedInputs}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-medium text-zinc-500 dark:text-zinc-400">Export Formats</td>
                  <td className="py-2 px-3">{contentData.technicalSpecs.outputFormats}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-medium text-zinc-500 dark:text-zinc-400">Size Guidance</td>
                  <td className="py-2 px-3">{contentData.technicalSpecs.fileSizeGuidance}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-medium text-zinc-500 dark:text-zinc-400">Privacy Guarantee</td>
                  <td className="py-2 px-3 font-medium text-emerald-600 dark:text-emerald-400">
                    {contentData.technicalSpecs.privacyGuarantee}
                  </td>
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
              Pro Tips &amp; Optimization Best Practices
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
      {/* 6. COMMON MISTAKES TO AVOID (Soft Borderless Tiles) */}
      {/* ========================================================= */}
      {contentData && contentData.commonMistakes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Common Mistakes &amp; Troubleshooting
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentData.commonMistakes.map((m, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl space-y-2 ${
                  isDark ? 'bg-zinc-850/60' : 'bg-zinc-100/70'
                }`}
              >
                <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{m.title}</span>
                </h3>
                <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400">
                  <p>
                    <strong className="text-zinc-800 dark:text-zinc-200">Mistake: </strong>
                    {m.mistake}
                  </p>
                  <p>
                    <strong className="text-emerald-600 dark:text-emerald-400">Solution: </strong>
                    {m.fix}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. SUPPORTED FORMATS & LIMITATIONS (Soft Borderless Tile) */}
      {/* ========================================================= */}
      {contentData && (
        <div
          className={`p-5 rounded-xl space-y-3 ${
            isDark ? 'bg-zinc-850/50' : 'bg-zinc-100/70'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Supported Formats &amp; Technical Capabilities</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {contentData.supportedFormats}
          </p>
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
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
      {/* 8. EXPANDABLE FAQS (100% Consistent with Schema.org & Prerendered SSR) */}
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
            Practical answers to common technical, privacy, and image formatting questions.
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
      {/* 9. RELATED IMAGE & CONVERTER UTILITIES */}
      {/* ========================================================= */}
      {contentData && contentData.relatedTools.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Related Image &amp; Format Utilities
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Switch to sibling tools to complete your image optimization workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {contentData.relatedTools.map((tool, idx) => (
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
      )}

      {/* ========================================================= */}
      {/* 10. DISCLAIMER */}
      {/* ========================================================= */}
      {contentData && (
        <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic leading-relaxed text-center">
            {contentData.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
};
