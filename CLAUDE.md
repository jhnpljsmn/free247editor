# Doommates: episode production

Episodes are scene stills from Google Flow with a slow camera move, one ElevenLabs narration MP3 and
word-by-word captions. 9:16 (1080×1920) by default; 16:9 only when the user asks.
The user's guide is `INSTRUCTIONS.md`; the image style is `shared-assets/flow-style.md`.
Run everything from this folder with `node src/cli.mjs`.

## Workflow (stop at each ⏸ and wait for the user)

1. **Script.** The user gives a .docx (one episode or a whole season, e.g. `series/<series>/*.docx`).
   Read it with `textutil -convert txt -stdout <file>.docx`, only the episode being made.
   `create-project <ep>` (e.g. `makati-ep01`) if the folder doesn't exist.
2. **Scenes and prompts.** Write `projects/<ep>/production/scenes.md` (format below): one scene per
   image, following the script's scenes (split a long scene into more images if it needs them).
3. **Voiceover.** Write `projects/<ep>/production/voiceover.md` (format below). Tell the user how many
   images to make and the character count. ⏸
4. **The user saves** `scenes/scene-NN.jpg` (from Flow) and `voiceover.mp3` (from ElevenLabs) in the
   episode folder. Run `check <ep>` and report anything missing. ⏸
5. **Assemble.** `assemble <ep>` (add `--wide` for 16:9) transcribes the MP3, cuts between scenes where
   each scene's narration starts, and writes a preview `outbox/<ep>-vN.mp4`. Report the scene times and
   any `WARNING:`. After the user approves: `assemble <ep> --quality final`. ⏸
6. **Post copy.** With every final export, write `projects/<ep>/production/post.md` and show it in chat,
   ready to paste. The Facebook caption and the YouTube description both start with a title line:
   `🎬 DOOMMATES | Episode N: <Episode Title>`, then a blank line.
   - **Facebook Reels:** a scroll-stopping first line (hook, no spoilers of the twist), 1–2 short lines
     teasing the story, a call to action (follow for the next episode, comment a guess), 3–5 hashtags.
   - **YouTube Shorts:** a title under 60 characters (catchy, curiosity, include "Day N" or the episode
     number), a 2–3 line description with the same hook and a call to subscribe, and 3–5 hashtags
     including #Shorts.
   Plain English, a few emojis at most, and always "Doommates" plus the season/episode.

## scenes.md

```
## Scene 01: The Lobby
Camera: zoom-in
Narration: It was supposed to be a normal Monday at the office.
Flow prompt: [style block] Wide shot, low angle. Paul ... Jen ... Night, flickering emergency lights. Tense.
```

- `Narration:` is one line: the script's narrator words for that scene, unchanged. Captions show these
  words, so spelling here is what viewers read. No `[tags]` here.
- `Camera:` one of zoom-in, zoom-out, pan-left, pan-right, pan-up, pan-down, still. Vary them, and
  match the mood (zoom-in for tension and reveals, zoom-out for endings and wide places, pans for
  wide places and walking).
- `Flow prompt:` follows `shared-assets/flow-style.md`. Name the characters in it; the user adds their
  reference images in Flow. It describes one still image only: no camera motion or animation (the
  assembler applies `Camera:`, chosen by Claude).

## voiceover.md

One block for the whole episode, pasted into ElevenLabs as one generation:

```
Delivery: natural, slightly sarcastic in funny moments, serious in danger.

[calm] It was supposed to be a normal Monday at the office. [pause] [whispers] Then the lights went out.
```

- The user's model is **Eleven v3** (free plan), which reads `[tags]` as directions. Use a few tags,
  not many.
- The words must be exactly the `Narration:` lines in scene order. Only add tags, `...` pauses and
  emphasis; the assembler matches the audio to the scene text.
- One narrator. Plain English. End with the character count (the free plan has a monthly limit).
  If it's longer than one v3 generation allows (about 5,000 characters), split it into parts and tell
  the user to join the MP3s into one `voiceover.mp3`.

## Rules

- Never generate images or audio; write prompts and scripts for the user to generate.
- No sound effects or music.
- Keep tokens low: use CLI output and `production/` files instead of reading engine code, unless
  debugging. Ask the user instead of guessing.
- Ask before changing the story or wording of the script.
