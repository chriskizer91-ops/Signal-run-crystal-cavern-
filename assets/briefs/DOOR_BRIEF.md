# Brief: the sealed deep door (one module: `deepdoor`)

Read `assets/BRIEF.md` first. Use its **Style**, **Colours** and **Tools** sections; ignore the "keep the original's size" rules, because this is a new model. Also read `assets/CAVEKIT_BRIEF.md` for the module format (`window.MODDEF = { fn: (function (K) { … }) }`), and skim `modules/campus.js` around the "armoured blast door" (≈ line 838) and the `airlock()` function. That is the house style for colony doors. Reuse its ideas (hazard stripes, stencils, actuator housing, rams), but build your own module with no imports.

## What it is
The game's first cave room is an old mine station 60 m underground at the bottom of a shaft. One wall of that room holds a **heavy sealed door** that the colony's research team installed after they found something below. Behind it, a tunnel drops to the crystal cavern.
- In campaign mode the door is dead and locked until the player restores power on the surface.
- In free play it opens.

It must look like it was added much later than the timber mine: modern for the colony, heavy, rugged and worn. Something people were serious about keeping shut. It should **not** look sleek or sci-fi glossy.

## Coordinates (metres; the model is used as-is, no rotation)
- Origin = floor level, centre of the doorway, on the rock wall plane.
- x runs across the door (−x = left as you face it). y is up. **The room side (where the player stands) is −z; the tunnel behind is +z.**
- The rock opening behind the frame is about **5.0 m wide (x −2.5..2.5) and 4.3 m tall (y 0..4.3) with rounded top corners**. The frame must fully hide this opening, so make the solid surround at least **x −3.2..3.2, y −0.1..5.4**.
  - Its front face sits around z −0.5. It should reach back to at least z +0.5, so no rock gap shows at grazing angles.
  - The rock wall is rough (±0.3 m), so add chunky edge pieces such as a thick bolted collar or anchor plates that sell "bolted into rock".
- The **clear doorway** (where the leaves close) is **x −1.5..1.5, y 0..3.2**. The player is 1.8 m tall and must fit through when the leaves are open.

## Items (all `colliders: []`; the game handles blocking itself)
1. **`deep_door_frame`**: everything that doesn't move.
   - The surround and collar, a threshold/sill with a floor track, and the actuator housing above the doorway.
   - Pockets or guides on both sides that the leaves slide into: each leaf slides 1.6 m sideways, so its pocket must hide it.
   - A control panel on the room side to the right of the door (around x +2.3, y 1.4), with a dark lamp housing on it.
   - Conduit or cable running from the panel up and along the frame and off into the rock, as if fed from far away (the power comes down from the surface).
   - Stencilled markings are welcome (short codes only, e.g. `D-7`, `SEALED` or a hazard symbol made of shapes).
   - `attach`: `[[lampX, lampY, lampZ]]`, exactly one point at the centre of the lamp housing's face, slightly proud of it. The game draws a glowing red or green light there.
   - Budget **9000** triangles at full detail; aim for ≤ 2500 at low detail.
2. **`deep_door_leaf_r`**: the right leaf (x 0..+1.52), closed position, meeting the left leaf at x = 0.
   - Thick (about 0.3 m, z ≈ −0.15..+0.15 or so, just behind the frame's front face).
   - Armour plates or ribs, a heavy seam edge with interlocking teeth at x ≈ 0, hazard band, bolts, scuffs.
   - The game slides it along +x to open, so nothing on it may stick out past x +1.6 or into the frame in a way that would visibly clip while it slides.
   - Budget **3000** / low ≤ 800.
3. **`deep_door_leaf_l`**: the mirror-image left leaf (x −1.52..0). Build it from the same code with a side sign, so faces wind correctly. Do not mirror by negative scale.

## Look
- Thick colony steel, darker than the campus blast door, dulled by damp and age: some rust bloom, mineral streaks and grime near the floor.
- Yellow/black hazard stripes on the leaves' lower band and the frame edges.
- Bolt heads, weld seams, chunky hinge-less sliding hardware.
- The room is lit only by a headlamp, so strong shapes and good contrast read better than fine detail. Avoid large flat featureless areas.
- Low detail should keep the silhouette and the main colour blocks.

## Previews
`python3 shot.py modules/deepdoor.js <item> shots/deepdoor_<item>.png 1 0` (mode 0). Also check the frame with both leaves in place. You can temporarily add a debug item (e.g. `deep_door_all`) that merges the frame and both leaves, but **remove it before you finish**. Budget 3–4 preview rounds in total.

## Report back (concise)
- Each item in plain words, with triangles at full and low detail.
- The lamp attach point.
- That `node stats.js modules/deepdoor.js` builds every item at both details.
- The final preview PNG paths.
