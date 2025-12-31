// Generate a placeholder screenshot for PWA manifest
const fs = require('fs');
const path = require('path');

// SVG content for a mobile screenshot placeholder (390x844 - iPhone 14 size)
const screenshotSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="390" height="844" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="390" height="844" fill="#f3f4f6"/>

  <!-- Header -->
  <rect width="390" height="60" fill="#3b82f6"/>
  <text x="195" y="38" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">Lead CRM</text>

  <!-- Content placeholder -->
  <rect x="20" y="80" width="350" height="120" rx="8" fill="white"/>
  <rect x="40" y="100" width="100" height="20" rx="4" fill="#e5e7eb"/>
  <rect x="40" y="130" width="200" height="16" rx="4" fill="#e5e7eb"/>
  <rect x="40" y="156" width="150" height="16" rx="4" fill="#e5e7eb"/>

  <rect x="20" y="220" width="350" height="120" rx="8" fill="white"/>
  <rect x="40" y="240" width="100" height="20" rx="4" fill="#e5e7eb"/>
  <rect x="40" y="270" width="200" height="16" rx="4" fill="#e5e7eb"/>
  <rect x="40" y="296" width="150" height="16" rx="4" fill="#e5e7eb"/>

  <!-- Bottom text -->
  <text x="195" y="780" font-family="Arial, sans-serif" font-size="16" fill="#6b7280" text-anchor="middle">Sales Portal</text>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');

// Write screenshot SVG (we'll convert to PNG later if needed)
fs.writeFileSync(
  path.join(publicDir, 'screenshot-mobile.svg'),
  screenshotSVG
);

console.log('✅ Generated screenshot-mobile.svg');
console.log('Note: You can convert this to PNG using an online tool or image editor');
