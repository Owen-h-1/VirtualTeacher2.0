import { LipSyncAnalyzeResult } from "./lipSyncAnalyzeResult";

const TIME_DOMAIN_DATA_LENGTH = 2048;
const SMOOTHING_FACTOR = 0.3;
const VOLUME_THRESHOLD = 0.05;
const VOWEL_SMOOTHING = 0.15;

export class LipSync {
  public readonly audio: AudioContext;
  public readonly analyser: AnalyserNode;
  public readonly timeDomainData: Float32Array;
  public readonly frequencyData: Uint8Array;
  public previousValue: number;
  public smoothedVolume: number;
  public vowelWeights: { aa: number; ih: number; ou: number; ee: number; oh: number };

  public constructor(audio: AudioContext) {
    this.audio = audio;
    this.previousValue = 0;
    this.smoothedVolume = 0;
    this.analyser = audio.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.5;
    this.timeDomainData = new Float32Array(TIME_DOMAIN_DATA_LENGTH);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.vowelWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  }

  public update(): LipSyncAnalyzeResult {
    this.analyser.getFloatTimeDomainData(this.timeDomainData);
    this.analyser.getByteFrequencyData(this.frequencyData);
    
    let volume = 0.0;
    let rms = 0.0;
    
    for (let i = 0; i < TIME_DOMAIN_DATA_LENGTH; i++) {
      const sample = this.timeDomainData[i];
      volume = Math.max(volume, Math.abs(sample));
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / TIME_DOMAIN_DATA_LENGTH);
    
    const normalizedVolume = this.normalizeVolume(rms);
    this.smoothedVolume = this.smoothValue(normalizedVolume, this.smoothedVolume, SMOOTHING_FACTOR);
    
    const vowelAnalysis = this.analyzeVowels();
    this.updateVowelWeights(vowelAnalysis);
    
    let finalVolume = this.smoothedVolume;
    if (finalVolume < VOLUME_THRESHOLD) {
      finalVolume = 0;
    }
    
    const enhancedVolume = this.applyExpressionCurve(finalVolume);
    
    return {
      volume: enhancedVolume,
    };
  }
  
  private normalizeVolume(rms: number): number {
    const normalized = 1 / (1 + Math.exp(-20 * rms + 2));
    return Math.max(0, Math.min(1, normalized));
  }
  
  private analyzeVowels(): { aa: number; ih: number; ou: number; ee: number; oh: number } {
    const nyquist = this.audio.sampleRate / 2;
    const binSize = nyquist / this.analyser.frequencyBinCount;
    
    let lowFreq = 0, midFreq = 0, highFreq = 0;
    const lowEnd = Math.floor(500 / binSize);
    const midEnd = Math.floor(2000 / binSize);
    
    for (let i = 0; i < lowEnd && i < this.frequencyData.length; i++) {
      lowFreq += this.frequencyData[i];
    }
    lowFreq /= lowEnd;
    
    for (let i = lowEnd; i < midEnd && i < this.frequencyData.length; i++) {
      midFreq += this.frequencyData[i];
    }
    midFreq /= (midEnd - lowEnd);
    
    for (let i = midEnd; i < this.frequencyData.length; i++) {
      highFreq += this.frequencyData[i];
    }
    highFreq /= (this.frequencyData.length - midEnd);
    
    const total = lowFreq + midFreq + highFreq + 1;
    
    return {
      aa: Math.min(1, (lowFreq / total) * 2),
      ih: Math.min(1, (highFreq / total) * 2),
      ou: Math.min(1, (midFreq / total) * 1.5),
      ee: Math.min(1, (highFreq / total) * 1.8),
      oh: Math.min(1, (lowFreq / total) * 1.5)
    };
  }
  
  private updateVowelWeights(newWeights: { aa: number; ih: number; ou: number; ee: number; oh: number }) {
    this.vowelWeights.aa = this.smoothValue(newWeights.aa, this.vowelWeights.aa, VOWEL_SMOOTHING);
    this.vowelWeights.ih = this.smoothValue(newWeights.ih, this.vowelWeights.ih, VOWEL_SMOOTHING);
    this.vowelWeights.ou = this.smoothValue(newWeights.ou, this.vowelWeights.ou, VOWEL_SMOOTHING);
    this.vowelWeights.ee = this.smoothValue(newWeights.ee, this.vowelWeights.ee, VOWEL_SMOOTHING);
    this.vowelWeights.oh = this.smoothValue(newWeights.oh, this.vowelWeights.oh, VOWEL_SMOOTHING);
  }
  
  private smoothValue(current: number, previous: number, factor: number): number {
    return previous + (current - previous) * factor;
  }
  
  private applyExpressionCurve(volume: number): number {
    const curved = Math.pow(volume, 0.8);
    return curved * 2.5;
  }
  
  public getVowelWeights(): { aa: number; ih: number; ou: number; ee: number; oh: number } {
    return { ...this.vowelWeights };
  }

  public async playFromArrayBuffer(buffer: ArrayBuffer, onEnded?: () => void) {
    let bufferSource: AudioBufferSourceNode | null = null;

    try {
      const audioBuffer = await this.audio.decodeAudioData(buffer);
      bufferSource = this.audio.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(this.audio.destination);
      bufferSource.connect(this.analyser);
      bufferSource.start();
    } catch (error) {
      console.error('Error while trying to play from array buffer:', error);
    } finally {
      if (onEnded) {
        bufferSource?.addEventListener("ended", onEnded);
      }
      if (!bufferSource) {
        onEnded?.apply("");
      }
    }
  }

  public async playFromURL(url: string, onEnded?: () => void) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    this.playFromArrayBuffer(buffer, onEnded);
  }
}
