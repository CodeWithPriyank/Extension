// Popup script for clipboard history UI
let snippets = [];
let filteredSnippets = [];
let activeFilter = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Configure Prism autoloader to use local files (after scripts load)
  if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
    window.Prism.plugins.autoloader.languages_path = 'lib/prism/components/';
  }
  
  await loadHistory();
  setupEventListeners();
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
      // Sort snippets: starred first, then by timestamp
      snippets.sort((a, b) => {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return b.timestamp - a.timestamp;
      });
      filteredSnippets = snippets;
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
  
  // Listen for history updates from background
  try {
    chrome.runtime.onMessage.addListener((request) => {
      try {
        if (request && request.action === 'historyUpdated') {
          snippets = request.history || [];
          // Sort snippets: starred first, then by timestamp
          snippets.sort((a, b) => {
            if (a.starred && !b.starred) return -1;
            if (!a.starred && b.starred) return 1;
            return b.timestamp - a.timestamp;
          });
          filteredSnippets = snippets;
          applyFilters();
          renderSnippets();
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
      
      const text = await navigator.clipboard.readText();
      if (text) {
        try {
          await chrome.runtime.sendMessage({ action: 'addClipboard', text });
          await loadHistory();
        } catch (e) {
          // Silently ignore message errors
        }
      }
    } catch (error) {
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
    filtered = filtered.filter(snippet => 
      snippet.tags.includes(activeFilter) || snippet.codeType === activeFilter
    );
  }
  
  // Sort: starred snippets first, then by timestamp (newest first)
  filtered.sort((a, b) => {
    // If one is starred and the other isn't, starred comes first
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    // If both are starred or both are not starred, sort by timestamp (newest first)
    return b.timestamp - a.timestamp;
  });
  
  filteredSnippets = filtered;
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
function getPrismLanguage(codeType) {
  const languageMap = {
    'javascript': 'javascript',
    'json': 'json',
    'html': 'markup',  // Prism uses 'markup' for HTML
    'css': 'css',
    'python': 'python',
    'sql': 'sql',
    'shell': 'bash',   // Prism uses 'bash' for shell scripts
    'markdown': 'markdown',
    'command': 'bash'  // Commands are similar to bash
  };
  return languageMap[codeType] || '';
}

// Create snippet HTML
function createSnippetHTML(snippet) {
  const timeAgo = getTimeAgo(snippet.timestamp);
  const prismLang = getPrismLanguage(snippet.codeType);
  const language = prismLang ? `language-${prismLang}` : '';
  
  return `
    <div class="snippet-item ${snippet.starred ? 'starred' : ''}" id="snippet-${snippet.id}">
      <div class="snippet-header">
        <div class="snippet-meta">
          <span class="snippet-type">${snippet.codeType}</span>
          <div class="snippet-tags">
            ${snippet.tags.slice(0, 3).map(tag => 
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

