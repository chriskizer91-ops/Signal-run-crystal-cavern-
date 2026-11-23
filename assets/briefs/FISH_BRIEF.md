# Brief: the lake fish (one module: `deepfish`)

Read `assets/briefs/CAVEKIT_BRIEF.md` (toolkit, module format, tools) and skim `assets/modules/glowlife.js` (same colour convention).

## The place and the feeling
Far below the stalactite cavern is a **flooded cavern**: a black, murky underground lake. The player swims in it with a headlamp and limited suit air, and can only see 10–15 m.

Something lives in the lake. These fish are **big enough to look dangerous**, very fast, and **never fully seen**. They never attack, but they're curious about the player and keep their distance:
- you glimpse a pale shape at the edge of the murk
- you see two glowing eyes
- something big darts past

The shapes must be menacing and memorable in silhouette, with big eyes. Pale, sickly, slightly translucent deep-cave creatures, not cartoon fish.

## How the game uses them
- **Local frame:** length along **+x (head at +x, tail at −x)**, y = back (dorsal), z = sideways. Origin at the body's middle. Built in **metres** at natural size.
- **Swimming:** the game bends the whole mesh sideways (z) with a wave travelling from head to tail, small at the head and growing toward the tail. So:
  - **the body needs many rings along x** (at least 16, evenly spaced), so it bends smoothly
  - fins must be built as part of the body surface, so they bend with it
  - keep everything within z ±0.6 of the centre line before bending
- **Eyes:** the game draws a glowing light at each eye, from `attach` points. Model each eye as a pale, slightly domed disc, and put the attach point at its centre, 1 cm proud.
- **Colours** follow the glow-life convention: rgb = colour, **a = glow**.
  - body a = 0 (pale grey-white, bluish, darker along the back, a little mottled)
  - optional faint bioluminescent spots along the side line, a = 0.3–0.6
  - eye discs a = 0.9

## Items (`colliders: []`, `attach: [[eyeL], [eyeR]]`)
| item | length | budget hi / lo | what |
|---|---|---|---|
| `lurker` | ~2.6 m | 1400 / 240 | A long, eel-like ambush hunter. Thick front third, then a long tapering body with a continuous ribbon fin along the back and belly to the tail. A broad, blunt, slightly flattened head, a wide mouth line with a hint of needle teeth, and big forward-set eyes. |
| `darter` | ~1.6 m | 900 / 160 | A sleek, fast torpedo-shaped hunter. Long swept pectoral fins, a tall forked tail, a pointed snout, and very large eyes. |

Low detail keeps the silhouette, the eyes and at least 8 rings.

## Previews
From `assets/`: `python3 shot.py modules/deepfish.js <item> ../tests/fish_<item>.png 1 2` (mode 2 = glow-life lighting). Budget 2–3 rounds per item.

## Report back (concise)
- Each item in plain words, with triangles at full and low detail, and the attach points.
- That `node stats.js modules/deepfish.js` builds both items.
- The preview paths.
