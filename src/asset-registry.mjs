import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharedAssetsDir = join(root, 'shared-assets');
const registryPath = join(sharedAssetsDir, 'registry.json');

function loadRegistry() {
  if (!existsSync(registryPath)) {
    return { version: '1.0.0', updated: new Date().toISOString(), assets: {} };
  }
  return JSON.parse(readFileSync(registryPath, 'utf8'));
}

function saveRegistry(registry) {
  registry.updated = new Date().toISOString();
  writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

export function registerAsset(type, id, metadata) {
  const registry = loadRegistry();
  if (!registry.assets[type]) {
    registry.assets[type] = {};
  }
  registry.assets[type][id] = {
    id,
    ...metadata,
    registeredAt: new Date().toISOString()
  };
  saveRegistry(registry);
  return registry.assets[type][id];
}

export function getAsset(type, id) {
  const registry = loadRegistry();
  return registry.assets[type]?.[id] || null;
}

export function listAssets(type) {
  const registry = loadRegistry();
  if (!type) return registry.assets;
  return registry.assets[type] || {};
}

export function unregisterAsset(type, id) {
  const registry = loadRegistry();
  if (registry.assets[type]?.[id]) {
    delete registry.assets[type][id];
    saveRegistry(registry);
    return true;
  }
  return false;
}

export function scanAssets(type) {
  const dir = join(sharedAssetsDir, type);
  if (!existsSync(dir)) return {};

  const files = readdirSync(dir);
  const results = {};

  for (const file of files) {
    if (file.startsWith('.')) continue;
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isFile()) {
      const ext = file.split('.').pop().toLowerCase();
      const id = file.replace(/\.[^/.]+$/, '');
      results[id] = {
        id,
        filename: file,
        path: `shared-assets/${type}/${file}`,
        size: stat.size,
        type: ext
      };
    }
  }

  return results;
}

// Sprites per character: shared-assets/cast/<character>/<pose>-<expression>.png
function scanSprites() {
  const dir = join(sharedAssetsDir, 'cast');
  const results = {};
  if (!existsSync(dir)) return results;
  for (const id of readdirSync(dir)) {
    if (!statSync(join(dir, id)).isDirectory()) continue;
    const looks = readdirSync(join(dir, id)).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)).sort();
    if (looks.length) results[id] = { id, path: `shared-assets/cast/${id}/`, looks };
  }
  return results;
}

export function syncRegistry() {
  const registry = loadRegistry();
  // Rebuilt from disk each time, so deleted files drop out.
  registry.assets = { sprites: scanSprites(), backgrounds: scanAssets('backgrounds'), sounds: scanAssets('sounds') };

  saveRegistry(registry);
  return registry;
}
