import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function getProjectDirs(projectId) {
  const base = join(root, 'projects', projectId);
  return {
    root: base,
    scenes: join(base, 'scenes'),
    assets: join(base, 'assets'),
    characters: join(base, 'assets', 'characters'),
    backgrounds: join(base, 'assets', 'backgrounds'),
    sounds: join(base, 'assets', 'sounds'),
    voiceovers: join(base, 'assets', 'voiceovers'),
    renders: join(base, 'renders'),
    preview: join(base, 'renders', 'preview'),
    final: join(base, 'renders', 'final')
  };
}

export function runFFmpeg(args, { quiet = false, cwd = root } = {}) {
  const result = spawnSync('ffmpeg', args, {
    cwd,
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit']
  });

  if (result.error) {
    throw new Error(`FFmpeg not found: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`FFmpeg failed with code ${result.status}: ${result.stderr || ''}`);
  }

  return result;
}

export function getFFmpegPath() {
  const result = spawnSync('which', ['ffmpeg'], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : 'ffmpeg';
}

export function checkTool(tool) {
  const result = spawnSync('which', [tool], { encoding: 'utf8' });
  return result.status === 0;
}
