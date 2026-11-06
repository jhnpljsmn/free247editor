// Episode assembly: one still per scene with a slow camera move, one narration MP3, word-by-word captions.
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { registerFonts, buildCaptions, drawCaptions } from './captions.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 30;
const FADE = 0.4; // crossfade between scenes, seconds
const TAIL = 0.6; // hold on the last image after the narration ends
const CAMERAS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down', 'still'];

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 });

export function probeDuration(path) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]);
  const d = Number(r.stdout);
  if (r.status !== 0 || !Number.isFinite(d)) throw new Error(`Could not read duration of ${path}`);
  return d;
}

/** Read production/scenes.md: "## Scene 01: Title" blocks with "Camera:" and "Narration:" lines. */
export function parseScenes(path) {
  return readFileSync(path, 'utf8').split(/^## /m).slice(1).map((block) => {
    const m = block.split('\n')[0].match(/^Scene\s+(\d+)\s*[:\-–—]?\s*(.*)/i);
    if (!m) return null;
    const field = (name) => (block.match(new RegExp(`^\\**${name}:?\\**:?\\s*(.+)$`, 'mi')) || [])[1]?.trim() || '';
    return {
      id: `scene-${m[1].padStart(2, '0')}`,
      title: m[2].trim(),
      camera: field('Camera').toLowerCase().split(/\s/)[0] || 'zoom-in',
      narration: field('Narration').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim(),
    };
  }).filter(Boolean);
}

export function sceneImage(dir, id) {
  for (const ext of ['jpg', 'jpeg', 'png', 'JPG', 'JPEG', 'PNG']) {
    const p = join(dir, 'scenes', `${id}.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

function transcribe(mp3) {
  const json = mp3.replace(/\.mp3$/i, '.json');
  if (!existsSync(json) || statSync(json).mtimeMs < statSync(mp3).mtimeMs) {
    const r = run(process.execPath, [join(root, 'tools', 'transcribe.mjs'), mp3]);
    if (r.status !== 0) throw new Error(`Transcription failed: ${(r.stderr || r.stdout).trim()}`);
  }
  return JSON.parse(readFileSync(json, 'utf8')).words;
}

const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Give every script word a time by aligning it to the transcript (edit distance), filling gaps evenly. */
function alignWords(script, heard, duration) {
  const a = script.map(norm), b = heard.map((w) => norm(w.text));
  const n = a.length, m = b.length, W = m + 1;
  const D = new Uint32Array((n + 1) * W);
  for (let i = 0; i <= n; i++) D[i * W] = i;
  for (let j = 0; j <= m; j++) D[j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      D[i * W + j] = Math.min(D[(i - 1) * W + j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), D[(i - 1) * W + j] + 1, D[i * W + j - 1] + 1);
    }
  }
  const times = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 && j > 0;) {
    const same = a[i - 1] === b[j - 1];
    if (D[i * W + j] === D[(i - 1) * W + j - 1] + (same ? 0 : 1)) {
      times[i - 1] = { start: heard[j - 1].start, end: heard[j - 1].end, matched: same };
      i--; j--;
    } else if (D[i * W + j] === D[(i - 1) * W + j] + 1) i--;
    else j--;
  }
  for (let i = 0; i < n;) {
    if (times[i]) { i++; continue; }
    let k = i;
    while (k < n && !times[k]) k++;
    const from = i ? times[i - 1].end : 0;
    const to = k < n ? times[k].start : duration;
    const per = Math.max(0, to - from) / (k - i);
    for (let x = i; x < k; x++) times[x] = { start: from + (x - i) * per, end: from + (x - i + 1) * per, matched: false };
    i = k;
  }
  return times;
}

/** Image rectangle for a camera move at progress p (0..1), cover-fitted to w×h. */
function frameRect(img, camera, p, w, h) {
  const cover = Math.max(w / img.width, h / img.height);
  const zoom = camera === 'zoom-in' ? 1 + 0.12 * p : camera === 'zoom-out' ? 1.12 - 0.12 * p : camera === 'still' ? 1 : 1.12;
  const dw = img.width * cover * zoom, dh = img.height * cover * zoom;
  const ox = dw - w, oy = dh - h; // overflow to pan across
  let x = -ox / 2, y = -oy / 2;
  if (camera === 'pan-left') x = -ox * p;
  if (camera === 'pan-right') x = -ox * (1 - p);
  if (camera === 'pan-up') y = -oy * p;
  if (camera === 'pan-down') y = -oy * (1 - p);
  return [x, y, dw, dh];
}

export function validateVideo(path, expected, width, height) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', path]);
  if (r.status !== 0) return [`could not read ${path}`];
  const info = JSON.parse(r.stdout);
  const problems = [];
  const video = info.streams.find((s) => s.codec_type === 'video');
  if (!video) problems.push('no video stream');
  else if (video.width !== width || video.height !== height) problems.push(`video is ${video.width}x${video.height}, expected ${width}x${height}`);
  if (!info.streams.some((s) => s.codec_type === 'audio')) problems.push('no audio stream');
  const d = parseFloat(info.format?.duration);
  if (!(Math.abs(d - expected) < 1)) problems.push(`video is ${d.toFixed(1)}s, expected ${expected.toFixed(1)}s`);
  return problems;
}

/** List what's missing before assembling. Returns { scenes, problems }. */
export function checkEpisode(dir) {
  const problems = [];
  const scenesFile = join(dir, 'production', 'scenes.md');
  if (!existsSync(scenesFile)) return { scenes: [], problems: ['missing production/scenes.md'] };
  const scenes = parseScenes(scenesFile);
  if (!scenes.length) problems.push('no "## Scene NN" blocks in production/scenes.md');
  for (const s of scenes) {
    if (!sceneImage(dir, s.id)) problems.push(`missing scenes/${s.id}.jpg`);
    if (!s.narration) problems.push(`${s.id} has no Narration line`);
    if (!CAMERAS.includes(s.camera)) problems.push(`${s.id}: unknown camera "${s.camera}" (use ${CAMERAS.join(', ')})`);
  }
  if (!existsSync(join(dir, 'voiceover.mp3'))) problems.push('missing voiceover.mp3');
  return { scenes, problems };
}

export async function assembleEpisode(ep, { wide = false, quality = 'preview' } = {}) {
  const dir = join(root, 'projects', ep);
  const { scenes, problems } = checkEpisode(dir);
  if (problems.length) throw new Error(`Not ready:\n  ${problems.join('\n  ')}`);
  const [w, h] = wide ? [1920, 1080] : [1080, 1920];
  const mp3 = join(dir, 'voiceover.mp3');
  const audioDur = probeDuration(mp3);
  const duration = audioDur + TAIL;

  // Time every script word from the transcript, then cut between scenes in the pause before each scene's first word.
  const words = scenes.flatMap((s, si) => s.narration.split(/\s+/).map((text) => ({ text, si })));
  const times = alignWords(words.map((x) => x.text), transcribe(mp3), audioDur);
  const timed = words.map((x, i) => ({ ...x, ...times[i] }));
  const matched = timed.filter((x) => x.matched).length / timed.length;
  const cuts = scenes.map((_, si) => {
    if (!si) return 0;
    const first = timed.findIndex((x) => x.si === si);
    const prevEnd = timed[first - 1].end, start = timed[first].start;
    return Math.max((prevEnd + start) / 2, start - 0.4);
  });
  cuts.push(duration);
  const captions = buildCaptions(timed);

  const images = [];
  for (const s of scenes) {
    const img = await loadImage(readFileSync(sceneImage(dir, s.id)));
    const ratio = (img.width / img.height) / (w / h);
    if (ratio > 1.25 || ratio < 0.8) console.warn(`  ${s.id}: image is ${img.width}x${img.height}, so much of it is cropped for ${w}x${h}`);
    images.push(img);
  }

  const outbox = join(root, 'outbox');
  mkdirSync(outbox, { recursive: true });
  const tag = wide ? '-wide' : '';
  let outputPath;
  if (quality === 'final') outputPath = join(outbox, `${ep}${tag}-final.mp4`);
  else {
    let v = 1;
    while (existsSync(join(outbox, `${ep}${tag}-v${v}.mp4`))) v++;
    outputPath = join(outbox, `${ep}${tag}-v${v}.mp4`);
  }

  const q = quality === 'final' ? ['-preset', 'medium', '-crf', '18'] : ['-preset', 'veryfast', '-crf', '23'];
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-r', String(FPS), '-i', 'pipe:0',
    '-i', mp3,
    '-map', '0:v', '-map', '1:a', '-af', 'apad',
    '-c:v', 'libx264', ...q, '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', duration.toFixed(3), '-movflags', '+faststart', outputPath,
  ], { stdio: ['pipe', 'inherit', 'pipe'] });
  let stderr = '';
  ff.stderr.on('data', (d) => { stderr += d; });
  const exited = once(ff, 'close');

  registerFonts();
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const frames = Math.ceil(duration * FPS);
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    scenes.forEach((s, k) => {
      const a = cuts[k] - FADE / 2, b = cuts[k + 1] + FADE / 2;
      if (t < a || t > b) return;
      ctx.globalAlpha = k ? Math.min(1, (t - a) / FADE) : 1;
      ctx.drawImage(images[k], ...frameRect(images[k], s.camera, (t - a) / (b - a), w, h));
    });
    ctx.globalAlpha = 1;
    drawCaptions(ctx, captions, t, w, h, wide ? 0.85 : 0.76);
    if (!ff.stdin.write(canvas.data())) await once(ff.stdin, 'drain');
    if (f % (FPS * 10) === 0) process.stdout.write(`\r  ${Math.round(t)}s / ${Math.round(duration)}s`);
  }
  ff.stdin.end();
  const [code] = await exited;
  process.stdout.write('\n');
  if (code !== 0) throw new Error(`FFmpeg failed: ${stderr.trim().split('\n').slice(-3).join(' ')}`);

  return {
    outputPath,
    duration,
    matched,
    cuts: scenes.map((s, k) => ({ id: s.id, start: cuts[k], end: cuts[k + 1] })),
    problems: validateVideo(outputPath, duration, w, h),
  };
}
