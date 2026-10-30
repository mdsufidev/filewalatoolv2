'use client';

import React from 'react';
import { Award, Lock, Cpu, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../core/languageContext';

export const TrustCertificationSection: React.FC = () => {
  const { language } = useLanguage();

  const trustPillars = [
    {
      id: 'govt-spec',
      icon: Award,
      bgColor: 'bg-amber-500',
      tag: 'PAN • UPSC • SSC',
      title: language === 'hi' ? 'सरकारी मानक अनुरूप' : 'Govt Spec Calibrated',
      description:
        language === 'hi'
          ? 'सटीक पिक्सेल व KB मानक अनुरूप।'
          : 'Exact pixel & KB limits for Indian portals.',
    },
    {
      id: 'ssl-encryption',
      icon: Lock,
      bgColor: 'bg-indigo-500',
      tag: 'TLS 1.3 • HSTS',
      title: language === 'hi' ? '256-बिट SSL सुरक्षित' : '256-Bit SSL Encrypted',
      description:
        language === 'hi'
          ? 'एंड-टू-एंड एन्क्रिप्टेड एसेट डिलीवरी।'
          : 'End-to-end encrypted asset delivery.',
    },
    {
      id: 'in-browser',
      icon: Cpu,
      bgColor: 'bg-emerald-500',
      tag: language === 'hi' ? 'शून्य क्लाउड' : 'Zero Cloud Uploads',
      title: language === 'hi' ? '100% इन-ब्राउज़र रैम' : '100% In-Browser RAM',
      description:
        language === 'hi'
          ? 'लोकल WebAssembly, शून्य अपलोड।'
          : 'Client WebAssembly. Zero server uploads.',
    },
    {
      id: 'dpdp-gdpr',
      icon: ShieldCheck,
      bgColor: 'bg-violet-500',
      tag: 'DPDP Act 2023',
      title: language === 'hi' ? 'DPDP अनुपालन' : 'Privacy Law Compliant',
      description:
        language === 'hi'
          ? 'शून्य ट्रैकिंग कुकीज व डेटा रिटेंशन।'
          : 'Zero tracking cookies or data retention.',
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 select-none">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-2 mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
          <span>{language === 'hi' ? 'सुरक्षा व मानक' : 'Security Architecture'}</span>
        </div>

        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {language === 'hi'
            ? 'गोपनीयता व सुरक्षा के लिए समर्पित'
            : 'Built for Privacy. Crafted for Indian Forms.'}
        </h2>

        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto font-normal">
          {language === 'hi'
            ? 'सभी फोटो, आईडी व दस्तावेज़ सीधे आपके ब्राउज़र में प्रोसेस होते हैं — शून्य अपलोड, शून्य ट्रैकिंग।'
            : 'Process IDs, photos & PDFs inside local browser RAM — zero server uploads, zero tracking.'}
        </p>
      </div>

      {/* 2x2 Grid on Mobile, 4 Columns on Desktop - Centered & 2D Flat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 text-center">
        {trustPillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.id}
              className="group flex flex-col items-center text-center p-3.5 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-850/60 transition-colors select-none"
            >
              {/* App-Tile 2D Flat Badge */}
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${pillar.bgColor} text-white flex items-center justify-center shrink-0 mb-3 transition-transform duration-200 ease-out group-hover:scale-105`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
              </div>

              {/* Minimalist Spec Tag */}
              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 mb-1.5">
                {pillar.tag}
              </div>

              {/* Pillar Title */}
              <h3 className="text-xs sm:text-base font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight leading-snug">
                {pillar.title}
              </h3>

              {/* Pillar Description */}
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-snug mt-1 font-normal">
                {pillar.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
