/**
 * STTEngine - Speech-to-Text using Web Speech API
 */
export class STTEngine {
  private recognition: any = null;
  private isTranscribing = false;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private language = 'en-US';
  private interimResults = true;
  private continuous = true;

  constructor() {
    // Only initialize if we have window (content script context)
    if (typeof window !== 'undefined') {
      this.initializeRecognition();
    }
  }

  private initializeRecognition(): void {
    // Check if we're in a service worker context (no window)
    if (typeof window === 'undefined') {
      // Service worker context - recognition will be initialized in content script
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.language;
    this.recognition.interimResults = this.interimResults;
    this.recognition.continuous = this.continuous;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinal = true;
        }
      }

      if (this.onTranscriptCallback && transcript.trim()) {
        this.onTranscriptCallback(transcript, isFinal);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Auto-restart on certain errors
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        if (this.isTranscribing) {
          this.recognition.start();
        }
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if still transcribing
      if (this.isTranscribing) {
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Failed to restart recognition:', error);
        }
      }
    };
  }

  async startTranscription(audioStream: MediaStream): Promise<void> {
    if (this.isTranscribing) {
      throw new Error('Transcription already started');
    }

    // Initialize if not already done (for lazy initialization)
    if (!this.recognition && typeof window !== 'undefined') {
      this.initializeRecognition();
    }

    if (!this.recognition) {
      throw new Error('Speech recognition not available in this context. Must run in content script.');
    }

    try {
      this.recognition.start();
      this.isTranscribing = true;
    } catch (error) {
      console.error('Failed to start transcription:', error);
      throw error;
    }
  }

  stopTranscription(): void {
    if (!this.isTranscribing) return;

    this.isTranscribing = false;
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  onTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.onTranscriptCallback = callback;
  }

  setLanguage(language: string): void {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  isActive(): boolean {
    return this.isTranscribing;
  }
}

