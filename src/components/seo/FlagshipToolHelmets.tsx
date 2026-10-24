import React from 'react';
import { FLAGSHIP_SEO_TOOLS } from '../../core/flagshipSeoData';

/**
 * Reusable SEO Helmet & Schema snippets for Flagship Tools on https://filewalatool.com
 * Developed by mdsufidev.
 */

interface FlagshipHelmetProps {
  toolKey: keyof typeof FLAGSHIP_SEO_TOOLS | string;
}

export const FlagshipToolSeoBlock: React.FC<FlagshipHelmetProps> = ({ toolKey }) => {
  const config = FLAGSHIP_SEO_TOOLS[toolKey as string];
  if (!config) return null;

  return (
    <div className="hidden" aria-hidden="true" data-seo-slug={config.slug}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(config.schema) }}
      />
    </div>
  );
};

export const ImageCompressorSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="compress-image" />;
export const MergePdfSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="merge-pdf" />;
export const CompressPdfSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="compress-pdf" />;
export const HeicToJpgSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="heic-to-jpg" />;
export const ImageToPdfSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="image-to-pdf" />;
export const UpscPhotoMakerSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="upsc-photo-maker" />;
export const SscResizerSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="ssc-resizer" />;
export const PanPhotoResizeSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="pan-photo-resize" />;
export const SignatureResizeSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="signature-resize" />;
export const PassportPhotoResizeSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="passport-photo-resize" />;
export const PassportSignatureResizeSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="passport-signature-resize" />;
export const GovDocumentCompressorSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="gov-document-compressor" />;
export const PdfToWordSeo: React.FC = () => <FlagshipToolSeoBlock toolKey="pdf-to-word" />;
