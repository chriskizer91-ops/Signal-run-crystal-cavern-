/* ======================================================================================
   THE CRYSTAL CAVERN: crystals and glowing life scattered over the rock, a pool, drifting spores,
   the survey team's abandoned forward camp, and the suit's humidity sensor.
   ====================================================================================== */
const CAVR = { kits: [], ranges: [], inst: null, pool: null, spores: null, nSpores: 0, props: [], humid: 0, fog: 0, seen: false, tris: 0 };
function cavRnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// points on the cavern's rock (and their outward normals), found by marching rays out from inside the cavern
function cavernHits() {
  const C = CV.CAV, out = [], r = cavRnd(7311);
  const origins = [[0, 0, 0], [-45, -10, 0], [45, -10, 0], [0, -10, -38], [0, -10, 38], [-35, 15, -30], [35, 15, 30], [-30, -25, 30], [30, -25, -30]];
  for (const o of origins) {
    const ox = C.x + o[0], oy = C.y + o[1], oz = C.z + o[2]; if (CV.sdf(ox, oy, oz) > -2) continue;
    const N = 950;
    for (let i = 0; i < N; i++) {
      const yv = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - yv * yv), ph = i * 2.39996 + r() * 0.3, dx = Math.cos(ph) * rr, dy = yv, dz = Math.sin(ph) * rr;
      let t = 0, hit = null;
      for (let it = 0; it < 220 && t < 260; it++) { const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t, d = CV.sdf(x, y, z); if (d > -0.04) { hit = [x, y, z]; break; } t += Math.max(-d * 0.8, 0.12); }
      if (!hit || CV.cavK(hit[0], hit[1], hit[2]) > 1.25) continue;
      const e = 0.35, g = [CV.sdf(hit[0] + e, hit[1], hit[2]) - CV.sdf(hit[0] - e, hit[1], hit[2]), CV.sdf(hit[0], hit[1] + e, hit[2]) - CV.sdf(hit[0], hit[1] - e, hit[2]), CV.sdf(hit[0], hit[1], hit[2] + e) - CV.sdf(hit[0], hit[1], hit[2] - e)];
      const n = norm([-g[0], -g[1], -g[2]]);
      if (Math.hypot(hit[0] - C.drop[0], hit[2] - C.drop[1]) < 7 && hit[1] > C.y - 30) continue;   // keep the drop clear
      out.push({ p: hit, n });
    }
  }
  return out;
}
const CAMP_AT = [CV.SX + 231, CV.SZ + 238];
// choose which model goes where, then pack all instances: position, length, axis, width, hue, glow, roll
function cavernScatter(hits) {
  const r = cavRnd(9127), C = CV.CAV, crys = {}, life = {}, push = (bag, k, v) => (bag[k] = bag[k] || []).push(v);
  const pick = (opts) => { let x = r() * opts.reduce((a, o) => a + o[1], 0); for (const o of opts) { x -= o[1]; if (x <= 0) return o[0]; } return opts[0][0]; };
  const hueAt = p => Math.min(1, Math.max(0, 0.5 + 0.5 * Math.sin(p[0] * 0.021 + 1.3) * Math.cos(p[2] * 0.017) + (r() - 0.5) * 0.25));
  const tangent = n => { const a = norm(cross(n, Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])); return [a, cross(n, a)]; };
  const nearCamp = p => Math.hypot(p[0] - CAMP_AT[0], p[2] - CAMP_AT[1]) < 9 && p[1] < C.y - 10;
  hits.forEach((h, i) => {
    const p = h.p, n = h.n, floor = n[1] > 0.55, ceil = n[1] < -0.45, under = p[1] < C.pool - 0.2;
    // crystals: about half the hits grow a crystal (clusters and singles), a few become big
    if (r() < 0.62 && !nearCamp(p)) {
      const item = floor ? pick([['crystal_cluster', 3], ['crystal_point', 3.5], ['crystal_double', 2], ['crystal_shard', 1.5]]) : ceil ? pick([['crystal_spray', 4], ['crystal_point', 3], ['crystal_cluster', 2]]) : pick([['crystal_point', 3], ['crystal_cluster', 2.5], ['crystal_spray', 2], ['crystal_double', 1.5]]);
      const big = r() < 0.07, L = big ? 3 + r() * 5 : 0.35 * Math.exp(r() * 1.9), [ta, tb] = tangent(n), j = 0.55;
      const ax = norm([n[0] + (ta[0] * (r() - 0.5) + tb[0] * (r() - 0.5)) * j * 2, n[1] + (ta[1] * (r() - 0.5) + tb[1] * (r() - 0.5)) * j * 2 + (floor ? 0.2 : 0), n[2] + (ta[2] * (r() - 0.5) + tb[2] * (r() - 0.5)) * j * 2]);
      push(crys, item, [p[0] - n[0] * 0.08 * L, p[1] - n[1] * 0.08 * L, p[2] - n[2] * 0.08 * L, L, ax[0], ax[1], ax[2], 0.8 + r() * 0.5, hueAt(p), 0.75 + r() * 0.5, r() * 6.283, 0]);
      for (let k = 0; k < (item === 'crystal_point' || item === 'crystal_shard' ? 2 + (r() * 3 | 0) : 0); k++) {     // a few small companions around singles
        const off = [(ta[0] * (r() - 0.5) + tb[0] * (r() - 0.5)) * L * 0.9, (ta[1] * (r() - 0.5) + tb[1] * (r() - 0.5)) * L * 0.9, (ta[2] * (r() - 0.5) + tb[2] * (r() - 0.5)) * L * 0.9];
        const a2 = norm([ax[0] + (r() - 0.5) * 0.9, ax[1] + (r() - 0.5) * 0.9, ax[2] + (r() - 0.5) * 0.9]), L2 = L * (0.25 + r() * 0.45);
        push(crys, 'crystal_point', [p[0] + off[0], p[1] + off[1], p[2] + off[2], L2, a2[0], a2[1], a2[2], 0.8 + r() * 0.5, hueAt(p), 0.6 + r() * 0.6, r() * 6.283, 0]);
      }
    }
    // glowing life: moss and veins everywhere, caps, tubes and pods on floors, curtains hanging from the ceiling
    if (!under && r() < 0.55) {
      const item = floor ? pick([['glow_moss', 4], ['glow_caps', 2.5], ['tube_colony', 1.6], ['bulb_pods', 1.4], ['vein_patch', 1.5]]) : ceil ? pick([['filament_curtain', 6], ['vein_patch', 2], ['glow_moss', 1]]) : pick([['vein_patch', 4], ['glow_moss', 2.5], ['bulb_pods', 1.5], ['glow_caps', 0.8]]);
      if (nearCamp(p) && item !== 'glow_moss' && item !== 'vein_patch') return;
      const s = 0.6 + r() * 1.2;
      push(life, item, [p[0] - n[0] * 0.05, p[1] - n[1] * 0.05, p[2] - n[2] * 0.05, s, n[0], n[1], n[2], 1, hueAt(p), 0.7 + r() * 0.6, r() * 6.283, 0]);
    }
  });
  // hero crystals: the biggest growths, rising from ledges and leaning out of the walls
  const floors = hits.filter(h => h.n[1] > 0.5 && h.p[1] > C.pool + 1 && !nearCamp(h.p));
  for (let k = 0; k < 30 && floors.length; k++) {
    const h = floors[(r() * floors.length) | 0], L = 10 + r() * 16, ax = norm([h.n[0] * 0.6 + (r() - 0.5) * 0.7, 1, h.n[2] * 0.6 + (r() - 0.5) * 0.7]);
    push(crys, 'crystal_giant', [h.p[0], h.p[1] - 0.6, h.p[2], L, ax[0], ax[1], ax[2], 0.85 + r() * 0.3, hueAt(h.p), 0.9 + r() * 0.3, r() * 6.283, 0]);
  }
  return { crys, life };
}
function cavernInit() {
  const t0 = performance.now(), hits = cavernHits(), sc = cavernScatter(hits);
  const all = [], CELL = 48;
  for (const [mod, bag, prog] of [['crystals', sc.crys, 'crys'], ['glowlife', sc.life, 'life']]) {
    for (const name in bag) {
      const a = assetItem(mod, name); if (!a) continue;
      const kit = { mod, name, hi: a.hi, lo: a.lo, prog }; CAVR.kits.push(kit);
      const cells = new Map();
      for (const v of bag[name]) { const key = Math.floor(v[0] / CELL) + ',' + Math.floor(v[1] / CELL) + ',' + Math.floor(v[2] / CELL); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(v); }
      for (const [key, list] of cells) {
        let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
        for (const v of list) for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], v[q] - v[3]); mx[q] = Math.max(mx[q], v[q] + v[3]); }
        CAVR.ranges.push({ kit, first: all.length / 12, count: list.length, mn, mx, d: 1e9 }); for (const v of list) all.push(...v);
      }
    }
  }
  CAVR.count = all.length / 12; CAVR.hits = hits.length;
  if (all.length) { CAVR.inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, CAVR.inst); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(all), gl.STATIC_DRAW); }
  for (const k of CAVR.kits) for (const m of [k.hi, k.lo]) {        // instance attributes on each model's vertex array
    if (m.instReady) continue; m.instReady = true; gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, CAVR.inst);
    for (let q = 3; q <= 5; q++) { gl.enableVertexAttribArray(q); gl.vertexAttribDivisor(q, 1); gl.vertexAttribPointer(q, 4, gl.FLOAT, false, 48, (q - 3) * 16); }
  }
  gl.bindVertexArray(null);
  // the pool: a disc at the water level (the cavern floor hides it wherever the rock is higher)
  { const C = CV.CAV, V = [], I = [], N = 96, R = 60; V.push(C.x, C.pool, C.z); for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; V.push(C.x + Math.cos(a) * R, C.pool, C.z + Math.sin(a) * R); if (i) I.push(0, i, i + 1); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW); gl.bindVertexArray(null); CAVR.pool = { vao, count: I.length }; }
  // spores drifting through the air
  { const C = CV.CAV, r = cavRnd(555), P = []; while (P.length < 4 * 3200) { const u = r() * 2 - 1, v = r() * 2 - 1, w = r() * 2 - 1; if (u * u + v * v + w * w > 0.7) continue; const x = C.x + u * C.rx, y = C.y + v * C.ry, z = C.z + w * C.rz; if (CV.sdf(x, y, z) > -1.5) continue; P.push(x, y, z, r()); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); gl.bindVertexArray(null); CAVR.spores = vao; CAVR.nSpores = P.length / 4; }
  // the survey team's forward camp on a ledge near where the drop lands
  const camp = [['survey_deck', 0, 0, 0.4], ['field_lab', 4.5, 4.2, -0.6], ['instrument_mast', 7.5, -4.5, 0.3], ['core_drill', -6.5, -5, 1.1], ['fallen_shelter', -5, 6.5, 2.2], ['cable_run', 9, 1.5, -1.2], ['crate_stack', -8.5, 1.5, 0.9]];
  for (const [name, dx, dz, rot] of camp) {
    const a = assetItem('survey', name); if (!a) continue;
    const x = CAMP_AT[0] + dx, z = CAMP_AT[1] + dz, y = CV.floorAt(x, CV.cavFloor(x, z) + 3, z);
    if (!(y > -1e8 && y < 1e8)) continue;
    CAVR.props.push({ hi: a.hi, lo: a.lo, m: new Float32Array(K.mulAll(K.tr(x, y, z), K.rotY(rot))), pos: [x, y + a.cy, z], r: a.r });
  }
  CAVR.ms = Math.round(performance.now() - t0);
}
function cavInside(x, y, z) { return CV.cavK(x, y, z) < 1.05; }
/* ---------- drawing ---------- */
function drawCavern() {
  const E = cam.eye; if (CV.cavK(E[0], E[1], E[2]) > 1.6) return;
  const P = cam.planes;
  // survey camp: ordinary props, lit the underground way
  if (CAVR.props.length) {
    setCommon(pProp); gl.uniform4f(pProp.u.uUG, 1, cave.flash, cave.pday, cave.expo); gl.uniform1f(pProp.u.uChar, 0);
    for (const p of CAVR.props) { const d = Math.hypot(p.pos[0] - E[0], p.pos[1] - E[1], p.pos[2] - E[2]); gl.uniformMatrix4fv(pProp.u.uM, false, p.m); const m = d < 60 ? p.hi : p.lo; gl.bindVertexArray(m.vao); stats.cave += drawElems(m.count, gl.UNSIGNED_INT, 0); }
    gl.uniform4f(pProp.u.uUG, 0, cave.flash, cave.pday, cave.expo);
  }
  if (!CAVR.inst) return;
  for (const [prog, tag] of [[pCrys, 'crys'], [pLife, 'life']]) {
    setCommon(prog);
    for (const g of CAVR.ranges) {
      if (g.kit.prog !== tag || !classify(P, g.mn[0], g.mn[1], g.mn[2], g.mx[0], g.mx[1], g.mx[2], 0)) continue;
      const cx = Math.max(g.mn[0], Math.min(E[0], g.mx[0])), cy = Math.max(g.mn[1], Math.min(E[1], g.mx[1])), cz = Math.max(g.mn[2], Math.min(E[2], g.mx[2])), d = Math.hypot(cx - E[0], cy - E[1], cz - E[2]);
      const m = d < (tag === 'crys' ? 45 : 30) ? g.kit.hi : g.kit.lo; gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, CAVR.inst);
      for (let q = 3; q <= 5; q++) gl.vertexAttribPointer(q, 4, gl.FLOAT, false, 48, g.first * 48 + (q - 3) * 16);
      gl.drawElementsInstanced(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0, g.count); stats.cave += m.tris * g.count; stats.calls++; stats.submitted += m.tris * g.count;
    }
  }
  gl.bindVertexArray(null);
}
function drawCavernFx() {
  const E = cam.eye; if (CV.cavK(E[0], E[1], E[2]) > 1.6) return;
  if (CAVR.pool) { gl.disable(gl.BLEND); gl.depthMask(true); setCommon(pPool); gl.bindVertexArray(CAVR.pool.vao); stats.cave += drawElems(CAVR.pool.count, gl.UNSIGNED_INT, 0); }
  if (CAVR.spores) {
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); gl.useProgram(pSpore.p);
    gl.uniformMatrix4fv(pSpore.u.uVP, false, cam.vp32); gl.uniform1f(pSpore.u.uT, state.time); gl.uniform3fv(pSpore.u.uCam, cam.eye); gl.uniform1f(pSpore.u.uPx, canvas.height / 900);
    gl.bindVertexArray(CAVR.spores); gl.drawArrays(gl.POINTS, 0, CAVR.nSpores); stats.calls++;
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
  gl.bindVertexArray(null);
}
/* ---------- the suit's humidity sensor and the fogging visor ---------- */
function cavernUpdate(dt) {
  const inC = cave.under && cavInside(state.px, state.py + 1, state.pz), target = inC ? 97 : cave.under ? 64 : 22;
  CAVR.humid += (target - CAVR.humid) * Math.min(1, dt * 0.35);
  CAVR.fog += ((inC ? 0.62 : 0) - CAVR.fog) * Math.min(1, dt * 0.25);
  const v = $('visor'); if (v) v.style.opacity = CAVR.fog.toFixed(3);
  if (inC && !CAVR.seen) { CAVR.seen = true; toast('Humidity 97%. Your visor is fogging at the edges.', 7); tone([330, 495, 660, 990], 1.8, 'sine', 0.13, 0.32); }
}
