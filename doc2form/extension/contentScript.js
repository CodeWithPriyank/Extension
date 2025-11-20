function fillField(element, value) {
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.blur();
  }
  
  function findBestMatchField(keys, text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const key of keys) {
      if (lower.includes(key.toLowerCase())) return key;
    }
    return null;
  }
  
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "fillForm") {
      const fields = msg.fields;
      const keys = Object.keys(fields);
  
      document.querySelectorAll("input, textarea, select").forEach((el) => {
        const label =
          el.getAttribute("aria-label") ||
          el.placeholder ||
          el.name ||
          el.id ||
          "";
        const matchedKey = findBestMatchField(keys, label);
        if (matchedKey) {
          fillField(el, fields[matchedKey]);
        }
      });
    }
  });
  