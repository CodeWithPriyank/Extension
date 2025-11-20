/**
 * QuestionDetector - Detects questions from transcribed text
 */
export class QuestionDetector {
  private sensitivity = 0.7;
  private enableTextAnalysis = true;
  private enableAudioAnalysis = false;
  private onQuestionCallback: ((question: string, context: string[]) => void) | null = null;
  private recentTranscripts: string[] = [];
  private maxContextLength = 5;

  // Question patterns
  private questionWords = [
    'what', 'when', 'where', 'who', 'why', 'how',
    'which', 'whose', 'whom', 'can', 'could', 'would',
    'should', 'may', 'might', 'do', 'does', 'did',
    'is', 'are', 'was', 'were', 'have', 'has', 'had'
  ];

  // Question phrases
  private questionPhrases = [
    'tell me about',
    'describe',
    'explain',
    'walk me through',
    'give me an example',
    'can you',
    'could you',
    'what is',
    'what are',
    'how do',
    'how did',
    'why did',
    'why do'
  ];

  processTranscript(text: string, metadata?: any): void {
    if (!text.trim()) return;

    // Add to recent transcripts for context
    this.recentTranscripts.push(text);
    if (this.recentTranscripts.length > this.maxContextLength) {
      this.recentTranscripts.shift();
    }

    if (this.enableTextAnalysis) {
      const isQuestion = this.detectQuestionFromText(text);
      if (isQuestion) {
        const context = [...this.recentTranscripts.slice(0, -1)];
        const question = text.trim();
        
        if (this.onQuestionCallback) {
          this.onQuestionCallback(question, context);
        }
      }
    }
  }

  private detectQuestionFromText(text: string): boolean {
    const normalizedText = text.toLowerCase().trim();

    // Check for question mark
    if (text.includes('?')) {
      return true;
    }

    // Check if starts with question word
    const startsWithQuestionWord = this.questionWords.some(word => 
      normalizedText.startsWith(word + ' ') || 
      normalizedText.startsWith(word + '?')
    );

    if (startsWithQuestionWord) {
      return true;
    }

    // Check for question phrases
    const containsQuestionPhrase = this.questionPhrases.some(phrase =>
      normalizedText.includes(phrase)
    );

    if (containsQuestionPhrase) {
      // Additional check: should be at least 10 characters
      if (text.length >= 10) {
        return true;
      }
    }

    // Check for rising intonation indicators (if available in metadata)
    // This would require audio analysis

    return false;
  }

  onQuestionDetected(callback: (question: string, context: string[]) => void): void {
    this.onQuestionCallback = callback;
  }

  setSensitivity(level: number): void {
    this.sensitivity = Math.max(0, Math.min(1, level));
    // Adjust detection thresholds based on sensitivity
  }

  setEnableTextAnalysis(enabled: boolean): void {
    this.enableTextAnalysis = enabled;
  }

  setEnableAudioAnalysis(enabled: boolean): void {
    this.enableAudioAnalysis = enabled;
  }

  clearContext(): void {
    this.recentTranscripts = [];
  }
}

