// Replays a scene's actions to get every character's position, facing and pose at time t.
import { evalPose, blendPoses, ONCE_POSES } from './figure.mjs';

const SPEED = { walk: 260, run: 620, shamble: 120, sneak: 150 }; // px per second
const BLEND = 0.2;
const OFFSCREEN = 180;

function gaitFor(sheet, gait) {
  if (sheet.zombie && (gait === 'walk' || gait === 'sneak')) return 'shamble';
  return gait;
}

export function restPose(sheet, char) {
  return char.pose || (sheet.zombie ? 'zidle' : 'idle');
}

function moveDuration(from, to, gait, given) {
  if (given) return given;
  return Math.max(0.4, Math.hypot(to[0] - from[0], to[1] - from[1]) / (SPEED[gait] || SPEED.walk));
}

/** State of one character at time t. */
export function characterAt(char, sheet, actions, t, w) {
  const rest = restPose(sheet, char);
  let x = char.x, y = char.y, facing = char.facing || 1;
  let visible = !char.hidden, appearedAt = char.hidden ? null : 0;
  let current = rest;
  let motion = null;
  const segments = [{ start: 0, pose: rest }];
  const setPose = (pose, at) => {
    if (segments[segments.length - 1].pose !== pose) segments.push({ start: at, pose });
    current = pose;
  };
  const settle = (at) => {
    if (!motion) return;
    const u = Math.min(1, (at - motion.t0) / (motion.t1 - motion.t0));
    x = motion.from[0] + (motion.to[0] - motion.from[0]) * u;
    y = motion.from[1] + (motion.to[1] - motion.from[1]) * u;
    if (u >= 1 && motion.hideAfter) visible = false;
    motion = null;
  };
  const startMove = (to, gait, at, dur, hideAfter = false) => {
    gait = gaitFor(sheet, gait);
    const from = [x, y];
    const d = moveDuration(from, to, gait, dur);
    if (to[0] !== from[0]) facing = to[0] > from[0] ? 1 : -1;
    motion = { from, to, t0: at, t1: at + d, gait, hideAfter, after: current === gait ? rest : current };
    segments.push({ start: at, pose: gait });
  };

  for (const a of actions) {
    if (a.time > t) break;
    // A move that already finished hands back to the pose the character had before it.
    if (motion && a.time >= motion.t1) {
      const after = motion.after, end = motion.t1;
      settle(a.time);
      segments.push({ start: end, pose: after });
      current = after;
    } else settle(a.time);

    switch (a.verb) {
      case 'move':
        startMove([a.x ?? x, a.y ?? y], a.gait || 'walk', a.time, a.duration);
        break;
      case 'enter': {
        const fromLeft = a.dir !== 'right';
        const target = [a.x ?? char.x, a.y ?? char.y];
        x = fromLeft ? -OFFSCREEN : w + OFFSCREEN;
        y = target[1];
        visible = true;
        appearedAt = a.time;
        startMove(target, a.gait || 'walk', a.time, a.duration);
        break;
      }
      case 'exit': {
        const toX = a.dir === 'left' ? -OFFSCREEN : a.dir === 'right' ? w + OFFSCREEN : (facing > 0 ? w + OFFSCREEN : -OFFSCREEN);
        startMove([toX, y], a.gait || 'walk', a.time, a.duration, true);
        break;
      }
      case 'pose':
        setPose(a.pose, a.time);
        if (a.duration || ONCE_POSES[a.pose] && a.pose !== 'fall') {
          // Timed and one-shot poses return to rest afterwards (handled below by a synthetic action).
          const end = a.time + (a.duration || ONCE_POSES[a.pose]);
          if (end <= t && !actions.some((b) => b.time > a.time && b.time < end)) setPose(rest, end);
        }
        break;
      case 'face':
        facing = a.dir === 'left' ? -1 : 1;
        break;
      case 'appear':
        visible = true;
        appearedAt = a.time;
        break;
      case 'disappear':
        visible = false;
        break;
    }
  }

  let pose = current;
  let phaseStart = segments[segments.length - 1].start;
  if (motion) {
    if (t < motion.t1) {
      const u = (t - motion.t0) / (motion.t1 - motion.t0);
      x = motion.from[0] + (motion.to[0] - motion.from[0]) * u;
      y = motion.from[1] + (motion.to[1] - motion.from[1]) * u;
      pose = motion.gait;
    } else {
      const after = motion.after, end = motion.t1;
      settle(t);
      segments.push({ start: end, pose: after });
      pose = after;
      phaseStart = end;
    }
  }

  const last = segments[segments.length - 1];
  const prev = segments[segments.length - 2];
  let angles = evalPose(last.pose, t - last.start, t);
  if (prev && t - last.start < BLEND) {
    angles = blendPoses(evalPose(prev.pose, t - prev.start, t), angles, (t - last.start) / BLEND);
  }

  return { x, y, facing, visible, poseName: pose, angles, appearedAt, phaseStart };
}

/** Actions for one character, sorted by time. */
export function actionsFor(scene, charId) {
  return (scene.actions || []).filter((a) => a.actor === charId).sort((a, b) => a.time - b.time);
}
