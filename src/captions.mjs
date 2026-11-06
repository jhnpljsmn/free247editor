// Word-by-word captions drawn on the canvas, timed from the narration transcript.
import { GlobalFonts } from '@napi-rs/canvas';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONT = 'Anton';
const MAX_WORDS = 3;

let registered = false;
export function registerFonts() {
  if (registered) return;
  GlobalFonts.registerFromPath(join(root, 'shared-assets', 'fonts', 'Anton-Regular.ttf'), FONT);
  registered = true;
}

/** Group timed words [{ text, start, end }] into short chunks, breaking after punctuation or long pauses. */
export function buildCaptions(timed) {
  const chunks = [];
  let cur = [];
  for (let i = 0; i < timed.length; i++) {
    cur.push(timed[i]);
    const next = timed[i + 1];
    const endsPhrase = /[.,!?;:]$/.test(timed[i].text);
    const pause = next && next.start - timed[i].end > 0.35;
    if (cur.length >= MAX_WORDS || endsPhrase || pause || !next) {
      chunks.push({ words: cur, start: cur[0].start, end: next ? Math.min(next.start, cur[cur.length - 1].end + 0.6) : cur[cur.length - 1].end + 0.6 });
      cur = [];
    }
  }
  return chunks;
}

function fitFont(ctx, text, maxW, size) {
  ctx.font = `${size}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  return tw > maxW ? Math.floor(size * maxW / tw) : size;
}

export function drawCaptions(ctx, chunks, t, w, h, yFrac) {
  const chunk = chunks.find((c) => t >= c.start && t < c.end);
  if (!chunk) return;
  const words = chunk.words.map((x) => x.text.toUpperCase());
  const size = fitFont(ctx, words.join(' '), w * 0.88, 84);
  ctx.font = `${size}px ${FONT}`;
  const space = ctx.measureText(' ').width;
  const widths = words.map((x) => ctx.measureText(x).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let x = (w - total) / 2;
  const y = h * yFrac;
  const pop = Math.min(1, (t - chunk.start) / 0.12);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.globalAlpha = pop;
  words.forEach((word, i) => {
    const spoken = t >= chunk.words[i].start;
    const current = spoken && (i === words.length - 1 || t < chunk.words[i + 1].start);
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = '#000';
    ctx.strokeText(word, x, y);
    ctx.fillStyle = current ? '#ffd43b' : spoken ? '#ffffff' : 'rgba(255,255,255,0.55)';
    ctx.fillText(word, x, y);
    x += widths[i] + space;
  });
  ctx.restore();
}
