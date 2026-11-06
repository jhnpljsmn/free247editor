# Mac setup

## 1. Install the tools

```bash
# Homebrew (skip if `brew` already works)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node ffmpeg
```

## 2. Get the code

```bash
mkdir -p ~/Projects && cd ~/Projects
git clone https://github.com/jhnpljsmn/free247editor.git
cd free247editor
git checkout stills-workflow
npm install
```

## 3. Groq key (for caption timing)

Get a free key at https://console.groq.com/keys, then:

```bash
echo "GROQ_API_KEY=gsk_your_key_here" > .env
```

`.env` is never uploaded to GitHub. Without a key, `pip install faster-whisper` lets
`tools/transcribe.mjs --local` transcribe on your Mac instead.

## 4. Check it works

```bash
ffmpeg -version | head -1
node src/cli.mjs help
```

Then open this folder in Claude Code and follow `INSTRUCTIONS.md`.

## Your files stay local

`projects/` (scripts, images, voiceovers) and `outbox/` (videos) are in `.gitignore`, so they are never
pushed to GitHub. Back them up yourself (iCloud, external drive).

## Troubleshooting

- **"FFmpeg not found"**: run `brew install ffmpeg`. The CLI adds `/opt/homebrew/bin` to PATH itself.
- **"GROQ_API_KEY is not set"**: create `.env` as in step 3.
- **Low transcript match warning**: the voiceover words differ from the `Narration:` lines in
  `scenes.md`. Regenerate the voice or fix the text, then run `assemble` again.
