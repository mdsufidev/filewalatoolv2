import { ToolCategory } from './toolsData';

/**
 * Maps tools to clean SEO URLs (e.g. /image-resizer).
 */
export function getToolRouteUrl(section: string, subToolId: string): string {
  // 1. SITEMAP & CLEAN SEO MATCHES
  switch (subToolId) {
    case 'resizer':
      return '/image-resizer';
    case 'compressor':
      return '/compress-image';
    case 'cropper':
      return '/crop-image';
    case 'merge-pdf':
      return '/merge-pdf';
    case 'pan-photo-resize':
      return '/pan-photo-resize';
    case 'signature-resize':
      return '/signature-resize';
    case 'passport-photo-resize':
      return '/passport-photo';
    case 'passport-signature-resize':
      return '/passport-signature-resize';
    case 'upsc-photo-maker':
      return '/upsc-photo-maker';
    case 'ssc-resizer':
      return '/ssc-photo-signature';
    case 'gov-compressor':
      return '/kb-resizer';
    case 'pdf-to-word':
      return '/pdf-to-word';
    case 'pdf-to-text':
      return '/pdf-to-text';
    case 'jpg-to-png':
      return '/jpg-to-png';
    case 'png-to-jpg':
      return '/png-to-jpg';
    case 'image-to-pdf':
      return '/image-to-pdf';
    case 'split-pdf':
      return '/split-pdf';
    case 'compress-pdf':
      return '/compress-pdf';
    case 'rotate-pdf':
      return '/rotate-pdf';
    case 'pdf-to-jpg':
      return '/pdf-to-image';
    case 'heic-to-jpg':
      return '/heic-to-jpg';
    case 'png-to-webp':
      return '/png-to-webp';
    case 'webp-to-jpg':
      return '/webp-to-jpg';
    case 'jpg-to-webp':
      return '/jpg-to-webp';
    case 'avif-to-jpg':
      return '/avif-to-jpg';
    case 'svg-to-png':
      return '/svg-to-png';
    case 'watermark':
      return '/watermark-image';
    case 'rounded':
      return '/round-corners';
    case 'meme':
      return '/meme-generator';
    case 'palette':
      return '/color-palette';
    case 'base64':
      return '/image-to-base64';
    case 'batch':
      return '/batch-image-cropper';
    case 'adjust':
      return '/filter-adjust';
  }

  // Default clean URL fallback
  return `/${subToolId}`;
}

/**
 * Category URLs matching sitemap.xml
 */
export function getCategoryRouteUrl(category: ToolCategory | string): string {
  switch (category) {
    case 'all':
      return '/';
    case 'image-tools':
      return '/image-tools';
    case 'pdf-tools':
      return '/pdf-tools';
    case 'convert':
      return '/convert-tools';
    case 'document-tools':
      return '/document-tools';
    default:
      return '/';
  }
}

/**
 * Standalone page URLs matching sitemap.xml
 */
export function getPageRouteUrl(page: string): string {
  switch (page) {
    case 'about':
      return '/about';
    case 'desktop':
    case 'download':
      return '/desktop';
    case 'contact':
      return '/contact';
    case 'privacy':
      return '/privacy';
    case 'terms':
      return '/terms';
    case 'disclaimer':
      return '/disclaimer';
    default:
      return `/${page}`;
  }
}
