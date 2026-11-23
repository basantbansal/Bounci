import { Sfx } from '../core/audio/sfx';
import { Recorder } from '../core/capture/recorder';
import { CONFIG, DEFAULT_SOFTNESS, paramsFromSoftness, wobbleFromZeta, zetaFromWobble } from '../core/config';
import { loadFromBlob, loadFromUrl, makeAlphaSampler } from '../core/image/loader';
import { ViewTransform } from '../core/interaction/coords';
import { attachPointer, type PointerHandlers } from '../core/interaction/pointer';
import { MaskLayer } from '../core/mask/maskCanvas';
import { MaskTool } from '../core/mask/maskTool';
import { PinchSystem } from '../core/physics/pinchSystem';
import { createGL } from '../core/renderer/gl';
import { Renderer } from '../core/renderer/renderer';
import { events, setMode, state, type LoadedImage, type RecFormat } from '../core/state';

class StudioApp {
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
  private recorder = new Recorder();
  private renderer: Renderer | null = null;

  private needsRender = true;
  private lastT = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private gestureActive = false;
  private btnResetView = document.getElementById('btnResetView') as HTMLButtonElement;

  constructor() {
    const gl = createGL(this.canvas);
    if (!gl) {
      this.toast('WebGL2 not supported');
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
          const slider = document.getElementById('brushSize') as HTMLInputElement | null;
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
    this.setupDropAndPaste();

    const unlockAudio = () => this.sfx.unlock();
    window.addEventListener('pointerup', unlockAudio, { once: true });
    window.addEventListener('touchend', unlockAudio, { once: true });

    this.recorder.onStatus = (m) => this.toast(m);
    this.recorder.onStopped = () => {
      state.recording = false;
      events.emit('recording');
    };

    events.on('mode', () => {
      this.brushCursor.hidden = state.mode !== 'paint';
      this.mask.dirty = true;
      this.needsRender = true;
      this.syncUI();
    });
    events.on('image', () => this.syncUI());
    events.on('params', () => (this.needsRender = true));

    requestAnimationFrame((t) => {
      this.lastT = t;
      requestAnimationFrame(this.tick);
    });

    // Check storage for image passed from popup or right-click
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['bounci_studio_image', 'bounci_softness', 'bounci_muted'], (res) => {
        if (res.bounci_softness !== undefined) {
          state.softness = res.bounci_softness;
          state.params = paramsFromSoftness(state.softness);
        }
        if (res.bounci_muted !== undefined) {
          state.muted = res.bounci_muted;
        }
        if (res.bounci_studio_image) {
          chrome.storage.local.remove('bounci_studio_image');
          void this.loadImage(res.bounci_studio_image);
        }
      });
    }
  }

  private setupUI(): void {
    const $ = (id: string) => document.getElementById(id)!;

    $('stepLoad').addEventListener('click', () => this.fileInput.click());
    $('stepPaint').addEventListener('click', () => this.enterPaint());
    $('stepPlay').addEventListener('click', () => this.enterPlay());

    $('btnPick').addEventListener('click', () => this.fileInput.click());
    $('btnSample').addEventListener('click', () => void this.loadSample());

    // Paint bar
    const btnBrush = $('btnBrush');
    const btnEraser = $('btnEraser');
    const setEraser = (erasing: boolean) => {
      this.maskTool.erasing = erasing;
      btnBrush.classList.toggle('active', !erasing);
      btnEraser.classList.toggle('active', erasing);
    };
    btnBrush.addEventListener('click', () => setEraser(false));
    btnEraser.addEventListener('click', () => setEraser(true));

    const brushSize = $('brushSize') as HTMLInputElement;
    brushSize.addEventListener('input', () => {
      this.maskTool.brushRadius = parseFloat(brushSize.value);
      this.updateBrushCursorSize();
      this.showBrushPreview();
    });

    const brushType = $('brushType');
    brushType.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const soft = btn.dataset.type === 'soft';
        this.maskTool.brushType = soft ? 'soft' : 'hard';
        brushType.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
        this.showBrushPreview();
      });
    });

    $('btnClearMask').addEventListener('click', () => {
      this.mask.clear();
      this.needsRender = true;
    });
    $('btnAllMochi').addEventListener('click', () => this.enterPlay(true));
    $('btnPlay').addEventListener('click', () => this.enterPlay());

    // Toolbar
    $('btnChangeImage').addEventListener('click', () => this.fileInput.click());
    $('btnRepaint').addEventListener('click', () => this.enterPaint());

    const btnSound = $('btnSound');
    const sfxIcon = $('sfxIcon');
    btnSound.addEventListener('click', () => {
      state.muted = !state.muted;
      sfxIcon.textContent = state.muted ? '🔇' : '🔊';
      btnSound.classList.toggle('muted', state.muted);
      this.toast(state.muted ? 'Sound Muted' : 'Sound Enabled');
    });

    const btnRecord = $('btnRecord');
    btnRecord.addEventListener('click', () => this.toggleRecord());
    events.on('recording', () => {
      btnRecord.classList.toggle('recording', state.recording);
    });

    const panel = $('panel');
    const panelBackdrop = $('panelBackdrop');
    const openPanel = (v: boolean) => {
      panel.hidden = !v;
      panelBackdrop.hidden = !v;
    };
    $('btnOptions').addEventListener('click', () => openPanel(true));
    $('btnClosePanel').addEventListener('click', () => openPanel(false));
    panelBackdrop.addEventListener('click', () => openPanel(false));

    // Sliders
    const pSoftness = $('pSoftness') as HTMLInputElement;
    const pRadius = $('pRadius') as HTMLInputElement;
    const pStretch = $('pStretch') as HTMLInputElement;
    const pFreq = $('pFreq') as HTMLInputElement;
    const pWobble = $('pWobble') as HTMLInputElement;
    const pBulge = $('pBulge') as HTMLInputElement;
    const pVolume = $('pVolume') as HTMLInputElement;

    const syncSliders = () => {
      const p = state.params;
      pSoftness.value = String(state.softness);
      pRadius.value = String(p.radius);
      pStretch.value = String(p.stretch);
      pFreq.value = String(p.releaseFreq);
      pWobble.value = String(wobbleFromZeta(p.releaseZeta));
      pBulge.value = String(p.bulge);
      pVolume.value = String(state.volume);
    };

    pSoftness.addEventListener('input', () => {
      state.softness = parseFloat(pSoftness.value);
      state.params = paramsFromSoftness(state.softness);
      syncSliders();
      events.emit('params');
    });

    const bind = (el: HTMLInputElement, apply: (v: number) => void) => {
      el.addEventListener('input', () => {
        apply(parseFloat(el.value));
        events.emit('params');
      });
    };
    bind(pRadius, (v) => (state.params.radius = v));
    bind(pStretch, (v) => (state.params.stretch = v));
    bind(pFreq, (v) => (state.params.releaseFreq = v));
    bind(pWobble, (v) => (state.params.releaseZeta = zetaFromWobble(v)));
    bind(pBulge, (v) => (state.params.bulge = v));
    bind(pVolume, (v) => (state.volume = v));

    $('btnResetParams').addEventListener('click', () => {
      state.softness = DEFAULT_SOFTNESS;
      state.params = paramsFromSoftness(DEFAULT_SOFTNESS);
      syncSliders();
      events.emit('params');
    });

    const recFormatSeg = $('recFormat');
    recFormatSeg.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.recFormat = (btn.dataset.fmt as RecFormat) ?? 'video';
        recFormatSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      });
    });

    this.fileInput.addEventListener('change', () => {
      const f = this.fileInput.files?.[0];
      if (f) void this.loadBlob(f);
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === '1' || e.key.toLowerCase() === 'p') {
        this.enterPaint();
      } else if (e.key === '2' || e.key.toLowerCase() === 's' || e.code === 'Space') {
        if (e.code === 'Space') e.preventDefault();
        this.enterPlay();
      } else if (e.key === 'r' || e.key === 'R') {
        if (state.mode === 'play') this.toggleRecord();
      }
    });
  }

  private setupDropAndPaste(): void {
    const dropOverlay = document.getElementById('dropOverlay')!;
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropOverlay.hidden = false;
    });
    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null) dropOverlay.hidden = true;
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dropOverlay.hidden = true;
      const file = e.dataTransfer?.files[0];
      if (file && file.type.startsWith('image/')) {
        void this.loadBlob(file);
      }
    });

    window.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) void this.loadBlob(file);
          break;
        }
      }
    });
  }

  private syncUI(): void {
    const $ = (id: string) => document.getElementById(id)!;
    const m = state.mode;
    $('emptyState').hidden = m !== 'empty';
    $('paintUi').hidden = m !== 'paint';
    $('toolbar').hidden = m !== 'play';

    const has = !!state.image;
    ($('stepPaint') as HTMLButtonElement).disabled = !has;
    ($('stepPlay') as HTMLButtonElement).disabled = !has;

    $('stepLoad').classList.toggle('active', m === 'empty');
    $('stepPaint').classList.toggle('active', m === 'paint');
    $('stepPlay').classList.toggle('active', m === 'play');
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
        : '../sample.svg';
      await this.loadImage(sampleUrl);
      this.enterPlay(true);
      this.toast('Sample loaded! Pinch and drag to squish cheeks ✨');
    } catch {
      this.toast('Failed to load sample');
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

    events.emit('image');
    setMode('paint');
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
      if (!allMochi) this.toast('No mask painted, made entire image squishy!');
    }
    this.resetGesture();
    setMode('play');
  }

  private resetGesture(): void {
    this.pointers.clear();
    this.gestureActive = false;
  }

  private toggleRecord(): void {
    if (state.recording) {
      this.recorder.stop();
      return;
    }
    if (!state.image || state.mode !== 'play') {
      this.toast('Switch to Play mode to record');
      return;
    }
    if (!this.recorder.start(this.canvas, state.recFormat)) {
      this.toast('Recording not supported in this browser');
      return;
    }
    state.recording = true;
    events.emit('recording');
    this.toast(state.recFormat === 'gif' ? `Recording GIF (${CONFIG.gifMaxSeconds}s max)` : 'Recording video! Press again to stop.');
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

    if (this.renderer && (this.needsRender || this.pinch.active || state.recording)) {
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

    if (state.recording) this.recorder.tick(t);
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
    setTimeout(() => el.remove(), 2500);
  }
}

new StudioApp();
