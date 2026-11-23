window.MODDEF = { fn: (function (K) {
  // Abandoned survey forward station on a ledge inside the crystal cavern. The outpost's survey team (SV-2, unit KR-07)
  // studied the cavern from here and left in a hurry: a scaffold deck, an instrument mast, a core drill, a collapsed hab,
  // a field lab bench with crystal samples, cable runs heading toward the crystals and a stack of cargo cases.
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

  // =========================================================================================================
  // 1. SURVEY DECK: 6 x 4 m steel scaffold platform with screw-jack legs on cribbing, grating, railings, stair, cable tray
  // =========================================================================================================
  const DT = 1.25, FB = 1.03;
  const LEGS = [[-2.86, -1.86, 0.0, 0.62], [0, -1.86, 0.14, 0.52], [2.86, -1.86, 0.31, 0.66], [-2.86, 1.86, 0.07, 0.48], [0, 1.86, 0.23, 0.6], [2.86, 1.86, 0.40, 0.74]];
  const GRATE = [0.66, 0.65, 0.60, 0.25];
  const TRAY_PATH = dz => [[-2.62, DT + 0.12, -1.83 + dz * 0.4], [-2.6, DT + 0.06, -2.04], [-2.52, 0.96, -2.2 + dz], [-2.25, 0.865, -2.2 + dz], [2.75, 0.865, -2.2 + dz], [3.08, 0.8, -2.2 + dz], [3.3, 0.4, -2.18 + dz], [3.42, 0.03, -2.1 + dz], [3.8, 0.03, -1.85 + dz * 1.5], [4.3, 0.03, -2.0 + dz * 2.5], [4.75, 0.03, -1.75 + dz * 3]];
  function buildDeck(detail) {
    const b = new MB(), RT = DT + 1.05;
    if (!detail) {
      b.box(0, DT - 0.02, 0, 6, 0.04, 4, GRATE);
      for (const s of [-1, 1]) { b.box(0, 1.13, s * 1.95, 6, 0.2, 0.1, GUN); b.box(s * 2.95, 1.13, 0, 0.1, 0.2, 3.8, GUN); }
      for (const [x, z, g] of LEGS) { b.box(x, (FB + g) / 2, z, 0.1, FB - g, 0.1, GUN); if (g > 0.01) b.box(x, g / 2, z, 0.4, g, 0.3, OLIVE); }
      b.box(0, RT, -1.95, 5.9, 0.05, 0.05, ORANGE); b.box(-2.95, RT, 0, 0.05, 0.05, 3.9, ORANGE); b.box(2.95, RT, 0, 0.05, 0.05, 3.9, ORANGE); b.box(-0.75, RT, 1.95, 4.4, 0.05, 0.05, ORANGE);
      for (const [x, z] of [[-2.95, -1.95], [2.95, -1.95], [-2.95, 1.95], [2.95, 1.95], [1.5, 1.95], [2.55, 1.95], [0, -1.95], [0, 1.95]]) b.box(x, DT + 0.52, z, 0.05, 1.05, 0.05, ORANGE);
      for (const x of [1.5, 2.55]) b.beam([x, DT - 0.05, 2.0], [x, 0.05, 3.44], 0.05, GUN, 0.18);
      b.beam([2.025, DT - 0.55, 2.62], [2.025, 0.55, 2.86], 1.0, GRATE, 0.5);
      b.box(0.25, 0.85, -2.2, 5.5, 0.06, 0.26, ALU);
      b.tube(smooth(TRAY_PATH(0), 1).filter((p, i) => i !== 4), 0.035, 3, CABLE_O);
      return b;
    }
    const r = rnd(9101);
    // --- frame: perimeter channels, joists, centre beam
    for (const s of [-1, 1]) {
      b.box(0, 1.13, s * 1.95, 6, 0.2, 0.1, GUN); b.box(0, DT - 0.035, s * 1.95, 6, 0.012, 0.12, GUN_D);
      b.box(s * 2.95, 1.13, 0, 0.1, 0.2, 3.8, GUN); b.box(s * 2.95, DT - 0.035, 0, 0.12, 0.012, 3.8, GUN_D);
      b.box(s * 1.0, 1.135, 0, 0.08, 0.17, 3.8, GUN_D);
    }
    b.box(0, 1.135, 0, 5.8, 0.17, 0.08, GUN_D);
    // --- grating panels (bearing bars + cross bars; you can see through them)
    for (const px of [-2, 0, 2]) for (const pzc of [-1, 1]) {
      const tone = 0.93 + 0.1 * r(), G = sh(GRATE, tone), G2 = sh(GRATE, tone * 0.8), W = 1.94, H = 0.035;
      for (const s of [-1, 1]) { boxM(b, px + s * (W / 2 - 0.015), DT - H / 2, pzc, 0.03, H, W, G2, 'yxX'); boxM(b, px, DT - H / 2, pzc + s * (W / 2 - 0.015), W - 0.06, H, 0.03, G2, 'yzZ'); }
      const nb = 28; for (let i = 1; i < nb; i++) boxM(b, px - W / 2 + i * W / nb, DT - H / 2 - 0.002, pzc, 0.012, H - 0.004, W - 0.05, G, 'yxX');
      for (let j = 1; j < 6; j++) boxM(b, px, DT - 0.012, pzc - W / 2 + j * W / 6, W - 0.05, 0.016, 0.012, G2, 'yzZ');
    }
    // --- legs: sleeve, screw-jack collar, telescoping inner leg with pin holes, swivel foot, cribbing to the rock
    for (const [x, z, g, sb] of LEGS) {
      b.box(x, (FB + sb) / 2, z, 0.11, FB - sb, 0.11, GUN);
      b.box(x, FB - 0.015, z, 0.2, 0.03, 0.2, GUN_D);
      b.box(x, sb + 0.035, z, 0.16, 0.07, 0.16, ORANGE);
      b.cyl([x - 0.12, sb + 0.035, z], [x + 0.12, sb + 0.035, z], 0.012, 0.012, 6, STEEL);
      b.beam([x, sb - 0.05, z], [x + 0.18, sb - 0.05, z + 0.1], 0.02, GUN_D);
      const ft = g + 0.06; b.box(x, (sb + ft) / 2, z, 0.075, sb - ft, 0.075, STEEL);
      b.cyl([x, sb - 0.02, z], [x, sb + 0.0, z], 0.06, 0.06, 8, GUN_D);
      for (let yy = sb - 0.08; yy > ft + 0.04; yy -= 0.1) for (const s of [-1, 1]) pz(b, x, yy, z + s * 0.0381, 0.022, 0.022, BLACK);
      b.sphere(x, g + 0.045, z, 0.035, 8, STEEL);
      b.box(x, g + 0.015, z, 0.28, 0.03, 0.28, GUN_D);
      if (g > 0.01) {
        const nl = Math.ceil(g / 0.1 - 0.001), lh = g / nl;
        for (let k = 0; k < nl; k++) {
          const yc = k * lh + lh / 2, rot = k % 2, c = k % 2 ? OLIVE : OLIVE_D, j = (r() - 0.5) * 0.03;
          for (const s of [-1, 1]) rot ? b.box(x + s * 0.11 + j, yc, z, 0.11, lh - 0.004, 0.4, c) : b.box(x, yc, z + s * 0.11 + j, 0.4, lh - 0.004, 0.11, c);
        }
      }
    }
    // --- bracing between legs (X braces on the long sides, single diagonals on the ends)
    for (const zz of [-1.86, 1.86]) {
      const L = LEGS.filter(l => l[1] === zz);
      for (let i = 0; i < 2; i++) { const a = L[i], c = L[i + 1]; b.beam([a[0], FB - 0.03, zz], [c[0], c[3] + 0.1, zz], 0.04, OLIVE_D); b.beam([a[0], a[3] + 0.1, zz], [c[0], FB - 0.03, zz], 0.04, OLIVE_D); }
    }
    for (const xx of [-2.86, 2.86]) { const L = LEGS.filter(l => l[0] === xx); b.beam([xx, FB - 0.03, L[0][1]], [xx, L[1][3] + 0.1, L[1][1]], 0.04, OLIVE_D); }
    // --- railings (safety orange) with bone toe boards
    const post = (x, z, h) => { b.cyl([x, DT, z], [x, DT + (h || 1.08), z], 0.026, 0.026, 8, ORANGE); b.box(x, DT + 0.01, z, 0.09, 0.02, 0.09, GUN_D); };
    const rail = (a, c) => { for (const [yy, rr] of [[RT, 0.025], [DT + 0.55, 0.02]]) b.cyl([a[0], yy, a[1]], [c[0], yy, c[1]], rr, rr, 8, ORANGE, false); };
    const toe = (a, c, col) => { const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2; b.box(mx, DT + 0.06, mz, Math.abs(c[0] - a[0]) + 0.02, 0.12, Math.abs(c[1] - a[1]) + 0.02, col || BONE_D); };
    for (const x of [-2.95, -1.5, 0, 1.5, 2.95]) post(x, -1.95);
    for (const z of [0]) { post(-2.95, z); post(2.95, z); }
    for (const x of [-2.95, -1.5, 0, 1.5, 2.55, 2.95]) post(x, 1.95);
    rail([-2.95, -1.95], [2.95, -1.95]); rail([-2.95, -1.95], [-2.95, 1.95]); rail([2.95, -1.95], [2.95, 1.95]); rail([-2.95, 1.95], [1.5, 1.95]); rail([2.55, 1.95], [2.95, 1.95]);
    toe([-2.93, -1.97], [2.93, -1.97]); toe([-2.97, -1.93], [-2.97, 1.93]); toe([2.97, -1.93], [2.97, 1.93]); toe([-2.93, 1.97], [1.48, 1.97]); toe([2.57, 1.97], [2.93, 1.97]);
    // toe-board hazard stripes either side of the stair gap, and a gate chain left hanging open
    chevrons(b, 0.8, 1.48, DT + 0.06, 1.981, 0.1, 6); chevrons(b, 2.57, 2.93, DT + 0.06, 1.981, 0.1, 3);
    rope(b, [1.5, DT + 0.95, 1.975], [1.62, DT + 0.35, 1.99], 0.0, 0.009, HAZ_Y, 4, 4);
    // --- stair: channel stringers, grating treads with hazard nosings, handrails
    const RISE = DT / 6, GO = 0.24, SZ = 2.0;
    for (const x of [1.53, 2.52]) { b.beam([x, DT - 0.08, SZ + 0.02], [x, 0.06, SZ + 6 * GO + 0.02], 0.05, GUN, 0.2); b.box(x, 0.015, SZ + 6 * GO, 0.14, 0.03, 0.26, GUN_D); }
    for (let i = 1; i <= 5; i++) {
      const y = DT - i * RISE, zc = SZ + i * GO + 0.0;
      boxM(b, 2.025, y - 0.018, zc, 0.95, 0.035, 0.26, GRATE, 'yzZ');
      for (let k = 0; k < 5; k++) boxM(b, 2.025, y - 0.003, zc - 0.11 + k * 0.05, 0.95, 0.004, 0.012, sh(GRATE, 0.7), 'y');
      boxM(b, 2.025, y + 0.001, zc + 0.11, 0.95, 0.004, 0.04, HAZ_Y, 'yz');
    }
    for (const x of [1.5, 2.55]) {
      const top = [x, RT, 1.95], bot = [x, 1.0, SZ + 6 * GO - 0.05];
      b.cyl(top, bot, 0.025, 0.025, 8, ORANGE, false); b.cyl([x, DT + 0.55, 1.95], [x, 0.5, bot[2]], 0.02, 0.02, 8, ORANGE, false);
      b.cyl([x, 0.0, bot[2]], [x, 1.04, bot[2]], 0.026, 0.026, 8, ORANGE);
    }
    // --- cable tray hung on the back (-Z) edge
    const TZ = -2.2;
    for (const s of [-1, 1]) b.box(0.25, 0.86, TZ + s * 0.12, 5.6, 0.07, 0.015, ALU);
    for (let x = -2.4; x <= 2.95; x += 0.3) boxM(b, x, 0.83, TZ, 0.03, 0.012, 0.24, sh(ALU, 0.85), 'yzZxX');
    for (const x of [-2.2, -0.75, 0.75, 2.2]) { b.box(x, 0.915, -2.015, 0.05, 0.23, 0.03, GUN_D); b.box(x, 0.805, TZ - 0.0, 0.05, 0.03, 0.4, GUN_D); }
    // junction box on the deck feeding the tray, cables over the edge, along the tray, down to the rock and away toward the crystals
    b.box(-2.62, DT + 0.15, -1.68, 0.36, 0.3, 0.24, BONE); b.box(-2.62, DT + 0.31, -1.68, 0.38, 0.03, 0.26, ORANGE);
    for (const s of [-1, 1]) b.box(-2.62 + s * 0.19, DT + 0.15, -1.68, 0.02, 0.26, 0.2, GUN_D);
    text(b, 'JB-1', -2.62, DT + 0.18, -1.559, 0.06, ST_K, true); pz(b, -2.5, DT + 0.07, -1.559, 0.025, 0.025, LED_R);
    [[CABLE_O, 0.07, -0.07], [CABLE_K, 0.0, 0.0], [CABLE_L, -0.06, 0.07]].forEach(([col, dz, off]) => {
      const P = TRAY_PATH(dz); P[0] = [P[0][0] + off, P[0][1], P[0][2]]; cable(b, P, 0.022, col, 4, 6);
    });
    // stencils: big unit codes on the frame
    text(b, 'SV-2 SURVEY', -2.6, 1.13, 2.001, 0.12, ST_W);
    hazard(b, 0.9, 1.45, 1.13, 2.001, 0.12, 5); hazard(b, 2.6, 2.94, 1.13, 2.001, 0.12, 3);
    b.push(mulAll(tr(-3.001, 0, 0), rotY(-PI / 2))); text(b, 'KR-07', 0, 1.13, 0, 0.12, ST_W, true); b.pop();
    b.push(mulAll(tr(0, 0, -2.001), rotY(PI))); text(b, 'LOAD 2T', -1.8, 1.13, 0, 0.1, ST_W, true); b.pop();
    // hanging sign on the front rail
    b.box(-0.75, RT - 0.22, 1.975, 0.62, 0.32, 0.02, BONE); b.cyl([-0.95, RT, 1.975], [-0.95, RT - 0.07, 1.975], 0.006, 0.006, 4, STEEL); b.cyl([-0.55, RT, 1.975], [-0.55, RT - 0.07, 1.975], 0.006, 0.006, 4, STEEL);
    text(b, 'SV-2', -0.75, RT - 0.17, 1.986, 0.13, ORANGE_D, true); text(b, 'FWD STN', -0.75, RT - 0.31, 1.986, 0.05, ST_K, true);
    // work-light mast on the front-left corner, knocked askew in its clamps
    b.box(-2.95, DT + 0.25, 1.95, 0.08, 0.06, 0.08, GUN_D);
    b.push(mulAll(tr(-2.95, DT + 0.25, 1.95), rotZ(0.3), rotX(0.22)));
    b.cyl([0, -0.1, 0], [0, 1.9, 0], 0.03, 0.03, 8, BONE); b.cyl([0, 0.5, 0], [0, 0.56, 0], 0.036, 0.036, 8, HAZ_Y);
    b.push(mulAll(tr(0, 1.95, 0), rotX(0.5)));
    b.box(0, 0, 0, 0.34, 0.2, 0.12, GUN); b.box(0, 0, 0.065, 0.3, 0.16, 0.01, LENS_L); b.box(0, 0.11, 0.02, 0.36, 0.02, 0.18, GUN_D);
    for (let k = 0; k < 4; k++) b.box(-0.12 + k * 0.08, 0, -0.07, 0.02, 0.16, 0.03, GUN_D);
    b.pop();
    b.pop();
    rope(b, [-2.75, DT + 1.55, 2.3], [-2.95, DT + 0.3, 1.97], 0.25, 0.012, CABLE_K, 8, 4);
    return b;
  }

  // =========================================================================================================
  // 2. INSTRUMENT MAST: tripod, 3 m mast, sensor head, small dish, cable drop, guy wire to a rock anchor
  // =========================================================================================================
  function buildMast(detail) {
    const b = new MB(), HUB = 1.15, TOP = 2.9, legA = k => k * TAU / 3 + 0.4;
    const ANCH = [1.55, 0, 0.9], GUYP = [0, 2.3, 0];
    if (!detail) {
      for (let k = 0; k < 3; k++) { const a = legA(k); b.beam([0, HUB, 0], [Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95], 0.05, ORANGE); }
      b.cyl([0, 0.4, 0], [0, TOP, 0], 0.04, 0.04, 5, BONE, false);
      b.box(0, TOP + 0.12, 0, 0.32, 0.24, 0.28, BONE);
      b.beam([0, 2.45, 0], [0.38, 2.45, 0], 0.05, GUN); b.push(mulAll(tr(0.38, 2.45, 0), rotZ(-PI / 2 - 0.3))); b.lathe([[0, 0], [0.25, 0.13]], 6, BONE); b.pop();
      b.beam(GUYP, ANCH, 0.02, CABLE_O); b.box(ANCH[0], 0.03, ANCH[2], 0.2, 0.06, 0.2, GUN_D);
      return b;
    }
    // tripod legs: orange upper section, steel lower section, clamp, spiked foot pad
    for (let k = 0; k < 3; k++) {
      const a = legA(k), c = Math.cos(a), s = Math.sin(a), top = [c * 0.08, HUB, s * 0.08], foot = [c * 0.95, 0.03, s * 0.95], mid = lerp(top, foot, 0.55);
      b.cyl(top, mid, 0.03, 0.028, 8, ORANGE); b.cyl(mid, foot, 0.021, 0.02, 8, STEEL);
      b.push(mulAll(along(lerp(top, foot, 0.53), lerp(top, foot, 0.6)))); b.box(0, 0, 0, 0.075, 0.07, 0.075, GUN_D); b.box(0.045, 0, 0, 0.02, 0.03, 0.05, HAZ_Y); b.pop();
      b.cyl([foot[0], 0.05, foot[2]], [foot[0] * 1.02, -0.0, foot[2] * 1.02], 0.025, 0.005, 6, GUN_D);
      b.box(foot[0], 0.012, foot[2], 0.12, 0.024, 0.12, GUN_D);
      b.beam([c * 0.045, 0.62, s * 0.045], lerp(top, foot, 0.62), 0.02, GUN_D);
    }
    b.cyl([0, HUB - 0.08, 0], [0, HUB + 0.08, 0], 0.085, 0.085, 10, GUN_D);
    for (let k = 0; k < 3; k++) { const a = legA(k); b.box(Math.cos(a) * 0.08, HUB, Math.sin(a) * 0.08, 0.06, 0.1, 0.06, GUN); }
    b.cyl([0, 0.58, 0], [0, 0.66, 0], 0.06, 0.06, 10, GUN_D);
    // mast: two sections with hazard bands at the bottom
    b.cyl([0, 0.4, 0], [0, 1.95, 0], 0.042, 0.042, 10, BONE, false); b.cyl([0, 1.95, 0], [0, TOP, 0], 0.033, 0.033, 10, BONE_D, false);
    for (let k = 0; k < 5; k++) b.cyl([0, 0.7 + k * 0.08, 0], [0, 0.74 + k * 0.08, 0], 0.044, 0.044, 10, k % 2 ? BLACK : HAZ_Y, false);
    b.cyl([0, 1.92, 0], [0, 2.0, 0], 0.052, 0.052, 10, GUN_D); b.cyl([0, 2.27, 0], [0, 2.33, 0], 0.045, 0.045, 10, ORANGE);
    // tag plate
    b.box(0, 1.45, 0.05, 0.16, 0.22, 0.012, BONE); text(b, 'SV-2', 0, 1.5, 0.057, 0.045, ST_K, true); text(b, 'M3', 0, 1.41, 0.057, 0.045, ORANGE_D, true);
    // sensor head (lenses look out toward +X, the crystals)
    b.push(tr(0, TOP, 0));
    b.box(0, 0.13, 0, 0.32, 0.22, 0.28, BONE); b.box(0, 0.255, 0.0, 0.38, 0.025, 0.34, GUN_D); b.box(0, 0.02, 0, 0.2, 0.04, 0.2, GUN_D);
    for (const zz of [-0.07, 0.07]) { b.cyl([0.16, 0.13, zz], [0.22, 0.13, zz], 0.055, 0.055, 12, ORANGE); b.cyl([0.22, 0.13, zz], [0.225, 0.13, zz], 0.045, 0.045, 12, GLASS); }
    for (let k = 0; k < 5; k++) b.box(-0.162, 0.06 + k * 0.035, 0, 0.012, 0.018, 0.22, GUN_D);
    text(b, 'SV-2', -0.12, 0.17, 0.141, 0.05, ST_K); hazard(b, -0.15, 0.15, 0.05, 0.141, 0.025, 8);
    pz(b, 0.1, 0.09, 0.141, 0.02, 0.02, LED_G);
    b.cyl([-0.1, 0.27, -0.08], [-0.1, 0.8, -0.08], 0.006, 0.003, 4, GUN_D); b.sphere(-0.1, 0.8, -0.08, 0.012, 6, ORANGE);
    b.lathe([[0, 0.268], [0.035, 0.268], [0.035, 0.29], [0.03, 0.33], [0, 0.34]], 8, ORANGE_D);
    b.pop();
    // small dish on a side arm, tilted down toward the cavern floor
    b.beam([0, 2.45, 0], [0.34, 2.45, 0], 0.045, GUN); b.box(0.02, 2.45, 0, 0.11, 0.1, 0.11, GUN_D);
    b.push(mulAll(tr(0.38, 2.45, 0), rotZ(-PI / 2 - 0.3)));
    b.cyl([0, -0.06, 0], [0, 0.03, 0], 0.05, 0.05, 10, GUN_D);
    const DISH = []; for (let i = 0; i <= 6; i++) { const rr = 0.25 * i / 6; DISH.push([rr, 0.02 + rr * rr / 0.5]); }
    b.lathe(DISH, 18, BONE); b.lathe(DISH.slice().reverse().map(p => [p[0] * 1.02, p[1] - 0.015]), 18, GUN);
    ring(b, [0, 0.02 + 0.0625 / 0.5, 0], 'y', 0.25, 0.008, ORANGE, 18, 4);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3; b.cyl([Math.cos(a) * 0.24, 0.14, Math.sin(a) * 0.24], [0, 0.27, 0], 0.005, 0.005, 4, GUN_D); }
    b.cyl([0, 0.25, 0], [0, 0.31, 0], 0.025, 0.02, 8, ORANGE);
    b.pop();
    // cable drop: down the mast in clips, across the rock to a junction box, then trailing away
    const drop = [[-0.02, TOP + 0.01, -0.12], [-0.02, TOP - 0.15, -0.065], [0, 2.2, -0.06], [0, 1.2, -0.06], [0, 0.62, -0.075], [-0.05, 0.25, -0.2], [-0.3, 0.025, -0.45], [-0.55, 0.06, -0.62]];
    cable(b, drop, 0.012, CABLE_K, 3, 5);
    for (const y of [2.6, 2.1, 1.7, 1.25, 0.95]) b.box(0, y, -0.05, 0.05, 0.03, 0.035, ORANGE_D);
    b.push(mulAll(tr(-0.62, 0, -0.68), rotY(0.6)));
    b.box(0, 0.09, 0, 0.24, 0.16, 0.18, BONE); b.box(0, 0.175, 0, 0.26, 0.02, 0.2, ORANGE); b.box(0, 0.01, 0, 0.28, 0.02, 0.22, GUN_D);
    text(b, 'J3', 0, 0.09, 0.091, 0.05, ST_K, true);
    b.pop();
    cable(b, [[-0.75, 0.06, -0.62], [-1.0, 0.02, -0.5], [-1.4, 0.015, -0.7], [-1.9, 0.015, -0.55]], 0.014, CABLE_O, 4, 5);
    // guy wire to a bolted rock anchor, high-vis marker sleeve, turnbuckle
    const gd = norm(sub(ANCH, GUYP));
    b.cyl(GUYP, add(ANCH, [0, 0.08, 0]), 0.006, 0.006, 4, CABLE_L, false);
    b.cyl(lerp(GUYP, ANCH, 0.55), lerp(GUYP, ANCH, 0.62), 0.016, 0.016, 6, ORANGE);
    b.cyl(lerp(GUYP, ANCH, 0.88), lerp(GUYP, ANCH, 0.93), 0.012, 0.012, 6, STEEL);
    b.push(tr(ANCH[0], 0, ANCH[2]));
    b.box(0, 0.012, 0, 0.22, 0.024, 0.22, GUN_D);
    for (const [bx, bz] of [[-0.08, -0.08], [0.08, -0.08], [-0.08, 0.08], [0.08, 0.08]]) b.cyl([bx, 0.02, bz], [bx, 0.045, bz], 0.014, 0.014, 6, STEEL);
    b.cyl([0, 0.02, 0], [0, 0.07, 0], 0.02, 0.02, 6, STEEL);
    b.push(mulAll(tr(0, 0.09, 0), rotY(Math.atan2(gd[0], gd[2])))); ring(b, [0, 0, 0], 'x', 0.03, 0.007, ORANGE, 8, 4); b.pop();
    b.box(0, 0.026, 0.11, 0.2, 0.004, 0.004, HAZ_Y);
    b.pop();
    return b;
  }

  // =========================================================================================================
  // 3. CORE DRILL: skid-mounted rock-core rig with mast, drill head, power pack, and a rack of core sample tubes
  // =========================================================================================================
  const CORE_C = [0.52, 0.50, 0.49, 0.4];
  function coreTube(b, len, r, seed, detail) {       // along local +Y from 0 to len
    const rr = rnd(seed), prof = [[0, 0, ORANGE], [r + 0.006, 0, ORANGE], [r + 0.006, 0.06, ORANGE], [r, 0.06, BONE]];
    if (!detail) { b.lathe([[0, 0], [r, 0], [r, len], [0, len]], 5, CORE_C); return; }
    let y = 0.1; prof.push([r, 0.1, CORE_C]);
    while (y < len - 0.16) { const seg = 0.06 + rr() * 0.16; y = Math.min(len - 0.12, y + seg); const c = rr() < 0.3 ? mix(CRYS, CORE_C, 0.35) : sh(CORE_C, 0.85 + 0.25 * rr()); prof.push([r, y, c]); }
    prof.push([r, len - 0.06, ORANGE], [r + 0.006, len - 0.06, ORANGE], [r + 0.006, len, ORANGE], [0, len, ORANGE]);
    // lathe uses each point's colour for the band above it
    b.lathe(prof, 10, CORE_C);
  }
  function buildDrill(detail) {
    const b = new MB(), MX = -0.72, HX = -0.9, HY = 1.4;
    if (!detail) {
      for (const s of [-1, 1]) b.box(0, 0.07, s * 0.45, 1.7, 0.12, 0.1, GUN_D);
      b.box(0.3, 0.45, 0, 0.75, 0.62, 0.72, BONE);
      for (const s of [-1, 1]) b.box(MX, 1.33, s * 0.13, 0.07, 2.42, 0.07, ORANGE);
      b.box(HX, HY, 0, 0.3, 0.36, 0.3, ORANGE_D); b.cyl([HX, 0, 0], [HX, HY, 0], 0.03, 0.03, 4, STEEL, false);
      b.box(0.2, 0.62, 1.05, 1.3, 0.5, 0.5, mix(CORE_C, ORANGE, 0.3));
      return b;
    }
    // skid frame
    for (const s of [-1, 1]) { b.box(0.05, 0.07, s * 0.45, 1.6, 0.12, 0.1, GUN_D); b.beam([-0.75, 0.07, s * 0.45], [-0.85, 0.16, s * 0.45], 0.1, GUN_D, 0.1); b.box(0.05, 0.135, s * 0.4, 1.6, 0.01, 0.01, HAZ_Y); }
    for (const x of [-0.7, -0.1, 0.75]) b.box(x, 0.11, 0, 0.08, 0.08, 0.82, GUN);
    b.box(0.3, 0.155, 0, 1.0, 0.02, 0.8, OLIVE_D);
    // mast with feed cylinder, crown block and back struts
    for (const s of [-1, 1]) { b.box(MX, 1.33, s * 0.13, 0.07, 2.42, 0.07, ORANGE); b.beam([MX + 0.03, 1.9, s * 0.13], [-0.05, 0.16, s * 0.42], 0.05, ORANGE_D); }
    for (let y = 0.35; y < 2.5; y += 0.5) b.box(MX + 0.02, y, 0, 0.04, 0.04, 0.2, GUN_D);
    b.box(MX - 0.06, 2.58, 0, 0.32, 0.1, 0.4, ORANGE); b.cyl([MX - 0.12, 2.66, -0.05], [MX - 0.12, 2.66, 0.05], 0.09, 0.09, 12, GUN_D);
    hazard(b, MX - 0.21, MX + 0.09, 2.58, 0.201, 0.08, 6);
    b.cyl([MX + 0.06, 0.4, 0], [MX + 0.06, 2.3, 0], 0.04, 0.04, 10, GUN); b.cyl([MX + 0.06, HY - 0.05, 0], [MX + 0.06, HY + 0.4, 0], 0.022, 0.022, 8, STEEL);
    for (const s of [-1, 1]) b.cyl([MX - 0.04, 0.3, s * 0.21], [MX - 0.04, 2.45, s * 0.21], 0.008, 0.008, 4, CABLE_K, false);
    // carriage + drill head
    for (const s of [-1, 1]) b.box(MX, HY, s * 0.13, 0.12, 0.32, 0.11, GUN_D);
    b.box((MX + HX) / 2, HY, 0, 0.2, 0.26, 0.2, GUN);
    b.box(HX, HY, 0, 0.3, 0.36, 0.32, ORANGE_D); b.box(HX, HY + 0.19, 0, 0.32, 0.02, 0.34, GUN_D);
    b.cyl([HX, HY + 0.2, 0], [HX, HY + 0.46, 0], 0.085, 0.085, 12, GUN);
    for (let k = 0; k < 5; k++) b.cyl([HX, HY + 0.24 + k * 0.045, 0], [HX, HY + 0.26 + k * 0.045, 0], 0.1, 0.1, 12, GUN_D, false);
    b.cyl([HX, HY + 0.46, 0], [HX, HY + 0.5, 0], 0.06, 0.06, 10, ORANGE);
    b.cyl([HX, HY - 0.18, 0], [HX, HY - 0.32, 0], 0.07, 0.06, 10, STEEL);
    text(b, 'KR-07', HX - 0.12, HY + 0.05, 0.161, 0.07, ST_K); hazard(b, HX - 0.14, HX + 0.14, HY - 0.14, 0.161, 0.04, 6);
    // drill string into the borehole, foot clamp, cuttings with crystal glints
    b.cyl([HX, HY - 0.32, 0], [HX, 0.0, 0], 0.03, 0.03, 8, STEEL, false);
    for (const y of [1.0, 0.55]) b.cyl([HX, y, 0], [HX, y + 0.05, 0], 0.038, 0.038, 8, GUN_D);
    b.box(HX + 0.04, 0.24, 0, 0.3, 0.1, 0.36, GUN); for (const s of [-1, 1]) b.box(HX, 0.24, s * 0.06, 0.1, 0.08, 0.05, ORANGE);
    b.push(tr(HX, 0, 0));
    b.lathe([[0.032, 0.0], [0.06, 0.03], [0.14, 0.045], [0.3, 0.018], [0.42, 0.0]], 14, mix(DUST, BONE, 0.4));
    const cr = rnd(311); for (let k = 0; k < 6; k++) { const a = cr() * TAU, d = 0.12 + cr() * 0.22; crystal(b, [Math.cos(a) * d, 0.0, Math.sin(a) * d], [Math.cos(a) * 0.8, 0.6, Math.sin(a) * 0.8], 0.05 + cr() * 0.04, 0.012, CRYS, 3100 + k); }
    b.pop();
    // power pack: bone housing, heat fins, radiator grille, tank, control console
    b.box(0.3, 0.47, 0, 0.75, 0.62, 0.7, BONE); b.box(0.3, 0.785, 0, 0.77, 0.03, 0.72, GUN_D);
    for (let k = 0; k < 9; k++) b.box(0.03 + k * 0.065, 0.85, 0, 0.018, 0.1, 0.6, GUN);
    for (let k = 0; k < 8; k++) b.box(0.677, 0.25 + k * 0.055, 0, 0.012, 0.025, 0.55, GUN_D);
    b.box(0.3, 0.2, 0.352, 0.7, 0.05, 0.01, HAZ_Y);
    text(b, 'KR-07', 0.0, 0.58, 0.352, 0.1, ST_K); text(b, 'CORE RIG', 0.0, 0.43, 0.352, 0.05, ORANGE_D);
    b.cyl([-0.05, 0.42, -0.42], [0.65, 0.42, -0.42], 0.1, 0.1, 12, ORANGE); for (const x of [0.05, 0.55]) b.box(x, 0.36, -0.42, 0.05, 0.22, 0.24, GUN_D);
    b.push(mulAll(tr(-0.25, 0.62, 0.3), rotX(-0.5)));
    b.box(0, 0, 0, 0.32, 0.22, 0.04, GUN); b.box(0, 0, 0.022, 0.28, 0.18, 0.004, sh(GUN, 0.7));
    for (let k = 0; k < 3; k++) { b.cyl([-0.1 + k * 0.1, -0.04, 0.02], [-0.1 + k * 0.1, -0.04, 0.12], 0.008, 0.008, 5, STEEL); b.sphere(-0.1 + k * 0.1, -0.04, 0.125, 0.016, 6, k === 1 ? ORANGE : BLACK); }
    for (const gx of [-0.07, 0.07]) { b.cyl([gx, 0.05, 0.02], [gx, 0.05, 0.03], 0.035, 0.035, 12, ST_W); b.beam([gx, 0.05, 0.031], [gx + 0.02, 0.075, 0.031], 0.005, BLACK, 0.002); }
    b.pop();
    b.box(-0.25, 0.42, 0.3, 0.06, 0.4, 0.06, GUN_D);
    // hydraulic hoses from the pack up to the drill head
    cable(b, [[-0.05, 0.6, -0.12], [-0.3, 0.75, -0.2], [-0.6, 1.0, -0.22], [-0.86, 1.25, -0.17]], 0.018, CABLE_K, 4, 6);
    cable(b, [[-0.05, 0.55, 0.12], [-0.35, 0.68, 0.2], [-0.62, 0.95, 0.22], [-0.86, 1.25, 0.17]], 0.018, CABLE_K, 4, 6);
    cable(b, [[-0.05, 0.3, 0.2], [-0.4, 0.2, 0.32], [-0.75, 0.3, 0.25], [-0.86, 0.8, 0.08], [HX, HY - 0.2, 0.06]], 0.014, CABLE_O, 4, 5);
    // spare rods on hooks along the skid
    for (const x of [-0.4, 0.75]) b.box(x, 0.24, -0.52, 0.04, 0.2, 0.06, GUN_D);
    for (let k = 0; k < 3; k++) b.cyl([-0.65, 0.18 + k * 0.05, -0.55], [0.95, 0.18 + k * 0.05, -0.55], 0.022, 0.022, 6, STEEL);
    // core rack: A-frame ends with cradles; 7 of 8 tubes in place, one dropped on the rock
    const RZ = 1.05, RX0 = -0.45, RX1 = 0.85;
    for (const x of [RX0, RX1]) {
      for (const s of [-1, 1]) b.beam([x, 0.95, RZ + s * 0.06], [x, 0.0, RZ + s * 0.32], 0.045, GUN);
      b.box(x, 0.01, RZ, 0.1, 0.02, 0.7, GUN_D);
      for (const y of [0.52, 0.8]) { b.box(x, y, RZ, 0.06, 0.03, 0.5 + (0.8 - y) * 0.3, ORANGE); for (let i = 0; i < 4; i++) b.box(x, y + 0.03, RZ - 0.165 + i * 0.11, 0.06, 0.03, 0.012, ORANGE_D); }
    }
    b.beam([RX0, 0.3, RZ], [RX1, 0.3, RZ], 0.035, GUN_D);
    b.push(mulAll(tr(RX0 + 0.04, 0, RZ + 0.33), rotY(0))); b.box((RX1 - RX0) / 2 - 0.04, 0.44, 0.0, 0.5, 0.18, 0.012, BONE); text(b, 'SV-2 CORES', (RX1 - RX0) / 2 - 0.04, 0.47, 0.007, 0.05, ST_K, true); text(b, 'KR-07', (RX1 - RX0) / 2 - 0.04, 0.39, 0.007, 0.05, ORANGE_D, true); b.pop();
    const TL = 1.42, TR = 0.045;
    for (const [y, n] of [[0.52, 4], [0.8, 4]]) for (let i = 0; i < n; i++) {
      if (y === 0.8 && i === 2) continue;
      b.push(mulAll(tr(RX0 - 0.06, y + 0.03 + TR + 0.006, RZ - 0.11 - 0.055 + i * 0.11 - 0.055 + 0.055), rotZ(-PI / 2))); coreTube(b, TL, TR, 700 + i + y * 10, 1); b.pop();
    }
    const fallen = new MB(); fallen.push(mulAll(rotY(0.5), rotZ(-PI / 2 + 0.03))); coreTube(fallen, TL, TR, 790, 1); fallen.pop();
    dropTo(b, fallen, 0.1, 1.75, 0);
    return b;
  }

  // =========================================================================================================
  // 4. FALLEN SHELTER: collapsed hab, bent exo-frame hoops, fabric slumped over them, airlock frame still standing
  // =========================================================================================================
  const HOOPS = [
    { z: 1.45, f: u => { const a = PI * u; return [-1.25 * Math.cos(a) + 0.04 * Math.sin(a), 2.08 * Math.pow(Math.sin(a), 0.85) - 0.08 * Math.exp(-(((u - 0.38) / 0.1) ** 2))]; } },
    { z: 0.42, f: u => { const a = PI * u; let x = -1.3 * Math.cos(a) + 0.3 * Math.sin(a) ** 2, y = 1.3 * Math.pow(Math.sin(a), 0.9); y *= 1 - 0.34 * Math.exp(-(((u - 0.63) / 0.12) ** 2)); return [x, y]; } },
    { z: -0.62, f: u => { const a = PI * u; return [-1.45 * Math.cos(a) + 0.22 * Math.sin(a), 0.62 * Math.pow(Math.sin(a), 0.7) * (1 - 0.3 * u)]; } },
    { z: -1.65, f: u => { const a = PI * u; return [-1.52 * Math.cos(a), 0.34 * Math.pow(Math.sin(a), 0.6)]; } },
  ];
  const BACK = { z: -2.5, f: u => [-1.75 * Math.cos(PI * u), 0.03 + 0.04 * Math.sin(PI * u)] };
  const STN = [BACK, HOOPS[3], HOOPS[2], HOOPS[1], HOOPS[0]];
  const SKIRT = 0.08;
  function fabricP(u, v) {
    const z = STN[0].z + (STN[4].z - STN[0].z) * v; let i = 0; while (i < 3 && z > STN[i + 1].z) i++;
    const A = STN[i], B = STN[i + 1], s = cl01((z - A.z) / (B.z - A.z));
    const uu = cl01((u - SKIRT) / (1 - 2 * SKIRT)), pa = A.f(uu), pb = B.f(uu);
    let x = pa[0] + (pb[0] - pa[0]) * s, y = pa[1] + (pb[1] - pa[1]) * s;
    const hgt = Math.min(pa[1], pb[1]) + 0.25 * Math.abs(pa[1] - pb[1]), bell = Math.sin(PI * s), mid = Math.sqrt(Math.sin(PI * uu));
    y -= (0.16 + 0.22 * hgt) * bell * mid;
    x *= 1 + 0.05 * bell;
    y += 0.04 * Math.sin(u * 23 + z * 4.1) * Math.sin(PI * uu) + 0.02 * Math.sin(z * 13 + u * 7) * mid;
    if (u < SKIRT || u > 1 - SKIRT) { const t = u < SKIRT ? (SKIRT - u) / SKIRT : (u - 1 + SKIRT) / SKIRT; x += Math.sign(x) * t * 0.3; y = 0.02 * (1 - t) + 0.012; y += 0.015 * Math.sin(z * 9 + t * 3); }
    return [x, Math.max(0.012, y), z + 0.04 * Math.sin(u * 11 + z) * bell, s];
  }
  function fabricCol(u, v) {
    const p = fabricP(u, v), s = p[3];
    let c = sh(HAB, 0.97 + 0.05 * Math.sin(u * 31 + v * 17));
    c = mix(c, sh(HAB, 0.72), 0.5 * Math.sin(PI * s) * (1 - Math.min(1, p[1])));
    if (s < 0.06 || s > 0.94) c = mix(c, ORANGE_D, 0.55);
    c = mix(c, DUST, 0.6 * (1 - cl01(p[1] / 0.5)));
    return c;
  }
  // airlock frame outline the end wall attaches to (rectangle, bottom-left, up, across, down)
  const AW = 0.72, AH = 2.0, AZ = 1.62;
  function doorOutline(u) { const L = AH * 2 + AW * 2, s = u * L; if (s < AH) return [-AW, s]; if (s < AH + 2 * AW) return [-AW + (s - AH), AH]; return [AW, AH - (s - AH - 2 * AW)]; }
  function buildShelter(detail) {
    const b = new MB(), r = rnd(4401);
    if (!detail) {
      b.surf(10, 8, (u, v) => fabricP(u, v), HAB);
      b.surf(8, 1, (u, v) => { const a = HOOPS[0].f(u), q = doorOutline(u); return [a[0] + (q[0] - a[0]) * v, a[1] + (q[1] - a[1]) * v, HOOPS[0].z + (AZ - HOOPS[0].z) * v]; }, HAB);
      for (const s of [-1, 1]) b.box(s * 0.8, 1.04, 1.86, 0.16, 2.08, 0.48, GUN);
      b.box(0, 2.0, 1.86, 1.76, 0.16, 0.48, GUN); pz(b, 0, 1.0, 1.7, 1.44, 1.86, BLACK);
      b.push(mulAll(tr(0.62, 0.13, 2.12), rotY(1.9))); b.box(-0.55, 0.86, 0.035, 1.1, 1.72, 0.07, ORANGE); b.pop();
      for (const h of [HOOPS[0], HOOPS[1]]) { const pts = []; for (let i = 0; i <= 6; i++) { const p = h.f(i / 6); pts.push([p[0], p[1] + 0.04, h.z]); } b.tube(pts, 0.04, 3, GUN); }
      return b;
    }
    // fabric skin and the end wall between hoop A and the airlock frame
    b.surf(30, 46, (u, v) => fabricP(u, v), fabricCol);
    b.surf(28, 3, (u, v) => { const a = HOOPS[0].f(u), q = doorOutline(u), t = v; return [a[0] + (q[0] - a[0]) * t, Math.max(0.012, a[1] + (q[1] - a[1]) * t - 0.08 * Math.sin(PI * t) * Math.sin(PI * u)), HOOPS[0].z + (AZ - HOOPS[0].z) * t + 0.05 * Math.sin(PI * t)]; }, (u, v) => mix(sh(HAB, 0.92), DUST, 0.5 * (1 - cl01(doorOutline(u)[1] / 0.6))));
    // exo-frame hoops sitting on the fabric (A still up, B kinked, C flattened, D snapped)
    const hoopTube = (h, u0, u1, n, lift) => { const pts = []; for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n, p = h.f(u), sx = Math.sign(p[0]) || 1; pts.push([p[0] + sx * 0.015 * Math.cos(PI * u) * 0, p[1] + (lift || 0.04), h.z]); } b.tube(pts, 0.035, 7, GUN); return pts; };
    for (let k = 0; k < 3; k++) {
      const pts = hoopTube(HOOPS[k], 0, 1, 18);
      for (const p of [pts[0], pts[pts.length - 1]]) { b.box(p[0], 0.06, p[2], 0.16, 0.12, 0.16, GUN_D); b.box(p[0], 0.13, p[2], 0.1, 0.04, 0.1, ORANGE); }
    }
    b.cyl([HOOPS[1].f(0.63)[0] - 0.08, HOOPS[1].f(0.63)[1] + 0.04, 0.42], [HOOPS[1].f(0.63)[0] + 0.08, HOOPS[1].f(0.63)[1] + 0.06, 0.42], 0.05, 0.05, 8, ORANGE);
    const dl = hoopTube(HOOPS[3], 0, 0.5, 8, 0.035);
    b.box(dl[0][0], 0.06, dl[0][2], 0.16, 0.12, 0.16, GUN_D);
    const bk = HOOPS[3].f(0.52); b.tube([[bk[0] + 0.05, bk[1] + 0.03, -1.65], [bk[0] + 0.35, 0.45, -1.72], [bk[0] + 0.62, 0.8, -1.86], [bk[0] + 0.7, 0.95, -1.9]], 0.035, 7, GUN);
    b.cyl([bk[0] + 0.66, 0.89, -1.88], [bk[0] + 0.72, 0.99, -1.91], 0.042, 0.03, 7, STEEL);
    const dr = HOOPS[3].f(1); b.box(dr[0], 0.06, -1.65, 0.16, 0.12, 0.16, GUN_D); b.tube([[dr[0], 0.12, -1.65], [dr[0] - 0.25, 0.1, -1.62], [dr[0] - 0.55, 0.08, -1.58]], 0.035, 7, GUN);
    // bent ridge spine from the airlock header back over the hoop tops
    const top = k => { const p = HOOPS[k].f(0.5); return [p[0], p[1] + 0.09, HOOPS[k].z]; };
    b.tube(smooth([[0, AH + 0.12, 1.7], top(0), top(1), [top(2)[0], top(2)[1] + 0.02, top(2)[2]], [top(2)[0] - 0.1, 0.3, -1.2]], 4), 0.028, 6, BONE_D);
    // tie-down straps: one still taut, one snapped and lying loose
    rope(b, [HOOPS[0].f(0.18)[0], HOOPS[0].f(0.18)[1] + 0.02, 1.45], [-1.85, 0.03, 1.9], 0.02, 0.012, CABLE_O, 6, 4);
    b.cyl([-1.85, 0.12, 1.9], [-1.85, -0.0, 1.9], 0.02, 0.006, 6, ORANGE);
    cable(b, [[HOOPS[0].f(0.82)[0], HOOPS[0].f(0.82)[1] + 0.02, 1.45], [1.35, 0.6, 1.6], [1.45, 0.03, 1.75], [1.7, 0.02, 1.6], [1.9, 0.02, 1.85]], 0.012, CABLE_O, 3, 4);
    // --- airlock frame: jambs, header, sill, bone trim, dark interior, gasket
    const FZ = 1.86, FD = 0.48, OW = 0.56, OH = 1.84;
    for (const s of [-1, 1]) { b.box(s * 0.8, 1.04, FZ, 0.16, 2.08, FD, GUN); b.box(s * 0.8, 1.04, FZ + FD / 2 + 0.006, 0.2, 2.08, 0.012, BONE); b.box(s * (OW + 0.06), 0.98, FZ, 0.12, 1.86, FD - 0.04, GUN_D); }
    b.box(0, 2.0, FZ, 1.76, 0.16, FD, GUN); b.box(0, 2.0, FZ + FD / 2 + 0.006, 1.8, 0.2, 0.012, BONE); b.box(0, 1.885, FZ, 1.24, 0.08, FD - 0.04, GUN_D);
    b.box(0, 0.06, FZ, 1.44, 0.12, FD, GUN_D);
    chevrons(b, -0.7, 0.62, 0.06, FZ + FD / 2 + 0.001, 0.1, 10); chevrons(b, -0.86, 0.78, 2.0, FZ + FD / 2 + 0.013, 0.11, 12);
    pz(b, 0, 1.0, AZ + 0.04, OW * 2, OH, BLACK);
    for (const s of [-1, 1]) b.box(s * (OW + 0.005), 0.98, FZ + 0.05, 0.012, 1.74, 0.04, RUBBER);
    // pressure panel on the left jamb: dead screen, one red light still on
    b.box(-0.8, 1.25, FZ + FD / 2 + 0.03, 0.16, 0.26, 0.04, GUN_D); pz(b, -0.8, 1.3, FZ + FD / 2 + 0.051, 0.12, 0.09, GLASS); pz(b, -0.84, 1.18, FZ + FD / 2 + 0.051, 0.025, 0.025, LED_R);
    for (let k = 0; k < 3; k++) pz(b, -0.79 + k * 0.03, 1.18, FZ + FD / 2 + 0.051, 0.018, 0.018, BONE);
    b.push(mulAll(tr(0.8, 0, FZ + FD / 2 + 0.013), rotY(0))); text(b, 'KR-07', 0, 1.6, 0, 0.1, ST_K, true); text(b, 'HAB 2', 0, 1.45, 0, 0.06, ORANGE_D, true); b.pop();
    b.push(tr(0.45, 0, FZ)); b.lathe([[0, 2.08], [0.07, 2.08], [0.07, 2.12], [0.055, 2.2], [0, 2.22]], 10, ORANGE_D); b.lathe([[0.09, 2.08], [0.09, 2.1]], 10, GUN_D); b.pop();
    // outer hatch flung open on its hinges
    b.push(mulAll(tr(OW + 0.06, 0.13, FZ + FD / 2 + 0.02), rotY(1.95)));
    const DW = 1.14, DH = 1.72;
    b.box(-DW / 2, DH / 2, 0.035, DW, DH, 0.07, ORANGE); b.box(-DW / 2, DH / 2, -0.01, DW - 0.1, DH - 0.1, 0.03, GUN);
    b.cyl([-DW / 2, 1.25, -0.01], [-DW / 2, 1.25, 0.09], 0.16, 0.16, 16, GUN_D); b.cyl([-DW / 2, 1.25, 0.09], [-DW / 2, 1.25, 0.095], 0.12, 0.12, 16, GLASS);
    ring(b, [-DW / 2, 0.82, 0.11], 'z', 0.13, 0.014, BONE, 14, 5); for (let k = 0; k < 3; k++) { const a = k * PI / 3; b.beam([-DW / 2 + Math.cos(a) * 0.13, 0.82 + Math.sin(a) * 0.13, 0.105], [-DW / 2 - Math.cos(a) * 0.13, 0.82 - Math.sin(a) * 0.13, 0.105], 0.014, GUN_D); }
    b.cyl([-DW / 2, 0.82, 0.07], [-DW / 2, 0.82, 0.11], 0.03, 0.03, 8, GUN_D);
    chevrons(b, -DW + 0.04, -0.04, 0.1, 0.071, 0.1, 9);
    text(b, 'KR-07', -DW / 2, 0.45, 0.071, 0.09, ST_K, true);
    for (const y of [0.25, DH - 0.25]) b.box(0.0, y, 0.035, 0.06, 0.16, 0.1, GUN_D);
    b.pop();
    // a gear bag dragged half out of the doorway
    b.push(mulAll(tr(-0.15, 0, 2.3), rotY(0.4))); b.box(0, 0.11, 0, 0.55, 0.22, 0.3, OLIVE); b.box(0, 0.225, 0, 0.5, 0.02, 0.06, ORANGE_D); rope(b, [-0.2, 0.22, 0.0], [0.2, 0.22, 0.0], -0.08, 0.01, BLACK, 6, 4); b.pop();
    return b;
  }

  // =========================================================================================================
  // 5. FIELD LAB: folding bench, sample canisters, scanner, data terminal, glass jars with crystals, toppled stool
  // =========================================================================================================
  const Y0 = 0.86;
  function canister(b, col) { b.lathe([[0, 0], [0.04, 0], [0.045, 0.01], [0.045, 0.15], [0.04, 0.16], [0, 0.16]], 10, col || BONE); b.cyl([0, 0.155, 0], [0, 0.19, 0], 0.047, 0.047, 10, ORANGE); b.cyl([0, 0.06, 0], [0, 0.09, 0], 0.0455, 0.0455, 10, ORANGE_D, false); }
  function jar(b, open) { b.lathe([[0, 0], [0.045, 0], [0.048, 0.01], [0.048, 0.12], [0.04, 0.135], [0.036, 0.15]], 10, GLASS_L); if (!open) b.cyl([0, 0.145, 0], [0, 0.17, 0], 0.042, 0.042, 10, GUN_D); else b.lathe([[0.03, 0.005], [0.03, 0.03]], 8, sh(CRYS, 0.7)); }
  function stool(s) {
    s.lathe([[0, 0.42], [0.17, 0.42], [0.17, 0.46], [0.15, 0.47], [0, 0.47]], 14, ORANGE_D);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3, c = Math.cos(a), sn = Math.sin(a); s.cyl([c * 0.1, 0.42, sn * 0.1], [c * 0.21, 0.0, sn * 0.21], 0.015, 0.013, 6, GUN); s.box(c * 0.21, 0.01, sn * 0.21, 0.04, 0.02, 0.04, RUBBER); }
    ring(s, [0, 0.16, 0], 'y', 0.175, 0.01, STEEL, 12, 4);
  }
  function buildLab(detail) {
    const b = new MB();
    if (!detail) {
      b.box(0, Y0 - 0.02, 0, 1.8, 0.04, 0.74, BONE);
      for (const x of [-0.75, 0.75]) { b.beam([x, 0, -0.33], [x, Y0 - 0.04, 0.33], 0.04, GUN); b.beam([x, 0, 0.33], [x, Y0 - 0.04, -0.33], 0.04, GUN); }
      b.box(-0.55, Y0 + 0.03, 0, 0.44, 0.05, 0.32, GUN); b.push(mulAll(tr(-0.55, Y0 + 0.05, -0.16), rotX(-0.25))); b.box(0, 0.15, -0.02, 0.44, 0.3, 0.035, GUN); b.pop();
      b.box(-0.05, Y0 + 0.12, -0.08, 0.36, 0.24, 0.3, BONE);
      b.box(0.45, Y0 + 0.08, -0.15, 0.5, 0.16, 0.2, GLASS_L);
      b.push(mulAll(tr(0.55, 0.17, 0.8), rotY(0.7))); b.box(0, 0, 0, 0.34, 0.34, 0.05, ORANGE_D); b.beam([0, 0, 0.03], [0, 0.15, 0.48], 0.03, GUN); b.beam([0, 0, 0.03], [0.1, -0.15, 0.48], 0.03, GUN); b.pop();
      return b;
    }
    // bench top, frame and folding X legs
    b.box(0, Y0 - 0.02, 0, 1.8, 0.04, 0.74, BONE); b.box(0, Y0 - 0.002, 0, 0.02, 0.004, 0.74, GUN_D);
    for (const s of [-1, 1]) { b.box(0, Y0 - 0.06, s * 0.36, 1.8, 0.05, 0.03, GUN_D); b.box(s * 0.89, Y0 - 0.06, 0, 0.03, 0.05, 0.7, GUN_D); }
    for (const x of [-0.75, 0.75]) {
      for (const s of [-1, 1]) b.beam([x + s * 0.0, 0.02, -0.33 * s], [x, Y0 - 0.08, 0.33 * s], 0.04, GUN);
      b.cyl([x - 0.04, 0.41, 0], [x + 0.04, 0.41, 0], 0.025, 0.025, 8, ORANGE);
      for (const s of [-1, 1]) b.box(x, 0.015, s * 0.33, 0.12, 0.03, 0.06, RUBBER);
    }
    b.beam([-0.75, 0.41, 0], [0.75, 0.41, 0], 0.03, GUN_D);
    b.push(mulAll(tr(0.0, 0, -0.361), rotY(PI))); text(b, 'SV-2 LAB', 0, Y0 - 0.06, 0, 0.035, ST_W, true); b.pop();
    chevrons(b, -0.85, -0.45, Y0 - 0.06, 0.376, 0.035, 6);
    // data terminal: rugged hinged case, keypad, screen still faintly on
    b.push(tr(-0.55, Y0, 0.0));
    b.box(0, 0.03, 0, 0.44, 0.05, 0.32, GUN); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 0.21, 0.03, sz * 0.15, 0.05, 0.06, 0.05, ORANGE);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) py(b, -0.16 + i * 0.04, 0.0565, 0.02 + j * 0.04, 0.03, 0.03, j === 0 && i > 6 ? ORANGE : BONE_D);
    py(b, 0, 0.0565, -0.1, 0.32, 0.05, sh(GUN, 0.7));
    b.cyl([-0.18, 0.055, -0.15], [0.18, 0.055, -0.15], 0.012, 0.012, 6, GUN_D);
    b.push(mulAll(tr(0, 0.055, -0.15), rotX(-0.28)));
    b.box(0, 0.16, -0.018, 0.44, 0.3, 0.035, GUN); for (const sx of [-1, 1]) b.box(sx * 0.21, 0.3, -0.018, 0.05, 0.05, 0.045, ORANGE);
    pz(b, 0, 0.165, 0.0005, 0.36, 0.23, SCR_D);
    text(b, 'SIGNAL', -0.16, 0.25, 0.002, 0.03, SCR);
    for (let k = 0; k < 4; k++) pz(b, -0.16 + (0.12 + 0.07 * ((k * 37) % 3)) / 2, 0.2 - k * 0.03, 0.002, 0.12 + 0.07 * ((k * 37) % 3), 0.01, sh(SCR, 0.6));
    text(b, 'LOST', -0.16, 0.08, 0.002, 0.03, [1.0, 0.70, 0.28, 0.3]);
    b.pop();
    b.pop();
    cable(b, [[-0.55, Y0 + 0.03, -0.17], [-0.5, Y0 + 0.005, -0.33], [-0.47, Y0 - 0.04, -0.42], [-0.42, 0.45, -0.48], [-0.32, 0.015, -0.55], [0.3, 0.015, -0.68], [0.9, 0.015, -0.55], [1.35, 0.015, -0.7]], 0.011, CABLE_K, 4, 5);
    // scanner: bone housing, stage with a crystal, gantry head with lens
    b.push(tr(-0.08, Y0, -0.06));
    b.box(0, 0.05, 0, 0.38, 0.1, 0.3, BONE); b.box(0, 0.105, 0.03, 0.2, 0.01, 0.18, GUN_D); hazard(b, -0.18, 0.18, 0.02, 0.151, 0.02, 10);
    for (const s of [-1, 1]) b.box(s * 0.16, 0.24, -0.12, 0.04, 0.28, 0.04, GUN);
    b.box(0, 0.37, -0.12, 0.36, 0.04, 0.05, GUN); b.box(0, 0.33, -0.03, 0.12, 0.08, 0.2, ORANGE);
    b.cyl([0, 0.29, 0.03], [0, 0.25, 0.03], 0.04, 0.035, 10, GUN_D); b.cyl([0, 0.25, 0.03], [0, 0.245, 0.03], 0.03, 0.03, 10, GLASS);
    crystal(b, [0, 0.11, 0.03], [0.1, 1, 0.05], 0.09, 0.022, CRYS, 51);
    pz(b, 0.11, 0.06, 0.151, 0.1, 0.05, GLASS); pz(b, -0.11, 0.06, 0.151, 0.02, 0.02, LED_G);
    text(b, 'SCAN', -0.15, 0.065, 0.151, 0.03, ST_K);
    b.pop();
    // glass jars in a wire rack: open ones holding crystals
    b.push(tr(0.34, Y0, -0.2));
    b.box(0, 0.008, 0, 0.34, 0.016, 0.14, GUN_D); for (const s of [-1, 1]) { b.box(0, 0.09, s * 0.065, 0.34, 0.012, 0.01, STEEL); b.box(s * 0.165, 0.05, s * 0.065, 0.01, 0.09, 0.01, STEEL); b.box(s * 0.165, 0.05, -s * 0.065, 0.01, 0.09, 0.01, STEEL); }
    const JX = [-0.12, -0.04, 0.04, 0.12], CR = [[CRYS, 0.2, 0.02], null, [CRYS_V, 0.17, 0.018], [CRYS, 0.22, 0.016]];
    JX.forEach((x, i) => {
      if (i === 1) return; // empty slot: that jar is tipped over on the bench
      b.push(tr(x, 0.016, 0)); jar(b, !!CR[i]); b.pop();
      if (CR[i]) { crystal(b, [x, 0.03, 0], [0.12 * (i - 1.5), 1, 0.08], CR[i][1], CR[i][2], CR[i][0], 60 + i); crystal(b, [x + 0.012, 0.03, 0.01], [0.4, 1, -0.2], CR[i][1] * 0.6, CR[i][2] * 0.7, CR[i][0], 70 + i); }
    });
    b.pop();
    // second row of lidded jars
    for (let i = 0; i < 3; i++) { b.push(tr(0.2 + i * 0.1, Y0, -0.02)); jar(b, false); b.pop(); }
    // tipped jar and spilled crystals
    b.push(mulAll(tr(0.3, Y0 + 0.048, 0.17), rotY(-0.5), rotZ(-PI / 2))); jar(b, true); b.pop();
    crystal(b, [0.42, Y0 + 0.012, 0.1], [1, 0.12, -0.4], 0.11, 0.016, CRYS, 81); crystal(b, [0.46, Y0 + 0.01, 0.15], [0.6, 0.15, 0.9], 0.07, 0.013, CRYS, 82); crystal(b, [0.4, Y0 + 0.012, 0.22], [-0.3, 0.1, 1], 0.06, 0.012, CRYS_V, 83);
    // sample canisters in a tray, two knocked over (one rolled off onto the floor)
    b.push(tr(0.72, Y0, -0.16)); b.box(0, 0.015, 0, 0.26, 0.03, 0.22, GUN_D); b.pop();
    for (const [x, z] of [[0.66, -0.21], [0.78, -0.21], [0.66, -0.1]]) { b.push(tr(x, Y0 + 0.03, z)); canister(b); b.pop(); }
    b.push(mulAll(tr(0.62, Y0 + 0.047, 0.16), rotY(0.7), rotZ(PI / 2))); canister(b); b.pop();
    const fc = new MB(); fc.push(mulAll(rotY(-0.3), rotZ(PI / 2))); canister(fc, BONE_D); fc.pop(); dropTo(b, fc, 0.98, 0.42, 0);
    pz(b, 0.72, Y0 + 0.02, -0.049, 0.1, 0.02, ORANGE_D);
    // clamp lamp on the back edge, arm knocked down
    b.push(tr(-0.86, Y0, -0.34));
    b.box(0, -0.03, 0, 0.06, 0.1, 0.06, GUN_D); b.cyl([0, 0.02, 0], [0, 0.3, 0], 0.012, 0.012, 6, GUN);
    b.cyl([0, 0.3, 0], [0.22, 0.2, 0.05], 0.01, 0.01, 6, GUN); b.sphere(0, 0.3, 0, 0.02, 6, ORANGE);
    b.push(mulAll(tr(0.24, 0.17, 0.06), rotX(0.3), rotZ(-0.9))); b.lathe([[0, 0.06], [0.03, 0.06], [0.06, 0.0], [0.065, -0.01]], 10, ORANGE_D); b.cyl([0, 0.0, 0], [0, -0.005, 0], 0.055, 0.055, 10, LENS_L); b.pop();
    b.pop();
    // sample case on the floor under the bench
    b.push(mulAll(tr(-0.2, 0, 0.0), rotY(0.08)));
    b.box(0, 0.14, 0, 0.6, 0.28, 0.4, OLIVE); b.box(0, 0.285, 0, 0.62, 0.02, 0.42, OLIVE_D);
    for (const s of [-1, 1]) b.box(s * 0.18, 0.24, 0.205, 0.06, 0.06, 0.012, GUN_D);
    text(b, 'SAMPLES', 0, 0.15, 0.201, 0.04, ST_W, true); hazard(b, -0.28, 0.0, 0.03, 0.201, 0.03, 6);
    b.pop();
    // toppled stool
    const st = new MB(); st.push(rotX(PI / 2 + 0.25)); stool(st); st.pop(); dropTo(b, st, 0.55, 0.8, 0.7);
    return b;
  }

  // =========================================================================================================
  // 6. CABLE RUN: cable reel, junction boxes, loose spans on the rock (about 6 m), heading toward the crystals (+X)
  // =========================================================================================================
  function reel(b, R, W, col, detail) {   // drum on local X axis centred at origin
    b.push(rotZ(-PI / 2));
    const sg = detail ? 14 : 6;
    for (const s of [-1, 1]) b.cyl([0, s * W / 2, 0], [0, s * (W / 2 + 0.025), 0], R, R, sg, BONE);
    b.cyl([0, -W / 2, 0], [0, W / 2, 0], R * 0.72, R * 0.72, sg, col, false);
    if (detail) {
      b.cyl([0, -W / 2 - 0.06, 0], [0, W / 2 + 0.06, 0], 0.035, 0.035, 8, STEEL);
      for (let k = 0; k < 4; k++) { const a = k * PI / 2 + 0.3; for (const s of [-1, 1]) b.box(Math.cos(a) * R * 0.5, s * (W / 2 + 0.03), Math.sin(a) * R * 0.5, 0.05, 0.008, 0.05, GUN_D); }
      b.cyl([0, -0.006, 0], [0, 0.006, 0], R * 0.725, R * 0.725, sg, sh(col, 0.75), false);
    }
    b.pop();
  }
  function jbox(b, w, h, d, lid) {
    b.box(0, h / 2, 0, w, h, d, BONE); b.box(0, h + 0.012, 0, w + 0.02, 0.024, d + 0.02, lid || ORANGE);
    b.box(0, 0.012, 0, w + 0.06, 0.024, d + 0.04, GUN_D);
    for (const s of [-1, 1]) b.cyl([s * w / 2, h * 0.45, 0], [s * (w / 2 + 0.04), h * 0.45, 0], 0.03, 0.025, 8, GUN_D);
    hazard(b, -w / 2 + 0.02, w / 2 - 0.02, 0.06, d / 2 + 0.001, 0.03, 8);
  }
  function buildCables(detail) {
    const b = new MB();
    const SPAN1 = [[-2.45, 0.32, 0.05], [-2.3, 0.1, 0.2], [-2.0, 0.025, 0.28], [-1.6, 0.022, 0.15], [-1.2, 0.022, 0.3], [-0.85, 0.022, 0.18], [-0.62, 0.11, 0.0]];
    const SPAN2 = [[-0.18, 0.11, 0.02], [0.1, 0.022, 0.12], [0.5, 0.022, -0.05], [0.95, 0.022, 0.12], [1.35, 0.022, -0.02], [1.75, 0.022, 0.1], [1.98, 0.09, 0.05]];
    const SPAN2B = [[-0.18, 0.11, -0.06], [0.15, 0.02, -0.2], [0.6, 0.02, -0.3], [1.1, 0.02, -0.18], [1.5, 0.02, -0.3], [2.0, 0.02, -0.15], [2.4, 0.02, -0.3], [2.75, 0.02, -0.15], [3.05, 0.02, -0.25]];
    const SPAN3 = [[2.22, 0.06, 0.12], [2.45, 0.022, 0.25], [2.7, 0.022, 0.18], [2.95, 0.022, 0.35], [3.15, 0.022, 0.3]];
    if (!detail) {
      b.push(tr(-2.6, 0.32, 0)); reel(b, 0.3, 0.32, CABLE_O, 0); b.pop();
      for (const s of [-1, 1]) b.beam([-2.6 + s * 0.22, 0, -0.25], [-2.6 + s * 0.22, 0.34, 0], 0.04, GUN, 0.04);
      b.box(-0.4, 0.13, 0, 0.42, 0.26, 0.28, BONE); b.box(2.1, 0.11, 0.05, 0.3, 0.22, 0.24, BONE);
      for (const P of [SPAN1, SPAN2, SPAN2B]) b.tube(P, 0.02, 3, CABLE_O);
      return b;
    }
    // main reel on an A-frame stand
    b.push(tr(-2.6, 0.32, 0)); reel(b, 0.3, 0.32, CABLE_O, 1); b.pop();
    for (const s of [-1, 1]) { const x = -2.6 + s * 0.22; b.beam([x, 0.02, -0.28], [x, 0.36, 0], 0.04, GUN); b.beam([x, 0.02, 0.28], [x, 0.36, 0], 0.04, GUN); b.box(x, 0.015, 0, 0.06, 0.03, 0.62, GUN_D); b.box(x, 0.36, 0, 0.07, 0.07, 0.07, ORANGE); }
    b.push(mulAll(tr(-2.85, 0, 0), rotY(-PI / 2))); text(b, 'SV-2', 0, 0.32, 0.0, 0.07, ST_K, true); b.pop();
    b.push(mulAll(tr(-2.355, 0, 0), rotY(PI / 2))); text(b, 'R-04', 0, 0.32, 0.0, 0.07, ST_K, true); b.pop();
    // junction box 1 (upright, LED still lit)
    b.push(mulAll(tr(-0.4, 0, 0.0), rotY(0.05)));
    jbox(b, 0.42, 0.26, 0.28); text(b, 'JB-4', -0.17, 0.16, 0.141, 0.06, ST_K); pz(b, 0.15, 0.16, 0.141, 0.03, 0.03, LED_G);
    b.cyl([0.12, 0.27, 0.06], [0.12, 0.5, 0.06], 0.006, 0.004, 4, GUN_D); b.sphere(0.12, 0.5, 0.06, 0.012, 6, ORANGE);
    b.pop();
    // spans on the ground with pegs
    cable(b, SPAN1, 0.022, CABLE_O, 3, 5); cable(b, SPAN2, 0.022, CABLE_O, 3, 5); cable(b, SPAN2B, 0.018, CABLE_K, 3, 4);
    cable(b, [[-0.62, 0.08, 0.08], [-0.85, 0.022, 0.32], [-1.3, 0.02, 0.45], [-1.7, 0.02, 0.4]], 0.014, CABLE_L, 4, 5);
    for (const [x, z] of [[-1.6, 0.15], [-0.85, 0.18], [0.5, -0.05], [1.35, -0.02], [0.6, -0.3], [2.0, -0.15]]) { b.box(x, 0.05, z - 0.03, 0.012, 0.06, 0.012, STEEL); b.box(x, 0.05, z + 0.03, 0.012, 0.06, 0.012, STEEL); b.box(x, 0.075, z, 0.016, 0.012, 0.08, HAZ_Y); }
    // junction box 2 knocked onto its side
    const j2 = new MB(); j2.push(rotZ(PI / 2 - 0.05)); jbox(j2, 0.3, 0.22, 0.24, ORANGE_D); text(j2, 'JB-5', -0.12, 0.12, 0.121, 0.05, ST_K); j2.pop(); dropTo(b, j2, 2.1, 0.05, 0.25);
    cable(b, SPAN3, 0.02, CABLE_O, 3, 6);
    // loose end with a connector plug and dust cap off
    b.push(mulAll(tr(3.18, 0.035, 0.3), rotY(-0.3), rotZ(-PI / 2))); b.cyl([0, -0.03, 0], [0, 0.1, 0], 0.035, 0.035, 10, GUN_D); b.cyl([0, 0.0, 0], [0, 0.03, 0], 0.04, 0.04, 10, ORANGE); b.pop();
    b.push(tr(3.35, 0, 0.42)); b.lathe([[0, 0], [0.038, 0], [0.038, 0.03], [0, 0.03]], 10, ORANGE); b.pop();
    // spare reel lying on its side with a short loose coil
    b.push(mulAll(tr(0.8, 0.135, 0.65), rotZ(PI / 2))); reel(b, 0.16, 0.22, CABLE_K, 1); b.pop();
    for (let k = 0; k < 3; k++) ring(b, [1.15 + k * 0.02, 0.012 + k * 0.022, 0.5 - k * 0.015], 'y', 0.16 - k * 0.012, 0.012, CABLE_K, 12, 4);
    // the trailing black line runs on past the end, toward the crystals
    return b;
  }

  // =========================================================================================================
  // 7. CRATE STACK: sealed cargo cases, gas cylinders (one fallen), one case standing open and empty
  // =========================================================================================================
  function crate(b, x, y, z, ay, w, h, d, base, label, sub, detail) {
    b.push(mulAll(tr(x, y, z), rotY(ay)));
    if (!detail) { b.box(0, h / 2, 0, w, h, d, base); b.pop(); return; }
    const E = sh(base, 0.6), g = 0.035;
    b.box(0, h / 2, 0, w - 0.02, h - 0.01, d - 0.02, base);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (w / 2 - g / 2), h / 2, sz * (d / 2 - g / 2), g, h, g, E);
    for (const s of [-1, 1]) { b.box(0, h - g / 2, s * (d / 2 - g / 2), w - 2 * g, g, g, E); b.box(s * (w / 2 - g / 2), h - g / 2, 0, g, g, d - 2 * g, E); b.box(0, g / 2, s * (d / 2 - g / 2), w - 2 * g, g, g, E); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (w / 2 - 0.03), h - 0.035, sz * (d / 2 - 0.03), 0.075, 0.075, 0.075, GUN_D);
    const lid = h - Math.min(0.1, h * 0.25);
    for (const s of [-1, 1]) { b.box(0, lid, s * (d / 2 - 0.003), w - 0.08, 0.012, 0.01, BLACK); b.box(s * (w / 2 - 0.003), lid, 0, 0.01, 0.012, d - 0.08, BLACK); }
    for (const lx of [-w * 0.3, w * 0.3]) { b.box(lx, lid, d / 2 + 0.006, 0.06, 0.07, 0.014, GUN_D); b.box(lx, lid - 0.012, d / 2 + 0.014, 0.034, 0.03, 0.004, STEEL); }
    for (const s of [-1, 1]) b.tube([[s * (w / 2 + 0.004), h * 0.62, -0.08], [s * (w / 2 + 0.04), h * 0.58, -0.05], [s * (w / 2 + 0.04), h * 0.58, 0.05], [s * (w / 2 + 0.004), h * 0.62, 0.08]], 0.01, 5, GUN_D);
    const fz = d / 2 + 0.0015, th = Math.min(0.1, h * 0.2), fg = label[1] || ST_K;
    text(b, label[0], -w / 2 + 0.07, Math.min(h * 0.56, lid - 0.1), fz, th, fg);
    if (sub) text(b, sub, -w / 2 + 0.07, Math.min(h * 0.56, lid - 0.1) - th * 1.3, fz, th * 0.5, fg);
    chevrons(b, -w / 2 + 0.06, -w / 2 + 0.06 + Math.min(0.36, w * 0.4), 0.07, fz, 0.04, 6);
    b.pop();
  }
  function gasCyl(b, h, r, col, detail) {   // upright at origin
    if (!detail) { b.cyl([0, 0, 0], [0, h, 0], r, r * 0.6, 5, col); return; }
    b.lathe([[0, 0], [r * 0.92, 0], [r, 0.03], [r, h - 0.16], [r * 0.85, h - 0.08], [r * 0.45, h - 0.025], [r * 0.3, h], [0, h]], 12, col);
    b.cyl([0, h * 0.62, 0], [0, h * 0.62 + 0.04, 0], r + 0.002, r + 0.002, 12, ST_W, false); b.cyl([0, 0.12, 0], [0, 0.15, 0], r + 0.002, r + 0.002, 12, ORANGE, false);
    b.cyl([0, h, 0], [0, h + 0.05, 0], 0.016, 0.016, 6, STEEL); b.box(0, h + 0.045, 0, 0.014, 0.014, 0.06, GUN_D);
    ring(b, [0, h + 0.08, 0], 'y', 0.045, 0.008, GUN_D, 10, 4); for (let k = 0; k < 3; k++) { const a = k * TAU / 3; b.cyl([Math.cos(a) * 0.045, h - 0.01, Math.sin(a) * 0.045], [Math.cos(a) * 0.045, h + 0.08, Math.sin(a) * 0.045], 0.006, 0.006, 4, GUN_D); }
  }
  function buildCrates(detail) {
    const b = new MB();
    const OLIVE_W = [0.40, 0.42, 0.31, 0.05], SAND_W = [0.66, 0.58, 0.45, 0.05], BONE_W = [0.76, 0.74, 0.67, 0.08], ORANGE_W = [0.84, 0.44, 0.14, 0.06];
    crate(b, -0.55, 0, -0.35, 0.05, 1.0, 0.66, 0.72, SAND_W, ['SV-2'], 'SURVEY', detail);
    crate(b, -0.52, 0.665, -0.38, -0.08, 0.72, 0.44, 0.56, OLIVE_W, ['KR-07', ST_W], 'FRAGILE', detail);
    crate(b, 0.55, 0, -0.45, -0.1, 0.8, 0.52, 0.6, BONE_W, ['SV-2'], 'CORES', detail);
    crate(b, -0.62, 1.105, -0.4, 0.25, 0.42, 0.32, 0.36, ORANGE_W, ['K7'], null, detail);
    // open, empty instrument case: lid thrown back, foam liner with empty cut-outs
    b.push(mulAll(tr(0.15, 0, 0.55), rotY(-0.18)));
    const W = 0.8, H = 0.36, D = 0.5, LIN = [0.20, 0.21, 0.21, 0.02], CO = GUN;
    if (!detail) { b.box(0, H / 2, 0, W, H, D, CO); b.push(mulAll(tr(0, H, -D / 2), rotX(-1.9))); b.box(0, 0.06, D / 2, W, 0.12, D, CO); b.pop(); }
    else {
      b.plate([-W / 2, 0, D / 2], [W / 2, 0, D / 2], [W / 2, H, D / 2], [-W / 2, H, D / 2], CO); b.plate([W / 2, 0, -D / 2], [-W / 2, 0, -D / 2], [-W / 2, H, -D / 2], [W / 2, H, -D / 2], CO);
      b.plate([W / 2, 0, D / 2], [W / 2, 0, -D / 2], [W / 2, H, -D / 2], [W / 2, H, D / 2], CO); b.plate([-W / 2, 0, -D / 2], [-W / 2, 0, D / 2], [-W / 2, H, D / 2], [-W / 2, H, -D / 2], CO);
      const t = 0.03, wi = W - 2 * t, di = D - 2 * t, fy = 0.08;
      b.plate([-wi / 2, fy, D / 2 - t], [-wi / 2, H, D / 2 - t], [wi / 2, H, D / 2 - t], [wi / 2, fy, D / 2 - t], LIN); b.plate([wi / 2, fy, -D / 2 + t], [wi / 2, H, -D / 2 + t], [-wi / 2, H, -D / 2 + t], [-wi / 2, fy, -D / 2 + t], LIN);
      b.plate([W / 2 - t, fy, -di / 2], [W / 2 - t, H, -di / 2], [W / 2 - t, H, di / 2], [W / 2 - t, fy, di / 2], LIN); b.plate([-W / 2 + t, fy, di / 2], [-W / 2 + t, H, di / 2], [-W / 2 + t, H, -di / 2], [-W / 2 + t, fy, -di / 2], LIN);
      py(b, 0, fy, 0, wi, di, sh(LIN, 1.3));
      for (const [cx, cz, cw, cd] of [[-0.18, 0, 0.3, 0.3], [0.13, -0.08, 0.2, 0.14], [0.13, 0.1, 0.24, 0.12], [0.3, 0.05, 0.06, 0.26]]) py(b, cx, fy + 0.001, cz, cw, cd, BLACK);
      for (const s of [-1, 1]) { b.box(0, H - 0.01, s * (D / 2 - t / 2), W, 0.02, t, sh(CO, 1.3)); b.box(s * (W / 2 - t / 2), H - 0.01, 0, t, 0.02, D, sh(CO, 1.3)); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (W / 2 - 0.025), 0.035, sz * (D / 2 - 0.025), 0.07, 0.07, 0.07, ORANGE);
      text(b, 'SCANNER', -W / 2 + 0.06, 0.2, D / 2 + 0.002, 0.06, ST_W); chevrons(b, -W / 2 + 0.06, -W / 2 + 0.4, 0.07, D / 2 + 0.002, 0.04, 6);
      for (const lx of [-0.25, 0.25]) b.box(lx, H - 0.03, D / 2 + 0.008, 0.06, 0.05, 0.016, GUN_D);
      for (const lx of [-0.3, 0.3]) b.cyl([lx - 0.05, H, -D / 2 - 0.01], [lx + 0.05, H, -D / 2 - 0.01], 0.015, 0.015, 6, STEEL);
      // lid swung back past vertical, its liner facing forward
      b.push(mulAll(tr(0, H, -D / 2 - 0.01), rotX(-1.95)));
      b.box(0, 0.05, D / 2, W, 0.1, D, CO); b.plate([-(W - 0.06) / 2, -0.0015, D / 2 - (D - 0.06) / 2], [(W - 0.06) / 2, -0.0015, D / 2 - (D - 0.06) / 2], [(W - 0.06) / 2, -0.0015, D / 2 + (D - 0.06) / 2], [-(W - 0.06) / 2, -0.0015, D / 2 + (D - 0.06) / 2], sh(LIN, 1.2));
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) boxM(b, -0.3 + i * 0.12, -0.012, 0.08 + j * 0.11, 0.08, 0.022, 0.08, sh(LIN, 1.45), 'YxXzZ');
      b.box(0, 0.05, D + 0.003, W - 0.1, 0.06, 0.004, ORANGE); b.push(mulAll(tr(0, 0.1015, D / 2), rotX(-PI / 2))); text(b, 'SV-2', 0, 0, 0, 0.1, ST_W, true); b.pop();
      b.pop();
    }
    b.pop();
    // gas cylinders strapped to a skid, one fallen out of its strap
    b.push(mulAll(tr(1.25, 0, 0.05), rotY(-0.4)));
    if (detail) {
      b.box(0, 0.015, 0, 0.6, 0.03, 0.26, GUN_D); b.box(0, 0.6, -0.12, 0.6, 0.05, 0.02, GUN_D); for (const s of [-1, 1]) b.box(s * 0.29, 0.31, -0.12, 0.03, 0.6, 0.03, GUN_D);
      b.box(-0.05, 0.62, 0.0, 0.42, 0.03, 0.24, ORANGE_D);
      rope(b, [0.25, 0.6, -0.11], [0.32, 0.03, 0.18], -0.02, 0.008, ORANGE, 5, 4);
    }
    [[-0.19, OLIVE], [0.0, [0.30, 0.44, 0.42, 0.15]]].forEach(([x, col]) => { b.push(tr(x, 0.03, 0)); gasCyl(b, 1.05, 0.09, col, detail); b.pop(); });
    b.pop();
    const fg = new MB(); fg.push(mulAll(rotZ(PI / 2 - 0.02))); gasCyl(fg, 1.05, 0.09, BONE, detail); fg.pop(); dropTo(b, fg, 1.8, 0.45, -0.7);
    return b;
  }

  return {
    name: 'survey',
    items: [
      { name: 'survey_deck', budget: 12000, build: buildDeck, colliders: [] },
      { name: 'instrument_mast', budget: 5000, build: buildMast, colliders: [] },
      { name: 'core_drill', budget: 7000, build: buildDrill, colliders: [] },
      { name: 'fallen_shelter', budget: 6000, build: buildShelter, colliders: [] },
      { name: 'field_lab', budget: 8000, build: buildLab, colliders: [] },
      { name: 'cable_run', budget: 3000, build: buildCables, colliders: [] },
      { name: 'crate_stack', budget: 4000, build: buildCrates, colliders: [] }
    ]
  };
}) };
