// Simple script to generate PWA icons using SVG
const fs = require('fs');
const path = require('path');

// SVG content for the icon (blue background with white "L")
const createSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6"/>
  <text
    x="50%"
    y="50%"
    font-family="Arial, sans-serif"
    font-size="${size * 0.6}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central">L</text>
</svg>`;

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 icon
fs.writeFileSync(
  path.join(publicDir, 'icon-192.svg'),
  createSVG(192)
);

// Generate 512x512 icon
fs.writeFileSync(
  path.join(publicDir, 'icon-512.svg'),
  createSVG(512)
);

console.log('✅ Generated icon-192.svg and icon-512.svg');
console.log('Note: Modern browsers support SVG icons for PWAs');
