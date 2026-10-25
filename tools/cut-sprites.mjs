#!/usr/bin/env node
// Cuts character sprites out of a worksheet image into shared-assets/cast/<character>/ as transparent PNGs.
//
//   node tools/cut-sprites.mjs <worksheet> --find <y0>:<y1>
//       lists the figures found in that horizontal band (x0,y0,x1,y1 boxes)
//   node tools/cut-sprites.mjs <worksheet> <character> <pose-expression>=<x0>,<y0>,<x1>,<y1>[@<x>,<y>...] ...
//       cuts each box; each @x,y is a point inside a closed white gap to remove (e.g. arm on hip).
//       A name without a box uses the whole image (for a single Google Flow image).
//   --holes <px> reports smaller white gaps too (default 600; eye whites are about 300–600).
import { loadImage, createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutOut } from '../src/stick/sprites.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [sheetPath, ...args] = process.argv.slice(2);
if (!sheetPath || !args.length) {
  console.error('Usage: node tools/cut-sprites.mjs <worksheet> --find <y0>:<y1>\n       node tools/cut-sprites.mjs <worksheet> <character> <name>=x0,y0,x1,y1[@x,y] ...');
  process.exit(1);
}
const img = await loadImage(sheetPath);

if (args[0] === '--find') {
  const [y0, y1] = args[1].split(':').map(Number);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, img.width, img.height).data;
  const ink = (x, y) => { const i = (y * img.width + x) * 4; return Math.min(px[i], px[i + 1], px[i + 2]) < 200; };
  let start = -1;
  for (let x = 0; x <= img.width; x++) {
    let col = false;
    for (let y = y0; x < img.width && y < y1 && !col; y++) col = ink(x, y);
    if (col && start < 0) start = x;
    if (!col && start >= 0) {
      if (x - start > 30) {
        let top = y1, bot = y0;
        for (let y = y0; y < y1; y++) for (let xx = start; xx < x; xx++) if (ink(xx, y)) { top = Math.min(top, y); bot = Math.max(bot, y); }
        console.log(`${start},${top},${x - 1},${bot}`);
      }
      start = -1;
    }
  }
  process.exit(0);
}

const minHole = args.includes('--holes') ? Number(args.splice(args.indexOf('--holes'), 2)[1]) : undefined;
const [character, ...cuts] = args;
const out = join(root, 'shared-assets', 'cast', character);
mkdirSync(out, { recursive: true });
for (const cut of cuts) {
  const [name, spec = `0,0,${img.width - 1},${img.height - 1}`] = cut.split('=');
  const [box, ...points] = spec.split('@');
  const [x0, y0, x1, y1] = box.split(',').map(Number);
  const pad = 4;
  const rect = [x0 - pad, y0 - pad, x1 - x0 + 1 + pad * 2, y1 - y0 + 1 + pad * 2];
  const { canvas, holes } = cutOut(img, { rect, minHole, clear: points.map((p) => p.split(',').map(Number)) });
  writeFileSync(join(out, `${name}.png`), canvas.toBuffer('image/png'));
  const note = holes.length ? `  white gaps left (check): ${holes.map((h) => `${h.area}px @ ${h.box.join(',')}`).join('; ')}` : '';
  console.log(`${name}.png ${canvas.width}x${canvas.height}${note}`);
}
