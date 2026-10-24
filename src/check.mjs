// Pre-render checks: script problems, unknown cast/locations, and missing audio files.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { loadCast, findSheet } from './stick/cast.mjs';
import { normalizeLocation, locationImage, LOCATIONS, TIMES } from './stick/backdrops.mjs';
import { resolveAsset, voicePath } from './stick/renderer.mjs';

export function loadScenes(project, dirs) {
  return project.scenes.map((id) => JSON.parse(readFileSync(join(dirs.scenes, `${id}.json`), 'utf8')));
}

/** Returns { problems: string[], missingVoice: string[] }. */
export function checkProject(project, dirs) {
  const cast = loadCast(dirs.root);
  const problems = [];
  const missingVoice = [];
  for (const s of loadScenes(project, dirs)) {
    const p = (msg) => problems.push(`${s.id}: ${msg}`);
    for (const w of s.warnings || []) p(w);
    for (const c of s.characters) {
      if (!findSheet(cast, c.name)) p(`no character sheet for "${c.name}" (add shared-assets/cast/${c.name.toLowerCase().replace(/\s+/g, '-')}.json or fix the name)`);
    }
    if (s.location && !normalizeLocation(s.location) && !locationImage(s.location, s.time, (r) => resolveAsset(r, dirs))) {
      p(`unknown location "${s.location}" (use: ${LOCATIONS.join(', ')}, or add shared-assets/backgrounds/${s.location}.png)`);
    }
    if (s.time && !TIMES.includes(s.time)) p(`unknown time "${s.time}" (use: ${TIMES.join(', ')})`);
    if (s.background?.type === 'image') {
      try { resolveAsset(s.background.asset, dirs); } catch { p(`missing background image ${s.background.asset}`); }
    }
    for (const sfx of s.soundEffects || []) {
      try { resolveAsset(sfx.asset, dirs); } catch { p(`missing sound effect ${sfx.asset}`); }
    }
    if (s.music?.asset) {
      try { resolveAsset(s.music.asset, dirs); } catch { p(`missing music ${s.music.asset}`); }
    }
    if (s.narration?.text && !voicePath(s, dirs)) missingVoice.push(s.narration.audioFile || `voiceovers/${s.id}.mp3`);
  }
  if (project.music?.asset) {
    try { resolveAsset(project.music.asset, dirs); } catch { problems.push(`episode music missing: ${project.music.asset}`); }
  }
  return { problems, missingVoice };
}

/** Narration per scene, ready to paste into ElevenLabs one scene at a time. */
export function writeVoiceLines(project, dirs) {
  const out = join(dirs.root, 'voiceover-lines.txt');
  const blocks = loadScenes(project, dirs)
    .filter((s) => s.narration?.text)
    .map((s) => `${(s.narration.audioFile || `voiceovers/${s.id}.mp3`).split('/').pop()}  (${s.title})\n${s.narration.text}`);
  writeFileSync(out, `${blocks.join('\n\n')}\n`);
  return { path: out, count: blocks.length };
}

/** Problems with a rendered file: missing video/audio stream, wrong size, or a length that doesn't match the scenes. */
export function validateVideo(path, expectedDuration, { width, height }) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', path], { encoding: 'utf8' });
  if (r.status !== 0) return [`could not read ${path}`];
  const info = JSON.parse(r.stdout);
  const problems = [];
  const video = info.streams.find((s) => s.codec_type === 'video');
  if (!video) problems.push('no video stream');
  else if (video.width !== width || video.height !== height) problems.push(`video is ${video.width}x${video.height}, expected ${width}x${height}`);
  if (!info.streams.some((s) => s.codec_type === 'audio')) problems.push('no audio stream');
  const d = parseFloat(info.format?.duration);
  if (!(Math.abs(d - expectedDuration) < 1)) problems.push(`video is ${d.toFixed(1)}s, expected ${expectedDuration.toFixed(1)}s`);
  return problems;
}
