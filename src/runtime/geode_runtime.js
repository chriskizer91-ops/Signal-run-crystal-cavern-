/* ---------- the giant crystal cavern: titans you can see into, a lining of crystals, and the light they give ---------- */
const GEOC = CV.GEO;
const GEOR = { tris: 0, kits: [], ranges: [], inst: null, count: 0, hits: 0, pts: null, titans: [], tinst: null, motes: null, nMotes: 0, pool: null,
  seen: false, pt0: 0, k: +(params.get('geok') || 0.14), lights: new Float32Array(128), nl: 0, clearK: 0, tun: false, glowT: 0, surf: null, grab: null, ms: 0, inGeo: false };
const GEOQ = (() => { const q = params.get('geoq'), phone = q ? q === 'lo' : ('ontouchstart' in window || navigator.maxTouchPoints > 0);   // phones get a lighter version
  return phone ? { lights: 8, scatter: 0, steps: 3, druse: 0.55, hiR: 16, meshR: 40, tier: 'phone' } : { lights: 16, scatter: 1, steps: 6, druse: 1, hiR: 28, meshR: 52, tier: 'full' }; })();
const GEO_TA = 0.17, GEO_TK = 0.17 / 0.22;
const GEO_PL = [0, 1, 2, 3, 4, 5].flatMap(i => { const a = i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a); return [[c, 0, s, GEO_TA], [c, GEO_TK, s, GEO_TK]]; }).concat([[0, -1, 0, 0.06]]);   // the titan's exact shape: 13 flat faces
const geoTime = () => state.time - GEOR.pt0;
const geoPulse = (x, z) => { const ph = ((geoTime() * 16 - Math.hypot(x - GEOC.pool[0], z - GEOC.pool[1])) % 300 + 300) % 300; return 1 + 1.1 * Math.exp(-ph * ph / 400); };   // the signal: a ring of light running out from the pool
const geoWake = (x, z) => GEOR.seen ? 0.12 + 0.88 * Math.max(0, Math.min(1, (geoTime() * 16 - Math.hypot(x - GEOC.pool[0], z - GEOC.pool[1]) + 20) / 30)) : 0.12;   // dim until you surface; the first ring wakes them

// the tunnel from the lake through D-10 and up to the balcony: how far a point is from its middle line
const GEO_TUN = CV.GEO.tunnel, GEO_D10X = CV.DOORS.find(d => d.name === 'D-10').x;
function tunnelD(x, y, z) { let best = 1e9; for (let i = 0; i < GEO_TUN.length - 1; i++) { const a = GEO_TUN[i], b = GEO_TUN[i + 1], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [x - a[0], y - a[1], z - a[2]];
  const t = Math.max(0, Math.min(1, (w[0] * ab[0] + w[1] * ab[1] + w[2] * ab[2]) / (ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]))); best = Math.min(best, Math.hypot(w[0] - ab[0] * t, w[1] - ab[1] * t, w[2] - ab[2] * t)); } return best; }
const GEO_MOUTH = (() => { const n = GEO_TUN.length, a = GEO_TUN[n - 2], b = GEO_TUN[n - 1], d = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]); return [b[0] + d[0] * 4, b[1] + d[1] * 4 + 1.5, b[2] + d[2] * 4]; })();   // just outside the tunnel's end: its light spills down the tunnel
const GEO_SURF = (() => { for (let i = 0; i < GEO_TUN.length - 1; i++) { const a = GEO_TUN[i], b = GEO_TUN[i + 1]; if (a[1] < LWL && b[1] >= LWL) { const t = (LWL - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, LWL, a[2] + (b[2] - a[2]) * t]; } } return null; })();   // where the climbing tunnel comes up through the water
// the route on from D-10: stakes every 10 m along the tunnel floor, up to the balcony
ROUTES.GEO = (() => { const out = []; let run = 0, next = 0;
  for (let i = 0; i < GEO_TUN.length - 1; i++) { const a = GEO_TUN[i], b = GEO_TUN[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    for (let s = 0; s < L; s += 1, run += 1) { const t = s / L, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      if (p[0] < GEO_D10X + 4 || run < next) continue; const y = CV.floorAt(p[0], p[1], p[2]); if (y > p[1] - 4 && y < p[1]) { out.push([+p[0].toFixed(2), Math.round(y * 100) / 100, +p[2].toFixed(2)]); next = run + 10; } } }
  const g = CV.GEO.ledge; out.push([g[0], g[1], g[2]]); return out; })();

function geoHits() {
  const C = GEOC, out = [], r = cavRnd(9001);
  const origins = [[0, 0, 0], [0, -55, 0], [-60, -40, 0], [60, -40, 0], [0, -40, -55], [0, -40, 55], [-50, -15, -45], [50, -15, 45], [45, 20, -40], [-45, 20, 40], [0, 45, 0], [-45, -60, -10]];
  for (const o of origins) {
    const ox = C.x + o[0], oy = C.y + o[1], oz = C.z + o[2]; if (CV.sdf(ox, oy, oz) > -3) continue;
    const N = 1500;
    for (let i = 0; i < N; i++) {
      const yv = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - yv * yv), ph = i * 2.39996 + r() * 0.3, dx = Math.cos(ph) * rr, dy = yv, dz = Math.sin(ph) * rr;
      let t = 0, hit = null;
      for (let it = 0; it < 300 && t < 320; it++) { const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t, d = CV.sdf(x, y, z); if (d > -0.04) { hit = [x, y, z]; break; } t += Math.max(-d * 0.8, 0.15); }
      if (!hit || CV.geoK(hit[0], hit[1], hit[2]) > 1.2 || hit[1] < LWL - 0.3) continue;   // nothing under the pool's water
      const e = 0.4, g = [CV.sdf(hit[0] + e, hit[1], hit[2]) - CV.sdf(hit[0] - e, hit[1], hit[2]), CV.sdf(hit[0], hit[1] + e, hit[2]) - CV.sdf(hit[0], hit[1] - e, hit[2]), CV.sdf(hit[0], hit[1], hit[2] + e) - CV.sdf(hit[0], hit[1], hit[2] - e)];
      out.push({ p: hit, n: norm([-g[0], -g[1], -g[2]]) });
    }
  }
  return out;
}
function geoScatter(hits) {
  const r = cavRnd(5150), bag = {}, push = (k, v) => (bag[k] = bag[k] || []).push(v), titans = [], C = GEOC;
  const pick = opts => { let x = r() * opts.reduce((a, o) => a + o[1], 0); for (const o of opts) { x -= o[1]; if (x <= 0) return o[0]; } return opts[0][0]; };
  const hueOf = () => (pick([[0.0, 4], [0.2, 2], [0.4, 3], [0.6, 1.5], [0.8, 0.35]]) + (r() - 0.5) * 0.06 + 1) % 1;   // cyan, mint, violet, rose, a rare gold
  const poolD = p => Math.hypot(p[0] - C.pool[0], p[2] - C.pool[1]);
  const LG = CV.GEO.ledge, free = (p, gap) => Math.hypot(p[0] - LG[0], p[1] - LG[1], p[2] - LG[2]) > 30 && titans.every(t => Math.hypot(t.p[0] - p[0], t.p[1] - p[1], t.p[2] - p[2]) > gap);   // and none on or right by the balcony
  const addTitan = (p, ax, L, wf, kind) => { titans.push({ p: [p[0] - ax[0] * 0.05 * L, p[1] - ax[1] * 0.05 * L, p[2] - ax[2] * 0.05 * L], ax, L, wf, roll: r() * 6.283, hue: hueOf(), glow: 0.8 + r() * 0.45, v: ['titan_a', 'titan_b', 'titan_c'][(r() * 3) | 0], kind }); };
  const floors = hits.filter(h => h.n[1] > 0.6 && h.p[1] > LWL + 0.5), walls = hits.filter(h => Math.abs(h.n[1]) < 0.45 && h.p[1] > LWL + 18), ceils = hits.filter(h => h.n[1] < -0.6);
  const rnd = a => a[(r() * a.length) | 0];
  // three titans at the pool's edge, half drowned, glowing up through the water
  for (let k = 0, tries = 0; k < 3 && tries < 600 && floors.length; tries++) { const h = rnd(floors), d = poolD(h.p); if (d < 14 || d > 30 || !free(h.p, 16)) continue;
    const out = norm([h.p[0] - C.pool[0], 0, h.p[2] - C.pool[1]]); addTitan([h.p[0], LWL - 6, h.p[2]], norm([out[0] * 0.45 + (r() - 0.5) * 0.2, 1, out[2] * 0.45 + (r() - 0.5) * 0.2]), 30 + r() * 16, 0.5 + r() * 0.1, 'pool'); k++; }
  // a ring of great titans on the terraces, leaning out from the centre like the inside of a geode
  for (let k = 0, tries = 0; k < 14 && tries < 3000 && floors.length; tries++) { const h = rnd(floors), d = poolD(h.p); if (d < 32 || !free(h.p, 22)) continue;
    const out = norm([h.p[0] - C.x, 0, h.p[2] - C.z]); addTitan(h.p, norm([out[0] * 0.3 + h.n[0] * 0.3 + (r() - 0.5) * 0.25, 1, out[2] * 0.3 + h.n[2] * 0.3 + (r() - 0.5) * 0.25]), 28 + r() * 44, 0.42 + r() * 0.18, 'floor'); k++; }
  // titans thrusting out of the walls, and hanging from the dome
  for (let k = 0, tries = 0; k < 10 && tries < 3000 && walls.length; tries++) { const h = rnd(walls); if (!free(h.p, 24)) continue; addTitan(h.p, norm([h.n[0] * 0.85 + (r() - 0.5) * 0.3, -0.2 + (r() - 0.5) * 0.3, h.n[2] * 0.85 + (r() - 0.5) * 0.3]), 34 + r() * 52, 0.36 + r() * 0.14, 'wall'); k++; }
  for (let k = 0, tries = 0; k < 6 && tries < 3000 && ceils.length; tries++) { const h = rnd(ceils); if (!free(h.p, 26)) continue; addTitan(h.p, norm([h.n[0] + (r() - 0.5) * 0.3, -1, h.n[2] + (r() - 0.5) * 0.3]), 25 + r() * 35, 0.4 + r() * 0.15, 'ceil'); k++; }
  // two colossi rising from the far terraces almost to the dome
  for (let k = 0, tries = 0; k < 2 && tries < 3000 && floors.length; tries++) { const h = rnd(floors); if (h.p[0] < C.x + 15 || !free(h.p, 45)) continue; const cy = CV.ceilAt(h.p[0], h.p[1] + 1, h.p[2]); if (!(cy < 1e8) || cy - h.p[1] < 90) continue;
    addTitan(h.p, norm([(r() - 0.5) * 0.12, 1, (r() - 0.5) * 0.12]), (cy - h.p[1]) * 0.9, 0.27 + r() * 0.04, 'colossus'); k++; }
  // the lining: every surface carpeted with small crystals, mostly the colour of the nearest titan
  const near = p => { let b = null, bd = 1e9; for (const t of titans) { const d = Math.hypot(t.p[0] - p[0], t.p[1] - p[1], t.p[2] - p[2]); if (d < bd) { bd = d; b = t; } } return b; };
  const tangent = n => { const a = norm(cross(n, Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])); return [a, cross(n, a)]; };
  const inTitan = p => titans.some(q => { const w = [p[0] - q.p[0], p[1] - q.p[1], p[2] - q.p[2]], tt = Math.max(0, Math.min(1, (w[0] * q.ax[0] + w[1] * q.ax[1] + w[2] * q.ax[2]) / q.L)); return Math.hypot(w[0] - q.ax[0] * q.L * tt, w[1] - q.ax[1] * q.L * tt, w[2] - q.ax[2] * q.L * tt) < q.L * q.wf * 0.2; });
  const clear = p => Math.hypot(p[0] - C.pool[0], p[2] - C.pool[1]) > 4.5 || p[1] > LWL + 3;   // keep the pool's middle open
  for (const h of hits) {
    const p = h.p, n = h.n; if (!clear(p) || inTitan(p)) continue;
    const t = near(p), hv = t && r() < 0.85 ? (t.hue + (r() - 0.5) * 0.1 + 1) % 1 : hueOf(), ceil = n[1] < -0.45, floor = n[1] > 0.55;
    if (r() < 0.62) { const s = 0.8 + r() * 1.5; push('druse_patch', [p[0] - n[0] * 0.05, p[1] - n[1] * 0.05, p[2] - n[2] * 0.05, s, n[0], n[1], n[2], 1, hv, 0.9 + r() * 0.5, r() * 6.283, 0]); }
    if (r() < 0.32 && tunnelD(p[0], p[1], p[2]) > 4.5 && Math.hypot(p[0] - LG[0], p[2] - LG[2]) > LG[3] + 1) {
      const item = floor ? pick([['crystal_cluster', 3], ['druse_cluster', 3], ['crystal_point', 2]]) : ceil ? pick([['druse_cluster', 3], ['crystal_spray', 2], ['crystal_point', 2]]) : pick([['crystal_cluster', 2], ['druse_cluster', 3], ['crystal_point', 2], ['crystal_spray', 1]]);
      const [ta, tb] = tangent(n), j = 0.5, L = item === 'druse_cluster' ? 0.8 + r() * 1.4 : 0.5 * Math.exp(r() * 2.1);
      const ax = norm([n[0] + (ta[0] * (r() - 0.5) + tb[0] * (r() - 0.5)) * j * 2, n[1] + (ta[1] * (r() - 0.5) + tb[1] * (r() - 0.5)) * j * 2, n[2] + (ta[2] * (r() - 0.5) + tb[2] * (r() - 0.5)) * j * 2]);
      push(item, [p[0] - n[0] * 0.08 * L, p[1] - n[1] * 0.08 * L, p[2] - n[2] * 0.08 * L, L, ax[0], ax[1], ax[2], item === 'druse_cluster' ? 1 : 0.8 + r() * 0.5, hv, 1.0 + r() * 0.6, r() * 6.283, 0]);
    }
  }
  return { bag, titans };
}
function geoFrame(t) {                       // the same frame the shader builds: x across, y along the crystal, z across
  const f = t.ax, s = norm(cross(f, Math.abs(f[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, f), c = Math.cos(t.roll), sn = Math.sin(t.roll), W = t.L * t.wf;
  const s2 = [s[0] * c + u[0] * sn, s[1] * c + u[1] * sn, s[2] * c + u[2] * sn], u2 = [u[0] * c - s[0] * sn, u[1] * c - s[1] * sn, u[2] * c - s[2] * sn];
  t.X = s2.map(v => v / W); t.Y = f.map(v => v / t.L); t.Z = u2.map(v => v / W);
  t.mid = [t.p[0] + f[0] * t.L * 0.5, t.p[1] + f[1] * t.L * 0.5, t.p[2] + f[2] * t.L * 0.5]; t.rad = t.L * 0.56 + W * 0.25;
  t.planes = GEO_PL.map(P => { const g = [P[0] * t.X[0] + P[1] * t.Y[0] + P[2] * t.Z[0], P[0] * t.X[1] + P[1] * t.Y[1] + P[2] * t.Z[1], P[0] * t.X[2] + P[1] * t.Y[2] + P[2] * t.Z[2]], l = Math.hypot(g[0], g[1], g[2]); return [g[0] / l, g[1] / l, g[2] / l, l, P]; });
}
function geoSD(t, x, y, z) {                 // metres from a titan's surface (negative inside), and which face is nearest
  const d = [x - t.p[0], y - t.p[1], z - t.p[2]], q = [d[0] * t.X[0] + d[1] * t.X[1] + d[2] * t.X[2], d[0] * t.Y[0] + d[1] * t.Y[1] + d[2] * t.Y[2], d[0] * t.Z[0] + d[1] * t.Z[1] + d[2] * t.Z[2]];
  let best = -1e9, bn = null; for (const P of t.planes) { const v = (P[4][0] * q[0] + P[4][1] * q[1] + P[4][2] * q[2] - P[4][3]) / P[3]; if (v > best) { best = v; bn = P; } }
  return [best, bn];
}
function geoFloorY(x, z, py) {               // the top of any titan you are standing on
  let top = -1e9; if (!GEOR.inGeoP) return top;
  for (const t of GEOR.titans) {
    if (Math.hypot(t.mid[0] - x, t.mid[2] - z) > t.rad) continue;
    let lo = py - 2.5, hi = py + 0.9; if (geoSD(t, x, hi, z)[0] < 0 || geoSD(t, x, lo, z)[0] > 0) continue;   // inside it (the push-out deals with that), or nothing of it under your feet
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (geoSD(t, x, m, z)[0] < 0) lo = m; else hi = m; }
    top = Math.max(top, hi);
  }
  return top;
}
function geoPush() {                         // keep the body out of the titans: slide along their faces
  if (!GEOR.inGeoP) return;
  for (const t of GEOR.titans) {
    if (Math.hypot(t.mid[0] - state.px, t.mid[1] - state.py - 1, t.mid[2] - state.pz) > t.rad + 2) continue;
    for (const hy of [0.75, 1.25, 1.75]) {
      const [sd, P] = geoSD(t, state.px, state.py + hy, state.pz); if (sd > 0.4) continue;
      const k = 0.4 - sd; state.px += P[0] * k; state.py += P[1] * k; state.pz += P[2] * k;
      const vn = state.vx * P[0] + state.vy * P[1] + state.vz * P[2]; if (vn < 0) { state.vx -= vn * P[0]; state.vy -= vn * P[1]; state.vz -= vn * P[2]; }
    }
  }
}
function geoInit() {
  const t0 = performance.now(), hits = geoHits(), sc = geoScatter(hits), all = [], CELL = 48;
  for (const name in sc.bag) {
    const a = assetItem(name.startsWith('druse') ? 'geode' : 'crystals', name); if (!a) continue;
    const kit = { name, hi: a.hi, lo: a.lo }; GEOR.kits.push(kit);
    const cells = new Map();
    for (const v of sc.bag[name]) { const key = Math.floor(v[0] / CELL) + ',' + Math.floor(v[1] / CELL) + ',' + Math.floor(v[2] / CELL); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(v); }
    for (const [key, list] of cells) {
      let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (const v of list) for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], v[q] - v[3]); mx[q] = Math.max(mx[q], v[q] + v[3]); }
      GEOR.ranges.push({ kit, first: all.length / 12, count: list.length, mn, mx, c: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2] }); for (const v of list) all.push(...v);
    }
  }
  GEOR.count = all.length / 12; GEOR.hits = hits.length;
  const instAttr = (m, buf) => { gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf); for (let q = 3; q <= 5; q++) { gl.enableVertexAttribArray(q); gl.vertexAttribDivisor(q, 1); gl.vertexAttribPointer(q, 4, gl.FLOAT, false, 48, (q - 3) * 16); } m.instReady = true; };
  if (all.length) {
    GEOR.inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, GEOR.inst); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(all), gl.STATIC_DRAW);
    for (const k of GEOR.kits) for (const m of [k.hi, k.lo]) if (!m.instReady) instAttr(m, GEOR.inst);
    // far away, the lining is drawn as glittering points read straight from the same list
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, GEOR.inst);
    for (let q = 0; q < 3; q++) { gl.enableVertexAttribArray(q); gl.vertexAttribPointer(q, 4, gl.FLOAT, false, 48, q * 16); }
    GEOR.pts = vao;
  }
  // the titans: one copy each, drawn one at a time, far ones first
  const T = []; GEOR.titans = sc.titans.filter(t => assetItem('geode', t.v));
  GEOR.titans.forEach((t, i) => { t.first = i; t.mesh = assetItem('geode', t.v); geoFrame(t); T.push(t.p[0], t.p[1], t.p[2], t.L, t.ax[0], t.ax[1], t.ax[2], t.wf, t.hue, t.glow, t.roll, 0); });
  if (T.length) { GEOR.tinst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, GEOR.tinst); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(T), gl.STATIC_DRAW); for (const t of GEOR.titans) for (const m of [t.mesh.hi, t.mesh.lo]) instAttr(m, GEOR.tinst); }
  gl.bindVertexArray(null);
  // motes of light drifting through the whole cavern
  { const C = GEOC, r = cavRnd(31337), P = []; let tries = 0; while (P.length < 4 * 6000 && tries++ < 60000) { const u = r() * 2 - 1, v = r() * 2 - 1, w = r() * 2 - 1; if (u * u + v * v + w * w > 0.8) continue; const x = C.x + u * C.rx, y = C.y + v * C.ry, z = C.z + w * C.rz; if (CV.sdf(x, y, z) > -2 || y < LWL + 1) continue; P.push(x, y, z, r()); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); gl.bindVertexArray(null); GEOR.motes = vao; GEOR.nMotes = P.length / 4; }
  // the water's surface where the climbing tunnel comes up out of it
  if (GEO_SURF) { const N = 40, R = 7.5, V = [GEO_SURF[0], LWL, GEO_SURF[2]], I = []; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; V.push(GEO_SURF[0] + Math.cos(a) * R, LWL, GEO_SURF[2] + Math.sin(a) * R); if (i) I.push(0, i, i + 1); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW); gl.bindVertexArray(null); GEOR.surf = { vao, count: I.length }; }
  // the pool's surface
  { const N = 96, R = GEOC.pool[2] * 1.35, cx = GEOC.pool[0], cz = GEOC.pool[1], V = [cx, LWL, cz], I = [];
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; V.push(cx + Math.cos(a) * R, LWL, cz + Math.sin(a) * R); if (i) I.push(0, i, i + 1); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW); gl.bindVertexArray(null); GEOR.pool = { vao, count: I.length }; }
  GEOR.ms = Math.round(performance.now() - t0);
}
function geoUpdate(dt) {
  const E = cam.eye; GEOR.tun = E[0] > GEO_D10X + 0.5 && tunnelD(E[0], E[1], E[2]) < CV.LAKE.boreR + 2; GEOR.inGeo = CV.geoK(E[0], E[1], E[2]) < 1.2 || GEOR.tun; GEOR.inGeoP = cave.under && CV.geoK(state.px, state.py, state.pz) < 1.3;
  GEOR.clearK = Math.max(0, Math.min(1, (1.22 - CV.geoK(E[0], E[1], E[2])) / 0.15)); GEOR.glowT = GEOR.inGeo ? 1.2 * (0.35 + 0.65 * geoWake(GEO_MOUTH[0], GEO_MOUTH[2])) * geoPulse(GEO_MOUTH[0], GEO_MOUTH[2]) : 0;
  GEOR.nl = 0;
  if (GEOR.inGeo && GEOR.titans.length) {
    // the titans nearest the camera are the lights: each a glowing line from base to tip, pulsing with the signal
    const L = GEOR.titans.map(q => { const w = [E[0] - q.p[0], E[1] - q.p[1], E[2] - q.p[2]], s = Math.max(0, Math.min(1, (w[0] * q.ax[0] + w[1] * q.ax[1] + w[2] * q.ax[2]) / q.L)); return [Math.hypot(w[0] - q.ax[0] * q.L * s, w[1] - q.ax[1] * q.L * s, w[2] - q.ax[2] * q.L * s), q]; }).sort((a, b) => a[0] - b[0]);
    const n = Math.min(GEOQ.lights, L.length), A = GEOR.lights, cut = n < L.length ? L[n][0] : 1e9;
    for (let i = 0; i < n; i++) { const [d, q] = L[i], fade = Math.max(0, Math.min(1, (cut - d) / (cut * 0.3 + 1))), o = i * 8;
      const I = q.glow * (0.55 + q.L / 50) * geoPulse(q.mid[0], q.mid[2]) * geoWake(q.mid[0], q.mid[2]) * fade * GEOR.k;
      A[o] = q.p[0] + q.ax[0] * q.L * 0.08; A[o + 1] = q.p[1] + q.ax[1] * q.L * 0.08; A[o + 2] = q.p[2] + q.ax[2] * q.L * 0.08; A[o + 3] = I;
      A[o + 4] = q.p[0] + q.ax[0] * q.L * 0.8; A[o + 5] = q.p[1] + q.ax[1] * q.L * 0.8; A[o + 6] = q.p[2] + q.ax[2] * q.L * 0.8; A[o + 7] = q.hue; }
    GEOR.nl = n;
  }
  // the reveal: the first time you step out of the tunnel onto the balcony (or come into the cavern any other way)
  if (!GEOR.seen && cave.under && CV.geoK(state.px, state.py + 1.6, state.pz) < 0.935 && state.py + 1.6 > LWL - 0.2) {
    GEOR.seen = true; GEOR.pt0 = state.time - 0.3;
    toast('Your suit radio fills with a slow, steady pulse: the same pattern the array was built to hear. It is coming from the crystals.', 11);
    tone([130.8, 196, 261.6, 329.6, 392], 6, 'sine', 0.06, 0.4); setTimeout(() => tone([174.6, 261.6, 349.2, 440, 523.3], 7, 'sine', 0.05, 0.5), 2800); setTimeout(() => tone([196, 293.7, 392, 493.9, 587.3], 8, 'sine', 0.045, 0.55), 6000);
    saveGame();
  }
}
function geoUniforms(p) {
  if (p.u.uGeo) gl.uniform4f(p.u.uGeo, GEOC.x, GEOC.y, GEOC.z, 1); if (p.u.uGeoR) gl.uniform3f(p.u.uGeoR, GEOC.rx, GEOC.ry, GEOC.rz);
  if (p.u.uGQ) gl.uniform4f(p.u.uGQ, GEOR.nl, GEOQ.scatter, GEOC.pool[0], GEOC.pool[1]); if (p.u.uGS) gl.uniform4f(p.u.uGS, geoTime(), GEOR.seen ? 1 : 0, 0, 0); if (p.u.uGT) gl.uniform4f(p.u.uGT, GEO_MOUTH[0], GEO_MOUTH[1], GEO_MOUTH[2], GEOR.glowT);
  if (p.u['uGL[0]'] && GEOR.nl) gl.uniform4fv(p.u['uGL[0]'], GEOR.lights);
}
function geoGrab() {                         // a snapshot of everything drawn so far, for the titans to look through
  const w = fx.w, h = fx.h;
  if (!GEOR.grab || GEOR.grab.w !== w || GEOR.grab.h !== h) {
    gl.activeTexture(gl.TEXTURE6);
    if (GEOR.grab) { gl.deleteTexture(GEOR.grab.t); gl.deleteFramebuffer(GEOR.grab.f); }
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    GEOR.grab = { t, f, w, h }; gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
  }
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);   // never read and write the snapshot at once
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fx.ms); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, GEOR.grab.f); gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fx.ms); stats.calls++; GEOR.grabs++; return GEOR.grab.t;
}
function drawGeo() {                         // the lining: small glowing crystals, near ones as meshes
  const E = cam.eye; if (!GEOR.inst || !GEOR.inGeo || CAVR.off.geo) return;
  const P = cam.planes; setCommon(pCrys); GEOR.tris = 0;
  for (const g of GEOR.ranges) {
    if (!classify(P, g.mn[0], g.mn[1], g.mn[2], g.mx[0], g.mx[1], g.mx[2], 0)) continue;
    const cx = Math.max(g.mn[0], Math.min(E[0], g.mx[0])), cy = Math.max(g.mn[1], Math.min(E[1], g.mx[1])), cz = Math.max(g.mn[2], Math.min(E[2], g.mx[2])), d = Math.hypot(cx - E[0], cy - E[1], cz - E[2]);
    if (d > GEOQ.meshR) continue;
    const m = d < GEOQ.hiR ? g.kit.hi : g.kit.lo, n = Math.max(1, Math.round(g.count * (d < GEOQ.hiR ? 1 : GEOQ.druse))); gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, GEOR.inst);
    for (let q = 3; q <= 5; q++) gl.vertexAttribPointer(q, 4, gl.FLOAT, false, 48, g.first * 48 + (q - 3) * 16);
    gl.drawElementsInstanced(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0, n); stats.cave += m.tris * n; stats.calls++; stats.submitted += m.tris * n; GEOR.tris += m.tris * n;
  }
  gl.bindVertexArray(null);
}
function drawTitans(useFx) {                 // the titans: see-through, drawn after everything solid, far ones first
  const E = cam.eye; GEOR.grabs = 0; if (!GEOR.tinst || !GEOR.inGeo || CAVR.off.titan) return;
  const P = cam.planes, go = !!(useFx && fx.ok);
  const order = GEOR.titans.filter(q => classify(P, q.mid[0] - q.rad, q.mid[1] - q.rad, q.mid[2] - q.rad, q.mid[0] + q.rad, q.mid[1] + q.rad, q.mid[2] + q.rad, 0))
    .map(q => [Math.hypot(q.mid[0] - E[0], q.mid[1] - E[1], q.mid[2] - E[2]) - q.rad * 0.5, q]).sort((a, b) => b[0] - a[0]);
  if (!order.length) return;
  if (go) { gl.disable(gl.BLEND); gl.depthMask(true); } else { gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(true); }
  const setup = grab => { setCommon(pTitan); geoUniforms(pTitan); gl.uniform2f(pTitan.u.uRes, go ? fx.w : canvas.width, go ? fx.h : canvas.height); gl.uniform1i(pTitan.u.uGrab, 6); gl.uniform1f(pTitan.u.uGrabOn, grab ? 1 : 0); gl.uniform1i(pTitan.u.uSteps, GEOQ.steps);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, grab); gl.activeTexture(gl.TEXTURE0); };
  let grab = go ? geoGrab() : null, again = !go; setup(grab);
  for (const [d, q] of order) {
    if (!again && d < 70) { again = true; grab = geoGrab(); setup(grab); }   // a fresh snapshot, so the near titans show the far ones through them
    const m = d < 150 ? q.mesh.hi : q.mesh.lo; gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, GEOR.tinst);
    for (let k = 3; k <= 5; k++) gl.vertexAttribPointer(k, 4, gl.FLOAT, false, 48, q.first * 48 + (k - 3) * 16);
    gl.drawElementsInstanced(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0, 1); stats.cave += m.tris; stats.calls++; stats.submitted += m.tris;
  }
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); gl.bindVertexArray(null);
  gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false);   // as the water pass left it
}
function drawGeoFx() {
  if (!GEOR.inGeo) return;
  if (GEOR.pool && !CAVR.off.water) { gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false); setCommon(pLake); geoUniforms(pLake); gl.bindVertexArray(GEOR.pool.vao); stats.cave += drawElems(GEOR.pool.count, gl.UNSIGNED_INT, 0);
    if (GEOR.surf && GEOR.tun) { gl.bindVertexArray(GEOR.surf.vao); stats.cave += drawElems(GEOR.surf.count, gl.UNSIGNED_INT, 0); } }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
  if (GEOR.pts && !CAVR.off.geo) {           // the far lining as glitter
    gl.useProgram(pGeoPt.p); gl.uniformMatrix4fv(pGeoPt.u.uVP, false, cam.vp32); gl.uniform3fv(pGeoPt.u.uCam, cam.eye); gl.uniform1f(pGeoPt.u.uPx, canvas.height / 900); gl.uniform4f(pGeoPt.u.uGS, geoTime(), GEOR.seen ? 1 : 0, GEOC.pool[0], GEOC.pool[1]);
    gl.bindVertexArray(GEOR.pts); const P = cam.planes, E = cam.eye;
    for (const g of GEOR.ranges) { if (!classify(P, g.mn[0], g.mn[1], g.mn[2], g.mx[0], g.mx[1], g.mx[2], 0)) continue; if (Math.hypot(g.c[0] - E[0], g.c[1] - E[1], g.c[2] - E[2]) < 40) continue; gl.drawArrays(gl.POINTS, g.first, g.count); stats.calls++; }
  }
  if (GEOR.motes && !CAVR.off.life) {
    gl.useProgram(pSpore.p); gl.uniformMatrix4fv(pSpore.u.uVP, false, cam.vp32); gl.uniform1f(pSpore.u.uT, state.time); gl.uniform3fv(pSpore.u.uCam, cam.eye); gl.uniform1f(pSpore.u.uPx, canvas.height / 900);
    gl.bindVertexArray(GEOR.motes); gl.drawArrays(gl.POINTS, 0, GEOR.nMotes); stats.calls++;
  }
  gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
}
