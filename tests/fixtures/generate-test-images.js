/**
 * Generate test images for Photos API integration tests
 * 
 * Creates various test images:
 * - test-image.jpg: Standard test image (640x480)
 * - test-image-small.jpg: Small image (320x240)
 * - test-image-large.jpg: Large image (1920x1080)
 * - blank-image.jpg: Blank white image for OCR testing
 * - image-with-text.png: Image with text overlay for OCR testing
 */

const sharp = require('sharp');
const path = require('path');

async function generateTestImages() {
  const fixturesDir = __dirname;

  // 1. Standard test image (640x480, blue gradient)
  await sharp({
    create: {
      width: 640,
      height: 480,
      channels: 3,
      background: { r: 50, g: 100, b: 200 }
    }
  })
    .jpeg({ quality: 80 })
    .toFile(path.join(fixturesDir, 'test-image.jpg'));

  // 2. Small test image (320x240, green)
  await sharp({
    create: {
      width: 320,
      height: 240,
      channels: 3,
      background: { r: 50, g: 200, b: 50 }
    }
  })
    .jpeg({ quality: 80 })
    .toFile(path.join(fixturesDir, 'test-image-small.jpg'));

  // 3. Large test image (1920x1080, red gradient)
  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 3,
      background: { r: 200, g: 50, b: 50 }
    }
  })
    .jpeg({ quality: 80 })
    .toFile(path.join(fixturesDir, 'test-image-large.jpg'));

  // 4. Blank white image for OCR testing
  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
    .jpeg({ quality: 90 })
    .toFile(path.join(fixturesDir, 'blank-image.jpg'));

  // 5. Image with text overlay (for OCR testing)
  const textSvg = `
    <svg width="800" height="600">
      <rect width="800" height="600" fill="white"/>
      <text x="400" y="300" font-size="48" text-anchor="middle" fill="black">
        INSPECTION 12345
      </text>
    </svg>
  `;
  
  await sharp(Buffer.from(textSvg))
    .png()
    .toFile(path.join(fixturesDir, 'image-with-text.png'));

  // 6. Another test image for comparison/duplication tests
  await sharp({
    create: {
      width: 640,
      height: 480,
      channels: 3,
      background: { r: 100, g: 50, b: 200 }
    }
  })
    .jpeg({ quality: 80 })
    .toFile(path.join(fixturesDir, 'test-image-2.jpg'));

  // 7. PNG format test image
  await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 4, // RGBA
      background: { r: 200, g: 100, b: 50, alpha: 1 }
    }
  })
    .png()
    .toFile(path.join(fixturesDir, 'test-image.png'));

  // 8. Non-image file for testing invalid uploads (text file)
  const fs = require('fs');
  fs.writeFileSync(
    path.join(fixturesDir, 'test-file.txt'),
    'This is a text file, not an image.'
  );

  console.log('✅ Test images generated successfully in tests/fixtures/');
}

generateTestImages().catch(console.error);
