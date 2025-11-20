// Background service worker for clipboard monitoring
let clipboardHistory = [];
const MAX_SNIPPETS = 50;
const STORAGE_KEY = 'clipboardHistory';

// Load history from storage - call on startup and on install
async function loadHistory() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY] && Array.isArray(result[STORAGE_KEY])) {
      clipboardHistory = result[STORAGE_KEY];
    } else {
      clipboardHistory = [];
      // Initialize empty array in storage
      await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    }
  } catch (error) {
    // Silently handle errors - initialize empty array
    clipboardHistory = [];
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    } catch (e) {
      // Ignore storage errors
    }
  }
  return clipboardHistory;
}

// Load history on install/startup
chrome.runtime.onInstalled.addListener(async () => {
  await loadHistory();
});

// Also load on startup (service worker wakes up)
chrome.runtime.onStartup.addListener(async () => {
  await loadHistory();
});

// Save history to storage
async function saveHistory() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: clipboardHistory });
  } catch (error) {
    // Silently ignore storage errors - data will be lost but extension won't break
  }
}

// Detect code type from content
function detectCodeType(text) {
  const trimmed = text.trim();
  
  // JSON detection
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch (e) {}
  }
  
  // Command detection (npm, git, curl, etc.)
  if (/^(npm|yarn|pnpm|git|curl|wget|docker|kubectl|aws|gcloud)\s/.test(trimmed)) {
    return 'command';
  }
  
  // JavaScript function detection
  if (/^(function|const|let|var|export|import|async\s+function)\s+/.test(trimmed) || 
      /=>\s*\{/.test(trimmed) || 
      /\.(js|jsx|ts|tsx)$/.test(trimmed)) {
    return 'javascript';
  }
  
  // HTML detection
  if (/^<[a-z][\s\S]*>/.test(trimmed) || /\.html?$/.test(trimmed)) {
    return 'html';
  }
  
  // CSS detection
  if (/^[\s\S]*\{[\s\S]*:[\s\S]*\}/.test(trimmed) && !trimmed.includes('function')) {
    return 'css';
  }
  
  // Python detection
  if (/^(def|class|import|from|if __name__)/.test(trimmed) || /\.py$/.test(trimmed)) {
    return 'python';
  }
  
  // SQL detection
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i.test(trimmed)) {
    return 'sql';
  }
  
  // Shell script detection
  if (/^#!\/bin\/(bash|sh|zsh)/.test(trimmed) || /\.(sh|bash|zsh)$/.test(trimmed)) {
    return 'shell';
  }
  
  // Markdown detection
  if (/^#{1,6}\s/.test(trimmed) || /\[.*\]\(.*\)/.test(trimmed)) {
    return 'markdown';
  }
  
  return 'text';
}

// Generate tags based on content
function generateTags(text, codeType) {
  const tags = [codeType];
  const lower = text.toLowerCase();
  
  if (codeType === 'command') {
    if (lower.includes('install')) tags.push('install');
    if (lower.includes('git')) tags.push('git');
    if (lower.includes('npm')) tags.push('npm');
  }
  
  if (codeType === 'javascript') {
    if (lower.includes('function')) tags.push('function');
    if (lower.includes('async')) tags.push('async');
    if (lower.includes('react') || lower.includes('jsx')) tags.push('react');
  }
  
  if (codeType === 'json') {
    tags.push('data');
  }
  
  return tags;
}

// Monitor clipboard changes
let lastClipboardText = '';
let checkInterval;

function startClipboardMonitoring() {
  checkInterval = setInterval(async () => {
    try {
      // Note: Chrome extensions can't directly read clipboard in background
      // We'll use content scripts or the popup to capture clipboard
      // For now, we'll handle this via messages from content scripts
    } catch (error) {
      // Silently ignore monitoring errors
    }
  }, 1000);
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ensure history is loaded before handling requests
  if (!clipboardHistory || clipboardHistory.length === 0) {
    loadHistory().then(() => {
      handleMessage(request, sender, sendResponse);
    });
  } else {
    handleMessage(request, sender, sendResponse);
  }
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender, sendResponse) {
  try {
    if (request.action === 'addClipboard') {
      await handleNewClipboardItem(request.text);
      sendResponse({ success: true });
    } else if (request.action === 'getHistory') {
      await loadHistory(); // Always reload to ensure latest data
      // Sort history: starred first, then by timestamp (newest first)
      const sortedHistory = [...clipboardHistory].sort((a, b) => {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return b.timestamp - a.timestamp;
      });
      sendResponse({ history: sortedHistory });
    } else if (request.action === 'deleteSnippet') {
      await deleteSnippet(request.id);
      sendResponse({ success: true });
    } else if (request.action === 'updateSnippet') {
      await updateSnippet(request.id, request.updates);
      sendResponse({ success: true });
    } else if (request.action === 'clearHistory') {
      await clearHistory();
      sendResponse({ success: true });
    }
  } catch (error) {
    // Silently handle errors - return failure response
    try {
      sendResponse({ success: false, error: 'Unknown error' });
    } catch (e) {
      // Ignore if response channel is closed
    }
  }
}

// Handle new clipboard item
async function handleNewClipboardItem(text) {
  if (!text || text === lastClipboardText) {
    return;
  }
  
  lastClipboardText = text;
  
  // Skip if it's the same as the last item
  if (clipboardHistory.length > 0 && clipboardHistory[0].text === text) {
    return;
  }
  
  const codeType = detectCodeType(text);
  const tags = generateTags(text, codeType);
  
  const snippet = {
    id: Date.now().toString(),
    text: text,
    codeType: codeType,
    tags: tags,
    timestamp: Date.now(),
    note: '',
    starred: false
  };
  
  // Add to beginning of array
  clipboardHistory.unshift(snippet);
  
  // Keep only last MAX_SNIPPETS, but preserve starred snippets
  if (clipboardHistory.length > MAX_SNIPPETS) {
    // Separate starred and non-starred snippets
    const starred = clipboardHistory.filter(s => s.starred);
    const nonStarred = clipboardHistory.filter(s => !s.starred);
    
    // Keep all starred snippets, and limit non-starred to fill remaining slots
    const maxNonStarred = Math.max(0, MAX_SNIPPETS - starred.length);
    const limitedNonStarred = nonStarred.slice(0, maxNonStarred);
    
    // Combine: starred first, then non-starred (sorted by timestamp)
    clipboardHistory = [...starred, ...limitedNonStarred].sort((a, b) => {
      // Starred first
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      // Then by timestamp (newest first)
      return b.timestamp - a.timestamp;
    });
  }
  
  await saveHistory();
  
  // Notify popup if open (silently ignore errors)
  try {
    // Sort history: starred first, then by timestamp (newest first)
    const sortedHistory = [...clipboardHistory].sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return b.timestamp - a.timestamp;
    });
    chrome.runtime.sendMessage({
      action: 'historyUpdated',
      history: sortedHistory
    }).catch(() => {
      // Popup might not be open, ignore error
    });
  } catch (error) {
    // Silently ignore - popup might not be listening
  }
}

// Delete snippet
async function deleteSnippet(id) {
  clipboardHistory = clipboardHistory.filter(s => s.id !== id);
  await saveHistory();
}

// Update snippet
async function updateSnippet(id, updates) {
  const index = clipboardHistory.findIndex(s => s.id === id);
  if (index !== -1) {
    clipboardHistory[index] = { ...clipboardHistory[index], ...updates };
    await saveHistory();
  }
}

// Clear all history (but preserve starred snippets)
async function clearHistory() {
  // Keep only starred snippets
  clipboardHistory = clipboardHistory.filter(s => s.starred);
  await saveHistory();
}

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-picker') {
    chrome.action.openPopup();
  }
});

// Initialize on service worker startup
(async () => {
  await loadHistory();
  startClipboardMonitoring();
})();

