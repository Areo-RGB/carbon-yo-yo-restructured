import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const webRoot = resolve(import.meta.dirname, '..');
const distDir = resolve(webRoot, 'dist');
const androidAssetsDir = resolve(webRoot, '..', 'app', 'src', 'main', 'assets', 'webapp');

try {
  await stat(resolve(distDir, 'index.html'));
} catch {
  console.error('Missing webapp/dist/index.html. Run `npm run build` first.');
  process.exit(1);
}

await rm(androidAssetsDir, { recursive: true, force: true });
await mkdir(androidAssetsDir, { recursive: true });
await cp(distDir, androidAssetsDir, { recursive: true });
console.log(`Synced ${distDir} -> ${androidAssetsDir}`);
