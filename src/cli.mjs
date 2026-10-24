#!/usr/bin/env node
import { createProject, loadProject, deleteProject, listProjects, getProjectDirs, saveProject } from './project.mjs';
import { syncRegistry } from './asset-registry.mjs';
import { parseScript, interactiveScriptBuilder } from './script-parser.mjs';
import { generateScenePlan, loadScenePlan } from './scene-planner.mjs';
import { renderScene, renderProject } from './render-engine.mjs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const command = process.argv[2];
const args = process.argv.slice(3);

function printUsage() {
  console.log(`
free247editor Automation Engine CLI

Usage: node src/cli.mjs <command> [options]

Commands:
  create-project <id> [--name <name>] [--format <format>]    Create a new project
  list-projects                                              List all projects
  delete-project <id>                                        Delete a project
  sync-assets                                                Sync shared asset registry
  import-script <project-id> <script.md>                     Import a script file
  build-scenes <project-id>                                  Interactive scene builder
  plan <project-id>                                          Generate/update scene plan
  render <project-id> [--quality <preview|final>]            Render all scenes
  render-scene <project-id> <scene-id> [--quality <q>]       Render a single scene
  status <project-id>                                        Show project status
  help                                                       Show this help

Examples:
  node src/cli.mjs create-project zombie-in-manila --format vertical
  node src/cli.mjs import-script zombie-in-manila script.md
  node src/cli.mjs render zombie-in-manila --quality final
`);
}

async function main() {
  try {
    switch (command) {
      case 'create-project': {
        const id = args[0];
        const nameIndex = args.indexOf('--name');
        const name = nameIndex >= 0 ? args[nameIndex + 1] : undefined;
        const formatIndex = args.indexOf('--format');
        const format = formatIndex >= 0 ? args[formatIndex + 1] : 'vertical';

        const project = createProject(id, { name, format });
        console.log(`Created project: ${project.name} (${project.id})`);
        console.log(`Format: ${project.format} (${project.resolution.width}x${project.resolution.height})`);
        console.log(`Location: projects/${project.id}/`);
        break;
      }

      case 'list-projects': {
        const projects = listProjects();
        if (projects.length === 0) {
          console.log('No projects found.');
          break;
        }
        console.log('\nProjects:');
        for (const p of projects) {
          const status = p.incomplete ? ' (incomplete)' : '';
          const scenes = p.scenes?.length || 0;
          console.log(`  ${p.id}${status} - ${p.name} (${p.format}, ${scenes} scenes)`);
        }
        break;
      }

      case 'delete-project': {
        const id = args[0];
        deleteProject(id);
        console.log(`Deleted project: ${id}`);
        break;
      }

      case 'sync-assets': {
        const registry = syncRegistry();
        const counts = {};
        for (const [type, assets] of Object.entries(registry.assets)) {
          counts[type] = Object.keys(assets).length;
        }
        console.log('Asset registry synced.');
        console.log('Counts:', counts);
        break;
      }

      case 'import-script': {
        const projectId = args[0];
        const scriptPath = args[1];
        const project = loadProject(projectId);
        const dirs = getProjectDirs(projectId);

        const scenes = await parseScript(scriptPath);
        for (const scene of scenes) {
          const scenePath = join(dirs.scenes, `${scene.id}.json`);
          const fs = await import('node:fs');
          fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
        }

        project.scenes = scenes.map(s => s.id);
        project.updated = new Date().toISOString();
        saveProject(project);

        console.log(`Imported ${scenes.length} scenes from ${scriptPath}`);
        break;
      }

      case 'build-scenes': {
        const projectId = args[0];
        const project = loadProject(projectId);
        const dirs = getProjectDirs(projectId);
        const scenes = await interactiveScriptBuilder(projectId, dirs);

        project.scenes = scenes.map(s => s.id);
        project.updated = new Date().toISOString();
        saveProject(project);

        console.log(`\nCreated ${scenes.length} scenes.`);
        console.log(`Next: Run "node src/cli.mjs plan ${projectId}" to generate the scene plan.`);
        break;
      }

      case 'plan': {
        const projectId = args[0];
        const project = loadProject(projectId);
        const plan = await generateScenePlan(project);
        console.log(`Scene plan generated.`);
        console.log(`Total duration: ${plan.totalDuration.toFixed(1)}s`);
        console.log(`Scenes: ${plan.scenes.length}`);
        console.log(`Assets used: ${Object.keys(plan.assetUsage).length}`);
        break;
      }

      case 'render': {
        const projectId = args[0];
        const qualityIndex = args.indexOf('--quality');
        const quality = qualityIndex >= 0 ? args[qualityIndex + 1] : 'preview';

        const project = loadProject(projectId);
        const dirs = getProjectDirs(projectId);

        console.log(`Rendering project: ${project.name} (${quality} quality)`);
        const outputPath = await renderProject(project, dirs, { quality });
        console.log(`\nRender complete: ${outputPath}`);
        break;
      }

      case 'render-scene': {
        const projectId = args[0];
        const sceneId = args[1];
        const qualityIndex = args.indexOf('--quality');
        const quality = qualityIndex >= 0 ? args[qualityIndex + 1] : 'preview';

        const project = loadProject(projectId);
        const dirs = getProjectDirs(projectId);
        const scenePath = join(dirs.scenes, `${sceneId}.json`);

        if (!existsSync(scenePath)) {
          throw new Error(`Scene not found: ${sceneId}`);
        }

        const fs = await import('node:fs');
        const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
        const outputPath = join(dirs.preview, `${sceneId}.mp4`);

        console.log(`Rendering scene: ${scene.title || sceneId}`);
        await renderScene(scene, project, dirs, { quality, outputPath });
        console.log(`Output: ${outputPath}`);
        break;
      }

      case 'status': {
        const projectId = args[0];
        const project = loadProject(projectId);
        const dirs = getProjectDirs(projectId);
        const plan = loadScenePlan(projectId);

        console.log(`\nProject: ${project.name} (${project.id})`);
        console.log(`Format: ${project.format} (${project.resolution.width}x${project.resolution.height} @ ${project.fps}fps)`);
        console.log(`Scenes: ${project.scenes?.length || 0}`);
        console.log(`Total Duration: ${plan?.totalDuration?.toFixed(1) || 'N/A'}s`);

        const fs = await import('node:fs');
        const previewExists = existsSync(join(dirs.preview, `${project.id}-preview.mp4`));
        const finalExists = existsSync(join(dirs.final, `${project.id}-final.mp4`));

        console.log(`Preview Render: ${previewExists ? 'YES' : 'NO'}`);
        console.log(`Final Render: ${finalExists ? 'YES' : 'NO'}`);
        break;
      }

      case 'help':
      default:
        printUsage();
        break;
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
