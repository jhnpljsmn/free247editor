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

const FRINGE = 3; // px around the figure where white is blended out instead of cut

// Pixels of one white region, flood-filled from the seed pixels.
function fill(px, w, h, seeds, isWhite, mark, seen) {
  const stack = [...seeds];
  let area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !isWhite(p * 4)) continue;
    seen[p] = mark;
    area++;
    const x = p % w, y = (p - x) / w;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
  return { area, box: [x0, y0, x1, y1] };
}

/**
 * Makes a figure on white transparent: removes the white connected to the image edge (eyes and
 * other white inside the outline stay), blends the anti-aliased edge so no white halo is left, and
 * crops to the figure. `clear` lists extra points inside closed white gaps to remove too (e.g. the
 * gap between an arm on the hip and the body). Returns { canvas, holes }, where holes are the
 * remaining enclosed white areas bigger than eyes, for checking.
 */
export function cutOut(source, { rect, clear = [], minHole = 600 } = {}) {
  const [sx, sy, w, h] = rect || [0, 0, source.width, source.height];
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, -sx, -sy);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const isWhite = (i) => px[i + 3] < 10 || (px[i] > 215 && px[i + 1] > 215 && px[i + 2] > 215);
  const bg = new Uint8Array(w * h);
  const border = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  fill(px, w, h, border, isWhite, 1, bg);
  for (const [cx, cy] of clear) fill(px, w, h, [Math.round(cy - sy) * w + Math.round(cx - sx)], isWhite, 1, bg);

  // Distance (up to FRINGE) from the background, for blending the edge.
  const dist = new Uint8Array(w * h).fill(255);
  let edge = [];
  for (let p = 0; p < w * h; p++) if (bg[p]) { dist[p] = 0; edge.push(p); }
  for (let d = 1; d <= FRINGE; d++) {
    const next = [];
    for (const p of edge) {
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < w * h && dist[q] > d) { dist[q] = d; next.push(q); }
      }
    }
    edge = next;
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (bg[p]) { px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0; continue; }
    if (dist[p] > FRINGE) continue;
    // Color-to-alpha against white: the lightest a pixel could be is its blend with white.
    const a = Math.max(255 - px[i], 255 - px[i + 1], 255 - px[i + 2]) / 255;
    if (a <= 0.02) { px[i + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) px[i + c] = Math.max(0, Math.min(255, Math.round(255 - (255 - px[i + c]) / a)));
    px[i + 3] = Math.round(px[i + 3] * a);
  }

  const holes = [];
  const seen = new Uint8Array(w * h);
  const pure = (i) => px[i + 3] > 200 && px[i] > 235 && px[i + 1] > 235 && px[i + 2] > 235;
  for (let p = 0; p < w * h; p++) {
    if (bg[p] || seen[p] || !pure(p * 4)) continue;
    const r = fill(px, w, h, [p], pure, 1, seen);
    if (r.area > minHole) holes.push({ area: r.area, box: [r.box[0] + sx, r.box[1] + sy, r.box[2] + sx, r.box[3] + sy] });
  }

  // Drop stray specks (a few pixels not touching the figure), e.g. bits of a neighbouring drawing.
  const solid = (i) => px[i + 3] > 0;
  const blob = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (blob[p] || !solid(p * 4)) continue;
    const r = fill(px, w, h, [p], solid, 1, blob);
    if (r.area < 80) {
      const [bx0, by0, bx1, by1] = r.box;
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (blob[y * w + x]) px[(y * w + x) * 4 + 3] = 0;
    }
  }

  ctx.putImageData(data, 0, 0);
  return { canvas: cropToFigure(canvas), holes };
}

function cropToFigure(canvas) {
  const { width: w, height: h } = canvas;
  const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
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
  if (x1 < x0) return canvas;
  const out = createCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext('2d').drawImage(canvas, -x0, -y0);
  return out;
}

async function loadSprite(path) {
  return cutOut(await loadImage(path)).canvas;
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
