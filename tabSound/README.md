# TabSound Browser Extension

TabSound identifies which browser tab is playing audio and provides an inline volume/mute controller without switching tabs. Perfect for quickly finding and controlling noisy tabs like autoplay ads or background videos.

## Features

- 🎵 **Audio Detection** - Automatically detects audio playback across all tabs
- 🎚️ **Volume Control** - Adjust volume of any tab without switching to it
- 🔇 **Mute/Unmute** - Quickly mute or unmute audio from any tab
- 👁️ **Visual Indicators** - See which tabs are playing audio with badges and icons
- ⚡ **Real-time Updates** - Instant updates as audio state changes
- 🎨 **Modern UI** - Beautiful, intuitive interface

## Installation

### Development Setup

1. **Clone or download this repository**

2. **Generate extension icons:**
   - Open `icons/create_icons.html` in your browser
   - Click "Generate Icons" then "Download All Icons"
   - Save the downloaded PNG files to the `icons/` folder
   - Or use your own icons: place `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build the extension:**
   ```bash
   npm run build
   ```
   This creates a `dist/` folder with the extension files.

5. **Load the extension in Chrome/Edge:**
   - Open Chrome or Edge browser
   - Navigate to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist/` folder from this project

6. **Load the extension in Firefox:**
   - Open Firefox
   - Navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the `dist/` folder

## Development

### Project Structure

```
tabSound/
├── manifest.json          # Extension manifest (Manifest V3)
├── background/            # Background service worker
│   └── background.js     # Coordinates audio detection
├── content/              # Content scripts
│   └── content.js        # Detects audio in each tab
├── popup/                # Extension popup UI
│   ├── popup.html        # Popup HTML
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup logic
├── icons/                # Extension icons
├── backend/              # Backend services (optional)
├── dist/                 # Built extension (generated)
└── package.json          # Node.js dependencies
```

### Build Commands

- `npm run build` - Build the extension once
- `npm run dev` - Build and watch for changes
- `npm run package` - Build and create a zip file for distribution

### How It Works

1. **Detection Phase:**
   - Content scripts are injected into each tab
   - Scripts monitor `<audio>`, `<video>`, and Web Audio API usage
   - Background worker aggregates audio state from all tabs
   - Tracks which tabs are actively playing audio

2. **Display Phase:**
   - Extension badge shows count of tabs playing audio
   - Popup displays all tabs with active audio
   - Shows tab title, favicon, and URL

3. **Control Phase:**
   - Volume slider adjusts the tab's audio volume
   - Mute button toggles audio on/off
   - Changes apply instantly without switching tabs

## Browser Compatibility

- ✅ Chrome/Chromium (Manifest V3)
- ✅ Microsoft Edge (Manifest V3)
- ✅ Firefox (WebExtensions API)
- ⚠️ Safari (may require adjustments)

## Limitations

- Some browser-protected pages (chrome://, edge://, etc.) cannot have content scripts injected
- Volume control works on HTML5 audio/video elements; some embedded players may not be controllable
- Web Audio API detection is limited to context state monitoring

## Chrome Profiles

**Each Chrome profile has its own extension instance.** This means:

- ✅ **Separate installations**: If you use multiple Chrome profiles, you'll need to install TabSound in each profile separately
- ✅ **Isolated data**: Each profile's extension maintains its own state and doesn't interfere with other profiles
- ✅ **Independent settings**: Settings and preferences are per-profile

**To install in multiple profiles:**
1. Switch to the desired Chrome profile
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder
5. Repeat for each profile you want to use TabSound in

This is standard Chrome extension behavior and ensures privacy and isolation between profiles.

## Troubleshooting

### Extension shows tabs that aren't playing audio

- Refresh the extension: Go to `chrome://extensions/`, click refresh on TabSound, then refresh the problematic tab
- The extension uses content script detection - some sites may have hidden audio elements

### Extension not detecting audio

- Refresh the tab after installing the extension
- Check browser console for errors (F12 → Console)
- Some sites may block content scripts or use custom audio players
- Make sure the extension has permission to access all URLs

### Volume control not working

- The site must use standard HTML5 `<audio>` or `<video>` elements
- Some sites use custom audio implementations that may not be controllable
- Audio in cross-origin iframes cannot be controlled
- Try refreshing the tab after installing the extension

### Badge not updating

- Click the refresh button in the popup
- Wait a moment (updates happen every 1-2 seconds)
- Reload the extension if needed

### Muted tabs disappearing

- Muted tabs should stay in the list - if they disappear, refresh the extension
- Tabs are only removed when video/audio actually stops (paused/ended), not when muted

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Future Enhancements

- [ ] Per-tab audio visualization
- [ ] Keyboard shortcuts for quick control
- [ ] Settings page for customization
- [ ] Audio history/logging
- [ ] Cross-device sync (requires backend)
- [ ] Support for more audio sources

