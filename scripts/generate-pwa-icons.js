import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [96, 144, 180, 192, 256, 512];
const outputDir = path.join(__dirname, '../client/public/icons');

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  await fs.mkdir(outputDir, { recursive: true });

  const svgIcon = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3B6FD4;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2E5BBA;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Rounded background -->
      <rect width="512" height="512" rx="80" fill="url(#grad1)"/>
      
      <!-- House structure -->
      <g transform="translate(100, 120)">
        <!-- House body -->
        <rect x="40" y="120" width="232" height="200" fill="white" opacity="0.95" rx="8"/>
        
        <!-- Roof -->
        <path d="M 20 120 L 156 40 L 292 120 L 260 120 L 156 70 L 52 120 Z" fill="white" opacity="0.95"/>
        
        <!-- Door -->
        <rect x="120" y="220" width="72" height="100" fill="#2E5BBA" rx="4"/>
        <circle cx="172" cy="270" r="4" fill="white"/>
        
        <!-- Windows -->
        <rect x="60" y="160" width="48" height="48" fill="#2E5BBA" rx="4"/>
        <rect x="204" y="160" width="48" height="48" fill="#2E5BBA" rx="4"/>
        
        <!-- Window panes -->
        <line x1="84" y1="160" x2="84" y2="208" stroke="white" stroke-width="2"/>
        <line x1="60" y1="184" x2="108" y2="184" stroke="white" stroke-width="2"/>
        <line x1="228" y1="160" x2="228" y2="208" stroke="white" stroke-width="2"/>
        <line x1="204" y1="184" x2="252" y2="184" stroke="white" stroke-width="2"/>
      </g>
      
      <!-- Checkmark circle -->
      <circle cx="380" cy="380" r="72" fill="#28A745"/>
      <path d="M 350 380 L 370 400 L 410 350" stroke="white" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    await sharp(Buffer.from(svgIcon))
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated ${size}x${size} icon`);
  }

  console.log('\n✅ All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
