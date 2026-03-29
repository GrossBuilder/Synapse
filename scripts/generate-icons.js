/**
 * Generate PWA icons from logo-icon.svg
 * Usage: node scripts/generate-icons.js
 * Requires: npm install sharp
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT = path.join(__dirname, "..", "public", "logo-icon.svg");
const OUTPUT_DIR = path.join(__dirname, "..", "public", "icons");

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const size of SIZES) {
    const output = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(INPUT).resize(size, size).png().toFile(output);
    console.log(`✓ ${size}x${size}`);
  }

  // Also generate favicon.ico size
  const faviconPath = path.join(__dirname, "..", "public", "favicon.ico");
  if (!fs.existsSync(faviconPath)) {
    await sharp(INPUT).resize(32, 32).png().toFile(
      path.join(OUTPUT_DIR, "favicon-32x32.png")
    );
    console.log("✓ favicon 32x32");
  }

  console.log("\nDone! Icons saved to public/icons/");
}

main().catch(console.error);
