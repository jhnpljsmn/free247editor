import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFFmpeg } from './utils/paths.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache', 'svg-cache');

export async function convertSvgToPng(svgPath, { width = null, height = null } = {}) {
  if (!existsSync(svgPath)) {
    throw new Error(`SVG file not found: ${svgPath}`);
  }

  // Create deterministic cache key
  const content = readFileSync(svgPath);
  const hash = Buffer.from(content).toString('base64').slice(0, 16);
  const sizeKey = `${width || 'auto'}x${height || 'auto'}`;
  const cacheKey = `${hash}_${sizeKey}.png`;
  const cachePath = join(cacheDir, cacheKey);

  if (existsSync(cachePath)) {
    return cachePath;
  }

  mkdirSync(cacheDir, { recursive: true });

  // Use FFmpeg to convert SVG to PNG
  // This works well for simple geometric SVGs
  const args = ['-y', '-loglevel', 'error', '-i', svgPath];

  if (width || height) {
    const scale = width ? `scale=${width}:-1` : `scale=-1:${height}`;
    args.push('-vf', scale);
  }

  args.push(cachePath);

  try {
    runFFmpeg(args, { quiet: true });
  } catch (err) {
    // Fallback: try rsvg-convert if available
    try {
      const { spawnSync } = await import('node:child_process');
      const rsvgArgs = [svgPath, '-o', cachePath];
      if (width) rsvgArgs.push('--width', String(width));
      if (height) rsvgArgs.push('--height', String(height));

      const result = spawnSync('rsvg-convert', rsvgArgs, { encoding: 'utf8' });
      if (result.status !== 0) throw new Error('rsvg-convert failed');
    } catch {
      throw new Error(`Failed to convert SVG to PNG. Ensure FFmpeg is installed or install librsvg: ${err.message}`);
    }
  }

  return cachePath;
}

export function clearSvgCache() {
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }
}
