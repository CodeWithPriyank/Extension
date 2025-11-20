// Background Service Worker - Coordinates audio detection across all tabs

class TabSoundManager {
  constructor() {
    this.audioTabs = new Map(); // tabId -> { title, url, favIconUrl, volume, muted, playing }
    this.setupListeners();
    this.startMonitoring();
  }

  setupListeners() {
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'AUDIO_STATE_UPDATE') {
        this.handleAudioStateUpdate(sender.tab.id, message.data);
      }
      return true; // Keep message channel open for async responses
    });

    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.injectContentScript(tabId);
      }
      if (changeInfo.title || changeInfo.favIconUrl) {
        this.updateTabInfo(tabId, tab);
      }
      // Check audible state when it changes
      // Note: audible becomes false when muted, but we still want to keep the tab
      // So we rely on content script to tell us if media is actually playing
      if (changeInfo.audible !== undefined) {
        // Always check content script for accurate playing state
        // This handles both audible and muted cases
        chrome.tabs.sendMessage(tabId, { type: 'REQUEST_AUDIO_STATE' }).then((response) => {
          if (response && response.playing) {
            // Content script confirms media is playing (even if muted)
            this.handleAudioStateUpdate(tabId, {
              playing: true,
              volume: response.volume !== undefined ? response.volume : 1.0,
              muted: response.muted !== undefined ? response.muted : false
            });
          } else {
            // Content script says not playing - remove from list
            // This means media is paused/ended, not just muted
            if (this.audioTabs.has(tabId)) {
              this.audioTabs.delete(tabId);
              this.updateBadge();
            }
          }
        }).catch(() => {
          // Content script not available
          // If tab is audible, add it (might be Web Audio API or other)
          // If not audible, only remove if we have it (might be muted)
          if (tab.audible) {
            this.handleAudioStateUpdate(tabId, {
              playing: true,
              volume: 1.0,
              muted: false
            });
          } else {
            // Not audible and no content script - check if we should remove
            // Only remove if we're sure it's not just muted
            // For now, keep it if it exists (might be muted)
            // The periodic check will handle cleanup
          }
        });
      }
    });

    // Clean up when tabs are closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.audioTabs.delete(tabId);
      this.updateBadge();
    });

    // Handle tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.updateBadge();
    });
  }

  async injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      });
    } catch (error) {
      // Ignore errors for special pages (chrome://, etc.)
      console.debug('Could not inject script into tab:', tabId, error);
    }
  }

  handleAudioStateUpdate(tabId, data) {
    const existing = this.audioTabs.get(tabId);
    
    if (data.playing) {
      // Get tab info if we don't have it, or update existing
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) return;
        
        // Only update if tab info changed or it's a new entry
        const tabData = {
          title: tab.title || 'Unknown',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl || '',
          volume: data.volume !== undefined ? data.volume : (existing?.volume || 1.0),
          muted: data.muted !== undefined ? data.muted : (existing?.muted || false),
          playing: true,
          lastUpdate: Date.now()
        };
        
        // Only update badge if this is a new entry
        const isNew = !existing || !existing.playing;
        this.audioTabs.set(tabId, tabData);
        
        if (isNew) {
          this.updateBadge();
        }
      });
    } else {
      // Remove from active audio tabs if not playing
      if (existing && existing.playing) {
        this.audioTabs.delete(tabId);
        this.updateBadge();
      }
    }
  }

  updateTabInfo(tabId, tab) {
    const existing = this.audioTabs.get(tabId);
    if (existing) {
      existing.title = tab.title || existing.title;
      existing.url = tab.url || existing.url;
      existing.favIconUrl = tab.favIconUrl || existing.favIconUrl;
      this.audioTabs.set(tabId, existing);
    }
  }

  async startMonitoring() {
    // Inject content scripts into all existing tabs
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      this.injectContentScript(tab.id);
    });

    // Periodic check for audio state
    setInterval(() => {
      this.checkAudioState();
    }, 1000);
  }

  async checkAudioState() {
    // Check all tabs using content script to get accurate playing state
    // This handles muted tabs correctly (they stay in list)
    const tabs = await chrome.tabs.query({});
    
    tabs.forEach(tab => {
      // Always check content script first - it knows if media is playing
      // regardless of mute state
      chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_AUDIO_STATE' }).then((response) => {
        if (response && response.playing) {
          // Content script confirms media is playing (even if muted)
          this.handleAudioStateUpdate(tab.id, {
            playing: true,
            volume: response.volume !== undefined ? response.volume : 1.0,
            muted: response.muted !== undefined ? response.muted : false
          });
        } else {
          // Content script says not playing - remove from list
          // This means media is paused/ended, not just muted
          if (this.audioTabs.has(tab.id)) {
            this.audioTabs.delete(tab.id);
            this.updateBadge();
          }
        }
      }).catch(() => {
        // Content script not available - fallback to browser's audible property
        // But note: audible is false when muted, so this is less reliable
        if (tab.audible) {
          // Browser says audible - add it
          this.handleAudioStateUpdate(tab.id, {
            playing: true,
            volume: 1.0,
            muted: false
          });
        } else {
          // Not audible and no content script
          // Could be muted or actually stopped
          // If it's in our list, keep it (might be muted)
          // If not in list, don't add it (can't verify it's playing)
        }
      });
    });
  }

  updateBadge() {
    const activeCount = this.audioTabs.size;
    if (activeCount > 0) {
      chrome.action.setBadgeText({ text: activeCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }

  getAudioTabs() {
    return Array.from(this.audioTabs.entries()).map(([tabId, data]) => ({
      tabId,
      ...data
    }));
  }

  async controlTabAudio(tabId, action, value) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        type: 'CONTROL_AUDIO',
        action,
        value
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize manager
const manager = new TabSoundManager();

// Expose manager methods to popup via storage or messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUDIO_TABS') {
    sendResponse({ tabs: manager.getAudioTabs() });
  } else if (message.type === 'CONTROL_TAB_AUDIO') {
    manager.controlTabAudio(message.tabId, message.action, message.value)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async
  }
  return false;
});

