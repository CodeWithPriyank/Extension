# Installation Guide

## Quick Start

### Chrome/Edge/Brave

1. Open your browser and go to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`

2. Enable **Developer mode** (toggle in the top-right corner)

3. Click **"Load unpacked"** or **"Load extension"**

4. Select the `clipboard_snippet` folder

5. The extension icon should appear in your toolbar!

### Firefox

1. Open Firefox and go to `about:debugging`

2. Click **"This Firefox"** in the left sidebar

3. Click **"Load Temporary Add-on"**

4. Navigate to and select the `manifest.json` file

5. The extension will load (note: it's temporary and will be removed on browser restart)

## First Use

1. **Copy something** - Try copying some code or text from any webpage

2. **Open the extension** - Click the extension icon in your toolbar, or press `Ctrl+Shift+V` (Cmd+Shift+V on Mac)

3. **Your clipboard history** should appear with syntax highlighting!

## Troubleshooting

### Extension not capturing clipboard?

- Make sure you've granted necessary permissions when prompted
- Some websites (like chrome:// pages) may restrict clipboard access
- Try copying from a regular webpage first

### Icons not showing?

- The extension includes minimal placeholder icons
- For better icons, open `generate_icons.html` in your browser and download the icons
- Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

### Keyboard shortcut not working?

- Go to `chrome://extensions/shortcuts` (or your browser's equivalent)
- Make sure the shortcut is enabled and not conflicting with another extension

## Privacy Note

All your clipboard history is stored **locally** on your device. Nothing is sent to any server. Your data stays private!

