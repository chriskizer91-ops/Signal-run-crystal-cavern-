# v8: the cavern moves under the first room, a sealed door leads to it, and the game gets Campaign / Free play modes.
import sys
P = '/home/claude/src/signal-run-v2.html'
s = open(P).read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:90])
    s = s.replace(a, b)

# 1. CaveLib: copy the tool version in
lib = open('/home/claude/tools/cavelib.js').read().replace("if (typeof module !== 'undefined') module.exports = CaveLib;", '').rstrip() + '\n'
a = s.index('function CaveLib(cfg) {'); b = s.index('\n}\n', a) + 3
s = s[:a] + lib + s[b:]

# 2. the caves now reach further west and north (the cavern sits under the first room)
rep("const CAVE_AREA = [CV.SX - 60, CV.SZ - 200, CV.SX + 450, CV.SZ + 320];", "const CAVE_AREA = [CV.SX - 200, CV.SZ - 220, CV.SX + 450, CV.SZ + 320];")

# 3. teleports: 'door' (in front of the sealed door), 'cavern' relative to the cavern's height
rep("  else if (where === 'crystal') { state.px = CV.CAV.drop[0] - 7.5; state.pz = CV.CAV.drop[1]; state.py = CV.floorAt(state.px, -128, state.pz); state.yaw = -Math.PI / 2; state.heading = Math.PI / 2; state.pitch = 0.45; }",
    "  else if (where === 'door' || where === 'crystal') { state.px = DOOR.x + 0.6; state.pz = DOOR.z - 4.2; state.py = CV.floorAt(state.px, -55, state.pz); state.yaw = Math.PI; state.heading = 0; state.pitch = 0.18; }")
rep("state.py = CV.floorAt(state.px, -228, state.pz); state.yaw = 0.07;", "state.py = CV.floorAt(state.px, CV.CAV.y + 22, state.pz); state.yaw = 0.07;")
rep("else if (at === 'crystal' || at === 'cavern') caveTeleport(at); }", "else if (at === 'crystal' || at === 'door' || at === 'cavern') caveTeleport(at); }")

# 4. the door: state, rules, blocking, drawing
rep("function caveStep(nx, nz, f) {\n", """/* ---------- the sealed door in the station's south wall ---------- */
// Campaign: dead and locked until all seven dishes are online (the restored array sends power down the old cable).
// Free play: unlocked from the start. Either way it slides open when you walk up to it, and stays open.
const DOOR = { x: CV.DOOR.x, z: CV.DOOR.z, y: CV.DOOR.floor, open: 0, moving: false, told: -99, lamp: [CV.DOOR.x + 2.3, CV.DOOR.floor + 1.5, CV.DOOR.z - 0.6], parts: null, props: [] };
DOOR.y = Math.max(...[CV.floorAt(DOOR.x, -55, DOOR.z - 1.2), CV.floorAt(DOOR.x, -55, DOOR.z + 1.2)].filter(v => v > -70 && v < -40), -56.2);
function doorUnlocked() { return game.free || game.online >= 7; }
function doorBlocks(x, z, py) { return DOOR.open < 0.72 && Math.abs(x - DOOR.x) < 3 && z > DOOR.z - 0.7 && z < DOOR.z + 18 && py > DOOR.y - 3 && py < DOOR.y + 5; }
function doorUpdate(dt) {
  const d = Math.hypot(state.px - DOOR.x, state.pz - (DOOR.z - 2)), near = cave.under && d < 6.5 && Math.abs(state.py - DOOR.y) < 4;
  if (DOOR.open < 1 && doorUnlocked() && near && !DOOR.moving) { DOOR.moving = true; toast(game.free ? 'The deep door grinds open.' : 'The deep door has power again. It grinds open.', 5); thud(0.5, 120); tone([110, 147, 165], 1.4, 'sawtooth', 0.05, 0.25); }
  if (DOOR.moving) { DOOR.open = Math.min(1, DOOR.open + dt / 3.6); if (DOOR.open >= 1) { DOOR.moving = false; thud(0.6, 90); } }
  if (!doorUnlocked() && near && d < 4.5 && state.time - DOOR.told > 25) { DOOR.told = state.time; toast('A sealed door. Its panel is dead. A cable runs from it back up the shaft, toward the surface.', 7); tone([196, 185], 0.6, 'sine', 0.1, 0.3); }
}
function doorInit() {
  const mk = name => { const a = assetItem('deepdoor', name); return a ? { hi: a.hi, lo: a.lo, it: a.it } : null; };
  const fr = mk('deep_door_frame'), lr = mk('deep_door_leaf_r'), ll = mk('deep_door_leaf_l');
  if (fr && lr && ll) { DOOR.parts = { fr, lr, ll }; const at = fr.it.attach && fr.it.attach[0]; if (at) DOOR.lamp = [DOOR.x + at[0], DOOR.y + at[1], DOOR.z + at[2]]; }
  else {                                   // fallback if the door module is missing: plain slabs
    const box = (x0, x1, y0, y1, z0, z1, c) => { const b = new MB(); b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, c); const g = b.finish(); return { hi: g, lo: g }; };
    const F = new MB(), C = [0.28, 0.28, 0.27, 0.12];
    F.box(-2.35, 2.65, -0.05, 1.7, 5.5, 1.1, C); F.box(2.35, 2.65, -0.05, 1.7, 5.5, 1.1, C); F.box(0, 4.3, -0.05, 3.0, 2.2, 1.1, C);
    const g = F.finish(); DOOR.parts = { fr: { hi: g, lo: g }, lr: box(0, 1.52, 0, 3.2, -0.15, 0.15, [0.33, 0.31, 0.27, 0.1]), ll: box(-1.52, 0, 0, 3.2, -0.15, 0.15, [0.33, 0.31, 0.27, 0.1]) };
  }
  // the research team's leftovers in the station: a work bench and their crates
  for (const [name, dx, dz, rot] of [['field_lab', -4.6, -3.0, Math.PI / 2], ['crate_stack', 4.9, 3.7, Math.PI]]) {
    const a = assetItem('survey', name); if (!a) continue; const x = CV.SX + dx, z = CV.SZ + dz, y = CV.floorAt(x, -55, z); if (!(y > -1e8 && y < 1e8)) continue;
    DOOR.props.push({ hi: a.hi, lo: a.lo, m: new Float32Array(K.mulAll(K.tr(x, y, z), K.rotY(rot))) });
  }
}
function drawDoor() {
  if (!DOOR.parts) return; const E = cam.eye, d = Math.hypot(DOOR.x - E[0], DOOR.y - E[1], DOOR.z - E[2]); if (d > 140) return;
  setCommon(pProp); gl.uniform4f(pProp.u.uUG, 1, cave.flash, cave.pday, cave.expo); gl.uniform1f(pProp.u.uChar, 0);
  const lod = m => d < 45 ? m.hi : m.lo, slide = DOOR.open * 1.6, P = DOOR.parts;
  for (const [m, dx] of [[P.fr, 0], [P.lr, slide], [P.ll, -slide]]) { gl.uniformMatrix4fv(pProp.u.uM, false, new Float32Array(tr(DOOR.x + dx, DOOR.y, DOOR.z))); const g = lod(m); gl.bindVertexArray(g.vao); stats.cave += drawElems(g.count, gl.UNSIGNED_INT, 0); }
  for (const p of DOOR.props) { gl.uniformMatrix4fv(pProp.u.uM, false, p.m); const g = lod(p); gl.bindVertexArray(g.vao); stats.cave += drawElems(g.count, gl.UNSIGNED_INT, 0); }
  gl.uniform4f(pProp.u.uUG, 0, cave.flash, cave.pday, cave.expo);
}
function drawDoorLamp() {
  const E = cam.eye; if (Math.hypot(DOOR.x - E[0], DOOR.y - E[1], DOOR.z - E[2]) > 140) return;
  const L = DOOR.lamp, on = doorUnlocked(), k = on ? 1.3 : 0.55 + 0.45 * Math.max(0, Math.sin(state.time * 1.7));
  glowDraw(crystal, mulAll(tr(L[0], L[1], L[2]), sc(0.07, 0.07, 0.07)), on ? 0.25 : 1.0, on ? 1.0 : 0.12, on ? 0.45 : 0.08, k, 0);
}
function caveStep(nx, nz, f) {
  if (cave.under && doorBlocks(nx, nz, state.py) && !doorBlocks(state.px, state.pz, state.py)) return 1e9;   // a closed door: but never trap someone already behind it
""")
# camera: never behind a closed door
rep("""    if (kk < t) { eye[0] = tgt[0] + ux * kk; eye[1] = tgt[1] + uy * kk; eye[2] = tgt[2] + uz * kk; }
  }
}""", """    if (kk < t) { eye[0] = tgt[0] + ux * kk; eye[1] = tgt[1] + uy * kk; eye[2] = tgt[2] + uz * kk; }
  }
  const pz = DOOR.z - 0.55;                    // closed door: keep the camera on the side the player is on
  if (DOOR.open < 0.72 && Math.abs(eye[0] - DOOR.x) < 3.4 && eye[1] < DOOR.y + 5.5 && eye[1] > DOOR.y - 3 && (eye[2] > pz) !== (tgt[2] > pz) && Math.abs(uz) > 1e-4) {
    const kk = Math.max(0.2, (pz - tgt[2]) / uz - 0.25 * Math.sign(uz)); if (kk > 0) { eye[0] = tgt[0] + ux * kk; eye[1] = tgt[1] + uy * kk; eye[2] = tgt[2] + uz * kk; }
  }
}""")
rep("function caveUpdate(dt) {\n  const px = state.px, py = state.py, pz = state.pz;\n", "function caveUpdate(dt) {\n  const px = state.px, py = state.py, pz = state.pz;\n  doorUpdate(dt);\n")
rep("  if (cave.fixed) { gl.bindVertexArray(cave.fixed.vao); stats.cave += drawElems(cave.fixed.count, gl.UNSIGNED_INT, 0); }\n  drawCavern();",
    "  if (cave.fixed) { gl.bindVertexArray(cave.fixed.vao); stats.cave += drawElems(cave.fixed.count, gl.UNSIGNED_INT, 0); }\n  drawDoor();\n  drawCavern();")
rep("  gl.useProgram(pGlow.p); gl.uniformMatrix4fv(pGlow.u.uVP, false, cam.vp32);\n  const t = state.time;\n  PICKS.forEach",
    "  gl.useProgram(pGlow.p); gl.uniformMatrix4fv(pGlow.u.uVP, false, cam.vp32);\n  const t = state.time;\n  drawDoorLamp();\n  PICKS.forEach")
rep(" caveInit(); cavernInit();", " caveInit(); cavernInit(); doorInit();")

# 5. draw-distance rules: from Level 1 skip the cavern's depths; deep in the cavern skip Level 1 (except up the drop)
rep("""  const P = cam.planes;
  for (const c of cave.ch) {
    if (CAVR.off.rock || c.d > 330 ||""", """  const P = cam.planes, E = cam.eye, ck = CV.cavK(E[0], E[1], E[2]), DR = CV.CAV.drop;
  for (const c of cave.ch) {
    if (ck > 1.5 ? c.y0 + CAVE_CH < -136 : ck < 1.0 && c.y0 > -110 && Math.hypot(c.x0 + 12 - DR[0], c.z0 + 12 - DR[1]) > 30) continue;
    if (CAVR.off.rock || c.d > 330 ||""")

# 6. modes: Campaign and Free play, each with its own save
rep("const SAVE_KEY = 'canyon-signal-run-v1';", "const SAVE_KEYS = { campaign: 'canyon-signal-run-v1', free: 'canyon-signal-run-free-v1' };   // campaign keeps the old key, so old saves carry on\nconst saveKey = () => game.free ? SAVE_KEYS.free : SAVE_KEYS.campaign;")
rep("function saveGame() { try { localStorage.setItem(SAVE_KEY,", "function saveGame() { try { localStorage.setItem(saveKey(),")
rep("  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); }", "  let s = null; try { s = JSON.parse(localStorage.getItem(saveKey()) || 'null'); }")
rep("function newGame() { cells.forEach(c => { c.got = false; }); dishes.forEach(d => { d.on = false; d.k = 0; d.m = false; }); game.online = 0; game.carrying = 0; game.done = false; game.trial = null; caveReset(); applyUpgrades(true);",
    "function newGame() { cells.forEach(c => { c.got = false; }); dishes.forEach(d => { d.on = false; d.k = 0; d.m = false; }); game.online = 0; game.carrying = 0; game.done = false; game.trial = null; caveReset(); if (game.free) cave.spares = 3; applyUpgrades(true);")
rep("  const n = game.online; game.tank =", "  const n = game.free ? 7 : game.online; game.tank =")
rep("    else { const up = game.online === 2 ?", "    else { const up = game.free ? '' : game.online === 2 ?")
rep("toast('All seven dishes are online. The array is listening again!', 12);",
    "toast(game.free ? 'All seven dishes are online. The array is listening again!' : 'All seven dishes are online. The array is listening again. Far below, in the old mine, a dead door has power.', 12);")
rep("""function startPlay(fresh) {
  state.play = true; document.body.classList.add('play'); audioInit(); setMode(0);
  if (fresh || !game.loaded) {""", """function startPlay(fresh, free) {
  free = free === undefined ? !!game.free : !!free;
  if (free !== !!game.free) { if (game.loaded && game.inMode === 'play') saveGame(); game.free = free; game.loaded = false; DOOR.open = 0; DOOR.moving = false; }
  game.inMode = 'play'; state.play = true; document.body.classList.add('play'); audioInit(); setMode(0);
  if (fresh || !game.loaded) {""")
rep("if (game.online === 0 && !game.carrying && cells.every(c => !c.got)) toast('The array is dark. Find 7 power cells — follow the blue light beams.', 9); }",
    "if (game.online === 0 && !game.carrying && cells.every(c => !c.got)) toast(game.free ? 'Free play: everything is unlocked, including the deep door in the old mine.' : 'The array is dark. Find 7 power cells — follow the blue light beams.', 9); resetView(); }")
rep("""function showMenu(on) { game.paused = on; $('menu').hidden = !on; if (on) { $('mContinue').hidden = !game.inMode; $('mPlay').hidden = game.inMode === 'play'; """,
    """function showMenu(on) { game.paused = on; $('menu').hidden = !on; if (on) { const inPlay = game.inMode === 'play'; $('mContinue').hidden = !game.inMode; $('mContinue').textContent = inPlay ? (game.free ? 'Continue free play' : 'Continue campaign') : 'Continue'; $('mPlay').hidden = inPlay && !game.free; $('mFree').hidden = inPlay && !!game.free; """)
rep("""<div class="mrow"><button id="mContinue" hidden>Continue</button><button id="mPlay" class="big">Play</button><button id="mNew">New game</button><button id="mBench">Benchmark</button></div>""",
    """<div class="mrow"><button id="mContinue" hidden>Continue</button><button id="mPlay" class="big">Campaign</button><button id="mFree" class="big">Free play</button><button id="mNew">New campaign</button><button id="mBench">Benchmark</button></div>
  <p class="modes"><b>Campaign:</b> power all 7 dishes to open the deep door. <b>Free play:</b> everything unlocked.</p>""")
rep("$('mPlay').onclick = () => { game.inMode = 'play'; startPlay(false); }; $('mNew').onclick = () => { game.inMode = 'play'; startPlay(true); };",
    "$('mPlay').onclick = () => startPlay(false, false); $('mFree').onclick = () => startPlay(false, true); $('mNew').onclick = () => startPlay(true, false);")
rep("if (params.has('play')) { game.inMode = 'play'; startPlay(params.get('play') === 'new'); }",
    "if (params.has('play')) { const pv = params.get('play'); game.free = pv === 'free' || pv === 'freenew'; startPlay(pv === 'new' || pv === 'freenew', game.free); }")
# keep the door state in the save (so it stays open once opened)
rep("function caveSave() { return { batt:", "function caveSave() { return { door: DOOR.open >= 1 ? 1 : 0, batt:")
rep("  caveReset(); if (!c) return;\n", "  caveReset(); if (!c) return;\n  DOOR.open = c.door ? 1 : 0;\n")
rep("function caveReset() { cave.batt = 100;", "function caveReset() { DOOR.open = 0; DOOR.moving = false; cave.batt = 100;")
rep('window.__bench = { state, stats, cam,', 'window.__bench = { DOOR, state, stats, cam,')
open(P, 'w').write(s)
print('patched', len(s))
