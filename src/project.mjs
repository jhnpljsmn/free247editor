import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectsDir = join(root, 'projects');

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function getProjectPath(projectId) {
  return join(projectsDir, projectId);
}

function getProjectConfigPath(projectId) {
  return join(getProjectPath(projectId), 'project.json');
}

export function createProject(id, { name, description = '', format = 'vertical' } = {}) {
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    throw new Error('Project ID must be kebab-case (lowercase letters, numbers, hyphens only)');
  }

  const projectPath = getProjectPath(id);
  if (existsSync(projectPath)) {
    throw new Error(`Project "${id}" already exists`);
  }

  const resolutions = {
    vertical: { width: 1080, height: 1920 },
    horizontal: { width: 1920, height: 1080 },
    square: { width: 1080, height: 1080 }
  };

  const now = new Date().toISOString();
  const project = {
    id,
    name: name || id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description,
    created: now,
    updated: now,
    format,
    resolution: resolutions[format] || resolutions.vertical,
    fps: 30,
    scenes: [],
    assets: {
      characters: [],
      backgrounds: [],
      sounds: []
    }
  };

  ensureDir(projectPath);
  ensureDir(join(projectPath, 'scenes'));
  ensureDir(join(projectPath, 'assets'));
  ensureDir(join(projectPath, 'assets', 'characters'));
  ensureDir(join(projectPath, 'assets', 'backgrounds'));
  ensureDir(join(projectPath, 'assets', 'sounds'));
  ensureDir(join(projectPath, 'assets', 'voiceovers'));
  ensureDir(join(projectPath, 'renders'));
  ensureDir(join(projectPath, 'renders', 'preview'));
  ensureDir(join(projectPath, 'renders', 'final'));

  writeFileSync(getProjectConfigPath(id), JSON.stringify(project, null, 2));

  return project;
}

export function loadProject(id) {
  const path = getProjectConfigPath(id);
  if (!existsSync(path)) {
    throw new Error(`Project "${id}" not found`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function saveProject(project) {
  project.updated = new Date().toISOString();
  writeFileSync(getProjectConfigPath(project.id), JSON.stringify(project, null, 2));
}

export function deleteProject(id) {
  const path = getProjectPath(id);
  if (!existsSync(path)) {
    throw new Error(`Project "${id}" not found`);
  }
  rmSync(path, { recursive: true, force: true });
}

export function listProjects() {
  if (!existsSync(projectsDir)) return [];
  return readdirSync(projectsDir)
    .filter(name => statSync(join(projectsDir, name)).isDirectory())
    .map(id => {
      try {
        return loadProject(id);
      } catch {
        return { id, name: id, incomplete: true };
      }
    });
}

export function getProjectDirs(id) {
  const base = getProjectPath(id);
  return {
    root: base,
    scenes: join(base, 'scenes'),
    assets: join(base, 'assets'),
    characters: join(base, 'assets', 'characters'),
    backgrounds: join(base, 'assets', 'backgrounds'),
    sounds: join(base, 'assets', 'sounds'),
    voiceovers: join(base, 'assets', 'voiceovers'),
    renders: join(base, 'renders'),
    preview: join(base, 'renders', 'preview'),
    final: join(base, 'renders', 'final')
  };
}
