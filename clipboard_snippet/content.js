// Content script to monitor clipboard changes on web pages
// Wrap in IIFE to prevent variable redeclaration if script is injected multiple times
(function() {
  'use strict';
  
  // Check if already initialized to prevent duplicate event listeners
  if (window.clipboardSnippetInitialized) {
    return;
  }
  window.clipboardSnippetInitialized = true;
  
  let lastClipboardText = '';
  
  // Track clipboard permission state per page (resets on page refresh)
  // 'granted' = user allowed, 'denied' = user blocked, null = not yet asked
  let clipboardPermissionState = null;
  
  // Check clipboard permission state from sessionStorage
  try {
    const stored = sessionStorage.getItem('clipboardPermissionState');
    if (stored === 'granted' || stored === 'denied') {
      clipboardPermissionState = stored;
    }
  } catch (e) {
    // sessionStorage might not be available, ignore
  }
  
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
        try {
          sessionStorage.setItem('clipboardPermissionState', 'granted');
        } catch (e) {}
        return true;
      } else if (result.state === 'denied') {
        clipboardPermissionState = 'denied';
        try {
          sessionStorage.setItem('clipboardPermissionState', 'denied');
        } catch (e) {}
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
    try {
      sessionStorage.setItem('clipboardPermissionState', clipboardPermissionState);
    } catch (e) {
      // sessionStorage might not be available, ignore
    }
  }

  // Helper function to check if extension context is valid
  // Uses safe property access to prevent any errors
  function isExtensionContextValid() {
    try {
      // Check chrome exists
      if (typeof chrome === 'undefined') {
        return false;
      }
      
      // Check chrome.runtime exists
      if (!chrome.runtime) {
        return false;
      }
      
      // Check chrome.runtime.id exists (proves extension is still valid)
      if (!chrome.runtime.id) {
        return false;
      }
      
      // Check sendMessage is a function (use typeof to avoid property access errors)
      if (typeof chrome.runtime.sendMessage !== 'function') {
        return false;
      }
      
      return true;
    } catch (e) {
      // Any error means context is invalid
      return false;
    }
  }

  // Send clipboard text to background script with error handling
  async function sendClipboardToBackground(text) {
    // Early return if no text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return;
    }
    
    // Wrap everything in try-catch to prevent any errors from propagating
    try {
      // Check if extension context is valid
      if (!isExtensionContextValid()) {
        return; // Extension context invalidated or not available
      }
      
      // Additional safety check right before calling
      // Use safe property access pattern
      const runtime = chrome && chrome.runtime;
      if (!runtime || typeof runtime.sendMessage !== 'function' || !runtime.id) {
        return; // sendMessage is not available or context invalid
      }
      
      // Now safe to call sendMessage
      await runtime.sendMessage({
        action: 'addClipboard',
        text: text.trim()
      });
    } catch (error) {
      // Silently ignore ALL errors - this is normal when extension reloads
      // No logging, no error propagation
      return;
    }
  }

  // Monitor clipboard via copy events
  document.addEventListener('copy', async (e) => {
    // Silently catch all errors - no logging
    try {
      if (!isExtensionContextValid()) {
        return;
      }
      
      const text = window.getSelection().toString();
      if (text) {
        await sendClipboardToBackground(text);
      }
    } catch (error) {
      // Silently ignore all errors
    }
  });

  // Monitor paste events (to detect what was copied)
  document.addEventListener('paste', async (e) => {
    // Silently catch all errors - no logging
    try {
      if (!isExtensionContextValid()) {
        return;
      }
      
      const text = e.clipboardData?.getData('text/plain');
      if (text && text !== lastClipboardText) {
        lastClipboardText = text;
        await sendClipboardToBackground(text);
      }
    } catch (error) {
      // Silently ignore all errors
    }
  });

  // Periodically check clipboard (fallback method)
  setInterval(async () => {
    // Silently catch all errors - no logging
    try {
      if (!isExtensionContextValid()) {
        return; // Extension context invalidated
      }
      
      // Check permission state first
      const hasPermission = await checkClipboardPermission();
      if (hasPermission === false) {
        // User blocked clipboard access, don't try again
        return;
      }
      
      // Try to read clipboard
      const text = await navigator.clipboard.readText();
      if (text && text !== lastClipboardText) {
        lastClipboardText = text;
        await sendClipboardToBackground(text);
        // Successfully accessed clipboard, mark as granted
        updatePermissionState(true);
      }
    } catch (error) {
      // Check if error is due to permission denial
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        // User blocked or permission denied, remember this
        updatePermissionState(false);
      }
      // Silently ignore all other errors (clipboard access restricted or context invalidated)
    }
  }, 3000);

  // Also listen for keyboard shortcuts
  document.addEventListener('keydown', async (e) => {
    // Ctrl+C or Cmd+C
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      setTimeout(async () => {
        // Silently catch all errors - no logging
        try {
          if (!isExtensionContextValid()) {
            return;
          }
          
          const text = window.getSelection().toString();
          if (text) {
            await sendClipboardToBackground(text);
          }
        } catch (error) {
          // Silently ignore all errors
        }
      }, 100);
    }
  });
})();

