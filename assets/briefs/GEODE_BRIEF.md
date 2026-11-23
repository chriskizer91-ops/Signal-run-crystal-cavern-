# Brief: titan crystals and crystal carpet (one module: `geode`)

Read `assets/briefs/CAVEKIT_BRIEF.md` (toolkit, module format, tools) and look at `assets/modules/crystals.js`, the existing crystal kit, for how crystals are built: flat faces, crisp facets, irregular hexagonal sections.

## The place
The final cavern of the game is a **giant crystal cavern**, about 280 m across and 170 m tall, like the inside of a giant geode. Huge, thick, glowing crystals 20–90 m long rise from the floor and lean out of the walls. Every wall is carpeted in small crystals. It should be the most beautiful thing in the game.

The giant crystals (**titans**) are drawn with a special see-through shader. It works out, for every pixel, exactly how much crystal the eye is looking through: thick parts glow deep and bright from inside, and the cavern behind shows through bent. **To do that, the shader assumes each titan has an exact, known shape (below). Your model must match that shape closely.** Surface detail must stay tiny, within ±0.006 of the hull.

## The titan shape (unit frame: grows along +Y, game stretches y by length and x/z by length × width factor)
- **Cross-section:** a **regular hexagon** with **apothem a = 0.17** (centre to the middle of a flat face). Face normals point at angles 0°, 60°, 120°, 180°, 240°, 300° around +Y: normal (cos θ, 0, sin θ).
- **Prism:** from y = −0.06 (base, buried in rock) to **y = 0.78**.
- **Termination:** six flat faces from the prism's top edges meeting at **one tip at (0, 1.0, 0)**. Each face is the plane through that face's top edge (at y 0.78, distance a from the axis) and the tip.
- No chamfers that cut more than 0.006 off the hull. Crisp flat facets.

## Items (all `colliders: []`, no attach)
| item | budget hi / lo | what |
|---|---|---|
| `titan_a` | 700 / 120 | The clean hull above. **Surface detail:** fine horizontal **growth striations** across the prism faces (quartz has them), as very shallow steps or as colour bands; a few tiny **etched triangles** on the termination faces. |
| `titan_b` | 700 / 120 | Same hull. Different detail: a couple of **phantom ghost-lines** (faint colour outlines of an earlier, smaller termination, visible on the surface) and slightly chipped tip edges, still within ±0.006. |
| `titan_c` | 700 / 120 | Same hull. Different detail: frosted, slightly milky lower third, and a clean glassy upper part. |
| `druse_patch` | 900 / 150 | **Natural size in metres**, built on the plane y = 0 (the rock), +Y = away from the rock. About a 1.6 m patch of 40–80 small crystal points, 0.05–0.35 m tall, densely packed and mostly upright with a little splay, so whole walls can be carpeted with copies. |
| `druse_cluster` | 900 / 150 | **Natural size**: a 0.8 m cluster of 8–15 crystals, 0.2–0.9 m long, radiating from one spot like a sea urchin. |

## Colour channels (rgb, a)
- **Titans:**
  - r = **frost** (0 clear glass, 1 frosted, milky)
  - g = **line darkness** (0 none; growth lines, etched triangles and phantom outlines 0.4–0.8)
  - b = **edge brightness** (0.6–1 along chipped edges and facet edges, 0 elsewhere)
  - a = 0
  - The game picks hue and glow per copy.
- **Druse pieces:** use the existing crystal-kit convention from `crystals.js`: r = inner glow (dim at the rock, bright at tips), g = tint shift, b = cloudiness, a = 0.

## Previews
From `assets/`: `python3 shot.py modules/geode.js <item> ../tests/geode_<item>.png 1 1` (mode 1 = crystal). Budget 2–3 rounds per item.

## Report back (concise)
- Each item in plain words, with triangles at full and low detail.
- **Confirm the titan hulls:** report the largest distance of any titan vertex from the hull described above (should be ≤ 0.006, except buried base vertices).
- That `node stats.js modules/geode.js` builds every item.
- The preview paths.
