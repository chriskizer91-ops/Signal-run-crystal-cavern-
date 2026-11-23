# Reskin brief (shared by every agent)

## The game
Signal Run is a single-file WebGL game: a 3 km desert canyon with a dam, a 7-dish radio observatory and a jetpack explorer. Every model is generated in code with a small toolkit (no images). The owner has decided the world is now **an alien planet in the far future**, and the player is a suited explorer visiting old outposts. The surface models must be reskinned so the world no longer reads as present-day Earth.

## Style (the owner's words)
"A hypothetical future. Not smooth fancy. All the shapes the same or close to the same. A rugged off-road truck-like vehicle. A lot of the things can look the same as they do."

So:
- Rugged, utilitarian, industrial, worn. Off-road and expedition gear.
- Keep each model's silhouette, size and proportions close to the original.
- Change what makes it read as future/alien through details and retrofits:
  - sealed cabs and pressure seals, armour panels, roll cages and exo-frames
  - filter intakes and snorkels, external gas/oxygen cylinders
  - sensor masts, antennas, small dishes, light bars
  - cable runs, radiator/heat fins, hazard striping, stencilled unit codes
- NOT sleek, curvy, glossy sci-fi. No chrome, no smooth pods.
- Remove things that read as present-day Earth: licence plates, brand-like badges, traffic cones, campfires with logs, wooden picnic gear.

## The toolkit
`assets/assetkit.js` is the toolkit. Read it once. It provides:
- `MB` mesh builder: `box`, `beam`, `cyl`, `lathe`, `sphere`, `tube`, `extrude`, `surf`, `plate`, `tri`, `quad`, `merge`, `push`/`pop` transforms, `bounds`
- matrix helpers: `tr`, `sc`, `rotX`, `rotY`, `rotZ`, `mulAll`
- seeded random: `K.rnd(seed)`

## Colours
- A colour is `[r, g, b, a]` with values 0..1.
- The shader squares rgb before lighting (`col = c.rgb * c.rgb`), so mid values look darker than you would expect.
- Alpha is the material: 0 = matte; up to 0.5 = increasingly glossy metal or glass; 1 = concrete with grime streaks.
- There is no emissive/glow channel. "Glowing" bits can only be bright colours.

## Hard rules
1. Edit ONLY `assets/modules/<module>.js`. Keep its wrapper exactly: `window.MODDEF = { fn: (function (K) { ... }) };`. It must stay plain JavaScript that runs unchanged in both Node and the browser.
2. Keep every item: same `name`, same `budget` field, and `build(detail)` must work for detail 1 (full) and detail 0 (low, used far away).
3. `colliders` and `attach` arrays must stay EXACTLY the same. The game uses them for physics and wiring.
4. Bounds within about ±10% of the original on each axis. The ground contact (min y) must stay the same.
5. Triangles:
   - full detail ≤ the item's `budget` field and ≤ 1.25× the original;
   - low detail ≤ 1.3× the original low detail.
   - **Plants are drawn thousands of times: plants must not exceed their original triangle counts at all.**
6. Deterministic: never `Math.random`. Use `K.rnd(seed)`.
7. No external files, images or network.

## Tools (run from the assets folder)
- `node stats.js modules/<module>.js modules/originals/<module>.js` prints triangles and bounds against the original, and flags changed colliders or attach points.
- `python3 shot.py modules/originals/<module>.js <item> shots/<module>_<item>_before.png` renders 4 views into a PNG. Do the same with `modules/...` and `_after.png`. View PNGs with the Read tool.
- The preview uses a software renderer and takes about 5–20 s per shot. Budget 2–4 preview rounds per item; don't over-iterate.

## Report back (concise)
- For each item: what you changed, in plain words, plus triangles before → after (full and low).
- Confirm stats.js shows no changed colliders or attach points and bounds within ±10%.
- List the final `_after.png` paths.
