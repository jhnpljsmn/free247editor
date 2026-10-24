import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFFmpeg } from './utils/paths.mjs';
import { convertSvgToPng } from './svg-converter.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function resolveAssetPath(assetRef, projectDirs) {
  const projectPath = join(projectDirs.assets, assetRef);
  if (existsSync(projectPath)) return projectPath;

  const sharedPath = join(root, 'shared-assets', assetRef);
  if (existsSync(sharedPath)) return sharedPath;

  const rootPath = join(root, assetRef);
  if (existsSync(rootPath)) return rootPath;

  throw new Error(`Asset not found: ${assetRef}`);
}

export async function renderScene(scene, project, projectDirs, { quality = 'preview', outputPath } = {}) {
  const { width, height } = project.resolution;
  const fps = project.fps;
  const duration = scene.duration;

  // Resolve background
  let bgInput = null;
  let bgType = 'color';

  if (scene.background?.type === 'image' || scene.background?.type === 'video') {
    bgInput = resolveAssetPath(scene.background.asset, projectDirs);
    bgType = scene.background.type;
  }

  // Convert character SVGs to PNGs
  const characterPNGs = [];
  for (const char of scene.characters || []) {
    try {
      const pngPath = await convertSvgToPng(resolveAssetPath(char.asset, projectDirs));
      characterPNGs.push({ ...char, pngPath });
    } catch (err) {
      console.warn(`Warning: Could not convert ${char.asset}: ${err.message}`);
    }
  }

  // Build FFmpeg command
  const inputs = [];
  let inputIndex = 0;

  // Background input
  if (bgInput && bgType === 'image') {
    inputs.push(['-loop', '1', '-t', String(duration), '-i', bgInput]);
    inputIndex++;
  } else if (bgInput && bgType === 'video') {
    inputs.push(['-i', bgInput]);
    inputIndex++;
  } else {
    const color = scene.background?.asset || '#000000';
    inputs.push(['-f', 'lavfi', '-i', `color=c=${color.replace('#', '')}:s=${width}x${height}:d=${duration}`]);
    inputIndex++;
  }

  // Character inputs
  for (const char of characterPNGs) {
    inputs.push(['-i', char.pngPath]);
  }

  // Build video filter
  const vFilters = [];
  let vIn = '0:v';

  // Scale background
  if (bgInput && bgType === 'image') {
    const fit = scene.background?.fit || 'cover';
    const scaleMode = fit === 'contain' ? 'decrease' : 'crop';
    vFilters.push(`[0:v]scale=${width}:${height}:force_original_aspect_ratio=${scaleMode},setsar=1[bg]`);
    vIn = '[bg]';
  } else if (bgInput && bgType === 'video') {
    vFilters.push(`[0:v]scale=${width}:${height}:force_original_aspect_ratio=crop,setsar=1[bg]`);
    vIn = '[bg]';
  } else {
    vFilters.push(`[0:v]setsar=1[bg]`);
    vIn = '[bg]';
  }

  // Overlay characters
  for (let i = 0; i < characterPNGs.length; i++) {
    const char = characterPNGs[i];
    const charIdx = i + 1; // After background

    const state = char.initialState || { x: width / 2, y: height / 2, scale: 1, opacity: 1, rotation: 0 };
    const scale = state.scale || 1;
    const opacity = state.opacity !== undefined ? state.opacity : 1;
    const x = state.x !== undefined ? state.x : width / 2;
    const y = state.y !== undefined ? state.y : height / 2;

    const scaledW = Math.round(width * scale);
    const scaledH = Math.round(height * scale);

    // Scale character
    vFilters.push(`[${charIdx}:v]scale=${scaledW}:${scaledH}[char${i}]`);

    // Overlay with transparency if needed
    const overlayX = Math.round(x - scaledW / 2);
    const overlayY = Math.round(y - scaledH / 2);

    if (opacity < 1) {
      vFilters.push(`${vIn}[char${i}]overlay=${overlayX}:${overlayY}:format=auto,format=rgba,colorchannelmixer=aa=${opacity}[v${i}]`);
    } else {
      vFilters.push(`${vIn}[char${i}]overlay=${overlayX}:${overlayY}:format=auto[v${i}]`);
    }
    vIn = `[v${i}]`;
  }

  // Final video output
  vFilters.push(`${vIn}fps=${fps},format=yuv420p[vout]`);

  // Audio inputs and filters
  let audioIndex = inputIndex + characterPNGs.length;
  const aInputs = [];
  let aFilters = [];

  // Narration
  if (scene.narration?.audioFile) {
    try {
      const narrationPath = resolveAssetPath(scene.narration.audioFile, projectDirs);
      inputs.push(['-i', narrationPath]);
      const idx = audioIndex++;
      aInputs.push({ idx, volume: scene.narration.volume || 1.0 });
    } catch (err) {
      console.warn(`Warning: Narration audio not found: ${scene.narration.audioFile}`);
    }
  }

  // Sound effects
  for (const sfx of scene.soundEffects || []) {
    try {
      const sfxPath = resolveAssetPath(sfx.asset, projectDirs);
      inputs.push(['-i', sfxPath]);
      const idx = audioIndex++;
      aInputs.push({ idx, volume: sfx.volume || 1.0, startTime: sfx.startTime || 0 });
    } catch (err) {
      console.warn(`Warning: SFX not found: ${sfx.asset}`);
    }
  }

  // Music
  if (scene.music?.asset) {
    try {
      const musicPath = resolveAssetPath(scene.music.asset, projectDirs);
      inputs.push(['-i', musicPath]);
      const idx = audioIndex++;
      aInputs.push({
        idx,
        volume: scene.music.volume || 0.3,
        startTime: scene.music.startTime || 0,
        fadeIn: scene.music.fadeIn || 0,
        fadeOut: scene.music.fadeOut || 0
      });
    } catch (err) {
      console.warn(`Warning: Music not found: ${scene.music.asset}`);
    }
  }

  // Build audio filter
  if (aInputs.length > 0) {
    const aStreams = [];
    for (const input of aInputs) {
      let f = `[${input.idx}:a]`;

      if (input.startTime && input.startTime > 0) {
        f += `adelay=delays=${Math.round(input.startTime * 1000)}:all=1`;
      }

      f += `,volume=${input.volume}`;

      if (input.fadeIn) {
        f += `,afade=t=in:st=${input.startTime || 0}:d=${input.fadeIn}`;
      }
      if (input.fadeOut && duration > input.fadeOut) {
        f += `,afade=t=out:st=${Math.max(0, duration - input.fadeOut)}:d=${input.fadeOut}`;
      }

      f += `[a${input.idx}]`;
      aFilters.push(f);
      aStreams.push(`[a${input.idx}]`);
    }

    if (aStreams.length > 1) {
      aFilters.push(`${aStreams.join('')}amix=inputs=${aStreams.length}:duration=longest:dropout_transition=2[aout]`);
    } else {
      aFilters.push(`${aStreams[0]}anull[aout]`);
    }
  }

  // Quality settings
  const qualitySettings = quality === 'final'
    ? ['-crf', '18', '-preset', 'slow', '-movflags', '+faststart']
    : ['-crf', '28', '-preset', 'fast'];

  // Build full command
  const args = ['-y', '-loglevel', 'warning', '-stats'];

  // Add all inputs
  for (const input of inputs) {
    args.push(...input);
  }

  // Build filter_complex
  const allFilters = [...vFilters];
  if (aFilters.length > 0) {
    allFilters.push(...aFilters);
  }

  args.push('-filter_complex', allFilters.join(';'));

  // Map outputs
  args.push('-map', '[vout]');
  if (aInputs.length > 0) {
    args.push('-map', '[aout]');
  } else {
    args.push('-an');
  }

  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  args.push(...qualitySettings);
  args.push('-t', String(duration));
  args.push(outputPath);

  runFFmpeg(args, { cwd: projectDirs.root });

  return outputPath;
}

export async function renderProject(project, projectDirs, { quality = 'preview' } = {}) {
  const outputDir = quality === 'final' ? projectDirs.final : projectDirs.preview;
  mkdirSync(outputDir, { recursive: true });

  const sceneVideos = [];

  // Render each scene
  for (const sceneId of project.scenes) {
    const scenePath = join(projectDirs.scenes, `${sceneId}.json`);
    if (!existsSync(scenePath)) {
      console.warn(`Scene not found: ${scenePath}`);
      continue;
    }

    const scene = JSON.parse(readFileSync(scenePath, 'utf8'));
    const outputPath = join(outputDir, `${sceneId}.mp4`);

    console.log(`Rendering scene: ${scene.title || sceneId} (${scene.duration}s)`);
    await renderScene(scene, project, projectDirs, { quality, outputPath });
    sceneVideos.push(outputPath);

    console.log(`  -> ${outputPath}`);
  }

  // Concatenate scenes
  const finalPath = join(outputDir, `${project.id}-${quality}.mp4`);
  await concatenateVideos(sceneVideos, finalPath, project);

  return finalPath;
}

async function concatenateVideos(videoPaths, outputPath, project) {
  if (videoPaths.length === 0) {
    throw new Error('No scene videos to concatenate');
  }

  if (videoPaths.length === 1) {
    const { copyFileSync } = await import('node:fs');
    copyFileSync(videoPaths[0], outputPath);
    return outputPath;
  }

  const concatContent = videoPaths.map(p => `file '${p}'`).join('\n');
  const concatFile = join(outputPath, '..', '.concat.txt');
  writeFileSync(concatFile, concatContent);

  runFFmpeg([
    '-y', '-loglevel', 'warning', '-stats',
    '-f', 'concat', '-safe', '0', '-i', concatFile,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k',
    outputPath
  ], { cwd: project.root });

  return outputPath;
}
