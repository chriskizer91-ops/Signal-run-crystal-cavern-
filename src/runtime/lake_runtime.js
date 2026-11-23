/* ---------- the flooded cavern: the lake, swimming, suit air, the fish, the dive station and its log ---------- */
const LAKE = CV.LAKE, LWL = LAKE.water;
const LAKER = { kits: [], ranges: [], inst: null, count: 0, worms: null, nWorms: 0, surf: null, silt: null, nSilt: 0, oldLine: null, fish: [], props: [], term: null,
  air: 100, warned: 0, out: false, seen: false, dartT: 20, peekT: 14, read: -1, camUnder: false, ms: 0 };
const LOG = [   // the research team's dive log (draft text: Christopher may rewrite it)
  ['DIVE LOG / D-9 SUMP SURVEY / DAY 1', 'Lake is 31 m at its deepest. Water 4 °C. Visibility 8 m, the silt hangs like smoke. No inflow, no outflow, no current. A sealed lake.\n\nDives 1 and 2: clean.'],
  ['DAY 3', 'Dive 4. Something big passed under me at the 20 m line.\n\nKel says it was my own bubbles in the lamp.\n\nBubbles don\'t swim against you.'],
  ['DAY 6', 'Found a bore at the bottom. Perfectly round, 5.6 m across. The walls are smooth like poured glass, with a ring cut every half metre.\n\nNot water-cut. Not ours.\n\nThe core samples came back older than the survey says this rock is.'],
  ['DAY 9', 'Eyes at the edge of the light. They follow the line back to the platform.\n\nTurn your lamp on them and they are gone.\n\nAll of us have seen them now.'],
  ['DAY 11', 'Kel went into the bore alone.\n\nHis line runs forty metres in and stops. Cut clean. Not frayed.\n\nCut.'],
  ['DAY 12', 'We are sealing D-10 in the bore, and D-9 behind us. Couplings pulled.\n\nIf you are reading this, the array is listening again, and something has heard it.\n\nDo not dive alone. Do not follow the lights.'],
];
function inWater(x, y, z) {                  // below the lake's surface: in the lake, or in the flooded bore
  if (y >= LWL) return false;
  if (CV.lakeK(x, y, z) < 1.08) return true;
  const B = LAKE.bore; return x > B[0][0] - 3 && x < B[B.length - 1][0] + 3 && Math.abs(z - B[0][2]) < LAKE.boreR + 1;
}
function lakeHits() {
  const C = LAKE, out = [], r = cavRnd(6131);
  const origins = [[0, 5, 0], [-40, 0, 0], [40, 0, 0], [0, 0, -35], [0, 0, 35], [-25, -25, -20], [25, -25, 20], [0, -32, 0], [-50, -8, 10]];
  for (const o of origins) {
    const ox = C.x + o[0], oy = C.y + o[1], oz = C.z + o[2]; if (CV.sdf(ox, oy, oz) > -2) continue;
    const N = 1100;
    for (let i = 0; i < N; i++) {
      const yv = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - yv * yv), ph = i * 2.39996 + r() * 0.3, dx = Math.cos(ph) * rr, dy = yv, dz = Math.sin(ph) * rr;
      let t = 0, hit = null;
      for (let it = 0; it < 220 && t < 220; it++) { const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t, d = CV.sdf(x, y, z); if (d > -0.04) { hit = [x, y, z]; break; } t += Math.max(-d * 0.8, 0.12); }
      if (!hit || CV.lakeK(hit[0], hit[1], hit[2]) > 1.25) continue;
      if (Math.hypot(hit[0] - C.drop[0], hit[2] - C.drop[1]) < 7.5 && hit[1] > LWL - 2) continue;   // keep the drop clear
      const e = 0.35, g = [CV.sdf(hit[0] + e, hit[1], hit[2]) - CV.sdf(hit[0] - e, hit[1], hit[2]), CV.sdf(hit[0], hit[1] + e, hit[2]) - CV.sdf(hit[0], hit[1] - e, hit[2]), CV.sdf(hit[0], hit[1], hit[2] + e) - CV.sdf(hit[0], hit[1], hit[2] - e)];
      out.push({ p: hit, n: norm([-g[0], -g[1], -g[2]]) });
    }
  }
  return out;
}
const STATION_AT = [LAKE.drop[0] - 3, LAKE.drop[1] - 9];      // the dive station, on the beach just north of where the drop lands
function nearStation(p) { return Math.hypot(p[0] - STATION_AT[0] - 3, p[2] - STATION_AT[1]) < 9 && p[1] > LWL - 3; }
function lakeScatter(hits) {
  const r = cavRnd(8803), bag = {}, life = {}, worms = [], push = (b, k, v) => (b[k] = b[k] || []).push(v);
  const down = () => norm([(r() - 0.5) * 0.1, -1, (r() - 0.5) * 0.1]), up = () => norm([(r() - 0.5) * 0.2, 1, (r() - 0.5) * 0.2]);
  const tangent = n => { const a = norm(cross(n, Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])); return [a, cross(n, a)]; };
  for (const h of hits) {
    const p = h.p, n = h.n, floor = n[1] > 0.55, ceil = n[1] < -0.5, wet = p[1] < LWL - 0.4, tint = 0.15 + r() * 0.3;
    if (nearRoute(p) || nearStation(p)) continue;
    if (ceil) {
      if (r() < 0.45) { const L = 0.3 * Math.exp(r() * 2.1), ax = down(), it = r() < 0.3 ? 'soda_straws' : r() < 0.25 ? 'stalactite_cluster' : 'stalactite'; push(bag, it, [p[0], p[1] + 0.12 * L, p[2], L, ax[0], ax[1], ax[2], 0.8 + r() * 0.4, tint, 1, r() * 6.283, 0]); }
      if (r() < 0.1) push(life, 'glowworm_threads', [p[0] - n[0] * 0.03, p[1] - n[1] * 0.03, p[2] - n[2] * 0.03, 0.6 + r() * 0.6, n[0], n[1], n[2], 1, 0.5, 0.7, r() * 6.283, 0]);
      const [ta, tb] = tangent(n);
      for (let k = 0; k < 3; k++) { const u = (r() - 0.5) * 3, v = (r() - 0.5) * 3, q = [p[0] + ta[0] * u + tb[0] * v, p[1] + ta[1] * u + tb[1] * v, p[2] + ta[2] * u + tb[2] * v], d = CV.sdf(q[0], q[1], q[2]); if (d > -1.2 && d < 0.6) worms.push(q[0] + n[0] * (d + 0.08), q[1] + n[1] * (d + 0.08), q[2] + n[2] * (d + 0.08), r()); }
    } else if (floor) {
      if (p[1] < LWL - 0.4 && p[1] > LWL - 2.5) continue;   // keep the shallows plain
      if (wet) {                             // a drowned forest: stalagmites that grew when this hall was dry
        if (r() < 0.24) { const L = 0.4 * Math.exp(r() * 2), ax = up(); push(bag, r() < 0.3 ? 'stalagmite_cluster' : 'stalagmite', [p[0], p[1] - 0.06 * L, p[2], L, ax[0], ax[1], ax[2], 0.85 + r() * 0.5, 0.9, 1, r() * 6.283, 0]); }
        else if (r() < 0.08) { const s = 0.8 + r() * 1.2; push(bag, 'flowstone', [p[0], p[1] - 0.1 * s, p[2], s, n[0], n[1], n[2], 1, 0.85, 1, r() * 6.283, 0]); }
      } else if (r() < 0.1) { const L = 0.25 * Math.exp(r() * 1.6), ax = up(); push(bag, 'stalagmite', [p[0], p[1] - 0.06 * L, p[2], L, ax[0], ax[1], ax[2], 0.8 + r() * 0.4, tint, 1, r() * 6.283, 0]); }
    } else if (!wet) {
      const g = r(), nx = Math.hypot(n[0], n[2]) || 1;
      if (g < 0.12 && n[1] < 0.35) push(bag, 'drapery', [p[0] - n[0] * 0.12, p[1] + 0.25, p[2] - n[2] * 0.12, 0.8 + r() * 2.8, 0, -1, 0, 0.9 + r() * 0.4, tint, 1, Math.atan2(n[2] / nx, -n[0] / nx), 0]);
      else if (g < 0.18) push(bag, 'helictites', [p[0], p[1], p[2], 0.7 + r() * 0.7, n[0], n[1], n[2], 1, tint, 1, r() * 6.283, 0]);
    }
  }
  return { bag, life, worms };
}
function lakeInit() {
  const t0 = performance.now(), hits = lakeHits(), sc = lakeScatter(hits), all = [], CELL = 48;
  for (const name in Object.assign({}, sc.bag, sc.life)) {
    const bag = sc.bag[name] ? sc.bag : sc.life, a = assetItem('dripstone', name); if (!a) continue;
    const kit = { name, hi: a.hi, lo: a.lo, prog: bag === sc.life ? 'life' : 'drip' }; LAKER.kits.push(kit);
    const cells = new Map();
    for (const v of bag[name]) { const key = Math.floor(v[0] / CELL) + ',' + Math.floor(v[1] / CELL) + ',' + Math.floor(v[2] / CELL); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(v); }
    for (const [key, list] of cells) {
      let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (const v of list) for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], v[q] - v[3]); mx[q] = Math.max(mx[q], v[q] + v[3]); }
      LAKER.ranges.push({ kit, first: all.length / 12, count: list.length, mn, mx }); for (const v of list) all.push(...v);
    }
  }
  LAKER.count = all.length / 12; LAKER.hits = hits.length;
  if (all.length) { LAKER.inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, LAKER.inst); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(all), gl.STATIC_DRAW); }
  for (const k of LAKER.kits) for (const m of [k.hi, k.lo]) {
    if (m.instReady) continue; m.instReady = true; gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, LAKER.inst);
    for (let q = 3; q <= 5; q++) { gl.enableVertexAttribArray(q); gl.vertexAttribDivisor(q, 1); gl.vertexAttribPointer(q, 4, gl.FLOAT, false, 48, (q - 3) * 16); }
  }
  gl.bindVertexArray(null);
  const pts = (arr, n) => { const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, n, gl.FLOAT, false, n * 4, 0); gl.bindVertexArray(null); return vao; };
  if (sc.worms.length) { LAKER.worms = pts(sc.worms, 4); LAKER.nWorms = sc.worms.length / 4; }
  // the lake's surface: one disc at the water level (the beach and walls hide it wherever rock is higher)
  { const N = 160, R = Math.sqrt(1 - Math.pow((LWL - LAKE.y) / LAKE.ry, 2)) + 0.03, V = [LAKE.x, LWL, LAKE.z], I = [];
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; V.push(LAKE.x + Math.cos(a) * LAKE.rx * R, LWL, LAKE.z + Math.sin(a) * LAKE.rz * R); if (i) I.push(0, i, i + 1); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW); gl.bindVertexArray(null); LAKER.surf = { vao, count: I.length }; }
  // silt hanging in the water (drawn around the camera when it is under water)
  { const r = cavRnd(77), P = []; for (let i = 0; i < 2600; i++) P.push(r() * 16, r() * 16, r() * 16, r()); LAKER.silt = pts(P, 4); LAKER.nSilt = 2600; }
  // the dive station
  const place = (mod, name, x, z, yaw, y) => { const a = assetItem(mod, name); if (!a) return null; const yy = y !== undefined ? y : CV.floorAt(x, LWL + 6, z); if (!(yy > -1e8 && yy < 1e8)) return null;
    const p = { mesh: a, it: a.it, p: [x, yy, z], yaw, m: new Float32Array(mulAll(tr(x, yy, z), rotY(yaw))) }; LAKER.props.push(p); return p; };
  const S = STATION_AT, wpt = (p, a) => { const c = Math.cos(p.yaw), s = Math.sin(p.yaw); return [p.p[0] + c * a[0] + s * a[2], p.p[1] + a[1], p.p[2] - s * a[0] + c * a[2]]; };
  place('divesite', 'dive_platform', S[0] + 6.5, S[1], 0, LWL);
  place('divesite', 'tank_rack', S[0] - 4, S[1] - 3, 0.4);
  const term = place('divesite', 'log_terminal', S[0] - 1.5, S[1] + 5.5, 0);
  const spool = place('divesite', 'line_spool', S[0] + 1.5, S[1] - 2.5, 0);
  place('divesite', 'dropped_dive_light', S[0] - 0.5, S[1] + 1.5, 1.1);
  if (term) LAKER.term = { at: term.it.attach && term.it.attach[0] ? wpt(term, term.it.attach[0]) : [term.p[0], term.p[1] + 1.1, term.p[2] + 0.2], p: term.p };
  // the station's own work light, aimed out over the water
  const fm = assetItem('worklight', 'flood_mast');
  { const x = S[0] - 6, z = S[1] + 9, y = CV.floorAt(x, LWL + 6, z);
    if (y > -1e8 && y < 1e8) { const tg = [LAKE.x - 25, LWL, LAKE.z - 5], yaw = Math.atan2(tg[0] - x, tg[2] - z), c = Math.cos(yaw), s = Math.sin(yaw);
      const A = fm && fm.it.attach && fm.it.attach.length ? fm.it.attach : [[-0.34, 3.23, 0.36], [0.34, 3.23, 0.36]], lamps = A.map(a => [x + c * a[0] + s * a[2], y + a[1], z - s * a[0] + c * a[2]]);
      const lp = [0, 1, 2].map(k => lamps.reduce((t, q) => t + q[k], 0) / lamps.length), dir = norm([tg[0] - lp[0], tg[1] - lp[1], tg[2] - lp[2]]);
      FLOODS.push({ door: DOORS.find(d => d.name === 'D-10'), x, y, z, yaw, lamps, lp, dir, mesh: fm, m: new Float32Array(mulAll(tr(x, y, z), rotY(yaw))) }); } }
  // the research team's old guideline: from their spool, down the lake floor, into the bore, and cut off at D-10
  { const R = ROUTES['D-10'] || [], P = [];
    if (spool) P.push(spool.it.attach && spool.it.attach[0] ? wpt(spool, spool.it.attach[0]) : [spool.p[0] + 0.5, spool.p[1] + 0.1, spool.p[2]]);
    for (const q of R) P.push([q[0] + 0.8, q[1] + 0.25, q[2] + 0.6]);
    const D = DOORS.find(d => d.name === 'D-10'); if (D) { const f = doorWorld(D, 0.4, -0.9); P.push([f[0], D.y + 0.2, f[1]]); }
    const V = [], I = [], r = 0.035;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], f = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), s = norm(cross(f, Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, f), base = V.length / 4;
      for (const e of [a, b]) for (const [cs, cu] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) V.push(e[0] + (s[0] * cs + u[0] * cu) * r, e[1] + (s[1] * cs + u[1] * cu) * r, e[2] + (s[2] * cs + u[2] * cu) * r, 2);
      for (let q = 0; q < 4; q++) { const q2 = (q + 1) % 4; I.push(base + q, base + q2, base + 4 + q2, base + q, base + 4 + q2, base + 4 + q); }
    }
    if (I.length) { const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW); gl.bindVertexArray(null); LAKER.oldLine = { vao, count: I.length }; }
  }
  // the fish: four long lurkers and three darters
  const r = cavRnd(424242);
  for (let i = 0; i < 7; i++) {
    const kind = i < 4 ? 'lurker' : 'darter', a = assetItem('deepfish', kind); let p = null;
    for (let k = 0; k < 60 && !p; k++) { const x = LAKE.x + (r() - 0.5) * 100, z = LAKE.z + (r() - 0.5) * 90, y = LWL - 4 - r() * 20; if (inWater(x, y, z) && CV.sdf(x, y, z) < -3) p = [x, y, z]; }
    if (!p) continue;
    const L = a ? a.bd.max[0] - a.bd.min[0] : (kind === 'lurker' ? 2.6 : 1.6);
    LAKER.fish.push({ i, kind, mesh: a, L, p, v: [0, 0, 0], yaw: r() * 6.28, pitch: 0, ph: r() * 6.28, mode: 'wander', t: 0, goal: p.slice(), sp: 1.5, side: r() < 0.5 ? -1 : 1, ang: r() * 6.28, eyes: a && a.it.attach ? a.it.attach : [[L * 0.42, 0.06, 0.08], [L * 0.42, 0.06, -0.08]] });
  }
  LAKER.ms = Math.round(performance.now() - t0);
}
/* the fish keep their distance: they circle you out at the edge of the murk, flee when your light finds them, and now and then one darts past */
function fishUpdate(dt) {
  const E = cam.eye, F = [Math.cos(state.pitch) * -Math.sin(state.yaw), -Math.sin(state.pitch), Math.cos(state.pitch) * -Math.cos(state.yaw)];
  const P = [state.px, state.py + 1.4, state.pz], playerIn = inWater(P[0], P[1], P[2]), t = state.time, r = Math.random;
  const nearLake = !playerIn && cave.under && CV.lakeK(P[0], P[1], P[2]) < 1.05 && P[1] < LWL + 6;
  if (playerIn && t > LAKER.dartT) {        // a dart: one fish crosses right in front of you, fast
    LAKER.dartT = t + 14 + r() * 18; const c = LAKER.fish.filter(f => f.mode !== 'dart' && Math.hypot(f.p[0] - P[0], f.p[1] - P[1], f.p[2] - P[2]) > 9);
    if (c.length) { const f = c[(r() * c.length) | 0], side = [-F[2], 0, F[0]], k = f.side; f.mode = 'dart'; f.t = 0;
      const mid = [E[0] + F[0] * 4 + side[0] * k * 1.2, E[1] + F[1] * 4 - 0.4, E[2] + F[2] * 4 + side[2] * k * 1.2];
      f.goal = mid; f.exit = [mid[0] + (mid[0] - f.p[0]) * 1.5, mid[1], mid[2] + (mid[2] - f.p[2]) * 1.5]; }
  }
  if (nearLake && t > LAKER.peekT) {        // from the shore: a pair of eyes rises just under the surface, watching, then sinks away
    LAKER.peekT = t + 16 + r() * 16; const f = LAKER.fish[(r() * Math.min(4, LAKER.fish.length)) | 0];
    if (f && f.mode !== 'dart') { const a = Math.atan2(LAKE.z - P[2], LAKE.x - P[0]) + (r() - 0.5) * 1.2, d = 7 + r() * 5, g = [P[0] + Math.cos(a) * d, LWL - 1.6, P[2] + Math.sin(a) * d]; if (inWater(g[0], g[1], g[2]) && CV.sdf(g[0], g[1], g[2]) < -1) { f.mode = 'peek'; f.t = 0; f.goal = g; } }
  }
  for (const f of LAKER.fish) {
    f.t += dt; const toE = [f.p[0] - E[0], f.p[1] - E[1], f.p[2] - E[2]], dE = Math.hypot(toE[0], toE[1], toE[2]) || 1;
    const looked = cave.flash > 0 && (toE[0] * F[0] + toE[1] * F[1] + toE[2] * F[2]) / dE > 0.95 && dE < 13;
    let goal = f.goal, sp = 1.6;
    if (f.mode === 'dart') { sp = 11; if (f.t > 0.4 && Math.hypot(f.p[0] - f.goal[0], f.p[1] - f.goal[1], f.p[2] - f.goal[2]) < 2.5) f.goal = f.exit; if (f.t > 5) f.mode = 'wander'; goal = f.goal; }
    else if (f.mode === 'flee') { sp = 8; goal = [f.p[0] + toE[0] / dE * 15, f.p[1] + toE[1] / dE * 4, f.p[2] + toE[2] / dE * 15]; if (f.t > 2.2) f.mode = 'wander'; }
    else if (looked || (playerIn && dE < 6)) { f.mode = 'flee'; f.t = 0; }
    else if (f.mode === 'peek') { sp = f.t < 3 ? 2.2 : 3; if (f.t > 6.5 || looked) { f.mode = 'flee'; f.t = 0; } }
    else if (playerIn) { f.ang += dt * 0.12 * f.side; const rad = 11 + 4 * Math.sin(t * 0.1 + f.i * 1.7); goal = [P[0] + Math.cos(f.ang) * rad, P[1] + Math.sin(t * 0.07 + f.i) * 3, P[2] + Math.sin(f.ang) * rad]; sp = 2.6; }
    else { if (f.t > 9 || Math.hypot(f.p[0] - f.goal[0], f.p[1] - f.goal[1], f.p[2] - f.goal[2]) < 3) { f.t = 0; for (let k = 0; k < 12; k++) { const g = [LAKE.x + (r() - 0.5) * 110, LWL - 3 - r() * 24, LAKE.z + (r() - 0.5) * 100]; if (inWater(g[0], g[1], g[2]) && CV.sdf(g[0], g[1], g[2]) < -2) { f.goal = g; break; } } } goal = f.goal; }
    let d = [goal[0] - f.p[0], goal[1] - f.p[1], goal[2] - f.p[2]]; const dl = Math.hypot(d[0], d[1], d[2]) || 1; d = d.map(v => v / dl * sp);
    if (CV.sdf(f.p[0] + f.v[0] * 0.6, f.p[1] + f.v[1] * 0.6, f.p[2] + f.v[2] * 0.6) > -1.4 || f.p[1] > LWL - 1.2) { const c = [LAKE.x - f.p[0], LWL - 14 - f.p[1], LAKE.z - f.p[2]], cl = Math.hypot(c[0], c[1], c[2]) || 1; d = c.map(v => v / cl * Math.max(sp, 3)); }   // stay in open water
    const k = Math.min(1, dt * (f.mode === 'dart' ? 4 : 2.2)); for (let q = 0; q < 3; q++) f.v[q] += (d[q] - f.v[q]) * k;
    for (let q = 0; q < 3; q++) f.p[q] += f.v[q] * dt; f.p[1] = Math.min(f.p[1], LWL - 0.9);
    const h = Math.hypot(f.v[0], f.v[2]), s2 = Math.hypot(h, f.v[1]); if (h > 0.05) { let dy = Math.atan2(-f.v[2], f.v[0]) - f.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.yaw += dy * Math.min(1, dt * 5); }
    f.pitch += (Math.atan2(f.v[1], Math.max(h, 0.1)) * 0.7 - f.pitch) * Math.min(1, dt * 3); f.ph += dt * (2.2 + s2 * 1.6); f.amp = 0.7 + Math.min(1, s2 / 8) * 0.8;
    f.m = mulAll(tr(f.p[0], f.p[1], f.p[2]), rotY(f.yaw), rotZ(f.pitch));
  }
}
function lakeUpdate(dt) {
  const px = state.px, py = state.py, pz = state.pz, head = inWater(px, py + 1.6, pz);
  if (cave.under && CV.lakeK(px, py + 1, pz) < 1.0 && !LAKER.seen) { LAKER.seen = true; toast('Humidity 100%. Water temperature 4 °C. Something moved, out on the water.', 7); tone([196, 185, 147], 2.6, 'sine', 0.09, 0.6); }
  if (head) LAKER.air = Math.max(0, LAKER.air - dt * 100 / 75); else LAKER.air = Math.min(100, LAKER.air + dt * 40);
  if (head && LAKER.air < 30 && !LAKER.warned) { LAKER.warned = 1; toast('Suit air 30%. Head for the surface.', 4); tone([440, 330], 0.4, 'square', 0.08, 0.2); }
  if (LAKER.air > 60) LAKER.warned = 0;
  if (head && LAKER.air <= 0 && !LAKER.out && state.play) {
    LAKER.out = true; $('fade').classList.add('on'); tone([220, 165, 110], 1.6, 'sine', 0.12, 0.4);
    setTimeout(() => { caveTeleport('lake'); LAKER.air = 100; LAKER.out = false; $('fade').classList.remove('on'); toast('Your air ran out. You come to on the shore, coughing, with no memory of swimming back.', 8); saveGame(); }, 2600);
  }
  // the dive log terminal: walk up to it to read
  const T = LAKER.term, nearT = T && cave.under && Math.hypot(T.p[0] - px, T.p[2] - pz) < 3 && Math.abs(T.p[1] - py) < 2.5;
  const b = $('logBtn'); if (b) b.hidden = !nearT || LAKER.read >= 0;
  if (!nearT && LAKER.read >= 0) logShow(-1);
  if (LAKER.fish.length) fishUpdate(dt);
  LAKER.camUnder = inWater(cam.eye[0], cam.eye[1], cam.eye[2]);
}
function logShow(i) {
  LAKER.read = i; const c = $('logCard'); if (!c) return; if (i >= 0) $('logBtn').hidden = true; c.hidden = i < 0; game.paused = i >= 0 ? true : !$('menu').hidden;
  if (i >= 0) { $('logTitle').textContent = LOG[i][0]; $('logText').textContent = LOG[i][1]; $('logPage').textContent = (i + 1) + ' / ' + LOG.length; $('logPrev').disabled = i === 0; $('logNext').disabled = i === LOG.length - 1; tone([660], 0.08, 'square', 0.05); }
}
function drawLake() {
  const E = cam.eye; if (CV.lakeK(E[0], E[1], E[2]) > 1.8 && !LAKER.camUnder) return;
  const P = cam.planes;
  if (LAKER.inst) for (const [prog, tag] of [[pDrip, 'drip'], [pLife, 'life']]) {
    setCommon(prog);
    for (const g of LAKER.ranges) {
      if (g.kit.prog !== tag || !classify(P, g.mn[0], g.mn[1], g.mn[2], g.mx[0], g.mx[1], g.mx[2], 0)) continue;
      const cx = Math.max(g.mn[0], Math.min(E[0], g.mx[0])), cy = Math.max(g.mn[1], Math.min(E[1], g.mx[1])), cz = Math.max(g.mn[2], Math.min(E[2], g.mx[2])), d = Math.hypot(cx - E[0], cy - E[1], cz - E[2]);
      const m = d < (tag === 'drip' ? 40 : 25) ? g.kit.hi : g.kit.lo; gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, LAKER.inst);
      for (let q = 3; q <= 5; q++) gl.vertexAttribPointer(q, 4, gl.FLOAT, false, 48, g.first * 48 + (q - 3) * 16);
      gl.drawElementsInstanced(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0, g.count); stats.cave += m.tris * g.count; stats.calls++; stats.submitted += m.tris * g.count;
    }
  }
  // the dive station
  setCommon(pProp); gl.uniform4f(pProp.u.uUG, 1, cave.flash, cave.pday, cave.expo); gl.uniform1f(pProp.u.uChar, 0);
  for (const p of LAKER.props) { const d = Math.hypot(p.p[0] - E[0], p.p[1] - E[1], p.p[2] - E[2]); if (d > 150) continue; gl.uniformMatrix4fv(pProp.u.uM, false, p.m); const g = d < 45 ? p.mesh.hi : p.mesh.lo; gl.bindVertexArray(g.vao); stats.cave += drawElems(g.count, gl.UNSIGNED_INT, 0); }
  gl.uniform4f(pProp.u.uUG, 0, cave.flash, cave.pday, cave.expo);
  // the fish
  if (LAKER.fish.length) { setCommon(pFish);
    for (const f of LAKER.fish) { if (!f.mesh || !f.m) continue; const d = Math.hypot(f.p[0] - E[0], f.p[1] - E[1], f.p[2] - E[2]); if (d > 60) continue;
      gl.uniformMatrix4fv(pFish.u.uM, false, new Float32Array(f.m)); gl.uniform4f(pFish.u.uSw, f.ph, f.amp || 1, f.L, 2 * Math.PI / f.L * 0.85);
      const g = d < 20 ? f.mesh.hi : f.mesh.lo; gl.bindVertexArray(g.vao); stats.cave += drawElems(g.count, gl.UNSIGNED_INT, 0); } }
  gl.bindVertexArray(null);
}
function drawLakeFx() {
  const E = cam.eye; if (CV.lakeK(E[0], E[1], E[2]) > 1.8 && !LAKER.camUnder) return;
  if (LAKER.surf) { gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false); setCommon(pLake); gl.bindVertexArray(LAKER.surf.vao); stats.cave += drawElems(LAKER.surf.count, gl.UNSIGNED_INT, 0); gl.depthMask(true); gl.disable(gl.BLEND); }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
  if (LAKER.worms) { gl.useProgram(pWorm.p); gl.uniformMatrix4fv(pWorm.u.uVP, false, cam.vp32); gl.uniform1f(pWorm.u.uT, state.time); gl.uniform3fv(pWorm.u.uCam, cam.eye); gl.uniform1f(pWorm.u.uPx, canvas.height / 900); gl.bindVertexArray(LAKER.worms); gl.drawArrays(gl.POINTS, 0, LAKER.nWorms); stats.calls++; }
  if (LAKER.camUnder && LAKER.silt) { gl.useProgram(pSilt.p); gl.uniformMatrix4fv(pSilt.u.uVP, false, cam.vp32); gl.uniform1f(pSilt.u.uT, state.time); gl.uniform3fv(pSilt.u.uCam, cam.eye); gl.uniform1f(pSilt.u.uPx, canvas.height / 900); gl.uniform3fv(pSilt.u.uFlP, cave.flP); gl.uniform3fv(pSilt.u.uFlD, cave.flD); gl.uniform4f(pSilt.u.uUG, 1, cave.flash, 0, 0); gl.bindVertexArray(LAKER.silt); gl.drawArrays(gl.POINTS, 0, LAKER.nSilt); stats.calls++; }
  if (LAKER.oldLine) { gl.useProgram(pLine.p); gl.uniformMatrix4fv(pLine.u.uVP, false, cam.vp32); gl.uniform3fv(pLine.u.uFlP, cave.flP); gl.uniform3fv(pLine.u.uFlD, cave.flD); gl.uniform4f(pLine.u.uUG, 0, cave.flash, 0, 0); gl.bindVertexArray(LAKER.oldLine.vao); stats.fx += drawElems(LAKER.oldLine.count, gl.UNSIGNED_INT, 0); }
  gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
}
function drawLakeGlow() {                    // with the glow program bound: eyeshine, the terminal's screen
  const E = cam.eye, fl = cave.flash;
  for (const f of LAKER.fish) {
    if (!f.m) continue; const d = Math.hypot(f.p[0] - E[0], f.p[1] - E[1], f.p[2] - E[2]); if (d > 45) continue;
    const toF = [f.p[0] - cave.flP[0], f.p[1] - cave.flP[1], f.p[2] - cave.flP[2]], tl = Math.hypot(toF[0], toF[1], toF[2]) || 1;
    const lit = fl * Math.max(0, Math.min(1, ((toF[0] * cave.flD[0] + toF[1] * cave.flD[1] + toF[2] * cave.flD[2]) / tl - 0.8) / 0.15));   // eyeshine flares in your lamp
    let k = (0.32 + 2.4 * lit) * Math.exp(-d * (LAKER.camUnder ? 0.05 : 0.02)); if (!LAKER.camUnder) k *= Math.exp(-(LWL - f.p[1]) * 0.35);
    if (k < 0.02) continue; const sz = (f.kind === 'lurker' ? 0.05 : 0.04) * Math.max(1, d / 12);
    for (const a of f.eyes) { const w = [f.m[0] * a[0] + f.m[4] * a[1] + f.m[8] * a[2] + f.m[12], f.m[1] * a[0] + f.m[5] * a[1] + f.m[9] * a[2] + f.m[13], f.m[2] * a[0] + f.m[6] * a[1] + f.m[10] * a[2] + f.m[14]];
      glowDraw(crystal, mulAll(tr(w[0], w[1], w[2]), sc(sz, sz, sz)), 0.82, 1.0, 0.55, k, 0); }
  }
  const T = LAKER.term; if (T && Math.hypot(T.at[0] - E[0], T.at[1] - E[1], T.at[2] - E[2]) < 80) glowDraw(crystal, mulAll(tr(T.at[0], T.at[1], T.at[2]), sc(0.16, 0.1, 0.04)), 0.55, 1.0, 0.9, 0.7 + 0.15 * Math.sin(state.time * 9) * Math.sin(state.time * 2.3), 0);
}
