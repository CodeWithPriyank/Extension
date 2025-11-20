// Core data types
export interface ResumeData {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  personalInfo: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
    portfolio?: string;
    summary?: string;
  };
  workExperience: WorkExperience[];
  education: Education[];
  skills: {
    technical: string[];
    soft: string[];
    languages: LanguageSkill[];
    certifications: Certification[];
  };
  projects: Project[];
  source: 'uploaded' | 'manual' | 'parsed';
  sourceFile?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  location?: string;
  description: string;
  achievements: string[];
  technologies?: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
}

export interface LanguageSkill {
  language: string;
  proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
}

export interface Certification {
  name: string;
  issuer: string;
  dateObtained: Date;
  expirationDate?: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  startDate?: Date;
  endDate?: Date;
  url?: string;
  keyFeatures: string[];
}

export interface JobDescription {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  company: string;
  location?: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  preferredSkills?: string[];
  technologies?: string[];
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  source: 'manual' | 'url' | 'file';
}

export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: 'interviewer' | 'candidate' | 'unknown';
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface QuestionEntry {
  id: string;
  timestamp: Date;
  questionText: string;
  detectedMethod: 'punctuation' | 'audio' | 'hybrid' | 'manual';
  confidence: number;
  context: string[];
  suggestion?: Suggestion;
}

export interface Suggestion {
  id: string;
  questionId: string;
  generatedAt: Date;
  model: string;
  answer: string;
  keyPoints: string[];
  structure?: 'STAR' | 'PAR' | 'freeform';
  wasShown: boolean;
  wasEdited: boolean;
  editedVersion?: string;
}

export interface InterviewSession {
  id: string;
  createdAt: Date;
  endedAt?: Date;
  duration?: number;
  jobDescriptionId: string;
  resumeId: string;
  platform: 'zoom' | 'meet' | 'teams' | 'other';
  status: 'active' | 'completed' | 'cancelled';
  transcript: TranscriptEntry[];
  questions: QuestionEntry[];
  settings: SessionSettings;
}

export interface SessionSettings {
  llmProvider: 'openai' | 'anthropic' | 'openrouter';
  llmModel: string;
  sttProvider: 'web-speech' | 'openai-whisper';
  questionSensitivity: number;
}

export interface UserSettings {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  llmProvider: 'openai' | 'anthropic' | 'openrouter' | 'local';
  llmModel: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  sttProvider: 'web-speech' | 'openai-whisper' | 'local-whisper';
  sttLanguage: string;
  questionSensitivity: number;
  enableAudioAnalysis: boolean;
  enableTextAnalysis: boolean;
  overlay: {
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'sidebar';
    size: 'small' | 'medium' | 'large';
    transparency: number;
    autoMinimize: boolean;
  };
  privacy: {
    autoDeleteTranscripts: boolean;
    transcriptRetentionDays: number;
    enableAnalytics: boolean;
    encryptLocalData: boolean;
  };
}

