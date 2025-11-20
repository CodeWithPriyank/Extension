/**
 * Background Service Worker - Core orchestration
 * Note: Audio capture and STT must run in content script (has DOM access)
 */
import { QuestionDetector } from '@/modules/question-detector/QuestionDetector';
import { LLMIntegration } from '@/modules/llm/LLMIntegration';
import { DataManager } from '@/modules/data/DataManager';
import type { InterviewSession, TranscriptEntry, QuestionEntry } from '@/types';

class InterviewSessionManager {
  public questionDetector: QuestionDetector; // Made public for transcript handler
  private llmIntegration: LLMIntegration | null = null;
  private dataManager: DataManager;
  public currentSession: InterviewSession | null = null; // Made public for transcript handler
  private isActive = false;

  constructor() {
    this.questionDetector = new QuestionDetector();
    this.dataManager = new DataManager();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Question detection handler
    this.questionDetector.onQuestionDetected(async (question, context) => {
      if (!this.currentSession) return;

      const questionEntry: QuestionEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        questionText: question,
        detectedMethod: 'punctuation',
        confidence: 0.8,
        context,
      };

      this.currentSession.questions.push(questionEntry);

      // Notify content script
      this.sendToContentScript({
        type: 'question_detected',
        data: questionEntry,
      });

      // Generate suggestion if LLM is configured
      if (this.llmIntegration) {
        try {
          const resume = await this.dataManager.getResume();
          const jobDesc = await this.dataManager.getJobDescription(
            this.currentSession.jobDescriptionId
          );

          if (resume && jobDesc) {
            const suggestion = await this.llmIntegration.generateSuggestion(
              question,
              resume,
              jobDesc
            );

            questionEntry.suggestion = suggestion;
            suggestion.questionId = questionEntry.id;

            // Send suggestion to content script
            this.sendToContentScript({
              type: 'suggestion_ready',
              data: { 
                questionId: questionEntry.id, 
                questionEntry,
                suggestion 
              },
            });
          }
        } catch (error) {
          console.error('Failed to generate suggestion:', error);
          this.sendToContentScript({
            type: 'suggestion_error',
            data: { questionId: questionEntry.id, error: String(error) },
          });
        }
      }
    });
  }

  async startSession(jobDescriptionId: string, resumeId: string): Promise<void> {
    if (this.isActive) {
      throw new Error('Session already active');
    }

    // Load settings
    const settings = await this.dataManager.getSettings();
    if (!settings) {
      throw new Error('Settings not configured');
    }

    // Initialize LLM if API key is set
    if (settings.apiKey) {
      this.llmIntegration = new LLMIntegration(
        settings.apiKey,
        settings.llmProvider,
        settings.llmModel
      );
      this.llmIntegration.setMaxTokens(settings.maxTokens);
      this.llmIntegration.setTemperature(settings.temperature);
    }

    // Create session
    this.currentSession = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      jobDescriptionId,
      resumeId,
      platform: 'other', // TODO: Detect platform
      status: 'active',
      transcript: [],
      questions: [],
      settings: {
        llmProvider: settings.llmProvider,
        llmModel: settings.llmModel,
        sttProvider: settings.sttProvider,
        questionSensitivity: settings.questionSensitivity,
      },
    };

    this.isActive = true;

    // Notify content script to start audio capture and transcription
    // Audio/STT must run in content script (has DOM access)
    this.sendToContentScript({
      type: 'start_audio_capture',
      data: { sessionId: this.currentSession.id },
    });
  }

  async stopSession(): Promise<void> {
    if (!this.isActive) return;

    // Notify content script to stop audio capture
    this.sendToContentScript({
      type: 'stop_audio_capture',
      data: {},
    });

    if (this.currentSession) {
      this.currentSession.endedAt = new Date();
      this.currentSession.duration = 
        (this.currentSession.endedAt.getTime() - 
         this.currentSession.createdAt.getTime()) / 1000;
      this.currentSession.status = 'completed';

      await this.dataManager.saveSession(this.currentSession);
    }

    this.isActive = false;
    this.currentSession = null;
    this.llmIntegration = null;

    this.sendToContentScript({
      type: 'session_ended',
      data: {},
    });
  }

  private sendToContentScript(message: any): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
          // Content script might not be ready
        });
      }
    });
  }

  isSessionActive(): boolean {
    return this.isActive;
  }
}

// Global session manager
const sessionManager = new InterviewSessionManager();

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'start_session':
          await sessionManager.startSession(
            message.data.jobDescriptionId,
            message.data.resumeId
          );
          sendResponse({ success: true });
          break;

        case 'stop_session':
          await sessionManager.stopSession();
          sendResponse({ success: true });
          break;

        case 'get_session_status':
          sendResponse({
            active: sessionManager.isSessionActive(),
          });
          break;

        case 'transcript':
          // Handle transcript from content script
          if (sessionManager.currentSession) {
            const entry: TranscriptEntry = message.data;
            sessionManager.currentSession.transcript.push(entry);
            sessionManager.questionDetector.processTranscript(entry.text);
          }
          sendResponse({ received: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background error:', error);
      sendResponse({ error: String(error) });
    }
  })();

  return true; // Keep channel open for async response
});

// Extension install handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('InterviewCopilot installed');
});

