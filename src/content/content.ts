import { startSniper, type CropRect } from './sniper';

let activeWidget: HTMLDivElement | null = null;
let widgetX = 0;
let widgetY = 0;
let widgetW = 300;
let widgetH = 220;
let pendingDx = 0;
let pendingDy = 0;
let rafMoveId: number | null = null;

function applyWidgetPosition(): void {
  if (!activeWidget) return;
  widgetX += pendingDx;
  widgetY += pendingDy;
  pendingDx = 0;
  pendingDy = 0;

  // Zero DOM reads! Uses cached widgetW and widgetH:
  widgetX = Math.max(-widgetW + 80, Math.min(widgetX, window.innerWidth - 80));
  widgetY = Math.max(0, Math.min(widgetY, window.innerHeight - 40));

  activeWidget.style.transform = `translate3d(${Math.round(widgetX)}px, ${Math.round(widgetY)}px, 0)`;
  rafMoveId = null;
}

function removeFloatingWidget(): void {
  if (rafMoveId) {
    cancelAnimationFrame(rafMoveId);
    rafMoveId = null;
  }
  if (activeWidget) {
    activeWidget.remove();
    activeWidget = null;
  }
}

function spawnFloatingWidget(imageUrl: string, preferredRect?: { x: number; y: number; w: number; h: number }): void {
  removeFloatingWidget();

  const container = document.createElement('div');
  container.id = 'bounci-floating-widget';

  const defaultW = Math.min(480, window.innerWidth * 0.85);
  const defaultH = Math.min(380, window.innerHeight * 0.75);

  let w = preferredRect?.w ?? defaultW;
  let h = preferredRect?.h ?? defaultH;

  // Clamp reasonable initial size
  w = Math.max(160, Math.min(w, window.innerWidth - 20));
  h = Math.max(120, Math.min(h, window.innerHeight - 20));

  widgetW = w;
  widgetH = h;

  widgetX = preferredRect ? preferredRect.x : (window.innerWidth - w) / 2;
  widgetY = preferredRect ? preferredRect.y : (window.innerHeight - h) / 2;

  widgetX = Math.max(10, Math.min(widgetX, window.innerWidth - w - 10));
  widgetY = Math.max(10, Math.min(widgetY, window.innerHeight - h - 10));

  pendingDx = 0;
  pendingDy = 0;

  container.style.width = `${Math.round(w)}px`;
  container.style.height = `${Math.round(h)}px`;
  container.style.transform = `translate3d(${Math.round(widgetX)}px, ${Math.round(widgetY)}px, 0)`;

  const iframe = document.createElement('iframe');
  const overlayUrl = chrome.runtime.getURL('overlay/overlay.html');
  iframe.src = `${overlayUrl}?fit=1.0`;

  iframe.addEventListener('load', () => {
    iframe.contentWindow?.postMessage({ type: 'BOUNCI_LOAD_IMAGE', imageUrl }, '*');
  });

  container.appendChild(iframe);
  document.body.appendChild(container);
  activeWidget = container;
}

// Window messages from iframe (overlay)
window.addEventListener('message', (e) => {
  if (!e.data || typeof e.data !== 'object') return;

  if (e.data.type === 'BOUNCI_CLOSE') {
    removeFloatingWidget();
  } else if (e.data.type === 'BOUNCI_DRAG_START') {
    activeWidget?.classList.add('bounci-dragging');
  } else if (e.data.type === 'BOUNCI_DRAG_END') {
    activeWidget?.classList.remove('bounci-dragging');
    if (pendingDx !== 0 || pendingDy !== 0) {
      applyWidgetPosition();
    }
  } else if (e.data.type === 'BOUNCI_MOVE' && activeWidget) {
    pendingDx += e.data.dx || 0;
    pendingDy += e.data.dy || 0;
    if (!rafMoveId) {
      rafMoveId = requestAnimationFrame(applyWidgetPosition);
    }
  } else if (e.data.type === 'BOUNCI_CENTER' && activeWidget) {
    widgetX = (window.innerWidth - widgetW) / 2;
    widgetY = (window.innerHeight - widgetH) / 2;
    activeWidget.style.transform = `translate3d(${Math.round(widgetX)}px, ${Math.round(widgetY)}px, 0)`;
  } else if (e.data.type === 'BOUNCI_OPEN_STUDIO') {
    chrome.runtime.sendMessage({ type: 'BOUNCI_OPEN_STUDIO' });
  }
});

// Crop captured screenshot with exact aspect scaling & zero interpolation blur
async function cropScreenshot(dataUrl: string, rect: CropRect): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scaleX = img.naturalWidth / window.innerWidth;
      const scaleY = img.naturalHeight / window.innerHeight;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(rect.w * scaleX));
      canvas.height = Math.max(1, Math.round(rect.h * scaleY));
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false; // Zero blur on crop!
      ctx.drawImage(
        img,
        Math.round(rect.x * scaleX),
        Math.round(rect.y * scaleY),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

// Listen for messages from background / popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'BOUNCI_OPEN_IMAGE') {
    spawnFloatingWidget(msg.imageUrl);
    sendResponse({ ok: true });
  } else if (msg.type === 'BOUNCI_START_SNIP') {
    startSniper(async (rect) => {
      // Allow two animation frames for sniper veil removal to settle on screen
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          chrome.runtime.sendMessage({ type: 'BOUNCI_CAPTURE_TAB' }, async (res) => {
            if (res?.dataUrl) {
              const cropped = await cropScreenshot(res.dataUrl, rect);
              spawnFloatingWidget(cropped, rect);
            }
          });
        });
      });
    });
    sendResponse({ ok: true });
  }
  return true;
});
