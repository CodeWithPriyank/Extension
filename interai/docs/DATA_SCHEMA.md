# InterviewCopilot Data Schema

## Overview

This document defines the data structures used throughout InterviewCopilot for storing user information, interview data, and application state.

## Core Data Models

### Resume Data Schema

```typescript
interface ResumeData {
  id: string;                    // UUID
  version: number;               // Version for updates
  createdAt: Date;
  updatedAt: Date;
  
  // Personal Information
  personalInfo: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
    portfolio?: string;
    summary?: string;            // Professional summary
  };
  
  // Work Experience
  workExperience: WorkExperience[];
  
  // Education
  education: Education[];
  
  // Skills
  skills: {
    technical: string[];         // Technical skills
    soft: string[];             // Soft skills
    languages: LanguageSkill[]; // Language proficiencies
    certifications: Certification[];
  };
  
  // Projects
  projects: Project[];
  
  // Additional Sections
  achievements?: string[];
  publications?: Publication[];
  volunteerWork?: VolunteerExperience[];
  
  // Metadata
  source: 'uploaded' | 'manual' | 'parsed';
  sourceFile?: string;          // Original filename if uploaded
  rawText?: string;             // Original resume text (optional)
}

interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;               // null if current
  isCurrent: boolean;
  location?: string;
  description: string;          // Job description/responsibilities
  achievements: string[];       // Key achievements
  technologies?: string[];      // Technologies used
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
  honors?: string[];
  relevantCoursework?: string[];
}

interface LanguageSkill {
  language: string;
  proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
}

interface Certification {
  name: string;
  issuer: string;
  dateObtained: Date;
  expirationDate?: Date;
  credentialId?: string;
  url?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  startDate?: Date;
  endDate?: Date;
  url?: string;
  githubUrl?: string;
  keyFeatures: string[];
}

interface Publication {
  title: string;
  authors: string[];
  publicationDate: Date;
  venue?: string;
  url?: string;
}

interface VolunteerExperience {
  organization: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  description: string;
}
```

### Job Description Schema

```typescript
interface JobDescription {
  id: string;                    // UUID
  createdAt: Date;
  updatedAt: Date;
  
  // Basic Information
  title: string;
  company: string;
  location?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  
  // Job Details
  description: string;           // Full job description text
  responsibilities: string[];    // Extracted responsibilities
  requirements: string[];         // Required qualifications
  preferredQualifications?: string[]; // Preferred qualifications
  
  // Skills and Technologies
  requiredSkills: string[];
  preferredSkills?: string[];
  technologies?: string[];
  
  // Experience Requirements
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  yearsOfExperience?: number;
  
  // Compensation (if provided)
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  
  // Source
  source: 'manual' | 'url' | 'file';
  sourceUrl?: string;
  sourceFile?: string;
  
  // Metadata
  tags?: string[];               // User-defined tags
  notes?: string;                // User notes about the role
}
```

### Interview Session Schema

```typescript
interface InterviewSession {
  id: string;                    // UUID
  createdAt: Date;
  endedAt?: Date;
  duration?: number;             // Duration in seconds
  
  // Session Metadata
  jobDescriptionId: string;      // Reference to job description
  resumeId: string;              // Reference to resume used
  platform: 'zoom' | 'meet' | 'teams' | 'other';
  interviewType?: 'technical' | 'behavioral' | 'mixed' | 'unknown';
  
  // Session State
  status: 'active' | 'completed' | 'cancelled';
  
  // Transcript Data
  transcript: TranscriptEntry[];
  
  // Questions and Suggestions
  questions: QuestionEntry[];
  
  // User Interactions
  interactions: UserInteraction[];
  
  // Analytics
  analytics?: SessionAnalytics;
  
  // Settings Used
  settings: SessionSettings;
}

interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: 'interviewer' | 'candidate' | 'unknown';
  text: string;
  isFinal: boolean;              // Final transcription vs. interim
  confidence?: number;            // STT confidence score
  audioMetadata?: {
    duration: number;             // Duration in seconds
    sampleRate?: number;
  };
}

interface QuestionEntry {
  id: string;
  timestamp: Date;
  questionText: string;
  detectedMethod: 'punctuation' | 'audio' | 'hybrid' | 'manual';
  confidence: number;            // Detection confidence
  context: string[];              // Preceding transcript for context
  suggestion?: Suggestion;
  userResponse?: string;         // User's actual response (if logged)
  responseTime?: number;          // Time to respond in seconds
}

interface Suggestion {
  id: string;
  questionId: string;
  generatedAt: Date;
  model: string;                 // LLM model used
  promptVersion: string;         // Prompt template version
  
  // Suggestion Content
  answer: string;                // Full suggested answer
  keyPoints: string[];           // Bullet points
  structure?: 'STAR' | 'PAR' | 'freeform';
  starBreakdown?: {              // If STAR method
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  
  // User Interaction
  wasShown: boolean;
  wasEdited: boolean;
  editedVersion?: string;
  wasUsed: boolean;              // Whether user referenced it
  userRating?: number;           // User rating 1-5 (optional)
}

interface UserInteraction {
  id: string;
  timestamp: Date;
  type: 'suggestion_shown' | 'suggestion_dismissed' | 'suggestion_edited' | 
        'suggestion_used' | 'manual_request' | 'settings_changed';
  targetId?: string;            // ID of related suggestion/question
  details?: Record<string, any>; // Additional interaction data
}

interface SessionAnalytics {
  totalQuestions: number;
  questionsAnswered: number;
  averageResponseTime: number;
  suggestionsGenerated: number;
  suggestionsUsed: number;
  suggestionsEdited: number;
  suggestionsDismissed: number;
  
  // Speech Analysis
  speechAnalysis?: {
    totalWords: number;
    fillerWords: {
      count: number;
      frequency: number;         // Per 100 words
      commonFillers: Record<string, number>;
    };
    speakingPace: {
      wordsPerMinute: number;
      averagePauseDuration: number;
    };
    clarity: {
      stutteringInstances: number;
      repetitionCount: number;
    };
  };
  
  // Question Analysis
  questionTypes: {
    technical: number;
    behavioral: number;
    situational: number;
    other: number;
  };
  
  // Performance Metrics
  performanceScore?: number;     // Calculated score (0-100)
  strengths: string[];
  areasForImprovement: string[];
}
```

### User Settings Schema

```typescript
interface UserSettings {
  // General Settings
  language: string;              // Default: 'en'
  theme: 'light' | 'dark' | 'auto';
  
  // LLM Configuration
  llmProvider: 'openai' | 'anthropic' | 'local';
  llmModel: string;              // e.g., 'gpt-4', 'claude-3-opus'
  apiKey?: string;               // Encrypted
  maxTokens: number;             // Default: 500
  temperature: number;           // Default: 0.7
  
  // Speech-to-Text Settings
  sttProvider: 'web-speech' | 'openai-whisper' | 'local-whisper';
  sttLanguage: string;
  sttConfidenceThreshold: number; // Default: 0.7
  
  // Question Detection Settings
  questionSensitivity: number;    // 0-1, default: 0.7
  enableAudioAnalysis: boolean;  // Pitch/pause detection
  enableTextAnalysis: boolean;   // Punctuation/NLP detection
  minQuestionLength: number;     // Minimum characters
  
  // UI Settings
  overlay: {
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'sidebar';
    size: 'small' | 'medium' | 'large';
    transparency: number;        // 0-1
    autoMinimize: boolean;
    autoDismissDelay: number;    // Seconds
  };
  
  // Privacy Settings
  privacy: {
    autoDeleteTranscripts: boolean;
    transcriptRetentionDays: number; // Default: 7
    enableAnalytics: boolean;
    shareUsageData: boolean;     // Opt-in for product improvement
    encryptLocalData: boolean;   // Default: true
  };
  
  // Notification Settings
  notifications: {
    enableSound: boolean;
    enableVisual: boolean;
    suggestionReadySound: boolean;
  };
  
  // Advanced Settings
  advanced: {
    enableCaching: boolean;
    cacheExpirationHours: number;
    maxRetries: number;
    requestTimeout: number;      // Milliseconds
    enableDebugMode: boolean;
  };
}
```

### Practice Session Schema

```typescript
interface PracticeSession {
  id: string;
  createdAt: Date;
  endedAt?: Date;
  
  // Session Configuration
  jobRole: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;              // Planned duration in minutes
  hintsEnabled: boolean;
  
  // Questions
  questions: PracticeQuestion[];
  
  // Results
  results?: PracticeResults;
}

interface PracticeQuestion {
  id: string;
  questionText: string;
  category: 'technical' | 'behavioral' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  askedAt: Date;
  
  // User Response
  userResponse?: string;
  responseDuration?: number;
  
  // Feedback
  feedback?: {
    strengths: string[];
    improvements: string[];
    score: number;               // 0-100
    exampleAnswer?: string;
    detailedAnalysis?: string;
  };
}

interface PracticeResults {
  totalQuestions: number;
  questionsAnswered: number;
  averageScore: number;
  categoryScores: {
    technical: number;
    behavioral: number;
    situational: number;
  };
  overallFeedback: string;
  recommendations: string[];
}
```

## Storage Structure

### Browser Extension Storage (chrome.storage.local)

```typescript
interface StorageStructure {
  // User Data
  resume: ResumeData | null;
  jobDescriptions: JobDescription[];      // Array of job descriptions
  currentJobDescriptionId: string | null;
  
  // Settings
  settings: UserSettings;
  
  // Sessions
  sessions: InterviewSession[];            // Recent sessions (limited)
  currentSession: InterviewSession | null;
  
  // Practice
  practiceSessions: PracticeSession[];
  
  // Cache
  cache: {
    suggestions: Map<string, CachedSuggestion>;
    questionPatterns: Map<string, QuestionPattern>;
  };
  
  // Analytics (if enabled)
  analytics: {
    totalSessions: number;
    totalQuestions: number;
    usageStats: UsageStats;
  };
}
```

### IndexedDB Structure (for larger data)

```typescript
// Database: InterviewCopilotDB
// Version: 1

// Object Stores:
// 1. transcripts
//    - Key: sessionId + timestamp
//    - Value: TranscriptEntry[]

// 2. sessions
//    - Key: sessionId
//    - Value: InterviewSession

// 3. practiceSessions
//    - Key: practiceSessionId
//    - Value: PracticeSession

// 4. analytics
//    - Key: date (YYYY-MM-DD)
//    - Value: DailyAnalytics
```

## Data Validation

### Validation Rules

1. **Resume Data**:
   - Required: personalInfo.fullName, workExperience (at least one)
   - Dates must be valid and logical (endDate >= startDate)
   - Email must be valid format

2. **Job Description**:
   - Required: title, company, description
   - Skills arrays must be non-empty

3. **Interview Session**:
   - Must reference valid resumeId and jobDescriptionId
   - Transcript entries must have valid timestamps
   - Questions must have non-empty questionText

## Data Migration

### Version Management

- Each data structure includes a `version` field
- Migration functions handle schema changes
- Backward compatibility maintained where possible

### Example Migration

```typescript
function migrateResumeData(oldData: any, version: number): ResumeData {
  if (version < 2) {
    // Migrate from v1 to v2
    // Add new fields, transform old structure
  }
  return newResumeData;
}
```

## Data Export/Import

### Export Format (JSON)

```typescript
interface ExportData {
  version: string;               // Export format version
  exportedAt: Date;
  data: {
    resume: ResumeData;
    jobDescriptions: JobDescription[];
    sessions: InterviewSession[];
    settings: UserSettings;
  };
}
```

### Import Validation

- Validate schema compatibility
- Check for required fields
- Handle missing optional fields gracefully
- Preserve user IDs or generate new ones

## Privacy Considerations

### Data Retention

- Transcripts: Deleted after configured retention period (default: 7 days)
- Sessions: User can manually delete or set auto-delete
- Analytics: Aggregated data only, no personal identifiers

### Encryption

- API keys: Encrypted at rest using browser's encryption APIs
- Sensitive resume data: Optional encryption
- Local storage: Browser's built-in security

### Data Minimization

- Only store necessary data
- Delete temporary data promptly
- Allow user to clear all data at any time

