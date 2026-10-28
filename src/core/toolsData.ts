import React from 'react';

export type ToolCategory = 'all' | 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';

export interface ToolItem {
  id: string;
  name: string;
  category: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';
  description: string;
  targetKeyword: string;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'blue' | 'rose' | 'indigo' | 'purple' | 'cyan';
  icon: string;
  actionSection: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';
  subToolId: string;
  searchAliases?: string[];
}

export interface CategoryMeta {
  id: ToolCategory;
  name: string;
  count: number;
  badge?: string;
  tagline: string;
  description: string;
}

export const CATEGORIES_CONFIG: CategoryMeta[] = [
  {
    id: 'all',
    name: 'All Tools',
    count: 45,
    badge: 'Complete Suite',
    tagline: 'Complete suite of 40+ free browser file utilities',
    description: 'Every tool you need for images, PDFs, format conversions, and government exam forms — completely private and free.',
  },
  {
    id: 'image-tools',
    name: 'Image Tools',
    count: 20,
    badge: 'Popular',
    tagline: 'Compress, resize, crop, filter & edit photos',
    description: 'Reduce KB size, resize by pixels, crop, watermark, add filters, and extract palettes right in your browser.',
  },
  {
    id: 'pdf-tools',
    name: 'PDF Tools',
    count: 8,
    badge: 'Essential',
    tagline: 'Merge, split, compress & convert PDFs',
    description: 'Easily combine multiple PDFs, reduce PDF file size, convert PDF to Word/Images, or extract text with zero uploads.',
  },
  {
    id: 'convert',
    name: 'Format Converter',
    count: 10,
    badge: 'Fast & Lossless',
    tagline: 'Convert between PNG, JPG, WebP, HEIC & AVIF',
    description: 'Instant client-side image format converter with transparency preservation and adjustable compression quality.',
  },
  {
    id: 'document-tools',
    name: 'Govt & Exam Forms',
    count: 7,
    badge: 'India Govt Forms',
    tagline: 'UPSC, SSC, PAN Card & Passport Seva photo & signature presets',
    description: 'Exact pixel dimensions and byte limits for UPSC (Name & Date stamp), SSC (20-50KB), PAN Card, and Passport photos.',
  },
];

export const ALL_TOOLS: ToolItem[] = [
  // ==========================================
  // IMAGE TOOLS (16 Tools)
  // ==========================================
  {
    id: 'compressor',
    name: 'Image Compressor',
    category: 'image-tools',
    description: 'Reduce PNG, JPEG, WebP file sizes by up to 90% with live split before/after comparison slider.',
    targetKeyword: 'Reduce PNG, JPEG, WebP file size in KB/MB',
    badge: 'Save Size',
    badgeColor: 'emerald',
    icon: 'Minimize2',
    actionSection: 'image-tools',
    subToolId: 'compressor',
  },
  {
    id: 'resizer',
    name: 'Image Resizer',
    category: 'image-tools',
    description: 'Scale photos by exact pixels or percentage with aspect ratio lock, canvas fit, and presets.',
    targetKeyword: 'Resize by pixels & percentage',
    badge: 'Popular',
    badgeColor: 'blue',
    icon: 'Maximize2',
    actionSection: 'image-tools',
    subToolId: 'resizer',
  },
  {
    id: 'cropper',
    name: 'Image Cropper',
    category: 'image-tools',
    description: 'Crop images with custom aspect ratios (1:1, 16:9, 4:3), rotate 90°, and mirror flip horizontally/vertically.',
    targetKeyword: 'Crop image with custom aspect ratios',
    badge: 'Pro',
    badgeColor: 'amber',
    icon: 'Crop',
    actionSection: 'image-tools',
    subToolId: 'cropper',
  },
  {
    id: 'bg-remover',
    name: 'Background Remover',
    category: 'image-tools',
    description: 'Remove image backgrounds with 100% in-browser BRIA RMBG-1.4 AI. Photorealistic hair & edge alpha with zero server uploads.',
    targetKeyword: 'Remove background from image online for free / transparent background / BRIA RMBG AI',
    badge: 'AI RMBG-1.4',
    badgeColor: 'blue',
    icon: 'Sparkles',
    actionSection: 'image-tools',
    subToolId: 'bg-remover',
  },
  {
    id: 'face-enhancer',
    name: 'AI Face Enhancer & Retouch',
    category: 'image-tools',
    description: 'Enhance portrait photos with AI skin smoothing, eye & hair sharpening, blemish softening, and 2x/4x HD upscaling in real-time.',
    targetKeyword: 'AI Face Enhancer online free / Photo face retouch and skin smoother',
    badge: 'AI Smart',
    badgeColor: 'rose',
    icon: 'Sparkles',
    actionSection: 'image-tools',
    subToolId: 'face-enhancer',
    searchAliases: [
      'face enhancer',
      'ai face enhancer',
      'photo face retouch',
      'skin smoothing',
      'unblur face',
      'portrait enhancer',
      'face clarity',
      'passport photo enhance',
      'photo denoise',
      'upscale face',
    ],
  },
  {
    id: 'png-to-webp-img',
    name: 'PNG to WebP Converter',
    category: 'image-tools',
    description: 'Convert PNG to lightweight Google WebP format while preserving transparent alpha channel.',
    targetKeyword: 'Convert PNG to lightweight WebP',
    badge: 'Fast',
    badgeColor: 'cyan',
    icon: 'Zap',
    actionSection: 'convert',
    subToolId: 'png-to-webp',
  },
  {
    id: 'webp-to-jpg-img',
    name: 'WebP to JPG Converter',
    category: 'image-tools',
    description: 'Convert modern WebP images to universal, universally compatible JPEG format with quality control.',
    targetKeyword: 'Convert WebP to standard JPG',
    badge: 'Essential',
    badgeColor: 'indigo',
    icon: 'ArrowRight',
    actionSection: 'convert',
    subToolId: 'webp-to-jpg',
  },
  {
    id: 'heic-to-jpg-img',
    name: 'HEIC to JPG Converter',
    category: 'image-tools',
    description: 'Convert Apple iPhone & iPad HEIC/HEIF camera photos directly to standard JPG in-browser.',
    targetKeyword: 'Convert HEIC photos for Windows/Web',
    badge: 'iPhone',
    badgeColor: 'rose',
    icon: 'Zap',
    actionSection: 'convert',
    subToolId: 'heic-to-jpg',
  },
  {
    id: 'jpg-to-webp-img',
    name: 'JPG to WebP Converter',
    category: 'image-tools',
    description: 'Optimize heavy JPEG photographs into next-generation WebP web assets with high compression savings.',
    targetKeyword: 'Optimize JPEG to WebP format',
    badge: 'Save Size',
    badgeColor: 'emerald',
    icon: 'Sparkles',
    actionSection: 'convert',
    subToolId: 'jpg-to-webp',
  },
  {
    id: 'png-to-jpg-img',
    name: 'PNG to JPG Converter',
    category: 'image-tools',
    description: 'Convert heavy PNG screenshots into lightweight JPG with clean white background fill.',
    targetKeyword: 'Convert transparent PNG to solid JPG',
    badge: 'Fast',
    badgeColor: 'blue',
    icon: 'ArrowRight',
    actionSection: 'convert',
    subToolId: 'png-to-jpg',
  },
  {
    id: 'jpg-to-png-img',
    name: 'JPG to PNG Converter',
    category: 'image-tools',
    description: 'Convert compressed JPEG into lossless raster PNG format without further lossy artifacts.',
    targetKeyword: 'Convert JPG to transparent PNG',
    badge: 'Lossless',
    badgeColor: 'purple',
    icon: 'ArrowRight',
    actionSection: 'convert',
    subToolId: 'jpg-to-png',
  },
  {
    id: 'avif-to-jpg-img',
    name: 'AVIF to JPG Converter',
    category: 'image-tools',
    description: 'Decode AV1-based AVIF graphics into legacy JPG viewable on all legacy devices and software.',
    targetKeyword: 'Modern AVIF to legacy JPG format',
    badge: 'Modern',
    badgeColor: 'amber',
    icon: 'Zap',
    actionSection: 'convert',
    subToolId: 'avif-to-jpg',
  },
  {
    id: 'svg-to-png-img',
    name: 'SVG to PNG Converter',
    category: 'image-tools',
    description: 'Rasterize vector SVG artwork into high-resolution Retina bitmap PNG with customizable scale.',
    targetKeyword: 'Rasterize vector graphics',
    badge: 'Vector',
    badgeColor: 'indigo',
    icon: 'Sparkles',
    actionSection: 'convert',
    subToolId: 'svg-to-png',
  },
  {
    id: 'base64-img',
    name: 'Image to Base64 Converter',
    category: 'image-tools',
    description: 'Convert images to Base64 Data URI strings, HTML <img> tags, and CSS background code.',
    targetKeyword: 'Convert image to Base64 string online',
    badge: 'Developer',
    badgeColor: 'cyan',
    icon: 'Code',
    actionSection: 'image-tools',
    subToolId: 'base64',
  },
  {
    id: 'rounded-img',
    name: 'Rounded Corner Image Maker',
    category: 'image-tools',
    description: 'Add custom border radius or create 50% circle profile avatars with transparent outer edges.',
    targetKeyword: 'Add border radius to image / Round image corners online',
    badge: 'Design',
    badgeColor: 'rose',
    icon: 'Circle',
    actionSection: 'image-tools',
    subToolId: 'rounded',
  },
  {
    id: 'watermark-img',
    name: 'Image Watermarker (Add Text/Logo)',
    category: 'image-tools',
    description: 'Protect photos with custom text or logo watermarks, adjustable opacity, and diagonal tiling.',
    targetKeyword: 'Add watermark to images online for free',
    badge: 'Protect',
    badgeColor: 'purple',
    icon: 'Type',
    actionSection: 'image-tools',
    subToolId: 'watermark',
  },
  {
    id: 'meme-img',
    name: 'Meme Generator / Image Captioner',
    category: 'image-tools',
    description: 'Add bold top and bottom captions in classic Impact font with outline strokes for social media.',
    targetKeyword: 'Add text to image / Meme generator online',
    badge: 'Viral',
    badgeColor: 'amber',
    icon: 'Smile',
    actionSection: 'image-tools',
    subToolId: 'meme',
  },
  {
    id: 'palette-img',
    name: 'Color Palette Extractor',
    category: 'image-tools',
    description: 'Extract dominant color palettes, test pixel colors with an interactive eyedropper, and copy HEX/RGB codes.',
    targetKeyword: 'Extract color palette from image / Image color picker',
    badge: 'Palette',
    badgeColor: 'emerald',
    icon: 'Pipette',
    actionSection: 'image-tools',
    subToolId: 'palette',
  },
  {
    id: 'batch-img',
    name: 'Batch Image Processor',
    category: 'image-tools',
    description: 'Bulk process, compress, crop, and convert dozens of images simultaneously and download as a ZIP archive.',
    targetKeyword: 'Bulk process multiple images and download as ZIP archive',
    badge: 'Batch ZIP',
    badgeColor: 'blue',
    icon: 'Archive',
    actionSection: 'image-tools',
    subToolId: 'batch',
  },
  {
    id: 'adjust-img',
    name: 'Image Filters & Adjust',
    category: 'image-tools',
    description: 'Fine-tune brightness, contrast, saturation, exposure, and apply monochrome filters right in your browser.',
    targetKeyword: 'Brightness, contrast, saturation & blur photo editing',
    badge: 'Filter',
    badgeColor: 'cyan',
    icon: 'Sliders',
    actionSection: 'image-tools',
    subToolId: 'adjust',
  },

  // ==========================================
  // PDF TOOLS (7 Tools)
  // ==========================================
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    category: 'pdf-tools',
    description: 'Combine multiple PDF files into a single orderly document with drag-and-drop page ordering.',
    targetKeyword: 'Combine multiple PDF files online for free',
    badge: 'Popular',
    badgeColor: 'blue',
    icon: 'Layers',
    actionSection: 'pdf-tools',
    subToolId: 'merge-pdf',
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    category: 'pdf-tools',
    description: 'Reduce PDF file size without losing quality for fast email attachments and portal submissions.',
    targetKeyword: 'Reduce PDF file size without losing quality',
    badge: 'Save Size',
    badgeColor: 'emerald',
    icon: 'Minimize2',
    actionSection: 'pdf-tools',
    subToolId: 'compress-pdf',
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to Image Converter',
    category: 'pdf-tools',
    description: 'Convert PDF pages to high-resolution JPG, PNG, or WebP images client-side with custom DPI scale and bulk ZIP download.',
    targetKeyword: 'Convert PDF pages to JPG, PNG, WebP images online',
    badge: 'JPG • PNG • WebP',
    badgeColor: 'amber',
    icon: 'Zap',
    actionSection: 'pdf-tools',
    subToolId: 'pdf-to-jpg',
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF Converter',
    category: 'pdf-tools',
    description: 'Turn JPG or PNG photos into a single PDF document with custom margins and page orientations.',
    targetKeyword: 'Turn JPG or PNG photos into a single PDF document',
    badge: 'Free & Unlimited',
    badgeColor: 'rose',
    icon: 'FilePlus',
    actionSection: 'pdf-tools',
    subToolId: 'image-to-pdf',
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    category: 'pdf-tools',
    description: 'Extract specific pages or split large PDF files into distinct individual documents instantly.',
    targetKeyword: 'Extract specific pages or split large PDF files',
    badge: 'Flexible',
    badgeColor: 'cyan',
    icon: 'Scissors',
    actionSection: 'pdf-tools',
    subToolId: 'split-pdf',
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF Pages',
    category: 'pdf-tools',
    description: 'Rotate PDF orientation (Portrait/Landscape) by 90°, 180°, or 270° degrees permanently.',
    targetKeyword: 'Rotate PDF orientation (Portrait/Landscape)',
    badge: 'Orientation',
    badgeColor: 'purple',
    icon: 'RotateCw',
    actionSection: 'pdf-tools',
    subToolId: 'rotate-pdf',
  },
  {
    id: 'pdf-to-text',
    name: 'PDF to Searchable Text (OCR)',
    category: 'pdf-tools',
    description: 'Extract searchable, editable text from scanned or digital PDF documents directly in the browser with client-side Tesseract.js OCR.',
    targetKeyword: 'PDF OCR: Extract text from scanned PDF documents online',
    badge: 'Tesseract OCR',
    badgeColor: 'cyan',
    icon: 'FileText',
    actionSection: 'pdf-tools',
    subToolId: 'pdf-to-text',
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word Converter',
    category: 'pdf-tools',
    description: 'Convert PDF documents into editable Microsoft Word (.docx) documents client-side, preserving text flow and headings.',
    targetKeyword: 'Convert PDF to Word DOCX online for free',
    badge: 'DOCX Flow',
    badgeColor: 'blue',
    icon: 'FileText',
    actionSection: 'pdf-tools',
    subToolId: 'pdf-to-word',
  },

  // ==========================================
  // CONVERT SUITE (10 Format Converters)
  // ==========================================
  {
    id: 'convert-png-webp',
    name: 'PNG to WebP Converter',
    category: 'convert',
    description: 'Convert PNG graphics to next-generation Google WebP preserving transparency and reducing size.',
    targetKeyword: 'PNG to WebP converter online',
    badge: 'Fast',
    badgeColor: 'cyan',
    icon: 'Zap',
    actionSection: 'convert',
    subToolId: 'png-to-webp',
  },
  {
    id: 'convert-webp-jpg',
    name: 'WebP to JPG Converter',
    category: 'convert',
    description: 'Convert WebP photos to universal standard JPEG images for compatibility with all programs.',
    targetKeyword: 'WebP to JPG converter online',
    badge: 'Essential',
    badgeColor: 'indigo',
    icon: 'ArrowRight',
    actionSection: 'convert',
    subToolId: 'webp-to-jpg',
  },
  {
    id: 'convert-heic-jpg',
    name: 'HEIC to JPG Converter',
    category: 'convert',
    description: 'Convert Apple iPhone & iPad HEIC camera photos to standard JPG right inside your browser.',
    targetKeyword: 'HEIC to JPG converter for iPhone',
    badge: 'iPhone',
    badgeColor: 'rose',
    icon: 'Zap',
    actionSection: 'convert',
    subToolId: 'heic-to-jpg',
  },
  {
    id: 'convert-jpg-webp',
    name: 'JPG to WebP Converter',
    category: 'convert',
    description: 'Compress standard JPEG photos into lightweight Google WebP files with high visual fidelity.',
    targetKeyword: 'JPG to WebP converter online',
    badge: 'Save Size',
    badgeColor: 'emerald',
    icon: 'Sparkles',
    actionSection: 'convert',
    subToolId: 'jpg-to-webp',
  },
  {
    id: 'convert-png-jpg',
    name: 'PNG to JPG Converter',
    category: 'convert',
    description: 'Convert transparent or heavy PNG files to compressed JPG files with clean white background fill.',
    targetKeyword: 'PNG to JPG converter online',
    badge: 'Universal',
    badgeColor: 'blue',
    icon: 'ArrowRight',
    actionSection: 'convert',
    subToolId: 'png-to-jpg',
  },
  {
    id: 'convert-jpg-png',
    name: 'JPG to PNG Converter',
    category: 'convert',
    description: 'Convert compressed JPEG into lossless raster PNG format without further lossy recompression.',
    targetKeyword: 'JPG to PNG converter online',
    badge: 'Lossless',
    badgeColor: 'purple',
    icon: 'ArrowRight',
    actionSection: 'convert',
    subToolId: 'jpg-to-png',
  },
  {
    id: 'convert-avif-jpg',
    name: 'AVIF to JPG Converter',
    category: 'convert',
    description: 'Modern AVIF images converted into legacy JPG format compatible with all operating systems.',
    targetKeyword: 'AVIF to JPG converter online',
    badge: 'Modern',
    badgeColor: 'amber',
    icon: 'Zap',
    actionSection: 'convert',
    subToolId: 'avif-to-jpg',
  },
  {
    id: 'convert-svg-png',
    name: 'SVG to PNG Converter',
    category: 'convert',
    description: 'Convert vector SVG graphics into raster high-resolution PNG format with transparent backgrounds.',
    targetKeyword: 'SVG to PNG vector rasterizer',
    badge: 'Vector',
    badgeColor: 'indigo',
    icon: 'Sparkles',
    actionSection: 'convert',
    subToolId: 'svg-to-png',
  },
  {
    id: 'convert-pdf-jpg',
    name: 'PDF to JPG Converter',
    category: 'convert',
    description: 'Convert PDF pages into clear, high-resolution JPG images with one-click ZIP download.',
    targetKeyword: 'Convert PDF to high-resolution JPG images',
    badge: 'High Res',
    badgeColor: 'amber',
    icon: 'Zap',
    actionSection: 'pdf-tools',
    subToolId: 'pdf-to-jpg',
  },
  {
    id: 'convert-img-pdf',
    name: 'Image to PDF Converter',
    category: 'convert',
    description: 'Turn JPG, PNG, and WebP images into a clean single PDF document for printing and sharing.',
    targetKeyword: 'Convert JPG PNG to single PDF document',
    badge: 'Popular',
    badgeColor: 'rose',
    icon: 'FilePlus',
    actionSection: 'pdf-tools',
    subToolId: 'image-to-pdf',
  },

  // ==========================================
  // DOCUMENT TOOLS (Indian Government Compliance Suite - 7 Standalone Tools)
  // ==========================================
  {
    id: 'pan-photo-resize',
    name: 'PAN Photo Resizer',
    category: 'document-tools',
    description: 'Crop and scale passport photos to exact 197×276 px (NSDL Protean) or 213×213 px (UTIITSL), 20–50 KB, and 200/300 DPI.',
    targetKeyword: 'PAN card photo resizer 197x276 213x213 200 DPI online',
    badge: 'NSDL & UTIITSL Compliant',
    badgeColor: 'emerald',
    icon: 'UserCheck',
    actionSection: 'document-tools',
    subToolId: 'pan-photo-resize',
  },
  {
    id: 'signature-resize',
    name: 'PAN Signature Resizer',
    category: 'document-tools',
    description: 'Isolate & whiten physical signatures with pan & zoom. Strictly 354×157 px, under 50 KB, and 200 DPI JPEG with pure white canvas.',
    targetKeyword: 'PAN card signature resizer 354x157 200 DPI under 50 KB',
    badge: '354×157 px · < 50 KB',
    badgeColor: 'indigo',
    icon: 'PenTool',
    actionSection: 'document-tools',
    subToolId: 'signature-resize',
  },
  {
    id: 'passport-photo-resize',
    name: 'Passport Photo Resizer',
    category: 'document-tools',
    description: 'Format passport photo to 630×810 px (Digital) or 350×450 px (Print) under 250 KB at 300 DPI with biometric guide for MEA Passport Seva.',
    targetKeyword: 'Passport photo size compressor under 250kb 630x810 350x450',
    badge: '630×810 px · 10–250 KB',
    badgeColor: 'blue',
    icon: 'FileBadge',
    actionSection: 'document-tools',
    subToolId: 'passport-photo-resize',
  },
  {
    id: 'passport-signature-resize',
    name: 'Passport Signature Resizer',
    category: 'document-tools',
    description: 'Format official passport signature (400×200 px, 4×2 cm) under 100 KB at 300 DPI with automated background whitening and contrast boost.',
    targetKeyword: 'Passport seva signature resizer online under 100kb',
    badge: '400×200 px · 300 DPI',
    badgeColor: 'cyan',
    icon: 'PenTool',
    actionSection: 'document-tools',
    subToolId: 'passport-signature-resize',
  },
  {
    id: 'upsc-photo-maker',
    name: 'UPSC Photo Maker (Name + Date)',
    category: 'document-tools',
    description: 'Generate UPSC OTR compliant photographs with candidate Name & Date of Photo (DOP) printed on bottom banner (350×350 px, 20–300 KB).',
    targetKeyword: 'UPSC photo resizer online with name and date stamp DOP',
    badge: 'Name + DOP · 20–300 KB',
    badgeColor: 'amber',
    icon: 'Award',
    actionSection: 'document-tools',
    subToolId: 'upsc-photo-maker',
  },
  {
    id: 'ssc-resizer',
    name: 'SSC Photo & Signature Resizer',
    category: 'document-tools',
    description: 'Strict byte-bound compressor for SSC CGL, CHSL, MTS, and GD. Photo: 350×450 px (20–50 KB); Signature: strictly 10–20 KB (140×60 px).',
    targetKeyword: 'SSC photo and signature resizer 20kb 50kb 10kb 20kb',
    badge: 'SSC Strict Limits',
    badgeColor: 'rose',
    icon: 'FileText',
    actionSection: 'document-tools',
    subToolId: 'ssc-resizer',
  },
  {
    id: 'gov-compressor',
    name: 'Gov Form Document Compressor',
    category: 'document-tools',
    description: 'Shrink Aadhaar card, marksheets, and certificates strictly under 100 KB, 200 KB, or 500 KB for EPFO, Banking, and State PSC portals.',
    targetKeyword: 'Compress document under 100kb 200kb online pdf image',
    badge: '< 100 KB / 200 KB',
    badgeColor: 'emerald',
    icon: 'FileArchive',
    actionSection: 'document-tools',
    subToolId: 'gov-compressor',
  },
];

// ==========================================
// CANONICAL SEARCH ALIASES & SEARCH FUNCTION
// ==========================================

export const TOOL_SEARCH_ALIASES: Record<string, string[]> = {
  // Document Tools (Govt & Exam Forms)
  'upsc-photo-maker': [
    'upsc', 'name date', 'dop', 'date of photo', 'tarikh', 'naam', 'upsc form', 'stamp', 'civil services', 'ias', 'nda', 'cds',
    'upsc photo', 'upsc photo maker', 'upsc photo resizer', 'यूपीएससी', 'तारीख', 'नाम', 'फोटो नाम तारीख', 'upsc signature'
  ],
  'ssc-resizer': [
    'ssc', 'cgl', 'chsl', 'mts', 'gd', '20kb', '50kb', '10kb', '20 kb', 'sign', 'hastakshar', 'signature', 'ssc photo', 'ssc sign',
    'ssc signature', 'ssc photo resizer', 'हस्ताक्षर', 'एसएससी', 'sign resize', 'signature resize', 'photo sign'
  ],
  'pan-photo-resize': [
    'pan', 'pan card', '200 dpi', 'nsdl', 'protean', 'utiitsl', 'uti', 'photo resize', 'pan photo', '197x276', '213x213', '200x230',
    'pan card photo', 'pan photo resize', 'pan photo resizer', 'पैन कार्ड', 'पैन कार्ड फोटो', 'पैन फोटो'
  ],
  'signature-resize': [
    'pan sign', 'pan signature', 'hastakshar', 'safed sign', 'white background sign', '50kb', '354x157',
    'pan card sign', 'sign resize', 'signature resize', 'हस्ताक्षर', 'दस्तखत', 'पैन हस्ताक्षर'
  ],
  'passport-photo-resize': [
    'passport', 'seva', '630x810', '35x45', '350x450', '300 dpi', 'blue background', 'white background', 'mea', 'visa photo',
    'passport photo', 'passport size', 'passport photo resize', 'पासपोर्ट', 'पासपोर्ट फोटो', 'पासपोर्ट साइज'
  ],
  'passport-signature-resize': [
    'passport sign', 'passport signature', 'mea sign', '400x200', 'passport seva sign', 'passport sign resize',
    'पासपोर्ट हस्ताक्षर', 'पासपोर्ट साइन'
  ],
  'gov-compressor': [
    'aadhar', 'aadhaar', 'marksheet', 'certificate', '100kb', '200kb', '500kb', 'epfo', 'sarathi', 'document kam', 'size kam', 'pdf kam',
    'gov compressor', 'document compressor', 'kb resizer', '50kb', 'आधार', 'सर्टिफिकेट', 'सरकारी फॉर्म कंप्रेसर'
  ],

  // Image Utilities
  'compressor': [
    'compress', 'size kam', 'chhota', 'kb', 'mb to kb', 'reduce size', 'photo size', 'compress image', 'photo kam', 'chhoti photo',
    '20kb', '50kb', '100kb', '200kb', 'image compressor', 'photo resize', 'compress photo', 'reduce image size', 'reduce photo size',
    'kb kam kare', 'कंप्रेस', 'फोटो कंप्रेस', 'कंप्रेसर', 'साइज कम करें'
  ],
  'resizer': [
    'pixel', 'resize', 'dimension', 'scale', 'badalna', 'photo resize', '800x600', 'width height', 'image resizer',
    'resize photo', 'resize image', 'pixel resize', 'scale image', 'photo ka size badalna', 'रिसाइज', 'फोटो रिसाइज', 'रिसाइजर', 'पिक्सल बदलें'
  ],
  'cropper': [
    'crop', 'katna', 'katna photo', 'rotate', 'ghomana', 'seedha', 'aspect ratio', '1:1', 'square', 'passport crop',
    'image cropper', 'crop photo', 'crop image', 'फोटो काटना', 'क्रॉप', 'फोटो घुमाएं'
  ],
  'bg-remover': [
    'background remover', 'bg remover', 'transparent', 'remove bg', 'safed background', 'white background', 'photo background',
    'transparent png', 'cutout', 'remove background', 'बैकग्राउंड', 'बैकग्राउंड हटाएं', 'फोटो बैकग्राउंड', 'ट्रांसपेरेंट'
  ],
  'batch-img': [
    'batch', 'bulk', 'multiple photos', 'batch crop', 'zip download', 'batch processor', 'bulk crop', 'batch compress',
    'एक साथ फोटो', 'थोक फोटो', 'batch image'
  ],
  'batch': [
    'batch', 'bulk', 'multiple photos', 'batch crop', 'zip download', 'batch processor', 'bulk crop', 'batch compress',
    'एक साथ फोटो', 'थोक फोटो', 'batch image'
  ],
  'adjust-img': [
    'filter', 'brightness', 'contrast', 'adjust', 'photo filter', 'chamak', 'filter adjust', 'saturation',
    'रंग बदलना', 'फोटो फिल्टर', 'ब्राइटनेस'
  ],
  'adjust': [
    'filter', 'brightness', 'contrast', 'adjust', 'photo filter', 'chamak', 'filter adjust', 'saturation',
    'रंग बदलना', 'फोटो फिल्टर', 'ब्राइटनेस'
  ],
  'rounded-img': [
    'round corners', 'rounded', 'circle crop', 'circle avatar', 'border radius', 'gol photo', 'round photo', 'avatar maker',
    'rounded corner', 'गोल फोटो', 'कॉर्नर राउंड'
  ],
  'rounded': [
    'round corners', 'rounded', 'circle crop', 'circle avatar', 'border radius', 'gol photo', 'round photo', 'avatar maker',
    'rounded corner', 'गोल फोटो', 'कॉर्नर राउंड'
  ],
  'watermark-img': [
    'watermark', 'logo', 'add text to image', 'protect photo', 'stamp', 'watermark photo', 'image watermark',
    'watermarker', 'वाटरमार्क', 'फोटो पर नाम'
  ],
  'watermark': [
    'watermark', 'logo', 'add text to image', 'protect photo', 'stamp', 'watermark photo', 'image watermark',
    'watermarker', 'वाटरमार्क', 'फोटो पर नाम'
  ],
  'meme-img': [
    'meme', 'meme generator', 'add caption', 'photo text', 'funny photo', 'caption maker', 'meme maker',
    'मीम', 'मीम जनरेटर', 'फोटो पर लिखें'
  ],
  'meme': [
    'meme', 'meme generator', 'add caption', 'photo text', 'funny photo', 'caption maker', 'meme maker',
    'मीम', 'मीम जनरेटर', 'फोटो पर लिखें'
  ],
  'palette-img': [
    'palette', 'color palette', 'eyedropper', 'hex code', 'color picker', 'extract color', 'color extractor',
    'रंग चुनना', 'कलर पैलेट'
  ],
  'palette': [
    'palette', 'color palette', 'eyedropper', 'hex code', 'color picker', 'extract color', 'color extractor',
    'रंग चुनना', 'कलर पैलेट'
  ],
  'base64-img': [
    'base64', 'image to base64', 'data uri', 'base64 string', 'html img', 'base64 converter', 'इमेज से बेस64'
  ],
  'base64': [
    'base64', 'image to base64', 'data uri', 'base64 string', 'html img', 'base64 converter', 'इमेज से बेस64'
  ],

  // PDF Tools
  'merge-pdf': [
    'merge', 'jodna', 'ek sath', 'combine', 'combine pdf', 'join pdf', 'multiple pdf', 'marksheet merge', 'pdf jodein', 'ek pdf',
    'pdf merge', 'merge pdf', 'पीडीएफ जोड़ें', 'पीडीएफ मर्ज', 'मर्ज पीडीएफ'
  ],
  'compress-pdf': [
    'compress pdf', 'pdf size kam', 'pdf 100kb', 'pdf 200kb', 'shrink pdf', 'chhota pdf', 'kam size pdf',
    'pdf compress', 'reduce pdf size', 'पीडीएफ कंप्रेस', 'पीडीएफ साइज कम करें'
  ],
  'pdf-to-word': [
    'word', 'docx', 'edit pdf', 'pdf se word', 'editable', 'pdf to word', 'pdf to docx', 'convert pdf to word',
    'पीडीएफ से वर्ड', 'वर्ड में बदलें'
  ],
  'pdf-to-jpg': [
    'pdf to photo', 'pdf se image', 'pdf to jpg', 'pdf to png', 'pdf to image', 'convert pdf to image',
    'पीडीएफ से फोटो', 'पीडीएफ से जेपीजी'
  ],
  'image-to-pdf': [
    'photo to pdf', 'image to pdf', 'jpg to pdf', 'pdf banana', 'photo se pdf', 'marksheet pdf',
    'png to pdf', 'convert image to pdf', 'फोटो से पीडीएफ', 'इमेज से पीडीएफ', 'img to pdf'
  ],
  'split-pdf': [
    'split', 'page alag', 'extract pages', 'tukde', 'split pdf', 'pdf split', 'extract pdf pages', 'separate pdf',
    'पीडीएफ अलग करें', 'पेज निकालें'
  ],
  'rotate-pdf': [
    'rotate', 'ulta', 'seedha', 'rotate pdf', 'sidha', 'turn pdf', 'पीडीएफ घुमाएं'
  ],
  'pdf-to-text': [
    'pdf to text', 'ocr', 'tesseract', 'extract text', 'searchable pdf', 'pdf padhna', 'pdf ocr', 'scanned pdf to text',
    'पीडीएफ से टेक्स्ट', 'टेक्स्ट निकालें'
  ],

  // Format Converters (both id and subToolId keys)
  'heic-to-jpg': [
    'iphone', 'apple', 'heic', 'heif', 'iphone photo', 'ios photo', 'heic to jpg', 'convert heic to jpg', 'heic converter',
    'आईफोन फोटो', 'हेइक से जेपीजी'
  ],
  'heic-to-jpg-img': [
    'iphone', 'apple', 'heic', 'heif', 'iphone photo', 'ios photo', 'heic to jpg', 'convert heic to jpg', 'heic converter',
    'आईफोन फोटो', 'हेइक से जेपीजी'
  ],
  'convert-heic-jpg': [
    'iphone', 'apple', 'heic', 'heif', 'iphone photo', 'ios photo', 'heic to jpg', 'convert heic to jpg', 'heic converter',
    'आईफोन फोटो', 'हेइक से जेपीजी'
  ],
  'png-to-webp': [
    'webp', 'png', 'transparent', 'lightweight', 'png to webp', 'convert png to webp', 'webp converter', 'पीएनजी से वेबपी'
  ],
  'png-to-webp-img': [
    'webp', 'png', 'transparent', 'lightweight', 'png to webp', 'convert png to webp', 'webp converter', 'पीएनजी से वेबपी'
  ],
  'convert-png-webp': [
    'webp', 'png', 'transparent', 'lightweight', 'png to webp', 'convert png to webp', 'webp converter', 'पीएनजी से वेबपी'
  ],
  'webp-to-jpg': [
    'webp to jpg', 'webp convert', 'jpg convert', 'convert webp to jpg', 'webp to jpeg', 'वेबपी से जेपीजी'
  ],
  'webp-to-jpg-img': [
    'webp to jpg', 'webp convert', 'jpg convert', 'convert webp to jpg', 'webp to jpeg', 'वेबपी से जेपीजी'
  ],
  'convert-webp-jpg': [
    'webp to jpg', 'webp convert', 'jpg convert', 'convert webp to jpg', 'webp to jpeg', 'वेबपी से जेपीजी'
  ],
  'jpg-to-png': [
    'jpg to png', 'jpeg to png', 'convert jpg to png', 'lossless png', 'जेपीजी से पीएनजी'
  ],
  'jpg-to-png-img': [
    'jpg to png', 'jpeg to png', 'convert jpg to png', 'lossless png', 'जेपीजी से पीएनजी'
  ],
  'convert-jpg-png': [
    'jpg to png', 'jpeg to png', 'convert jpg to png', 'lossless png', 'जेपीजी से पीएनजी'
  ],
  'png-to-jpg': [
    'png to jpg', 'png to jpeg', 'convert png to jpg', 'white background fill', 'पीएनजी से जेपीजी'
  ],
  'png-to-jpg-img': [
    'png to jpg', 'png to jpeg', 'convert png to jpg', 'white background fill', 'पीएनजी से जेपीजी'
  ],
  'convert-png-jpg': [
    'png to jpg', 'png to jpeg', 'convert png to jpg', 'white background fill', 'पीएनजी से जेपीजी'
  ],
  'jpg-to-webp': [
    'jpg to webp', 'jpeg to webp', 'convert jpg to webp', 'optimize webp', 'जेपीजी से वेबपी'
  ],
  'jpg-to-webp-img': [
    'jpg to webp', 'jpeg to webp', 'convert jpg to webp', 'optimize webp', 'जेपीजी से वेबपी'
  ],
  'convert-jpg-webp': [
    'jpg to webp', 'jpeg to webp', 'convert jpg to webp', 'optimize webp', 'जेपीजी से वेबपी'
  ],
  'avif-to-jpg': [
    'avif to jpg', 'convert avif to jpg', 'av1 to jpg', 'avif convert', 'एविफ से जेपीजी'
  ],
  'avif-to-jpg-img': [
    'avif to jpg', 'convert avif to jpg', 'av1 to jpg', 'avif convert', 'एविफ से जेपीजी'
  ],
  'convert-avif-jpg': [
    'avif to jpg', 'convert avif to jpg', 'av1 to jpg', 'avif convert', 'एविफ से जेपीजी'
  ],
  'svg-to-png': [
    'svg to png', 'convert svg to png', 'vector to png', 'rasterize svg', 'एसवीजी से पीएनजी'
  ],
  'svg-to-png-img': [
    'svg to png', 'convert svg to png', 'vector to png', 'rasterize svg', 'एसवीजी से पीएनजी'
  ],
  'convert-svg-png': [
    'svg to png', 'convert svg to png', 'vector to png', 'rasterize svg', 'एसवीजी से पीएनजी'
  ],
  'convert-pdf-jpg': [
    'pdf to jpg', 'pdf to photo', 'convert pdf to jpg', 'pdf to image', 'पीडीएफ से जेपीजी'
  ],
  'convert-img-pdf': [
    'image to pdf', 'photo to pdf', 'jpg to pdf', 'png to pdf', 'convert image to pdf', 'फोटो से पीडीएफ'
  ],
};

/**
 * Pure deterministic search helper that ranks matches by relevance:
 * 1. Exact name match (Score 100)
 * 2. Name starts with query (Score 85)
 * 3. Name contains query (Score 70)
 * 4. Exact alias match (Score 65)
 * 5. Query word intersection (Score 60, e.g. "pdf merge" <-> "Merge PDF")
 * 6. Partial alias match (Score 40, e.g. "pan card photo resize" <-> "pan card")
 * 7. Target keyword or badge contains query (Score 30)
 * 8. Description contains query (Score 20)
 */
export function searchTools(
  tools: ToolItem[],
  query: string,
  category: ToolCategory = 'all',
  customAliases: Record<string, string[]> = TOOL_SEARCH_ALIASES
): ToolItem[] {
  let list = tools;
  if (category !== 'all') {
    list = list.filter((t) => t.category === category);
  }

  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) {
    return list;
  }

  const queryWords = cleanQ.split(/\s+/).filter(Boolean);

  interface ScoredTool {
    tool: ToolItem;
    score: number;
    originalIndex: number;
  }

  const scored: ScoredTool[] = [];

  list.forEach((tool, index) => {
    const nameLower = tool.name.toLowerCase();
    const descLower = tool.description.toLowerCase();
    const keywordLower = tool.targetKeyword.toLowerCase();
    const badgeLower = (tool.badge || '').toLowerCase();
    const toolAliases = [
      ...(tool.searchAliases || []),
      ...(customAliases[tool.id] || []),
      ...(customAliases[tool.subToolId] || []),
    ].map((a) => a.toLowerCase());

    let score = 0;

    // 1. Exact name match
    if (nameLower === cleanQ) {
      score = Math.max(score, 100);
    }
    // 2. Name starts with query
    else if (nameLower.startsWith(cleanQ)) {
      score = Math.max(score, 85);
    }
    // 3. Name contains query as a substring
    else if (nameLower.includes(cleanQ)) {
      score = Math.max(score, 70);
    }

    // 4. Exact alias match
    if (toolAliases.some((a) => a === cleanQ)) {
      score = Math.max(score, 65);
    }

    // 5. Query word intersection
    const searchBlob = `${nameLower} ${toolAliases.join(' ')}`;
    if (queryWords.length > 1 && queryWords.every((w) => searchBlob.includes(w))) {
      score = Math.max(score, 60);
    }

    // 6. Partial alias match
    const partialAliasMatch = toolAliases.some(
      (a) => a.includes(cleanQ) || (a.length >= 3 && cleanQ.includes(a))
    );
    if (partialAliasMatch) {
      score = Math.max(score, 40);
    }

    // 7. Target keyword or badge match
    if (keywordLower.includes(cleanQ) || (badgeLower && badgeLower.includes(cleanQ))) {
      score = Math.max(score, 30);
    }

    // 8. Description match
    if (descLower.includes(cleanQ)) {
      score = Math.max(score, 20);
    }

    if (score > 0) {
      scored.push({ tool, score, originalIndex: index });
    }
  });

  // Sort descending by score; preserve original catalog index on ties
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.originalIndex - b.originalIndex;
  });

  return scored.map((s) => s.tool);
}
