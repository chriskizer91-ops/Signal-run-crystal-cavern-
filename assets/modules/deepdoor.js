window.MODDEF = { fn: (function (K) {
  // Sealed deep door (Signal Run, mine station 60 m down). A heavy colony pressure door bolted into the rock wall.
  // Coordinates: origin = floor level, centre of the doorway, on the rock wall plane. x across (left = -x), y up,
  // room side (player) = -z, tunnel side = +z. Used as-is (no rotation).
  // Clear doorway x -1.5..1.5, y 0..3.2. Leaves sit in a slot z -0.2..0.2 and slide 1.6 m sideways into pockets.
  const { MB, tr, rotX, rotY, rotZ, mulAll, rnd } = K;
  const PI = Math.PI;

  // ---------- palette: dark colony steel dulled by damp, olive drive gear, hazard paint, rust and mineral ----------
  const STEEL = [0.29, 0.30, 0.30, 0.18], STEEL_D = [0.19, 0.20, 0.21, 0.16], COLLAR = [0.26, 0.27, 0.27, 0.2];
  const LEAF = [0.31, 0.32, 0.31, 0.18], LEAF_D = [0.21, 0.22, 0.22, 0.16], EDGE = [0.15, 0.15, 0.16, 0.2];
  const WORN = [0.55, 0.55, 0.52, 0.35], GALV = [0.46, 0.47, 0.47, 0.3], RAM = [0.20, 0.21, 0.22, 0.3];
  const OLIVE = [0.34, 0.36, 0.28, 0.1], OLIVE_D = [0.24, 0.26, 0.21, 0.1], GEAR = [0.22, 0.23, 0.23, 0.2];
  const BLACK = [0.05, 0.05, 0.06, 0.04], RUBBER = [0.08, 0.08, 0.08, 0], SILL = [0.24, 0.23, 0.21, 0.14];
  const HZ_Y = [0.82, 0.63, 0.12, 0.06], HZ_K = [0.09, 0.09, 0.09, 0.06], PAINT_W = [0.80, 0.79, 0.73, 0.03];
  const RUST = [0.44, 0.23, 0.10, 0.03], RUST2 = [0.33, 0.18, 0.09, 0.02], MINERAL = [0.62, 0.61, 0.55, 0.02], GRIME = [0.16, 0.14, 0.11, 0];
  const CONC = [0.37, 0.35, 0.32, 1], LENS = [0.24, 0.06, 0.05, 0.45], GLASS = [0.06, 0.08, 0.08, 0.45], KEY = [0.15, 0.15, 0.15, 0.1], BTN = [0.48, 0.10, 0.07, 0.2];
  const CABLE = [0.11, 0.11, 0.11, 0.08], BACK = [0.25, 0.26, 0.26, 0.16];
  const sh = (c, k) => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k), c[3] || 0];
  const mix = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t, (a[3] || 0) + ((c[3] || 0) - (a[3] || 0)) * t];
  const vary = (c, r, a) => { const k = 1 + (r() - 0.5) * 2 * a, w = (r() - 0.5) * a * 0.6; return [Math.max(0, Math.min(1, c[0] * k + w)), Math.max(0, Math.min(1, c[1] * k + w * 0.4)), Math.max(0, Math.min(1, c[2] * k - w * 0.5)), c[3] || 0]; };
  const floorGrime = p => Math.max(0, Math.min(1, (0.75 - p[1]) / 0.75)) * 0.6;

  // ---------- low-level helpers ----------
  // box from corner ranges (any order)
  const B = (b, x0, x1, y0, y1, z0, z1, c) => b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), c);
  // flat quad facing 'want' (winding fixed to match), one colour per corner or one for all
  function fq(b, P, C, want) {
    C = Array.isArray(C[0]) ? C : [C, C, C, C];
    let n = K.norm(K.cross(K.sub(P[1], P[0]), K.sub(P[3], P[0])));
    if (K.dot(n, want) < 0) { P = [P[0], P[3], P[2], P[1]]; C = [C[0], C[3], C[2], C[1]]; n = [-n[0], -n[1], -n[2]]; }
    const id = P.map((p, i) => b.v(p[0], p[1], p[2], n[0], n[1], n[2], C[i])); b.quad(id[0], id[1], id[2], id[3]);
  }
  function ft(b, P, c, want) {
    let n = K.norm(K.cross(K.sub(P[1], P[0]), K.sub(P[2], P[0])));
    if (K.dot(n, want) < 0) { P = [P[0], P[2], P[1]]; n = [-n[0], -n[1], -n[2]]; }
    const id = P.map(p => b.v(p[0], p[1], p[2], n[0], n[1], n[2], c)); b.tri(id[0], id[1], id[2]);
  }
  // upright rectangle on plane z facing nz (+1/-1), bottom colour cb, top colour ct
  const rect = (b, x0, x1, y0, y1, z, nz, cb, ct) => fq(b, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], [cb, cb, ct || cb, ct || cb], [0, 0, nz]);
  // bolt head standing on point p, pointing along dir (unit axis vector)
  function bolt(b, p, dir, r, h, c, hex) {
    if (!hex) { b.box(p[0] + dir[0] * h / 2, p[1] + dir[1] * h / 2, p[2] + dir[2] * h / 2, dir[0] ? h : 2 * r, dir[1] ? h : 2 * r, dir[2] ? h : 2 * r, c); return; }
    b.push(K.along(p, [p[0] + dir[0] * h, p[1] + dir[1] * h, p[2] + dir[2] * h])); b.lathe([[r, -h / 2], [r, h / 2], [0, h / 2]], 6, c); b.pop();
  }
  // Catmull-Rom smoothing of a path
  function smooth(P, n) {
    if (n <= 1) return P; const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
      for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
    }
    out.push(P[P.length - 1]); return out;
  }

  // ---------- hazard striping: map(u, v) -> world point; u along the band 0..L, v across 0..H ----------
  function hazard(b, L, H, map, want, slant, grime, per) {
    const P = per || H * 0.8, sw = P * 0.5, sl = H * 0.55, g = grime || (() => 0);
    const put = (uv, c, off) => { const pts = uv.map(([u, v]) => { const p = map(u, v); return [p[0] + want[0] * off, p[1] + want[1] * off, p[2] + want[2] * off]; }); fq(b, pts, pts.map(p => mix(c, GRIME, g(p))), want); };
    put([[0, 0], [L, 0], [L, H], [0, H]], HZ_K, 0);
    const n = Math.max(0, Math.floor((L - sl - sw) / P) + 1), span = (n - 1) * P + sw + sl, u0 = (L - span) / 2;
    for (let k = 0; k < n; k++) {
      const u = u0 + k * P;
      put(slant > 0 ? [[u, 0], [u + sw, 0], [u + sw + sl, H], [u + sl, H]] : [[u + sl, 0], [u + sl + sw, 0], [u + sw, H], [u, H]], HZ_Y, 0.003);
    }
  }

  // ---------- stencil lettering (blocky 3x5 font) ----------
  const FONT = {
    '0': ['111', '101', '101', '101', '111'], '7': ['111', '001', '010', '010', '010'], '6': ['111', '100', '111', '101', '111'],
    'A': ['010', '101', '111', '101', '101'], 'D': ['110', '101', '101', '101', '110'], 'E': ['111', '100', '110', '100', '111'],
    'L': ['100', '100', '100', '100', '111'], '1': ['010', '110', '010', '010', '111'], '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'], 'S': ['111', '100', '111', '001', '111'], '-': ['000', '000', '111', '000', '000'], ' ': ['000', '000', '000', '000', '000']
  };
  const textW = (txt, ch) => txt.length * ch * 0.8 - ch * 0.2;
  // text centred on x = xc, bottom at y0, on plane z, readable from the side nz points to
  function text(b, txt, xc, y0, ch, z, nz, col) {
    const w = textW(txt, ch), c = ch / 5;
    if (nz < 0) b.push(mulAll(tr(0, 0, z), rotY(PI))); else b.push(tr(0, 0, z));
    const u = (nz < 0 ? -xc : xc) - w / 2;
    for (let i = 0; i < txt.length; i++) {
      const g = FONT[txt[i]] || FONT[' '], x0 = u + i * c * 4;
      for (let row = 0; row < 5; row++) {
        const s = g[row], y1 = y0 + (5 - row) * c, ya = y1 - c * 0.84; let k = 0;
        while (k < 3) { if (s[k] !== '1') { k++; continue; } let e = k; while (e < 3 && s[e] === '1') e++; const a = x0 + k * c, q = x0 + e * c - c * 0.14; b.plate([a, ya, 0], [q, ya, 0], [q, y1, 0], [a, y1, 0], col); k = e; }
      }
    }
    b.pop();
  }
  // warning triangle (black rim, yellow field, black exclamation mark) on plane z facing nz
  function warnSign(b, xc, yc, S, z, nz) {
    const want = [0, 0, nz], h = S * 0.866;
    const tri = (s, off, c) => { const hh = s * 0.866; ft(b, [[xc - s / 2, yc - hh / 3, z + nz * off], [xc + s / 2, yc - hh / 3, z + nz * off], [xc, yc + 2 * hh / 3, z + nz * off]], c, want); };
    tri(S, 0, HZ_K); tri(S * 0.74, 0.002, HZ_Y);
    rect(b, xc - S * 0.045, xc + S * 0.045, yc - h * 0.04, yc + h * 0.36, z + nz * 0.004, nz, HZ_K);
    rect(b, xc - S * 0.045, xc + S * 0.045, yc - h * 0.2, yc - h * 0.11, z + nz * 0.004, nz, HZ_K);
  }
  // vertical streak (mineral or rust) fading from colour 'top' into base colour 'base' downwards
  const streak = (b, x, y1, len, w, z, nz, top, base) => rect(b, x - w / 2, x + w / 2, y1 - len, y1, z, nz, base, top);

  // ======================= sliding leaf (s = +1 right, -1 left) =======================
  let LBL = 'D-7';   // door code stencilled on the frame and leaves (D-7, D-8, D-9 ...)
  const withLabel = (l, f) => d => { const o = LBL; LBL = l; try { return f(d); } finally { LBL = o; } };
  function leaf(s, detail) {
    const b = new MB(), F = detail > 0, r = rnd(s > 0 ? 7101 : 7202);
    const L = (X0, X1, y0, y1, z0, z1, c) => B(b, s * X0, s * X1, y0, y1, z0, z1, c);
    const W = 1.52, H = 3.3, ZT = 0.13, ZP = -0.175, ZBK = 0.175;
    const leafC = vary(LEAF, r, 0.03);
    // core slab, top cap, outer guide channel
    L(0.07, W, 0.02, H, -ZT, ZT, LEAF_D);
    L(0.07, W, 3.22, H, -0.16, 0.16, LEAF_D);
    L(1.42, W, 0.02, H, -0.19, 0.19, EDGE);
    // heavy seam bar with interlocking teeth (right leaf takes the even rows, left leaf the odd rows)
    L(0.06, 0.22, 0.02, H, -0.178, 0.178, EDGE);
    L(0.0, 0.06, 0.02, H, -0.02, 0.02, BLACK);
    for (let k = 0; k < 11; k++) {
      if ((k % 2 === 0) !== (s > 0)) continue;
      const y0 = 0.08 + k * 0.3;
      L(-0.055, 0.06, y0, y0 + 0.29, -0.13, 0.13, EDGE);
      L(-0.058, -0.03, y0 + 0.03, y0 + 0.26, -0.11, 0.11, WORN);
      if (F) L(0.2, 0.235, y0 + 0.06, y0 + 0.23, -0.185, -0.17, WORN);       // worn wedge-lock block beside each tooth
    }
    // front armour: horizontal ribs with thick plates between them, hazard kick band at the bottom
    const ribs = [0.65, 1.45, 2.25, 3.05], bands = [[0.69, 1.41], [1.49, 2.21], [2.29, 3.01]];
    for (const y of ribs) L(0.22, 1.42, y - 0.035, y + 0.035, -0.19, -ZT, sh(leafC, 0.8));
    const plates = [];
    for (const [y0, y1] of bands) { const c = vary(leafC, r, 0.04); L(0.24, 1.4, y0, y1, ZP, -ZT, c); plates.push({ y0, y1, c }); }
    L(0.22, 1.42, 0.05, 0.61, ZP, -ZT, HZ_K);
    hazard(b, 1.16, 0.5, (u, v) => [s * (0.24 + u), 0.08 + v, ZP - 0.0015], [0, 0, -1], s, floorGrime, 0.24);
    // bottom seal and track shoes
    L(0.07, W, 0.0, 0.03, -0.11, 0.11, RUBBER);
    text(b, LBL, s * 0.82, 1.66, 0.36, ZP - 0.002, -1, PAINT_W);
    // back face (tunnel side): rib grid and hazard band
    for (const y of ribs) L(0.22, 1.42, y - 0.035, y + 0.035, ZT, 0.178, sh(leafC, 0.8));
    for (const X of F ? [0.55, 0.98] : [0.8]) L(X - 0.04, X + 0.04, 0.65, 3.05, ZT, 0.175, sh(leafC, 0.85));
    hazard(b, 1.16, 0.5, (u, v) => [s * (0.24 + u), 0.08 + v, ZT + 0.001], [0, 0, 1], -s, floorGrime, 0.24);
    if (F) {
      // bolts round every armour plate
      const bolts = [];
      for (const p of plates) for (const y of [p.y0 + 0.06, p.y1 - 0.06]) for (let i = 0; i < 6; i++) { const X = 0.31 + i * 0.204; bolt(b, [s * X, y, ZP], [0, 0, -1], 0.022, 0.012, EDGE, true); bolts.push([X, y, p]); }
      for (let i = 0; i < 5; i++) bolt(b, [s * (0.3 + i * 0.27), 0.57, ZP - 0.003], [0, 0, -1], 0.02, 0.01, EDGE, false);
      for (const y of ribs) for (let i = 0; i < 4; i++) bolt(b, [s * (0.4 + i * 0.32), y, 0.178], [0, 0, 1], 0.022, 0.012, EDGE, true);
      // manual override socket near the seam, ringed in yellow
      L(0.3, 0.52, 0.93, 1.17, ZP - 0.003, ZP, HZ_Y); L(0.33, 0.49, 0.96, 1.14, ZP - 0.005, ZP, BLACK);
      b.cyl([s * 0.41, 1.05, ZP - 0.005], [s * 0.41, 1.05, ZP - 0.014], 0.045, 0.045, 6, GALV);
      // track shoes and top guide rollers
      for (const X of [0.35, 1.25]) { L(X - 0.1, X + 0.1, 0.0, 0.07, -0.09, 0.09, BLACK); b.cyl([s * X, 3.35, -0.1], [s * X, 3.35, 0.1], 0.045, 0.045, 8, RAM); }
      // wear: rust streaks under bolts, rust bloom, scuffs, chipped hazard paint, mineral drips from the top
      for (let i = 0; i < 12; i++) { const [X, y, p] = bolts[Math.floor(r() * bolts.length)]; streak(b, s * X, y - 0.02, 0.12 + r() * 0.35, 0.02 + r() * 0.025, ZP - 0.0012, -1, mix(p.c, RUST, 0.85), p.c); }
      for (let i = 0; i < 10; i++) {
        const p = plates[Math.floor(r() * plates.length)], X = 0.3 + r() * 1.0, y = p.y0 + 0.04 + r() * (p.y1 - p.y0 - 0.12), w = 0.04 + r() * 0.12, h = 0.03 + r() * 0.08;
        rect(b, s * X, s * (X + w), y, y + h, ZP - 0.0014, -1, mix(p.c, r() < 0.5 ? RUST : RUST2, 0.55 + r() * 0.35));
      }
      for (let i = 0; i < 10; i++) { const X = 0.28 + r() * 0.95, y = 0.12 + r() * 1.5, w = 0.08 + r() * 0.25; rect(b, s * X, s * (X + w), y, y + 0.008 + r() * 0.01, ZP - 0.0045, -1, WORN); }
      for (let i = 0; i < 9; i++) { const X = 0.3 + r() * 1.0, y = 0.1 + r() * 0.42, w = 0.02 + r() * 0.05; rect(b, s * X, s * (X + w), y, y + 0.02 + r() * 0.05, ZP - 0.0042, -1, r() < 0.5 ? mix(LEAF_D, RUST2, 0.4) : sh(leafC, 0.9)); }
      for (let i = 0; i < 4; i++) { const p = plates[2], X = 0.35 + r() * 0.95; streak(b, s * X, p.y1, 0.3 + r() * 0.6, 0.03 + r() * 0.04, ZP - 0.0011, -1, mix(p.c, MINERAL, 0.6), p.c); }
    }
    return b;
  }

  // ======================= fixed frame =======================
  const LAMP = [2.3, 1.69, -0.82];
  function frame(detail) {
    const b = new MB(), F = detail > 0, r = rnd(9071);
    const XD = 1.5, YD = 3.2, XP = 3.2, YH = 5.3, XC = 3.58, YC = 5.68, ZS = 0.2, ZF = -0.48, ZK = -0.53, ZG = -0.58, ZR = -0.62, ZB = 0.55;
    const Bx = (x0, x1, y0, y1, z0, z1, c) => B(b, x0, x1, y0, y1, z0, z1, c);
    const panels = [], pbolts = [];
    // --- structural core: front and back plates either side of the leaf slot, dark slot liners, top guide channel, floor groove
    for (const [z0, z1, c] of [[ZF, -ZS, STEEL_D], [ZS, ZB, BACK]]) { Bx(-XP, -XD, -0.1, YD, z0, z1, c); Bx(XD, XP, -0.1, YD, z0, z1, c); Bx(-XP, XP, YD, YH, z0, z1, c); }
    for (const [z, nz] of [[-ZS + 0.001, 1], [ZS - 0.001, -1]]) { rect(b, -XP, -XD, -0.05, 3.45, z, nz, BLACK); rect(b, XD, XP, -0.05, 3.45, z, nz, BLACK); rect(b, -XD, XD, YD, 3.45, z, nz, BLACK); }
    Bx(-XP, XP, 3.45, 3.62, -ZS, ZS, BLACK);
    Bx(-XP, XP, -0.1, 0.0, -ZS, ZS, BLACK);
    // rubber seals at the slot mouth (sides and head)
    for (const s of [-1, 1]) for (const [z0, z1] of [[-0.23, -0.19], [0.19, 0.23]]) Bx(s * 1.46, s * XD, 0.0, 3.2, z0, z1, RUBBER);
    for (const [z0, z1] of [[-0.23, -0.19], [0.19, 0.23]]) Bx(-XD, XD, 3.17, 3.2, z0, z1, RUBBER);

    // --- thick bolted collar round the outside, full depth (closes the pockets)
    for (const s of [-1, 1]) { Bx(s * XP, s * XC, -0.1, YH, ZR, 0.62, COLLAR); panels.push({ x0: Math.min(s * XP, s * XC), x1: Math.max(s * XP, s * XC), y0: 0, y1: YH, z: ZR, c: COLLAR, collar: true }); }
    Bx(-XC, XC, YH, YC, ZR, 0.62, COLLAR);
    if (F) {
      for (const s of [-1, 1]) for (let y = 0.35; y < 5.15; y += 0.53) bolt(b, [s * 3.39, y, ZR], [0, 0, -1], 0.05, 0.04, EDGE, true);
      for (let x = -3.25; x < 3.3; x += 0.5) bolt(b, [x, 5.49, ZR], [0, 0, -1], 0.05, 0.04, EDGE, true);
      for (const s of [-1, 1]) Bx(s * XP, s * (XP + 0.03), 0.05, YH, ZR - 0.012, ZR, sh(COLLAR, 0.7));   // weld bead on the collar's inner edge
      Bx(-XP, XP, YH - 0.03, YH, ZR - 0.012, ZR, sh(COLLAR, 0.7));
    }

    // --- anchor plates bolted into the rock round the collar
    const anchors = [];
    for (const s of [-1, 1]) for (const y of [0.6, 2.55, 4.55]) anchors.push({ x: s * 3.78, y, w: 0.58, h: 0.52, a: s * (r() - 0.5) * 0.12, t: (r() - 0.5) * 0.12, bolts: [[0.1, 0.13], [0.1, -0.13]].map(([u, v]) => [s * u, v]) });
    for (const x of [-2.35, 0, 2.35]) anchors.push({ x, y: 5.88, w: 0.6, h: 0.5, a: (r() - 0.5) * 0.1, t: (r() - 0.5) * 0.12, bolts: [[-0.14, 0.07], [0.14, 0.07]] });
    for (const s of [-1, 1]) anchors.push({ x: s * 3.7, y: 5.8, w: 0.56, h: 0.56, a: s * PI / 4, t: 0.05, bolts: [[0, 0.1]] });
    for (const an of anchors) {
      b.push(mulAll(tr(an.x, an.y, 0), rotZ(an.a), rotX(an.t)));
      const ac = vary(mix(sh(COLLAR, 0.85), RUST2, 0.12), r, 0.05);
      b.box(0, 0, 0.0, an.w, an.h, 0.66, ac);
      if (F) for (const [u, v] of an.bolts) { b.box(u, v, -0.345, 0.14, 0.14, 0.03, sh(ac, 0.8)); bolt(b, [u, v, -0.36], [0, 0, -1], 0.06, 0.055, EDGE, true); b.cyl([u, v, -0.41], [u, v, -0.47], 0.026, 0.026, 5, GALV, false); }
      else b.box(an.bolts[0][0], an.bolts[0][1], -0.36, 0.12, 0.12, 0.06, EDGE);
      b.pop();
    }
    // --- grout packing between collar and rock
    const grout = (x0, x1, y0, y1, side) => {
      const n = F ? Math.max(1, Math.round((side ? y1 - y0 : x1 - x0) / 0.5)) : 1;
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, d = 0.16 + r() * 0.16, zf = -0.2 + (r() - 0.5) * 0.12, c = vary(CONC, r, 0.08);
        const ya = y0 + (y1 - y0) * t0, yb = y0 + (y1 - y0) * t1 - 0.02, xa = x0 + (x1 - x0) * t0, xb = x0 + (x1 - x0) * t1 - 0.02;
        const cx = side ? side * (3.54 + d / 2) : (xa + xb) / 2, cy = side ? (ya + yb) / 2 : 5.64 + d / 2;
        b.push(mulAll(tr(cx, cy, (zf + 0.6) / 2), rotZ(side && ya < 0.2 ? 0 : (r() - 0.5) * 0.25), rotY((r() - 0.5) * 0.2)));
        b.box(0, 0, 0, side ? d : xb - xa, side ? yb - ya : d, 0.6 - zf, c); b.pop();
      }
    };
    for (const s of [-1, 1]) { grout(0, 0, -0.1, 0.32, s); grout(0, 0, 0.88, 2.27, s); grout(0, 0, 2.83, 4.27, s); grout(0, 0, 4.83, 5.4, s); }
    for (const [x0, x1] of [[-3.3, -2.67], [-2.03, -0.32], [0.32, 2.03], [2.67, 3.3]]) grout(x0, x1, 0, 0, 0);

    // --- threshold sill with the leaf groove, ramps, worn track edges, anti-slip bars, hazard edge
    Bx(-XC, XC, -0.1, 0.04, -0.95, -ZS, SILL); Bx(-XC, XC, -0.1, 0.04, ZS, 0.68, SILL);
    fq(b, [[-XC, 0.04, -0.95], [XC, 0.04, -0.95], [XC, -0.06, -1.13], [-XC, -0.06, -1.13]], sh(SILL, 0.9), [0, 1, -0.5]);
    fq(b, [[-XC, 0.04, 0.68], [XC, 0.04, 0.68], [XC, -0.06, 0.86], [-XC, -0.06, 0.86]], sh(SILL, 0.9), [0, 1, 0.5]);
    for (const s of [-1, 1]) { ft(b, [[s * XC, 0.04, -0.95], [s * XC, -0.06, -1.13], [s * XC, -0.06, -0.95]], SILL, [s, 0, 0]); ft(b, [[s * XC, 0.04, 0.68], [s * XC, -0.06, 0.86], [s * XC, -0.06, 0.68]], SILL, [s, 0, 0]); }
    for (const zs of [-1, 1]) Bx(-XD - 0.12, XD + 0.12, 0.03, 0.046, zs * 0.2, zs * 0.235, WORN);
    hazard(b, 3.0, 0.2, (u, v) => [-1.5 + u, 0.0405, -0.93 + v], [0, 1, 0], 1, () => 0.35);
    if (F) {
      for (const z of [-0.42, -0.58, -0.74, 0.36, 0.52]) Bx(-1.45, 1.45, 0.04, 0.052, z - 0.02, z + 0.02, sh(SILL, 1.25));
      for (const z of [-0.29, 0.29]) for (let x = -1.29; x < 1.3; x += 0.43) bolt(b, [x, 0.04, z], [0, 1, 0], 0.025, 0.014, EDGE, false);
      for (let i = 0; i < 7; i++) { const x = -3.3 + r() * 6.4, z = -0.9 + r() * 0.6, w = 0.15 + r() * 0.45, d = 0.06 + r() * 0.18; fq(b, [[x, 0.0535, z], [x + w, 0.0535, z], [x + w, 0.0535, z + d], [x, 0.0535, z + d]], mix(GRIME, RUST2, r() * 0.4), [0, 1, 0]); }
    }

    // --- front cladding panels (room side), bolted, with gaps showing the dark base plate
    const addPanel = (x0, x1, y0, y1, c, kick) => {
      Bx(x0, x1, y0, y1, ZK, ZF, c); const p = { x0, x1, y0, y1, z: ZK, c }; panels.push(p);
      if (kick) rect(b, x0, x1, y0, y1, ZK - 0.0008, -1, mix(c, GRIME, 0.75), c);
      return p;
    };
    const skipBolt = (x, y) => (x > 1.95 && x < 2.65 && y > 0.95 && y < 1.98) || (Math.abs(x) < 2.8 && y > 3.46 && y < 4.75) || (x > 2.7 && y > 4.75);
    for (const s of [-1, 1]) for (const [y0, y1, kick] of [[0.04, 0.95, 1], [1.0, 2.15, 0], [2.2, 3.42, 0]]) addPanel(s * 1.82, s * 3.18, y0, y1, vary(kick ? sh(STEEL, 0.92) : STEEL, r, 0.05), kick);
    addPanel(-3.18, 3.18, 3.47, 4.62, vary(STEEL, r, 0.03));
    const headP = [[-3.18, -1.07], [-1.03, 1.03], [1.07, 3.18]].map(([x0, x1]) => addPanel(x0, x1, 4.67, 5.27, vary(STEEL, r, 0.05)));
    if (F) for (const p of panels) {
      if (p.collar) continue;
      const lo = Math.min(p.x0, p.x1), hi = Math.max(p.x0, p.x1), nx = Math.max(2, Math.round((hi - lo) / 0.34) + 1), ny = Math.max(0, Math.round((p.y1 - p.y0) / 0.4) - 1);
      const pts = [];
      for (let i = 0; i < nx; i++) { const x = lo + 0.07 + i * (hi - lo - 0.14) / (nx - 1); pts.push([x, p.y0 + 0.06], [x, p.y1 - 0.06]); }
      for (let j = 1; j <= ny; j++) { const y = p.y0 + j * (p.y1 - p.y0) / (ny + 1); pts.push([lo + 0.07, y], [hi - 0.07, y]); }
      for (const [x, y] of pts) if (!skipBolt(x, y)) { bolt(b, [x, y, ZK], [0, 0, -1], 0.022, 0.018, EDGE, false); pbolts.push([x, y, p]); }
    }
    // --- edge guards round the clear doorway, striped
    for (const s of [-1, 1]) {
      Bx(s * XD, s * 1.8, 0.04, 3.45, ZG, ZF, EDGE);
      hazard(b, 3.12, 0.24, (u, v) => [s * (1.53 + v), 0.08 + u, ZG], [0, 0, -1], s, floorGrime);
      if (F) Bx(s * XD, s * 1.52, 0.1, 2.3, ZG - 0.004, ZG + 0.03, WORN);   // scraped inner edge
    }
    Bx(-1.8, 1.8, YD, 3.45, ZG, ZF, EDGE);
    hazard(b, 3.56, 0.19, (u, v) => [-1.78 + u, 3.235 + v, ZG], [0, 0, -1], 1);

    // --- actuator housing above the doorway: olive drive casing, cooling fins, two horizontal rams, central gearbox
    Bx(-2.7, 2.7, 3.55, 4.55, -0.98, ZK, OLIVE);
    fq(b, [[-2.76, 4.58, -1.04], [2.76, 4.58, -1.04], [2.76, 4.70, ZK], [-2.76, 4.70, ZK]], sh(OLIVE, 0.9), [0, 1, -0.3]);
    for (const s of [-1, 1]) fq(b, [[s * 2.76, 4.5, -1.04], [s * 2.76, 4.58, -1.04], [s * 2.76, 4.70, ZK], [s * 2.76, 4.5, ZK]], OLIVE_D, [s, 0, 0]);
    Bx(-2.76, 2.76, 4.5, 4.58, -1.05, -0.98, OLIVE_D);
    Bx(-2.72, 2.72, 3.5, 3.56, -1.01, ZK, OLIVE_D);
    for (const s of [-1, 1]) {
      Bx(s * 2.66, s * 2.78, 3.5, 4.62, -1.03, ZK, OLIVE_D);
      if (F) for (const y of [3.65, 4.05, 4.45]) bolt(b, [s * 2.72, y, -1.03], [0, 0, -1], 0.03, 0.02, EDGE, true);
      if (F) for (let k = 0; k < 12; k++) { const x = s * (0.62 + k * 0.165); Bx(x - 0.018, x + 0.018, 4.05, 4.46, -1.04, -0.98, OLIVE_D); }
      else for (let k = 0; k < 4; k++) { const x = s * (0.75 + k * 0.5); Bx(x - 0.03, x + 0.03, 4.05, 4.46, -1.04, -0.98, OLIVE_D); }
      const sg = F ? 10 : 6, y = 3.8, z = -1.12;
      b.cyl([s * 0.72, y, z], [s * 2.4, y, z], 0.1, 0.1, sg, RAM, false);
      b.cyl([s * 2.36, y, z], [s * 2.5, y, z], 0.135, 0.135, sg, OLIVE_D);
      b.cyl([s * 0.62, y, z], [s * 0.76, y, z], 0.135, 0.135, sg, OLIVE_D);
      b.cyl([s * 0.47, y, z], [s * 0.63, y, z], 0.045, 0.045, F ? 8 : 4, GALV);
      for (const X of [1.05, 2.0]) Bx(s * (X - 0.045), s * (X + 0.045), 3.67, 3.93, -1.235, -0.98, OLIVE_D);
      if (F) b.tube(smooth([[s * 2.44, 3.92, -1.12], [s * 2.5, 4.0, -1.1], [s * 2.56, 4.02, -1.03], [s * 2.6, 4.0, -0.98]], 2), 0.025, 6, CABLE);
    }
    Bx(-0.47, 0.47, 3.48, 4.66, -1.2, ZK, GEAR);
    Bx(-0.43, 0.43, 3.52, 4.62, -1.22, -1.2, sh(GEAR, 1.15));
    text(b, LBL, 0, 4.08, 0.26, -1.222, -1, PAINT_W);
    hazard(b, 0.8, 0.14, (u, v) => [-0.4 + u, 3.56 + v, -1.222], [0, 0, -1], 1);
    if (F) for (const [x, y] of [[-0.37, 3.78], [0.37, 3.78], [-0.37, 4.52], [0.37, 4.52], [0, 4.52], [-0.37, 4.15], [0.37, 4.15]]) bolt(b, [x, y, -1.22], [0, 0, -1], 0.03, 0.022, EDGE, true);

    // --- markings: SEALED over the housing, warning signs, unit code on the left jamb
    text(b, 'SEALED', 0, 4.83, 0.3, ZK - 0.002, -1, PAINT_W);
    for (const s of [-1, 1]) warnSign(b, s * 1.62, 4.94, 0.42, ZK - 0.002, -1);
    warnSign(b, -2.5, 1.55, 0.6, ZK - 0.002, -1);
    text(b, LBL, -2.5, 2.55, 0.34, ZK - 0.002, -1, PAINT_W);

    // --- control panel on the right jamb, with the dead status lamp on top
    Bx(2.03, 2.57, 1.02, 1.86, -0.73, ZK, OLIVE);
    Bx(2.0, 2.6, 1.86, 1.92, -0.8, ZK, OLIVE_D);
    b.cyl([LAMP[0], LAMP[1], -0.73], [LAMP[0], LAMP[1], -0.795], 0.085, 0.085, F ? 12 : 8, GEAR);
    b.cyl([LAMP[0], LAMP[1], -0.795], [LAMP[0], LAMP[1], -0.81], 0.062, 0.062, F ? 12 : 8, LENS);
    Bx(2.19, 2.41, 1.785, 1.80, -0.86, -0.73, OLIVE_D);
    Bx(2.08, 2.52, 1.40, 1.58, -0.738, -0.73, OLIVE_D); Bx(2.1, 2.5, 1.42, 1.56, -0.745, -0.73, GLASS);
    b.cyl([2.46, 1.2, -0.73], [2.46, 1.2, -0.745], 0.075, 0.075, F ? 10 : 6, HZ_Y);
    b.cyl([2.46, 1.2, -0.745], [2.46, 1.2, -0.785], 0.05, 0.05, F ? 10 : 6, BTN);
    if (F) {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const x = 2.13 + i * 0.075, y = 1.12 + j * 0.075; Bx(x - 0.028, x + 0.028, y - 0.028, y + 0.028, -0.745, -0.73, KEY); }
      for (const [x, y] of [[2.07, 1.06], [2.53, 1.06], [2.07, 1.82], [2.53, 1.82]]) bolt(b, [x, y, -0.73], [0, 0, -1], 0.016, 0.01, EDGE, false);
      hazard(b, 0.48, 0.05, (u, v) => [2.06 + u, 1.035 + v, -0.731], [0, 0, -1], 1);
    }

    // --- power: conduit from the panel up the jamb to a junction box; feed pair along the top into the rock;
    //     heavy armoured cable from the junction box up into the rock (fed from the surface); short run into the drive
    const sm = F ? 3 : 1, ts = F ? 8 : 4;
    b.tube(smooth([[2.5, 1.9, -0.64], [2.5, 2.02, -0.64], [2.6, 2.12, -0.64], [2.86, 2.12, -0.64], [2.95, 2.21, -0.64], [2.95, 4.84, -0.64]], sm), 0.04, ts, GALV);
    Bx(2.76, 3.14, 4.82, 5.22, -0.78, ZK, OLIVE_D); Bx(2.79, 3.11, 4.85, 5.19, -0.79, -0.78, sh(OLIVE_D, 1.2));
    for (const [z, rr] of [[-0.51, 0.04], [-0.4, 0.035]]) {
      const yy = YC + rr, x0 = z < -0.45 ? 2.86 : 3.0;
      b.tube(smooth([[x0, 5.2, -0.66], [x0, 5.6, -0.66], [x0, yy, -0.6], [x0 - 0.05, yy, z], [x0 - 0.3, yy, z], [-3.4, yy, z], [-3.62, yy, z + 0.08], [-3.78, yy + 0.02, z + 0.4], [-3.84, yy + 0.04, z + 1.0]], sm), rr, ts, GALV);
    }
    b.tube(smooth([[3.06, 5.2, -0.7], [3.1, 5.5, -0.74], [3.2, 5.82, -0.7], [3.42, 6.06, -0.55], [3.62, 6.26, -0.36], [3.78, 6.45, -0.1], [3.88, 6.6, 0.45]], F ? 3 : 1), 0.05, F ? 8 : 5, CABLE);
    b.tube(smooth([[2.82, 4.84, -0.66], [2.66, 4.8, -0.7], [2.52, 4.76, -0.76], [2.47, 4.66, -0.78]], sm), 0.03, ts, GALV);
    if (F) {
      for (let y = 2.6; y < 4.8; y += 0.5) Bx(2.88, 3.02, y - 0.02, y + 0.02, -0.69, ZK, EDGE);
      for (let x = -3.0; x < 2.7; x += 0.75) Bx(x - 0.025, x + 0.025, YC, YC + 0.095, -0.56, -0.355, EDGE);
      for (const [x, y] of [[2.81, 4.87], [3.09, 4.87], [2.81, 5.17], [3.09, 5.17]]) bolt(b, [x, y, -0.79], [0, 0, -1], 0.014, 0.01, EDGE, false);
      Bx(3.8, 3.98, 6.5, 6.7, -0.05, 0.3, EDGE);   // rock clamp where the feed cable enters the rock
    }

    // --- tunnel side (+z): stiffener ribs, striped edges, unit code
    for (const s of [-1, 1]) {
      hazard(b, 3.12, 0.24, (u, v) => [s * (1.52 + v), 0.08 + u, ZB + 0.001], [0, 0, 1], -s, floorGrime);
      if (F) for (const x of [2.15, 2.75]) Bx(s * (x - 0.04), s * (x + 0.04), 0.04, YH, ZB, 0.62, sh(STEEL_D, 1.2));
    }
    hazard(b, 3.04, 0.2, (u, v) => [-1.52 + u, 3.22 + v, ZB + 0.001], [0, 0, 1], 1);
    text(b, LBL, 0, 4.1, 0.42, ZB + 0.002, 1, PAINT_W);
    if (F) {
      for (const y of [1.2, 2.3, 3.66, 4.75]) for (const [x0, x1] of y > 3.5 ? [[-XP, XP]] : [[-XP, -1.8], [1.8, XP]]) Bx(x0, x1, y - 0.04, y + 0.04, ZB, 0.6, sh(BACK, 1.15));
      for (const s of [-1, 1]) for (let y = 0.5; y < 5.2; y += 0.6) for (const x of [2.2, 2.95]) if (Math.abs(y - 3.66) > 0.1) bolt(b, [s * x, y, ZB], [0, 0, 1], 0.025, 0.018, EDGE, false);
      for (let i = 0; i < 10; i++) { const x = (r() < 0.5 ? -1 : 1) * (1.9 + r() * 1.2), y1 = 1.0 + r() * 4.2; streak(b, x, y1, 0.4 + r() * 1.0, 0.03 + r() * 0.05, ZB + 0.0012, 1, mix(BACK, r() < 0.6 ? MINERAL : RUST, 0.6), BACK); }
      for (let i = 0; i < 5; i++) { const x = -1.3 + r() * 2.6; streak(b, x, 5.25, 0.3 + r() * 0.5, 0.03 + r() * 0.05, ZB + 0.0012, 1, mix(BACK, MINERAL, 0.65), BACK); }
    }

    // --- age: mineral streaks seeping down from above, rust streaks under bolts, rust bloom low down
    if (F) {
      for (const p of headP) for (let i = 0; i < 3; i++) { const x = p.x0 + 0.1 + r() * (p.x1 - p.x0 - 0.2); if (Math.abs(x) < 0.75 && r() < 0.6) continue; streak(b, x, p.y1, 0.2 + r() * 0.4, 0.025 + r() * 0.05, ZK - 0.0012, -1, mix(p.c, MINERAL, 0.75), p.c); }
      for (const p of panels) {
        if (p.collar) { for (let i = 0; i < 3; i++) { const x = p.x0 + 0.06 + r() * (p.x1 - p.x0 - 0.12), y1 = 1.0 + r() * 4.0; streak(b, x, y1, 0.4 + r() * 1.1, 0.03 + r() * 0.04, ZR - 0.0012, -1, mix(p.c, r() < 0.5 ? MINERAL : RUST, 0.6), p.c); } continue; }
        if (p.y1 < 3.5 && p.y0 > 2.0) for (let i = 0; i < 2; i++) { const lo = Math.min(p.x0, p.x1), x = lo + 0.15 + r() * (Math.abs(p.x1 - p.x0) - 0.3); if (x > 2.85 && x < 3.05) continue; streak(b, x, p.y1, 0.4 + r() * 0.8, 0.03 + r() * 0.05, ZK - 0.0012, -1, mix(p.c, MINERAL, 0.7), p.c); }
      }
      for (let i = 0; i < 16; i++) { const [x, y, p] = pbolts[Math.floor(r() * pbolts.length)]; streak(b, x, y - 0.025, Math.min(0.12 + r() * 0.4, y - p.y0 - 0.01), 0.02 + r() * 0.025, ZK - 0.0014, -1, mix(p.c, RUST, 0.85), p.c); }
      for (let i = 0; i < 14; i++) {
        const p = panels[Math.floor(r() * panels.length)]; if (p.collar || p.y0 > 3) continue;
        const lo = Math.min(p.x0, p.x1), w = 0.05 + r() * 0.14, h = 0.04 + r() * 0.1, x = lo + 0.05 + r() * (Math.abs(p.x1 - p.x0) - w - 0.1), y = p.y0 + 0.05 + r() * Math.min(0.6, p.y1 - p.y0 - h - 0.1);
        if (x > 1.95 && x < 2.65 && y > 0.95) continue;
        rect(b, x, x + w, y, y + h, ZK - 0.0016, -1, mix(p.c, r() < 0.5 ? RUST : RUST2, 0.5 + r() * 0.35));
      }
      // housing: rust weeping from the fin roots and grime on the gearbox
      for (let i = 0; i < 6; i++) { const x = (r() < 0.5 ? -1 : 1) * (0.65 + r() * 1.8); streak(b, x, 4.05, 0.15 + r() * 0.12, 0.03, -0.9815, -1, mix(OLIVE, RUST, 0.7), OLIVE); }
    }
    return b;
  }

  return {
    name: 'deepdoor',
    items: [
      { name: 'deep_door_frame', budget: 9000, build: d => frame(d), colliders: [], attach: [LAMP] },
      { name: 'deep_door_leaf_r', budget: 3000, build: d => leaf(1, d), colliders: [], attach: [] },
      { name: 'deep_door_leaf_l', budget: 3000, build: d => leaf(-1, d), colliders: [], attach: [] },
      ...['D-8', 'D-9', 'D-10'].flatMap(l => { const k = l.toLowerCase().replace('-', ''); return [   // the deeper doors: same door, own code
        { name: 'deep_door_frame_' + k, budget: 9000, build: withLabel(l, d => frame(d)), colliders: [], attach: [LAMP] },
        { name: 'deep_door_leaf_r_' + k, budget: 3000, build: withLabel(l, d => leaf(1, d)), colliders: [], attach: [] },
        { name: 'deep_door_leaf_l_' + k, budget: 3000, build: withLabel(l, d => leaf(-1, d)), colliders: [], attach: [] }]; })
    ]
  };
}) };
