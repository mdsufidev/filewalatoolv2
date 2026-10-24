export interface DetectedToolTarget {
  section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';
  subToolId: string;
  name: string;
  tagline: string;
  iconType: 'compress' | 'resize' | 'crop' | 'merge' | 'split' | 'word' | 'image' | 'convert' | 'govt' | 'file';
  badge?: string;
}

export interface DetectedFileSummary {
  fileCount: number;
  category: 'pdf' | 'image' | 'heic' | 'docx' | 'svg' | 'unknown';
  categoryLabel: string;
  sampleFileName?: string;
  formattedSize?: string;
  primaryTarget: DetectedToolTarget;
  alternativeTargets: DetectedToolTarget[];
  detectedMimeOrExt: string;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Detect file category and optimal tools based on dropped File objects
 */
export function detectFileTarget(files: File[]): DetectedFileSummary {
  const fileCount = files.length;
  const first = files[0];
  const name = first ? first.name.toLowerCase() : '';
  const type = first ? first.type.toLowerCase() : '';
  const ext = name.split('.').pop() || '';

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const formattedSize = formatBytes(totalSize);
  const sampleFileName = first ? first.name : 'Dropped File';

  // 1. PDF DETECTION
  const isPdf = type.includes('pdf') || ext === 'pdf';
  if (isPdf) {
    if (fileCount > 1) {
      return {
        fileCount,
        category: 'pdf',
        categoryLabel: `${fileCount} PDF Documents`,
        sampleFileName,
        formattedSize,
        detectedMimeOrExt: 'PDF Documents',
        primaryTarget: {
          section: 'pdf-tools',
          subToolId: 'merge-pdf',
          name: 'Merge PDF',
          tagline: `Combine ${fileCount} PDF documents into a single organized file`,
          iconType: 'merge',
          badge: 'Auto-Selected',
        },
        alternativeTargets: [
          {
            section: 'pdf-tools',
            subToolId: 'compress-pdf',
            name: 'Compress PDF',
            tagline: 'Shrink PDF file size while maintaining clarity',
            iconType: 'compress',
          },
          {
            section: 'pdf-tools',
            subToolId: 'pdf-to-word',
            name: 'PDF to Word (DOCX)',
            tagline: 'Convert PDF text and tables to editable Microsoft Word document',
            iconType: 'word',
          },
        ],
      };
    }

    return {
      fileCount,
      category: 'pdf',
      categoryLabel: 'PDF Document',
      sampleFileName,
      formattedSize,
      detectedMimeOrExt: 'PDF Document',
      primaryTarget: {
        section: 'pdf-tools',
        subToolId: 'compress-pdf',
        name: 'Compress PDF',
        tagline: 'Reduce PDF file size without losing quality',
        iconType: 'compress',
        badge: 'Recommended',
      },
      alternativeTargets: [
        {
          section: 'pdf-tools',
          subToolId: 'pdf-to-word',
          name: 'PDF to Word (DOCX)',
          tagline: 'Convert to editable Microsoft Word document with native formatting',
          iconType: 'word',
        },
        {
          section: 'pdf-tools',
          subToolId: 'pdf-to-jpg',
          name: 'PDF to Image (JPG/PNG)',
          tagline: 'Extract crisp high-resolution images of each page with bulk ZIP',
          iconType: 'image',
        },
        {
          section: 'pdf-tools',
          subToolId: 'merge-pdf',
          name: 'Merge / Combine PDF',
          tagline: 'Add more PDF files and combine them in custom page order',
          iconType: 'merge',
        },
        {
          section: 'pdf-tools',
          subToolId: 'split-pdf',
          name: 'Split PDF',
          tagline: 'Extract specific pages or separate large PDF files',
          iconType: 'split',
        },
      ],
    };
  }

  // 2. IPHONE HEIC / HEIF DETECTION
  const isHeic = ext === 'heic' || ext === 'heif' || type.includes('heic') || type.includes('heif');
  if (isHeic) {
    return {
      fileCount,
      category: 'heic',
      categoryLabel: fileCount > 1 ? `${fileCount} iPhone HEIC Photos` : 'iPhone HEIC Photo',
      sampleFileName,
      formattedSize,
      detectedMimeOrExt: 'Apple HEIC/HEIF',
      primaryTarget: {
        section: 'convert',
        subToolId: 'heic-to-jpg',
        name: 'HEIC to JPG Converter',
        tagline: 'Convert Apple iPhone photos to universal high-quality JPEG in-browser',
        iconType: 'convert',
        badge: 'Direct Decoder',
      },
      alternativeTargets: [
        {
          section: 'image-tools',
          subToolId: 'compressor',
          name: 'Image Compressor',
          tagline: 'Compress and optimize file size',
          iconType: 'compress',
        },
      ],
    };
  }

  // 3. SVG VECTOR DETECTION
  const isSvg = ext === 'svg' || type.includes('svg');
  if (isSvg) {
    return {
      fileCount,
      category: 'svg',
      categoryLabel: 'SVG Vector Graphic',
      sampleFileName,
      formattedSize,
      detectedMimeOrExt: 'SVG Vector',
      primaryTarget: {
        section: 'convert',
        subToolId: 'svg-to-png',
        name: 'SVG to PNG Converter',
        tagline: 'Rasterize scalable vector artwork into high-resolution transparent PNG',
        iconType: 'convert',
        badge: 'Rasterizer',
      },
      alternativeTargets: [
        {
          section: 'image-tools',
          subToolId: 'resizer',
          name: 'Image Resizer',
          tagline: 'Scale to exact pixel dimensions',
          iconType: 'resize',
        },
      ],
    };
  }

  // 4. WORD / DOCX DETECTION
  const isWord = ext === 'docx' || ext === 'doc' || type.includes('word') || type.includes('officedocument');
  if (isWord) {
    return {
      fileCount,
      category: 'docx',
      categoryLabel: 'Microsoft Word Document',
      sampleFileName,
      formattedSize,
      detectedMimeOrExt: 'Word Document',
      primaryTarget: {
        section: 'pdf-tools',
        subToolId: 'pdf-to-word',
        name: 'PDF to Word Engine',
        tagline: 'Open client-side DOCX document flow & text viewer',
        iconType: 'word',
        badge: 'DOCX Flow',
      },
      alternativeTargets: [
        {
          section: 'pdf-tools',
          subToolId: 'image-to-pdf',
          name: 'Document to PDF',
          tagline: 'Compile documents into ready-to-share PDF format',
          iconType: 'file',
        },
      ],
    };
  }

  // 5. STANDARD IMAGES (PNG, JPG, JPEG, WEBP, AVIF, BMP)
  const isImage = type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'gif'].includes(ext);
  if (isImage) {
    if (fileCount > 1) {
      return {
        fileCount,
        category: 'image',
        categoryLabel: `${fileCount} Images`,
        sampleFileName,
        formattedSize,
        detectedMimeOrExt: 'Image Collection',
        primaryTarget: {
          section: 'pdf-tools',
          subToolId: 'image-to-pdf',
          name: 'Image to PDF Converter',
          tagline: `Combine ${fileCount} images into a single print-ready PDF document`,
          iconType: 'file',
          badge: 'Multi-Image Match',
        },
        alternativeTargets: [
          {
            section: 'image-tools',
            subToolId: 'compressor',
            name: 'Image Compressor',
            tagline: 'Compress and reduce photo sizes with instant comparison slider',
            iconType: 'compress',
          },
          {
            section: 'image-tools',
            subToolId: 'resizer',
            name: 'Image Resizer',
            tagline: 'Scale photo dimensions by exact pixels or percentage',
            iconType: 'resize',
          },
        ],
      };
    }

    return {
      fileCount,
      category: 'image',
      categoryLabel: `${ext.toUpperCase() || 'Raster'} Image`,
      sampleFileName,
      formattedSize,
      detectedMimeOrExt: `${ext.toUpperCase() || 'Image'} File`,
      primaryTarget: {
        section: 'image-tools',
        subToolId: 'compressor',
        name: 'Image Compressor',
        tagline: 'Reduce PNG, JPEG, WebP file sizes by up to 90% without quality loss',
        iconType: 'compress',
        badge: 'Popular',
      },
      alternativeTargets: [
        {
          section: 'image-tools',
          subToolId: 'resizer',
          name: 'Image Resizer',
          tagline: 'Scale dimensions by exact pixels with aspect ratio lock and presets',
          iconType: 'resize',
        },
        {
          section: 'image-tools',
          subToolId: 'cropper',
          name: 'Image Cropper',
          tagline: 'Crop aspect ratios (1:1, 16:9, 4:3), rotate 90°, and mirror flip',
          iconType: 'crop',
        },
        {
          section: 'document-tools',
          subToolId: 'gov-compressor',
          name: 'Gov Form Compressor',
          tagline: 'Strict <100 KB, <200 KB, or <500 KB limit for govt portals & EPFO',
          iconType: 'govt',
        },
        {
          section: 'document-tools',
          subToolId: 'pan-photo-resize',
          name: 'PAN Photo Resizer',
          tagline: 'Exact 200×230 px, 20–50 KB, and 200 DPI JPEG for NSDL/Protean',
          iconType: 'govt',
        },
        {
          section: 'convert',
          subToolId: ext === 'png' ? 'png-to-webp' : ext === 'webp' ? 'webp-to-jpg' : 'jpg-to-png',
          name: 'Format Converter',
          tagline: 'Transcode between PNG, JPG, and WebP instantly in browser',
          iconType: 'convert',
        },
      ],
    };
  }

  // 6. DEFAULT / UNKNOWN FILE FALLBACK
  return {
    fileCount,
    category: 'unknown',
    categoryLabel: fileCount > 1 ? `${fileCount} Files` : 'Uploaded Document',
    sampleFileName,
    formattedSize,
    detectedMimeOrExt: ext ? `.${ext.toUpperCase()}` : 'Binary File',
    primaryTarget: {
      section: 'image-tools',
      subToolId: 'compressor',
      name: 'Image Compressor',
      tagline: 'Compress and optimize file sizes client-side',
      iconType: 'compress',
      badge: 'Default',
    },
    alternativeTargets: [
      {
        section: 'pdf-tools',
        subToolId: 'compress-pdf',
        name: 'Compress PDF',
        tagline: 'Optimize PDF document size',
        iconType: 'compress',
      },
      {
        section: 'document-tools',
        subToolId: 'gov-compressor',
        name: 'Gov Document Compressor',
        tagline: 'Strict byte limit compressor for documents',
        iconType: 'govt',
      },
    ],
  };
}

/**
 * Rapid preview detection during dragover using DataTransferItemList
 */
export function quickDetectDragTypes(items: DataTransferItemList | null): {
  isSupported: boolean;
  typeHint: string;
  category: 'pdf' | 'image' | 'heic' | 'docx' | 'unknown';
} {
  if (!items || items.length === 0) {
    return { isSupported: true, typeHint: 'Files detected', category: 'unknown' };
  }

  let hasPdf = false;
  let hasImage = false;
  let hasHeic = false;
  let hasWord = false;
  let count = items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== 'file') continue;
    const type = item.type.toLowerCase();
    if (type.includes('pdf')) hasPdf = true;
    else if (type.includes('heic') || type.includes('heif')) hasHeic = true;
    else if (type.includes('image')) hasImage = true;
    else if (type.includes('word') || type.includes('officedocument')) hasWord = true;
  }

  if (hasPdf) {
    return {
      isSupported: true,
      typeHint: count > 1 ? `${count} PDF Files Detected` : 'PDF Document Detected',
      category: 'pdf',
    };
  }

  if (hasHeic) {
    return {
      isSupported: true,
      typeHint: 'iPhone HEIC Photo Detected',
      category: 'heic',
    };
  }

  if (hasImage) {
    return {
      isSupported: true,
      typeHint: count > 1 ? `${count} Images Detected` : 'Image Detected',
      category: 'image',
    };
  }

  if (hasWord) {
    return {
      isSupported: true,
      typeHint: 'Word Document Detected',
      category: 'docx',
    };
  }

  return {
    isSupported: true,
    typeHint: count > 1 ? `${count} Files Ready to Drop` : 'File Ready to Drop',
    category: 'unknown',
  };
}
