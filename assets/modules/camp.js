window.MODDEF = { fn: (function (K) {
  // Expedition survey camp on the lookout summit (far-future reskin): hab shelter, field terminal table, survey scanner,
  // heater beacon in the stone ring, comms mast, sealed cargo stack. Rugged, worn, utilitarian.
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd, cross, dot, norm, sub, add, scale, lerp, along } = K;
  const PI = Math.PI, TAU = PI * 2;
  const cl01 = x => Math.max(0, Math.min(1, x));
  const ss = (e0, e1, x) => { const t = cl01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const sh = (c, k) => [cl01(c[0] * k), cl01(c[1] * k), cl01(c[2] * k), c[3] || 0];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] || 0];

  // ---- palette -------------------------------------------------------------------------------------------
  const HAB = [0.58, 0.57, 0.52], HAB_DK = [0.47, 0.47, 0.44], HAB_LT = [0.64, 0.63, 0.58], DUST = [0.56, 0.45, 0.33], SOD = [0.44, 0.38, 0.29];
  const RIBC = [0.44, 0.44, 0.42], SKIRT = [0.24, 0.24, 0.23], PANEL = [0.40, 0.41, 0.40, 0.1], DOOR = [0.34, 0.37, 0.35, 0.15];
  const FRAME = [0.30, 0.31, 0.32, 0.25], FRAME_D = [0.17, 0.18, 0.19, 0.2], GUN = [0.24, 0.25, 0.26, 0.3];
  const ALU = [0.68, 0.69, 0.70, 0.25], STEEL = [0.47, 0.48, 0.49, 0.3], DSTEEL = [0.22, 0.22, 0.23, 0.15], RUST = [0.42, 0.27, 0.17, 0.05];
  const BLACK = [0.07, 0.07, 0.07, 0.05], RUBBER = [0.10, 0.10, 0.10], GLASS = [0.08, 0.12, 0.16, 0.5];
  const OLIVE = [0.36, 0.38, 0.25], CORD = [0.55, 0.50, 0.40];
  const HAZ = [0.92, 0.50, 0.10, 0.05], HAZ_Y = [0.90, 0.72, 0.14, 0.05], CABLE_O = [0.90, 0.48, 0.14], TEAL = [0.20, 0.33, 0.31, 0.2];
  const SCR = [0.36, 0.88, 0.74], SCR_A = [1.0, 0.70, 0.28], LED_G = [0.40, 1.0, 0.50], LED_R = [1.0, 0.22, 0.10], LAMP = [1.0, 0.86, 0.50];
  const ORANGE = [0.96, 0.46, 0.10], EMBER = [1.0, 0.45, 0.08], EMBER2 = [0.98, 0.24, 0.04], HOT = [1.0, 0.78, 0.30];

  // ---- helpers -------------------------------------------------------------------------------------------
  function rope(b, a, c, sag, r, col, n, segs) {
    n = n || 10; const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, p = lerp(a, c, t); p[1] -= sag * 4 * t * (1 - t); pts.push(p); }
    b.tube(pts, r, segs || 4, col);
  }
  function ring(b, c, axis, R, r, col, n, segs) {           // small torus (tie, strap, coil, hoop) around an axis 'x','y','z'
    const pts = []; n = n || 10;
    for (let i = 0; i <= n; i++) { const a = i / n * TAU, p = Math.cos(a) * R, q = Math.sin(a) * R; pts.push(axis === 'y' ? [c[0] + p, c[1], c[2] + q] : axis === 'x' ? [c[0], c[1] + p, c[2] + q] : [c[0] + p, c[1] + q, c[2]]); }
    b.tube(pts, r, segs || 4, col);
  }
  // irregular stone: noisy squashed sphere. col may be fn(worldDir, u, v)
  function rock(b, cx, cy, cz, rx, ry, rz, seed, col, nu, nv, ay, amp) {
    const r = rnd(seed), ph = []; for (let i = 0; i < 8; i++) ph.push(r() * TAU);
    amp = amp === undefined ? 0.16 : amp; ay = ay || 0; const ca = Math.cos(ay), sa = Math.sin(ay);
    const dirOf = (u, v) => { const t = u * TAU, a = PI * v; return [Math.sin(a) * Math.cos(t), -Math.cos(a), Math.sin(a) * Math.sin(t)]; };
    const fn = (u, v) => {
      const t = u * TAU, a = PI * v, d0 = dirOf(u, v);
      const d = 1 + amp * Math.sin(a) * (0.5 * Math.sin(2 * t + ph[0]) * Math.sin(2 * a + ph[1]) + 0.35 * Math.sin(3 * t + ph[2] + 2 * d0[1]) + 0.25 * Math.sin(5 * t + ph[3]) * Math.sin(3 * a + ph[4]));
      return [d0[0] * rx * d, d0[1] * ry * d * (d0[1] < 0 ? 0.8 : 1), d0[2] * rz * d];
    };
    const colFn = typeof col === 'function' ? (u, v) => { const d = dirOf(u, v); return col([ca * d[0] + sa * d[2], d[1], -sa * d[0] + ca * d[2]], u, v); } : col;
    b.push(mulAll(tr(cx, cy, cz), rotY(ay))); b.surf(nu, nv, fn, colFn, true); b.pop();
  }
  // flat two-triangle label facing +Z at depth z (used for stencils, screens, stripes)
  function pz(b, cx, cy, z, w, h, col) { b.plate([cx - w / 2, cy - h / 2, z], [cx + w / 2, cy - h / 2, z], [cx + w / 2, cy + h / 2, z], [cx - w / 2, cy + h / 2, z], col); }
  // blocky stencilled unit code (n characters) facing +Z, left edge at x, centre height y
  function glyphs(b, x, y, z, n, lw, lh, col, seed) {
    const r = rnd(seed), s = lw * 0.3;
    for (let k = 0; k < n; k++) {
      const cx = x + lw / 2 + k * lw * 1.4, m = Math.floor(r() * 5);
      if (m !== 3) pz(b, cx - lw / 2 + s / 2, y, z, s, lh, col);
      if (m === 0 || m === 2 || m === 3) pz(b, cx, y + lh / 2 - s / 2, z, lw, s, col);
      if (m === 1 || m === 2) pz(b, cx, y, z, lw, s, col);
      if (m !== 4) pz(b, cx, y - lh / 2 + s / 2, z, lw, s, col);
      if (m === 1 || m === 3 || m === 4) pz(b, cx + lw / 2 - s / 2, y, z, s, lh, col);
    }
  }
  // alternating hazard stripe band facing +Z, from x0 to x1
  function hazard(b, x0, x1, y, z, h, n, cA, cB) { const w = (x1 - x0) / n; for (let i = 0; i < n; i++) pz(b, x0 + (i + 0.5) * w, y, z, w, h, i % 2 ? (cB || BLACK) : (cA || HAZ_Y)); }
  // prism along local X from a convex [y,z] outline; sideCol(i) per face, endCol on the two cut ends
  function prism(b, poly, len, sideCol, endCol) {
    const h = len / 2, n = poly.length; let cy = 0, cz = 0; poly.forEach(p => { cy += p[0] / n; cz += p[1] / n; });
    for (let i = 0; i < n; i++) { const a = poly[i], c = poly[(i + 1) % n]; b.plate([-h, a[0], a[1]], [h, a[0], a[1]], [h, c[0], c[1]], [-h, c[0], c[1]], sideCol(i)); }
    for (const x of [-h, h]) { const ctr = b.v(x, cy, cz, Math.sign(x), 0, 0, endCol), ids = poly.map(p => b.v(x, p[0], p[1], Math.sign(x), 0, 0, endCol)); for (let i = 0; i < n; i++) b.tri(ctr, ids[i], ids[(i + 1) % n]); }
  }
  // caged beacon lamp (replaces the old storm lantern), y = bottom
  function beacon(b, x, y, z, s, col, lens, detail) {
    b.push(mulAll(tr(x, y, z), sc(s, s, s)));
    const sg = detail ? 10 : 6;
    b.lathe([[0, 0], [0.07, 0], [0.076, 0.012], [0.076, 0.07], [0.055, 0.082], [0, 0.082]], sg, col);
    b.cyl([0, 0.08, 0], [0, 0.19, 0], 0.046, 0.042, sg, lens, false);
    b.lathe([[0.062, 0.188], [0.064, 0.2], [0.05, 0.218], [0.02, 0.226], [0, 0.226]], sg, col);
    if (detail) {
      for (let k = 0; k < 4; k++) { const a = k * PI / 2 + PI / 4, c = Math.cos(a), sn = Math.sin(a); b.beam([c * 0.06, 0.08, sn * 0.06], [c * 0.062, 0.19, sn * 0.062], 0.008, DSTEEL); }
      for (const yy of [0.03, 0.05]) ring(b, [0, yy, 0], 'y', 0.078, 0.004, sh(col, 0.7), 10, 3);
      const bail = []; for (let i = 0; i <= 6; i++) { const a = PI * i / 6; bail.push([Math.cos(a) * 0.06, 0.226 + Math.sin(a) * 0.07, 0]); }
      b.tube(bail, 0.005, 3, DSTEEL);
      b.box(0.074, 0.04, 0, 0.014, 0.022, 0.03, HAZ);
    }
    b.pop();
  }

  // =========================================================================================================
  // 1. HAB SHELTER  (ribbed hab-tent over exo-frame hoops; ridge along Z, airlock door on +Z gable)
  // =========================================================================================================
  const TW = 1.3, TL = 1.6, TE = 1.25, TH = 2.2, TOV = 0.1, TLO = 0.12, TK = (TH - TE) / TW, SW = TOV / (TW + TOV);
  const eaveSag = z => 0.065 * Math.sin(PI * cl01((z + TL) / (2 * TL)));
  function roofP(sg, s, v, off) {
    const z = -TL - TLO + 2 * (TL + TLO) * v, ax = (TW + TOV) * (1 - s), y0 = TH - TK * ax;
    const vin = cl01((z + TL) / (2 * TL)), sp = cl01((s - SW) / (1 - SW));
    let d = eaveSag(z) * (1 - sp) + 0.045 * Math.sin(PI * sp) * (0.5 + 0.5 * Math.sin(PI * vin)) + 0.006 * Math.sin(z * 9 + s * 4 + sg) * Math.sin(PI * sp);
    if (s < SW) d += (SW - s) / SW * 0.03;
    const ez = Math.max(0, Math.abs(z) - TL) / TLO; d += 0.035 * ez * ez;
    d -= (off || 0);
    const nl = Math.hypot(TK, 1);
    return [sg * ax - sg * TK / nl * d, y0 - d / nl, z];
  }
  const gableTop = x => TH - TK * Math.abs(x) - 0.03;
  function wallCol(y, seed) {
    let c = sh(HAB, 0.97 + 0.04 * Math.sin(seed * 7.1 + y * 3));
    c = mix(c, DUST, 0.75 * (1 - ss(0.0, 0.8, y)));
    return c;
  }
  function buildTent(detail) {
    const b = new MB();
    if (!detail) {
      const ey = TE, ex = TW + TOV, ey2 = TE - TK * TOV;
      for (const sg of [-1, 1]) {
        b.plate([sg * ex, ey2, -TL - TLO], [0, TH, -TL - TLO], [0, TH, TL + TLO], [sg * ex, ey2, TL + TLO], HAB);
        b.plate([sg * TW, 0, -TL], [sg * TW, ey, -TL], [sg * TW, ey, TL], [sg * TW, 0, TL], HAB_DK);
      }
      for (const z of [-TL, TL]) {
        b.plate([-TW, 0, z], [TW, 0, z], [TW, ey, z], [-TW, ey, z], z > 0 ? HAB_DK : HAB);
        const i0 = b.v(-TW, ey, z, 0, 0, 1, HAB), i1 = b.v(TW, ey, z, 0, 0, 1, HAB), i2 = b.v(0, TH, z, 0, 0, 1, HAB); b.tri(i0, i1, i2);
      }
      b.box(0, 0.95, TL + 0.17, 1.12, 1.9, 0.34, FRAME);
      b.box(TW + 0.55, 0.1, -0.55, 0.2, 0.2, 1.5, TEAL);
      b.box(0, 0.04, 0, 2 * TW + 2.4, 0.02, 0.04, CABLE_O); b.box(0, 0.04, 0, 0.04, 0.02, 2 * TL + 2.7, CABLE_O);
      return b;
    }
    // --- roof slopes: hab fabric, dusty at the eaves
    for (const sg of [-1, 1]) {
      b.surf(16, 30, (u, v) => roofP(sg, u, v), (u, v) => {
        let c = sh(HAB, 1 + 0.03 * Math.sin(v * 11 + sg * 2) + 0.02 * Math.sin(u * 9 + v * 5));
        c = mix(c, HAB_LT, 0.35 * ss(0.4, 1, u));
        return mix(c, DUST, 0.45 * (1 - ss(0, 0.3, u)));
      });
      b.surf(1, 24, (u, v) => roofP(sg, 0.0 + 0.05 * u, v, 0.006), SKIRT);                // rubberised eave hem
      for (const vv of [0, 1]) b.surf(10, 1, (u, w) => roofP(sg, u, vv === 0 ? 0.014 * w : 1 - 0.014 * w, 0.006), SKIRT);
    }
    // --- side walls with a dark rubber skirt and a small sealed viewport each
    const wallP = (sg, u, h, off) => {
      const z = -TL + 2 * TL * u, top = TE - eaveSag(z) * 0.8 - 0.02, y = -0.03 + (top + 0.03) * h;
      const bul = 0.025 * Math.sin(PI * u) * Math.sin(PI * h) + 0.04 * Math.pow(1 - h, 4) + 0.005 * Math.sin(u * 37 + h * 3) * (1 - h) + (off || 0);
      return [sg * (TW + bul), y, z];
    };
    for (const sg of [-1, 1]) {
      b.surf(24, 10, (u, h) => wallP(sg, u, h), (u, h) => wallCol(h * TE, u * 5 + sg));
      b.surf(12, 1, (w, h) => wallP(sg, w, 0.16 * h, 0.006), SKIRT);
      const wu0 = sg > 0 ? 0.62 : 0.2, wu1 = wu0 + 0.16;
      b.surf(2, 2, (u, h) => wallP(sg, wu0 + (wu1 - wu0) * u, 0.5 + 0.22 * h, 0.012), GLASS);
      const fr = []; for (const [u, h] of [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]) fr.push(wallP(sg, wu0 + (wu1 - wu0) * u, 0.5 + 0.22 * h, 0.018));
      b.tube(fr, 0.016, 4, FRAME_D);
    }
    // --- gables (back plain with a filter grille, front carries the airlock)
    const gableP = (zs, u, h, off) => { const x = -TW + 2 * TW * u, top = gableTop(x), y = -0.03 + (top + 0.03) * h; return [x, y, zs * (TL + 0.02 * Math.sin(PI * u) * Math.sin(PI * h) + 0.04 * Math.pow(1 - h, 4) + (off || 0))]; };
    for (const zs of [-1, 1]) {
      b.surf(20, 14, (u, h) => gableP(zs, u, h), (u, h) => wallCol(h * gableTop(-TW + 2 * TW * u), u * 3 + zs));
      b.surf(12, 1, (u, h) => gableP(zs, u, 0.12 * h, 0.006), SKIRT);
    }
    b.push(tr(0, 1.45, -TL - 0.03)); b.box(0, 0, 0, 0.5, 0.26, 0.06, FRAME);
    for (let k = 0; k < 5; k++) b.box(0, -0.09 + k * 0.045, -0.035, 0.44, 0.018, 0.012, FRAME_D);
    b.box(0.17, 0.17, -0.02, 0.12, 0.05, 0.03, HAZ); b.pop();
    // environmental control unit against the back gable: heat fins, duct and power cable
    b.push(tr(0.62, 0, -TL - 0.26));
    b.box(0, 0.32, 0, 0.5, 0.56, 0.34, FRAME); b.box(0, 0.03, 0, 0.56, 0.06, 0.4, FRAME_D);
    for (let k = 0; k < 7; k++) b.box(-0.21 + k * 0.07, 0.36, -0.18, 0.018, 0.4, 0.03, GUN);
    b.box(0, 0.62, 0, 0.44, 0.04, 0.28, FRAME_D);
    b.box(-0.255, 0.42, 0.0, 0.012, 0.12, 0.16, PANEL); b.box(-0.262, 0.45, 0.03, 0.004, 0.03, 0.05, SCR); b.box(-0.262, 0.39, -0.04, 0.004, 0.02, 0.02, LED_G);
    hazard(b, -0.25, 0.25, 0.08, -0.171, 0.05, 8);
    glyphs(b, -0.16, 0.5, -0.1712, 3, 0.05, 0.08, [0.85, 0.83, 0.76], 91);
    b.cyl([0.1, 0.52, 0.14], [0.1, 0.52, 0.28], 0.07, 0.07, 10, GUN);
    for (const z of [0.18, 0.24]) ring(b, [0.1, 0.52, z], 'z', 0.072, 0.008, FRAME_D, 10, 3);
    b.pop();
    b.tube([[0.4, 0.06, -TL - 0.3], [0.2, 0.03, -TL - 0.32], [-0.3, 0.03, -TL - 0.3], [-0.9, 0.03, -TL - 0.14], [-TW - 0.05, 0.1, -TL + 0.3]], 0.016, 5, BLACK);
    // --- exo-frame hoops over the shell, with fabric ribs between them
    const hoop = (z, off, r, col, segs) => {
      const v = (z + TL + TLO) / (2 * (TL + TLO)), u = (z + TL) / (2 * TL), pts = [];
      for (const h of [0, 0.45, 0.9]) pts.push(wallP(-1, u, h, off));
      for (let k = 0; k <= 5; k++) pts.push(roofP(-1, SW + (1 - SW) * k / 5, v, off));
      for (let k = 4; k >= 0; k--) pts.push(roofP(1, SW + (1 - SW) * k / 5, v, off));
      for (const h of [0.9, 0.45, 0]) pts.push(wallP(1, u, h, off));
      b.tube(pts, r, segs, col);
    };
    for (const z of [-1.2, -0.4, 0.4, 1.2]) hoop(z, 0.012, 0.014, RIBC, 4);
    for (const z of [-0.8, 0, 0.8]) {
      hoop(z, 0.035, 0.03, FRAME, 6);
      for (const sg of [-1, 1]) {
        const p = wallP(sg, (z + TL) / (2 * TL), 0, 0.035);
        b.box(p[0] + sg * 0.03, 0.035, z, 0.16, 0.07, 0.12, FRAME_D);
        b.box(p[0] + sg * 0.005, 0.55, z, 0.05, 0.06, 0.075, HAZ);
        b.box(p[0], TE - 0.12, z, 0.05, 0.08, 0.07, FRAME_D);
      }
    }
    b.cyl([0, TH + 0.015, -TL - 0.14], [0, TH + 0.015, TL + 0.14], 0.032, 0.032, 8, FRAME);    // ridge spine
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {                                     // corner posts
      const x = sx * (TW + 0.04), z = sz * (TL + 0.04);
      b.beam([x, -0.25, z], [x, TE + 0.06, z], 0.055, FRAME);
      b.box(x, 0.02, z, 0.13, 0.04, 0.13, FRAME_D);
      for (const y of [0.3, 0.38]) b.box(x, y, z, 0.062, 0.035, 0.062, y < 0.35 ? HAZ : BLACK);
      b.cyl([x, TE + 0.06, z], [x, TE + 0.14, z], 0.012, 0.008, 5, STEEL);
    }
    // --- guy cables and anchor stakes
    const stake = (sx, sz, ox, oz) => {
      b.cyl([sx - ox * 0.08, -0.3014, sz - oz * 0.08], [sx + ox * 0.04, 0.12, sz + oz * 0.04], 0.012, 0.016, 6, DSTEEL);
      b.box(sx + ox * 0.04, 0.125, sz + oz * 0.04, 0.07, 0.022, 0.07, HAZ);
      b.cyl([sx + ox * 0.04, 0.136, sz + oz * 0.04], [sx + ox * 0.04, 0.17, sz + oz * 0.04], 0.012, 0.01, 6, FRAME_D);
    };
    for (const sg of [-1, 1]) for (const z of [-TL + 0.05, 0, TL - 0.05]) {
      const v = (z + TL + TLO) / (2 * (TL + TLO)), P = roofP(sg, 0, v), S = [sg * (TW + 1.15), 0.15, z * 1.08];
      rope(b, P, [S[0] + sg * 0.035, S[1], S[2]], 0.025, 0.006, CABLE_O, 8, 4);
      const t0 = lerp(P, S, 0.72), t1 = lerp(P, S, 0.8); t0[1] -= 0.025; t1[1] -= 0.022; b.cyl(t0, t1, 0.014, 0.014, 6, FRAME);
      stake(S[0], S[2], sg, 0);
    }
    for (const sz of [-1, 1]) { const P = [0, TH - 0.03, sz * (TL + 0.15)], S = [0.05, 0.15, sz * (TL + 1.35)]; rope(b, P, [S[0], S[1], S[2] + sz * 0.035], 0.03, 0.006, CABLE_O, 10, 4); stake(S[0], S[2], 0, sz); }
    // --- air filter / vent stack on the -X slope (replaces the stove chimney)
    const P = roofP(-1, 0.5, 0.3);
    b.surf(3, 3, (u, v) => roofP(-1, 0.42 + 0.16 * u, 0.27 + 0.06 * v, 0.008), SKIRT);
    b.box(P[0], P[1] + 0.03, P[2], 0.28, 0.2, 0.28, FRAME);
    for (let k = 0; k < 4; k++) b.box(P[0] - 0.142, P[1] + 0.0 + k * 0.035, P[2], 0.012, 0.016, 0.24, FRAME_D);
    b.box(P[0] + 0.05, P[1] + 0.1, P[2] + 0.142, 0.1, 0.05, 0.01, HAZ);
    b.push(tr(P[0], P[1] + 0.13, P[2]));
    const fp = [[0, 0]]; for (let k = 0; k < 6; k++) { fp.push([0.1, 0.02 + k * 0.05]); fp.push([0.088, 0.045 + k * 0.05]); } fp.push([0.1, 0.32], [0.05, 0.34], [0, 0.34]);
    b.lathe(fp.map((p, i) => i > 0 && i < 13 && i % 2 === 0 ? [p[0], p[1], [0.38, 0.40, 0.33]] : p), 12, [0.44, 0.46, 0.38]);
    b.pop();
    const top = P[1] + 0.75;
    b.cyl([P[0], P[1] + 0.45, P[2]], [P[0], top, P[2]], 0.04, 0.04, 10, GUN);
    b.push(tr(P[0], 0, P[2])); b.lathe([[0.0, top + 0.12], [0.11, top + 0.08], [0.11, top + 0.06], [0.0, top + 0.09]], 10, FRAME_D); b.pop();
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3; b.beam([P[0] + Math.cos(a) * 0.035, top - 0.01, P[2] + Math.sin(a) * 0.035], [P[0] + Math.cos(a) * 0.08, top + 0.07, P[2] + Math.sin(a) * 0.08], 0.008, FRAME_D); }
    b.box(P[0], top - 0.12, P[2], 0.03, 0.06, 0.1, LED_R);
    // --- airlock vestibule on the front gable
    const AZ = TL + 0.02, AD = 0.3, AW = 0.56, AH = 1.86, zf = AZ + AD;
    for (const s of [-1, 1]) {
      b.box(s * AW, AH / 2, AZ + AD / 2, 0.06, AH, AD, PANEL);
      for (const y of [0.45, 1.0, 1.5]) b.box(s * (AW + 0.034), y, AZ + AD / 2, 0.01, 0.04, AD - 0.06, FRAME_D);
      b.box(s * (AW - 0.04), AH / 2, zf, 0.1, AH, 0.07, FRAME);
    }
    b.box(0, AH + 0.035, AZ + AD / 2 + 0.02, 2 * AW + 0.12, 0.07, AD + 0.1, FRAME);
    b.box(0, AH - 0.055, zf, 2 * AW, 0.12, 0.07, FRAME);
    b.box(0, 0.045, zf + 0.03, 2 * AW + 0.1, 0.09, 0.16, FRAME_D);
    hazard(b, -AW + 0.02, AW - 0.02, 0.06, zf + 0.111, 0.05, 10);
    hazard(b, -AW + 0.02, AW - 0.02, AH - 0.055, zf + 0.0355, 0.07, 10);
    const DW = 2 * AW - 0.18, D0 = 0.1, D1 = AH - 0.115;
    b.box(0, (D0 + D1) / 2, zf - 0.005, DW, D1 - D0, 0.05, DOOR);
    b.box(0, D1, zf + 0.025, DW, 0.025, 0.012, RUBBER); b.box(0, D0, zf + 0.025, DW, 0.025, 0.012, RUBBER);
    for (const s of [-1, 1]) b.box(s * DW / 2, (D0 + D1) / 2, zf + 0.025, 0.025, D1 - D0, 0.012, RUBBER);
    for (const y of [0.5, 1.0]) b.box(0, y, zf + 0.03, DW - 0.12, 0.06, 0.02, sh(DOOR, 0.82));
    for (const y of [0.3, 0.9, 1.5]) b.box(-DW / 2 + 0.03, y, zf + 0.035, 0.05, 0.1, 0.03, FRAME_D);
    b.cyl([0, 1.4, zf + 0.015], [0, 1.4, zf + 0.04], 0.135, 0.135, 16, FRAME_D);
    b.cyl([0, 1.4, zf + 0.04], [0, 1.4, zf + 0.046], 0.1, 0.1, 16, GLASS);
    for (let k = 0; k < 8; k++) { const a = k * PI / 4; b.box(Math.cos(a) * 0.118, 1.4 + Math.sin(a) * 0.118, zf + 0.044, 0.014, 0.014, 0.008, STEEL); }
    b.cyl([0.27, 0.86, zf + 0.02], [0.27, 0.86, zf + 0.06], 0.022, 0.022, 8, FRAME_D);
    ring(b, [0.27, 0.86, zf + 0.065], 'z', 0.075, 0.011, DSTEEL, 14, 4);
    for (const a of [0, PI / 2]) b.beam([0.27 - Math.cos(a) * 0.075, 0.86 - Math.sin(a) * 0.075, zf + 0.065], [0.27 + Math.cos(a) * 0.075, 0.86 + Math.sin(a) * 0.075, zf + 0.065], 0.012, DSTEEL);
    glyphs(b, -0.36, 0.72, zf + 0.0305, 4, 0.06, 0.1, [0.85, 0.83, 0.76], 77);
    b.box(AW - 0.04, 1.1, zf + 0.045, 0.08, 0.16, 0.03, FRAME_D);
    b.box(AW - 0.04, 1.14, zf + 0.061, 0.05, 0.05, 0.002, SCR);
    b.box(AW - 0.06, 1.06, zf + 0.061, 0.016, 0.016, 0.004, LED_G); b.box(AW - 0.02, 1.06, zf + 0.061, 0.016, 0.016, 0.004, LED_R);
    beacon(b, -0.38, AH + 0.07, AZ + AD / 2, 0.85, FRAME_D, LAMP, 1);
    b.cyl([0.36, AH + 0.07, AZ + 0.12], [0.36, AH + 0.42, AZ + 0.12], 0.006, 0.004, 4, BLACK);
    b.box(0.36, AH + 0.085, AZ + 0.12, 0.04, 0.03, 0.04, FRAME_D);
    // --- oxygen cylinder in a cradle beside the shelter (replaces the rolled tarp)
    b.push(mulAll(tr(TW + 0.55, 0.1, -0.55), rotY(0.12), sc(1, 0.85, 1)));
    b.push(rotX(PI / 2));
    b.lathe([[0, -0.72], [0.06, -0.71], [0.1, -0.67], [0.12, -0.6], [0.12, 0.6], [0.1, 0.67], [0.06, 0.71], [0.03, 0.72], [0, 0.72]], 14, TEAL);
    for (const y of [-0.42, 0.5]) b.cyl([0, y, 0], [0, y + 0.06, 0], 0.122, 0.122, 14, y > 0 ? [0.9, 0.9, 0.86, 0.1] : HAZ, false);
    b.pop();
    b.cyl([0, 0, 0.72], [0, 0, 0.75], 0.03, 0.03, 8, BLACK);
    b.cyl([0.0, 0.0, 0.75], [0.0, 0.0, 0.75 + 0.0], 0.03, 0.03, 4, BLACK);
    ring(b, [0, 0, 0.73], 'z', 0.07, 0.01, FRAME_D, 10, 4);
    for (const z of [-0.45, 0.45]) { b.box(0, -0.06, z, 0.3, 0.08, 0.08, FRAME_D); ring(b, [0, 0, z], 'z', 0.124, 0.008, HAZ, 12, 4); }
    b.pop();
    b.tube([[TW + 0.55 + 0.09, 0.1, 0.17], [TW + 0.45, 0.06, 0.3], [TW + 0.2, 0.08, 0.32], [TW + 0.08, 0.3, 0.3]], 0.013, 5, BLACK);
    b.box(TW + 0.06, 0.3, 0.3, 0.05, 0.08, 0.08, FRAME);
    return b;
  }
  // =========================================================================================================
  // 2. FIELD TABLE: data terminal, comms unit, terrain slate, sample canisters; a rugged stool and a seat case
  // =========================================================================================================
  const DECK = [0.33, 0.35, 0.32, 0.1], TCASE = [0.27, 0.29, 0.27, 0.15], PACK = [0.55, 0.53, 0.48], HELM = [0.80, 0.78, 0.72, 0.15];
  // flat two-triangle plate facing +Y
  function py(b, cx, y, cz, w, d, col) { b.plate([cx - w / 2, y, cz + d / 2], [cx + w / 2, y, cz + d / 2], [cx + w / 2, y, cz - d / 2], [cx - w / 2, y, cz - d / 2], col); }
  function stool(b, x, z, ay, seatCol, detail) {
    b.push(mulAll(tr(x, 0, z), rotY(ay)));
    const SY = 0.46, KIT = [0.30, 0.32, 0.26];
    if (!detail) {
      b.box(0, SY - 0.03, 0, 0.42, 0.06, 0.42, seatCol); b.box(0, 0.2, 0, 0.34, 0.4, 0.34, FRAME); b.box(0.04, 0.08, -0.31, 0.3, 0.16, 0.14, KIT);
      b.pop(); return;
    }
    b.box(0, SY - 0.05, 0, 0.42, 0.03, 0.42, FRAME_D);
    b.box(0, SY - 0.015, 0, 0.4, 0.05, 0.4, seatCol);
    for (const s of [-1, 1]) b.box(0, SY + 0.011, s * 0.1, 0.38, 0.004, 0.02, sh(seatCol, 0.7));
    b.box(0, SY - 0.05, 0.212, 0.36, 0.02, 0.006, HAZ);
    const legT = (sx, sz) => [sx * 0.15, SY - 0.06, sz * 0.15], legB = (sx, sz) => [sx * 0.21, 0.02, sz * 0.21];
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sz] of corners) { b.beam(legT(sx, sz), legB(sx, sz), 0.032, FRAME); b.box(sx * 0.212, 0.012, sz * 0.212, 0.065, 0.024, 0.065, RUBBER); }
    for (let k = 0; k < 4; k++) { const [ax, az] = corners[k], [bx, bz] = corners[(k + 1) % 4]; b.beam(lerp(legT(ax, az), legB(ax, az), 0.7), lerp(legT(bx, bz), legB(bx, bz), 0.7), 0.018, GUN); }
    // kit pouch on the ground behind
    b.box(0.04, 0.075, -0.31, 0.3, 0.15, 0.14, KIT);
    b.box(0.04, 0.14, -0.25, 0.3, 0.03, 0.04, sh(KIT, 0.8));
    for (const s of [-1, 1]) b.box(0.04 + s * 0.08, 0.09, -0.239, 0.025, 0.12, 0.004, HAZ);
    b.box(0.04, 0.09, -0.382, 0.18, 0.08, 0.006, sh(KIT, 0.85));
    b.pop();
  }
  function seatCase(b, x, z, ay, detail) {
    b.push(mulAll(tr(x, 0, z), rotY(ay)));
    const W = 0.6, H = 0.42, D = 0.42, C = [0.31, 0.34, 0.31, 0.1];
    if (!detail) {
      b.box(0, H / 2, 0, W, H, D, C); b.box(0, 0.36, -0.36, 0.42, 0.72, 0.26, PACK); b.box(0.02, H + 0.13, 0.04, 0.26, 0.26, 0.26, HELM);
      b.pop(); return;
    }
    b.box(0, H / 2 + 0.01, 0, W, H - 0.02, D, C);
    b.box(0, 0.015, 0, W + 0.02, 0.03, D + 0.02, RUBBER);
    b.box(0, H - 0.08, 0, W + 0.012, 0.014, D + 0.012, sh(C, 0.65));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (W / 2 - 0.02), H / 2, sz * (D / 2 - 0.02), 0.055, H + 0.004, 0.055, FRAME_D);
    for (const s of [-0.16, 0.16]) { b.box(s, H - 0.1, D / 2 + 0.008, 0.06, 0.07, 0.016, FRAME_D); b.box(s, H - 0.08, D / 2 + 0.017, 0.03, 0.03, 0.004, STEEL); }
    hazard(b, -W / 2 + 0.05, W / 2 - 0.05, 0.06, D / 2 + 0.0012, 0.04, 9);
    glyphs(b, -0.2, 0.2, D / 2 + 0.0012, 5, 0.04, 0.07, [0.85, 0.83, 0.76], 2301);
    for (const s of [-1, 1]) b.tube([[s * (W / 2 + 0.01), H * 0.62, -0.08], [s * (W / 2 + 0.05), H * 0.58, -0.05], [s * (W / 2 + 0.05), H * 0.58, 0.05], [s * (W / 2 + 0.01), H * 0.62, 0.08]], 0.012, 5, FRAME_D);
    // suit helmet resting on the lid
    b.push(tr(0.02, H, 0.04));
    b.cyl([0, 0, 0], [0, 0.035, 0], 0.115, 0.115, 14, FRAME);
    b.cyl([0, 0.035, 0], [0, 0.045, 0], 0.105, 0.105, 14, HAZ);
    b.sphere(0, 0.15, 0, 0.13, 14, HELM, 0.125);
    b.surf(8, 5, (u, v) => { const t = -0.95 + 1.9 * u, a = 0.35 + 1.0 * v; return [Math.sin(t) * Math.sin(a) * 0.134, 0.15 - Math.cos(a) * 0.13, Math.cos(t) * Math.sin(a) * 0.134]; }, [0.36, 0.28, 0.12, 0.5]);
    b.beam([0, 0.27, -0.1], [0, 0.285, 0.06], 0.035, FRAME_D, 0.02);
    for (const s of [-1, 1]) { b.box(s * 0.13, 0.17, 0, 0.03, 0.06, 0.08, FRAME_D); b.box(s * 0.143, 0.17, 0.03, 0.006, 0.03, 0.03, LAMP); }
    b.pop();
    // life-support pack leaning on the back of the case
    b.push(mulAll(tr(0, 0, -D / 2 - 0.13), rotX(0.12)));
    b.box(0, 0.36, 0, 0.42, 0.7, 0.18, PACK);
    b.box(0, 0.7, 0, 0.44, 0.04, 0.2, FRAME_D);
    for (const s of [-1, 1]) {
      b.cyl([s * 0.1, 0.08, -0.12], [s * 0.1, 0.6, -0.12], 0.055, 0.055, 10, TEAL);
      b.cyl([s * 0.1, 0.6, -0.12], [s * 0.1, 0.64, -0.12], 0.03, 0.025, 8, FRAME_D);
      b.cyl([s * 0.1, 0.45, -0.12], [s * 0.1, 0.47, -0.12], 0.057, 0.057, 10, [0.9, 0.9, 0.86, 0.1], false);
    }
    hazard(b, -0.2, 0.2, 0.62, 0.0905, 0.04, 6);
    b.box(0.12, 0.45, 0.092, 0.08, 0.06, 0.006, SCR);
    b.tube([[0.1, 0.64, -0.12], [0.16, 0.74, -0.06], [0.24, 0.6, 0.0], [0.22, 0.4, 0.05]], 0.014, 5, BLACK);
    b.pop();
    b.pop();
  }
  function buildTable(detail) {
    const b = new MB(), r = rnd(202), TOP = 0.75;
    b.push(rotY(0.06));
    if (!detail) {
      b.box(0, TOP - 0.012, 0, 1.8, 0.024, 0.8, DECK);
      for (const x of [-0.72, 0.72]) b.box(x, 0.36, 0, 0.05, 0.72, 0.7, FRAME);
      b.box(-0.55, TOP + 0.13, -0.12, 0.42, 0.26, 0.3, TCASE); b.box(-0.6, TOP + 0.9, -0.24, 0.025, 1.5, 0.025, DSTEEL);
      b.box(0.45, TOP + 0.014, 0.05, 0.62, 0.028, 0.46, [0.10, 0.28, 0.27]); b.box(0, TOP + 0.13, -0.12, 0.34, 0.24, 0.04, [0.2, 0.22, 0.2]);
      b.pop();
      stool(b, -0.25, 0.86, PI + 0.18, [0.30, 0.32, 0.29], 0); seatCase(b, 1.32, 0.14, -PI / 2 + 0.28, 0);
      return b;
    }
    // composite deck over a gunmetal frame
    b.box(0, TOP - 0.013, 0, 1.8, 0.026, 0.8, DECK);
    for (let i = 0; i < 3; i++) py(b, -0.6 + i * 0.6, TOP + 0.0006, 0, 0.56, 0.72, sh(DECK, 0.8 + 0.06 * i));
    for (const z of [-0.395, 0.395]) b.beam([-0.9, TOP - 0.012, z], [0.9, TOP - 0.012, z], 0.034, FRAME);
    for (const x of [-0.9, 0.9]) for (const z of [-0.39, 0.39]) b.box(x, TOP - 0.012, z, 0.06, 0.04, 0.06, RUBBER);
    hazard(b, -0.84, 0.84, TOP - 0.012, 0.4125, 0.02, 22);
    for (const x of [-0.86, 0, 0.86]) b.beam([x, TOP - 0.04, -0.37], [x, TOP - 0.04, 0.37], 0.026, GUN);
    for (const x of [-0.72, 0.72]) {
      b.cyl([x, -0.02, -0.36], [x, TOP - 0.035, 0.34], 0.016, 0.016, 6, FRAME); b.cyl([x, -0.02, 0.36], [x, TOP - 0.035, -0.34], 0.016, 0.016, 6, FRAME);
      b.cyl([x, 0.015, -0.37], [x, 0.015, 0.37], 0.014, 0.014, 6, FRAME);
      for (const z of [-0.36, 0.36]) b.cyl([x, -0.12, z], [x, 0.02, z], 0.024, 0.024, 6, RUBBER);
      b.cyl([x - 0.025, 0.36, 0], [x + 0.025, 0.36, 0], 0.02, 0.02, 6, HAZ);
    }
    b.cyl([-0.72, 0.36, 0], [0.72, 0.36, 0], 0.013, 0.013, 6, FRAME);
    // under-deck power cell slung between the legs
    b.box(0.0, 0.48, -0.2, 0.36, 0.12, 0.2, FRAME_D); b.box(0.0, 0.48, -0.098, 0.3, 0.06, 0.004, GUN);
    for (let k = 0; k < 4; k++) b.box(-0.09 + k * 0.03, 0.5, -0.0975, 0.018, 0.018, 0.004, k < 3 ? LED_G : FRAME_D);
    b.tube([[0.18, 0.5, -0.2], [0.3, 0.55, -0.25], [0.6, 0.7, -0.3], [0.8, TOP - 0.03, -0.32]], 0.01, 4, BLACK);
    // comms unit (replaces the field radio)
    b.push(mulAll(tr(-0.56, TOP, -0.12), rotY(-0.12)));
    const RW = 0.42, RH = 0.26, RD = 0.3, FZ = RD / 2;
    b.box(0, RH / 2, 0, RW, RH, RD, TCASE);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * RW / 2, RH / 2, sz * RD / 2, 0.03, RH + 0.008, 0.03, FRAME_D);
    for (const sz of [-1, 1]) b.box(0, RH, sz * RD / 2, RW, 0.022, 0.026, FRAME_D);
    b.box(0, RH / 2, FZ + 0.003, RW - 0.04, RH - 0.04, 0.006, [0.12, 0.13, 0.12]);
    b.box(-0.08, 0.17, FZ + 0.007, 0.2, 0.1, 0.004, [0.03, 0.08, 0.08]);
    for (let k = 0; k < 4; k++) pz(b, -0.13 + k * 0.012 * 3, 0.15 + 0.012 * (k % 2), FZ + 0.0095, 0.02, 0.03 + 0.02 * ((k * 7) % 3), SCR);
    b.tube([[-0.17, 0.2, FZ + 0.01], [-0.12, 0.21, FZ + 0.01], [-0.08, 0.19, FZ + 0.01], [-0.03, 0.205, FZ + 0.01], [0.01, 0.2, FZ + 0.01]], 0.003, 3, SCR_A);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) pz(b, 0.09 + i * 0.035, 0.07 + j * 0.035, FZ + 0.007, 0.026, 0.026, (i + j) % 4 ? [0.28, 0.29, 0.27] : HAZ);
    for (let k = 0; k < 3; k++) { const kx = -0.15 + k * 0.06; b.cyl([kx, 0.065, FZ], [kx, 0.065, FZ + 0.025], 0.016, 0.014, 8, BLACK); pz(b, kx, 0.095, FZ + 0.0075, 0.012, 0.01, k ? LED_G : LED_R); }
    hazard(b, -RW / 2 + 0.03, RW / 2 - 0.03, 0.025, FZ + 0.0072, 0.02, 8);
    glyphs(b, 0.06, 0.225, FZ + 0.0072, 3, 0.025, 0.035, [0.85, 0.83, 0.76], 2302);
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 5; k++) b.box(sx * (RW / 2 + 0.008), RH / 2, -0.1 + k * 0.05, 0.016, RH - 0.06, 0.012, FRAME_D);
      b.tube([[sx * RW / 2, 0.21, -0.08], [sx * (RW / 2 + 0.035), 0.22, -0.06], [sx * (RW / 2 + 0.035), 0.22, 0.06], [sx * RW / 2, 0.21, 0.08]], 0.008, 5, BLACK);
    }
    b.cyl([-0.16, RH, -0.1], [-0.16, RH + 0.05, -0.1], 0.022, 0.016, 8, FRAME_D);
    const ant = []; for (let i = 0; i <= 10; i++) { const t = i / 10; ant.push([-0.16 - 0.14 * t * t, RH + 0.05 + 1.44 * t, -0.1 + 0.03 * t * t]); }
    b.tube(ant, t => 0.008 - 0.004 * t, 4, DSTEEL);
    for (const t of [0.3, 0.6]) b.cyl([-0.16 - 0.14 * t * t, RH + 0.04 + 1.44 * t, -0.1 + 0.03 * t * t], [-0.16 - 0.14 * t * t, RH + 0.07 + 1.44 * t, -0.1 + 0.03 * t * t], 0.012, 0.012, 6, HAZ);
    b.sphere(-0.30, RH + 1.49, -0.07, 0.012, 6, LED_R);
    b.box(0.08, RH + 0.04, -0.04, 0.12, 0.08, 0.12, FRAME_D);
    b.cyl([0.08, RH + 0.08, -0.04], [0.08, RH + 0.1, -0.04], 0.05, 0.05, 10, [0.75, 0.74, 0.70, 0.1]);
    b.pop();
    b.tube([[-0.37, TOP + 0.05, -0.27], [-0.3, TOP + 0.012, -0.29], [-0.18, TOP + 0.012, -0.26], [-0.12, TOP + 0.03, -0.2]], 0.007, 4, BLACK);
    // rugged data terminal (folding)
    b.push(mulAll(tr(0.0, TOP, -0.07), rotY(0.14)));
    b.box(0, 0.02, 0, 0.36, 0.04, 0.26, [0.22, 0.23, 0.22]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 0.17, 0.021, sz * 0.12, 0.04, 0.046, 0.04, HAZ);
    py(b, 0, 0.0405, 0.02, 0.29, 0.13, [0.08, 0.08, 0.08]);
    for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) py(b, -0.121 + i * 0.022, 0.0415, -0.017 + j * 0.025, 0.018, 0.02, sh([0.2, 0.2, 0.19], 0.9 + 0.2 * ((i * 7 + j * 3) % 5) / 5));
    py(b, 0, 0.0412, 0.1, 0.08, 0.04, [0.16, 0.16, 0.16]);
    b.beam([-0.12, 0.03, 0.135], [0.12, 0.03, 0.135], 0.02, FRAME_D);
    b.push(mulAll(tr(0, 0.04, -0.125), rotX(-0.26)));
    b.box(0, 0.13, 0, 0.36, 0.26, 0.024, [0.22, 0.23, 0.22]);
    for (const sx of [-1, 1]) for (const sy of [0, 1]) b.box(sx * 0.17, 0.01 + sy * 0.24, 0, 0.04, 0.04, 0.034, HAZ);
    b.box(0, 0.135, 0.0125, 0.3, 0.2, 0.002, [0.02, 0.06, 0.06, 0.4]);
    const scr = [[-0.07, 0.15, 0.13, 0.11, [0.10, 0.36, 0.30]], [0.07, 0.17, 0.11, 0.07, [0.06, 0.20, 0.22]], [0.07, 0.09, 0.11, 0.05, [0.30, 0.18, 0.05]], [0, 0.222, 0.28, 0.018, [0.18, 0.45, 0.40]]];
    for (const [sx, sy, w, h, c] of scr) pz(b, sx, sy, 0.0138, w, h, c);
    for (let k = 0; k < 4; k++) pz(b, 0.03 + k * 0.025, 0.08 + 0.012 * ((k * 5) % 3), 0.0142, 0.014, 0.02 + 0.015 * ((k * 5) % 3), SCR_A);
    b.tube([[-0.13, 0.11, 0.0145], [-0.09, 0.16, 0.0145], [-0.05, 0.13, 0.0145], [-0.01, 0.18, 0.0145]], 0.003, 3, SCR);
    b.tube([[0.02, 0.15, 0.0145], [0.06, 0.19, 0.0145], [0.09, 0.16, 0.0145], [0.12, 0.2, 0.0145]], 0.0025, 3, SCR);
    b.pop(); b.pop();
    // terrain-scan slate (replaces the paper map)
    b.push(mulAll(tr(0.47, TOP, 0.06), rotY(0.2)));
    const MW = 0.62, MD = 0.46, SWd = MW - 0.07, SDd = MD - 0.07;
    b.box(0, 0.014, 0, MW, 0.028, MD, GUN);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (MW / 2 - 0.025), 0.015, sz * (MD / 2 - 0.025), 0.065, 0.034, 0.065, RUBBER);
    b.surf(40, 28, (u, v) => [(u - 0.5) * SWd, 0.0285, (v - 0.5) * SDd], (u, v) => {
      if (u < 0.025 || u > 0.975 || v < 0.035 || v > 0.965) return [0.03, 0.05, 0.06];
      const X = u * 6, Z = v * 4.5, cz = 0.5 + 0.18 * Math.sin(u * 7.5 + 0.6) + 0.05 * Math.sin(u * 19), dc = Math.abs(v - cz);
      let h = Math.sin(X * 0.9 + 0.5) * 0.5 + Math.cos(Z * 1.1 - X * 0.4) * 0.4 + Math.sin(X * 2.1 + Z * 1.7) * 0.15;
      let c = mix([0.03, 0.10, 0.11], [0.07, 0.24, 0.24], cl01(h * 0.6 + 0.5));
      h -= 0.9 * Math.exp(-dc * dc * 90);
      const f = h * 5 - Math.floor(h * 5);
      if (f < 0.2) c = mix(c, SCR, 0.7);
      if (dc < 0.06) c = mix(c, [0.5, 0.3, 0.08], 0.6);
      if (dc < 0.022) c = SCR_A;
      if ((X % 1) < 0.05 || (Z % 1) < 0.06) c = mix(c, [0.2, 0.5, 0.55], 0.4);
      return c;
    });
    for (const [mx, mz, w, d, c] of [[0.2, 0.15, 0.1, 0.04, [0.10, 0.30, 0.28]], [0.155, 0.15, 0.015, 0.015, LED_R], [0.18, 0.15, 0.015, 0.015, SCR_A], [0.205, 0.15, 0.015, 0.015, LED_G], [-0.12, -0.05, 0.016, 0.016, LED_R]]) py(b, mx, 0.0292, mz, w, d, c);
    for (let k = 0; k < 3; k++) b.box(MW / 2 + 0.004, 0.014, -0.1 + k * 0.05, 0.008, 0.014, 0.03, k ? FRAME_D : HAZ);
    b.cyl([-0.2, 0.034, MD / 2 - 0.012], [0.05, 0.034, MD / 2 - 0.012], 0.006, 0.006, 6, HAZ);
    b.pop();
    // laser rangefinder (replaces binoculars)
    b.push(mulAll(tr(0.78, TOP, -0.25), rotY(0.6)));
    b.box(0, 0.045, 0.0, 0.11, 0.07, 0.17, GUN);
    b.box(0, 0.083, 0.02, 0.07, 0.01, 0.09, FRAME_D); b.box(0.02, 0.0885, 0.05, 0.012, 0.002, 0.012, LED_G);
    for (const s of [-1, 1]) { b.cyl([s * 0.028, 0.045, -0.085], [s * 0.028, 0.045, -0.11], 0.024, 0.026, 10, RUBBER); b.cyl([s * 0.028, 0.045, -0.11], [s * 0.028, 0.045, -0.111], 0.019, 0.019, 10, [0.30, 0.08, 0.06, 0.5]); }
    b.cyl([0, 0.045, 0.085], [0, 0.045, 0.1], 0.02, 0.018, 8, RUBBER);
    b.tube([[-0.06, 0.03, 0.03], [-0.1, 0.005, 0.0], [-0.08, 0.004, -0.12], [0.04, 0.004, -0.15], [0.1, 0.005, -0.05], [0.06, 0.03, 0.03]], 0.004, 3, HAZ);
    b.pop();
    // sealed sample canisters (replace mug)
    for (const [cx, cz, band] of [[-0.14, 0.26, [0.70, 0.45, 0.25]], [-0.06, 0.3, [0.55, 0.55, 0.45]]]) {
      b.push(tr(cx, TOP, cz));
      b.lathe([[0, 0.001], [0.036, 0.001], [0.038, 0.02], [0.034, 0.025], [0.034, 0.1], [0.038, 0.105], [0.038, 0.125], [0.02, 0.13], [0, 0.13]], 12, GUN);
      b.cyl([0, 0.035, 0], [0, 0.09, 0], 0.0355, 0.0355, 12, band, false);
      b.cyl([0, 0.105, 0], [0, 0.118, 0], 0.0395, 0.0395, 12, HAZ, false);
      pz(b, 0, 0.06, 0.0362, 0.03, 0.02, [0.9, 0.9, 0.86]);
      b.pop();
    }
    // pressurised gas bottle (replaces the thermos)
    b.push(tr(-0.84, TOP, 0.24));
    b.lathe([[0, 0], [0.042, 0], [0.046, 0.01], [0.046, 0.22], [0.04, 0.245], [0.022, 0.26], [0, 0.26]], 12, TEAL);
    for (const [y, c] of [[0.04, HAZ], [0.17, [0.9, 0.9, 0.86, 0.1]]]) b.cyl([0, y, 0], [0, y + 0.02, 0], 0.047, 0.047, 12, c, false);
    b.cyl([0, 0.26, 0], [0, 0.29, 0], 0.012, 0.012, 6, FRAME_D); b.box(0, 0.285, 0, 0.05, 0.012, 0.012, FRAME_D);
    ring(b, [0, 0.29, 0], 'y', 0.035, 0.006, FRAME_D, 8, 3);
    b.pop();
    // closed instrument case (replaces clipboard)
    b.push(mulAll(tr(0.15, TOP, 0.25), rotY(-0.35)));
    b.box(0, 0.035, 0, 0.23, 0.07, 0.32, [0.78, 0.42, 0.10, 0.1]);
    b.box(0, 0.05, 0, 0.234, 0.008, 0.324, sh([0.78, 0.42, 0.10], 0.7));
    for (const s of [-1, 1]) b.box(s * 0.12, 0.04, s * 0.06, 0.012, 0.03, 0.04, FRAME_D);
    b.tube([[-0.05, 0.035, 0.162], [-0.04, 0.035, 0.19], [0.04, 0.035, 0.19], [0.05, 0.035, 0.162]], 0.008, 5, FRAME_D);
    py(b, 0, 0.0705, -0.05, 0.12, 0.05, [0.9, 0.9, 0.86]); glyphs(b, -0.06, 0.03, 0.1615, 3, 0.02, 0.03, BLACK, 2303);
    b.pop();
    // sample vial rack (replaces hard hat)
    b.push(mulAll(tr(0.66, TOP, 0.33), rotY(0.4)));
    b.box(0, 0.025, 0, 0.22, 0.05, 0.08, GUN);
    for (let k = 0; k < 4; k++) {
      const x = -0.075 + k * 0.05, cc = [[0.70, 0.45, 0.25], [0.45, 0.62, 0.55], [0.75, 0.62, 0.35], [0.5, 0.4, 0.55]][k];
      b.cyl([x, 0.05, 0], [x, 0.12, 0], 0.014, 0.014, 8, cc); b.cyl([x, 0.12, 0], [x, 0.135, 0], 0.016, 0.016, 8, k === 1 ? HAZ : FRAME_D);
    }
    py(b, 0, 0.0505, 0.03, 0.2, 0.012, HAZ);
    b.pop();
    // spare power cell (replaces field book)
    b.push(mulAll(tr(-0.36, TOP, 0.28), rotY(0.25)));
    b.box(0, 0.025, 0, 0.12, 0.05, 0.19, GUN);
    b.box(0, 0.025, 0.1, 0.1, 0.035, 0.012, HAZ);
    for (const s of [-1, 1]) b.cyl([s * 0.03, 0.05, 0.07], [s * 0.03, 0.062, 0.07], 0.008, 0.008, 6, s > 0 ? LED_R : FRAME_D);
    for (let k = 0; k < 4; k++) py(b, 0, 0.0505, -0.06 + k * 0.025, 0.05, 0.016, k < 3 ? LED_G : FRAME_D);
    b.pop();
    // rock sample in a tray
    b.box(-0.6, TOP + 0.01, 0.2, 0.15, 0.02, 0.12, FRAME_D);
    rock(b, -0.6, TOP + 0.036, 0.2, 0.045, 0.026, 0.035, 2201, [0.62, 0.48, 0.36], 8, 5, 0.3);
    void r;
    b.pop();
    stool(b, -0.25, 0.86, PI + 0.18, [0.30, 0.32, 0.29], 1);
    seatCase(b, 1.32, 0.14, -PI / 2 + 0.28, 1);
    return b;
  }
  // =========================================================================================================
  // 3. SURVEY SCANNER on a composite tripod (lens cluster towards -X), case, ground sensor and marker beacon
  // =========================================================================================================
  const SHELL = [0.55, 0.56, 0.52, 0.15], GREY_I = [0.26, 0.28, 0.28, 0.15], LEG = [0.27, 0.28, 0.28, 0.1], LENS = [0.10, 0.16, 0.26, 0.5];
  function buildTheodolite(detail) {
    const b = new MB(), r = rnd(303), HY = 1.2;
    const legA = [PI * 0.5 + 0.1, PI * 0.5 + TAU / 3 - 0.05, PI * 0.5 + 2 * TAU / 3 + 0.08];
    if (!detail) {
      for (const a of legA) b.beam([Math.cos(a) * 0.07, HY, Math.sin(a) * 0.07], [Math.cos(a) * 0.64, -0.1, Math.sin(a) * 0.64], 0.04, LEG);
      b.box(0, 1.27, 0, 0.16, 0.12, 0.16, GREY_I); b.box(0, 1.47, 0, 0.12, 0.22, 0.16, SHELL); b.box(-0.02, 1.55, 0, 0.26, 0.1, 0.1, GREY_I);
      b.push(mulAll(tr(0.62, 0, 0.48), rotY(0.5))); b.box(0, 0.09, 0, 0.42, 0.18, 0.32, GUN); b.box(0, 0.26, -0.2, 0.42, 0.32, 0.08, GUN); b.pop();
      b.box(-1.55, 0.95, -0.3, 0.035, 2.25, 0.035, HAZ);
      return b;
    }
    // tripod: composite legs, orange clamps, steel spikes
    b.cyl([0, HY - 0.03, 0], [0, HY + 0.012, 0], 0.09, 0.09, 16, FRAME);
    b.cyl([0, HY - 0.15, 0], [0, HY - 0.03, 0], 0.012, 0.012, 6, DSTEEL); b.cyl([0, HY - 0.17, 0], [0, HY - 0.14, 0], 0.03, 0.03, 10, BLACK);
    legA.forEach((a) => {
      const ca = Math.cos(a), sa = Math.sin(a), T = [ca * 0.075, HY - 0.02, sa * 0.075], Fp = [ca * 0.64, 0, sa * 0.64], tg = [-sa, 0, ca];
      const P = t => lerp(T, Fp, t), off = (p, k) => add(p, scale(tg, k));
      b.cyl(off(T, -0.04), off(T, 0.04), 0.016, 0.016, 8, FRAME_D);
      const wsh = 0.9 + 0.12 * r();
      for (const k of [-0.03, 0.03]) b.beam(off(P(0.01), k), off(P(0.58), k), 0.032, sh(LEG, wsh), 0.02);
      b.beam(P(0.42), P(0.97), 0.03, sh([0.42, 0.43, 0.43, 0.25], wsh), 0.028);
      b.beam(P(0.3), P(0.34), 0.078, FRAME_D, 0.032);
      for (const t of [0.22, 0.4]) b.beam(off(P(t), -0.035), off(P(t), 0.035), 0.014, FRAME_D);
      b.beam(P(0.53), P(0.59), 0.055, HAZ, 0.092);
      const out = [ca, 0, sa], cp = P(0.56);
      b.cyl(cp, add(cp, scale(out, 0.045)), 0.008, 0.008, 6, FRAME_D); b.beam(add(cp, add(scale(out, 0.045), [0, -0.018, 0])), add(cp, add(scale(out, 0.045), [0, 0.018, 0])), 0.01, FRAME_D, 0.005);
      const sf = add(Fp, scale(sub(Fp, T), 0.08));
      b.cyl(P(0.95), sf, 0.018, 0.004, 8, STEEL);
      b.beam(P(0.93), add(P(0.93), scale(out, 0.06)), 0.014, FRAME_D, 0.03);
      b.beam(P(0.92), P(0.97), 0.038, FRAME_D, 0.034);
    });
    // levelling base
    b.push(tr(0, HY + 0.012, 0));
    const tri = []; for (let k = 0; k < 6; k++) { const a = k * PI / 3 + PI / 6, rr = k % 2 ? 0.05 : 0.085; tri.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    b.extrude(tri, 0, 0.02, FRAME_D);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + PI / 6, x = Math.cos(a) * 0.07, z = Math.sin(a) * 0.07; b.cyl([x, 0.02, z], [x, 0.05, z], 0.016, 0.016, 10, BLACK); b.cyl([x, 0.03, z], [x, 0.04, z], 0.018, 0.018, 10, HAZ, false); }
    b.cyl([0, 0.05, 0], [0, 0.07, 0], 0.075, 0.072, 16, GREY_I);
    b.cyl([0.05, 0.07, 0.03], [0.05, 0.077, 0.03], 0.009, 0.009, 8, LED_G);
    b.pop();
    // rotating base and control body
    const BY = HY + 0.082;
    b.cyl([0, BY, 0], [0, BY + 0.04, 0], 0.075, 0.075, 18, SHELL);
    b.cyl([0, BY + 0.015, 0], [0, BY + 0.025, 0], 0.077, 0.077, 18, HAZ);
    b.box(0, BY + 0.08, 0, 0.17, 0.08, 0.15, SHELL);
    for (const s of [-1, 1]) {
      b.box(s * 0.0855, BY + 0.085, 0, 0.002, 0.06, 0.13, GREY_I);
      b.box(s * 0.087, BY + 0.098, s * 0.02, 0.002, 0.03, 0.06, [0.06, 0.2, 0.18, 0.4]);
      b.box(s * 0.0875, BY + 0.098, s * 0.02, 0.002, 0.012, 0.045, SCR);
      for (let i = 0; i < 4; i++) b.box(s * 0.088, BY + 0.066, s * (0.045 - i * 0.012) - (s > 0 ? 0.0 : 0), 0.004, 0.009, 0.009, i === 0 ? HAZ : [0.15, 0.15, 0.15]);
    }
    b.box(0.088, BY + 0.098, -0.04, 0.003, 0.022, 0.022, LED_G);
    // uprights
    const SY = BY + 0.12, AY = 1.55;
    for (const s of [-1, 1]) {
      b.box(0, (SY + AY) / 2, s * 0.068, 0.11, AY - SY, 0.032, SHELL);
      b.cyl([0, AY, s * 0.052], [0, AY, s * 0.084], 0.055, 0.055, 18, SHELL);
      for (let k = 0; k < 3; k++) b.box(0.035 - k * 0.035, (SY + AY) / 2 - 0.02, s * 0.0855, 0.014, 0.1, 0.004, GREY_I);
    }
    b.cyl([0, AY, 0.084], [0, AY, 0.1], 0.058, 0.052, 16, GREY_I);
    b.cyl([0, AY, 0.1], [0, AY, 0.112], 0.022, 0.02, 10, HAZ);
    b.cyl([0, AY, -0.084], [0, AY, -0.11], 0.02, 0.02, 10, [0.15, 0.15, 0.15]);
    b.box(0.0, SY + 0.004, 0, 0.115, 0.008, 0.17, HAZ);
    b.box(0.0, SY + 0.08, -0.087, 0.075, 0.1, 0.012, GUN);
    b.box(0.0, SY + 0.1, -0.094, 0.05, 0.03, 0.002, SCR_A);
    // roll-bar handle with GNSS puck and whip antenna
    b.tube([[0, AY + 0.045, -0.075], [0, AY + 0.125, -0.07], [0, AY + 0.14, -0.04], [0, AY + 0.14, 0.04], [0, AY + 0.125, 0.07], [0, AY + 0.045, 0.075]], 0.012, 8, FRAME_D);
    b.cyl([0, AY + 0.148, 0], [0, AY + 0.172, 0], 0.045, 0.04, 14, [0.82, 0.81, 0.76, 0.1]);
    b.cyl([0.0, AY + 0.172, 0], [0.0, AY + 0.176, 0], 0.03, 0.03, 10, sh(GREY_I, 1));
    b.cyl([0.05, AY + 0.06, -0.1], [0.05, AY + 0.09, -0.1], 0.012, 0.012, 6, FRAME_D);
    b.cyl([0.05, AY + 0.09, -0.1], [0.05, AY + 0.42, -0.1], 0.005, 0.003, 4, BLACK);
    b.sphere(0.05, AY + 0.425, -0.1, 0.008, 6, LED_R);
    // sensor head with lens cluster
    b.box(0, AY, 0, 0.13, 0.1, 0.098, GREY_I);
    for (let k = 0; k < 4; k++) b.box(0.03 - k * 0.022, AY + 0.056, 0, 0.01, 0.014, 0.09, FRAME_D);
    b.box(-0.07, AY, 0, 0.014, 0.1, 0.098, FRAME_D);
    b.cyl([-0.07, AY, 0], [-0.13, AY, 0], 0.04, 0.042, 16, GUN);
    b.cyl([-0.13, AY, 0], [-0.165, AY, 0], 0.046, 0.048, 16, FRAME_D, false);
    b.cyl([-0.13, AY, 0], [-0.145, AY, 0], 0.034, 0.034, 16, LENS);
    b.cyl([-0.13, AY, 0], [-0.136, AY, 0], 0.044, 0.044, 16, FRAME_D);
    for (const [ly, lz, lr, lc] of [[0.032, 0.03, 0.012, LENS], [0.032, -0.03, 0.012, LENS], [-0.034, 0.03, 0.009, LED_R], [-0.034, -0.03, 0.01, LENS]]) {
      b.cyl([-0.077, AY + ly, lz], [-0.092, AY + ly, lz], lr + 0.005, lr + 0.005, 10, FRAME_D);
      b.cyl([-0.092, AY + ly, lz], [-0.094, AY + ly, lz], lr, lr, 10, lc);
    }
    b.cyl([0.065, AY, 0], [0.1, AY, 0], 0.03, 0.03, 12, FRAME_D);
    b.box(0.101, AY, 0, 0.004, 0.04, 0.05, SCR);
    b.box(0.08, AY - 0.055, 0, 0.03, 0.012, 0.06, HAZ);
    // laser plummet beam to the ground mark
    b.cyl([0, HY - 0.17, 0], [0, 0.0, 0], 0.0025, 0.0025, 4, LED_R);
    b.cyl([0, 0.0, 0], [0, 0.006, 0], 0.03, 0.03, 10, HAZ);
    b.cyl([0, 0.006, 0], [0, 0.008, 0], 0.01, 0.01, 6, LED_R);
    // hard case, open
    b.push(mulAll(tr(0.62, 0, 0.48), rotY(0.5)));
    const cw = 0.42, ch = 0.18, cd = 0.32, t = 0.014, CC = [0.30, 0.32, 0.30, 0.15];
    b.box(0, 0.006, 0, cw, 0.012, cd, CC);
    for (const s of [-1, 1]) { b.box(s * (cw / 2 - t / 2), ch / 2, 0, t, ch, cd, CC); b.box(0, ch / 2, s * (cd / 2 - t / 2), cw, ch, t, CC); b.box(0, 0.06, s * (cd / 2 + 0.003), cw + 0.01, 0.014, 0.006, HAZ); b.box(s * (cw / 2 + 0.003), 0.06, 0, 0.006, 0.014, cd + 0.01, HAZ); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (cw / 2 - 0.01), ch / 2, sz * (cd / 2 - 0.01), 0.035, ch + 0.004, 0.035, FRAME_D);
    b.box(0, ch - 0.03, 0, cw - 2 * t, 0.04, cd - 2 * t, [0.14, 0.14, 0.14]);
    b.box(0.0, ch - 0.028, 0, 0.18, 0.04, 0.16, [0.05, 0.05, 0.05]);
    b.box(0.13, ch - 0.028, 0.05, 0.08, 0.04, 0.06, [0.05, 0.05, 0.05]);
    b.box(-0.13, ch - 0.01, -0.06, 0.08, 0.02, 0.1, TEAL);
    for (const s of [-1, 1]) b.box(s * 0.13, ch - 0.02, cd / 2 + 0.01, 0.045, 0.04, 0.016, FRAME_D);
    b.tube([[-0.06, 0.13, cd / 2], [-0.05, 0.13, cd / 2 + 0.035], [0.05, 0.13, cd / 2 + 0.035], [0.06, 0.13, cd / 2]], 0.01, 6, FRAME_D);
    glyphs(b, -0.18, 0.1, cd / 2 + 0.0015, 4, 0.03, 0.05, [0.85, 0.83, 0.76], 3301);
    b.push(mulAll(tr(0, ch, -cd / 2), rotX(-1.95)));
    b.box(0, 0.09, cd / 2, cw, 0.012, cd, CC);
    for (const s of [-1, 1]) { b.box(s * (cw / 2 - t / 2), 0.045, cd / 2, t, 0.09, cd, CC); b.box(0, 0.045, cd / 2 + s * (cd / 2 - t / 2), cw, 0.09, t, CC); }
    b.box(0, 0.06, cd / 2, cw - 2 * t, 0.04, cd - 2 * t, [0.18, 0.18, 0.18]);
    for (let k = 0; k < 3; k++) b.box(-0.12 + k * 0.12, 0.096, cd / 2, 0.06, 0.004, cd - 0.04, sh(CC, 0.8));
    b.box(0.12, 0.097, cd / 2 - 0.08, 0.1, 0.002, 0.06, HAZ);
    b.pop();
    for (const s of [-1, 1]) b.cyl([s * 0.15, ch, -cd / 2 - 0.006], [s * 0.1, ch, -cd / 2 - 0.006], 0.009, 0.009, 6, DSTEEL);
    b.pop();
    // ground sensor spike with data cable (replaces the tape reel)
    b.push(tr(0.48, 0, 1.12));
    b.cyl([0, -0.12, 0], [0, 0.02, 0], 0.004, 0.025, 8, STEEL);
    b.cyl([0, 0.02, 0], [0, 0.12, 0], 0.05, 0.05, 12, GUN);
    b.cyl([0, 0.04, 0], [0, 0.06, 0], 0.052, 0.052, 12, HAZ, false);
    b.cyl([0, 0.12, 0], [0, 0.14, 0], 0.04, 0.03, 12, FRAME_D);
    b.cyl([0, 0.14, 0], [0, 0.146, 0], 0.012, 0.012, 6, LED_G);
    b.cyl([0.03, 0.14, 0.0], [0.03, 0.34, 0.0], 0.003, 0.002, 4, BLACK);
    b.pop();
    b.tube([[0.48 - 0.05, 0.03, 1.12], [0.4, 0.008, 1.0], [0.5, 0.008, 0.85], [0.62, 0.008, 0.75], [0.68, 0.05, 0.66]], 0.007, 4, BLACK);
    // marker beacon pole (replaces the ranging rod): orange/black bands, beacon on top
    const rb = [-1.55, 0, -0.3], dir = norm([0.03, 1, 0.02]);
    b.cyl(add(rb, scale(dir, -0.3)), add(rb, scale(dir, 0.0)), 0.004, 0.018, 8, STEEL);
    for (let k = 0; k < 4; k++) b.cyl(add(rb, scale(dir, k * 0.46)), add(rb, scale(dir, k * 0.46 + 0.46)), 0.018, 0.018, 10, k % 2 ? GUN : HAZ);
    for (const k of [1, 2, 3]) b.cyl(add(rb, scale(dir, k * 0.46 - 0.015)), add(rb, scale(dir, k * 0.46 + 0.015)), 0.022, 0.022, 10, FRAME_D);
    b.push(mulAll(tr(rb[0] + dir[0] * 1.84, dir[1] * 1.84, rb[2] + dir[2] * 1.84)));
    b.cyl([0, 0, 0], [0, 0.04, 0], 0.035, 0.035, 10, FRAME_D);
    b.cyl([0, 0.04, 0], [0, 0.12, 0], 0.03, 0.03, 10, LAMP);
    b.cyl([0, 0.12, 0], [0, 0.155, 0], 0.036, 0.02, 10, FRAME_D);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3; b.beam([Math.cos(a) * 0.034, 0.04, Math.sin(a) * 0.034], [Math.cos(a) * 0.034, 0.12, Math.sin(a) * 0.034], 0.007, DSTEEL); }
    b.pop();
    b.box(rb[0] + dir[0] * 1.3, 1.3, rb[2] + dir[2] * 1.3 + 0.025, 0.05, 0.08, 0.02, FRAME_D);
    b.box(rb[0] + dir[0] * 1.3, 1.32, rb[2] + dir[2] * 1.3 + 0.036, 0.02, 0.02, 0.003, LED_G);
    rock(b, rb[0] + 0.03, 0.0, rb[2] - 0.05, 0.07, 0.04, 0.05, 41, [0.58, 0.48, 0.38], 8, 4, 0.3);
    return b;
  }
  // =========================================================================================================
  // 4. HEATER BEACON in the old stone ring (no fire): glowing coil heater, tripod beacon, battery pack, fuel-cell drum
  // =========================================================================================================
  function buildCampfire(detail) {
    const b = new MB(), r = rnd(404), N = 13;
    const stones = []; for (let i = 0; i < N; i++) { const a = i / N * TAU + (r() - 0.5) * 0.25, rad = 0.52 + (r() - 0.5) * 0.06, rx = 0.11 + 0.06 * r(), ry = 0.075 + 0.045 * r(), rz = 0.09 + 0.04 * r(); stones.push({ a, rad, rx, ry, rz, ay: -a + (r() - 0.5) * 0.6, c: sh(mix([0.52, 0.42, 0.34], [0.46, 0.43, 0.41], r()), 0.85 + 0.25 * r()) }); }
    const AP = [0, 1.28, 0], legF = k => { const a = k * TAU / 3 + 0.3; return [Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82]; };
    if (!detail) {
      for (const s of stones) b.sphere(Math.cos(s.a) * s.rad, s.ry * 0.5, Math.sin(s.a) * s.rad, s.rx, 4, s.c, s.ry);
      b.cyl([0, 0, 0], [0, 0.04, 0], 0.45, 0.4, 8, [0.24, 0.22, 0.21]);
      b.cyl([0, 0.04, 0], [0, 0.36, 0], 0.17, 0.17, 6, EMBER);
      b.cyl([0, 0.36, 0], [0, 0.44, 0], 0.22, 0.2, 6, FRAME);
      for (let k = 0; k < 3; k++) b.beam(legF(k), AP, 0.025, FRAME);
      b.box(0, 1.1, 0, 0.1, 0.16, 0.1, LED_R);
      b.push(mulAll(tr(1.05, 0, 0.55), rotY(-0.4))); b.box(0, 0.12, 0, 0.46, 0.24, 0.3, GUN); b.pop();
      b.cyl([-0.95, 0, 0.78], [-0.95, 0.42, 0.78], 0.2, 0.2, 6, TCASE); b.beam([-0.95, 0.42, 0.78], [-0.75, 0.95, 0.78], 0.04, HAZ);
      return b;
    }
    // ring stones, heat-scorched on the inner faces
    stones.forEach((s, i) => {
      const cx = Math.cos(s.a) * s.rad, cz = Math.sin(s.a) * s.rad, rad = [cx / s.rad, 0, cz / s.rad];
      rock(b, cx, s.ry * 0.45, cz, s.rx, s.ry, s.rz, 500 + i, (d, u, v) => {
        const inward = -(d[0] * rad[0] + d[2] * rad[2]), soot = ss(-0.1, 0.9, inward + d[1] * 0.25);
        const speck = 0.92 + 0.12 * Math.sin(u * 40 + v * 23 + i);
        return mix(sh(s.c, speck), [0.20, 0.16, 0.14], soot * 0.65);
      }, 11, 6, s.ay, 0.2);
    });
    // scorched ground lit orange by the coils
    b.surf(24, 6, (u, v) => { const t = u * TAU, rr = 0.47 * v; return [Math.cos(t) * rr, 0.03 * (1 - v * v) + 0.006 * Math.sin(t * 5 + v * 9) * v + 0.003, Math.sin(t) * rr]; },
      (u, v) => { const n = Math.sin(u * 61 + v * 13) * Math.sin(u * 23 - v * 17), base = n > 0.5 ? [0.12, 0.11, 0.1] : sh([0.28, 0.27, 0.26], 0.85 + 0.2 * Math.sin(u * 37 + v * 5)); return mix(base, [0.62, 0.26, 0.08], 0.75 * (1 - ss(0.45, 0.95, v))); }, true);
    // heater: hex foot, glowing core, coil bank, cage, finned cap with beacon
    const hex = []; for (let k = 0; k < 6; k++) { const a = k * PI / 3; hex.push([Math.cos(a) * 0.25, Math.sin(a) * 0.25]); }
    b.extrude(hex, 0.03, 0.09, FRAME_D, FRAME);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + PI / 6; b.box(Math.cos(a) * 0.24, 0.035, Math.sin(a) * 0.24, 0.1, 0.07, 0.1, RUBBER); }
    hazard(b, -0.12, 0.12, 0.06, 0.2175, 0.03, 6);
    b.cyl([0, 0.09, 0], [0, 0.37, 0], 0.075, 0.075, 12, [0.70, 0.22, 0.05]);
    b.cyl([0, 0.09, 0], [0, 0.12, 0], 0.11, 0.11, 12, GUN);
    const turns = 5, per = 14, cc = [EMBER2, EMBER, HOT, EMBER, EMBER2];
    for (let k = 0; k < turns; k++) { const pts = []; for (let i = 0; i <= per; i++) { const t = (k + i / per) / turns, a = t * turns * TAU; pts.push([Math.cos(a) * 0.135, 0.13 + 0.22 * t, Math.sin(a) * 0.135]); } b.tube(pts, 0.017, 6, cc[k]); }
    for (let k = 0; k < 4; k++) { const a = k * PI / 2 + PI / 4; b.beam([Math.cos(a) * 0.08, 0.13, Math.sin(a) * 0.08], [Math.cos(a) * 0.08, 0.36, Math.sin(a) * 0.08], 0.018, GUN); }
    for (let k = 0; k < 10; k++) { const a = k * TAU / 10; b.beam([Math.cos(a) * 0.2, 0.09, Math.sin(a) * 0.2], [Math.cos(a) * 0.2, 0.37, Math.sin(a) * 0.2], 0.014, DSTEEL); }
    for (const y of [0.1, 0.24]) ring(b, [0, y, 0], 'y', 0.2, 0.009, DSTEEL, 18, 4);
    b.push(tr(0, 0.36, 0));
    b.lathe([[0, 0], [0.22, 0], [0.225, 0.02], [0.2, 0.05], [0.07, 0.065], [0, 0.065]], 16, FRAME);
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; b.push(rotY(-a)); b.box(0.14, 0.055, 0, 0.12, 0.035, 0.01, GUN); b.pop(); }
    b.box(0.0, 0.02, 0.215, 0.12, 0.03, 0.02, HAZ); b.box(0.03, 0.02, 0.226, 0.02, 0.012, 0.004, LED_G);
    b.cyl([0, 0.06, 0], [0, 0.17, 0], 0.016, 0.016, 8, FRAME_D);
    b.pop();
    beacon(b, 0, 0.53, 0, 0.75, FRAME_D, [1.0, 0.36, 0.10], 1);
    // tripod frame with a hanging locator beacon (replaces the cooking tripod and kettle)
    for (let k = 0; k < 3; k++) { const F = legF(k), d = sub(AP, F); b.cyl(add(F, scale(d, -0.2)), add(AP, scale(d, 0.07)), 0.014, 0.014, 6, FRAME); b.cyl(lerp(F, AP, 0.4), lerp(F, AP, 0.44), 0.02, 0.02, 6, HAZ); b.box(F[0], 0.02, F[2], 0.08, 0.04, 0.08, FRAME_D); }
    b.cyl([0, 1.2, 0], [0, 1.3, 0], 0.035, 0.035, 10, FRAME_D);
    b.cyl([0, 1.2, 0], [0, 1.08, 0], 0.006, 0.006, 4, BLACK);
    b.push(mulAll(tr(0, 1.09, 0), rotX(PI)));
    beacon(b, 0, 0, 0, 0.85, FRAME_D, LED_R, 1);
    b.pop();
    b.tube([[0.03, 0.88, 0], [0.06, 0.75, 0.02], [0.05, 0.62, 0.02], [0.02, 0.6, 0.0]], 0.006, 4, BLACK);
    // battery pack (replaces the firewood stack)
    b.push(mulAll(tr(1.05, 0, 0.55), rotY(-0.4)));
    const BW = 0.46, BH = 0.22, BD = 0.3;
    b.box(0, 0.015, 0, BW + 0.02, 0.03, BD + 0.02, RUBBER);
    b.box(0, BH / 2 + 0.015, 0, BW, BH - 0.01, BD, GUN);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (BW / 2 - 0.015), BH / 2 + 0.01, sz * (BD / 2 - 0.015), 0.04, BH + 0.01, 0.04, FRAME_D);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const x = -0.15 + i * 0.1, z = -0.065 + j * 0.13; b.cyl([x, BH + 0.01, z], [x, BH + 0.04, z], 0.04, 0.04, 8, (i + j) % 3 ? TEAL : [0.30, 0.32, 0.30, 0.15]); b.cyl([x, BH + 0.04, z], [x, BH + 0.05, z], 0.015, 0.015, 6, FRAME_D); }
    hazard(b, -BW / 2 + 0.03, BW / 2 - 0.03, 0.05, BD / 2 + 0.0012, 0.04, 9);
    glyphs(b, -0.18, 0.14, BD / 2 + 0.0012, 4, 0.035, 0.06, [0.85, 0.83, 0.76], 4401);
    for (let k = 0; k < 4; k++) pz(b, 0.07 + k * 0.035, 0.14, BD / 2 + 0.0012, 0.022, 0.03, k < 3 ? LED_G : LED_R);
    for (let k = 0; k < 6; k++) b.box(-BW / 2 - 0.008, BH / 2 + 0.015, -0.11 + k * 0.044, 0.016, BH - 0.06, 0.012, FRAME_D);
    for (const s of [-1, 1]) b.tube([[s * 0.1, BH + 0.0, -BD / 2], [s * 0.1, BH + 0.06, -BD / 2 - 0.02], [s * 0.1, BH + 0.06, -BD / 2 + 0.04]], 0.009, 4, FRAME_D);
    b.box(BW / 2 + 0.01, 0.15, 0.06, 0.03, 0.05, 0.05, LED_R); b.box(BW / 2 + 0.01, 0.15, -0.06, 0.03, 0.05, 0.05, FRAME_D);
    b.pop();
    b.tube([[0.9, 0.15, 0.7], [0.75, 0.02, 0.62], [0.5, 0.012, 0.42], [0.25, 0.02, 0.2], [0.16, 0.06, 0.13]], 0.016, 5, BLACK);
    // fuel-cell drum and a heat lance (replace the chopping block and axe)
    b.push(tr(-0.95, 0, 0.78));
    const DC = [0.36, 0.38, 0.34, 0.15];
    b.lathe([[0, -0.3], [0.21, -0.3], [0.215, 0.0], [0.205, 0.04], [0.205, 0.38], [0.19, 0.41], [0.12, 0.425], [0, 0.425]], 16, DC);
    for (const y of [0.08, 0.3]) b.cyl([0, y, 0], [0, y + 0.03, 0], 0.212, 0.212, 16, sh(DC, 0.7), false);
    b.cyl([0, 0.19, 0], [0, 0.22, 0], 0.207, 0.207, 16, HAZ, false);
    b.cyl([0.06, 0.42, 0.05], [0.06, 0.46, 0.05], 0.04, 0.04, 10, FRAME_D); b.box(0.06, 0.465, 0.05, 0.1, 0.012, 0.02, HAZ);
    b.cyl([-0.08, 0.42, -0.04], [-0.08, 0.44, -0.04], 0.025, 0.025, 8, STEEL);
    b.push(rotY(-0.9)); glyphs(b, -0.08, 0.14, 0.209, 3, 0.03, 0.05, [0.85, 0.83, 0.76], 4402); b.pop();
    b.push(mulAll(tr(0.02, 0.425, 0.02), rotY(0.6), rotZ(0.12)));
    b.box(0, 0.05, 0, 0.09, 0.07, 0.06, FRAME_D);
    b.cyl([-0.02, 0.05, 0], [-0.12, 0.03, 0], 0.012, 0.005, 6, [0.95, 0.4, 0.1]);
    b.tube([[0.03, 0.06, 0], [0.12, 0.1, 0], [0.32, 0.16, 0.0], [0.52, 0.22, 0], [0.62, 0.27, 0], [0.66, 0.28, 0]], u => 0.016 + 0.004 * Math.sin(u * PI), 6, FRAME);
    b.cyl([0.46, 0.2, 0], [0.64, 0.275, 0], 0.024, 0.024, 8, HAZ);
    b.pop();
    b.pop();
    rock(b, -0.62, 0.02, 0.5, 0.05, 0.03, 0.04, 801, [0.5, 0.45, 0.4], 6, 4, 0);
    return b;
  }
  // =========================================================================================================
  // 5. COMMS MAST on the old cairn: segmented mast, antenna array, small dish, weather pennant streaming -X
  // =========================================================================================================
  function buildFlagpole(detail) {
    const b = new MB(), r = rnd(505), PH = 6.0, POLE = [0.50, 0.51, 0.50, 0.25];
    const guyA = [0.4, 0.4 + TAU / 3, 0.4 + 2 * TAU / 3], GY = 4.6, GR = 2.6, SY = 5.72;
    const segR = y => y < 1.6 ? 0.05 : y < 3.2 ? 0.044 : y < 4.8 ? 0.038 : 0.032;
    if (!detail) {
      b.cyl([0, 0, 0], [0, 0.7, 0], 0.5, 0.2, 6, [0.6, 0.53, 0.45]);
      b.cyl([0, 0, 0], [0, PH, 0], 0.045, 0.03, 4, POLE);
      for (const a of guyA) b.beam([0, GY, 0], [Math.cos(a) * GR, 0.1, Math.sin(a) * GR], 0.01, DSTEEL);
      b.plate([-0.08, SY + 0.16, 0], [-0.08, SY - 0.16, 0], [-1.4, SY - 0.26, 0.05], [-1.4, SY - 0.2, 0.05], HAZ);
      b.box(0, 5.95, 0, 0.04, 0.04, 0.5, DSTEEL); b.box(0.2, 4.3, 0, 0.1, 0.5, 0.5, [0.75, 0.75, 0.72]);
      b.box(0.15, 2.1, 0.12, 0.4, 0.3, 0.05, [0.12, 0.16, 0.3]); b.box(0.08, 1.45, 0, 0.12, 0.25, 0.18, GUN);
      return b;
    }
    // cairn of flat stones (the old marker the mast was planted in)
    const layers = [[8, 0.43, 0.06], [7, 0.36, 0.17], [6, 0.29, 0.28], [5, 0.22, 0.39], [4, 0.15, 0.5], [3, 0.08, 0.61]];
    let sd = 900;
    layers.forEach(([cnt, rad, y], li) => { const off = r() * TAU; for (let k = 0; k < cnt; k++) {
      const a = off + k / cnt * TAU, c = sh(mix([0.55, 0.44, 0.34], [0.48, 0.44, 0.40], r()), 0.85 + 0.25 * r());
      rock(b, Math.cos(a) * rad, y, Math.sin(a) * rad, 0.19 + 0.05 * r() - li * 0.012, 0.065 + 0.015 * r(), 0.13 + 0.03 * r() - li * 0.01, sd++, (d, u, v) => sh(c, 0.9 + 0.12 * Math.sin(u * 30 + v * 17) + (d[1] > 0.5 ? 0.08 : 0)), 7, 4, -a + (r() - 0.5) * 0.5, 0.1);
    } });
    b.lathe([[0.38, -0.05], [0.33, 0.15], [0.25, 0.35], [0.15, 0.55], [0.07, 0.68], [0, 0.7]], 10, [0.36, 0.3, 0.25]);
    // steel foot collar on the cairn
    b.cyl([0, 0.66, 0], [0, 0.72, 0], 0.16, 0.15, 12, FRAME_D);
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6; b.cyl([Math.cos(a) * 0.12, 0.72, Math.sin(a) * 0.12], [Math.cos(a) * 0.12, 0.74, Math.sin(a) * 0.12], 0.012, 0.012, 6, STEEL); }
    for (let k = 0; k < 4; k++) { const a = k * PI / 2 + 0.3; b.push(rotY(-a)); b.plate([0.05, 0.72, 0], [0.14, 0.72, 0], [0.05, 0.9, 0], [0.05, 0.9, 0], FRAME); b.pop(); }
    // segmented mast with joint collars
    for (const [y0, y1] of [[-0.6, 1.6], [1.6, 3.2], [3.2, 4.8], [4.8, PH]]) {
      const rr = segR(y0 + 0.01);
      b.cyl([0, y0, 0], [0, y1, 0], rr, rr, 10, POLE);
      if (y0 > 0) { b.cyl([0, y0 - 0.06, 0], [0, y0 + 0.08, 0], segR(y0 - 0.01) + 0.012, rr + 0.012, 10, FRAME_D); b.cyl([0, y0 + 0.08, 0], [0, y0 + 0.11, 0], rr + 0.006, rr + 0.006, 10, HAZ, false); }
    }
    for (const y of [0.78, 0.9, 1.02]) b.cyl([0, y, 0], [0, y + 0.06, 0], 0.052, 0.052, 10, y === 0.9 ? BLACK : HAZ, false);
    b.cyl([0, PH, 0], [0, PH + 0.015, 0], 0.036, 0.036, 10, FRAME_D);
    // guy collar, cables, turnbuckles, anchor plates
    b.cyl([0, GY - 0.03, 0], [0, GY + 0.03, 0], 0.05, 0.05, 12, FRAME_D);
    for (const a of guyA) {
      const ca = Math.cos(a), sa = Math.sin(a), A = [ca * 0.045, GY, sa * 0.045], P = [ca * GR, 0.1, sa * GR];
      b.beam([ca * 0.04, GY, sa * 0.04], [ca * 0.08, GY, sa * 0.08], 0.014, FRAME_D, 0.005);
      const T0 = lerp(A, P, 0.9), T1 = lerp(A, P, 0.95);
      rope(b, [ca * 0.08, GY, sa * 0.08], T0, 0.03, 0.004, [0.55, 0.56, 0.57, 0.3], 8, 3);
      b.cyl(T0, T1, 0.01, 0.01, 6, HAZ);
      b.tube([T1, lerp(T1, P, 0.5), [P[0], P[1] + 0.02, P[2]]], 0.004, 3, [0.55, 0.56, 0.57, 0.3]);
      b.cyl([P[0] - ca * 0.05, -0.4, P[2] - sa * 0.05], [P[0], 0.12, P[2]], 0.014, 0.014, 6, DSTEEL);
      b.push(mulAll(tr(P[0], 0.1, P[2]), rotY(-a))); b.box(0, 0, 0, 0.1, 0.025, 0.1, HAZ); b.box(0, 0.025, 0, 0.03, 0.03, 0.012, FRAME_D); b.pop();
      rock(b, P[0] + 0.12, 0.03, P[2] + 0.05, 0.1, 0.06, 0.08, sd++, [0.52, 0.44, 0.36], 8, 4, a, 0.12);
    }
    // weather pennant on a swivel yard
    b.cyl([0, SY - 0.1, 0], [0, SY + 0.1, 0], 0.04, 0.04, 10, FRAME_D);
    b.beam([0.0, SY, 0], [-0.09, SY, 0], 0.018, FRAME_D);
    b.cyl([-0.09, SY - 0.17, 0], [-0.09, SY + 0.18, 0], 0.01, 0.01, 6, DSTEEL);
    const pen = (t, w) => {
      const x = -0.1 - 1.3 * t + 0.03 * t * t, yc = SY + 0.005 - 0.22 * Math.pow(t, 1.6), h = 0.16 * (1 - t) + 0.012;
      return [x, yc + h * (1 - 2 * w) + 0.01 * Math.sin(t * 9) * t, 0.09 * Math.sin(t * 6.5 + w * 0.6) * t];
    };
    b.surf(20, 2, pen, (u, w) => (Math.floor(u * 7) % 2 ? [0.92, 0.90, 0.85] : sh(HAZ, 1 - 0.05 * u)));
    b.tube([pen(0, 0), pen(0.5, 0), pen(1, 0.5)].map(p => [p[0], p[1] + 0.003, p[2]]), 0.004, 3, sh(HAZ, 0.6));
    // antenna array on top: cross-arm with whips, centre whip, GNSS puck, obstruction light
    b.cyl([0, PH + 0.015, 0], [0, PH + 0.08, 0], 0.012, 0.012, 6, STEEL);
    b.beam([0, 5.95, -0.27], [0, 5.95, 0.27], 0.03, FRAME_D);
    b.beam([-0.2, 5.88, 0], [0.2, 5.88, 0], 0.025, FRAME_D);
    for (const z of [-0.26, 0.26]) { b.cyl([0, 5.95, z], [0, 5.98, z], 0.02, 0.02, 6, BLACK); b.cyl([0, 5.98, z], [0, 6.18, z], 0.006, 0.003, 4, BLACK); }
    for (const x of [-0.19, 0.19]) { b.cyl([x, 5.7, 0], [x, 5.88, 0], 0.008, 0.008, 4, BLACK); b.cyl([x, 5.66, 0], [x, 5.7, 0], 0.018, 0.018, 6, [0.85, 0.85, 0.8, 0.1]); }
    b.cyl([0, PH + 0.08, 0], [0, PH + 0.11, 0], 0.045, 0.04, 12, [0.85, 0.85, 0.82, 0.15]);
    b.cyl([0, PH + 0.11, 0], [0, PH + 0.2, 0], 0.005, 0.002, 4, DSTEEL);
    b.box(0.045, 5.8, 0, 0.04, 0.06, 0.04, LED_R); b.box(0.025, 5.8, 0, 0.012, 0.08, 0.05, FRAME_D);
    // small dish on a bracket facing +X
    b.push(tr(0, 4.3, 0));
    b.cyl([0, -0.04, 0], [0, 0.04, 0], segR(4.3) + 0.012, segR(4.3) + 0.012, 10, FRAME_D);
    b.beam([0, 0, 0], [0.16, 0, 0], 0.035, FRAME_D);
    b.push(mulAll(tr(0.2, 0.02, 0), rotZ(-PI / 2 + 0.25)));
    b.lathe([[0.0, 0.0], [0.08, 0.004], [0.16, 0.016], [0.23, 0.034], [0.27, 0.048], [0.275, 0.052]], 14, [0.80, 0.80, 0.76, 0.1]);
    b.lathe([[0.27, 0.044], [0.22, 0.026], [0.14, 0.008], [0.06, -0.002], [0.0, -0.004]], 14, sh([0.80, 0.80, 0.76], 0.8));
    b.cyl([0, -0.04, 0], [0, 0.0, 0], 0.05, 0.04, 8, GUN);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3; b.beam([Math.cos(a) * 0.24, 0.044, Math.sin(a) * 0.24], [0, 0.2, 0], 0.008, DSTEEL); }
    b.cyl([0, 0.18, 0], [0, 0.23, 0], 0.025, 0.018, 8, GUN);
    b.pop();
    b.pop();
    // solar panel
    b.push(mulAll(tr(0, 2.15, 0), rotY(0.25)));
    b.beam([0, 0, 0], [0, 0, 0.16], 0.035, FRAME_D);
    ring(b, [0, 0, 0], 'y', 0.06, 0.012, FRAME_D, 12, 4);
    b.push(mulAll(tr(0, 0.0, 0.2), rotX(0.65)));
    b.box(0, 0, 0, 0.56, 0.025, 0.42, FRAME);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) py(b, -0.225 + i * 0.09, 0.0135, -0.15 + j * 0.1, 0.084, 0.094, sh([0.10, 0.14, 0.30, 0.4], 0.9 + 0.2 * ((i + j) % 2)));
    b.box(0, -0.02, 0, 0.12, 0.015, 0.08, [0.15, 0.15, 0.15]);
    b.box(0, 0.0, 0.215, 0.56, 0.02, 0.01, HAZ);
    b.pop();
    b.cyl([0, -0.02, 0.15], [0, -0.06, 0.3], 0.012, 0.012, 5, FRAME_D);
    b.pop();
    // comms / power box with heat fins
    b.push(mulAll(tr(0, 1.45, 0), rotY(-0.3)));
    b.box(0.0, 0, 0.13, 0.22, 0.28, 0.14, GUN);
    b.box(0.0, 0, 0.201, 0.2, 0.26, 0.004, sh(GUN, 1.1));
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) b.box(s * 0.118, -0.09 + k * 0.06, 0.13, 0.016, 0.02, 0.13, FRAME_D);
    b.box(0.07, -0.14, 0.13, 0.03, 0.02, 0.03, [0.2, 0.2, 0.2]);
    b.box(-0.05, 0.08, 0.204, 0.08, 0.04, 0.003, SCR);
    for (let k = 0; k < 3; k++) b.box(0.03 + k * 0.025, 0.08, 0.204, 0.014, 0.014, 0.004, k < 2 ? LED_G : LED_R);
    hazard(b, -0.09, 0.09, -0.1, 0.2035, 0.03, 6);
    glyphs(b, -0.08, -0.02, 0.2035, 3, 0.03, 0.05, [0.85, 0.83, 0.76], 5501);
    for (const y of [-0.08, 0.08]) { b.box(0, y, 0.205, 0.235, 0.022, 0.006, FRAME_D); for (const s of [-1, 1]) b.box(s * 0.12, y, 0.12, 0.006, 0.022, 0.17, FRAME_D); ring(b, [0, y, 0], 'y', 0.056, 0.008, FRAME_D, 10, 3); }
    b.pop();
    const ca = Math.cos(-0.3), sa = Math.sin(-0.3), bx = [0.07 * ca + 0.13 * sa, 1.31, -0.07 * sa + 0.13 * ca];
    rope(b, [bx[0], 1.3, bx[2]], [0.04, 0.95, 0.03], -0.05, 0.006, BLACK, 6, 3);
    b.tube([[0.05, 2.1, 0.12], [0.07, 1.9, 0.1], [0.06, 1.65, 0.08], [0.03, 1.59, 0.1]], 0.006, 3, BLACK);
    b.tube([[0.04, 1.6, -0.03], [0.044, 3.0, -0.03], [0.036, 4.3, -0.03], [0.036, 4.5, -0.03], [0.032, 5.8, -0.03], [0.02, 5.95, 0]], 0.005, 3, BLACK);
    for (let y = 2.5; y < 5.9; y += 0.7) ring(b, [0, y, 0], 'y', segR(y) + 0.006, 0.006, BLACK, 8, 3);
    return b;
  }
  // =========================================================================================================
  // 6. CARGO STACK: sealed cargo cases, gas cylinders, water tank, cable coil, tools, power unit
  // =========================================================================================================
  function crate(b, x, y, z, ay, w, h, d, base, seed, stencil, detail) {      // sealed hard-shell cargo case
    b.push(mulAll(tr(x, y, z), rotY(ay)));
    const r = rnd(seed);
    if (!detail) { b.box(0, h / 2, 0, w, h, d, base); b.pop(); return; }
    const E = sh(base, 0.55), g = 0.03;
    b.box(0, h / 2, 0, w - 0.02, h - 0.012, d - 0.02, mix(base, DUST, 0.08 * r()));
    py(b, 0, h - 0.0055, 0, w - 0.1, d - 0.1, sh(base, 1.06));
    // edge rails and corner caps
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (w / 2 - g / 2), h / 2, sz * (d / 2 - g / 2), g, h, g, E);
    for (const yy of [g / 2, h - g / 2]) for (const s of [-1, 1]) { b.box(0, yy, s * (d / 2 - g / 2), w - 2 * g, g, g, E); b.box(s * (w / 2 - g / 2), yy, 0, g, g, d - 2 * g, E); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const yy of [0.035, h - 0.035]) b.box(sx * (w / 2 - 0.03), yy, sz * (d / 2 - 0.03), 0.075, 0.075, 0.075, FRAME_D);
    // stiffening ribs and lid seal line
    const ribY = h > 0.45 ? [h * 0.3] : [];
    for (const yy of ribY) for (const s of [-1, 1]) { b.box(0, yy, s * (d / 2 - 0.004), w - 0.16, 0.035, 0.016, sh(base, 0.8)); b.box(s * (w / 2 - 0.004), yy, 0, 0.016, 0.035, d - 0.16, sh(base, 0.8)); }
    const lid = h - Math.min(0.1, h * 0.25);
    for (const s of [-1, 1]) { b.box(0, lid, s * (d / 2 - 0.003), w - 0.08, 0.012, 0.01, BLACK); b.box(s * (w / 2 - 0.003), lid, 0, 0.01, 0.012, d - 0.08, BLACK); }
    // latches front and back
    for (const s of [-1, 1]) for (const lx of [-w * 0.3, w * 0.3]) { b.box(lx, lid, s * (d / 2 + 0.004), 0.06, 0.07, 0.014, FRAME_D); b.box(lx, lid - 0.012, s * (d / 2 + 0.012), 0.034, 0.03, 0.004, STEEL); }
    // stencilled codes on the front (+Z)
    if (stencil) {
      const sz = d / 2 + 0.0015, sc0 = stencil.col || [0.12, 0.12, 0.1], y0 = Math.min(h * 0.55, lid - 0.08);
      const big = h > 0.35;
      glyphs(b, -w * 0.32, y0, sz, big ? 4 : 3, big ? 0.045 : 0.03, big ? 0.07 : 0.05, sc0, seed * 7);
      if (h > 0.45) glyphs(b, -w * 0.32, y0 - 0.1, sz, 6, 0.022, 0.035, sc0, seed * 7 + 1);
      if (stencil.band) { pz(b, w * 0.24, y0 - 0.03, sz, 0.12, 0.12, stencil.band); pz(b, w * 0.24, y0 - 0.03, sz + 0.0005, 0.06, 0.06, [0.92, 0.9, 0.84]); }
      hazard(b, -w / 2 + 0.06, -w / 2 + 0.06 + Math.min(0.36, w * 0.4), 0.065, sz, 0.035, 6);
    }
    // carry handles and a pressure-relief valve
    for (const s of [-1, 1]) b.tube([[s * (w / 2 + 0.004), h * 0.66, -0.08], [s * (w / 2 + 0.04), h * 0.62, -0.05], [s * (w / 2 + 0.04), h * 0.62, 0.05], [s * (w / 2 + 0.004), h * 0.66, 0.08]], 0.01, 5, FRAME_D);
    b.cyl([w * 0.3, h, -d * 0.25], [w * 0.3, h + 0.012, -d * 0.25], 0.022, 0.022, 8, FRAME_D);
    b.pop();
  }
  function gasPair(b, x, z, ay, col, detail) {                                // two gas cylinders strapped to a skid
    b.push(mulAll(tr(x, 0, z), rotY(ay)));
    if (!detail) { b.box(0, 0.26, 0, 0.165, 0.52, 0.34, col); b.pop(); return; }
    b.box(0, 0.012, 0, 0.17, 0.024, 0.34, FRAME_D);
    for (const s of [-1, 1]) {
      b.push(tr(0, 0.024, s * 0.085));
      b.lathe([[0, 0], [0.072, 0], [0.078, 0.015], [0.078, 0.4], [0.07, 0.44], [0.045, 0.465], [0.022, 0.47], [0, 0.47]], 12, col);
      b.cyl([0, 0.33, 0], [0, 0.36, 0], 0.0795, 0.0795, 12, [0.9, 0.9, 0.86, 0.1], false);
      b.cyl([0, 0.1, 0], [0, 0.12, 0], 0.0795, 0.0795, 12, HAZ, false);
      b.cyl([0, 0.47, 0], [0, 0.5, 0], 0.014, 0.014, 6, STEEL);
      b.box(0, 0.495, 0, 0.012, 0.012, 0.05, FRAME_D);
      ring(b, [0, 0.505, 0], 'y', 0.03, 0.006, FRAME_D, 8, 3);
      b.pop();
    }
    for (const yy of [0.14, 0.34]) { b.box(0, yy, 0, 0.165, 0.025, 0.34, FRAME_D); }
    b.push(rotY(PI / 2)); glyphs(b, -0.05, 0.24, 0.0845, 3, 0.02, 0.035, [0.9, 0.9, 0.86], 6611); b.pop();
    b.pop();
  }
  function buildSupply(detail) {
    const b = new MB(), r = rnd(606);
    const SAND_W = [0.60, 0.53, 0.40], OLIVE_W = [0.38, 0.40, 0.29], GREYW = [0.55, 0.55, 0.52], RATION = [0.70, 0.42, 0.16];
    crate(b, -0.6, 0, -0.5, 0.04, 1.0, 0.72, 0.75, SAND_W, 11, { band: [0.75, 0.2, 0.12] }, detail);
    crate(b, -0.58, 0.725, -0.52, 0.11, 0.7, 0.48, 0.55, OLIVE_W, 12, { col: [0.88, 0.86, 0.78] }, detail);
    crate(b, 0.45, 0, -0.55, -0.06, 0.85, 0.6, 0.65, GREYW, 13, { band: [0.2, 0.35, 0.6] }, detail);
    crate(b, 0.0, 0, 0.35, 0.12, 1.2, 0.32, 0.4, [0.30, 0.33, 0.30], 14, { col: [0.88, 0.86, 0.78] }, detail);
    crate(b, 1.15, 0, -0.7, 0.35, 0.45, 0.4, 0.4, RATION, 15, { col: [0.12, 0.12, 0.1] }, detail);
    // thermal blanket folded on case C, rock sample on top
    b.push(mulAll(tr(0.45, 0.6, -0.55), rotY(0.1)));
    const TC = [0.72, 0.70, 0.64, 0.35];
    if (detail) {
      for (let k = 0; k < 4; k++) b.box((r() - 0.5) * 0.03, 0.017 + k * 0.03, (r() - 0.5) * 0.03, 0.72 - k * 0.01, 0.03, 0.5, k % 2 ? [0.80, 0.50, 0.18, 0.3] : sh(TC, 0.9 + 0.05 * k));
      for (const s of [-1, 1]) b.surf(10, 4, (u, v) => [(u - 0.5) * 0.7, 0.015 + 0.105 * v, s * (0.25 + 0.015 * Math.sin(PI * v) + 0.006 * Math.sin(u * 30))], sh(TC, 0.85));
      b.surf(8, 6, (u, v) => [(u - 0.5) * 0.7, 0.125 + 0.01 * Math.sin(u * 9) * Math.sin(v * 7) - 0.015 * Math.exp(-((u - 0.45) ** 2 + (v - 0.5) ** 2) * 30), (v - 0.5) * 0.5], TC);
      for (const s of [-0.22, 0.22]) b.box(s, 0.07, 0, 0.04, 0.142, 0.52, FRAME_D);
      rock(b, -0.05, 0.2, 0.0, 0.14, 0.08, 0.11, 1601, (d, u, v) => sh([0.56, 0.44, 0.34], 0.88 + 0.12 * Math.sin(u * 27 + v * 13) + 0.1 * d[1]), 12, 7, 0.6, 0.12);
    } else { b.box(0, 0.06, 0, 0.72, 0.12, 0.5, TC); b.box(-0.05, 0.19, 0, 0.26, 0.15, 0.2, [0.64, 0.5, 0.38]); }
    b.pop();
    // gas cylinder pairs (replace jerrycans)
    gasPair(b, 0.95, -0.02, 0.22, TEAL, detail); gasPair(b, 1.3, -0.1, -0.25, [0.54, 0.50, 0.24, 0.15], detail);
    // sealed water tank with valve
    b.push(tr(-1.42, 0, -0.45));
    const WT = [0.66, 0.66, 0.62, 0.1], BL = [0.20, 0.36, 0.55, 0.1];
    if (detail) {
      b.lathe([[0, 0.0], [0.26, 0.0], [0.28, 0.02], [0.285, 0.12], [0.295, 0.14], [0.285, 0.16], [0.29, 0.43], [0.3, 0.45], [0.29, 0.47], [0.29, 0.73], [0.295, 0.75], [0.285, 0.77], [0.282, 0.86], [0.27, 0.885], [0.255, 0.89], [0, 0.89]], 20, WT);
      b.lathe([[0.282, 0.0], [0.282, 0.06], [0.284, 0.12]], 20, mix(WT, DUST, 0.6));
      b.lathe([[0.292, 0.6], [0.292, 0.66]], 20, BL);
      b.lathe([[0.292, 0.3], [0.292, 0.33]], 20, HAZ);
      for (const [bx, bz] of [[0.14, 0.08], [-0.15, -0.06]]) { b.cyl([bx, 0.88, bz], [bx, 0.91, bz], 0.04, 0.04, 10, FRAME_D); b.box(bx, 0.915, bz, 0.055, 0.01, 0.012, STEEL); }
      b.cyl([0.0, 0.1, 0.28], [0.0, 0.1, 0.34], 0.03, 0.028, 8, FRAME_D);
      b.box(0.0, 0.1, 0.35, 0.07, 0.07, 0.03, GUN); b.box(0.0, 0.15, 0.35, 0.012, 0.05, 0.012, HAZ);
      b.plate([-0.12, 0.42, 0.292], [0.12, 0.42, 0.292], [0.12, 0.56, 0.29], [-0.12, 0.56, 0.29], [0.18, 0.2, 0.2]);
      glyphs(b, -0.1, 0.49, 0.294, 4, 0.03, 0.05, [0.9, 0.9, 0.86], 6612);
      for (let k = 0; k < 3; k++) b.box(0.0, 0.2 + k * 0.25, -0.29, 0.03, 0.18, 0.02, FRAME_D);
      rock(b, 0.05, 0.0, 0.42, 0.11, 0.06, 0.09, 1602, [0.6, 0.55, 0.5], 8, 4, 1, 0.2);
    } else { b.cyl([0, 0, 0], [0, 0.89, 0], 0.29, 0.29, 8, WT); }
    b.pop();
    // coil of power cable on case D
    b.push(mulAll(tr(-0.05, 0.335, 0.33), rotY(0.4)));
    const RC = [0.82, 0.42, 0.12];
    if (detail) {
      const turns = 8, per = 18;
      for (let k = 0; k < turns; k++) { const pts = [], rr0 = 0.165 + 0.025 * Math.sin(k * 2.3), y0 = 0.015 + 0.022 * ((k * 0.618) % 1) + (k > 4 ? 0.02 : 0), ph = k * 0.7;
        for (let i = 0; i <= per; i++) { const a = i / per * TAU, rr = rr0 + 0.008 * Math.sin(a * 3 + ph); pts.push([Math.cos(a) * rr * 1.06, y0 + 0.006 * Math.sin(a * 2 + ph), Math.sin(a) * rr]); }
        b.tube(pts, 0.013, 5, k % 3 === 2 ? [0.16, 0.16, 0.17] : sh(RC, 0.92 + 0.1 * Math.sin(k * 1.7))); }
      b.tube([[0.16, 0.03, 0.0], [0.24, 0.02, 0.05], [0.3, 0.0, 0.12], [0.32, -0.12, 0.17], [0.31, -0.22, 0.19]], 0.012, 5, sh(RC, 0.9));
      b.box(0.31, -0.26, 0.19, 0.05, 0.08, 0.05, FRAME_D); b.box(0.31, -0.3, 0.19, 0.035, 0.02, 0.035, HAZ);
      for (const a of [0.3, 0.3 + PI]) { const c = Math.cos(a), s = Math.sin(a); b.box(c * 0.17, 0.035, s * 0.16, 0.05, 0.07, 0.035, FRAME_D); }
    } else b.cyl([0, 0, 0], [0, 0.06, 0], 0.17, 0.17, 8, RC);
    b.pop();
    // shovel and core-sampling drill leaning against case A
    if (detail) {
      const FZ = -0.5 + 0.375 + 0.02;
      const sB = [-0.92, -0.02, 0.4], sT = [-0.98, 0.95, FZ - 0.08];
      const dd = norm(sub(sT, sB));
      b.cyl(add(sB, scale(dd, 0.27)), sT, 0.018, 0.018, 8, FRAME_D);
      b.cyl(add(sB, scale(dd, 0.75)), add(sB, scale(dd, 0.9)), 0.022, 0.022, 8, HAZ);
      b.tube([add(sT, scale(dd, -0.02)), add(add(sT, scale(dd, 0.05)), [-0.06, 0, 0]), add(add(sT, scale(dd, 0.16)), [-0.06, 0, 0]), add(add(sT, scale(dd, 0.16)), [0.06, 0, 0]), add(add(sT, scale(dd, 0.05)), [0.06, 0, 0]), add(sT, scale(dd, -0.02))], 0.012, 5, HAZ);
      b.push(mulAll(along(sB, sT), tr(0, -Math.hypot(...sub(sT, sB)) / 2, 0)));
      b.cyl([0, 0.2, 0], [0, 0.33, 0], 0.026, 0.02, 8, GUN);
      b.surf(10, 8, (u, v) => { const x = (u - 0.5) * 0.24 * (1 - 0.3 * (1 - v) ** 2), y = 0.29 * v; return [x, y, 0.035 * (2 * u - 1) ** 2 - 0.01]; }, (u, v) => v < 0.3 ? mix([0.45, 0.45, 0.43, 0.2], DUST, 0.6) : [0.36, 0.37, 0.38, 0.2]);
      b.pop();
      const pB = [-0.7, -0.02, 0.36], pT = [-0.72, 0.86, FZ - 0.02];
      const pd = norm(sub(pT, pB)), side = [1, 0, 0], hc = add(pT, scale(pd, -0.06));
      b.cyl(add(pB, scale(pd, 0.08)), hc, 0.014, 0.014, 8, STEEL);
      b.cyl(pB, add(pB, scale(pd, 0.1)), 0.03, 0.03, 10, GUN);
      b.cyl(add(pB, scale(pd, 0.1)), add(pB, scale(pd, 0.12)), 0.034, 0.034, 10, HAZ);
      b.push(mulAll(along(add(hc, scale(pd, -0.08)), add(hc, scale(pd, 0.1)))));
      b.box(0, 0, 0, 0.11, 0.18, 0.09, HAZ); b.box(0, 0.0, 0.048, 0.08, 0.12, 0.008, FRAME_D);
      for (let k = 0; k < 3; k++) b.box(0, -0.06 + k * 0.05, -0.048, 0.08, 0.012, 0.008, FRAME_D);
      b.pop();
      b.cyl(add(hc, scale(side, -0.2)), add(hc, scale(side, 0.2)), 0.014, 0.014, 6, FRAME_D);
      for (const s of [-1, 1]) b.cyl(add(hc, scale(side, s * 0.13)), add(hc, scale(side, s * 0.2)), 0.02, 0.02, 6, RUBBER);
    } else { b.beam([-0.92, 0, 0.4], [-0.98, 0.95, -0.2], 0.04, FRAME_D); b.beam([-0.7, 0, 0.36], [-0.72, 0.86, -0.15], 0.04, HAZ); }
    // work beacon on case E
    beacon(b, 1.13, 0.415, -0.7, 1, FRAME_D, LAMP, detail);
    // suit boots
    const boot = (x, z, ay, tip) => {
      b.push(mulAll(tr(x, 0, z), rotY(ay), rotZ(tip)));
      const L = [0.52, 0.51, 0.47];
      if (detail) {
        b.extrude([[-0.05, -0.13], [0.0, -0.14], [0.05, -0.12], [0.055, 0.05], [0.045, 0.14], [0.0, 0.155], [-0.045, 0.14], [-0.052, 0.05]], 0, 0.035, [0.14, 0.14, 0.14]);
        b.box(0, 0.075, 0.07, 0.105, 0.08, 0.13, sh(L, 0.75));
        b.box(0, 0.07, -0.02, 0.1, 0.08, 0.13, L);
        b.cyl([0, 0.03, -0.07], [0, 0.24, -0.075], 0.056, 0.06, 10, L);
        b.cyl([0, 0.235, -0.075], [0, 0.255, -0.075], 0.064, 0.064, 10, FRAME_D);
        for (let k = 0; k < 3; k++) b.beam([-0.058, 0.09 + k * 0.05, 0.03 - k * 0.04], [0.058, 0.09 + k * 0.05, 0.03 - k * 0.04], 0.018, k === 1 ? HAZ : FRAME_D, 0.012);
        b.box(0, 0.04, 0.0, 0.106, 0.015, 0.29, FRAME_D);
      } else b.box(0, 0.1, 0, 0.1, 0.2, 0.29, L);
      b.pop();
    };
    boot(-1.25, 0.15, 0.3, 0); boot(-1.05, 0.25, -0.5, PI / 2 - 0.15);
    // portable power unit (fuel-cell stack in a roll frame)
    b.push(mulAll(tr(0.95, 0, 0.62), rotY(-0.35)));
    const GR = [0.80, 0.42, 0.12, 0.15], FR = [0.12, 0.12, 0.12, 0.15];
    if (detail) {
      for (const s of [-1, 1]) b.tube([[-0.27, 0.02, s * 0.2], [0.27, 0.02, s * 0.2], [0.29, 0.06, s * 0.2], [0.29, 0.4, s * 0.2], [0.26, 0.44, s * 0.2], [-0.26, 0.44, s * 0.2], [-0.29, 0.4, s * 0.2], [-0.29, 0.06, s * 0.2], [-0.27, 0.02, s * 0.2]], 0.015, 6, FR);
      for (const [x, y] of [[-0.29, 0.02], [0.29, 0.02], [-0.27, 0.44], [0.27, 0.44]]) b.cyl([x, y, -0.2], [x, y, 0.2], 0.014, 0.014, 6, FR);
      b.box(-0.04, 0.17, 0, 0.3, 0.22, 0.26, GUN);
      for (let k = 0; k < 7; k++) b.box(-0.04, 0.085 + k * 0.028, 0.133, 0.27, 0.01, 0.008, FRAME_D);
      b.cyl([-0.19, 0.18, 0], [-0.21, 0.18, 0], 0.09, 0.09, 14, FRAME_D);
      for (let k = 0; k < 4; k++) { const a = k * PI / 4; b.beam([-0.212, 0.18 + Math.cos(a) * 0.085, Math.sin(a) * 0.085], [-0.212, 0.18 - Math.cos(a) * 0.085, -Math.sin(a) * 0.085], 0.008, STEEL); }
      b.cyl([-0.212, 0.18, 0], [-0.222, 0.18, 0], 0.025, 0.025, 8, HAZ);
      b.box(0.17, 0.12, 0.01, 0.1, 0.1, 0.18, FRAME_D);
      for (let k = 0; k < 5; k++) b.box(0.17, 0.08 + k * 0.022, 0.01, 0.12, 0.008, 0.2, GUN);
      b.box(0.15, 0.28, 0.16, 0.18, 0.14, 0.03, [0.25, 0.25, 0.25]);
      for (const ox of [0.1, 0.18]) { b.box(ox, 0.27, 0.176, 0.04, 0.05, 0.004, [0.85, 0.85, 0.82]); b.box(ox, 0.27, 0.179, 0.006, 0.015, 0.003, BLACK); }
      b.box(0.22, 0.32, 0.177, 0.02, 0.02, 0.006, LED_G); b.box(0.19, 0.32, 0.177, 0.02, 0.02, 0.006, LED_R);
      b.push(tr(0.0, 0.4, 0));
      b.box(0, 0, 0, 0.42, 0.12, 0.3, GR);
      b.box(0, 0.06, 0, 0.38, 0.01, 0.26, sh(GR, 1.06));
      for (const s of [-1, 1]) { b.box(0, 0, s * 0.15, 0.4, 0.1, 0.012, sh(GR, 0.85)); b.box(s * 0.21, 0, 0, 0.012, 0.1, 0.28, sh(GR, 0.85)); }
      b.cyl([0.1, 0.06, 0.05], [0.1, 0.085, 0.05], 0.035, 0.035, 12, FR);
      b.box(-0.08, 0.066, -0.05, 0.12, 0.002, 0.06, [0.9, 0.85, 0.6]);
      hazard(b, -0.18, 0.18, 0.02, 0.157, 0.04, 8);
      b.pop();
    } else { b.box(0, 0.23, 0, 0.58, 0.44, 0.4, FR); b.box(0, 0.4, 0, 0.42, 0.12, 0.3, GR); }
    b.pop();
    return b;
  }
  return {
    name: 'camp',
    items: [
      { name: 'tent', budget: 14000, build: buildTent, colliders: [{ type: 'box', x: 0, z: 0, hx: 1.3, hz: 1.6, rot: 0, top: 1.7, solid: true }] },
      { name: 'survey_table', budget: 15000, build: buildTable, colliders: [{ type: 'box', x: 0, z: 0, hx: 0.9, hz: 0.4, rot: 0.06, top: 0.75, solid: true }] },
      { name: 'theodolite', budget: 9000, build: buildTheodolite, colliders: [{ type: 'cyl', x: 0, z: 0, r: 0.12, top: 1.6, solid: true }] },
      { name: 'campfire', budget: 7000, build: buildCampfire, colliders: [] },
      { name: 'flagpole', budget: 6000, build: buildFlagpole, colliders: [{ type: 'cyl', x: 0, z: 0, r: 0.5, top: 0.7, solid: true }] },
      { name: 'supply_stack', budget: 13000, build: buildSupply, colliders: [
        { type: 'box', x: -0.6, z: -0.5, hx: 0.5, hz: 0.38, rot: 0.04, top: 1.2, solid: true },
        { type: 'box', x: 0.45, z: -0.55, hx: 0.43, hz: 0.33, rot: -0.06, top: 0.72, solid: true }] }
    ]
  };
}) };
