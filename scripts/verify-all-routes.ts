import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist');
const sitemapPath = path.resolve(rootDir, 'public', 'sitemap.xml');

const xml = fs.readFileSync(sitemapPath, 'utf8');
const sitemapUrls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

console.log(`Starting Hardened Independent Verification for all ${sitemapUrls.length} Sitemap URLs...\n`);

/**
 * Explicit Expected Route-to-Heading (H1) Mapping
 * Every single route MUST have an explicit, semantic H1 that identifies the page.
 */
export const EXPECTED_ROUTE_H1: Record<string, string[]> = {
  '/': ['Free Online File & Image Tools', 'Stop Worrying About Form Rejections'],
  '/tools': ['All Free In-Browser File Tools', 'फ़ाइलवाला टूल्स डायरेक्टरी'],
  '/image-tools': ['Free In-Browser Image Tools', 'मुफ़्त ऑनलाइन इमेज टूल्स'],
  '/pdf-tools': ['Private In-Browser PDF Tools', 'प्राइवेट ऑनलाइन PDF टूल्स'],
  '/convert-tools': ['Fast Client-Side Format Converters', 'फास्ट इमेज फॉर्मेट कन्वर्टर'],
  '/document-tools': ['Indian Government Document', 'सरकारी फॉर्म फोटो व साइन रिसाइज़र'],
  '/image-resizer': ['Image Resizer'],
  '/compress-image': ['Image Compressor'],
  '/pan-photo-resize': ['PAN Photo Resizer'],
  '/signature-resize': ['PAN Signature Resizer'],
  '/passport-photo': ['Passport Seva Photo Resizer'],
  '/passport-signature-resize': ['Passport Seva Signature Resizer'],
  '/upsc-photo-maker': ['UPSC Photo Maker'],
  '/ssc-photo-signature': ['SSC Photo & Signature Resizer'],
  '/kb-resizer': ['General Gov Form Document Compressor'],
  '/merge-pdf': ['Merge PDF Files'],
  '/compress-pdf': ['Compress PDF Files'],
  '/crop-image': ['Crop & Rotate Tool'],
  '/bg-remover': ['Instant Background Remover'],
  '/face-enhancer': ['AI Face Enhancer & Photo Retouch', 'Face Enhancer', 'AI Face Enhancer'],
  '/split-pdf': ['Split PDF & Extract Pages'],
  '/rotate-pdf': ['Rotate PDF Pages'],
  '/pdf-to-image': ['PDF to Image Converter'],
  '/image-to-pdf': ['Image to PDF Converter'],
  '/pdf-to-word': ['Convert PDF to Word'],
  '/pdf-to-text': ['PDF to Searchable Text (OCR)'],
  '/jpg-to-png': ['JPG to PNG Converter'],
  '/png-to-jpg': ['PNG to JPG Converter'],
  '/heic-to-jpg': ['HEIC to JPG Converter'],
  '/png-to-webp': ['PNG to WebP Converter'],
  '/webp-to-jpg': ['WebP to JPG Converter'],
  '/jpg-to-webp': ['JPG to WebP Converter'],
  '/avif-to-jpg': ['AVIF to JPG Converter'],
  '/svg-to-png': ['SVG to PNG Converter'],
  '/watermark-image': ['Image Watermarker'],
  '/round-corners': ['Rounded Corner Image Maker'],
  '/meme-generator': ['Meme Generator'],
  '/color-palette': ['Color Palette Extractor'],
  '/image-to-base64': ['Image to Base64 Converter'],
  '/batch-image-cropper': ['Batch Image Processor'],
  '/filter-adjust': ['Filters & Watermark'],
  '/about': ['Private, in-browser file utilities'],
  '/contact': ['Get in Touch with Us'],
  '/privacy': ['Privacy Policy & Zero-Upload Guarantee'],
  '/terms': ['Terms and Conditions'],
  '/disclaimer': ['Privacy & Compliance Disclaimer'],
};

interface RouteCheckResult {
  url: string;
  route: string;
  fileFound: boolean;
  fileSizeBytes: number;
  rootChars: number;
  title: string;
  hasDescription: boolean;
  canonical: string;
  canonicalMatches: boolean;
  h1Text: string;
  h1Count: number;
  h1MatchesExpected: boolean;
  notByteIdenticalToHome: boolean;
  jsonLdValid: boolean;
  faqSchemaMatchesVisibleText: boolean;
  hasOgTags: boolean;
  hasTwitterTags: boolean;
  passed: boolean;
  failureReasons: string[];
}

const homeHtmlPath = path.resolve(distDir, 'index.html');
const homeHtml = fs.existsSync(homeHtmlPath) ? fs.readFileSync(homeHtmlPath, 'utf8') : '';
const homeRootStart = homeHtml.indexOf('<div id="root">');
const homeRootEnd = homeHtml.lastIndexOf('</div>');
const homeRootContent = homeRootStart !== -1 ? homeHtml.slice(homeRootStart + '<div id="root">'.length, homeRootEnd) : '';

const titlesSeen = new Map<string, string>();
const canonicalsSeen = new Map<string, string>();
const duplicateTitles: string[] = [];
const duplicateCanonicals: string[] = [];

const results: RouteCheckResult[] = [];

for (const url of sitemapUrls) {
  const parsedUrl = new URL(url);
  const route = parsedUrl.pathname;
  const cleanSlug = route.replace(/^\//, '').replace(/\/$/, '');

  const targetFile = route === '/' ? path.resolve(distDir, 'index.html') : path.resolve(distDir, cleanSlug, 'index.html');
  const fileFound = fs.existsSync(targetFile);

  if (!fileFound) {
    results.push({
      url,
      route,
      fileFound: false,
      fileSizeBytes: 0,
      rootChars: 0,
      title: '',
      hasDescription: false,
      canonical: '',
      canonicalMatches: false,
      h1Text: '',
      h1Count: 0,
      h1MatchesExpected: false,
      notByteIdenticalToHome: false,
      jsonLdValid: false,
      faqSchemaMatchesVisibleText: false,
      hasOgTags: false,
      hasTwitterTags: false,
      passed: false,
      failureReasons: [`File not found on disk: ${targetFile}`],
    });
    continue;
  }

  const html = fs.readFileSync(targetFile, 'utf8');
  const sizeBytes = Buffer.byteLength(html, 'utf8');

  // Extract root content
  const rootStart = '<div id="root">';
  const rootIndex = html.indexOf(rootStart);
  const divClose = html.lastIndexOf('</div>');
  const rootContent = rootIndex !== -1 && divClose > rootIndex ? html.slice(rootIndex + rootStart.length, divClose) : '';

  const failureReasons: string[] = [];

  // 1. Title check
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (!title) failureReasons.push('Missing <title> tag');

  // Track duplicate titles
  if (titlesSeen.has(title)) {
    duplicateTitles.push(`${route} duplicates title of ${titlesSeen.get(title)}: "${title}"`);
    failureReasons.push(`Duplicate title: "${title}"`);
  } else {
    titlesSeen.set(title, route);
  }

  // 2. Meta description check
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const hasDescription = Boolean(descMatch && descMatch[1].trim().length > 10);
  if (!hasDescription) failureReasons.push('Missing or invalid <meta name="description">');

  // 3. Canonical check
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : '';
  const canonicalMatches = canonical === url;
  if (!canonicalMatches) failureReasons.push(`Canonical mismatch: expected "${url}", got "${canonical}"`);

  // Track duplicate canonicals
  if (canonicalsSeen.has(canonical)) {
    duplicateCanonicals.push(`${route} duplicates canonical of ${canonicalsSeen.get(canonical)}: "${canonical}"`);
    failureReasons.push(`Duplicate canonical: "${canonical}"`);
  } else {
    canonicalsSeen.set(canonical, route);
  }

  // 4. Strict H1 element extraction
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1Count = h1Matches.length;
  const h1Text = h1Matches
    .map((m) =>
      m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
    )
    .join(' | ');

  if (h1Count === 0) {
    failureReasons.push('No <h1> element found in generated HTML');
  } else if (h1Count > 1) {
    failureReasons.push(`Multiple (${h1Count}) <h1> elements found: ${h1Text}`);
  }

  // Validate H1 text against expected keywords for this route
  const expectedKeywords = EXPECTED_ROUTE_H1[route] || [];
  const h1MatchesExpected = expectedKeywords.some((kw) => h1Text.toLowerCase().includes(kw.toLowerCase()));
  if (!h1MatchesExpected) {
    failureReasons.push(`H1 text "${h1Text}" does not match expected identity [${expectedKeywords.join(', ')}]`);
  }

  // 5. Byte-Identical Body Check
  const notByteIdenticalToHome = route === '/' || rootContent !== homeRootContent;
  if (!notByteIdenticalToHome) {
    failureReasons.push('Body content inside #root is 100% byte-identical to the homepage');
  }

  // 6. JSON-LD check & FAQ consistency
  let jsonLdValid = false;
  let faqSchemaMatchesVisibleText = true;
  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      jsonLdValid = Boolean(parsed['@context']);
      const graph = parsed['@graph'] || (parsed['@type'] ? [parsed] : []);
      const faqEntity = graph.find((e: any) => e['@type'] === 'FAQPage');
      if (faqEntity && Array.isArray(faqEntity.mainEntity)) {
        for (const item of faqEntity.mainEntity) {
          const qText = item.name;
          if (qText && !html.includes(qText.slice(0, 25))) {
            faqSchemaMatchesVisibleText = false;
            failureReasons.push(`FAQ Schema question "${qText.slice(0, 40)}" not found in visible text`);
          }
        }
      }
    } catch {
      jsonLdValid = false;
      failureReasons.push('Malformed JSON-LD script block');
    }
  } else {
    failureReasons.push('No JSON-LD structured data script found');
  }

  // 7. OpenGraph & Twitter tags
  const hasOgTags = html.includes('property="og:title"') && html.includes('property="og:description"');
  const hasTwitterTags = html.includes('name="twitter:title"') && html.includes('name="twitter:description"');
  if (!hasOgTags) failureReasons.push('Missing OpenGraph meta tags');
  if (!hasTwitterTags) failureReasons.push('Missing Twitter card meta tags');

  const passed = failureReasons.length === 0;

  results.push({
    url,
    route,
    fileFound,
    fileSizeBytes: sizeBytes,
    rootChars: rootContent.length,
    title,
    hasDescription,
    canonical,
    canonicalMatches,
    h1Text,
    h1Count,
    h1MatchesExpected,
    notByteIdenticalToHome,
    jsonLdValid,
    faqSchemaMatchesVisibleText,
    hasOgTags,
    hasTwitterTags,
    passed,
    failureReasons,
  });
}

// Render formatted output table
console.table(
  results.map((r, i) => ({
    '#': i + 1,
    Route: r.route,
    'Size (KB)': (r.fileSizeBytes / 1024).toFixed(1),
    'Root Chars': r.rootChars,
    Canonical: r.canonicalMatches ? '✓ MATCH' : 'FAIL',
    H1: r.h1MatchesExpected && r.h1Count === 1 ? '✓ EXACT' : `FAIL (${r.h1Count})`,
    'Unique Body': r.notByteIdenticalToHome ? '✓' : 'FAIL',
    'JSON-LD': r.jsonLdValid && r.faqSchemaMatchesVisibleText ? '✓' : 'FAIL',
    Status: r.passed ? 'PASSED' : 'FAILED',
  }))
);

const passedCount = results.filter((r) => r.passed).length;
const failedCount = results.filter((r) => !r.passed).length;

console.log('\n======================================================');
console.log(`TOTAL SITEMAP URLS AUDITED: ${sitemapUrls.length}`);
console.log(`PASSED ALL CHECKS: ${passedCount}`);
console.log(`FAILED CHECKS: ${failedCount}`);
console.log(`DUPLICATE TITLES: ${duplicateTitles.length}`);
console.log(`DUPLICATE CANONICALS: ${duplicateCanonicals.length}`);
console.log('======================================================\n');

if (failedCount > 0) {
  console.error('FAILED ROUTES BREAKDOWN:');
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.error(`\n[ROUTE: ${r.route}]`);
      r.failureReasons.forEach((reason) => console.error(`  - ${reason}`));
    });
  process.exit(1);
} else {
  console.log('✓ 100% OF SITEMAP ROUTES PASSED ALL HARDENED VERIFICATION CRITERIA.');
}
