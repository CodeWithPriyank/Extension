// Popup script for clipboard history UI
let snippets = [];
let filteredSnippets = [];
let activeFilter = null;

// Track clipboard permission state for popup (resets when popup closes)
let clipboardPermissionState = null;

// Helper to check and update clipboard permission
async function checkClipboardPermission() {
  // If we already know the state, return it
  if (clipboardPermissionState !== null) {
    return clipboardPermissionState === 'granted';
  }
  
  // Try to check permission using Permissions API
  try {
    const result = await navigator.permissions.query({ name: 'clipboard-read' });
    if (result.state === 'granted') {
      clipboardPermissionState = 'granted';
      return true;
    } else if (result.state === 'denied') {
      clipboardPermissionState = 'denied';
      return false;
    }
  } catch (e) {
    // Permissions API might not be available, we'll detect on first access
  }
  
  return null; // Unknown state
}

// Helper to update permission state after clipboard access attempt
function updatePermissionState(granted) {
  clipboardPermissionState = granted ? 'granted' : 'denied';
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Configure Prism autoloader to use local files (after scripts load)
  if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
    window.Prism.plugins.autoloader.languages_path = 'lib/prism/components/';
  }
  
  await loadTheme();
  await loadHistory();
  setupEventListeners();
  setupKeyboardNavigation();
  startClipboardMonitoring();
});

// Load history from background
async function loadHistory() {
  try {
    // Check if runtime is available
    if (!chrome || !chrome.runtime || !chrome.runtime.id) {
      // Show user-friendly message instead of error
      const container = document.getElementById('snippetsContainer');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <p>Extension was reloaded</p>
            <p class="hint">Please refresh this popup</p>
          </div>
        `;
      }
      return;
    }
    
    const response = await chrome.runtime.sendMessage({ action: 'getHistory' });
    if (response && response.history) {
      snippets = response.history;
      // Apply filters (which handles sorting based on active filter)
      const searchQuery = document.getElementById('searchInput')?.value || '';
      applyFilters(searchQuery);
      renderSnippets();
      renderFilterTags();
    } else {
      snippets = [];
      filteredSnippets = [];
      renderSnippets();
    }
  } catch (error) {
    // Silently handle errors - show user-friendly message
    const container = document.getElementById('snippetsContainer');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Unable to load history</p>
          <p class="hint">Please refresh this popup</p>
        </div>
      `;
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('clearBtn').addEventListener('click', handleClear);
  document.getElementById('settingsBtn').addEventListener('click', handleSettings);
  document.getElementById('themeToggle').addEventListener('change', toggleTheme);
  
  // Listen for history updates from background
  try {
    chrome.runtime.onMessage.addListener((request) => {
      try {
        if (request && request.action === 'historyUpdated') {
          snippets = request.history || [];
          // Apply filters (which handles sorting based on active filter)
          const searchQuery = document.getElementById('searchInput')?.value || '';
          applyFilters(searchQuery);
          renderSnippets();
          updateKeyboardNavigation(); // Update navigation after render
        }
      } catch (error) {
        // Silently ignore errors in message handler
      }
    });
  } catch (error) {
    // Silently ignore if listener can't be added
  }
}

// Start monitoring clipboard (via content script injection)
async function startClipboardMonitoring() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    }
  } catch (error) {
    // Silently ignore errors (might not have permission or tab might be special)
  }
  
  // Also try to get current clipboard via document.execCommand
  // This is a fallback method
  setInterval(async () => {
    try {
      // Check if runtime is available before trying to read clipboard
      if (!chrome || !chrome.runtime || !chrome.runtime.id) {
        return;
      }
      
      // Check permission state first
      const hasPermission = await checkClipboardPermission();
      if (hasPermission === false) {
        // User blocked clipboard access, don't try again
        return;
      }
      
      const text = await navigator.clipboard.readText();
      if (text) {
        try {
          await chrome.runtime.sendMessage({ action: 'addClipboard', text });
          await loadHistory();
          // Successfully accessed clipboard, mark as granted
          updatePermissionState(true);
        } catch (e) {
          // Silently ignore message errors
        }
      }
    } catch (error) {
      // Check if error is due to permission denial
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        // User blocked or permission denied, remember this
        updatePermissionState(false);
      }
      // Clipboard access might be restricted - silently ignore
    }
  }, 2000);
}

// Handle search
function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  applyFilters(query);
  renderSnippets();
}

// Apply filters
function applyFilters(searchQuery = '') {
  let filtered = [...snippets];
  
  // Apply search query
  if (searchQuery) {
    filtered = filtered.filter(snippet => 
      snippet.text.toLowerCase().includes(searchQuery) ||
      snippet.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
      snippet.note.toLowerCase().includes(searchQuery)
    );
  }
  
  // Apply tag filter
  if (activeFilter) {
    if (activeFilter === 'starred') {
      // Filter for starred snippets only
      filtered = filtered.filter(snippet => snippet.starred);
    } else {
      filtered = filtered.filter(snippet => 
        snippet.tags.includes(activeFilter) || snippet.codeType === activeFilter
      );
    }
  }
  
  // Sort based on active filter
  if (activeFilter === null) {
    // All filter: sort only by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);
  } else {
    // Other filters: starred snippets first, then by timestamp (newest first)
    filtered.sort((a, b) => {
      // If one is starred and the other isn't, starred comes first
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      // If both are starred or both are not starred, sort by timestamp (newest first)
      return b.timestamp - a.timestamp;
    });
  }
  
  filteredSnippets = filtered;
  // Reset keyboard selection when filters change
  selectedIndex = -1;
  keyboardMode = false;
}

// Render snippets
function renderSnippets() {
  const container = document.getElementById('snippetsContainer');
  
  if (filteredSnippets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No snippets found</p>
        <p class="hint">Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredSnippets.map(snippet => createSnippetHTML(snippet)).join('');
  
  // Update keyboard navigation after render
  if (keyboardMode) {
    updateKeyboardNavigation();
  }
  
  // Attach event listeners to snippet actions
  filteredSnippets.forEach(snippet => {
    const snippetEl = document.getElementById(`snippet-${snippet.id}`);
    if (snippetEl) {
      // Copy button
      const copyBtn = snippetEl.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          copyToClipboard(snippet.text);
        });
      }
      
      // Star button
      const starBtn = snippetEl.querySelector('.star-btn');
      if (starBtn) {
        starBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleStar(snippet.id);
        });
      }
      
      // Delete button
      const deleteBtn = snippetEl.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteSnippet(snippet.id);
        });
      }
      
      // Note input
      const noteInput = snippetEl.querySelector('.snippet-note-input');
      if (noteInput) {
        noteInput.addEventListener('blur', (e) => {
          updateSnippetNote(snippet.id, e.target.value);
        });
        noteInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.target.blur();
          }
        });
      }
      
      // Click to copy
      snippetEl.addEventListener('click', () => {
        copyToClipboard(snippet.text);
      });
    }
  });
  
  // Highlight code after rendering
  highlightCode();
}

// Map our code types to Prism language names
// Note: Prism autoloader will attempt to load languages dynamically
// If a language component isn't available, it will gracefully fallback to no highlighting
function getPrismLanguage(codeType) {
  const languageMap = {
    'javascript': 'javascript',
    'typescript': 'typescript',  // Will fallback to javascript if component not available
    'json': 'json',
    'html': 'markup',  // Prism uses 'markup' for HTML
    'xml': 'markup',   // Prism uses 'markup' for XML
    'css': 'css',
    'python': 'python',
    'java': 'java',    // Will attempt to load, fallback to plain if not available
    'cpp': 'cpp',      // Will attempt to load, fallback to plain if not available
    'c': 'cpp',
    'go': 'go',        // Will attempt to load, fallback to plain if not available
    'rust': 'rust',    // Will attempt to load, fallback to plain if not available
    'php': 'php',      // Will attempt to load, fallback to plain if not available
    'ruby': 'ruby',    // Will attempt to load, fallback to plain if not available
    'swift': 'swift',  // Will attempt to load, fallback to plain if not available
    'kotlin': 'kotlin', // Will attempt to load, fallback to plain if not available
    'sql': 'sql',
    'shell': 'bash',   // Prism uses 'bash' for shell scripts
    'markdown': 'markdown',
    'yaml': 'yaml',    // Will attempt to load, fallback to plain if not available
    'command': 'bash'  // Commands are similar to bash
  };
  return languageMap[codeType] || '';
}

// Create snippet HTML
function createSnippetHTML(snippet) {
  const timeAgo = getTimeAgo(snippet.timestamp);
  const prismLang = getPrismLanguage(snippet.codeType);
  const language = prismLang ? `language-${prismLang}` : '';
  
  // Filter out codeType from tags to avoid duplicates
  const filteredTags = snippet.tags.filter(tag => 
    tag.toLowerCase() !== snippet.codeType.toLowerCase()
  );
  
  return `
    <div class="snippet-item ${snippet.starred ? 'starred' : ''}" id="snippet-${snippet.id}">
      <div class="snippet-header">
        <div class="snippet-meta">
          <span class="snippet-type">${snippet.codeType}</span>
          <div class="snippet-tags">
            ${filteredTags.slice(0, 3).map(tag => 
              `<span class="snippet-tag">${tag}</span>`
            ).join('')}
          </div>
        </div>
        <div class="snippet-actions">
          <button class="snippet-action-btn star-btn ${snippet.starred ? 'starred' : ''}" title="Star">
            ${snippet.starred ? '⭐' : '☆'}
          </button>
          <button class="snippet-action-btn copy-btn" title="Copy">📋</button>
          <button class="snippet-action-btn delete-btn" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="snippet-content">
        <pre><code class="${language}">${escapeHtml(snippet.text)}</code></pre>
      </div>
      <input type="text" class="snippet-note-input" placeholder="Add a note..." value="${escapeHtml(snippet.note || '')}">
      <div class="snippet-timestamp">${timeAgo}</div>
    </div>
  `;
}

// Render filter tags
function renderFilterTags() {
  const container = document.getElementById('filterTags');
  const allTags = new Set();
  
  snippets.forEach(snippet => {
    snippet.tags.forEach(tag => allTags.add(tag));
    allTags.add(snippet.codeType);
  });
  
  const tagsArray = Array.from(allTags).sort();
  
  container.innerHTML = `
    <div class="filter-tag ${activeFilter === null ? 'active' : ''}" data-filter="all">
      All
    </div>
    <div class="filter-tag ${activeFilter === 'starred' ? 'active' : ''}" data-filter="starred">
      ⭐ Starred
    </div>
    ${tagsArray.map(tag => `
      <div class="filter-tag ${activeFilter === tag ? 'active' : ''}" data-filter="${tag}">
        ${tag}
      </div>
    `).join('')}
  `;
  
  // Attach event listeners
  container.querySelectorAll('.filter-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const filter = tag.dataset.filter;
      activeFilter = filter === 'all' ? null : filter;
      renderFilterTags();
      applyFilters(document.getElementById('searchInput').value);
      renderSnippets();
    });
  });
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotification('Copied to clipboard!');
  } catch (error) {
    // Fallback method
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showNotification('Copied to clipboard!');
  }
}

// Toggle star
async function toggleStar(id) {
  try {
    const snippet = snippets.find(s => s.id === id);
    if (snippet) {
      await chrome.runtime.sendMessage({
        action: 'updateSnippet',
        id: id,
        updates: { starred: !snippet.starred }
      });
      await loadHistory();
    }
  } catch (error) {
    // Silently ignore errors
  }
}

// Delete snippet
async function deleteSnippet(id) {
  try {
    if (confirm('Delete this snippet?')) {
      await chrome.runtime.sendMessage({ action: 'deleteSnippet', id });
      await loadHistory();
    }
  } catch (error) {
    // Silently ignore errors
  }
}

// Update snippet note
async function updateSnippetNote(id, note) {
  try {
    await chrome.runtime.sendMessage({
      action: 'updateSnippet',
      id: id,
      updates: { note: note.trim() }
    });
    await loadHistory();
  } catch (error) {
    // Silently ignore errors
  }
}

// Clear all history
async function handleClear() {
  try {
    if (confirm('Clear all clipboard history?')) {
      await chrome.runtime.sendMessage({ action: 'clearHistory' });
      await loadHistory();
    }
  } catch (error) {
    // Silently ignore errors
  }
}

// Handle settings
function handleSettings() {
  // TODO: Implement settings UI
  alert('Settings coming soon!');
}

// Theme management
let currentTheme = 'dark';

async function loadTheme() {
  try {
    const result = await chrome.storage.local.get('theme');
    if (result.theme) {
      currentTheme = result.theme;
    } else {
      // If no theme stored, default to dark and save it
      currentTheme = 'dark';
      await chrome.storage.local.set({ theme: currentTheme });
    }
    applyTheme(currentTheme);
  } catch (error) {
    // Default to dark theme on error
    currentTheme = 'dark';
    applyTheme('dark');
  }
}

async function toggleTheme() {
  try {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      // Checkbox checked = light mode, unchecked = dark mode
      currentTheme = themeToggle.checked ? 'light' : 'dark';
      await chrome.storage.local.set({ theme: currentTheme });
      applyTheme(currentTheme);
    }
  } catch (error) {
    console.error('Error toggling theme:', error);
  }
}

function applyTheme(theme) {
  try {
    document.body.setAttribute('data-theme', theme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      // Checkbox checked = light mode, unchecked = dark mode
      themeToggle.checked = theme === 'light';
      const label = themeToggle.closest('.theme-toggle-switch');
      if (label) {
        label.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      }
    }
    // Update currentTheme to match
    currentTheme = theme;
  } catch (error) {
    console.error('Error applying theme:', error);
  }
}

// Keyboard navigation
let selectedIndex = -1;
let keyboardMode = false;

function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // Don't interfere with typing in search or note inputs
    if (e.target.tagName === 'INPUT' && e.target.id !== 'searchInput') {
      if (e.key === 'Escape') {
        e.target.blur();
      }
      return;
    }
    
    // If typing in search, enable keyboard mode
    if (e.target.id === 'searchInput') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        keyboardMode = true;
        selectedIndex = 0;
        updateKeyboardNavigation();
        return;
      }
      if (e.key === 'Escape') {
        e.target.value = '';
        handleSearch({ target: { value: '' } });
        return;
      }
      return;
    }
    
    // Keyboard navigation keys
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        keyboardMode = true;
        selectedIndex = Math.min(selectedIndex + 1, filteredSnippets.length - 1);
        updateKeyboardNavigation();
        scrollToSelected();
        break;
      case 'ArrowUp':
        e.preventDefault();
        keyboardMode = true;
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateKeyboardNavigation();
        scrollToSelected();
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < filteredSnippets.length) {
          e.preventDefault();
          const snippet = filteredSnippets[selectedIndex];
          copyToClipboard(snippet.text);
        }
        break;
      case 'Escape':
        keyboardMode = false;
        selectedIndex = -1;
        updateKeyboardNavigation();
        break;
      case '/':
        // Focus search on '/' key
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          document.getElementById('searchInput').focus();
        }
        break;
    }
  });
  
  // Disable keyboard mode when clicking
  document.addEventListener('click', () => {
    keyboardMode = false;
    selectedIndex = -1;
    updateKeyboardNavigation();
  });
}

function updateKeyboardNavigation() {
  const container = document.getElementById('snippetsContainer');
  if (!container) return;
  
  const items = container.querySelectorAll('.snippet-item');
  items.forEach((item, index) => {
    if (keyboardMode && index === selectedIndex) {
      item.classList.add('keyboard-selected');
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      item.classList.remove('keyboard-selected');
    }
  });
}

function scrollToSelected() {
  const container = document.getElementById('snippetsContainer');
  if (!container || selectedIndex < 0) return;
  
  const items = container.querySelectorAll('.snippet-item');
  if (items[selectedIndex]) {
    items[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// Get time ago
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show notification
function showNotification(message) {
  // Simple notification (could be enhanced with a toast library)
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #007acc;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// Initialize Prism syntax highlighting after rendering
function highlightCode() {
  if (window.Prism) {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      Prism.highlightAll();
    }, 50);
  }
}

