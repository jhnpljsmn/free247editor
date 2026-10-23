# Zombie in Manila — End-to-End Production Guide

> **Read this first.** This document is the single source of truth for how we create an episode, end-to-end, from script to final video.

---

## Where Are We Working?

Everything you need lives here:
```
/home/sysadmin/Desktop/opencode-kimi-projects/free247editor/
```
Make sure you `cd` into that directory before running any commands.

---

## Overview of the Workflow

```
1. Prompt ChatGPT      →  Script + image prompts
2. Gather Assets       →  SVG characters, backgrounds, sounds
3. ElevenLabs          →  Voiceover MP3s
4. Drop Files          →  Into the project folder
5. Claude Code Pro     →  Parse, render, assemble
6. Final Video         →  Out of the outbox/ folder
```

---

## Step 1 — Prompt ChatGPT for the Script

### What to paste into ChatGPT

```
Create a new episode script for "Zombie in Manila".
Follow this exact format so my video editor can read it: [link to script-template.md]

Requirements:
- 8-10 scenes
- Total runtime: 60-90 seconds
- Taglish (Tagalog + English) dialogue
- Vertical format (1080x1920) for TikTok/Reels/Shorts
- Include character positions using the coordinate system
- Include background suggestions, sound effects, and music cues

Plot idea: [describe your episode concept here]
```

### What ChatGPT should return

A markdown file that looks like the example in `script-template.md`:
```markdown
## Scene 1: Title Card
**Duration:** 4
**Background:** #0a0a1a
**Characters:**
- TitleText @ (540, 800) scale:1.5
**Narration:** "Zombie in Manila"
```

### Save the output

1. Create a new file in the editor: `projects/episode-XX/script.md`
2. Paste ChatGPT’s response into it
3. **Save it** — this is your master document

---

## Step 2 — Get Image Prompts for Characters & Backgrounds

### What to paste into ChatGPT (after the script)

```
Now, for that same episode, generate SVG-ready image prompts for:
1. Every unique character appearing in the script
2. Every unique background/location
3. Any key props (weapons, vehicles, items)

Requirements:
- Simple, flat, cartoon/2D style (easy to trace into SVGs)
- Transparent backgrounds for characters
- Night/dark mood for most backgrounds (unless the story needs daylight)
- Filipino urban settings (alleys, streets, sari-sari stores, jeepneys, etc.)

Format each prompt like:
[ASSET_TYPE]: [prompt]
Example:
CHARACTER: "Juan, Filipino male street vendor, wearing white sando, cartoon style, flat colors, transparent background, vector-ready, 2D illustration"
BACKGROUND: "Dark Manila alley at night, graffiti walls, dim lamplight, 1080x1920, flat 2D style, moody atmosphere, cartoon style"
```

### What to do with the prompts

You have **3 options** for getting actual image files:

| Option | Tool | Output | Notes |
|--------|------|--------|-------|
| A | DALL-E / Midjourney / Ideogram | PNG/JPG | Then convert to SVG using Inkscape or `free247editor` tools |
| B | Ask ChatGPT + SVG code | Direct SVG | GPT-4 can output raw SVG code you can save as `.svg` |
| C | Use existing assets | SVG/PNG | Reuse characters/backdrops from previous episodes |

**File naming rule:** `characters/juan.svg` if the script says `Juan`. The parser lowercases and hyphenates: `Generoso Gomez` → `characters/generoso-gomez.svg`.

---

## Step 3 — Prepare Voiceovers with ElevenLabs

### Extract narration text from your script

The voiceover text is everything under `**Narration:**` blocks. Create a document for your voice actor or ElevenLabs:

```plaintext
SCENE 1 (4s): "Zombie in Manila"
SCENE 2 (5s): "Madaling araw sa Tondo. Si Juan ay pauwi mula sa trabaho."
SCENE 3 (4s): "May kakaibang tunog..."
```

### In ElevenLabs

1. Pick a Filipino voice (e.g., `Bryan` or generate a custom voice)
2. Generate audio for **each scene separately**
3. Export each as an individual MP3
4. **Name them exactly:**
   ```
   scene-01.mp3
   scene-02.mp3
   scene-03.mp3
   ```
   (match the scene IDs from your script: Scene 1 → `scene-01`, Scene 10 → `scene-10`)

---

## Step 4 — Prepare Sound & Music

### Sound Effects (SFX)

Your script lists SFX like:
```markdown
**SFX:**
- zombie-groan.mp3 @ 1.5
- glass-break.mp3 @ 2.0
```

**Get them from:**
- Freesound.org
- Your personal sound library
- Generate with ElevenLabs Sound Effects or Udio

**File naming:** Must match the script exactly: `zombie-groan.mp3`, `glass-break.mp3`, etc.

### Background Music (BGM)

```markdown
**Music:** tense-ambience.mp3
```

**Get it from:**
- Epidemic Sound
- Artlist
- Udio / Suno (AI-generated, but check licensing)

---

## Step 5 — Organize All Files in the Project Folder

### Create your project

```bash
# Inside the free247editor directory:
mkdir -p projects/episode-01/assets/{characters,bg,sounds,music,voiceovers}
```

### Drop files into these exact locations

```
projects/episode-01/
├── script.md              ← Your ChatGPT output
│
└── assets/
    ├── characters/
    │   ├── juan.svg
    │   ├── zombie.svg
    │   └── ... (one per character in the script)
    │
    ├── bg/
    │   ├── manila-alley-night.png
    │   ├── brick-wall.png
    │   └── ... (one per unique background)
    │
    ├── sounds/
    │   ├── zombie-groan.mp3
    │   ├── glass-break.mp3
    │   └── ... (one per SFX in the script)
    │
    ├── music/
    │   ├── tense-ambience.mp3
    │   └── ... (one per unique music cue)
    │
    └── voiceovers/
        ├── scene-01.mp3
        ├── scene-02.mp3
        └── ... (one per scene)
```

**⚠️ Important:** The script parser looks for assets at **these exact relative paths**. If your script says `juan.svg`, it must be at `characters/juan.svg` inside the project's `assets/` folder.

---

## Step 6 — Run Claude Code Pro (MCP Mode)

> Make sure your `claude_desktop_config.json` is already set up to point to `mcp-server/index.mjs`. See `MCP-README.md` if you haven't done this yet.

### Open Claude Code Pro and paste your script

```
Create a new project called "episode-01" and parse this script:
[paste the entire script.md content here]
```

### What Claude will do automatically

1. **Create project** `episode-01` if it doesn't exist
2. **Parse script** into individual `scene-01.json`, `scene-02.json`, etc.
3. **Report missing assets** — you'll get a checklist like:
   ```
   Missing assets:
   - characters/zombie.svg (not found in assets/characters/)
   - sounds/zombie-roar.mp3 (not found in assets/sounds/)
   ```
4. **Tell you the next steps**

---

## Step 7 — Fix Missing Assets

If Claude reports missing files:

1. Go back to Step 2 or Step 4
2. Get/generate the missing asset
3. Drop it in the correct folder
4. Say to Claude:
   ```
   I've added the missing assets. Now check status again.
   ```

---

## Step 8 — Render Preview (Check One Scene)

Before assembling the whole episode, render a single scene to verify everything looks right:

```
Render a preview for scene-01 of project episode-01
```

Claude will:
- Run FFmpeg with your characters, background, and narration
- Burn subtitles into the video
- Apply the transition
- Return the video output path

**Watch the preview.** If characters are too small, wrong position, or subtitles cut off, adjust the script and re-parse.

---

## Step 9 — Transcribe Voiceovers (Optional but Recommended)

If you want perfect subtitles synchronized with the actual voiceover timing (not just the full scene duration):

```
Transcribe voiceovers for project episode-01
```

Claude will:
- Send each `scene-XX.mp3` to Groq Whisper
- Generate `.srt` or subtitle JSON with **word-level timestamps**
- Subtitles will appear in sync with the actual speech, not just pasted over the whole scene

**Requirement:** You must have your Groq API key set in `GROQ_API_KEY` environment variable or `.env`. Whisper is free and fast for Taglish.

---

## Step 10 — Assemble Final Episode

Once all scenes look good:

```
Assemble the final video for project episode-01
```

Claude will:
1. Render every scene as a separate video clip
2. Concatenate all clips in order
3. Mix audio (voiceover + music + SFX with ducking)
4. Export a single MP4 to `projects/episode-01/output/`

### Output

```
projects/episode-01/
├── output/
│   └── episode-01-final.mp4   ← Your finished video
│
├── scenes/
│   ├── scene-01.mp4             ← Individual rendered scenes
│   ├── scene-02.mp4
│   └── ...
```

---

## Step 11 — Review & Iterate

1. **Watch the final MP4**
2. If something looks wrong, identify the scene number
3. Fix the asset or the script
4. Re-render that specific scene, or re-assemble
5. Repeat until perfect

---

## Quick Reference: What Goes Where

| File Type | Source | Destination | Naming Rule |
|-----------|--------|-------------|-------------|
| Script | ChatGPT | `projects/XX/script.md` | Any name |
| Characters | DALL-E / Midjourney / SVG code | `projects/XX/assets/characters/` | Lowercase, hyphenated, `.svg` |
| Backgrounds | DALL-E / Midjourney | `projects/XX/assets/bg/` | Any name, PNG preferred |
| Voiceovers | ElevenLabs | `projects/XX/assets/voiceovers/` | `scene-01.mp3` … `scene-99.mp3` |
| Sound Effects | Freesound / Library | `projects/XX/assets/sounds/` | Match script names exactly |
| Music | Artlist / Udio | `projects/XX/assets/music/` | Match script names exactly |
| Final Video | Rendered by Claude | `projects/XX/output/` | Auto-named by the system |

---

## Emergency: Working Without MCP (Manual Mode)

If Claude Code Pro is down or MCP isn't connected, you can still run everything from the terminal:

```bash
cd /home/sysadmin/Desktop/opencode-kimi-projects/free247editor

# Create project
node src/cli.mjs create episode-02 --format vertical

# Parse script manually
node src/cli.mjs parse projects/episode-02/script.md --project episode-02

# Render one scene
node src/cli.mjs render scene-01 --project episode-02

# Assemble all scenes
node src/cli.mjs assemble --project episode-02
```

See `README.md` for full CLI documentation.

---

## Pro Tips

1. **Episode numbering:** Use `episode-01`, `episode-02`, etc. This keeps projects sortable.
2. **Reusable assets:** Put recurring characters in `shared-assets/characters/` and symlink or copy them into new episodes.
3. **Test render first:** Always render `scene-01` before doing the full assembly. It takes seconds vs. minutes for the full episode.
4. **Music ducking:** The engine automatically lowers music volume when voiceover plays. Set music volume in script to `0.3` (30%) and let the engine handle the rest.
5. **Fast iterations:** If you only change one scene, you can re-render just that scene and re-assemble. No need to re-render the whole episode.

---

*Document version: 1.0 — Compatible with free247editor MCP server v1.0*
