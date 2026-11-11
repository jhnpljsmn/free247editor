// Finds high-performing Shorts with the official YouTube Data API v3 and ranks them
// by views/day and views per subscriber (outliers = formats that win on small channels).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://www.googleapis.com/youtube/v3';

export const DEFAULT_QUERIES = [
  'stickman zombie',
  'stickman survival',
  'zombie apocalypse animation',
  'what would you do zombie',
  'survival story animation',
];

async function call(endpoint, params, key) {
  const url = `${API}/${endpoint}?${new URLSearchParams({ ...params, key })}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body.error?.errors?.[0]?.reason || res.status;
    if (reason === 'quotaExceeded') throw new Error('YouTube API daily quota used up; try again after midnight Pacific time');
    if (reason === 'keyInvalid' || res.status === 400) throw new Error(`YouTube API rejected the request (${reason}); check YOUTUBE_API_KEY`);
    throw new Error(`YouTube API ${endpoint} failed (${reason}): ${body.error?.message || ''}`.trim());
  }
  return body;
}

// ISO 8601 duration (PT1M5S) -> seconds
function seconds(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return NaN;
  const [, d = 0, h = 0, mi = 0, s = 0] = m.map((x) => Number(x) || 0);
  return d * 86400 + h * 3600 + mi * 60 + s;
}

const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
const cell = (s) => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

export async function research(queries, { days = 90, top = 30 } = {}) {
  try { process.loadEnvFile(join(root, '.env')); } catch {}
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('Set YOUTUBE_API_KEY in .env (Google Cloud > YouTube Data API v3 > API key)');
  if (!Number.isFinite(days) || days <= 0) throw new Error('--days must be a positive number');
  if (!Number.isFinite(top) || top <= 0) throw new Error('--top must be a positive number');

  const since = new Date(Date.now() - days * 86400e3).toISOString();
  const found = new Map(); // videoId -> first query that found it
  for (const q of queries) {
    const r = await call('search', {
      part: 'id', q, type: 'video', videoDuration: 'short', order: 'viewCount',
      publishedAfter: since, maxResults: '50',
    }, key);
    for (const it of r.items || []) if (it.id?.videoId && !found.has(it.id.videoId)) found.set(it.id.videoId, q);
  }

  const videos = [];
  for (const ids of chunks([...found.keys()], 50)) {
    const r = await call('videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') }, key);
    videos.push(...(r.items || []));
  }

  const subs = new Map();
  for (const ids of chunks([...new Set(videos.map((v) => v.snippet.channelId))], 50)) {
    const r = await call('channels', { part: 'statistics', id: ids.join(',') }, key);
    for (const c of r.items || []) {
      subs.set(c.id, c.statistics.hiddenSubscriberCount ? null : Number(c.statistics.subscriberCount));
    }
  }

  const now = Date.now();
  const rows = videos
    .map((v) => {
      const views = Number(v.statistics.viewCount || 0);
      const sub = subs.get(v.snippet.channelId) ?? null;
      const ageDays = Math.max((now - Date.parse(v.snippet.publishedAt)) / 86400e3, 1);
      return {
        id: v.id,
        url: `https://www.youtube.com/shorts/${v.id}`,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        subscribers: sub,
        published: v.snippet.publishedAt.slice(0, 10),
        durationSec: seconds(v.contentDetails.duration),
        views,
        viewsPerDay: Math.round(views / ageDays),
        outlierRatio: sub ? +(views / sub).toFixed(2) : null,
        likesPer1k: views ? +((Number(v.statistics.likeCount || 0) / views) * 1000).toFixed(1) : 0,
        commentsPer1k: views ? +((Number(v.statistics.commentCount || 0) / views) * 1000).toFixed(2) : 0,
        query: found.get(v.id),
        tags: v.snippet.tags || [],
        description: v.snippet.description || '',
      };
    })
    .filter((r) => r.durationSec <= 180)
    .sort((a, b) => b.viewsPerDay - a.viewsPerDay);

  const date = new Date().toISOString().slice(0, 10);
  const dir = join(root, 'research');
  mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, `${date}.json`);
  const mdPath = join(dir, `${date}.md`);
  writeFileSync(jsonPath, JSON.stringify({ date, days, queries, rows }, null, 2));

  const table = (list) => [
    '| # | Title | Channel | Subs | Views | Views/day | Views÷subs | Dur | Published | Likes/1k | Link |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...list.map((r, i) => `| ${i + 1} | ${cell(r.title)} | ${cell(r.channel)} | ${r.subscribers == null ? 'hidden' : fmt(r.subscribers)} | ${fmt(r.views)} | ${fmt(r.viewsPerDay)} | ${r.outlierRatio ?? '-'} | ${r.durationSec}s | ${r.published} | ${r.likesPer1k} | [open](${r.url}) |`),
  ].join('\n');
  const outliers = rows.filter((r) => r.outlierRatio != null).sort((a, b) => b.outlierRatio - a.outlierRatio);
  writeFileSync(mdPath, [
    `# Viral Shorts research, ${date}`,
    '',
    `Queries: ${queries.map((q) => `"${q}"`).join(', ')}. Published in the last ${days} days, ≤ 180 s. ${rows.length} videos.`,
    '',
    `## Top ${Math.min(top, rows.length)} by views/day`,
    '',
    table(rows.slice(0, top)),
    '',
    `## Top ${Math.min(top, outliers.length)} outliers (views ÷ subscribers)`,
    '',
    table(outliers.slice(0, top)),
    '',
  ].join('\n'));

  return { mdPath, jsonPath, count: rows.length, units: queries.length * 100 + Math.ceil(videos.length / 50) * 2 };
}
