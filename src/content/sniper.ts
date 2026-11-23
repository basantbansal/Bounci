export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function startSniper(onComplete: (rect: CropRect) => void, onCancel?: () => void): void {
  const existing = document.getElementById('bounci-sniper-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'bounci-sniper-overlay';
  overlay.className = 'bounci-sniper-veil';

  const hint = document.createElement('div');
  hint.className = 'bounci-sniper-hint';
  hint.textContent = '✂️ Click and drag to snip squishy region (Esc to cancel)';
  overlay.appendChild(hint);

  const box = document.createElement('div');
  box.className = 'bounci-sniper-box';
  box.style.display = 'none';
  overlay.appendChild(box);

  const badge = document.createElement('div');
  badge.className = 'bounci-sniper-badge';
  box.appendChild(badge);

  document.body.appendChild(overlay);

  let isDown = false;
  let startX = 0;
  let startY = 0;

  const cleanup = () => {
    window.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup();
      onCancel?.();
    }
  };
  window.addEventListener('keydown', onKeyDown, true);

  overlay.addEventListener('pointerdown', (e) => {
    isDown = true;
    startX = e.clientX;
    startY = e.clientY;
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    box.style.width = '0px';
    box.style.height = '0px';
    box.style.display = 'block';
    overlay.setPointerCapture(e.pointerId);
  });

  overlay.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const curX = e.clientX;
    const curY = e.clientY;
    const x = Math.min(startX, curX);
    const y = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);

    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.style.width = `${w}px`;
    box.style.height = `${h}px`;
    badge.textContent = `${w} × ${h}`;
  });

  overlay.addEventListener('pointerup', (e) => {
    if (!isDown) return;
    isDown = false;
    const curX = e.clientX;
    const curY = e.clientY;
    const x = Math.min(startX, curX);
    const y = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);

    cleanup();

    if (w > 15 && h > 15) {
      onComplete({ x, y, w, h });
    } else {
      onCancel?.();
    }
  });
}
