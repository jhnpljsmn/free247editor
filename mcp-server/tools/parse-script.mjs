import { parseMarkdownScript } from '../../src/script-parser.mjs';
import { loadProject, saveProject, getProjectDirs } from '../../src/project.mjs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

export const parseScriptTool = {
  definition: {
    name: 'parse-script',
    description: 'Parse a markdown script file into structured scene JSON files. The script describes scenes with characters, backgrounds, narration, sound effects, and music. Characters are positioned via the script.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project identifier',
        },
        scriptMarkdown: {
          type: 'string',
          description: 'The full markdown script content. Format: ## Scene N: Title, **Duration:** seconds, **Background:** path, **Characters:** - Name @ (x,y) scale:N, **Narration:** text, **SFX:** - file.mp3 @ timestamp, **Music:** file.mp3, **Transition:** in -> out',
        },
      },
      required: ['projectId', 'scriptMarkdown'],
    },
  },

  async execute(args) {
    const project = loadProject(args.projectId);
    const dirs = getProjectDirs(args.projectId);

    const scenes = parseMarkdownScript(args.scriptMarkdown);

    // Write each scene to its own JSON file
    for (const scene of scenes) {
      const scenePath = join(dirs.scenes, `${scene.id}.json`);
      writeFileSync(scenePath, JSON.stringify(scene, null, 2));
    }

    // Update project with scene list
    project.scenes = scenes.map(s => s.id);
    saveProject(project);

    return {
      success: true,
      scenesCreated: scenes.length,
      sceneIds: scenes.map(s => s.id),
      sceneSummaries: scenes.map(s => ({
        id: s.id,
        title: s.title,
        duration: s.duration,
        characters: s.characters?.map(c => c.id) || [],
        narration: s.narration?.text?.substring(0, 50) + '...',
      })),
      assetsNeeded: detectRequiredAssets(scenes),
      nextSteps: [
        'Place character SVGs, backgrounds, sounds into assets/ folder',
        'Add voiceover MP3s to assets/voiceovers/',
        'Run transcribe to generate subtitles from voiceovers',
        'Run render-scene for preview, or assemble for final export',
      ],
    };
  },
};

function detectRequiredAssets(scenes) {
  const assets = {
    characters: new Set(),
    backgrounds: new Set(),
    sounds: new Set(),
    voiceovers: new Set(),
  };

  for (const scene of scenes) {
    // Characters
    for (const char of scene.characters || []) {
      assets.characters.add(char.asset);
    }
    // Backgrounds
    if (scene.background?.asset && !scene.background.asset.startsWith('#')) {
      assets.backgrounds.add(scene.background.asset);
    }
    // Sound effects
    for (const sfx of scene.soundEffects || []) {
      assets.sounds.add(sfx.asset);
    }
    // Music
    if (scene.music?.asset) {
      assets.sounds.add(scene.music.asset);
    }
    // Voiceovers
    if (scene.narration?.audioFile) {
      assets.voiceovers.add(scene.narration.audioFile);
    }
  }

  return {
    characters: [...assets.characters],
    backgrounds: [...assets.backgrounds],
    sounds: [...assets.sounds],
    voiceovers: [...assets.voiceovers],
  };
}
