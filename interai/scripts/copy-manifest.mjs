import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Copy manifest to dist
const distDir = resolve(rootDir, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy manifest
const manifestSrc = resolve(rootDir, 'src/manifest.json');
const manifestDest = resolve(distDir, 'manifest.json');
if (existsSync(manifestSrc)) {
  copyFileSync(manifestSrc, manifestDest);
  console.log('✓ Manifest copied');
} else {
  console.warn('⚠ Manifest not found at', manifestSrc);
}

// Copy icons directory if it exists
const iconsSrc = resolve(rootDir, 'src/icons');
const iconsDest = resolve(distDir, 'icons');
if (existsSync(iconsSrc)) {
  // Create icons directory
  if (!existsSync(iconsDest)) {
    mkdirSync(iconsDest, { recursive: true });
  }
  
  // Copy all icon files
  try {
    const files = readdirSync(iconsSrc);
    files.forEach(file => {
      const srcFile = join(iconsSrc, file);
      const destFile = join(iconsDest, file);
      if (statSync(srcFile).isFile() && file.match(/\.(png|jpg|jpeg|svg)$/i)) {
        copyFileSync(srcFile, destFile);
        console.log(`✓ Copied icon: ${file}`);
      }
    });
  } catch (error) {
    console.warn('⚠ Could not copy icons:', error.message);
  }
} else {
  console.warn('⚠ Icons directory not found. Please create icons in src/icons/');
}

// Copy content styles
const contentStylesSrc = resolve(rootDir, 'src/content/styles.css');
const contentStylesDest = resolve(distDir, 'content/styles.css');
if (existsSync(contentStylesSrc)) {
  const contentDir = resolve(distDir, 'content');
  if (!existsSync(contentDir)) {
    mkdirSync(contentDir, { recursive: true });
  }
  copyFileSync(contentStylesSrc, contentStylesDest);
  console.log('✓ Content styles copied');
}

// Fix HTML files - update asset paths to be relative
const popupHtml = resolve(distDir, 'popup', 'index.html');
if (existsSync(popupHtml)) {
  let content = readFileSync(popupHtml, 'utf-8');
  // Replace absolute paths with relative paths
  content = content.replace(/src="\/assets\//g, 'src="../assets/');
  content = content.replace(/href="\/assets\//g, 'href="../assets/');
  writeFileSync(popupHtml, content, 'utf-8');
  console.log('✓ Fixed popup HTML paths');
}

const optionsHtml = resolve(distDir, 'options', 'index.html');
if (existsSync(optionsHtml)) {
  let content = readFileSync(optionsHtml, 'utf-8');
  // Replace absolute paths with relative paths
  content = content.replace(/src="\/assets\//g, 'src="../assets/');
  content = content.replace(/href="\/assets\//g, 'href="../assets/');
  writeFileSync(optionsHtml, content, 'utf-8');
  console.log('✓ Fixed options HTML paths');
}

// Also check assets directory for HTML files
const assetsDir = resolve(distDir, 'assets');
if (existsSync(assetsDir)) {
  try {
    const files = readdirSync(assetsDir);
    files.forEach(file => {
      if (file.includes('popup') && file.endsWith('.html')) {
        const src = join(assetsDir, file);
        const dest = resolve(distDir, 'popup', 'index.html');
        const popupDir = resolve(distDir, 'popup');
        if (!existsSync(popupDir)) {
          mkdirSync(popupDir, { recursive: true });
        }
        copyFileSync(src, dest);
        console.log('✓ Popup HTML moved from assets');
      }
      if (file.includes('options') && file.endsWith('.html')) {
        const src = join(assetsDir, file);
        const dest = resolve(distDir, 'options', 'index.html');
        const optionsDir = resolve(distDir, 'options');
        if (!existsSync(optionsDir)) {
          mkdirSync(optionsDir, { recursive: true });
        }
        copyFileSync(src, dest);
        console.log('✓ Options HTML moved from assets');
      }
    });
  } catch (error) {
    // Ignore errors
  }
}

// Copy PDF.js worker file
const pdfWorkerSrc = resolve(rootDir, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const pdfWorkerAssetsDir = resolve(distDir, 'assets');
if (existsSync(pdfWorkerSrc)) {
  if (!existsSync(pdfWorkerAssetsDir)) {
    mkdirSync(pdfWorkerAssetsDir, { recursive: true });
  }
  const pdfWorkerDest = join(pdfWorkerAssetsDir, 'pdf.worker.min.mjs');
  copyFileSync(pdfWorkerSrc, pdfWorkerDest);
  console.log('✓ PDF.js worker copied');
} else {
  console.warn('⚠ PDF.js worker not found at', pdfWorkerSrc);
}

console.log('Build assets copied successfully!');

