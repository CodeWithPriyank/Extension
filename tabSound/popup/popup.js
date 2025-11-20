// Popup UI Controller

class PopupController {
  constructor() {
    this.audioTabs = [];
    this.setupEventListeners();
    this.loadAudioTabs();
    this.startAutoRefresh();
  }

  setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.loadAudioTabs();
    });
  }

  async loadAudioTabs() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUDIO_TABS' });
      this.audioTabs = response.tabs || [];
      this.renderTabs();
    } catch (error) {
      console.error('Error loading audio tabs:', error);
      this.showError('Failed to load audio tabs');
    }
  }

  renderTabs() {
    const container = document.getElementById('tabsContainer');
    const noAudio = document.getElementById('noAudio');

    if (this.audioTabs.length === 0) {
      noAudio.style.display = 'block';
      container.querySelectorAll('.tab-card').forEach(card => card.remove());
      return;
    }

    noAudio.style.display = 'none';

    // Remove existing cards
    container.querySelectorAll('.tab-card').forEach(card => card.remove());

    // Create cards for each audio tab
    this.audioTabs.forEach(tab => {
      const card = this.createTabCard(tab);
      container.appendChild(card);
    });
  }

  createTabCard(tab) {
    const card = document.createElement('div');
    card.className = 'tab-card';
    card.dataset.tabId = tab.tabId;

    const faviconUrl = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ccc"/></svg>';

    card.innerHTML = `
      <div class="tab-header">
        <img src="${faviconUrl}" alt="" class="tab-favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'16\\' height=\\'16\\'><rect width=\\'16\\' height=\\'16\\' fill=\\'%23ccc\\'/></svg>'">
        <div class="tab-info">
          <div class="tab-title" title="${this.escapeHtml(tab.title)}">${this.escapeHtml(tab.title)}</div>
          <div class="tab-url" title="${this.escapeHtml(tab.url)}">${this.escapeHtml(this.getDomain(tab.url))}</div>
        </div>
      </div>
      <div class="controls">
        <div class="media-controls">
          <button class="media-btn" id="skipBackBtn-${tab.tabId}" title="Skip backward 10s">
            ⏪
          </button>
          <button class="media-btn play-pause" id="playPauseBtn-${tab.tabId}" title="Play/Pause">
            ${tab.playing === false ? '▶️' : '⏸️'}
          </button>
          <button class="media-btn" id="skipForwardBtn-${tab.tabId}" title="Skip forward 10s">
            ⏩
          </button>
        </div>
        <div class="volume-controls">
          <div class="volume-control">
            <span class="volume-icon" id="volumeIcon-${tab.tabId}">${this.getVolumeIcon(tab.volume, tab.muted)}</span>
            <input 
              type="range" 
              class="volume-slider" 
              id="volumeSlider-${tab.tabId}"
              min="0" 
              max="100" 
              value="${Math.round(tab.volume * 100)}"
              step="1"
            >
            <span class="volume-value" id="volumeValue-${tab.tabId}">${Math.round(tab.volume * 100)}%</span>
          </div>
          <button 
            class="mute-btn ${tab.muted ? 'muted' : ''}" 
            id="muteBtn-${tab.tabId}"
          >
            ${tab.muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      </div>
    `;

    // Attach event listeners
    const slider = card.querySelector(`#volumeSlider-${tab.tabId}`);
    const muteBtn = card.querySelector(`#muteBtn-${tab.tabId}`);
    const volumeIcon = card.querySelector(`#volumeIcon-${tab.tabId}`);
    const volumeValue = card.querySelector(`#volumeValue-${tab.tabId}`);
    const playPauseBtn = card.querySelector(`#playPauseBtn-${tab.tabId}`);
    const skipBackBtn = card.querySelector(`#skipBackBtn-${tab.tabId}`);
    const skipForwardBtn = card.querySelector(`#skipForwardBtn-${tab.tabId}`);

    slider.addEventListener('input', (e) => {
      const value = e.target.value / 100;
      this.setVolume(tab.tabId, value);
      volumeValue.textContent = `${Math.round(value * 100)}%`;
      volumeIcon.textContent = this.getVolumeIcon(value, tab.muted);
    });

    muteBtn.addEventListener('click', () => {
      this.toggleMute(tab.tabId);
    });

    // Media control event listeners
    playPauseBtn.addEventListener('click', () => {
      this.togglePlayPause(tab.tabId);
    });

    skipBackBtn.addEventListener('click', () => {
      this.skipBackward(tab.tabId);
    });

    skipForwardBtn.addEventListener('click', () => {
      this.skipForward(tab.tabId);
    });

    return card;
  }

  async setVolume(tabId, volume) {
    try {
      await chrome.runtime.sendMessage({
        type: 'CONTROL_TAB_AUDIO',
        tabId: parseInt(tabId),
        action: 'setVolume',
        value: volume
      });
      // Update local state
      const tab = this.audioTabs.find(t => t.tabId === tabId);
      if (tab) {
        tab.volume = volume;
      }
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }

  async toggleMute(tabId) {
    try {
      const tab = this.audioTabs.find(t => t.tabId === tabId);
      if (!tab) return;

      const newMutedState = !tab.muted;

      await chrome.runtime.sendMessage({
        type: 'CONTROL_TAB_AUDIO',
        tabId: parseInt(tabId),
        action: 'setMuted',
        value: newMutedState
      });

      // Update UI
      tab.muted = newMutedState;
      const muteBtn = document.getElementById(`muteBtn-${tabId}`);
      const volumeIcon = document.getElementById(`volumeIcon-${tabId}`);
      const slider = document.getElementById(`volumeSlider-${tabId}`);

      if (muteBtn) {
        muteBtn.textContent = newMutedState ? 'Unmute' : 'Mute';
        muteBtn.classList.toggle('muted', newMutedState);
      }

      if (volumeIcon) {
        volumeIcon.textContent = this.getVolumeIcon(tab.volume, newMutedState);
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }

  async togglePlayPause(tabId) {
    try {
      const tab = this.audioTabs.find(t => t.tabId === tabId);
      if (!tab) return;

      const action = (tab.playing === false) ? 'play' : 'pause';

      await chrome.runtime.sendMessage({
        type: 'CONTROL_TAB_AUDIO',
        tabId: parseInt(tabId),
        action: action
      });

      // Update UI
      tab.playing = (action === 'play');
      const playPauseBtn = document.getElementById(`playPauseBtn-${tabId}`);
      if (playPauseBtn) {
        playPauseBtn.textContent = tab.playing ? '⏸️' : '▶️';
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  }

  async skipBackward(tabId) {
    try {
      await chrome.runtime.sendMessage({
        type: 'CONTROL_TAB_AUDIO',
        tabId: parseInt(tabId),
        action: 'skipBackward',
        value: 10 // Skip 10 seconds backward
      });
    } catch (error) {
      console.error('Error skipping backward:', error);
    }
  }

  async skipForward(tabId) {
    try {
      await chrome.runtime.sendMessage({
        type: 'CONTROL_TAB_AUDIO',
        tabId: parseInt(tabId),
        action: 'skipForward',
        value: 10 // Skip 10 seconds forward
      });
    } catch (error) {
      console.error('Error skipping forward:', error);
    }
  }



  getVolumeIcon(volume, muted) {
    if (muted || volume === 0) return '🔇';
    if (volume < 0.33) return '🔈';
    if (volume < 0.66) return '🔉';
    return '🔊';
  }

  getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    const container = document.getElementById('tabsContainer');
    container.innerHTML = `<div class="no-audio"><p style="color: #ef4444;">${message}</p></div>`;
  }

  startAutoRefresh() {
    // Refresh every 2 seconds
    setInterval(() => {
      this.loadAudioTabs();
    }, 2000);
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
} else {
  new PopupController();
}

