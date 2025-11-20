#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

const sourceDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// Files and directories to copy
const filesToCopy = [
  'manifest.json',
  'background',
  'content',
  'popup',
  'icons'
];

async function build() {
  console.log('Building TabSound extension...');

  // Clean dist directory
  if (fs.existsSync(distDir)) {
    await fs.remove(distDir);
  }
  await fs.ensureDir(distDir);

  // Copy files
  for (const item of filesToCopy) {
    const sourcePath = path.join(sourceDir, item);
    const destPath = path.join(distDir, item);

    if (fs.existsSync(sourcePath)) {
      const stat = fs.statSync(sourcePath);
      if (stat.isDirectory()) {
        await fs.copy(sourcePath, destPath);
        console.log(`Copied directory: ${item}`);
      } else {
        await fs.copy(sourcePath, destPath);
        console.log(`Copied file: ${item}`);
      }
    } else {
      console.warn(`Warning: ${item} not found`);
    }
  }

  console.log('Build complete! Output directory: dist/');
  console.log('\nTo load the extension:');
  console.log('1. Open Chrome/Edge and go to chrome://extensions/');
  console.log('2. Enable "Developer mode"');
  console.log('3. Click "Load unpacked" and select the dist/ folder');
}

// Run build
build().catch(console.error);

// Watch mode
if (isWatch) {
  console.log('Watching for changes...');
  try {
    const chokidar = require('chokidar');
    chokidar.watch(filesToCopy.map(f => path.join(sourceDir, f))).on('change', () => {
      console.log('Change detected, rebuilding...');
      build().catch(console.error);
    });
  } catch (error) {
    console.warn('chokidar not installed. Install it with: npm install --save-dev chokidar');
    console.warn('Watch mode disabled. Falling back to manual builds.');
  }
}

