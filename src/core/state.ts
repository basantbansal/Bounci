import { DEFAULT_SOFTNESS, paramsFromSoftness, type MochiParams } from './config';
import type { LoadedImage, Mode, RecFormat } from './types';

type Listener = () => void;
export type AppEvent = 'mode' | 'image' | 'params' | 'recording';

class Emitter {
  private map = new Map<AppEvent, Set<Listener>>();
  on(e: AppEvent, fn: Listener): void {
    let set = this.map.get(e);
    if (!set) this.map.set(e, (set = new Set()));
    set.add(fn);
  }
  emit(e: AppEvent): void {
    this.map.get(e)?.forEach((fn) => fn());
  }
}

export const events = new Emitter();

export const state = {
  mode: 'empty' as Mode,
  image: null as LoadedImage | null,
  maskEnabled: true,
  softness: DEFAULT_SOFTNESS,
  params: paramsFromSoftness(DEFAULT_SOFTNESS) as MochiParams,
  volume: 0.7,
  muted: false,
  recFormat: 'video' as RecFormat,
  recording: false,
};

export function setMode(m: Mode): void {
  if (state.mode === m) return;
  state.mode = m;
  document.body.dataset.mode = m;
  events.emit('mode');
}
