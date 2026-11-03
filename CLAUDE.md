# Doommates: episode production

Episodes are scene stills from Google Flow with a slow camera move, one ElevenLabs narration MP3 and
word-by-word captions. 9:16 (1080×1920) by default; 16:9 only when the user asks.
The user's guide is `INSTRUCTIONS.md`; the image style is `shared-assets/flow-style.md`.
Run everything from this folder with `node src/cli.mjs`.

## Series

| Series | What it is | Scripts | Projects |
|---|---|---|---|
| **Doommates: Project Echo** | Main story, Paul and Jen. S1 Makati, S2 New York | `series/zombie-outbreak/` | `<city>-epNN` (e.g. `newyork-ep01`) |
| **Doommates: What If?** | Standalone survival episodes, any characters or scenario | `series/what-if/` | `whatif-epNN` |

Characters live in `shared-assets/flow-style.md`. Before writing prompts, use the look saved there; when
a new character appears, add them there (never change Paul's or Jen's lines).

## Workflow (stop at each ⏸ and wait for the user)

1. **Script.** The user gives a .docx (one episode or a whole season, e.g. `series/<series>/*.docx`).
   Read it with `textutil -convert txt -stdout <file>.docx`, only the episode being made.
   `create-project <ep>` (e.g. `makati-ep01`) if the folder doesn't exist.
2. **Scenes and prompts.** Write `projects/<ep>/production/scenes.md` (format below): one scene per
   image, following the script's scenes (split a long scene into more images if it needs them).
   End it with a `## Thumbnail` block (format below).
3. **Voiceover.** Write `projects/<ep>/production/voiceover.md` (format below). Tell the user how many
   images to make and the character count. If the narration is over about 430 words, warn the user
   it may run past 3 minutes and suggest trims (don't cut without asking). ⏸
4. **The user saves** `scenes/scene-NN.jpg` (from Flow) and `voiceover.mp3` (from ElevenLabs) in the
   episode folder. Run `check <ep>` and report anything missing. ⏸
5. **Assemble.** `assemble <ep>` (add `--wide` for 16:9) transcribes the MP3, cuts between scenes where
   each scene's narration starts, and writes a preview `outbox/<ep>-vN.mp4`. Report the scene times and
   any `WARNING:`. Flow saves images as `scene-NN_2K_<timestamp>.jpg`; rename them to `scene-NN.jpg`
   first. **The video must be under 3:00 (180s)** or YouTube won't count it as a Short: if the output
   is 180s or longer, say so before the final export and propose narration trims. After the user
   approves: `assemble <ep> --quality final`. ⏸
6. **Post copy.** With every final export, write `projects/<ep>/production/post.md` and show it in chat,
   ready to paste. The Facebook caption and the YouTube description both start with the header, then a
   blank line:
   - Project Echo: `🎬 DOOMMATES: PROJECT ECHO | S<season> E<n>: <Episode Title>`, next line `📍 <City>`.
   - What If?: `🎬 DOOMMATES: WHAT IF? | Episode <n>: <Episode Title>` (no location line).
   Hashtags always include #Doommates plus #ProjectEcho or #DoommatesWhatIf.
   - **Facebook Reels:** a scroll-stopping first line (hook, no spoilers of the twist), 1–2 short lines
     teasing the story, a call to action (follow for the next episode, comment a guess), 3–5 hashtags.
   - **YouTube Shorts:** a title under 60 characters (catchy, curiosity, include "S2 Ep 1" or
     "What If? Ep 1"), a 2–3 line description with the same hook and a call to subscribe, and 3–5 hashtags
     including #Shorts.
   Plain English, a few emojis at most.

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

### Thumbnail

The last block of every scenes.md is `## Thumbnail (FB Reels and YT Shorts cover)` with one Flow
prompt for a 9:16 cover the user sets by hand on Facebook and YouTube. It is never part of the video
(the assembler only reads `## Scene NN` blocks); the user saves it as `scenes/thumbnail.jpg`.
Make it catchy and high-converting: instant legibility, emotional curiosity, a clean composition that
pops on a small phone screen. The episode's main characters big in the center with strong expressions,
one bold story hook behind them, rim light, a limited high-contrast palette, a headline of 2–4 words
in huge outlined block letters just below the top edge, and a bottom quarter with no faces or text
(platform UI). That bottom quarter must continue the scene and fade gradually into a dark gradient:
say "no hard edge, cut-off line, border or flat empty band", or Flow makes it look cut.
Add a small dark rounded pill badge in the top-left corner with short white text, "S2 · EP1" (or
"WHAT IF? · EP1"), smaller than the headline and not competing with it. No city text: the landmarks
show the place. Add 2–3 headline alternatives and the tip to add text in Canva/CapCut if Flow
misspells the headline or badge.

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

### Episode ending (outro)

The last scene's narration extends the script's end card, which is the one approved exception to "don't
change the wording". Write it in both scenes.md and voiceover.md, then show it to the user in chat
and get their approval before they generate the voiceover (the ⏸ in step 3). If they change it,
update both files and recount.
- Project Echo: keep `DAY N COMPLETE. N DAYS REMAINING.` first and `NEXT: <TITLE>.` last. In between:
  1. a question that turns this episode's cliffhanger over to the audience and asks them to comment
     (vary the wording; sometimes a choice like "Would you have trusted her?");
  2. a 1–2 line teaser of the next episode, in the tone of both episodes (suspense, mystery or dark
     humor as fits), built on its setting or premise, never its twist. Don't start it with
     "Next" (or use the word), since the closing `NEXT:` line already says it;
  3. a line asking viewers to follow Doommates, tied to the story (e.g. "so you don't get left behind").
- What If?: a closing line in the episode's tone, a comment question, and a follow line.
- Keep it to about 40–60 words, and keep the episode under 3:00.

## Rules

- Never generate images or audio; write prompts and scripts for the user to generate.
- No sound effects or music.
- Keep tokens low: use CLI output and `production/` files instead of reading engine code, unless
  debugging. Ask the user instead of guessing.
- Ask before changing the story or wording of the script.
