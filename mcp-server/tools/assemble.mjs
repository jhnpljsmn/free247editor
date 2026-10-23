import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject, getProjectDirs } from '../../src/project.mjs';
import { renderScene } from '../../src/render-engine.mjs';
import { runFFmpeg } from '../../src/utils/paths.mjs';

export const assembleTool = {
  definition: {
    name: 'assemble',
    description: 'Assemble all scenes into a final MP4 video. Concatenates rendered scenes, mixes audio (narration + music + SFX with automatic ducking), and burns in subtitles. Asks user to confirm format before exporting.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project identifier',
        },
        format: {
          type: 'string',
          enum: ['vertical', 'horizontal'],
          description: 'Export format. Claude should ask the user before exporting: "Do you want vertical 9:16 (Reels/TikTok) or horizontal 16:9 (YouTube)?"',
        },
        quality: {
          type: 'string',
          enum: ['preview', 'final'],
          description: 'preview = fast/low quality for review. final = slow/high quality for delivery.',
          default: 'final',
        },
      },
      required: ['projectId', 'format'],
    },
  },

  async execute(args) {
    const project = loadProject(args.projectId);
    const dirs = getProjectDirs(args.projectId);
    const quality = args.quality || 'final';
    const outputDir = quality === 'final' ? dirs.final : dirs.preview;
    mkdirSync(outputDir, { recursive: true });

    // Update project format if different
    if (project.format !== args.format) {
      const resolutions = {
        vertical: { width: 1080, height: 1920 },
        horizontal: { width: 1920, height: 1080 },
      };
      project.format = args.format;
      project.resolution = resolutions[args.format];
      // Re-save project
      const { saveProject } = await import('../../src/project.mjs');
      saveProject(project);
    }

    // Render all scenes
    const sceneVideos = [];
    for (const sceneId of project.scenes) {
      const scenePath = join(dirs.scenes, `${sceneId}.json`);
      if (!existsSync(scenePath)) {
        console.error(`Warning: Scene ${sceneId} not found, skipping`);
        continue;
      }

      const scene = JSON.parse(readFileSync(scenePath, 'utf8'));
      const sceneOutput = join(outputDir, `${sceneId}.mp4`);

      // Skip if already rendered and not forcing re-render
      if (existsSync(sceneOutput) && quality === 'preview') {
        console.error(`Using cached: ${sceneOutput}`);
        sceneVideos.push(sceneOutput);
        continue;
      }

      console.error(`Rendering scene: ${scene.title || sceneId} (${scene.duration}s)`);
      
      // Apply auto-animations and transcript linking
      const { applyEntranceAnimations } = await import('./render-scene.mjs');
      const sceneWithAnimations = applyEntranceAnimations(scene);
      
      await renderScene(sceneWithAnimations, project, dirs, {
        quality,
        outputPath: sceneOutput,
      });
      
      sceneVideos.push(sceneOutput);
    }

    if (sceneVideos.length === 0) {
      throw new Error('No scenes to assemble');
    }

    // Concatenate all scenes
    const finalPath = join(outputDir, `${project.id}-${quality}.mp4`);
    await concatenateScenes(sceneVideos, finalPath, dirs.root);

    // Get file stats
    const { statSync } = await import('node:fs');
    const stats = statSync(finalPath);

    return {
      success: true,
      projectId: args.projectId,
      format: args.format,
      quality,
      outputPath: finalPath,
      scenesAssembled: sceneVideos.length,
      fileSize: `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
      nextSteps: [
        'Review the final MP4',
        'If changes needed, modify scene JSON files and run assemble again',
        'To start a new episode, run create-project',
      ],
    };
  },
};

async function concatenateScenes(sceneVideos, outputPath, cwd) {
  if (sceneVideos.length === 1) {
    const { copyFileSync } = await import('node:fs');
    copyFileSync(sceneVideos[0], outputPath);
    return;
  }

  const concatContent = sceneVideos.map(p => `file '${p}'`).join('\n');
  const concatFile = join(outputPath, '..', '.concat.txt');
  writeFileSync(concatFile, concatContent);

  runFFmpeg([
    '-y', '-loglevel', 'warning',
    '-f', 'concat', '-safe', '0', '-i', concatFile,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k',
    outputPath,
  ], { cwd });
}
