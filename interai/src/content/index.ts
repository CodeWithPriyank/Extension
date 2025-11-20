/**
 * Content Script - Injects UI into video conference pages
 * Handles audio capture and STT (has DOM access)
 */
import { AudioManager } from '@/modules/audio/AudioManager';
import { STTEngine } from '@/modules/stt/STTEngine';

// Audio and STT instances (only in content script context)
let audioManager: AudioManager | null = null;
let sttEngine: STTEngine | null = null;
let isRecording = false;

// Create overlay container
function createOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = 'interviewcopilot-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 600px;
    background: rgba(26, 26, 26, 0.95);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #ffffff;
    display: none;
    overflow: hidden;
  `;

  return overlay;
}

// Create overlay content
function createOverlayContent(): string {
  return `
    <div style="padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="status-indicator" style="width: 12px; height: 12px; border-radius: 50%; background: #999;"></div>
          <span style="font-weight: 600; font-size: 16px;">InterviewCopilot</span>
        </div>
        <button id="close-overlay" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 20px;">×</button>
      </div>
      
      <div id="recording-controls" style="margin-bottom: 16px; display: flex; gap: 8px;">
        <button id="start-recording-btn" style="flex: 1; padding: 10px; background: #4caf50; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #fff;"></span>
          Start Recording
        </button>
        <button id="stop-recording-btn" style="flex: 1; padding: 10px; background: #f44336; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; align-items: center; justify-content: center; gap: 6px; display: none;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #fff;"></span>
          Stop Recording
        </button>
      </div>
      
      <div id="recording-status" style="text-align: center; padding: 8px; margin-bottom: 12px; font-size: 12px; color: #999; display: none;">
        <span id="recording-status-text">Recording...</span>
      </div>
      
      <div id="overlay-content" style="max-height: 400px; overflow-y: auto;">
        <div id="status-message" style="text-align: center; padding: 20px; color: #999;">
          Waiting for interview to start...
        </div>
      </div>
    </div>
  `;
}

// Attach button listeners to overlay
function attachButtonListeners(overlay: HTMLElement): void {
  // Setup event listeners
  const closeBtn = overlay.querySelector('#close-overlay');
  if (closeBtn) {
    // Remove existing listeners by cloning
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
    });
  }

  // Setup recording button listeners
  const startBtn = overlay.querySelector('#start-recording-btn');
  const stopBtn = overlay.querySelector('#stop-recording-btn');
  
  if (startBtn) {
    // Remove existing listeners by cloning
    const newStartBtn = startBtn.cloneNode(true);
    startBtn.parentNode?.replaceChild(newStartBtn, startBtn);
    newStartBtn.addEventListener('click', async () => {
      await handleStartRecording();
    });
  }
  
  if (stopBtn) {
    // Remove existing listeners by cloning
    const newStopBtn = stopBtn.cloneNode(true);
    stopBtn.parentNode?.replaceChild(newStopBtn, stopBtn);
    newStopBtn.addEventListener('click', () => {
      handleStopRecording();
    });
  }
}

// Inject overlay (only when needed)
function injectOverlay(): HTMLElement {
  let overlay = document.getElementById('interviewcopilot-overlay') as HTMLElement;
  
  if (!overlay) {
    overlay = createOverlay();
    overlay.innerHTML = createOverlayContent();
    // Ensure it's hidden when created
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    // Always attach listeners when creating new overlay
    attachButtonListeners(overlay);
  } else {
    // Re-attach listeners in case they were lost
    attachButtonListeners(overlay);
    // Ensure it's hidden unless explicitly shown
    overlay.style.display = 'none';
  }

  return overlay;
}

// Get or create overlay (lazy initialization)
function getOrCreateOverlay(): HTMLElement {
  return injectOverlay();
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Update overlay content
function updateOverlayContent(content: string): void {
  const contentDiv = document.getElementById('overlay-content');
  if (contentDiv) {
    contentDiv.innerHTML = content;
  }
}

function showQuestion(question: string): void {
  const contentDiv = document.getElementById('overlay-content');
  if (!contentDiv) return;
  
  const existingContent = contentDiv.innerHTML;
  const newContent = `
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #999; margin-bottom: 8px;">💡 Question Detected</div>
      <div style="background: rgba(59, 130, 246, 0.2); padding: 12px; border-radius: 8px; border-left: 3px solid #3b82f6;">
        ${escapeHtml(question)}
      </div>
    </div>
    ${existingContent}
  `;
  contentDiv.innerHTML = newContent;
}

function showSuggestion(question: string, suggestion: any): void {
  const contentDiv = document.getElementById('overlay-content');
  if (!contentDiv) return;
  
  const content = `
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #999; margin-bottom: 8px;">💡 Question</div>
      <div style="background: rgba(59, 130, 246, 0.2); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        ${escapeHtml(question)}
      </div>
      
      <div style="font-size: 12px; color: #999; margin-bottom: 8px;">📝 Suggested Answer</div>
      <div style="background: rgba(76, 175, 80, 0.2); padding: 12px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
        ${escapeHtml(suggestion.answer)}
      </div>
      
      ${suggestion.keyPoints && suggestion.keyPoints.length > 0 ? `
        <div style="margin-top: 12px;">
          <div style="font-size: 12px; color: #999; margin-bottom: 8px;">Key Points</div>
          <ul style="margin: 0; padding-left: 20px;">
            ${suggestion.keyPoints.map((point: string) => `<li style="margin-bottom: 4px;">${escapeHtml(point)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
  contentDiv.innerHTML = content;
}

function showError(message: string): void {
  // Check if it's a quota error to provide additional help
  const isQuotaError = message.includes('quota') || message.includes('exceeded') || message.includes('plan limit');
  const isAuthError = message.includes('API key') || message.includes('authentication');
  
  // Extract URLs from message for special handling
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let escapedMessage = escapeHtml(message).replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #4caf50; text-decoration: underline;">${url}</a>`;
  });
  
  // Format numbered lists better (convert "1. " to proper list items)
  escapedMessage = escapedMessage.replace(/(\d+\.\s+)([^\n]+)/g, '<div style="margin: 4px 0; padding-left: 8px;">$1$2</div>');
  
  // Replace double newlines with paragraph breaks for better spacing
  escapedMessage = escapedMessage.replace(/\n\n/g, '</div><div style="margin-top: 8px;">');
  escapedMessage = escapedMessage.replace(/\n/g, '<br>');
  
  const helpText = isQuotaError 
    ? '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #999;">💡 Note: ChatGPT Plus subscription is separate from API access. You need to set up API billing separately.</div>'
    : isAuthError
    ? '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #999;">💡 Tip: Go to extension settings to update your API key.</div>'
    : '';
  
  const content = `
    <div style="background: rgba(244, 67, 54, 0.2); padding: 12px; border-radius: 8px; border-left: 3px solid #f44336;">
      <div style="color: #f44336; font-weight: 600; margin-bottom: 8px;">⚠️ Error</div>
      <div style="color: #fff; line-height: 1.6; margin-bottom: ${helpText ? '0' : '0'};">
        ${escapedMessage}
      </div>
      ${helpText}
    </div>
  `;
  updateOverlayContent(content);
}

// Initialize audio and STT
async function startAudioCapture(): Promise<void> {
  try {
    audioManager = new AudioManager();
    sttEngine = new STTEngine();

    // Set up transcript handler
    sttEngine.onTranscript((text, isFinal) => {
      if (isFinal && text.trim()) {
        // Send transcript to background
        chrome.runtime.sendMessage({
          type: 'transcript',
          data: {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            speaker: 'interviewer',
            text: text.trim(),
            isFinal: true,
          },
        }).catch(err => console.error('Failed to send transcript:', err));
      }
    });

    // Start audio capture
    await audioManager.startCapture();
    const audioStream = audioManager.getAudioStream();
    
    if (!audioStream) {
      throw new Error('Failed to get audio stream');
    }

    // Start transcription
    await sttEngine.startTranscription(audioStream);
    
    isRecording = true;
    updateRecordingUI();
    console.log('Audio capture and transcription started');
  } catch (error) {
    console.error('Failed to start audio capture:', error);
    isRecording = false;
    updateRecordingUI();
    // Notify background of error
    chrome.runtime.sendMessage({
      type: 'audio_capture_error',
      data: { error: String(error) },
    });
  }
}

function stopAudioCapture(): void {
  if (sttEngine) {
    sttEngine.stopTranscription();
    sttEngine = null;
  }
  if (audioManager) {
    audioManager.stopCapture();
    audioManager = null;
  }
  isRecording = false;
  updateRecordingUI();
  console.log('Audio capture and transcription stopped');
}

// Handle start recording button click
async function handleStartRecording(): Promise<void> {
  if (isRecording) {
    return;
  }
  
  try {
    await startAudioCapture();
  } catch (error) {
    console.error('Failed to start recording:', error);
    showError(`Failed to start recording: ${error}`);
  }
}

// Handle stop recording button click
function handleStopRecording(): void {
  if (!isRecording) {
    return;
  }
  
  stopAudioCapture();
}

// Update recording UI state
function updateRecordingUI(): void {
  const startBtn = document.getElementById('start-recording-btn');
  const stopBtn = document.getElementById('stop-recording-btn');
  const statusDiv = document.getElementById('recording-status');
  const statusText = document.getElementById('recording-status-text');
  const statusIndicator = document.getElementById('status-indicator');
  
  if (isRecording) {
    // Show stop button, hide start button
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'flex';
    if (statusDiv) statusDiv.style.display = 'block';
    if (statusText) statusText.textContent = '🔴 Recording in progress...';
    if (statusText) statusText.style.color = '#f44336';
    if (statusIndicator) statusIndicator.style.background = '#f44336';
  } else {
    // Show start button, hide stop button
    if (startBtn) startBtn.style.display = 'flex';
    if (stopBtn) stopBtn.style.display = 'none';
    if (statusDiv) statusDiv.style.display = 'block';
    if (statusText) statusText.textContent = '⏸️ Recording stopped';
    if (statusText) statusText.style.color = '#999';
    if (statusIndicator) statusIndicator.style.background = '#999';
  }
}

// Message handler from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'start_audio_capture':
      // Create and show overlay when session starts
      const overlay1 = getOrCreateOverlay();
      overlay1.style.display = 'block';
      updateOverlayContent('<div style="text-align: center; padding: 20px; color: #999;">Click "Start Recording" to begin capturing audio.</div>');
      updateRecordingUI();
      sendResponse({ success: true });
      break;

    case 'stop_audio_capture':
      stopAudioCapture();
      sendResponse({ success: true });
      break;

    case 'session_started':
      // Create and show overlay when session starts
      const overlay2 = getOrCreateOverlay();
      overlay2.style.display = 'block';
      updateOverlayContent('<div style="text-align: center; padding: 20px; color: #999;">Interview session started. Click "Start Recording" to begin.</div>');
      updateRecordingUI();
      break;

    case 'question_detected':
      // Create and show overlay when question is detected
      const overlay3 = getOrCreateOverlay();
      overlay3.style.display = 'block';
      showQuestion(message.data.questionText);
      break;

    case 'suggestion_ready':
      // Create and show overlay when suggestion is ready
      const overlay4 = getOrCreateOverlay();
      overlay4.style.display = 'block';
      // Find the question text from the question entry
      const questionEntry = message.data.questionEntry || {};
      const question = questionEntry.questionText || message.data.questionText || 'Question';
      showSuggestion(question, message.data.suggestion);
      break;

    case 'suggestion_error':
      // Create and show overlay when there's an error
      const overlay5 = getOrCreateOverlay();
      overlay5.style.display = 'block';
      showError(message.data.error || 'Failed to generate suggestion');
      break;

    case 'session_ended':
      stopAudioCapture();
      const overlay6 = document.getElementById('interviewcopilot-overlay');
      if (overlay6) {
        const contentDiv = document.getElementById('overlay-content');
        if (contentDiv) {
          contentDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Session ended. Check extension for summary.</div>';
        }
        updateRecordingUI();
        // Hide overlay after session ends
        overlay6.style.display = 'none';
      }
      break;

    case 'transcript':
      // Could show live transcript if needed
      break;
  }

  sendResponse({ received: true });
});

// Clean up any existing overlay on page load and ensure it's hidden
function cleanupExistingOverlay(): void {
  const existingOverlay = document.getElementById('interviewcopilot-overlay');
  if (existingOverlay) {
    // Hide it immediately
    existingOverlay.style.display = 'none';
    // Optionally remove it completely to ensure clean state
    existingOverlay.remove();
  }
}

// Initialize: Clean up any existing overlay when content script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cleanupExistingOverlay);
} else {
  cleanupExistingOverlay();
}

// Also clean up on navigation (for SPAs like Google Meet)
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Clean up overlay on navigation
    setTimeout(cleanupExistingOverlay, 100);
  }
});
urlObserver.observe(document, { subtree: true, childList: true });

