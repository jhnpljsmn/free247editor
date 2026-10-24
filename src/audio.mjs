// FFmpeg audio graph for one scene: narration, timed sound effects and an optional music bed.
import { spawnSync } from 'node:child_process';

export function probeDuration(path) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], { encoding: 'utf8' });
  const d = Number(r.stdout);
  if (r.status !== 0 || !Number.isFinite(d)) throw new Error(`Could not read duration of ${path}`);
  return d;
}

/**
 * tracks: [{ path, start = 0, volume = 1, fadeIn = 0, fadeOut = 0, loop = false }]
 * firstIndex: FFmpeg input index of the first track. duration: scene length in seconds.
 * Returns { inputs: string[], filter: string, label } where label is the mixed output pad.
 * With no tracks, a silent source is used so every scene has the same audio layout.
 */
export function buildAudio(tracks, firstIndex, duration) {
  const inputs = [];
  const parts = [];
  const pads = [];

  if (!tracks.length) {
    inputs.push('-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=stereo');
    parts.push(`[${firstIndex}:a]anull[aout]`);
    return { inputs, filter: parts.join(';'), label: '[aout]' };
  }

  tracks.forEach((tr, i) => {
    if (tr.loop) inputs.push('-stream_loop', '-1');
    inputs.push('-i', tr.path);
    const chain = ['aformat=sample_rates=48000:channel_layouts=stereo'];
    if (tr.start > 0) chain.push(`adelay=delays=${Math.round(tr.start * 1000)}:all=1`);
    chain.push(`volume=${tr.volume ?? 1}`);
    if (tr.fadeIn) chain.push(`afade=t=in:st=${tr.start || 0}:d=${tr.fadeIn}`);
    if (tr.fadeOut && duration > tr.fadeOut) chain.push(`afade=t=out:st=${duration - tr.fadeOut}:d=${tr.fadeOut}`);
    parts.push(`[${firstIndex + i}:a]${chain.join(',')}[a${i}]`);
    pads.push(`[a${i}]`);
  });

  const mixed = pads.length > 1
    ? `${pads.join('')}amix=inputs=${pads.length}:duration=longest:normalize=0`
    : `${pads[0]}anull`;
  parts.push(`${mixed},alimiter=limit=0.9:level=disabled,apad,atrim=0:${duration}[aout]`);
  return { inputs, filter: parts.join(';'), label: '[aout]' };
}
