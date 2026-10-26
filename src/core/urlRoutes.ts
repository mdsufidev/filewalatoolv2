import { ToolCategory, ALL_TOOLS, CATEGORIES_CONFIG } from './toolsData';

export type ActivePageType = 'about' | 'disclaimer' | 'terms' | 'contact' | 'admin' | 'desktop' | 'privacy' | null;

export interface ActiveToolState {
  section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';
  subToolId: string;
}

export interface ResolvedRoute {
  activePage: ActivePageType;
  activeTool: ActiveToolState | null;
  selectedCategory: ToolCategory;
  isPrivacyModalOpen?: boolean;
  currentPath?: string;
}

export const ROUTE_ALIASES: Record<string, string> = {
  'pdf-tools/merge': 'merge-pdf',
  'pdf-tools/merge-pdf': 'merge-pdf',
  'pdf/merge': 'merge-pdf',
  'pdf-tools/compress': 'compress-pdf',
  'pdf-tools/compress-pdf': 'compress-pdf',
  'pdf/compress': 'compress-pdf',
  'pdf-tools/to-image': 'pdf-to-jpg',
  'pdf-tools/to-images': 'pdf-to-jpg',
  'pdf-tools/image': 'pdf-to-jpg',
  'pdf-tools/images': 'pdf-to-jpg',
  'pdf/to-image': 'pdf-to-jpg',
  'pdf/image': 'pdf-to-jpg',
  'to-image': 'pdf-to-jpg',
  'pdf-tools/to-jpg': 'pdf-to-jpg',
  'pdf-tools/image-to-pdf': 'image-to-pdf',
  'pdf-tools/split': 'split-pdf',
  'pdf-tools/rotate': 'rotate-pdf',
  'pdf-tools/to-text': 'pdf-to-text',
  'pdf-tools/ocr': 'pdf-to-text',
  'pdf/ocr': 'pdf-to-text',
  'ocr': 'pdf-to-text',
  'pdf-tools/word': 'pdf-to-word',
  'pdf-tools/pdf-to-word': 'pdf-to-word',
  'pdf-tools/to-word': 'pdf-to-word',
  'pdf/word': 'pdf-to-word',
  'word': 'pdf-to-word',
  'document-tools/pan-resizer': 'pan-photo-resize',
  'document-tools/pan-photo-resizer': 'pan-photo-resize',
  'document-tools/pan-photo-resize': 'pan-photo-resize',
  'document-tools/pan-photo': 'pan-photo-resize',
  'document-tools/photo-resizer': 'pan-photo-resize',
  'pan-resizer': 'pan-photo-resize',
  'pan-photo-resizer': 'pan-photo-resize',
  'pan-photo-resize': 'pan-photo-resize',
  'pan-photo': 'pan-photo-resize',
  'document-tools/pan-signature-resizer': 'signature-resize',
  'document-tools/pan-signature-resize': 'signature-resize',
  'document-tools/pan-signature': 'signature-resize',
  'document-tools/signature-resizer': 'signature-resize',
  'document-tools/signature-resize': 'signature-resize',
  'document-tools/signature': 'signature-resize',
  'pan-signature-resizer': 'signature-resize',
  'pan-signature-resize': 'signature-resize',
  'pan-signature': 'signature-resize',
  'signature-resize': 'signature-resize',
  'signature-resizer': 'signature-resize',
  'document-tools/passport-photo-resizer': 'passport-photo-resize',
  'document-tools/passport-photo-resize': 'passport-photo-resize',
  'document-tools/passport-photo': 'passport-photo-resize',
  'document-tools/passport-resizer': 'passport-photo-resize',
  'document-tools/passport-resize': 'passport-photo-resize',
  'document-tools/passport': 'passport-photo-resize',
  'passport-photo-resizer': 'passport-photo-resize',
  'passport-photo-resize': 'passport-photo-resize',
  'passport-resizer': 'passport-photo-resize',
  'passport-photo': 'passport-photo-resize',
  'document-tools/passport-signature-resizer': 'passport-signature-resize',
  'document-tools/passport-signature-resize': 'passport-signature-resize',
  'document-tools/passport-signature': 'passport-signature-resize',
  'passport-signature-resizer': 'passport-signature-resize',
  'passport-signature': 'passport-signature-resize',
  'document-tools/upsc-photo-maker': 'upsc-photo-maker',
  'document-tools/upsc-photo-resizer': 'upsc-photo-maker',
  'document-tools/upsc-photo': 'upsc-photo-maker',
  'document-tools/upsc-resizer': 'upsc-photo-maker',
  'document-tools/upsc': 'upsc-photo-maker',
  'upsc-photo-maker': 'upsc-photo-maker',
  'upsc-photo-resizer': 'upsc-photo-maker',
  'upsc-photo': 'upsc-photo-maker',
  'upsc-resizer': 'upsc-photo-maker',
  'upsc': 'upsc-photo-maker',
  'document-tools/ssc-photo-signature': 'ssc-resizer',
  'document-tools/ssc-resizer': 'ssc-resizer',
  'document-tools/ssc-photo': 'ssc-resizer',
  'document-tools/ssc-signature': 'ssc-resizer',
  'document-tools/ssc': 'ssc-resizer',
  'ssc-photo-signature': 'ssc-resizer',
  'ssc-resizer': 'ssc-resizer',
  'ssc': 'ssc-resizer',
  'document-tools/upsc-ssc-resizer': 'upsc-photo-maker',
  'document-tools/upsc-ssc': 'upsc-photo-maker',
  'document-tools/gov-compressor': 'gov-compressor',
  'document-tools/gov-compress': 'gov-compressor',
  'document-tools/document-compressor': 'gov-compressor',
  'gov-compressor': 'gov-compressor',
  'gov-compress': 'gov-compressor',

  // Flagship & Sitemap Clean Slugs
  'compress-image': 'compressor',
  'image-compressor': 'compressor',
  'image-resizer': 'resizer',
  'crop-image': 'cropper',
  'bg-remover': 'bg-remover',
  'background-remover': 'bg-remover',
  'remove-bg': 'bg-remover',
  'remove-background': 'bg-remover',
  'image-tools/bg-remover': 'bg-remover',
  'image-tools/background-remover': 'bg-remover',
  'batch-image-cropper': 'batch',
  'batch-processor': 'batch',
  'merge-pdf': 'merge-pdf',
  'combine-pdf': 'merge-pdf',
  'compress-pdf': 'compress-pdf',
  'heic-to-jpg': 'heic-to-jpg',
  'image-to-pdf': 'image-to-pdf',
  'govt-photo-signature-resizer': 'pan-photo-resize',
  'gov-document-compressor': 'gov-compressor',
  'pdf-to-word': 'pdf-to-word',
  'resume-builder': 'pdf-to-word',
  'kb-resizer': 'gov-compressor',
  'delete-pdf-pages': 'split-pdf',
  'watermark-pdf': 'watermark',
  'watermark-image': 'watermark',
  'watermark': 'watermark',
  'protect-pdf': 'compress-pdf',
  'word-to-pdf': 'pdf-to-word',
  'pdf-to-image': 'pdf-to-jpg',
  'pdf-to-jpg': 'pdf-to-jpg',
  'pdf-to-text': 'pdf-to-text',
  'pdf-ocr': 'pdf-to-text',
  'jpg-to-png': 'jpg-to-png',
  'png-to-jpg': 'png-to-jpg',
  'png-to-webp': 'png-to-webp',
  'webp-to-jpg': 'webp-to-jpg',
  'jpg-to-webp': 'jpg-to-webp',
  'avif-to-jpg': 'avif-to-jpg',
  'svg-to-png': 'svg-to-png',
  'round-corners': 'rounded',
  'rounded-corners': 'rounded',
  'meme-generator': 'meme',
  'meme': 'meme',
  'color-palette': 'palette',
  'palette': 'palette',
  'image-to-base64': 'base64',
  'base64': 'base64',
  'filter-adjust': 'adjust',
  'adjust': 'adjust',
  'filters': 'adjust',
};

/**
 * Pure route resolver: turns a pathname and/or hash into a strongly-typed ResolvedRoute.
 * Compatible with both browser runtime (window.location) and Node.js SSR prerendering.
 */
export function resolveRouteFromUrl(pathname: string = '', hash: string = ''): ResolvedRoute {
  const rawHash = (hash || '').replace(/^#\/?/, '').trim();
  const rawPath = (pathname || '')
    .split('?')[0]
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .trim();

  let query = '';
  try {
    query = decodeURIComponent(rawHash || rawPath);
  } catch {
    query = rawHash || rawPath;
  }

  const currentPath = rawPath ? `/${rawPath}` : '/';

  if (!query) {
    return { activePage: null, activeTool: null, selectedCategory: 'all', currentPath };
  }

  // Standalone informational pages
  if (query === 'about' || query === 'about-us') {
    return { activePage: 'about', activeTool: null, selectedCategory: 'all', currentPath };
  }
  if (
    query === 'desktop' ||
    query === 'download' ||
    query === 'windows' ||
    query === 'desktop-app' ||
    query === 'filewala-desktop'
  ) {
    return { activePage: 'desktop', activeTool: null, selectedCategory: 'all', currentPath };
  }
  if (query === 'disclaimer') {
    return { activePage: 'disclaimer', activeTool: null, selectedCategory: 'all', currentPath };
  }
  if (
    query === 'terms' ||
    query === 'terms-and-conditions' ||
    query === 'terms-of-service' ||
    query === 'tos'
  ) {
    return { activePage: 'terms', activeTool: null, selectedCategory: 'all', currentPath };
  }
  if (query === 'contact' || query === 'contact-us') {
    return { activePage: 'contact', activeTool: null, selectedCategory: 'all', currentPath };
  }
  if (query === 'admin' || query === 'admin-panel' || query === 'console') {
    return { activePage: 'admin', activeTool: null, selectedCategory: 'all', currentPath };
  }
  if (query === 'privacy' || query === 'privacy-policy') {
    return { activePage: 'privacy', activeTool: null, selectedCategory: 'all', isPrivacyModalOpen: false, currentPath };
  }
  if (query === 'tools' || query === 'all-tools') {
    return { activePage: null, activeTool: null, selectedCategory: 'all', currentPath };
  }
  if (query === 'convert-tools' || query === 'convert') {
    return { activePage: null, activeTool: null, selectedCategory: 'convert', currentPath };
  }

  // Categories
  const matchedCat = CATEGORIES_CONFIG.find((c) => c.id === query);
  if (matchedCat) {
    return { activePage: null, activeTool: null, selectedCategory: matchedCat.id, currentPath };
  }

  // Tools & Aliases
  const resolvedSubTool = ROUTE_ALIASES[query] || query;
  const matchedTool = ALL_TOOLS.find(
    (t) => t.subToolId === resolvedSubTool || t.id === resolvedSubTool
  );

  if (matchedTool) {
    return {
      activePage: null,
      activeTool: {
        section: matchedTool.actionSection,
        subToolId: matchedTool.subToolId,
      },
      selectedCategory: matchedTool.actionSection,
      currentPath,
    };
  }

  // Fallback to homepage
  return { activePage: null, activeTool: null, selectedCategory: 'all', currentPath };
}

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
    case 'bg-remover':
      return '/bg-remover';
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
