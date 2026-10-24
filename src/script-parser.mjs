import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import readline from 'node:readline';

export async function parseScript(scriptPath) {
  if (!existsSync(scriptPath)) {
    throw new Error(`Script file not found: ${scriptPath}`);
  }

  const content = readFileSync(scriptPath, 'utf8');
  return parseMarkdownScript(content);
}

export function parseMarkdownScript(content) {
  const scenes = [];
  const lines = content.split('\n');

  let currentScene = null;
  let currentField = null;
  let buffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Scene heading: ## Scene 1: Title
    const sceneMatch = line.match(/^#{2,3}\s+Scene\s+(\d+)(?::\s*(.+))?$/i);
    if (sceneMatch) {
      if (currentScene) {
        flushField(currentScene, currentField, buffer);
        scenes.push(currentScene);
      }
      currentScene = {
        id: `scene-${String(sceneMatch[1]).padStart(2, '0')}`,
        title: sceneMatch[2]?.trim() || `Scene ${sceneMatch[1]}`,
        duration: 0,
        background: { type: 'color', asset: '#000000' },
        characters: [],
        narration: { text: '' },
        soundEffects: [],
        music: null,
        subtitle: null,
        transitions: { in: 'cut', out: 'cut', duration: 0.5 }
      };
      currentField = null;
      buffer = [];
      continue;
    }

    if (!currentScene) continue;

    // Field markers
    const fieldMatch = line.match(/^\*\*(.+?)\*\*[:\s]*(.+)?$/);
    if (fieldMatch) {
      flushField(currentScene, currentField, buffer);
      currentField = fieldMatch[1].toLowerCase().replace(/\s+/g, '');
      buffer = fieldMatch[2] ? [fieldMatch[2].trim()] : [];
      continue;
    }

    // List items
    const listMatch = line.match(/^(?:[-*]|\d+\.)\s+(.+)$/);
    if (listMatch && currentField) {
      buffer.push(listMatch[1].trim());
      continue;
    }

    // Regular content
    if (line && currentField) {
      buffer.push(line);
    }
  }

  if (currentScene) {
    flushField(currentScene, currentField, buffer);
    scenes.push(currentScene);
  }

  return scenes;
}

function flushField(scene, field, buffer) {
  if (!field || buffer.length === 0) return;
  const value = buffer.join(' ').trim();

  switch (field) {
    case 'duration':
      scene.duration = parseFloat(value) || 5;
      break;
    case 'background':
    case 'bg':
      if (value.startsWith('#')) {
        scene.background = { type: 'color', asset: value };
      } else {
        scene.background = { type: 'image', asset: value };
      }
      break;
    case 'characters':
    case 'chars':
      scene.characters = buffer.map(c => {
        const match = c.match(/^(.+?)\s*@\s*\((\d+),\s*(\d+)\)(?:\s*scale:\s*(\d+\.?\d*))?/);
        if (match) {
          return {
            id: match[1].toLowerCase().replace(/\s+/g, '-'),
            asset: `characters/${match[1].toLowerCase().replace(/\s+/g, '-')}.svg`,
            initialState: {
              x: parseInt(match[2]),
              y: parseInt(match[3]),
              scale: parseFloat(match[4]) || 1.0,
              opacity: 1.0,
              rotation: 0
            }
          };
        }
        return { id: c.toLowerCase().replace(/\s+/g, '-'), asset: `characters/${c.toLowerCase().replace(/\s+/g, '-')}.svg` };
      });
      break;
    case 'narration':
    case 'dialogue':
    case 'text':
      scene.narration.text = value;
      scene.subtitle = {
        text: value,
        startTime: 0,
        endTime: scene.duration,
        style: 'default'
      };
      break;
    case 'soundeffects':
    case 'sfx':
      scene.soundEffects = buffer.map(s => {
        const parts = s.split(/\s*@\s*/);
        return { asset: parts[0], startTime: parseFloat(parts[1]) || 0, volume: 1.0 };
      });
      break;
    case 'music':
    case 'bgm':
      scene.music = { asset: value, startTime: 0, volume: 0.3, fadeIn: 1, fadeOut: 1 };
      break;
    case 'transition':
      const parts = value.split(/\s*->\s*/);
      scene.transitions = {
        in: parts[0]?.trim() || 'cut',
        out: parts[1]?.trim() || 'cut',
        duration: 0.5
      };
      break;
  }
}

function askQuestion(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

export async function interactiveScriptBuilder(projectId, projectDirs) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`\nLet's create scenes for "${projectId}" interactively.`);
  console.log('Type "done" at any time to finish.\n');

  const scenes = [];
  let sceneNum = 1;

  try {
    while (true) {
      const title = await askQuestion(rl, `Scene ${sceneNum} title (or "done"): `);
      if (title.toLowerCase() === 'done') break;

      const durationInput = await askQuestion(rl, 'Duration (seconds) [5]: ');
      const duration = parseFloat(durationInput) || 5;

      const bg = await askQuestion(rl, 'Background (image path or #color) [#1a1a2e]: ');
      const background = bg || '#1a1a2e';

      const narration = await askQuestion(rl, 'Narration text: ');
      const chars = await askQuestion(rl, 'Characters (comma-separated): ');

      const scene = {
        id: `scene-${String(sceneNum).padStart(2, '0')}`,
        title,
        duration,
        background: background.startsWith('#')
          ? { type: 'color', asset: background }
          : { type: 'image', asset: background },
        characters: chars.split(',').filter(c => c.trim()).map(c => ({
          id: c.trim().toLowerCase().replace(/\s+/g, '-'),
          asset: `characters/${c.trim().toLowerCase().replace(/\s+/g, '-')}.svg`,
          initialState: { x: 540, y: 960, scale: 1, opacity: 1, rotation: 0 }
        })),
        narration: { text: narration },
        soundEffects: [],
        music: null,
        subtitle: narration
          ? { text: narration, startTime: 0, endTime: duration, style: 'default' }
          : null,
        transitions: { in: 'cut', out: 'cut', duration: 0.5 }
      };

      scenes.push(scene);
      const scenePath = join(projectDirs.scenes, `${scene.id}.json`);
      writeFileSync(scenePath, JSON.stringify(scene, null, 2));
      console.log(`Saved ${scenePath}\n`);

      sceneNum++;
    }
  } finally {
    rl.close();
  }

  return scenes;
}
