import fs from 'node:fs';
import path from 'node:path';

const xml = fs.readFileSync('public/sitemap.xml', 'utf8');
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

const summary = urls.map((url, i) => {
  const route = new URL(url).pathname;
  const file = route === '/' ? 'dist/index.html' : path.join('dist', route.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  
  const rootStart = html.indexOf('<div id="root">');
  const rootEnd = html.lastIndexOf('</div>');
  const rootHtml = rootStart !== -1 ? html.slice(rootStart, rootEnd) : '';
  const text = rootHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').filter(Boolean).length;
  
  const hasFaqSchema = html.includes('"@type":"FAQPage"') || html.includes('"@type": "FAQPage"');
  const hasFaqText = /faq|frequently asked/i.test(text);

  return {
    num: i + 1,
    route,
    title: titleMatch ? titleMatch[1].trim() : '',
    desc: descMatch ? descMatch[1].trim() : '',
    descLen: descMatch ? descMatch[1].length : 0,
    h1: h1Match ? h1Match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() : '',
    words,
    hasFaqSchema,
    hasFaqText
  };
});

fs.writeFileSync('scripts/content-inventory.json', JSON.stringify(summary, null, 2));
console.log(`Audited ${summary.length} routes. Written to scripts/content-inventory.json`);
