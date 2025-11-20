var T=Object.defineProperty;var E=(t,e,i)=>e in t?T(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var a=(t,e,i)=>E(t,typeof e!="symbol"?e+"":e,i);class A{constructor(){a(this,"audioContext",null);a(this,"mediaStream",null);a(this,"analyser",null);a(this,"isCapturing",!1);a(this,"onAudioChunkCallback",null)}async startCapture(){if(this.isCapturing)throw new Error("Audio capture already started");try{this.mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0,sampleRate:16e3}}),this.audioContext=new AudioContext({sampleRate:16e3});const e=this.audioContext.createMediaStreamSource(this.mediaStream);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=2048,e.connect(this.analyser),this.isCapturing=!0,this.startProcessing()}catch(e){throw console.error("Failed to start audio capture:",e),e}}stopCapture(){this.isCapturing&&(this.isCapturing=!1,this.mediaStream&&(this.mediaStream.getTracks().forEach(e=>e.stop()),this.mediaStream=null),this.audioContext&&(this.audioContext.close(),this.audioContext=null),this.analyser=null)}getAudioStream(){return this.mediaStream}onAudioChunk(e){this.onAudioChunkCallback=e}startProcessing(){if(!this.audioContext||!this.analyser||!this.onAudioChunkCallback)return;const e=this.analyser.frequencyBinCount,i=new Float32Array(e),n=()=>{if(!this.isCapturing||!this.audioContext||!this.analyser)return;this.analyser.getFloatTimeDomainData(i);const o=this.audioContext.sampleRate,r=this.audioContext.createBuffer(1,e,o);r.copyToChannel(i,0),this.onAudioChunkCallback&&this.onAudioChunkCallback(r),requestAnimationFrame(n)};n()}isActive(){return this.isCapturing}}class B{constructor(){a(this,"recognition",null);a(this,"isTranscribing",!1);a(this,"onTranscriptCallback",null);a(this,"language","en-US");a(this,"interimResults",!0);a(this,"continuous",!0);typeof window<"u"&&this.initializeRecognition()}initializeRecognition(){if(typeof window>"u")return;const e=window.SpeechRecognition||window.webkitSpeechRecognition;if(!e)throw new Error("Speech recognition not supported in this browser");this.recognition=new e,this.recognition.lang=this.language,this.recognition.interimResults=this.interimResults,this.recognition.continuous=this.continuous,this.recognition.maxAlternatives=1,this.recognition.onresult=i=>{let n="",o=!1;for(let r=i.resultIndex;r<i.results.length;r++)n+=i.results[r][0].transcript,i.results[r].isFinal&&(o=!0);this.onTranscriptCallback&&n.trim()&&this.onTranscriptCallback(n,o)},this.recognition.onerror=i=>{console.error("Speech recognition error:",i.error),(i.error==="no-speech"||i.error==="audio-capture")&&this.isTranscribing&&this.recognition.start()},this.recognition.onend=()=>{if(this.isTranscribing)try{this.recognition.start()}catch(i){console.error("Failed to restart recognition:",i)}}}async startTranscription(e){if(this.isTranscribing)throw new Error("Transcription already started");if(!this.recognition&&typeof window<"u"&&this.initializeRecognition(),!this.recognition)throw new Error("Speech recognition not available in this context. Must run in content script.");try{this.recognition.start(),this.isTranscribing=!0}catch(i){throw console.error("Failed to start transcription:",i),i}}stopTranscription(){this.isTranscribing&&(this.isTranscribing=!1,this.recognition&&this.recognition.stop())}onTranscript(e){this.onTranscriptCallback=e}setLanguage(e){this.language=e,this.recognition&&(this.recognition.lang=e)}isActive(){return this.isTranscribing}}let d=null,l=null,p=!1;function R(){const t=document.createElement("div");return t.id="interviewcopilot-overlay",t.style.cssText=`
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 600px;
    background: rgba(26, 26, 26, 0.95);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #ffffff;
    display: none;
    overflow: hidden;
  `,t}function I(){return`
    <div style="padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="status-indicator" style="width: 12px; height: 12px; border-radius: 50%; background: #999;"></div>
          <span style="font-weight: 600; font-size: 16px;">InterviewCopilot</span>
        </div>
        <button id="close-overlay" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 20px;">×</button>
      </div>
      
      <div id="recording-controls" style="margin-bottom: 16px; display: flex; gap: 8px;">
        <button id="start-recording-btn" style="flex: 1; padding: 10px; background: #4caf50; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #fff;"></span>
          Start Recording
        </button>
        <button id="stop-recording-btn" style="flex: 1; padding: 10px; background: #f44336; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; align-items: center; justify-content: center; gap: 6px; display: none;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #fff;"></span>
          Stop Recording
        </button>
      </div>
      
      <div id="recording-status" style="text-align: center; padding: 8px; margin-bottom: 12px; font-size: 12px; color: #999; display: none;">
        <span id="recording-status-text">Recording...</span>
      </div>
      
      <div id="overlay-content" style="max-height: 400px; overflow-y: auto;">
        <div id="status-message" style="text-align: center; padding: 20px; color: #999;">
          Waiting for interview to start...
        </div>
      </div>
    </div>
  `}function v(t){var o,r,c;const e=t.querySelector("#close-overlay");if(e){const s=e.cloneNode(!0);(o=e.parentNode)==null||o.replaceChild(s,e),s.addEventListener("click",()=>{t.style.display="none"})}const i=t.querySelector("#start-recording-btn"),n=t.querySelector("#stop-recording-btn");if(i){const s=i.cloneNode(!0);(r=i.parentNode)==null||r.replaceChild(s,i),s.addEventListener("click",async()=>{await q()})}if(n){const s=n.cloneNode(!0);(c=n.parentNode)==null||c.replaceChild(s,n),s.addEventListener("click",()=>{z()})}}function M(){let t=document.getElementById("interviewcopilot-overlay");return t?(v(t),t.style.display="none"):(t=R(),t.innerHTML=I(),t.style.display="none",document.body.appendChild(t),v(t)),t}function g(){return M()}function y(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function f(t){const e=document.getElementById("overlay-content");e&&(e.innerHTML=t)}function L(t){const e=document.getElementById("overlay-content");if(!e)return;const i=e.innerHTML,n=`
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #999; margin-bottom: 8px;">💡 Question Detected</div>
      <div style="background: rgba(59, 130, 246, 0.2); padding: 12px; border-radius: 8px; border-left: 3px solid #3b82f6;">
        ${y(t)}
      </div>
    </div>
    ${i}
  `;e.innerHTML=n}function F(t,e){const i=document.getElementById("overlay-content");if(!i)return;const n=`
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #999; margin-bottom: 8px;">💡 Question</div>
      <div style="background: rgba(59, 130, 246, 0.2); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        ${y(t)}
      </div>
      
      <div style="font-size: 12px; color: #999; margin-bottom: 8px;">📝 Suggested Answer</div>
      <div style="background: rgba(76, 175, 80, 0.2); padding: 12px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
        ${y(e.answer)}
      </div>
      
      ${e.keyPoints&&e.keyPoints.length>0?`
        <div style="margin-top: 12px;">
          <div style="font-size: 12px; color: #999; margin-bottom: 8px;">Key Points</div>
          <ul style="margin: 0; padding-left: 20px;">
            ${e.keyPoints.map(o=>`<li style="margin-bottom: 4px;">${y(o)}</li>`).join("")}
          </ul>
        </div>
      `:""}
    </div>
  `;i.innerHTML=n}function C(t){const e=t.includes("quota")||t.includes("exceeded")||t.includes("plan limit"),i=t.includes("API key")||t.includes("authentication"),n=/(https?:\/\/[^\s]+)/g;let o=y(t).replace(n,s=>`<a href="${s}" target="_blank" rel="noopener noreferrer" style="color: #4caf50; text-decoration: underline;">${s}</a>`);o=o.replace(/(\d+\.\s+)([^\n]+)/g,'<div style="margin: 4px 0; padding-left: 8px;">$1$2</div>'),o=o.replace(/\n\n/g,'</div><div style="margin-top: 8px;">'),o=o.replace(/\n/g,"<br>");const r=e?'<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #999;">💡 Note: ChatGPT Plus subscription is separate from API access. You need to set up API billing separately.</div>':i?'<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #999;">💡 Tip: Go to extension settings to update your API key.</div>':"",c=`
    <div style="background: rgba(244, 67, 54, 0.2); padding: 12px; border-radius: 8px; border-left: 3px solid #f44336;">
      <div style="color: #f44336; font-weight: 600; margin-bottom: 8px;">⚠️ Error</div>
      <div style="color: #fff; line-height: 1.6; margin-bottom: 0;">
        ${o}
      </div>
      ${r}
    </div>
  `;f(c)}async function $(){try{d=new A,l=new B,l.onTranscript((e,i)=>{i&&e.trim()&&chrome.runtime.sendMessage({type:"transcript",data:{id:crypto.randomUUID(),timestamp:new Date,speaker:"interviewer",text:e.trim(),isFinal:!0}}).catch(n=>console.error("Failed to send transcript:",n))}),await d.startCapture();const t=d.getAudioStream();if(!t)throw new Error("Failed to get audio stream");await l.startTranscription(t),p=!0,u(),console.log("Audio capture and transcription started")}catch(t){console.error("Failed to start audio capture:",t),p=!1,u(),chrome.runtime.sendMessage({type:"audio_capture_error",data:{error:String(t)}})}}function h(){l&&(l.stopTranscription(),l=null),d&&(d.stopCapture(),d=null),p=!1,u(),console.log("Audio capture and transcription stopped")}async function q(){if(!p)try{await $()}catch(t){console.error("Failed to start recording:",t),C(`Failed to start recording: ${t}`)}}function z(){p&&h()}function u(){const t=document.getElementById("start-recording-btn"),e=document.getElementById("stop-recording-btn"),i=document.getElementById("recording-status"),n=document.getElementById("recording-status-text"),o=document.getElementById("status-indicator");p?(t&&(t.style.display="none"),e&&(e.style.display="flex"),i&&(i.style.display="block"),n&&(n.textContent="🔴 Recording in progress..."),n&&(n.style.color="#f44336"),o&&(o.style.background="#f44336")):(t&&(t.style.display="flex"),e&&(e.style.display="none"),i&&(i.style.display="block"),n&&(n.textContent="⏸️ Recording stopped"),n&&(n.style.color="#999"),o&&(o.style.background="#999"))}chrome.runtime.onMessage.addListener((t,e,i)=>{switch(t.type){case"start_audio_capture":const n=g();n.style.display="block",f('<div style="text-align: center; padding: 20px; color: #999;">Click "Start Recording" to begin capturing audio.</div>'),u(),i({success:!0});break;case"stop_audio_capture":h(),i({success:!0});break;case"session_started":const o=g();o.style.display="block",f('<div style="text-align: center; padding: 20px; color: #999;">Interview session started. Click "Start Recording" to begin.</div>'),u();break;case"question_detected":const r=g();r.style.display="block",L(t.data.questionText);break;case"suggestion_ready":const c=g();c.style.display="block";const k=(t.data.questionEntry||{}).questionText||t.data.questionText||"Question";F(k,t.data.suggestion);break;case"suggestion_error":const S=g();S.style.display="block",C(t.data.error||"Failed to generate suggestion");break;case"session_ended":h();const m=document.getElementById("interviewcopilot-overlay");if(m){const b=document.getElementById("overlay-content");b&&(b.innerHTML='<div style="text-align: center; padding: 20px; color: #999;">Session ended. Check extension for summary.</div>'),u(),m.style.display="none"}break}i({received:!0})});function x(){const t=document.getElementById("interviewcopilot-overlay");t&&(t.style.display="none",t.remove())}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",x):x();let w=location.href;const D=new MutationObserver(()=>{const t=location.href;t!==w&&(w=t,setTimeout(x,100))});D.observe(document,{subtree:!0,childList:!0});
