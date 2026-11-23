# v10: steadier jetpack flight (no sliding, cave speeds, hover) and the research team's glowing route stakes.
# Run from the repo root:  python3 src/patches/v10_flight_and_stakes.py
import os, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
P = os.path.join(ROOT, 'game', 'signal-run.html')
s = open(P, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:100])
    s = s.replace(a, b)

# 1. air steering: head where the stick points, slow to a stop when you let go; cave speeds are much lower
rep("""    else {
      const vmax = boost ? (play ? game.vmaxBoost : 130) : 48, acc = boost ? 75 : 36;
      if (ml > 0) { state.vx += mx * acc * dt; state.vz += mz * acc * dt; } else { const dg = Math.exp(-0.9 * dt); state.vx *= dg; state.vz *= dg; }
      const sp = Math.hypot(state.vx, state.vz); if (sp > vmax) { const k = Math.max(vmax / sp, Math.exp(-2.5 * dt)); state.vx *= k; state.vz *= k; }
      if (play && boost && ml > 0) game.fuel = Math.max(0, game.fuel - 6 * dt);
    }""", """    else {   // in the air: steer toward where the stick points, and let go to slow to a stop instead of sliding on
      const ug = cave.under, vmax = boost ? (ug ? 17 : play ? game.vmaxBoost : 130) : (ug ? 11 : 48);
      const rate = ml > 0 ? (ug ? 3.2 : boost ? 1.4 : 1.8) : (ug ? 3.0 : 1.6), k = 1 - Math.exp(-rate * dt);
      state.vx += ((ml > 0 ? mx * vmax : 0) - state.vx) * k; state.vz += ((ml > 0 ? mz * vmax : 0) - state.vz) * k;
      if (play && boost && ml > 0) game.fuel = Math.max(0, game.fuel - 6 * dt);
    }""")
# 2. climbing is gentler underground; after using the jet, letting go HOVERS (slow fuel use); DIVE sinks and letting go of it stops you again
rep("    if (jet) { state.vy = Math.min(state.vy + 60 * dt, boost ? 45 : 28); state.grounded = false;",
    "    if (jet) { state.vy = Math.min(state.vy + 60 * dt, boost ? (cave.under ? 15 : 45) : (cave.under ? 9 : 28)); state.grounded = false; state.hover = true;")
rep("      if (!jet) { const capV = drop ? -75 : play ? game.fallCap : -12; state.vy = state.vy < capV ? Math.min(capV, state.vy + 90 * dt) : Math.max(capV, state.vy - 26 * dt); }",
    """      if (!jet) {
        if (state.hover && !drop && hasFuel) { state.vy += (0 - state.vy) * Math.min(1, dt * 4); if (play) game.fuel = Math.max(0, game.fuel - 2.2 * dt); }   // hovering
        else { const capV = drop ? (cave.under ? -16 : -75) : play ? game.fallCap : -12; state.vy = state.vy < capV ? Math.min(capV, state.vy + 90 * dt) : Math.max(capV, state.vy - 26 * dt); }
      }""")
rep("state.py = floorY; state.vy = 0; state.grounded = true; }", "state.py = floorY; state.vy = 0; state.grounded = true; state.hover = false; }")
rep("state.thrust = ease(state.thrust, jet ? 1 : state.grounded ? 0 : (keys.Space && !hasFuel) ? 0.12 : drop ? 0.08 : 0.38, 10);",
    "state.thrust = ease(state.thrust, jet ? 1 : state.grounded ? 0 : (keys.Space && !hasFuel) ? 0.12 : drop ? 0.08 : state.hover && hasFuel ? 0.55 : 0.38, 10);")
rep("WASD move · Space jetpack · Shift boost · C dive · drag to look · wheel to zoom<br>Esc menu", "WASD move · Space jetpack (let go to hover) · Shift boost · C dive · drag to look · wheel to zoom<br>Esc menu")
rep('<div id="hint" class="card">WASD move · Space jetpack · Shift boost · C dive', '<div id="hint" class="card">WASD move · Space jetpack (let go to hover) · Shift boost · C dive')
rep("Hold JET to climb, let go to drift · DIVE drops fast · BOOST on/off", "Hold JET to climb, let go to hover · hold DIVE to go down · BOOST on/off")

# 3. route stakes: precomputed by src/node/routes.js, one trail per cavern from the landing to the exit door
routes = json.load(open(os.path.join(ROOT, 'src', 'node', 'routes.json')))
rep("const STATION_PROPS = [], FLOODS = [];", "const STATION_PROPS = [], FLOODS = [], STAKES = [];\n"
    "const ROUTES = " + json.dumps(routes, separators=(',', ':')) + ";   // the research team's route stakes, landing -> exit door (src/node/routes.js)\n"
    "const nearRoute = p => { for (const k in ROUTES) for (const q of ROUTES[k]) if (Math.abs(q[1] - p[1]) < 3.5 && Math.hypot(q[0] - p[0], q[2] - p[2]) < 1.5) return true; return false; };")
rep("  // the couplings and the packs dropped beside them\n", """  // route stakes, each turned to face the next one, its light where the model says
  const sk = assetItem('worklight', 'route_stake'), sa = sk && sk.it.attach && sk.it.attach[0] ? sk.it.attach[0] : [0, 0.86, 0];
  for (const name in ROUTES) ROUTES[name].forEach((p, i, arr) => {
    const q = arr[Math.min(i + 1, arr.length - 1)], yaw = i < arr.length - 1 ? Math.atan2(q[0] - p[0], q[2] - p[2]) : 0, c = Math.cos(yaw), s = Math.sin(yaw);
    STAKES.push({ route: name, i, n: arr.length, p, mesh: sk, m: new Float32Array(mulAll(tr(p[0], p[1], p[2]), rotY(yaw))), light: [p[0] + c * sa[0] + s * sa[2], p[1] + sa[1], p[2] - s * sa[0] + c * sa[2]] });
  });
  // the couplings and the packs dropped beside them
""")
rep("  for (const F of FLOODS) if (F.mesh) { const d = dist([F.x, F.y, F.z]); if (d < 180) draw(F.mesh, F.m, d); }\n",
    "  for (const F of FLOODS) if (F.mesh) { const d = dist([F.x, F.y, F.z]); if (d < 180) draw(F.mesh, F.m, d); }\n"
    "  for (const k of STAKES) if (k.mesh) { const d = dist(k.p); if (d < 110) draw(k.mesh, k.m, d < 30 ? 0 : 99); }\n")
rep("  for (const F of FLOODS) for (const L of F.lamps) if (dist(L) < 400) glowDraw(", """  for (const k of STAKES) {                 // stake lights: a pulse runs along each trail toward the door
    const L = k.light, d = dist(L); if (d > 240) continue; const h = (state.time * 3.2) % (k.n + 5), w = Math.max(0, 1 - Math.abs(k.i - h) / 1.6), g = 0.8 + 1.6 * w, sz = (0.1 + 0.06 * w) * Math.max(1, d / 9);   // grows with distance so the trail reads from across a cavern
    glowDraw(crystal, mulAll(tr(L[0], L[1], L[2]), sc(sz, sz * 1.3, sz)), 1.0, 0.55 + 0.2 * w, 0.12, g, 0);
  }
  for (const F of FLOODS) for (const L of F.lamps) if (dist(L) < 400) glowDraw(""")
# keep crystals and dripstone off the trail so the stakes stay visible
rep("  const nearCamp = p => p[1] < C.y - 10 && (", "  const nearCamp = p => nearRoute(p) || p[1] < C.y - 10 && (")
rep("  const clear = p => (Math.hypot(p[0] - land[0], p[2] - land[2]) < 6.5 &&", "  const clear = p => nearRoute(p) || (Math.hypot(p[0] - land[0], p[2] - land[2]) < 6.5 &&")
rep("window.__bench = { DOOR, DOORS, PARTS, FLOODS, DRIPR,", "window.__bench = { DOOR, DOORS, PARTS, FLOODS, STAKES, DRIPR,")
open(P, 'w', encoding='utf-8').write(s)
print('patched', len(s))
