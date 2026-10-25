# free247editor: Zombie Outbreak episode production

Vertical (1080×1920) episodes with static 2D stick-figure sprites, voiced in ElevenLabs.
The user's step-by-step guide is `INSTRUCTIONS.md`; the script format is `script-template.md`;
the story is `series/zombie-outbreak/bible.md`. Run everything from this folder with `node src/cli.mjs`.

## Workflow (stop at each ⏸ and wait for the user)

1. **Script.** The user saves `projects/<ep>/script.md` (written in ChatGPT from the bible and template).
   If the project doesn't exist: `create-project <ep> --format vertical`. Then `import-script <ep>`.
   Report its warnings; fix format mistakes, but ask before changing story or wording.
2. **Production planning.**
   - `plan-assets <ep>` writes `production/asset-checklist.md` (scene → assets map and checklist) and
     `production/missing.json`. Read `missing.json`; don't re-derive it from the scenes.
   - Write `production/voiceover.md` (format below).
   - Write `production/flow-prompts.md` only for `missing.sprites` and `missing.backgrounds`, using
     `shared-assets/flow-style.md` and the character's `shared-assets/cast/<id>.json`. List
     `missing.approximated` as optional, without prompts unless asked. If nothing is missing, say that
     all visuals are reused.
   - Tell the user: how many MP3s, which images to make, and what is reused. ⏸
3. **The user makes** the MP3s in ElevenLabs and images in Google Flow, and saves them in place.
4. **Validate.** `check <ep>` lists script problems and missing voiceovers, sprites and backgrounds.
   Run `sync-assets` to update the asset manifest (`shared-assets/registry.json`). Report anything
   missing. Don't render until it's clean or the user says to go ahead. ⏸
5. **Assemble.** `render <ep>` makes a preview (`outbox/<ep>-vN.mp4`). Only changed scenes re-render.
   After the user approves: `render <ep> --quality final`. `render` prints `WARNING:` if the output fails
   validation (streams, size, length); report it. Then offer to update "Story so far" in the bible.

## voiceover.md

One block per scene with narration, in scene order:

```
### scene-05.mp3: The Alley
Delivery: tense and low, a short pause before the last words.
[whispers] Four of them came out of the dark. [tense] Marco swung once... and then they ran.
```

- The last line is pasted into ElevenLabs as-is. The user's model is **Eleven v3** (free plan), which
  reads `[tags]` as directions. Use a few tags per line, not many.
- Keep the words identical to the script's narration: captions show the script text, timed from the MP3.
  Only add tags, `...` pauses and emphasis.
- One narrator voice for the whole series. Plain English only. End with the total character count
  (the free plan has a monthly limit).

## Sprites and assets

- Character images: `shared-assets/cast/<id>/<pose>-<expression>.png`, full body, facing right, on
  white. If an exact image is missing, the renderer uses the same pose with another face, then
  standing. A character with no images at all is drawn by code.
- Expressions: neutral, happy, scared, worried, angry, sad, surprised, determined (zombies: neutral only).
- Character worksheets (one PNG with many poses) go in `shared-assets/worksheets/<id>.png` (or .jpg). Cut them
  with `node tools/cut-sprites.mjs` (`--find` lists figure boxes; it saves transparent PNGs with blended
  edges). Clear the white gaps it reports (arm on hip, hair beside arm) with `@x,y`, but keep eye whites and
  shoe soles. Check a preview on a dark background before committing. Run single Flow images through it too.
- New locations: `shared-assets/backgrounds/<location>[-<time>].png`. Prefer the drawn locations.
- New character: copy a JSON in `shared-assets/cast/` (fields listed in `INSTRUCTIONS.md`).

## Rules

- Never generate images or audio; write prompts and scripts for the user to generate.
- Reuse existing assets first. Keep looks consistent with `flow-style.md` and the cast JSONs.
- Keep tokens low: use CLI output and `production/` files instead of reading engine code or scene JSONs,
  unless debugging. Ask the user instead of guessing.
- Don't change `mcp-server/` or `src/render-engine.mjs`: the MCP server uses that older renderer and
  stays as is. The CLI is the working path.
