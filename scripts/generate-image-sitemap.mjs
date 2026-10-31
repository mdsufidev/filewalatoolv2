import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.resolve(rootDir, 'public');
const distDir = path.resolve(rootDir, 'dist');
const sitemapPath = path.resolve(publicDir, 'sitemap.xml');

const BASE_URL = 'https://www.filewalatool.com';

// Read all routes from main sitemap.xml
const xmlContent = fs.readFileSync(sitemapPath, 'utf8');
const urls = [...xmlContent.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

// Route-specific metadata mapping for image SEO
const ROUTE_IMAGE_MAP = {
  '/': {
    title: 'FileWala Tool - Indian Government Document & Photo Resizer Suite',
    caption: '100% In-Browser Privacy-First Document, Photo & Signature Resizer Suite for Indian Government & Exam Portals',
    images: ['og-image.png', 'logo.png', 'founder-muhammad-sufiyan.webp', 'app-illustration.png']
  },
  '/compress-image': {
    title: 'Image Compressor to KB (100KB, 200KB, 50KB)',
    caption: 'Compress JPG, PNG, and WebP images to exact target KB size online for free with zero quality loss',
    images: ['image-compress-to-kb.png', 'og-image.png', 'logo.png']
  },
  '/kb-resizer': {
    title: 'General Government Form Document & Photo Compressor',
    caption: 'Compress documents and photos to exact KB targets (20KB, 50KB, 100KB, 200KB) for government job applications',
    images: ['image-compress-to-kb.png', 'og-image.png', 'logo.png']
  },
  '/pan-photo-resize': {
    title: 'PAN Card Photo Resizer (213x213 px, 200 DPI, under 50 KB)',
    caption: 'NSDL Protean and UTIITSL compliant PAN card photo crop and compressor tool',
    images: ['og-image.png', 'logo.png']
  },
  '/signature-resize': {
    title: 'PAN Card Signature Resizer (354x157 px, 200 DPI, under 50 KB)',
    caption: 'NSDL Protean and UTIITSL compliant signature dimensions and file weight formatting',
    images: ['og-image.png', 'logo.png']
  },
  '/passport-photo': {
    title: 'Passport Seva Photo Resizer (35x45 mm / 350x450 px under 200 KB)',
    caption: 'Official Ministry of External Affairs (MEA) standard passport photograph resizer and background checker',
    images: ['og-image.png', 'logo.png']
  },
  '/passport-signature-resize': {
    title: 'Passport Seva Signature Resizer (400x200 px under 200 KB)',
    caption: 'Clean ink contrast and official dimension preset for Indian Passport Seva portal upload',
    images: ['og-image.png', 'logo.png']
  },
  '/upsc-photo-maker': {
    title: 'UPSC Photo Maker with Candidate Name and Date of Photo (DOP) Stamp',
    caption: 'Official UPSC Civil Services IAS/NDA/CDS photo format with mandatory legible name and date stamp',
    images: ['og-image.png', 'logo.png']
  },
  '/ssc-photo-signature': {
    title: 'SSC Photo and Signature Resizer (CGL, CHSL, MTS, GD)',
    caption: 'Staff Selection Commission portal compliant photo (20-50 KB) and signature (10-20 KB) tool',
    images: ['og-image.png', 'logo.png']
  },
  '/about': {
    title: 'About FileWala Tool & Founder Mohammad Sufiyan',
    caption: 'Handcrafted by Mohammad Sufiyan in Kushinagar, UP. 100% Client-Side Privacy Architecture',
    images: ['founder-muhammad-sufiyan.webp', 'logo.png', 'og-image.png']
  },
  '/merge-pdf': {
    title: 'Merge PDF Files Online In-Browser',
    caption: 'Combine multiple PDF files into a single document with zero server upload',
    images: ['og-image.png', 'logo.png']
  },
  '/compress-pdf': {
    title: 'Compress PDF Documents Under 100KB, 200KB, 500KB',
    caption: 'High-ratio vector and text preservation PDF compressor for government uploads',
    images: ['og-image.png', 'logo.png']
  },
  '/split-pdf': {
    title: 'Split PDF & Extract Pages Online',
    caption: 'Isolate individual pages or page ranges from PDF documents locally in browser RAM',
    images: ['og-image.png', 'logo.png']
  },
  '/rotate-pdf': {
    title: 'Rotate PDF Pages (90, 180, 270 Degrees)',
    caption: 'Permanently reorient rotated document scans and save instantly',
    images: ['og-image.png', 'logo.png']
  },
  '/pdf-to-image': {
    title: 'PDF to Image Converter (High-Resolution JPG / PNG)',
    caption: 'Convert PDF pages into clear, high-DPI images client-side',
    images: ['og-image.png', 'logo.png']
  },
  '/image-to-pdf': {
    title: 'Image to PDF Converter',
    caption: 'Combine photos, marksheet scans, and ID cards into a single clean PDF file',
    images: ['og-image.png', 'logo.png']
  },
  '/pdf-to-word': {
    title: 'Convert PDF to Word (DOCX)',
    caption: 'Extract text and layout from PDF into editable Microsoft Word documents',
    images: ['og-image.png', 'logo.png']
  },
  '/pdf-to-text': {
    title: 'PDF to Searchable Text (In-Browser OCR)',
    caption: 'Optical character recognition running 100% in local memory via WebAssembly',
    images: ['og-image.png', 'logo.png']
  },
  '/bg-remover': {
    title: 'AI Background Remover Tool',
    caption: 'Remove image background and isolate subject with instant cutout preview',
    images: ['og-image.png', 'logo.png']
  },
  '/face-enhancer': {
    title: 'AI Face Enhancer & Photo Retouch',
    caption: 'Restore facial clarity, contrast, and skin tone for passport and official photos',
    images: ['og-image.png', 'logo.png']
  },
  '/watermark-image': {
    title: 'Image Watermarker (Add Text or Logo)',
    caption: 'Protect intellectual property and photos with custom text or transparent logo stamps',
    images: ['og-image.png', 'logo.png']
  },
  '/tools': {
    title: 'All Free In-Browser File Tools Directory',
    caption: 'Complete catalog of 40+ client-side file compression, resizing, and conversion utilities',
    images: ['og-image.png', 'logo.png']
  },
  '/image-tools': {
    title: 'Free In-Browser Image Tools Suite',
    caption: 'Compress, resize, crop, filter, and convert images directly in your browser',
    images: ['image-compress-to-kb.png', 'og-image.png', 'logo.png']
  },
  '/pdf-tools': {
    title: 'Private In-Browser PDF Suite',
    caption: 'Merge, split, compress, rotate, and convert PDF documents locally',
    images: ['og-image.png', 'logo.png']
  },
  '/convert-tools': {
    title: 'Fast Client-Side Format Converters',
    caption: 'Convert between WebP, HEIC, JPG, PNG, AVIF, and SVG without uploading files',
    images: ['og-image.png', 'logo.png']
  },
  '/document-tools': {
    title: 'Indian Government Document Resizer Hub',
    caption: 'Compliant presets for PAN, Passport, UPSC, SSC, and state exam portals',
    images: ['og-image.png', 'logo.png']
  }
};

// Image details registry
const IMAGE_DETAILS = {
  'og-image.png': {
    loc: `${BASE_URL}/og-image.png`,
    title: 'FileWala Tool - Indian Government Document & Photo Resizer Suite',
    caption: '100% Client-Side In-Browser Document, Photo and Signature Resizer Suite'
  },
  'logo.png': {
    loc: `${BASE_URL}/logo.png`,
    title: 'FileWala Tool Official Brand Logo',
    caption: 'FileWala Tool Red Folder with Sunglasses Official Brand Logo'
  },
  'founder-muhammad-sufiyan.webp': {
    loc: `${BASE_URL}/founder-muhammad-sufiyan.webp`,
    title: 'Mohammad Sufiyan - Creator of FileWala Tool',
    caption: 'Mohammad Sufiyan (@mdsufidev), full-stack engineer and creator in Kushinagar, Uttar Pradesh'
  },
  'image-compress-to-kb.png': {
    loc: `${BASE_URL}/image-compress-to-kb.png`,
    title: 'Image Compress to KB Workflow Infographic',
    caption: 'Visual workflow showing 1MB photo compressed to 300KB with lossless visual fidelity'
  },
  'app-illustration.png': {
    loc: `${BASE_URL}/app-illustration.png`,
    title: 'FileWala Tool Application Architecture & Ambient Graphic',
    caption: 'Zero-Cloud Client-Side In-Browser Processing Diagram and Feature Suite'
  }
};

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// Generate image-sitemap.xml
let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<!-- Generated by FileWala Tool SEO Pipeline -->\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

for (const url of urls) {
  const route = url.replace(BASE_URL, '') || '/';
  const custom = ROUTE_IMAGE_MAP[route];

  const imageKeys = custom ? custom.images : ['og-image.png', 'logo.png'];
  const pageTitle = custom ? custom.title : `FileWala Tool - ${route.replace('/', '').replace(/-/g, ' ')}`;
  const pageCaption = custom ? custom.caption : `In-browser processing tool for ${route.replace('/', '')}`;

  xml += `  <url>\n`;
  xml += `    <loc>${escapeXml(url)}</loc>\n`;

  for (const imgKey of imageKeys) {
    const detail = IMAGE_DETAILS[imgKey];
    if (detail) {
      // Use image specific title, with custom page context if applicable
      const imgTitle = (imgKey === 'og-image.png' && custom?.title) 
        ? custom.title 
        : detail.title;
      const imgCaption = (imgKey === 'og-image.png' && custom?.caption) 
        ? custom.caption 
        : detail.caption;

      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(detail.loc)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(imgTitle)}</image:title>\n`;
      xml += `      <image:caption>${escapeXml(imgCaption)}</image:caption>\n`;
      xml += `    </image:image>\n`;
    }
  }

  xml += `  </url>\n`;
}

xml += `</urlset>\n`;

// Write to public/image-sitemap.xml
const publicOut = path.resolve(publicDir, 'image-sitemap.xml');
fs.writeFileSync(publicOut, xml, 'utf8');
console.log(`Generated ${publicOut} with ${urls.length} URL entries.`);

// Write to dist/image-sitemap.xml if dist exists
if (fs.existsSync(distDir)) {
  const distOut = path.resolve(distDir, 'image-sitemap.xml');
  fs.writeFileSync(distOut, xml, 'utf8');
  console.log(`Copied to ${distOut}.`);
}
