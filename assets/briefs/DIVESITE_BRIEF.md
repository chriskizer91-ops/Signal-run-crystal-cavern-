# Brief: the research team's dive station (one module: `divesite`)

Read `assets/briefs/BRIEF.md` (Style, Colours, Tools) and `assets/briefs/CAVEKIT_BRIEF.md` (module format), and look at `assets/modules/worklight.js` and `assets/modules/survey.js`. This is the same research team's gear, so match that look, reuse its helpers, stencil font and colours.

## Story
Deep under the colony is a **flooded cavern**: a black underground lake. The research team set up a **dive station** on its shore and dived it many times. Something in the lake frightened them. One diver didn't come back, and they sealed the way down and left in a hurry. The station still stands: a floating platform, air tanks, and a terminal holding their dive log, which the player can read.

Mood: abandoned, damp, cold and eerie. Rugged colony gear, worn, wet, a little algae near the waterline. Strong shapes, because these are seen by headlamp.

## Items (metres, y up; all `colliders: []`)
1. **`dive_platform`**: budget **6000**, low ≤ 1200.
   - A modular floating pontoon about 6 m long (x) × 3 m wide (z). **Origin at the waterline: y = 0 is the water surface**, deck top at about y 0.4, floats and hull below the water down to about y −0.5.
   - Railings along both long sides.
   - A **dive ladder** at the +x end going down into the water to y −2.5.
   - A small davit or winch arm, cleats, coiled rope and a gangway ramp at the −x end, sloping up to y ≈ 1.2, where it meets the shore.
2. **`tank_rack`**: budget **3000**, low ≤ 600. A frame holding 6 upright dive air cylinders (one missing, one lying on the ground), with regulators, hoses and a small compressor box. About 1.6 × 0.7 × 1.5 m. Ground at y = 0.
3. **`log_terminal`**: budget **1500**, low ≤ 300.
   - A ruggedised data terminal on a folding stand, about 1.3 m tall, with a hood over a screen facing **+z**.
   - The screen is a pale panel ([0.75, 0.95, 0.9]); the game makes it glow.
   - A keypad, a cable going down to a battery case on the ground, and a hazard stencil.
   - `attach`: exactly one point, the centre of the screen, 1 cm in front of it.
4. **`line_spool`**: budget **800**, low ≤ 150.
   - A cave diver's guideline spool on a stake hammered into the rock: a big reel with a crank, about 0.6 m.
   - Tied-off line running from the spool a short way toward +x, ending on the ground. The game draws the long line on from there.
   - `attach`: one point, the end of the line.
5. **`dropped_dive_light`**: budget **400**, low ≤ 80. A handheld dive lamp (canister and lamp head on a cord) lying on the ground; the lens is pale. `attach`: one point, the centre of the lens.

## Previews
From `assets/`: `python3 shot.py modules/divesite.js <item> ../tests/dive_<item>.png 1 0`. Budget 2–3 rounds per item.

## Report back (concise)
- Each item in plain words, with triangles at full and low detail, and the attach points.
- That `node stats.js modules/divesite.js` builds every item.
- The preview paths.
