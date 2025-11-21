# 📋 Clipboard History for Devs

A smart browser extension that keeps track of everything you've copied — code snippets, commands, links, etc. — and makes them instantly reusable with syntax highlighting, auto-tagging, and developer shortcuts.

## ✨ Features

### 🪄 Smart Clipboard Manager
- Saves your last 20 copied snippets (configurable)
- Works across web pages, IDEs-in-browser, and docs
- Detects code type (JS, HTML, JSON, Python, etc.) and syntax highlights automatically

### 🧠 Smart Snippet Recognition
- Auto-tags snippets:
  - `npm install` → tagged as `command`
  - `function handleClick()` → tagged as `javascript` + `function`
  - `{ 'key': 'value' }` → tagged as `json` + `data`
- Quick search and filter by tags

### 🧩 Developer Shortcuts
- **Ctrl+Shift+V** (Cmd+Shift+V on Mac) → opens snippet picker
- One-click copy back to clipboard
- Local storage persistence

### 🧰 Snippet Notes
- Add notes to any saved snippet (e.g., "used for login bug fix")
- Star/favorite snippets for quick reuse
- Delete unwanted snippets

## 🚀 Installation

### Chrome/Edge/Brave

1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `clipboard_snippet` folder
6. The extension icon should appear in your toolbar

### Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this folder

## 🎯 Usage

1. **Copy anything** - The extension automatically saves your clipboard history
2. **Open the picker** - Click the extension icon or press `Ctrl+Shift+V`
3. **Search & Filter** - Use the search bar or click tag filters
4. **Copy again** - Click any snippet to copy it back to clipboard
5. **Add notes** - Click in the note field to add context
6. **Star favorites** - Click the star icon to mark important snippets

## 🛠️ Development

The extension is built with:
- **Manifest V3** (Chrome extension standard)
- **Prism.js** for syntax highlighting
- **Vanilla JavaScript** (no frameworks)
- **Chrome Storage API** for persistence

### File Structure

```
clipboard_snippet/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for clipboard monitoring
├── content.js         # Content script for web page clipboard detection
├── popup.html         # Main UI
├── popup.js           # Popup logic
├── popup.css          # Styles
├── icons/             # Extension icons
└── README.md          # This file
```

## 🔒 Privacy

- All data is stored **locally** on your device
- No data is sent to external servers
- No tracking or analytics
- Your clipboard history stays private

## 📝 License

MIT License - feel free to use and modify!

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 🐛 Known Issues

- Clipboard monitoring may be limited on some websites due to browser security policies
- Some special pages (chrome://, extension pages) may not support clipboard access

## 🔮 Future Enhancements

- [ ] GitHub Gist sync
- [ ] Export/import snippets
- [ ] Customizable max snippets count

## ✨ Recently Added

- ✅ **More code language detection** - Now supports TypeScript, Java, C/C++, Go, Rust, PHP, Ruby, Swift, Kotlin, YAML, XML, and more
- ✅ **Dark/light theme toggle** - Beautiful theme switcher with smooth transitions and persistent preferences
- ✅ **Keyboard navigation** - Navigate snippets with arrow keys, press Enter to copy, Escape to cancel, and `/` to focus search

