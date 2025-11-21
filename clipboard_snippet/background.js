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
  if (!trimmed) return 'text';
  
  const lines = trimmed.split('\n');
  const firstLine = lines[0].trim();
  const firstFewLines = lines.slice(0, 5).join('\n');
  const lowerText = trimmed.toLowerCase();
  
  // JSON detection - must be valid JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch (e) {}
  }
  
  // Command detection (npm, git, curl, etc.) - check first line
  if (/^(npm|yarn|pnpm|git|curl|wget|docker|kubectl|aws|gcloud|brew|apt|yum|pip|conda|sudo|chmod|chown|ls|cd|mkdir|rm|cp|mv)\s/.test(firstLine)) {
    return 'command';
  }
  
  // Shell script detection - shebang or file extension
  if (/^#!\/bin\/(bash|sh|zsh|fish|dash)/.test(firstLine) || 
      /^#!\/usr\/bin\/(env\s+)?(bash|sh|zsh|fish)/.test(firstLine) ||
      /\.(sh|bash|zsh|fish)$/.test(trimmed)) {
    return 'shell';
  }
  
  // SQL detection - SQL keywords at start
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|EXPLAIN|MERGE|TRUNCATE)\s/i.test(firstLine)) {
    return 'sql';
  }
  
  // PHP detection - PHP opening tag
  if (/^<\?php/.test(firstLine) || /\.php$/.test(trimmed)) {
    return 'php';
  }
  
  // HTML detection - HTML tags
  if (/^<(!DOCTYPE|html|head|body|div|span|p|a|img|script|style|h[1-6]|ul|ol|li|table|form|input|button)/i.test(firstLine) ||
      /^<[a-z][a-z0-9]*[\s>]/.test(firstLine) && /<\/[a-z]/.test(trimmed)) {
    return 'html';
  }
  
  // XML detection
  if (/^<\?xml/.test(firstLine) || 
      (/^<[A-Z][a-zA-Z0-9]*[\s>]/.test(firstLine) && /<\/[A-Z]/.test(trimmed))) {
    return 'xml';
  }
  
  // TypeScript detection - TS-specific syntax
  if (/\.(ts|tsx)$/.test(trimmed)) {
    return 'typescript';
  }
  if ((/interface\s+\w+|type\s+\w+\s*=\s*(string|number|boolean|any|void|object|Array|Promise|Record|Partial|Pick|Omit)/.test(trimmed) ||
       /:\s*(string|number|boolean|any|void|object|Array|Promise|Record|Partial|Pick|Omit)\s*[;=,)]/.test(trimmed) ||
       /<[A-Z][a-zA-Z0-9]*>/.test(trimmed)) &&
      !/\.(js|jsx)$/.test(trimmed)) {
    return 'typescript';
  }
  
  // JavaScript/JSX detection
  if (/\.(js|jsx|mjs|cjs)$/.test(trimmed)) {
    return 'javascript';
  }
  if (/^(function|const|let|var|export|import|async\s+function|class|const\s+\w+\s*=\s*\(|const\s+\w+\s*=\s*async\s*\(|export\s+(default\s+)?(function|const|class|let|var))/i.test(firstLine) || 
      /=>\s*\{/.test(trimmed) ||
      /React\.(createElement|Component|Fragment)/.test(trimmed) ||
      /(useState|useEffect|useContext|useReducer|useMemo|useCallback)\(/.test(trimmed) ||
      /document\.(getElementById|querySelector|addEventListener)/.test(trimmed) ||
      /window\.(addEventListener|location|history)/.test(trimmed)) {
    return 'javascript';
  }
  
  // Python detection
  if (/\.py$/.test(trimmed) || /#!\/usr\/bin\/(env\s+)?python/.test(firstLine)) {
    return 'python';
  }
  if (/^(def|class|import|from|if __name__|@|async def|lambda|print\(|#\s*[a-z])/i.test(firstLine) ||
      /^\s*(def|class|import|from|if|elif|else|for|while|try|except|with|async def)\s+/.test(firstLine)) {
    return 'python';
  }
  
  // Java detection
  if (/\.java$/.test(trimmed)) {
    return 'java';
  }
  if (/^(public|private|protected|class|interface|package|import)\s+/.test(firstLine) ||
      /@(Override|Deprecated|SuppressWarnings|Entity|Service|Component|Autowired)/.test(trimmed)) {
    return 'java';
  }
  
  // C/C++ detection
  if (/\.(c|cpp|cc|cxx|h|hpp)$/.test(trimmed)) {
    return 'cpp';
  }
  if (/^(#include|#define|#ifdef|#ifndef|#pragma|using namespace|std::)/.test(firstLine) ||
      /int\s+main\s*\(/.test(trimmed)) {
    return 'cpp';
  }
  
  // Go detection
  if (/\.go$/.test(trimmed)) {
    return 'go';
  }
  if (/^(package|import|func|var|const|type)\s+/.test(firstLine) ||
      (/:=/.test(trimmed) && /func\s+\w+\s*\(/.test(trimmed))) {
    return 'go';
  }
  
  // Rust detection
  if (/\.rs$/.test(trimmed)) {
    return 'rust';
  }
  if (/^(fn|let|mut|pub|use|mod|struct|enum|impl|trait|match)\s+/.test(firstLine) ||
      (/->\s*[A-Z]/.test(trimmed) && /fn\s+\w+/.test(trimmed))) {
    return 'rust';
  }
  
  // Ruby detection
  if (/\.rb$/.test(trimmed) || /#!\/usr\/bin\/(env\s+)?ruby/.test(firstLine)) {
    return 'ruby';
  }
  if (/^(def|class|module|require|include)\s+/.test(firstLine) ||
      (/end\s*$/.test(trimmed) && /def\s+\w+/.test(trimmed))) {
    return 'ruby';
  }
  
  // Swift detection
  if (/\.swift$/.test(trimmed)) {
    return 'swift';
  }
  if (/^(import|func|class|struct|enum|protocol|let|var|extension)\s+/.test(firstLine) ||
      /@(IBAction|IBOutlet|objc|available|discardableResult)/.test(trimmed)) {
    return 'swift';
  }
  
  // Kotlin detection
  if (/\.kt$/.test(trimmed)) {
    return 'kotlin';
  }
  if (/^(fun|class|data class|object|package|import|val|var|interface)\s+/.test(firstLine)) {
    return 'kotlin';
  }
  
  // CSS/SCSS/SASS detection - must have CSS-like structure
  if (/\.(css|scss|sass|less)$/.test(trimmed)) {
    return 'css';
  }
  // Check for CSS selectors and properties
  if ((/^[\s]*([.#]?[a-z][a-z0-9_-]*|@[a-z]+)[\s]*\{/.test(firstLine) ||
       /^[\s]*[a-z-]+[\s]*:[\s]*[^;]+;/.test(firstLine)) &&
      !trimmed.includes('function') && 
      !trimmed.includes('=>') &&
      !trimmed.includes('var ') &&
      !trimmed.includes('const ') &&
      !trimmed.includes('let ')) {
    if (/@(import|mixin|include|extend|media|keyframes|function|if|for|while)/.test(trimmed)) {
      return 'css'; // SCSS/SASS
    }
    // More strict CSS check - should have selector and property
    if (/\{[^}]*[a-z-]+[\s]*:[\s]*[^;]+;/.test(trimmed)) {
      return 'css';
    }
  }
  
  // Markdown detection
  if (/\.md$/.test(trimmed) || /\.markdown$/.test(trimmed)) {
    return 'markdown';
  }
  if (/^#{1,6}\s+/.test(firstLine) || 
      (/\[.*\]\(.*\)/.test(trimmed) && lines.length > 1) ||
      (/^[-*+]\s+/.test(firstLine) && lines.some(l => /^[-*+]\s+/.test(l)))) {
    return 'markdown';
  }
  
  // YAML detection
  if (/\.(yaml|yml)$/.test(trimmed)) {
    return 'yaml';
  }
  if (/^[\s]*(---|\.\.\.)/.test(firstLine) ||
      (/^[\s]*[a-zA-Z_-]+:[\s]*/.test(firstLine) && 
       lines.slice(0, 3).some(l => /^[\s]*[a-zA-Z_-]+:[\s]*/.test(l)) &&
       !trimmed.includes('{'))) {
    return 'yaml';
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

