/**
 * AudioManager - Handles audio capture from microphone
 */
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private isCapturing = false;
  private onAudioChunkCallback: ((chunk: AudioBuffer) => void) | null = null;

  async startCapture(): Promise<void> {
    if (this.isCapturing) {
      throw new Error('Audio capture already started');
    }

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimal for speech recognition
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create analyser for audio processing
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      this.isCapturing = true;
      this.startProcessing();
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }

  stopCapture(): void {
    if (!this.isCapturing) return;

    this.isCapturing = false;

    // Stop all tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
  }

  getAudioStream(): MediaStream | null {
    return this.mediaStream;
  }

  onAudioChunk(callback: (chunk: AudioBuffer) => void): void {
    this.onAudioChunkCallback = callback;
  }

  private startProcessing(): void {
    if (!this.audioContext || !this.analyser || !this.onAudioChunkCallback) {
      return;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const processAudio = () => {
      if (!this.isCapturing || !this.audioContext || !this.analyser) {
        return;
      }

      this.analyser.getFloatTimeDomainData(dataArray);

      // Create audio buffer chunk
      const sampleRate = this.audioContext.sampleRate;
      const audioBuffer = this.audioContext.createBuffer(1, bufferLength, sampleRate);
      audioBuffer.copyToChannel(dataArray, 0);

      if (this.onAudioChunkCallback) {
        this.onAudioChunkCallback(audioBuffer);
      }

      requestAnimationFrame(processAudio);
    };

    processAudio();
  }

  isActive(): boolean {
    return this.isCapturing;
  }
}

