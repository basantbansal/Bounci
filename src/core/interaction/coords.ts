export interface Vec2 {
  x: number;
  y: number;
}

export class ViewTransform {
  aspect = 1;
  canvasW = 1;
  canvasH = 1;
  k = 1;
  ox = 0;
  oy = 0;
  private a = 1;
  private b = 0;
  private tx = 0;
  private ty = 0;
  private mat = new Float32Array(9);

  update(canvasW: number, canvasH: number, aspect: number, fitRatio: number): void {
    this.aspect = aspect;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.k = fitRatio * Math.min(canvasW / aspect, canvasH);
    this.ox = (canvasW - this.k * aspect) / 2;
    this.oy = (canvasH - this.k) / 2;
  }

  get scale(): number {
    return Math.hypot(this.a, this.b);
  }

  resetUser(): void {
    this.a = 1;
    this.b = 0;
    this.tx = 0;
    this.ty = 0;
  }

  isTransformed(): boolean {
    return (
      Math.abs(this.scale - 1) > 1e-3 ||
      Math.abs(this.b) > 1e-3 ||
      Math.abs(this.tx) > 0.5 ||
      Math.abs(this.ty) > 0.5
    );
  }

  applyGesture(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2): void {
    const vx = p2.x - p1.x;
    const vy = p2.y - p1.y;
    const wx = q2.x - q1.x;
    const wy = q2.y - q1.y;
    const d2 = vx * vx + vy * vy;
    if (d2 < 1e-6) return;
    let as = (wx * vx + wy * vy) / d2;
    let bs = (wy * vx - wx * vy) / d2;
    const sigma = Math.hypot(as, bs);
    if (sigma < 1e-6) return;
    const clamped = Math.min(Math.max(sigma * this.scale, 0.5), 8) / this.scale;
    as *= clamped / sigma;
    bs *= clamped / sigma;
    this.compose(as, bs, q1.x - (as * p1.x - bs * p1.y), q1.y - (bs * p1.x + as * p1.y));
  }

  zoomAt(px: number, py: number, factor: number): void {
    const f = Math.min(Math.max(factor * this.scale, 0.5), 8) / this.scale;
    this.compose(f, 0, px * (1 - f), py * (1 - f));
  }

  private compose(as: number, bs: number, txs: number, tys: number): void {
    const { a, b, tx, ty } = this;
    this.a = as * a - bs * b;
    this.b = bs * a + as * b;
    this.tx = as * tx - bs * ty + txs;
    this.ty = bs * tx + as * ty + tys;
  }

  matrix(): Float32Array {
    const { k, ox, oy, canvasW: w, canvasH: h, a, b, tx, ty } = this;
    const A = a * k;
    const B = b * k;
    const Tx = a * ox - b * oy + tx;
    const Ty = b * ox + a * oy + ty;
    this.mat.set([
      (2 * A) / w, (-2 * B) / h, 0,
      (-2 * B) / w, (-2 * A) / h, 0,
      (2 * Tx) / w - 1, 1 - (2 * Ty) / h, 1,
    ]);
    return this.mat;
  }

  canvasPxFromClient(clientX: number, clientY: number, canvas: HTMLCanvasElement): Vec2 {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * this.canvasW) / rect.width,
      y: ((clientY - rect.top) * this.canvasH) / rect.height,
    };
  }

  isoFromClient(clientX: number, clientY: number, canvas: HTMLCanvasElement): Vec2 {
    const p = this.canvasPxFromClient(clientX, clientY, canvas);
    const { a, b, tx, ty } = this;
    const det = a * a + b * b;
    const dx = p.x - tx;
    const dy = p.y - ty;
    const bx = (a * dx + b * dy) / det;
    const by = (-b * dx + a * dy) / det;
    return { x: (bx - this.ox) / this.k, y: (by - this.oy) / this.k };
  }

  isoToCssLength(len: number, canvas: HTMLCanvasElement): number {
    const rect = canvas.getBoundingClientRect();
    return len * this.k * this.scale * (rect.width / this.canvasW);
  }

  restUvFromIso(iso: Vec2): Vec2 {
    return { x: iso.x / this.aspect, y: iso.y };
  }
}
