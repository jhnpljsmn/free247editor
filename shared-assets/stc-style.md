# Survive The Choice: Google Flow style guide

A separate look from Doommates (which uses `flow-style.md`): classic minimalist stickman, high
contrast, one red accent. Every scene prompt starts with the style block below, unchanged.

## Style block

> Minimalist stickman animation still, vertical 9:16 composition. Classic stick figures: plain round
> white heads with thick black outlines, simple dot eyes and small expressive eyebrows and mouths,
> thick black stick bodies, arms and legs. Clean flat-color background with simple shapes and
> strong dramatic lighting, limited palette of greys and dark blues with red as the only accent
> color. Bold and readable on a small phone screen. No text, no captions, no logos, no watermarks.

### Place-only block

For scenes with `Characters: none` and no people at all (a city, a door, a stairwell), use this instead
so Flow doesn't add stick figures. Scenes with unnamed crowd extras keep the full block.

> Minimalist flat 2D cartoon background from a stickman animation, vertical 9:16 composition. Clean
> flat-color shapes with thick black outlines and strong dramatic lighting, limited palette of greys
> and dark blues with red as the only accent color. Bold and readable on a small phone screen. No
> people, no characters, no text, no captions, no logos, no watermarks.

## Characters

- **You (the hero):** classic stick figure, round white head, dot eyes, red bandana tied around the
  neck, small black backpack. Always the same; the red bandana is how viewers spot "you" in a crowd.
- **Zombies:** stick figures with grey-green heads, hollow white eyes, jagged mouths, hunched and
  twisted limbs; threatening but not graphic (no gore, no blood pools).

- **Mister Reyes (Day 1, your neighbor in 2704):** older stick figure, small tuft of grey hair, round
  glasses, blue bathrobe.

- **Your friend (Would You Survive? #2):** classic stick figure, yellow cap, white bandage with a small
  red stain on the forearm.

New character: add a line here the first time they appear, with the episode (e.g. "Day 3").

## Reference sheets

Generate each sheet once in Flow, then add it as a reference image to every prompt that shows that
character. Saved as `shared-assets/stc-you-sheet.jpg`, `stc-zombie-sheet.jpg`, `stc-reyes-sheet.jpg`.

- **You:** Character reference sheet, plain light grey background, 16:9 composition. Minimalist
  stickman style: plain round white head with a thick black outline, simple dot eyes, small expressive
  eyebrows and mouth, thick black stick body, arms and legs, all lines the same thickness. The same
  character shown five times in a row, full body, same size, evenly spaced: front view, three-quarter
  view, side view, back view, and running pose. A red bandana tied around the neck with the knot at
  the back, a small black backpack with two straps. Below them, a row of four head close-ups with
  different expressions: calm, scared with wide eyes, determined with narrowed eyes, shouting. Flat
  colors, no shading, red as the only accent color. No text, no labels, no logos, no watermarks.
- **Zombie:** same wording, but: a zombie stick figure with a grey-green round head, hollow white eyes,
  a jagged mouth, hunched back, twisted bent limbs, one arm reaching forward; poses: front, side,
  shambling walk, lunging, listening with head tilted. Expressions: blank, snarling, sniffing, screaming.
  No gore.
- **Mister Reyes:** same wording, but: an older stick figure, small tuft of grey hair on top of the
  head, round glasses, blue bathrobe; poses: front, side, back, waving, holding a newspaper.
  Expressions: friendly smile, surprised, scared, sad.

## Places (repeat word for word)

- **The tower:** a 40-floor grey concrete residential high-rise with small square balconies, in a
  dense Southeast Asian city of other towers, tangled power lines and a jammed highway below.
- **Your unit (floor 27):** a small condo unit with a grey sofa, a kitchenette, a sliding glass
  balcony door and a front door with a peephole and a chain lock.
- **The hallway (floor 27):** a narrow corridor with numbered unit doors, a flickering ceiling light,
  an elevator at one end and a red emergency stair door at the other.
- **The stairwell:** grey concrete stairs zig-zagging down, floor numbers painted on the walls in red.

## Prompt order

Same as `flow-style.md`: `[style block]` + shot + who, with pose and expression + place + lighting
+ mood. Subject in the middle 60% of the frame (captions sit in the lower third).

Fast cuts: one Flow prompt gives 4 variants. Use 2–3 of them as back-to-back scenes (scenes.md
says `Flow prompt: same as Scene NN, variant 2`), so a 50-image episode needs about 20–25 prompts.
