import type { TestType } from '$lib/domain/protocol.ts';
import {
  mediaElapsedFromProtocolMs,
  protocolElapsedFromMediaMs
} from '$lib/domain/audioTimeline.ts';
import { loadAndCacheAudio } from '$lib/services/audioCache.ts';

/**
 * Protocol clock driven by the trimmed audio files bundled in the app.
 * Media time and protocol time share the same zero point.
 */
export class ProtocolAudioClock {
  private audio = new Audio();
  private context?: AudioContext;
  private gain?: GainNode;
  private source?: MediaElementAudioSourceNode;
  private boost = 1;
  private enabled = true;
  private mode: TestType = 'yoyoIR1';
  private fallbackStartedAt = 0;
  private fallbackOffsetMs = 0;
  private playing = false;

  constructor() {
    this.audio.preload = 'auto';
  }

  async load(type: TestType): Promise<void> {
    this.mode = type;
    await this.ensureGraph();
    const src = await loadAndCacheAudio(type);

    const currentSrc = this.audio.getAttribute('src') ?? this.audio.src;
    if (currentSrc !== src && !this.audio.src.endsWith(src)) {
      this.audio.pause();
      this.audio.src = src;
      this.audio.load();
    }
  }

  private async ensureGraph(): Promise<void> {
    if (this.context) return;
    const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.gain = this.context.createGain();
    this.gain.connect(this.context.destination);
    this.source = this.context.createMediaElementSource(this.audio);
    this.source.connect(this.gain);
    this.updateGain();
  }

  private updateGain(): void {
    if (this.gain) this.gain.gain.value = this.enabled ? this.boost : 0;
    else this.audio.volume = this.enabled ? Math.min(1, this.boost) : 0;
  }

  setSoundEnabled(enabled: boolean): void {
    // Muting never pauses timing. It only changes gain.
    this.enabled = enabled;
    this.updateGain();
  }

  setBoost(boost: number): void {
    this.boost = Math.min(3, Math.max(1, boost));
    this.updateGain();
  }

  async start(type: TestType, initialElapsedMs = 0): Promise<void> {
    await this.load(type);
    if (this.context?.state === 'suspended') await this.context.resume();
    this.fallbackOffsetMs = Math.max(0, initialElapsedMs);
    this.fallbackStartedAt = performance.now();
    this.playing = true;

    this.audio.currentTime = mediaElapsedFromProtocolMs(type, this.fallbackOffsetMs) / 1000;
    try {
      await this.audio.play();
    } catch (error) {
      console.warn('Protocol audio playback did not start; using monotonic fallback clock', error);
    }
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') await this.context.resume();
    this.fallbackStartedAt = performance.now();
    this.playing = true;

    // Seek the media back to the paused protocol position so beeps and UI
    // stay aligned after a pause.
    const audioSeconds = mediaElapsedFromProtocolMs(
      this.mode,
      this.fallbackOffsetMs
    ) / 1000;
    if (Number.isFinite(audioSeconds) && audioSeconds >= 0) {
      try { this.audio.currentTime = audioSeconds; } catch { /* keep current position */ }
    }
    try { await this.audio.play(); } catch { /* fallback clock remains valid */ }
  }

  pause(): void {
    this.fallbackOffsetMs = this.elapsedMs();
    this.playing = false;
    this.audio.pause();
  }

  stop(): void {
    this.fallbackOffsetMs = 0;
    this.playing = false;
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  elapsedMs(): number {
    if (!this.audio.paused && Number.isFinite(this.audio.currentTime)) {
      const audioMs = Math.max(0, this.audio.currentTime * 1000);
      return protocolElapsedFromMediaMs(this.mode, audioMs);
    }
    return this.fallbackOffsetMs + (this.playing ? performance.now() - this.fallbackStartedAt : 0);
  }
}
