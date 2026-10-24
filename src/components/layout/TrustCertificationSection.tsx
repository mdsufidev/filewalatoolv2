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
      tag: 'PAN • UPSC • SSC • IBPS',
      title: language === 'hi' ? 'सरकारी मानक अनुरूप' : 'Govt Spec Calibrated',
      description:
        language === 'hi'
          ? 'PAN कार्ड, UPSC, SSC, राज्य आयोग और पासपोर्ट सेवा पोर्टलों के सटीक पिक्सेल डायमेंशन व सख्त KB सीमाओं के अनुरूप परीक्षण किया गया।'
          : 'Strictly calibrated to official portal criteria: precise pixel dimensions, aspect ratios, and strict KB file boundaries.',
    },
    {
      id: 'ssl-encryption',
      icon: Lock,
      tag: 'TLS 1.3 • Strict HSTS',
      title: language === 'hi' ? '256-बिट SSL सुरक्षित' : '256-Bit SSL Encryption',
      description:
        language === 'hi'
          ? 'कठोर HSTS और 256-बिट SSL/TLS एन्क्रिप्शन के साथ सभी स्क्रिप्ट्स व एसेट्स सुरक्षित रूप से डिलीवर होते हैं, बिना किसी मध्यवर्ती छेड़छाड़ के।'
          : 'All application code and assets are delivered over strict end-to-end encrypted tunnels, guarding against network sniffing and tampering.',
    },
    {
      id: 'in-browser',
      icon: Cpu,
      tag: language === 'hi' ? 'शून्य सर्वर अपलोड' : 'Zero Cloud Uploads',
      title: language === 'hi' ? '100% इन-ब्राउज़र रैम' : '100% In-Browser Execution',
      description:
        language === 'hi'
          ? 'WebAssembly और HTML5 कैनवास इंजन केवल आपके फोन/कंप्यूटर की लोकल रैम (RAM) में चलते हैं। आपके दस्तावेज़ कभी किसी सर्वर पर अपलोड नहीं होते।'
          : 'WebAssembly and HTML5 Canvas engines execute strictly inside your local device RAM. Your private files never touch external servers.',
    },
    {
      id: 'dpdp-gdpr',
      icon: ShieldCheck,
      tag: 'DPDP Act 2023 • Private',
      title: language === 'hi' ? 'DPDP व GDPR अनुपालन' : 'DPDP & GDPR Compliant',
      description:
        language === 'hi'
          ? 'भारत के डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट 2023 का पूर्ण सम्मान। शून्य ट्रैकिंग कुकीज, शून्य विज्ञापन पिक्सल और शून्य डेटा रिटेंशन।'
          : 'Built in accordance with India’s Digital Personal Data Protection Act 2023. Zero analytics trackers, zero cookies, zero data retention.',
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-t border-zinc-200/80 dark:border-zinc-800/80 select-none">
      {/* Grounded Minimalist Header (Notion / Linear / Swiss Design) */}
      <div className="max-w-3xl mx-auto text-center space-y-3 mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
          <span>{language === 'hi' ? 'क्लाइंट-साइड सुरक्षा' : 'Security Architecture'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {language === 'hi'
            ? 'छात्रों, नौकरी आवेदकों व साइबर कैफ़े के लिए निर्मित'
            : 'Built for privacy. Crafted for Indian government forms.'}
        </h2>

        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-normal">
          {language === 'hi'
            ? 'FileWala आपके सभी सरकारी फॉर्म्स, फोटो और डॉक्यूमेंट्स को सीधे आपके ब्राउज़र में प्रोसेस करता है। बिना सर्वर अपलोड, बिना किसी ट्रैकिंग और 100% सुरक्षित।'
            : 'FileWala processes your government IDs, exam photos, and PDFs strictly inside your local browser memory. Zero cloud uploads, zero telemetry, and zero fees.'}
        </p>
      </div>

      {/* 4 Open Architectural Columns (Unboxed, Flat 2D, Neutral) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 text-left">
        {trustPillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.id}
              className="flex flex-col items-start space-y-3"
            >
              {/* Neutral 2D Icon Badge */}
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 stroke-[1.75]" />
              </div>

              {/* Minimalist 2D Spec Tag */}
              <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase border border-zinc-200 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
                {pillar.tag}
              </div>

              {/* Pillar Title */}
              <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-zinc-100 tracking-tight">
                {pillar.title}
              </h3>

              {/* Pillar Description */}
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                {pillar.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
