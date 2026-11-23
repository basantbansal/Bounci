import { Sfx } from '../core/audio/sfx';
import { CONFIG } from '../core/config';
import { loadFromBlob, loadFromUrl, makeAlphaSampler } from '../core/image/loader';
import { ViewTransform } from '../core/interaction/coords';
import { attachPointer, type PointerHandlers } from '../core/interaction/pointer';
import { MaskLayer } from '../core/mask/maskCanvas';
import { MaskTool } from '../core/mask/maskTool';
import { PinchSystem } from '../core/physics/pinchSystem';
import { createGL } from '../core/renderer/gl';
import { Renderer } from '../core/renderer/renderer';
import { events, setMode, state, type LoadedImage } from '../core/state';

class OverlayApp {
  readonly maskTool = new MaskTool();

  private canvas = document.getElementById('gl') as HTMLCanvasElement;
  private stage = document.getElementById('stage')!;
  private brushCursor = document.getElementById('brushCursor')!;
  private brushPreview = document.getElementById('brushPreview')!;
  private brushPreviewTimer = 0;
  private fileInput = document.getElementById('fileInput') as HTMLInputElement;
  private view = new ViewTransform();
  private pinch = new PinchSystem();
  private mask = new MaskLayer();
  private sfx = new Sfx();
  private renderer: Renderer | null = null;

  private needsRender = true;
  private lastT = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private gestureActive = false;
  private btnResetView = document.getElementById('btnResetView') as HTMLButtonElement;

  constructor() {
    const gl = createGL(this.canvas);
    if (!gl) {
      this.toast('WebGL2 is not supported in this browser.');
      return;
    }
    this.renderer = new Renderer(gl, this.view);

    const ro = new ResizeObserver(() => this.onResize());
    ro.observe(this.stage);
    this.onResize();

    this.canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    this.canvas.addEventListener('webglcontextrestored', () => this.restoreGL());

    attachPointer(this.canvas, () => this.currentHandlers());

    // Wheel: zoom or brush size
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        if (!state.image) return;
        e.preventDefault();
        if (state.mode === 'paint') {
          const delta = e.deltaY > 0 ? -0.006 : 0.006;
          this.maskTool.brushRadius = Math.max(0.01, Math.min(0.25, this.maskTool.brushRadius + delta));
          this.updateBrushCursorSize();
          this.showBrushPreview();
          const slider = document.getElementById('bounciBrushSize') as HTMLInputElement | null;
          if (slider) slider.value = String(this.maskTool.brushRadius);
          return;
        }
        const p = this.view.canvasPxFromClient(e.clientX, e.clientY, this.canvas);
        this.view.zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
        this.afterViewChange();
      },
      { passive: false },
    );

    this.btnResetView.addEventListener('click', () => {
      this.view.resetUser();
      this.afterViewChange();
    });

    this.setupUI();

    // Sound unlock
    const unlockAudio = () => this.sfx.unlock();
    window.addEventListener('pointerup', unlockAudio, { once: true });
    window.addEventListener('touchend', unlockAudio, { once: true });

    events.on('mode', () => {
      this.brushCursor.hidden = state.mode !== 'paint';
      this.mask.dirty = true;
      this.needsRender = true;
      this.updateModeUI();
    });
    events.on('params', () => (this.needsRender = true));

    // Sync preferences with extension storage in real-time
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['bounci_softness', 'bounci_muted'], (res) => {
        if (res.bounci_softness !== undefined) {
          state.softness = res.bounci_softness;
          this.pinch.updateParams();
        }
        if (res.bounci_muted !== undefined) {
          state.muted = Boolean(res.bounci_muted);
        }
      });
      chrome.storage.onChanged?.addListener((changes, area) => {
        if (area === 'local') {
          if (changes.bounci_softness) {
            state.softness = changes.bounci_softness.newValue;
            this.pinch.updateParams();
          }
          if (changes.bounci_muted) {
            state.muted = Boolean(changes.bounci_muted.newValue);
          }
        }
      });
    }

    // Handle messages from host container or extension
    window.addEventListener('message', (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'BOUNCI_LOAD_IMAGE') {
        const url = e.data.imageUrl || e.data.dataUrl;
        if (url) void this.loadImage(url);
      }
    });

    requestAnimationFrame((t) => {
      this.lastT = t;
      requestAnimationFrame(this.tick);
    });

    // Check query params for initial image
    const params = new URLSearchParams(window.location.search);
    const initialImg = params.get('image');
    if (initialImg) {
      void this.loadImage(initialImg);
    }
  }

  private setupUI(): void {
    const btnPaint = document.getElementById('bounciBtnPaint') as HTMLButtonElement | null;
    const btnPlay = document.getElementById('bounciBtnPlay') as HTMLButtonElement | null;
    const btnAll = document.getElementById('bounciBtnAllMochi') as HTMLButtonElement | null;
    const brushSize = document.getElementById('bounciBrushSize') as HTMLInputElement | null;
    const btnClose = document.getElementById('bounciBtnClose');
    const btnSnapshot = document.getElementById('bounciBtnSnapshot');
    const btnStudio = document.getElementById('bounciBtnStudio');
    const btnPick = document.getElementById('btnPick');
    const btnSample = document.getElementById('btnSample');

    btnSnapshot?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.snapshot();
    });

    btnPaint?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.maskTool.erasing = false;
      this.enterPaint();
    });

    btnPlay?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.enterPlay(false);
    });

    btnAll?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.enterPlay(true);
    });

    brushSize?.addEventListener('input', (e) => {
      e.stopPropagation();
      if (!brushSize) return;
      this.maskTool.brushRadius = parseFloat(brushSize.value);
      this.updateBrushCursorSize();
      this.showBrushPreview();
    });

    btnClose?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    btnStudio?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openInStudio();
    });

    btnPick?.addEventListener('click', () => this.fileInput.click());
    btnSample?.addEventListener('click', () => void this.loadSample());

    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      if (file) void this.loadBlob(file);
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === '1' || e.key.toLowerCase() === 'p') {
        this.enterPaint();
      } else if (e.key === '2' || e.key.toLowerCase() === 's' || e.code === 'Space') {
        if (e.code === 'Space') e.preventDefault();
        this.enterPlay(false);
      } else if (e.key === 'c' || e.key === 'C') {
        this.snapshot();
      } else if (e.key === '[') {
        if (brushSize) {
          brushSize.value = String(Math.max(0.01, parseFloat(brushSize.value) - 0.01));
          brushSize.dispatchEvent(new Event('input'));
        }
      } else if (e.key === ']') {
        if (brushSize) {
          brushSize.value = String(Math.min(0.25, parseFloat(brushSize.value) + 0.01));
          brushSize.dispatchEvent(new Event('input'));
        }
      }
    });

    // Header drag handle communicates move to parent window smoothly with RAF throttling
    const dragHandle = document.getElementById('bounciDragHandle');
    const dragArea = document.getElementById('bounciDragArea');
    let isDragging = false;
    let lastScreenX = 0;
    let lastScreenY = 0;
    let pendingMsgDx = 0;
    let pendingMsgDy = 0;
    let dragRafId: number | null = null;

    const flushMove = () => {
      if (pendingMsgDx !== 0 || pendingMsgDy !== 0) {
        window.parent.postMessage({ type: 'BOUNCI_MOVE', dx: pendingMsgDx, dy: pendingMsgDy }, '*');
        pendingMsgDx = 0;
        pendingMsgDy = 0;
      }
      dragRafId = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.screenX - lastScreenX;
      const dy = e.screenY - lastScreenY;
      lastScreenX = e.screenX;
      lastScreenY = e.screenY;
      pendingMsgDx += dx;
      pendingMsgDy += dy;
      if (!dragRafId) {
        dragRafId = requestAnimationFrame(flushMove);
      }
    };

    const stopDragging = () => {
      if (!isDragging) return;
      isDragging = false;
      if (dragRafId) {
        cancelAnimationFrame(dragRafId);
        dragRafId = null;
      }
      flushMove();
      document.body.classList.remove('is-dragging');
      window.parent.postMessage({ type: 'BOUNCI_DRAG_END' }, '*');
      window.removeEventListener('pointermove', onPointerMove, { capture: true });
      window.removeEventListener('pointerup', stopDragging, { capture: true });
      window.removeEventListener('pointercancel', stopDragging, { capture: true });
    };

    const startDragging = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.fluffy-top-actions') || (e.target as HTMLElement).closest('button')) {
        return;
      }
      isDragging = true;
      lastScreenX = e.screenX;
      lastScreenY = e.screenY;
      pendingMsgDx = 0;
      pendingMsgDy = 0;
      document.body.classList.add('is-dragging');
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      window.parent.postMessage({ type: 'BOUNCI_DRAG_START' }, '*');
      window.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
      window.addEventListener('pointerup', stopDragging, { capture: true });
      window.addEventListener('pointercancel', stopDragging, { capture: true });
      e.preventDefault();
    };

    dragHandle?.addEventListener('pointerdown', startDragging);
    dragArea?.addEventListener('pointerdown', startDragging);

    // Double click title bar to center widget
    const titleBar = document.getElementById('bounciTitleBar');
    titleBar?.addEventListener('dblclick', (e) => {
      if ((e.target as HTMLElement).closest('.fluffy-top-actions') || (e.target as HTMLElement).closest('button')) return;
      window.parent.postMessage({ type: 'BOUNCI_CENTER' }, '*');
    });

    // Drag and drop image files directly onto overlay
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          void this.loadBlob(file);
          this.toast('Image loaded! ✨');
        }
      }
    });

    // Paste image from clipboard (Ctrl + V)
    window.addEventListener('paste', (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            void this.loadBlob(blob);
            this.toast('Pasted image from clipboard! 📋✨');
            e.preventDefault();
            break;
          }
        }
      }
    });
  }

  private updateModeUI(): void {
    const btnPaint = document.getElementById('bounciBtnPaint');
    const btnPlay = document.getElementById('bounciBtnPlay');
    if (state.mode === 'paint') {
      btnPaint?.classList.add('active');
      btnPlay?.classList.remove('active');
    } else if (state.mode === 'play') {
      btnPaint?.classList.remove('active');
      btnPlay?.classList.add('active');
    }
  }

  private close(): void {
    window.parent.postMessage({ type: 'BOUNCI_CLOSE' }, '*');
  }

  private snapshot(): void {
    if (!this.canvas) return;
    try {
      this.canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          this.toast('Snapshot copied to clipboard! 📋✨');
        } catch {
          // Fallback: download as PNG file
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `bounci-${Date.now()}.png`;
          a.click();
          this.toast('Snapshot saved as PNG! 📸✨');
        }
      }, 'image/png');
    } catch {
      this.toast('Could not take snapshot');
    }
  }

  private openInStudio(): void {
    if (state.image) {
      try {
        const dataUrl = state.image.source.toDataURL('image/png');
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set({ bounci_studio_image: dataUrl }, () => {
            chrome.runtime.sendMessage({ type: 'BOUNCI_OPEN_STUDIO' });
          });
          return;
        }
      } catch {}
    }
    window.parent.postMessage({ type: 'BOUNCI_OPEN_STUDIO' }, '*');
  }

  async loadImage(url: string): Promise<void> {
    try {
      const img = await loadFromUrl(url);
      this.setImage(img);
    } catch {
      this.toast('Failed to load image');
    }
  }

  async loadBlob(blob: Blob): Promise<void> {
    try {
      const img = await loadFromBlob(blob);
      this.setImage(img);
    } catch {
      this.toast('Failed to load image');
    }
  }

  async loadSample(): Promise<void> {
    try {
      const sampleUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL('sample.svg')
        : './sample.svg';
      await this.loadImage(sampleUrl);
      this.enterPlay(true);
      this.toast('Sample loaded! Pinch and stretch cheeks ✨');
    } catch {
      this.toast('Could not load sample');
    }
  }

  private setImage(img: LoadedImage): void {
    state.image = img;
    this.renderer?.setImage(img.source, img.aspect);
    this.pinch.releaseAll();
    this.pinch.aspect = img.aspect;
    this.pinch.alphaSample = makeAlphaSampler(img);
    this.mask.setup(img.aspect);
    this.pinch.maskSample = this.mask.sample;
    state.maskEnabled = true;
    this.view.resetUser();

    document.getElementById('emptyState')!.hidden = true;
    events.emit('image');
    this.enterPlay(true);
    this.afterViewChange();
  }

  private afterViewChange(): void {
    this.needsRender = true;
    this.updateBrushCursorSize();
    this.btnResetView.hidden = !this.view.isTransformed();
  }

  enterPaint(): void {
    if (!state.image) return;
    this.pinch.releaseAll();
    state.maskEnabled = true;
    this.resetGesture();
    setMode('paint');
  }

  enterPlay(allMochi = false): void {
    if (!state.image) return;
    if (allMochi || (state.maskEnabled && !this.mask.painted)) {
      state.maskEnabled = false;
      if (!allMochi) this.toast('No mask painted, made whole image squishy!');
    }
    this.resetGesture();
    setMode('play');
  }

  private resetGesture(): void {
    this.pointers.clear();
    this.gestureActive = false;
  }

  private updateBrushCursorSize(): void {
    const d = this.view.isoToCssLength(this.maskTool.brushRadius * this.pinch.S, this.canvas) * 2;
    this.brushCursor.style.width = `${d}px`;
    this.brushCursor.style.height = `${d}px`;
  }

  private showBrushPreview(): void {
    const d = this.view.isoToCssLength(this.maskTool.brushRadius * this.pinch.S, this.canvas) * 2;
    this.brushPreview.style.width = `${d}px`;
    this.brushPreview.style.height = `${d}px`;
    this.brushPreview.hidden = false;
    this.brushCursor.hidden = true;
    window.clearTimeout(this.brushPreviewTimer);
    this.brushPreviewTimer = window.setTimeout(() => {
      this.brushPreview.hidden = true;
      this.brushCursor.hidden = state.mode !== 'paint';
    }, 800);
  }

  private tick = (t: number): void => {
    const dt = (t - this.lastT) / 1000;
    this.lastT = t;
    this.pinch.update(dt);

    if (this.mask.dirty && this.renderer) {
      this.renderer.updateMask(
        state.mode === 'paint' ? this.mask.canvas : this.mask.textureSource(),
      );
      this.mask.dirty = false;
      this.needsRender = true;
    }

    if (this.renderer && (this.needsRender || this.pinch.active)) {
      const g = this.pinch.fillUniforms();
      this.renderer.draw({
        grabCount: g.grabCount,
        grabA: g.grabA,
        grabPull: g.grabPull,
        bulge: state.params.bulge,
        maskEnabled: state.maskEnabled,
        maskView: state.mode === 'paint',
      });
      this.needsRender = false;
    }

    requestAnimationFrame(this.tick);
  };

  private currentHandlers(): PointerHandlers | null {
    if (!state.image) return null;
    if (state.mode === 'play') return this.playHandlers;
    if (state.mode === 'paint') return this.paintHandlers;
    return null;
  }

  private playHandlers: PointerHandlers = {
    down: (e) => {
      const p = this.view.canvasPxFromClient(e.clientX, e.clientY, this.canvas);
      this.pointers.set(e.pointerId, p);
      if (this.gestureActive) return;
      const iso = this.view.isoFromClient(e.clientX, e.clientY, this.canvas);
      if (this.pinch.tryGrab(e.pointerId, iso)) {
        this.sfx.grab();
      } else if (this.pointers.size >= 2) {
        this.gestureActive = true;
        for (const g of this.pinch.grabs) {
          if (!g.released) this.pinch.release(g.pointerId);
        }
      }
    },
    move: (e) => {
      if (this.gestureActive) {
        this.handleGestureMove(e);
        return;
      }
      if (this.pointers.has(e.pointerId)) {
        this.pointers.set(e.pointerId, this.view.canvasPxFromClient(e.clientX, e.clientY, this.canvas));
      }
      this.pinch.move(e.pointerId, this.view.isoFromClient(e.clientX, e.clientY, this.canvas));
    },
    up: (e) => {
      this.pointers.delete(e.pointerId);
      if (this.gestureActive) {
        if (this.pointers.size === 0) this.gestureActive = false;
        return;
      }
      const g = this.pinch.grabs.find((g) => g.pointerId === e.pointerId && !g.released);
      if (!g) return;
      const intensity = this.pinch.intensityOf(g);
      this.pinch.release(e.pointerId);
      this.sfx.release(intensity, state.params.releaseFreq);
    },
  };

  private paintHandlers: PointerHandlers = {
    down: (e) => {
      if (!this.brushPreview.hidden) this.brushPreview.hidden = true;
      const p = this.view.canvasPxFromClient(e.clientX, e.clientY, this.canvas);
      this.pointers.set(e.pointerId, p);
      if (this.pointers.size === 1 && !this.gestureActive) {
        this.mask.beginStroke();
        this.moveBrushCursor(e);
        this.paintAt(e);
      } else if (this.pointers.size === 2 && !this.gestureActive) {
        this.gestureActive = true;
        this.maskTool.endStroke();
        this.mask.cancelStroke();
        this.brushCursor.hidden = true;
      }
    },
    move: (e) => {
      if (this.gestureActive) {
        this.handleGestureMove(e);
        return;
      }
      this.moveBrushCursor(e);
      if (this.pointers.has(e.pointerId)) {
        this.pointers.set(e.pointerId, this.view.canvasPxFromClient(e.clientX, e.clientY, this.canvas));
        const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
        for (const ce of coalesced.length > 0 ? coalesced : [e]) this.paintAt(ce);
      }
    },
    up: (e) => {
      if (this.pointers.delete(e.pointerId)) {
        if (!this.gestureActive) this.maskTool.endStroke();
        if (this.pointers.size === 0) {
          this.gestureActive = false;
          this.brushCursor.hidden = state.mode !== 'paint';
        }
      }
    },
  };

  private handleGestureMove(e: PointerEvent): void {
    if (!this.pointers.has(e.pointerId)) return;
    const pts = [...this.pointers.entries()];
    if (pts.length < 2) return;
    const [id1, p1] = pts[0];
    const [id2, p2] = pts[1];
    const q = this.view.canvasPxFromClient(e.clientX, e.clientY, this.canvas);
    if (e.pointerId === id1) this.view.applyGesture(p1, p2, q, p2);
    else if (e.pointerId === id2) this.view.applyGesture(p1, p2, p1, q);
    else return;
    this.pointers.set(e.pointerId, q);
    this.afterViewChange();
  }

  private paintAt(e: PointerEvent): void {
    const iso = this.view.isoFromClient(e.clientX, e.clientY, this.canvas);
    const uv = this.view.restUvFromIso(iso);
    const u = Math.min(1, Math.max(0, uv.x));
    const v = Math.min(1, Math.max(0, uv.y));
    this.maskTool.strokeTo(this.mask, u, v, this.pinch.S);
  }

  private moveBrushCursor(e: PointerEvent): void {
    const rect = this.stage.getBoundingClientRect();
    this.brushCursor.style.left = `${e.clientX - rect.left}px`;
    this.brushCursor.style.top = `${e.clientY - rect.top}px`;
  }

  private onResize(): void {
    if (!this.renderer) return;
    const rect = this.stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.renderer.resize(w, h);
      this.needsRender = true;
      this.updateBrushCursorSize();
    }
  }

  private restoreGL(): void {
    const gl = createGL(this.canvas);
    if (!gl) return;
    this.renderer = new Renderer(gl, this.view);
    this.renderer.resize(this.canvas.width, this.canvas.height);
    if (state.image) {
      this.renderer.setImage(state.image.source, state.image.aspect);
      this.renderer.updateMask(this.mask.textureSource());
    }
    this.needsRender = true;
  }

  private toast(msg: string): void {
    const area = document.getElementById('toastArea');
    if (!area) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    area.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }
}

new OverlayApp();
