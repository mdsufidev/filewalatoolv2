import React, { useState } from 'react';
import {
  Download,
  Github,
  Monitor,
  Cpu,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Layers,
  Maximize2,
  ChevronDown,
  FileCheck2,
  Sliders,
  Eye,
  Terminal,
} from 'lucide-react';
import { useLanguage } from '../../core/languageContext';

interface DesktopAppPageProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'desktop') => void;
}

const CUSTOM_DOWNLOAD_EXE_URL =
  '/download/v1.0.0/FileWala-TOOL-Setup-1.0.0.exe';
const GITHUB_DOWNLOAD_EXE_URL =
  'https://github.com/mdsufidev/pixcutbgremover/releases/download/v1.0.0/FileWala-TOOL-Setup-1.0.0.exe';
const GITHUB_RELEASE_PAGE_URL =
  'https://github.com/mdsufidev/pixcutbgremover/releases/tag/v1.0.0';
const GITHUB_REPO_URL =
  'https://github.com/mdsufidev/pixcutbgremover';

export const DesktopAppPage: React.FC<DesktopAppPageProps> = ({ onBackHome }) => {
  const { language } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const desktopFaqs = [
    {
      q: language === 'hi'
        ? 'क्या FileWala Desktop ऐप पूरी तरह से ऑफलाइन (बिना इंटरनेट) काम करता है?'
        : 'Does FileWala Desktop work 100% offline without an active internet connection?',
      a: language === 'hi'
        ? 'हाँ, बिल्कुल! FileWala Desktop आपके कंप्यूटर पर एक स्थानीय बैकएंड डेमॉन (Local Daemon) चलाता है। सभी AI मॉडल्स (Ultra-Fast Preview V3 और U2Net) आपके लोकल स्टोरेज में इंस्टॉल होते हैं। इंस्टॉलेशन के बाद फोटो एन्हांस करने या बैकग्राउंड हटाने के लिए इंटरनेट की 1 KB भी ज़रूरत नहीं होती।'
        : 'Yes, absolutely. FileWala Desktop operates via an internal local daemon on your PC. Both the Ultra-Fast Preview V3 neural model and the U2Net background segmentation engine execute directly on your local hardware. Once installed, zero internet bandwidth or cloud telemetry is required.',
    },
    {
      q: language === 'hi'
        ? 'क्या इस ऐप को चलाने के लिए डेडिकेटेड NVIDIA GPU होना जरूरी है?'
        : 'Do I need a dedicated NVIDIA GeForce GPU to run FileWala Desktop?',
      a: language === 'hi'
        ? 'नहीं, GPU वैकल्पिक है। यदि आपके पास NVIDIA GPU (जैसे GTX 1050/1650 या RTX सीरीज) है, तो यह CUDA एक्सेलेरेशन का उपयोग करके 3-5 सेकंड में 4x अल्ट्रा एचडी परिणाम देता है। यदि GPU नहीं है, तो ऐप स्वचालित रूप से आपके मल्टी-कोर CPU (8 Cores/Intel/AMD) का उपयोग करता है।'
        : 'No, a dedicated GPU is optional. If you have an NVIDIA GeForce GTX or RTX card, the engine automatically leverages CUDA/Tensor acceleration for near-instant 3-5 second rendering. If no dedicated GPU is detected, the software seamlessly falls back to multi-threaded CPU execution across all available processor cores.',
    },
    {
      q: language === 'hi'
        ? 'वेब वर्जन और डेस्कटॉप ऐप में क्या मुख्य अंतर है?'
        : 'What is the main difference between FileWala Web and the Desktop App?',
      a: language === 'hi'
        ? 'वेब वर्जन ब्राउज़र की मेमोरी (RAM) सीमाओं के तहत काम करता है, जबकि डेस्कटॉप ऐप आपके पीसी की पूरी GPU और 8-कोर CPU शक्ति का उपयोग करता है। डेस्कटॉप ऐप में भारी 4K/8K तस्वीरों का 4x अल्ट्रा एचडी अपस्केलिंग, फेशियल पुपिल्स/स्किन टेक्सचर रेस्टोरेशन और असीमित बैच प्रोसेसिंग बिना किसी ब्राउज़र क्रैश के संभव है।'
        : 'While the web edition operates within browser sandbox constraints, the desktop application directly taps into your native PC hardware. It unlocks 4x Ultra HD neural upscaling, advanced facial pupil and skin pore texture reconstruction, and unlimited batch processing without browser tab memory ceilings.',
    },
    {
      q: language === 'hi'
        ? 'क्या यह Windows इंस्टॉलर (.exe) सुरक्षित और वायरस-मुक्त है?'
        : 'Is the Windows installer (.exe) verified and safe to run?',
      a: language === 'hi'
        ? 'हाँ, 100% सुरक्षित और ओपन-सोर्स है। यह आधिकारिक रूप से GitHub पर मोहम्मद सुफियान (@mdsufidev) द्वारा जारी किया गया है। आप GitHub रिलीज पेज पर इसका सोर्स कोड और चेकसम सत्यापित कर सकते हैं। इसमें कोई विज्ञापन, स्पाइवेयर या छिपा हुआ बैकडोर नहीं है।'
        : 'Yes, 100% safe, clean, and open-source. The binary is officially published on GitHub by Mohammad Sufiyan (@mdsufidev). You can independently inspect the release checksums and repository. It contains zero adware, zero background trackers, and zero telemetry.',
    },
    {
      q: language === 'hi'
        ? 'डायरेक्ट डाउनलोड और GitHub लिंक में क्या अंतर है?'
        : 'What is the difference between the Direct Download and GitHub links?',
      a: language === 'hi'
        ? 'डायरेक्ट डाउनलोड बटन बिना किसी रीडायरेक्शन के सीधे सेटअप फाइल (FileWala-TOOL-Setup-1.0.0.exe, 80.4 MB) को आपके सिस्टम में डाउनलोड करता है। GitHub लिंक डेवलपर्स और उन उपयोगकर्ताओं के लिए है जो चेंजलॉग, रिलीज नोट्स या सोर्स कोड देखना चाहते हैं।'
        : 'The Direct Download button initiates the official 80.4 MB installer download immediately without interstitial redirect chains. The GitHub link provides developers and users access to the open-source repository, full release notes, and commit history.',
    },
  ];

  const systemRequirements = [
    { label: 'Operating System', value: 'Windows 10 / Windows 11 (64-bit)' },
    { label: 'Application Version', value: 'v1.0.0 Official Release' },
    { label: 'Installer Size', value: '80.4 MB (FileWala-TOOL-Setup-1.0.0.exe)' },
    { label: 'Processor', value: 'Intel Core i3 / AMD Ryzen 3 or higher (8 Cores recommended)' },
    { label: 'Memory (RAM)', value: '4 GB minimum (8 GB+ recommended)' },
    { label: 'GPU Acceleration', value: 'NVIDIA GeForce GTX 1050 / 1650 / RTX or Intel/AMD Integrated' },
    { label: 'Internet Connectivity', value: '100% Offline (None required after setup)' },
    { label: 'License & Cost', value: 'Free Forever & Open Source (By @mdsufidev)' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14 select-none animate-in fade-in duration-150">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'होम पर वापस जाएं' : 'Back to Home'}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
            Windows 64-bit Edition
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
            v1.0.0
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. HERO & DIRECT DOWNLOAD HUB (Swiss / Linear 2D Style) */}
      {/* ========================================================= */}
      <div className="space-y-6 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-750 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
          <Monitor className="w-3.5 h-3.5" />
          <span>Official Desktop Release • 100% Offline AI Suite</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.15]">
          {language === 'hi'
            ? 'FileWala Desktop: ऑफलाइन AI फोटो एन्हांसर व बैकग्राउंड रिमूवर'
            : 'FileWala Desktop for Windows: Offline AI Picture Enhancer & BG Remover'}
        </h1>

        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal max-w-3xl">
          {language === 'hi'
            ? 'अपने विंडोज़ पीसी पर सीधे GPU-एक्सेलेरेटेड फेशियल रेस्टोरेशन, 4x अल्ट्रा एचडी अपस्केलिंग और तुरंत U2Net बैकग्राउंड रिमूवल का अनुभव करें। बिना इंटरनेट, बिना क्लाउड अपलोड और हमेशा 100% मुफ्त।'
            : 'Experience native GPU-accelerated facial pupil and skin texture restoration, 4x Ultra HD upscaling, and instant U2Net background removal right on your PC. No internet connection needed, zero cloud latency, and 100% private.'}
        </p>

        {/* Action Buttons: Direct Download + GitHub Release */}
        <div className="pt-2 flex flex-wrap items-center gap-3.5">
          {/* Direct Download Link (Immediate download via custom domain) */}
          <a
            href={CUSTOM_DOWNLOAD_EXE_URL}
            download="FileWala-TOOL-Setup-1.0.0.exe"
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors duration-150 cursor-pointer shadow-none"
            title="Download FileWala TOOL Setup 1.0.0 EXE directly"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
            <div className="text-left leading-tight">
              <div>Download for Windows (.exe)</div>
              <div className="text-[10px] font-mono opacity-80 font-normal">
                v1.0.0 · 80.4 MB · 64-bit Direct Installer
              </div>
            </div>
          </a>

          {/* GitHub Source & Releases Link */}
          <a
            href={GITHUB_RELEASE_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150 cursor-pointer"
            title="View Release on GitHub"
          >
            <Github className="w-4 h-4" />
            <span>GitHub Release &amp; Source</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500 pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            <span>Zero Cloud Telemetry</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            <span>NVIDIA GPU &amp; CPU Hybrid</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            <span>Clean Verified Executable</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SEO SCREENSHOT SHOWCASE (Semantic <figure> Layout) */}
      {/* ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 mb-1.5">
              <span>Application Screenshot &amp; UI Inspection</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {language === 'hi'
                ? 'लाइव स्प्लिट-स्लाइडर फेशियल रेस्टोरेशन व U2Net इंजन'
                : 'Interactive Split-Slider Face Restoration & U2Net Engine UI'}
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            NVIDIA GeForce GTX 1650 / u2net
          </span>
        </div>

        {/* Semantic Screenshot Container with Desktop Chrome Frame */}
        <figure className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-950 overflow-hidden shadow-none">
          {/* Mock Window Top Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
              <span className="ml-2 font-medium text-zinc-300">FileWala TOOL v1.0.0 — AI Picture Enhancer [Hybrid Pro]</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] hidden sm:flex">
              <span>309 × 375 px</span>
              <span>•</span>
              <span className="text-emerald-400">3313.8 ms</span>
              <span>•</span>
              <span>GPU (NVIDIA GeForce GTX 1650) / u2net</span>
            </div>
          </div>

          {/* Screenshot Image with high-fidelity SEO attributes */}
          <div className="relative w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
            <img
              src="/filewala-desktop-app.png"
              alt="FileWala Desktop Windows App v1.0.0 showing AI Picture Enhancer with split-slider face restoration, Ultra-Fast Preview V3 model, 4x Ultra HD upscaling, and NVIDIA GeForce GTX 1650 GPU acceleration"
              title="FileWala Desktop Application v1.0.0 - Offline AI Photo Enhancer & U2Net Background Remover"
              width={1024}
              height={667}
              loading="eager"
              className="w-full h-auto object-contain block select-none"
            />
          </div>

          {/* Screenshot Detailed Caption */}
          <figcaption className="p-4 bg-zinc-900/90 border-t border-zinc-800 text-xs text-zinc-400 leading-relaxed font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              Real-time offline preview: Left shows blurry source photo; Right reveals reconstructed facial pupils, eyelashes, skin pores, and clothing texture.
            </span>
            <span className="text-[11px] text-zinc-500 shrink-0">
              Output: 1x (Orig Size), 2x Upscale, 4x Ultra HD
            </span>
          </figcaption>
        </figure>
      </div>

      {/* ========================================================= */}
      {/* 3. CORE ARCHITECTURAL CAPABILITIES (2D 4-Column Layout) */}
      {/* ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {language === 'hi' ? 'डेस्कटॉप सॉफ्टवेयर के मुख्य फीचर्स' : 'Desktop Architecture & Neural Capabilities'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'hi'
              ? 'बिना किसी क्लाउड सब्सक्रिप्शन या एपीआई फीस के सीधे अपने पीसी पर शक्तिशाली मॉडल्स चलाएं:'
              : 'Engineered for photographers, cyber cafes, and applicants requiring offline workstation performance.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {/* Feature 1 */}
          <div className="space-y-2.5 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Sparkles className="w-4 h-4 stroke-[1.8]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'फेशियल पुपिल व स्किन रेस्टोरेशन' : 'Facial Pupil & Texture Restoration'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'अल्ट्रा-फास्ट प्रिव्यू V3 मॉडल धुंधले चेहरों में आंखों की पुतलियां, पलकें और प्राकृतिक त्वचा के छिद्रों को सटीक रूप से पुनर्जीवित करता है।'
                : 'The Ultra-Fast Preview V3 neural model restores blurred eyes, pupil reflections, skin pores, and clothing weave with natural sharpness.'}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="space-y-2.5 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Maximize2 className="w-4 h-4 stroke-[1.8]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? '4x अल्ट्रा एचडी अपस्केलिंग' : '1x, 2x & 4x Ultra HD Upscaling'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'फोटो को बिना पिक्सलेट किए 2x या 4x रिज़ॉल्यूशन तक बड़ा करें, या सरकारी फॉर्म्स के लिए 1x मूल डाइमेंशन्स में क्वालिटी बढ़ाएं।'
                : 'Scale low-res images up to 4x Ultra HD for large format printing, or enhance sharpness at exact 1x dimensions for government portals.'}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="space-y-2.5 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Layers className="w-4 h-4 stroke-[1.8]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'U2Net बैकग्राउंड रिमूवर' : 'Integrated U2Net BG Remover'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'एन्हांस की गई तस्वीर से एक क्लिक में बैकग्राउंड हटाएं। U2Net मॉडल बालों की बारीक लटों को भी पारदर्शी PNG में अलग कर देता है।'
                : 'Switch seamlessly to extract transparent PNG cutouts directly from enhanced images using the offline U2Net segmentation pipeline.'}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="space-y-2.5 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Cpu className="w-4 h-4 stroke-[1.8]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {language === 'hi' ? 'GPU व 8-कोर CPU स्पीड' : 'NVIDIA CUDA & Multi-Core Speed'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {language === 'hi'
                ? 'NVIDIA GeForce GPU और मल्टी-थ्रेडेड CPU डेमॉन 3 सेकंड में प्रोसेस करता है। ब्राउज़र मेमोरी क्रैश की कोई सीमा नहीं।'
                : 'Direct CUDA acceleration executes on NVIDIA GPUs alongside multi-threaded CPU fallback, eliminating web browser memory limits.'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. SYSTEM REQUIREMENTS & SPECIFICATIONS TABLE */}
      {/* ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {language === 'hi' ? 'सिस्टम आवश्यकताएं व स्पेसिफिकेशन्स' : 'System Requirements & Specifications'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'hi'
              ? 'सामान्य लैपटॉप से लेकर हाई-एंड वर्कस्टेशन तक सुचारू रूप से चलता है:'
              : 'Compatible with standard modern Windows workstations and laptops.'}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
            {systemRequirements.map((req, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors"
              >
                <span className="font-mono text-zinc-500 font-medium sm:w-1/3">
                  {req.label}
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 sm:w-2/3 sm:text-right mt-0.5 sm:mt-0 font-mono">
                  {req.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. STEP-BY-STEP QUICK START GUIDE (Schema HowTo) */}
      {/* ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {language === 'hi' ? 'इंस्टॉलेशन व उपयोग कैसे करें' : 'How to Install and Use FileWala Desktop'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'hi'
              ? 'मात्र 2 मिनट में अपने पीसी पर सेटअप पूरा करें:'
              : 'Get started with offline photo restoration in 3 simple steps.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <span className="font-mono text-xs font-bold text-zinc-500">STEP 01</span>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Download Installer (.exe)
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Click the direct download button to save <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">FileWala-TOOL-Setup-1.0.0.exe</code> (80.4 MB) onto your computer.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <span className="font-mono text-xs font-bold text-zinc-500">STEP 02</span>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Run One-Click Setup
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Double-click the installer. It configures the local AI daemon, bundles neural weights, and creates a desktop shortcut automatically.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <span className="font-mono text-xs font-bold text-zinc-500">STEP 03</span>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Enhance Offline
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Launch FileWala TOOL, drag in any blurry image, inspect with the split-slider, and export crystal-clear portraits in seconds.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. FAQS (Schema FAQPage) */}
      {/* ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {language === 'hi' ? 'अक्सर पूछे जाने वाले सवाल (Desktop FAQ)' : 'Frequently Asked Questions (Desktop Software)'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'hi'
              ? 'इंस्टॉलेशन, हार्डवेयर सपोर्ट और प्राइवेसी से संबंधित सभी जानकारियां:'
              : 'Everything you need to know about offline processing and system performance.'}
          </p>
        </div>

        <div className="space-y-2">
          {desktopFaqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left text-xs sm:text-sm font-semibold text-zinc-950 dark:text-zinc-100 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-zinc-950 dark:text-zinc-100' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. BOTTOM DOWNLOAD CALLOUT STRIP */}
      {/* ========================================================= */}
      <div className="p-6 sm:p-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50">
            Ready to enhance photos with native GPU acceleration?
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Download FileWala TOOL Setup 1.0.0 for Windows (64-bit). 100% free and open-source.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={GITHUB_DOWNLOAD_EXE_URL}
            download="FileWala-TOOL-Setup-1.0.0.exe"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors duration-150 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Download .EXE (80 MB)</span>
          </a>

          <a
            href={GITHUB_RELEASE_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
};
