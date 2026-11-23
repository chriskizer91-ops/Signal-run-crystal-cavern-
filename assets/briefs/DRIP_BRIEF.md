# Brief: dripstone kit for the stalactite cavern (one module: `dripstone`)

Read `assets/CAVEKIT_BRIEF.md` first: toolkit, module format, tools and report format all apply. Skim `modules/crystals.js` and `modules/glowlife.js`, the two kits already in the game, to see how instanced kit pieces are built.

## The place
Below the glowing crystal cavern is a second showcase: a **stalactite cavern**. It is a huge, dark, wet limestone hall, roughly 170 m across and 90 m tall:
- thousands of stalactites hang from an uneven ceiling, and stalagmites rise from a floor of stepped rimstone pools
- massive fluted columns (the game builds those itself)
- flowstone curtains on the walls
- a ceiling dusted with **glowworms**: tiny blue-green lights on hanging silk threads, like a starry sky

The colours are warm, real calcite: cream, ivory, honey, amber, ochre, with darker mud-brown banding. It is lit by the player's headlamp and one big work floodlight, so wet sheen and translucent edges matter. Mood: awe and quiet, a stone cathedral. It should feel very different from the crystal cavern's neon glow.

## How the game uses your pieces (important)
They are **instanced**. Each copy is placed on a rock surface, and the model's **+Y axis is turned onto the surface normal**: up from the floor, *down* from the ceiling, sideways from walls. So one stalactite model hangs from the ceiling correctly with no special case.

Two kinds of item:
- **Unit-length items** (stalactites, stalagmites, straws, columns, drapery): build them **along +Y from y = 0 (the rock) to the tip at y = 1.0 exactly**, with the base sunk to about y = −0.12 so it meets rough rock.
  - The game stretches each copy: y by its length L (0.3–14 m), and x/z by L × a width factor it picks (≈ 0.6–1.6). Give them natural proportions at width factor 1.
  - Example: a typical stalactite is about 0.10–0.14 wide at the base per 1.0 of length.
- **Natural-size items** (flowstone, helictites, glowworm threads): build in **metres** at their real size. The game scales them uniformly by 0.6–2.5.

## Colour channels
- **Calcite pieces** are drawn with a new calcite shader:
  - rgb = calcite tint. Keep it near white, cream, honey, amber and ochre, with darker brown bands. The game also tints each copy slightly.
  - **a = translucency**: 0 = thick and opaque, up to 1 = thin and see-through (straw walls, drapery edges, tips). Light shines through those parts warm.
  - The shader squares rgb before lighting, so mid values come out darker.
- **`glowworm_threads`** is drawn with the glow-life shader (like `glowlife.js`): rgb = colour, **a = glow strength**. Use 0–0.1 for the silk, 0.7–1 for the glowing droplets and larvae.

## Items (all `colliders: []`; triangles hi / lo)
| item | kind | budget hi / lo | what |
|---|---|---|---|
| `stalactite` | unit | 140 / 28 | A single hanging cone. Slightly irregular, faint growth rings, a thin drip tip at y = 1 (a tiny soda-straw end). |
| `stalactite_cluster` | unit | 520 / 90 | 3–6 stalactites of different lengths from one shared lumpy base. The longest reaches y = 1. |
| `soda_straws` | unit | 260 / 50 | 8–15 thin hollow straws of mixed lengths (one reaches y = 1). Visible at a distance (radius ≥ 0.015 of length), some with a drip bulb. |
| `stalagmite` | unit | 180 / 36 | Candle-like stacked growth: wider rounded lobes, a rounded top with a shallow splash cup. |
| `stalagmite_cluster` | unit | 520 / 90 | 3–5 stalagmites merged at a common flowstone base. |
| `column` | unit | 360 / 60 | A floor-to-ceiling column: flared base, narrower waist, flared top meeting the ceiling at y = 1. Fluted, lumpy, banded. |
| `drapery` | unit | 360 / 60 | A flowstone curtain or "bacon strip": a thin wavy sheet hanging along +Y, about 0.5 wide per 1.0 long, with coloured bands across it and translucent thin lower edges. Two-sided. |
| `flowstone` | metres | 300 / 50 | A lumpy frozen-waterfall blanket about 2.4 × 2.0 m and 0.7 m high, for wall bases and floors. Rippled terraces. |
| `helictites` | metres | 300 / 50 | A patch (≈ 0.6 m) of small twisting spaghetti growths that grow every direction. Eerie, delicate. |
| `glowworm_threads` | metres | 300 / 40 | 20–40 silk threads hanging 0.05–0.6 m, each with glowing beads. A few slightly larger glowing larva bodies at the top. Threads must be visible from any angle (crossed thin quads are fine). |

Low detail must keep the silhouette and colour bands. Many hundreds of copies will be on screen, so stay within budget.

## Previews
`python3 shot.py modules/dripstone.js <item> shots/dripstone_<item>.png 1 <mode>`
- mode 0 (normal lit) for calcite pieces
- mode 2 (glow life) for the threads

Unit items preview at length 1. Budget 2–3 rounds per item.

## Report back (concise)
- Each item in plain words, with triangles at full and low detail.
- That `node stats.js modules/dripstone.js` builds every item at both details.
- The final preview PNG paths.
