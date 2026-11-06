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

- **Echo zone guards (Project Echo S3E1, Tokyo):** figures in dark navy uniforms with white armbands
  and navy caps, handheld wristband scanners; faces in shadow under the caps.
- **The turned-away family (Project Echo S3E1):** a father in his thirties, light brown skin, short black
  hair, grey windbreaker; a mother in her thirties, light skin, black bob haircut, beige coat; and their
  daughter of about six, pale feverish face, flushed cheeks, pink raincoat, wrapped in a blanket.

## What If? looks

In Doommates: What If?, Paul and Jen wear different clothes from Project Echo. Use these lines (not the
ones above) and their What If? reference sheets in Flow: `shared-assets/whatif-jen-sheet.jpg` and
`shared-assets/whatif-paul-sheet.jpg`. An episode may change footwear or props when the story needs it
(e.g. duck slippers at home), but keep the rest.

- **Jen (What If?):** young woman, light tan skin, black hair in a messy high bun with loose strands
  framing her face, small black clover-shaped earrings with gold trim, maroon t-shirt, small black
  crossbody bag on a thin strap, light blue denim shorts with rolled cuffs, white socks, cream sneakers
  with blue and red stripes.
- **Paul (What If?):** young man, tan skin, short black hair, thin mustache and goatee, small black stud
  earrings, black t-shirt, light blue denim shorts, maroon sneakers with white stripes.
- **Paul's coworker (What If? S1E2):** woman in her twenties, medium brown skin, shoulder-length wavy
  black hair, light blue blouse, black slacks, black flats.
- **The van driver (What If? Ep3, flood):** man in his forties, medium brown skin, short black hair,
  stubble, dark blue work shirt, grey cap. Drives a plain white delivery van with no logos.
- **The older diner (What If? Ep3):** woman in her seventies, light skin, short white curly hair,
  lavender cardigan, wooden cane.
- **The young customer (What If? Ep3):** man in his twenties, light brown skin, short wavy brown hair,
  grey hoodie, black jeans.
- **The bride (What If? Ep4, wedding):** woman in her late twenties, medium tan skin, dark brown hair
  in a low bun, long white wedding gown, short sheer veil, bouquet of pink roses.
- **The groom (What If? Ep4):** man in his early thirties, light brown skin, short neat black hair,
  clean-shaven, navy suit, white shirt, white rose boutonniere.
- **The event coordinator (What If? Ep4):** woman in her forties, dark brown skin, short black natural
  hair, black blazer and black pants, wireless headset, clipboard.
- **The worried guest (What If? Ep4):** man in his fifties, light skin, balding with grey sides, beige
  suit, loosened pink tie.

New character (from either series): add a line here the first time they appear, with the series and
episode, so any later episode can reuse the exact look. Never change Paul's or Jen's lines.

## Prompt order

`[style block]` + shot (wide, medium, close-up, over-the-shoulder, low angle) + who is in it, with their
pose and expression + place + time of day, weather and lighting + mood.

- Keep the subject in the middle 60% of the frame. Captions sit in the lower third, and the camera
  move crops the edges.
- One clear moment per image. A still can't show an action happening over time, so pick its peak.
- Same place in several scenes: repeat the same place description word for word.
