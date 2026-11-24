# Brief: the ancient site (one module: `ancient`)

Read `assets/briefs/CAVEKIT_BRIEF.md` (toolkit, module format, tools) and `assets/briefs/BRIEF.md` (prop style rules). Look at `assets/modules/deepdoor.js` and `assets/modules/worklight.js` for how props are built.

## The place
Beyond the giant crystal cavern, a second glass-smooth bore leads down to the **oldest place in the game**: halls built millions of years ago by an ancient, non-human people.
- **Their style:** black stone cut with perfect geometry, glass-smooth, with **thin glowing channels inlaid in the stone**. The channels are lines, rings and rows of small geometric glyphs (short strokes, dots, circles and arcs in rows).
- It must not look human: no Greek, Egyptian or Mayan ornament, no faces, no human proportions in the architecture. Think precise, calm, enormous patience.
- The final chamber holds a dais. When the player solves a puzzle, a **hologram of one of the builders** appears above it and speaks.

## Colour convention (all items except `entity`)
- **r, g, b** = base colour. The stone is near black: [0.055, 0.055, 0.065]. A few accent parts (worn edges, the inside of cradles) can be slightly lighter, up to [0.12, 0.12, 0.14].
- **a** = **glow**: 0 for plain stone, 1 for the glowing inlaid channels, glyphs and rings. Use 0.5 for faint secondary channels.
- Model inlays as thin raised or flush strips (a few mm proud of the surface, or as separately coloured faces) so the lines read crisply. The game's shader makes the a = 1 parts glow and pulse.

## Items (natural size in metres, +Y up, resting on y = 0 unless said; `colliders` as listed; deterministic, `K.rnd` only)
| item | budget hi / lo | what |
|---|---|---|
| `relic_lens` | 900 / 200 | **Artifact 1.** A thick black disc about 0.5 m across and 0.12 m thick, standing on edge in a small foot. A glowing ring inlay, and a recessed clear-looking centre (make the centre a slightly lighter grey with glow 0.5). |
| `relic_key` | 900 / 200 | **Artifact 2.** A slender six-sided rod about 0.8 m long lying on two small stone rests, with glowing channels spiralling round it. |
| `relic_tablet` | 900 / 200 | **Artifact 3.** A slab about 0.6 × 0.4 × 0.06 m, leaning slightly back on a small stand, its face covered in rows of glowing glyphs. |
| `relic_sphere` | 900 / 200 | **Artifact 4.** A sphere about 0.45 m across made of nested curved segments, with glowing seams between them, in a three-pronged cradle. |
| `relic_seed` | 900 / 200 | **Artifact 5.** A twisted, spiral seed-like form about 0.5 m tall, like a nautilus turned on end, with a glowing line following the spiral. |
| `socket_pillar` | 600 / 150 | A waist-high pedestal (top at 1.1 m), about 0.7 m wide, with a cradle on top where an artifact sits. A glowing channel runs down its front into the floor. `attach`: one point, the seat on top where an artifact is placed. Collider: a box for the pedestal. |
| `floor_plate` | 300 / 80 | A flat round or hexagonal plate 2.4 m across and 0.08 m tall, set into the floor, with a glowing ring inlay around its edge and one glyph in the middle (the game lights it up when it is part of the puzzle). No collider. |
| `dais` | 1500 / 300 | The central dais: 9 m across, three wide steps up to 1.2 m, octagonal or round. Glowing channels run in from the edge to an emitter ring in the middle of the top. `attach`: one point, the middle of the emitter ring on top (the hologram appears above it). Collider: boxes or a stepped stack so you can walk up. |
| `monolith` | 400 / 100 | A tall slab for the halls: about 2.2 m wide, 0.9 m thick, 10 m tall, with chamfered edges and a vertical column of glowing glyphs on each broad face. Collider: a box. |
| `portal_ring` | 800 / 200 | A thick stone ring framing a round tunnel mouth: inner radius 3.0 m, outer radius 4.2 m, 0.8 m deep, centred on the origin **with its axis along +Z** (the tunnel runs along +Z). A glowing ring inlay on the outer face, plus a ring of glyphs. This is the landmark players see from far across the giant cavern, so the inlays should be bold. No collider. |
| `entity` | 4000 / 800 | **The hologram of an ancient builder** (see below). |

## The entity (`entity`)
- **Size and pose:** about 6.5 m tall, from its lowest point at y = 0. It is a hologram, so it hovers: the game raises it above the dais.
- **The being:** clearly not human, but dignified and calm rather than monstrous.
  - A tall, slender body. A long, narrow head with no face, only a smooth crest and a few glyph-like markings.
  - **Four long arms:** the upper pair raised and curved forward, cupping an empty space in front of its chest (the game shows a star chart there); the lower pair hanging relaxed.
  - The lower body tapers to a trailing, tail-like point instead of legs.
  - Long, thin, slightly translucent fins or drapes hanging from the shoulders are welcome.
- **Colour channels** (the game draws it with a hologram shader, so these are not real colours):
  - r = **rim/outline emphasis**: 1 on silhouettes and edges, falling off inward.
  - g = **inner structure**: 1 on internal lines, ribs and segment seams, 0 elsewhere.
  - b = **glyph markings** on the head, chest and arms: 1 on the markings, 0 elsewhere.
  - a = **density**: 0.3–1. Solid parts are 1, thin fins and drapes about 0.3–0.5.
- `attach`: two points.
  - `chart`: the centre of the space cupped by the upper hands (where the star chart appears).
  - `head`: the centre of the head.
- No collider.

## Previews
From `assets/`: `python3 shot.py modules/ancient.js <item> ../tests/ancient_<item>.png 1 0` (mode 0 shows the shapes; glow isn't shown there, which is fine). Budget 2–3 rounds per item; the entity deserves the most care.

## Report back (concise)
- Each item in plain words, with triangles at full and low detail.
- Attach points (name and position) and colliders.
- That `node stats.js modules/ancient.js` builds every item at both detail levels.
- The preview paths.
