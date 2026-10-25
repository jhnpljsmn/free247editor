# Doommates: how to make an episode

You write the script, Claude Code plans the scenes, you make the images and voice, and Claude Code
puts the video together.

## 1. Give Claude the script

Save the script as a .docx (for example in `series/zombie-outbreak/`) and tell Claude Code which
episode to make, e.g. "make episode 1 from doommates.docx".

## 2. Get the scenes and voiceover

Claude Code writes two files in `projects/<episode>/production/`:

- **`scenes.md`**: every scene, with a Google Flow prompt and the camera move (zoom or pan).
- **`voiceover.md`**: the whole narration for ElevenLabs, with v3 tags like `[whispers]`.

## 3. Make the images and the voice

- **Google Flow:** for each scene, paste its prompt and add Paul's and Jen's reference images. Save the
  image as `projects/<episode>/scenes/scene-01.jpg`, `scene-02.jpg`, and so on (the number matches the
  scene). Make images 9:16 (or 16:9 if you want a wide video).
- **ElevenLabs (Eleven v3):** paste the voiceover text, generate, and save it as
  `projects/<episode>/voiceover.mp3`. Read the words as written: only the tags can change.

## 4. Assemble

Tell Claude Code "assemble <episode>". It checks the files, transcribes the voice for caption
timing, and makes a preview in `outbox/`. When you're happy, ask for the final version.
It's 9:16 unless you say "16:9" or "wide".

## Where things are

| What | Where |
|---|---|
| Scripts | `series/<series>/*.docx` |
| Scene list, prompts, voiceover | `projects/<episode>/production/` |
| Scene images | `projects/<episode>/scenes/scene-NN.jpg` |
| Narration | `projects/<episode>/voiceover.mp3` |
| Videos | `outbox/` |
| Image style and character looks | `shared-assets/flow-style.md` |
