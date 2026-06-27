import fs from "node:fs/promises";
import sharp from "sharp";

const width = 1200;
const height = 630;

const logo = await sharp("public/logo.png")
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
  .resize({ width: 236, withoutEnlargement: true })
  .png()
  .toBuffer();

const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#FAFAFA"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#grid)" opacity="0.5"/>
  <circle cx="1048" cy="118" r="210" fill="#FFF1F2"/>
  <circle cx="1080" cy="520" r="180" fill="#FFE4E6" opacity="0.48"/>
  <rect x="46" y="40" width="1108" height="550" rx="32" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2"/>

  <image href="${logoDataUri}" x="78" y="58" width="236" height="129" preserveAspectRatio="xMinYMin meet"/>

  <g transform="translate(78 220)">
    <rect x="0" y="0" width="238" height="36" rx="18" fill="#FFF1F2" stroke="#FECACA"/>
    <text x="22" y="24" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#D9232E">Free Online File Tools</text>

    <text x="0" y="103" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800" fill="#171717">Free Online Image,</text>
    <text x="0" y="161" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800" fill="#171717">PDF &amp; Document Tools</text>

    <text x="0" y="214" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="500" fill="#5F6673">Resize, compress, convert and edit files</text>
    <text x="0" y="246" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="500" fill="#5F6673">securely in your browser.</text>

    <g transform="translate(0 294)">
      <rect x="0" y="0" width="144" height="42" rx="21" fill="#FFFFFF" stroke="#E5E7EB"/>
      <circle cx="24" cy="21" r="8" fill="#D9232E"/>
      <text x="43" y="27" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#171717">Image Tools</text>
      <rect x="158" y="0" width="124" height="42" rx="21" fill="#FFFFFF" stroke="#E5E7EB"/>
      <circle cx="182" cy="21" r="8" fill="#D9232E"/>
      <text x="201" y="27" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#171717">PDF Tools</text>
      <rect x="296" y="0" width="108" height="42" rx="21" fill="#FFFFFF" stroke="#E5E7EB"/>
      <circle cx="320" cy="21" r="8" fill="#D9232E"/>
      <text x="339" y="27" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#171717">Convert</text>
      <rect x="418" y="0" width="132" height="42" rx="21" fill="#FFFFFF" stroke="#E5E7EB"/>
      <circle cx="442" cy="21" r="8" fill="#D9232E"/>
      <text x="461" y="27" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#171717">Documents</text>
    </g>
  </g>

  <g transform="translate(684 104)">
    <rect x="0" y="0" width="402" height="380" rx="26" fill="#171717" opacity="0.08"/>
    <rect x="-22" y="-20" width="402" height="380" rx="26" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2"/>
    <rect x="-22" y="-20" width="402" height="54" rx="26" fill="#FFFFFF"/>
    <rect x="-22" y="32" width="402" height="2" fill="#E5E7EB"/>
    <circle cx="14" cy="8" r="6" fill="#F87171"/>
    <circle cx="36" cy="8" r="6" fill="#FBBF24"/>
    <circle cx="58" cy="8" r="6" fill="#34D399"/>
    <rect x="94" y="-2" width="180" height="22" rx="11" fill="#F5F5F5"/>
    <text x="114" y="14" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#5F6673">filewalatoolv2.vercel.app</text>

    <rect x="18" y="64" width="132" height="22" rx="11" fill="#FFF1F2"/>
    <text x="34" y="80" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="800" fill="#D9232E">Browser-based</text>
    <text x="18" y="126" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" fill="#171717">Make every file</text>
    <text x="18" y="166" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" fill="#D9232E">ready in minutes.</text>
    <rect x="18" y="190" width="314" height="42" rx="14" fill="#FAFAFA" stroke="#E5E7EB"/>
    <circle cx="42" cy="211" r="8" fill="none" stroke="#9CA3AF" stroke-width="3"/>
    <path d="M48 217 L56 225" stroke="#9CA3AF" stroke-width="3" stroke-linecap="round"/>
    <text x="70" y="217" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="600" fill="#9CA3AF">Search file tools</text>

    <g transform="translate(18 258)">
      <rect x="0" y="0" width="146" height="74" rx="16" fill="#FFFFFF" stroke="#E5E7EB"/>
      <rect x="16" y="16" width="28" height="28" rx="8" fill="#FFF1F2"/>
      <path d="M23 34 L30 25 L37 34" stroke="#D9232E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="56" y="32" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="#171717">Image</text>
      <text x="56" y="51" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#5F6673">Resize</text>

      <rect x="168" y="0" width="146" height="74" rx="16" fill="#FFFFFF" stroke="#E5E7EB"/>
      <rect x="184" y="16" width="28" height="28" rx="8" fill="#FFF1F2"/>
      <path d="M193 22 H205 V42 H193 Z M197 28 H202 M197 34 H202" stroke="#D9232E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="224" y="32" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="#171717">PDF</text>
      <text x="224" y="51" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#5F6673">Compress</text>
    </g>
  </g>

  <g transform="translate(724 500)">
    <rect x="0" y="0" width="332" height="54" rx="18" fill="#D9232E"/>
    <text x="28" y="35" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF">Fast &#183; Private &#183; No signup</text>
  </g>

  <defs>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" stroke="#E5E7EB" stroke-width="1"/>
    </pattern>
  </defs>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, palette: true, quality: 92 })
  .toFile("public/og-image.png");

const metadata = await sharp("public/og-image.png").metadata();
if (metadata.width !== width || metadata.height !== height) {
  throw new Error(`Expected ${width}x${height}, got ${metadata.width}x${metadata.height}`);
}

const stats = await fs.stat("public/og-image.png");
console.log(`Generated public/og-image.png (${metadata.width}x${metadata.height}, ${Math.round(stats.size / 1024)} KB)`);
