# InterviewCopilot Architecture

## System Overview

InterviewCopilot is built as a modular browser extension (Chrome/Firefox) with optional Electron desktop version. The architecture separates concerns into distinct modules that communicate through well-defined interfaces.

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser/Desktop                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Extension UI Layer (React/Vue)              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │
│  │  │ Overlay  │  │ Sidebar  │  │ Settings │  │ Practice│ │  │
│  │  │ Component│  │ Component│  │  Page    │  │  Mode   │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↕                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Extension Background Service                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ Audio        │  │ Question     │  │ UI State     │   │  │
│  │  │ Manager      │  │ Detector     │  │ Manager      │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↕                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Core Processing Modules                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ Speech-to-   │  │ LLM          │  │ Data         │   │  │
│  │  │ Text Engine  │  │ Integration  │  │ Manager      │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↕                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Local Storage Layer                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ Resume       │  │ Job Desc     │  │ Transcripts  │   │  │
│  │  │ Storage      │  │ Storage      │  │ (Temporary)  │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────────┐
│                    External Services (Optional)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Speech-to-   │  │ LLM API      │  │ Analytics    │         │
│  │ Text API     │  │ (OpenAI/     │  │ Service      │         │
│  │ (Web Speech) │  │  Anthropic)  │  │ (Opt-in)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Audio Manager Module
**Purpose**: Captures and processes audio from video conference applications

**Responsibilities**:
- Request microphone permissions
- Capture audio stream from active tab or system audio
- Buffer audio chunks for processing
- Handle audio format conversion
- Manage audio session lifecycle

**Key Interfaces**:
```typescript
interface AudioManager {
  startCapture(): Promise<void>;
  stopCapture(): Promise<void>;
  getAudioStream(): MediaStream;
  onAudioChunk(callback: (chunk: AudioBuffer) => void): void;
}
```

**Implementation Notes**:
- Uses Web Audio API for capture
- Supports tab audio capture (Chrome) or system audio (Electron)
- Configurable sample rate and buffer size for latency optimization

### 2. Speech-to-Text Engine
**Purpose**: Converts audio to text in near real-time

**Responsibilities**:
- Process audio chunks through STT service
- Maintain streaming transcription state
- Handle partial and final transcriptions
- Manage language detection and switching
- Error handling and retry logic

**Key Interfaces**:
```typescript
interface STTEngine {
  startTranscription(audioStream: MediaStream): Promise<void>;
  stopTranscription(): Promise<void>;
  onTranscript(callback: (text: string, isFinal: boolean) => void): void;
  setLanguage(language: string): void;
}
```

**Implementation Options**:
- **Primary**: Web Speech API (browser-native, free, lower accuracy)
- **Secondary**: OpenAI Whisper API (higher accuracy, paid)
- **Tertiary**: Local Whisper model (privacy, higher latency)

### 3. Question Detector Module
**Purpose**: Identifies when a question has been asked

**Responsibilities**:
- Analyze transcribed text for question patterns
- Detect punctuation (question marks)
- Analyze speech patterns (pitch, pauses)
- Capture complete question context
- Handle multi-turn question clarification

**Key Interfaces**:
```typescript
interface QuestionDetector {
  processTranscript(text: string, metadata: AudioMetadata): void;
  onQuestionDetected(callback: (question: string, context: string[]) => void): void;
  setSensitivity(level: number): void;
}
```

**Detection Strategies**:
1. **Text-based**: Regex patterns, NLP question classification
2. **Audio-based**: Pitch analysis, pause detection, prosody
3. **Hybrid**: Combine text and audio signals for higher accuracy

### 4. LLM Integration Module
**Purpose**: Generates answer suggestions using AI

**Responsibilities**:
- Format prompts with resume, job description, and question
- Make API calls to LLM service (OpenAI, Anthropic, etc.)
- Handle streaming responses for real-time display
- Cache common questions/answers
- Manage API rate limits and costs
- Support multiple LLM providers

**Key Interfaces**:
```typescript
interface LLMIntegration {
  generateSuggestion(
    question: string,
    resume: ResumeData,
    jobDescription: JobDescription
  ): Promise<Suggestion>;
  streamSuggestion(
    question: string,
    resume: ResumeData,
    jobDescription: JobDescription,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}
```

**Prompt Engineering**:
- Structured prompts with clear sections
- Include context about interview best practices
- Specify response format (concise, structured)
- Include examples of good answers

### 5. UI State Manager
**Purpose**: Coordinates UI components and manages application state

**Responsibilities**:
- Manage interview session state
- Coordinate between overlay, sidebar, and settings
- Handle user preferences and settings
- Manage suggestion display logic
- Track user interactions

**Key Interfaces**:
```typescript
interface UIStateManager {
  startSession(): void;
  endSession(): void;
  showSuggestion(suggestion: Suggestion): void;
  hideSuggestion(): void;
  updateSettings(settings: UserSettings): void;
}
```

### 6. Data Manager Module
**Purpose**: Handles storage and retrieval of user data

**Responsibilities**:
- Store/retrieve resume data
- Store/retrieve job descriptions
- Manage temporary transcript storage
- Handle data encryption for sensitive information
- Implement data retention policies
- Export/import user data

**Key Interfaces**:
```typescript
interface DataManager {
  saveResume(resume: ResumeData): Promise<void>;
  getResume(): Promise<ResumeData | null>;
  saveJobDescription(job: JobDescription): Promise<void>;
  getJobDescription(): Promise<JobDescription | null>;
  saveTranscript(transcript: Transcript): Promise<void>;
  deleteTranscripts(olderThan: Date): Promise<void>;
}
```

### 7. Analytics Module
**Purpose**: Tracks usage and provides post-interview insights

**Responsibilities**:
- Log question types and frequencies
- Track response times
- Analyze speech patterns (filler words, pacing)
- Generate post-interview reports
- Provide feedback and recommendations

**Key Interfaces**:
```typescript
interface AnalyticsModule {
  logQuestion(question: string, timestamp: Date): void;
  logResponse(response: string, timestamp: Date): void;
  generateReport(sessionId: string): Promise<InterviewReport>;
  analyzeSpeechPatterns(transcript: Transcript): SpeechAnalysis;
}
```

## Data Flow

### Question Detection and Suggestion Flow

```
1. Audio Capture
   ↓
2. Speech-to-Text (streaming)
   ↓
3. Question Detector (analyzes transcript)
   ↓
4. Question Detected → Trigger UI notification
   ↓
5. LLM Integration (generates suggestion)
   ↓
6. UI State Manager (displays suggestion)
   ↓
7. User reviews/edits suggestion
   ↓
8. Analytics Module (logs interaction)
```

### Session Lifecycle

```
1. User opens extension → Settings/Resume upload
   ↓
2. User starts interview → Audio capture begins
   ↓
3. Real-time transcription → Question detection
   ↓
4. Suggestions generated and displayed
   ↓
5. User ends interview → Session summary
   ↓
6. Post-interview analytics and cleanup
```

## Extension Manifest Structure

### Chrome Extension (manifest.json)
- **Background Service Worker**: Core processing logic
- **Content Scripts**: Inject overlay UI into video conference pages
- **Options Page**: Settings and configuration
- **Permissions**: Microphone, storage, activeTab, host permissions for video platforms

### Firefox Extension (manifest.json)
- Similar structure with Firefox-specific APIs
- WebExtensions API compatibility

### Electron Desktop App
- Main process: Audio capture, file system access
- Renderer process: UI components
- IPC communication between processes

## Module Communication Patterns

### Event-Driven Architecture
- Components communicate via custom events
- Central event bus for cross-module communication
- Decoupled modules for easier testing and maintenance

### Message Passing (Extension Context)
- Background service ↔ Content script: Chrome runtime messages
- Content script ↔ UI overlay: DOM events or postMessage
- Background ↔ Options page: Storage API and messages

## Error Handling Strategy

1. **Graceful Degradation**: Fallback to simpler features if advanced ones fail
2. **User Notification**: Clear error messages without disrupting interview
3. **Retry Logic**: Automatic retries for transient failures
4. **Logging**: Comprehensive error logging for debugging
5. **Recovery**: Ability to resume from failures

## Performance Considerations

- **Latency Optimization**: Streaming STT, incremental LLM responses
- **Resource Management**: Efficient memory usage, cleanup of old data
- **Caching**: Cache common questions, resume parsing results
- **Lazy Loading**: Load modules only when needed
- **Background Processing**: Offload heavy processing to background threads

## Security Architecture

- **Data Encryption**: Encrypt sensitive data at rest
- **Secure Communication**: HTTPS for all API calls
- **Permission Model**: Minimal required permissions
- **Input Validation**: Sanitize all user inputs
- **API Key Management**: Secure storage of API keys

