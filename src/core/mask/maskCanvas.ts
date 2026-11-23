import { CONFIG } from '../config';

export class MaskLayer {
  readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private blurCanvas = document.createElement('canvas');
  private blurCtx: CanvasRenderingContext2D;
  private blurDirty = true;
  dirty = false;
  painted = false;
  private data: ImageData | null = null;

  constructor() {
    this.canvas.width = 1;
    this.canvas.height = 1;
    this.ctx = this.canvas.getContext('2d', { alpha: false, willReadFrequently: true })!;
    this.blurCtx = this.blurCanvas.getContext('2d', { alpha: false, willReadFrequently: true })!;
  }

  setup(aspect: number): void {
    const size = CONFIG.maskSize;
    const w = aspect >= 1 ? size : Math.max(1, Math.round(size * aspect));
    const h = aspect >= 1 ? Math.max(1, Math.round(size / aspect)) : size;
    this.canvas.width = w;
    this.canvas.height = h;
    this.blurCanvas.width = w;
    this.blurCanvas.height = h;
    this.clear();
  }

  private ensureBlur(): void {
    if (!this.blurDirty) return;
    const { width: w, height: h } = this.canvas;
    const r = Math.max(2, Math.round(Math.max(w, h) * CONFIG.maskBlur));
    const ctx = this.blurCtx;
    ctx.filter = 'none';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.filter = `blur(${r}px)`;
    ctx.drawImage(this.canvas, 0, 0);
    ctx.filter = 'none';
    this.blurDirty = false;
  }

  textureSource(): HTMLCanvasElement {
    this.ensureBlur();
    return this.blurCanvas;
  }

  clear(): void {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.painted = false;
    this.snap = null;
    this.invalidate();
  }

  private snap: ImageData | null = null;
  private snapPainted = false;

  beginStroke(): void {
    this.snap = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.snapPainted = this.painted;
  }

  cancelStroke(): void {
    if (this.snap) {
      this.ctx.putImageData(this.snap, 0, 0);
      this.painted = this.snapPainted;
      this.snap = null;
      this.invalidate();
    }
  }

  stamp(u: number, v: number, radiusIso: number, erase: boolean, soft = false): void {
    const { width: w, height: h } = this.canvas;
    const cx = u * w;
    const cy = v * h;
    const r = Math.max(1, radiusIso * h);
    const ctx = this.ctx;
    if (soft) {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const color = erase ? '0,0,0' : '255,255,255';
      const flow = 0.12;
      const stops: [number, number][] = [
        [0, 1],
        [0.4, 0.65],
        [0.7, 0.3],
        [1, 0],
      ];
      for (const [pos, shape] of stops) {
        grad.addColorStop(pos, `rgba(${color},${(flow * shape).toFixed(4)})`);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    } else {
      ctx.globalCompositeOperation = erase ? 'darken' : 'lighten';
      ctx.fillStyle = erase ? '#000' : '#fff';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!erase) this.painted = true;
    this.invalidate();
  }

  private invalidate(): void {
    this.dirty = true;
    this.blurDirty = true;
    this.data = null;
  }

  sample = (u: number, v: number): number => {
    if (!this.data) {
      this.ensureBlur();
      this.data = this.blurCtx.getImageData(0, 0, this.blurCanvas.width, this.blurCanvas.height);
    }
    const { data, width, height } = this.data;
    const x = Math.min(width - 1, Math.max(0, Math.round(u * (width - 1))));
    const y = Math.min(height - 1, Math.max(0, Math.round(v * (height - 1))));
    return data[(y * width + x) * 4] / 255;
  };
}
