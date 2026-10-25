#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Apps launched outside a terminal (Claude Desktop, editors) often lack Homebrew on PATH.
for (const dir of ['/opt/homebrew/bin', '/usr/local/bin']) {
  if (existsSync(dir) && !(process.env.PATH || '').split(':').includes(dir)) {
    process.env.PATH = `${dir}:${process.env.PATH || ''}`;
  }
}

const { assembleEpisode, checkEpisode } = await import('./assemble.mjs');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projects = join(root, 'projects');
const [command, ep] = process.argv.slice(2);
const args = process.argv.slice(3);
const flag = (name) => args.includes(name);
const option = (name, fallback) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : fallback);

function printUsage() {
  console.log(`
Doommates episode assembler

Usage: node src/cli.mjs <command> [options]

Commands:
  create-project <ep>                            Make projects/<ep>/ (scenes/, production/)
  list-projects                                  List episodes
  delete-project <ep>                            Delete an episode folder
  check <ep>                                     List missing images, narration or voiceover.mp3
  assemble <ep> [--wide] [--quality final]       Build outbox/<ep>-vN.mp4 (9:16; --wide for 16:9)
`);
}

try {
  switch (command) {
    case 'create-project': {
      if (!ep || !/^[a-z0-9-]+$/.test(ep)) throw new Error('Episode id must be kebab-case, e.g. doommates-ep01');
      for (const sub of ['scenes', 'production']) mkdirSync(join(projects, ep, sub), { recursive: true });
      console.log(`Created projects/${ep}/`);
      break;
    }
    case 'list-projects': {
      const list = existsSync(projects) ? readdirSync(projects).filter((n) => statSync(join(projects, n)).isDirectory()) : [];
      console.log(list.length ? list.join('\n') : 'No projects found.');
      break;
    }
    case 'delete-project': {
      if (!ep || !existsSync(join(projects, ep))) throw new Error(`Project "${ep}" not found`);
      rmSync(join(projects, ep), { recursive: true, force: true });
      console.log(`Deleted projects/${ep}/`);
      break;
    }
    case 'check': {
      const { scenes, problems } = checkEpisode(join(projects, ep));
      console.log(`${scenes.length} scenes`);
      console.log(problems.length ? problems.map((p) => `  - ${p}`).join('\n') : 'Ready to assemble.');
      break;
    }
    case 'assemble': {
      const r = await assembleEpisode(ep, { wide: flag('--wide'), quality: option('--quality', 'preview') });
      for (const c of r.cuts) console.log(`  ${c.id}: ${c.start.toFixed(1)}s – ${c.end.toFixed(1)}s`);
      console.log(`Transcript matched ${Math.round(r.matched * 100)}% of script words.`);
      if (r.matched < 0.8) console.log('WARNING: low match; the voiceover may not follow the scenes.md narration.');
      for (const p of r.problems) console.log(`WARNING: ${p}`);
      console.log(`Output: ${r.outputPath} (${r.duration.toFixed(1)}s)`);
      break;
    }
    default:
      printUsage();
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
