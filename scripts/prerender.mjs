import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Provide safe browser globals in Node.js environment for packages expecting window/document/navigator/Worker
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { pathname: '/', search: '', hash: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    scrollTo: () => {},
    document: {
      documentElement: { lang: 'en-IN', classList: { add() {}, remove() {} } },
      createElement: () => ({ setAttribute() {}, appendChild() {} }),
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      title: '',
    },
  };
  globalThis.document = globalThis.window.document;
  try {
    navigator.getUserMedia = () => {};
    navigator.webkitGetUserMedia = () => {};
    navigator.mozGetUserMedia = () => {};
    navigator.msGetUserMedia = () => {};
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = { getUserMedia: () => Promise.resolve() };
    }
  } catch (e) {}
  globalThis.window.navigator = navigator;
  globalThis.Worker = class MockWorker {
    constructor() {}
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    terminate() {}
  };
  if (!globalThis.URL.createObjectURL) globalThis.URL.createObjectURL = () => 'blob:mock';
  if (!globalThis.URL.revokeObjectURL) globalThis.URL.revokeObjectURL = () => {};
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  };
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const ssrBundlePath = path.resolve(rootDir, 'dist-ssr', 'entry-server.js');

// Parse all 46 routes from public/sitemap.xml
function getSitemapRoutes() {
  const sitemapXml = fs.readFileSync(path.resolve(rootDir, 'public', 'sitemap.xml'), 'utf8');
  const locs = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  return locs.map(url => new URL(url).pathname);
}

// Representative Batch 1 (10 routes covering all application sections and engines)
export const BATCH_1_ROUTES = [
  '/',
  '/tools',
  '/document-tools',
  '/pan-photo-resize',
  '/compress-image',
  '/merge-pdf',
  '/pdf-to-word',
  '/heic-to-jpg',
  '/desktop',
  '/about',
];

export const ALL_46_ROUTES = getSitemapRoutes();

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function runPrerender(routesToPrerender = ALL_46_ROUTES) {
  console.log(`--- Starting Prerendering (${routesToPrerender.length} routes) ---`);

  if (!fs.existsSync(distDir)) {
    throw new Error('dist directory not found. Please run "vite build" first.');
  }

  const templatePath = path.resolve(distDir, 'index.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error('dist/index.html not found.');
  }

  // Preserve clean shell template
  let pristineTemplate = fs.readFileSync(templatePath, 'utf8');
  if (!pristineTemplate.includes('<div id="root"></div>')) {
    const rootStart = '<div id="root">';
    const rootIndex = pristineTemplate.indexOf(rootStart);
    const bodyClose = pristineTemplate.lastIndexOf('</body>');
    if (rootIndex !== -1 && bodyClose !== -1) {
      pristineTemplate =
        pristineTemplate.substring(0, rootIndex) +
        '<div id="root"></div>\n  ' +
        pristineTemplate.substring(bodyClose);
    }
  }

  if (!fs.existsSync(ssrBundlePath)) {
    throw new Error(`SSR bundle not found at ${ssrBundlePath}. Please run "vite build --ssr" first.`);
  }

  const ssrModule = await import(`file://${ssrBundlePath.replace(/\\/g, '/')}`);
  const { render } = ssrModule;

  if (typeof render !== 'function') {
    throw new Error('entry-server.js does not export a "render" function.');
  }

  const results = [];

  for (const route of routesToPrerender) {
    if (typeof globalThis.window !== 'undefined' && globalThis.window.location) {
      globalThis.window.location.pathname = route;
      globalThis.window.location.hash = '';
    }

    const { html, title, description, canonical, jsonLd } = render(route);

    let routeHtml = pristineTemplate;

    // 1. Inject rendered HTML into #root
    if (!routeHtml.includes('<div id="root"></div>')) {
      throw new Error('Pristine template does not contain <div id="root"></div>');
    }
    routeHtml = routeHtml.replace('<div id="root"></div>', `<div id="root">${html}</div>`);

    // 2. Synchronize Title
    routeHtml = routeHtml.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

    // 3. Synchronize Meta Description
    routeHtml = routeHtml.replace(
      /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`
    );

    // 4. Synchronize Canonical URL
    routeHtml = routeHtml.replace(
      /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
      `<link rel="canonical" href="${canonical}" />`
    );

    // 5. Synchronize OpenGraph Tags
    routeHtml = routeHtml.replace(
      /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(title)}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(description)}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:url" content="${canonical}" />`
    );

    // 6. Synchronize Twitter Tags
    routeHtml = routeHtml.replace(
      /<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`
    );

    // 7. Synchronize JSON-LD Structured Data
    if (jsonLd) {
      const jsonLdString = JSON.stringify(jsonLd, null, 2);
      const jsonLdTag = `<script type="application/ld+json" id="filewala-dynamic-seo-jsonld">\n${jsonLdString}\n    </script>`;
      routeHtml = routeHtml.replace(
        /<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>/i,
        jsonLdTag
      );
    }

    // Determine target file locations
    let targetFile;
    let alternateFile = null;

    if (route === '/') {
      targetFile = path.resolve(distDir, 'index.html');
    } else {
      const cleanSlug = route.replace(/^\//, '');
      const folderPath = path.resolve(distDir, cleanSlug);
      fs.mkdirSync(folderPath, { recursive: true });
      targetFile = path.resolve(folderPath, 'index.html');
      alternateFile = path.resolve(distDir, `${cleanSlug}.html`);
    }

    fs.writeFileSync(targetFile, routeHtml, 'utf8');
    if (alternateFile) {
      fs.writeFileSync(alternateFile, routeHtml, 'utf8');
    }

    const hasH1 = routeHtml.includes('<h1') || routeHtml.includes('hero.title') || routeHtml.includes('FileWala');

    results.push({
      route,
      targetFile: path.relative(rootDir, targetFile),
      alternateFile: alternateFile ? path.relative(rootDir, alternateFile) : null,
      sizeBytes: Buffer.byteLength(routeHtml, 'utf8'),
      bodyLength: html.length,
      title,
      canonical,
      hasH1,
      hasJsonLd: Boolean(jsonLd),
    });

    console.log(`✓ Generated ${path.relative(rootDir, targetFile)} (${(Buffer.byteLength(routeHtml, 'utf8') / 1024).toFixed(1)} KB, body: ${html.length} chars)`);
  }

  // Clean up temporary SSR bundle directory
  const ssrDir = path.resolve(rootDir, 'dist-ssr');
  if (fs.existsSync(ssrDir)) {
    fs.rmSync(ssrDir, { recursive: true, force: true });
    console.log('\n✓ Cleaned up temporary dist-ssr directory.');
  }

  console.log(`\n--- Completed Prerendering ${results.length} Routes ---`);
  return results;
}

// Read CLI argument (e.g. node scripts/prerender.mjs --batch1 or --all)
const arg = process.argv[2];
let targetRoutes = ALL_46_ROUTES;
if (arg === '--batch1') {
  targetRoutes = BATCH_1_ROUTES;
}

runPrerender(targetRoutes).catch((err) => {
  console.error('Prerendering failed:', err);
  process.exit(1);
});
