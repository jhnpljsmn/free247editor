// Production planning: what every scene needs (sprites, backgrounds, voiceover, sounds), what already
// exists and can be reused, and what is still missing. Writes production/asset-checklist.md and
// production/missing.json (the input for writing Google Flow prompts).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCast, sheetOrDefault } from './stick/cast.mjs';
import { characterAt, actionsFor } from './stick/timeline.mjs';
import { normalizeLocation, locationImage, TIMES } from './stick/backdrops.mjs';
import { spriteNames, pickSprite, expressionFor } from './stick/sprites.mjs';
import { resolveAsset, voicePath } from './stick/renderer.mjs';
import { loadScenes } from './check.mjs';

// Every pose/expression a character shows during the scene, found by replaying its actions.
function looksInScene(scene, char, sheet, w) {
  const actions = actionsFor(scene, char.id);
  const end = Math.max(0, ...actions.map((a) => a.time + (a.duration || 0))) + 3;
  const looks = new Set();
  for (let t = 0; t <= end; t += 0.1) {
    const s = characterAt(char, sheet, actions, t, w);
    if (s.visible) looks.add(`${s.poseName}-${expressionFor(sheet, s.poseName, s.expression)}`);
  }
  return [...looks];
}

const has = (ref, dirs) => { try { resolveAsset(ref, dirs); return true; } catch { return false; } };

/** What each scene needs and what is missing; nothing is written. */
export function collectAssets(project, dirs) {
  const cast = loadCast(dirs.root);
  const w = project.resolution?.width || 1080;
  const sprites = new Map(); // character id → { sheet, looks: Map(look → { pick, scenes }) }
  const backgrounds = new Map(); // ref → { location, time, scenes }
  const rows = [];
  const missingFiles = [];

  for (const scene of loadScenes(project, dirs)) {
    const row = { id: scene.id, title: scene.title, chars: [], bg: '', voice: '', sfx: [] };

    if (scene.card) row.bg = 'title card';
    else if (scene.background?.type === 'image') row.bg = `${scene.background.asset} ${has(scene.background.asset, dirs) ? '✅' : '❌'}`;
    else if (scene.location && !normalizeLocation(scene.location)) {
      const time = TIMES.includes(scene.time) ? scene.time : 'night';
      const found = locationImage(scene.location, time, (r) => resolveAsset(r, dirs));
      const ref = found || `backgrounds/${scene.location}-${time}.png`;
      if (!found) {
        if (!backgrounds.has(ref)) backgrounds.set(ref, { location: scene.location, time, weather: scene.weather, scenes: [] });
        backgrounds.get(ref).scenes.push(scene.id);
      }
      row.bg = `${ref} ${found ? '✅ reuse' : '❌'}`;
    } else row.bg = `${normalizeLocation(scene.location) || 'street'} (drawn) ✅`;

    const seen = new Set();
    for (const c of scene.characters || []) {
      const sheet = sheetOrDefault(cast, c.name || c.id);
      if (seen.has(sheet.id)) continue;
      seen.add(sheet.id);
      if (!sprites.has(sheet.id)) sprites.set(sheet.id, { sheet, names: spriteNames(sheet), looks: new Map() });
      const entry = sprites.get(sheet.id);
      const marks = [];
      for (const look of looksInScene(scene, c, sheet, w)) {
        const [pose, expr] = look.split(/-(?=[^-]+$)/);
        const pick = pickSprite(sheet, pose, expr, entry.names);
        if (!entry.looks.has(look)) entry.looks.set(look, { pick, scenes: [] });
        entry.looks.get(look).scenes.push(scene.id);
        marks.push(`${look} ${pick.exact ? '✅' : pick.name ? `⚠️→${pick.name}` : '❌'}`);
      }
      row.chars.push(`${sheet.name || sheet.id}: ${marks.join(', ')}`);
    }

    if (scene.narration?.text) {
      const ref = scene.narration.audioFile || `voiceovers/${scene.id}.mp3`;
      const ok = !!voicePath(scene, dirs);
      row.voice = `${ref.split('/').pop()} ${ok ? '✅' : '❌'}`;
      if (!ok) missingFiles.push(`assets/${ref}`);
    }
    for (const s of scene.soundEffects || []) {
      const ok = has(s.asset, dirs);
      row.sfx.push(`${s.asset.split('/').pop()} ${ok ? '✅' : '❌'}`);
      if (!ok) missingFiles.push(`assets/${s.asset}`);
    }
    rows.push(row);
  }
  if (project.music?.asset && !has(project.music.asset, dirs)) missingFiles.push(`assets/${project.music.asset} (episode music)`);

  // Sprites to generate: exact looks with no file. Approximations (⚠️) are listed so they can be upgraded.
  const missing = { sprites: [], approximated: [], backgrounds: [], files: [...new Set(missingFiles)] };
  for (const { sheet, names, looks } of sprites.values()) {
    for (const [look, { pick, scenes }] of looks) {
      const item = { character: sheet.name || sheet.id, id: sheet.id, file: `shared-assets/cast/${sheet.id}/${look}.png`, look, scenes, hasSprites: names.length > 0 };
      if (!pick.name) missing.sprites.push(item);
      else if (!pick.exact) missing.approximated.push({ ...item, using: pick.name });
    }
  }
  for (const [ref, b] of backgrounds) missing.backgrounds.push({ file: `shared-assets/${ref}`, ...b });
  return { rows, missing, sprites };
}

export function planAssets(project, dirs) {
  const { rows, missing, sprites } = collectAssets(project, dirs);

  const out = join(dirs.root, 'production');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'missing.json'), JSON.stringify(missing, null, 2));
  writeFileSync(join(out, 'asset-checklist.md'), checklist(project, rows, missing, sprites));
  return { dir: out, missing };
}

function checklist(project, rows, missing, sprites) {
  const lines = [`# ${project.name}: asset checklist`, '', '✅ ready / reused · ⚠️ uses a close sprite · ❌ missing', '', '## Scenes', ''];
  for (const r of rows) {
    lines.push(`### ${r.id}: ${r.title}`, `- Background: ${r.bg}`);
    if (r.voice) lines.push(`- Voiceover: ${r.voice}`);
    for (const c of r.chars) lines.push(`- ${c}`);
    if (r.sfx.length) lines.push(`- SFX: ${r.sfx.join(', ')}`);
    lines.push('');
  }
  lines.push('## To make', '');
  const box = (s) => lines.push(`- [ ] ${s}`);
  for (const s of missing.sprites) box(`${s.file} (${s.scenes.join(', ')})`);
  for (const b of missing.backgrounds) box(`${b.file} (${b.scenes.join(', ')})`);
  for (const f of missing.files) box(`projects/${project.id}/${f}`);
  if (!missing.sprites.length && !missing.backgrounds.length && !missing.files.length) lines.push('Nothing. All assets are in place.');
  if (missing.approximated.length) {
    lines.push('', '## Optional upgrades (a close sprite is used now)', '');
    for (const s of missing.approximated) lines.push(`- ${s.file}, now uses ${s.using}.png (${s.scenes.join(', ')})`);
  }
  lines.push('', '## Reused sprites', '');
  for (const { sheet, names } of sprites.values()) {
    if (names.length) lines.push(`- ${sheet.name || sheet.id}: ${names.join(', ')}`);
  }
  return `${lines.join('\n')}\n`;
}
