/**
 * Vite plugin to properly structure extension output
 */
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function extensionPlugin() {
  return {
    name: 'extension-plugin',
    writeBundle(options, bundle) {
      // This runs after the bundle is written
      // Move HTML files to correct locations and fix asset paths
      const outDir = options.dir || 'dist';
      
      // Find and move HTML files
      const htmlFiles = Object.keys(bundle).filter(key => key.endsWith('.html'));
      
      htmlFiles.forEach(file => {
        const srcPath = resolve(outDir, file);
        let destPath;
        let relativeAssetPath;
        
        if (file.includes('popup')) {
          destPath = resolve(outDir, 'popup', 'index.html');
          relativeAssetPath = '../assets/';
          const popupDir = dirname(destPath);
          if (!existsSync(popupDir)) {
            mkdirSync(popupDir, { recursive: true });
          }
        } else if (file.includes('options')) {
          destPath = resolve(outDir, 'options', 'index.html');
          relativeAssetPath = '../assets/';
          const optionsDir = dirname(destPath);
          if (!existsSync(optionsDir)) {
            mkdirSync(optionsDir, { recursive: true });
          }
        }
        
        if (destPath && existsSync(srcPath)) {
          // Read the HTML file
          let htmlContent = readFileSync(srcPath, 'utf-8');
          
          // Fix asset paths: replace /assets/ with ../assets/
          htmlContent = htmlContent.replace(/\/assets\//g, '../assets/');
          
          // Write to destination
          writeFileSync(destPath, htmlContent, 'utf-8');
          console.log(`✓ Moved and fixed ${file} to ${destPath}`);
        }
      });
    },
  };
}

