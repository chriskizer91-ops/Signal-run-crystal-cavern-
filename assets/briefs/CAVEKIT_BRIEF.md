# Cave asset brief (shared by every cave-asset agent)

## The game and the setting
Signal Run is a single-file WebGL game. Every model is generated in code with a small toolkit (no images, no files, no network).

- **Setting:** one of hundreds of partially terraformed planets in the far future. On the surface, people lived without suits; their buildings have airlocks as standard settler safety gear. Something went wrong at this outpost.
- **Underground, biology is stranger and glows.** The alien palette (teal, cyan, violet, magenta) belongs down here.
- **Mood:** mostly wonder and discovery.

You are building models for the showcase location: **a giant crystal cavern**, about 190 m across and 100 m tall. It is lit by glowing life and crystals, with ledges, cliffs, a pool, haze and drifting spores. It should be the most visually stunning place in the game.

## The toolkit
`assets/assetkit.js` is the toolkit. Read it once. It provides:
- `MB` mesh builder: `box`, `beam`, `cyl`, `lathe`, `sphere`, `tube`, `extrude`, `surf`, `plate` (flat face with its own normal: good for crisp facets), `tri`, `quad`, `v(x,y,z,nx,ny,nz,colour)`, `merge`, `push`/`pop` transforms, `bounds`
- matrix helpers: `tr`, `sc`, `rotX`, `rotY`, `rotZ`, `mulAll`
- seeded random: `K.rnd(seed)`
- Colours are `[r, g, b, a]` 0..1. What the four channels MEAN depends on your kit (below).

## Module format
- Write your module to `assets/modules/<module>.js` with exactly this wrapper:
  `window.MODDEF = { fn: (function (K) { … return { name: '<module>', items: [ { name, budget, build(detail), colliders: [] }, … ] }; }) };`
- `build(1)` = full detail, `build(0)` = far-away detail. Both must return an `MB`.
- It must be plain JavaScript that runs unchanged in Node and in the browser.
- Deterministic: never `Math.random`. Use `K.rnd(seed)`.

## Tools (run from the assets folder)
- `node stats.js modules/<module>.js` prints triangles and bounds per item.
- `python3 shot.py modules/<module>.js <item> shots/<module>_<item>.png <detail 1|0> <mode>` renders 4 views into a PNG. Look at it with the Read tool.
  - mode 0 = normal daylit prop, mode 1 = crystal, mode 2 = glow life.
  - It uses a software renderer: about 5–20 s per shot.
  - Budget 2–4 preview rounds per item. Don't over-iterate.

## Report back (concise)
- For each item: what it is, in plain words, plus triangles at full and low detail.
- Confirm both detail levels build in stats.js.
- List the final preview PNG paths.
