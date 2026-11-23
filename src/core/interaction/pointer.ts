export interface PointerHandlers {
  down?(e: PointerEvent): void;
  move?(e: PointerEvent): void;
  up?(e: PointerEvent): void;
}

export function attachPointer(
  canvas: HTMLCanvasElement,
  getHandlers: () => PointerHandlers | null,
): void {
  canvas.addEventListener('pointerdown', (e) => {
    const h = getHandlers();
    if (!h?.down) return;
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    h.down(e);
  });
  canvas.addEventListener('pointermove', (e) => getHandlers()?.move?.(e));
  const up = (e: PointerEvent) => getHandlers()?.up?.(e);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}
