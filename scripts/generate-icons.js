import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Table for fast CRC32 calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf, start = 0, length = buf.length - start) {
  let c = 0xffffffff;
  for (let i = start; i < start + length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPNG(width, height, getPixel) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Check if point (px, py) in normalized coordinates [0..1] is on/in the shield or letter H.
 * Returns { isH: boolean, isShieldBorder: boolean, isInsideShield: boolean, isOutsideIcon: boolean }
 */
function sampleIcon(px, py, isMaskable) {
  const cornerRadius = isMaskable ? 0 : 0.22;
  
  // Non-maskable rounded square boundary
  if (!isMaskable) {
    const qx = Math.max(0, Math.abs(px - 0.5) - (0.5 - cornerRadius));
    const qy = Math.max(0, Math.abs(py - 0.5) - (0.5 - cornerRadius));
    if (Math.hypot(qx, qy) > cornerRadius) {
      return { isOutside: true, isH: false, isShieldBorder: false };
    }
  }

  // Scale into safe area
  const scale = isMaskable ? 0.70 : 0.80;
  const sx = (px - 0.5) / scale + 0.5;
  const sy = (py - 0.5) / scale + 0.5;

  // Shield dimensions
  const topY = 0.16;
  const midY = 0.50;
  const botY = 0.86;
  const halfW = 0.32;
  const borderWidth = 0.038;

  // Function to get max allowed half-width of outer shield at any given y
  function getOuterHalfW(y) {
    if (y < topY || y > botY) return -1;
    if (y <= midY) return halfW;
    const t = (y - midY) / (botY - midY);
    return halfW * (1 - Math.pow(t, 1.7));
  }

  // Function to get max allowed half-width of inner shield at any given y
  function getInnerHalfW(y) {
    const innerTop = topY + borderWidth;
    const innerBot = botY - borderWidth * 1.5;
    const innerMid = midY;
    const innerHalfW = halfW - borderWidth;
    if (y < innerTop || y > innerBot) return -1;
    if (y <= innerMid) return innerHalfW;
    const t = (y - innerMid) / (innerBot - innerMid);
    return innerHalfW * (1 - Math.pow(t, 1.7));
  }

  const dx = Math.abs(sx - 0.5);
  const outerHW = getOuterHalfW(sy);
  const innerHW = getInnerHalfW(sy);

  const inOuterShield = outerHW > 0 && dx <= outerHW;
  const inInnerShield = innerHW > 0 && dx <= innerHW;
  const isShieldBorder = inOuterShield && !inInnerShield;

  // Letter H geometry (inside shield)
  // Perfectly centered around cx=0.5, cy=0.48
  const hTop = 0.33;
  const hBot = 0.65;
  const hLeft = 0.35;
  const hRight = 0.65;
  const barThick = 0.068; // Width of vertical bars and crossbar
  const crossYTop = 0.455;
  const crossYBot = 0.525;

  let isH = false;
  if (sx >= hLeft && sx <= hRight && sy >= hTop && sy <= hBot) {
    // Left vertical bar
    const inLeftBar = sx <= (hLeft + barThick);
    // Right vertical bar
    const inRightBar = sx >= (hRight - barThick);
    // Horizontal crossbar
    const inCrossBar = sy >= crossYTop && sy <= crossYBot;

    if (inLeftBar || inRightBar || inCrossBar) {
      isH = true;
    }
  }

  return {
    isOutside: false,
    isH,
    isShieldBorder
  };
}

// Render with 4x4 Super-Sampling Anti-Aliasing (SSAA)
function renderHanssonIcon(isMaskable) {
  return (x, y, w, h) => {
    let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
    const samples = 4; // 4x4 = 16 subpixels per pixel
    const totalSamples = samples * samples;

    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const px = (x + (sx + 0.5) / samples) / w;
        const py = (y + (sy + 0.5) / samples) / h;

        const sample = sampleIcon(px, py, isMaskable);

        if (sample.isOutside) {
          // Transparent
          continue;
        }

        if (sample.isH || sample.isShieldBorder) {
          // Pure crisp white (#ffffff)
          sumR += 255;
          sumG += 255;
          sumB += 255;
          sumA += 255;
        } else {
          // Pure black background (#000000)
          sumR += 0;
          sumG += 0;
          sumB += 0;
          sumA += 255;
        }
      }
    }

    const r = Math.round(sumR / totalSamples);
    const g = Math.round(sumG / totalSamples);
    const b = Math.round(sumB / totalSamples);
    const a = Math.round(sumA / totalSamples);

    return [r, g, b, a];
  };
}

const publicDir = path.resolve('public');
const iconsDir = path.join(publicDir, 'icons');

fs.mkdirSync(iconsDir, { recursive: true });

console.log('Generating Black & White Shield + H PWA icons...');

const iconConfigs = [
  { name: 'icon-48x48.png', size: 48, maskable: false },
  { name: 'icon-96x96.png', size: 96, maskable: false },
  { name: 'icon-144x144.png', size: 144, maskable: false },
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'icon-192x192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-512x512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon-32x32.png', size: 32, maskable: false },
  { name: 'favicon-16x16.png', size: 16, maskable: false }
];

for (const config of iconConfigs) {
  const buf = createPNG(config.size, config.size, renderHanssonIcon(config.maskable));
  fs.writeFileSync(path.join(iconsDir, config.name), buf);
  console.log(`Created ${config.name} (${config.size}x${config.size})`);
}

// Generate matching Vector SVG Icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <!-- Black Background with Smooth Rounded Corners -->
  <rect width="512" height="512" rx="112" fill="#000000" />
  
  <!-- White Border Shield -->
  <path 
    d="M 256 82 L 396 122 C 396 270 256 392 256 430 C 256 392 116 270 116 122 Z" 
    fill="#000000" 
    stroke="#ffffff" 
    stroke-width="20" 
    stroke-linejoin="round" 
    stroke-linecap="round"
  />

  <!-- Letter H inside Shield in Pure White -->
  <path 
    d="M 188 178 V 334 M 324 178 V 334 M 188 256 H 324" 
    fill="none" 
    stroke="#ffffff" 
    stroke-width="36" 
    stroke-linecap="square"
  />
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
console.log('Created icon.svg');
console.log('All black & white Shield + H icons generated successfully!');
