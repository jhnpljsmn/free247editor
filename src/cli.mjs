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
const { generateVoiceover } = await import('./voiceover.mjs');
const { research, DEFAULT_QUERIES } = await import('./research.mjs');
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
  voiceover <ep> [--force]                       Generate voiceover.mp3 from production/voiceover.md (ElevenLabs)
  assemble <ep> [--wide] [--quality final]       Build outbox/<ep>-vN.mp4 (9:16; --wide for 16:9)
  research ["query" ...] [--days 90] [--top 30]  Rank viral Shorts (YouTube Data API) into research/<date>.md
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
    case 'voiceover': {
      const r = await generateVoiceover(ep, { force: flag('--force') });
      console.log(`Wrote ${r.out} (${r.chars} characters, ${r.parts} part${r.parts > 1 ? 's' : ''}, ${r.model})`);
      const u = r.usage;
      if (u) console.log(`Credits: ${u.used.toLocaleString()} / ${u.limit.toLocaleString()} used, ${(u.limit - u.used).toLocaleString()} left, resets ${u.reset.toISOString().slice(0, 10)}`);
      else console.log('Credits: unavailable (give the API key User: Read to show usage)');
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
    case 'research': {
      const rest = process.argv.slice(3);
      const queries = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')));
      const r = await research(queries.length ? queries : DEFAULT_QUERIES, {
        days: Number(option('--days', 90)),
        top: Number(option('--top', 30)),
      });
      console.log(`Found ${r.count} Shorts (~${r.units} API units used of 10,000/day).`);
      console.log(`Report: ${r.mdPath}`);
      console.log(`Raw data: ${r.jsonPath}`);
      break;
    }
    default:
      printUsage();
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
