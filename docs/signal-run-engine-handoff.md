# Signal Run — engine & state handoff (read this first in any new session)

Status as of 24 Nov 2026: **v15 (signal-run-v15-efficiency.html, ~1.18 MB)** is current. v15 is v14 made faster and kinder to play; nothing was added to the world.

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
- **v11: the flooded cavern** behind D-9 (details in its own section below). The surface is pixel-identical to v10.
- **v12: the giant crystal cavern** behind D-10 (details in its own section below): see-through titan crystals, the crystals' light on everything, the pulse and the reveal. The surface is pixel-identical to v11.
- **v13: a new way into the giant crystal cavern**: past D-10 the tunnel climbs out of the water to a balcony high in the cavern's wall (details in its own section). The surface is pixel-identical to v12.
- **v14: the ancient site** beyond the giant cavern (details in its own section). Christopher confirmed the giant cavern runs smoothly on the Pixel 7a and the MSI laptop. The surface is pixel-identical to v13.
- **v15: efficiency and experience pass** (details in its own section). The game no longer slows down the longer it runs, cave rock is built only near you, loading reaches the menu sooner, and the game remembers where you stood. Pixel-identical to v14 in 8 places, surface and underground.

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
   - v15: `version`, `lateInit`, `finishInit`, `resumePlace`, `saveGame`, `loadGame`, `objective`, `ROUGH_R`, `ROUGH_FREE`

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
  - Rough chunks build in the background, nearest first, within 420 m of the camera, and are freed beyond 560 m (v15; before that every rough chunk in the game was built at start and kept). Close-up chunks are built on demand and freed beyond about 66 m.
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
- The game saves to localStorage key `canyon-signal-run-v1` (including `cave`: battery, spares, picked items, reel, line points; and from v15 `place`, where you last stood), every 5 s underground, every 10 s on the surface (v15), when the tab is hidden (v15) and on events.

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
  - `startPlay(fresh, free)` saves the current mode before switching, loads the other save, then `resetView()` and, from v15, `resumePlace()`.
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

## The flooded cavern (v11)
- **Geometry (CaveLib):**
  - `LKE` is the lake hall, kind 11 (AMP 1.6): centre (1794, −410, 1471), radii 80 × 50 × 70.
  - **Water surface `CV.LAKE.water` = −421.5.** `lakeFloor()` is a deep bowl, about 33 m deep in the middle, tilted so the west is high, with a beach 1.5–3 m above the water (`BEACH` −420). There are boulders and silt mounds under the water.
  - **D-9**: its drift now runs to x 1736 and drops through the smooth tube at (1733, 1471), from −314 to −386. You land on the beach at about −419.9.
  - **The bore**, kind 12, is perfectly smooth (no roughness), radius 2.8. It is horizontal at y −449.2 from x 1802 to 1876, then slopes down to (1914, −470). Its vertex kind is 4, so the shader can find it.
  - **D-10**: at (1844, −452, 1471) inside the bore, under water. The tunnel runs +x and it has no drift.
  - `CAVE_AREA` reaches x 2004.
  - Exports: `CV.LAKE` (centre, radii, `water`, `drop`, `bore`, `boreR`), `lakeFloor`, `lakeK`.
- **Swimming** (`update()`):
  - `swim` = underground and chest (feet + 1.1) under water (`inWater()`: the lake ellipsoid or the bore box).
  - In water you float: grounded is cleared every frame and the jetpack is off. Horizontal speed eases to 3.4 m/s (boost 5.5). JET swims up at 2.6 m/s, DIVE goes down at 2.8 m/s, and with neither you hold your depth.
  - At the surface you float with your head out (feet at water −1.25). Walk out where the floor rises.
  - Measured: 16.6 m in 5 s at the surface; 13 m deeper after 5 s of DIVE.
- **Suit air** (`LAKER.air`): drains in 75 s with your head under water and refills at 40%/s above. It shows as "· Air N%" in the HUD.
  - At 30% a warning toast appears.
  - At 0 you black out (fade) and wake on the beach (`caveTeleport('lake')`) with full air: "…with no memory of swimming back."
- **Look:**
  - `GLSL_COMMON` adds `uLke`/`uLkeR` (`lkK()`) and `uUW` (camera under water, water level, density 0.115).
  - With the camera under water, `haze()` fogs everything with murk and adds the headlamp beam glowing in the water.
  - From above, things under the water are fogged by how far the view travels through water.
  - Props underground now use `haze()` too (the surface still uses `fogit`).
  - Rock in the lake hall is dark slate, with silt on up-facing surfaces under water and a dark algae ring at the waterline. The bore is black, glassy and wet, with a groove every 0.5 m.
  - `LAKE_FS` draws the surface: a dark mirror from above with ripples and reflected glowworms; from below, a dim rippling ceiling.
  - `SILT_VS/FS`: 2,600 silt motes wrap around the camera when it is under water and catch the lamp.
- **Kits** (`LAKER`, reusing `dripstone`): stalactites and soda straws above, a drowned forest of stalagmites below 2.5 m depth, drapery, helictites and sparse glowworm threads and lights. About 2,900 instances and 8,200 glowworm lights.
- **Fish** (`deepfish` module by a sub-agent: `lurker` 2.7 m, `darter` 1.7 m; both have eye attach points):
  - There are 7 (4 lurkers, 3 darters). `FISH_VS` bends each body with a wave running head to tail (`uSw`: phase, amplitude, length, wave number).
  - **Behaviour (`fishUpdate`):**
    - With the player in the water, they circle at 11–15 m.
    - They flee when the lamp points at them (within 13 m) or when you come within 6 m.
    - About every 14–32 s one **darts** across 4 m in front of the camera at 11 m/s.
    - With the player on the shore, every 16–32 s a fish **peeks** 1.6 m under the surface 7–12 m away.
    - Otherwise they wander the deep water, avoiding rock and the surface.
  - **Eyeshine** (`drawLakeGlow`): pale yellow-green glows at the eye attach points. They flare when the headlamp points at them and fade with distance, and from above water they fade with depth.
- **Dive station** (`divesite` module by a sub-agent):
  - `dive_platform` floats at the waterline; there are also `tank_rack`, `log_terminal` (with a screen glow), `line_spool` and `dropped_dive_light`. All are around `STATION_AT` (just north of the landing).
  - A `flood_mast` on the beach, aimed out over the water, joins `FLOODS`.
  - **The team's old guideline** (`LAKER.oldLine`, a pale line, LINE shader vK = 2) runs from the spool along the D-10 trail and into the bore, ending cut off at D-10.
- **The dive log** (`LOG`, 6 pages; draft text, see the lore doc):
  - A "Read the dive log" button (`#logBtn`) appears only within 3 m of the terminal (key E on a laptop).
  - `#logCard` has Back, Next and Close (arrow keys and Esc work too) and pauses the game while open.
- **Trail** (`ROUTES['D-10']`): 9 stakes down the beach and across the lake floor to the bore's mouth, plus 2 inside the bore.
- **Doors:** D-9 now opens (free play, or the campaign with its coupling). D-10 opens from v12 (see below).
- **Draw zone 3** (camera below −345) skips chunks above −350, except along the D-9 drop. Zone 2 skips below −355, except along the D-9 drop.
- **Numbers** (headless): about 0.48–0.9M triangles submitted around the lake. No errors.
- **Teleports:** `&at=lake` (the beach), `&at=d10` (under water in the bore). `__bench` adds `LAKER`, `inWater`, `logShow`. Tests: `tests/lake1.py` (views), `tests/lake2.py` (drop, swim, air, log in numbers).

## The giant crystal cavern (v12)
The finale: a giant geode behind D-10, reached by swimming the bore and coming up into a clear pool.
- **Geometry (CaveLib):**
  - `GEO`, kind 13 (AMP 1.5): centre (2044, −330, 1471), radii 130 × 105 × 120. `geoK(x,y,z)` is the normalised ellipsoid distance (< 1 inside).
  - `geoFloor()`: 6.5 m terraces rising from the water's edge (+1.4 m) toward the walls, with noise. The ceiling has a broad dome term.
  - **The pool**: centre (1999, 1471), radius 19, same water level as the lake (−421.5). Its bowl goes from −418.5 at the rim to −439 in the middle.
  - *(v12 only; replaced in v13, see below)* **The bore** carried on past D-10: (1802 → 1876, −449.2), dipped to −456 at 1912, rose to −447 at 1982, then turned straight up at (1997–1999) into the middle of the pool. About 140 m from D-10 to the pool.
  - `CAVE_AREA` reaches x 2224. The node check found no floating rock inside the cavern.
  - Exports: `CV.GEO` (x, y, z, rx, ry, rz, pool [x, z, r]), `geoFloor`, `geoK`.
- **Models** (`geode` module, Opus 5.5 sub-agent, brief `assets/briefs/GEODE_BRIEF.md`):
  - `titan_a` (558 / 90 triangles), `titan_b` (294 / 90), `titan_c` (582 / 114): the same exact hull with different surface detail (growth lines and etched triangles; ghost outlines and chipped edges; a frosted lower third). Colours: r frost, g line darkness, b edge brightness.
  - **The hull every titan matches** (unit frame, +Y along the crystal): a regular hexagon with apothem 0.17, the prism from y −0.06 to 0.78, six faces meeting at a tip at (0, 1, 0). Checked: no vertex is outside it, and the deepest detail is 0.0046 inside.
  - `druse_patch` (876 / 150): a 1.6 m patch of 62 small points. `druse_cluster` (725 / 126): a 0.8 m burst of 13 crystals. Both use the crystal-kit colour convention.
- **Placement (`geoInit`, seeded):** 17,776 surface hits from rays cast from 12 points inside.
  - 34 titans: 3 standing in the pool's edge, 14 on the terraces leaning out from the centre (28–72 m), 10 thrusting from the walls (34–86 m), 6 hanging from the dome, 1 colossus (104 m). Width = length × 0.27–0.6.
  - Hues: cyan, mint, violet, rose and a rare gold (`geoHue`, shared by JS and every shader).
  - 16,307 lining pieces, mostly the colour of the nearest titan; kept out of the titans and the pool's middle. 6,000 drifting motes. Takes about 0.6 s at load (headless).
- **The titan shader (`TITAN_VS/FS`)**, per pixel:
  - The exact ray–hull test (13 planes) gives where the eye enters and leaves the crystal. Only the near faces draw; from inside a titan, the far faces.
  - **Refraction:** bend in (index 1.55), cross the crystal, bend out; total internal reflection is handled. The background is read from a snapshot of the frame (`geoGrab`, texture unit 6) at the exit ray's point 28 m on. Red and blue are read slightly apart (dispersion) and the offset never reaches past the screen edge. Frosted parts blur it.
  - **Colour through the crystal:** absorption `(1−hue)·0.07 + 0.008` per metre, plus frost and lines.
  - **Light from inside:** 6 steps (3 on phones) through the crystal: a white-hot core along the axis, rising toward the tip, plus veils of inclusions (`vnoise3`). Deep light dims on its way out.
  - **Phantoms:** two shrunken copies of the hull (55–65% and 80–87%) inside most titans, drawn as thin glowing outlines that are brightest edge-on.
  - **Surface:** frost catches light, facet edges shine, and the faces mirror the other titans' light (`gli`).
  - **Compositing:** a screen blend over the bent background. The alpha (bloom mask) carries the core glow.
  - **Order:** after all solid things, far to near. One snapshot before the first titan and a fresh one before titans within 70 m, so near titans show far ones through them. Without the bloom framebuffer it falls back to plain blending.
- **The crystals' light (`GLSL_COMMON`):** `uGL[32]` holds the 16 titans nearest the camera (8 on phones) as glowing lines from 8% to 80% of their length.
  - Intensity = glow × (0.55 + L/50) × pulse × wake × fade × 0.14 (`&geok=` changes the 0.14).
  - `geoLight(w, n)` lights the rock, the lining, every prop and the character. `geoIso(w)` is the same without a normal, for the air and the water.
  - `geoMist` glows the air: 3 samples along the view, out to 120 m. It is off on phones.
- **The pulse and the reveal:** a ring of light runs out from the pool at 16 m/s every 18.75 s, +110% as it passes (`geoPulse`).
  - Before you have seen the cavern, everything is at 12% (`geoWake`).
  - The first time your head comes up in the cavern (`GEOR.seen`, saved), the first ring wakes each crystal as it passes. A three-chord swell plays, and the toast says (draft): *"Your suit radio fills with a slow, steady pulse: the same pattern the array was built to hear. It is coming from the crystals."*
- **Rock:** agate banding (concentric shells of the ellipsoid plus noise, slate to lavender with thin white bands), lit by the titans, plus a soft ambient (0.05, 0.065, 0.13) × wake from the crystal carpet.
- **Lining LOD:** meshes within 52 m (full detail within 28 m). Phones use 40 m and 16 m, and draw 55% of the far copies. Beyond 40 m the lining is drawn as glittering points (`GEOPT_VS/FS`) that fade in over 38–60 m.
- **Water:**
  - The pool is clear. Murk density goes from 0.115 to 0.022 as the camera comes into the cavern (`GEOR.clearK`).
  - `LAKE_FS` has a geode branch: lit from below by the drowned titans; from underneath, a window to the cavern with a mirror outside it.
  - *(v12 only)* In the bore past D-10 the murk glowed teal toward the rise. v13 replaced it with the light down the dry tunnel.
- **Play:**
  - D-10 now opens: free play, or the campaign with its coupling. The coupling lies on the lake floor 16.5 m down at local (318, −438, −7). The door toast adds "Far down the bore, a light is pulsing."
  - The spare tank (`cave.tank`, saved) comes from walking up to the dive station's rack. Air lasts 150 s instead of 75; free play always has it.
  - Route `ROUTES.GEO`: 12 stakes along the bore floor from D-10 to the rise, computed at load.
  - **Titans are solid:** `geoFloorY` lets you stand on them, and `geoPush` slides you along their faces.
  - The fish only follow you while you're in the lake (`lakeK` < 1.3).
- **Draw zones:** zone 4 (camera x > SX+470 and below −200) draws only chunks east of SX+380 and below −200. Zone 3 skips the geode's chunks above −432.
- **Rock gap fix (all caverns):** wherever a close-up chunk is drawn, its rough copy is drawn 0.15 m behind it (`uSink` in `CAVE_VS`). This fills the hairline gaps where close-up and rough chunks meet, which showed against the bright geode walls.
- **Numbers (headless, 960 × 540):**
  - Triangles: surfacing in the pool 1.42M (lining 0.60M), across the cavern 1.72M, from high above 0.99M, under the pool 2.0M. Phone setting, surfacing: 1.07M (lining 0.25M). 340–570 draw calls.
  - The dive in v12 (`tests/geo_play.py`, campaign, swimming with boost; see v13 for the new numbers):
    - The coupling: 8.6 s down.
    - Beach to D-10: 20.9 s.
    - D-10 to surfacing in the pool: 35.7 s.
    - **55.9 s under water** in total: the 75 s suit is enough if you know the way, and with the spare tank 62% of the air is left.
  - Dropped onto a titan: you stand on it 29 m above the rock. Started inside one: pushed out within 0.5 s.
  - The surface is pixel-identical to v11.
- **Teleports:** `&at=pool`, `&at=geo`. Phone or laptop version: `&geoq=lo|hi`. Tests: `tests/geo1.py` (views), `tests/geo_play.py` (numbers), `tests/geo_err.py` (load).

## The way in, rebuilt (v13)
Christopher couldn't get through v12's flooded tunnel on one breath. He chose "dry tunnel past D-10". The tunnel is now flooded only up to the lake's own level, as real water would be.
- **Geometry (CaveLib):**
  - `BORE` (the lake end) runs (1802 → 1850, −449.2, 1471), through D-10 at 1844.
  - `TUN` then climbs at 24–36°: (1850, −449.2, 1471) → (1868, −438, 1454) → (1884, −424, 1438) → (1902, −412, 1426) → (1920, −399, 1424) → (1934, −387, 1434) → (1942, −381, 1446).
  - Both are kind 12, radius 2.8. The old run down to the pool is gone; the pool is now just a pool.
  - `LEDGE`: a flat balcony, top −383.8, radius 11, centred at (1946, 1447). It is a raise in `geoFloor` with a 3.4 m-per-metre cliff around it, about 24 m above the floor below and 38 m above the water.
  - Exports `CV.GEO.tunnel` (the whole polyline, from the lake to the balcony) and `CV.GEO.ledge`.
  - Checked in Node:
    - The tunnel is 188 m long; about 55 m past the door is fully under water.
    - The steepest floor rise is 0.79 m per metre, so all of it is walkable.
    - No holes through to the lake. The balcony is flat out to 8 m, −387 at 12 m, −408 at 18 m.
- **Water:** `inWater` uses `tunnelD()` (the distance to the tunnel's middle line) below the water level, instead of v11's box.
  - A small water surface (`GEO_SURF`, radius 7.5) is drawn where the climbing tunnel comes up through −421.5.
  - Looking down into water now fogs anything below −421.5 whenever the camera is above it (`haze()`); everything that deep is under water.
- **Light down the tunnel:** `uGT` / `geoTun()` is a light just outside the tunnel's end (`GEO_MOUTH`). It lights the tunnel's glassy walls (and props, faintly) and pulses with the signal.
  - Strength 1.2 × (0.35 + 0.65 × wake) × pulse.
  - On plain rock it is kept low (0.35), so the balcony isn't washed out.
- **Rings:** the bore's half-metre rings are now counted from D-10 (`length(w − (1844, −450, 1471))`), so they run round the tunnel however it turns.
- **Draw zone 4** is also used whenever the camera is in the tunnel past D-10 (`GEOR.tun`), and the giant cavern's lights stay on there.
- **Reveal:** fires when your head is well inside the cavern (`geoK` < 0.935): two or three steps out onto the balcony. The first ring of the pulse comes across the cavern toward you.
- **Keeping the balcony clear:** no titan within 30 m of it, and no big crystal clusters within 4.5 m of the tunnel or on the balcony (the small crystal carpet still grows there).
- **Trail:** `ROUTES.GEO` is 15 stakes every 10 m from D-10 up the tunnel, plus one on the balcony.
- **Door toast:** "…Beyond it, the bore climbs up out of the water, toward a faint light."
- **Numbers** (`tests/geo_play.py`, campaign, **without** the spare tank):
  - Beach to D-10: 20.9 s.
  - D-10 to head out of the water: 11.8 s.
  - D-10 to standing on the balcony: 16.7 s.
  - **32.0 s under water in all, out of 75 s; air never went below 55%.**
  - Triangles: in the dry tunnel 1.76M, at the tunnel's end 1.97M, on the balcony 1.83M.
  - The surface is pixel-identical to v12.
- **Teleport** `&at=ledge`. Test views: `tests/geo1.py tunwet tunup mouth ledgedim ledge`.

## The ancient site (v14)
Christopher's choices: beyond the giant cavern; black stone with glowing lines; artifacts to scan; a final chamber; a puzzle that answers the signal; and a hologram of an ancient builder whose message the suit AI only fractionally understands, deducing that it is about one specific star system.
- **Geometry (CaveLib):**
  - `BORE2` (kind 12): from the giant cavern's east terrace (2124, −399.2, 1471; its floor is flush with the terrace at −402) east to (2186, −399.2), then straight down a 71 m shaft to (2186, −470).
  - New kinds with no rock noise: **14** is a rounded box (the default box branch of `segD`) and **15** is an eight-sided room. Both use vertex kind 5, so the shader knows they are cut stone. They are all one path, so their joins are crisp.
  - The rooms, with the floor at −479 everywhere:
    - the round room under the shaft: (2186, 1471), apothem 7, 10 m high
    - a passage 5 m wide
    - the **hall** (2252, 1471): 76 × 20 m, 26 m high
    - **four side rooms**: (2232 and 2268, 1485.5 and 1456.5), 10 × 11 × 9 m
    - a doorway 8 m wide and 12 m high
    - the **final chamber** (2322, 1471): eight-sided, apothem 24, 34 m high
  - Exports `CV.SITE` (floor, bore, vest, hall, rooms, door, chamber). `CAVE_AREA` reaches x 2444. Chunks: 3519.
  - Node check: floors flat at −479; nothing else's open air within the site.
- **Models** (`ancient` module, Opus 5.5 sub-agent, brief `assets/briefs/ANCIENT_BRIEF.md`):
  - The five artifacts, each 650–840 triangles: `relic_lens`, `relic_key`, `relic_tablet`, `relic_sphere`, `relic_seed`.
  - Pieces: `socket_pillar` (attach = the seat at 1.1 m, a solid box), `floor_plate`, `dais` (9 m octagon with 3 steps to 1.2 m; attach = the emitter at 1.32 m; non-solid step boxes), `monolith` (10 m, solid), and `portal_ring` (axis +Z, bold face −Z).
  - `entity`: 3,984 triangles, 6.5 m tall. Four arms; the upper pair cups the star chart. Attach `chart` [0, 4.45, 0.98] and `head`.
  - Colour convention: rgb = stone colour, a = glow. The entity uses r rim, g inner lines, b glyphs, a density.
- **Rendering:**
  - **Black stone** (`CAVE_FS`, k > 4.5): near-black (0.032, 0.034, 0.04), polished.
  - **Glowing lines** (`siteLines()`, a thin core plus a soft halo):
    - two channels down the hall
    - rings at 6.4, 10, 17 and 21.5 m round the dais, with spokes to the sockets
    - a band of glyphs at eye height on every flat wall, between lines at 1.95 and 2.95 m, with six glyph shapes picked per 0.55 m cell. They are skipped on rounded corners, where they would turn to static.
  - The glow pulses in waves toward the chamber (`sitePulse`) and brightens with the site's power: 0.35 at first, +0.12 per artifact set, 1.25 once answered.
  - Uniforms `uSite` (chamber centre, floor, power) and `uSiteH` (the hologram's light). `siteLight` and `siteAmb` reach rock and props; the haze in the site is still dark air.
  - `ANC_FS` (with `PROP_VS`) draws the stone pieces: polished, with the inlays glowing cyan (the artifacts and lit plates gold), and the glow added after the haze so it carries.
  - `HOLO_VS/FS`: the hologram is additive. It builds from the bottom up over 3.5 s and has scanlines, a rising bright band, flicker, a fresnel rim, inner lines, and gold glyphs that flicker while it speaks. It turns slowly to face you.
  - `STAR_VS/FS`: 700 stars plus the one gold star and a ring round it. First cupped in its hands (radius 0.8 m), then spread to a radius of 8 m around it.
  - `MOTE_VS/FS`: 260 motes rising from the emitter.
  - `drawSiteGlow`:
    - a gold glow over each artifact still on its pedestal
    - 8 cyan lights circling the portal ring, which grow with distance like the route stakes, so the opening reads from the balcony 190 m away
- **Play (`siteUpdate`):**
  - The first time you land, a toast describes the room.
  - **Artifacts:**
    - The lens is in the round room; the rod, tablet, sphere and seed are in the four side rooms, each on a pedestal.
    - Within 2.3 m a "Scan the artifact" button appears (key E). It opens the scan card (the dive log's card).
    - Closing the card puts the artifact in your pack. The status line shows "Artifacts n/5" while you're in the site.
  - **Sockets:** five pedestals at radius 15 round the dais, none in front of the door. Walk up with an artifact carried and it settles in, humming its note (C, D, E, G, A).
  - **The answer:**
    - Once all five are in, after 3 s the chamber flashes the plates (radius 9) in the order 0, 2, 4, 1, 3, one note every 0.9 s. Walking it traces a five-pointed star.
    - Then it listens. Only stepping *onto* a plate counts. A wrong plate resets it and the pattern plays again. Waiting 14 s replays it.
  - **The hologram:** it rises; the message runs on a timeline (`SITE_MSG`, about 45 s). The chart appears at 20 s, spreads at 27 s, and the star is highlighted at 29 s. Stepping on the middle of the dais replays the message.
  - **Saved** as `cave.site` = { r: per artifact 0 at rest / 1 carried / 2+k in socket k, solved, heard, seen }.
- **Physics:**
  - The model colliders feed `siteFloorY` and `sitePush`: you climb the dais's steps, but solid pillars and monoliths stop you.
  - New everywhere underground: flying into a lower opening ducks you under its lip, instead of sticking to the ceiling of a round tunnel.
- **Draw zone 5** (camera x > SX+728 and below −440): only the site's chunks and the shaft column. Zone 4 skips the site's chunks under the giant cavern.
- **Keeping things clear:** titans are kept 45 m from the second bore's mouth (a 104 m colossus had grown right across it), and big crystal clusters are kept out of the mouth.
- **Numbers** (headless; `tests/site_play.py`, `tests/site_phys.py`):
  - Walking from the portal into the bore and off the shaft's edge: 10.8 s. The fall to the round room: 11.4 s with glide fins.
  - Every artifact can be scanned and taken. The sockets fill in order. The chamber plays 0, 2, 4, 1, 3. A wrong first plate resets it; the right order solves it.
  - All 6 message lines play; the chart, its spreading and the highlight all trigger. Solved and heard stay saved after a reload.
  - The dais: you reach 1.32 m on top. A pillar stops you 0.4 m from its middle.
  - Flying back up the shaft: 80.6 m in 8.8 s for 80 fuel (a brand-new game's tank of 100 leaves 20), then out to the giant cavern in 5.9 s.
  - Triangles: about 0.4–0.65M in the site. The surface is pixel-identical to v13.
- **Teleports:** `&at=portal`, `&at=site`, `&at=chamber`.

## The efficiency and experience pass (v15)
Christopher asked for a review of v14 for efficiency and experience improvements. Nothing was removed and nothing looks different: fixed-clock screenshots of v14 and v15 are identical pixel for pixel in 8 places (lookout, mine top, Level 1 station, crystal cavern, stalactite cavern, lake beach, giant cavern balcony, final chamber). The patch script is `src/patches/v15_efficiency.py` (exact text swaps on v14, each checked to match once; `python3 src/patches/v15_efficiency.py game/versions/signal-run-v14-ancient-site.html game/signal-run.html` rebuilds v15 byte for byte). v15 was pushed to the repo on 24 Nov.

**The big one: the game got slower the longer it ran.** `computePose()` ended with `for (const k in pose) pose[k + '32'] = new Float32Array(pose[k])`. That loop also walked the copies it had made the frame before, so the pose list grew by 15 entries every frame, forever (38,400 entries after 2,557 frames), and every entry was copied again each frame.
- Measured with drawing switched off (`tests/v15_posecheck.py`): v14's script time went from 9.9 ms per frame after 5 s to 45.8 ms after 60 s, and the frame rate fell from 60 to 21 a second. After 100 s it was 72 ms and 13 a second.
- v15 keeps exactly 30 entries (15 poses and their 15 copies, made once and refilled): 1.6–1.9 ms per frame and a steady 60 a second.
- **Rule for the future:** never add keys to an object inside a `for … in` loop over that same object.

**Cave rock is built where you are, not everywhere at once** (`caveStream`):
- v14 meshed all 3,519 rough pieces at every start, even if you never left the surface: 40.3 s of background work (one core, measured by meshing every piece) and 107.1 MB of rock held from then on. 2,346 of those pieces are empty.
- v15 builds rough pieces only within `ROUGH_R` = 420 m of the camera (they are drawn out to 330 m) and frees them beyond `ROUGH_FREE` = 560 m. Empty pieces stay marked as known-empty, so they are not meshed twice. Standing at the lookout for 40 s: 0 pieces built, 1.6 MB held (the fixed shaft and mine timbers).
- The picker no longer builds and sorts a list of every missing piece each frame. It keeps only as many candidates as the workers can take (`caveBest`, at most 8), nearest first, close-up pieces before rough ones, exactly the old order.
- `cave.jobs` counts pieces handed to workers; `cave.bytes` is the rock memory held (shown in Details as MB).
- Live check (`tests/v15_stream.py`, drawing off): teleported cold to the crystal cavern, then the final chamber, then back. Every piece in view arrived each time, nothing was held beyond 560 m, and the rock held was 65–81 MB including close-up pieces. So deep underground the saving is modest; on the surface it is nearly all of it.
- **When adding a cavern:** nothing to do. The cost no longer grows with the number of caverns.

**Smaller per-frame savings:**
- Deep underground (`cave.surface` false) the surface's 2,304 tiles are no longer sorted out every frame, and the tile records are reused (`visPool`) instead of made new each frame.
- The explorer's sun-shadow pass (`charShadowPass`) is skipped when nothing reads it (`chK` = 0: underground, or more than 260 m above the ground). Underground that is 24,704 triangles and 19 draw calls fewer per frame.
- `drawCave` checks that a piece has rock before the on-screen test.
- The HUD writes to the page only when a readout changes (`hudLast`). Page layouts per frame went from 1.0 to 0.0.
- The controls hint is removed from the page after it fades.
- Script time per frame with drawing switched off (`tests/v15_jsbench.py`, test machine): surface 11.0 ms in the first 20 s and 72.5 ms after 100 s in v14, against 2.4 and 2.1 ms in v15. Crystal cavern: 10.8 and 72.6 ms, against 1.8 and 1.2 ms.

**Loading:**
- The bar now keeps moving through the whole set-up (the tiles are the first 45%), instead of sitting full while the rest ran.
- The caverns' furnishings (`cavernInit`, `geoInit`, `siteInit`, `doorInit`, `dripInit`, `lakeInit`) are in `lateInit`. From the menu they run behind the menu, one between frames. `startPlay` and `startBench` call `finishInit()` first, so play never starts without them. With `?play`, `?bench`, `?mode` or `&at=` in the address they run during loading, in the old order.
- Menu on screen (headless, average of 3): 4.5 s in v14, 2.8 s in v15. Everything laid out underground is identical afterwards (`tests/v15_initeq.py`: instance counts, titan positions, doors, couplings, stakes, world total).

**Experience:**
- **The game remembers where you stood.** `game.place` holds the last spot where you were standing (not flying or swimming), with the camera. It is saved with the game as `place`, every 5 s underground, every 10 s on the surface, and when the tab or app is hidden or closed. `resumePlace()` puts you back on Continue / Campaign / Free play, with a toast "Picking up where you left off." v14 always restarted at the lookout, however deep you were.
  - A saved place inside rock or over nothing is refused, and you start at the lookout. v14 saves (no `place`) load as before.
  - New campaign still starts at the lookout. Going to Benchmark and back returns you to your place.
- **Marker to the mine:** once all 7 dishes are online and until D-7 has been opened, the surface marker reads "old mine · N m" and points at the shaft. Before, the marker simply vanished at that point. This is surface only; underground still has only the in-world trail, as Christopher chose. Christopher confirmed he wants it kept (24 Nov). It is one line in `objective()`.
- **R deep underground asks first:** "Press R again to go back up to the lookout." On the surface R is immediate, as before.
- **Sound stops when the tab or app is hidden** (the wind loop kept hissing in the background) and comes back with it.
- **Two fixes found on the way:** Benchmark mode froze the game the moment you entered the mine if no game had been started (`cave.parts` did not exist yet), and in Benchmark mode underground the 5-second save could write a blank game over the campaign save. Both are fixed.

**Tests** (`tests/v15_*.py`, Playwright with headless Chrome; run from `tests/`, passing the game file to check; output goes to `tests/out/`):
- `v15_snap.py <file> <tag> [places]`: fixed-clock screenshots. It replaces `requestAnimationFrame` so frames are stepped by hand, seeds `Math.random`, calls `cavePrebuild(330)`, waits until every piece in view has arrived, sets `state.time` = 500 and hides the toast. `v15_cmp.py <places>` then compares the `v14` and `v15` tags pixel by pixel. The 8 places take about 25 minutes per version here. This is a stricter check than `surface_compare.py` and covers the caverns too; use it for any change that should not alter the picture.
- `v15_jsbench.py`, `v15_posecheck.py`: script time per frame with the draw calls replaced by empty functions, so frames run at full speed. Run these after any change to the per-frame code; a number that climbs over a minute means something is piling up.
- `v15_func.py`, `v15_func2.py`, `v15_func3.py`: resume, bad place, old save, Benchmark round trip, the marker, R, the menu tapped during set-up, saves, phone layout.
- `v15_roughcost.py`, `v15_stream.py`, `v15_initeq.py`, `v15_benchug.py`.
- Screenshots: `screenshots/v15-same-picture-as-v14.png`, `screenshots/v15-phone-old-mine-marker.png`.

**Looked at and left alone (ideas for later):**
- The canvas is created with its own smoothing (`antialias: true`), but in the game the picture is drawn off-screen with its own 4× smoothing and only copied to the canvas, so the canvas's smoothing does nothing there. Turning it off would need Benchmark mode to draw through the off-screen path too.
- While the menu or a log card is open, the picture is still drawn at full frame rate.
- A full-screen button for the phone (in the menu, not on the play screen).
- `update()` takes one physics step of up to 0.25 s after a long frame.

## Controls
- Keyboard: WASD move, Space jetpack, Shift boost, C dive, drag to look, wheel to zoom, Esc menu, R back to the lookout (underground it asks for a second press, v15), N sound, I details.
- Phone: as in v3.
- URL options:
  - `?play`, `?play=new`
  - `&at=mine` (start at the shaft top), `&at=cave` (start at the shaft bottom)
  - `&at=door` (in the station facing the deep door; `crystal` is an alias), `&at=cavern` (on the landing ledge in the cavern)
  - `?play=free` (free play, continue), `?play=freenew` (new free play)
  - `&at=d8`, `&at=d9` (in front of those doors), `&at=drip` (the stalactite cavern landing)
  - `&at=lake` (the beach), `&at=d10` (in the bore), `&at=ledge` (the giant cavern's balcony), `&at=pool` (its pool), `&at=geo` (its floor)
  - `&at=portal` (in front of the ancient site's opening), `&at=site` (its round room), `&at=chamber` (its final chamber)
  - `&geoq=lo|hi` (phone or laptop version of the giant cavern), `&geok=0.14` (its light strength)
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
- `__bench.DOOR`, `DOORS`, `PARTS`, `FLOODS`, `STAKES`, `DRIPR`, `LAKER`, `GEOR` and `GEOQ` expose the door, coupling, light, trail and cavern state. `CAVR.off` also takes `geo` (lining), `titan` and `water`.
- `tests/flight.py` measures flying (climb, hover, top speed, slide, dive) in the old version against the new one. `tests/surface_compare.py <old version file>` compares the surface start view.
- Cavern test views must use heights relative to `CV.CAV.y`, because the cavern moved in v8.
- Phone checks: viewport 915 × 412 with `has_touch`, and touches sent through CDP `Input.dispatchTouchEvent`.

## Known gaps / next
- Rock up close still looks a bit tile-like (it reuses the terrain's rock texture).
- Sky and water are Earth-like on purpose (terraformed), and the timber mine fits the colonists' own mine.
- Not built yet:
  - flares, the scanner
  - wall-touch feedback, hard mode and sonar, first-person view
  - the sinkhole and dam-pipe entrances
  - moving one power cell underground
  - first-person view
  - hard mode and sonar
  - wall-touch feedback in the dark
  - flares, the scanner, and a stationary light elsewhere
  - crystal collision (the giant cavern's titans are solid; the smaller crystals are not)
  - (Christopher reports the giant cavern runs smoothly on the Pixel 7a and the laptop.)
