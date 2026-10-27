const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 Table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bits
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (1 + width * 4);
    scanlines[scanlineOffset] = 0; // Filter: None
    rgbaBuffer.copy(
      scanlines,
      scanlineOffset + 1,
      y * width * 4,
      (y + 1) * width * 4
    );
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Decode PNG bytes into raw RGBA buffer
function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8;
  const idats = [];
  let w = 0;
  let h = 0;
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      w = buf.readUInt32BE(offset + 8);
      h = buf.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idats.push(buf.subarray(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idats));
  const rgba = Buffer.alloc(w * h * 4);
  const stride = 1 + w * 4;

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };

  for (let y = 0; y < h; y++) {
    const filter = decompressed[y * stride];
    const rowOffset = y * stride + 1;
    const prevRowOffset = (y - 1) * stride + 1;

    for (let x = 0; x < w * 4; x++) {
      const cur = decompressed[rowOffset + x];
      const a = x >= 4 ? rgba[y * w * 4 + x - 4] : 0;
      const b = y > 0 ? rgba[(y - 1) * w * 4 + x] : 0;
      const c = y > 0 && x >= 4 ? rgba[(y - 1) * w * 4 + x - 4] : 0;

      let val = cur;
      if (filter === 1) val = (cur + a) & 0xff;
      else if (filter === 2) val = (cur + b) & 0xff;
      else if (filter === 3) val = (cur + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) val = (cur + paeth(a, b, c)) & 0xff;

      rgba[y * w * 4 + x] = val;
    }
  }

  return { width: w, height: h, data: rgba };
}

// Generate 1200x630 High-Resolution OG Image
const width = 1200;
const height = 630;
const canvas = Buffer.alloc(width * height * 4);

// Background: Elegant zinc-950 dark theme with deep subtle radial gradients
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;

    // Base dark background: #09090b (9, 9, 11)
    let r = 9;
    let g = 9;
    let b = 11;

    // Subtle emerald ambient glow in top-left (center 280, 200)
    const d1 = Math.hypot(x - 280, y - 200);
    if (d1 < 500) {
      const f1 = (1 - d1 / 500) * 0.28;
      r = Math.min(255, r + Math.round(16 * f1));
      g = Math.min(255, g + Math.round(185 * f1));
      b = Math.min(255, b + Math.round(129 * f1));
    }

    // Subtle blue/indigo ambient glow in bottom-right (center 950, 420)
    const d2 = Math.hypot(x - 950, y - 420);
    if (d2 < 550) {
      const f2 = (1 - d2 / 550) * 0.24;
      r = Math.min(255, r + Math.round(59 * f2));
      g = Math.min(255, g + Math.round(130 * f2));
      b = Math.min(255, b + Math.round(246 * f2));
    }

    // Border line 1px #27272a
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
      r = 39; g = 39; b = 42;
    }

    canvas[idx] = r;
    canvas[idx + 1] = g;
    canvas[idx + 2] = b;
    canvas[idx + 3] = 255;
  }
}

// Blit decoded logo onto the left or center
const logoPath = path.resolve(__dirname, '../public/logo.png');
if (fs.existsSync(logoPath)) {
  const logo = decodePng(logoPath);
  console.log(`Decoded logo: ${logo.width}x${logo.height}`);

  // Target size for logo on OG image: 340x340 px
  const targetLogoSize = 340;
  const startX = 120;
  const startY = Math.round((height - targetLogoSize) / 2);

  for (let dy = 0; dy < targetLogoSize; dy++) {
    for (let dx = 0; dx < targetLogoSize; dx++) {
      const sx = Math.floor((dx / targetLogoSize) * logo.width);
      const sy = Math.floor((dy / targetLogoSize) * logo.height);

      const srcIdx = (sy * logo.width + sx) * 4;
      const sr = logo.data[srcIdx];
      const sg = logo.data[srcIdx + 1];
      const sb = logo.data[srcIdx + 2];
      const sa = logo.data[srcIdx + 3] / 255;

      if (sa > 0) {
        const dstX = startX + dx;
        const dstY = startY + dy;
        const dstIdx = (dstY * width + dstX) * 4;

        canvas[dstIdx] = Math.round(sr * sa + canvas[dstIdx] * (1 - sa));
        canvas[dstIdx + 1] = Math.round(sg * sa + canvas[dstIdx + 1] * (1 - sa));
        canvas[dstIdx + 2] = Math.round(sb * sa + canvas[dstIdx + 2] * (1 - sa));
      }
    }
  }
}

const outputPath = path.resolve(__dirname, '../public/og-image.png');
const pngData = createPng(width, height, canvas);
fs.writeFileSync(outputPath, pngData);
console.log(`Successfully generated 1200x630 OG image at ${outputPath} (${pngData.length} bytes)`);
