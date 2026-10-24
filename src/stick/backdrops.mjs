// Code-drawn backdrops. Static layers are drawn once per scene onto an offscreen canvas;
// rain is drawn per frame. Seeded randomness keeps every location identical across episodes.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { FONT } from './text.mjs';

export const GROUND = 0.78; // ground line as a fraction of height

export const LOCATIONS = ['street', 'alley', 'house', 'rooftop', 'store', 'mall', 'highway', 'bridge', 'hospital', 'evac', 'outskirts', 'black'];
const ALIASES = {
  road: 'street', city: 'street', 'manila-street': 'street', home: 'house', room: 'house', apartment: 'house', interior: 'house',
  roof: 'rooftop', 'sari-sari': 'store', 'sari-sari-store': 'store', shop: 'store', 'mall-interior': 'mall',
  expressway: 'highway', flyover: 'highway', river: 'bridge', 'evacuation-center': 'evac', gym: 'evac', school: 'evac',
  'covered-court': 'evac', field: 'outskirts', province: 'outskirts', forest: 'outskirts', dark: 'black', none: 'black',
};
export const TIMES = ['dawn', 'day', 'dusk', 'night'];

export function normalizeLocation(name) {
  const k = (name || 'street').toLowerCase().trim().replace(/\s+/g, '-');
  return LOCATIONS.includes(k) ? k : ALIASES[k] || null;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = {
  dawn: { sky: ['#3d3b6b', '#f4a26b'], far: '#4b4368', mid: '#5a4f6e', ground: '#4a4552', lit: 0.15, dark: 0.1, sun: '#ffd29a' },
  day: { sky: ['#5eb4f0', '#cdeafc'], far: '#9db3c7', mid: '#7f8fa3', ground: '#7a7a80', lit: 0.0, dark: 0, sun: '#fff6c9' },
  dusk: { sky: ['#2a1f4a', '#ff8152'], far: '#3d2c4f', mid: '#4a3550', ground: '#3f3640', lit: 0.35, dark: 0.15, sun: '#ffb36b' },
  night: { sky: ['#060a1c', '#1b2848'], far: '#141b33', mid: '#1d2540', ground: '#24252e', lit: 0.45, dark: 0.35, sun: null },
};

function sky(ctx, w, h, pal, time, r, horizon = h * GROUND) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, pal.sky[0]);
  g.addColorStop(1, pal.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon);
  if (time === 'night') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 70; i++) ctx.fillRect(r() * w, r() * horizon * 0.6, 2, 2);
    ctx.fillStyle = '#f2efd9';
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.1, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.sky[0];
    ctx.beginPath();
    ctx.arc(w * 0.76, h * 0.095, w * 0.055, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.sun) {
    ctx.fillStyle = pal.sun;
    ctx.beginPath();
    ctx.arc(w * 0.22, time === 'day' ? h * 0.1 : horizon * 0.62, w * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

function skyline(ctx, r, w, base, minH, maxH, color, pal, windows) {
  let x = -20;
  while (x < w) {
    const bw = 70 + r() * 150, bh = minH + r() * (maxH - minH);
    ctx.fillStyle = color;
    ctx.fillRect(x, base - bh, bw, bh);
    if (r() < 0.25) ctx.fillRect(x + bw * 0.4, base - bh - 40, 6, 40);
    if (windows) {
      for (let wy = base - bh + 18; wy < base - 30; wy += 34) {
        for (let wx = x + 12; wx < x + bw - 18; wx += 26) {
          const lit = r() < pal.lit;
          ctx.fillStyle = lit ? 'rgba(255,214,120,0.85)' : 'rgba(0,0,0,0.22)';
          ctx.fillRect(wx, wy, 12, 18);
        }
      }
    }
    x += bw + 6 + r() * 20;
  }
}

function powerLines(ctx, w, G, pal) {
  ctx.strokeStyle = '#151515';
  ctx.lineWidth = 12;
  const poles = [w * 0.12, w * 0.88];
  for (const px of poles) {
    ctx.beginPath();
    ctx.moveTo(px, G + 10);
    ctx.lineTo(px, G - 620);
    ctx.stroke();
    ctx.fillStyle = '#151515';
    ctx.fillRect(px - 70, G - 600, 140, 12);
  }
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const y = G - 594 + (i % 2) * 2;
    ctx.beginPath();
    ctx.moveTo(-20, y + 60);
    ctx.quadraticCurveTo(poles[0] - 60, y + 90, poles[0] - 60 + i * 40, y);
    ctx.quadraticCurveTo(w / 2, y + 90 + i * 12, poles[1] - 60 + i * 40, y);
    ctx.quadraticCurveTo(w, y + 70, w + 20, y + 60);
    ctx.stroke();
  }
}

function lampPost(ctx, x, G, time) {
  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(x - 7, G - 520, 14, 520);
  ctx.fillRect(x - 7, G - 520, 80, 12);
  if (time === 'night' || time === 'dusk') {
    const g = ctx.createRadialGradient(x + 70, G - 505, 5, x + 70, G - 505, 320);
    g.addColorStop(0, 'rgba(255,220,140,0.55)');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 260, G - 830, 660, 860);
  }
  ctx.fillStyle = time === 'day' ? '#ccc' : '#ffe2a0';
  ctx.fillRect(x + 50, G - 510, 40, 14);
}

function floor(ctx, w, h, G, color, lines) {
  ctx.fillStyle = color;
  ctx.fillRect(0, G, w, h - G);
  if (lines) {
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    for (let y = G + 40; y < h; y += 70) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
}

function sign(ctx, text, x, y, wpx, hpx, bg, fg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, wpx, hpx);
  ctx.fillStyle = fg;
  ctx.font = `${Math.round(hpx * 0.7)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + wpx / 2, y + hpx / 2 + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

const DRAW = {
  black(ctx, w, h) {
    ctx.fillStyle = '#0b0b0f';
    ctx.fillRect(0, 0, w, h);
  },

  street(ctx, w, h, G, pal, time, r) {
    sky(ctx, w, h, pal, time, r);
    skyline(ctx, r, w, G - 120, 300, 800, pal.far, pal, false);
    skyline(ctx, r, w, G - 60, 220, 520, pal.mid, pal, true);
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(0, G - 60, w, 60);
    floor(ctx, w, h, G, pal.ground);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let x = 20; x < w; x += 200) ctx.fillRect(x, G + (h - G) * 0.55, 110, 14);
    powerLines(ctx, w, G, pal);
    lampPost(ctx, w * 0.62, G - 50, time);
  },

  alley(ctx, w, h, G, pal, time, r) {
    sky(ctx, w, h, pal, time, r, h * 0.3);
    ctx.fillStyle = pal.mid;
    ctx.fillRect(0, h * 0.22, w, G - h * 0.22);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    for (let y = h * 0.22; y < G; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      const off = (Math.round(y / 36) % 2) * 45;
      for (let x = off; x < w; x += 90) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 36);
        ctx.stroke();
      }
    }
    ctx.font = `150px ${FONT}`;
    ctx.fillStyle = 'rgba(200,40,40,0.75)';
    ctx.save();
    ctx.translate(w * 0.12, G - 480);
    ctx.rotate(-0.08);
    ctx.fillText('TULONG!', 0, 0);
    ctx.restore();
    ctx.fillStyle = '#2f3138';
    ctx.fillRect(w * 0.85, h * 0.22, 26, G - h * 0.22);
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.3);
    ctx.quadraticCurveTo(w / 2, h * 0.36, w, h * 0.3);
    ctx.stroke();
    const shirts = ['#d35400', '#2980b9', '#ecf0f1', '#8e44ad', '#27ae60'];
    for (let i = 0; i < 5; i++) {
      const x = w * (0.15 + i * 0.17), y = h * 0.3 + Math.sin((i + 0.5) / 5 * Math.PI) * h * 0.06 - 6;
      ctx.fillStyle = shirts[i];
      ctx.fillRect(x - 35, y, 70, 80);
    }
    floor(ctx, w, h, G, pal.ground);
    for (const bx of [w * 0.7, w * 0.78]) {
      ctx.fillStyle = '#2d5a3d';
      ctx.fillRect(bx, G - 130, 90, 130);
      ctx.fillStyle = '#244a32';
      ctx.fillRect(bx - 6, G - 140, 102, 18);
    }
  },

  house(ctx, w, h, G, pal, time, r) {
    ctx.fillStyle = time === 'night' ? '#4a3f36' : '#c9b79c';
    ctx.fillRect(0, 0, w, G);
    const wx = w * 0.12, wy = h * 0.28, ww = w * 0.42, wh = h * 0.2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();
    ctx.translate(wx, wy);
    sky(ctx, ww, wh * 1.3, pal, time, r, wh);
    skyline(ctx, r, ww, wh, 60, 200, pal.mid, pal, true);
    ctx.restore();
    ctx.strokeStyle = '#3b2a1c';
    ctx.lineWidth = 16;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.stroke();
    ctx.fillStyle = '#5a3d26';
    ctx.fillRect(w * 0.7, G - 560, 220, 560);
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(w * 0.7 + 190, G - 280, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(w * 0.62, h * 0.2, 120, 90);
    ctx.fillStyle = '#d9c7a8';
    ctx.fillRect(w * 0.62 + 12, h * 0.2 + 12, 96, 66);
    floor(ctx, w, h, G, '#6b4a2e', true);
  },

  rooftop(ctx, w, h, G, pal, time, r) {
    sky(ctx, w, h, pal, time, r);
    skyline(ctx, r, w, G - 40, 120, 520, pal.far, pal, true);
    floor(ctx, w, h, G, '#5b5b62');
    ctx.fillStyle = '#4a4a50';
    ctx.fillRect(0, G - 40, w, 60);
    ctx.fillStyle = '#2b5f8a';
    ctx.fillRect(w * 0.7, G - 470, 230, 240);
    ctx.fillStyle = '#1e1e1e';
    for (const lx of [w * 0.72, w * 0.89]) ctx.fillRect(lx, G - 240, 14, 200);
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(w * 0.18, G - 560, 8, 520);
  },

  store(ctx, w, h, G, pal, time, r) {
    DRAW.street(ctx, w, h, G, pal, time, r);
    ctx.fillStyle = '#d9c38c';
    ctx.fillRect(w * 0.08, G - 820, w * 0.84, 760);
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(w * 0.15, G - 600, w * 0.7, 420);
    const colors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e67e22', '#ecf0f1'];
    for (let row = 0; row < 3; row++) {
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(w * 0.15, G - 470 + row * 130, w * 0.7, 10);
      for (let x = w * 0.17; x < w * 0.83; x += 46) {
        ctx.fillStyle = colors[Math.floor(r() * colors.length)];
        ctx.fillRect(x, G - 540 + row * 130, 34, 70 - r() * 20);
      }
    }
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 6;
    for (let x = w * 0.15; x <= w * 0.85; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, G - 600);
      ctx.lineTo(x, G - 180);
      ctx.stroke();
    }
    sign(ctx, "LOLA CORA'S SARI-SARI STORE", w * 0.1, G - 790, w * 0.8, 120, '#c0392b', '#fff4d6');
    ctx.fillStyle = '#6b4a2e';
    ctx.fillRect(w * 0.12, G - 180, w * 0.76, 40);
  },

  mall(ctx, w, h, G, pal, time, r) {
    ctx.fillStyle = time === 'night' ? '#2c2f38' : '#d8d4cc';
    ctx.fillRect(0, 0, w, G);
    ctx.fillStyle = time === 'night' ? '#3a3e48' : '#bdb7ad';
    ctx.fillRect(0, h * 0.3, w, 30);
    ctx.fillRect(0, h * 0.3 + 30, w, 8);
    const names = ['SALE', 'SHOES', 'CAFE', 'PHONES'];
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * (w - 80) / 4, sw = (w - 80) / 4 - 30;
      ctx.fillStyle = 'rgba(140,190,210,0.35)';
      ctx.fillRect(x, G - 520, sw, 520);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 6;
      ctx.strokeRect(x, G - 520, sw, 520);
      sign(ctx, names[i], x, G - 600, sw, 60, '#34495e', '#ecf0f1');
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 4;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.1);
      ctx.lineTo(x, h * 0.3);
      ctx.stroke();
    }
    floor(ctx, w, h, G, time === 'night' ? '#3c3f47' : '#e8e4dc');
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 3;
    for (let x = -h; x < w; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + (h - G) * 0.6, G);
      ctx.stroke();
    }
  },

  highway(ctx, w, h, G, pal, time, r) {
    sky(ctx, w, h, pal, time, r);
    skyline(ctx, r, w, G - 260, 200, 600, pal.far, pal, true);
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(0, G - 260, w, 40);
    for (let x = 60; x < w; x += 300) ctx.fillRect(x, G - 220, 40, 220);
    floor(ctx, w, h, G, pal.ground);
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(0, G - 70, w, 16);
    for (let x = 0; x < w; x += 90) ctx.fillRect(x, G - 70, 10, 70);
    ctx.fillStyle = '#f1c40f';
    for (let x = 0; x < w; x += 220) ctx.fillRect(x, G + (h - G) * 0.5, 120, 12);
  },

  bridge(ctx, w, h, G, pal, time, r) {
    sky(ctx, w, h, pal, time, r, G - 260);
    skyline(ctx, r, w, G - 300, 120, 420, pal.far, pal, true);
    const g = ctx.createLinearGradient(0, G - 300, 0, G);
    g.addColorStop(0, pal.mid);
    g.addColorStop(1, pal.far);
    ctx.fillStyle = g;
    ctx.fillRect(0, G - 300, w, 300);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const y = G - 280 + r() * 260, x = r() * w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 60 + r() * 80, y);
      ctx.stroke();
    }
    floor(ctx, w, h, G, '#5a5a60');
    ctx.fillStyle = '#2f3b4c';
    ctx.fillRect(0, G - 110, w, 16);
    ctx.fillRect(0, G - 40, w, 12);
    for (let x = 0; x < w; x += 70) ctx.fillRect(x, G - 110, 12, 110);
  },

  hospital(ctx, w, h, G, pal, time, r) {
    sky(ctx, w, h, pal, time, r);
    ctx.fillStyle = time === 'night' ? '#5b6370' : '#e9edf1';
    ctx.fillRect(w * 0.05, G - 1000, w * 0.9, 1000);
    for (let y = G - 940; y < G - 300; y += 110) {
      for (let x = w * 0.1; x < w * 0.88; x += 120) {
        ctx.fillStyle = r() < pal.lit ? 'rgba(255,230,160,0.85)' : 'rgba(40,70,100,0.6)';
        ctx.fillRect(x, y, 70, 70);
      }
    }
    sign(ctx, 'HOSPITAL', w * 0.25, G - 1080, w * 0.5, 100, '#c0392b', '#ffffff');
    ctx.fillStyle = 'rgba(120,170,200,0.55)';
    ctx.fillRect(w * 0.35, G - 260, w * 0.3, 260);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(w * 0.47, G - 330, w * 0.06, 50);
    ctx.fillRect(w * 0.445, G - 318, w * 0.11, 26);
    floor(ctx, w, h, G, pal.ground);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = 30; x < w; x += 180) ctx.fillRect(x, G + 30, 10, (h - G) * 0.5);
  },

  evac(ctx, w, h, G, pal, time, r) {
    ctx.fillStyle = time === 'night' ? '#2d2a2a' : '#b9a68f';
    ctx.fillRect(0, 0, w, G);
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 10;
    for (let x = 0; x <= w; x += w / 4) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.05);
      ctx.lineTo(x + w / 8, h * 0.15);
      ctx.lineTo(x + w / 4, h * 0.05);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, h * 0.15);
    ctx.lineTo(w, h * 0.15);
    ctx.stroke();
    sign(ctx, 'EVACUATION CENTER', w * 0.1, h * 0.22, w * 0.8, 110, '#1f6f43', '#ffffff');
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * (w - 80) / 4;
      ctx.fillStyle = '#4f6b3a';
      ctx.fillRect(x, G - 90, (w - 80) / 4 - 30, 40);
      ctx.fillStyle = '#333';
      ctx.fillRect(x + 6, G - 50, 8, 50);
      ctx.fillRect(x + (w - 80) / 4 - 44, G - 50, 8, 50);
    }
    floor(ctx, w, h, G, '#8a5a3c');
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w / 2, G + (h - G) * 0.6, 160, 0, Math.PI * 2);
    ctx.stroke();
  },

  outskirts(ctx, w, h, G, pal, time, r) {
    sky(ctx, w, h, pal, time, r);
    ctx.fillStyle = pal.far;
    ctx.beginPath();
    ctx.moveTo(0, G - 200);
    for (let x = 0; x <= w; x += 60) ctx.lineTo(x, G - 260 - Math.sin(x / 170) * 120 - r() * 40);
    ctx.lineTo(w, G);
    ctx.lineTo(0, G);
    ctx.fill();
    floor(ctx, w, h, G, time === 'night' ? '#1f3324' : '#4f7a3a');
    for (let i = 0; i < 6; i++) {
      const x = r() * w, s = 0.6 + r() * 0.6;
      ctx.fillStyle = '#3b2a1c';
      ctx.fillRect(x - 10 * s, G - 200 * s, 20 * s, 200 * s);
      ctx.fillStyle = time === 'night' ? '#16301c' : '#2f6b34';
      ctx.beginPath();
      ctx.arc(x, G - 230 * s, 90 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8a6d4a';
    ctx.beginPath();
    ctx.moveTo(w * 0.4, G);
    ctx.lineTo(w * 0.6, G);
    ctx.lineTo(w * 0.85, h);
    ctx.lineTo(w * 0.15, h);
    ctx.fill();
  },
};

/** Draw a scene's static background onto a new canvas. */
/** Image for a custom location, or null. */
export function locationImage(location, time, resolveAsset) {
  for (const ref of [`backgrounds/${location}-${time}.png`, `backgrounds/${location}.png`]) {
    try { resolveAsset(ref); return ref; } catch {}
  }
  return null;
}

export async function buildBackdrop(scene, w, h, resolveAsset) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const bg = scene.background || {};

  if (bg.type === 'image' && bg.asset) {
    const img = await loadImage(resolveAsset(bg.asset));
    const s = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
    return canvas;
  }
  if (bg.type === 'color' && bg.asset && !scene.location) {
    ctx.fillStyle = bg.asset;
    ctx.fillRect(0, 0, w, h);
    return canvas;
  }

  const time = TIMES.includes(scene.time) ? scene.time : 'night';
  // A location without a drawn backdrop uses backgrounds/<location>-<time>.png or backgrounds/<location>.png.
  const custom = scene.location && !normalizeLocation(scene.location) && locationImage(scene.location, time, resolveAsset);
  if (custom) return buildBackdrop({ background: { type: 'image', asset: custom } }, w, h, resolveAsset);
  const loc = normalizeLocation(scene.location) || 'street';
  const pal = PALETTE[time];
  const seed = [...loc].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  DRAW[loc](ctx, w, h, h * GROUND, pal, time, rng(seed));

  if (pal.dark && loc !== 'black') {
    ctx.fillStyle = `rgba(5,8,25,${pal.dark})`;
    ctx.fillRect(0, 0, w, h);
  }
  return canvas;
}

export function drawRain(ctx, w, h, t) {
  ctx.strokeStyle = 'rgba(190,210,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const r = rng(99);
  for (let i = 0; i < 160; i++) {
    const x0 = r() * w, speed = 1400 + r() * 600, off = r() * h;
    const y = ((off + t * speed) % (h + 100)) - 100;
    const x = x0 - y * 0.12;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y + 60);
  }
  ctx.stroke();
}
