// Pre-render checks: script problems, unknown cast/locations, and missing audio files.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCast, findSheet } from './stick/cast.mjs';
import { normalizeLocation, LOCATIONS, TIMES } from './stick/backdrops.mjs';
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
    if (s.location && !normalizeLocation(s.location)) p(`unknown location "${s.location}" (use: ${LOCATIONS.join(', ')})`);
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
