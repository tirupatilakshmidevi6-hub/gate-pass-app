/**
 * PWA Icon Generator for NxtWave Gate Pass System
 * Usage: node scripts/generate-icons.js
 *
 * To generate VAPID keys for push notifications, run:
 * npx web-push generate-vapid-keys
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

function makeSvg(size, maskable = false) {
  // For maskable icons, add safe zone padding (10% each side)
  const padding = maskable ? Math.floor(size * 0.1) : Math.floor(size * 0.15);
  const innerSize = size - padding * 2;
  const fontSize = Math.floor(innerSize * 0.38);
  const subFontSize = Math.floor(innerSize * 0.14);
  const cx = size / 2;
  const cy = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1E40AF"/>
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${Math.floor(innerSize * 0.12)}" fill="#1E3A8A"/>
  <!-- NW letter mark -->
  <text x="${cx}" y="${cy - subFontSize * 0.6}"
        font-family="Arial Black, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="900"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle">NW</text>
  <!-- NxtWave label -->
  <text x="${cx}" y="${cy + fontSize * 0.55}"
        font-family="Arial, sans-serif"
        font-size="${subFontSize}"
        font-weight="600"
        fill="#93C5FD"
        text-anchor="middle"
        letter-spacing="1">GatePass</text>
</svg>`;
}

async function generateIcon(size, maskable = false) {
  const svg = makeSvg(size, maskable);
  const suffix = maskable ? '-maskable' : '';
  const filename = `icon-${size}x${size}${suffix}.png`;
  const outPath = path.join(ICONS_DIR, filename);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outPath);

  console.log(`✓ Generated ${filename}`);
}

async function main() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  console.log('Generating NxtWave Gate Pass PWA icons...\n');

  for (const size of SIZES) {
    await generateIcon(size, false);
  }

  // Maskable icon at 512x512 for Android adaptive icons
  await generateIcon(512, true);

  console.log('\nAll icons generated successfully!');
  console.log(`Icons saved to: ${ICONS_DIR}`);
}

main().catch(console.error);
