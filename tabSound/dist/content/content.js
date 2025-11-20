// Content Script - Detects and controls audio in the current tab

class AudioDetector {
  constructor() {
    this.audioElements = new Set();
    this.mediaElements = new Set();
    this.audioContext = null;
    this.isPlaying = false;
    this.currentVolume = 1.0;
    this.isMuted = false;
    this.setupDetection();
    this.setupMessageListener();
  }

  setupDetection() {
    // Detect existing audio/video elements
    this.scanForMediaElements();

    // Watch for new elements
    const observer = new MutationObserver(() => {
      this.scanForMediaElements();
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Monitor Web Audio API
    this.interceptWebAudio();
  }

  scanForMediaElements() {
    // Find all audio and video elements
    const mediaElements = document.querySelectorAll('audio, video');

    mediaElements.forEach(element => {
      if (!this.mediaElements.has(element)) {
        this.mediaElements.add(element);
        this.attachMediaListeners(element);
      }
    });

    this.updateAudioState();
  }

  attachMediaListeners(element) {
    const updateState = () => {
      // Small delay to ensure state is updated
      setTimeout(() => this.updateAudioState(), 100);
    };

    element.addEventListener('play', updateState);
    element.addEventListener('pause', updateState);
    element.addEventListener('ended', updateState);
    element.addEventListener('volumechange', updateState);
    element.addEventListener('loadedmetadata', updateState);
    element.addEventListener('canplay', updateState); // When media can start playing
    element.addEventListener('playing', updateState); // When media actually starts playing
    element.addEventListener('waiting', updateState); // When media is waiting for data

    // Initial state check - check if playing (regardless of mute/volume)
    if (!element.paused && !element.ended && element.readyState >= 2) {
      this.isPlaying = true;
      // Update volume and muted state
      this.currentVolume = element.volume;
      this.isMuted = element.muted;
    }
  }

  interceptWebAudio() {
    // Intercept AudioContext creation to detect Web Audio API usage
    const originalAudioContext = window.AudioContext || window.webkitAudioContext;

    if (originalAudioContext) {
      const self = this;
      window.AudioContext = function (...args) {
        const context = new originalAudioContext(...args);
        self.audioContext = context;

        // Monitor for audio nodes
        const originalCreateBufferSource = context.createBufferSource.bind(context);
        context.createBufferSource = function () {
          const source = originalCreateBufferSource();
          source.addEventListener('ended', () => self.updateAudioState());
          return source;
        };

        return context;
      };
      window.webkitAudioContext = window.AudioContext;
    }
  }

  updateAudioState() {
    let playing = false;
    let hasMedia = false;
    let volume = 1.0;
    let muted = false;

    // Check all media elements - detect if media exists and if it's playing
    this.mediaElements.forEach(element => {
      // Check if this is a meaningful media element (has some duration/content)
      const isValidMedia =
        !element.ended &&
        element.readyState >= 2 && // HAVE_CURRENT_DATA or higher (has some data)
        (!isNaN(element.duration) && element.duration > 0); // Has valid duration

      if (isValidMedia) {
        hasMedia = true;
        // Track playing state separately
        const isMediaPlaying = !element.paused;

        if (isMediaPlaying) {
          playing = true;
        }

        // Always update volume and muted state from the media element
        volume = element.volume;
        muted = element.muted;
      }
    });

    const stateChanged =
      this.isPlaying !== playing ||
      this.currentVolume !== volume ||
      this.isMuted !== muted;

    this.isPlaying = playing;
    this.currentVolume = volume;
    this.isMuted = muted;

    // Report if we have media (even if paused), or if state changed
    if (hasMedia || stateChanged) {
      this.reportAudioState();
    }
  }

  reportAudioState() {
    chrome.runtime.sendMessage({
      type: 'AUDIO_STATE_UPDATE',
      data: {
        playing: this.isPlaying,
        volume: this.currentVolume,
        muted: this.isMuted
      }
    }).catch(() => {
      // Ignore errors if background script is not ready
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'REQUEST_AUDIO_STATE') {
        this.updateAudioState();
        sendResponse({
          playing: this.isPlaying,
          volume: this.currentVolume,
          muted: this.isMuted
        });
      } else if (message.type === 'CONTROL_AUDIO') {
        this.controlAudio(message.action, message.value);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  controlAudio(action, value) {
    switch (action) {
      case 'setVolume':
        this.mediaElements.forEach(element => {
          element.volume = Math.max(0, Math.min(1, value));
        });
        this.currentVolume = value;
        this.updateAudioState();
        break;

      case 'toggleMute':
        this.mediaElements.forEach(element => {
          element.muted = !element.muted;
        });
        this.isMuted = !this.isMuted;
        // Sync with site-specific player controls
        this.syncPlayerMuteButton(this.isMuted);
        this.updateAudioState();
        break;

      case 'setMuted':
        this.mediaElements.forEach(element => {
          element.muted = value;
        });
        this.isMuted = value;
        // Sync with site-specific player controls
        this.syncPlayerMuteButton(value);
        this.updateAudioState();
        break;

      case 'play':
        this.mediaElements.forEach(element => {
          element.play().catch(err => {
            console.error('Error playing media:', err);
          });
        });
        this.isPlaying = true;
        this.updateAudioState();
        break;

      case 'pause':
        this.mediaElements.forEach(element => {
          element.pause();
        });
        this.isPlaying = false;
        this.updateAudioState();
        break;

      case 'stop':
        this.mediaElements.forEach(element => {
          element.pause();
          element.currentTime = 0;
        });
        this.isPlaying = false;
        this.updateAudioState();
        break;

      case 'skipForward':
        this.mediaElements.forEach(element => {
          if (!isNaN(element.duration)) {
            element.currentTime = Math.min(element.currentTime + (value || 10), element.duration);
          }
        });
        break;

      case 'skipBackward':
        this.mediaElements.forEach(element => {
          element.currentTime = Math.max(element.currentTime - (value || 10), 0);
        });
        break;
    }
  }

  syncPlayerMuteButton(shouldBeMuted) {
    // YouTube-specific handling
    if (window.location.hostname.includes('youtube.com')) {
      // Use setTimeout to ensure DOM is ready after muting the video element
      setTimeout(() => {
        const muteButton = document.querySelector('.ytp-mute-button');
        const video = document.querySelector('video');

        if (muteButton && video) {
          // Check the actual video element's muted state (most reliable)
          const videoIsActuallyMuted = video.muted;

          // Only click if the video's actual state doesn't match what we want
          if (videoIsActuallyMuted !== shouldBeMuted) {
            console.log(`[TabSound] Syncing YouTube mute button: shouldBeMuted=${shouldBeMuted}, videoMuted=${videoIsActuallyMuted}`);
            muteButton.click();
          }
        }
      }, 100); // Small delay to ensure state is updated
    }

    // Vimeo-specific handling
    else if (window.location.hostname.includes('vimeo.com')) {
      setTimeout(() => {
        const muteButton = document.querySelector('[data-tooltip="Unmute"]') ||
          document.querySelector('[data-tooltip="Mute"]');
        if (muteButton) {
          const isMutedInUI = muteButton.getAttribute('data-tooltip') === 'Unmute';
          if (shouldBeMuted !== isMutedInUI) {
            muteButton.click();
          }
        }
      }, 100);
    }

    // Add more sites as needed
    // For other sites, the direct HTML5 element muting will still work
  }
}


// Initialize detector when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AudioDetector();
  });
} else {
  new AudioDetector();
}

