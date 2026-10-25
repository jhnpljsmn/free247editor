# Google Flow style guide

Every Flow prompt starts with one of the style blocks below, unchanged, so every image looks like
part of the same series. Claude Code writes the prompts in `projects/<episode>/production/flow-prompts.md`.

## Character sprites

**Style block:**

> 2D cartoon character in the same style as the reference image: big round head about one third of
> the body height, simple friendly face with clear eyes, eyebrows and mouth, thick dark outlines,
> flat colors with light cel shading, loose t-shirt and shorts, thin black stick arms and legs,
> black-and-white sneakers. Full body visible from head to feet, centered, turned toward the right.
> Plain pure white background, no ground, no shadow, no text, no labels, no other objects.

Always add the character's worksheet (`shared-assets/worksheets/<character>.jpg`) as a reference image.

**Then add:** who it is (from `shared-assets/cast/<character>.json`: colors, hair, hat, accessory,
what they hold), the pose, and the expression.

**Example:**

> [style block] Character: Paul, young man with tan skin, short black hair, thin mustache and goatee,
> green t-shirt, dark grey shorts. Pose: standing idle, arms relaxed. Expression: happy, wide smile.

**Keep characters consistent:**
1. Put the character's worksheet in Flow as a reference image for every prompt.
2. One pose and one expression per image, full body. Faces alone can't be used as sprites.
3. Save as `shared-assets/cast/<character>/<pose>-<expression>.png`, for example
   `shared-assets/cast/paul/idle-happy.png`. The white background is removed automatically.

## Backgrounds

**Style block:**

> Flat 2D vector illustration background for a vertical 9:16 video, simple shapes, clean edges,
> muted colors, no people, no characters, no text. The ground or floor fills the bottom 22% of the
> image and is flat and empty, so characters can stand on it.

**Then add:** the place, time of day (dawn, day, dusk, night), and weather.

Save as `shared-assets/backgrounds/<location>.png`, or `<location>-<time>.png` for one time of day.
