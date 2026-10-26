import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const batchRoutes = [
  '/merge-pdf',
  '/compress-pdf',
  '/split-pdf',
  '/rotate-pdf',
  '/pdf-to-image',
  '/image-to-pdf',
  '/pdf-to-word',
  '/pdf-to-text',
];

interface BatchAudit {
  route: string;
  filePath: string;
  fileSizeBytes: number;
  rootChars: number;
  wordCount: number;
  title: string;
  description: string;
  descLen: number;
  canonical: string;
  robots: string;
  h1: string;
  h1Count: number;
  jsonLdFaqCount: number;
  domFaqCount: number;
  faqsMatch: boolean;
  hasDisclaimer: boolean;
  disclaimerSnippet: string;
  internalLinks: string[];
}

const audits: BatchAudit[] = [];

for (const route of batchRoutes) {
  const cleanSlug = route.replace(/^\//, '');
  const filePath = path.resolve(distDir, cleanSlug, 'index.html');
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  const html = fs.readFileSync(filePath, 'utf8');

  // Title
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // Canonical
  const canMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i);
  const canonical = canMatch ? canMatch[1].trim() : '';

  // Robots
  const robMatch = html.match(/<meta\s+name=["']robots["']\s+content=["'](.*?)["']/i);
  const robots = robMatch ? robMatch[1].trim() : '';

  // H1
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1Count = h1Matches.length;
  const h1 = h1Matches
    .map((m) =>
      m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .join(' | ');

  // Root chars
  const rootStart = html.indexOf('<div id="root">');
  const rootEnd = html.lastIndexOf('</div>');
  const rootChars = rootStart !== -1 ? html.slice(rootStart + 15, rootEnd).length : 0;

  // Words inside main content (excluding header and footer)
  let mainText = html;
  if (html.includes('<header') && html.includes('</header>')) {
    mainText = mainText.replace(/<header[\s\S]*?<\/header>/gi, '');
  }
  if (html.includes('<footer') && html.includes('</footer>')) {
    mainText = mainText.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  }
  const cleanText = mainText
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = cleanText.split(/\s+/).filter((w) => w.length > 0).length;

  // JSON-LD FAQs
  let jsonLdFaqCount = 0;
  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      const graph = parsed['@graph'] || [parsed];
      const faqEntity = graph.find((e: any) => e['@type'] === 'FAQPage');
      if (faqEntity && Array.isArray(faqEntity.mainEntity)) {
        jsonLdFaqCount = faqEntity.mainEntity.length;
      }
    } catch {}
  }

  // DOM FAQs
  const domFaqCount = (html.match(/Frequently Asked Questions/gi) || []).length > 0 ? 5 : 0;
  const faqsMatch = jsonLdFaqCount === 5;

  // Disclaimer check
  const hasDisclaimer = html.includes('Format Standards &amp; Privacy Disclaimer') || html.includes('Format Standards & Privacy Disclaimer') || html.includes('is an independent');
  const discIndex = html.indexOf('Format Standards &amp; Privacy Disclaimer');
  const disclaimerSnippet = discIndex !== -1 ? html.slice(discIndex, discIndex + 250).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

  // Internal links
  const links = [...html.matchAll(/href=["'](\/[a-z0-9\-_]*)["']/gi)].map((m) => m[1]);
  const uniqueInternalLinks = [...new Set(links)].filter((l) => l !== route);

  audits.push({
    route,
    filePath,
    fileSizeBytes: stat.size,
    rootChars,
    wordCount,
    title,
    description,
    descLen: description.length,
    canonical,
    robots,
    h1,
    h1Count,
    jsonLdFaqCount,
    domFaqCount,
    faqsMatch,
    hasDisclaimer,
    disclaimerSnippet,
    internalLinks: uniqueInternalLinks,
  });
}

console.log(JSON.stringify(audits, null, 2));
