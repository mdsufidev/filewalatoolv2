import fs from 'node:fs';
import path from 'node:path';
import { PDF_TOOLS_CONTENT } from '../src/core/pdfToolsContent';

const distDir = path.resolve(process.cwd(), 'dist');
const routes = [
  { route: '/merge-pdf', toolId: 'merge-pdf', expectedH1: 'Merge PDF Files' },
  { route: '/compress-pdf', toolId: 'compress-pdf', expectedH1: 'Compress PDF Files' },
  { route: '/split-pdf', toolId: 'split-pdf', expectedH1: 'Split PDF & Extract Pages' },
  { route: '/rotate-pdf', toolId: 'rotate-pdf', expectedH1: 'Rotate PDF Pages' },
  { route: '/pdf-to-image', toolId: 'pdf-to-image', expectedH1: 'PDF to Image Converter' },
  { route: '/image-to-pdf', toolId: 'image-to-pdf', expectedH1: 'Image to PDF Converter' },
  { route: '/pdf-to-word', toolId: 'pdf-to-word', expectedH1: 'Convert PDF to Word' },
  { route: '/pdf-to-text', toolId: 'pdf-to-text', expectedH1: 'PDF to Searchable Text (OCR)' },
];

interface AuditResult {
  route: string;
  fileSizeBytes: number;
  rootChars: number;
  wordCount: number;
  h1: string;
  h1Count: number;
  title: string;
  canonical: string;
  detailsCount: number;
  allQuestionsInDom: boolean;
  allAnswersInDom: boolean;
  domQuestionsCount: number;
  domAnswersCount: number;
  jsonLdFaqCount: number;
  schemaParity: boolean;
  issues: string[];
}

const auditResults: AuditResult[] = [];

for (const { route, toolId, expectedH1 } of routes) {
  const cleanSlug = route.replace(/^\//, '');
  const filePath = path.resolve(distDir, cleanSlug, 'index.html');
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const sizeBytes = fs.statSync(filePath).size;
  const issues: string[] = [];

  // Title
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Canonical
  const canMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i);
  const canonical = canMatch ? canMatch[1].trim() : '';
  const expectedCanonical = `https://www.filewalatool.com${route}`;
  if (canonical !== expectedCanonical) {
    issues.push(`Canonical mismatch: got "${canonical}", expected "${expectedCanonical}"`);
  }

  // H1
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1Count = h1Matches.length;
  const h1 = h1Matches
    .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim())
    .join(' | ');
  if (h1Count !== 1) {
    issues.push(`Expected 1 H1, found ${h1Count}`);
  }
  if (!h1.toLowerCase().includes(expectedH1.toLowerCase())) {
    issues.push(`H1 "${h1}" does not match expected "${expectedH1}"`);
  }

  // Root Content and Word Count
  const rootStart = html.indexOf('<div id="root">');
  const rootEnd = html.lastIndexOf('</div>');
  const rootChars = rootStart !== -1 ? html.slice(rootStart + 15, rootEnd).length : 0;

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
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

  // HTML without script tags (pure DOM), with HTML entities decoded
  const domOnlyHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  const decodedDomHtml = domOnlyHtml
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

  // Details count in pure DOM
  const detailsMatches = [...domOnlyHtml.matchAll(/<details[\s\S]*?<\/details>/gi)];
  const detailsCount = detailsMatches.length;

  // Expected FAQs from content file
  const expectedFaqs = PDF_TOOLS_CONTENT[toolId]?.faqs || [];

  let domQuestionsCount = 0;
  let domAnswersCount = 0;

  for (const f of expectedFaqs) {
    if (decodedDomHtml.includes(f.question)) {
      domQuestionsCount++;
    } else {
      issues.push(`Missing DOM Question: "${f.question.slice(0, 35)}..."`);
    }

    if (decodedDomHtml.includes(f.answer)) {
      domAnswersCount++;
    } else {
      issues.push(`Missing DOM Answer: "${f.answer.slice(0, 35)}..."`);
    }
  }

  // JSON-LD FAQs
  let jsonLdFaqCount = 0;
  let schemaParity = true;
  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      const graph = parsed['@graph'] || [parsed];
      const faqEntity = graph.find((e: any) => e['@type'] === 'FAQPage');
      if (faqEntity && Array.isArray(faqEntity.mainEntity)) {
        jsonLdFaqCount = faqEntity.mainEntity.length;
        if (jsonLdFaqCount !== expectedFaqs.length) {
          schemaParity = false;
          issues.push(`JSON-LD FAQ count (${jsonLdFaqCount}) does not match expected (${expectedFaqs.length})`);
        }
        for (let i = 0; i < expectedFaqs.length; i++) {
          const expected = expectedFaqs[i];
          const actualSchema = faqEntity.mainEntity[i];
          if (!actualSchema) {
            schemaParity = false;
            issues.push(`Missing schema entity at index ${i}`);
          } else {
            if (actualSchema.name !== expected.question) {
              schemaParity = false;
              issues.push(`Schema Question mismatch at index ${i}`);
            }
            if (actualSchema.acceptedAnswer?.text !== expected.answer) {
              schemaParity = false;
              issues.push(`Schema Answer mismatch at index ${i}`);
            }
          }
        }
      } else {
        schemaParity = false;
        issues.push('FAQPage entity not found in JSON-LD');
      }
    } catch (e: any) {
      schemaParity = false;
      issues.push(`JSON-LD parse error: ${e.message}`);
    }
  } else {
    schemaParity = false;
    issues.push('No JSON-LD script found');
  }

  auditResults.push({
    route,
    fileSizeBytes: sizeBytes,
    rootChars,
    wordCount,
    h1,
    h1Count,
    title,
    canonical,
    detailsCount,
    allQuestionsInDom: domQuestionsCount === 5,
    allAnswersInDom: domAnswersCount === 5,
    domQuestionsCount,
    domAnswersCount,
    jsonLdFaqCount,
    schemaParity,
    issues,
  });
}

console.log(JSON.stringify(auditResults, null, 2));
