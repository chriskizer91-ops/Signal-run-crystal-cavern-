/* ---------- the ancient site: black stone halls, five artifacts, the answer to the signal, and the hologram ---------- */
const SITEC = CV.SITE, SF = SITEC.floor, SITE_C = [SITEC.chamber[0], SF, SITEC.chamber[1]], SITE_SH = SITEC.bore[1];
const SITE_NOTES = [261.6, 293.7, 329.6, 392, 440];                       // each socket hums one note (C D E G A)
const SITE_SEQ = [0, 2, 4, 1, 3];                                        // the answer: walking it traces a five-pointed star
const SITE_ANG = k => Math.PI + 0.6283 + k * 1.2566;                     // sockets and plates sit round the dais, none in front of the doorway
const RELICS = [   // [model, name, where it rests, scan text (draft: Christopher may rewrite any of it)]
  ['relic_lens', 'the lens', 'vest', 'A disc of black stone, harder than anything in the suit\'s tables. Dating: about 4 million years. It is warm. It should not be warm.'],
  ['relic_key', 'the rod', 0, 'A six-sided rod. Its channels spiral at exactly the rhythm of the signal\'s pulse: the suit counts the turns, and they match the array\'s carrier beat for beat.'],
  ['relic_tablet', 'the tablet', 1, 'Rows of glyphs. The suit AI finds 212 different symbols, and no row repeats. Its best guess: not writing. A map, or a count.'],
  ['relic_sphere', 'the sphere', 2, 'Nested shells, each turning very slowly against the next. No motor, and no power source the suit can find. It has been turning for four million years.'],
  ['relic_seed', 'the seed', 3, 'A spiral, grown rather than carved: the same spiral the giant crystals grow in. Did they carve the crystals, or grow them?'],
];
const SITE_MSG = [   // the hologram's message as the suit AI hears it: [seconds after it appears, text, seconds shown] (draft text)
  [2.5, 'SUIT AI: Unknown language. Listening…', 5],
  [8.5, 'SUIT AI · translation 2%: "…long ago… we [listened]… [far]…"', 6],
  [15.5, 'SUIT AI · translation 5%: "…the signal… [was ours]… you [answered]…"', 6],
  [22.5, 'SUIT AI: It is showing a star chart. Matching it against the survey catalogue…', 6],
  [29, 'SUIT AI: 97% match. It is speaking about one star system: catalogue K-2271, 418 light years from here.', 8],
  [38, 'SUIT AI: Translation stalls at 7%. It keeps returning to the same star.', 7],
];
const SITER = { props: [], relics: [], sockets: [], plates: [], cols: [], dais: null, ring: null, card: -1, phase: 'idle', pt: 0, step: 0, lit: [0, 0, 0, 0, 0], flash: [0, 0, 0, 0, 0],
  power: 0.35, holo: 0, msgT: -1, said: 0, chart: 0, big: 0, hl: 0, inSite: false, seen: false, near: -1, ent: null, entYaw: 0, emit: null, stars: null, nStars: 0, motes: null, nMotes: 0, lx: 0, lz: 0, sp: 0, onPrev: -2, inSiteP: false };
function siteState() { if (!cave.site) cave.site = { r: [0, 0, 0, 0, 0], solved: 0, seen: 0 }; return cave.site; }   // r: 0 at rest, 1 carried, 2+k set in socket k
function siteInit() {
  const M = (x, y, z, yaw, s) => new Float32Array(mulAll(tr(x, y, z), rotY(yaw || 0), sc(s || 1, s || 1, s || 1)));
  const put = (item, x, y, z, yaw, opt) => { const a = assetItem('ancient', item); if (!a) return null; const cs = Math.cos(yaw || 0), sn = Math.sin(yaw || 0);
    const p = Object.assign({ item, mesh: a, p: [x, y, z], yaw: yaw || 0, m: M(x, y, z, yaw), r: a.r || 3, glow: 1, at: (a.it.attach || []).map(q => [x + q[0] * cs + q[2] * sn, y + q[1], z - q[0] * sn + q[2] * cs]) }, opt || {});
    SITER.props.push(p);
    for (const c of a.it.colliders || []) { const wx = x + c.x * cs + c.z * sn, wz = z - c.x * sn + c.z * cs, top = y + c.top;   // the same shapes the surface uses
      if (c.type === 'cyl') SITER.cols.push({ top, solid: !!c.solid, h: (px, pz) => (px - wx) ** 2 + (pz - wz) ** 2 <= c.r * c.r });
      else { const an = (yaw || 0) + (c.rot || 0), ca = Math.cos(an), sa = Math.sin(an); SITER.cols.push({ top, solid: !!c.solid, h: (px, pz) => { const dx = px - wx, dz = pz - wz; return Math.abs(dx * ca - dz * sa) <= c.hx && Math.abs(dx * sa + dz * ca) <= c.hz; } }); } }
    return p; };
  const H = SITEC.hall, C = SITE_C;
  // the portal on the giant cavern's east terrace, seen from the balcony across the whole cavern
  const B0 = SITEC.bore[0]; SITER.ring = put('portal_ring', B0[0] + 6, B0[1], B0[2], Math.PI / 2, { glow: 1.4, far: 400 });
  // the hall of monoliths: six pairs, broad faces to the middle
  for (let i = 0; i < 6; i++) { const x = H[0] - 30 + i * 12; for (const s of [-1, 1]) put('monolith', x, SF, H[1] + s * 7.6, 0); }
  // the five artifacts on their pedestals: one in the round room under the shaft, one in each side room
  RELICS.forEach((R, i) => { let x, z, fx, fz; if (R[2] === 'vest') { x = SITEC.vest[0]; z = SITEC.vest[1] + 4.2; fx = SITEC.vest[0]; fz = SITEC.vest[1]; } else { const rm = SITEC.rooms[R[2]]; x = rm[0]; z = rm[1] + (rm[1] > H[1] ? 2.6 : -2.6); fx = rm[0]; fz = H[1]; }
    const ped = put('socket_pillar', x, SF, z, Math.atan2(fx - x, fz - z)); const seat = ped && ped.at[0] ? ped.at[0] : [x, SF + 1.1, z];
    SITER.relics.push({ i, item: R[0], name: R[1], text: R[3], home: seat, ped, mesh: assetItem('ancient', R[0]) }); });
  // the final chamber: the dais, five sockets, five floor plates
  SITER.dais = put('dais', C[0], SF, C[2], 0);
  for (let k = 0; k < 5; k++) { const a = SITE_ANG(k), sx = C[0] + Math.cos(a) * 15, sz = C[2] + Math.sin(a) * 15, px = C[0] + Math.cos(a) * 9, pz = C[2] + Math.sin(a) * 9, face = Math.atan2(C[0] - sx, C[2] - sz);
    const s = put('socket_pillar', sx, SF, sz, face); SITER.sockets.push({ k, p: [sx, SF, sz], seat: s && s.at[0] ? s.at[0] : [sx, SF + 1.1, sz], prop: s });
    const pl = put('floor_plate', px, SF + 0.005, pz, face, { plate: k }); SITER.plates.push({ k, p: [px, SF, pz], prop: pl }); }
  // the star chart: a few hundred stars in a ball, a band of the galaxy through it, and one star that matters
  { const r = cavRnd(4271), P = []; for (let i = 0; i < 700; i++) { let x, y, z; do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; } while (x * x + y * y + z * z > 1); if (i % 3 === 0) y *= 0.15; P.push(x, y, z, r() * 0.98); }
    const S = [0.52, 0.18, -0.34]; P.push(...S, 1);                                                       // the star the entity keeps pointing to
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; P.push(S[0] + Math.cos(a) * 0.08, S[1] + Math.sin(a) * 0.08, S[2], 2); }   // a ring round it
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); gl.bindVertexArray(null); SITER.stars = vao; SITER.nStars = P.length / 4; }
  // light rising from the dais while the hologram is on
  { const r = cavRnd(777), P = []; for (let i = 0; i < 260; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * 1.6; P.push(Math.cos(a) * d, r(), Math.sin(a) * d, r()); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); gl.bindVertexArray(null); SITER.motes = vao; SITER.nMotes = P.length / 4; }
  SITER.ent = assetItem('ancient', 'entity');
  SITER.emit = SITER.dais && SITER.dais.at[0] ? SITER.dais.at[0] : [C[0], SF + 1.2, C[2]];
}
const siteIn = (x, y, z) => x > SITEC.vest[0] - 9 && y < SF + 40 && Math.abs(z - SITEC.hall[1]) < 40;
function siteFloorY(x, z, py) { let top = -1e9; if (!SITER.inSiteP) return top; for (const c of SITER.cols) if ((c.solid ? py >= c.top - 0.3 : c.top <= py + 1.3) && c.top > top && c.h(x, z)) top = c.top; return top; }   // dais steps you climb; pillars only if you land on top
function sitePush() {                        // pillars and monoliths stop you; the dais's steps you climb
  if (!SITER.inSiteP) { SITER.lx = state.px; SITER.lz = state.pz; return; }
  for (const c of SITER.cols) if ((c.solid ? state.py < c.top - 0.3 : c.top > state.py + 1.3) && c.h(state.px, state.pz)) { state.px = SITER.lx; state.pz = SITER.lz; state.vx = state.vz = 0; return; }
  SITER.lx = state.px; SITER.lz = state.pz;
}
function siteCard(i) {                       // the scan card for artifact i (reuses the dive log's card)
  const R = SITER.relics[i]; SITER.card = i; LAKER.read = -1;
  $('logTitle').textContent = 'SCAN · ' + R.name[0].toUpperCase() + R.name.slice(1); $('logText').textContent = R.text; $('logPage').textContent = 'Artifact ' + (i + 1) + ' of 5';
  $('logPrev').style.display = $('logNext').style.display = 'none'; $('logCard').hidden = false; $('siteBtn').hidden = true; game.paused = true; tone([523, 784], 0.25, 'sine', 0.06);
}
function siteTake() {                        // closing the scan: the artifact goes into your pack
  const i = SITER.card; SITER.card = -1; $('logPrev').style.display = $('logNext').style.display = '';
  const st = siteState(); if (i >= 0 && st.r[i] === 0) { st.r[i] = 1; const n = st.r.filter(v => v > 0).length; toast('You take ' + SITER.relics[i].name + '. Artifacts found: ' + n + ' of 5.' + (n === 1 ? ' Something in the far chamber must fit it.' : ''), 5); saveGame(); }
}
function siteAct() { if (SITER.near >= 0) siteCard(SITER.near); }
function siteSay(t, d) { toast(t, d); (SITER.log = SITER.log || []).push(t); }
function siteUpdate(dt) {
  const st = siteState(), P = [state.px, state.py, state.pz], E = cam.eye, t = state.time;
  SITER.inSite = siteIn(E[0], E[1], E[2]); SITER.inSiteP = cave.under && siteIn(P[0], P[1], P[2]);
  // first steps into the site
  if (SITER.inSiteP && !st.seen && P[1] < SF + 3) { st.seen = 1; toast('The shaft opens into a room of black stone, cut perfectly smooth. Faint lines of light run away into the dark.', 8); tone([98, 147, 196], 3.5, 'sine', 0.06, 0.6); saveGame(); }
  // artifacts: walk up to one to scan it
  let near = -1; if (SITER.inSiteP) for (const R of SITER.relics) if (st.r[R.i] === 0 && Math.hypot(R.home[0] - P[0], R.home[2] - P[2]) < 2.3 && Math.abs(R.home[1] - P[1] - 1) < 2) near = R.i;
  SITER.near = near; const b = $('siteBtn'); if (b) { b.hidden = near < 0 || SITER.card >= 0 || !$('logCard').hidden; if (near >= 0) b.textContent = 'Scan the artifact'; }
  // sockets: carry an artifact to an empty one and it settles in
  if (SITER.inSiteP && !st.solved) for (const S of SITER.sockets) {
    if (st.r.some(v => v === 2 + S.k) || Math.hypot(S.p[0] - P[0], S.p[2] - P[2]) > 2.4) continue;
    const i = st.r.indexOf(1); if (i < 0) break;
    st.r[i] = 2 + S.k; tone([SITE_NOTES[S.k], SITE_NOTES[S.k] * 2], 1.6, 'sine', 0.07, 0.05); SITER.flash[S.k] = 1;
    const placed = st.r.filter(v => v >= 2).length; toast(SITER.relics[i].name[0].toUpperCase() + SITER.relics[i].name.slice(1) + ' settles into the socket and hums one note. (' + placed + ' of 5)', 5);
    if (placed === 5) { SITER.phase = 'wake'; SITER.pt = t; toast('All five notes sound together. Then the chamber plays them back to you in a pattern. It is waiting for an answer.', 9); }
    saveGame(); break;
  }
  // the answer: the chamber plays the pattern on the plates; you walk it
  const all = st.r.every(v => v >= 2);
  if (!st.solved && all && SITER.phase === 'idle') { SITER.phase = 'wake'; SITER.pt = t; }
  if (SITER.phase === 'wake' && t - SITER.pt > 3) { SITER.phase = 'play'; SITER.pt = t; SITER.step = 0; }
  let on = -1; if (SITER.inSiteP) for (const p of SITER.plates) if (Math.hypot(p.p[0] - P[0], p.p[2] - P[2]) < 1.15 && P[1] < SF + 0.8) on = p.k;
  if (SITER.phase !== 'answer') SITER.onPrev = on;   // only stepping onto a plate while it listens counts, not standing on one
  if (SITER.phase === 'play') { const i = Math.floor((t - SITER.pt) / 0.9); if (i < 5 && i >= SITER.step) { const k = SITE_SEQ[i]; SITER.flash[k] = 1; tone([SITE_NOTES[k]], 0.7, 'sine', 0.08, 0.02); SITER.step = i + 1; }
    if (t - SITER.pt > 5 * 0.9 + 0.6) { SITER.phase = 'answer'; SITER.step = 0; SITER.lit = [0, 0, 0, 0, 0]; SITER.pt = t; } }
  if (SITER.phase === 'answer') {
    const stepped = on >= 0 && on !== SITER.onPrev; SITER.onPrev = on;
    if (stepped && !SITER.lit[on]) {
      if (on === SITE_SEQ[SITER.step]) { SITER.lit[on] = 1; SITER.flash[on] = 1; SITER.step++; tone([SITE_NOTES[on]], 0.8, 'sine', 0.08, 0.02); SITER.pt = t;
        if (SITER.step === 5) { st.solved = 1; SITER.phase = 'holo'; SITER.msgT = 0; SITER.said = 0; tone([130.8, 196, 261.6, 392, 523.3], 5, 'sine', 0.06, 1.2); toast('You answered. Light climbs out of the dais.', 6); saveGame(); } }
      else { SITER.lit = [0, 0, 0, 0, 0]; SITER.step = 0; tone([110, 104], 0.6, 'sawtooth', 0.05); toast('The notes fall silent. The pattern plays again.', 4); SITER.phase = 'wake'; SITER.pt = t; } }
    else if (SITER.step === 0 && t - SITER.pt > 14) { SITER.phase = 'wake'; SITER.pt = t - 2; }   // waited too long: play it again
  }
  if (st.solved && SITER.phase !== 'holo') { SITER.phase = 'holo'; SITER.lit = [1, 1, 1, 1, 1]; SITER.msgT = st.heard ? 999 : 0; }
  // the hologram: rises from the bottom, speaks, shows the chart; step on the dais's middle to hear it again
  if (SITER.phase === 'holo') {
    SITER.holo = Math.min(1, SITER.holo + dt / 3.5);
    if (SITER.inSiteP && Math.hypot(P[0] - SITE_C[0], P[2] - SITE_C[2]) < 1.6 && SITER.msgT > 47) { SITER.msgT = 0; SITER.said = 0; }
    if (SITER.msgT >= 0 && SITER.msgT < 999) { SITER.msgT += dt;
      while (SITER.said < SITE_MSG.length && SITER.msgT >= SITE_MSG[SITER.said][0]) { const m = SITE_MSG[SITER.said++]; siteSay(m[1], m[2]); }
      if (SITER.msgT > 47 && !st.heard) { st.heard = 1; saveGame(); } }
    const mt = SITER.msgT >= 999 ? 60 : SITER.msgT;
    SITER.sp = mt > 2 && mt < 22 ? 0.5 + 0.5 * Math.sin(mt * 2.3) * Math.sin(mt * 0.7) : mt >= 22 && mt < 44 ? 0.3 : 0;   // the glyphs flicker as it speaks
    if (SITER.sp > 0.6 && Math.random() < dt * 1.5 && SITER.inSite) tone([55 + 30 * Math.random(), 82 + 40 * Math.random()], 0.9, 'sine', 0.035, 0.3);
    SITER.chart = Math.min(1, Math.max(0, (mt - 20) / 2)); SITER.big = Math.min(1, Math.max(0, (mt - 27) / 3)); SITER.hl = mt > 29 ? 1 : 0;
  }
  // the chamber's power: dim at first, brighter with each artifact, full once answered
  const placed = st.r.filter(v => v >= 2).length; SITER.power += ((st.solved ? 1.25 : 0.35 + placed * 0.12 + (SITER.phase === 'wake' || SITER.phase === 'play' || SITER.phase === 'answer' ? 0.2 : 0)) - SITER.power) * Math.min(1, dt * 1.5);
  for (let k = 0; k < 5; k++) SITER.flash[k] = Math.max(0, SITER.flash[k] - dt * 1.4);
  // the entity turns slowly to face you
  if (SITER.holo > 0) { const want = Math.atan2(P[0] - SITE_C[0], P[2] - SITE_C[2]); let d = want - SITER.entYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); SITER.entYaw += d * Math.min(1, dt * 0.6); }
}
function siteUniforms(p) {
  if (p.u.uSite) gl.uniform4f(p.u.uSite, SITE_C[0], SF, SITE_C[2], SITER.power);
  if (p.u.uSiteH) { const e = SITER.emit || SITE_C; gl.uniform4f(p.u.uSiteH, e[0], e[1] + 4.5, e[2], SITER.holo * 1.6 * (0.9 + 0.1 * Math.sin(state.time * 13))); }
}
function siteEntM() { const e = SITER.emit || SITE_C, bob = Math.sin(state.time * 0.8) * 0.15; return mulAll(tr(e[0], e[1] + 0.9 + bob, e[2]), rotY(SITER.entYaw), sc(1, 1, 1)); }
function drawSite() {                        // the builders' stone pieces, the artifacts, the portal ring
  const E = cam.eye, inS = SITER.inSite, inG = GEOR.inGeo; if (!inS && !inG) return;
  setCommon(pAnc); gl.uniform4f(pAnc.u.uUG, 1, cave.flash, cave.pday, cave.expo);
  const st = siteState(), drawOne = (mesh, m, pos, glow, fl, gold, far) => { const d = Math.hypot(pos[0] - E[0], pos[1] - E[1], pos[2] - E[2]); if (d > (far || 160)) return;
    gl.uniformMatrix4fv(pAnc.u.uM, false, m); gl.uniform4f(pAnc.u.uAnc, glow, fl, gold, 0); const g = d < 40 ? mesh.hi : mesh.lo; gl.bindVertexArray(g.vao); stats.cave += drawElems(g.count, gl.UNSIGNED_INT, 0); };
  for (const p of SITER.props) { if (p === SITER.ring ? !inG && !inS : !inS) continue;
    const pl = p.plate !== undefined ? p.plate : -1, lit = pl >= 0 ? Math.max(SITER.lit[pl] * 0.8, SITER.flash[pl] * 1.6) : 0;
    drawOne(p.mesh, p.m, p.p, p === SITER.ring ? 1.4 : (p.glow || 1) * SITER.power, lit, pl >= 0 && lit > 0 ? 1 : 0, p.far); }   // the portal ring always burns bright: it is the landmark
  if (inS) for (const R of SITER.relics) { const v = st.r[R.i]; if (v === 1 || !R.mesh) continue;   // carried ones are in your pack
    const at = v === 0 ? R.home : SITER.sockets[v - 2].seat, k = v >= 2 ? v - 2 : -1;
    drawOne(R.mesh, new Float32Array(mulAll(tr(at[0], at[1], at[2]), rotY(state.time * 0.3 + R.i))), at, 1.2 + (v === 0 ? 0.3 * Math.sin(state.time * 2 + R.i) : 0.5), k >= 0 ? SITER.flash[k] * 1.5 : 0, 1, 120); }
  gl.uniform4f(pAnc.u.uUG, 0, cave.flash, cave.pday, cave.expo); gl.bindVertexArray(null);
}
function drawSiteFx() {                      // the hologram, the star chart, the light rising from the dais
  if (!SITER.inSite || SITER.holo <= 0 || !SITER.ent) return;
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
  const M = siteEntM(), t = state.time, e = SITER.emit;
  gl.useProgram(pHolo.p); gl.uniformMatrix4fv(pHolo.u.uVP, false, cam.vp32); gl.uniform3fv(pHolo.u.uCam, cam.eye); gl.uniformMatrix4fv(pHolo.u.uM, false, new Float32Array(M));
  gl.uniform4f(pHolo.u.uHolo, SITER.holo, SITER.sp, t, SITER.holo < 1 ? 1 - SITER.holo : (Math.random() < 0.02 ? 0.6 : 0));
  const g = SITER.ent.hi; gl.bindVertexArray(g.vao); stats.cave += drawElems(g.count, gl.UNSIGNED_INT, 0);
  // light rising from the emitter
  gl.useProgram(pMote.p); gl.uniformMatrix4fv(pMote.u.uVP, false, cam.vp32); gl.uniform1f(pMote.u.uT, t); gl.uniform1f(pMote.u.uPx, canvas.height / 900); gl.uniform4f(pMote.u.uBase, e[0], e[1], e[2], SITER.holo);
  gl.bindVertexArray(SITER.motes); gl.drawArrays(gl.POINTS, 0, SITER.nMotes); stats.calls++;
  // the star chart: first cupped in its upper hands, then spread out round it
  if (SITER.chart > 0) { const ca = SITER.ent.it.attach && SITER.ent.it.attach[0] ? SITER.ent.it.attach[0] : [0, 4.2, 0.8], w = [M[0] * ca[0] + M[4] * ca[1] + M[8] * ca[2] + M[12], M[1] * ca[0] + M[5] * ca[1] + M[9] * ca[2] + M[13], M[2] * ca[0] + M[6] * ca[1] + M[10] * ca[2] + M[14]];
    const bg = SITER.big, cx = w[0] + (e[0] - w[0]) * bg, cy = w[1] + (e[1] + 6 - w[1]) * bg, cz = w[2] + (e[2] - w[2]) * bg, R = 0.8 + bg * 7.2;
    gl.useProgram(pStar.p); gl.uniformMatrix4fv(pStar.u.uVP, false, cam.vp32); gl.uniform1f(pStar.u.uPx, canvas.height / 900); gl.uniform4f(pStar.u.uChart, cx, cy, cz, R); gl.uniform4f(pStar.u.uChartB, SITER.chart * SITER.holo, t, SITER.hl, t * 0.05);
    gl.bindVertexArray(SITER.stars); gl.drawArrays(gl.POINTS, 0, SITER.nStars); stats.calls++; }
  gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
}
function drawSiteGlow() {                  // glows: artifacts waiting on their pedestals, and lights round the portal that read from across the giant cavern
  const E = cam.eye, t = state.time, st = siteState(), dist = p => Math.hypot(p[0] - E[0], p[1] - E[1], p[2] - E[2]);
  if (SITER.inSite) for (const R of SITER.relics) { if (st.r[R.i] !== 0) continue; const d = dist(R.home); if (d > 90) continue; const b = 0.55 + 0.06 * Math.sin(t * 2 + R.i);
    glowDraw(crystal, mulAll(tr(R.home[0], R.home[1] + b, R.home[2]), rotY(t * 0.8), sc(0.16, 0.22, 0.16)), 1.0, 0.8, 0.42, 1.1 + 0.3 * Math.sin(t * 3 + R.i), 0);
    glowDraw(crystal, mulAll(tr(R.home[0], R.home[1] + b, R.home[2]), rotY(-t * 0.5), sc(0.5, 0.6, 0.5)), 0.6, 0.45, 0.2, 0.3, 0); }
  const B0 = SITEC.bore[0], c = [B0[0] + 5.6, B0[1], B0[2]], d = dist(c);
  if ((GEOR.inGeo || SITER.inSite) && d < 420) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + t * 0.15, w = 0.5 + 0.5 * Math.sin(t * 2.2 - k * 0.785), sz = 0.13 * Math.max(1, d / 14) * (0.8 + 0.4 * w);
    glowDraw(crystal, mulAll(tr(c[0], c[1] + Math.cos(a) * 3.6, c[2] + Math.sin(a) * 3.6), sc(sz, sz, sz)), 0.35, 0.85, 1.0, 1.0 + 0.8 * w, 0); }
}
