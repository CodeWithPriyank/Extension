# InterviewCopilot Technology Stack

## Core Technologies

### Browser Extension Framework
- **Chrome Extension**: Manifest V3
- **Firefox Extension**: WebExtensions API (Manifest V3 compatible)
- **Desktop Version**: Electron (optional, for system audio capture)

### Frontend Framework
- **UI Library**: React 18+ with TypeScript
- **Build Tool**: Vite (fast development and optimized builds)
- **Styling**: Tailwind CSS + CSS Modules
- **State Management**: Zustand or React Context API
- **UI Components**: Custom components (lightweight, no heavy dependencies)

### Backend/Processing
- **Language**: TypeScript (type-safe, better maintainability)
- **Background Service**: Service Worker (Chrome) / Background Script (Firefox)
- **Content Scripts**: For UI injection into video conference pages

## Speech-to-Text Options

### Primary: Web Speech API
- **Pros**: Free, browser-native, no API keys, low latency
- **Cons**: Lower accuracy, browser-dependent, limited languages
- **Implementation**: `webkitSpeechRecognition` or `SpeechRecognition`
- **Latency**: ~100-300ms

### Secondary: OpenAI Whisper API
- **Pros**: High accuracy, multiple languages, punctuation
- **Cons**: Requires API key, costs per minute, network dependency
- **Implementation**: REST API calls with streaming support
- **Latency**: ~500-1000ms (network dependent)
- **Cost**: ~$0.006 per minute

### Tertiary: Local Whisper Model
- **Pros**: Complete privacy, no API costs, works offline
- **Cons**: High resource usage, slower, larger bundle size
- **Implementation**: WebAssembly port of Whisper (whisper.cpp)
- **Latency**: ~2-5 seconds (device dependent)

## LLM Integration

### Primary: OpenAI GPT-4 / GPT-3.5-turbo
- **API**: OpenAI API
- **Models**: 
  - GPT-4: Best quality, slower, more expensive
  - GPT-3.5-turbo: Good balance, faster, cheaper
- **Streaming**: Yes (for real-time display)
- **Cost**: ~$0.03-0.06 per 1K tokens (GPT-4), ~$0.002 per 1K tokens (GPT-3.5)

### Alternative: Anthropic Claude
- **API**: Anthropic API
- **Models**: Claude 3 Opus, Sonnet, Haiku
- **Streaming**: Yes
- **Cost**: Similar to GPT-4

### Fallback: Local LLM (Optional)
- **Options**: Ollama, llama.cpp
- **Pros**: Privacy, no API costs
- **Cons**: Lower quality, requires powerful hardware

## Audio Processing

### Web Audio API
- **Purpose**: Audio capture, processing, buffering
- **APIs Used**:
  - `getUserMedia()`: Microphone access
  - `AudioContext`: Audio processing
  - `MediaRecorder`: Audio recording (optional)
- **Formats**: PCM, WAV for processing

### Audio Libraries
- **No external dependencies**: Use native Web Audio API
- **Optional**: `audio-buffer-utils` for audio manipulation

## Question Detection

### Text Analysis
- **Library**: Natural language processing
  - Option 1: Simple regex patterns (lightweight)
  - Option 2: Compromise NLP (small, client-side)
  - Option 3: spaCy.js (larger, more accurate)
- **Patterns**: Question words, punctuation, sentence structure

### Audio Analysis
- **Library**: Web Audio API for pitch detection
- **Algorithm**: FFT for frequency analysis
- **Patterns**: Rising intonation, pauses

## Data Storage

### Browser Storage APIs
- **chrome.storage.local**: Settings, resume, job descriptions
- **IndexedDB**: Large transcripts, session data
- **localStorage**: Simple key-value pairs (limited use)

### Encryption
- **Library**: Web Crypto API (native)
- **Algorithm**: AES-GCM for sensitive data
- **Key Management**: Derived from user password or device key

## Resume Parsing

### PDF Parsing
- **Library**: pdf.js (Mozilla) - client-side PDF parsing
- **Alternative**: Server-side parsing (if privacy allows)

### Document Parsing
- **PDF**: pdf.js
- **DOCX**: mammoth.js or docx.js
- **JSON**: Native parsing

### NLP for Extraction
- **Library**: Simple pattern matching + regex
- **Advanced**: Named Entity Recognition (if using NLP library)

## UI/UX Libraries

### Core
- **React**: Component framework
- **React Router**: Navigation (for settings, practice mode)
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations (optional, can be removed for smaller bundle)

### Icons
- **Lucide React**: Lightweight, tree-shakeable icons
- **Alternative**: Heroicons

### Charts (Analytics)
- **Recharts**: Lightweight React charting library
- **Alternative**: Chart.js with react-chartjs-2

## Development Tools

### Build & Bundling
- **Vite**: Fast build tool, HMR
- **TypeScript**: Type safety
- **ESLint**: Code quality
- **Prettier**: Code formatting

### Testing
- **Vitest**: Unit testing
- **Playwright**: E2E testing (optional)
- **Testing Library**: React component testing

### Development
- **Chrome DevTools**: Extension debugging
- **web-ext**: Firefox extension development tool

## API Integration

### HTTP Client
- **Fetch API**: Native, no dependencies
- **Alternative**: Axios (if needed for interceptors)

### Streaming
- **Server-Sent Events (SSE)**: For LLM streaming
- **WebSockets**: Alternative for real-time communication

## Security

### API Key Management
- **Storage**: Encrypted in chrome.storage.local
- **Encryption**: Web Crypto API
- **Never**: Expose in code, logs, or network requests (except to API)

### Content Security Policy
- **CSP**: Strict CSP in manifest
- **External Resources**: Whitelist only necessary domains

## Performance Optimization

### Code Splitting
- **Dynamic Imports**: Load modules on demand
- **Route-based**: Split by page/feature

### Caching
- **Service Worker**: Cache API responses
- **IndexedDB**: Cache suggestions, parsed resumes

### Bundle Size
- **Tree Shaking**: Remove unused code
- **Minification**: Production builds
- **Compression**: Gzip/Brotli

## Deployment

### Extension Distribution
- **Chrome Web Store**: For Chrome version
- **Firefox Add-ons**: For Firefox version
- **Self-hosted**: For Electron desktop version

### CI/CD
- **GitHub Actions**: Automated builds and testing
- **Versioning**: Semantic versioning

## Recommended Project Structure

```
interviewcopilot/
├── src/
│   ├── background/          # Service worker
│   ├── content/             # Content scripts
│   ├── popup/               # Extension popup
│   ├── options/             # Settings page
│   ├── overlay/             # Interview overlay UI
│   ├── components/          # Shared React components
│   ├── modules/             # Core modules
│   │   ├── audio/
│   │   ├── stt/
│   │   ├── question-detector/
│   │   ├── llm/
│   │   ├── data/
│   │   └── analytics/
│   ├── utils/               # Utilities
│   ├── types/               # TypeScript types
│   └── styles/              # Global styles
├── public/                  # Static assets
├── manifest.json            # Extension manifest
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Dependencies Summary

### Production Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "zustand": "^4.4.0",
  "tailwindcss": "^3.3.0",
  "lucide-react": "^0.294.0",
  "recharts": "^2.10.0"
}
```

### Development Dependencies
```json
{
  "typescript": "^5.2.0",
  "vite": "^5.0.0",
  "@types/chrome": "^0.0.250",
  "@types/react": "^18.2.0",
  "eslint": "^8.54.0",
  "prettier": "^3.1.0"
}
```

## API Costs Estimation (per interview)

### Typical 45-minute interview:
- **Speech-to-Text**: 
  - Web Speech API: $0 (free)
  - Whisper API: ~$0.27 (45 min × $0.006/min)
- **LLM Suggestions** (8 questions):
  - GPT-3.5-turbo: ~$0.10-0.20
  - GPT-4: ~$0.50-1.00
- **Total**:
  - Free tier (Web Speech + GPT-3.5): ~$0.10-0.20
  - Premium tier (Whisper + GPT-4): ~$0.77-1.27

## Browser Compatibility

### Minimum Versions
- **Chrome**: 88+ (Manifest V3 support)
- **Firefox**: 109+ (Manifest V3 support)
- **Edge**: 88+ (Chromium-based)
- **Safari**: Not supported (different extension model)

## Performance Targets

- **STT Latency**: < 500ms (Web Speech) or < 1s (API)
- **LLM Response**: < 3s for first token, < 10s for complete response
- **UI Update**: < 100ms after suggestion received
- **Memory Usage**: < 200MB during active interview
- **CPU Usage**: < 20% on average hardware

