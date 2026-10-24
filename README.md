# free247editor: Zombie Outbreak video engine

Turns an episode script into a vertical (1080×1920) video: static 2D stick-figure sprites,
code-drawn or image backgrounds, ElevenLabs narration, word-by-word captions, sound effects and music.
Rendering is local and deterministic (canvas + FFmpeg); AI is only used to write scripts and prompts.

- **`INSTRUCTIONS.md`**: how to make an episode, step by step
- **`script-template.md`**: the script format
- **`series/zombie-outbreak/bible.md`**: the story
- **`shared-assets/flow-style.md`**: how character and background images are made
- **`MAC_SETUP.md`**: installing on a new Mac
- **`MCP-README.md`**: the optional Claude Desktop MCP server

```bash
node src/cli.mjs import-script manila-ep01
node src/cli.mjs plan-assets manila-ep01
node src/cli.mjs check manila-ep01
node src/cli.mjs render manila-ep01
```

Needs Node.js 20+, FFmpeg, and `npm install`. Captions use a free Groq key in `.env` (see `.env.example`).

## Code

| Path | What it does |
|---|---|
| `src/cli.mjs` | Commands (`node src/cli.mjs help`) |
| `src/script-parser.mjs` | `script.md` → scene JSON |
| `src/production.mjs` | Asset checklist: what each scene needs, what is reused or missing |
| `src/check.mjs` | Pre-render checks, voiceover lines, render validation |
| `src/stick/` | The renderer: sprites, code-drawn figures, backdrops, props, captions, camera |
| `src/audio.mjs` | Voice, SFX and music mixing |
| `src/asset-registry.mjs` | `shared-assets/registry.json`, the reusable asset list |
| `tools/transcribe.mjs` | Word timings for captions (Groq, or local faster-whisper) |
| `mcp-server/`, `src/render-engine.mjs` | MCP server for Claude Desktop (older renderer) |

## License

MIT
