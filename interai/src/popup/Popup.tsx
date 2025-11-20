import React, { useState, useEffect } from 'react';
import { Play, Square, Settings } from 'lucide-react';
import { DataManager } from '@/modules/data/DataManager';

const Popup: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [hasJobDesc, setHasJobDesc] = useState(false);
  const dataManager = new DataManager();

  useEffect(() => {
    checkStatus();
    checkData();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'get_session_status' });
      setIsActive(response.active || false);
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const checkData = async () => {
    const resume = await dataManager.getResume();
    const jobs = await dataManager.getAllJobDescriptions();
    setHasResume(!!resume);
    setHasJobDesc(jobs.length > 0);
  };

  const handleStart = async () => {
    if (!hasResume) {
      alert('Please upload your resume in settings first.');
      chrome.runtime.openOptionsPage();
      return;
    }

    if (!hasJobDesc) {
      alert('Please add a job description in settings first.');
      chrome.runtime.openOptionsPage();
      return;
    }

    const resume = await dataManager.getResume();
    const jobs = await dataManager.getAllJobDescriptions();

    if (!resume || jobs.length === 0) {
      alert('Please configure resume and job description first.');
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: 'start_session',
        data: {
          jobDescriptionId: jobs[0].id,
          resumeId: resume.id,
        },
      });
      setIsActive(true);
    } catch (error) {
      alert('Failed to start session: ' + error);
    }
  };

  const handleStop = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'stop_session' });
      setIsActive(false);
    } catch (error) {
      alert('Failed to stop session: ' + error);
    }
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div style={{ padding: '16px', minWidth: '300px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
          InterviewCopilot
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
          AI-powered interview assistant
        </p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          padding: '12px', 
          background: hasResume && hasJobDesc ? '#e8f5e9' : '#fff3cd',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          {!hasResume && <div style={{ color: '#856404' }}>⚠️ Resume not uploaded</div>}
          {!hasJobDesc && <div style={{ color: '#856404' }}>⚠️ Job description not added</div>}
          {hasResume && hasJobDesc && (
            <div style={{ color: '#2e7d32' }}>✓ Ready to start</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {!isActive ? (
          <button
            onClick={handleStart}
            disabled={!hasResume || !hasJobDesc}
            style={{
              flex: 1,
              padding: '12px',
              background: hasResume && hasJobDesc ? '#3b82f6' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: hasResume && hasJobDesc ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <Play size={16} />
            Start Interview
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              flex: 1,
              padding: '12px',
              background: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <Square size={16} />
            Stop Interview
          </button>
        )}
      </div>

      <button
        onClick={openSettings}
        style={{
          width: '100%',
          padding: '8px',
          background: 'transparent',
          color: '#666',
          border: '1px solid #ddd',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Settings size={16} />
        Settings
      </button>

      {isActive && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#e3f2fd', 
          borderRadius: '8px',
          fontSize: '14px',
          color: '#1976d2'
        }}>
          🔴 Interview session active. Check the overlay on your video call.
        </div>
      )}
    </div>
  );
};

export default Popup;

