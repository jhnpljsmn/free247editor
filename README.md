# Doommates episode assembler

Turns scene stills (Google Flow) and one narration MP3 (ElevenLabs) into a video: a slow zoom or pan
on each image, crossfades between scenes, and word-by-word captions timed from a transcript.
9:16 (1080×1920) by default, 16:9 with `--wide`. Rendering is local (canvas + FFmpeg); transcription
uses Groq's free API (or faster-whisper locally).

- **`INSTRUCTIONS.md`**: how to make an episode, step by step
- **`CLAUDE.md`**: the workflow and file formats Claude Code follows
- **`shared-assets/flow-style.md`**: how scene images are prompted
- **`MAC_SETUP.md`**: installing on a new Mac

```bash
node src/cli.mjs create-project makati-ep01
node src/cli.mjs check makati-ep01
node src/cli.mjs assemble makati-ep01                  # preview, 9:16
node src/cli.mjs assemble makati-ep01 --quality final  # add --wide for 16:9
```
