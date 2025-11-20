const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const resultDiv = document.getElementById("result");
const fillBtn = document.getElementById("fillBtn");
const fileNameDiv = document.getElementById("fileName");

let extractedFields = {};

// Show file name when selected
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    fileNameDiv.textContent = file.name;
    fileNameDiv.classList.add("active");
    resultDiv.innerHTML = "";
    resultDiv.classList.remove("has-content");
    fillBtn.style.display = "none";
  } else {
    fileNameDiv.classList.remove("active");
  }
});

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    showError("Please select an image file first!");
    return;
  }

  // Set loading state
  setLoadingState(true);
  showProcessing();

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("http://localhost:5050/upload", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || "Upload failed");
    }

    const data = await res.json();
    extractedFields = data.fields || {};

    if (Object.keys(extractedFields).length === 0) {
      showMessage("No fields detected. Try a different image.", "warning");
      fillBtn.style.display = "none";
      return;
    }

    showResults(extractedFields);
    fillBtn.style.display = "flex";
  } catch (err) {
    console.error(err);
    showError(err.message || "Error extracting text. Please check if the server is running.");
  } finally {
    setLoadingState(false);
  }
});

fillBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "fillForm",
      fields: extractedFields
    });
    
    // Show success feedback
    fillBtn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Form Filled!</span>
    `;
    
    setTimeout(() => {
      fillBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Auto-Fill Form</span>
      `;
    }, 2000);
  });
});

function setLoadingState(loading) {
  const btnText = uploadBtn.querySelector(".btn-text");
  const btnLoader = uploadBtn.querySelector(".btn-loader");
  
  if (loading) {
    uploadBtn.classList.add("loading");
    uploadBtn.disabled = true;
  } else {
    uploadBtn.classList.remove("loading");
    uploadBtn.disabled = false;
  }
}

function showProcessing() {
  resultDiv.innerHTML = `
    <div class="processing">
      <svg class="spinner" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
      <span>Processing image...</span>
    </div>
  `;
  resultDiv.classList.remove("has-content");
}

function showResults(fields) {
  let html = "";
  for (const [key, value] of Object.entries(fields)) {
    html += `
      <div class="field-item">
        <div class="field-label">${key}</div>
        <div class="field-value">${value}</div>
      </div>
    `;
  }
  resultDiv.innerHTML = html;
  resultDiv.classList.add("has-content");
}

function showError(message) {
  resultDiv.innerHTML = `<div class="error-message">${message}</div>`;
  resultDiv.classList.remove("has-content");
}

function showMessage(message, type = "info") {
  const className = type === "warning" ? "error-message" : "success-message";
  resultDiv.innerHTML = `<div class="${className}">${message}</div>`;
  resultDiv.classList.remove("has-content");
}
