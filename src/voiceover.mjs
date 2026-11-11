// Generate projects/<ep>/voiceover.mp3 from production/voiceover.md with the ElevenLabs API (Eleven v3).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_CHARS = 5000; // one Eleven v3 request

/** The narration ElevenLabs should read: the ``` block, else the part between the --- lines, minus `Delivery:`. */
export function extractNarration(md) {
  const fenced = md.match(/```[^\n]*\n([\s\S]*?)```/);
  let body;
  if (fenced) body = fenced[1];
  else {
    const parts = md.split(/^---\s*$/m);
    if (parts.length < 2) throw new Error('voiceover.md has no ``` block or --- section with the narration');
    body = parts[1];
  }
  // Drop the Delivery: paragraph (it is direction for the writer, not words to read).
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const text = paragraphs.filter((p) => !/^Delivery:/i.test(p)).join('\n\n');
  if (!text) throw new Error('voiceover.md narration is empty');
  return text;
}

/** Split into chunks of at most `max` chars, at paragraph boundaries, then sentence boundaries if needed. */
export function splitText(text, max = MAX_CHARS) {
  const pieces = [];
  for (const p of text.split(/\n\s*\n/)) {
    if (p.length <= max) { pieces.push(p); continue; }
    let cur = '';
    for (const s of p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [p]) {
      if (s.length > max) throw new Error(`A sentence is over ${max} characters; split it in voiceover.md`);
      if ((cur + s).length > max) { pieces.push(cur.trim()); cur = ''; }
      cur += s;
    }
    if (cur.trim()) pieces.push(cur.trim());
  }
  const chunks = [];
  let cur = '';
  for (const p of pieces) {
    const next = cur ? `${cur}\n\n${p}` : p;
    if (next.length > max) { chunks.push(cur); cur = p; } else cur = next;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function tts(text, { apiKey, voiceId, model }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    const hint = {
      401: 'invalid API key, or the key lacks Text to Speech permission',
      404: 'voice not found; check ELEVENLABS_VOICE_ID',
      422: 'the request was rejected (text or settings)',
      429: 'rate limit or out of credits',
    }[res.status] || 'request failed';
    throw new Error(`ElevenLabs ${res.status}: ${hint}. ${detail}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Credits used/limit this period, or null if the key can't read it (needs User: Read). */
async function usage(apiKey) {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': apiKey } });
    if (!res.ok) return null;
    const j = await res.json();
    return { used: j.character_count, limit: j.character_limit, reset: new Date(j.next_character_count_reset_unix * 1000) };
  } catch { return null; }
}

export async function generateVoiceover(ep, { force = false } = {}) {
  try { process.loadEnvFile(join(root, '.env')); } catch {}
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const model = process.env.ELEVENLABS_MODEL || 'eleven_v3';
  if (!apiKey || !voiceId) throw new Error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env (see INSTRUCTIONS.md)');

  const dir = join(root, 'projects', ep || '');
  const src = join(dir, 'production', 'voiceover.md');
  if (!ep || !existsSync(src)) throw new Error(`projects/${ep}/production/voiceover.md not found`);
  const out = join(dir, 'voiceover.mp3');
  if (existsSync(out) && !force) throw new Error(`projects/${ep}/voiceover.mp3 exists; add --force to regenerate (spends credits)`);

  const text = extractNarration(readFileSync(src, 'utf8'));
  const chunks = splitText(text);
  const audio = [];
  for (const [i, chunk] of chunks.entries()) {
    console.log(`Generating part ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
    audio.push(await tts(chunk, { apiKey, voiceId, model }));
  }

  if (existsSync(out)) copyFileSync(out, join(dir, 'voiceover.prev.mp3'));
  if (audio.length === 1) writeFileSync(out, audio[0]);
  else {
    const tmp = mkdtempSync(join(tmpdir(), 'voiceover-'));
    try {
      const list = audio.map((buf, i) => { const f = join(tmp, `part-${i}.mp3`); writeFileSync(f, buf); return `file '${f}'`; });
      writeFileSync(join(tmp, 'list.txt'), list.join('\n'));
      const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', out], { encoding: 'utf8' });
      if (r.error || r.status !== 0) throw new Error(`ffmpeg concat failed: ${r.error?.message || r.stderr.trim()}`);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }
  return { out, chars: text.length, parts: chunks.length, model, usage: await usage(apiKey) };
}
