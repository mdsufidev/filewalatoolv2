import fs from 'fs';
import path from 'path';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'");
}

interface RouteAudit {
  slug: string;
  name: string;
  htmlPath: string;
  fileSizeBytes: number;
  wordCount: number;
  h1Text: string;
  h1Count: number;
  title: string;
  metaDesc: string;
  canonical: string;
  ssrFaqQuestions: string[];
  ssrFaqAnswers: string[];
  schemaTypes: string[];
  schemaFaqs: { q: string; a: string }[];
  faqParity: boolean;
  mismatches: string[];
  invalidInternalLinks: string[];
}

const BATCH4_ROUTES = [
  { slug: '/', name: 'Homepage' },
  { slug: '/tools', name: 'Tools Directory' },
  { slug: '/image-tools', name: 'Image Tools Hub' },
  { slug: '/pdf-tools', name: 'PDF Tools Hub' },
  { slug: '/convert-tools', name: 'Convert Tools Hub' },
  { slug: '/document-tools', name: 'Document Tools Hub' },
  { slug: '/desktop', name: 'Desktop Software' },
  { slug: '/about', name: 'About Page' },
  { slug: '/contact', name: 'Contact Page' },
  { slug: '/privacy', name: 'Privacy Policy' },
  { slug: '/terms', name: 'Terms of Use' },
  { slug: '/disclaimer', name: 'Disclaimer' },
];

const sitemapContent = fs.readFileSync('public/sitemap.xml', 'utf8');
const sitemapUrls = new Set([...sitemapContent.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace('https://www.filewalatool.com', '') || '/'));

const results: RouteAudit[] = [];

for (const r of BATCH4_ROUTES) {
  const filePath = r.slug === '/' 
    ? path.resolve('dist/index.html')
    : path.resolve('dist', r.slug.slice(1), 'index.html');

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const stats = fs.statSync(filePath);

  // Extract Title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';

  // Extract Meta Description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const metaDesc = metaMatch ? decodeHtmlEntities(metaMatch[1].trim()) : '';

  // Extract Canonical
  const canonMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i);
  const canonical = canonMatch ? canonMatch[1].trim() : '';

  // Extract H1
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1Count = h1Matches.length;
  const h1Text = h1Matches.map(m => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, '').trim())).join(' | ');

  // Extract Word Count of body
  const bodyHtml = html.replace(/<head[\s\S]*?<\/head>/i, '');
  const bodyText = decodeHtmlEntities(bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  const wordCount = bodyText.split(' ').filter(Boolean).length;

  // Extract Schema.org JSON-LD
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemaTypes: string[] = [];
  const schemaFaqs: { q: string; a: string }[] = [];

  for (const jm of jsonLdMatches) {
    try {
      const parsed = JSON.parse(jm[1]);
      const graph = parsed['@graph'] || (Array.isArray(parsed) ? parsed : [parsed]);
      for (const entity of graph) {
        if (entity['@type']) schemaTypes.push(entity['@type']);
        if (entity['@type'] === 'FAQPage' && Array.isArray(entity.mainEntity)) {
          for (const q of entity.mainEntity) {
            schemaFaqs.push({
              q: (q.name || '').trim(),
              a: (q.acceptedAnswer?.text || '').trim(),
            });
          }
        }
      }
    } catch (e) {
      // JSON parse error
    }
  }

  // Extract SSR FAQs outside script tags (from <details> elements)
  const ssrFaqQuestions: string[] = [];
  const ssrFaqAnswers: string[] = [];
  const detailsMatches = [...bodyHtml.matchAll(/<details[^>]*>([\s\S]*?)<\/details>/gi)];

  for (const dm of detailsMatches) {
    const detailsContent = dm[1];
    const summaryMatch = detailsContent.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    if (summaryMatch) {
      const qText = decodeHtmlEntities(summaryMatch[1].replace(/<[^>]+>/g, '').trim());
      // Remove summary to get answer body
      const remainingContent = detailsContent.replace(/<summary[\s\S]*?<\/summary>/i, '');
      const aText = decodeHtmlEntities(remainingContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      ssrFaqQuestions.push(qText);
      ssrFaqAnswers.push(aText);
    }
  }

  // Compare Schema FAQs with SSR text
  const mismatches: string[] = [];
  let faqParity = true;

  if (schemaFaqs.length > 0) {
    if (schemaFaqs.length !== ssrFaqQuestions.length) {
      faqParity = false;
      mismatches.push(`Schema FAQ count (${schemaFaqs.length}) != SSR details count (${ssrFaqQuestions.length})`);
    } else {
      for (let i = 0; i < schemaFaqs.length; i++) {
        const sFaq = schemaFaqs[i];
        const domQ = ssrFaqQuestions[i];
        const domA = ssrFaqAnswers[i];

        if (sFaq.q !== domQ) {
          faqParity = false;
          mismatches.push(`Q${i+1} mismatch: Schema="${sFaq.q}" vs DOM="${domQ}"`);
        }
        // Normalize whitespace for answer text
        const normSchemaA = sFaq.a.replace(/\s+/g, ' ').trim();
        const normDomA = domA.replace(/\s+/g, ' ').trim();
        if (normSchemaA !== normDomA) {
          faqParity = false;
          mismatches.push(`A${i+1} mismatch: Schema="${normSchemaA.slice(0, 30)}..." vs DOM="${normDomA.slice(0, 30)}..."`);
        }
      }
    }
  }

  // Check internal <a> links
  const invalidInternalLinks: string[] = [];
  const hrefMatches = [...html.matchAll(/<a[^>]+href=["'](\/[^"'#?]*)["']/gi)];
  for (const m of hrefMatches) {
    const rawHref = m[1];
    if (rawHref.startsWith('//') || rawHref.startsWith('/api') || rawHref.startsWith('/#')) continue;
    // Skip binary asset downloads like .exe, .zip, etc.
    if (/\.(exe|zip|dmg|tar\.gz|pdf|png|jpe?g|webp|svg)$/i.test(rawHref)) continue;
    const cleanHref = rawHref === '' ? '/' : rawHref;
    if (!sitemapUrls.has(cleanHref) && !invalidInternalLinks.includes(cleanHref)) {
      invalidInternalLinks.push(cleanHref);
    }
  }

  results.push({
    slug: r.slug,
    name: r.name,
    htmlPath: filePath,
    fileSizeBytes: stats.size,
    wordCount,
    h1Text,
    h1Count,
    title,
    metaDesc,
    canonical,
    ssrFaqQuestions,
    ssrFaqAnswers,
    schemaTypes,
    schemaFaqs,
    faqParity,
    mismatches,
    invalidInternalLinks,
  });
}

console.log('========================================================================================');
console.log('                      FILEWALATOOL PHASE C BATCH 4 DEEP AUDIT                           ');
console.log('========================================================================================\n');

for (const res of results) {
  console.log(`ROUTE: ${res.slug} (${res.name})`);
  console.log(`  - File Size: ${(res.fileSizeBytes / 1024).toFixed(1)} KB (${res.fileSizeBytes} bytes)`);
  console.log(`  - Word Count: ${res.wordCount} words`);
  console.log(`  - Title: ${res.title}`);
  console.log(`  - Canonical: ${res.canonical}`);
  console.log(`  - H1 (${res.h1Count}): "${res.h1Text}"`);
  console.log(`  - Meta Description: "${res.metaDesc.slice(0, 80)}..."`);
  console.log(`  - Schema.org Types: [${res.schemaTypes.join(', ')}]`);
  console.log(`  - SSR FAQs rendered in HTML: ${res.ssrFaqQuestions.length} Q&As`);
  console.log(`  - Schema FAQs: ${res.schemaFaqs.length} Q&As`);
  console.log(`  - FAQ Parity: ${res.faqParity ? '✓ EXACT 100% MATCH' : '✗ MISMATCH'}`);
  if (res.mismatches.length > 0) {
    for (const m of res.mismatches) {
      console.log(`    ⚠️  FAQ Parity Issue: ${m}`);
    }
  }
  if (res.invalidInternalLinks.length > 0) {
    console.log(`  - Internal Link Warnings (${res.invalidInternalLinks.length}): Non-sitemap links found: [${res.invalidInternalLinks.join(', ')}]`);
  } else {
    console.log(`  - Internal Link Check: ✓ All <a> links point to valid canonical sitemap routes`);
  }
  console.log('----------------------------------------------------------------------------------------');
}

const allPassed = results.every(r => r.h1Count === 1 && r.faqParity && r.wordCount > 100 && r.invalidInternalLinks.length === 0);
console.log(`\nOVERALL BATCH 4 VERDICT: ${allPassed ? '✓ ALL 12 ROUTES FULLY VALIDATED AND PASSED' : '⚠️  AUDIT COMPLETED WITH ISSUES (SEE WARNINGS ABOVE)'}`);
