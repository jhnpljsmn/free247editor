#!/usr/bin/env node
import { createProject, loadProject, deleteProject, listProjects, getProjectDirs, saveProject } from './project.mjs';
import { syncRegistry } from './asset-registry.mjs';
import { parseEpisodeFile } from './script-parser.mjs';
import { renderScene, renderEpisode } from './stick/renderer.mjs';
import { renderCastSheet } from './stick/castsheet.mjs';
import { checkProject, writeVoiceLines } from './check.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const flag = (name) => args.includes(name);
const option = (name, fallback) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : fallback);

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
  import-script <project-id> [script.md]                     Import a script (default: projects/<id>/script.md)
  voice-lines <project-id>                                   Write voiceover-lines.txt for ElevenLabs
  check <project-id>                                         Report script problems and missing files
  render <project-id> [--quality <preview|final>]            Render the episode to outbox/
         [--scenes scene-02,scene-05] [--force] [--no-transcribe]
  render-scene <project-id> <scene-id> [--quality <q>]       Render a single scene
  cast-sheet                                                 Draw the character worksheet PNG
  status <project-id>                                        Show project status
  help                                                       Show this help

Examples:
  node src/cli.mjs create-project zombie-in-manila --format vertical
  node src/cli.mjs import-script manila-ep01
  node src/cli.mjs check manila-ep01
  node src/cli.mjs render manila-ep01 --quality final
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
        const project = loadProject(projectId);
        const dirs = getProjectDirs(projectId);
        const scriptPath = args[1] && !args[1].startsWith('--') ? args[1] : join(dirs.root, 'script.md');

        const { meta, scenes } = await parseEpisodeFile(scriptPath);
        mkdirSync(dirs.scenes, { recursive: true });
        for (const f of readdirSync(dirs.scenes)) {
          if (/^scene-\d+\.json$/.test(f) && !scenes.some((s) => `${s.id}.json` === f)) {
            (await import('node:fs')).rmSync(join(dirs.scenes, f));
          }
        }
        for (const scene of scenes) {
          writeFileSync(join(dirs.scenes, `${scene.id}.json`), JSON.stringify(scene, null, 2));
        }

        project.scenes = scenes.map(s => s.id);
        if (meta.title) project.name = meta.title;
        project.music = meta.music;
        saveProject(project);

        const warnings = scenes.reduce((n, s) => n + s.warnings.length, 0);
        console.log(`Imported ${scenes.length} scenes${warnings ? `, ${warnings} warning(s) — run check` : ''}.`);
        break;
      }

      case 'voice-lines': {
        const project = loadProject(args[0]);
        const { path, count } = writeVoiceLines(project, getProjectDirs(args[0]));
        console.log(`Wrote ${count} voiceover lines to ${path}`);
        break;
      }

      case 'check': {
        const project = loadProject(args[0]);
        const { problems, missingVoice } = checkProject(project, getProjectDirs(args[0]));
        for (const p of problems) console.log(`- ${p}`);
        if (missingVoice.length) console.log(`- missing voiceovers (${missingVoice.length}): ${missingVoice.map((v) => v.split('/').pop()).join(', ')}`);
        if (!problems.length && !missingVoice.length) console.log('All good. Ready to render.');
        break;
      }

      case 'cast-sheet': {
        console.log(`Cast sheet: ${renderCastSheet()}`);
        break;
      }

      case 'render': {
        const projectId = args[0];
        const quality = option('--quality', 'preview');
        const project = loadProject(projectId);
        const dirs = getProjectDirs(projectId);
        const only = option('--scenes', null)?.split(',');

        console.log(`Rendering ${project.name} (${quality})`);
        const started = Date.now();
        const { path, duration } = await renderEpisode(project, dirs, { quality, only, force: flag('--force'), transcribe: !flag('--no-transcribe') });

        const outbox = join(root, 'outbox');
        mkdirSync(outbox, { recursive: true });
        let out = join(outbox, `${projectId}-final.mp4`);
        if (quality !== 'final') {
          let v = 1;
          while (existsSync(join(outbox, `${projectId}-v${v}.mp4`))) v++;
          out = join(outbox, `${projectId}-v${v}.mp4`);
        }
        copyFileSync(path, out);
        console.log(`Done: ${out} (${duration.toFixed(1)}s video, rendered in ${((Date.now() - started) / 1000).toFixed(0)}s)`);
        break;
      }

      case 'render-scene': {
        const projectId = args[0];
        const sceneId = args[1];
        const quality = option('--quality', 'preview');
        const project = loadProject(projectId);
        const dirs = getProjectDirs(projectId);
        const scenePath = join(dirs.scenes, `${sceneId}.json`);

        if (!existsSync(scenePath)) {
          throw new Error(`Scene not found: ${sceneId}`);
        }

        const scene = JSON.parse(readFileSync(scenePath, 'utf8'));
        const outputPath = join(quality === 'final' ? dirs.final : dirs.preview, `${sceneId}.mp4`);

        const r = await renderScene(scene, project, dirs, { quality, outputPath, force: true, transcribe: !flag('--no-transcribe') });
        console.log(`Output: ${outputPath} (${r.duration.toFixed(1)}s)`);
        break;
      }

      case 'status': {
        const project = loadProject(args[0]);
        const outbox = join(root, 'outbox');
        const drafts = existsSync(outbox) ? readdirSync(outbox).filter((f) => f.startsWith(`${project.id}-v`)) : [];

        console.log(`\nProject: ${project.name} (${project.id})`);
        console.log(`Format: ${project.format} (${project.resolution.width}x${project.resolution.height} @ ${project.fps}fps)`);
        console.log(`Scenes: ${project.scenes?.length || 0}`);
        console.log(`Preview drafts: ${drafts.length}`);
        console.log(`Final Render: ${existsSync(join(outbox, `${project.id}-final.mp4`)) ? 'YES' : 'NO'}`);
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
