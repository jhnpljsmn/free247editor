# Mac Setup Guide — Fresh MacBook Installation

> This guide is for setting up the Zombie in Manila workflow on a **brand new MacBook** from scratch.

---

## Step 1 — Clone the Repository (Code Only)

Your Mac needs the **code** from GitHub, but your **assets** stay local.

```bash
# 1. Open Terminal on your Mac
# 2. Create a workspace folder (pick any location you want)
mkdir -p ~/Projects

# 3. Clone the repo
cd ~/Projects
git clone https://github.com/jhnpljsmn/free247editor.git

# 4. Switch to the automation branch
cd free247editor
git checkout feature/zombie-automation
```

**What you just downloaded:**
- `mcp-server/` ← The tools Claude will use
- `src/` ← The video rendering engine (FFmpeg wrapper)
- `script-template.md` ← Format for ChatGPT
- `INSTRUCTIONS.md` ← Your production guide
- `MCP-README.md` ← Claude Desktop setup

**What did NOT come from GitHub (you’ll add these later):**
- `projects/` ← Episode folders with your SVGs, voiceovers, sounds
- Any rendered videos

---

## Step 2 — Install Dependencies

### 2a. Install Homebrew (if you don’t have it)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2b. Install Node.js (v18+)

```bash
brew install node
node --version  # Should say v18 or higher
```

### 2c. Install FFmpeg

```bash
brew install ffmpeg
ffmpeg -version  # Should print version info
```

### 2d. Install Project Dependencies

```bash
cd ~/Projects/free247editor
npm install
```

---

## Step 3 — Choose Your Claude Tool

You have **two options** for running this workflow on macOS.

### Option A: Claude Desktop (Recommended for You)

**What it is:** The official Claude app you download from Anthropic (like ChatGPT app but for Claude).

**Why it’s recommended:**
- It supports **MCP servers** natively
- Chat-based interface (familiar, like talking to ChatGPT)
- We already built the `mcp-server` specifically for this
- You say "render preview" and it happens

**Where to get it:**
- Download from: https://claude.ai/download
- Install like any Mac app

**Setup:**

1. Open Claude Desktop → Settings → Developer
2. Make sure "Developer mode" is enabled
3. Find your `claude_desktop_config.json` file:
   - Path: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - (You may need to create this file if it doesn’t exist)

4. Paste this exact config:

```json
{
  "mcpServers": {
    "free247editor": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/Projects/free247editor/mcp-server/index.mjs"]
    }
  }
}
```

**⚠️ Important:** Replace `YOUR_USERNAME` with your actual Mac username (same as what `whoami` shows in Terminal). Example: `/Users/john/Projects/free247editor/mcp-server/index.mjs`

5. Save the file
6. **Restart Claude Desktop completely** (quit and reopen)

**Verify it works:**
- Open a new chat in Claude Desktop
- Type: *"List my tools"* or look for the 🔨 hammer icon in the chat box
- If you see `free247editor` tools listed, it’s working!

---

### Option B: Claude Code CLI (For Power Users)

**What it is:** A terminal-based AI coding assistant that runs inside your project folder.

**Why you might prefer it:**
- Direct file access (no MCP abstraction layer)
- Executes shell commands natively
- Great for debugging FFmpeg issues
- Works offline once started

**Where to get it:**
```bash
# Install via npm
npm install -g @anthropic-ai/claude-code

# Or via Homebrew
brew install claude-code
```

**How it works differently:**
- Instead of MCP config, Claude Code runs **inside** your project directory
- It can directly call `node src/cli.mjs render scene-01 --project episode-01`
- It reads and writes files, just like I do
- **No MCP server needed** — it interacts with the code directly

**Usage:**
```bash
cd ~/Projects/free247editor
claude
```
Then chat with it inside the terminal.

---

## Step 4 — Groq API Key (for Subtitles)

If you want automatic Taglish subtitle transcription, get a free Groq key:

1. Go to https://console.groq.com/keys
2. Create a free account
3. Generate an API key
4. On your Mac, create `.env` file:

```bash
cd ~/Projects/free247editor
# Create the .env file
echo "GROQ_API_KEY=gsk_your_actual_key_here" > .env
```

**This `.env` file is never uploaded to GitHub** (it’s in `.gitignore`).

---

## Step 5 — Your Episodes Stay LOCAL (Not on GitHub)

### ⚠️ Critical: Assets Are Private

Your SVG characters, voiceovers, music, and videos **never leave your Mac** (unless you choose to upload them somewhere else).

The folder structure on your Mac:
```
~/Projects/free247editor/
│
├── .git/                          ← Git history (code only)
├── mcp-server/                     ← From GitHub
├── src/                            ← From GitHub
├── script-template.md              ← From GitHub
├── INSTRUCTIONS.md                 ← From GitHub
├── .env                            ← Your Groq key (local)
│
└── projects/                       ← 🛑 NOT tracked by Git (your content)
    └── episode-01/
        ├── script.md               ← Paste ChatGPT output here
        └── assets/
            ├── characters/
            │   ├── juan.svg        ← Your DALL-E/Midjourney images
            │   └── zombie.svg
            ├── bg/
            │   └── manila-alley.png
            ├── sounds/
            │   └── zombie-groan.mp3
            ├── music/
            │   └── tense-ambience.mp3
            └── voiceovers/
                ├── scene-01.mp3    ← From ElevenLabs
                └── scene-02.mp3
```

### Why assets are safe (not on GitHub)

The `.gitignore` file in the repo already excludes:
```
projects/*/renders/**/*.mp4   ← Rendered videos
.env                         ← API keys
outbox/*                     ← Exports
```

**But for extra safety**, after cloning, run this on your Mac:

```bash
cd ~/Projects/free247editor
# Add this line to .gitignore to exclude ALL project assets
echo "projects/*/assets/" >> .gitignore
```

This ensures **even if you accidentally run `git add .`, your voiceovers and art never get pushed publicly**.

---

## Step 6 — Confirm Everything Works

### Test 1: Can FFmpeg run?
```bash
ffmpeg -f lavfi -i testsrc=duration=1:size=1080x1920:rate=1 -f null -
```
Should print FFmpeg info without errors.

### Test 2: Can Node run the project?
```bash
cd ~/Projects/free247editor
node src/cli.mjs create test-episode --format vertical
```

Should create a folder at `projects/test-episode/`.

### Test 3: Is Claude Desktop connected?

Open Claude Desktop, start a new chat, and type:
```
What tools do you have available?
```

If you see `free247editor` with tools like `create-project`, `parse-script`, `render-scene`, it’s live!

---

## Step 7 — Your First Episode (The Workflow)

Now you’re ready. Here’s the actual process:

1. **ChatGPT (any browser)** → Writes your `script.md`
2. **ElevenLabs (browser)** → Makes voiceover MP3s
3. **Your Mac (Finder)** → You drag SVGs, backgrounds, MP3s into `projects/episode-01/assets/`
4. **Claude Desktop** → You paste the script, Claude calls MCP tools to render
5. **Your Mac** → Final MP4 appears in `projects/episode-01/output/`

**Then you delete `projects/test-episode/` after confirming it works.**

---

## Quick Reference: What Goes Where

| What | On Mac At | Comes From |
|------|-----------|------------|
| Code (mcp-server, src/) | `~/Projects/free247editor/` | GitHub clone |
| Templates (script-template.md) | `~/Projects/free247editor/` | GitHub clone |
| Groq API key | `~/Projects/free247editor/.env` | You type it |
| Episode scripts | `~/Projects/free247editor/projects/episode-XX/script.md` | ChatGPT |
| Character SVGs | `~/Projects/free247editor/projects/episode-XX/assets/characters/` | DALL-E/Midjourney |
| Voiceovers | `~/Projects/free247editor/projects/episode-XX/assets/voiceovers/` | ElevenLabs |
| SFX & Music | `~/Projects/free247editor/projects/episode-XX/assets/sounds/` | Freesound/Artlist |
| Final video | `~/Projects/free247editor/projects/episode-XX/output/` | Claude + FFmpeg |

---

## Troubleshooting

### "Claude Desktop can’t find the MCP server"
- Double-check the path in `claude_desktop_config.json` — it must be the **absolute** path
- Make sure Node.js is installed: `node --version`
- Try restarting Claude Desktop

### "FFmpeg not found"
- Run `brew install ffmpeg`
- If still missing: `which ffmpeg` should show `/opt/homebrew/bin/ffmpeg` (Apple Silicon) or `/usr/local/bin/ffmpeg` (Intel Mac)

### "Permission denied when running mcp-server"
- Make it executable: `chmod +x ~/Projects/free247editor/mcp-server/index.mjs`
- Or use `command: "node"` in the config so Node runs it

---

## Summary

1. **Clone** the repo to `~/Projects/free247editor/`
2. **Install** Node.js, FFmpeg, and npm dependencies
3. **Get** Claude Desktop from Anthropic
4. **Configure** the MCP path in `claude_desktop_config.json`
5. **Set** your Groq API key in `.env`
6. **Create** episodes in `projects/` (never leaves your Mac)
7. **Chat** with Claude Desktop to render videos

---

**Your assets are private. Your code comes from GitHub. Your videos are rendered locally. Claude Desktop just orchestrates.**
