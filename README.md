<div align="center">

# 🥟 Bounci

**Interactive WebGL2 Squishy Cheek Physics Browser Extension**  
*Ported & adapted from Fluffy Maker into a modern WebExtension (Manifest V3)*

[![WebGL2](https://img.shields.io/badge/WebGL2-Hardware_Accelerated-990000?style=flat-square&logo=webgl&logoColor=white)](https://www.khronos.org/webgl/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)

*Pinch, stretch, and wobble any anime character, avatar, or photo on any webpage in real-time with smooth spring physics, WebGL2 deformation, and squishy WebAudio sound effects.*

</div>

---

## ✨ Features

- 🖱️ **Right-Click Any Image**: Right-click any image on the web and click **"Squish with Bounci ✨"** to instantly open an interactive floating squishy overlay right on the page.
- ✂️ **Snip & Squish Page Region**: Just like `slurp` and `grim` on Linux, drag a selection box across any part of the active tab to snip and squish it instantly.
- 🥟 **Ultra-Smooth GPU-Composited Floating Overlay**: Smooth 120+ FPS hardware-accelerated draggable overlay window with Paint mode, brush slider, and Play mode.
- 🎨 **Full Bounci Studio**: Dedicated full-page tab (`studio.html`) supporting file upload, drag-and-drop, clipboard pasting (`Ctrl + V`), and preloaded sample characters.
- 🧬 **WebGL2 Physics Engine**:
  - Semi-implicit Euler damping spring integration with tanh saturation resistance.
  - C2 continuous quintic smootherstep deformation falloff.
  - 3D volume preservation (bulge expansion).
  - 2-pass depth testing (opaque pass + fringe blend) for clean transparency.
- 🔊 **Pure WebAudio Synthesizer**: Procedural squishy *"muni"* grab sound and resonant *"purun"* wobble release sound (no external audio assets required).
- 📹 **Video & GIF Recording**: Capture your squishy interactions as WebM/MP4 video or export animated GIFs with palette quantization.

---

## ⚡ Quick Installation

Bounci is ready to load directly as an unpacked extension into any Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Vivaldi, Opera) or Firefox.

### 1. In Google Chrome / Brave / Edge
1. Open your browser and navigate to:
   - Chrome / Brave / Vivaldi: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click the **"Load unpacked"** button.
4. Select the `Bounci` folder:
   ```
   /mnt/hdd/basant-data/Projects/Bounci
   ```
   *(or `/mnt/hdd/basant-data/Projects/Bounci/dist`)*
5. The **🥟 Bounci** extension is now installed and active! Pin it to your toolbar for quick access.

### 2. In Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **"Load Temporary Add-on..."**.
3. Select `manifest.json` inside the `Bounci` folder.

---

## 🎮 How to Use

### 1. Right-Click Any Image on Any Webpage
- Find any character, avatar, or photo on a website.
- Right-click the image and select **"Squish with Bounci ✨"**.
- A floating Bounci overlay will appear right on the webpage.

### 2. Snip Any Region of the Webpage
- Click the **Bounci** extension icon in your browser toolbar.
- Click **"✂️ Snip Page Area"** (or right-click anywhere and select *"Snip & Squish page area ✂️"*).
- Click and drag a box over any window, terminal, character, or region on the page.
- Release to capture and immediately launch the squishy widget with buttery-smooth draggable controls!

### 3. Bounci Studio (Full Playground)
- Click **"🎨 Bounci Studio"** in the popup or right-click the extension icon.
- Drag and drop your own images, paste from clipboard (`Ctrl + V`), or click **"Play with Sample ✨"**.
- Fine-tune physics (Softness, Stretch, Wobble Frequency, Bulge) in the Settings drawer.
- Record high-FPS video or animated GIFs of your squishy creations!

---

## ⌨️ Controls & Shortcuts

| Action | Control |
|---|---|
| **Squish & Pull Cheeks** | Left-Click & Drag on painted cheek area in Play mode |
| **Paint Mask Mode** | `🖌️ Paint` button, or press `P` / `1` |
| **Play Mode** | `✨ Play!` button, or press `Space` / `S` / `2` |
| **Adjust Brush Size** | Scroll mouse wheel on canvas (in Paint mode), use slider, or `[` / `]` |
| **Zoom & Pan** | Scroll mouse wheel on canvas (in Play mode) / 2-finger touch gesture |
| **Toggle Sound** | Sound icon in top bar / popup, or press `M` |
| **Move Floating Widget** | Click and drag the top-left **🥟 Bounci** badge, or drag the header |
| **Close Overlay** | Top-right `✕` button, or press `Escape` |
| **Reset Zoom/Pan** | `Reset View` button |

---

## 🛠️ Project Structure

```
Bounci/
├── manifest.json            # Chrome / WebExtension Manifest V3
├── package.json             # Build configuration & scripts
├── vite.config.ts           # Multi-page Vite bundler config
├── scripts/
│   └── build.js             # Automated extension bundler
├── public/
│   ├── icons/               # 16, 32, 48, 128px PNG & SVG icons
│   └── sample.svg           # Preloaded cute mochimaru character
├── src/
│   ├── core/                # Core WebGL2 & squishy physics engine
│   │   ├── physics/         # Verlet spring solver & multi-grab system
│   │   ├── renderer/        # WebGL2 shaders, textures, mesh, 2-pass renderer
│   │   ├── mask/            # 2D canvas mask layer & streamline brush tool
│   │   ├── interaction/     # ViewTransform (zoom/pan) & pointer capture
│   │   ├── audio/           # Synthesized WebAudio squishy sound effects
│   │   ├── image/           # High-resolution image & alpha decoders
│   │   ├── capture/         # Video MediaRecorder & gifenc GIF encoder worker
│   │   ├── config.ts        # Physics constants & parameter mappings
│   │   └── state.ts         # Reactive state & event dispatcher
│   ├── overlay/             # In-page floating widget UI & controller
│   ├── content/             # Webpage content script, sniper tool & picker
│   ├── background/          # Background service worker (context menus, capture, CORS fetch)
│   ├── popup/               # Extension toolbar popup UI & actions
│   └── studio/              # Full-screen standalone Studio playground
└── dist/                    # Compiled, production-ready extension bundle
```

---

## 🏗️ Development & Building

To modify or rebuild the extension:

```bash
cd Bounci
npm install
npm run build
```

The build script automatically bundles the TypeScript sources, compiles the WebGL shaders, generates clean ES modules and content scripts, and keeps both `Bounci/` and `Bounci/dist/` ready to load unpacked into any browser!
