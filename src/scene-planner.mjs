import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export async function generateScenePlan(project, { useAI = false, provider = null } = {}) {
  const dirs = {
    scenes: join('projects', project.id, 'scenes'),
    plan: join('projects', project.id, 'scenes', 'plan.json')
  };

  const plan = {
    projectId: project.id,
    version: '1.0.0',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    totalDuration: 0,
    scenes: [],
    assetUsage: {}
  };

  // Load all scene files
  const sceneFiles = [];
  try {
    const fs = await import('node:fs');
    const files = fs.readdirSync(dirs.scenes).filter(f => f.endsWith('.json') && f !== 'plan.json');
    for (const file of files.sort()) {
      const scene = JSON.parse(fs.readFileSync(join(dirs.scenes, file), 'utf8'));
      sceneFiles.push(scene);
    }
  } catch {
    // No scenes yet
  }

  let totalDuration = 0;
  const assetUsage = {};

  for (const scene of sceneFiles) {
    plan.scenes.push(scene.id);
    totalDuration += scene.duration;

    // Track asset usage
    ['characters', 'background', 'soundEffects', 'music'].forEach(type => {
      const assets = type === 'characters'
        ? scene.characters?.map(c => c.asset) || []
        : type === 'background'
        ? [scene.background?.asset]
        : type === 'soundEffects'
        ? scene.soundEffects?.map(s => s.asset) || []
        : scene.music ? [scene.music.asset] : [];

      for (const asset of assets) {
        if (!asset) continue;
        if (!assetUsage[asset]) assetUsage[asset] = [];
        assetUsage[asset].push(scene.id);
      }
    });
  }

  plan.totalDuration = totalDuration;
  plan.assetUsage = assetUsage;

  // Save plan
  writeFileSync(dirs.plan, JSON.stringify(plan, null, 2));

  return plan;
}

export function loadScenePlan(projectId) {
  const planPath = join('projects', projectId, 'scenes', 'plan.json');
  if (!existsSync(planPath)) {
    return null;
  }
  return JSON.parse(readFileSync(planPath, 'utf8'));
}

export function validateScenePlan(plan, project) {
  const errors = [];

  if (!plan.scenes || plan.scenes.length === 0) {
    errors.push('No scenes in plan');
  }

  if (plan.totalDuration > 300) {
    errors.push('Total duration exceeds 5 minutes (300s)');
  }

  for (const sceneId of plan.scenes) {
    const scenePath = join('projects', project.id, 'scenes', `${sceneId}.json`);
    if (!existsSync(scenePath)) {
      errors.push(`Scene file missing: ${sceneId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
