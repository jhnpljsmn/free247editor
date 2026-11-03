# Google Flow style guide

Every scene prompt starts with the style block below, unchanged, so every image looks like part of
the same series. Claude Code writes the prompts in `projects/<ep>/production/scenes.md`.

## Style block

> Cinematic 2D cartoon illustration, vertical 9:16 composition. Stick-figure cartoon characters in the
> same style as the reference images: big round heads, simple expressive faces, thick dark outlines,
> flat colors with light cel shading, thin black stick arms and legs. Detailed, atmospheric
> background with dramatic lighting. No text, no captions, no logos, no watermarks.

For 16:9 episodes, replace "vertical 9:16 composition" with "wide 16:9 composition".

## Characters

Add the character reference images in Flow for every prompt that shows them, and describe them with
these exact words:

- **Paul:** young man, tan skin, short black hair, thin mustache and goatee, green t-shirt, dark grey
  shorts, black-and-white sneakers.
- **Jen:** young woman, light tan skin, long straight black hair past the shoulders, purple t-shirt,
  dark grey shorts, black-and-white sneakers.
- **Zombies:** grey-green skin, torn office clothes, blank white eyes; threatening but not graphic.
- **The woman in orange (Project Echo S1E2):** woman in her thirties, medium brown skin, short black hair tied
  back, orange maintenance jacket with a reflective stripe, dark work pants, black boots.
- **Mara (Project Echo S2E2):** woman in her forties, dark brown skin, short curly black hair with grey streaks,
  faded olive field jacket over a grey sweater, white cloth armband on her sleeve, dark cargo pants,
  worn brown boots.
- **The older couple (Project Echo S2E3, from the library shelter):** a man in his sixties, light brown skin,
  short grey hair, round glasses, worn brown wool coat; and a woman in her sixties, medium brown skin,
  grey hair in a low bun, worn navy coat, knitted red scarf.
- **The map survivors (Project Echo S2E4, met at Rockefeller Center):** a man in his twenties, dark brown
  skin, short black twists, dusty grey hoodie, faded blue jeans, red backpack; and a woman in her
  twenties, pale skin with freckles, auburn hair in a messy ponytail, mustard-yellow raincoat, black leggings.
- **Echo's crews (Project Echo S2E4):** figures in white hazmat suits with hoods and dark tinted visors,
  black gloves and boots; faces never shown. They arrive in unmarked black vans with tinted windows.

New character (from either series): add a line here the first time they appear, with the series and
episode, so any later episode can reuse the exact look. Never change Paul's or Jen's lines.

## Prompt order

`[style block]` + shot (wide, medium, close-up, over-the-shoulder, low angle) + who is in it, with their
pose and expression + place + time of day, weather and lighting + mood.

- Keep the subject in the middle 60% of the frame. Captions sit in the lower third, and the camera
  move crops the edges.
- One clear moment per image. A still can't show an action happening over time, so pick its peak.
- Same place in several scenes: repeat the same place description word for word.
