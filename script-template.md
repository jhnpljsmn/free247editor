# Video Script Template for Claude Code Pro (MCP)

> **For ChatGPT / Script Writers:** Use this template when generating scripts for the Zombie in Manila animated series. Claude Code Pro reads this exact format and converts it into rendered video scenes.
>
> **Important:** Follow the syntax precisely. The parser is strict about field names and character positioning.

---

## Quick Rules

1. One file per episode
2. Each scene starts with `## Scene N: Title`
3. Use `**Field:** value` for metadata
4. Use `- list items` for multi-value fields (characters, SFX)
5. Keep scene durations between **3-10 seconds** (shorter = better for social media)

---

## Coordinate System (Vertical Video)

The renderer outputs **1080 x 1920** videos (9:16 vertical).

```
Top-Left: (0, 0)
Center:    (540, 960)
Bottom:    (0, 1920)
Right edge:(1080, 0)
```

| Position | X | Y | Use for |
|----------|---|---|---------|
| Top-center | 540 | 200 | Title cards, flying objects |
| Center | 540 | 960 | Main characters, focal point |
| Bottom-left | 200 | 1600 | Side characters, props |
| Bottom-right | 880 | 1600 | Side characters, props |
| Lower-third | 540 | 1500 | Subtitles (auto-placed) |

**Scale:** 1.0 = 100% original size. Use 0.5 for far objects, 1.5 for close-ups.

---

## Full Field Reference

### **Duration:**
```markdown
**Duration:** 5
```
Scene length in seconds. Integer or decimal (e.g., `3.5`).

---

### **Background:**
```markdown
**Background:** #1a1a2e
```
- **Hex color:** `#RRGGBB` — solid color background
- **Image path:** `bg/manila-street.png` — use a background image (placed in `assets/`)

---

### **Characters:**
```markdown
**Characters:**
- Juan @ (540, 960) scale:1.0
- Zombie @ (200, 1600) scale:0.8
- Crowd @ (880, 900) scale:1.2
```
**Format:** `Name @ (x, y) scale:N`
- `Name` becomes the asset filename: `characters/juan.svg`, `characters/zombie.svg`
- `(x, y)` position in pixels (see coordinate table above)
- `scale:N` optional, default is 1.0

**Character asset requirements:**
- SVG format
- Transparent background
- Named exactly: `characters/[lowercase-name].svg`
- Example: `Juan Pedro` → `characters/juan-pedro.svg`

---

### **Narration:**
```markdown
**Narration:** "Huwag kang lalabas, may zombie sa kanto!"
```
This text is:
1. Spoken by the voiceover actor (you provide `voiceovers/scene-01.mp3`)
2. Burned into the video as Taglish subtitles
3. Auto-transcribed via Groq if audio file is present

**Tip:** Keep narrations short and punchy. One or two sentences max per scene.

---

### **SFX (Sound Effects):**
```markdown
**SFX:**
- gunshot.mp3 @ 0.5
- glass-break.mp3 @ 2.0
- zombie-groan.mp3 @ 0.0
```
**Format:** `filename.mp3 @ timestamp`
- `timestamp` = seconds into the scene when the sound plays
- Place audio files in `assets/sounds/` or `assets/`

---

### **Music:**
```markdown
**Music:** tense-ambience.mp3
```
- Plays throughout the entire scene
- Auto-ducked (volume lowered) when narration plays
- Place in `assets/music/` or `assets/`
- Default volume: 30% (the engine handles mixing)

---

### **Transition:**
```markdown
**Transition:** fade -> cut
```
**Format:** `transition-in -> transition-out`

| Transition | Description |
|------------|-------------|
| `cut` | Instant switch (default) |
| `fade` | Cross-fade |
| `slide-left` | Slide in from left |
| `slide-right` | Slide in from right |
| `zoom-in` | Zoom from center |
| `zoom-out` | Zoom out to center |

The `->` arrow separates **how the scene enters** from **how the next scene exits**.

---

## Complete Episode Example

Below is a full episode script. Use this as your reference for structure, pacing, and asset naming.

---

# Zombie in Manila - Episode 1: "First Bite"

## Scene 1: Title Card

**Duration:** 4
**Background:** #0a0a1a
**Characters:**
- TitleText @ (540, 800) scale:1.5
**Narration:** "Zombie in Manila"
**Music:** intro-theme.mp3
**Transition:** fade -> fade

---

## Scene 2: Alleyway Setup

**Duration:** 5
**Background:** bg/manila-alley-night.png
**Characters:**
- Juan @ (540, 1200) scale:1.0
**Narration:** "Madaling araw sa Tondo. Si Juan ay pauwi mula sa trabaho."
**Music:** tense-ambience.mp3
**Transition:** fade -> cut

---

## Scene 3: The Encounter

**Duration:** 4
**Background:** bg/manila-alley-night.png
**Characters:**
- Juan @ (400, 1200) scale:1.0
- Zombie @ (700, 1200) scale:1.1
**Narration:** "May kakaibang tunog..."
**SFX:**
- zombie-groan.mp3 @ 1.5
- heartbeat.mp3 @ 0.0
**Music:** tense-ambience.mp3
**Transition:** cut -> cut

---

## Scene 4: The Chase

**Duration:** 3
**Background:** #1a0505
**Characters:**
- Juan @ (200, 1200) scale:0.9
- Zombie @ (800, 1200) scale:1.2
**Narration:** "Takbo!"
**SFX:**
- running-footsteps.mp3 @ 0.0
- zombie-roar.mp3 @ 0.5
**Transition:** zoom-in -> slide-left

---

## Scene 5: Dead End

**Duration:** 5
**Background:** bg/brick-wall.png
**Characters:**
- Juan @ (540, 1200) scale:1.0
- Zombie @ (200, 1200) scale:1.1
**Narration:** "Walang lusot. Kailangan niyang lumaban."
**SFX:**
- heavy-breathing.mp3 @ 0.0
**Music:** suspense-rising.mp3
**Transition:** cut -> fade

---

## Scene 6: Fight

**Duration:** 4
**Background:** bg/brick-wall.png
**Characters:**
- Juan @ (500, 1200) scale:1.1
- Zombie @ (600, 1200) scale:1.0
- Bat @ (450, 900) scale:0.5
**Narration:** "Atras o laban!"
**SFX:**
- bat-hit.mp3 @ 1.0
- zombie-pain.mp3 @ 1.2
**Transition:** fade -> cut

---

## Scene 7: Escape

**Duration:** 5
**Background:** bg/manila-street-dawn.png
**Characters:**
- Juan @ (540, 1200) scale:1.0
**Narration:** "Nakatakas siya... pero hindi pa tapos ang gabi."
**Music:** tense-ambience.mp3
**Transition:** fade -> fade

---

## Scene 8: Cliffhanger

**Duration:** 4
**Background:** #0a0a1a
**Characters:**
- ToBeContinued @ (540, 960) scale:1.0
**Narration:** "To be continued..."
**Music:** outro-theme.mp3
**Transition:** fade -> fade

---

## Asset Checklist for This Episode

After writing the script, ensure these files exist in the project folder:

```
projects/episode-01/
├── assets/
│   ├── characters/
│   │   ├── juan.svg
│   │   ├── zombie.svg
│   │   └── bat.svg
│   ├── bg/
│   │   ├── manila-alley-night.png
│   │   ├── brick-wall.png
│   │   └── manila-street-dawn.png
│   ├── sounds/
│   │   ├── zombie-groan.mp3
│   │   ├── heartbeat.mp3
│   │   ├── running-footsteps.mp3
│   │   ├── zombie-roar.mp3
│   │   ├── heavy-breathing.mp3
│   │   ├── bat-hit.mp3
│   │   └── zombie-pain.mp3
│   ├── music/
│   │   ├── intro-theme.mp3
│   │   ├── tense-ambience.mp3
│   │   ├── suspense-rising.mp3
│   │   └── outro-theme.mp3
│   └── voiceovers/
│       ├── scene-01.mp3
│       ├── scene-02.mp3
│       ├── scene-03.mp3
│       ├── scene-04.mp3
│       ├── scene-05.mp3
│       ├── scene-06.mp3
│       ├── scene-07.mp3
│       └── scene-08.mp3
```

---

## Writing Tips for ChatGPT

1. **Pacing:** Alternate between action (3-4s) and dialogue (5-6s). Fast cuts build tension.
2. **Taglish:** Mix Tagalog and English naturally. "Huwag kang lalabas" is pure Tagalog; "Takbo, we're in danger!" is Taglish.
3. **Scene count:** 8-12 scenes per episode is ideal for social media (60-90 seconds total).
4. **Character consistency:** Use the exact same name spelling across all scenes (the parser turns `Juan` into `characters/juan.svg`).
5. **Voiceover timing:** The narration text should match what the voice actor says in `voiceovers/scene-XX.mp3`.
6. **Lazy assets:** If you don't have a background image yet, use `#RRGGBB` colors. The renderer converts colors to video frames automatically.
7. **No characters?** Just omit the `**Characters:**` block entirely for title cards and transitions.

---

## Claude Code Pro Workflow

Once ChatGPT produces this script, paste it into Claude Code Pro and say:

```
Parse this script for project episode-01
```

Claude will:
1. Create the project if it doesn't exist
2. Parse each scene into JSON
3. Tell you exactly which assets are missing
4. Let you run `render-scene` for previews
5. Assemble everything with `assemble` for final export

---

*Template version 1.0 — Compatible with free247editor MCP server*
