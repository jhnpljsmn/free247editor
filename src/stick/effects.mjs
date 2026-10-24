// Camera moves, flashes, fades, the day badge and title cards.
import { FONT } from './text.mjs';

const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

// Camera transform (shake + zoom) at time t. Returns { dx, dy, zoom, fx, fy }.
export function cameraAt(camera, t, w, h, focusOf) {
  let dx = 0, dy = 0, zoom = 1, fx = w / 2, fy = h * 0.65;
  for (const c of camera) {
    if (t < c.time) continue;
    if (c.type === 'shake') {
      const u = (t - c.time) / (c.duration || 0.6);
      if (u < 1) {
        const a = (c.strength || 1) * 28 * (1 - u);
        dx += a * Math.sin(t * 73);
        dy += a * Math.cos(t * 61);
      }
    } else if (c.type === 'zoom') {
      const from = zoom;
      zoom = from + ((c.value || 1.3) - from) * smooth((t - c.time) / (c.duration || 1));
      if (c.target) {
        const f = focusOf(c.target);
        if (f) { fx = f.x; fy = f.y - 200; }
      }
    }
  }
  return { dx, dy, zoom, fx, fy };
}

export function applyCamera(ctx, cam, w, h) {
  ctx.translate(cam.dx, cam.dy);
  if (cam.zoom !== 1) {
    // Keep the focus point on screen without showing past the frame edges.
    const fx = Math.max(w / (2 * cam.zoom), Math.min(w - w / (2 * cam.zoom), cam.fx));
    const fy = Math.max(h / (2 * cam.zoom), Math.min(h - h / (2 * cam.zoom), cam.fy));
    ctx.translate(w / 2, h / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-fx, -fy);
  }
}

// Full-frame overlays: flashes, fades (camera + scene transitions), vignette.
export function drawOverlays(ctx, scene, t, duration, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  let black = 0;
  for (const c of scene.camera || []) {
    if (t < c.time) continue;
    const u = (t - c.time) / (c.duration || 0.5);
    if (c.type === 'flash' && u < 1) {
      ctx.fillStyle = c.color === 'white' ? `rgba(255,255,255,${0.8 * (1 - u)})` : `rgba(200,0,0,${0.55 * (1 - u)})`;
      ctx.fillRect(0, 0, w, h);
    } else if (c.type === 'fade') {
      black = c.direction === 'in' ? 1 - smooth(u) : smooth(u);
    }
  }
  const tr = scene.transitions || {};
  const td = tr.duration || 0.5;
  if (tr.in === 'fade' && t < td) black = Math.max(black, 1 - t / td);
  if (tr.out === 'fade' && t > duration - td) black = Math.max(black, (t - (duration - td)) / td);
  if (black > 0) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, black)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

export function drawDayBadge(ctx, day, w) {
  ctx.font = `64px ${FONT}`;
  const text = `DAY ${day}`;
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(160,0,0,0.85)';
  ctx.fillRect(40, 70, tw + 50, 90);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 65, 140);
}

export function drawCard(ctx, card, t, w, h) {
  ctx.fillStyle = 'rgba(8,8,12,0.88)';
  ctx.fillRect(0, 0, w, h);
  const u = smooth(t / 0.6);
  const s = 0.85 + 0.15 * u;
  ctx.save();
  ctx.globalAlpha = u;
  ctx.translate(w / 2, h * 0.45);
  ctx.scale(s, s);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `${fitFont(ctx, card.title, w * 0.85, 230)}px ${FONT}`;
  ctx.fillText(card.title, 0, 0);
  ctx.fillStyle = '#c0161b';
  ctx.fillRect(-w * 0.3, 40, w * 0.6 * u, 14);
  if (card.subtitle) {
    ctx.fillStyle = '#d8d8d8';
    ctx.font = `${fitFont(ctx, card.subtitle, w * 0.85, 80)}px ${FONT}`;
    ctx.fillText(card.subtitle.toUpperCase(), 0, 150);
  }
  ctx.restore();
}

export function fitFont(ctx, text, maxW, size) {
  ctx.font = `${size}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  return tw > maxW ? Math.floor(size * maxW / tw) : size;
}
