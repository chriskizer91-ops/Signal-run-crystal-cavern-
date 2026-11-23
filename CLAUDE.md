# Working on Signal Run (read this first)

## Who you're working with
Christopher builds this game entirely through conversations with Claude; he doesn't write code.
- **Explain in plain words.** No jargon without a plain explanation.
- **Prove every step with screenshots and simple numbers** (triangle counts, positions, distances, times).
- Keep phone screens uncluttered. He plays on a Pixel 7a (Chrome) and an MSI laptop (Edge).
- Deliver the **whole updated HTML** with a new version number. Never strip features.
- The main session is the **coordinator**. Self-contained jobs, especially 3D models, go to sub-agents (Opus 5.5 at high effort). Give each one a brief in `assets/briefs/` style.
- Design decisions and lore live in `docs/`. The lore is deliberately open: only points marked **Decided** are fixed.

## Read these next
1. `docs/signal-run-engine-handoff.md`: how the engine, caves, doors, modes, caverns and shaders work, with coordinates and numbers.
2. `docs/signal-run-caves-design.md`: the agreed plan, especially "stacked caverns, door to door", and what's built.
3. `docs/signal-run-world-and-lore.md`: setting, tone, open questions.

The same three docs also live in the claude.ai Project "Build" as `claude/*.md`. Keep both copies updated.

## The source of truth
- **`game/signal-run.html` is the game and its real source.** It is one self-contained WebGL 2 file.
- When you change it, copy the result into `game/versions/signal-run-vN-<name>.html` too, and update the version list in `README.md` and the docs.
- `src/cavelib.js` must stay identical to the `CaveLib` function inside the game, because Node checks load it. Use `python3 src/sync_cavelib.py check | to-game | from-game`.
- `src/patches/` and `src/runtime/` are a record of how each version was made. Their absolute paths (`/home/claude/...`) point to the old workspace, so reuse the patterns rather than running them as-is.
- Make changes to the HTML with small, exact string replacements, and assert each one matches exactly once (see the patch scripts).

## Models (assets/)
- Each model group is a module in `assets/modules/<name>.js`: `window.MODDEF = { fn: (function (K) { … return { name, items: [{ name, budget, build(detail), colliders, attach }] } }) }`.
  - detail 1 = near, 0 = far.
  - Deterministic: use `K.rnd`, never `Math.random`.
- Tools, run from `assets/`:
  - `node stats.js modules/<m>.js` reports triangles and bounds.
  - `python3 shot.py modules/<m>.js <item> out.png <detail> <mode>` takes a 4-view preview. Modes: 0 normal, 1 crystal, 2 glow life.
  - `python3 splice_add.py ../game/signal-run.html <module> [...]` adds or replaces modules in the game's `ASSET_DEFS`.
- Instanced cave kits (crystals, glowlife, dripstone) follow the conventions in their briefs: +Y = surface normal, unit-length pieces run from y 0 to 1, colour channels as each brief says.

## Testing (no GPU here)
- Headless Chrome via Playwright, with `--use-angle=swiftshader --enable-unsafe-swiftshader`. It draws about 1 frame every few seconds.
- **Step physics directly**: set `__bench.keys`, call `__bench.update(0.033)` in a loop. `tests/tour.py` holds the `SIM` helper string that does this.
- For still screenshots:
  - set `__bench.game.paused = true` (physics stops, rendering continues)
  - call `__bench.cavePrebuild(330)`
  - wait 15–30 s
- `__bench` exposes `state, stats, cam, game, cave, line, CV, CAVR, DRIPR, DOORS, PARTS, FLOODS, caveTeleport, update, cavePrebuild`.
- Useful URL options:
  - `?play=new | freenew | free`
  - `&at=mine | cave | door | cavern | d8 | drip | d9`
  - `&cavedbg=N` (rock shader debug views)
  - `__bench.CAVR.off = {crys:1, life:1, …}` hides parts to find a visual bug
- Before delivering, always compare the surface start view against the previous version: `python3 tests/surface_compare.py <previous version file name>`. It has stayed 100% identical since v7.
- `tests/flight.py` measures how flying feels (climb, hover, top speed, slide, dive) in old against new.
- Tests write screenshots into the folder they run from. Run them from `tests/`; PNGs there are git-ignored.

## Where the project is
- **Done:**
  - v9: crystal cavern (D-7) → stalactite cavern (D-8) → door D-9, which stays shut.
  - v10: steadier flying (no slide, cave speeds, hover) and glowing route stakes. Trails come from `src/node/routes.js`; rerun it and re-paste `ROUTES` if a cavern changes.
  - Campaign and Free play modes.
  - Couplings for deeper doors in the campaign.
- **Next:**
  - The **flooded cavern** behind D-9: swimming, underwater rendering, suit air, creepy fast fish with glowing eyes that keep their distance, creepy lore text to read.
  - Then the **giant crystal cavern** (bigger, thicker, brighter crystals).
  - One cavern at a time, with screenshots after each.
