import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const zipFile = path.resolve(rootDir, 'bounci-extension.zip');

console.log('📦 Building and packaging Bounci extension for release...\n');

// 1. Run build
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 2. Remove existing zip if any
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

// 3. Zip dist directory contents
try {
  execSync(`cd "${distDir}" && zip -r "${zipFile}" ./*`, { stdio: 'inherit' });
  const stats = fs.statSync(zipFile);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log(`\n🎉 Success! Extension packaged into: ${zipFile} (${sizeKb} KB / ${sizeMb} MB)`);
  console.log('✨ Ready to upload to Chrome Web Store, Firefox Add-ons (AMO), or attach to GitHub Releases.');
} catch (e) {
  console.error('Failed to create zip package:', e);
  process.exit(1);
}
