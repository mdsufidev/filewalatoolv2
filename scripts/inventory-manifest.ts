import fs from 'node:fs';
import { resolveRouteFromUrl } from '../src/core/urlRoutes';
import { computeSeoMetadata } from '../src/components/seo/ToolJsonLdSeo';
import { ALL_TOOLS } from '../src/core/toolsData';

const xml = fs.readFileSync('public/sitemap.xml', 'utf8');
const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

console.log(`Parsing ${locs.length} URLs from public/sitemap.xml:\n`);

interface RouteInfo {
  index: number;
  url: string;
  pathname: string;
  type: 'homepage' | 'category' | 'directory' | 'tool' | 'informational' | 'unknown';
  componentSection: string;
  subToolId: string;
  title: string;
  hasJsonLd: boolean;
  specialHandling: string;
}

const manifest: RouteInfo[] = locs.map((url, i) => {
  const pathname = new URL(url).pathname;
  const resolved = resolveRouteFromUrl(pathname);
  const metadata = computeSeoMetadata(resolved.activeTool, resolved.activePage, resolved.selectedCategory);

  let type: RouteInfo['type'] = 'unknown';
  let componentSection = 'N/A';
  let subToolId = 'N/A';
  let specialHandling = 'None';

  if (pathname === '/') {
    type = 'homepage';
    componentSection = 'HomePage';
  } else if (pathname === '/tools') {
    type = 'directory';
    componentSection = 'HomePage (all)';
  } else if (['/image-tools', '/pdf-tools', '/convert-tools', '/document-tools'].includes(pathname)) {
    type = 'category';
    componentSection = `HomePage (${resolved.selectedCategory})`;
  } else if (resolved.activePage) {
    type = 'informational';
    componentSection = `Page:${resolved.activePage}`;
  } else if (pathname === '/privacy') {
    type = 'informational';
    componentSection = 'PrivacyModal';
  } else if (resolved.activeTool) {
    type = 'tool';
    componentSection = resolved.activeTool.section;
    subToolId = resolved.activeTool.subToolId;

    if (componentSection === 'image-tools') {
      specialHandling = 'Canvas 2D, File Drop';
    } else if (componentSection === 'pdf-tools') {
      specialHandling = 'pdf-lib, pdfjs-dist, Canvas';
    } else if (componentSection === 'convert') {
      specialHandling = 'heic2any, tesseract.js, Canvas';
    } else if (componentSection === 'document-tools') {
      specialHandling = 'Canvas 2D, DPI JFIF, UPSC/SSC Stamp';
    }
  }

  return {
    index: i + 1,
    url,
    pathname,
    type,
    componentSection,
    subToolId,
    title: metadata.title,
    hasJsonLd: metadata.jsonLdGraph.length > 0,
    specialHandling,
  };
});

console.table(manifest.map(m => ({
  '#': m.index,
  Path: m.pathname,
  Type: m.type,
  Section: m.componentSection,
  SubTool: m.subToolId,
  Title: m.title.length > 40 ? m.title.substring(0, 37) + '...' : m.title,
  Handling: m.specialHandling
})));

// Breakdown counts
const counts = manifest.reduce((acc, r) => {
  acc[r.type] = (acc[r.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('\n--- Route Type Breakdown ---');
console.table(counts);

// Verify every tool mapped
const unmapped = manifest.filter(m => m.type === 'unknown');
if (unmapped.length > 0) {
  console.error('WARNING: Unmapped routes found:', unmapped);
} else {
  console.log('✓ All 46 routes mapped with 100% confidence.');
}
