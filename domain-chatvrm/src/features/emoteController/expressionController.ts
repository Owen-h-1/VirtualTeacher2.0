import * as THREE from "three";
import {
  VRM,
  VRMExpressionManager,
  VRMExpressionPresetName,
} from "@pixiv/three-vrm";
import { AutoLookAt } from "./autoLookAt";
import { AutoBlink } from "./autoBlink";

const LIP_SYNC_TRANSITION_SPEED = 0.15;
const EMOTION_TRANSITION_SPEED = 0.08;
const MAX_LIP_SYNC_WEIGHT = 0.85;
const MIN_LIP_SYNC_WEIGHT = 0.1;

type VowelType = 'aa' | 'ih' | 'ou' | 'ee' | 'oh';

interface LipSyncState {
  currentWeight: number;
  targetWeight: number;
  currentVowel: VowelType;
}

export class ExpressionController {
  private _autoLookAt: AutoLookAt;
  private _autoBlink?: AutoBlink;
  private _expressionManager?: VRMExpressionManager;
  private _currentEmotion: VRMExpressionPresetName;
  private _emotionWeight: number;
  private _lipSyncState: LipSyncState;
  private _previousLipSyncValue: number;
  
  constructor(vrm: VRM, camera: THREE.Object3D) {
    this._autoLookAt = new AutoLookAt(vrm, camera);
    this._currentEmotion = "neutral";
    this._emotionWeight = 0;
    this._previousLipSyncValue = 0;
    this._lipSyncState = {
      currentWeight: 0,
      targetWeight: 0,
      currentVowel: 'aa'
    };
    
    if (vrm.expressionManager) {
      this._expressionManager = vrm.expressionManager;
      this._autoBlink = new AutoBlink(vrm.expressionManager);
    }
  }

  public playEmotion(preset: VRMExpressionPresetName) {
    if (this._currentEmotion !== "neutral") {
      this._expressionManager?.setValue(this._currentEmotion, 0);
    }

    if (preset === "neutral") {
      this._autoBlink?.setEnable(true);
      this._currentEmotion = preset;
      this._emotionWeight = 0;
      return;
    }

    const t = this._autoBlink?.setEnable(false) || 0;
    this._currentEmotion = preset;
    
    setTimeout(() => {
      this._emotionWeight = 0.8;
      this._expressionManager?.setValue(preset, this._emotionWeight);
    }, t * 1000);
  }

  public lipSync(preset: VRMExpressionPresetName, value: number) {
    const smoothedValue = this._previousLipSyncValue + (value - this._previousLipSyncValue) * LIP_SYNC_TRANSITION_SPEED;
    this._previousLipSyncValue = smoothedValue;
    
    const clampedValue = Math.max(MIN_LIP_SYNC_WEIGHT, Math.min(MAX_LIP_SYNC_WEIGHT, smoothedValue));
    
    this._lipSyncState.targetWeight = clampedValue;
    this._lipSyncState.currentVowel = preset as VowelType;
  }
  
  public setVowelWeights(vowels: { aa: number; ih: number; ou: number; ee: number; oh: number }) {
    if (!this._expressionManager) return;
    
    const dominantVowel = this.getDominantVowel(vowels);
    const vowelWeight = vowels[dominantVowel] * this._lipSyncState.currentWeight;
    
    this._expressionManager.setValue('aa', vowelWeight * 0.9);
    this._expressionManager.setValue('ih', vowels.ih * this._lipSyncState.currentWeight * 0.5);
    this._expressionManager.setValue('ou', vowels.ou * this._lipSyncState.currentWeight * 0.6);
  }
  
  private getDominantVowel(vowels: { aa: number; ih: number; ou: number; ee: number; oh: number }): VowelType {
    let max = vowels.aa;
    let dominant: VowelType = 'aa';
    
    if (vowels.ih > max) { max = vowels.ih; dominant = 'ih'; }
    if (vowels.ou > max) { max = vowels.ou; dominant = 'ou'; }
    if (vowels.ee > max) { max = vowels.ee; dominant = 'ee'; }
    if (vowels.oh > max) { max = vowels.oh; dominant = 'oh'; }
    
    return dominant;
  }

  public update(delta: number) {
    if (this._autoBlink) {
      this._autoBlink.update(delta);
    }

    if (this._lipSyncState.targetWeight !== this._lipSyncState.currentWeight) {
      const diff = this._lipSyncState.targetWeight - this._lipSyncState.currentWeight;
      this._lipSyncState.currentWeight += diff * LIP_SYNC_TRANSITION_SPEED;
      
      if (Math.abs(diff) < 0.01) {
        this._lipSyncState.currentWeight = this._lipSyncState.targetWeight;
      }
    }

    if (this._lipSyncState.currentWeight > 0) {
      const emotionMultiplier = this._currentEmotion === "neutral" ? 0.6 : 0.35;
      const finalWeight = this._lipSyncState.currentWeight * emotionMultiplier;
      
      this._expressionManager?.setValue(this._lipSyncState.currentVowel as VRMExpressionPresetName, finalWeight);
    }
    
    if (this._lipSyncState.targetWeight < 0.01) {
      this._lipSyncState.currentWeight *= 0.8;
      if (this._lipSyncState.currentWeight < 0.01) {
        this._lipSyncState.currentWeight = 0;
      }
    }
  }
}
