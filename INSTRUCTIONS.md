# Zombie Outbreak — Episode Production Guide

How to make one episode (5 days, 2–3 minutes, vertical 1080×1920) from script to finished video.
Run all commands from the `free247editor` folder.

```
1. ChatGPT      → script.md
2. Claude Code  → import the script, export the voiceover lines
3. ElevenLabs   → one MP3 per scene
4. Claude Code  → check, render a preview, fix, render the final version
```

Episodes are named `<city>-epNN`: `manila-ep01` … `manila-ep06`, then the next city.

---

## 1. Write the script with ChatGPT

Paste these two files into ChatGPT:
- `series/zombie-outbreak/bible.md` (story, cast, rules, arc)
- `script-template.md` (the exact format the engine reads)

Then ask:

```
Write manila-ep02 (Days 6–10) following the bible and the script format exactly.
About 2–3 minutes, 20–30 scenes, a day card at the start of each day, English narration.
```

Save the answer as `projects/manila-ep02/script.md`.

## 2. Create the project and import the script

Ask Claude Code: **"Create manila-ep02 and import its script"**, or run:

```bash
node src/cli.mjs create-project manila-ep02 --format vertical
node src/cli.mjs import-script manila-ep02
node src/cli.mjs voice-lines manila-ep02
```

`voice-lines` writes `projects/manila-ep02/voiceover-lines.txt`, with each scene's narration
under the file name it needs.

## 3. Make the voiceovers in ElevenLabs

Generate one MP3 per scene from `voiceover-lines.txt`, using the same voice for every episode.
Name them exactly as listed (`scene-01.mp3`, `scene-02.mp3`, …) and put them in
`projects/manila-ep02/assets/voiceovers/`.

Put sound effects and music in `projects/manila-ep02/assets/sounds/`, or put reused ones in
`my-sounds/`.

## 4. Check and render

Ask Claude Code: **"Check and render manila-ep02"**, or run:

```bash
node src/cli.mjs check manila-ep02     # lists missing files and script mistakes
node src/cli.mjs render manila-ep02    # preview → outbox/manila-ep02-v1.mp4
```

- Scene length follows the voiceover. Captions are timed word by word from the MP3, using a free
  Groq transcription that runs once per scene.
- To change a scene, edit `script.md`, then run `import-script` and `render` again. Only the
  scenes that changed are re-rendered.
- When it looks right, run `node src/cli.mjs render manila-ep02 --quality final` →
  `outbox/manila-ep02-final.mp4`.
- After each episode, update "Story so far" in the bible.

---

## Characters stay consistent

Each character is defined once in `shared-assets/cast/<name>.json`: shirt color, height, hair,
hat, accessory and weapon. The engine draws them the same way in every episode. To see all of
them, run `node src/cli.mjs cast-sheet` → `shared-assets/cast/cast-sheet.png`.

To add or change a character, edit or copy one of those JSON files. These are the options:

| Field | Values |
|---|---|
| `shirt`, `pants`, `color`, `headFill`, `hairColor`, `hatColor`, `accessoryColor` | `#rrggbb` |
| `height` | 0.8 (short) to 1.15 (tall) |
| `build` | thin, normal, heavy |
| `hair` | none, short, long, spiky, ponytail, bun |
| `hat` | none, cap, beanie, helmet, hardhat, bandana |
| `accessory` | none, backpack, glasses, scarf, bag, medkit |
| `weapon` | none, bat, pipe, crowbar, knife, bolo, spear, pan, flashlight |
| `zombie` | true for infected (red eyes, shambling walk) |
| `aliases` | other names the script may use, e.g. `["Lola", "Cora"]` |

## Where things are

```
projects/<episode>/script.md                the episode script
projects/<episode>/voiceover-lines.txt      text for ElevenLabs
projects/<episode>/assets/voiceovers/       scene-01.mp3 … (plus .json transcripts)
projects/<episode>/assets/sounds/           SFX and music
projects/<episode>/renders/                 per-scene clips (reused when unchanged)
outbox/                                     finished videos
shared-assets/cast/                         character sheets
series/zombie-outbreak/bible.md             story bible
```
