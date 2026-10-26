export interface HubWorkflowCard {
  title: string;
  description: string;
  slug: string;
  actionSection: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools';
  subToolId: string;
  badge?: string;
  popular?: boolean;
}

export interface HubMatrixRow {
  name: string;
  format: string;
  primaryUse: string;
  processingEngine: string;
  privacyGuarantee: string;
}

export interface HubFaq {
  question: string;
  answer: string;
}

export interface CategoryHubData {
  id: 'image-tools' | 'pdf-tools' | 'convert';
  badge: string;
  heading: string;
  subheading: string;
  overviewHeading: string;
  overviewParagraphs: string[];
  architecturePoints: { title: string; desc: string }[];
  workflowsHeading: string;
  workflows: HubWorkflowCard[];
  matrixHeading: string;
  matrixRows: HubMatrixRow[];
  faqsHeading: string;
  faqs: HubFaq[];
}

export const CATEGORY_HUBS_CONTENT: Record<'image-tools' | 'pdf-tools' | 'convert', CategoryHubData> = {
  'image-tools': {
    id: 'image-tools',
    badge: 'Client-Side Image Processing Engine',
    heading: 'Free In-Browser Image Optimization & Creative Utilities',
    subheading: 'Compress file weights, resize pixel dimensions, crop, watermark, and manipulate images with zero server uploads and zero data retention.',
    overviewHeading: 'Technical Architecture: 100% On-Device Image Processing',
    overviewParagraphs: [
      'FileWala image utilities execute entirely inside your web browser sandbox using hardware-accelerated HTML5 Canvas (2D Context and OffscreenCanvas) alongside compiled WebAssembly (Wasm) routines. When an image file is selected or dropped onto any tool canvas, the browser reads raw binary streams directly into volatile RAM.',
      'Unlike conventional online image editing platforms that upload user photos to remote cloud servers for batch processing, FileWala processes image buffers on your local device CPU and GPU. Operations such as bicubic pixel scaling, color quantization, alpha-channel preservation, and JPEG/WebP compression occur in client memory with zero server roundtrips.',
      'This zero-transmission architecture guarantees total privacy for sensitive photographs, personal identification documents, and proprietary graphics. Furthermore, local execution eliminates cloud queue delays, file size transfer limits, and privacy leakage risks.'
    ],
    architecturePoints: [
      {
        title: 'HTML5 Canvas & OffscreenCanvas',
        desc: 'Direct pixel manipulation, spatial filtering, and high-performance raster rendering without blocking UI animations.'
      },
      {
        title: 'Adaptive MozJPEG & WebP Encoders',
        desc: 'Advanced quantization tables minimize byte size while preserving sharp edge contrasts and human facial features.'
      },
      {
        title: 'Multi-Threaded Web Workers',
        desc: 'Heavy image compression and batch transformations run on background browser threads for buttery 60 FPS fluidity.'
      },
      {
        title: 'Volatile RAM Garbage Collection',
        desc: 'Pixel buffers and Blob URLs are immediately garbage-collected upon session completion or tab closure.'
      }
    ],
    workflowsHeading: 'Featured Workflows & Popular Image Utilities',
    workflows: [
      {
        title: 'Compress Image to Specific KB',
        description: 'Compress JPG, PNG, and WebP files under 20KB, 50KB, 100KB, or 200KB limits with real-time visual preview.',
        slug: '/compress-image',
        actionSection: 'image-tools',
        subToolId: 'compressor',
        badge: 'Top Utility',
        popular: true,
      },
      {
        title: 'Resize Image Pixels & Dimensions',
        description: 'Adjust width, height, and DPI with aspect ratio lock, predefined display presets, and bicubic interpolation.',
        slug: '/image-resizer',
        actionSection: 'image-tools',
        subToolId: 'resizer',
        badge: 'High Precision',
        popular: true,
      },
      {
        title: 'Crop & Rotate Image',
        description: 'Interactive boundary cropping with freeform handles, 1:1, 4:3, 16:9 aspect ratios, and 90-degree lossless rotations.',
        slug: '/crop-image',
        actionSection: 'image-tools',
        subToolId: 'cropper',
      },
      {
        title: 'AI Background Remover',
        description: 'Segment foreground portraits and product shots with client-side neural runtimes, outputting clean transparent PNGs.',
        slug: '/bg-remover',
        actionSection: 'image-tools',
        subToolId: 'background-remover',
        badge: 'AI Powered',
        popular: true,
      },
      {
        title: 'Add Watermark to Photos',
        description: 'Protect creative assets with custom text or logo watermarks, configurable opacity, rotation angles, and tiled grid layouts.',
        slug: '/watermark-image',
        actionSection: 'image-tools',
        subToolId: 'watermark',
      },
      {
        title: 'Round Image Corners',
        description: 'Create modern UI avatar circles, cards, and rounded-corner thumbnails with customizable border radius and transparent backgrounds.',
        slug: '/round-corners',
        actionSection: 'image-tools',
        subToolId: 'rounded-corner',
      },
    ],
    matrixHeading: 'Image Utility Capabilities & Specifications',
    matrixRows: [
      {
        name: 'Compress Image Size',
        format: 'JPG, PNG, WebP',
        primaryUse: 'Reduce file weight (KB/MB) for web portals and forms',
        processingEngine: 'Adaptive Quantization / Canvas 2D',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'Resize Image Pixels',
        format: 'JPG, PNG, WebP, AVIF',
        primaryUse: 'Scale pixel dimensions with aspect ratio lock',
        processingEngine: 'Bicubic Resampling / OffscreenCanvas',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'Crop & Rotate',
        format: 'All Standard Formats',
        primaryUse: 'Trim boundaries and correct image orientation',
        processingEngine: 'Canvas Spatial Transformation',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'Background Remover',
        format: 'PNG, JPG, WebP',
        primaryUse: 'Extract foreground subject with transparent alpha',
        processingEngine: 'Client-Side Neural Network (WASM)',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'Watermark Image',
        format: 'PNG, JPG, WebP',
        primaryUse: 'Apply copyright text or logo overlays',
        processingEngine: 'Canvas 2D Compositing Context',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'Rounded Corners',
        format: 'PNG, WebP',
        primaryUse: 'Circular avatars and rounded graphic cards',
        processingEngine: 'Canvas Clipping Path Geometry',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
    ],
    faqsHeading: 'Frequently Asked Questions: Image Utilities',
    faqs: [
      {
        question: 'How does FileWala optimize and resize images entirely inside the browser?',
        answer: 'FileWala executes image decoding and re-encoding within your web browser using HTML5 Canvas 2D contexts and WebAssembly binaries. When you drag an image into the workspace, the raw pixel buffer is processed directly by your device CPU/GPU with zero bytes sent to external cloud servers.',
      },
      {
        question: 'Will resizing or compressing my images cause a noticeable drop in image quality?',
        answer: 'FileWala uses intelligent bicubic interpolation algorithms and adaptive MozJPEG/WebP quantization tables. This preserves sharp edges and accurate color fidelity while aggressively discarding invisible high-frequency noise, achieving up to 80% file size reduction with virtually imperceptible visual degradation.',
      },
      {
        question: 'What image formats are supported by FileWala’s image suite?',
        answer: 'The image suite natively supports JPEG, PNG, WebP, GIF, SVG, BMP, and modern AVIF and Apple HEIC/HEIF camera formats. You can crop, resize, compress, rounded-corner, or watermark all standard raster formats directly.',
      },
      {
        question: 'Can I batch compress or resize multiple photos simultaneously?',
        answer: 'Yes. FileWala provides multi-threaded batch processing through Web Workers. Multiple images are processed concurrently in parallel hardware threads without freezing the user interface or crashing your browser tab.',
      },
      {
        question: 'Are my personal photos, selfies, or confidential documents saved anywhere?',
        answer: 'No. Zero files are uploaded or stored. Images reside exclusively in volatile browser RAM (ArrayBuffer / Blob) during your active session. Once you download the result or close the tab, the allocated memory is completely purged by the browser garbage collector.',
      },
    ],
  },

  'pdf-tools': {
    id: 'pdf-tools',
    badge: 'Private PDF Document Utilities',
    heading: 'Private In-Browser PDF Tools & Document Utilities',
    subheading: 'Merge multiple PDFs, compress document sizes, split pages, convert to Word DOCX, and extract text without cloud uploads.',
    overviewHeading: 'Technical Architecture: Secure Client-Side Document Manipulation',
    overviewParagraphs: [
      'FileWala PDF utilities are powered by client-compiled WebAssembly document engines and `pdf-lib` execution runtimes. Unlike cloud PDF editors that upload your sensitive financial statements, tax records, or legal contracts to remote multi-tenant servers, FileWala processes documents entirely within the sandbox of your device browser.',
      'When you add PDF files to any tool, the document’s binary cross-reference tables, content streams, and embedded font dictionaries are parsed in local volatile JavaScript memory. Operations like page merging, rotation transforms, page extraction, and image stream downsampling occur without transmitting a single byte over the network.',
      'For complex conversions such as PDF to editable Word (DOCX) and Optical Character Recognition (OCR), FileWala executes localized layout reconstructors and client-side Tesseract.js workers. Documents remain 100% confidential, meeting the strictest enterprise and personal privacy standards.'
    ],
    architecturePoints: [
      {
        title: 'WASM PDF-Lib Runtime',
        desc: 'Direct binary modification of PDF object trees, metadata streams, and encryption dictionaries in local RAM.'
      },
      {
        title: 'Zero Cloud Transmission',
        desc: 'Confidential tax returns, salary slips, and contracts never traverse external networks or cloud databases.'
      },
      {
        title: 'Client-Side Layout Reconstruction',
        desc: 'Structural text positioning transforms PDF page geometries into clean, editable DOCX documents locally.'
      },
      {
        title: 'Local Tesseract.js OCR Worker',
        desc: 'Optical character recognition runs entirely on your device CPU/GPU without third-party vision API dependencies.'
      }
    ],
    workflowsHeading: 'Essential PDF Workflows & Utilities',
    workflows: [
      {
        title: 'Merge Multiple PDFs',
        description: 'Combine multiple PDF files, marksheet scans, or reports into a single organized document with drag-and-drop reordering.',
        slug: '/merge-pdf',
        actionSection: 'pdf-tools',
        subToolId: 'merge-pdf',
        badge: 'Most Popular',
        popular: true,
      },
      {
        title: 'Compress PDF File Size',
        description: 'Shrink heavy PDF documents below 100KB, 200KB, or 1MB limits while keeping text crisp and printable.',
        slug: '/compress-pdf',
        actionSection: 'pdf-tools',
        subToolId: 'compress-pdf',
        badge: 'High Savings',
        popular: true,
      },
      {
        title: 'Split PDF Pages',
        description: 'Extract specific page ranges or split a large PDF book into separate lightweight documents in seconds.',
        slug: '/split-pdf',
        actionSection: 'pdf-tools',
        subToolId: 'split-pdf',
      },
      {
        title: 'Rotate PDF Pages',
        description: 'Permanently fix inverted or sideways document orientations by rotating individual pages or entire documents 90, 180, or 270 degrees.',
        slug: '/rotate-pdf',
        actionSection: 'pdf-tools',
        subToolId: 'rotate-pdf',
      },
      {
        title: 'Convert PDF to Images (JPG/PNG)',
        description: 'Render every PDF page into high-resolution JPG or PNG images with customizable 150/300 DPI clarity.',
        slug: '/pdf-to-image',
        actionSection: 'pdf-tools',
        subToolId: 'pdf-to-jpg',
      },
      {
        title: 'Convert Images to PDF',
        description: 'Package multiple photo scans, receipts, or notes into a clean, standardized PDF file with custom page margins.',
        slug: '/image-to-pdf',
        actionSection: 'pdf-tools',
        subToolId: 'image-to-pdf',
        popular: true,
      },
      {
        title: 'PDF to Word (DOCX)',
        description: 'Extract document paragraphs and text structures into editable Microsoft Word (.docx) files client-side.',
        slug: '/pdf-to-word',
        actionSection: 'pdf-tools',
        subToolId: 'pdf-to-word',
        badge: 'DOCX Export',
      },
      {
        title: 'PDF Text Extraction & OCR',
        description: 'Extract raw text or run optical character recognition on scanned PDF documents directly in your browser.',
        slug: '/pdf-to-text',
        actionSection: 'pdf-tools',
        subToolId: 'pdf-to-text',
        badge: 'WASM OCR',
      },
    ],
    matrixHeading: 'PDF Suite Specifications & Processing Limits',
    matrixRows: [
      {
        name: 'Merge PDF',
        format: 'PDF (.pdf)',
        primaryUse: 'Combine multiple document files into one master PDF',
        processingEngine: 'PDF-Lib WebAssembly Engine',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'Compress PDF',
        format: 'PDF (.pdf)',
        primaryUse: 'Downsample raster assets to reduce file weight',
        processingEngine: 'Stream Optimizer & Canvas Resampler',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'Split PDF',
        format: 'PDF (.pdf)',
        primaryUse: 'Extract specific pages or page ranges',
        processingEngine: 'PDF-Lib Binary Slicer',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'Rotate PDF',
        format: 'PDF (.pdf)',
        primaryUse: 'Correct page orientation permanently',
        processingEngine: 'Dictionary /Rotate Transform',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'PDF to Image',
        format: 'Output: JPG, PNG',
        primaryUse: 'Render pages as standalone graphic files',
        processingEngine: 'PDF.js HTML5 Canvas Renderer',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'PDF to Word',
        format: 'Output: DOCX',
        primaryUse: 'Client-side text and layout extraction into Word',
        processingEngine: 'DOM Layout Parser & Docx Engine',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
    ],
    faqsHeading: 'Frequently Asked Questions: PDF Utilities',
    faqs: [
      {
        question: 'How does FileWala merge and manipulate PDFs without sending them to a server?',
        answer: 'FileWala uses client-compiled pdf-lib and WebAssembly document parsers that run in the local JavaScript runtime. Document cross-reference tables, object streams, and embedded fonts are manipulated directly inside browser memory, ensuring your legal agreements and financial statements never travel across the internet.',
      },
      {
        question: 'What is the maximum PDF file size or page count I can process?',
        answer: 'Because processing happens in your device RAM, there is no arbitrary artificial upload limit. Standard modern devices can easily merge, split, or compress multi-hundred-page documents up to 250 MB–500 MB without performance issues or server queue delays.',
      },
      {
        question: 'How does in-browser PDF compression work without corrupting vector text?',
        answer: 'FileWala’s PDF compressor inspects the internal PDF object tree, downsampling embedded raster photographs while preserving raw vector curves, font glyphs, and searchable text layers. Text remains crisp and printable even at high compression ratios.',
      },
      {
        question: 'Can I convert scanned PDF documents to editable text or Word?',
        answer: 'Yes. FileWala includes client-side Tesseract.js optical character recognition (OCR) and DOCX generation engines that parse embedded document layouts directly in browser memory without sending private scans to external cloud APIs.',
      },
      {
        question: 'Does FileWala add watermarks, logos, or restrictions to exported PDFs?',
        answer: 'Never. All PDF tools are 100% free with no watermarks, no trial periods, no page caps, and no user registration required.',
      },
    ],
  },

  'convert': {
    id: 'convert',
    badge: 'Client-Side Codec Transcoder',
    heading: 'Fast Client-Side Format Converters — HEIC, WebP, PNG & JPG',
    subheading: 'Convert photos and graphics between Apple HEIC, modern WebP, lossless PNG, universal JPG, and AVIF formats directly in your browser.',
    overviewHeading: 'Technical Architecture: In-Memory Codec Transcoding',
    overviewParagraphs: [
      'FileWala format converters leverage compiled WebAssembly decoders (including `libheif` / `libde265` for Apple HEIC/HEIF) and native browser media codecs to transcode image files on your local machine. No external converter API or cloud server is involved in the conversion process.',
      'When converting iPhone camera photos (HEIC) to universal JPEG, the compressed HEVC bitstream is decoded into an uncompressed RGBA pixel buffer inside browser RAM. The buffer is immediately rendered onto a high-fidelity HTML5 Canvas and re-encoded into baseline JPEG or PNG with configurable quality settings.',
      'Similarly, converting raster graphics to modern WebP or AVIF formats enables dramatic Core Web Vitals and PageSpeed optimizations while keeping full control of transparency channels and color profiles. Conversions complete in fractions of a second with zero network bandwidth consumed.'
    ],
    architecturePoints: [
      {
        title: 'WASM Libheif / Libde265',
        desc: 'Decodes Apple iOS HEIC/HEIF live camera photos directly on Windows, Linux, and Android browsers.'
      },
      {
        title: 'Lossless Alpha Compositing',
        desc: 'Smart white background fill prevents black background visual defects when converting transparent PNGs to JPG.'
      },
      {
        title: 'Instant Local Conversion',
        desc: 'Files are processed at memory bus speeds with zero upload latency, no data caps, and zero cloud hosting costs.'
      },
      {
        title: 'WebP & AVIF Web Optimization',
        desc: 'Shrinks website image payloads by 30%–50% to improve SEO rankings and Google PageSpeed Insights.'
      }
    ],
    workflowsHeading: 'Popular Image Format Conversion Workflows',
    workflows: [
      {
        title: 'HEIC to JPG (iPhone Photos)',
        description: 'Convert Apple iPhone HEIC and HEIF photos into universally viewable JPG images for Windows, Android, and online portals.',
        slug: '/heic-to-jpg',
        actionSection: 'convert',
        subToolId: 'heic-to-jpg',
        badge: 'Most Popular',
        popular: true,
      },
      {
        title: 'PNG to WebP Converter',
        description: 'Convert heavy PNG graphics into lightweight Google WebP images while preserving 100% transparent alpha channels.',
        slug: '/png-to-webp',
        actionSection: 'convert',
        subToolId: 'png-to-webp',
        badge: 'SEO Boost',
        popular: true,
      },
      {
        title: 'WebP to JPG Converter',
        description: 'Convert downloaded WebP graphics into standard baseline JPEG with automatic white background fill for government forms.',
        slug: '/webp-to-jpg',
        actionSection: 'convert',
        subToolId: 'webp-to-jpg',
      },
      {
        title: 'JPG to PNG Converter',
        description: 'Convert JPEG photos to lossless raster PNG format to stop generational compression artifacts during graphic editing.',
        slug: '/jpg-to-png',
        actionSection: 'convert',
        subToolId: 'jpg-to-png',
      },
      {
        title: 'PNG to JPG Converter',
        description: 'Convert screenshots and raster PNGs to lightweight JPG with clean white background compositing.',
        slug: '/png-to-jpg',
        actionSection: 'convert',
        subToolId: 'png-to-jpg',
      },
      {
        title: 'AVIF to JPG Converter',
        description: 'Transcode next-generation AVIF images into standard JPEG for legacy software and printer compatibility.',
        slug: '/avif-to-jpg',
        actionSection: 'convert',
        subToolId: 'avif-to-jpg',
      },
      {
        title: 'SVG to PNG Converter',
        description: 'Render scalable vector graphics (SVG) into crisp, high-resolution PNG bitmap images with custom pixel scaling.',
        slug: '/svg-to-png',
        actionSection: 'convert',
        subToolId: 'svg-to-png',
      },
    ],
    matrixHeading: 'Format Compatibility & Codec Matrix',
    matrixRows: [
      {
        name: 'HEIC to JPG',
        format: 'Input: HEIC/HEIF → Output: JPG',
        primaryUse: 'Make iPhone photos viewable on Windows & Android',
        processingEngine: 'libheif / libde265 WebAssembly Decoder',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'PNG to WebP',
        format: 'Input: PNG → Output: WebP',
        primaryUse: 'Reduce web asset size with alpha transparency',
        processingEngine: 'Native Browser WebP Codec',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'WebP to JPG',
        format: 'Input: WebP → Output: JPG',
        primaryUse: 'Universal compatibility for portals & office tools',
        processingEngine: 'Canvas 2D White Background Compositor',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'JPG to PNG',
        format: 'Input: JPG → Output: PNG',
        primaryUse: 'Prevent generational loss during re-saving',
        processingEngine: 'Lossless PNG Encoder',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'AVIF to JPG',
        format: 'Input: AVIF → Output: JPG',
        primaryUse: 'Convert next-gen web files to standard JPEG',
        processingEngine: 'Native Browser AVIF Decoder & Canvas',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
      {
        name: 'SVG to PNG',
        format: 'Input: SVG → Output: PNG',
        primaryUse: 'Rasterize scalable vectors at arbitrary resolutions',
        processingEngine: 'Vector XML Parser & Canvas Context',
        privacyGuarantee: '100% In-Browser RAM (Zero Uploads)',
      },
    ],
    faqsHeading: 'Frequently Asked Questions: Format Conversion',
    faqs: [
      {
        question: 'How does FileWala convert Apple iPhone HEIC photos to JPG on Windows or Android?',
        answer: 'FileWala utilizes a WebAssembly build of libheif / libde265 to decode Apple’s proprietary High Efficiency Image Coding (HEIC) format client-side. The decoded raw frame buffer is then rendered to an HTML5 canvas and exported as a standard baseline JPEG compatible with every operating system.',
      },
      {
        question: 'Is there any file size or conversion quota limit for format conversions?',
        answer: 'No. Since FileWala does not incur expensive cloud server GPU/CPU transcoding costs, there are no daily conversion limits, paywalls, or file quotas. You can convert as many files as your device hardware permits.',
      },
      {
        question: 'Which is better for website performance: WebP, AVIF, or JPG?',
        answer: 'WebP and AVIF provide superior compression over legacy JPEG, typically delivering 25% to 50% smaller file sizes at identical visual fidelity. FileWala lets you convert PNG or JPG assets into WebP/AVIF to boost Google PageSpeed and Core Web Vitals scores.',
      },
      {
        question: 'Does converting a PNG to JPG preserve background transparency?',
        answer: 'The JPEG format specification does not support alpha transparency channels. When converting transparent PNG or WebP files to JPG, FileWala automatically composites the graphic against a clean, neutral white background to prevent black background artifacts.',
      },
      {
        question: 'Are my uploaded graphics or converted files sent to any remote converter server?',
        answer: 'No. Every format conversion—including HEIC, WebP, AVIF, SVG, PNG, and JPG—executes 100% locally on your machine using browser WebAssembly decoders. No image data is ever transmitted across the network.',
      },
    ],
  },
};
