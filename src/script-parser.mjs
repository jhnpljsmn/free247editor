import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { POSES } from './stick/figure.mjs';
import { PROPS } from './stick/props.mjs';

export async function parseScript(scriptPath) {
  return (await parseEpisodeFile(scriptPath)).scenes;
}

export async function parseEpisodeFile(scriptPath) {
  if (!existsSync(scriptPath)) {
    throw new Error(`Script file not found: ${scriptPath}`);
  }
  return parseEpisode(readFileSync(scriptPath, 'utf8'));
}

export function parseMarkdownScript(content) {
  return parseEpisode(content).scenes;
}

const FIELD_ALIASES = {
  duration: 'duration', day: 'day', location: 'location', setting: 'location', place: 'location',
  time: 'time', weather: 'weather', background: 'background', bg: 'background',
  characters: 'characters', chars: 'characters', cast: 'characters',
  actions: 'actions', action: 'actions', blocking: 'actions', camera: 'camera',
  props: 'props', narration: 'narration', dialogue: 'narration', text: 'narration',
  voiceover: 'voiceover', audio: 'voiceover', sfx: 'sfx', soundeffects: 'sfx', sounds: 'sfx',
  music: 'music', bgm: 'music', transition: 'transition', card: 'card', titlecard: 'card',
};

const num = '(-?\\d+(?:\\.\\d+)?)';
const POINT = new RegExp(`\\(\\s*${num}\\s*,\\s*${num}\\s*\\)`);
const key = (s) => s.toLowerCase().trim().replace(/\s+/g, '-');
const unquote = (s) => s.trim().replace(/^["“”']+|["“”']+$/g, '').trim();

/**
 * Parse an episode script. Text before the first scene may set episode-wide fields
 * (**Title:**, **Music:**). Returns { meta: { title, music }, scenes }.
 */
export function parseEpisode(content) {
  const meta = { title: null, music: null };
  const raw = [];
  let current = null;
  let field = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    const heading = line.match(/^#{2,3}\s+Scene\s+(\d+)\s*[:.\-–—]?\s*(.*)$/i);
    if (heading) {
      current = { num: Number(heading[1]), title: heading[2].trim() || `Scene ${heading[1]}`, fields: {} };
      raw.push(current);
      field = null;
      continue;
    }
    if (!current) {
      const t = line.match(/^#\s+(.+)$/);
      if (t && !meta.title) meta.title = t[1].trim();
      for (const [name, value] of splitFields(line)) {
        if (name === 'music') meta.music = value;
        if (name === 'title') meta.title = value;
      }
      continue;
    }

    const segments = splitFields(line);
    if (segments.length) {
      for (const [name, value] of segments) {
        field = FIELD_ALIASES[name] || name;
        current.fields[field] = current.fields[field] || [];
        if (value) current.fields[field].push(value);
      }
      continue;
    }
    const item = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/);
    if (field && (item || line)) current.fields[field].push(item ? item[1].trim() : line);
  }

  const scenes = [];
  let prev = null;
  for (const r of raw) {
    const scene = buildScene(r, prev);
    scenes.push(scene);
    prev = scene;
  }
  markFirstAppearances(scenes);
  return { meta: { ...meta, music: meta.music ? { asset: soundRef(meta.music), volume: 0.25 } : null }, scenes };
}

// "**Location:** alley  **Time:** night" → [['location', 'alley'], ['time', 'night']]
function splitFields(line) {
  const re = /\*\*([^*]+?)\*\*\s*:?/g;
  const marks = [...line.matchAll(re)];
  if (!marks.length || marks[0].index !== 0) return [];
  return marks.map((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : line.length;
    const name = m[1].replace(/:$/, '').toLowerCase().replace(/[^a-z]/g, '');
    return [name, line.slice(m.index + m[0].length, end).trim()];
  });
}

function buildScene(r, prev) {
  const f = r.fields;
  const one = (k) => (f[k]?.length ? f[k].join(' ').trim() : null);
  const id = `scene-${String(r.num).padStart(2, '0')}`;
  const warnings = [];

  const scene = {
    id,
    title: r.title,
    duration: parseFloat(one('duration')) || 0,
    day: one('day') ? parseInt(one('day').replace(/\D+/g, ''), 10) || null : prev?.day ?? null,
    location: one('location') ? key(one('location')) : prev?.card ? null : prev?.location ?? null,
    time: one('time') ? one('time').toLowerCase() : prev?.time ?? 'night',
    weather: one('weather') ? one('weather').toLowerCase() : prev?.weather ?? 'clear',
    background: { type: 'color', asset: '#000000' },
    characters: [],
    actions: [],
    camera: [],
    props: [],
    narration: { text: '' },
    soundEffects: [],
    music: null,
    subtitle: null,
    transitions: { in: 'cut', out: 'cut', duration: 0.5 },
    card: null,
    warnings,
  };

  const bg = one('background');
  if (bg) scene.background = bg.startsWith('#') ? { type: 'color', asset: bg } : { type: 'image', asset: bg };

  const card = one('card');
  if (card) {
    const [title, subtitle] = unquote(card).split('|').map((s) => s.trim());
    scene.card = { title: title.toUpperCase(), subtitle: subtitle || null };
    const d = title.match(/^day\s+(\d+)/i);
    if (d) scene.day = Number(d[1]);
    if (!one('location')) scene.location = null;
  }

  const text = one('narration');
  if (text) {
    scene.narration.text = unquote(text);
    scene.subtitle = { text: scene.narration.text, startTime: 0, endTime: scene.duration, style: 'default' };
  }
  if (one('voiceover')) {
    const v = unquote(one('voiceover'));
    scene.narration.audioFile = v.includes('/') ? v : `voiceovers/${v}`;
  }

  scene.characters = parseCharacters(f.characters || [], warnings);
  const actors = actorTable(scene.characters);
  for (const line of f.actions || []) parseAction(line, scene, actors, warnings);
  for (const line of f.camera || []) parseAction(/^\s*(at\s+)?[\d.]+/.test(line) ? line.replace(/^(\s*(?:at\s+)?[\d.]+s?,?)/i, '$1 Camera') : `0 Camera ${line}`, scene, actors, warnings);
  for (const c of scene.characters) {
    if (scene.actions.some((a) => a.actor === c.id && a.verb === 'enter' && a.time > 0)) c.hidden = true;
    if (scene.actions.some((a) => a.actor === c.id && a.verb === 'enter' && a.time === 0)) c.hidden = true;
  }

  for (const line of f.props || []) {
    const m = line.match(new RegExp(`^([a-z-]+)\\s*@?\\s*${POINT.source}(.*)$`, 'i'));
    if (!m || !PROPS.includes(m[1].toLowerCase())) {
      warnings.push(`Unknown prop "${line}". Use one of: ${PROPS.join(', ')}`);
      continue;
    }
    const opts = options(m[4]);
    scene.props.push({ type: m[1].toLowerCase(), x: +m[2], y: +m[3], scale: parseFloat(opts.scale) || 1, facing: opts.facing === 'left' ? -1 : 1 });
  }

  scene.soundEffects = (f.sfx || []).map((s) => {
    const [asset, at] = s.split(/\s*@\s*/);
    return { asset: soundRef(asset), startTime: parseFloat(at) || 0, volume: 1.0 };
  });
  if (one('music')) scene.music = { asset: soundRef(one('music')), startTime: 0, volume: 0.3, fadeIn: 1, fadeOut: 1 };

  const tr = one('transition');
  if (tr) {
    const [a, b] = tr.split(/\s*->\s*/);
    scene.transitions = { in: a?.trim() || 'cut', out: b?.trim() || 'cut', duration: 0.5 };
  }
  scene.actions.sort((a, b) => a.time - b.time);
  scene.camera.sort((a, b) => a.time - b.time);
  return scene;
}

function soundRef(s) {
  s = unquote(s);
  return s.includes('/') ? s : `sounds/${s}`;
}

function options(rest) {
  const opts = {};
  for (const m of (rest || '').matchAll(/(\w+)\s*:\s*([\w.#-]+)/g)) opts[m[1].toLowerCase()] = m[2].toLowerCase();
  if (/\bhidden\b/i.test(rest || '')) opts.hidden = true;
  return opts;
}

// "- Marco @ (300, 1500) facing: right pose: idle" / "- Zombie x5 @ (700, 1550) spread: 500"
function parseCharacters(lines, warnings) {
  const chars = [];
  const used = new Set();
  const uniqueId = (base) => {
    let id = base, n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    return id;
  };
  lines.forEach((line, i) => {
    const m = line.match(new RegExp(`^(.+?)(?:\\s+x(\\d+))?\\s*@\\s*${POINT.source}(.*)$`, 'i'))
      || line.match(/^([^@(]+?)(?:\s+x(\d+))?()()(.*)$/i);
    const name = m[1].trim();
    const opts = options(m[5]);
    const x = m[3] !== '' && m[3] !== undefined ? +m[3] : 200 + (i * 300) % 700;
    const y = m[4] !== '' && m[4] !== undefined ? +m[4] : 1650;
    if (m[3] === '' || m[3] === undefined) warnings.push(`"${name}" has no position; placed at (${x}, ${y})`);
    const base = {
      name,
      facing: opts.facing === 'left' ? -1 : 1,
      pose: opts.pose && POSES[opts.pose] ? opts.pose : undefined,
      scale: parseFloat(opts.scale) || 1,
      holding: opts.holding,
      hidden: !!opts.hidden,
    };
    if (opts.pose && !POSES[opts.pose]) warnings.push(`Unknown pose "${opts.pose}" for ${name}`);
    const count = m[2] ? parseInt(m[2], 10) : 1;
    if (count === 1) {
      chars.push({ ...base, id: uniqueId(key(name)), x, y });
      return;
    }
    const spread = parseFloat(opts.spread) || 120 * count;
    const group = key(name);
    for (let k = 0; k < count; k++) {
      chars.push({
        ...base,
        id: uniqueId(`${group}-${k + 1}`),
        group,
        x: Math.round(x + (k - (count - 1) / 2) * (spread / Math.max(1, count - 1))),
        y: y + (k % 2) * 40 - 20,
      });
    }
  });
  return chars;
}

// Name → character ids it refers to ("Marco", "Zombies" → every zombie instance, "Zombie 2").
function actorTable(chars) {
  const table = new Map();
  const add = (name, id) => {
    const k = name.toLowerCase();
    if (!table.has(k)) table.set(k, []);
    if (!table.get(k).includes(id)) table.get(k).push(id);
  };
  for (const c of chars) {
    add(c.name, c.id);
    add(c.id.replace(/-/g, ' '), c.id);
    if (c.group) {
      add(c.group.replace(/-/g, ' '), c.id);
      add(`${c.group.replace(/-/g, ' ')}s`, c.id);
      add(`all ${c.group.replace(/-/g, ' ')}s`, c.id);
      add(`the ${c.group.replace(/-/g, ' ')}s`, c.id);
    }
  }
  return table;
}

const GAITS = { walk: 'walk', walks: 'walk', move: 'walk', moves: 'walk', go: 'walk', goes: 'walk', run: 'run', runs: 'run',
  shamble: 'shamble', shambles: 'shamble', sneak: 'sneak', sneaks: 'sneak', crawl: 'sneak', crawls: 'sneak', limp: 'shamble', limps: 'shamble' };
const GAIT_WORD = { walking: 'walk', running: 'run', shambling: 'shamble', sneaking: 'sneak' };

function parseAction(line, scene, actors, warnings) {
  const m = line.match(/^(?:at\s+)?(\d+(?:\.\d+)?)\s*s?\s*[,:\-–]?\s+(.+)$/i);
  if (!m) {
    warnings.push(`Action without a start time: "${line}" (write it like "1.5 Marco walk to (600, 1600)")`);
    return;
  }
  const time = parseFloat(m[1]);
  const rest = m[2].trim().replace(/\.$/, '');
  const lower = rest.toLowerCase();

  if (lower.startsWith('camera')) {
    const c = lower.replace(/^camera\s*/, '');
    let cm;
    if ((cm = c.match(/^shake(?:\s+([\d.]+))?/))) scene.camera.push({ time, type: 'shake', strength: parseFloat(cm[1]) || 1 });
    else if ((cm = c.match(/^flash(?:\s+(red|white))?/))) scene.camera.push({ time, type: 'flash', color: cm[1] || 'red' });
    else if ((cm = c.match(/^zoom(?:\s+(?:to\s+)?([\d.]+)x?)?(?:\s+in\s+([\d.]+)s?)?(?:\s+on\s+(.+))?/))) {
      scene.camera.push({ time, type: 'zoom', value: parseFloat(cm[1]) || 1.3, duration: parseFloat(cm[2]) || 1, target: cm[3] ? (actors.get(cm[3].trim())?.[0] || cm[3].trim()) : null });
    } else if ((cm = c.match(/^fade(?:\s+(out|in))?(?:\s+in\s+([\d.]+)s?)?/))) scene.camera.push({ time, type: 'fade', direction: cm[1] || 'out', duration: parseFloat(cm[2]) || 0.6 });
    else warnings.push(`Unknown camera move: "${line}" (use shake, flash, zoom, fade)`);
    return;
  }

  // Longest character name at the start of the line.
  let ids = null, verbText = '';
  for (const [name, list] of [...actors.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (lower === name || lower.startsWith(`${name} `)) {
      ids = list;
      verbText = lower.slice(name.length).trim();
      break;
    }
  }
  if (!ids) {
    warnings.push(`Unknown character in action: "${line}" (list them under **Characters:** first)`);
    return;
  }
  const push = (a) => {
    const anchor = scene.characters.find((c) => c.id === ids[0]);
    for (const id of ids) {
      const c = scene.characters.find((x) => x.id === id);
      const dx = a.x !== undefined && ids.length > 1 ? c.x - anchor.x : 0;
      const dy = a.y !== undefined && ids.length > 1 ? c.y - anchor.y : 0;
      scene.actions.push({ ...a, time: time + (ids.length > 1 ? (ids.indexOf(id) % 3) * 0.15 : 0), actor: id, ...(a.x !== undefined ? { x: a.x + dx, y: a.y + dy } : {}) });
    }
  };
  const inSecs = (s) => { const d = s.match(/\bin\s+([\d.]+)\s*s?\b/); return d ? parseFloat(d[1]) : undefined; };
  let v;

  if ((v = verbText.match(new RegExp(`^(\\w+)\\s+(?:to\\s+|towards?\\s+)?${POINT.source}`))) && GAITS[v[1]]) {
    push({ verb: 'move', gait: GAITS[v[1]], x: +v[2], y: +v[3], duration: inSecs(verbText) });
  } else if ((v = verbText.match(/^(\w+)\s+(left|right)\s+(\d+)/)) && GAITS[v[1]]) {
    const c = scene.characters.find((x) => x.id === ids[0]);
    const dist = (v[2] === 'left' ? -1 : 1) * +v[3];
    for (const id of ids) {
      const ch = scene.characters.find((x) => x.id === id);
      scene.actions.push({ verb: 'move', gait: GAITS[v[1]], x: ch.x + dist, y: ch.y, duration: inSecs(verbText), time, actor: id, relative: true });
    }
    if (!c) warnings.push(`Could not move: "${line}"`);
  } else if ((v = verbText.match(/^(?:enters?|comes? in|arrives?)(?:\s+from)?(?:\s+the)?\s+(left|right)(?:\s+(walking|running|shambling|sneaking))?/))) {
    push({ verb: 'enter', dir: v[1], gait: GAIT_WORD[v[2]] || 'walk', duration: inSecs(verbText) });
  } else if ((v = verbText.match(/^(?:exits?|leaves?|runs? off|walks? off)(?:\s+(?:to\s+the\s+)?(left|right))?(?:\s+(walking|running|shambling|sneaking))?/))) {
    push({ verb: 'exit', dir: v[1], gait: GAIT_WORD[v[2]] || (/^runs?/.test(verbText) ? 'run' : 'walk'), duration: inSecs(verbText) });
  } else if ((v = verbText.match(/^(?:faces?|turns?|looks?)\s+(?:to\s+the\s+)?(left|right)/))) {
    push({ verb: 'face', dir: v[1] });
  } else if ((v = verbText.match(/^(?:attacks?|hits?|swings? at|strikes?)\s+(.+)/))) {
    const target = actors.get(v[1].trim())?.[0];
    const me = scene.characters.find((x) => x.id === ids[0]);
    const them = scene.characters.find((x) => x.id === target);
    if (them) push({ verb: 'face', dir: them.x < me.x ? 'left' : 'right' });
    push({ verb: 'pose', pose: 'swing' });
  } else if (/^(?:falls?|dies?|collapses?|goes down)/.test(verbText)) {
    push({ verb: 'pose', pose: 'fall' });
  } else if (/^(?:appears?)/.test(verbText)) {
    push({ verb: 'appear' });
  } else if (/^(?:disappears?|vanishes?)/.test(verbText)) {
    push({ verb: 'disappear' });
  } else if ((v = verbText.match(/^(?:pose\s+|is\s+|looks\s+|gets\s+|starts\s+(?:to\s+)?)?(\w+?)(?:s|es|ing)?(?:\s+for\s+([\d.]+)\s*s?)?$/)) && poseName(v[1])) {
    push({ verb: 'pose', pose: poseName(v[1]), duration: v[2] ? parseFloat(v[2]) : undefined });
  } else {
    warnings.push(`Unknown action: "${line}" (verbs: walk/run/shamble/sneak to (x, y), enter from left/right, exit left/right, face left/right, attack <name>, fall, or a pose: ${Object.keys(POSES).join(', ')})`);
  }
}

function poseName(word) {
  const w = word.toLowerCase();
  const map = { hid: 'hide', crouche: 'crouch', scar: 'scared', point: 'point', wav: 'wave', talk: 'talk', screa: 'scream', cheer: 'cheer', eat: 'eat', sit: 'sit', think: 'think', aim: 'aim', push: 'push', hurt: 'hurt', look: 'look', hold: 'hold' };
  if (POSES[w]) return w;
  if (POSES[w.replace(/e$/, '')]) return w.replace(/e$/, '');
  return map[w] && POSES[map[w]] ? map[w] : null;
}

// Survivors get a name tag the first time they appear in the episode.
function markFirstAppearances(scenes) {
  const seen = new Set();
  for (const s of scenes) {
    for (const c of s.characters) {
      const k = key(c.name);
      if (/zombie|runner|infected/.test(k) || c.group) continue;
      if (!seen.has(k)) {
        c.showName = true;
        seen.add(k);
      }
    }
  }
}
