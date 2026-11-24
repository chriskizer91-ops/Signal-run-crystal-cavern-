#!/usr/bin/env python3
# v15: efficiency and experience pass. Builds v15 from v14 with exact text swaps; each must match the expected number of times.
# Usage (from the repo root):
#   python3 src/patches/v15_efficiency.py game/versions/signal-run-v14-ancient-site.html game/signal-run.html
# Nothing in CaveLib changes, so src/cavelib.js stays as it is.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'expected %d match(es), found %d for: %s' % (n, c, old[:90])
    s = s.replace(old, new)

# ---- 0. THE BIG ONE: the character's pose list grew by 15 entries every frame, forever, and every entry was copied again
#         each frame, so the game got slower the longer it ran. Now the 15 copies are made once and refilled.
rep("  for (const k in pose) pose[k + '32'] = new Float32Array(pose[k]);",
    "  for (const k in pose) { if (k.endsWith('32')) continue; const q = k + '32'; (pose[q] || (pose[q] = new Float32Array(16))).set(pose[k]); }   // v15: was a new copy of every entry, copies included, every frame")
# ---- 1. caves: pick the next pieces to build without sorting a 3,519-item list every frame; build rough pieces
#         only within reach of the camera and let go of the far ones
rep("""  const E = cam.eye, want = [];
  for (const c of cave.ch) {
    const dx = Math.max(c.x0 - E[0], 0, E[0] - c.x0 - CAVE_CH), dy = Math.max(c.y0 - E[1], 0, E[1] - c.y0 - CAVE_CH), dz = Math.max(c.z0 - E[2], 0, E[2] - c.z0 - CAVE_CH);
    c.d = Math.hypot(dx, dy, dz);
    if (cave.visible && c.d < LOD0_R && !c.m[0] && !c.pend[0]) want.push([c.d - 1000, 0, c]);
    if (!c.m[1] && !c.pend[1]) want.push([cave.visible && c.d < 330 ? c.d : 1e5 + c.d, 1, c]);   // the whole level in rough form, nearest first
  }
  want.sort((a, b) => a[0] - b[0]);
  const live = cave.workers.filter(w => !w.dead);
  if (live.length) {
    let q = 0;
    for (const w of live) while (w.busy < 2 && q < want.length) { const [, lod, c] = want[q++]; c.pend[lod] = true; w.busy++; w.postMessage({ key: c.key, lod, i: c.i, j: c.j, k: c.k }); }
  } else {                                     // no workers allowed: rough meshes only, one per frame
    if (cave.mode !== 'main thread') { cave.mode = 'main thread'; for (const c of cave.ch) c.pend = [false, false]; }
    const it = want.find(w => w[1] === 1); if (it) { const c = it[2], r = CV.meshChunk(c.i, c.j, c.k, 1); c.m[1] = r.tris ? caveGpu(r.buf, r.idx) : { count: 0, tris: 0 }; }
  }
  if (frameNo % 30 === 0) for (const c of cave.ch) if (c.m[0] && c.d > LOD0_R + 40) { caveFree(c.m[0]); c.m[0] = null; }
}""",
"""  // v15: only as many pieces are picked as the workers can take right now (nearest first), with no list to build or sort
  const E = cam.eye, B = caveBest, vis = cave.visible; let live = 0, slots = 0;
  for (const w of cave.workers) if (!w.dead) { live++; if (w.busy < 2) slots += 2 - w.busy; }
  if (!live) { if (cave.mode !== 'main thread') { cave.mode = 'main thread'; for (const c of cave.ch) c.pend = [false, false]; } slots = 1; }   // no workers allowed: rough meshes only, one per frame
  if (slots > B.s.length) slots = B.s.length;
  B.n = 0;
  for (const c of cave.ch) {
    const dx = Math.max(c.x0 - E[0], 0, E[0] - c.x0 - CAVE_CH), dy = Math.max(c.y0 - E[1], 0, E[1] - c.y0 - CAVE_CH), dz = Math.max(c.z0 - E[2], 0, E[2] - c.z0 - CAVE_CH);
    c.d = Math.hypot(dx, dy, dz);
    if (!slots) continue;
    let sc, lod;
    if (live && vis && c.d < LOD0_R && !c.m[0] && !c.pend[0]) { sc = c.d - 1000; lod = 0; }   // close-up rock first
    else if (c.d < ROUGH_R && !c.m[1] && !c.pend[1]) { sc = c.d; lod = 1; }                    // then rough rock, nearest first
    else continue;
    let k = B.n; if (k === slots) { if (sc >= B.s[k - 1]) continue; k--; } else B.n++;
    while (k > 0 && B.s[k - 1] > sc) { B.s[k] = B.s[k - 1]; B.c[k] = B.c[k - 1]; B.l[k] = B.l[k - 1]; k--; }
    B.s[k] = sc; B.c[k] = c; B.l[k] = lod;
  }
  if (live) { let q = 0; for (const w of cave.workers) { if (w.dead) continue; while (w.busy < 2 && q < B.n) { const c = B.c[q], lod = B.l[q]; q++; c.pend[lod] = true; w.busy++; cave.jobs++; w.postMessage({ key: c.key, lod, i: c.i, j: c.j, k: c.k }); } } }
  else if (B.n) { const c = B.c[0], r = CV.meshChunk(c.i, c.j, c.k, 1); cave.jobs++; c.m[1] = r.tris ? caveGpu(r.buf, r.idx) : { count: 0, tris: 0 }; }
  for (let q = 0; q < B.n; q++) B.c[q] = null;
  if (frameNo % 30 === 0) for (const c of cave.ch) {
    if (c.m[0] && c.d > LOD0_R + 40) { caveFree(c.m[0]); c.m[0] = null; }
    if (c.m[1] && c.m[1].vao && c.d > ROUGH_FREE) { caveFree(c.m[1]); c.m[1] = null; }   // far behind you: give the memory back (it is rebuilt if you return)
  }
}""")
rep("function caveStream() {",
"""// v15: rough rock is drawn out to 330 m. It is built a little beyond that and let go of well beyond it, so the game
// no longer meshes and holds every cavern at once (that was about 40 s of background work and 107 MB at every start).
const ROUGH_R = 420, ROUGH_FREE = 560;
const caveBest = { s: new Float64Array(8), c: new Array(8).fill(null), l: new Int8Array(8), n: 0 };
function caveStream() {""")
rep("ch: [], byKey: new Map(), ready: [], workers: [], mode: 'workers', fixed: null,", "ch: [], byKey: new Map(), ready: [], workers: [], jobs: 0, bytes: 0, mode: 'workers', fixed: null,")
# keep count of the memory the cave rock holds (shown in Details, used by the tests)
rep("  gl.bindVertexArray(null); return { vao, vb, ib, count: idx.length, tris: idx.length / 3 };\n}\nfunction cavePrebuild(",
    "  gl.bindVertexArray(null); const bytes = buf.byteLength + idx.byteLength; cave.bytes += bytes; return { vao, vb, ib, count: idx.length, tris: idx.length / 3, bytes };\n}\nfunction cavePrebuild(")
rep("function caveFree(m) { if (m.vao) { gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.vb); gl.deleteBuffer(m.ib); } }",
    "function caveFree(m) { if (m.vao) { gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.vb); gl.deleteBuffer(m.ib); cave.bytes -= m.bytes || 0; } }")
rep("' of ' + cave.ch.length + ' rough pieces, ' + cave.mode + ')\\n' +", "' of ' + cave.ch.length + ' rough pieces, ' + (cave.bytes / 1048576).toFixed(0) + ' MB, ' + cave.mode + ')\\n' +")

# ---- 2. cave drawing: look at whether a piece has any rock before the (dearer) is-it-on-screen test
rep("""    if (CAVR.off.rock || c.d > 330 || !classify(P, c.x0, c.y0, c.z0, c.x0 + CAVE_CH, c.y0 + CAVE_CH, c.z0 + CAVE_CH, 0)) continue;
    const m = (c.d < LOD0_R && c.m[0]) || c.m[1] || c.m[0]; if (!m || !m.count) continue;""",
"""    if (CAVR.off.rock || c.d > 330) continue;
    const m = (c.d < LOD0_R && c.m[0]) || c.m[1] || c.m[0]; if (!m || !m.count || !classify(P, c.x0, c.y0, c.z0, c.x0 + CAVE_CH, c.y0 + CAVE_CH, c.z0 + CAVE_CH, 0)) continue;""")

# ---- 3. the surface's 2,304 tiles are not sorted out while nothing of the surface is drawn; tile records are reused
rep("""  vis.length = 0; hiCand.length = 0;
  for (let t = 0; t < NT; t++) {""",
"""  vis.length = 0; hiCand.length = 0;
  for (let t = 0; t < (cave.surface ? NT : 0); t++) {     // v15: deep underground none of the surface is drawn, so none of it is sorted out""")
rep("    const e = { t, d2, want: d < LD[0] ? 0 : d < LD[1] ? 1 : d < LD[2] ? 2 : d < LD[3] ? 3 : 4, sel: 0 };",
    "    const e = visPool[t] || (visPool[t] = { t, d2: 0, want: 0, sel: 0, counted: false }); e.d2 = d2; e.want = d < LD[0] ? 0 : d < LD[1] ? 1 : d < LD[2] ? 2 : d < LD[3] ? 3 : 4; e.sel = 0; e.counted = false;   // v15: reused, not made new every frame")
rep("let vis = [], hiCand = [];", "let vis = [], hiCand = []; const visPool = [];")

# ---- 4. the explorer's sun shadow is only drawn when something will look it up (near the ground, on the surface)
rep("  computePose(); charShadowPass();\n", "  computePose();\n  chK = cave.under ? 0 : 0.85 * Math.max(0, 1 - (state.py - terrainFloor(state.px, state.pz)) / 260);\n  if (chK > 0) charShadowPass();           // v15: skipped underground and high in the air, where nothing reads it\n")
rep("  chK = cave.under ? 0 : 0.85 * Math.max(0, 1 - (state.py - terrainFloor(state.px, state.pz)) / 260);\n  caveStream();", "  caveStream();")

# ---- 5. HUD: the page is only touched when a readout actually changes
rep("""  $('fuelBar').style.width = (100 * game.fuel / game.tank).toFixed(1) + '%'; $('fuelBar').className = game.fuel < game.tank * 0.2 ? 'low' : '';
  $('fuel').style.width = (game.tank * 1.5) + 'px';
  $('gstat').textContent = game.trial ? courses[game.trial.c].name + '  ' + fmtTime(game.t - game.trial.t0) : 'Dishes ' + game.online + '/7' + (game.carrying ? '  ·  carrying ' + game.carrying : '');
  const ob = objective(), mk = $('marker');
  const us = $('ustat'); us.hidden = !cave.under;
  if (cave.under) us.textContent = """,
"""  const HL = hudLast; let hv = (100 * game.fuel / game.tank).toFixed(1) + '%';      // v15: write to the page only when a readout changes
  if (hv !== HL.fw) { HL.fw = hv; $('fuelBar').style.width = hv; } hv = game.fuel < game.tank * 0.2 ? 'low' : ''; if (hv !== HL.fc) { HL.fc = hv; $('fuelBar').className = hv; }
  hv = (game.tank * 1.5) + 'px'; if (hv !== HL.tw) { HL.tw = hv; $('fuel').style.width = hv; }
  hv = game.trial ? courses[game.trial.c].name + '  ' + fmtTime(game.t - game.trial.t0) : 'Dishes ' + game.online + '/7' + (game.carrying ? '  ·  carrying ' + game.carrying : '');
  if (hv !== HL.gs) { HL.gs = hv; $('gstat').textContent = hv; }
  const ob = objective(), mk = $('marker');
  const us = $('ustat'); if (us.hidden !== !cave.under) us.hidden = !cave.under;
  if (cave.under) hv = """)
rep("""(SITER.inSiteP && !siteState().solved ? ' · Artifacts ' + siteState().r.filter(v => v > 0).length + '/5' : '');
  if (!ob || cave.under) { mk.hidden = true; return; }""",
"""(SITER.inSiteP && !siteState().solved ? ' · Artifacts ' + siteState().r.filter(v => v > 0).length + '/5' : '');
  if (cave.under && hv !== HL.us) { HL.us = hv; us.textContent = hv; }
  if (!ob || cave.under) { if (!mk.hidden) mk.hidden = true; return; }""")
rep("""  mk.hidden = false; mk.style.left = ((nx * 0.5 + 0.5) * 100).toFixed(2) + '%'; mk.style.top = ((0.5 - ny * 0.5) * 100).toFixed(2) + '%';
  $('markerTxt').textContent = ob.label + ' · ' + Math.round(Math.hypot(x - state.px, y - state.py, z - state.pz)) + ' m';""",
"""  if (mk.hidden) mk.hidden = false; hv = ((nx * 0.5 + 0.5) * 100).toFixed(2) + '%'; if (hv !== HL.ml) { HL.ml = hv; mk.style.left = hv; } hv = ((0.5 - ny * 0.5) * 100).toFixed(2) + '%'; if (hv !== HL.mtop) { HL.mtop = hv; mk.style.top = hv; }
  hv = ob.label + ' · ' + Math.round(Math.hypot(x - state.px, y - state.py, z - state.pz)) + ' m'; if (hv !== HL.mt) { HL.mt = hv; $('markerTxt').textContent = hv; }""")
rep("function gameHud() {", "const hudLast = { fw: '', fc: null, tw: '', gs: null, us: null, ml: '', mtop: '', mt: null, fog: '' };\nfunction gameHud() {")
rep("  const v = $('visor'); if (v) v.style.opacity = CAVR.fog.toFixed(3);", "  const vo = CAVR.fog.toFixed(3); if (vo !== hudLast.fog) { hudLast.fog = vo; const v = $('visor'); if (v) v.style.opacity = vo; }")

# ---- 6. once the array is listening, the marker points at the old mine until the deep door has been opened
rep("  return best ? { p: [best.x, best.y, best.z], label: 'power cell' } : null;\n}",
"""  if (best) return { p: [best.x, best.y, best.z], label: 'power cell' };
  if (game.online >= 7 && !(DOORS[0].open > 0)) return { p: [CV.SX, CV.TOP + 1.5, CV.SZ], label: 'old mine' };   // v15: the way on, until the deep door (D-7) has been opened
  return null;
}""")

# ---- 7. the game remembers where you were standing
rep("const game = { paused: true, fuel: 100,", "const game = { place: [0, 0, 0, 0, 0, 0, 0], placeOk: false, savedAt: 0, rAsk: -99, paused: true, fuel: 100,")
rep("best: game.best, done: game.done, cave: caveSave() })); } catch (err) { /* in-memory only */ } }",
    "best: game.best, done: game.done, place: game.placeOk ? game.place.map(v => Math.round(v * 1000) / 1000) : null, cave: caveSave() })); } catch (err) { /* in-memory only */ } }")
rep("game.best = s.best || {}; game.done = !!s.done; caveLoad(s.cave);",
    "game.best = s.best || {}; game.done = !!s.done; caveLoad(s.cave);\n  game.placeOk = Array.isArray(s.place) && s.place.length === 7 && s.place.every(v => typeof v === 'number' && isFinite(v)); if (game.placeOk) for (let i = 0; i < 7; i++) game.place[i] = s.place[i];")
rep("function newGame() { cells.forEach(c => { c.got = false; });", "function newGame() { game.placeOk = false; cells.forEach(c => { c.got = false; });")
rep("/* --- on-screen bits --- */",
"""// v15: put the explorer back where they last stood (saved with the game), if that spot still makes sense
function resumePlace() {
  const P = game.place; if (!game.placeOk) return false;
  const x = P[0], y = P[1], z = P[2];
  if (!(x > 2 && x < WORLD - 2 && z > 2 && z < WORLD - 2 && y > -1000 && y < 1800)) return false;
  if (caveUnder(x, z, y)) { const f = CV.floorAt(x, y + 0.4, z, true); if (!(f > -1e8 && f < 1e8) || CV.sdf(x, y + 1.25, z) > 0) return false; }   // never wake up inside rock or over nothing
  state.px = x; state.py = y; state.pz = z; state.yaw = P[3]; state.pitch = Math.max(-0.35, Math.min(1.52, P[4])); state.dist = Math.max(1.3, Math.min(1800, P[5])); state.heading = P[6];
  state.vx = state.vy = state.vz = 0; state.grounded = true; state.hover = false;
  return true;
}
/* --- on-screen bits --- */""")
rep("""    if (cave.under) { geoPush(); sitePush(); cave.ceil = CV.ceilAt(state.px, state.py, state.pz); }
    caveUpdate(dt);""",
"""    if (cave.under) { geoPush(); sitePush(); cave.ceil = CV.ceilAt(state.px, state.py, state.pz); }
    if (play && state.grounded && !swim) { const P = game.place; P[0] = state.px; P[1] = state.py; P[2] = state.pz; P[3] = state.yaw; P[4] = state.pitch; P[5] = state.dist; P[6] = state.heading; game.placeOk = true; }   // v15: the last place you stood, kept with the save
    caveUpdate(dt);""")
rep("  if (cave.under && state.time - (cave.savedAt || 0) > 5) { cave.savedAt = state.time; saveGame(); }   // keep the laid line safe",
    "  if (state.play && state.time - (cave.savedAt || 0) > (cave.under ? 5 : 10)) { cave.savedAt = state.time; saveGame(); }   // keep the laid line safe (v15: and, on the surface too, where you are)")
rep("""function startPlay(fresh, free) {
  free = free === undefined ? !!game.free : !!free;""",
"""function startPlay(fresh, free) {
  finishInit(); const wasBench = game.inMode === 'bench';
  free = free === undefined ? !!game.free : !!free;""")
rep("""'The array is dark. Find 7 power cells — follow the blue light beams.', 9); resetView(); }
  showMenu(false);""",
"""'The array is dark. Find 7 power cells — follow the blue light beams.', 9); resetView(); if (!fresh && resumePlace() && Math.hypot(state.px - BENCH.x, state.pz - BENCH.z) > 30) toast('Picking up where you left off.', 4); }
  else if (wasBench) resumePlace();
  showMenu(false);""")
rep("function startBench() { state.play = false;", "function startBench() { finishInit(); if (game.loaded && game.inMode === 'play') saveGame(); state.play = false;")
# careful: the menu's Benchmark button sets inMode before calling startBench
rep("$('mBench').onclick = () => { game.inMode = 'bench'; startBench(); };", "$('mBench').onclick = () => { if (game.loaded && game.inMode === 'play') saveGame(); game.inMode = 'bench'; startBench(); };")
# R deep underground asks first
rep("  if (e.code === 'KeyR') resetView(); else if (e.code === 'KeyT')",
    "  if (e.code === 'KeyR') { if (state.play && cave.under && state.time - game.rAsk > 4) { game.rAsk = state.time; toast('Press R again to go back up to the lookout.', 4); } else { game.rAsk = -99; resetView(); } } else if (e.code === 'KeyT')")
# leaving the tab or the app: save, and stop the sound until you are back
rep("canvas.addEventListener('webglcontextlost',",
"""document.addEventListener('visibilitychange', () => {      // v15
  if (document.hidden) { if (state.play && game.loaded && game.inMode === 'play') saveGame(); if (snd.ctx && snd.ctx.state === 'running') snd.ctx.suspend(); }
  else if (snd.ctx && snd.ctx.state === 'suspended') snd.ctx.resume();
});
addEventListener('pagehide', () => { if (state.play && game.loaded && game.inMode === 'play') saveGame(); });
canvas.addEventListener('webglcontextlost',""")

# ---- 8. loading: the bar keeps moving, and the caverns' furnishings are laid out behind the menu instead of before it
rep("""    $('loadBar').style.width = (row / GRID * 100) + '%';
    if (row < GRID) { setTimeout(chunk, 0); return; }
    setLight(bakeLight(hg, W, H, CX * LODS[BASE], CZ * LODS[BASE], SUN, WORLD, false), W, H, CX * LODS[BASE], CZ * LODS[BASE], 'coarse');
    buildBlocks(baseData); buildProps(); buildCharacter(); buildGame(); placeAssets(); caveInit(); cavernInit(); geoInit(); siteInit(); doorInit(); dripInit(); lakeInit(); buildPlants(); if (!params.has('coarselight')) startFineLight();
    world = worldTotals();""",
"""    $('loadBar').style.width = (row / GRID * 45) + '%';
    if (row < GRID) { setTimeout(chunk, 0); return; }
    // v15: the rest of the set-up runs a step at a time so the bar keeps moving. The caverns' furnishings (crystals, dripstone,
    // the lake, the giant cavern, the ancient site, the doors) wait behind the menu unless the game starts straight into play.
    const direct = params.has('play') || params.has('bench') || params.has('mode') || params.has('at');
    const steps = [() => { setLight(bakeLight(hg, W, H, CX * LODS[BASE], CZ * LODS[BASE], SUN, WORLD, false), W, H, CX * LODS[BASE], CZ * LODS[BASE], 'coarse'); buildBlocks(baseData); buildProps(); }, buildCharacter, () => { buildGame(); placeAssets(); }, caveInit];
    if (direct) while (lateInit.length) steps.push(lateInit.shift());
    steps.push(buildPlants);
    const nSteps = steps.length; if (steps.length) { const next = () => { steps.shift()(); $('loadBar').style.width = (45 + 55 * (nSteps - steps.length) / nSteps) + '%'; setTimeout(steps.length ? next : ready, 0); }; setTimeout(next, 0); }
    return;
  })();
  function ready() {
    if (!params.has('coarselight')) startFineLight();
    world = worldTotals();""")
rep("""    setTimeout(() => $('hint').classList.add('fade'), 9000);
    last = performance.now(); requestAnimationFrame(loop);
  })();
}""",
"""    setTimeout(() => $('hint').classList.add('fade'), 9000);
    last = performance.now(); requestAnimationFrame(loop);
    if (lateInit.length) { const idle = () => { if (!lateInit.length) return; lateInit.shift()(); if (lateInit.length) requestAnimationFrame(() => setTimeout(idle, 30)); }; setTimeout(idle, 150); }   // behind the menu, one piece between frames
  }
}""")
rep("function start() {\n", "// v15: set-up that is only needed once you go underground. It is finished behind the menu, or at once if you start before it is done.\nconst lateInit = [() => cavernInit(), () => geoInit(), () => siteInit(), () => doorInit(), () => dripInit(), () => lakeInit()];\nfunction finishInit() { while (lateInit.length) lateInit.shift()(); }\nfunction start() {\n")
rep("window.__bench = { DOOR, DOORS,", "window.__bench = { version: 'v15', lateInit, finishInit, resumePlace, saveGame, loadGame, objective, ROUGH_R, ROUGH_FREE, DOOR, DOORS,")
# ---- 9. the controls hint is taken off the page once it has faded (it was left there, invisible, with its blur)
rep("    setTimeout(() => $('hint').classList.add('fade'), 9000);", "    setTimeout(() => { $('hint').classList.add('fade'); setTimeout(() => { $('hint').hidden = true; }, 1700); }, 9000);")
# ---- 10. Benchmark mode: walking into the mine before any game had been started froze the game (the list of couplings did not exist yet)
rep("  batt: 100, spares: 0, dead: false, darkWalk: 0, passing: false, picked: [false, false, false, false],", "  batt: 100, spares: 0, dead: false, darkWalk: 0, passing: false, picked: [false, false, false, false], parts: [],")
open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
