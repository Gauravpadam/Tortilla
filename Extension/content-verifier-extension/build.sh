#!/bin/bash

# Simple build script for Content Verifier Extension
# This script copies files to the dist directory for manual extension loading

echo "Building Content Verifier Extension..."

# Create dist directory
mkdir -p dist/src/extension
mkdir -p dist/src/backend
mkdir -p dist/src/shared
mkdir -p dist/icons

# Copy extension files
echo "Copying extension files..."
cp src/extension/*.js dist/src/extension/
cp src/extension/*.html dist/src/extension/
cp src/extension/*.css dist/src/extension/

# Copy backend files
echo "Copying backend files..."
cp src/backend/*.js dist/src/backend/

# Copy shared files
echo "Copying shared files..."
cp src/shared/*.js dist/src/shared/

# Copy manifest and package files
echo "Copying configuration files..."
cp manifest.json dist/
cp package.json dist/

# Create placeholder icons
echo "Creating placeholder icons..."
echo "Creating placeholder icon files..."

# Create a simple SVG icon for testing
cat > dist/icons/icon16.svg << 'EOF'
<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
  <rect width="16" height="16" fill="#007bff"/>
  <text x="8" y="12" font-family="Arial" font-size="12" fill="white" text-anchor="middle">CV</text>
</svg>
EOF

cat > dist/icons/icon48.svg << 'EOF'
<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" fill="#007bff"/>
  <text x="24" y="32" font-family="Arial" font-size="24" fill="white" text-anchor="middle">CV</text>
</svg>
EOF

cat > dist/icons/icon128.svg << 'EOF'
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#007bff"/>
  <text x="64" y="80" font-family="Arial" font-size="48" fill="white" text-anchor="middle">CV</text>
</svg>
EOF

# Convert SVG to PNG using ImageMagick if available, otherwise create text files
if command -v convert &> /dev/null; then
    echo "Converting SVG icons to PNG..."
    convert dist/icons/icon16.svg dist/icons/icon16.png
    convert dist/icons/icon48.svg dist/icons/icon48.png
    convert dist/icons/icon128.svg dist/icons/icon128.png
else
    echo "ImageMagick not found, creating text-based icons..."
    echo "PNG" > dist/icons/icon16.png
    echo "PNG" > dist/icons/icon48.png
    echo "PNG" > dist/icons/icon128.png
fi

echo "Build complete! Extension files are in the dist/ directory."
echo ""
echo "To load the extension in Chrome/Edge:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select the dist/ folder"
echo ""
echo "Note: You may need to manually convert SVG icons to PNG format"
echo "or use an online converter for the icon files."
