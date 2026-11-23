import { execSync } from 'child_process';
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

console.log('🚀 Building Bounci browser extension...');

// 1. Run Vite build for HTML pages
console.log('📦 Step 1: Building HTML pages with Vite...');
execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });

// 2. Reorganize Vite output if needed (src/overlay/overlay.html -> overlay/overlay.html)
const pages = ['overlay', 'popup', 'studio'];
for (const p of pages) {
  const nested = path.join(distDir, 'src', p, `${p}.html`);
  const targetDir = path.join(distDir, p);
  const target = path.join(targetDir, `${p}.html`);

  if (fs.existsSync(nested)) {
    fs.mkdirSync(targetDir, { recursive: true });
    let content = fs.readFileSync(nested, 'utf-8');
    // Fix relative asset paths if moved up one directory level
    content = content.replace(/(href|src)="(\.\.\/)+/g, '$1="../');
    fs.writeFileSync(target, content, 'utf-8');
  }
}
if (fs.existsSync(path.join(distDir, 'src'))) {
  fs.rmSync(path.join(distDir, 'src'), { recursive: true, force: true });
}

// 3. Bundle Background Service Worker with esbuild (ESM)
console.log('⚙️ Step 2: Bundling background service worker...');
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/background/background.ts')],
  bundle: true,
  outfile: path.join(distDir, 'background.js'),
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  minify: false,
});

// 4. Bundle Content Script with esbuild (IIFE)
console.log('🧩 Step 3: Bundling content script...');
fs.mkdirSync(path.join(distDir, 'content'), { recursive: true });
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/content/content.ts')],
  bundle: true,
  outfile: path.join(distDir, 'content/content.js'),
  format: 'iife',
  target: 'es2022',
  platform: 'browser',
  minify: false,
});

// 5. Copy content.css
fs.copyFileSync(
  path.join(rootDir, 'src/content/content.css'),
  path.join(distDir, 'content/content.css')
);

// 6. Copy manifest.json to dist
fs.copyFileSync(
  path.join(rootDir, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);

// 7. Ensure icons and sample.svg are in dist
const publicIcons = path.join(rootDir, 'public/icons');
const distIcons = path.join(distDir, 'icons');
if (fs.existsSync(publicIcons)) {
  fs.mkdirSync(distIcons, { recursive: true });
  for (const f of fs.readdirSync(publicIcons)) {
    fs.copyFileSync(path.join(publicIcons, f), path.join(distIcons, f));
  }
}

const sampleSvg = path.join(rootDir, 'public/sample.svg');
if (fs.existsSync(sampleSvg)) {
  fs.copyFileSync(sampleSvg, path.join(distDir, 'sample.svg'));
}

// 8. Also copy dist files to root so loading either Bounci/ or Bounci/dist/ works out of the box!
console.log('🔄 Step 4: Mirroring built assets to root for instant unpacked loading...');
const copyRecursive = (src, dest) => {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
};

for (const folder of ['overlay', 'popup', 'studio', 'assets', 'content', 'icons']) {
  const srcPath = path.join(distDir, folder);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, path.join(rootDir, folder));
  }
}
if (fs.existsSync(path.join(distDir, 'background.js'))) {
  fs.copyFileSync(path.join(distDir, 'background.js'), path.join(rootDir, 'background.js'));
}
if (fs.existsSync(path.join(distDir, 'sample.svg'))) {
  fs.copyFileSync(path.join(distDir, 'sample.svg'), path.join(rootDir, 'sample.svg'));
}

console.log('✅ Bounci browser extension build complete! Ready to load in Chrome/Brave/Edge/Firefox.');
