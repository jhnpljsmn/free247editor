# Zombie Outbreak: Episode Production Guide

How to make one episode (5 days, 2–3 minutes, vertical 1080×1920) from script to finished video.
Run all commands from the `free247editor` folder.

```
1. ChatGPT       → script.md
2. Claude Code   → voiceover script, asset checklist, Google Flow prompts for missing images
3. You           → MP3s in ElevenLabs, missing images in Google Flow
4. Claude Code   → check that every file is there
5. Claude Code   → render a preview, fix, render the final version
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
About 2–3 minutes, 20–30 scenes, a day card at the start of each day.
Plain English narration only, no Tagalog or Taglish words.
```

Save the answer as `projects/manila-ep02/script.md`.

## 2. Plan the production

Ask Claude Code: **"Plan manila-ep02"**. It creates the project if needed, imports the script,
and writes these files to `projects/manila-ep02/production/`:

| File | What it is |
|---|---|
| `voiceover.md` | One block per scene: the file name, delivery notes, and the line to paste into ElevenLabs |
| `asset-checklist.md` | Every scene's background, characters (pose + expression), voiceover and sounds, marked ✅ reused / ⚠️ close match / ❌ missing |
| `flow-prompts.md` | Google Flow prompts for the missing images only |

If every image already exists, Claude Code tells you so and there's nothing to generate.

## 3. Make the voiceovers and images

**ElevenLabs (Eleven v3):** for each block in `voiceover.md`, paste its last line (the one with
`[tags]`), using the same voice every episode. Save as the listed name (`scene-01.mp3`,
`scene-02.mp3`, …) in `projects/manila-ep02/assets/voiceovers/`.

**Google Flow:** generate each prompt in `flow-prompts.md` and save it under the file name shown,
for example `shared-assets/cast/marco/run-scared.png`. Images saved there are reused in every
later episode. See `shared-assets/flow-style.md` for how to keep characters looking the same.

Sound effects and music go in `projects/manila-ep02/assets/sounds/`, or in `my-sounds/` to reuse them.

## 4. Check the files

Ask Claude Code: **"Check manila-ep02"**, or run:

```bash
node src/cli.mjs check manila-ep02        # missing MP3s, images, sounds and script mistakes
node src/cli.mjs plan-assets manila-ep02  # refreshes asset-checklist.md
```

## 5. Render

Ask Claude Code: **"Render manila-ep02"**, or run:

```bash
node src/cli.mjs render manila-ep02                  # preview → outbox/manila-ep02-v1.mp4
node src/cli.mjs render manila-ep02 --quality final  # → outbox/manila-ep02-final.mp4
```

- Scene length follows the voiceover. Captions are timed word by word from the MP3 (a free Groq
  transcription that runs once per scene).
- To change a scene, edit `script.md`, then ask Claude Code to re-import and render. Only the scenes
  that changed are re-rendered.
- After each episode, update "Story so far" in the bible.

---

## Characters stay consistent

Each character has a sheet in `shared-assets/cast/<name>.json` (description, colors, height) and a
folder of images in `shared-assets/cast/<name>/`, named `<pose>-<expression>.png`:

- **Poses:** the list in `script-template.md` (idle, walk, run, scared, point, …).
- **Expressions:** neutral, happy, scared, worried, angry, sad, surprised, determined. Zombies use neutral only.
- If an exact image is missing, the closest one is used (same pose with another face, then standing).
  A character with no images yet is drawn by code from its sheet.
- `node src/cli.mjs sync-assets` updates the asset list in `shared-assets/registry.json`.

To add a character, copy one of the JSON files and change it. Claude Code uses it to write Flow prompts.

| Field | Values |
|---|---|
| `shirt`, `pants`, `color`, `headFill`, `hairColor`, `hatColor`, `accessoryColor` | `#rrggbb` |
| `height` | 0.8 (short) to 1.15 (tall); scales the image too |
| `build` | thin, normal, heavy |
| `hair` | none, short, long, spiky, ponytail, bun |
| `hat` | none, cap, beanie, helmet, hardhat, bandana |
| `accessory` | none, backpack, glasses, scarf, bag, medkit |
| `weapon` | none, bat, pipe, crowbar, knife, bolo, spear, pan, flashlight |
| `zombie` | true for infected |
| `aliases` | other names the script may use, e.g. `["Lola", "Cora"]` |

## Where things are

```
projects/<episode>/script.md                the episode script
projects/<episode>/production/              voiceover script, asset checklist, Flow prompts
projects/<episode>/assets/voiceovers/       scene-01.mp3 … (plus .json transcripts)
projects/<episode>/assets/sounds/           SFX and music
projects/<episode>/renders/                 per-scene clips (reused when unchanged)
outbox/                                     finished videos
shared-assets/cast/                         character sheets and images
shared-assets/backgrounds/                  images for locations the code doesn't draw
shared-assets/flow-style.md                 Google Flow style rules
shared-assets/registry.json                 list of all reusable images and sounds
series/zombie-outbreak/bible.md             story bible
```
