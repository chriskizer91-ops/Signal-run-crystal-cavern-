window.MODDEF = { fn: (function (K) {
  // The research team's dive station on the shore of the flooded cavern (a black underground lake). SV-2, unit KR-07
  // dived it many times from a floating pontoon. Something in the lake frightened them; one diver did not come back,
  // and they chained off the ladder and left in a hurry. Same gear family, palette, helpers and stencil font as
  // worklight.js / survey.js. Everything is worn, wet and cold, with algae near the waterline.
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


  // ---- extra palette for the wet lake shore --------------------------------------------------------------
  const ALGAE = [0.25, 0.35, 0.16, 0.03], ALGAE_D = [0.13, 0.20, 0.12, 0.05], SLIME = [0.20, 0.25, 0.19, 0.12];
  const FLOAT = [0.70, 0.67, 0.58, 0.06], FLOAT_W = [0.34, 0.38, 0.32, 0.08];        // pontoon floats above / below the water
  const RUST = [0.42, 0.25, 0.14, 0.04], ROPE = [0.66, 0.60, 0.46, 0.02], LINE = [0.96, 0.90, 0.58, 0.05];
  const SCREEN = [0.75, 0.95, 0.9, 0.3];                                               // the game makes this glow
  const r3 = p => p.map(v => +v.toFixed(3));
  // short cleat: base block plus a horn along local x
  function cleat(b, x, y, z, ay) {
    b.push(mulAll(tr(x, y, z), rotY(ay || 0)));
    b.box(0, 0.025, 0, 0.1, 0.05, 0.05, GUN_D);
    b.cyl([-0.11, 0.065, 0], [0.11, 0.065, 0], 0.018, 0.018, 6, STEEL);
    b.pop();
  }
  // rope coil lying flat: n loops shrinking a little, with a loose tail
  function coil(b, cx, y, cz, R, r, n, col, seed, segs) {
    const rr = rnd(seed);
    for (let k = 0; k < n; k++) ring(b, [cx + (rr() - 0.5) * 0.03, y + r + (k === n - 1 ? r * 1.6 : 0), cz + (rr() - 0.5) * 0.03], 'y', R - k * r * 1.1, r, col, 14, segs || 4);
  }

  // =========================================================================================================
  // 1. DIVE PLATFORM: modular pontoon 6 m (x) x 3 m (z). y = 0 is the water surface; deck top at 0.4.
  //    Ladder down into the lake at +x, davit with a winch line still hanging in the water, gangway up to the shore at -x.
  // =========================================================================================================
  const DY = 0.4, HX = 3.0, HZ = 1.5, RZ = 1.38;
  const GW_X1 = -5.3, GW_Y1 = 1.22, GW_TH = Math.atan2(GW_Y1 - DY, -HX - GW_X1), GW_L = Math.hypot(GW_Y1 - DY, -HX - GW_X1);
  const gwP = u => [-HX - u * Math.cos(GW_TH), DY + u * Math.sin(GW_TH)];       // gangway walking surface at distance u from the hinge
  const LADX = 3.14, LADZ = 0.27, DAV = [2.4, -1.1];

  function buildPlatform(detail) {
    const b = new MB();
    if (!detail) {
      for (const z of [-1, 0, 1]) { b.box(0, -0.15, z, 5.9, 0.7, 0.94, FLOAT_W); boxM(b, 0, 0.13, z, 5.92, 0.14, 0.96, FLOAT, 'xXzZy'); }
      b.box(0, 0.3, 0, 6.0, 0.2, 3.0, GUN);
      for (const s of [-1, 1]) {
        b.cyl([-2.75, 1.42, s * RZ], [2.75, 1.42, s * RZ], 0.03, 0.03, 4, ORANGE, false);
        for (const x of [-2.5, 0, 2.5]) b.beam([x, DY, s * RZ], [x, 1.42, s * RZ], 0.05, ORANGE);
      }
      for (const s of [-1, 1]) b.beam([LADX, 1.35, s * LADZ], [LADX, -2.5, s * LADZ], 0.05, STEEL);
      for (const y of [-1.7, -0.8, 0.1]) b.beam([LADX, y, -LADZ], [LADX, y, LADZ], 0.04, STEEL);
      b.beam([DAV[0], DY, DAV[1]], [DAV[0], 1.95, DAV[1]], 0.1, ORANGE); b.beam([DAV[0], 1.92, DAV[1]], [3.58, 1.95, DAV[1]], 0.08, ORANGE_D);
      b.beam([3.6, 1.9, DAV[1]], [3.6, -1.4, DAV[1]], 0.02, CABLE_K);
      b.push(mulAll(tr(-HX, DY, 0), rotZ(-GW_TH))); b.box(-GW_L / 2, -0.06, 0, GW_L, 0.12, 0.95, ORANGE_D); b.pop();
      for (const s of [-1, 1]) { const a = gwP(0.2), c = gwP(GW_L - 0.1); b.beam([a[0], a[1] + 0.95, s * 0.47], [c[0], c[1] + 0.95, s * 0.47], 0.04, ORANGE); for (const p of [a, c]) b.beam([p[0], p[1], s * 0.47], [p[0], p[1] + 0.95, s * 0.47], 0.035, ORANGE_D); }
      b.box(-1.6, DY + 0.25, -0.95, 1.0, 0.5, 0.5, BONE);
      coil(b, -2.2, DY, 0.75, 0.22, 0.03, 2, ROPE, 9, 3);
      return b;
    }
    const r = rnd(9157);
    // --- floats: 6 x 3 modular blocks, wet and dark under the water, a band of algae at the waterline
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      const x = -2.5 + i, z = -1 + j, dy = (r() - 0.5) * 0.03, w = 0.93 + r() * 0.02, fc = sh(FLOAT, 0.92 + r() * 0.12);
      b.box(x, -0.29 + dy, z, w - 0.06, 0.42, w - 0.06, FLOAT_W);
      boxM(b, x, -0.05 + dy, z, w - 0.04, 0.12, w - 0.04, ALGAE, 'xXzZ');
      b.box(x, 0.075 + dy, z, w, 0.15, w, fc);
      boxM(b, x, 0.014 + dy, z, w + 0.004, 0.03, w + 0.004, ALGAE_D, 'xXzZ');
    }
    // --- steel frame: perimeter channel, cross members, connecting pins between floats
    for (const s of [-1, 1]) {
      b.box(0, 0.29, s * (HZ - 0.04), 2 * HX, 0.22, 0.08, GUN_D);
      b.box(s * (HX - 0.04), 0.29, 0, 0.08, 0.22, 2 * HZ - 0.16, GUN_D);
    }
    for (const x of [-2, -1, 0, 1, 2]) b.box(x, 0.24, 0, 0.07, 0.12, 2 * HZ - 0.16, GUN);
    // --- deck: three grating panels with tread strips, wet stains near the ladder
    for (const px of [-2, 0, 2]) {
      b.box(px, DY - 0.03, 0, 1.97, 0.06, 2 * HZ - 0.1, GUN);
      for (let k = 0; k < 9; k++) py(b, px - 0.88 + k * 0.22, DY + 0.0015, 0, 0.05, 2 * HZ - 0.24, GUN_D);
    }
    for (const [x, z, w, d] of [[2.55, 0.1, 0.8, 0.9], [2.1, -0.3, 0.5, 0.4], [2.75, 0.75, 0.35, 0.3]]) py(b, x, DY + 0.003, z, w, d, DAMP);
    // --- fascia: hazard edge and stencilled unit codes on both long sides, wet grime along the bottom
    for (const s of [-1, 1]) {
      b.push(s > 0 ? tr(0, 0, HZ + 0.001) : mulAll(rotY(PI), tr(0, 0, HZ + 0.001)));
      chevrons(b, -2.9, 2.9, DY - 0.03, 0, 0.05, 28);
      pz(b, 0, 0.215, 0, 2 * HX - 0.02, 0.05, DAMP);
      text(b, 'DV-1', -2.6, 0.29, 0.001, 0.09, ST_W); text(b, 'KR-07', 1.0, 0.29, 0.001, 0.07, ST_W); text(b, 'NO STEP', 2.05, 0.29, 0.001, 0.05, HAZ_Y);
      b.pop();
      // rubber fender along the side, bumpers at the corners
      b.cyl([-HX + 0.1, 0.25, s * (HZ + 0.04)], [HX - 0.1, 0.25, s * (HZ + 0.04)], 0.045, 0.045, 6, RUBBER, false);
      for (const e of [-1, 1]) b.box(e * (HX - 0.02), 0.24, s * (HZ - 0.02), 0.12, 0.3, 0.12, RUBBER);
    }
    // --- railings along both long sides (ends drop to the deck), mid rail, base plates
    for (const s of [-1, 1]) {
      const z = s * RZ;
      cable(b, [[-2.75, DY, z], [-2.75, 1.25, z], [-2.66, 1.4, z], [-2.5, 1.42, z], [2.5, 1.42, z], [2.66, 1.4, z], [2.75, 1.25, z], [2.75, DY, z]], 0.025, ORANGE, 3, 6);
      b.cyl([-2.75, 0.92, z], [2.75, 0.92, z], 0.02, 0.02, 6, ORANGE_D, false);
      for (const x of [-1.5, -0.5, 0.5, 1.5]) b.cyl([x, DY, z], [x, 1.42, z], 0.022, 0.022, 6, ORANGE_D, false);
      for (const x of [-2.75, -1.5, -0.5, 0.5, 1.5, 2.75]) b.box(x, DY + 0.01, z, 0.1, 0.02, 0.1, GUN_D);
    }
    // --- dive ladder at +x: grab hoops over the deck edge, stiles down to y -2.5, flat rungs, slimy below the water
    for (const s of [-1, 1]) {
      const z = s * LADZ;
      cable(b, [[2.72, DY, z], [2.72, 1.12, z], [2.8, 1.32, z], [2.97, 1.38, z], [3.1, 1.27, z], [LADX, 1.0, z], [LADX, 0.0, z]], 0.026, STEEL, 3, 6);
      b.box(2.72, DY + 0.012, z, 0.12, 0.024, 0.1, GUN_D);
      b.cyl([LADX, 0.0, z], [LADX, -2.5, z], 0.026, 0.026, 6, SLIME);
      b.cyl([LADX, -0.05, z], [LADX, 0.08, z], 0.028, 0.028, 6, ALGAE_D, false);
      for (const y of [0.25, -0.35]) b.beam([HX - 0.03, y, z], [LADX - 0.02, y, z], 0.04, y > 0 ? GUN_D : ALGAE_D);
    }
    for (let k = 0; k < 9; k++) { const y = 0.1 - k * 0.3; b.box(LADX, y, 0, 0.065, 0.032, 2 * LADZ, y > 0 ? STEEL : SLIME); }
    // chain across the hoops with a hazard sign: the way down was closed when they left
    const CH = [[2.97, 1.37, -LADZ], [2.97, 1.37, LADZ]];
    rope(b, CH[0], CH[1], 0.14, 0.01, sh(STEEL, 0.8), 10, 4);
    b.push(mulAll(tr(2.97, 1.1, 0), rotY(PI / 2)));
    pz(b, 0, 0, 0.006, 0.36, 0.17, HAZ_Y); text(b, 'NO DIVE', 0, 0.02, 0.008, 0.055, ST_K, true); chevrons(b, -0.17, 0.17, -0.06, 0.008, 0.025, 8, BLACK, HAZ_Y);
    b.box(0, 0, 0, 0.38, 0.19, 0.01, GUN_D);
    for (const e of [-1, 1]) b.beam([e * 0.14, 0.09, 0], [e * 0.1, 0.17, 0], 0.008, STEEL);
    b.pop();
    // --- davit with a hand winch; its cable still runs down into the black water to a shot weight
    const [DX, DZ] = DAV, TOP = 1.95, TIP = 3.6;
    b.box(DX, DY + 0.015, DZ, 0.32, 0.03, 0.32, GUN_D);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cyl([DX + ox * 0.12, DY + 0.03, DZ + oz * 0.12], [DX + ox * 0.12, DY + 0.06, DZ + oz * 0.12], 0.015, 0.015, 6, STEEL);
    b.cyl([DX, DY, DZ], [DX, TOP, DZ], 0.055, 0.05, 10, ORANGE);
    for (let k = 0; k < 4; k++) b.cyl([DX, 0.5 + k * 0.08, DZ], [DX, 0.54 + k * 0.08, DZ], 0.057, 0.057, 10, k % 2 ? BLACK : HAZ_Y, false);
    b.cyl([DX, TOP - 0.06, DZ], [DX, TOP + 0.04, DZ], 0.07, 0.07, 10, GUN_D);
    b.beam([DX, TOP, DZ], [TIP, TOP + 0.04, DZ], 0.075, ORANGE, 0.06);
    b.beam([DX + 0.04, 1.5, DZ], [3.0, TOP - 0.03, DZ], 0.04, ORANGE_D);
    b.box(TIP - 0.02, TOP - 0.05, DZ, 0.1, 0.12, 0.1, GUN_D);
    b.cyl([TIP, TOP - 0.06, DZ - 0.025], [TIP, TOP - 0.06, DZ + 0.025], 0.06, 0.06, 10, STEEL);
    b.cyl([TIP + 0.06, TOP - 0.06, DZ], [TIP + 0.06, 0.0, DZ], 0.007, 0.007, 4, CABLE_K, false);
    b.cyl([TIP + 0.06, 0.0, DZ], [TIP + 0.06, -1.25, DZ], 0.007, 0.007, 4, ALGAE_D, false);
    b.lathe([[0, -1.48], [0.07, -1.45], [0.08, -1.36], [0.04, -1.27], [0.012, -1.25], [0, -1.24]], 8, SLIME);
    // winch on the post: drum, flanges, crank
    const WY = 0.95, WX = DX + 0.13;
    b.box(DX + 0.06, WY, DZ, 0.1, 0.2, 0.2, GUN_D);
    b.cyl([WX, WY, DZ - 0.09], [WX, WY, DZ + 0.09], 0.05, 0.05, 10, CABLE_K);
    for (const e of [-1, 1]) b.cyl([WX, WY, DZ + e * 0.09], [WX, WY, DZ + e * 0.105], 0.085, 0.085, 10, ORANGE_D);
    b.cyl([WX, WY, DZ + 0.105], [WX, WY, DZ + 0.15], 0.012, 0.012, 6, STEEL);
    b.beam([WX, WY, DZ + 0.15], [WX + 0.04, WY - 0.16, DZ + 0.15], 0.025, GUN_D);
    b.cyl([WX + 0.04, WY - 0.16, DZ + 0.15], [WX + 0.04, WY - 0.16, DZ + 0.24], 0.016, 0.016, 6, RUBBER);
    b.tube([[WX + 0.05, WY + 0.02, DZ], [DX + 0.08, 1.4, DZ], [DX + 0.07, TOP + 0.05, DZ], [TIP - 0.05, TOP + 0.05, DZ]], 0.006, 4, CABLE_K);
    text(b, 'W-2', DX - 0.035, 1.25, DZ + 0.056, 0.05, ST_K);
    // --- cleats, coiled rope, a line over the side into the water
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cleat(b, sx * 2.88, DY, sz * 1.3, 0);
    coil(b, -2.2, DY, 0.75, 0.24, 0.018, 3, ROPE, 31, 5);
    cable(b, [[-2.9, DY + 0.065, 1.3], [-2.75, DY + 0.03, 1.05], [-2.45, DY + 0.02, 0.98], [-2.25, DY + 0.04, 0.95]], 0.016, ROPE, 3, 5);
    cable(b, [[2.95, DY + 0.065, 1.3], [3.05, DY + 0.02, 1.42], [3.12, 0.2, 1.52], [3.18, -0.1, 1.55], [3.25, -0.7, 1.45]], 0.016, ROPE, 3, 5);
    // --- deck locker with dive kit, and one fin left on the deck
    const LX0 = -1.6, LZ0 = -0.92;
    b.box(LX0, DY + 0.22, LZ0, 1.0, 0.44, 0.5, BONE);
    b.box(LX0, DY + 0.46, LZ0, 1.04, 0.05, 0.54, ORANGE);
    b.box(LX0, DY + 0.04, LZ0, 1.02, 0.08, 0.52, DAMP);
    for (const e of [-1, 1]) { b.box(LX0 + e * 0.3, DY + 0.4, LZ0 + 0.26, 0.06, 0.08, 0.02, GUN_D); b.box(LX0 + e * 0.52, DY + 0.25, LZ0, 0.02, 0.05, 0.2, GUN_D); }
    text(b, 'DIVE KIT', LX0 - 0.42, DY + 0.28, LZ0 + 0.251, 0.06, ST_K); hazard(b, LX0 - 0.48, LX0 + 0.48, DY + 0.12, LZ0 + 0.251, 0.04, 12);
    b.push(mulAll(tr(1.95, DY + 0.006, 0.55), rotY(0.7)));
    b.plate([0, 0, -0.1], [0, 0, 0.1], [0.42, 0, 0.15], [0.42, 0, -0.15], BLACK);
    b.box(-0.06, 0.03, 0, 0.2, 0.06, 0.15, RUBBER); b.box(0.2, 0.004, 0, 0.36, 0.004, 0.03, GUN_D);
    b.pop();
    // --- gangway at -x: hinge on the deck edge, sloping up to the shore at y ~1.2, roller at the shore end
    b.push(mulAll(tr(-HX, DY, 0), rotZ(-GW_TH)));
    b.box(-GW_L / 2, -0.025, 0, GW_L, 0.05, 0.9, GUN);
    for (const e of [-1, 1]) { b.box(-GW_L / 2, -0.06, e * 0.47, GW_L, 0.15, 0.05, ORANGE_D); b.box(-GW_L / 2, -0.06, e * 0.497, GW_L - 0.1, 0.02, 0.003, HAZ_Y); }
    for (let k = 0; k < 9; k++) b.box(-0.18 - k * 0.25, 0.012, 0, 0.035, 0.025, 0.86, GUN_D);
    b.cyl([0.02, -0.05, -0.5], [0.02, -0.05, 0.5], 0.035, 0.035, 8, STEEL);
    for (const e of [-0.4, 0, 0.4]) b.box(0.05, -0.06, e, 0.1, 0.08, 0.08, GUN_D);
    b.cyl([-GW_L + 0.06, -0.1, -0.44], [-GW_L + 0.06, -0.1, 0.44], 0.06, 0.06, 8, RUBBER);
    b.pop();
    for (const e of [-1, 1]) {
      const z = e * 0.47, us = [0.25, 1.25, GW_L - 0.15];
      for (const u of us) { const p = gwP(u); b.cyl([p[0], p[1] - 0.02, z], [p[0], p[1] + 0.95, z], 0.02, 0.02, 6, ORANGE_D, false); }
      const a = gwP(us[0]), c = gwP(us[2]);
      cable(b, [[a[0] + 0.1, a[1] + 0.6, z], [a[0], a[1] + 0.93, z], [c[0], c[1] + 0.95, z], [c[0] - 0.08, c[1] + 0.95, z]], 0.022, ORANGE, 2, 6);
    }
    return b;
  }

  // =========================================================================================================
  // 2. TANK RACK: six-slot cylinder rack (one slot empty, one tank fallen out), regulators, fill whips, compressor
  // =========================================================================================================
  const TR = 0.088, TZ = -0.12, SX = i => -0.7 + i * 0.2;
  function tank(b, detail, reg, lying) {               // upright, bottom at origin, valve toward the top, outlet toward +z
    if (!detail) { b.cyl([0, 0, 0], [0, 0.98, 0], TR, TR * 0.5, 5, BONE_D); b.box(0, 1.04, 0, 0.05, 0.08, 0.05, STEEL); return; }
    b.lathe((lying ? [[0, 0, RUBBER]] : []).concat([[TR + 0.006, 0, RUBBER], [TR + 0.006, 0.12, RUBBER], [TR, 0.12, BONE_D], [TR, 0.8, ORANGE], [TR * 0.8, 0.92, ORANGE], [TR * 0.35, 0.985, ORANGE], [0.024, 0.99]]), 8, BONE_D, PI / 8, PI / 8 + TAU);
    b.cyl([0, 0.98, 0], [0, 1.04, 0], 0.02, 0.02, 6, STEEL, false);
    b.box(0, 1.06, 0, 0.05, 0.05, 0.045, STEEL);
    b.box(0.035, 1.06, 0, 0.02, 0.055, 0.055, RUBBER);
    b.box(0, 1.06, 0.035, 0.026, 0.026, 0.03, STEEL);
    if (reg) {                                 // first stage, two hoses: demand valve and pressure gauge hanging in front
      b.cyl([0, 1.06, 0.05], [0, 1.06, 0.11], 0.027, 0.027, 6, GUN_D);
      cable(b, [[0.02, 1.07, 0.1], [0.09, 1.02, 0.15], [0.11, 0.8, 0.14], [0.07, 0.62, 0.12]], 0.008, BLACK, 2, 4);
      b.push(mulAll(tr(0.07, 0.58, 0.12), rotX(0.2))); b.cyl([0, 0, -0.025], [0, 0, 0.025], 0.04, 0.04, 6, GUN_D); b.box(0, -0.04, 0.03, 0.03, 0.03, 0.04, BLACK); b.pop();
      cable(b, [[-0.02, 1.05, 0.1], [-0.08, 0.98, 0.13], [-0.1, 0.8, 0.12], [-0.08, 0.7, 0.11]], 0.008, BLACK, 2, 4);
      b.push(mulAll(tr(-0.08, 0.68, 0.11), rotX(PI / 2 - 0.2))); b.cyl([0, -0.015, 0], [0, 0.015, 0], 0.032, 0.032, 6, GUN_D); b.pop();
      b.push(mulAll(tr(-0.08, 0.68, 0.11), rotX(-0.2))); pz(b, 0, 0, 0.0155, 0.04, 0.04, LENS_L); b.pop();
    }
  }
  function buildTanks(detail) {
    const b = new MB();
    const X0 = -0.85, X1 = 0.43, ZF = 0.0, ZB = -0.25, XC = (X0 + X1) / 2, W = X1 - X0;
    if (!detail) {
      b.box(XC, 0.025, TZ, W, 0.05, 0.34, GUN_D);
      for (const x of [X0, X1]) for (const z of [ZF, ZB]) b.beam([x, 0.05, z], [x, 1.45, z], 0.04, GUN);
      for (const y of [0.4, 0.92]) b.box(XC, y, ZF, W, 0.04, 0.03, ORANGE_D);
      b.box(XC, 1.45, TZ, W, 0.05, 0.3, ORANGE);
      for (const i of [0, 1, 3, 5]) { b.push(tr(SX(i), 0.05, TZ)); tank(b, 0); b.pop(); }
      b.push(mulAll(tr(-0.55, TR + 0.006, 0.24), rotY(0.1), rotZ(-PI / 2))); tank(b, 0); b.pop();
      b.box(0.62, 0.2, -0.12, 0.32, 0.4, 0.42, BONE); b.cyl([0.62, 0.48, -0.3], [0.62, 0.48, 0.06], 0.08, 0.08, 6, GUN_D);
      return b;
    }
    // --- base: skid with tank cups, front kick plate with hazard and stencil
    b.box(XC, 0.03, TZ, W + 0.04, 0.06, 0.36, GUN_D);
    for (const z of [ZF, ZB]) b.box(XC, 0.015, z, W + 0.1, 0.03, 0.05, GUN);
    for (let i = 0; i < 6; i++) b.cyl([SX(i), 0.06, TZ], [SX(i), 0.09, TZ], TR + 0.016, TR + 0.016, 6, GUN, false);
    b.push(tr(0, 0, 0.046)); chevrons(b, X0 + 0.02, X0 + 0.42, 0.03, 0.0, 0.04, 6); text(b, 'AIR', X0 + 0.5, 0.03, 0.0, 0.04, ST_W); b.pop();
    b.box(XC, 0.065, TZ, W, 0.01, 0.34, DAMP);
    // --- frame: corner posts, front and back hoop bars, top frame, side panel with stencil
    for (const x of [X0, X1]) for (const z of [ZF, ZB]) b.box(x, 0.75, z, 0.045, 1.4, 0.045, GUN);
    for (const y of [0.42, 0.95]) { b.box(XC, y, ZF, W, 0.04, 0.03, GUN_D); b.box(XC, y, ZB, W, 0.04, 0.03, GUN_D); }
    for (const z of [ZF, ZB]) b.box(XC, 1.45, z, W + 0.045, 0.05, 0.05, ORANGE);
    for (const x of [X0, X1]) b.box(x, 1.45, TZ - 0.005, 0.05, 0.05, ZF - ZB, ORANGE);
    for (let i = 0; i < 5; i++) b.box((SX(i) + SX(i + 1)) / 2, 0.95, TZ, 0.02, 0.04, ZF - ZB, GUN_D);   // slot dividers
    b.box(X0, 0.75, TZ, 0.01, 0.5, 0.22, BONE_D);
    b.push(mulAll(tr(X0 - 0.006, 0.75, TZ), rotY(-PI / 2))); text(b, 'DV-1', 0, 0.12, 0, 0.05, ST_K, true); text(b, 'KR-07', 0, 0.02, 0, 0.035, ST_K, true); hazard(b, -0.1, 0.1, -0.16, 0, 0.04, 6); b.pop();
    // --- fill manifold on the top back rail with fill whips
    b.cyl([X0 + 0.05, 1.37, ZB + 0.03], [X1 - 0.02, 1.37, ZB + 0.03], 0.018, 0.018, 8, STEEL);
    for (let i = 0; i < 6; i++) { b.box(SX(i), 1.37, ZB + 0.05, 0.04, 0.05, 0.04, ORANGE_D); b.box(SX(i), 1.405, ZB + 0.05, 0.012, 0.03, 0.05, GUN_D); }
    // --- standing tanks (slots 0, 1, 3, 5), straps closed; slot 2 empty, slot 4 fell out
    const occ = { 0: 1, 1: 0, 3: 1, 5: 0 };
    for (const i of [0, 1, 3, 5]) {
      b.push(tr(SX(i), 0.09, TZ)); tank(b, 1, occ[i]); b.pop();
      b.box(SX(i), 0.95, TZ + TR + 0.012, 0.19, 0.05, 0.012, ORANGE_D);
      pz(b, SX(i), 0.69, TZ + TR * 0.924 + 0.002, 0.062, 0.1, ST_W); pz(b, SX(i), 0.69, TZ + TR * 0.924 + 0.003, 0.05, 0.012, ORANGE_D);
      b.box(SX(i) + 0.05, 0.95, TZ + TR + 0.02, 0.03, 0.035, 0.012, STEEL);
    }
    // whip connected to tank 5, two loose whips hanging, one dangling over the empty slot
    cable(b, [[SX(5), 1.4, ZB + 0.07], [SX(5) + 0.02, 1.3, TZ], [SX(5), 1.2, TZ + 0.06], [SX(5), 1.15, TZ + 0.06]], 0.008, CABLE_K, 2, 4);
    for (const i of [2, 4]) {
      cable(b, [[SX(i), 1.4, ZB + 0.07], [SX(i) + 0.03, 1.3, TZ + 0.05], [SX(i) + 0.02, 1.0, TZ + 0.12], [SX(i) - 0.02, 0.86, TZ + 0.1]], 0.008, CABLE_K, 2, 4);
      b.cyl([SX(i) - 0.02, 0.88, TZ + 0.1], [SX(i) - 0.025, 0.82, TZ + 0.1], 0.014, 0.014, 6, STEEL);
      // open strap hanging down from the front bar
      cable(b, [[SX(i) - 0.09, 0.95, ZF + 0.02], [SX(i) - 0.08, 0.8, ZF + 0.03], [SX(i) - 0.07, 0.68, ZF + 0.02]], 0.012, ORANGE_D, 2, 4);
    }
    // the fallen tank lying in front, its regulator hose trailing on the ground
    b.push(mulAll(tr(-0.62, TR + 0.006, 0.24), rotY(0.1), rotZ(-PI / 2))); tank(b, 1, 0, 1); b.pop();
    cable(b, [[0.47, 0.095, 0.2], [0.55, 0.03, 0.26], [0.42, 0.008, 0.33], [0.25, 0.008, 0.31]], 0.008, BLACK, 2, 4);
    // --- compressor box on the ground at +x: roll frame, motor, finned head, intake filter, gauge, hoses
    const CX = 0.62, CZ = -0.12, CW = 0.32, CH = 0.4, CD = 0.42;
    b.box(CX, CH / 2 + 0.02, CZ, CW, CH, CD, BONE);
    b.box(CX, 0.01, CZ, CW + 0.04, 0.02, CD + 0.04, GUN_D);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(CX + sx * CW / 2, CH / 2 + 0.03, CZ + sz * CD / 2, 0.03, CH + 0.02, 0.03, ORANGE_D);
    b.box(CX, CH + 0.03, CZ, CW + 0.03, 0.02, CD + 0.03, ORANGE);
    b.cyl([CX, CH + 0.12, CZ - 0.2], [CX, CH + 0.12, CZ + 0.08], 0.075, 0.075, 8, GUN_D);
    for (let k = 0; k < 2; k++) b.cyl([CX, CH + 0.12, CZ + 0.1 + k * 0.03], [CX, CH + 0.12, CZ + 0.112 + k * 0.03], 0.09, 0.09, 8, GUN);
    b.cyl([CX + 0.08, CH + 0.04, CZ + 0.12], [CX + 0.08, CH + 0.2, CZ + 0.12], 0.04, 0.04, 8, OLIVE_D);
    b.cyl([CX + 0.08, CH + 0.2, CZ + 0.12], [CX + 0.08, CH + 0.22, CZ + 0.12], 0.046, 0.046, 8, GUN_D);
    for (let k = 0; k < 6; k++) b.box(CX + CW / 2 + 0.003, 0.12 + k * 0.035, CZ, 0.006, 0.014, CD - 0.12, GUN_D);
    b.push(tr(0, 0, CZ + CD / 2 + 0.002));
    pz(b, CX, 0.3, 0, CW - 0.06, 0.13, GUN_D); pz(b, CX - 0.06, 0.3, 0.002, 0.07, 0.07, LENS_L); pz(b, CX - 0.06, 0.3, 0.003, 0.006, 0.03, BLACK);
    pz(b, CX + 0.04, 0.32, 0.002, 0.02, 0.02, [0.3, 0.12, 0.08]); b.box(CX + 0.08, 0.28, 0.01, 0.02, 0.04, 0.02, ORANGE);
    text(b, 'AIR-2', CX, 0.16, 0.001, 0.045, ST_K, true); hazard(b, CX - CW / 2 + 0.03, CX + CW / 2 - 0.03, 0.07, 0.001, 0.035, 8);
    b.pop();
    cable(b, [[CX - 0.08, CH + 0.04, CZ - 0.12], [CX - 0.12, 0.8, ZB - 0.02], [X1 - 0.05, 1.25, ZB - 0.01], [X1 - 0.03, 1.37, ZB + 0.03]], 0.012, CABLE_K, 2, 5);
    cable(b, [[CX, 0.12, CZ - CD / 2], [CX + 0.02, 0.025, CZ - CD / 2 - 0.08], [CX - 0.1, 0.018, CZ - CD / 2 - 0.1], [CX - 0.3, 0.018, -0.36]], 0.016, CABLE_O, 2, 5);
    return b;
  }

  // =========================================================================================================
  // 3. LOG TERMINAL: rugged terminal on a folding stand, hooded screen facing +z, keypad tray, cable to a battery case
  // =========================================================================================================
  const TW = 0.5, THh = 0.36, TD = 0.12, TY = 1.07, TZ0 = -0.03, TTILT = -0.18, SCR_Y = 0.03;
  const termM = mulAll(tr(0, TY, TZ0), rotX(TTILT));
  const TERM_ATTACH = [r3(xf(termM, [0, SCR_Y, TD / 2 + 0.004 + 0.01]))];
  function buildTerminal(detail) {
    const b = new MB();
    const legs = s => [[[s * 0.21, 0.88, -0.04], [s * 0.27, 0.024, 0.24]], [[s * 0.21, 0.88, -0.04], [s * 0.27, 0.024, -0.32]]];
    if (!detail) {
      for (const s of [-1, 1]) for (const [a, c] of legs(s)) b.beam(a, c, 0.035, GUN_D);
      b.box(0, 0.9, 0, 0.46, 0.04, 0.3, GUN_D); b.box(0, 0.95, 0.15, 0.36, 0.04, 0.14, BONE_D);
      b.push(termM); b.box(0, 0, 0, TW, THh, TD, BONE_D); pz(b, 0, SCR_Y, TD / 2 + 0.004, 0.38, 0.24, SCREEN);
      b.plate([-TW / 2 - 0.02, THh / 2 + 0.01, TD / 2 - 0.02], [TW / 2 + 0.02, THh / 2 + 0.01, TD / 2 - 0.02], [TW / 2 + 0.03, THh / 2 - 0.01, TD / 2 + 0.12], [-TW / 2 - 0.03, THh / 2 - 0.01, TD / 2 + 0.12], ORANGE); b.pop();
      b.box(0.3, 0.1, -0.36, 0.34, 0.2, 0.22, GUN_D);
      b.tube([[0.12, 0.95, -0.1], [0.2, 0.3, -0.2], [0.2, 0.02, -0.3], [0.2, 0.08, -0.36]], 0.012, 3, CABLE_K);
      return b;
    }
    // --- folding stand: two A-frame leg pairs, hinge hubs, spreader bars, feet, mounting tray
    for (const s of [-1, 1]) {
      for (const [a, c] of legs(s)) { b.beam(a, c, 0.032, GUN_D, 0.022); b.box(c[0], 0.012, c[2], 0.07, 0.024, 0.07, RUBBER); }
      b.cyl([s * 0.18, 0.88, -0.04], [s * 0.245, 0.88, -0.04], 0.03, 0.03, 8, ORANGE_D);
      b.beam([s * 0.25, 0.32, 0.15], [s * 0.25, 0.32, -0.22], 0.018, STEEL);
    }
    b.beam([-0.255, 0.32, -0.21], [0.255, 0.32, -0.21], 0.022, ORANGE);
    b.box(0, 0.32, -0.198, 0.4, 0.035, 0.003, HAZ_Y);
    b.box(0, 0.9, -0.02, 0.44, 0.035, 0.3, GUN_D);
    for (const s of [-1, 1]) b.box(s * 0.205, 0.93, -0.02, 0.02, 0.04, 0.3, ORANGE_D);
    // --- keypad tray tipped toward the reader
    b.push(mulAll(tr(0, 0.94, 0.17), rotX(0.32)));
    b.box(0, 0, 0, 0.38, 0.035, 0.15, BONE_D);
    py(b, 0, 0.0176, 0, 0.34, 0.12, GUN_D);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) boxM(b, -0.135 + i * 0.054, 0.024, -0.035 + j * 0.035, 0.038, 0.012, 0.026, j === 2 && i > 3 ? ORANGE : (j === 2 && i === 0 ? LED_R : BONE), 'yz');
    b.pop();
    // --- terminal case, rubber corner bumpers, bezel, screen, hood
    b.push(termM);
    b.box(0, 0, 0, TW, THh, TD, BONE_D);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.box(sx * (TW / 2 - 0.01), sy * (THh / 2 - 0.01), 0, 0.05, 0.05, TD + 0.016, RUBBER);
    const fz = TD / 2;
    pz(b, 0, SCR_Y, fz + 0.001, 0.42, 0.28, GUN_D);
    pz(b, 0, SCR_Y, fz + 0.004, 0.38, 0.24, SCREEN);
    b.box(0, SCR_Y - 0.13, fz + 0.004, 0.42, 0.012, 0.008, GUN);
    text(b, 'DIVE LOG', -0.21, 0.165, fz + 0.002, 0.022, ST_K); text(b, 'DV-1', 0.13, 0.165, fz + 0.002, 0.022, ORANGE_D);
    chevrons(b, -0.21, 0.02, -0.145, fz + 0.002, 0.03, 6);
    for (let k = 0; k < 3; k++) pz(b, 0.08 + k * 0.035, -0.145, fz + 0.002, 0.016, 0.016, k === 0 ? LED_G : [0.3, 0.12, 0.08]);
    b.box(0.19, -0.145, fz + 0.01, 0.025, 0.025, 0.02, ORANGE);
    // hood: top plate and two side flaps, hazard edge on the lip
    const HL = 0.14, y0 = THh / 2;
    b.plate([-TW / 2 - 0.015, y0 + 0.012, fz - 0.03], [TW / 2 + 0.015, y0 + 0.012, fz - 0.03], [TW / 2 + 0.03, y0 - 0.012, fz + HL], [-TW / 2 - 0.03, y0 - 0.012, fz + HL], ORANGE);
    b.plate([-TW / 2 - 0.03, y0 - 0.018, fz + HL], [TW / 2 + 0.03, y0 - 0.018, fz + HL], [TW / 2 + 0.015, y0 + 0.006, fz - 0.03], [-TW / 2 - 0.015, y0 + 0.006, fz - 0.03], ORANGE_D);
    b.push(tr(0, y0 - 0.02, fz + HL + 0.001)); for (let k = 0; k < 10; k++) { const w = (TW + 0.06) / 10, x0 = -(TW + 0.06) / 2 + k * w; b.plate([x0, -0.008, 0], [x0 + w, -0.008, 0], [x0 + w + 0.01, 0.008, 0], [x0 + 0.01, 0.008, 0], k % 2 ? BLACK : HAZ_Y); } b.pop();
    for (const sx of [-1, 1]) {
      const x = sx * (TW / 2 + 0.02), P = [[x, y0 + 0.01, fz - 0.03], [x, -0.05, fz - 0.03], [x + sx * 0.012, 0.0, fz + HL * 0.7], [x + sx * 0.012, y0 - 0.012, fz + HL]];
      facet(b, P, GUN, [sx, 0, 0]); facet(b, P.map(q => [q[0] - sx * 0.004, q[1], q[2]]), GUN_D, [-sx, 0, 0]);
      // side carry handles
      b.tube([[sx * TW / 2, 0.1, -0.03], [sx * (TW / 2 + 0.05), 0.09, -0.03], [sx * (TW / 2 + 0.05), -0.09, -0.03], [sx * TW / 2, -0.1, -0.03]], 0.012, 5, GUN_D);
    }
    // back: vent fins, stub antenna, cable gland
    for (let k = 0; k < 5; k++) b.box(-0.12 + k * 0.06, 0, -fz - 0.01, 0.015, THh - 0.1, 0.02, GUN);
    b.cyl([0.18, y0, -0.02], [0.19, y0 + 0.1, -0.02], 0.008, 0.005, 5, BLACK); b.cyl([0.18, y0, -0.02], [0.18, y0 + 0.03, -0.02], 0.018, 0.018, 6, GUN_D);
    b.cyl([0.12, -0.12, -fz], [0.12, -0.12, -fz - 0.05], 0.022, 0.018, 8, GUN_D);
    b.pop();
    // --- cable down the back leg to the battery case on the ground
    const g = xf(termM, [0.12, -0.12, -TD / 2 - 0.05]);
    cable(b, [g, [0.17, 0.78, -0.12], [0.24, 0.45, -0.24], [0.27, 0.1, -0.3], [0.25, 0.022, -0.24], [0.15, 0.022, -0.3], [0.13, 0.08, -0.36]], 0.012, CABLE_K, 3, 5);
    const BX = 0.3, BZ = -0.37;
    b.box(BX, 0.1, BZ, 0.32, 0.18, 0.22, GUN_D);
    for (const e of [-1, 1]) b.box(BX + e * 0.17, 0.1, BZ, 0.03, 0.2, 0.24, ORANGE_D);
    b.box(BX, 0.195, BZ, 0.33, 0.012, 0.23, GUN);
    for (const e of [-1, 1]) b.box(BX + e * 0.08, 0.22, BZ, 0.02, 0.04, 0.02, GUN_D);
    b.cyl([BX - 0.09, 0.24, BZ], [BX + 0.09, 0.24, BZ], 0.012, 0.012, 6, RUBBER);
    b.cyl([BX - 0.17, 0.08, BZ], [BX - 0.2, 0.08, BZ], 0.02, 0.02, 6, GUN_D);
    b.push(tr(0, 0, BZ + 0.111)); chevrons(b, BX - 0.14, BX + 0.14, 0.04, 0, 0.035, 7); text(b, 'BAT-2', BX, 0.12, 0, 0.04, ST_W, true); pz(b, BX + 0.12, 0.155, 0.001, 0.015, 0.015, LED_G); b.pop();
    b.box(BX, 0.005, BZ, 0.36, 0.01, 0.26, MUD);
    return b;
  }

  // =========================================================================================================
  // 4. LINE SPOOL: guideline reel on a stake hammered into the rock; the line tied off on a rock knob, then off to +x
  // =========================================================================================================
  const AXY = 0.42, SPR = 0.15, CORE_R = 0.105, LINE_END = [0.95, 0.006, 0.03];
  const SPOOL_ATTACH = [LINE_END.slice()];
  function buildSpool(detail) {
    const b = new MB();
    const KN = [0.4, 0.0, 0.02];
    if (!detail) {
      b.cyl([0, -0.05, 0], [0, 0.34, 0], 0.016, 0.016, 4, STEEL, false);
      b.cyl([0, AXY, -0.06], [0, AXY, 0.06], SPR, SPR, 6, ORANGE);
      b.beam([0, AXY, 0.065], [0.09, AXY - 0.06, 0.065], 0.02, GUN_D);
      b.push(tr(KN[0], 0, KN[2])); b.lathe([[0.07, 0], [0.04, 0.07], [0, 0.09]], 4, ROCK); b.pop();
      b.tube([[0.05, AXY - 0.09, 0], [0.3, 0.06, 0.0], [0.6, 0.006, 0.05], LINE_END], 0.005, 3, LINE);
      return b;
    }
    const r = rnd(6113);
    // stake: pointed steel driven into the rock, mushroomed strike head, rock chips around it
    b.lathe([[0, -0.12, STEEL], [0.016, -0.04, STEEL], [0.016, 0.28, STEEL], [0.026, 0.29, sh(STEEL, 0.8)], [0.026, 0.305], [0, 0.31]], 6, STEEL);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + r(); b.push(mulAll(tr(Math.cos(a) * 0.06, 0.008, Math.sin(a) * 0.06), rotY(r() * TAU), rotZ((r() - 0.5) * 0.4))); b.box(0, 0, 0, 0.03 + r() * 0.03, 0.016, 0.025 + r() * 0.02, ROCK); b.pop(); }
    b.cyl([0, 0.0, 0], [0, 0.004, 0], 0.07, 0.07, 8, DUST, false);
    // clamp block and fork holding the reel axle (along z)
    b.box(0, 0.31, 0, 0.06, 0.05, 0.06, GUN_D);
    b.box(0.03, 0.3, 0, 0.012, 0.03, 0.03, ORANGE);
    for (const e of [-1, 1]) b.beam([0, 0.33, e * 0.03], [0, AXY + 0.01, e * 0.075], 0.02, GUN_D, 0.012);
    b.cyl([0, AXY, -0.088], [0, AXY, 0.088], 0.012, 0.012, 6, STEEL);
    b.cyl([0, AXY, 0.064], [0, AXY, 0.076], 0.03, 0.03, 6, GUN_D);
    // reel: two orange flanges with lightening holes, wound line on the core
    for (const e of [-1, 1]) {
      b.cyl([0, AXY, e * 0.052], [0, AXY, e * 0.064], SPR, SPR, 10, ORANGE);
      for (let k = 0; k < 4; k++) {
        const a = k * PI / 2 + 0.4, hx = Math.cos(a) * 0.09, hy = AXY + Math.sin(a) * 0.09;
        b.push(mulAll(tr(hx, hy, e * 0.0645), e < 0 ? rotY(PI) : tr(0, 0, 0))); pz(b, 0, 0, 0, 0.04, 0.04, ORANGE_D); b.pop();
      }
    }
    b.cyl([0, AXY, -0.052], [0, AXY, 0.052], CORE_R, CORE_R, 12, LINE, false);
    b.cyl([0, AXY, -0.012], [0, AXY, 0.012], CORE_R + 0.002, CORE_R + 0.002, 12, sh(LINE, 0.85), false);
    // crank: arm on the +z flange with a rubber knob
    b.beam([0, AXY, 0.08], [0.0, AXY + 0.11, 0.08], 0.022, GUN_D, 0.01);
    b.cyl([0, AXY + 0.11, 0.08], [0, AXY + 0.11, 0.15], 0.014, 0.012, 6, RUBBER);
    // line guide / lock lever and a bolt snap on the top
    b.beam([0.0, 0.34, 0.03], [0.1, AXY - 0.09, 0.0], 0.014, GUN_D);
    b.box(0.1, AXY - 0.095, 0, 0.03, 0.02, 0.02, STEEL);
    for (const e of [-1, 1]) b.beam([0, AXY, e * 0.07], [0, AXY + 0.17, e * 0.01], 0.012, GUN_D, 0.008);
    b.cyl([0, AXY + 0.17, -0.03], [0, AXY + 0.17, 0.03], 0.012, 0.012, 6, RUBBER);
    // rock knob the line is tied off around
    b.push(tr(KN[0], 0, KN[2])); b.lathe([[0.085, -0.01], [0.075, 0.03], [0.05, 0.075], [0.025, 0.1], [0, 0.105]], 6, ROCK); b.pop();
    // line: off the reel, through the guide, down to the knob, two wraps, then along the ground
    const L1 = smooth([[CORE_R * 0.5, AXY - CORE_R * 0.87, 0.0], [0.1, AXY - 0.1, 0.0], [0.22, 0.17, 0.0], [KN[0] - 0.08, 0.07, KN[2] - 0.02], [KN[0] - 0.05, 0.06, KN[2] + 0.04]], 2);
    const wrap = []; for (let k = 0; k <= 10; k++) { const a = PI + k / 10 * TAU * 1.25, y = 0.06 - k * 0.002; wrap.push([KN[0] + Math.cos(a) * 0.072, y, KN[2] - Math.sin(a) * 0.072]); }
    const L2 = smooth([wrap[wrap.length - 1], [KN[0] + 0.14, 0.012, KN[2] + 0.03], [0.65, 0.006, 0.07], [0.82, 0.006, 0.01], LINE_END], 2);
    b.tube(L1.concat(wrap, L2.slice(1)), 0.0045, 3, LINE);
    // line arrow clipped on the ground run, pointing back toward the spool (the way out)
    b.push(mulAll(tr(0.73, 0.008, 0.05), rotY(0.2)));
    facet(b, [[-0.05, 0.002, 0], [0.04, 0.002, -0.025], [0.04, 0.002, 0.025]], ORANGE, [0, 1, 0]);
    b.box(0.045, 0.004, 0, 0.012, 0.006, 0.05, BLACK);
    b.pop();
    b.box(LINE_END[0], 0.004, LINE_END[2], 0.016, 0.008, 0.016, GUN_D);
    return b;
  }

  // =========================================================================================================
  // 5. DROPPED DIVE LIGHT: battery canister and lamp head on a cord, lying on the rock; lens pale
  // =========================================================================================================
  const DL_M = mulAll(tr(0.02, 0.043, 0.0), rotY(0.35), rotZ(-PI / 2));   // lamp head: local +y -> lens direction (about +x)
  const DL_LEN = 0.165, DL_ATTACH = [r3(xf(DL_M, [0, DL_LEN, 0]))];
  function buildDiveLight(detail) {
    const b = new MB();
    if (!detail) {
      b.cyl([-0.17, 0.045, -0.13], [-0.17, 0.045, 0.13], 0.045, 0.045, 5, ORANGE_D);
      b.push(DL_M); b.cyl([0, 0, 0], [0, DL_LEN - 0.001, 0], 0.03, 0.043, 5, GUN_D); b.push(mulAll(tr(0, DL_LEN, 0), rotX(-PI / 2))); pz(b, 0, 0, 0, 0.06, 0.06, LENS_L); b.pop(); b.pop();
      b.beam([-0.17, 0.02, 0.13], [0.0, 0.02, 0.0], 0.012, BLACK);
      return b;
    }
    // canister lying along z
    b.push(mulAll(tr(-0.17, 0.046, 0.0), rotX(PI / 2)));
    b.lathe([[0, -0.135, GUN_D], [0.04, -0.135, GUN_D], [0.046, -0.12, ORANGE_D], [0.046, -0.03, RUBBER], [0.047, 0.0, ORANGE_D], [0.046, 0.12, GUN_D], [0.04, 0.135, GUN_D], [0, 0.136]], 8, ORANGE_D);
    b.pop();
    b.box(-0.17, 0.095, 0.02, 0.05, 0.012, 0.14, GUN_D);                                     // mounting clip plate
    b.box(-0.17, 0.046, -0.142, 0.022, 0.022, 0.016, ORANGE);                                // switch on the end cap
    // coiled cord from the canister's +z end to the back of the lamp head
    const tail = xf(DL_M, [0, -0.01, 0]);
    cable(b, [[-0.17, 0.046, 0.14], [-0.14, 0.012, 0.22], [-0.04, 0.01, 0.25], [0.04, 0.012, 0.19], [-0.03, 0.012, 0.1], [-0.06, 0.02, 0.03], tail], 0.006, BLACK, 2, 4);
    // lamp head: handle grip, flared head, bezel ring, pale lens
    b.push(DL_M);
    b.lathe([[0.012, -0.012, BLACK], [0.03, 0.0, GUN_D], [0.03, 0.07, RUBBER], [0.032, 0.09, GUN_D], [0.043, 0.13, GUN_D], [0.043, 0.155, GUN], [0.038, DL_LEN, LENS_L], [0, DL_LEN]], 8, GUN_D);
    b.pop();
    // goodman strap handle over the top of the head
    const h0 = xf(DL_M, [0, 0.04, 0]), h1 = xf(DL_M, [0, 0.12, 0]);
    b.tube([[h0[0], h0[1] + 0.03, h0[2]], [(h0[0] + h1[0]) / 2, h0[1] + 0.05, (h0[2] + h1[2]) / 2], [h1[0], h1[1] + 0.04, h1[2]]], 0.008, 3, BLACK);
    return b;
  }

  return {
    name: 'divesite',
    items: [
      { name: 'dive_platform', budget: 6000, build: buildPlatform, colliders: [] },
      { name: 'tank_rack', budget: 3000, build: buildTanks, colliders: [] },
      { name: 'log_terminal', budget: 1500, build: buildTerminal, colliders: [], attach: TERM_ATTACH },
      { name: 'line_spool', budget: 800, build: buildSpool, colliders: [], attach: SPOOL_ATTACH },
      { name: 'dropped_dive_light', budget: 400, build: buildDiveLight, colliders: [], attach: DL_ATTACH }
    ]
  };
}) };
