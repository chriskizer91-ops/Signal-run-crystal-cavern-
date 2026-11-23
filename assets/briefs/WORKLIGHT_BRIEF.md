# Brief: work light, door part and a dropped pack (one module: `worklight`)

Read `assets/BRIEF.md` first. Use its **Style**, **Colours** and **Tools** sections; ignore "keep the original's size", because these are new models. Read `assets/CAVEKIT_BRIEF.md` for the module format, and look at `modules/survey.js`, the research team's camp gear already in the game, and match that look. These pieces belong to the same colony research team.

## Story
The colony's research team went deep. In each underground cavern they left:
- a sealed door (already built) leading to the next drop shaft
- a **portable floodlight tower** standing near that door, still switched on, running off its own battery pack
- **power couplings**: they pulled each door's power coupling when they left, and the couplings lie somewhere in the cavern, sometimes next to a researcher's dropped pack

The player follows the lights down from cavern to cavern.

Style: rugged, utilitarian colony expedition gear, worn and damp. Not sleek. Strong shapes read best, because these are seen by headlamp in the dark.

## Items (props: metres, y up, ground at y = 0; all `colliders: []`)
1. **`flood_mast`**: budget **6000** (low ≤ 1200). A portable floodlight tower about 3.2–3.6 m tall.
   - A heavy skid or tripod base with a ruggedised battery or power pack, levelling feet and stake-downs.
   - A telescoping mast with clamp collars.
   - A crossbar carrying **two big rectangular lamp heads** with visors and protective grilles. They are aimed toward local **+z** and tilted down about 20°.
   - A power cable coiled on the ground and running off toward −z (toward the door).
   - Lens faces should be pale and bright-ish (e.g. [0.95, 0.93, 0.85]); the game adds a glow sprite on them and casts real light.
   - `attach`: exactly **two points**, the centre of each lens face, 2 cm in front of it.
2. **`power_coupling`**: budget **1500** (low ≤ 300). The door part the player carries.
   - A chunky cylindrical cartridge about 0.55 m long and 0.18 m in diameter, **centred on the origin with its long axis along x**. The game spins and bobs it as a pickup.
   - Two grip handles, armoured end caps with contact pins, warning bands, and a small window strip along the side showing the cell inside (pale cyan [0.6, 0.95, 1.0]; the game adds the glow).
   - It should read instantly as an important part.
3. **`dropped_pack`**: budget **2000** (low ≤ 400). A researcher's gear left in a hurry, lying on the ground: a large expedition backpack fallen on its side with a strap trailing, an open hard case, a dropped handheld lamp, a spilled sample tube. Natural sizes, total footprint about 1.6 × 1.2 m.

## Previews
`python3 shot.py modules/worklight.js <item> shots/worklight_<item>.png 1 0` (mode 0). Budget 2–3 rounds per item.

## Report back (concise)
- Each item in plain words, with triangles at full and low detail.
- The two `flood_mast` attach points.
- That `node stats.js modules/worklight.js` builds every item at both details.
- The final preview PNG paths.
