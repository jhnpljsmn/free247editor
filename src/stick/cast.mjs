// Character sheets: one JSON per character in shared-assets/cast/ (series-wide), optionally
// overridden per project in projects/<id>/cast/. Scripts refer to characters by name.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SHARED_CAST_DIR = join(root, 'shared-assets', 'cast');

const DEFAULT_PERSON = { color: '#e8e8e8', headFill: '#f4f1ea', height: 1, build: 'normal', hair: 'short' };
const DEFAULT_ZOMBIE = { color: '#6fae4f', headFill: '#b9d9a0', shirt: '#55643f', height: 1, build: 'normal', hair: 'none', zombie: true };

export const key = (name) => name.toLowerCase().trim().replace(/\s+/g, '-');

function readDir(dir, cast) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const sheet = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    sheet.id = sheet.id || key(f.replace(/\.json$/, ''));
    cast.set(sheet.id, sheet);
    for (const a of sheet.aliases || []) cast.set(key(a), sheet);
  }
}

export function loadCast(projectRoot) {
  const cast = new Map();
  readDir(SHARED_CAST_DIR, cast);
  if (projectRoot) readDir(join(projectRoot, 'cast'), cast);
  return cast;
}

// "Zombie 3" / "zombie-3" / "Zombies" → the "zombie" sheet. Returns null when unknown.
export function findSheet(cast, name) {
  const k = key(name);
  if (cast.has(k)) return cast.get(k);
  const base = k.replace(/-?\d+$/, '').replace(/s$/, '');
  if (cast.has(base)) return cast.get(base);
  return null;
}

export function sheetOrDefault(cast, name) {
  return findSheet(cast, name) || (/zombie|undead|infected/i.test(name)
    ? { ...DEFAULT_ZOMBIE, id: key(name), name }
    : { ...DEFAULT_PERSON, id: key(name), name });
}

export function uniqueSheets(cast) {
  return [...new Set(cast.values())];
}
