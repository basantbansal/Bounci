export const CONFIG = {
  maxGrabs: 8,
  meshShortSegs: 128,
  meshMaxSegs: 192,
  imageMaxSide: 2048,
  alphaSampleMaxSide: 1024,
  fitRatio: 1.0, // 1.0 for pixel-perfect screen overlay
  dprCap: 3,
  maskSize: 512,
  maskBlur: 0.008,

  // Drag follow spring
  dragOmega: 80, // rad/s (~25ms lag)
  dragZeta: 0.85,
  grabEaseMs: 60,
  radiusGrow: 0.35,

  // Integration
  substep: 1 / 240,
  maxDt: 1 / 30,
  settlePos: 1e-3,
  settleVel: 1e-2,

  // Recording
  gifMaxSeconds: 6,
  gifFps: 30,
  gifMaxSide: 480,
};

export interface MochiParams {
  radius: number; // Pinch radius * S
  stretch: number; // Max stretch L_max = stretch * radius
  releaseFreq: number; // Wobble frequency (Hz)
  releaseZeta: number; // Damping ratio (lower = more wobble)
  bulge: number; // Volume preservation bulge amount
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function paramsFromSoftness(s: number): MochiParams {
  return {
    radius: 0.22,
    stretch: lerp(0.44, 0.66, s),
    releaseFreq: lerp(12, 6, s),
    releaseZeta: lerp(0.28, 0.1, s),
    bulge: 0.1,
  };
}

export function zetaFromWobble(w: number): number {
  return lerp(0.35, 0.1, w);
}

export function wobbleFromZeta(z: number): number {
  return Math.min(1, Math.max(0, (0.35 - z) / 0.25));
}

export const DEFAULT_SOFTNESS = 0.5;
