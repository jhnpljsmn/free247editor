// Visual character worksheet: every cast member in a row of poses, saved as one PNG.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { drawFigure, evalPose } from './figure.mjs';
import { loadCast, uniqueSheets, SHARED_CAST_DIR } from './cast.mjs';
import { FONT, registerFonts } from './text.mjs';

const PERSON_POSES = ['idle', 'walk', 'run', 'crouch', 'scared', 'swing'];
const ZOMBIE_POSES = ['zidle', 'shamble', 'run', 'eat', 'swing', 'lie'];

export function renderCastSheet(outPath = join(SHARED_CAST_DIR, 'cast-sheet.png'), projectRoot) {
  registerFonts();
  const sheets = uniqueSheets(loadCast(projectRoot));
  const cellW = 300, rowH = 420, labelW = 360;
  const W = labelW + cellW * PERSON_POSES.length, Hh = 120 + rowH * sheets.length;
  const canvas = createCanvas(W, Hh);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#20232b';
  ctx.fillRect(0, 0, W, Hh);
  ctx.fillStyle = '#f5f5f5';
  ctx.font = `64px ${FONT}`;
  ctx.fillText('CAST SHEET', 30, 85);

  sheets.forEach((sheet, row) => {
    const y0 = 120 + row * rowH;
    ctx.fillStyle = row % 2 ? '#262a33' : '#2c303a';
    ctx.fillRect(0, y0, W, rowH);
    ctx.fillStyle = '#3a3f4b';
    ctx.fillRect(labelW, y0 + rowH - 60, W - labelW, 4);

    ctx.fillStyle = sheet.zombie ? '#a7d37c' : '#ffffff';
    ctx.font = `52px ${FONT}`;
    ctx.fillText((sheet.name || sheet.id).toUpperCase(), 30, y0 + 80);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#c9ccd3';
    wrap(ctx, sheet.role || '', 30, y0 + 125, labelW - 50, 30);

    const poses = sheet.zombie ? ZOMBIE_POSES : PERSON_POSES;
    poses.forEach((p, col) => {
      const x = labelW + col * cellW + cellW / 2;
      drawFigure(ctx, sheet, { x, y: y0 + rowH - 60, facing: 1, poseName: p, angles: evalPose(p, 0.3, 0.3) }, 300);
      ctx.fillStyle = '#9aa0ab';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p, x, y0 + rowH - 20);
      ctx.textAlign = 'left';
    });
  });

  writeFileSync(outPath, canvas.toBuffer('image/png'));
  return outPath;
}

function wrap(ctx, text, x, y, maxW, lineH) {
  let lineText = '';
  for (const word of text.split(/\s+/)) {
    const test = lineText ? `${lineText} ${word}` : word;
    if (ctx.measureText(test).width > maxW && lineText) {
      ctx.fillText(lineText, x, y);
      lineText = word;
      y += lineH;
    } else lineText = test;
  }
  if (lineText) ctx.fillText(lineText, x, y);
}
