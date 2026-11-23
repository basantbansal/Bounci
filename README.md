<div align="center">

# 🥟 Bounci

**Interactive WebGL2 Squishy Cheek Physics Browser Extension**  
*Ported & adapted from Fluffy Maker into a modern, lightning-fast WebExtension (Manifest V3)*

[![WebGL2](https://img.shields.io/badge/WebGL2-Hardware_Accelerated-990000?style=flat-square&logo=webgl&logoColor=white)](https://www.khronos.org/webgl/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)

*Pinch, stretch, wobble, and pull cheeks on any anime character, meme, terminal window, or webpage image in real-time with 120+ FPS spring physics, WebGL2 mesh deformation, and squishy WebAudio sound effects.*

</div>

---

## ✨ Features

- ✂️ **Global Snip & Squish Shortcut (`Alt + Shift + S`)**: Drag a selection box over any character, meme, or terminal on any webpage to immediately snip and squish it with zero blur.
- 🖱️ **Right-Click Any Image**: Right-click any image on the web and select **"Squish with Bounci ✨"** to instantly open an interactive floating squishy overlay right over the webpage.
- 📸 **1-Click Clipboard Snapshot (`C`)**: Love your funny squished pose? Click the **📸 Snapshot** button (or press `C`) to copy the deformed image directly to your clipboard for instant pasting into Discord, Slack, Twitter, or WhatsApp!
- 📋 **Paste (`Ctrl + V`) & Drag-and-Drop**: Paste images directly from your clipboard or drag and drop image files right into the floating widget.
- 🥟 **Buttery-Smooth GPU Floating Overlay**: Hardware-accelerated draggable overlay with road-marking dashed boundaries, slim unobtrusive control bars, and auto-fade in Play mode.
- 🎯 **Double-Click Title Bar to Recenter**: Easily move the widget anywhere on screen or double-click the header to snap it right to the center of your viewport.
- 🎨 **Full Bounci Studio**: Dedicated full-page tab (`studio.html`) supporting full-screen playground, GIF recording with palette quantization, and WebM video export.
- 🧬 **WebGL2 Physics Engine**:
  - Semi-implicit Euler damping spring integration with tanh saturation resistance.
  - C2 continuous quintic smootherstep deformation falloff.
  - 3D volume preservation with realistic bulge expansion.
  - 100% razor-sharp native pixel texture rendering (no blur, no washed-out filters).
- 🔊 **Pure WebAudio Synthesizer**: Procedural squishy *"muni"* grab sound and resonant *"purun"* wobble release sound (zero external audio files needed).
- 🎛️ **Live Physics Tuning**: Adjust softness in the popup slider and watch the floating widget adapt its spring elasticity in real-time.

---

## ⚡ Quick Installation

Bounci is ready to load directly as an unpacked extension into any Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Vivaldi, Opera) or Firefox.

### 1. In Google Chrome / Brave / Edge / Vivaldi / Opera
1. Open your browser and navigate to:
   - **Chrome / Brave / Vivaldi**: `chrome://extensions`
   - **Microsoft Edge**: `edge://extensions`
   - **Opera**: `opera://extensions`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click the **"Load unpacked"** button.
4. Select the `Bounci` folder:
   ```
   /mnt/hdd/basant-data/Projects/Bounci
   ```
   *(or the pre-built `Bounci/dist` folder)*
5. The **🥟 Bounci** extension is now installed and active! Pin it to your toolbar for instant access.

### 2. In Firefox
1. Open Firefox and navigate to:
   ```
   about:debugging#/runtime/this-firefox
   ```
2. Click **"Load Temporary Add-on..."**.
3. Select `manifest.json` inside the `Bounci` folder.

---

## 🎮 How to Use

### 1. Snip Any Region of the Screen
- Press **`Alt + Shift + S`** (or click the Bounci icon in toolbar and choose **"✂️ Snip Page Area"**).
- Drag a selection box over any character, window, terminal, or avatar.
- Release to capture! The floating widget appears with the exact captured area, ready to pinch and wobble immediately.

### 2. Right-Click Any Image on Any Webpage
- Find any image or avatar on any website.
- Right-click and choose **"Squish with Bounci ✨"**.
- A floating Bounci window opens instantly loaded with that image.

### 3. Paste or Drop Any Image
- Press `Ctrl + V` while the overlay is open, or drag-and-drop any image file directly onto the widget.

### 4. Copy Snapshot to Clipboard
- Click the **📸 Snapshot** button in the top bar (or press **`C`**) to copy your squished creation directly to your clipboard.

### 5. Full Bounci Studio
- Press **`Alt + Shift + B`** or click **"🎨 Bounci Studio"** in the popup.
- Upload high-res images, fine-tune physics (Softness, Stretch, Wobble Frequency, Bulge), and export animated GIFs!

---

## ⌨️ Controls & Shortcuts

| Action | Shortcut / Control |
|---|---|
| **Snip Page Area** | `Alt + Shift + S` (Global) |
| **Open Studio** | `Alt + Shift + B` (Global) |
| **Squish & Pull Cheeks** | Left-Click & Drag on painted cheek area in Play mode |
| **Copy Snapshot to Clipboard** | `C` or `📸` button |
| **Play Mode (Squish All)** | `Space` / `S` / `2` |
| **Paint Mask Mode** | `P` / `1` |
| **Adjust Brush Size** | Scroll mouse wheel (in Paint mode), slider, or `[` / `]` |
| **Zoom & Pan** | Scroll mouse wheel (in Play mode) / Touch pinch gesture |
| **Recenter Window** | Double-Click the top title bar |
| **Move Floating Widget** | Click and drag the top title bar |
| **Paste Image from Clipboard** | `Ctrl + V` |
| **Close Overlay** | `Escape` or `✕` button |
| **Reset Zoom/Pan** | `Reset View` button |

---

## 🛠️ Project Structure

```
Bounci/
├── manifest.json            # WebExtension Manifest V3 (commands, permissions)
├── package.json             # Build configuration & scripts
├── vite.config.ts           # Multi-page Vite bundler config
├── scripts/
│   ├── build.js             # Automated TypeScript, Vite & esbuild bundler
│   └── package.js           # Production release packager (.zip creator)
├── public/
│   ├── icons/               # 16, 32, 48, 128px PNG & SVG icons
│   └── sample.svg           # Preloaded cute sample character
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
│   ├── content/             # Webpage content script & sniper capture tool
│   ├── background/          # Background service worker (commands, context menus)
│   ├── popup/               # Extension toolbar popup UI & actions
│   └── studio/              # Full-screen standalone Studio playground
└── dist/                    # Compiled, production-ready extension bundle
```

---

## 🏗️ Development & Building

To modify or rebuild the extension:

```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# 3. Package extension into a distribution .zip (for Chrome Web Store / AMO / GitHub)
npm run package
```

The `npm run package` command compiles all TypeScript sources and packages a clean, lightweight `bounci-extension.zip` ready for store submission or sharing with friends!

---

## 📄 License

MIT License © 2026 Basant Bansal
