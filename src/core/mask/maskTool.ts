import type { Vec2 } from '../interaction/coords';
import type { MaskLayer } from './maskCanvas';
import type { BrushType } from '../types';

export class MaskTool {
  brushRadius = 0.07;
  brushType: BrushType = 'hard';
  erasing = false;
  streamline = 0.35;
  private last: Vec2 | null = null;
  private smooth: Vec2 | null = null;
  private lastRaw: Vec2 | null = null;
  private pendingLayer: MaskLayer | null = null;
  private pendingS = 1;

  strokeTo(layer: MaskLayer, u: number, v: number, S: number): void {
    this.lastRaw = { x: u, y: v };
    this.pendingLayer = layer;
    this.pendingS = S;
    if (!this.smooth) {
      this.smooth = { x: u, y: v };
      layer.stamp(u, v, this.brushRadius * S, this.erasing, this.brushType === 'soft');
      this.last = { x: u, y: v };
      return;
    }
    this.smooth.x += (u - this.smooth.x) * this.streamline;
    this.smooth.y += (v - this.smooth.y) * this.streamline;
    this.stampSegment(layer, this.smooth.x, this.smooth.y, S);
  }

  private stampSegment(layer: MaskLayer, u: number, v: number, S: number): void {
    const r = this.brushRadius * S;
    const soft = this.brushType === 'soft';
    if (!this.last) {
      layer.stamp(u, v, r, this.erasing, soft);
    } else {
      const dx = u - this.last.x;
      const dy = v - this.last.y;
      const dist = Math.hypot(dx, dy);
      const spacing = Math.max(r * 0.4, 1e-4);
      const steps = Math.min(200, Math.ceil(dist / spacing));
      for (let i = 1; i <= steps; i++) {
        layer.stamp(
          this.last.x + (dx * i) / steps,
          this.last.y + (dy * i) / steps,
          r,
          this.erasing,
          soft,
        );
      }
    }
    this.last = { x: u, y: v };
  }

  endStroke(): void {
    if (this.pendingLayer && this.lastRaw && this.last) {
      this.stampSegment(this.pendingLayer, this.lastRaw.x, this.lastRaw.y, this.pendingS);
    }
    this.last = null;
    this.smooth = null;
    this.lastRaw = null;
    this.pendingLayer = null;
  }
}
