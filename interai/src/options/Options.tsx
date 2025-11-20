import React, { useState, useEffect } from 'react';
import { DataManager } from '@/modules/data/DataManager';
import { ResumeParser } from '@/modules/resume-parser/ResumeParser';
import type { UserSettings, ResumeData, JobDescription } from '@/types';

const Options: React.FC = () => {
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'llm' | 'resume' | 'jobs'>('general');
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState('');
  const dataManager = new DataManager();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedSettings = await dataManager.getSettings();
    const loadedResume = await dataManager.getResume();
    const loadedJobs = await dataManager.getAllJobDescriptions();

    if (loadedSettings) {
      setSettings(loadedSettings);
    } else {
      // Default settings
      setSettings({
        language: 'en',
        theme: 'dark',
        llmProvider: 'openai',
        llmModel: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.7,
        sttProvider: 'web-speech',
        sttLanguage: 'en-US',
        questionSensitivity: 0.7,
        enableAudioAnalysis: false,
        enableTextAnalysis: true,
        overlay: {
          position: 'top-right',
          size: 'medium',
          transparency: 0.85,
          autoMinimize: true,
        },
        privacy: {
          autoDeleteTranscripts: true,
          transcriptRetentionDays: 7,
          enableAnalytics: false,
          encryptLocalData: true,
        },
      });
    }

    if (loadedResume) setResume(loadedResume);
    if (loadedJobs) setJobDescriptions(loadedJobs);
  };

  const saveSettings = async () => {
    await dataManager.saveSettings(settings as UserSettings);
    alert('Settings saved!');
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseProgress('Processing file...');

    try {
      if (file.type === 'application/json') {
        setParseProgress('Reading JSON file...');
        const text = await file.text();
        const parsed = JSON.parse(text);
        
        const resumeData: ResumeData = {
          id: crypto.randomUUID(),
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          personalInfo: parsed.personalInfo || {
            fullName: parsed.name || 'Unknown',
            email: parsed.email || '',
          },
          workExperience: parsed.workExperience || [],
          education: parsed.education || [],
          skills: parsed.skills || { technical: [], soft: [], languages: [], certifications: [] },
          projects: parsed.projects || [],
          source: 'uploaded',
          sourceFile: file.name,
        };

        await dataManager.saveResume(resumeData);
        setResume(resumeData);
        setParseProgress('');
        setIsParsing(false);
        alert('Resume uploaded successfully!');
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setParseProgress('Extracting text from PDF...');
        const parser = new ResumeParser();
        
        setParseProgress('Parsing resume data...');
        const resumeData = await parser.parsePDFResume(file);
        
        setParseProgress('Saving resume...');
        await dataManager.saveResume(resumeData);
        setResume(resumeData);
        setParseProgress('');
        setIsParsing(false);
        
        // Show summary of what was extracted
        const extractedInfo = [
          `Name: ${resumeData.personalInfo.fullName}`,
          `Email: ${resumeData.personalInfo.email || 'Not found'}`,
          `Work Experience: ${resumeData.workExperience.length} positions`,
          `Skills: ${resumeData.skills.technical.length} technical skills`,
          `Education: ${resumeData.education.length} entries`
        ].join('\n');
        
        alert(`Resume parsed and uploaded successfully!\n\n${extractedInfo}\n\nCheck the browser console for detailed logs.`);
      } else {
        setIsParsing(false);
        setParseProgress('');
        alert('Please upload a PDF or JSON file.');
      }
    } catch (error) {
      setIsParsing(false);
      setParseProgress('');
      console.error('Resume upload error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to process resume'}`);
    }
  };

  const handleAddJobDescription = () => {
    const title = prompt('Job Title:');
    const company = prompt('Company:');
    const description = prompt('Job Description (paste full text):');

    if (title && company && description) {
      const job: JobDescription = {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        title,
        company,
        description,
        responsibilities: [],
        requirements: [],
        source: 'manual',
      };

      // Simple extraction of responsibilities and requirements
      const lines = description.split('\n');
      lines.forEach(line => {
        if (line.toLowerCase().includes('responsibilit') || line.toLowerCase().includes('duties')) {
          job.responsibilities.push(line);
        }
        if (line.toLowerCase().includes('requirement') || line.toLowerCase().includes('qualification')) {
          job.requirements.push(line);
        }
      });

      dataManager.saveJobDescription(job).then(() => {
        setJobDescriptions([...jobDescriptions, job]);
        alert('Job description added!');
      });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ marginBottom: '24px' }}>InterviewCopilot Settings</h1>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          {(['general', 'llm', 'resume', 'jobs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab ? '#3b82f6' : '#fff',
                color: activeTab === tab ? '#fff' : '#333',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          {activeTab === 'general' && (
            <div>
              <h2>General Settings</h2>
              <div style={{ marginBottom: '16px' }}>
                <label>Language:</label>
                <select
                  value={settings.language || 'en'}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  style={{ marginLeft: '8px', padding: '4px 8px' }}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label>Theme:</label>
                <select
                  value={settings.theme || 'dark'}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as any })}
                  style={{ marginLeft: '8px', padding: '4px 8px' }}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'llm' && (
            <div>
              <h2>LLM Configuration</h2>
              <div style={{ marginBottom: '16px' }}>
                <label>Provider:</label>
                <select
                  value={settings.llmProvider || 'openai'}
                  onChange={(e) => {
                    const newProvider = e.target.value as any;
                    setSettings({ 
                      ...settings, 
                      llmProvider: newProvider,
                      // Set default model based on provider
                      llmModel: newProvider === 'openrouter' ? 'meta-llama/llama-3.2-3b-instruct:free' : 
                               newProvider === 'anthropic' ? 'claude-3-haiku-20240307' : 
                               'gpt-3.5-turbo'
                    });
                  }}
                  style={{ marginLeft: '8px', padding: '4px 8px' }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter (Free models available)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label>Model:</label>
                {settings.llmProvider === 'openrouter' ? (
                  <select
                    value={settings.llmModel || 'meta-llama/llama-3.2-3b-instruct:free'}
                    onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                    style={{ marginLeft: '8px', padding: '4px 8px', width: '350px' }}
                  >
                    <option value="meta-llama/llama-3.2-3b-instruct:free">Llama 3.2 3B (Free)</option>
                    <option value="google/gemini-flash-1.5-8b:free">Gemini Flash 8B (Free)</option>
                    <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
                    <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="openai/gpt-4">GPT-4</option>
                    <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                    <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
                  </select>
                ) : settings.llmProvider === 'anthropic' ? (
                  <select
                    value={settings.llmModel || 'claude-3-haiku-20240307'}
                    onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                    style={{ marginLeft: '8px', padding: '4px 8px', width: '200px' }}
                  >
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                  </select>
                ) : (
                  <select
                    value={settings.llmModel || 'gpt-3.5-turbo'}
                    onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                    style={{ marginLeft: '8px', padding: '4px 8px', width: '200px' }}
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                )}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label>API Key:</label>
                <input
                  type="password"
                  value={settings.apiKey || ''}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder={settings.llmProvider === 'openrouter' ? 'sk-or-v1-..." or get free key at openrouter.ai' : 'sk-...'}
                  style={{ marginLeft: '8px', padding: '4px 8px', width: '300px' }}
                />
                <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                  {settings.llmProvider === 'openrouter' ? (
                    <>
                      Get a free API key (with free credits) at{' '}
                      <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                        openrouter.ai/keys
                      </a>
                      . Free models like Llama 3.2 3B are available.
                    </>
                  ) : (
                    'Your API key is stored locally and encrypted'
                  )}
                </small>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label>Max Tokens:</label>
                <input
                  type="number"
                  value={settings.maxTokens || 500}
                  onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                  style={{ marginLeft: '8px', padding: '4px 8px', width: '100px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label>Temperature:</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={settings.temperature || 0.7}
                  onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  style={{ marginLeft: '8px', padding: '4px 8px', width: '100px' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'resume' && (
            <div>
              <h2>Resume Management</h2>
              {resume ? (
                <div style={{ marginBottom: '16px', padding: '16px', background: '#e8f5e9', borderRadius: '8px' }}>
                  <div><strong>Name:</strong> {resume.personalInfo.fullName}</div>
                  <div><strong>Email:</strong> {resume.personalInfo.email}</div>
                  <div><strong>Work Experience:</strong> {resume.workExperience.length} positions</div>
                  <div><strong>Skills:</strong> {resume.skills.technical.length} technical skills</div>
                </div>
              ) : (
                <div style={{ marginBottom: '16px', padding: '16px', background: '#fff3cd', borderRadius: '8px' }}>
                  No resume uploaded
                </div>
              )}
              <div>
                <label>Upload Resume (PDF or JSON):</label>
                <input
                  type="file"
                  accept=".pdf,.json"
                  onChange={handleResumeUpload}
                  disabled={isParsing}
                  style={{ marginLeft: '8px', opacity: isParsing ? 0.6 : 1 }}
                />
                {isParsing && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#e3f2fd', borderRadius: '4px' }}>
                    <div style={{ marginBottom: '4px' }}>{parseProgress}</div>
                    <div style={{ width: '100%', background: '#ccc', borderRadius: '4px', height: '4px' }}>
                      <div style={{ width: '50%', background: '#3b82f6', height: '4px', borderRadius: '4px', animation: 'pulse 1s infinite' }}></div>
                    </div>
                  </div>
                )}
                <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                  Upload a PDF resume and we'll automatically extract all fields using local parsing (no API key needed). 
                  For image-based PDFs, OCR will be used automatically. JSON format also supported.
                </small>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div>
              <h2>Job Descriptions</h2>
              <button
                onClick={handleAddJobDescription}
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                + Add Job Description
              </button>
              {jobDescriptions.length === 0 ? (
                <div style={{ padding: '16px', background: '#fff3cd', borderRadius: '8px' }}>
                  No job descriptions added
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {jobDescriptions.map(job => (
                    <div key={job.id} style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                      <div><strong>{job.title}</strong> at {job.company}</div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                        {job.description.substring(0, 200)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #ddd' }}>
            <button
              onClick={saveSettings}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Options;

