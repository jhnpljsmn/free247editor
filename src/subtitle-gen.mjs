import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFFmpeg } from './utils/paths.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function resolveAssetPath(assetRef, projectDirs) {
  const paths = [
    join(projectDirs.assets, assetRef),
    join(root, 'shared-assets', assetRef),
    join(root, assetRef)
  ];

  for (const p of paths) {
    if (existsSync(p)) return p;
  }

  throw new Error(`Asset not found: ${assetRef}`);
}

export function generateSubtitles(scene, { style = 'default' } = {}) {
  if (!scene.subtitle?.text) return null;

  const startTime = scene.subtitle.startTime || 0;
  const endTime = scene.subtitle.endTime || scene.duration;

  // Generate SRT format
  const srtContent = `1
${formatTime(startTime)} --> ${formatTime(endTime)}
${scene.subtitle.text}
`;

  return srtContent;
}

export function generateAssSubtitles(scenes, { style = 'default' } = {}) {
  let assContent = `[Script Info]
Title: Auto-generated
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const scene of scenes) {
    if (!scene.subtitle?.text) continue;

    const start = scene.subtitle.startTime || 0;
    const end = scene.subtitle.endTime || scene.duration;
    const startStr = formatAssTime(start);
    const endStr = formatAssTime(end);

    assContent += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${escapeAssText(scene.subtitle.text)}\n`;
  }

  return assContent;
}

export function burnSubtitles(videoPath, subtitlePath, outputPath) {
  runFFmpeg([
    '-y', '-loglevel', 'warning', '-stats',
    '-i', videoPath,
    '-vf', `ass=${subtitlePath}`,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
    '-c:a', 'copy',
    outputPath
  ]);

  return outputPath;
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatAssTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function escapeAssText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\N');
}
