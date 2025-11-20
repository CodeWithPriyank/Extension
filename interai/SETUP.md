# Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Chrome or Edge browser (for testing)
- OpenAI API key (for LLM features)

## Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Icon Files**
   - Create or download icon files (16x16, 48x48, 128x128 pixels)
   - Place them in `src/icons/` directory:
     - `icon16.png`
     - `icon48.png`
     - `icon128.png`
   - You can use a simple placeholder or icon generator

3. **Build the Extension**
   ```bash
   npm run build
   ```

4. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` directory from this project

## Configuration

1. **Set Up API Key**
   - Click the extension icon
   - Click "Settings"
   - Go to "LLM" tab
   - Enter your OpenAI API key
   - Select a model (GPT-3.5 Turbo recommended)

2. **Upload Resume**
   - Go to Settings → Resume tab
   - Upload a JSON file (see `examples/resume-example.json` for format)
   - Or manually create a JSON file following the schema in `docs/DATA_SCHEMA.md`

3. **Add Job Description**
   - Go to Settings → Jobs tab
   - Click "Add Job Description"
   - Enter job title, company, and description

## Testing

1. **Start a Test Interview**
   - Navigate to a video conference (Zoom, Google Meet, etc.)
   - Click the extension icon
   - Click "Start Interview"
   - The overlay should appear

2. **Test Question Detection**
   - Speak a question (e.g., "Tell me about yourself")
   - The extension should detect it and show a suggestion

## Troubleshooting

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 18+)

### Extension Not Loading
- Check browser console for errors
- Verify manifest.json is in dist/ directory
- Make sure icons exist (or create placeholder icons)

### Microphone Not Working
- Grant microphone permission in browser
- Check system microphone settings
- Try refreshing the page

### Suggestions Not Appearing
- Verify API key is correct
- Check internet connection
- Ensure resume and job description are uploaded
- Check browser console for errors

## Development

### Watch Mode
```bash
npm run dev
```
This will rebuild automatically on file changes.

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## Next Steps

- See `docs/MVP_BACKLOG.md` for planned features
- Check `README.md` for usage instructions
- Review `docs/ARCHITECTURE.md` for system design

