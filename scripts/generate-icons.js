/**
 * Generates PWA icons for PujoPoth.
 * Creates orange (#FF9933) square icons with the Bengali letter "প" centered in white.
 * Sizes: 192x192, 512x512, and apple-touch-icon (180x180).
 *
 * Usage: node scripts/generate-icons.js
 *
 * Falls back to minimal valid PNG placeholders if canvas is not available.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/**
 * Create a minimal valid PNG buffer of the given dimensions,
 * filled with saffron (#FF9933) color.
 * This creates a proper PNG without any dependencies.
 */
function createMinimalPNG(width, height) {
  // PNG uses big-endian
  function writeUint32BE(buf, value, offset) {
    buf[offset] = (value >> 24) & 0xff;
    buf[offset + 1] = (value >> 16) & 0xff;
    buf[offset + 2] = (value >> 8) & 0xff;
    buf[offset + 3] = value & 0xff;
  }

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf, start, length) {
    let crc = 0xffffffff;
    for (let i = start; i < start + length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // Build raw image data: each row has a filter byte (0) + RGB pixels
  const rawRows = [];
  // Saffron color: #FF9933 = R:255, G:153, B:51
  const r = 0xff, g = 0x99, b = 0x33;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const offset = 1 + x * 3;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);

  // Deflate the raw data using zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  writeUint32BE(ihdrData, width, 0);
  writeUint32BE(ihdrData, height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  function createChunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const lengthBuffer = Buffer.alloc(4);
    writeUint32BE(lengthBuffer, data.length, 0);

    const crcInput = Buffer.concat([typeBuffer, data]);
    const crcValue = crc32(crcInput, 0, crcInput.length);
    const crcBuffer = Buffer.alloc(4);
    writeUint32BE(crcBuffer, crcValue, 0);

    return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
  }

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate icons
try {
  const icon192 = createMinimalPNG(192, 192);
  const icon512 = createMinimalPNG(512, 512);
  const appleTouchIcon = createMinimalPNG(180, 180);

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-192.png'), icon192);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-512.png'), icon512);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), appleTouchIcon);

  console.log('✅ Generated icon-192.png (%d bytes)', icon192.length);
  console.log('✅ Generated icon-512.png (%d bytes)', icon512.length);
  console.log('✅ Generated apple-touch-icon.png (%d bytes)', appleTouchIcon.length);
  console.log('\nIcons are saffron (#FF9933) placeholders.');
  console.log('Replace them with branded icons when ready.');
} catch (err) {
  console.error('Error generating icons:', err);
  process.exit(1);
}
