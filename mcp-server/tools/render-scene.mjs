import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject, getProjectDirs } from '../../src/project.mjs';
import { renderScene } from '../../src/render-engine.mjs';

export const renderSceneTool = {
  definition: {
    name: 'render-scene',
    description: 'Render a single scene as an MP4 video. Automatically applies entrance animations (fade in) for characters, positions them according to the script, overlays backgrounds, and burns in subtitles if a transcript is available.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project identifier',
        },
        sceneId: {
          type: 'string',
          description: 'Scene identifier. Example: "scene-01"',
        },
        quality: {
          type: 'string',
          enum: ['preview', 'final'],
          description: 'preview = fast, lower quality (CRF 28). final = slow, high quality (CRF 18).',
          default: 'preview',
        },
      },
      required: ['projectId', 'sceneId'],
    },
  },

  async execute(args) {
    const project = loadProject(args.projectId);
    const dirs = getProjectDirs(args.projectId);
    
    const scenePath = join(dirs.scenes, `${args.sceneId}.json`);
    if (!existsSync(scenePath)) {
      throw new Error(`Scene not found: ${args.sceneId}. Run parse-script first.`);
    }

    const scene = JSON.parse(readFileSync(scenePath, 'utf8'));
    
    // Auto-apply entrance animations if not already set
    const sceneWithAnimations = applyEntranceAnimations(scene);
    
    // Check for transcript and link it
    const sceneWithSubtitles = linkTranscript(sceneWithAnimations, dirs);
    
    const outputPath = join(
      dirs[args.quality === 'final' ? 'final' : 'preview'],
      `${args.sceneId}.mp4`
    );

    console.error(`Rendering ${args.sceneId}: ${scene.title || 'Untitled'} (${scene.duration}s)`);
    
    await renderScene(sceneWithSubtitles, project, dirs, {
      quality: args.quality || 'preview',
      outputPath,
    });

    return {
      success: true,
      sceneId: args.sceneId,
      outputPath,
      quality: args.quality || 'preview',
      duration: scene.duration,
      characters: scene.characters?.map(c => c.id) || [],
      nextSteps: [
        'Review the rendered scene',
        'Render other scenes, or run assemble to join them all',
      ],
    };
  },
};

export function applyEntranceAnimations(scene) {
  if (!scene.characters) return scene;

  const animatedChars = scene.characters.map((char, idx) => {
    // Skip if already has animations
    if (char.animations && char.animations.length > 0) return char;

    // Simple fade-in entrance
    const fadeDuration = 0.5;
    const entranceDelay = idx * 0.3; // Stagger by 0.3s per character

    return {
      ...char,
      animations: [
        {
          startTime: entranceDelay,
          endTime: entranceDelay + fadeDuration,
          properties: {
            opacity: 1,
          },
          easing: 'ease-out',
        },
      ],
      initialState: {
        ...(char.initialState || {}),
        opacity: 0, // Start invisible
      },
    };
  });

  return {
    ...scene,
    characters: animatedChars,
  };
}

function linkTranscript(scene, dirs) {
  // If scene has narration with audioFile, look for matching transcript
  if (scene.narration?.audioFile) {
    const baseName = scene.narration.audioFile.replace(/\.[^/.]+$/, '');
    const transcriptPath = join(dirs.root, 'assets', 'transcripts', `${baseName}.json`);
    
    if (existsSync(transcriptPath)) {
      return {
        ...scene,
        narration: {
          ...scene.narration,
          transcriptFile: `assets/transcripts/${baseName}.json`,
        },
      };
    }
  }

  return scene;
}
