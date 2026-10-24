// Word-by-word captions drawn on the canvas, timed from a transcript of the scene's voiceover.
import { FONT } from './text.mjs';
import { fitFont } from './effects.mjs';

const MAX_WORDS = 3;

/**
 * Build caption chunks from script text and optional word timings.
 * words: [{ text, start, end }] from tools/transcribe.mjs (times relative to the voiceover).
 * offset: when the voiceover starts in the scene. span: fallback length when there are no timings.
 */
export function buildCaptions(text, words, offset, span) {
  const scriptWords = (text || '').split(/\s+/).filter(Boolean);
  let timed;
  if (words?.length) {
    // Prefer the script's spelling when the transcript has the same number of words.
    const useScript = scriptWords.length === words.length;
    timed = words.map((w, i) => ({ text: useScript ? scriptWords[i] : w.text, start: w.start + offset, end: w.end + offset }));
  } else {
    if (!scriptWords.length) return [];
    const per = span / scriptWords.length;
    timed = scriptWords.map((w, i) => ({ text: w, start: offset + i * per, end: offset + (i + 1) * per }));
  }

  // Group into short chunks, breaking after punctuation or long pauses.
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

export function drawCaptions(ctx, chunks, t, w, h, yFrac = 0.3) {
  const chunk = chunks.find((c) => t >= c.start && t < c.end);
  if (!chunk) return;
  const words = chunk.words.map((x) => x.text.toUpperCase());
  const size = fitFont(ctx, words.join(' '), w * 0.88, 104);
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
