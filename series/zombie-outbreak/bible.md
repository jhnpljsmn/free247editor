# Zombie Outbreak — Series Bible

> Paste this into ChatGPT with `script-template.md` whenever you ask for an episode, so the story
> stays consistent. Update the "Story so far" section after each episode.

## Premise

A zombie outbreak hits a city. A small group of ordinary people tries to survive **30 days** there,
then moves on to the next city. Each city is **6 episodes × 5 days**, about 2–3 minutes per episode,
told in English narration over simple stick-figure animation.

## Tone

Tense but warm. Practical survival choices (water, food, shelter, noise, light, trust) matter more
than gore. Small moments of humor, mostly from Jun and Lola Cora. No graphic violence: zombies
fall down, nothing more.

Language: **plain English only** in all narration, for a worldwide audience. Names of people and
places stay as they are (Lola Cora, Tondo, jeepney), but no Tagalog or Taglish words or phrases.

## Survival rules of this world

1. Infection spreads by bite. Turning takes a few hours.
2. Normal zombies are slow but never stop. They follow **noise and light**.
3. **Runners** (fast zombies) start appearing on Day 4. They hunt alone and scream.
4. Rain hides sound, so survivors move during rain.
5. Power fails on Day 6 and the water stops on Day 9. Phones die soon after.
6. Other survivors can be helpful or dangerous.

## Cast

| Character | Description | Look (fixed, see `shared-assets/cast/`) |
|---|---|---|
| **Marco** | 34, jeepney driver from Tondo. The calm leader who makes the hard calls. | Red shirt, blue cap, crowbar |
| **Ana** | 28, public hospital nurse. Smart and brave, keeps everyone alive. | Teal scrubs, ponytail, medkit |
| **Jun** | 17, student. Fast, funny, good with phones and maps. Scared but loyal. | Yellow shirt, backpack, bat |
| **Lola Cora** | 70, owns a sari-sari store. Wise, stubborn, surprisingly tough. | Purple, glasses, grey bun, frying pan |
| **Zombie** | Normal infected | Green, shambling |
| **Runner** | Fast infected | Pale green, dark red shirt, runs |

To add a character: copy a file in `shared-assets/cast/`, change the name and look, then run
`node src/cli.mjs cast-sheet` to see it.

## Cities

1. **Manila** (Days 1–30): Tondo → Sampaloc → Quiapo → Manila Bay → leaving the city.
2. Next city: to be decided after Manila (for example Cebu, Davao, or abroad).

## Manila arc (a draft, change freely)

| Episode | Days | Story |
|---|---|---|
| manila-ep01 | 1–5 | Outbreak in Tondo. Marco meets Jun, and they shelter at Lola Cora's store. They rescue Ana from the hospital. |
| manila-ep02 | 6–10 | Power fails. The store is overrun. They move to the rooftops and learn the noise rule. |
| manila-ep03 | 11–15 | Food runs out. A supply run to the mall goes wrong, and the first Runner hunts them. |
| manila-ep04 | 16–20 | Water stops. They reach an evacuation center that seems safe until the people in charge turn on them. |
| manila-ep05 | 21–25 | One of them is bitten. Ana makes a hard choice. They hear a radio message about boats at Manila Bay. |
| manila-ep06 | 26–30 | A final push across the bridge to the bay, during rain. Cliffhanger as they leave Manila. |

## Story so far

_(Update after each episode: who is alive, what they carry, where they are, open threads.)_
