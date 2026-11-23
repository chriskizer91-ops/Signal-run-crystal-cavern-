# Signal Run — engine & state handoff (read this first in any new session)

Status as of 23 Nov 2026: **v10 (signal-run-v10-flight-and-trails.html, ~920 KB)** is current.

**Everything lives in the GitHub repo `chriskizer91-ops/Signal-run-crystal-cavern-`:** the game (`game/signal-run.html` plus every older version), the CaveLib mirror, patch scripts, all model modules and model tools, agent briefs, tests, these docs and screenshots. Start there in a new session, and read its `CLAUDE.md`. It is one self-contained HTML file: WebGL 2, no images; every texture, mesh and sound is generated in code.
- Design plans: `claude/signal-run-caves-design.md`.
- Setting and story: `claude/signal-run-world-and-lore.md` (a partially terraformed planet in the far future; some points are decided, the rest are open).
- This doc covers how the code works and how to work on it.

## Working with Christopher
- He can't code and builds entirely through Claude, so explain in plain words.
- **Prove each step with screenshots and simple numbers** (triangle counts, positions, times).
- Keep phone screens uncluttered.
- Devices: Pixel 7a (Chrome) and an MSI laptop (Edge).
- Deliver whole updated HTML files with a new version number. Never strip features.
- Claude in the main conversation is the coordinator. Sub-agents (Opus 5.5 or Fable 5.2, high effort) take self-contained jobs such as asset modules. The v5 reskin and the v7 cavern assets were done that way.

## The game in one paragraph
A 3 km × 3 km canyon on a partially terraformed planet. The sky, water and air are Earth-like, and people once lived here without suits. The map has:
- a reservoir, an arch dam, a river and a bridge
- a 7-dish radio array, a lookout and a landing stage

It started as a rendering benchmark: 147M triangles at full detail, plus a "10M View" mode that shows exactly 10,000,000 high-detail triangles. Signal Run is the game layered on top:
- The array is dark. You find 7 power cells (blue light beams) and fly them back with a jetpack.
- Every 2 dishes online gives an upgrade: bigger tank (2), faster boost (4), glide fins (6).
- There are two ring time trials (Canyon Run, Needles Slalom).

**The surface is "level one"; most of the game is planned underground.**

## Versions
- v2: the game as Fable 5.2 built it before this conversation.
- v3: phone touch controls, shown only on touch screens while playing:
  - a floating left stick
  - JET (hold), DIVE (hold), BOOST (tap on/off)
  - drag to look, pinch to zoom
- v4: cave Level 1. A mine shaft near the dam, about 1.8 km of mine plus natural caves, a headlamp, a battery, the guideline, and passing out in the dark.
- v5: far-future reskin of the surface. Shapes, sizes, colliders and attach points are all unchanged.
  - Vehicles: KR-07 outpost truck, scout buggy, cargo trailer.
  - Plants: 7 alien-shaped species, same names, no more triangles than before.
  - Camp: hab shelter, data table, survey scanner, heater beacon, comms mast, sealed cases.
  - Campus: airlocks, radiators, masts, coolant tank, blast-door bay.
  - Marina: composite dock, sampling station, survey barge, drone skiff, instrument buoys.
  - Ravens are now violet four-winged flyers (`drawBirds`).
  - Left as they were on purpose, because they read as old colony infrastructure: the bridge, power lines and substation, dam, dishes, lookout tower and control building.
- v6: plants recoloured to greens and browns, because they photosynthesise. They keep their alien shapes and triangle counts. Sky and water stay Earth-like by design. The alien palette is kept for underground life.
- **v7: the giant crystal cavern** (details below). The surface is unchanged: 1,217,952 triangles at the start view, same as v6, with 99.5% of pixels identical (only the clouds and beacons move).
- **v8: the deep door and two modes.**
  - The cavern moved to sit directly under the mine's first room (the station).
  - A sealed door ("D-7", modelled by an Opus 5.5 sub-agent) in the station's south wall leads to a short drift and a 124 m drop to the landing ledge.
  - The old hole in the Level 1 pit floor is gone.
  - The menu has **Campaign** (the door stays locked until all 7 dishes are online) and **Free play** (everything unlocked, for demos). Each mode has its own save.
  - The surface is pixel-identical to v7.
- **v9: the stalactite cavern** (details below), the first of the stacked caverns.
  - **D-8** sits in the crystal cavern's east wall, with a work floodlight beside it. Behind it, a drift leads to a 126 m drop into a dark limestone hall.
  - The hall has stalactites, stalagmites, fluted columns, curtains, terraced rimstone pools and a glowworm "starry" ceiling.
  - Its exit door **D-9** (with its own work light) stays shut until the flooded cavern is built.
  - In the campaign, D-8 needs its **power coupling**, which lies at the end of the crystal cavern's north gallery beside a dropped pack.
  - New Opus 5.5 sub-agent models: `dripstone` (10 kit pieces) and `worklight` (flood mast, power coupling, dropped pack). `deepdoor` gained D-8, D-9 and D-10 variants.
  - The surface is pixel-identical to v8.
- **v10: steadier flying and route trails** (from Christopher's feedback: "not immediately obvious where each cavern entrance is", flying too slippery, too fast in caves, can't hover).
  - **Flying** (the `update()` air branch):
    - Horizontal speed eases toward stick direction × top speed, instead of piling up acceleration. Let go and you slow to a stop.
      - Underground: top speed 11 m/s (boost 17), steer rate 3.2, brake rate 3.0.
      - Surface: 48 m/s (boost = upgrades), rate 1.8, brake 1.6.
    - Climbing underground is 9 m/s (boost 15), versus 28 (45) on the surface.
    - **Hover**: after using the jet (`state.hover`, cleared on landing), letting go holds your height for 2.2 fuel/s. DIVE sinks (max −16 m/s underground) and letting go of DIVE hovers again. Out of fuel, or after walking off a ledge, you fall as before (glide fins still slow the fall).
    - Measured in the crystal cavern (`tests/flight.py`): slide after letting go 14.3 m → 2.9 m; top speed 48 → 11 m/s; climb 28 → 9 m/s; height held exactly. On the surface the slide went from 44.5 m to 26.4 m, and top speed is unchanged.
    - Hint texts now say "let go to hover".
  - **Route stakes**: `ROUTES` are precomputed by `src/node/routes.js` (A* over a 2 m floor grid, preferring gentle ground and hopping cliffs only when needed) and pasted into the game.
    - D-8 trail: 95 m, 13 stakes, 2 jetpack hops. D-9 trail: 156 m, 18 stakes.
    - `STAKES` are drawn with the `worklight/route_stake` model (292 triangles).
    - Their amber lights grow with distance, so the trail reads across a cavern, and a pulse runs along each trail toward the door.
    - Crystals and dripstone are kept 1.5 m clear of the stakes (`nearRoute`).
  - The surface is pixel-identical to v9.

## Map facts (metres; y is up)
- World 3072 × 3072 (48 × 48 tiles of 64 m). Canyon floor ≈ 95, lowest terrain 87.5, highest ≈ 632.
- Reservoir water WL = 190 (west of the dam), river RL ≈ 91.8.
- Dam: an arch centred at (1409, 1600), radius 300, crest 199, spanning x ≈ 1109–1200.
- Landmarks:
  - observatory OBS (1150, 1000)
  - lookout/start LOOK (2230, 1640)
  - spires NEEDLES (1800, 1235)
  - campus around (1100, 1128)
  - marina dock at (1000, 1470), on the water
- **Mine shaft** (SX, SZ) = (1444, 1486), on a ledge above the river, top ≈ 133.8.
  - The square shaft is 3.8 m wide and drops to the station floor at −56.5.
  - The supply crate is at (+3.7, +1.2) from the shaft.
- Cave Level 1 lies between y −50 and −132.
- **Deep door**: in the station's south wall at (1444, −56.1, 1491.5), facing north into the room.
- **Drop**: the axis is at (1444, 1506). The drift runs from the door to z ≈ 1507 at floor −56.4. The smooth tube goes from −57 down to the cavern roof at −134 (radius 3.6 → 5.6). The landing ledge is at −179.8.
- **Crystal cavern** (v8 position): centre (1440, −160, 1446); radii 95 × 52 × 80 m; pool surface −202. The roof is about 50 m below the Level 1 drifts. Its five galleries reach out to x ≈ 1280 and z ≈ 1300.
- **D-8**: in the crystal cavern's east wall at (1528, −180, 1471), tunnel running east. The drift goes to x 1565; the smooth drop tube at (1564, 1471) runs from −181 to −268. You land at about −307 to −312.
- **Stalactite cavern**: centre (1626, −290, 1471), radii 85 × 48 × 70. The floor goes from about −303 at the edges to −333 in the middle, in 1.5 m rimstone terraces, tilted so the west (landing) is high and the east low.
- **D-9**: in the hall's east wall at (1706, −313, 1471), tunnel running east (its drift continues to x 1728). It is meant to lead to the flooded cavern.
- The whole cave system is inside `CAVE_AREA` = x 1244–1894, z 1266–1806. The surface never comes lower than 87 m, so nothing underground can be seen from above.

## File layout (top to bottom)
1. CSS and HUD markup:
   - `#hud` (benchmark panel)
   - `#ghud` (game HUD: fuel bar, `#gstat`, `#ustat` cave readout, Menu)
   - `#menu`, `#toast`, `#fade`
   - `#touch` (phone controls)
   - `#visor` (fogged-visor overlay, v7)
2. `TerrainLib()`: heightfield, `height(x,z)`, tile generation (also runs in workers via `toString`).
3. `CharacterLib()`: the procedural 1.58M-triangle explorer sculpt.
4. **`CaveLib(cfg)`**: a plain top-level function, so workers can be built from its source. It holds the cave network, the distance field, meshing and physics queries. It now includes the cavern.
5. Main IIFE:
   - matrix kit
   - shaders: `GLSL_COMMON` (shared lighting) plus TERR, PROP, PLANT, WATER, SKY, FLAME, GLOW, POST (bloom), CAVE, LINE; v7 adds KIT_VS, CRYS_FS, LIFE_FS, POOL, SPORE
   - terrain LOD tiles and the worker pool
   - `MB` mesh builder (box, beam, lathe)
   - landmarks (dishes, dam, tower)
   - character and shadow pass
   - input (keyboard, pointer, touch)
   - `AssetKit` and the `ASSET_DEFS` modules:
     - bridge, camp, campus, marina, plants, power, vehicles
     - **crystals, glowlife, survey** (v7)
     - Module format: `"name": { fn: (function (K) { … return { name, items: [{ name, budget, build(detail), colliders, attach }] } }) }`, where detail 1 = full and 0 = far.
   - `place()` and colliders
   - **Signal Run game** (`game`, cells, dishes, courses, saving, HUD)
   - **cave runtime**, then the **cavern runtime** (`CAVR`, just before `/* --- menu / mode switching --- */`)
   - `update()`, `render()`, bloom, HUD, `start()`
6. `window.__bench` exposes state for testing:
   - state, stats, cam, game, keys, floorAt, `update`
   - `cave`, `line`, `CV`, `caveTeleport`
   - `CAVR`, `cavePrebuild`
   - `placedLog`, `plantTotal`

## Asset workflow (how the v5 reskin and the v7 cavern kits were made; reuse it for new models)
1. Cut each `ASSET_DEFS` module out into its own file as `window.MODDEF = { fn: … };`, along with the `AssetKit` source. For a new kit, start from an empty module.
2. Give a sub-agent a shared brief covering:
   - the style
   - item names, budgets and both detail levels
   - for reskins: colliders and attach points kept exactly; bounds within ±10%; same ground contact
   - triangles ≤ budget
   - no `Math.random`
3. Tools the agents used:
   - a Node `stats.js` that builds every item and checks triangles, bounds, colliders and attach points;
   - a `preview.html` plus Playwright `shot.py` that renders one item from 4 angles. Mode 0 is a prop on ground; modes 1 and 2 are crystal and glow-life lighting with no ground plane.
4. Splice the modules back into `ASSET_DEFS` (replace an existing module's text, or add a new one), then verify in the game.

These tools lived in the temporary workspace and are easy to recreate from this description.

### Instanced kits (used by the cavern)
- Kit items are built once and drawn with `drawElementsInstanced`.
- Each instance is 12 floats: iA (position, length), iB (axis, width factor), iC (hue, glow, roll, –).
- KIT_VS stretches the unit model along the axis by its length and across it by length × width factor.
- Draws are grouped per kit per 48 m cell and frustum-culled per cell.
- Hi or lo detail is chosen by distance: crystals use hi within 45 m, life within 30 m.

## Rendering rules worth knowing
- Shared uniforms in `GLSL_COMMON`:
  - `uUG`: x = underground lighting on, y = headlamp intensity, z = daylight at the player, w = exposure
  - `uFlP`/`uFlD`: headlamp position and aim (the camera direction)
  - `uLd`: shaft daylight point
  - `uHole`: square terrain cut-out at the shaft
  - `uCav`/`uCavR`: cavern centre, on flag and radii (v7)
- Shared functions:
  - `cavK(w)`: 1 inside the cavern
  - `cavAmb(w)`: the patchy teal glow from the cavern's life
  - `haze()`: the cavern's humid air
  - `flashL()`: headlamp
  - `vnoise3()`: true 3D noise. Use it for patterns on cave walls; 2D noise fed with xz plus y smears into diagonal streaks on walls.
- `shade()` and `fogit()` are unchanged when `uUG.x = 0`, so the surface renders as before.
- `caveView(eye)` decides what to draw:
  - `cave.surface`: the canyon is drawn unless the camera is underground and more than 45 m down the shaft.
  - `cave.visible`: the cave is drawn when the camera is underground or within 80 m of the shaft.
  - `cave.sky`: the sky is drawn on the surface or when looking up the shaft.
  - Underground clears to black.
- Bloom: the alpha channel of every opaque draw is its glow mask. Keep glow alpha small on large surfaces, or bloom turns them into white "light beams". That was the bug fixed in v7: wide glowing mineral bands on the rock.
- Typical frames (headless count):
  - surface ≈ 1.1–1.45M triangles
  - Level 1 underground ≈ 0.5M
  - cavern wide views ≈ 1.4–1.6M submitted (358 draw calls at the vista); close-up ≈ 0.8M

## How the caves work (CaveLib)
- **The network is a list of segments**, by kind:
  - 0: natural capsules (flattened floor, 1.3 vertical squash)
  - 1: mine drifts (rounded box 4.5 × 4 m)
  - 2: shaft
  - 3: natural rooms (ellipsoid with a floor)
  - 4: mine room (the station)
  - 5: crystal cavern (v7)
  - Cavern columns are tagged kind 6.
- Design data: `MINE` (floor-centre points), `NAT` (centre points plus radius, Catmull-Rom with noise wander), `ROOMS`, and `CAV`/`COLS` for the cavern.
- **`COFF = [−234, 90, −245]`** moves the whole cavern from where it was designed (v7) to under the station.
  - The cavern design numbers are kept as written and shifted by COFF.
  - Its rock noise (floor terraces, wall fbm, columns) is sampled at the old spot (`x − COFF`), so its shape is exactly the tested v7 shape. A Node check of 20,000 points found differences only at the gallery mouths.
  - To move the cavern again, change COFF.
- **`DOORDEF`** (v9; replaced v8's `ACCESS`): each door has a plane point, the direction its tunnel runs (`dir`), and a drift.
  - Drifts are kind 1 but not in `minePaths`, so they get no timber or rails.
  - Exported as `CV.DOORS` (world coordinates); `CV.DOOR` is still D-7.
- **Stalactite cavern** (`DRP`, `DCOLS`):
  - **Kind 8** is the hall ellipsoid: AMP 1.7, ceiling domes from low-frequency noise, and flowstone ribs from vertically stretched fbm.
  - **Kind 9** is its 9 fluted columns (flutes = cos(9–15·angle), AMP 0.6).
  - `dripH` is the bowl height; `dripFloor` adds terraces (step 1.5) with a dip behind each rim; `dripWater(x,z)` gives the pool's water level or −1e9; `dripK` is the ellipsoid distance.
  - Exported as `CV.DRIP` (centre, radii, `drop`, `step`), plus `dripFloor`, `dripWater`, `dripK`, `DCOLW`.
- **Kind 7** = smooth natural tube (AMP 0.3), used for the door drop, so the fall has no ledges to snag on. A scan of the tube walls found no floor above the landing.
- Passages are combined with a hard min within a passage and a smooth min (k 2.2) between passages. A 12 m lookup grid speeds this up.
- `sdf()` adds 3D value-noise roughness by kind: AMP = [1.15, 0.3, 0.03, 1.35, 0.25, 2.3, 1.2]. Floors are smoother.
- `cfg.rim` holds ground heights around the shaft opening, so open air above the ground counts as air in the distance field.
- **Meshing**:
  - Surface nets in 24 m chunks. LOD0 = 0.2 m cells within 26 m of the camera; LOD1 = 0.6 m.
  - Rough chunks prebuild in the background. With the cavern there are 828 rough chunks out to 330 m. Close-up chunks are built on demand and freed beyond about 66 m.
  - Runs in 1–3 workers (`cave.workers`), with a main-thread fallback for rough meshes only.
  - Vertex = position, normal, daylight, kind. Daylight is baked per vertex by sphere-tracing toward the shaft bottom (75 m reach), so light only reaches what can see the shaft.
  - Chunks draw out to 330 m (it was 180 m before the cavern).
- Fixed meshes (`caveBuildFixed`): shaft walls, timber cribbing, broken ladder, drift timber sets, rails and ties, ore cart, collapse, station crates. The surface collar, windlass and crate are a normal prop (`caveBuildCollar`).
- **Physics**:
  - `caveUnder(x,z,py)` is true inside `CAVE_AREA` when more than 6 m below the exact terrain, or in the shaft.
  - `floorAt()` hands off to `CV.floorAt()`. That returns 1e9 for a wall (body test at +1.25 m and +1.7 m) and −1e9 for no floor.
  - `CV.ceilAt()` clamps the head when jetpacking.
  - `caveStep()` always allows a move that gets the body further out of the rock.
  - When grounded, the "ahead" check ignores cave walls; the step itself catches them.
  - In the cavern pool you wade: the floor is held at pool level − 1.1.
- **Camera**: `caveCamera()` pulls the camera in along a sphere-trace, keeps the target under the ceiling, and keeps it under the cap beams in the timbered mine.
- **Guideline** (`line`):
  - A tree of points. It ties off at the reel pickup and lets out every 2 m while you are more than 4 m from existing line.
  - Leaving the line starts a branch tied to the nearest point. Meeting older line ties in.
  - `d` = distance along the line to the tie-off. Arrows every 7 m point toward the tie-off (the way out).
  - Reel 750 m. Warnings at 100 m, 25 m and "line out".
  - The line glows on its own and brightens in the headlamp beam.
- **Battery**: 15 minutes per battery (`?battery=fast` = 45 s). Spares swap in automatically. The light flickers below 15%. The supply crate refills it on the surface.
- **Light dead with no line within 5 m**: after 200 m of walking you pass out, wake at the shaft and get a fresh battery.
- Pickups (`PICKS`): the reel at the station; batteries at the north crosscut end, the grotto end and the east chamber.
- The game saves to localStorage key `canyon-signal-run-v1` (including `cave`: battery, spares, picked items, reel, line points), every 5 s underground and on events.

## The crystal cavern (v7)
**Getting there (v8):** through the deep door in the station's south wall, along a 10 m drift, then off the lip into a smooth vertical tube. You fall 124 m and come out through the cavern roof onto the landing ledge at −179.8. All numbers below were measured at the v7 position; v8 shifts heights by +90.

**Shape:**
- `cavFloor(x,z)` makes a bowl with terraces: ledges about 9 m wide and cliffs about 7–8.5 m high, stepping down to the pool at −292.
- Six rock columns (`COLS`) run from floor to roof.
- Five galleries branch off: west, east, north, south-west and a low gallery. These are the future exits to Levels 2–4 and the sealed door.

**Kits (built by Opus 5.5 high-effort sub-agents):**
- **crystals**: crystal_point, crystal_double, crystal_shard, crystal_cluster, crystal_giant, crystal_spray. These are kit meshes; colour comes from the shader.
- **glowlife**: glow_moss, glow_caps, filament_curtain, bulb_pods, tube_colony, vein_patch.
- **survey** (the abandoned survey camp on the landing ledge): survey_deck, field_lab, crate_stack, instrument_mast, cable_run, core_drill, fallen_shelter. They are laid out in a line along the ledge from `CAMP_AT` = drop − (8, −3.5) and placed with `CV.floorAt`.

**Placement (`cavernScatter`):**
- `cavernHits()` casts 9 origins × 950 rays, giving about 7,500 wall/floor/ceiling hits with normals. It skips the drop column.
- Items are chosen by surface type (floor, ceiling, wall). About 7% of crystals are big. There are 30 giants, 10–26 m long, with width factor 0.5–0.7.
- Nothing is placed near the camp, and no glow life is placed below the pool.
- Hue regions give cyan-dominant and violet-dominant areas.
- Total: **13,269 instances** in one instance buffer.

**Lighting:**
- Crystals have a pulsing core glow, a rim (fresnel) glow, a headlamp specular and cavern ambient.
- Rock gets `cavAmb` × a term that is brighter on faces turned toward the cavern centre.
- The rock also has thin glowing mineral veins: two sets in 3D noise, line width taken from `fwidth`, and small bloom alpha.
- Humid haze colour (0.012, 0.05, 0.06), rate 0.0065.
- The pool is an opaque ellipse fitted at pool level.
- 3,200 drifting spores are drawn as additive points.

**Suit:** `cavernUpdate()` runs the humidity reading: 97% in the cavern, 64% elsewhere underground, 22% on the surface. The HUD shows "· Humidity N%" above 80%. `#visor` fog rises to 0.62 opacity inside the cavern. A toast appears on first entry.

**Not done yet:** crystals have no collision; flares; the scanner; the sealed door and gating; phone performance testing on the Pixel 7a.

## The deep door and modes (v8)
- **`DOOR`** (runtime): position from `CV.DOOR`; `open` 0..1; `lamp` from the frame's attach point; `parts` = frame and leaves from the `deepdoor` asset module.
  - There is a plain-slab fallback if the module is missing.
  - The station also gets the survey kit's `field_lab` and `crate_stack` as "the research team's leftovers".
- **`doorUnlocked()`** = `game.free || game.online >= 7`.
- **`doorUpdate()`** (called from `caveUpdate`):
  - Within 6.5 m and unlocked, the leaves slide 1.6 m apart over 3.6 s, with sounds. The door stays open, and its state is saved in `cave.door`.
  - Locked and within 4.5 m, it shows a toast at most every 25 s.
- **`doorBlocks()`**: while the door is less than 72% open, the doorway and the drift behind it are blocked.
  - It is checked in `caveStep` only, and only when the current position isn't already behind the door, so nobody gets trapped.
  - `caveCamera` keeps the camera on the player's side of a closed door.
- Drawing:
  - `drawDoor()` (pProp, underground lighting) in `drawCave`.
  - `drawDoorLamp()` (a glow diamond: red slow pulse when locked, steady green when unlocked) in `drawCaveFx`.
- **Modes:**
  - `game.free` flag.
  - `SAVE_KEYS`: campaign keeps `canyon-signal-run-v1`, so old saves carry on; free play uses `canyon-signal-run-free-v1`.
  - `startPlay(fresh, free)` saves the current mode before switching, loads the other save, then `resetView()`.
  - Free play gets all upgrades (`applyUpgrades` uses n = 7), 3 spare batteries on a new game, and no upgrade toasts.
  - Menu: Continue (named for the mode) · Campaign · Free play · New campaign · Benchmark, plus a one-line explanation.
- **Draw rules (performance):**
  - From outside the cavern (camera `cavK` > 1.5), cave chunks entirely below −136 are skipped.
  - Deep inside it (`cavK` < 1.0), chunks above −110 are skipped except within 30 m of the drop.
  - Station view in v8: ≈ 0.4M triangles submitted.

## Doors, couplings, work lights and the stalactite cavern runtime (v9)
- **`DOORS`** is an array (D-7, D-8, D-9), each with `yaw`/`c`/`s`.
  - `doorLocal(D,x,z)` gives `[u across, v along the tunnel]`; `doorWorld(D,u,v)` goes back.
  - Blocking, the camera clamp, opening and drawing all work in door-local coordinates. Models come from `deepdoor` items with the suffix `_d8`/`_d9`.
- **`doorUnlocked(D)`**:
  - D-9 is never unlocked (`doorReady` is false until the flooded cavern exists).
  - Free play unlocks everything else.
  - D-7 needs `online >= 7`; D-8 needs `cave.parts[0]`.
- Toasts:
  - D-8 locked: "its power coupling has been pulled…"
  - D-9: "won't budge… (The flooded level comes in the next build.)"
  - On opening in the campaign: "You seat the coupling…"
- **`PARTS`** (couplings, campaign only):
  - D-8: `floorNear(-44, -163, -179)`, the end of the crystal cavern's north gallery.
  - D-9: `floorNear(170, -300, -60)`, the north side of the hall.
  - Each has a `dropped_pack` beside it. Walk over a coupling to pick it up; it is saved in `cave.parts`.
- **`FLOODS`**: a `worklight/flood_mast` 7.5 m in front of each deeper door, aimed at it, with glow sprites on both lamp heads.
  - The flood nearest the camera (`cave.flood`) sets `uFdP` (position, intensity 1.35) and `uFdD` (aim, cone cos 0.78).
  - The light is `floodL()` in `GLSL_COMMON`, applied to rock, props, crystals, life, calcite and pool water.
- **`DRIPR`** (stalactite cavern):
  - `dripHits()` casts 11 origins × 1500 rays, giving about 14,900 hits.
  - `dripScatter()`:
    - Stalactites hang straight down (not along the normal), with companions.
    - Drips below grow stalagmites, or columns where they nearly meet.
    - Floors get stalagmites; flowstone goes only where floor meets wall.
    - Walls and column sides get drapery (rolled parallel to the wall) and helictites.
    - Giants: 16 stalactites of 11–20 m, 14 stalagmites of 5–12 m.
    - Glowworm threads on the ceiling, plus 8 glowworm lights per ceiling hit.
  - Totals: **13,968 instances, 27,584 glowworm lights, 66,696 pool-water quads**.
- **Shaders** (all are new programs):
  - `DRIP_FS` (calcite; colour a = translucency, warm light glowing through thin parts, wet sheen; instance hue = ivory..honey tint), as `pDrip`
  - `RIM_FS` (still turquoise pools with drip rings, reflected glowworm stars; alpha-blended, keeps the bloom mask), as `pRim`
  - `WORM_VS/FS` (points, min 1.6 px), as `pWorm`
  - `GLSL_COMMON` additions: `drpK`, `drpAmb` (blue-green glowworm sky light, stronger up high and on up-facing surfaces) and the hall's haze (dark teal mist).
- **Draw zones** (`drawCave`), set by camera y:
  - Level 1 (> −118, outside the D-7 drop column) skips chunks below −136.
  - The crystal cavern (−118..−225) skips chunks above −110 except along the D-7 drop, and below −235 except along the D-8 drop.
  - The stalactite cavern skips chunks above −230 except along the D-8 drop.
- **Saves**: `cave.doors` (array; it reads v8's `door` too) and `cave.parts`.
- **Humidity**: 99% and visor fog 0.5 in the hall, with a toast the first time.
- **Numbers** (headless, wide views): stalactite cavern ≈ 1.2–1.6M triangles submitted; D-9 area ≈ 0.6M.

## Controls
- Keyboard: WASD move, Space jetpack, Shift boost, C dive, drag to look, wheel to zoom, Esc menu, R back to the lookout, N sound, I details.
- Phone: as in v3.
- URL options:
  - `?play`, `?play=new`
  - `&at=mine` (start at the shaft top), `&at=cave` (start at the shaft bottom)
  - `&at=door` (in the station facing the deep door; `crystal` is an alias), `&at=cavern` (on the landing ledge in the cavern)
  - `?play=free` (free play, continue), `?play=freenew` (new free play)
  - `&at=d8`, `&at=d9` (in front of those doors), `&at=drip` (the stalactite cavern landing)
  - `&battery=fast`, `?noworker`, `?bench`, `?mode=explore`
  - `&cavedbg=N`: debug views of the rock shader. 1 daylight/kind, 2 face term, 3 normals, 4 ambient only, 5 albedo, 6 exposure, 7 colour + specular, 8 headlamp only, 9 vein glow.

## How to test without a GPU
Use headless Chrome through Playwright with `--use-angle=swiftshader --enable-unsafe-swiftshader`. This software renderer manages only about one frame every few seconds, so:
- Don't drive the game with held keys in real time.
- Step physics directly: set `__bench.keys`, then call `__bench.update(0.033)` in a loop. Steer by setting `state.yaw`.
- Call `__bench.cavePrebuild(330)` before cavern screenshots, to force all rough meshes.
- Wait 15–30 s before each screenshot so frames and close-up chunks catch up.
- `__bench.CAVR.off = { crys:1, life:1, spore:1, rock:1, props:1, pool:1, line:1 }` hides parts one at a time. This is useful for finding which draw causes a visual problem.
- For still shots, set `__bench.game.paused = true`. Rendering continues but physics stops, so a falling player stays put while frames catch up.
- `__bench.DOOR`, `DOORS`, `PARTS`, `FLOODS`, `STAKES` and `DRIPR` expose the door, coupling, light, trail and stalactite-cavern state.
- `tests/flight.py` measures flying (climb, hover, top speed, slide, dive) in the old version against the new one. `tests/surface_compare.py <old version file>` compares the surface start view.
- Cavern test views must use heights relative to `CV.CAV.y`, because the cavern moved in v8.
- Phone checks: viewport 915 × 412 with `has_touch`, and touches sent through CDP `Input.dispatchTouchEvent`.

## Known gaps / next
- Rock up close still looks a bit tile-like (it reuses the terrain's rock texture).
- Sky and water are Earth-like on purpose (terraformed), and the timber mine fits the colonists' own mine.
- Not built yet:
  - **next: the flooded cavern behind D-9**: swimming, murky water, creepy fast fish that keep their distance (glowing eyes), lore text to read. Then the giant crystal cavern below it.
  - the ancient alien artifact site
  - flares, the scanner
  - wall-touch feedback, hard mode and sonar, first-person view
  - the sinkhole and dam-pipe entrances
  - moving one power cell underground
  - first-person view
  - hard mode and sonar
  - wall-touch feedback in the dark
  - flares, the scanner, and a stationary light elsewhere
  - crystal collision
  - Pixel 7a performance check of the cavern
