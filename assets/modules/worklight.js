window.MODDEF = { fn: (function (K) {
  // Deep-expedition work lights. The colony research team (SV-2, unit KR-07) went down cavern by cavern. At each sealed door
  // they left a portable floodlight tower still burning on its own battery, pulled the door's power coupling and carried on.
  // Some couplings lie next to a researcher's dropped pack. Same gear family and palette as work/survey.js.
  'use strict';
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd, cross, dot, norm, sub, add, scale, lerp, along } = K;
  const PI = Math.PI, TAU = PI * 2;
  const cl01 = x => Math.max(0, Math.min(1, x));
  const sh = (c, k) => [cl01(c[0] * k), cl01(c[1] * k), cl01(c[2] * k), c[3] || 0];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] || 0];

  // ---- palette (matches the reskinned surface gear) ---------------------------------------------------------
  const BONE = [0.80, 0.77, 0.68, 0.12], BONE_D = [0.66, 0.63, 0.56, 0.1], SAND = [0.64, 0.56, 0.43, 0.05], HAB = [0.72, 0.70, 0.63, 0.04];
  const ORANGE = [0.94, 0.46, 0.10, 0.1], ORANGE_D = [0.72, 0.34, 0.09, 0.08];
  const GUN = [0.27, 0.28, 0.29, 0.3], GUN_D = [0.17, 0.18, 0.19, 0.22], STEEL = [0.54, 0.55, 0.56, 0.32], ALU = [0.70, 0.71, 0.71, 0.28];
  const OLIVE = [0.40, 0.42, 0.30, 0.05], OLIVE_D = [0.30, 0.32, 0.23, 0.05];
  const BLACK = [0.06, 0.06, 0.06, 0.05], RUBBER = [0.10, 0.10, 0.10, 0.02];
  const GLASS = [0.12, 0.17, 0.21, 0.5], GLASS_L = [0.56, 0.68, 0.70, 0.48];
  const HAZ_Y = [0.92, 0.74, 0.16, 0.05], ST_W = [0.92, 0.90, 0.84, 0.05], ST_K = [0.12, 0.12, 0.11, 0.02];
  const CABLE_O = [0.90, 0.48, 0.14, 0.08], CABLE_K = [0.16, 0.16, 0.17, 0.08], CABLE_L = [0.64, 0.62, 0.54, 0.08];
  const CRYS = [0.42, 0.94, 0.88, 0.45], CRYS_V = [0.68, 0.54, 0.96, 0.45];
  const SCR = [0.36, 0.88, 0.74, 0.3], SCR_D = [0.10, 0.22, 0.21, 0.3], LED_G = [0.40, 1.0, 0.50], LED_R = [1.0, 0.22, 0.10], LENS_L = [0.95, 0.92, 0.80, 0.4];
  const DUST = [0.50, 0.49, 0.50, 0.0], ROCK = [0.47, 0.45, 0.44, 0.03];

  // ---- small helpers ------------------------------------------------------------------------------------------
  function pz(b, cx, cy, z, w, h, col) { b.plate([cx - w / 2, cy - h / 2, z], [cx + w / 2, cy - h / 2, z], [cx + w / 2, cy + h / 2, z], [cx - w / 2, cy + h / 2, z], col); }
  function py(b, cx, y, cz, w, d, col) { b.plate([cx - w / 2, y, cz - d / 2], [cx - w / 2, y, cz + d / 2], [cx + w / 2, y, cz + d / 2], [cx + w / 2, y, cz - d / 2], col); }
  // box with only some faces: mask letters x X y Y z Z = +x -x +y -y +z -z
  function boxM(b, cx, cy, cz, sx, sy, sz, col, mask) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    if (mask.includes('x')) b.plate([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col);
    if (mask.includes('X')) b.plate([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col);
    if (mask.includes('y')) b.plate([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], col);
    if (mask.includes('Y')) b.plate([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col);
    if (mask.includes('z')) b.plate([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col);
    if (mask.includes('Z')) b.plate([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col);
  }
  function rope(b, a, c, sag, r, col, n, segs) { n = n || 10; const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, p = lerp(a, c, t); p[1] -= sag * 4 * t * (1 - t); pts.push(p); } b.tube(pts, r, segs || 4, col); }
  function ring(b, c, axis, R, r, col, n, segs) {
    const pts = []; n = n || 10;
    for (let i = 0; i <= n; i++) { const a = i / n * TAU, p = Math.cos(a) * R, q = Math.sin(a) * R; pts.push(axis === 'y' ? [c[0] + p, c[1], c[2] + q] : axis === 'x' ? [c[0], c[1] + p, c[2] + q] : [c[0] + p, c[1] + q, c[2]]); }
    b.tube(pts, r, segs || 4, col);
  }
  // smooth path through control points (Catmull-Rom), per = samples per span
  function smooth(ctrl, per) {
    const out = [], n = ctrl.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = ctrl[Math.max(i - 1, 0)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(i + 2, n - 1)];
      for (let k = 0; k < per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
    }
    out.push(ctrl[n - 1].slice()); return out;
  }
  function cable(b, ctrl, r, col, per, segs) { b.tube(smooth(ctrl, per || 4), r, segs || 5, col); }
  // flat polygon with its normal turned toward 'out'
  function facet(b, pts, col, out) {
    let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]))); if (dot(n, out) < 0) { n = scale(n, -1); pts = [pts[0]].concat(pts.slice(1).reverse()); }
    const ids = pts.map(p => b.v(p[0], p[1], p[2], n[0], n[1], n[2], col)); for (let i = 1; i < ids.length - 1; i++) b.tri(ids[0], ids[i], ids[i + 1]);
  }
  // faceted crystal shard from base along dir (crisp flat facets)
  function crystal(b, base, dir, len, r, col, seed, sides) {
    sides = sides || 6; const rr = rnd(seed), d = norm(dir), tip = add(base, scale(d, len));
    b.push(mulAll(along(base, tip), tr(0, -len / 2, 0)));
    const s0 = len * (0.6 + 0.15 * rr()), ph = rr() * TAU, R0 = [], R1 = [];
    for (let k = 0; k < sides; k++) { const a = ph + k * TAU / sides, w = r * (0.85 + 0.3 * rr()); R0.push([Math.cos(a) * w * 0.85, 0, Math.sin(a) * w * 0.85]); R1.push([Math.cos(a) * w, s0, Math.sin(a) * w]); }
    const ap = [r * 0.2 * (rr() - 0.5), len, r * 0.2 * (rr() - 0.5)];
    for (let k = 0; k < sides; k++) { const k2 = (k + 1) % sides; b.plate(R0[k2], R0[k], R1[k], R1[k2], col); facet(b, [R1[k2], R1[k], ap], sh(col, 1.1), [R1[k][0] + R1[k2][0], r, R1[k][2] + R1[k2][2]]); }
    b.pop();
  }
  // copy a sub-builder onto the ground (its lowest point at y = 0)
  function dropTo(b, s, x, z, ay) { const bb = s.bounds(); b.push(mulAll(tr(x, -bb.min[1], z), rotY(ay || 0))); b.merge(s); b.pop(); }

  // ---- stencil font (3 x 5 blocks): real readable unit codes -------------------------------------------------
  const FONT = {
    A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
    E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'], G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
    I: ['111', '010', '010', '010', '111'], J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
    M: ['101', '111', '111', '101', '101'], N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'], P: ['110', '101', '110', '100', '100'],
    Q: ['010', '101', '101', '110', '011'], R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
    U: ['101', '101', '101', '101', '111'], V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'],
    Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
    0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['110', '001', '010', '100', '111'], 3: ['110', '001', '010', '001', '110'],
    4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '110', '001', '110'], 6: ['011', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
    8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '110'],
    '-': ['000', '000', '111', '000', '000'], '.': ['000', '000', '000', '000', '010'], '/': ['001', '001', '010', '100', '100'], ' ': ['000', '000', '000', '000', '000'], '!': ['010', '010', '010', '000', '010']
  };
  const textW = (s, h) => (s.length * 4 - 1) * h / 5;
  // text facing +Z at depth z, reading toward +X; (x, y) = left edge (or centre when centre is true) and vertical middle
  function text(b, s, x, y, z, h, col, centre) {
    const p = h / 5; if (centre) x -= textW(s, h) / 2;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]] || FONT[' '], cx = x + i * 4 * p;
      for (let r = 0; r < 5; r++) { const row = g[r]; let k = 0; while (k < 3) { if (row[k] === '1') { let e = k; while (e + 1 < 3 && row[e + 1] === '1') e++; pz(b, cx + (k + e + 1) / 2 * p, y + h / 2 - (r + 0.5) * p, z, (e - k + 1) * p, p * 0.84, col); k = e + 1; } else k++; } }
    }
  }
  function hazard(b, x0, x1, y, z, h, n, cA, cB) { const w = (x1 - x0) / n; for (let i = 0; i < n; i++) pz(b, x0 + (i + 0.5) * w, y, z, w, h, i % 2 ? (cB || BLACK) : (cA || HAZ_Y)); }
  // diagonal hazard chevrons (parallelograms) facing +Z
  function chevrons(b, x0, x1, y, z, h, n, cA, cB) {
    const w = (x1 - x0) / n, k = h * 0.6;
    for (let i = 0; i < n; i++) { const a = x0 + i * w; b.plate([a, y - h / 2, z], [a + w, y - h / 2, z], [a + w + k, y + h / 2, z], [a + k, y + h / 2, z], i % 2 ? (cB || BLACK) : (cA || HAZ_Y)); }
  }
  function sign(b, cx, cy, z, w, h, bg, s, fg, th) { pz(b, cx, cy, z, w, h, bg); text(b, s, cx, cy, z + 0.002, th, fg, true); }

  // apply a matrix to a point (for attach points)
  const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  const MUD = [0.30, 0.27, 0.24, 0.06], DAMP = [0.22, 0.22, 0.22, 0.35];
  const LENS = [0.95, 0.93, 0.85, 0.3], CELL = [0.6, 0.95, 1.0, 0.4];
  // flat strap lying along a path near the ground (a ribbon facing up)
  function strap(b, pts, w, col) {
    let prev = null;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(i - 1, 0)], c = pts[Math.min(i + 1, pts.length - 1)], d = norm([c[0] - a[0], 0, c[2] - a[2]]), s = [-d[2] * w / 2, 0, d[0] * w / 2], p = pts[i];
      const l = b.v(p[0] - s[0], p[1], p[2] - s[2], 0, 1, 0, col), r = b.v(p[0] + s[0], p[1], p[2] + s[2], 0, 1, 0, col);
      if (prev) b.quad(prev[0], l, r, prev[1]); prev = [l, r];
    }
  }
  // soft rounded box (bags, pockets): superellipse surface, centre cx,cy,cz, full sizes sx,sy,sz
  function softBox(b, cx, cy, cz, sx, sy, sz, col, nu, nv, e) {
    e = e || 0.35; const sp = (v, k) => Math.sign(v) * Math.pow(Math.abs(v), k);
    b.push(tr(cx, cy, cz));
    b.surf(nu || 12, nv || 8, (u, v) => { const t = u * TAU, p = PI * v - PI / 2, cp = Math.cos(p); return [sx / 2 * sp(cp, e) * sp(Math.cos(t), e), sy / 2 * sp(Math.sin(p), e), sz / 2 * sp(cp, e) * sp(Math.sin(t), e)]; }, col, true);
    b.pop();
  }

  // =========================================================================================================
  // 1. FLOOD MAST: skid with outriggers, battery pack, telescoping mast, crossbar with two big lamp heads
  // =========================================================================================================
  const MZ = 0.22, BAR_Y = 3.06, PIV_Y = 3.27, PIV_Z = MZ + 0.04, TILT = 20 * PI / 180, LX = 0.34;
  const LW = 0.5, LH = 0.34, LD = 0.16;                       // lamp housing size
  const lampM = s => mulAll(tr(s * LX, PIV_Y, PIV_Z), rotX(TILT));
  const FLOOD_ATTACH = [-1, 1].map(s => xf(lampM(s), [0, 0, LD / 2 + 0.006 + 0.02]).map(v => +v.toFixed(3)));
  const OUT = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const CABLE_RUN = [[0.24, 0.3, -0.57], [0.3, 0.13, -0.66], [0.36, 0.03, -0.76], [0.52, 0.026, -0.82]];
  const CABLE_OFF = [[-0.02, 0.026, -1.32], [-0.2, 0.026, -1.6], [-0.12, 0.026, -1.95], [0.1, 0.026, -2.25], [0.05, 0.026, -2.6], [-0.1, 0.026, -2.95]];
  const COIL = [0.2, -1.06];

  function lampHead(b, s, detail) {
    b.push(lampM(s));
    const fz = LD / 2;
    if (!detail) {
      b.box(0, 0, 0, LW, LH, LD, GUN); pz(b, 0, 0, fz + 0.006, LW - 0.06, LH - 0.06, LENS);
      b.box(0, LH / 2 + 0.01, fz + 0.05, LW + 0.02, 0.02, 0.12, GUN_D);
      b.pop(); return;
    }
    // housing: bone shell, darker back with heat fins
    b.box(0, 0, -0.01, LW, LH, LD - 0.02, BONE_D);
    for (let k = 0; k < 7; k++) b.box(-LW / 2 + 0.05 + k * (LW - 0.1) / 6, 0, -fz - 0.03, 0.014, LH - 0.06, 0.05, GUN_D);
    b.box(0, 0, -fz - 0.005, LW - 0.04, LH - 0.04, 0.01, GUN);
    // bezel frame around the lens
    const T = 0.035;
    for (const sy of [-1, 1]) b.box(0, sy * (LH / 2 - T / 2), fz, LW + 0.012, T, 0.03, GUN);
    for (const sx of [-1, 1]) b.box(sx * (LW / 2 - T / 2), 0, fz, T, LH - 2 * T, 0.03, GUN);
    // lens: big pale face, slightly inset
    pz(b, 0, 0, fz + 0.006, LW - 2 * T + 0.004, LH - 2 * T + 0.004, LENS);
    // protective grille: three vertical bars, one horizontal bar, standing proud of the lens
    for (const gx of [-0.105, 0, 0.105]) b.box(gx, 0, fz + 0.028, 0.012, LH - 2 * T + 0.01, 0.012, GUN_D);
    b.box(0, 0, fz + 0.04, LW - 2 * T + 0.01, 0.012, 0.012, GUN_D);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.box(sx * (LW / 2 - T / 2), sy * (LH / 2 - T / 2), fz + 0.03, 0.02, 0.02, 0.03, GUN_D);
    // visor: top hood plus two side flaps, hazard edge
    const VZ = fz + 0.015, VL = 0.15;
    b.plate([-LW / 2 - 0.01, LH / 2 + 0.008, VZ], [LW / 2 + 0.01, LH / 2 + 0.008, VZ], [LW / 2 + 0.03, LH / 2 - 0.02, VZ + VL], [-LW / 2 - 0.03, LH / 2 - 0.02, VZ + VL], ORANGE);
    b.plate([-LW / 2 - 0.03, LH / 2 - 0.026, VZ + VL], [LW / 2 + 0.03, LH / 2 - 0.026, VZ + VL], [LW / 2 + 0.01, LH / 2 + 0.002, VZ], [-LW / 2 - 0.01, LH / 2 + 0.002, VZ], ORANGE_D);
    b.push(mulAll(tr(0, LH / 2 - 0.023, VZ + VL + 0.001)));
    for (let k = 0; k < 10; k++) { const w = (LW + 0.06) / 10, x0 = -(LW + 0.06) / 2 + k * w; b.plate([x0, -0.006, 0], [x0 + w, -0.006, 0], [x0 + w + 0.008, 0.006, 0], [x0 + 0.008, 0.006, 0], k % 2 ? BLACK : HAZ_Y); }
    b.pop();
    for (const sx of [-1, 1]) {
      const x = sx * (LW / 2 + 0.006), P = [[x, LH / 2, VZ], [x, -LH / 2 + 0.06, VZ], [x + sx * 0.035, -LH / 2 + 0.1, VZ + 0.1], [x + sx * 0.03, LH / 2 - 0.02, VZ + VL]];
      if (sx > 0) b.plate(P[0], P[1], P[2], P[3], GUN); else b.plate(P[3], P[2], P[1], P[0], GUN);
      b.plate(sx > 0 ? P[3] : P[0], sx > 0 ? P[2] : P[1], sx > 0 ? P[1] : P[2], sx > 0 ? P[0] : P[3], GUN_D);
    }
    // top: carry handle and stencil
    for (const hx of [-0.12, 0.12]) b.box(hx, LH / 2 + 0.03, -0.03, 0.02, 0.06, 0.02, GUN_D);
    b.cyl([-0.13, LH / 2 + 0.06, -0.03], [0.13, LH / 2 + 0.06, -0.03], 0.012, 0.012, 6, RUBBER);
    b.push(mulAll(tr(0, LH / 2 + 0.001, -0.01), rotX(-PI / 2))); text(b, s < 0 ? 'L1' : 'L2', -0.17, 0, 0, 0.045, ST_K); b.pop();
    // side trunnion hubs on the yoke pivots, with orange tilt knobs
    for (const sx of [-1, 1]) {
      b.cyl([sx * LW / 2, 0, 0], [sx * (LW / 2 + 0.03), 0, 0], 0.045, 0.045, 8, GUN_D);
      b.cyl([sx * (LW / 2 + 0.03), 0, 0], [sx * (LW / 2 + 0.065), 0, 0], 0.028, 0.034, 6, ORANGE);
    }
    // rear cable gland
    b.cyl([0.14, -0.08, -fz - 0.05], [0.14, -0.08, -fz - 0.09], 0.022, 0.018, 8, GUN_D);
    b.pop();
  }

  function buildFlood(detail) {
    const b = new MB();
    if (!detail) {
      for (const s of [-1, 1]) b.box(s * 0.45, 0.06, 0, 0.1, 0.12, 1.3, GUN_D);
      for (const [sx, sz] of OUT) { b.beam([sx * 0.45, 0.13, sz * 0.55], [sx * 1.0, 0.13, sz * 1.0], 0.07, ORANGE); b.box(sx * 1.0, 0.07, sz * 1.0, 0.18, 0.14, 0.18, GUN_D); }
      b.box(0, 0.4, -0.3, 0.8, 0.56, 0.5, BONE); b.box(0, 0.7, -0.3, 0.84, 0.04, 0.54, ORANGE);
      b.cyl([0, 0.12, MZ], [0, 1.55, MZ], 0.065, 0.065, 6, BONE, false); b.cyl([0, 1.55, MZ], [0, BAR_Y, MZ], 0.045, 0.045, 6, BONE_D, false);
      b.box(0, BAR_Y, MZ, 1.3, 0.06, 0.06, GUN);
      for (const s of [-1, 1]) { b.box(s * (LX - LW / 2 - 0.05), (BAR_Y + PIV_Y) / 2, PIV_Z, 0.03, PIV_Y - BAR_Y + 0.04, 0.05, GUN_D); b.box(s * (LX + LW / 2 + 0.05), (BAR_Y + PIV_Y) / 2, PIV_Z, 0.03, PIV_Y - BAR_Y + 0.04, 0.05, GUN_D); lampHead(b, s, 0); }
      b.tube(CABLE_RUN.concat([[0.55, 0.022, -1.06]], CABLE_OFF), 0.025, 3, CABLE_O);
      ring(b, [COIL[0], 0.03, COIL[1]], 'y', 0.3, 0.025, CABLE_O, 8, 3);
      return b;
    }
    const r = rnd(4711);
    // --- skid: two runners with upturned ends, cross members, chequer deck
    for (const s of [-1, 1]) {
      const x = s * 0.45;
      b.box(x, 0.06, 0, 0.1, 0.12, 1.1, GUN_D); for (const e of [-1, 1]) b.beam([x, 0.06, e * 0.55], [x, 0.14, e * 0.68], 0.1, GUN_D, 0.12);
      b.box(x, 0.121, 0, 0.06, 0.004, 1.1, MUD);
      b.box(x + s * 0.0505, 0.07, 0.25, 0.001, 0.06, 0.3, HAZ_Y);
    }
    for (const z of [-0.5, -0.05, 0.4]) b.box(0, 0.09, z, 0.8, 0.07, 0.08, GUN);
    b.box(0, 0.128, -0.05, 0.8, 0.016, 1.0, sh(GUN, 0.85));
    for (let i = 0; i < 6; i++) b.box(-0.3 + i * 0.12, 0.137, -0.05, 0.02, 0.003, 0.98, GUN_D);
    // forklift pockets / lifting eyes on the runners
    for (const s of [-1, 1]) for (const z of [-0.4, 0.4]) { b.box(s * 0.505, 0.07, z, 0.012, 0.06, 0.14, BLACK); }
    // --- outriggers with screw-jack levelling feet and stake-downs
    for (const [sx, sz] of OUT) {
      const a = [sx * 0.45, 0.12, sz * 0.5], f = [sx * 1.02, 0.12, sz * 1.02];
      b.box(a[0], 0.12, a[2], 0.16, 0.12, 0.16, GUN_D);
      b.beam(a, f, 0.075, ORANGE); b.beam(lerp(a, f, 0.25), lerp(a, f, 0.62), 0.085, ORANGE_D);
      b.cyl(lerp(a, f, 0.55), lerp(a, f, 0.6), 0.02, 0.02, 6, STEEL);      // locking pin through the sleeve
      b.cyl([f[0], 0.08, f[2]], [f[0], 0.2, f[2]], 0.05, 0.05, 8, GUN_D);
      b.cyl([f[0], 0.025, f[2]], [f[0], 0.3, f[2]], 0.02, 0.02, 6, STEEL);
      b.box(f[0], 0.31, f[2], 0.14, 0.02, 0.02, ORANGE); b.box(f[0] + 0.07, 0.34, f[2], 0.024, 0.06, 0.024, RUBBER);
      // foot pad with mud and two stakes
      b.cyl([f[0], 0, f[2]], [f[0], 0.025, f[2]], 0.12, 0.11, 8, GUN_D);
      b.cyl([f[0], 0.001, f[2]], [f[0], 0.006, f[2]], 0.15, 0.13, 8, MUD, false);
      for (const k of [-1, 1]) {
        const d = norm([sx + k * sz * 0.6, 0, sz - k * sx * 0.6]), st = [f[0] + d[0] * 0.14, f[2] + d[2] * 0.14];
        b.box(st[0], 0.012, st[1], 0.07, 0.024, 0.07, GUN_D);
        b.cyl([st[0] + d[0] * 0.02, 0.11, st[1] + d[2] * 0.02], [st[0] - d[0] * 0.005, 0.012, st[1] - d[2] * 0.005], 0.011, 0.009, 5, STEEL);
        b.box(st[0] + d[0] * 0.02, 0.115, st[1] + d[2] * 0.02, 0.04, 0.02, 0.04, ORANGE);
      }
    }
    // --- battery / power pack in a roll frame
    const BX = 0, BY = 0.14, BZ = -0.3, BW = 0.8, BH = 0.56, BD = 0.5, TOPY = BY + BH;
    b.box(BX, BY + BH / 2, BZ, BW - 0.04, BH - 0.02, BD - 0.04, BONE);
    b.box(BX, BY + BH * 0.22, BZ, BW - 0.035, 0.012, BD - 0.035, BONE_D);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (BW / 2 - 0.02), BY + BH / 2, BZ + sz * (BD / 2 - 0.02), 0.045, BH, 0.045, GUN_D);
    for (const sz of [-1, 1]) b.box(BX, TOPY, BZ + sz * (BD / 2 - 0.02), BW, 0.045, 0.045, ORANGE);
    for (const sx of [-1, 1]) b.box(sx * (BW / 2 - 0.02), TOPY, BZ, 0.045, 0.045, BD, ORANGE);
    b.box(BX, BY + 0.02, BZ, BW, 0.04, BD, GUN_D);
    // heat fins on both ends
    for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) b.box(sx * (BW / 2 - 0.01), BY + 0.14 + k * 0.045, BZ, 0.03, 0.014, BD - 0.12, GUN);
    // lid with lifting eyes and vent
    b.box(BX, TOPY - 0.005, BZ, BW - 0.09, 0.02, BD - 0.09, BONE_D);
    for (const sx of [-1, 1]) { b.box(sx * 0.25, TOPY + 0.03, BZ, 0.05, 0.05, 0.02, GUN_D); ring(b, [sx * 0.25, TOPY + 0.07, BZ], 'z', 0.03, 0.008, STEEL, 8, 3); }
    for (let k = 0; k < 5; k++) b.box(BX - 0.08 + k * 0.04, TOPY + 0.008, BZ + 0.08, 0.018, 0.012, 0.14, GUN_D);
    // control face (toward -z, the door): gauge, switches, LEDs, stencils, cable gland
    const FZ = BZ - BD / 2 + 0.019;
    b.push(mulAll(tr(0, 0, FZ), rotY(PI)));
    pz(b, 0.12, BY + 0.38, 0.0, 0.34, 0.2, GUN_D);
    pz(b, 0.04, BY + 0.38, 0.002, 0.11, 0.11, BLACK); pz(b, 0.04, BY + 0.38, 0.003, 0.08, 0.025, SCR);
    for (let k = 0; k < 3; k++) { b.box(0.15 + k * 0.05, BY + 0.38, 0.015, 0.02, 0.05, 0.02, k === 1 ? ORANGE : STEEL); }
    pz(b, 0.15, BY + 0.31, 0.003, 0.02, 0.02, LED_G); pz(b, 0.2, BY + 0.31, 0.003, 0.02, 0.02, LED_G); pz(b, 0.25, BY + 0.31, 0.003, 0.02, 0.02, [0.3, 0.12, 0.08]);
    text(b, 'SV-2', -0.34, BY + 0.43, 0.001, 0.07, ST_K); text(b, 'PWR-3', -0.34, BY + 0.33, 0.001, 0.045, ORANGE_D);
    hazard(b, -0.36, 0.36, BY + 0.12, 0.001, 0.05, 12);
    b.pop();
    b.push(mulAll(tr(BX + BW / 2 + 0.001, 0, BZ), rotY(PI / 2))); text(b, 'KR-07', 0, BY + 0.42, 0, 0.06, ST_K, true); b.pop();
    b.push(mulAll(tr(BX - BW / 2 - 0.001, 0, BZ), rotY(-PI / 2))); text(b, 'KR-07', 0, BY + 0.42, 0, 0.06, ST_K, true); b.pop();
    b.cyl([0.24, 0.3, FZ - 0.001], [0.24, 0.3, FZ - 0.05], 0.04, 0.035, 8, GUN_D);
    // damp grime band along the bottom of the pack
    b.box(BX, BY + 0.055, BZ, BW - 0.03, 0.03, BD - 0.03, DAMP);
    // --- mast base socket and braces
    b.box(0, 0.16, MZ, 0.3, 0.04, 0.3, GUN_D);
    b.cyl([0, 0.17, MZ], [0, 0.5, MZ], 0.09, 0.085, 12, GUN);
    for (const [sx, tz] of [[-1, MZ], [1, MZ]]) b.beam([0, 0.95, MZ], [sx * 0.42, 0.16, tz + 0.1], 0.04, GUN_D);
    b.beam([0, 0.95, MZ - 0.05], [0, TOPY, BZ + 0.18], 0.04, GUN_D);
    // telescoping mast: three sections, clamp collars with levers, hazard bands
    b.cyl([0, 0.5, MZ], [0, 1.6, MZ], 0.065, 0.065, 12, BONE, false);
    for (let k = 0; k < 5; k++) b.cyl([0, 0.56 + k * 0.07, MZ], [0, 0.6 + k * 0.07, MZ], 0.067, 0.067, 12, k % 2 ? BLACK : HAZ_Y, false);
    b.cyl([0, 1.6, MZ], [0, 2.42, MZ], 0.05, 0.05, 12, BONE_D, false);
    b.cyl([0, 2.42, MZ], [0, BAR_Y - 0.04, MZ], 0.038, 0.038, 10, ALU, false);
    const collar = (y, R) => {
      b.cyl([0, y - 0.05, MZ], [0, y + 0.05, MZ], R, R, 12, GUN_D);
      b.box(R + 0.02, y, MZ, 0.05, 0.08, 0.05, GUN_D);
      b.beam([R + 0.04, y, MZ], [R + 0.05, y - 0.16, MZ + 0.05], 0.025, ORANGE);
      b.cyl([R + 0.05, y - 0.15, MZ + 0.05], [R + 0.05, y - 0.2, MZ + 0.05], 0.018, 0.018, 6, RUBBER);
    };
    collar(0.52, 0.09); collar(1.62, 0.08); collar(2.44, 0.064);
    b.box(0, 1.15, MZ + 0.075, 0.12, 0.2, 0.012, BONE); text(b, 'FL-6', 0, 1.19, MZ + 0.082, 0.04, ST_K, true); text(b, '400V', 0, 1.11, MZ + 0.082, 0.03, ORANGE_D, true);
    // --- head: adaptor block, crossbar, yokes
    b.box(0, BAR_Y - 0.03, MZ, 0.12, 0.12, 0.12, GUN_D);
    b.box(0, BAR_Y, MZ, 1.3, 0.06, 0.06, GUN); for (const s of [-1, 1]) b.box(s * 0.66, BAR_Y, MZ, 0.025, 0.07, 0.07, ORANGE);
    b.box(0, BAR_Y + 0.0, MZ + 0.031, 0.5, 0.04, 0.003, HAZ_Y);
    for (const s of [-1, 1]) for (const e of [-1, 1]) {
      const x = s * LX + e * (LW / 2 + 0.045);
      b.box(x, BAR_Y + 0.04, MZ, 0.06, 0.03, 0.06, GUN_D);
      b.beam([x, BAR_Y + 0.03, MZ], [x, PIV_Y, PIV_Z], 0.035, GUN_D, 0.05);
    }
    for (const s of [-1, 1]) lampHead(b, s, 1);
    // --- feeder cables: pack lid -> up the mast in clips -> along the crossbar -> into each lamp
    const up = [[0.3, TOPY + 0.02, BZ + 0.1], [0.25, TOPY + 0.1, BZ + 0.3], [0.08, 0.8, MZ - 0.08], [0.07, 1.3, MZ - 0.07], [0.06, 2.0, MZ - 0.06], [0.05, 2.7, MZ - 0.05], [0.04, BAR_Y - 0.06, MZ - 0.05]];
    cable(b, up, 0.014, CABLE_K, 2, 5);
    for (const y of [1.0, 1.45, 1.9, 2.3, 2.75]) b.box(0.055, y, MZ - 0.05, 0.04, 0.025, 0.04, ORANGE_D);
    for (const s of [-1, 1]) {
      const g = xf(lampM(s), [0.14, -0.08, -LD / 2 - 0.09]);
      cable(b, [[0.04 * s, BAR_Y - 0.05, MZ - 0.05], [s * 0.15, BAR_Y - 0.06, MZ - 0.07], [s * 0.28, BAR_Y - 0.02, MZ - 0.1], [g[0], g[1] - 0.04, g[2] - 0.03], g], 0.012, CABLE_K, 2, 4);
    }
    // --- main power cable: out of the pack face, coiled on the ground, then off toward the door (-z)
    cable(b, CABLE_RUN.concat([[0.56, 0.026, -0.95]]), 0.025, CABLE_O, 3, 6);
    for (let k = 0; k < 3; k++) {
      const R = 0.31 - k * 0.025, yy = 0.025 + (k === 2 ? 0.035 : 0), cx = COIL[0] + (r() - 0.5) * 0.06, cz = COIL[1] + (r() - 0.5) * 0.06;
      ring(b, [cx, yy, cz], 'y', R, 0.025, CABLE_O, 16, 5);
    }
    cable(b, [[COIL[0] - 0.05, 0.03, COIL[1] - 0.29], [0.0, 0.026, -1.32]].concat(CABLE_OFF.slice(1)), 0.025, CABLE_O, 3, 6);
    // inline connector on the off-run and a peg holding it down
    b.push(mulAll(along([-0.2, 0.047, -1.55], [-0.17, 0.047, -1.72]))); b.cyl([0, -0.09, 0], [0, 0.09, 0], 0.04, 0.04, 10, GUN_D); b.cyl([0, -0.02, 0], [0, 0.02, 0], 0.046, 0.046, 10, ORANGE); b.pop();
    for (const z of [-2.25]) { b.box(0.1, 0.05, z, 0.012, 0.07, 0.012, STEEL); b.box(0.1, 0.085, z, 0.09, 0.014, 0.016, HAZ_Y); }
    return b;
  }

  // =========================================================================================================
  // 2. POWER COUPLING: the door part the player carries, centred on the origin, long axis along x
  // =========================================================================================================
  function buildCoupling(detail) {
    const b = new MB(), HL = 0.275, R = 0.09, SLEEVE = [0.46, 0.47, 0.47, 0.3];
    if (!detail) {
      b.push(rotZ(-PI / 2));
      b.lathe([[0, -HL], [R, -HL], [R, -0.2, GUN], [0.075, -0.2], [0.075, 0.2, ORANGE], [R, 0.2], [R, HL], [0, HL]], 8, ORANGE);
      b.pop();
      for (const s of [-1, 1]) pz(b, 0, 0, s * 0.0765, 0.24, 0.03, CELL);
      b.box(0, 0.105, 0, 0.26, 0.03, 0.03, GUN_D);
      return b;
    }
    const SG = 16;
    // armoured end caps (orange), knurled grip rings, dark body
    b.push(rotZ(-PI / 2));
    for (const e of [-1, 1]) {
      const p = [[0, HL - 0.004, GUN_D], [0.062, HL - 0.004, GUN_D], [0.062, HL, ORANGE], [0.082, HL, ORANGE], [R, HL - 0.01, ORANGE], [R, 0.2, ORANGE], [0.084, 0.194, GUN_D], [0.084, 0.185]];
      b.lathe(e > 0 ? p.map(q => [q[0], q[1], q[2]]).reverse().map((q, i, a) => [q[0], q[1], (a[i + 1] || q)[2]]) : p.map(q => [q[0], -q[1], q[2]]), SG, ORANGE);
    }
    // warning bands: yellow / black checker around the body next to each cap
    for (const e of [-1, 1]) {
      const y0 = e * 0.185, y1 = e * 0.15;
      for (let k = 0; k < 10; k++) b.lathe(e > 0 ? [[0.081, y1], [0.081, y0]] : [[0.081, y0], [0.081, y1]], 2, k % 2 ? BLACK : HAZ_Y, k * TAU / 10, (k + 1) * TAU / 10);
    }
    // main sleeve (gunmetal) with raised armour ribs
    b.lathe([[0.075, -0.15], [0.075, 0.15]], SG, SLEEVE);
    for (const y of [-0.15, -0.075, 0.075, 0.15]) b.lathe([[0.076, y - 0.008], [0.084, y - 0.008], [0.084, y + 0.008], [0.076, y + 0.008]], 12, GUN_D);
    b.pop();
    // cell window strips on both sides (pale cyan cell, dark bezel, bars)
    for (const s of [-1, 1]) {
      b.push(s > 0 ? tr(0, 0, 0) : rotY(PI));
      b.box(0, 0, 0.074, 0.25, 0.05, 0.012, GUN_D);
      pz(b, 0, 0, 0.0805, 0.22, 0.034, CELL);
      for (const x of [-0.055, 0, 0.055]) b.box(x, 0, 0.082, 0.008, 0.044, 0.006, GUN_D);
      b.box(0, 0.026, 0.079, 0.25, 0.008, 0.008, GUN_D); b.box(0, -0.026, 0.079, 0.25, 0.008, 0.008, GUN_D);
      b.pop();
    }
    // two grip handles on top, label plate between them
    for (const hx of [-0.105, 0.105]) {
      for (const e of [-1, 1]) b.box(hx + e * 0.05, 0.08, 0, 0.022, 0.03, 0.04, GUN_D);
      b.tube([[hx - 0.05, 0.085, 0], [hx - 0.045, 0.125, 0], [hx - 0.025, 0.137, 0], [hx + 0.025, 0.137, 0], [hx + 0.045, 0.125, 0], [hx + 0.05, 0.085, 0]], 0.011, 6, ORANGE_D);
      for (let k = 0; k < 3; k++) b.cyl([hx - 0.03 + k * 0.022, 0.137, 0], [hx - 0.018 + k * 0.022, 0.137, 0], 0.0135, 0.0135, 6, RUBBER, false);
    }
    b.box(0, 0.083, 0, 0.09, 0.012, 0.05, BONE);
    b.push(mulAll(tr(0, 0.0895, 0), rotX(-PI / 2))); text(b, 'DC-4', 0, 0, 0, 0.022, ST_K, true); b.pop();
    // underside skid strip
    b.box(0, -0.082, 0, 0.26, 0.012, 0.04, GUN_D);
    // contact faces: centre pin, ring of pins, keying lug
    for (const e of [-1, 1]) {
      const x = e * HL;
      b.cyl([x, 0, 0], [x + e * 0.025, 0, 0], 0.016, 0.012, 8, STEEL);
      for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.785; b.cyl([x, Math.cos(a) * 0.04, Math.sin(a) * 0.04], [x + e * 0.014, Math.cos(a) * 0.04, Math.sin(a) * 0.04], 0.007, 0.007, 4, ALU, false); }
      b.box(x + e * 0.006, 0.07, 0, 0.012, 0.022, 0.03, GUN_D);
    }
    return b;
  }

  // =========================================================================================================
  // 3. DROPPED PACK: expedition pack on its side with a trailing strap, open hard case, handheld lamp, sample tube
  // =========================================================================================================
  function backpack(b, detail) {                    // upright, bottom at y = 0, back panel toward -z
    if (!detail) { b.box(0, 0.36, 0, 0.42, 0.72, 0.3, OLIVE); b.box(0, 0.72, 0.03, 0.44, 0.1, 0.34, ORANGE_D); b.cyl([-0.26, 0.08, 0.02], [0.26, 0.08, 0.02], 0.08, 0.08, 5, OLIVE_D); return; }
    softBox(b, 0, 0.38, 0.0, 0.42, 0.66, 0.3, OLIVE, 10, 6);
    softBox(b, 0, 0.72, 0.03, 0.44, 0.12, 0.34, ORANGE_D, 10, 5);           // lid
    softBox(b, 0, 0.32, 0.16, 0.32, 0.34, 0.1, OLIVE_D, 10, 6);             // front pocket
    for (const s of [-1, 1]) softBox(b, s * 0.22, 0.28, 0.0, 0.09, 0.3, 0.2, BONE_D, 6, 4);   // side pockets
    // bedroll strapped under the bottom
    b.cyl([-0.25, 0.075, 0.02], [0.25, 0.075, 0.02], 0.075, 0.075, 10, sh(SAND, 0.85));
    for (const x of [-0.13, 0.13]) b.cyl([x - 0.015, 0.075, 0.02], [x + 0.015, 0.075, 0.02], 0.079, 0.079, 10, BLACK, false);
    // external alloy frame and shoulder straps on the back
    for (const s of [-1, 1]) b.cyl([s * 0.16, 0.02, -0.17], [s * 0.16, 0.86, -0.17], 0.012, 0.012, 6, ALU, false);
    for (const y of [0.18, 0.5, 0.82]) b.cyl([-0.17, y, -0.17], [0.17, y, -0.17], 0.01, 0.01, 6, ALU, false);
    for (const s of [-1, 1]) b.tube([[s * 0.09, 0.66, -0.16], [s * 0.1, 0.6, -0.22], [s * 0.11, 0.4, -0.23], [s * 0.13, 0.2, -0.2], [s * 0.15, 0.16, -0.16]], 0.022, 4, BLACK);
    b.box(0, 0.16, -0.2, 0.42, 0.08, 0.04, OLIVE_D);   // hip belt
    // compression straps and buckles on the front
    for (const x of [-0.1, 0.1]) { b.box(x, 0.45, 0.153, 0.03, 0.5, 0.01, BLACK); b.box(x, 0.52, 0.16, 0.045, 0.035, 0.012, GUN_D); }
    b.box(0, 0.72, 0.2, 0.05, 0.08, 0.012, BLACK);
    // stencil and a reflective patch
    text(b, 'SV-2', -0.07, 0.24, 0.212, 0.04, ST_W); b.box(0, 0.4, 0.212, 0.14, 0.03, 0.004, HAZ_Y);
  }
  function hardCase(b, detail) {                    // closed footprint 0.52 x 0.36, lid thrown open toward -z
    const W = 0.52, H = 0.15, D = 0.36, CO = [0.32, 0.34, 0.35, 0.25], LIN = [0.20, 0.21, 0.21, 0.02];
    if (!detail) { b.box(0, H / 2, 0, W, H, D, CO); b.push(mulAll(tr(0, H, -D / 2), rotX(-2.0))); b.box(0, 0.03, D / 2, W, 0.06, D, CO); b.pop(); return; }
    b.plate([-W / 2, 0, D / 2], [W / 2, 0, D / 2], [W / 2, H, D / 2], [-W / 2, H, D / 2], CO); b.plate([W / 2, 0, -D / 2], [-W / 2, 0, -D / 2], [-W / 2, H, -D / 2], [W / 2, H, -D / 2], CO);
    b.plate([W / 2, 0, D / 2], [W / 2, 0, -D / 2], [W / 2, H, -D / 2], [W / 2, H, D / 2], CO); b.plate([-W / 2, 0, -D / 2], [-W / 2, 0, D / 2], [-W / 2, H, D / 2], [-W / 2, H, -D / 2], CO);
    const t = 0.02, wi = W - 2 * t, di = D - 2 * t, fy = 0.06;
    b.plate([-wi / 2, fy, D / 2 - t], [-wi / 2, H, D / 2 - t], [wi / 2, H, D / 2 - t], [wi / 2, fy, D / 2 - t], LIN); b.plate([wi / 2, fy, -D / 2 + t], [wi / 2, H, -D / 2 + t], [-wi / 2, H, -D / 2 + t], [-wi / 2, fy, -D / 2 + t], LIN);
    b.plate([W / 2 - t, fy, -di / 2], [W / 2 - t, H, -di / 2], [W / 2 - t, H, di / 2], [W / 2 - t, fy, di / 2], LIN); b.plate([-W / 2 + t, fy, di / 2], [-W / 2 + t, H, di / 2], [-W / 2 + t, H, -di / 2], [-W / 2 + t, fy, -di / 2], LIN);
    py(b, 0, fy, 0, wi, di, sh(LIN, 1.3));
    // foam cut-outs: lamp slot (empty), tube slots (one empty), a meter still in place
    py(b, -0.1, fy + 0.001, -0.06, 0.26, 0.08, BLACK); for (const z of [0.04, 0.1]) py(b, -0.12, fy + 0.001, z, 0.2, 0.04, BLACK);
    b.cyl([-0.21, fy + 0.02, 0.1], [-0.03, fy + 0.02, 0.1], 0.018, 0.018, 8, GLASS_L); b.cyl([-0.03, fy + 0.02, 0.1], [-0.01, fy + 0.02, 0.1], 0.02, 0.02, 8, ORANGE);
    b.box(0.15, fy + 0.03, 0.02, 0.12, 0.06, 0.2, GUN_D); pz(b, 0.15, fy + 0.04, 0.12, 0.08, 0.035, SCR_D);
    b.push(mulAll(tr(0.15, fy + 0.0605, 0.02), rotX(-PI / 2))); pz(b, 0, 0.03, 0, 0.08, 0.06, SCR); pz(b, -0.02, -0.05, 0, 0.02, 0.02, LED_R); pz(b, 0.02, -0.05, 0, 0.02, 0.02, ORANGE); b.pop();
    for (const s of [-1, 1]) { b.box(0, H - 0.008, s * (D / 2 - t / 2), W, 0.016, t, sh(CO, 1.3)); b.box(s * (W / 2 - t / 2), H - 0.008, 0, t, 0.016, D, sh(CO, 1.3)); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (W / 2 - 0.02), 0.025, sz * (D / 2 - 0.02), 0.05, 0.05, 0.05, ORANGE);
    text(b, 'SV-2', -W / 2 + 0.05, 0.09, D / 2 + 0.002, 0.04, ST_W); chevrons(b, -W / 2 + 0.05, -W / 2 + 0.25, 0.04, D / 2 + 0.002, 0.025, 6);
    for (const lx of [-0.16, 0.16]) b.box(lx, H - 0.025, D / 2 + 0.007, 0.05, 0.04, 0.014, GUN_D);
    b.tube([[0.12, 0.08, D / 2 + 0.004], [0.13, 0.065, D / 2 + 0.03], [0.21, 0.065, D / 2 + 0.03], [0.22, 0.08, D / 2 + 0.004]], 0.008, 5, GUN_D);
    // lid swung back past vertical
    b.push(mulAll(tr(0, H, -D / 2 - 0.008), rotX(-1.95)));
    b.box(0, 0.035, D / 2, W, 0.07, D, CO);
    b.plate([-(W - 0.04) / 2, -0.0015, 0.02], [(W - 0.04) / 2, -0.0015, 0.02], [(W - 0.04) / 2, -0.0015, D - 0.02], [-(W - 0.04) / 2, -0.0015, D - 0.02], sh(LIN, 1.2));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) boxM(b, -0.165 + i * 0.11, -0.01, 0.07 + j * 0.11, 0.07, 0.018, 0.07, sh(LIN, 1.45), 'YxXzZ');
    b.box(0, 0.035, D + 0.003, W - 0.08, 0.04, 0.004, ORANGE);
    b.pop();
  }
  function handLamp(b, detail) {                    // along local +x, lens at +x end, centred on its axis at origin
    if (!detail) { b.cyl([-0.13, 0, 0], [0.1, 0, 0], 0.035, 0.05, 6, ORANGE_D); b.push(mulAll(tr(0.101, 0, 0), rotY(PI / 2))); pz(b, 0, 0, 0, 0.07, 0.07, LENS_L); b.pop(); return; }
    b.push(rotZ(-PI / 2));
    b.lathe([[0, -0.13, RUBBER], [0.03, -0.13, RUBBER], [0.034, -0.12, ORANGE_D], [0.034, -0.02, GUN_D], [0.036, -0.02, GUN_D], [0.036, 0.02, ORANGE_D], [0.052, 0.06, ORANGE_D], [0.055, 0.095, GUN_D], [0.055, 0.105, GUN_D], [0.045, 0.105, LENS_L], [0, 0.106, LENS_L]], 10, ORANGE_D);
    for (let k = 0; k < 2; k++) b.lathe([[0.0355, -0.1 + k * 0.035], [0.0355, -0.085 + k * 0.035]], 10, RUBBER);
    b.pop();
    b.box(-0.02, 0.04, 0, 0.03, 0.012, 0.02, ORANGE);                     // switch
    b.tube([[-0.17, 0, 0], [-0.22, -0.02, 0.05], [-0.28, -0.03, 0.08], [-0.33, -0.03, 0.05]], 0.004, 4, BLACK);   // wrist lanyard
  }
  function sampleTube(b, detail) {                  // along +x, open end at +x, axis at origin
    const L = 0.2, R = 0.024;
    if (!detail) { b.cyl([0, 0, 0], [L, 0, 0], R, R, 5, GLASS_L); return; }
    b.push(rotZ(-PI / 2));
    b.lathe([[0, 0, ORANGE], [R + 0.003, 0, ORANGE], [R + 0.003, 0.025, GLASS_L], [R, 0.025, GLASS_L], [R, L]], 10, GLASS_L, 0, TAU);
    b.lathe([[0, 0.12], [R - 0.004, 0.12, mix(CRYS, CORE, 0.25)], [R - 0.004, 0.25], [0, 0.25]], 6, mix(CRYS, CORE, 0.25));
    b.pop();
    b.push(mulAll(tr(0.08, 0.0, R + 0.0015), rotY(0))); pz(b, 0, 0, 0, 0.06, 0.016, ST_W); b.pop();
  }
  const CORE = [0.52, 0.50, 0.49, 0.4];
  function buildPack(detail) {
    const b = new MB(), r = rnd(2207);
    // backpack fallen on its side: top toward -x, back panel toward -z
    const bp = new MB(); bp.push(rotZ(PI / 2 - 0.08)); backpack(bp, detail); bp.pop(); dropTo(b, bp, 0.08, -0.2, 0.25);
    // strap trailing out across the ground with its buckle
    if (detail) {
      strap(b, [[-0.3, 0.012, 0.05], [-0.4, 0.008, 0.25], [-0.55, 0.006, 0.36], [-0.68, 0.006, 0.33], [-0.78, 0.006, 0.42], [-0.76, 0.006, 0.55]], 0.055, BLACK);
      b.box(-0.765, 0.012, 0.56, 0.06, 0.012, 0.035, GUN_D);
      strap(b, [[-0.05, 0.01, 0.06], [0.0, 0.006, 0.22], [-0.08, 0.006, 0.34]], 0.03, OLIVE_D);
    } else b.box(-0.55, 0.005, 0.35, 0.4, 0.01, 0.04, BLACK);
    // open hard case, lid back
    b.push(mulAll(tr(0.42, 0, 0.2), rotY(-0.35))); hardCase(b, detail); b.pop();
    // handheld lamp dropped on the rock, still on, pointing off to the side
    b.push(mulAll(tr(0.05, 0.05, 0.42), rotY(0.5), rotX(0.3))); handLamp(b, detail); b.pop();
    // sample tube rolled out, crystal fragments spilled from its open end, cap lying apart
    b.push(mulAll(tr(0.3, 0.026, 0.5), rotY(-2.4))); sampleTube(b, detail); b.pop();
    if (detail) {
      for (let k = 0; k < 5; k++) { const a = r() * TAU, d = 0.03 + r() * 0.08, x = 0.18 + Math.cos(a) * d, z = 0.62 + Math.sin(a) * d; crystal(b, [x, 0.004, z], [r() - 0.5, 0.5, r() - 0.5], 0.05 + r() * 0.04, 0.016 + r() * 0.008, k % 2 ? CRYS : CRYS_V, 300 + k, 5); }
      b.push(tr(0.5, 0, 0.62)); b.lathe([[0, 0], [0.027, 0], [0.027, 0.025], [0, 0.025]], 10, ORANGE); b.pop();
      // data slate face down-ish, and a glove
      b.push(mulAll(tr(-0.6, 0.012, -0.45), rotY(0.4), rotZ(0.06))); b.box(0, 0, 0, 0.22, 0.02, 0.15, GUN_D); b.box(0, 0.0105, 0, 0.18, 0.002, 0.11, SCR_D); b.pop();
      b.push(mulAll(tr(-0.62, 0.0, -0.45), rotY(0.4), tr(0, 0.0221, 0), rotX(-PI / 2))); pz(b, -0.02, 0.0, 0, 0.12, 0.06, SCR); b.pop();
      softBox(b, 0.62, 0.02, -0.25, 0.16, 0.04, 0.09, OLIVE_D, 8, 4);
      for (let k = 0; k < 4; k++) b.beam([0.69, 0.018, -0.28 + k * 0.022], [0.76 + k * 0.01, 0.016, -0.29 + k * 0.025], 0.02, OLIVE_D, 0.016);
    }
    return b;
  }

  // =========================================================================================================
  // 4. ROUTE STAKE: survey stake on a weighted foot plate, bolted into the rock, clip-on marker light on top.
  //    Placed every few metres from landing to exit door; the game pulses an amber glow on the light centre.
  // =========================================================================================================
  const STK_R = 0.016, STK_TOP = 0.78, STK_LY = 0.84, STK_LENS = [0.95, 0.9, 0.7, 0.3];
  const STAKE_ATTACH = [[0, STK_LY, 0]];
  function buildStake(detail) {
    const b = new MB();
    if (!detail) {
      b.lathe([[0.1, 0], [0.02, 0.03]], 4, GUN_D);                                                  // foot plate
      b.lathe([[STK_R, 0.02, ORANGE], [STK_R, 0.5, BLACK], [STK_R, 0.57, ORANGE], [STK_R, STK_TOP]], 4, ORANGE);   // shaft with one band
      b.lathe([[0.042, STK_TOP, STK_LENS], [0.042, 0.9, GUN_D], [0, 0.9]], 6, GUN_D);                  // light: lens + cap
      return b;
    }
    // weighted hex foot plate with bevelled top, sunk a little into the rock, plus three rock-bolt heads
    b.lathe([[0.1, -0.02], [0.1, 0.012], [0.075, 0.028], [0.02, 0.03]], 6, GUN_D);
    for (let k = 0; k < 3; k++) { b.push(mulAll(rotY(k * TAU / 3 + 0.5), tr(0.068, 0.03, 0))); b.box(0, 0, 0, 0.022, 0.014, 0.022, STEEL); b.pop(); }
    // pointed stake: steel tip driven through the plate into the rock, orange shaft with black bands
    b.lathe([[0, -0.08, STEEL], [STK_R, 0.03, ORANGE], [STK_R, 0.28, BLACK], [STK_R, 0.34, ORANGE],
             [STK_R, 0.5, BLACK], [STK_R, 0.56, ORANGE], [STK_R, 0.7, BLACK], [STK_R, 0.745, GUN_D], [STK_R, STK_TOP]], 6, ORANGE);
    // pale reflective tape strip on the front and back faces
    for (const a of [PI / 3, PI + PI / 3]) b.lathe([[STK_R + 0.0015, 0.37], [STK_R + 0.0015, 0.47]], 1, ST_W, a, a + PI / 3);
    // clip-on bracket gripping the stake top
    b.box(0, 0.762, 0, 0.044, 0.026, 0.044, ORANGE_D);
    // marker light: dark base, pale lens band, dark cap (0.084 across, 0.12 tall, centre at y 0.84)
    b.lathe([[0.042, STK_TOP, GUN_D], [0.042, 0.795, STK_LENS], [0.041, 0.885, GUN_D], [0.03, 0.9, GUN_D], [0, 0.9]], 8, GUN_D);
    // route tag on the side of the shaft, stencilled code facing +z
    b.box(STK_R + 0.037, 0.63, 0, 0.07, 0.045, 0.004, BONE);
    text(b, 'R-8', STK_R + 0.037, 0.63, 0.0025, 0.026, ST_K, true);
    return b;
  }

  return {
    name: 'worklight',
    items: [
      { name: 'flood_mast', budget: 6000, build: buildFlood, colliders: [], attach: FLOOD_ATTACH },
      { name: 'power_coupling', budget: 1500, build: buildCoupling, colliders: [] },
      { name: 'dropped_pack', budget: 2000, build: buildPack, colliders: [] },
      { name: 'route_stake', budget: 300, build: buildStake, colliders: [], attach: STAKE_ATTACH }
    ]
  };
}) };
