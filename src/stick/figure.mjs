// Stick figure skeleton, poses, and drawing from a cast sheet.
//
// Coordinates: the figure stands with its feet at (x, y) on the canvas. Internally it is drawn
// facing right (+x forward) and mirrored for facing left. Angles are in degrees:
//   T            torso lean from straight up, + = forward
//   hd           head tilt, + = forward
//   lsh/rsh      upper arm from straight down, relative to the torso, + = forward (l = far side)
//   lel/rel      elbow bend, + = forearm swings forward/up
//   lhp/rhp      thigh from straight down, + = forward
//   lkn/rkn      knee bend, - = shin swings back
//   rot          whole-body rotation, - = falling backward (used by fall/lie)

const RAD = Math.PI / 180;
const POSE_KEYS = ['T', 'hd', 'lsh', 'lel', 'rsh', 'rel', 'lhp', 'lkn', 'rhp', 'rkn', 'rot'];

const BASE = { T: 2, hd: 0, lsh: -8, lel: 10, rsh: 8, rel: 12, lhp: -5, lkn: -2, rhp: 6, rkn: -3, rot: 0 };

const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (u) => Math.max(0, Math.min(1, u));
const smooth = (u) => u * u * (3 - 2 * u);

function pose(over) {
  return { ...BASE, ...over };
}

// Interpolate a list of [time, pose] keyframes, holding the last one.
function keyframes(frames, tp) {
  if (tp <= frames[0][0]) return pose(frames[0][1]);
  for (let i = 1; i < frames.length; i++) {
    const [t1, p1] = frames[i];
    const [t0, p0] = frames[i - 1];
    if (tp <= t1) {
      const u = smooth((tp - t0) / (t1 - t0));
      const a = pose(p0), b = pose(p1), out = {};
      for (const k of POSE_KEYS) out[k] = lerp(a[k], b[k], u);
      return out;
    }
  }
  return pose(frames[frames.length - 1][1]);
}

function gait(tp, { period, leg, knee, arm, elbow, lean, bob = 0 }) {
  const p = (tp / period) * Math.PI * 2;
  const s = Math.sin(p), c = Math.cos(p);
  return pose({
    T: lean + bob * Math.sin(2 * p),
    lhp: leg * s, rhp: -leg * s,
    lkn: -5 - knee * Math.max(0, c), rkn: -5 - knee * Math.max(0, -c),
    lsh: -arm * s, rsh: arm * s,
    lel: elbow + 10 * Math.max(0, -s), rel: elbow + 10 * Math.max(0, s),
  });
}

// Each pose: (tp = seconds since the pose started, t = scene time) => angles.
// `once` poses play through and hold their last frame.
export const POSES = {
  idle: (tp, t) => pose({ lsh: -8 + 2 * Math.sin(t * 2), rsh: 8 - 2 * Math.sin(t * 2) }),
  walk: (tp) => gait(tp, { period: 0.9, leg: 24, knee: 32, arm: 22, elbow: 15, lean: 4 }),
  run: (tp) => gait(tp, { period: 0.5, leg: 42, knee: 75, arm: 48, elbow: 70, lean: 16, bob: 2 }),
  sneak: (tp) => {
    const g = gait(tp, { period: 1.3, leg: 18, knee: 40, arm: 10, elbow: 70, lean: 25 });
    g.lkn -= 25; g.rkn -= 25; g.lhp += 15; g.rhp += 15;
    return g;
  },
  shamble: (tp) => {
    const p = (tp / 1.5) * Math.PI * 2;
    const g = gait(tp, { period: 1.5, leg: 13, knee: 16, arm: 0, elbow: 5, lean: 18 });
    return { ...g, hd: 15 + 6 * Math.sin(2 * p), lsh: 72 + 6 * Math.sin(p), rsh: 82 - 6 * Math.sin(p), rot: 3 * Math.sin(p) };
  },
  zidle: (tp, t) => pose({ T: 16, hd: 18 + 4 * Math.sin(t * 1.7), lsh: 55 + 4 * Math.sin(t * 2), lel: 10, rsh: 65 - 4 * Math.sin(t * 2), rel: 8, rot: 2 * Math.sin(t * 1.3) }),
  crouch: () => pose({ T: 18, hd: 8, lsh: 35, lel: 70, rsh: 45, rel: 75, lhp: 80, lkn: -150, rhp: 70, rkn: -140 }),
  sit: () => pose({ T: 0, lsh: 25, lel: 30, rsh: 30, rel: 35, lhp: 85, lkn: -85, rhp: 90, rkn: -90 }),
  scared: (tp, t) => pose({ T: -10, hd: -8, lsh: 95 + 3 * Math.sin(t * 40), lel: 75, rsh: 105 + 3 * Math.sin(t * 43), rel: 70, lhp: -12, rhp: 14 }),
  point: () => pose({ T: 3, rsh: 90, rel: 0, lsh: -5 }),
  wave: (tp) => pose({ rsh: 160, rel: 20 + 25 * Math.sin(tp * 10) }),
  talk: (tp) => pose({ rsh: 35 + 15 * Math.sin(tp * 5), rel: 50 }),
  think: (tp, t) => pose({ hd: 8, rsh: 30, rel: 140, lsh: 10, lel: 80 }),
  look: (tp) => pose({ hd: 12 * Math.sin(tp * 2.5) }),
  hold: () => pose({ lsh: 45, lel: 60, rsh: 50, rel: 60 }),
  aim: () => pose({ T: 4, lsh: 88, lel: 0, rsh: 92, rel: 0, lhp: -10, rhp: 12 }),
  push: () => pose({ T: 22, lsh: 85, lel: 10, rsh: 90, rel: 10, lhp: -18, lkn: -5, rhp: 18, rkn: -10 }),
  hurt: () => pose({ T: 30, hd: 15, rsh: 20, rel: 110, lsh: 10, lel: 40, lhp: -6, lkn: -15, rhp: 10, rkn: -20 }),
  cheer: (tp) => pose({ lsh: 165, lel: 10, rsh: 170, rel: 10 + 10 * Math.sin(tp * 12) }),
  eat: (tp, t) => pose({ T: 55, hd: 30, lsh: 55 + 10 * Math.sin(t * 8), lel: 30, rsh: 60 - 10 * Math.sin(t * 8), rel: 30, lhp: 80, lkn: -150, rhp: 70, rkn: -140 }),
  swing: (tp) => keyframes([
    [0, { T: -5, rsh: 10, rel: 40, lhp: -15, rhp: 20 }],
    [0.25, { T: -8, rsh: 200, rel: 40, lsh: 30, lhp: -15, rhp: 20 }],
    [0.45, { T: 20, rsh: 60, rel: 10, lsh: -10, lhp: -15, rhp: 25 }],
    [0.75, { T: 6, rsh: 30, rel: 30, lhp: -10, rhp: 15 }],
  ], tp),
  fall: (tp) => keyframes([
    [0, { T: -10, lsh: 150, rsh: 160 }],
    [0.5, { rot: -90, lsh: 140, rsh: 120, lhp: 20, rhp: -10 }],
    [0.8, { rot: -90, lsh: 30, rsh: -20, lhp: 5, rhp: -10, lkn: -10 }],
  ], tp),
  lie: () => pose({ rot: -90, lsh: 30, rsh: -20, lhp: 5, rhp: -10, lkn: -10 }),
};
POSES.hide = POSES.crouch;
POSES.dead = POSES.lie;
POSES.scream = POSES.scared;
POSES.attack = POSES.swing;

export const GAITS = new Set(['walk', 'run', 'sneak', 'shamble']);
export const ONCE_POSES = { swing: 0.75, attack: 0.75, fall: 0.8 };

export function evalPose(name, tp, t) {
  const fn = POSES[name] || POSES.idle;
  return fn(Math.max(0, tp), t);
}

export function blendPoses(a, b, u) {
  if (u >= 1) return b;
  const out = {};
  for (const k of POSE_KEYS) out[k] = lerp(a[k], b[k], smooth(clamp01(u)));
  return out;
}

const L = { r: 0.085, gap: 0.02, torso: 0.3, thigh: 0.235, shin: 0.235, upper: 0.16, fore: 0.15 };

function down(a) { return [Math.sin(a * RAD), Math.cos(a * RAD)]; }

// Forward kinematics in figure-local coordinates (facing right), grounded so the lowest point is y = 0.
function skeleton(p, H) {
  const add = (pt, [dx, dy], len) => [pt[0] + dx * len * H, pt[1] + dy * len * H];
  const hip = [0, 0];
  const up = [Math.sin(p.T * RAD), -Math.cos(p.T * RAD)];
  const neck = add(hip, up, L.torso);
  const shoulder = add(hip, up, L.torso * 0.9);
  const headDir = [Math.sin((p.T + p.hd) * RAD), -Math.cos((p.T + p.hd) * RAD)];
  const head = add(neck, headDir, L.gap + L.r);
  const arm = (sh, el) => {
    const e = add(shoulder, down(sh + p.T), L.upper);
    return [e, add(e, down(sh + p.T + el), L.fore)];
  };
  const leg = (hp, kn) => {
    const k = add(hip, down(hp), L.thigh);
    return [k, add(k, down(hp + kn), L.shin)];
  };
  const [lElbow, lHand] = arm(p.lsh, p.lel);
  const [rElbow, rHand] = arm(p.rsh, p.rel);
  const [lKnee, lFoot] = leg(p.lhp, p.lkn);
  const [rKnee, rFoot] = leg(p.rhp, p.rkn);
  const pts = { hip, neck, shoulder, head, lElbow, lHand, rElbow, rHand, lKnee, lFoot, rKnee, rFoot };

  // Rotate the whole body (fall/lie), then put the lowest point on the ground.
  const c = Math.cos(p.rot * RAD), s = Math.sin(p.rot * RAD);
  for (const k in pts) {
    const [x, y] = pts[k];
    pts[k] = [x * c - y * s, x * s + y * c];
  }
  const r = L.r * H;
  let maxY = pts.head[1] + r;
  for (const k of ['lFoot', 'rFoot', 'lKnee', 'rKnee', 'lHand', 'rHand', 'hip']) maxY = Math.max(maxY, pts[k][1]);
  for (const k in pts) pts[k] = [pts[k][0], pts[k][1] - maxY];
  pts.headAngle = (p.T + p.hd + p.rot) * RAD;
  return pts;
}

const BUILD = { thin: 0.8, normal: 1, heavy: 1.35 };
const SCARED = new Set(['scared', 'scream', 'fall', 'hurt']);
const ANGRY = new Set(['swing', 'attack', 'push', 'run', 'aim']);

function line(ctx, pts, width, color) {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

function drawWeapon(ctx, kind, elbow, hand, H, outline) {
  if (!kind || kind === 'none') return;
  const dx = hand[0] - elbow[0], dy = hand[1] - elbow[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const at = (d) => [hand[0] + ux * d * H, hand[1] + uy * d * H];
  const o = outline ? 6 : 0;
  const dark = '#111';
  switch (kind) {
    case 'bat':
      line(ctx, [hand, at(0.2)], H * 0.03 + o, outline ? dark : '#a0703c');
      line(ctx, [at(0.2), at(0.36)], H * 0.05 + o, outline ? dark : '#b98049');
      break;
    case 'pipe':
      line(ctx, [at(-0.04), at(0.4)], H * 0.025 + o, outline ? dark : '#9aa3ad');
      break;
    case 'crowbar':
      line(ctx, [at(-0.03), at(0.36)], H * 0.022 + o, outline ? dark : '#b3342f');
      line(ctx, [at(0.36), [at(0.36)[0] - uy * 0.06 * H, at(0.36)[1] + ux * 0.06 * H]], H * 0.022 + o, outline ? dark : '#b3342f');
      break;
    case 'knife':
      line(ctx, [hand, at(0.04)], H * 0.025 + o, outline ? dark : '#3b2b20');
      line(ctx, [at(0.04), at(0.12)], H * 0.02 + o, outline ? dark : '#dfe6ec');
      break;
    case 'bolo':
      line(ctx, [hand, at(0.05)], H * 0.025 + o, outline ? dark : '#3b2b20');
      line(ctx, [at(0.05), at(0.26)], H * 0.04 + o, outline ? dark : '#cfd8de');
      break;
    case 'spear':
      line(ctx, [at(-0.15), at(0.45)], H * 0.02 + o, outline ? dark : '#8a6a3f');
      line(ctx, [at(0.45), at(0.53)], H * 0.03 + o, outline ? dark : '#dfe6ec');
      break;
    case 'pan':
      line(ctx, [hand, at(0.12)], H * 0.022 + o, outline ? dark : '#2a2a2a');
      ctx.beginPath();
      ctx.arc(...at(0.19), H * 0.07 + o / 2, 0, Math.PI * 2);
      ctx.fillStyle = outline ? dark : '#3a3a3a';
      ctx.fill();
      break;
    case 'flashlight': {
      line(ctx, [hand, at(0.08)], H * 0.035 + o, outline ? dark : '#444');
      if (!outline) {
        const tip = at(0.08), far = at(0.9);
        const nx = -uy * 0.18 * H, ny = ux * 0.18 * H;
        const g = ctx.createLinearGradient(tip[0], tip[1], far[0], far[1]);
        g.addColorStop(0, 'rgba(255,240,170,0.55)');
        g.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(tip[0], tip[1]);
        ctx.lineTo(far[0] + nx, far[1] + ny);
        ctx.lineTo(far[0] - nx, far[1] - ny);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
}

function drawHead(ctx, sheet, pts, H, lw, poseName, outline) {
  const r = L.r * H;
  const [cx, cy] = pts.head;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(pts.headAngle);

  if (outline) {
    ctx.beginPath();
    ctx.arc(0, 0, r + lw / 2 + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.restore();
    return;
  }

  // Long hair and ponytails sit behind the head.
  const hairColor = sheet.hairColor || '#1b1b1b';
  ctx.fillStyle = hairColor;
  if (sheet.hair === 'long') {
    ctx.beginPath();
    ctx.roundRect(-r * 1.05, -r * 0.3, r * 1.1, r * 1.7, r * 0.4);
    ctx.fill();
  } else if (sheet.hair === 'ponytail') {
    ctx.beginPath();
    ctx.ellipse(-r * 1.15, r * 0.15, r * 0.35, r * 0.7, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = sheet.headFill || '#f4f1ea';
  ctx.fill();
  ctx.lineWidth = lw * 0.8;
  ctx.strokeStyle = sheet.color;
  ctx.stroke();

  // Hair on top.
  ctx.fillStyle = hairColor;
  if (['short', 'long', 'ponytail', 'bun', 'spiky'].includes(sheet.hair)) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.06, Math.PI * 1.08, Math.PI * 1.92);
    ctx.closePath();
    ctx.fill();
  }
  if (sheet.hair === 'spiky') {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.1 + i * 0.2);
      ctx.moveTo(Math.cos(a - 0.12) * r, Math.sin(a - 0.12) * r);
      ctx.lineTo(Math.cos(a) * r * 1.55, Math.sin(a) * r * 1.55);
      ctx.lineTo(Math.cos(a + 0.12) * r, Math.sin(a + 0.12) * r);
    }
    ctx.fill();
  }
  if (sheet.hair === 'bun') {
    ctx.beginPath();
    ctx.arc(-r * 0.55, -r * 1.0, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  // Face (3/4 view, looking forward).
  const zombie = !!sheet.zombie;
  ctx.fillStyle = zombie ? '#e0201b' : '#151515';
  const eyeR = r * (zombie ? 0.16 : 0.12);
  for (const ex of [0.15, 0.58]) {
    ctx.beginPath();
    ctx.arc(ex * r, r * 0.02, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#151515';
  ctx.lineWidth = Math.max(2, lw * 0.35);
  ctx.beginPath();
  if (zombie) {
    ctx.moveTo(0.05 * r, 0.45 * r);
    for (let i = 1; i <= 4; i++) ctx.lineTo((0.05 + i * 0.16) * r, (i % 2 ? 0.35 : 0.5) * r);
    ctx.stroke();
  } else if (SCARED.has(poseName)) {
    ctx.ellipse(0.4 * r, 0.45 * r, r * 0.13, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#151515';
    ctx.fill();
  } else {
    ctx.moveTo(0.22 * r, 0.42 * r);
    ctx.lineTo(0.6 * r, 0.42 * r);
    ctx.stroke();
    if (ANGRY.has(poseName)) {
      ctx.beginPath();
      ctx.moveTo(0.0 * r, -0.38 * r);
      ctx.lineTo(0.35 * r, -0.25 * r);
      ctx.moveTo(0.45 * r, -0.25 * r);
      ctx.lineTo(0.78 * r, -0.38 * r);
      ctx.stroke();
    }
  }

  if (sheet.accessory === 'glasses') {
    ctx.strokeStyle = sheet.accessoryColor || '#151515';
    ctx.lineWidth = Math.max(2, lw * 0.3);
    for (const ex of [0.15, 0.58]) {
      ctx.beginPath();
      ctx.arc(ex * r, r * 0.02, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0.37 * r, r * 0.02);
    ctx.lineTo(0.36 * r, r * 0.02);
    ctx.moveTo(-0.07 * r, r * 0.02);
    ctx.lineTo(-0.9 * r, -r * 0.1);
    ctx.stroke();
  }

  // Hats.
  const hatColor = sheet.hatColor || '#2d4e8a';
  ctx.fillStyle = hatColor;
  switch (sheet.hat) {
    case 'cap':
      ctx.beginPath();
      ctx.arc(0, -r * 0.3, r * 0.98, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(0, -r * 0.42, r * 1.55, r * 0.17);
      break;
    case 'beanie':
      ctx.beginPath();
      ctx.arc(0, -r * 0.35, r * 1.02, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-r * 1.04, -r * 0.5, r * 2.08, r * 0.24);
      break;
    case 'helmet':
    case 'hardhat':
      ctx.beginPath();
      ctx.arc(0, -r * 0.28, r * 1.08, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      if (sheet.hat === 'hardhat') ctx.fillRect(-r * 1.35, -r * 0.38, r * 2.7, r * 0.14);
      break;
    case 'bandana':
      ctx.fillRect(-r * 1.02, -r * 0.62, r * 2.04, r * 0.32);
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, -r * 0.45);
      ctx.lineTo(-r * 1.6, -r * 0.1);
      ctx.lineTo(-r * 1.45, -r * 0.6);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}

/**
 * Draw one figure.
 * @param ctx canvas 2D context
 * @param sheet cast sheet ({ color, shirt, height, build, hair, hat, accessory, weapon, zombie, ... })
 * @param state { x, y, scale, facing: 1 | -1, poseName, angles, holding, alpha }
 * @param baseHeight figure height in px at scale 1
 */
export function drawFigure(ctx, sheet, state, baseHeight) {
  const H = baseHeight * (sheet.height || 1) * (state.scale || 1);
  const lw = H * 0.032 * (BUILD[sheet.build] || 1);
  const pts = skeleton(state.angles, H);
  const weapon = state.holding ?? sheet.weapon;

  ctx.save();
  ctx.globalAlpha = state.alpha ?? 1;
  ctx.translate(state.x, state.y);
  if (state.facing < 0) ctx.scale(-1, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Shadow on the ground.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, H * 0.16, H * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();

  const torsoW = sheet.shirt ? H * (sheet.build === 'heavy' ? 0.15 : sheet.build === 'thin' ? 0.09 : 0.115) : lw;
  const legW = sheet.pants ? lw * 1.6 : lw;
  const backpack = () => {
    if (sheet.accessory !== 'backpack') return null;
    const [nx, ny] = pts.shoulder, [hx, hy] = pts.hip;
    return [[nx - H * 0.07, ny + H * 0.02], [hx - H * 0.07, hy - H * 0.05]];
  };

  for (const pass of ['outline', 'color']) {
    const outline = pass === 'outline';
    const ow = outline ? 6 : 0;
    const col = (c) => (outline ? '#111' : c);
    const far = outline ? '#111' : shade(sheet.color, -0.25);

    // Far limbs.
    line(ctx, [pts.hip, pts.lKnee, pts.lFoot], legW + ow, outline ? '#111' : shade(sheet.pants || sheet.color, -0.25));
    line(ctx, [pts.shoulder, pts.lElbow, pts.lHand], lw + ow, far);

    const bp = backpack();
    if (bp) line(ctx, bp, H * 0.09 + ow, col(sheet.accessoryColor || '#6b4f2a'));

    // Torso and head.
    line(ctx, [pts.hip, pts.neck], torsoW + ow, col(sheet.shirt || sheet.color));
    if (sheet.accessory === 'scarf') line(ctx, [pts.neck, [pts.neck[0] + H * 0.03, pts.neck[1] + H * 0.04]], lw * 2 + ow, col(sheet.accessoryColor || '#c0392b'));
    if (sheet.accessory === 'bag' && !outline) {
      line(ctx, [pts.shoulder, [pts.hip[0] + H * 0.05, pts.hip[1] - H * 0.02]], lw * 0.5, sheet.accessoryColor || '#5b3b1f');
      ctx.fillStyle = sheet.accessoryColor || '#5b3b1f';
      ctx.fillRect(pts.hip[0] + H * 0.02, pts.hip[1] - H * 0.05, H * 0.08, H * 0.07);
    }
    if (sheet.accessory === 'medkit' && !outline) {
      const [hx, hy] = pts.hip;
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(hx - H * 0.11, hy - H * 0.07, H * 0.08, H * 0.07);
      ctx.fillStyle = '#d62828';
      ctx.fillRect(hx - H * 0.078, hy - H * 0.06, H * 0.016, H * 0.05);
      ctx.fillRect(hx - H * 0.095, hy - H * 0.043, H * 0.05, H * 0.016);
    }
    drawHead(ctx, sheet, pts, H, lw, state.poseName, outline);

    // Near limbs and weapon.
    line(ctx, [pts.hip, pts.rKnee, pts.rFoot], legW + ow, col(sheet.pants || sheet.color));
    drawWeapon(ctx, weapon, pts.rElbow, pts.rHand, H, outline);
    line(ctx, [pts.shoulder, pts.rElbow, pts.rHand], lw + ow, col(sheet.color));
  }

  ctx.restore();
  return { headTop: state.y + (pts.head[1] - L.r * H) };
}

// Lighten (+) or darken (-) a #rrggbb color.
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(Math.max(0, Math.min(255, amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
