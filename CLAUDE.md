# Doommates: episode production

Episodes are scene stills from Google Flow with a slow camera move, one ElevenLabs narration MP3 and
word-by-word captions. 9:16 (1080×1920) by default; 16:9 only when the user asks.
The user's guide is `INSTRUCTIONS.md`; the image style is `shared-assets/flow-style.md`.
Run everything from this folder with `node src/cli.mjs`.

## Series

| Series | What it is | Scripts | Projects |
|---|---|---|---|
| **Doommates: Project Echo** | Main story, Paul and Jen. S1 Makati, S2 New York | `series/zombie-outbreak/` | `<city>-epNN` (e.g. `newyork-ep01`) |
| **Doommates: What If?** | Standalone survival episodes, any characters or scenario | `series/what-if/` | `whatif-s<N>-epNN` (e.g. `whatif-s1-ep01`) |
| **Survive The Choice** (separate channel) | Stickman "you" survival, viewers vote the next move | `series/survive-the-choice/bible.md` | `stc-dayNN`, `stc-wysNN` |

What If? seasons only group files (S1 = `series/what-if/doomates-whatif-s1.docx`, 6 episodes). Every
episode is self-contained, with no story carried between episodes and no "previously" or "next episode" teasers. The
season never shows publicly: captions, badge and YT titles say "Episode <n>" only. The script calls the
series "Survival Mode"; the public name is still "Doommates: What If?".

Characters live in `shared-assets/flow-style.md`. Before writing prompts, use the look saved there; when
a new character appears, add them there (never change Paul's or Jen's lines).

## Survive The Choice (separate channel)

Follow `series/survive-the-choice/bible.md` (formats, voice rules, hook formulas, season spine, votes
log) and `shared-assets/stc-style.md` (its own style block and characters; never Paul or Jen).
Same workflow below, with these differences:
- **Step 1:** there is no .docx. Claude drafts the episode straight into `scenes.md`; the script, hook
  and vote ending are approved together at the ⏸ in step 3. Before writing Day N, check the votes
  log; if the previous vote has no winner yet, ask.
- **Scenes:** cut every 2–3 s (about 6–8 narration words per scene). Reuse Flow variants as described
  in `stc-style.md`. Scene 00 is the hook, written from the bible's formulas. Scenes with no people
  use the place-only block from `stc-style.md`, not the full style block.
- **Ending:** A ends with the 2-way vote and a follow line; B with "Comment 1, 2 or 3" and a pointer
  to the next Day N. No Doommates outro.
- **Thumbnail:** badge "DAY 1" or "WOULD YOU? #1"; red as the accent color.
- **Post copy** header: `🎬 SURVIVE THE CHOICE | Day <n>: <Title>` or `🎬 SURVIVE THE CHOICE | Would
  You Survive? #<n>`. YT title is second-person or a question (e.g. "You Have 1 Hour on Floor 27 😱"),
  under 60 characters. Hashtags: #SurviveTheChoice #Stickman #ZombieApocalypse (+ #Shorts on YT).
- **Research:** `research ["query" ...]` refreshes the viral Shorts report in `research/`
  (~100 API units per query, 10,000/day free).

## Workflow (stop at each ⏸ and wait for the user)

1. **Script.** The user gives a .docx (one episode or a whole season, e.g. `series/<series>/*.docx`).
   Read it with `textutil -convert txt -stdout <file>.docx`, only the episode being made.
   `create-project <ep>` (e.g. `makati-ep01`) if the folder doesn't exist.
2. **Hook.** Propose 2–3 hooks in chat (see "Hook (Scene 00)" below). ⏸ The user picks or edits one.
   **Scenes and prompts.** Write `projects/<ep>/production/scenes.md` (format below), starting with
   `## Scene 00: Hook`, then one scene per image, following the script's scenes (split a long scene
   into more images if it needs them). End it with a `## Thumbnail` block (format below).
3. **Voiceover.** Write `projects/<ep>/production/voiceover.md` (format below). Tell the user how many
   images to make and the character count. If the narration, hook included, is over about 430 words, warn the user
   it may run past 3 minutes and suggest trims (don't cut without asking). ⏸ Only after the user
   approves the voiceover (and outro), run `voiceover <ep>`: it sends the block to ElevenLabs and saves
   `voiceover.mp3`. It spends credits, so never run it before approval, and pass `--force` (which keeps
   the old file as `voiceover.prev.mp3`) only when the user asks for a regeneration.
4. **The user saves** `scenes/scene-NN.jpg` (from Flow) in the episode folder. Run `check <ep>` and
   report anything missing. ⏸
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
Characters: Paul, Jen
Flow prompt: [style block] Wide shot, low angle. Paul ... Jen ... Night, flickering emergency lights. Tense.
```

- `Narration:` is one line: the script's narrator words for that scene, unchanged. Captions show these
  words, so spelling here is what viewers read. No `[tags]` here.
- `Camera:` one of zoom-in, zoom-out, pan-left, pan-right, pan-up, pan-down, still. Vary them, and
  match the mood (zoom-in for tension and reveals, zoom-out for endings and wide places, pans for
  wide places and walking).
- `Characters:` goes right before every `Flow prompt:` (the Thumbnail block too). It names whose
  reference images to add in Flow, or "none"; mark partial shots, e.g. "Zombie (hands only)". A
  "same as Scene NN" scene repeats that scene's line.
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

One block for the whole episode, inside a ``` fence (what `voiceover <ep>` sends to ElevenLabs; the
`Delivery:` line is skipped):

```
Delivery: natural, slightly sarcastic in funny moments, serious in danger.

[calm] It was supposed to be a normal Monday at the office. [pause] [whispers] Then the lights went out.
```

- The user's model is **Eleven v3** (Creator plan, via the API), which reads `[tags]` as directions. Use a few tags,
  not many.
- The words must be exactly the `Narration:` lines in scene order. Only add tags, `...` pauses and
  emphasis; the assembler matches the audio to the scene text.
- One narrator. Plain English. After the fence, give the character count (credits are monthly).
  Over 5,000 characters, `voiceover <ep>` splits it at paragraphs and joins the parts itself.

### Hook (Scene 00)

Every new episode (both series) opens with a hook so viewers don't swipe away in the first seconds.
Like the outro, it's an approved exception to "don't change the wording"; the script's lines stay
unchanged from Scene 01 on.
- Offer 2–3 options in chat, one each: flash-forward (open on the peak moment), stakes/challenge,
  and a question to the viewer. 1–2 sentences, about 15 words or fewer, under about 4 seconds.
- Start mid-action or with a direct challenge. No greeting, no series name, no "in this episode".
  Never spoil the ending or the twist. A flash-forward ends with a time jump (e.g. "Ten minutes
  earlier...") so the story can start.
- Scene 00 image: a close-up of the peak moment with a strong expression and high contrast. Camera
  zoom-in or still. No text in the image. The thumbnail may reuse this moment.
- In voiceover.md the hook comes first, with an urgent tag (e.g. `[urgent]` or `[whispers]`) and a
  `...` pause before Scene 01.

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
- YT titles (all series): use "you" or a question, never the episode number alone (viral Shorts research,
  2026-11-11).
