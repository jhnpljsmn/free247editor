import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject, getProjectDirs } from '../../src/project.mjs';

export const statusTool = {
  definition: {
    name: 'status',
    description: 'Show the current state of a project: which scenes exist, which assets are present, what has been rendered, and what is missing.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project identifier',
        },
      },
      required: ['projectId'],
    },
  },

  async execute(args) {
    const project = loadProject(args.projectId);
    const dirs = getProjectDirs(args.projectId);

    // Check scenes
    const scenes = [];
    for (const sceneId of project.scenes) {
      const scenePath = join(dirs.scenes, `${sceneId}.json`);
      const exists = existsSync(scenePath);
      scenes.push({
        id: sceneId,
        exists,
        rendered: {
          preview: existsSync(join(dirs.preview, `${sceneId}.mp4`)),
          final: existsSync(join(dirs.final, `${sceneId}.mp4`)),
        },
      });
    }

    // Check assets
    const assets = {
      characters: listFiles(dirs.characters),
      backgrounds: listFiles(dirs.backgrounds),
      sounds: listFiles(dirs.sounds),
      voiceovers: listFiles(dirs.voiceovers),
    };

    // Check final outputs
    const previewFinal = join(dirs.preview, `${project.id}-preview.mp4`);
    const finalFinal = join(dirs.final, `${project.id}-final.mp4`);

    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        format: project.format,
        resolution: project.resolution,
        fps: project.fps,
      },
      scenes,
      assets,
      outputs: {
        previewExists: existsSync(previewFinal),
        finalExists: existsSync(finalFinal),
        previewPath: existsSync(previewFinal) ? previewFinal : null,
        finalPath: existsSync(finalFinal) ? finalFinal : null,
      },
      readyToRender: scenes.every(s => s.exists),
      missingAssets: findMissingAssets(project, dirs),
    };
  },
};

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter(f => {
      const stat = statSync(join(dir, f));
      return stat.isFile();
    });
  } catch {
    return [];
  }
}

function findMissingAssets(project, dirs) {
  const missing = [];
  
  for (const sceneId of project.scenes) {
    const scenePath = join(dirs.scenes, `${sceneId}.json`);
    if (!existsSync(scenePath)) continue;
    
    const scene = JSON.parse(readFileSync(scenePath, 'utf8'));
    
    // Check backgrounds
    if (scene.background?.asset && !scene.background.asset.startsWith('#')) {
      const bgPath = join(dirs.backgrounds, scene.background.asset.replace('backgrounds/', ''));
      if (!existsSync(bgPath)) missing.push(`Background: ${scene.background.asset}`);
    }
    
    // Check characters
    for (const char of scene.characters || []) {
      const charPath = join(dirs.characters, char.asset.replace('characters/', ''));
      if (!existsSync(charPath)) missing.push(`Character: ${char.asset}`);
    }
    
    // Check voiceovers
    if (scene.narration?.audioFile) {
      const voPath = join(dirs.voiceovers, scene.narration.audioFile);
      if (!existsSync(voPath)) missing.push(`Voiceover: ${scene.narration.audioFile}`);
    }
  }
  
  return [...new Set(missing)];
}
