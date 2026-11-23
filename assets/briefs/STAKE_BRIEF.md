# Brief: route stake (add one item to the `worklight` module)

Read `assets/briefs/BRIEF.md` (Style, Colours, Tools), then `assets/modules/worklight.js`. That module is the research team's gear: the flood mast, power coupling and dropped pack. Match its look and reuse its helpers and colours.

## Story
In each underground cavern, the research team marked their route from the landing to the exit door with **route stakes**: small markers driven into the rock every few metres, each topped with a light that still glows. In the game the lights pulse one after another toward the door, so the player can follow them across a huge dark cavern.

## Item to add: `route_stake`
Add it to `assets/modules/worklight.js` **without changing the existing three items**.
- **Size:** about **0.9 m tall**. It stands on rock: origin at the ground contact point, y up. Its base must sit on uneven rock and still look planted, e.g. a small weighted foot plate or tripod feet plus a rock bolt.
- **Shaft:** a sturdy pointed survey stake or rod, in the team's orange with black bands, and a strip of pale reflective tape.
- **Light:** a **clip-on marker light at the top**, a small cylinder or capsule about 0.08 m across and 0.12 m tall, with a **pale lens** ([0.95, 0.9, 0.7]). The game adds an amber glow centred on it.
- **Tag:** a tiny route tag or flag (one short code such as `R-8` is fine; reuse the stencil font if it has one).
- **Budget:** **300** triangles at full detail, low detail ≤ 60.
- **`attach`:** exactly one point, the centre of the light.
- **`colliders: []`**.

Hundreds of these may be placed, so keep them cheap and readable from a distance by the shape of the light and the colour bands.

## Previews
Run from `assets/`: `python3 shot.py modules/worklight.js route_stake ../tests/out_stake.png 1 0`. Budget 2 rounds.

## Report back (concise)
- Triangles at full and low detail.
- The attach point.
- That `node stats.js modules/worklight.js` still builds all four items.
- The preview path.
