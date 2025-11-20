/**
 * DataManager - Handles storage and retrieval of user data
 */
import type { ResumeData, JobDescription, InterviewSession, UserSettings } from '@/types';

export class DataManager {
  private storage = chrome.storage.local;

  async saveResume(resume: ResumeData): Promise<void> {
    try {
      await this.storage.set({ resume });
    } catch (error) {
      console.error('Failed to save resume:', error);
      throw error;
    }
  }

  async getResume(): Promise<ResumeData | null> {
    try {
      const result = await this.storage.get('resume');
      if (!result.resume) return null;
      
      // Deserialize dates from strings to Date objects
      const resume = this.deserializeResume(result.resume);
      return resume;
    } catch (error) {
      console.error('Failed to get resume:', error);
      return null;
    }
  }

  /**
   * Deserialize resume data - convert date strings back to Date objects
   */
  private deserializeResume(resume: any): ResumeData {
    return {
      ...resume,
      createdAt: resume.createdAt ? new Date(resume.createdAt) : new Date(),
      updatedAt: resume.updatedAt ? new Date(resume.updatedAt) : new Date(),
      workExperience: (resume.workExperience || []).map((exp: any) => ({
        ...exp,
        startDate: exp.startDate ? new Date(exp.startDate) : new Date(),
        endDate: exp.endDate ? new Date(exp.endDate) : undefined,
      })),
      education: (resume.education || []).map((edu: any) => ({
        ...edu,
        startDate: edu.startDate ? new Date(edu.startDate) : new Date(),
        endDate: edu.endDate ? new Date(edu.endDate) : undefined,
      })),
      skills: {
        ...resume.skills,
        certifications: (resume.skills?.certifications || []).map((cert: any) => ({
          ...cert,
          dateObtained: cert.dateObtained ? new Date(cert.dateObtained) : new Date(),
          expirationDate: cert.expirationDate ? new Date(cert.expirationDate) : undefined,
        })),
      },
      projects: (resume.projects || []).map((proj: any) => ({
        ...proj,
        startDate: proj.startDate ? new Date(proj.startDate) : undefined,
        endDate: proj.endDate ? new Date(proj.endDate) : undefined,
      })),
    };
  }

  async saveJobDescription(job: JobDescription): Promise<void> {
    try {
      const result = await this.storage.get('jobDescriptions');
      const jobs: JobDescription[] = result.jobDescriptions || [];
      
      const index = jobs.findIndex(j => j.id === job.id);
      if (index >= 0) {
        jobs[index] = job;
      } else {
        jobs.push(job);
      }

      await this.storage.set({ jobDescriptions: jobs });
    } catch (error) {
      console.error('Failed to save job description:', error);
      throw error;
    }
  }

  async getJobDescription(id: string): Promise<JobDescription | null> {
    try {
      const result = await this.storage.get('jobDescriptions');
      const jobs: JobDescription[] = result.jobDescriptions || [];
      return jobs.find(j => j.id === id) || null;
    } catch (error) {
      console.error('Failed to get job description:', error);
      return null;
    }
  }

  async getAllJobDescriptions(): Promise<JobDescription[]> {
    try {
      const result = await this.storage.get('jobDescriptions');
      return result.jobDescriptions || [];
    } catch (error) {
      console.error('Failed to get job descriptions:', error);
      return [];
    }
  }

  async saveSession(session: InterviewSession): Promise<void> {
    try {
      const result = await this.storage.get('sessions');
      const sessions: InterviewSession[] = result.sessions || [];
      
      const index = sessions.findIndex(s => s.id === session.id);
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }

      // Keep only last 10 sessions
      if (sessions.length > 10) {
        sessions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        sessions.splice(10);
      }

      await this.storage.set({ sessions });
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  async getSession(id: string): Promise<InterviewSession | null> {
    try {
      const result = await this.storage.get('sessions');
      const sessions: InterviewSession[] = result.sessions || [];
      return sessions.find(s => s.id === id) || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  async getAllSessions(): Promise<InterviewSession[]> {
    try {
      const result = await this.storage.get('sessions');
      return result.sessions || [];
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      // Encrypt API key if present
      const settingsToSave = { ...settings };
      if (settingsToSave.apiKey) {
        // In production, encrypt the API key
        // For now, store as-is (should be encrypted)
      }

      await this.storage.set({ settings: settingsToSave });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async getSettings(): Promise<UserSettings | null> {
    try {
      const result = await this.storage.get('settings');
      return result.settings || null;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return null;
    }
  }

  async deleteTranscripts(olderThan: Date): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      const filtered = sessions.map(session => ({
        ...session,
        transcript: session.transcript.filter(t => new Date(t.timestamp) >= olderThan),
      }));

      await this.storage.set({ sessions: filtered });
    } catch (error) {
      console.error('Failed to delete transcripts:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await this.storage.clear();
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }
}

