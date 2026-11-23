/* ======================================================================================
   CAVES, Level 1: an old mine shaft near the dam drops into a mine that broke into natural caves.
   The cave is built from the same kind of recipe as the canyon: shapes in CaveLib, meshed piece by piece
   in background workers as you get near. Nothing underground is drawn from the surface, and nothing on the
   surface is drawn from underground.
   ====================================================================================== */
const MINE_AT = [1444, 1486];
const CV = CaveLib({ sx: MINE_AT[0], sz: MINE_AT[1], top: T.height(MINE_AT[0], MINE_AT[1]) });
const CAVE_CH = CV.CH, HOLE = 2.0, BATT_SECS = params.get('battery') === 'fast' ? 45 : 900, LOD0_R = 26;
const cave = {
  under: false, camUnder: false, surface: true, visible: false, sky: true, ceil: 1e9,
  flash: 0, pday: 0, expo: 3.2, flP: [0, 0, 0], flD: [0, 0, -1],
  batt: 100, spares: 0, dead: false, darkWalk: 0, passing: false, picked: [false, false, false, false],
  ch: [], byKey: new Map(), ready: [], workers: [], mode: 'workers', fixed: null, lineMesh: null, lineDirty: false, lineT: 0
};
const line = { pts: [], left: 0, reel: 0, active: false, last: -1, segStart: 0, segLen: 0, warn: 0 };
const PICKS = [{ kind: 'reel', at: CV.floorNear(3.5, -54, 2.5) }, { kind: 'batt', at: CV.floorNear(66, -54, -70) }, { kind: 'batt', at: CV.floorNear(172, -66, -150) }, { kind: 'batt', at: CV.floorNear(392, -66, 112) }];
const CRATE = [MINE_AT[0] + 3.7, 0, MINE_AT[1] + 1.2];
for (const [i, j, k] of CV.chunks) { const c = { i, j, k, key: i + ',' + j + ',' + k, x0: i * CAVE_CH, y0: j * CAVE_CH, z0: k * CAVE_CH, m: [null, null], pend: [false, false], d: 1e9 }; cave.ch.push(c); cave.byKey.set(c.key, c); }
try {
  if (params.has('noworker')) throw new Error('workers disabled for testing');
  const src = 'const C=(' + CaveLib.toString() + ')(' + JSON.stringify({ sx: CV.SX, sz: CV.SZ, top: CV.TOP }) + ');onmessage=function(e){var d=e.data,r=C.meshChunk(d.i,d.j,d.k,d.lod);postMessage({key:d.key,lod:d.lod,buf:r.buf,idx:r.idx,tris:r.tris},[r.buf.buffer,r.idx.buffer]);};';
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 2));
  for (let q = 0; q < n; q++) { const w = new Worker(url); w.busy = 0; w.onmessage = e => { w.busy--; cave.ready.push(e.data); }; w.onerror = () => { w.dead = true; }; cave.workers.push(w); }
} catch (err) { cave.workers = []; cave.mode = 'main thread'; }

// is a body at (x, py, z) below the ground, i.e. in the shaft or the caves?
function caveUnder(x, z, py) { return CV.inShaft(x, z) ? py < CV.TOP + 0.6 : py < groundAt(x, z) - 1.2; }

/* ---------- meshes ---------- */
function caveGpu(buf, idx) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null); return { vao, vb, ib, count: idx.length, tris: idx.length / 3 };
}
function caveFree(m) { if (m.vao) { gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.vb); gl.deleteBuffer(m.ib); } }
function caveStream() {
  for (let n = 0, t0 = performance.now(); n < 8 && cave.ready.length && performance.now() - t0 < 6; n++) {
    const r = cave.ready.shift(), c = cave.byKey.get(r.key); c.pend[r.lod] = false;
    if (!c.m[r.lod]) c.m[r.lod] = r.tris ? caveGpu(r.buf, r.idx) : { count: 0, tris: 0 };
  }
  const E = cam.eye, want = [];
  for (const c of cave.ch) {
    const dx = Math.max(c.x0 - E[0], 0, E[0] - c.x0 - CAVE_CH), dy = Math.max(c.y0 - E[1], 0, E[1] - c.y0 - CAVE_CH), dz = Math.max(c.z0 - E[2], 0, E[2] - c.z0 - CAVE_CH);
    c.d = Math.hypot(dx, dy, dz);
    if (cave.visible && c.d < LOD0_R && !c.m[0] && !c.pend[0]) want.push([c.d - 1000, 0, c]);
    if (!c.m[1] && !c.pend[1]) want.push([cave.visible && c.d < 180 ? c.d : 1e5 + c.d, 1, c]);   // the whole level in rough form, nearest first
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
}

/* ---------- the fixed pieces: timbered shaft, ladder, mine timbers and rails ---------- */
function caveHash(a, b) { return T.hash(Math.round(a * 10), Math.round(b * 10), 4242) / 4294967296 % 1; }
function caveBuildFixed(shaftTop) {
  const V = [], I = []; let dayNow = 0;
  const vx = (x, y, z, nx, ny, nz, k) => { V.push(x, y, z, nx, ny, nz, dayNow, k); return V.length / 8 - 1; };
  const quad = (a, b, c, d) => I.push(a, b, c, a, c, d);
  function obox(c, A, h, k) {                       // centre, three unit axes, half sizes
    dayNow = CV.dayAt(c[0], c[1], c[2], 0, 1, 0);
    for (let s = 0; s < 3; s++) for (const sg of [-1, 1]) {
      const n = A[s].map(v => v * sg), u = A[(s + 1) % 3], w = A[(s + 2) % 3], hu = h[(s + 1) % 3], hw = h[(s + 2) % 3], o = c.map((v, q) => v + n[q] * h[s]);
      const id = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => vx(o[0] + u[0] * hu * a + w[0] * hw * b, o[1] + u[1] * hu * a + w[1] * hw * b, o[2] + u[2] * hu * a + w[2] * hw * b, n[0], n[1], n[2], k));
      quad(id[0], id[1], id[2], id[3]);
    }
  }
  function beam(a, b, w, k) { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]), f = norm(d), s = norm(cross(f, Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, f); obox([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [s, f, u], [w / 2, L / 2, w / 2], k); }
  const SX = CV.SX, SZ = CV.SZ, W = CV.SHW, yb = -26;
  // shaft walls (the cave meshes take over below yb)
  for (const [ax, sg] of [[0, 1], [0, -1], [2, 1], [2, -1]]) {
    const rows = Math.ceil((shaftTop - yb) / 1.5), cols = 4, base = V.length / 8;
    for (let r = 0; r <= rows; r++) {
      const y = yb + (shaftTop - yb) * r / rows; dayNow = CV.dayK(y) * 0.73;
      for (let c = 0; c <= cols; c++) { const t = -W + 2 * W * c / cols; if (ax === 0) vx(SX + sg * W, y, SZ + t, -sg, 0, 0, 0.5); else vx(SX + t, y, SZ + sg * W, 0, 0, -sg, 0.5); }
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = base + r * (cols + 1) + c; quad(a, a + 1, a + cols + 2, a + cols + 1); }
  }
  // cribbing: a timber set every 2.1 m, some rotted away
  for (let y = -48; y < shaftTop - 1.2; y += 2.1) {
    if (caveHash(y, 1) < 0.12) continue;
    for (const sg of [-1, 1]) { beam([SX + sg * 1.8, y, SZ - 2.05], [SX + sg * 1.8, y, SZ + 2.05], 0.24, 2); beam([SX - 2.05, y + 0.25, SZ + sg * 1.8], [SX + 2.05, y + 0.25, SZ + sg * 1.8], 0.24, 2); }
  }
  // an old ladder down one wall, broken in places
  const lz = SZ - W + 0.3;
  for (let y0 = -56.3; y0 < shaftTop - 0.5; y0 += 6) {
    const y1 = Math.min(y0 + 6, shaftTop - 0.3); if (caveHash(y0, 2) < 0.22) continue;
    for (const sx of [-0.27, 0.27]) beam([SX + sx, y0, lz], [SX + sx, y1, lz], 0.07, 2);
    for (let y = y0 + 0.3; y < y1; y += 0.42) if (caveHash(y, 3) > 0.12) beam([SX - 0.3, y, lz], [SX + 0.3, y, lz], 0.05, 2);
  }
  // mine drifts: timber sets, rails and ties
  CV.minePaths.forEach((pts, pi) => {
    for (let q = 0; q < pts.length - 1; q++) {
      const a = pts[q], b = pts[q + 1], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz, pz = ux;
      for (let s = (pi === 0 && q === 0) ? 8 : 3; s < L - 1; s += 2.4) {
        const t = s / L, x = a[0] + dx * t, z = a[2] + dz * t, f = a[1] + (b[1] - a[1]) * t; if (caveHash(x, z) < 0.1) continue;
        beam([x + px * 1.95, f - 0.1, z + pz * 1.95], [x + px * 1.95, f + 3.3, z + pz * 1.95], 0.26, 2); beam([x - px * 1.95, f - 0.1, z - pz * 1.95], [x - px * 1.95, f + 3.3, z - pz * 1.95], 0.26, 2);
        beam([x + px * 2.15, f + 3.42, z + pz * 2.15], [x - px * 2.15, f + 3.42, z - pz * 2.15], 0.28, 2);
      }
      for (const o of [-0.5, 0.5]) beam([a[0] + px * o, a[1] + 0.13, a[2] + pz * o], [b[0] + px * o, b[1] + 0.13, b[2] + pz * o], 0.08, 3);
      for (let s = 0.4; s < L; s += 0.8) { const t = s / L; obox([a[0] + dx * t, a[1] + (b[1] - a[1]) * t + 0.05, a[2] + dz * t], [[px, 0, pz], [0, 1, 0], [ux, 0, uz]], [0.8, 0.05, 0.1], 2); }
      if (pi === 0 && q === 3) {               // an ore cart left near the end of the main drift, and the collapse where it broke through
        const t = 0.35, x = a[0] + dx * t, z = a[2] + dz * t, f = a[1] + (b[1] - a[1]) * t, A = [[px, 0, pz], [0, 1, 0], [ux, 0, uz]];
        obox([x, f + 0.95, z], A, [0.6, 0.42, 0.9], 3);
        for (const sp of [-0.45, 0.45]) for (const sa of [-0.55, 0.55]) obox([x + px * sp + ux * sa, f + 0.32, z + pz * sp + uz * sa], A, [0.06, 0.22, 0.22], 3);
        const e = b; beam([e[0] - ux * 3 + px * 1.9, e[1] + 0.2, e[2] - uz * 3 + pz * 1.9], [e[0] - ux * 1.2 - px * 1.2, e[1] + 2.6, e[2] - uz * 1.2 - pz * 1.2], 0.28, 2);
        beam([e[0] - ux * 4.5 - px * 1.9, e[1] + 0.15, e[2] - uz * 4.5 - pz * 1.9], [e[0] - ux * 2 + px * 0.6, e[1] + 0.9, e[2] - uz * 2 + pz * 0.6], 0.26, 2);
      }
    }
  });
  // a few crates in the shaft station
  const st = CV.STATION;
  for (const [dx, dz, s] of [[-4.6, 3.4, 0.5], [-3.6, 3.7, 0.4], [-4.4, 2.3, 0.35], [4.8, -3.9, 0.45]]) obox([st.x + dx, st.floor + s, st.z + dz], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [s, s, s], 2);
  return caveGpu(new Float32Array(V), new Uint32Array(I));
}

/* ---------- the collar, windlass and supply crate on the surface ---------- */
function caveBuildCollar() {
  const SX = CV.SX, SZ = CV.SZ, b = new MB(), WOOD = [0.44, 0.32, 0.21], OLD = [0.37, 0.29, 0.22], RUST = [0.45, 0.27, 0.16, 0.15], g = (x, z) => T.height(x, z);
  let gmin = 1e9, gmax = -1e9;
  for (let a = 0; a < 64; a++) for (const r of [1.9, 2.4, 3.0]) { const h = g(SX + r * Math.cos(a / 64 * Math.PI * 2), SZ + r * Math.sin(a / 64 * Math.PI * 2)); gmin = Math.min(gmin, h); gmax = Math.max(gmax, h); }
  const side = (cx, cz, sx, sz) => { let hi = -1e9; for (let k = -4; k <= 4; k++) hi = Math.max(hi, g(cx + sx * k / 8, cz + sz * k / 8)); const y0 = gmin - 1.8, y1 = hi + 0.28; b.box(cx, (y0 + y1) / 2, cz, sx, y1 - y0, sz, WOOD); return y1; };
  const yN = side(SX, SZ - 2.3, 5.4, 0.8), yS = side(SX, SZ + 2.3, 5.4, 0.8), yW = side(SX - 2.3, SZ, 0.8, 3.8), yE = side(SX + 2.3, SZ, 0.8, 3.8);
  // windlass over the hole, its rope frayed and hanging
  const yt = Math.max(yW, yE) + 1.15;
  for (const sg of [-1, 1]) { const yb0 = sg < 0 ? yW : yE; b.beam([SX + sg * 2.45, yb0 - 0.1, SZ - 0.5], [SX + sg * 2.45, yt + 0.2, SZ - 0.5], 0.22, OLD); b.beam([SX + sg * 2.45, yb0 - 0.1, SZ + 0.5], [SX + sg * 2.45, yt + 0.2, SZ + 0.5], 0.22, OLD); b.box(SX + sg * 2.45, yt + 0.25, SZ, 0.3, 0.14, 1.3, OLD); }
  b.m = mulAll(tr(SX, yt, SZ), rotZ(Math.PI / 2)); b.lathe([[0.17, -2.6], [0.17, 2.6]], 10, OLD); b.m = null;
  b.beam([SX + 2.6, yt, SZ], [SX + 3.05, yt, SZ], 0.07, RUST); b.beam([SX + 3.05, yt, SZ], [SX + 3.05, yt - 0.45, SZ], 0.06, RUST);
  b.beam([SX + 0.3, yt - 0.15, SZ], [SX + 0.32, yt - 7.5, SZ + 0.05], 0.045, [0.55, 0.47, 0.34]);
  // supply crate with a battery stencil
  const cy = g(CRATE[0], CRATE[2]); CRATE[1] = cy;
  b.m = mulAll(tr(CRATE[0], cy, CRATE[2]), rotY(0.35)); b.box(0, 0.32, 0, 1.0, 0.64, 0.66, WOOD); b.box(0, 0.66, 0, 1.06, 0.06, 0.72, OLD); b.box(0, 0.36, 0.335, 0.5, 0.18, 0.02, [0.9, 0.72, 0.12]); b.box(0.29, 0.36, 0.335, 0.06, 0.08, 0.02, [0.9, 0.72, 0.12]); b.m = null;
  // a couple of loose boards
  b.m = mulAll(tr(SX - 3.6, g(SX - 3.6, SZ + 1.5) + 0.05, SZ + 1.5), rotY(0.7)); b.box(0, 0, 0, 2.6, 0.06, 0.28, OLD); b.m = null;
  b.m = mulAll(tr(SX + 1.0, g(SX + 1.0, SZ - 3.7) + 0.05, SZ - 3.7), rotY(-0.2), rotZ(0.1)); b.box(0, 0, 0, 2.2, 0.06, 0.3, OLD); b.m = null;
  const m = b.finish();
  props.push({ hi: m, lo: m, m: new Float32Array(tr(0, 0, 0)), pos: [SX, gmax, SZ], r: 6, placed: true }); assetTris += m.tris;
  return Math.max(yN, yS, yW, yE) - 0.05;
}
function caveInit() {
  const top = caveBuildCollar();
  cave.fixed = caveBuildFixed(top);
  cave.lineMesh = { vao: gl.createVertexArray(), vb: gl.createBuffer(), ib: gl.createBuffer(), count: 0 };
  gl.bindVertexArray(cave.lineMesh.vao); gl.bindBuffer(gl.ARRAY_BUFFER, cave.lineMesh.vb);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cave.lineMesh.ib); gl.bindVertexArray(null);
}

/* ---------- the guideline: laid as you go, stays in the cave, arrows point the way out ---------- */
function lineNearest(x, y, z, upto) {
  const P = line.pts, n = upto === undefined ? P.length : upto; let bi = -1, bd = 1e18;
  for (let i = 0; i < n; i++) { const p = P[i], d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) + (p.z - z) * (p.z - z); if (d < bd) { bd = d; bi = i; } }
  return [bi, Math.sqrt(bd)];
}
function lineUpdate() {
  if (!line.reel || !cave.under) return;
  const X = state.px, Y = state.py + 0.55, Z = state.pz;
  if (line.active) {
    const a = line.pts[line.last], dx = X - a.x, dy = Y - a.y, dz = Z - a.z, dist = Math.hypot(dx, dy, dz);
    if (line.segLen > 5 && lineNearest(X, Y, Z, line.segStart)[1] < 1.8) { line.active = false; return; }   // met older line: tie in
    if (dist >= 2) {
      const step = Math.min(dist, line.left), k = step / dist;
      line.pts.push({ x: a.x + dx * k, y: a.y + dy * k, z: a.z + dz * k, p: line.last, d: a.d + step });
      line.last = line.pts.length - 1; line.left -= step; line.segLen += step; cave.lineDirty = true;
      if (line.left <= 100 && line.warn < 1) { line.warn = 1; toast('Line: 100 m left on the reel', 4); tone([620, 520], 0.25, 'triangle', 0.12); }
      if (line.left <= 25 && line.warn < 2) { line.warn = 2; toast('Line: 25 m left', 4); tone([620, 520, 620], 0.2, 'triangle', 0.14); }
      if (line.left <= 0.01) { line.left = 0; line.active = false; line.warn = 3; toast('Line out. The reel is empty, so the line ends here.', 6); tone([440, 330], 0.5, 'triangle', 0.16); }
    }
  } else if (line.left > 0) {
    const [ni, nd] = lineNearest(X, Y, Z);
    if (nd > 4) { line.active = true; line.last = ni; line.segStart = line.pts.length; line.segLen = 0; }   // left the line: tie a new branch on
  }
}
function lineRebuild() {
  const P = line.pts, V = [], I = [], r = 0.045, ARROW = 7;
  const vtx = (p, k) => { V.push(p[0], p[1], p[2], k); return V.length / 4 - 1; };
  for (let i = 1; i < P.length; i++) {
    const b = P[i], a = P[b.p]; if (!a) continue;
    const f = norm([b.x - a.x, b.y - a.y, b.z - a.z]), s = norm(cross(f, Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, f), ring = [];
    for (const e of [a, b]) for (const [cs, cu] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) ring.push(vtx([e.x + (s[0] * cs + u[0] * cu) * r, e.y + (s[1] * cs + u[1] * cu) * r, e.z + (s[2] * cs + u[2] * cu) * r], 0));
    for (let q = 0; q < 4; q++) { const q2 = (q + 1) % 4; I.push(ring[q], ring[q2], ring[4 + q2], ring[q], ring[4 + q2], ring[4 + q]); }
    if (Math.floor(b.d / ARROW) !== Math.floor(a.d / ARROW)) {          // a line arrow, pointing back toward the way out
      const t = [-f[0], -f[1], -f[2]], tip = [b.x + t[0] * 0.2, b.y + t[1] * 0.2, b.z + t[2] * 0.2];
      for (const side of [s, u]) { const p0 = vtx(tip, 1), p1 = vtx([b.x - t[0] * 0.12 + side[0] * 0.13, b.y - t[1] * 0.12 + side[1] * 0.13, b.z - t[2] * 0.12 + side[2] * 0.13], 1), p2 = vtx([b.x - t[0] * 0.12 - side[0] * 0.13, b.y - t[1] * 0.12 - side[1] * 0.13, b.z - t[2] * 0.12 - side[2] * 0.13], 1); I.push(p0, p1, p2); }
    }
  }
  const m = cave.lineMesh; gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.DYNAMIC_DRAW);
  m.count = I.length; cave.lineDirty = false;
}

/* ---------- per frame: battery, pickups, the line, passing out in the dark ---------- */
function caveUpdate(dt) {
  const px = state.px, py = state.py, pz = state.pz;
  PICKS.forEach((pk, i) => {
    if (cave.picked[i] || !cave.under) return; const a = pk.at;
    if (Math.hypot(a[0] - px, a[2] - pz) > 2.0 || Math.abs(a[1] - py) > 2.4) return;
    cave.picked[i] = true;
    if (pk.kind === 'reel') {
      line.reel = 750; line.left = 750; line.warn = 0; line.pts = [{ x: a[0], y: a[1] + 0.5, z: a[2], p: -1, d: 0 }]; line.active = true; line.last = 0; line.segStart = 1; line.segLen = 0; cave.lineDirty = true;
      toast('Guideline reel: 750 m. It\'s tied off here and lets out as you go. Follow it back if you get lost.', 8);
    } else { cave.spares++; toast('Spare battery found (' + cave.spares + ' carried).', 4); }
    tone([660, 880], 0.35, 'triangle', 0.16); saveGame();
  });
  if (!cave.under && Math.hypot(px - CRATE[0], pz - CRATE[2]) < 3 && Math.abs(py - CRATE[1]) < 3 && cave.batt < 99.5) { cave.batt = 100; cave.dead = false; toast('Fresh battery from the supply crate.', 3); saveGame(); }
  if (cave.under && !cave.dead) {
    cave.batt -= dt * 100 / BATT_SECS;
    if (cave.batt <= 0) {
      if (cave.spares > 0) { cave.spares--; cave.batt = 100; toast('Swapped in a fresh battery (' + cave.spares + ' spare left).', 4); }
      else { cave.batt = 0; cave.dead = true; cave.darkWalk = 0; toast(lineNearest(px, py + 0.55, pz)[1] < 6 ? 'Your light is dead. Follow the glowing line out.' : 'Your light is dead.', 6); tone([300, 200], 0.6, 'sine', 0.18); }
    }
  }
  let fi = cave.under && !cave.dead ? 1 : 0;
  if (fi && cave.batt < 15) { fi *= 0.45 + 0.55 * cave.batt / 15; if (Math.random() < 0.04 + (15 - cave.batt) * 0.012) fi *= 0.12; }
  cave.flash = fi;
  if (cave.under && cave.dead && !cave.passing && state.play) {
    if (!(line.pts.length && lineNearest(px, py + 0.55, pz)[1] < 5)) cave.darkWalk += Math.hypot(state.vx, state.vz) * dt;
    if (cave.darkWalk > 200) {
      cave.passing = true; $('fade').classList.add('on');
      setTimeout(() => { caveTeleport('top'); cave.darkWalk = 0; cave.passing = false; $('fade').classList.remove('on'); toast('You got turned around in the dark… and came to beside the mine shaft.', 7); }, 1900);
    }
  }
  lineUpdate();
  cave.pday = CV.inShaft(px, pz, 0.3) && py > CV.SHB - 2 ? CV.dayK(py + 1) * 0.8 : 0;
}
// where the camera is decides what gets drawn
function caveView(E) {
  const inW = E[0] > 0 && E[0] < WORLD && E[2] > 0 && E[2] < WORLD, gE = inW ? T.height(E[0], E[2]) : -1e9, inSh = CV.inShaft(E[0], E[2]);
  cave.camUnder = inSh ? E[1] < CV.TOP - 0.3 : E[1] < gE - 1.0;
  cave.surface = !cave.camUnder || E[1] > CV.TOP - 45;
  cave.visible = cave.camUnder || (Math.hypot(E[0] - CV.SX, E[2] - CV.SZ) < 80 && E[1] < CV.TOP + 80);
  cave.sky = cave.surface || CV.inShaft(E[0], E[2], -0.1);
}
// keep the camera inside the rock: pull it in toward the character when a wall is in the way
function caveCamera(tgt, eye) {
  tgt[1] = Math.min(tgt[1], Math.max(state.py + 1.2, cave.ceil - 0.5));
  const dx = eye[0] - tgt[0], dy = eye[1] - tgt[1], dz = eye[2] - tgt[2], L = Math.hypot(dx, dy, dz); if (L < 0.01) return;
  const ux = dx / L, uy = dy / L, uz = dz / L; let t = 0.2;
  for (let it = 0; it < 140 && t < L; it++) { const s = CV.sdf(tgt[0] + ux * t, tgt[1] + uy * t, tgt[2] + uz * t); if (s > -0.35) { t = Math.max(0.25, t - 0.3); break; } t += Math.max(-s * 0.8, 0.08); }
  if (t < L) { eye[0] = tgt[0] + ux * t; eye[1] = tgt[1] + uy * t; eye[2] = tgt[2] + uz * t; }
}
function caveTeleport(where) {
  if (where === 'top') { state.px = CV.SX + 3.4; state.pz = CV.SZ - 2.6; state.py = groundAt(state.px, state.pz); state.yaw = Math.atan2(3.4, -2.6) + Math.PI; state.heading = Math.atan2(-3.4, 2.6); state.pitch = 0.5; }
  else { state.px = CV.SX + 2.5; state.pz = CV.SZ - 1.5; state.py = CV.floorAt(state.px, -55, state.pz); state.yaw = -Math.PI / 2; state.heading = Math.PI / 2; state.pitch = 0.15; }
  state.vx = state.vy = state.vz = 0; state.grounded = true; state.dist = 9;
}

/* ---------- drawing ---------- */
function drawCave() {
  if (!cave.visible) return;
  setCommon(pCave); gl.disable(gl.CULL_FACE);
  const P = cam.planes;
  for (const c of cave.ch) {
    if (c.d > 180 || !classify(P, c.x0, c.y0, c.z0, c.x0 + CAVE_CH, c.y0 + CAVE_CH, c.z0 + CAVE_CH, 0)) continue;
    const m = (c.d < LOD0_R && c.m[0]) || c.m[1] || c.m[0]; if (!m || !m.count) continue;
    gl.bindVertexArray(m.vao); stats.cave += drawElems(m.count, gl.UNSIGNED_INT, 0);
  }
  if (cave.fixed) { gl.bindVertexArray(cave.fixed.vao); stats.cave += drawElems(cave.fixed.count, gl.UNSIGNED_INT, 0); }
}
function drawCaveFx() {
  if (!cave.visible) return;
  if (cave.lineDirty && state.time - cave.lineT > 0.2) { cave.lineT = state.time; lineRebuild(); }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
  const m = cave.lineMesh;
  if (m && m.count) {
    gl.useProgram(pLine.p); gl.uniformMatrix4fv(pLine.u.uVP, false, cam.vp32); gl.uniform3fv(pLine.u.uFlP, cave.flP); gl.uniform3fv(pLine.u.uFlD, cave.flD); gl.uniform4f(pLine.u.uUG, 0, cave.flash, 0, 0);
    gl.bindVertexArray(m.vao); stats.fx += drawElems(m.count, gl.UNSIGNED_INT, 0);
  }
  gl.useProgram(pGlow.p); gl.uniformMatrix4fv(pGlow.u.uVP, false, cam.vp32);
  const t = state.time;
  PICKS.forEach((pk, i) => {
    if (cave.picked[i]) return; const p = pk.at, bob = 0.5 + 0.08 * Math.sin(t * 2 + i);
    if (pk.kind === 'reel') glowDraw(ring, mulAll(tr(p[0], p[1] + bob, p[2]), rotY(t), rotX(1.2), sc(0.045, 0.045, 0.045)), 1.0, 0.85, 0.3, 1.3, 0);
    else glowDraw(crystal, mulAll(tr(p[0], p[1] + bob, p[2]), rotY(t * 1.5), sc(0.2, 0.28, 0.2)), 1.0, 0.62, 0.12, 1.4, 0);
  });
  gl.depthMask(true); gl.disable(gl.BLEND);
}

/* ---------- saving ---------- */
function caveSave() { return { batt: Math.round(cave.batt * 10) / 10, spares: cave.spares, picked: cave.picked, reel: line.reel, left: Math.round(line.left * 10) / 10, warn: line.warn, pts: line.pts.map(p => [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, Math.round(p.z * 100) / 100, p.p]) }; }
function caveReset() { cave.batt = 100; cave.spares = 0; cave.dead = false; cave.darkWalk = 0; cave.picked = [false, false, false, false]; line.pts = []; line.left = 0; line.reel = 0; line.active = false; line.warn = 0; cave.lineDirty = true; }
function caveLoad(c) {
  caveReset(); if (!c) return;
  cave.batt = +c.batt || 0; cave.spares = c.spares | 0; cave.dead = cave.batt <= 0; if (Array.isArray(c.picked)) cave.picked = cave.picked.map((v, i) => !!c.picked[i]);
  line.reel = c.reel | 0; line.left = +c.left || 0; line.warn = c.warn | 0;
  if (Array.isArray(c.pts)) for (const q of c.pts) { const par = line.pts[q[3]]; line.pts.push({ x: q[0], y: q[1], z: q[2], p: q[3], d: par ? par.d + Math.hypot(q[0] - par.x, q[1] - par.y, q[2] - par.z) : 0 }); }
}
