# Episode Script Format (for ChatGPT)

> Paste this whole file into ChatGPT together with `series/zombie-outbreak/bible.md`, then ask for
> the next episode. The video engine reads this format exactly. Anything it doesn't understand is
> reported by `check`, so follow the rules below.

## Episode rules

- One episode = **5 days**, about **2–3 minutes**, roughly **20–30 scenes**.
- Every day starts with a **day card** scene (`**Card:** DAY 6 | Sampaloc, Manila`).
- Scenes are short: **3–8 seconds**, 1–2 sentences of narration each.
- Narration is **plain English only**, third person, simple and punchy, for a worldwide audience. No Tagalog
  or Taglish words or phrases in narration (character and place names are fine). It is voiced in ElevenLabs,
  one MP3 per scene.
- Only use the characters, locations, poses, props and verbs listed here.

## Episode header (before Scene 1)

```markdown
# Zombie Outbreak: Manila — Episode 2 (Days 6–10)
**Music:** tension.mp3
```
`**Music:**` is one background track for the whole episode. It loops under the voice and gets
quieter while someone speaks. Leave it out for no music.

## Scene format

```markdown
## Scene 5: The Alley
**Day:** 7
**Location:** alley   **Time:** night   **Weather:** rain
**Characters:**
- Marco @ (300, 1650) facing: right
- Jun @ (180, 1700) facing: right pose: scared
- Zombie x4 @ (1250, 1660) spread: 360
**Props:**
- trash @ (900, 1680)
**Actions:**
- 0.2 Zombies shamble to (800, 1660) in 4
- 1.5 Jun scared
- 2.0 Camera shake
- 3.0 Marco attack Zombie 1
- 4.0 Marco run to (-200, 1650)
- 4.2 Jun run to (-200, 1700)
**Narration:** Four of them came out of the dark. Marco swung once, and then they ran.
**SFX:**
- zombie-groan.mp3 @ 0.5
**Transition:** cut -> fade
```

Every field except the heading is optional. `Day`, `Location`, `Time` and `Weather` carry over
from the previous scene when left out. **Duration** is automatic: the scene lasts as long as its
voiceover. Add `**Duration:** 6` only to make a scene longer, for example a silent scene.

### Day card
```markdown
## Scene 1: Day 6
**Card:** DAY 6 | Sampaloc, Manila
**Narration:** Day six. The water stopped running.
```

## Screen coordinates (vertical 1080 × 1920)

```
x: 0 (left edge) … 540 (center) … 1080 (right edge)
y: the ground line is at 1500. Characters stand at y 1600–1750
   (bigger y = closer to the camera, drawn in front).
Off-screen: x -200 (left) or 1280 (right).
```
Keep characters at least ~150 px apart. Put the main character near x 300–700.

## Characters

| Name in script | Who |
|---|---|
| Marco | Leader, 34, jeepney driver. Red shirt, blue cap, crowbar. |
| Ana | Nurse, 28. Teal scrubs, ponytail, medkit. |
| Jun | Student, 17. Yellow shirt, backpack, baseball bat. |
| Lola Cora | Grandmother, 70, sari-sari store owner. Purple, glasses, frying pan. |
| Zombie | Normal infected: slow, shambling. |
| Runner | Fast infected: runs. Only from Day 4 onward. |

Character line options: `facing: left|right`, `pose: <pose>`, `expression: <expression>`,
`scale: 0.8` (smaller = farther away), `holding: bat|pipe|crowbar|knife|bolo|spear|pan|flashlight|none`
(only for characters without sprite images; in a sprite, what they hold is part of the picture).
**Crowds:** `Zombie x6 @ (700, 1660) spread: 500` makes 6 zombies spread over 500 px. In
actions, `Zombies` moves all of them and `Zombie 2` moves one.

## Actions (one per line, starting with seconds into the scene)

| Action | Example |
|---|---|
| walk / run / shamble / sneak to a spot | `1.0 Ana walk to (700, 1650) in 2` (`in 2` = takes 2 s; optional) |
| move a distance | `1.0 Jun run left 400` |
| enter from off-screen | `0.5 Marco enter from left running` (walks to his listed position) |
| leave the screen | `4.0 Ana exit right running` |
| face a direction | `2.0 Marco face left` |
| attack someone | `3.0 Marco attack Zombie 1` |
| fall down (stays down) | `3.4 Zombie 1 fall` |
| pose | `2.0 Lola Cora point` or `2.0 Jun scared for 1.5` |
| appear / disappear | `1.0 Runner appear` |
| change expression | `2.0 Jun expression angry` (stays until changed) |

**Poses:** idle, walk, run, sneak, crouch (or hide), sit, scared, point, wave, talk, think, look,
hold, aim, push, hurt, cheer, swing (or attack), fall, lie (or dead), eat (zombies feeding),
zidle (zombie standing).

**Expressions:** neutral, happy, scared, worried, angry, sad, surprised, determined. Zombies have no
expressions. Without one, a pose picks its own (scared → scared, swing → determined, cheer → happy,
hurt → sad), otherwise neutral. Each new pose + expression pair can need a new character image,
so reuse the same few pairs where the story allows.

**Camera:** `2.0 Camera shake`, `2.0 Camera flash red` (or `white`), `3.0 Camera zoom 1.3 in 1.5 on Ana`,
`5.0 Camera fade out`.

## Locations

`street`, `alley`, `house`, `rooftop`, `store` (Lola Cora's sari-sari store), `mall`, `highway`,
`bridge`, `hospital`, `evac` (evacuation center), `outskirts` (fields/trees outside the city),
`black` (empty dark).
**Time:** dawn, day, dusk, night. **Weather:** clear, rain.
A new location is allowed (for example `**Location:** church`): it then needs an image,
`shared-assets/backgrounds/church.png` (or `church-night.png` for one time of day), which is
reused in later episodes. Prefer the drawn locations above, and use a new one only when the story needs it.
Optional custom image for one scene: `**Background:** backgrounds/my-picture.png`.

## Props

`- <prop> @ (x, y) scale: 1 facing: left` with props: barricade, crate, door, car, jeepney, fire,
supplies, cot, table, trash.

## Sound

- `**SFX:**` list: `- file.mp3 @ 1.5` (seconds into the scene). Files go in `assets/sounds/`.
- Narration MP3s are named after the scene: `scene-01.mp3`, `scene-02.mp3`, …

## Writing tips

- Show, don't tell: give every scene at least one action so something moves.
- One idea per scene. Cliffhanger in the last scene of each episode.
- End each day with a survival lesson or a hard choice. That's the hook of the series.
