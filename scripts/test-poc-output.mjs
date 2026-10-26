import fs from 'node:fs';

const ci = fs.readFileSync('dist/compress-image/index.html', 'utf8');
const mp = fs.readFileSync('dist/merge-pdf/index.html', 'utf8');
const hp = fs.readFileSync('dist/index.html', 'utf8');

function getRootContent(html) {
  const startTag = '<div id="root">';
  const startIndex = html.indexOf(startTag);
  if (startIndex === -1) return '';
  const bodyCloseIndex = html.lastIndexOf('</body>');
  const divCloseIndex = html.lastIndexOf('</div>', bodyCloseIndex !== -1 ? bodyCloseIndex : html.length);
  if (divCloseIndex > startIndex) {
    return html.substring(startIndex + startTag.length, divCloseIndex);
  }
  return '';
}

const hpRoot = getRootContent(hp);
const ciRoot = getRootContent(ci);
const mpRoot = getRootContent(mp);

console.log('=== 1. Homepage (/) Verification ===');
console.log('Title:', hp.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('Description:', hp.match(/<meta name="description" content="(.*?)"/)?.[1]);
console.log('Canonical:', hp.match(/<link rel="canonical" href="(.*?)"/)?.[1]);
console.log('Root HTML chars:', hpRoot.length);
console.log('Contains H1 title ("Stop Worrying About Form Rejections"):', hp.includes('Stop Worrying About Form Rejections'));
console.log('Contains WebSite JSON-LD:', hp.includes('"@type": "WebSite"'));

console.log('\n=== 2. /compress-image Verification ===');
console.log('Title:', ci.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('Description:', ci.match(/<meta name="description" content="(.*?)"/)?.[1]);
console.log('Canonical:', ci.match(/<link rel="canonical" href="(.*?)"/)?.[1]);
console.log('Root HTML chars:', ciRoot.length);
console.log('Contains Breadcrumb nav:', ci.includes('aria-label="Breadcrumb"'));
console.log('Contains Image Tools breadcrumb:', ci.includes('Image Tools'));
console.log('Contains Compressor Dropzone ("Drop your image here"):', ci.includes('Drop your image here'));
console.log('Contains Format Matrix ("Which Output Format Should You Pick?"):', ci.includes('Which Output Format Should You Pick?'));
console.log('Contains FAQ Accordion copy:', ci.includes('Are my photos uploaded to any server or cloud?'));
console.log('Contains FAQPage JSON-LD:', ci.includes('"@type": "FAQPage"'));
console.log('Contains WebApplication JSON-LD:', ci.includes('"@type": "WebApplication"'));

console.log('\n=== 3. /merge-pdf Verification ===');
console.log('Title:', mp.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('Description:', mp.match(/<meta name="description" content="(.*?)"/)?.[1]);
console.log('Canonical:', mp.match(/<link rel="canonical" href="(.*?)"/)?.[1]);
console.log('Root HTML chars:', mpRoot.length);
console.log('Contains Breadcrumb nav:', mp.includes('aria-label="Breadcrumb"'));
console.log('Contains PDF Tools breadcrumb:', mp.includes('PDF Tools'));
console.log('Contains 4-Step Merge Guide ("How PDF Merging Works in FileWala"):', mp.includes('How PDF Merging Works in FileWala'));
console.log('Contains 1-Click Download:', mp.includes('1-Click Download'));
console.log('Contains FAQ Accordion copy:', mp.includes('Are my documents uploaded to any remote server?'));
console.log('Contains FAQPage JSON-LD:', mp.includes('"@type": "FAQPage"'));
console.log('Contains WebApplication JSON-LD:', mp.includes('"@type": "WebApplication"'));

console.log('\n=== 4. Verification Check: No Empty Bodies ===');
const emptyBodyFound = [hp, ci, mp].some(html => html.includes('<div id="root"></div>'));
console.log('Empty <div id="root"></div> found in any file:', emptyBodyFound);

const allPassed =
  hp.includes('Stop Worrying About Form Rejections') &&
  ci.includes('Which Output Format Should You Pick?') &&
  ci.includes('Are my photos uploaded to any server or cloud?') &&
  mp.includes('How PDF Merging Works in FileWala') &&
  mp.includes('Are my documents uploaded to any remote server?') &&
  !emptyBodyFound;

console.log('\n=== ALL PHASE B POC REQUIREMENTS PASSED ===:', allPassed);
