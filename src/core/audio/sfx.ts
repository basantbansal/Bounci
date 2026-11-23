import { state } from '../state';

/**
 * Pure WebAudio squishy sound synthesizer (no external audio assets needed).
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.master!.gain.value = state.muted ? 0 : state.volume;
    return this.ctx;
  }

  unlock(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  }

  /** Squishy "muni" sound on grab */
  grab(): void {
    const ctx = this.ensure();
    if (!ctx || state.muted) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(185, t);
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.09);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.3, t + 0.008);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(og).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.14);

    const noise = this.noiseSource(ctx, 0.06);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.1, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    noise.connect(lp).connect(ng).connect(this.master!);
    noise.start(t);
  }

  /** Bouncy "purun" wobble sound on release */
  release(intensity: number, freqHz: number): void {
    const ctx = this.ensure();
    if (!ctx || state.muted || intensity < 0.05) return;
    const t = ctx.currentTime;
    const amp = 0.12 + 0.3 * intensity;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(165, t + 0.3);

    const env = ctx.createGain();
    env.gain.setValueAtTime(amp, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    const trem = ctx.createGain();
    trem.gain.setValueAtTime(1, t);
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = freqHz;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(trem.gain);

    osc.connect(env).connect(trem).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.45);
    lfo.start(t);
    lfo.stop(t + 0.45);
  }

  private noiseSource(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }
}
