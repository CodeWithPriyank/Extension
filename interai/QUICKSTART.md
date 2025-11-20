# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create Icons (Required)
You need icon files for the extension. Create or download:
- `src/icons/icon16.png` (16x16 pixels)
- `src/icons/icon48.png` (48x48 pixels)  
- `src/icons/icon128.png` (128x128 pixels)

**Quick Option**: Use any image editor or online icon generator. Even simple colored squares work for testing.

### Step 3: Build
```bash
npm run build
```

### Step 4: Load in Chrome
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

### Step 5: Configure
1. Click the extension icon
2. Click "Settings"
3. **LLM Tab**: Enter your OpenAI API key
4. **Resume Tab**: Upload `examples/resume-example.json` (or create your own)
5. **Jobs Tab**: Add a job description

### Step 6: Test
1. Go to a video call (Zoom, Google Meet, etc.)
2. Click extension icon → "Start Interview"
3. Speak a question like "Tell me about yourself"
4. Watch the overlay appear with suggestions!

## 🎯 What You'll See

- **Popup**: Start/stop interview, check status
- **Overlay**: Appears on video pages, shows questions and suggestions
- **Settings**: Configure API keys, resume, job descriptions

## ⚠️ Troubleshooting

**Extension won't load?**
- Check `dist/manifest.json` exists
- Verify icons are in `dist/icons/`
- Check browser console for errors

**No suggestions appearing?**
- Verify API key is correct
- Check resume and job description are uploaded
- Ensure internet connection works
- Check browser console for API errors

**Microphone not working?**
- Grant permission in browser
- Check system microphone settings
- Try refreshing the page

## 📚 Next Steps

- Read `README.md` for full documentation
- Check `docs/` for detailed guides
- See `PROJECT_SUMMARY.md` for what's built
- Review `SETUP.md` for detailed setup

## 💡 Tips

- Use GPT-3.5-turbo for lower costs during testing
- Keep resume JSON format simple (see example)
- Job descriptions can be pasted as plain text
- Overlay can be closed/minimized during interview

---

**Ready to go!** 🎉

