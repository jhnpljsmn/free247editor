// Renders a stick-figure scene: frames are drawn on a canvas and piped to FFmpeg with the audio.
import { createCanvas } from '@napi-rs/canvas';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { buildAudio, probeDuration } from '../audio.mjs';
import { runFFmpeg } from '../utils/paths.mjs';
import { loadCast, sheetOrDefault } from './cast.mjs';
import { drawFigure } from './figure.mjs';
import { preloadSprites, drawSprite, spriteNames, spriteDir } from './sprites.mjs';
import { characterAt, actionsFor } from './timeline.mjs';
import { buildBackdrop, drawRain, locationImage } from './backdrops.mjs';
import { drawProp } from './props.mjs';
import { cameraAt, applyCamera, drawOverlays, drawDayBadge, drawCard } from './effects.mjs';
import { buildCaptions, drawCaptions } from './captions.mjs';
import { registerFonts, FONT } from './text.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Fingerprint of the drawing code, so engine changes re-render scenes that look unchanged.
const ENGINE_VERSION = (() => {
  const h = createHash('sha1');
  const dir = dirname(fileURLToPath(import.meta.url));
  for (const f of readdirSync(dir).sort()) h.update(readFileSync(join(dir, f)));
  h.update(readFileSync(join(dir, '..', 'audio.mjs')));
  return h.digest('hex').slice(0, 12);
})();
export const VOICE_DELAY = 0.25;

export function resolveAsset(ref, dirs) {
  const file = ref.replace(/^sounds\//, '');
  const candidates = [join(dirs.assets, ref), join(root, 'shared-assets', ref), join(root, ref)];
  if (ref.startsWith('sounds/')) {
    candidates.push(join(dirs.assets, 'music', file), join(root, 'shared-assets', 'music', file), join(root, 'my-sounds', file));
  }
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(`Asset not found: ${ref}`);
}

export function voicePath(scene, dirs) {
  const ref = scene.narration?.audioFile || `voiceovers/${scene.id}.mp3`;
  try { return resolveAsset(ref, dirs); } catch { return null; }
}

// Word timings for the scene's voiceover, transcribing it once with tools/transcribe.mjs if needed.
function voiceWords(voice, { transcribe }) {
  const json = voice.replace(/\.[^.]+$/, '.json');
  if (!existsSync(json) && transcribe) {
    const r = spawnSync(process.execPath, [join(root, 'tools', 'transcribe.mjs'), voice], { encoding: 'utf8' });
    if (r.status !== 0) console.warn(`  captions: transcription failed, spacing words evenly (${(r.stderr || '').trim().split('\n').pop()})`);
  }
  if (!existsSync(json)) return null;
  return JSON.parse(readFileSync(json, 'utf8')).words;
}

/** Scene length: the script's Duration, stretched to fit the voiceover. */
export function sceneDuration(scene, voice) {
  const base = scene.duration || (scene.card ? 2.5 : 4);
  if (!voice) return base;
  return Math.max(base, VOICE_DELAY + probeDuration(voice) + 0.4);
}

function sceneHash(scene, dirs, quality, cast) {
  const h = createHash('sha1');
  h.update(JSON.stringify({ ENGINE_VERSION, scene, quality }));
  for (const c of scene.characters || []) {
    const sheet = sheetOrDefault(cast, c.name || c.id);
    h.update(JSON.stringify(sheet));
    for (const n of spriteNames(sheet)) h.update(`${n}:${statSync(join(spriteDir(sheet), `${n}.png`)).mtimeMs}`);
  }
  const voice = voicePath(scene, dirs);
  if (voice) h.update(readFileSync(voice));
  const bg = scene.background?.type === 'image' ? scene.background.asset : scene.location && locationImage(scene.location, scene.time, (r) => resolveAsset(r, dirs));
  if (bg) { try { h.update(readFileSync(resolveAsset(bg, dirs))); } catch {} }
  for (const s of scene.soundEffects || []) {
    try { h.update(readFileSync(resolveAsset(s.asset, dirs))); } catch {}
  }
  return h.digest('hex');
}

export async function renderScene(scene, project, dirs, { quality = 'preview', outputPath, transcribe = true, force = false } = {}) {
  registerFonts();
  const { width: w, height: h } = project.resolution;
  const fps = project.fps || 30;
  const cast = loadCast(dirs.root);

  const hashFile = `${outputPath}.hash`;
  const hash = sceneHash(scene, dirs, quality, cast);
  if (!force && existsSync(outputPath) && existsSync(hashFile) && readFileSync(hashFile, 'utf8') === hash) {
    return { outputPath, skipped: true, duration: probeDuration(outputPath) };
  }

  const voice = voicePath(scene, dirs);
  const duration = sceneDuration(scene, voice);
  const frames = Math.round(duration * fps);
  const words = voice ? voiceWords(voice, { transcribe }) : null;
  const captions = buildCaptions(scene.narration?.text, words, VOICE_DELAY, duration - VOICE_DELAY - 0.3);

  const backdrop = await buildBackdrop(scene, w, h, (ref) => resolveAsset(ref, dirs));
  const figureH = h * 0.24;
  const chars = (scene.characters || []).map((c) => ({
    char: c,
    sheet: sheetOrDefault(cast, c.name || c.id),
    actions: actionsFor(scene, c.id),
  }));
  const sprites = await preloadSprites(chars.map((c) => c.sheet));

  // Audio: voice, then SFX, then this scene's own music (episode music is mixed at assembly).
  const tracks = [];
  if (voice) tracks.push({ path: voice, start: VOICE_DELAY, volume: scene.narration?.volume ?? 1 });
  for (const s of scene.soundEffects || []) {
    try { tracks.push({ path: resolveAsset(s.asset, dirs), start: s.startTime || 0, volume: s.volume ?? 1 }); }
    catch { console.warn(`  missing sound effect: ${s.asset}`); }
  }
  if (scene.music?.asset) {
    try { tracks.push({ path: resolveAsset(scene.music.asset, dirs), volume: scene.music.volume ?? 0.3, fadeIn: 1, fadeOut: 1, loop: true }); }
    catch { console.warn(`  missing music: ${scene.music.asset}`); }
  }
  const audio = buildAudio(tracks, 1, duration);

  const q = quality === 'final' ? ['-preset', 'medium', '-crf', '18'] : ['-preset', 'veryfast', '-crf', '23'];
  mkdirSync(dirname(outputPath), { recursive: true });
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-r', String(fps), '-i', 'pipe:0',
    ...audio.inputs,
    '-filter_complex', audio.filter,
    '-map', '0:v', '-map', audio.label,
    '-c:v', 'libx264', ...q, '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', duration.toFixed(3), outputPath,
  ], { stdio: ['pipe', 'inherit', 'pipe'] });
  let stderr = '';
  ff.stderr.on('data', (d) => { stderr += d; });
  const exited = once(ff, 'close');

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const focusOf = (id) => {
    const c = chars.find((x) => x.char.id === id || x.char.name?.toLowerCase() === String(id).toLowerCase());
    return c ? characterAt(c.char, c.sheet, c.actions, 0, w) : null;
  };

  for (let f = 0; f < frames; f++) {
    const t = f / fps;
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    applyCamera(ctx, cameraAt(scene.camera || [], t, w, h, focusOf), w, h);
    ctx.drawImage(backdrop, 0, 0);

    const drawables = [];
    for (const p of scene.props || []) drawables.push({ y: p.y, draw: () => drawProp(ctx, p, t) });
    for (const c of chars) {
      const s = characterAt(c.char, c.sheet, c.actions, t, w);
      if (!s.visible) continue;
      drawables.push({
        y: s.y,
        draw: () => {
          const set = sprites.get(c.sheet.id);
          const { headTop } = set?.names.length
            ? drawSprite(ctx, c.sheet, set, { ...s, scale: c.char.scale }, figureH, t)
            : drawFigure(ctx, c.sheet, { ...s, scale: c.char.scale, holding: c.char.holding }, figureH);
          if (c.char.showName && s.appearedAt !== null && t - s.appearedAt < 2.5) {
            drawNameTag(ctx, c.sheet.name || c.char.name, s.x, headTop - 30, 1 - Math.max(0, t - s.appearedAt - 2) / 0.5);
          }
        },
      });
    }
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    if (scene.weather === 'rain') drawRain(ctx, w, h, t);
    ctx.restore();

    if (scene.card) drawCard(ctx, scene.card, t, w, h);
    else if (scene.day) drawDayBadge(ctx, scene.day, w);
    drawCaptions(ctx, captions, t, w, h, scene.card ? 0.72 : 0.3);
    drawOverlays(ctx, scene, t, duration, w, h);

    if (!ff.stdin.write(canvas.data())) await once(ff.stdin, 'drain');
  }
  ff.stdin.end();
  const [code] = await exited;
  if (code !== 0) throw new Error(`FFmpeg failed rendering ${scene.id}: ${stderr.trim().split('\n').slice(-3).join(' ')}`);

  writeFileSync(hashFile, hash);
  return { outputPath, skipped: false, duration };
}

function drawNameTag(ctx, name, x, y, alpha) {
  if (!name || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.font = `48px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#000';
  ctx.strokeText(name.toUpperCase(), x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name.toUpperCase(), x, y);
  ctx.restore();
}

/**
 * Render every scene (reusing unchanged ones), join them, and lay the episode music under the voice.
 * Returns the episode MP4 path inside renders/<quality>/.
 */
export async function renderEpisode(project, dirs, { quality = 'preview', transcribe = true, force = false, only } = {}) {
  const outDir = quality === 'final' ? dirs.final : dirs.preview;
  mkdirSync(outDir, { recursive: true });
  const clips = [];
  let total = 0;

  for (const id of project.scenes) {
    const scene = JSON.parse(readFileSync(join(dirs.scenes, `${id}.json`), 'utf8'));
    const outputPath = join(outDir, `${id}.mp4`);
    if (only && !only.includes(id) && existsSync(outputPath)) {
      clips.push(outputPath);
      total += probeDuration(outputPath);
      continue;
    }
    const r = await renderScene(scene, project, dirs, { quality, outputPath, transcribe, force: force || (only?.includes(id) ?? false) });
    console.log(`  ${id} ${r.skipped ? 'unchanged' : 'rendered'} (${r.duration.toFixed(1)}s)`);
    clips.push(outputPath);
    total += r.duration;
  }
  if (!clips.length) throw new Error('No scenes to render. Run import-script first.');

  const joined = join(outDir, '.joined.mp4');
  const list = join(outDir, '.concat.txt');
  writeFileSync(list, clips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  runFFmpeg(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined], { quiet: true });

  const final = join(outDir, `${project.id}-${quality}.mp4`);
  const musicRef = project.music?.asset;
  let music = null;
  if (musicRef) {
    try { music = resolveAsset(musicRef, dirs); } catch { console.warn(`  missing episode music: ${musicRef}`); }
  }
  if (!music) {
    copyFileSync(joined, final);
  } else {
    // Music loops under the episode, ducks while the voice plays, and fades out at the end.
    const vol = project.music.volume ?? 0.25;
    runFFmpeg([
      '-y', '-loglevel', 'error', '-i', joined, '-stream_loop', '-1', '-i', music,
      '-filter_complex',
      `[0:a]asplit=2[v1][v2];[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${vol},atrim=0:${total.toFixed(2)}[m];` +
      `[m][v1]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=500[md];` +
      `[v2][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.9:level=disabled,afade=t=out:st=${Math.max(0, total - 2).toFixed(2)}:d=2[aout]`,
      '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final,
    ], { quiet: true });
  }
  return { path: final, duration: total };
}
