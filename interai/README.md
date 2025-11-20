# InterviewCopilot

A real-time AI assistant browser extension that helps job candidates during video interviews by providing intelligent answer suggestions based on their resume, job description, and interview questions.

## Overview

InterviewCopilot listens to interview audio, transcribes speech in real-time, detects questions, and generates tailored answer suggestions using LLM technology. The extension provides a discreet overlay interface that only the user can see, ensuring a natural interview experience while offering valuable support.

## Features

- **Real-time Speech-to-Text**: Transcribes interview audio with minimal latency using Web Speech API
- **Question Detection**: Automatically identifies when questions are asked using text and audio analysis
- **AI-Powered Suggestions**: Generates personalized answers using OpenAI GPT models
- **Discreet UI**: Overlay interface visible only to the user
- **Privacy-First**: Local processing where possible, secure data handling
- **Easy Setup**: Simple configuration through settings page

## Installation

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd interai
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

### Production Build

```bash
npm run build
```

The extension will be built in the `dist` directory.

## Usage

### Initial Setup

1. **Configure API Key**:
   - Click the extension icon
   - Go to Settings
   - Navigate to "LLM" tab
   - Enter your OpenAI API key
   - Select model (GPT-3.5 Turbo recommended for cost, GPT-4 for quality)

2. **Upload Resume**:
   - Go to Settings → Resume tab
   - Upload a JSON file with your resume data
   - See `docs/DATA_SCHEMA.md` for the expected format

3. **Add Job Description**:
   - Go to Settings → Jobs tab
   - Click "Add Job Description"
   - Enter job title, company, and description

### Starting an Interview

1. Navigate to your video conference (Zoom, Google Meet, etc.)
2. Click the extension icon
3. Click "Start Interview"
4. The overlay will appear on your screen
5. Questions will be detected automatically and suggestions will appear

### During the Interview

- Questions are detected automatically
- Suggestions appear in the overlay
- You can minimize/close the overlay as needed
- Click "Stop Interview" when done

## Project Structure

```
src/
├── background/          # Service worker (core logic)
├── content/             # Content scripts (UI injection)
├── popup/               # Extension popup
├── options/             # Settings page
├── modules/             # Core modules
│   ├── audio/          # Audio capture
│   ├── stt/            # Speech-to-text
│   ├── question-detector/  # Question detection
│   ├── llm/            # LLM integration
│   └── data/           # Data management
├── types/              # TypeScript types
└── manifest.json       # Extension manifest
```

## Configuration

### Resume Format (JSON)

```json
{
  "personalInfo": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "summary": "Experienced software engineer..."
  },
  "workExperience": [
    {
      "id": "1",
      "company": "Tech Corp",
      "position": "Senior Engineer",
      "startDate": "2020-01-01",
      "endDate": null,
      "isCurrent": true,
      "description": "Led development of...",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [...],
  "skills": {
    "technical": ["JavaScript", "React", "Node.js"],
    "soft": ["Leadership", "Communication"]
  },
  "projects": [...]
}
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System design and components
- [User Flows](./docs/USER_FLOWS.md) - Interaction patterns
- [Data Schema](./docs/DATA_SCHEMA.md) - Data structures
- [UI Design](./docs/UI_WIREFRAMES.md) - Interface layouts
- [Technology Stack](./docs/TECHNOLOGY_STACK.md) - APIs and frameworks
- [Privacy & Security](./docs/PRIVACY_SECURITY.md) - Data handling
- [MVP Backlog](./docs/MVP_BACKLOG.md) - Development roadmap

## Privacy & Security

- All data stored locally in browser
- API keys encrypted in storage
- Transcripts auto-deleted after 7 days (configurable)
- No data shared with third parties (except LLM API for suggestions)
- See [Privacy & Security Guide](./docs/PRIVACY_SECURITY.md) for details

## Limitations

- Currently requires JSON resume format (PDF/DOCX parsing coming soon)
- Web Speech API accuracy varies by browser and accent
- Requires OpenAI API key (costs apply)
- Works best with clear audio and minimal background noise

## Troubleshooting

### Microphone Permission Denied
- Grant microphone permission in browser settings
- Check system microphone permissions

### Suggestions Not Appearing
- Verify API key is configured correctly
- Check internet connection
- Ensure resume and job description are uploaded

### Transcription Not Working
- Check microphone is working
- Ensure Web Speech API is supported (Chrome/Edge recommended)
- Try refreshing the page

## Development

### Running in Development Mode

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Roadmap

See [MVP Backlog](./docs/MVP_BACKLOG.md) for planned features:
- Enhanced UI with editing capabilities
- Post-interview analytics
- Practice mode
- PDF/DOCX resume parsing
- Multiple LLM provider support
- Firefox extension

## License

[To be determined]

## Contributing

[Contributing guidelines to be added]

## Support

[Support information to be added]
