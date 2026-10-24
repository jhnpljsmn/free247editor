# Google Flow style guide

Every Flow prompt starts with one of the style blocks below, unchanged, so every image looks like
part of the same series. Claude Code writes the prompts in `projects/<episode>/production/flow-prompts.md`.

## Character sprites

**Style block:**

> Flat 2D cartoon stick figure, simple vector style, thick clean dark outlines, solid flat colors,
> no shading, no gradients, no texture. Round head with simple dot eyes, small eyebrows and a simple
> expressive mouth. Thin stick arms and legs, simple rectangular shirt. Full body visible from head
> to feet, centered, side view facing right. Plain pure white background, no ground, no shadow,
> no text, no other objects.

**Then add:** who it is (from `shared-assets/cast/<character>.json`: colors, hair, hat, accessory,
what they hold), the pose, and the expression.

**Example:**

> [style block] Character: Marco, an adult man with tan skin, red t-shirt, dark blue pants, blue
> baseball cap, holding a crowbar in his right hand. Pose: running, mid-stride, leaning forward.
> Expression: scared, wide eyes, open mouth.

**Keep characters consistent:**
1. Make `idle-neutral` first for each character, and pick the best result.
2. For every other pose or expression, add that `idle-neutral` image as a reference image in Flow.
3. Save as `shared-assets/cast/<character>/<pose>-<expression>.png`, for example
   `shared-assets/cast/marco/run-scared.png`. The white background is removed automatically.

## Backgrounds

**Style block:**

> Flat 2D vector illustration background for a vertical 9:16 video, simple shapes, clean edges,
> muted colors, no people, no characters, no text. The ground or floor fills the bottom 22% of the
> image and is flat and empty, so characters can stand on it.

**Then add:** the place, time of day (dawn, day, dusk, night), and weather.

Save as `shared-assets/backgrounds/<location>.png`, or `<location>-<time>.png` for one time of day.
