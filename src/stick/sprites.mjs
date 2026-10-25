// Character sprites: static PNGs from Google Flow in shared-assets/cast/<character>/<pose>-<expression>.png
// (full body, facing right, on a plain white background). When a character has sprites, they replace
// the code-drawn figure; the white background is removed on load.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SHARED_CAST_DIR } from './cast.mjs';

export const EXPRESSIONS = ['neutral', 'happy', 'scared', 'worried', 'angry', 'sad', 'surprised', 'determined'];
// Expression a pose implies when the script doesn't give one.
const POSE_EXPRESSION = { scared: 'scared', run: 'scared', point: 'determined', look: 'worried', hurt: 'sad', cheer: 'happy', wave: 'happy', swing: 'determined', aim: 'determined', push: 'determined', fall: 'surprised' };
// Sprite height relative to a standing figure, for poses that are lower than standing.
const POSE_HEIGHT = { crouch: 0.62, sneak: 0.8, sit: 0.68, lie: 0.3, fall: 0.55, eat: 0.62 };

const cache = new Map();

export function spriteDir(sheet) {
  return join(SHARED_CAST_DIR, sheet.id);
}

/** Sprite file names (without .png) this character has, e.g. ["idle-neutral", "run-scared"]. */
export function spriteNames(sheet) {
  const dir = spriteDir(sheet);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
}

export function expressionFor(sheet, pose, expression) {
  if (sheet.zombie) return 'neutral';
  return expression || POSE_EXPRESSION[pose] || 'neutral';
}

/** Best available sprite for a pose/expression: exact, same pose neutral, same pose any face, then standing. */
export function pickSprite(sheet, pose, expression, names = spriteNames(sheet)) {
  const expr = expressionFor(sheet, pose, expression);
  const stand = sheet.zombie ? ['zidle', 'idle'] : ['idle'];
  const samePose = names.filter((n) => n.startsWith(`${pose}-`)).sort();
  const tries = [`${pose}-${expr}`, `${pose}-neutral`, ...samePose, ...stand.flatMap((p) => [`${p}-${expr}`, `${p}-neutral`])];
  const found = tries.find((n) => names.includes(n));
  return found ? { name: found, exact: found === tries[0], wanted: tries[0] } : { name: null, exact: false, wanted: tries[0] };
}

// Removes the white background (only white connected to the image edge, so eyes and shirts stay)
// and crops to the figure.
async function loadSprite(path) {
  const img = await loadImage(path);
  const { width: w, height: h } = img;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const white = (i) => px[i] > 225 && px[i + 1] > 225 && px[i + 2] > 225;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !white(p * 4)) continue;
    seen[p] = 1;
    px[p * 4 + 3] = 0;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  if (x1 < x0) return canvas;
  const out = createCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext('2d').drawImage(canvas, -x0, -y0);
  return out;
}

async function getSprite(sheet, name) {
  const path = join(spriteDir(sheet), `${name}.png`);
  const k = `${path}:${statSync(path).mtimeMs}`;
  if (!cache.has(k)) cache.set(k, await loadSprite(path));
  return cache.get(k);
}

/** Loads every sprite a scene's characters can use, keyed by character id. Empty for code-drawn characters. */
export async function preloadSprites(sheets) {
  const out = new Map();
  for (const sheet of sheets) {
    if (out.has(sheet.id)) continue;
    const names = spriteNames(sheet);
    const sprites = new Map();
    for (const n of names) sprites.set(n, await getSprite(sheet, n));
    out.set(sheet.id, { names, sprites });
  }
  return out;
}

/** Draws a sprite with its feet at (state.x, state.y). Returns { headTop } like drawFigure. */
export function drawSprite(ctx, sheet, set, state, baseHeight, t) {
  const pick = pickSprite(sheet, state.poseName, state.expression, set.names);
  const img = set.sprites.get(pick.name);
  const H = baseHeight * (sheet.height || 1) * (state.scale || 1) * (POSE_HEIGHT[state.poseName] || 1);
  const W = img.width * (H / img.height);
  const moving = ['walk', 'run', 'shamble', 'sneak'].includes(state.poseName);
  const speed = state.poseName === 'run' ? 9 : 5;
  const bob = moving ? Math.abs(Math.sin(t * speed)) * H * 0.03 : 0;

  ctx.save();
  ctx.globalAlpha = state.alpha ?? 1;
  ctx.translate(state.x, state.y - bob);
  if (moving) ctx.rotate(Math.sin(t * speed) * 0.03);
  if (state.facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, -W / 2, -H, W, H);
  ctx.restore();
  return { headTop: state.y - H - bob };
}
