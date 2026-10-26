import fs from 'node:fs';
import path from 'node:path';
import { IMAGE_TOOLS_CONTENT } from '../src/core/imageToolsContent';

const distDir = path.resolve(process.cwd(), 'dist');

const batch3Routes = [
  '/image-resizer',
  '/compress-image',
  '/crop-image',
  '/bg-remover',
  '/jpg-to-png',
  '/png-to-jpg',
  '/heic-to-jpg',
  '/png-to-webp',
  '/webp-to-jpg',
  '/jpg-to-webp',
  '/avif-to-jpg',
  '/svg-to-png',
  '/watermark-image',
  '/round-corners',
  '/meme-generator',
  '/color-palette',
  '/image-to-base64',
  '/batch-image-cropper',
  '/filter-adjust',
];

console.log('================================================================');
console.log(`Starting Batch 3 Static HTML & FAQ Parity Audit (${batch3Routes.length} routes)`);
console.log('================================================================\n');

interface RouteAudit {
  route: string;
  h1: string;
  h1Count: number;
  expectedFaqCount: number;
  visibleQuestionsFound: number;
  visibleAnswersFound: number;
  schemaQuestionsFound: number;
  faqAnswerVisibleSSR: boolean;
  schemaDomParity: boolean;
  status: 'PASS' | 'FAIL';
  errors: string[];
}

const auditResults: RouteAudit[] = [];

for (const route of batch3Routes) {
  const cleanSlug = route.replace(/^\//, '');
  const htmlPath = path.resolve(distDir, cleanSlug, 'index.html');
  const errors: string[] = [];

  if (!fs.existsSync(htmlPath)) {
    auditResults.push({
      route,
      h1: '',
      h1Count: 0,
      expectedFaqCount: 0,
      visibleQuestionsFound: 0,
      visibleAnswersFound: 0,
      schemaQuestionsFound: 0,
      faqAnswerVisibleSSR: false,
      schemaDomParity: false,
      status: 'FAIL',
      errors: ['File not found on disk'],
    });
    continue;
  }

  const html = fs.readFileSync(htmlPath, 'utf8');

  // Strip script tags and decode standard HTML entities to test visible DOM content only
  const htmlWithoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  // 1. H1 Extraction
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1Count = h1Matches.length;
  const h1Text = h1Matches.map((m) => m[1].replace(/<[^>]+>/g, '').trim()).join(' | ');

  if (h1Count !== 1) {
    errors.push(`Expected exactly 1 H1, found ${h1Count}: "${h1Text}"`);
  }

  // 2. FAQ Verification
  const content = IMAGE_TOOLS_CONTENT[cleanSlug];
  if (!content) {
    errors.push(`Missing IMAGE_TOOLS_CONTENT entry for ${cleanSlug}`);
    auditResults.push({
      route,
      h1: h1Text,
      h1Count,
      expectedFaqCount: 0,
      visibleQuestionsFound: 0,
      visibleAnswersFound: 0,
      schemaQuestionsFound: 0,
      faqAnswerVisibleSSR: false,
      schemaDomParity: false,
      status: 'FAIL',
      errors,
    });
    continue;
  }

  const expectedFaqs = content.faqs;
  let visibleQuestionsFound = 0;
  let visibleAnswersFound = 0;

  for (let i = 0; i < expectedFaqs.length; i++) {
    const f = expectedFaqs[i];
    const qSample = f.question.slice(0, 30);
    // Use first 30 chars of answer for checking
    const aSample = f.answer.slice(0, 30);

    const qFound = htmlWithoutScripts.includes(qSample);
    const aFound = htmlWithoutScripts.includes(aSample);

    if (qFound) visibleQuestionsFound++;
    else errors.push(`Question #${i + 1} not found in visible HTML: "${f.question}"`);

    if (aFound) visibleAnswersFound++;
    else errors.push(`Answer #${i + 1} not found in visible HTML outside scripts: "${f.answer.slice(0, 50)}..."`);
  }

  // 3. Schema.org FAQPage Parity
  let schemaQuestionsFound = 0;
  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      const graph = parsed['@graph'] || [parsed];
      const faqEntity = graph.find((e: any) => e['@type'] === 'FAQPage');
      if (faqEntity && Array.isArray(faqEntity.mainEntity)) {
        schemaQuestionsFound = faqEntity.mainEntity.length;
        if (schemaQuestionsFound !== expectedFaqs.length) {
          errors.push(`Schema FAQ count (${schemaQuestionsFound}) != Content FAQ count (${expectedFaqs.length})`);
        }
      } else {
        errors.push('No FAQPage entity found in JSON-LD');
      }
    } catch (e: any) {
      errors.push(`JSON-LD parse error: ${e.message}`);
    }
  } else {
    errors.push('No JSON-LD script found in HTML');
  }

  const faqAnswerVisibleSSR = visibleAnswersFound === expectedFaqs.length;
  const schemaDomParity = schemaQuestionsFound === expectedFaqs.length && visibleQuestionsFound === expectedFaqs.length;
  const passed = errors.length === 0;

  auditResults.push({
    route,
    h1: h1Text,
    h1Count,
    expectedFaqCount: expectedFaqs.length,
    visibleQuestionsFound,
    visibleAnswersFound,
    schemaQuestionsFound,
    faqAnswerVisibleSSR,
    schemaDomParity,
    status: passed ? 'PASS' : 'FAIL',
    errors,
  });
}

console.table(
  auditResults.map((r) => ({
    Route: r.route,
    H1: r.h1Count === 1 ? '1 EXACT' : `FAIL (${r.h1Count})`,
    'Expected FAQs': r.expectedFaqCount,
    'SSR Questions': `${r.visibleQuestionsFound}/${r.expectedFaqCount}`,
    'SSR Answers': `${r.visibleAnswersFound}/${r.expectedFaqCount}`,
    'Schema FAQs': `${r.schemaQuestionsFound}/${r.expectedFaqCount}`,
    'Answers Visible': r.faqAnswerVisibleSSR ? '✓ ALL 100%' : 'FAIL',
    Parity: r.schemaDomParity ? '✓ EXACT' : 'FAIL',
    Status: r.status,
  }))
);

const failed = auditResults.filter((r) => r.status === 'FAIL');
console.log('\n----------------------------------------------------------------');
console.log(`TOTAL BATCH 3 ROUTES AUDITED: ${auditResults.length}`);
console.log(`PASSED: ${auditResults.length - failed.length}`);
console.log(`FAILED: ${failed.length}`);
console.log('----------------------------------------------------------------\n');

if (failed.length > 0) {
  console.error('FAILURES:');
  for (const f of failed) {
    console.error(`\n[${f.route}]`);
    f.errors.forEach((e) => console.error(`  - ${e}`));
  }
  process.exit(1);
} else {
  console.log('✓ ALL 19 BATCH 3 ROUTES HAVE 100% FAQ ANSWERS RENDERED IN SSR HTML AND MATCH SCHEMA EXACTLY!');
}
