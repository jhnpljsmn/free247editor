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

export function syncRegistry() {
  const registry = loadRegistry();
  const types = ['characters', 'backgrounds', 'sounds', 'animations'];

  for (const type of types) {
    const scanned = scanAssets(type);
    for (const [id, data] of Object.entries(scanned)) {
      if (!registry.assets[type]) registry.assets[type] = {};
      if (!registry.assets[type][id]) {
        registry.assets[type][id] = data;
      } else {
        registry.assets[type][id] = { ...registry.assets[type][id], ...data };
      }
    }
  }

  saveRegistry(registry);
  return registry;
}
