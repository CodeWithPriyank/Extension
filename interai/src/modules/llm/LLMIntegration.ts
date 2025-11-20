/**
 * LLMIntegration - Generates answer suggestions using LLM APIs
 */
import type { ResumeData, JobDescription, Suggestion } from '@/types';

export class LLMIntegration {
  private apiKey: string = '';
  private provider: 'openai' | 'anthropic' | 'openrouter' = 'openai';
  private model: string = 'gpt-3.5-turbo';
  private baseURL: string = 'https://api.openai.com/v1';
  private maxTokens: number = 500;
  private temperature: number = 0.7;

  constructor(apiKey?: string, provider?: 'openai' | 'anthropic' | 'openrouter', model?: string) {
    if (apiKey) this.apiKey = apiKey;
    if (provider) this.provider = provider;
    if (model) this.model = model;
    
    if (this.provider === 'openai') {
      this.baseURL = 'https://api.openai.com/v1';
    } else if (this.provider === 'anthropic') {
      this.baseURL = 'https://api.anthropic.com/v1';
    } else if (this.provider === 'openrouter') {
      this.baseURL = 'https://openrouter.ai/api/v1';
    }
  }

  async generateSuggestion(
    question: string,
    resume: ResumeData,
    jobDescription: JobDescription
  ): Promise<Suggestion> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const prompt = this.buildPrompt(question, resume, jobDescription);

    try {
      const response = await this.callAPI(prompt);
      const answer = this.parseResponse(response);

      return {
        id: crypto.randomUUID(),
        questionId: '', // Will be set by caller
        generatedAt: new Date(),
        model: this.model,
        answer: answer.fullAnswer,
        keyPoints: answer.keyPoints,
        structure: answer.structure,
        wasShown: false,
        wasEdited: false,
      };
    } catch (error) {
      console.error('LLM API error:', error);
      throw error;
    }
  }

  async streamSuggestion(
    question: string,
    resume: ResumeData,
    jobDescription: JobDescription,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const prompt = this.buildPrompt(question, resume, jobDescription);
    let fullResponse = '';

    try {
      await this.callStreamingAPI(prompt, (chunk) => {
        fullResponse += chunk;
        onChunk(chunk);
      });

      return fullResponse;
    } catch (error) {
      console.error('LLM streaming error:', error);
      throw error;
    }
  }

  private buildPrompt(
    question: string,
    resume: ResumeData,
    jobDescription: JobDescription
  ): string {
    const resumeSummary = this.formatResume(resume);
    const jobSummary = this.formatJobDescription(jobDescription);

    return `You are an interview coach helping a candidate prepare answers. Based on the candidate's resume and the job description, provide a structured, concise answer to the interview question.

CANDIDATE RESUME:
${resumeSummary}

JOB DESCRIPTION:
${jobSummary}

INTERVIEW QUESTION:
${question}

Provide a well-structured answer that:
1. Is relevant to the candidate's experience
2. Aligns with the job requirements
3. Uses the STAR method (Situation, Task, Action, Result) when appropriate
4. Is concise (2-3 minutes when spoken)
5. Highlights relevant skills and achievements

Format your response as:
- A clear, conversational answer (2-3 paragraphs)
- Key talking points (3-5 bullet points)
- Structure: STAR method if applicable, otherwise freeform

Answer:`;
  }

  private formatResume(resume: ResumeData): string {
    let summary = `Name: ${resume.personalInfo.fullName}\n`;
    
    if (resume.personalInfo.summary) {
      summary += `Summary: ${resume.personalInfo.summary}\n`;
    }

    summary += `\nWork Experience:\n`;
    resume.workExperience.forEach(exp => {
      // Handle dates that might be strings (from storage) or Date objects
      const startDate = this.parseDate(exp.startDate);
      const endDate = exp.endDate ? this.parseDate(exp.endDate) : null;
      const startYear = startDate.getFullYear();
      const endYear = endDate ? endDate.getFullYear() : 'Present';
      
      summary += `- ${exp.position} at ${exp.company} (${startYear}-${endYear})\n`;
      summary += `  ${exp.description}\n`;
      if (exp.achievements.length > 0) {
        summary += `  Key achievements: ${exp.achievements.join(', ')}\n`;
      }
    });

    summary += `\nSkills: ${resume.skills.technical.join(', ')}\n`;

    return summary;
  }

  /**
   * Parse date from string or Date object
   */
  private parseDate(date: Date | string | undefined): Date {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  }

  private formatJobDescription(job: JobDescription): string {
    let summary = `Position: ${job.title} at ${job.company}\n`;
    summary += `Description: ${job.description}\n`;
    
    if (job.responsibilities.length > 0) {
      summary += `Responsibilities: ${job.responsibilities.join(', ')}\n`;
    }
    
    if (job.requirements.length > 0) {
      summary += `Requirements: ${job.requirements.join(', ')}\n`;
    }

    return summary;
  }

  private async callAPI(prompt: string): Promise<any> {
    // Build headers based on provider
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
    
    // OpenRouter requires HTTP-Referer header
    if (this.provider === 'openrouter') {
      const referer = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://interviewcopilot.com';
      headers['HTTP-Referer'] = referer;
      headers['X-Title'] = 'InterviewCopilot';
    }
    
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful interview coach that provides structured, relevant answers to interview questions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error?.message || response.statusText;
      
      // Provide user-friendly error messages for common issues
      if (errorMessage.includes('quota') || errorMessage.includes('exceeded') || errorMessage.includes('plan limit')) {
        throw new Error(
          'OpenAI API quota exceeded. Important: ChatGPT Plus/Premium subscription is separate from API access. ' +
          'To use this extension, you need to:\n\n' +
          '1. Go to https://platform.openai.com/api-keys\n' +
          '2. Add a payment method to your OpenAI API account\n' +
          '3. Set up usage limits (pay-as-you-go)\n\n' +
          'Your ChatGPT Plus subscription gives you access to chat.openai.com, but API access requires separate billing setup. ' +
          'Visit https://platform.openai.com/account/billing to set up API billing.'
        );
      }
      
      if (errorMessage.includes('invalid_api_key') || errorMessage.includes('authentication')) {
        throw new Error(
          'Invalid API key. Please check your API key in the extension settings. ' +
          'Make sure you\'re using a valid OpenAI API key.'
        );
      }
      
      if (errorMessage.includes('rate_limit')) {
        throw new Error(
          'Rate limit exceeded. Please wait a moment and try again. ' +
          'Too many requests were sent in a short period.'
        );
      }
      
      // Generic error with original message
      throw new Error(`API error: ${errorMessage}`);
    }

    return response.json();
  }

  private async callStreamingAPI(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    // Build headers based on provider
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
    
    // OpenRouter requires HTTP-Referer header
    if (this.provider === 'openrouter') {
      const referer = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://interviewcopilot.com';
      headers['HTTP-Referer'] = referer;
      headers['X-Title'] = 'InterviewCopilot';
    }
    
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful interview coach that provides structured, relevant answers to interview questions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error?.message || response.statusText;
      
      // Provide user-friendly error messages for common issues
      if (errorMessage.includes('quota') || errorMessage.includes('exceeded') || errorMessage.includes('plan limit')) {
        throw new Error(
          'OpenAI API quota exceeded. Important: ChatGPT Plus/Premium subscription is separate from API access. ' +
          'To use this extension, you need to:\n\n' +
          '1. Go to https://platform.openai.com/api-keys\n' +
          '2. Add a payment method to your OpenAI API account\n' +
          '3. Set up usage limits (pay-as-you-go)\n\n' +
          'Your ChatGPT Plus subscription gives you access to chat.openai.com, but API access requires separate billing setup. ' +
          'Visit https://platform.openai.com/account/billing to set up API billing.'
        );
      }
      
      if (errorMessage.includes('invalid_api_key') || errorMessage.includes('authentication')) {
        throw new Error(
          'Invalid API key. Please check your API key in the extension settings. ' +
          'Make sure you\'re using a valid OpenAI API key.'
        );
      }
      
      if (errorMessage.includes('rate_limit')) {
        throw new Error(
          'Rate limit exceeded. Please wait a moment and try again. ' +
          'Too many requests were sent in a short period.'
        );
      }
      
      // Generic error with original message
      throw new Error(`API error: ${errorMessage}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content || '';
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  private parseResponse(response: any): {
    fullAnswer: string;
    keyPoints: string[];
    structure?: 'STAR' | 'PAR' | 'freeform';
  } {
    const content = response.choices[0]?.message?.content || '';
    
    // Extract key points (lines starting with - or *)
    const keyPoints: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-*]\s+/)) {
        keyPoints.push(trimmed.replace(/^[-*]\s+/, ''));
      }
    }

    // Determine structure
    let structure: 'STAR' | 'PAR' | 'freeform' = 'freeform';
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('situation') && lowerContent.includes('task') && 
        lowerContent.includes('action') && lowerContent.includes('result')) {
      structure = 'STAR';
    }

    return {
      fullAnswer: content,
      keyPoints: keyPoints.length > 0 ? keyPoints : [content.substring(0, 100) + '...'],
      structure,
    };
  }

  setAPIKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setProvider(provider: 'openai' | 'anthropic' | 'openrouter'): void {
    this.provider = provider;
    if (provider === 'openai') {
      this.baseURL = 'https://api.openai.com/v1';
    } else if (provider === 'anthropic') {
      this.baseURL = 'https://api.anthropic.com/v1';
    } else if (provider === 'openrouter') {
      this.baseURL = 'https://openrouter.ai/api/v1';
    }
  }

  setModel(model: string): void {
    this.model = model;
  }

  setMaxTokens(tokens: number): void {
    this.maxTokens = tokens;
  }

  setTemperature(temp: number): void {
    this.temperature = temp;
  }
}

