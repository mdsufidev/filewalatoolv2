'use client';

import React, { useState, useEffect } from 'react';
import { PanPhotoResizer } from './PanPhotoResizer';
import { SignatureResizer } from './SignatureResizer';
import { PassportPhotoResizer } from './PassportPhotoResizer';
import { PassportSignatureResizer } from './PassportSignatureResizer';
import { UpscPhotoMaker } from './UpscPhotoMaker';
import { SscResizer } from './SscResizer';
import { GovCompressor } from './GovCompressor';
import { GovtToolsSeoGuide } from '../seo/GovtToolsSeoGuide';
import { useLanguage } from '../../core/languageContext';

export type GovDocumentToolId =
  | 'pan-resizer'
  | 'pan-photo-resize'
  | 'signature-resize'
  | 'pan-signature-resize'
  | 'passport-resizer'
  | 'passport-photo-resize'
  | 'passport-signature-resize'
  | 'upsc-photo-maker'
  | 'upsc-photo-resize'
  | 'upsc-ssc-resizer'
  | 'ssc-resizer'
  | 'gov-compressor';

export interface GovDocumentToolMeta {
  id: GovDocumentToolId;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  route: string;
}

export const GOV_DOCUMENT_TOOLS: GovDocumentToolMeta[] = [
  {
    id: 'upsc-photo-maker',
    name: 'UPSC Photo Maker',
    tagline: 'Candidate photo with printed Name & Date of Photo (DOP) banner.',
    description: 'Compliant with UPSC Civil Services OTR guidelines (350×350 px, 20–300 KB).',
    badge: 'Name + DOP',
    route: 'document-tools/upsc-photo-maker',
  },
  {
    id: 'ssc-resizer',
    name: 'SSC Photo & Sign',
    tagline: 'Byte-bound compressor for SSC CGL, CHSL, MTS (Photo: 20–50 KB, Sig: 10–20 KB).',
    description: 'Guarantees compliance with Staff Selection Commission strict byte thresholds.',
    badge: 'SSC Limits',
    route: 'document-tools/ssc-photo-signature',
  },
  {
    id: 'pan-photo-resize',
    name: 'PAN Photo Resizer',
    tagline: 'Crop and scale passport photo to 200×230 px, 20–50 KB, and 200 DPI JPEG.',
    description: 'Compliant with Protean (NSDL) and UTIITSL government portal upload requirements.',
    badge: '200 DPI',
    route: 'document-tools/pan-photo-resizer',
  },
  {
    id: 'signature-resize',
    name: 'PAN Signature',
    tagline: 'Isolate, whiten, and resize signature to 354×157 px under 50 KB with 200 DPI.',
    description: 'Ensure signatures meet strict Protean & UTIITSL requirements with clean white background.',
    badge: '< 50 KB',
    route: 'document-tools/pan-signature-resizer',
  },
  {
    id: 'passport-photo-resize',
    name: 'Passport Photo',
    tagline: 'Format photos (350×450 px, 35×45mm, <300 KB) at 300 DPI with biometric framing.',
    description: 'Ministry of External Affairs (MEA) Passport Seva portal compliant.',
    badge: '35×45 mm',
    route: 'document-tools/passport-photo-resizer',
  },
  {
    id: 'passport-signature-resize',
    name: 'Passport Sign',
    tagline: 'Isolate & clean official signature (400×200 px, <100 KB) at 300 DPI with pure white canvas.',
    description: 'Clean dark ink on pure white background compliant with Passport Seva Kendra.',
    badge: '400×200 px',
    route: 'document-tools/passport-signature-resizer',
  },
  {
    id: 'gov-compressor',
    name: 'Gov Compressor',
    tagline: 'Shrink Aadhaar, marksheets, and certificates under 100 KB, 200 KB, or 500 KB.',
    description: 'Universal document compressor for EPFO, Sarathi, Banking & State PSCs.',
    badge: '< 100/200 KB',
    route: 'document-tools/gov-compressor',
  },
];

interface DocumentToolsProps {
  initialTab?: GovDocumentToolId;
  initialFiles?: File[] | null;
  onClearPendingFiles?: () => void;
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const DocumentTools: React.FC<DocumentToolsProps> = ({
  initialTab = 'pan-photo-resize',
  initialFiles,
  onClearPendingFiles,
  onNotify,
}) => {
  const { language } = useLanguage();

  // Normalize initialTab aliases
  const normalizeTab = (tab: GovDocumentToolId): GovDocumentToolId => {
    if (tab === 'pan-resizer') return 'pan-photo-resize';
    if (tab === 'pan-signature-resize') return 'signature-resize';
    if (tab === 'passport-resizer') return 'passport-photo-resize';
    if (tab === 'upsc-photo-resize' || tab === 'upsc-ssc-resizer') return 'upsc-photo-maker';
    return tab;
  };

  const [activeTool, setActiveTool] = useState<GovDocumentToolId>(normalizeTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTool(normalizeTab(initialTab));
    }
  }, [initialTab]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 select-none animate-in fade-in duration-150">
      {/* Top 2D Sub-Tool Switcher Bar */}
      <div className="w-full overflow-x-auto no-scrollbar pb-1">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 min-w-max">
          {GOV_DOCUMENT_TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-zinc-950 font-semibold dark:bg-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 font-medium hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <span>{tool.name}</span>
                <span className="text-[10px] font-mono opacity-60">
                  {tool.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Selected Standalone Tool Page */}
      <div className="w-full">
        {activeTool === 'pan-photo-resize' && (
          <PanPhotoResizer onNotify={onNotify} />
        )}
        {activeTool === 'signature-resize' && (
          <SignatureResizer onNotify={onNotify} />
        )}
        {activeTool === 'passport-photo-resize' && (
          <PassportPhotoResizer onNotify={onNotify} />
        )}
        {activeTool === 'passport-signature-resize' && (
          <PassportSignatureResizer onNotify={onNotify} />
        )}
        {activeTool === 'upsc-photo-maker' && (
          <UpscPhotoMaker onNotify={onNotify} />
        )}
        {activeTool === 'ssc-resizer' && (
          <SscResizer onNotify={onNotify} />
        )}
        {activeTool === 'gov-compressor' && (
          <GovCompressor
            initialFile={initialFiles && initialFiles.length > 0 ? initialFiles[0] : null}
            onNotify={onNotify}
          />
        )}
      </div>

      {/* Authoritative SEO Portal Guidelines, Specification Matrix & Sarkari Exam FAQs */}
      <div className="pt-8 border-t border-zinc-200/80 dark:border-zinc-800/80">
        <GovtToolsSeoGuide
          activeSubToolId={activeTool}
          onSelectTool={(_, toolId) => setActiveTool(toolId as GovDocumentToolId)}
        />
      </div>
    </div>
  );
};
