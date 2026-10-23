# free247editor - Claude Pro MCP Edition

An MCP (Model Context Protocol) server that turns **Claude Pro Desktop** into your video editor. Drop in assets, paste a script, and Claude Pro assembles Filipino animated storytelling videos with burned-in subtitles, music ducking, and auto-animations.

## Workflow Overview

```
You (ChatGPT) → SVG characters, script.md
You (ElevenLabs) → voiceover.mp3
You (manual) → Drop files into project folder
Claude Pro (MCP) → Parses script, plans scenes, renders video
```

## Claude Pro MCP Integration

### Step 1: Configure Claude Desktop

Add to your `claude_desktop_config.json` (found via Claude → Settings → Developer, or `~/.claude/config.json` on macOS):

```json
{
  "mcpServers": {
    "free247editor": {
      "command": "node",
      "args": ["/path/to/free247editor/mcp-server/index.mjs"]
    }
  }
}
```

**Restart Claude Desktop** to load the MCP server.

### Step 2: Enable Developer Mode

In Claude Desktop:
- Go to Settings → Developer
- Enable "Early access" if present
- You should see the hammer/tool icon appear in the chat input

---

## Your Workflow in Claude Pro

### 1. Create Episode
**You type in Claude:**

```
Create a new episode called "zombie-ep1" for my Zombie in Manila series. Make it vertical format.
```
**Claude calls:** `create-project` tool

**Result:** Project folder created at `projects/zombie-ep1/`

### 2. Drop Assets
**You (manually) copy files to:**
```
projects/zombie-ep1/assets/characters/hero.svg
projects/zombie-ep1/assets/characters/zombie.svg
projects/zombie-ep1/assets/backgrounds/manila-street.jpg
projects/zombie-ep1/assets/sounds/tension-music.mp3
projects/zombie-ep1/assets/voiceovers/episode-01-v1.mp3
```

*Claude Pro cannot upload binary files directly via chat - you drop them into the folder.*

### 3. Paste Script
**You paste in Claude:**

```markdown
## Scene 1: The Quiet Night
**Duration:** 5
**Background:** backgrounds/manila-street.jpg
**Characters:**
- Hero @ (540, 1400) scale: 1.5
**Narration:** It was a quiet night in Manila, until they came.
**Music:** sounds/tension-music.mp3

## Scene 2: The Horde Arrives
**Duration:** 3
**Background:** backgrounds/manila-street.jpg
**Characters:**
- Hero @ (300, 1400) scale: 1.5
- Zombie @ (700, 1400) scale: 1.2
**Narration:** The dead walked the streets.
**SFX:**
- sounds/zombie-growl.mp3 @ 1.5
**Transition:** fade -> fade
```

**Claude calls:** `parse-script` tool

**Result:** Scene JSON files created in `projects/zombie-ep1/scenes/`

### 4. Transcribe Voiceover
**You type in Claude:**

```
Transcribe the voiceover for Taglish subtitles.
```

**Claude calls:** `transcribe` with `voiceoverFile: "episode-01-v1.mp3"`

**What happens:**
1. Uploads audio to Groq API (free tier)
2. Gets word-level timestamps for Filipino/Taglish
3. Generates `episode-01-v1.json` (transcript) and `episode-01-v1.srt` (subtitles)
4. Saves to `projects/zombie-ep1/assets/transcripts/`

### 5. Render Preview
**You type in Claude:**

```
Render a preview of this episode.
```

**Claude calls:** `render-scene` for each scene, then assembles them.

**What happens:**
- Characters fade in automatically (auto-entrance animations)
- Backgrounds are positioned
- Voiceovers sync to scene timing
- Music ducks when narration plays (sidechain compression)
- Subtitles burned into video

### 6. Export Final
**You type in Claude:**

```
Export the final video. I want it vertical for TikTok.
```

**Claude asks:** "Do you want vertical 9:16 (Reels/TikTok) or horizontal 16:9 (YouTube)?"

**You reply:** Vertical

**Claude calls:** `assemble` with `format: "vertical"`

**Output:** `projects/zombie-ep1/renders/final/zombie-ep1-final.mp4`

---

## MCP Tools Available to Claude Pro

| Tool | What It Does | When Claude Uses It |
|------|-------------|--------------------|
| `create-project` | Creates project folder with assets, scenes, renders subdirectories | User says "new episode" or "create project" |
| `parse-script` | Converts markdown script to structured scene JSON files | User pastes a script |
| `transcribe` | Uploads voiceover to Groq for Filipino/Taglish subtitles | User asks for subtitles or transcription |
| `render-scene` | Renders one scene as MP4 with characters, background, auto-animations | User says "render scene X" or preview |
| `assemble` | Concatenates all scenes, mixes audio with ducking, burns subtitles, exports MP4 | User says "export final" or "render full video" |
| `status` | Lists project state (scenes, assets, renders) | User asks "what's ready" or "what's missing" |

---

## Script Format Reference

```markdown
## Scene N: Title
**Duration:** seconds
**Background:** backgrounds/image.jpg or #hexcolor
**Characters:**
- Name @ (x, y) scale: N
**Narration:** Dialog text here.
**SFX:**
- sounds/file.mp3 @ timestamp
**Music:** sounds/music.mp3
**Transition:** fade -> cut
```

### Character Positioning Guide

For **1080x1920 (vertical)**: Use 540 as center X
- Bottom area: `(540, 1400)`
- Left side: `(270, 1400)`
- Right side: `(810, 1400)`
- Scale: `1.5` = large, `1.0` = normal, `0.5` = small

For **1920x1080 (horizontal)**: Use 960 as center X
- Bottom area: `(960, 800)`
- Left side: `(480, 800)`
- Right side: `(1440, 800)`

---

## Asset Types

Place files manually in `projects/<id>/assets/`:

```
projects/ep1/assets/
  characters/     → SVG stick figures (.svg)
  backgrounds/    → Scene backgrounds (.jpg, .png)
  sounds/         → SFX and background music (.mp3, .wav)
  voiceovers/     → ElevenLabs narration (.mp3)
  transcripts/    → Auto-generated by transcribe tool (.json, .srt)
```

---

## Features

### Auto-Animations
Characters automatically fade in when a scene starts. No commands needed. Staggered by 0.3s per character.

### Filipino/Taglish Subtitles
Groq Whisper-Large-V3 transcribes with word-level accuracy. Automatically burned into video with bold white text and black outline.

### Audio Ducking
When narration + music are both present, music volume automatically ducks (sidechain compression) during narration segments.

### Format Flexibility
Claude Pro asks you before export: vertical 9:16 or horizontal 16:9.

### Zero Token Rendering
No AI calls during video rendering. Claude only plans and orchestrates; FFmpeg does all the heavy lifting locally.

---

## Technical Architecture

```
┌──────────────────┐
│ Claude Pro       │
│ Desktop App      │
└────────┬─────────┘
         │ MCP Stdio
         ▼
┌──────────────────┐
│ mcp-server/      │
│ - index.mjs      │
│ - tools/         │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────┐
│ src/ │  │ tools/│
│ - project.mjs    │
│ - render-engine.mjs│
└──┬───┘  └──┬───┘
   │         │
   └────┬────┘
        ▼
   ┌─────────┐
   │ FFmpeg  │
   │ (local) │
   └─────────┘
```

---

## Claude Pro Prompt

Paste this in Claude to begin editing:

```
I'm using free247editor MCP to create animated storytelling videos. My project is in my free247editor folder.

I want to create an episode for my Zombie in Manila series. Here's my workflow:
1. You'll create the project with create-project tool
2. I'll upload assets (SVGs, backgrounds, voiceovers) to the project folder
3. I'll paste the script.md
4. You parse it and render previews
5. You transcribe the voiceover for Taglish subtitles
6. You assemble the final MP4

Before exporting, ask me if I want vertical (TikTok) or horizontal (YouTube) format.
```

---

License: MIT
