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
          ? 'PAN, UPSC, SSC व पासपोर्ट पोर्टलों के पिक्सेल व KB मानक के अनुरूप।'
          : 'Calibrated to official portal pixel dimensions and strict KB limits.',
    },
    {
      id: 'ssl-encryption',
      icon: Lock,
      bgColor: 'bg-indigo-500',
      tag: 'TLS 1.3 • HSTS',
      title: language === 'hi' ? '256-बिट SSL सुरक्षित' : '256-Bit SSL Encryption',
      description:
        language === 'hi'
          ? 'HSTS व 256-बिट एन्क्रिप्शन के साथ सभी एसेट्स सुरक्षित डिलीवर होते हैं।'
          : 'Encrypted delivery protecting your assets against any network tampering.',
    },
    {
      id: 'in-browser',
      icon: Cpu,
      bgColor: 'bg-emerald-500',
      tag: language === 'hi' ? 'शून्य क्लाउड' : 'Zero Cloud Uploads',
      title: language === 'hi' ? '100% इन-ब्राउज़र रैम' : '100% In-Browser RAM',
      description:
        language === 'hi'
          ? 'WebAssembly आपके फोन/कंप्यूटर की लोकल रैम में चलती है, नो क्लाउड।'
          : 'Engines execute in local device RAM. Your files never touch a server.',
    },
    {
      id: 'dpdp-gdpr',
      icon: ShieldCheck,
      bgColor: 'bg-violet-500',
      tag: 'DPDP Act 2023',
      title: language === 'hi' ? 'DPDP व GDPR अनुपालन' : 'DPDP & GDPR Compliant',
      description:
        language === 'hi'
          ? 'शून्य ट्रैकिंग कुकीज, शून्य विज्ञापन और शून्य डेटा रिटेंशन गारंटी।'
          : 'Zero tracking cookies, zero analytics, and zero data retention.',
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 select-none">
      {/* Header (Unboxed, Zero Lines, Concise Copy) */}
      <div className="max-w-3xl mx-auto text-center space-y-2.5 mb-12 sm:mb-14">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850">
          <span>{language === 'hi' ? 'क्लाइंट-साइड सुरक्षा' : 'Security Architecture'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {language === 'hi'
            ? 'गोपनीयता व सुरक्षा के लिए समर्पित'
            : 'Built for Privacy. Crafted for Indian Forms.'}
        </h2>

        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto font-normal">
          {language === 'hi'
            ? 'सभी फॉर्म्स, फोटो और डॉक्यूमेंट्स सीधे आपके ब्राउज़र में प्रोसेस होते हैं — 100% सुरक्षित और मुफ़्त।'
            : 'Process IDs, exam photos, and PDFs strictly inside your local browser memory — zero uploads, zero tracking.'}
        </p>
      </div>

      {/* 4 Open Architectural Columns (Unboxed: No Boxes, No Lines, Open Airy Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 text-left">
        {trustPillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.id}
              className="group flex flex-col items-start space-y-3 select-none"
            >
              {/* App-Tile Icon Badge with smooth zoom-in on hover */}
              <div
                className={`w-12 h-12 rounded-xl ${pillar.bgColor} text-white flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110`}
              >
                <Icon className="w-6 h-6 stroke-[2]" />
              </div>

              {/* Minimalist Spec Tag (No Border Line) */}
              <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
                {pillar.tag}
              </div>

              {/* Pillar Title */}
              <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
                {pillar.title}
              </h3>

              {/* Pillar Description */}
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                {pillar.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
