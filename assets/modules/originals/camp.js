window.MODDEF = { fn: (function (K) {
  // Surveyors' summit camp: tent, survey table, theodolite, campfire, flagpole, supply stack.
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd, cross, dot, norm, sub, add, scale, lerp, along } = K;
  const PI = Math.PI, TAU = PI * 2;
  const cl01 = x => Math.max(0, Math.min(1, x));
  const ss = (e0, e1, x) => { const t = cl01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const sh = (c, k) => [cl01(c[0] * k), cl01(c[1] * k), cl01(c[2] * k), c[3] || 0];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] || 0];

  // ---- palette -------------------------------------------------------------------------------------------
  const CANVAS = [0.72, 0.66, 0.52], CANVAS_DK = [0.64, 0.58, 0.45], DUST = [0.56, 0.45, 0.33], SOD = [0.44, 0.38, 0.29];
  const SEAM = [0.69, 0.64, 0.50], INSIDE = [0.13, 0.11, 0.09];
  const WOOD = [0.50, 0.35, 0.20], WOOD_D = [0.38, 0.27, 0.16], WOOD_G = [0.50, 0.46, 0.40], PINE = [0.74, 0.60, 0.40];
  const ALU = [0.68, 0.69, 0.70, 0.25], STEEL = [0.47, 0.48, 0.49, 0.3], DSTEEL = [0.22, 0.22, 0.23, 0.15], RUST = [0.42, 0.27, 0.17, 0.05];
  const BLACK = [0.07, 0.07, 0.07, 0.05], RUBBER = [0.10, 0.10, 0.10], GLASS = [0.08, 0.12, 0.16, 0.5], BRASS = [0.74, 0.59, 0.30, 0.3];
  const OLIVE = [0.36, 0.38, 0.25], ROPE = [0.80, 0.74, 0.60], CORD = [0.55, 0.50, 0.40];
  const ORANGE = [0.96, 0.46, 0.10], EMBER = [1.0, 0.45, 0.08], EMBER2 = [0.98, 0.24, 0.04];

  // ---- helpers -------------------------------------------------------------------------------------------
  function rope(b, a, c, sag, r, col, n, segs) {
    n = n || 10; const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, p = lerp(a, c, t); p[1] -= sag * 4 * t * (1 - t); pts.push(p); }
    b.tube(pts, r, segs || 4, col);
  }
  function ring(b, c, axis, R, r, col, n, segs) {           // small torus (tie, strap, chain link) around an axis 'x','y','z'
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
  function numN(fn, u, v) { const e = 1e-3, a = sub(fn(Math.min(1, u + e), v), fn(Math.max(0, u - e), v)), c = sub(fn(u, Math.min(1, v + e)), fn(u, Math.max(0, v - e))); return norm(cross(a, c)); }
  // fabric with a dark inner skin (so open doors show a shadowed interior)
  function shell(b, nu, nv, fn, col, inCol, inset, ctr) {
    b.surf(nu, nv, fn, col);
    if (inCol) b.surf(nu, nv, (u, v) => { const p = fn(u, v); let n = numN(fn, u, v); if (dot(n, sub(ctr, p)) < 0) n = scale(n, -1); return add(p, scale(n, inset)); }, inCol);
  }
  // prism along local X from a convex [y,z] outline; sideCol(i) per face, endCol on the two cut ends
  function prism(b, poly, len, sideCol, endCol) {
    const h = len / 2, n = poly.length; let cy = 0, cz = 0; poly.forEach(p => { cy += p[0] / n; cz += p[1] / n; });
    for (let i = 0; i < n; i++) { const a = poly[i], c = poly[(i + 1) % n]; b.plate([-h, a[0], a[1]], [h, a[0], a[1]], [h, c[0], c[1]], [-h, c[0], c[1]], sideCol(i)); }
    for (const x of [-h, h]) { const ctr = b.v(x, cy, cz, Math.sign(x), 0, 0, endCol), ids = poly.map(p => b.v(x, p[0], p[1], Math.sign(x), 0, 0, endCol)); for (let i = 0; i < n; i++) b.tri(ctr, ids[i], ids[(i + 1) % n]); }
  }
  // wobbly log with rounded ends; colFn(u, v) (u around, v along a->b)
  function logSurf(b, A, B, r, seed, colFn, nu, nv) {
    const R = rnd(seed), p1 = R() * TAU, p2 = R() * TAU, L = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    b.push(along(A, B));
    b.surf(nu, nv, (u, v) => {
      const t = u * TAU, y = -L / 2 + L * v, end = Math.min(v, 1 - v);
      const rr = r * (1 + 0.07 * Math.sin(3 * t + p1 + v * 5) + 0.05 * Math.sin(v * 17 + p2)) * (end < 0.001 ? 0 : Math.sqrt(Math.min(1, end * nv * 0.9)));
      return [rr * Math.cos(t), y, rr * Math.sin(t)];
    }, colFn, true);
    b.pop();
  }
  function lantern(b, x, y, z, s, col, detail) {             // hurricane lantern, y = bottom
    b.push(mulAll(tr(x, y, z), sc(s, s, s)));
    const sg = detail ? 12 : 6;
    b.lathe([[0, 0], [0.068, 0], [0.074, 0.01], [0.074, 0.05], [0.06, 0.068], [0.03, 0.075], [0, 0.075]], sg, col);
    b.lathe([[0.03, 0.074], [0.052, 0.1], [0.057, 0.14], [0.048, 0.18], [0.028, 0.2]], sg, [0.42, 0.44, 0.40, 0.5]);
    b.lathe([[0.03, 0.198], [0.06, 0.205], [0.065, 0.215], [0.04, 0.245], [0.02, 0.26], [0, 0.262]], sg, col);
    if (detail) {
      b.cyl([0, 0.075, 0], [0, 0.11, 0], 0.012, 0.008, 6, BRASS);
      b.cyl([0, 0.11, 0], [0, 0.125, 0], 0.004, 0.002, 4, [1, 0.8, 0.45]);
      for (let k = 0; k < 4; k++) { const a = k * PI / 2 + PI / 4, c = Math.cos(a), sn = Math.sin(a); b.tube([[c * 0.06, 0.08, sn * 0.06], [c * 0.068, 0.14, sn * 0.068], [c * 0.058, 0.2, sn * 0.058]], 0.0025, 3, col); }
      for (const sx of [-1, 1]) b.tube([[sx * 0.074, 0.04, 0], [sx * 0.088, 0.06, 0], [sx * 0.088, 0.2, 0], [sx * 0.05, 0.235, 0]], 0.006, 5, col);
      const bail = []; for (let i = 0; i <= 8; i++) { const a = PI * i / 8; bail.push([Math.cos(a) * 0.07, 0.24 + Math.sin(a) * 0.09, 0]); }
      b.tube(bail, 0.0028, 3, DSTEEL);
      b.cyl([0.04, 0.04, 0.07], [0.04, 0.04, 0.085], 0.008, 0.008, 6, BRASS);
    }
    b.pop();
  }

  // =========================================================================================================
  // 1. TENT  (ridge along Z, door on +Z gable)
  // =========================================================================================================
  const TW = 1.3, TL = 1.6, TE = 1.25, TH = 2.2, TOV = 0.1, TLO = 0.12, TK = (TH - TE) / TW, SW = TOV / (TW + TOV);
  const eaveSag = z => 0.065 * Math.sin(PI * cl01((z + TL) / (2 * TL)));
  function roofP(sg, s, v, off) {
    const z = -TL - TLO + 2 * (TL + TLO) * v, ax = (TW + TOV) * (1 - s), y0 = TH - TK * ax;
    const vin = cl01((z + TL) / (2 * TL)), sp = cl01((s - SW) / (1 - SW));
    let d = eaveSag(z) * (1 - sp) + 0.06 * Math.sin(PI * sp) * (0.5 + 0.5 * Math.sin(PI * vin)) + 0.007 * Math.sin(z * 9 + s * 4 + sg) * Math.sin(PI * sp);
    if (s < SW) d += (SW - s) / SW * 0.03;
    const ez = Math.max(0, Math.abs(z) - TL) / TLO; d += 0.035 * ez * ez;
    d -= (off || 0);
    const nl = Math.hypot(TK, 1);
    return [sg * ax - sg * TK / nl * d, y0 - d / nl, z];
  }
  const doorA = y => 0.5 * Math.pow(cl01(1 - y / TH), 0.85);
  const gableTop = x => TH - TK * Math.abs(x) - 0.03;
  function wallCol(y, seed) {
    let c = sh(CANVAS, 0.97 + 0.04 * Math.sin(seed * 7.1 + y * 3));
    c = mix(c, DUST, 0.85 * (1 - ss(0.0, 0.8, y)));
    if (y < 0.16) c = mix(c, SOD, 0.8);
    return c;
  }
  function buildTent(detail) {
    const b = new MB();
    if (!detail) {
      const ey = TE, ex = TW + TOV, ey2 = TE - TK * TOV;
      for (const sg of [-1, 1]) {
        b.plate([sg * ex, ey2, -TL - TLO], [0, TH, -TL - TLO], [0, TH, TL + TLO], [sg * ex, ey2, TL + TLO], CANVAS);
        b.plate([sg * TW, 0, -TL], [sg * TW, ey, -TL], [sg * TW, ey, TL], [sg * TW, 0, TL], CANVAS_DK);
      }
      for (const z of [-TL, TL]) {
        b.plate([-TW, 0, z], [TW, 0, z], [TW, ey, z], [-TW, ey, z], z > 0 ? CANVAS_DK : CANVAS);
        const i0 = b.v(-TW, ey, z, 0, 0, 1, CANVAS), i1 = b.v(TW, ey, z, 0, 0, 1, CANVAS), i2 = b.v(0, TH, z, 0, 0, 1, CANVAS); b.tri(i0, i1, i2);
      }
      const d0 = b.v(-0.5, 0.01, TL + 0.02, 0, 0, 1, INSIDE), d1 = b.v(0.5, 0.01, TL + 0.02, 0, 0, 1, INSIDE), d2 = b.v(0, TH - 0.05, TL + 0.02, 0, 0, 1, INSIDE); b.tri(d0, d1, d2);
      b.box(TW + 0.55, 0.1, -0.55, 0.2, 0.2, 1.5, [0.36, 0.48, 0.6]);
      b.box(0, 0.04, 0, 2 * TW + 2.4, 0.02, 0.04, ROPE); b.box(0, 0.04, 0, 0.04, 0.02, 2 * TL + 2.7, ROPE);
      return b;
    }
    const CTR = [0, 0.9, 0];
    // --- roof (two sagging slopes), seams, hems, patches
    for (const sg of [-1, 1]) {
      shell(b, 16, 30, (u, v) => roofP(sg, u, v), (u, v) => {
        let c = sh(CANVAS, 1 + 0.035 * Math.sin(v * 11 + sg * 2) + 0.025 * Math.sin(u * 9 + v * 5));
        c = mix(c, [0.84, 0.80, 0.68], 0.4 * ss(0.4, 1, u));
        return mix(c, DUST, 0.4 * (1 - ss(0, 0.3, u)));
      }, INSIDE, 0.025, CTR);
      for (const zs of [-0.8, 0, 0.8]) { const vs = (zs + TL + TLO) / (2 * (TL + TLO)), dv = 0.018 / (2 * (TL + TLO)); b.surf(10, 1, (u, w) => roofP(sg, u, vs + (w - 0.5) * 2 * dv, 0.006), SEAM); }
      b.surf(1, 24, (u, v) => roofP(sg, 0.94 + 0.06 * u, v, 0.006), sh(SEAM, 0.95));
      b.surf(1, 24, (u, v) => roofP(sg, 0.0 + 0.045 * u, v, 0.006), mix(SEAM, DUST, 0.5));
      for (const vv of [0, 1]) b.surf(10, 1, (u, w) => roofP(sg, u, vv === 0 ? 0.012 * w : 1 - 0.012 * w, 0.006), mix(SEAM, DUST, 0.3));
    }
    b.surf(4, 3, (u, v) => roofP(1, 0.33 + 0.14 * u, 0.6 + 0.09 * v, 0.008), [0.73, 0.71, 0.58]);
    b.surf(3, 3, (u, v) => roofP(1, 0.72 + 0.1 * u, 0.2 + 0.06 * v, 0.008), [0.84, 0.80, 0.70]);
    // --- side walls
    const wallP = (sg, u, h, off) => {
      const z = -TL + 2 * TL * u, top = TE - eaveSag(z) * 0.8 - 0.02, y = -0.03 + (top + 0.03) * h;
      const bul = 0.03 * Math.sin(PI * u) * Math.sin(PI * h) + 0.05 * Math.pow(1 - h, 4) + 0.006 * Math.sin(u * 37 + h * 3) * (1 - h) + (off || 0);
      return [sg * (TW + bul), y, z];
    };
    for (const sg of [-1, 1]) {
      shell(b, 24, 10, (u, h) => wallP(sg, u, h), (u, h) => wallCol(h * TE, u * 5 + sg), INSIDE, 0.025, CTR);
      for (const us of [0.25, 0.5, 0.75]) b.surf(1, 8, (w, h) => wallP(sg, us + (w - 0.5) * 0.006, h, 0.005), (w, h) => mix(SEAM, DUST, 0.6 * (1 - ss(0, 0.5, h))));
      b.surf(1, 1, (w, h) => wallP(sg, w, 0.86 + 0.14 * h, 0.006), sh(SEAM, 0.97));
    }
    b.surf(3, 3, (u, h) => wallP(-1, 0.18 + 0.12 * u, 0.18 + 0.2 * h, 0.008), [0.66, 0.62, 0.50]);
    // --- back gable
    const backP = (u, h, off) => { const x = -TW + 2 * TW * u, top = gableTop(x), y = -0.03 + (top + 0.03) * h; return [x, y, -TL - 0.025 * Math.sin(PI * u) * Math.sin(PI * h) - 0.05 * Math.pow(1 - h, 4) - (off || 0)]; };
    shell(b, 20, 14, (u, h) => backP(u, h), (u, h) => wallCol(h * gableTop(-TW + 2 * TW * u), u * 3), INSIDE, 0.025, CTR);
    b.surf(1, 10, (w, h) => backP(0.5 + (w - 0.5) * 0.01, h, 0.005), SEAM);
    // --- front gable: two panels around a split door, flaps tied back
    for (const sg of [-1, 1]) {
      const fp = (u, h, off) => {
        const y = -0.03 + h * (TH - 0.03 + 0.03), A = doorA(y), X = y <= TE ? TW : (TH - y) / TK, x = sg * (A + (X - A) * u);
        return [x, y, TL + 0.025 * Math.sin(PI * u) * Math.sin(PI * Math.min(1, y / TE)) + 0.05 * Math.pow(1 - h, 4) + (off || 0)];
      };
      shell(b, 10, 20, fp, (u, h) => wallCol(h * TH, u * 4 + sg * 2), INSIDE, 0.025, CTR);
      b.surf(1, 16, (w, h) => fp(w * 0.06, h, 0.005), (w, h) => mix(SEAM, DUST, 0.5 * (1 - ss(0, 0.3, h))));
      const tieY = 1.0;
      const flap = (u, h) => {
        const y = 0.06 + h * (TH - 0.14), A = doorA(y), d = A * u;
        const w = y > tieY ? 0.2 + 0.8 * Math.pow(cl01((y - tieY) / (TH - tieY - 0.1)), 1.2) : 0.2 + 0.4 * cl01((tieY - y) / tieY);
        const z = TL + 0.04 + 0.05 * u * (1 - w) + 0.028 * Math.sin(u * PI * 3 + y * 1.7) * (1 - w) * u;
        return [sg * (A + 0.01 + d * w), y + (tieY - y) * 0.12 * u * (1 - w), z];
      };
      b.surf(8, 18, flap, (u, h) => mix(sh(CANVAS_DK, 0.96 + 0.06 * Math.sin(u * 9)), DUST, 0.6 * (1 - ss(0, 0.45, h))));
      const A1 = doorA(tieY), cxT = sg * (A1 + 0.01 + A1 * 0.2 * 0.5);
      b.tube([[cxT - 0.07, tieY, TL + 0.02], [cxT - 0.06, tieY + 0.01, TL + 0.1], [cxT + 0.06, tieY + 0.01, TL + 0.1], [cxT + 0.07, tieY, TL + 0.02]], 0.007, 4, CORD);
      b.tube([[cxT + 0.03, tieY, TL + 0.1], [cxT + 0.05, tieY - 0.12, TL + 0.11], [cxT + 0.04, tieY - 0.22, TL + 0.1]], 0.005, 3, CORD);
    }
    b.surf(2, 3, (u, h) => [0.75 + 0.18 * u, 0.25 + 0.2 * h, TL + 0.04 + 0.02 * Math.sin(PI * u)], [0.68, 0.64, 0.52]);
    // --- floor and poles
    b.plate([-TW, 0.008, -TL], [TW, 0.008, -TL], [TW, 0.008, TL], [-TW, 0.008, TL], [0.17, 0.15, 0.12]);
    b.cyl([0, TH - 0.032, -TL - 0.16], [0, TH - 0.032, TL + 0.16], 0.03, 0.03, 10, WOOD);
    for (const z of [-TL + 0.04, TL - 0.04]) b.cyl([0, -0.25, z], [0, TH - 0.05, z], 0.03, 0.03, 10, sh(WOOD, 0.92));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (TW + 0.035), z = sz * (TL + 0.035);
      b.cyl([x, -0.25, z], [x, TE + 0.08, z], 0.022, 0.022, 8, sh(WOOD, 0.85 + 0.1 * (sx + 1) / 2));
      b.cyl([x, TE + 0.08, z], [x, TE + 0.16, z], 0.007, 0.005, 5, STEEL);
      b.cyl([x, 0.6, z], [x, 0.66, z], 0.025, 0.025, 8, mix(DUST, WOOD, 0.5));
    }
    // --- guy ropes and stakes
    const stake = (sx, sz, ox, oz) => {
      b.beam([sx - ox * 0.08, -0.3, sz - oz * 0.08], [sx + ox * 0.05, 0.17, sz + oz * 0.05], 0.035, WOOD_G, 0.025);
      b.box(sx + ox * 0.05, 0.175, sz + oz * 0.05, 0.045, 0.02, 0.035, sh(WOOD_G, 0.6));
    };
    for (const sg of [-1, 1]) for (const z of [-TL + 0.05, 0, TL - 0.05]) {
      const v = (z + TL + TLO) / (2 * (TL + TLO)), P = roofP(sg, 0, v), S = [sg * (TW + 1.15), 0.13, z * 1.08];
      rope(b, P, [S[0] + sg * 0.035, S[1], S[2]], 0.035, 0.006, ROPE, 10, 4);
      const t0 = lerp(P, S, 0.74), t1 = lerp(P, S, 0.8); t0[1] -= 0.03; t1[1] -= 0.028; b.beam(t0, t1, 0.03, WOOD_D, 0.015);
      stake(S[0], S[2], sg, 0);
    }
    for (const sz of [-1, 1]) { const P = [0, TH - 0.03, sz * (TL + 0.15)], S = [0.05, 0.13, sz * (TL + 1.35)]; rope(b, P, [S[0], S[1], S[2] + sz * 0.035], 0.04, 0.006, ROPE, 12, 4); stake(S[0], S[2], 0, sz); }
    // --- stove jack + chimney on -X slope
    const P = roofP(-1, 0.5, 0.3);
    b.surf(3, 3, (u, v) => roofP(-1, 0.43 + 0.14 * u, 0.275 + 0.05 * v, 0.008), [0.6, 0.59, 0.55]);
    b.cyl([P[0], P[1] - 0.45, P[2]], [P[0], P[1] + 0.75, P[2]], 0.055, 0.055, 12, [0.30, 0.27, 0.24, 0.15]);
    b.cyl([P[0], P[1] - 0.04, P[2]], [P[0], P[1] + 0.07, P[2]], 0.08, 0.075, 12, [0.5, 0.5, 0.48, 0.2]);
    b.cyl([P[0], P[1] + 0.35, P[2]], [P[0], P[1] + 0.38, P[2]], 0.062, 0.062, 12, DSTEEL);
    const top = P[1] + 0.75;
    b.push(tr(P[0], 0, P[2])); b.lathe([[0.0, top + 0.13], [0.13, top + 0.07], [0.13, top + 0.06], [0.0, top + 0.11]], 12, DSTEEL); b.pop();
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3; b.beam([P[0] + Math.cos(a) * 0.05, top - 0.01, P[2] + Math.sin(a) * 0.05], [P[0] + Math.cos(a) * 0.09, top + 0.08, P[2] + Math.sin(a) * 0.09], 0.008, DSTEEL); }
    // --- lantern at the door
    b.tube([[0, TH - 0.06, TL + 0.13], [0, 1.80, TL + 0.13]], 0.003, 3, DSTEEL);
    lantern(b, 0, 1.46, TL + 0.13, 1, [0.22, 0.34, 0.22, 0.15], 1);
    // --- cot and sleeping bag inside
    const cx0 = -1.0, cx1 = -0.34, cz0 = -1.3, cz1 = 0.55, cy = 0.42;
    for (const x of [cx0, cx1]) b.cyl([x, cy, cz0 - 0.05], [x, cy, cz1 + 0.05], 0.018, 0.018, 6, WOOD);
    for (const z of [cz0 - 0.03, cz1 + 0.03]) b.cyl([cx0, cy, z], [cx1, cy, z], 0.016, 0.016, 6, WOOD_D);
    for (const z of [-1.2, -0.37, 0.45]) { b.cyl([cx0, 0, z], [cx1, cy, z], 0.011, 0.011, 5, ALU); b.cyl([cx1, 0, z], [cx0, cy, z], 0.011, 0.011, 5, ALU); }
    b.surf(6, 8, (u, v) => [cx0 + (cx1 - cx0) * u, cy - 0.04 * Math.sin(PI * u) * (0.6 + 0.4 * Math.sin(PI * v)), cz0 + (cz1 - cz0) * v], [0.40, 0.42, 0.29]);
    b.surf(14, 16, (u, v) => {
      const t = u * TAU, zz = 2 * v - 1, f = Math.sqrt(cl01(1 - Math.pow(Math.abs(zz), 8)));
      return [-0.67 + Math.cos(t) * 0.27 * (0.4 + 0.6 * f), 0.445 + Math.sin(t) * 0.065 * f * (Math.sin(t) < 0 ? 0.5 : 1), -0.4 + zz * 0.82];
    }, (u, v) => sh([0.56, 0.23, 0.16], 0.9 + 0.12 * Math.sin(v * PI * 18)), true);
    b.surf(4, 3, (u, v) => [-0.93 + 0.52 * u, 0.515 + 0.012 * Math.sin(PI * u), -0.92 + 0.18 * v], [0.72, 0.62, 0.46]);
    rock(b, -0.67, 0.52, -1.15, 0.2, 0.05, 0.11, 31, [0.74, 0.72, 0.67], 10, 5, 0.1, 0.08);
    // --- rolled tarp beside the tent
    b.push(mulAll(tr(TW + 0.55, 0.1, -0.55), rotY(0.12), sc(1, 0.85, 1)));
    b.cyl([0, 0, -0.75], [0, 0, 0.75], 0.12, 0.12, 16, [0.36, 0.48, 0.60]);
    for (const z of [-0.751, 0.751]) { const sp = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * TAU * 2.5, rr = 0.02 + 0.095 * i / 30; sp.push([Math.cos(a) * rr, Math.sin(a) * rr, z]); } b.tube(sp, 0.004, 3, [0.2, 0.28, 0.36]); }
    for (const z of [-0.45, 0.45]) ring(b, [0, 0, z], 'z', 0.124, 0.007, CORD, 14, 4);
    b.pop();
    return b;
  }

  // =========================================================================================================
  // 2. SURVEY TABLE + two camp chairs
  // =========================================================================================================
  function chair(b, x, z, ay, canvas, jacket, detail) {
    b.push(mulAll(tr(x, 0, z), rotY(ay)));
    const F = [0.24, 0.24, 0.25, 0.2], hw = 0.26, sy = 0.44, d = 0.22;
    if (!detail) {
      b.box(0, sy, 0, 2 * hw, 0.03, 2 * d, canvas); b.box(0, 0.75, -d - 0.04, 2 * hw, 0.3, 0.03, canvas);
      for (const s of [-1, 1]) b.box(s * hw, 0.3, -0.02, 0.03, 0.62, 0.45, F);
      if (jacket) b.box(0, 0.68, -d - 0.05, 2 * hw + 0.06, 0.48, 0.1, [0.55, 0.27, 0.18]);
      b.pop(); return;
    }
    for (const s of [-1, 1]) {
      const sx = s * hw;
      b.cyl([sx, -0.04, -d], [sx, sy, d], 0.011, 0.011, 6, F);
      b.cyl([sx, -0.04, d], [sx, sy, -d], 0.011, 0.011, 6, F);
      b.cyl([sx, sy, -d - 0.01], [sx, sy, d + 0.01], 0.012, 0.012, 6, F);
      b.cyl([sx, sy - 0.02, -d], [sx, 0.9, -d - 0.07], 0.012, 0.012, 6, F);
      b.cyl([sx, sy, d], [sx, 0.63, d - 0.02], 0.011, 0.011, 6, F);
      b.beam([sx, 0.645, d + 0.04], [sx, 0.655, -d - 0.04], 0.05, sh(WOOD, 0.9 + 0.1 * s), 0.02);
      b.cyl([sx, 0.215, -0.004], [sx + s * 0.012, 0.215, -0.004], 0.016, 0.016, 6, DSTEEL);
    }
    b.cyl([-hw, 0.08, -d + 0.15], [hw, 0.08, -d + 0.15], 0.009, 0.009, 5, F);
    b.surf(10, 6, (u, v) => [-hw + 2 * hw * u, sy + 0.012 - 0.045 * Math.sin(PI * u) * (0.6 + 0.4 * Math.sin(PI * v)), -d + 2 * d * v], (u, v) => (u < 0.1 || u > 0.9) ? sh(canvas, 0.8) : mix(canvas, DUST, 0.15 * Math.sin(PI * v)));
    b.surf(10, 5, (u, v) => { const y = 0.6 + 0.28 * v; return [-hw + 2 * hw * u, y, -d - 0.07 * (y - sy + 0.02) / (0.9 - sy + 0.02) - 0.03 * Math.sin(PI * u)]; }, (u, v) => (u < 0.1 || u > 0.9 || v > 0.85) ? sh(canvas, 0.8) : canvas);
    if (jacket) {
      const JC = [0.55, 0.27, 0.18], Ty = 0.905, Tz = -d - 0.068;
      const jp = (u, v) => {
        let y, zz, hang;
        if (v < 0.35) { const t = v / 0.35; y = 0.56 + (Ty - 0.56) * t; zz = Tz + 0.035 + 0.03 * (1 - t); hang = 1 - t; }
        else if (v < 0.45) { const ph = PI * (v - 0.35) / 0.1; y = Ty + 0.035 * Math.sin(ph); zz = Tz + 0.035 * Math.cos(ph); hang = 0; }
        else { const t = (v - 0.45) / 0.55; y = Ty - 0.5 * t; zz = Tz - 0.035 - 0.07 * t * t; hang = t; }
        zz += 0.014 * Math.sin(u * 19 + v * 11) * hang;
        return [(u - 0.5) * (0.62 + 0.08 * hang), y, zz];
      };
      b.surf(12, 20, jp, (u, v) => (v > 0.36 && v < 0.44) ? sh(JC, 0.7) : sh(JC, 0.93 + 0.1 * Math.sin(u * 13 + v * 3)));
      for (const s of [-1, 1]) b.tube([[s * 0.29, Ty - 0.02, Tz + 0.04], [s * 0.31, 0.75, Tz + 0.07], [s * 0.3, 0.6, Tz + 0.09], [s * 0.27, 0.5, Tz + 0.12]], 0.042, 8, sh(JC, 0.88));
      for (const s of [-1, 1]) b.cyl([s * 0.27, 0.5, Tz + 0.12], [s * 0.265, 0.47, Tz + 0.13], 0.04, 0.036, 8, sh(JC, 0.7));
      for (let k = 0; k < 4; k++) b.cyl([0.02, 0.62 + k * 0.08, Tz + 0.04], [0.02, 0.62 + k * 0.08, Tz + 0.05], 0.007, 0.007, 5, [0.3, 0.25, 0.2]);
    }
    b.pop();
  }
  function buildTable(detail) {
    const b = new MB(), r = rnd(202), TOP = 0.75;
    b.push(rotY(0.06));
    if (!detail) {
      b.box(0, TOP - 0.01, 0, 1.8, 0.03, 0.8, PINE);
      for (const x of [-0.72, 0.72]) b.box(x, 0.36, 0, 0.04, 0.72, 0.7, ALU);
      b.box(-0.55, TOP + 0.13, -0.12, 0.42, 0.26, 0.3, OLIVE); b.box(-0.6, TOP + 0.9, -0.24, 0.02, 1.5, 0.02, DSTEEL);
      b.box(0.45, TOP + 0.005, 0.05, 0.62, 0.01, 0.46, [0.82, 0.78, 0.62]); b.box(0, TOP + 0.13, -0.12, 0.34, 0.24, 0.04, [0.2, 0.2, 0.2]);
      b.pop();
      chair(b, -0.25, 0.86, PI + 0.18, [0.33, 0.42, 0.30], false, 0); chair(b, 1.32, 0.14, -PI / 2 + 0.28, [0.26, 0.34, 0.45], true, 0);
      return b;
    }
    // slat top over an aluminium frame
    const n = 30;
    for (let i = 0; i < n; i++) { const x = -0.9 + (i + 0.5) * 1.8 / n; b.box(x, TOP - 0.009, 0, 1.8 / n - 0.004, 0.018, 0.8, sh([0.66, 0.55, 0.40], 0.82 + 0.25 * r())); }
    b.box(0, TOP - 0.03, 0, 1.78, 0.012, 0.76, [0.15, 0.13, 0.1]);
    for (const z of [-0.37, 0.37]) b.beam([-0.9, TOP - 0.03, z], [0.9, TOP - 0.03, z], 0.025, ALU);
    for (const x of [-0.86, 0, 0.86]) b.beam([x, TOP - 0.035, -0.37], [x, TOP - 0.035, 0.37], 0.022, ALU);
    for (const x of [-0.72, 0.72]) {
      b.cyl([x, -0.02, -0.36], [x, TOP - 0.035, 0.34], 0.013, 0.013, 6, ALU); b.cyl([x, -0.02, 0.36], [x, TOP - 0.035, -0.34], 0.013, 0.013, 6, ALU);
      b.cyl([x, 0.015, -0.37], [x, 0.015, 0.37], 0.012, 0.012, 6, ALU);
      for (const z of [-0.36, 0.36]) b.cyl([x, -0.12, z], [x, 0.02, z], 0.02, 0.02, 6, RUBBER);
      b.cyl([x - 0.02, 0.36, 0], [x + 0.02, 0.36, 0], 0.016, 0.016, 6, DSTEEL);
    }
    b.cyl([-0.72, 0.36, 0], [0.72, 0.36, 0], 0.011, 0.011, 6, ALU);
    // field radio
    b.push(mulAll(tr(-0.56, TOP, -0.12), rotY(-0.12)));
    const RW = 0.42, RH = 0.26, RD = 0.3;
    b.box(0, RH / 2, 0, RW, RH, RD, OLIVE);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * RW / 2, RH / 2, sz * RD / 2, 0.025, RH + 0.006, 0.025, sh(OLIVE, 0.75));
    for (const sz of [-1, 1]) b.box(0, RH, sz * RD / 2, RW, 0.02, 0.022, sh(OLIVE, 0.8));
    b.box(0, RH / 2, RD / 2 + 0.003, RW - 0.04, RH - 0.04, 0.006, [0.17, 0.18, 0.15]);
    b.box(-0.09, 0.17, RD / 2 + 0.007, 0.13, 0.06, 0.004, [0.85, 0.80, 0.62]);
    b.box(-0.09, 0.17, RD / 2 + 0.01, 0.13, 0.06, 0.002, [0.30, 0.34, 0.36, 0.5]);
    b.beam([-0.12, 0.15, RD / 2 + 0.012], [-0.07, 0.19, RD / 2 + 0.012], 0.003, [0.8, 0.15, 0.1]);
    for (let k = 0; k < 3; k++) { const kx = -0.15 + k * 0.06; b.cyl([kx, 0.07, RD / 2], [kx, 0.07, RD / 2 + 0.028], 0.017, 0.015, 10, BLACK); b.box(kx, 0.082, RD / 2 + 0.029, 0.003, 0.012, 0.002, [0.9, 0.9, 0.85]); }
    b.cyl([0.03, 0.17, RD / 2], [0.03, 0.17, RD / 2 + 0.03], 0.03, 0.028, 12, BLACK);
    for (let k = 0; k < 7; k++) b.box(0.13, 0.07 + k * 0.022, RD / 2 + 0.009, 0.11, 0.008, 0.006, [0.3, 0.31, 0.28, 0.15]);
    b.box(0.13, 0.135, RD / 2 + 0.006, 0.125, 0.16, 0.003, [0.05, 0.05, 0.05]);
    for (let k = 0; k < 3; k++) b.cyl([0.04 + k * 0.025, 0.06, RD / 2], [0.04 + k * 0.025, 0.065, RD / 2 + 0.025], 0.004, 0.003, 5, STEEL);
    b.box(-0.17, 0.05, RD / 2 + 0.007, 0.03, 0.02, 0.004, [0.7, 0.12, 0.08]);
    for (const sx of [-1, 1]) b.tube([[sx * RW / 2, 0.19, -0.08], [sx * (RW / 2 + 0.03), 0.2, -0.06], [sx * (RW / 2 + 0.03), 0.2, 0.06], [sx * RW / 2, 0.19, 0.08]], 0.007, 5, BLACK);
    b.cyl([-0.16, RH, -0.1], [-0.16, RH + 0.04, -0.1], 0.016, 0.012, 8, BLACK);
    const ant = []; for (let i = 0; i <= 10; i++) { const t = i / 10; ant.push([-0.16 - 0.14 * t * t, RH + 0.04 + 1.45 * t, -0.1 + 0.03 * t * t]); }
    b.tube(ant, t => 0.006 - 0.0035 * t, 4, DSTEEL);
    b.sphere(-0.30, RH + 1.49, -0.07, 0.007, 6, BLACK);
    b.cyl([RW / 2, 0.06, 0.08], [RW / 2 + 0.02, 0.06, 0.08], 0.012, 0.012, 8, BLACK);
    b.pop();
    // handset + coiled cord
    b.push(mulAll(tr(-0.22, TOP, 0.06), rotY(0.5)));
    b.beam([-0.09, 0.022, 0], [0.09, 0.022, 0], 0.03, BLACK, 0.025);
    b.cyl([-0.1, 0.0, 0], [-0.1, 0.045, 0], 0.03, 0.032, 10, BLACK); b.cyl([0.1, 0.0, 0], [0.1, 0.04, 0], 0.026, 0.028, 10, BLACK);
    b.box(0, 0.038, 0.016, 0.03, 0.012, 0.012, [0.25, 0.25, 0.25]);
    b.pop();
    { const A = [-0.36, TOP + 0.06, -0.02], B = [-0.22 + Math.cos(0.5) * 0.0, TOP + 0.01, 0.06 + 0.0], pts = [], turns = 18, per = 6;
      const Bp = [-0.22 - Math.cos(0.5) * 0.1, TOP + 0.015, 0.06 + Math.sin(0.5) * 0.1];
      for (let i = 0; i <= turns * per; i++) { const t = i / (turns * per), c = lerp(A, Bp, t); c[0] -= 0.06 * Math.sin(PI * t); c[2] += 0.12 * Math.sin(PI * t); c[1] = Math.max(TOP + 0.012, c[1] - 0.05 * Math.sin(PI * t)); const a = t * turns * TAU; pts.push([c[0] + Math.cos(a) * 0.009, c[1] + Math.sin(a) * 0.009, c[2] + Math.cos(a) * 0.004]); }
      b.tube(pts, 0.0028, 3, BLACK); void B; }
    // rugged laptop
    b.push(mulAll(tr(0.0, TOP, -0.07), rotY(0.14)));
    b.box(0, 0.016, 0, 0.34, 0.03, 0.25, [0.24, 0.25, 0.24]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 0.165, 0.017, sz * 0.12, 0.03, 0.036, 0.03, RUBBER);
    b.box(0, 0.032, 0.02, 0.29, 0.002, 0.12, [0.1, 0.1, 0.1]);
    for (let i = 0; i < 13; i++) for (let j = 0; j < 5; j++) b.box(-0.132 + i * 0.022, 0.0345, -0.025 + j * 0.022, 0.018, 0.004, 0.018, sh([0.16, 0.16, 0.16], 0.9 + 0.2 * ((i * 7 + j * 3) % 5) / 5));
    b.box(0, 0.032, 0.095, 0.08, 0.003, 0.045, [0.18, 0.18, 0.18]);
    b.push(mulAll(tr(0, 0.03, -0.12), rotX(-0.26)));
    b.box(0, 0.12, 0, 0.34, 0.24, 0.02, [0.24, 0.25, 0.24]);
    for (const sx of [-1, 1]) for (const sy of [0, 1]) b.box(sx * 0.165, 0.01 + sy * 0.22, 0, 0.03, 0.035, 0.03, RUBBER);
    b.box(0, 0.125, 0.0105, 0.29, 0.19, 0.002, GLASS);
    const scr = [[-0.06, 0.13, 0.17, 0.12, [0.55, 0.62, 0.42]], [0.07, 0.15, 0.1, 0.08, [0.75, 0.6, 0.42]], [0.05, 0.08, 0.13, 0.04, [0.6, 0.5, 0.38]], [0, 0.205, 0.27, 0.02, [0.25, 0.32, 0.45]]];
    for (const [sx, sy, w, h, c] of scr) b.box(sx, sy, 0.0122, w, h, 0.001, c);
    b.tube([[-0.13, 0.1, 0.0128], [-0.06, 0.14, 0.0128], [0.0, 0.12, 0.0128], [0.11, 0.16, 0.0128]], 0.003, 3, [0.3, 0.55, 0.85]);
    b.pop(); b.pop();
    // spread map with contours and a canyon
    b.push(mulAll(tr(0.47, TOP, 0.06), rotY(0.2)));
    const MW = 0.62, MD = 0.46;
    const mapY = (u, v) => 0.002 + 0.035 * Math.pow(Math.max(0, (u - 0.82) / 0.18), 2) + 0.016 * Math.pow(Math.max(0, (0.12 - v) / 0.12), 2) + 0.004 * (1 - Math.abs(((u * 4) % 2) - 1)) + 0.003 * (1 - Math.abs(((v * 2) % 2) - 1));
    b.surf(44, 32, (u, v) => [(u - 0.5) * MW, mapY(u, v), (v - 0.5) * MD], (u, v) => {
      if (u < 0.03 || u > 0.97 || v < 0.04 || v > 0.96) return [0.88, 0.85, 0.74];
      const X = u * 6, Z = v * 4.5, cz = 0.5 + 0.18 * Math.sin(u * 7.5 + 0.6) + 0.05 * Math.sin(u * 19), dc = Math.abs(v - cz);
      let h = Math.sin(X * 0.9 + 0.5) * 0.5 + Math.cos(Z * 1.1 - X * 0.4) * 0.4 + Math.sin(X * 2.1 + Z * 1.7) * 0.15;
      let c = mix([0.62, 0.72, 0.50], [0.88, 0.75, 0.56], cl01(h * 0.6 + 0.5));
      h -= 0.9 * Math.exp(-dc * dc * 90);
      const f = h * 5 - Math.floor(h * 5);
      if (f < 0.2) c = mix(c, [0.52, 0.34, 0.2], 0.75);
      if (dc < 0.06) c = mix(c, [0.68, 0.38, 0.26], 0.6);
      if (dc < 0.022) c = [0.22, 0.44, 0.74];
      if ((X % 1) < 0.05 || (Z % 1) < 0.06) c = mix(c, [0.3, 0.35, 0.6], 0.35);
      return c;
    });
    for (const [mx, mz, w, d, c] of [[0.2, 0.19, 0.12, 0.05, [0.9, 0.9, 0.86]], [0.155, 0.19, 0.02, 0.02, [0.8, 0.2, 0.15]], [0.185, 0.19, 0.02, 0.02, [0.9, 0.75, 0.2]], [0.215, 0.19, 0.02, 0.02, [0.3, 0.55, 0.3]], [-0.12, -0.05, 0.015, 0.015, [0.85, 0.1, 0.1]]]) b.box(mx, 0.009, mz, w, 0.002, d, c);
    // compass on the map
    b.push(mulAll(tr(-0.08, 0.008, 0.08), rotY(0.7)));
    b.box(0, 0.002, 0, 0.06, 0.004, 0.11, [0.72, 0.78, 0.80, 0.4]);
    b.box(0, 0.0045, 0.042, 0.008, 0.001, 0.025, [0.8, 0.15, 0.1]);
    b.cyl([0, 0, -0.015], [0, 0.012, -0.015], 0.023, 0.023, 16, [0.1, 0.1, 0.1]);
    b.cyl([0, 0.012, -0.015], [0, 0.0135, -0.015], 0.02, 0.02, 16, [0.3, 0.4, 0.42, 0.5]);
    b.beam([0, 0.0125, -0.031], [0, 0.0125, -0.015], 0.005, [0.85, 0.12, 0.1], 0.002); b.beam([0, 0.0125, -0.015], [0, 0.0125, 0.001], 0.005, [0.9, 0.9, 0.9], 0.002);
    b.pop();
    b.pop();
    // binoculars
    b.push(mulAll(tr(0.78, TOP, -0.25), rotY(0.6)));
    for (const s of [-1, 1]) {
      b.cyl([s * 0.034, 0.03, -0.07], [s * 0.034, 0.03, 0.06], 0.03, 0.03, 12, [0.12, 0.13, 0.12]);
      b.cyl([s * 0.034, 0.03, 0.06], [s * 0.034, 0.03, 0.085], 0.024, 0.02, 10, RUBBER);
      b.cyl([s * 0.034, 0.03, -0.075], [s * 0.034, 0.03, -0.07], 0.026, 0.026, 10, GLASS);
      b.cyl([s * 0.034, 0.03, 0.0855], [s * 0.034, 0.03, 0.086], 0.014, 0.014, 8, GLASS);
    }
    b.box(0, 0.04, 0.02, 0.04, 0.018, 0.07, [0.2, 0.2, 0.2]); b.cyl([0, 0.05, 0.03], [0, 0.05, 0.05], 0.011, 0.011, 8, DSTEEL);
    b.tube([[-0.06, 0.03, 0.03], [-0.1, 0.005, 0.0], [-0.08, 0.004, -0.12], [0.04, 0.004, -0.15], [0.1, 0.005, -0.05], [0.06, 0.03, 0.03]], 0.004, 3, [0.2, 0.18, 0.15]);
    b.pop();
    // enamel mug
    b.push(tr(-0.14, TOP, 0.26));
    b.lathe([[0, 0.001], [0.037, 0.001], [0.04, 0.006], [0.04, 0.085], [0.037, 0.085], [0.037, 0.012], [0, 0.012]], 14, [0.86, 0.86, 0.82, 0.2]);
    b.lathe([[0.0405, 0.079], [0.0405, 0.088], [0.0365, 0.088], [0.0365, 0.079]], 14, [0.12, 0.2, 0.42, 0.2]);
    b.cyl([0, 0.06, 0], [0, 0.062, 0], 0.036, 0.036, 12, [0.25, 0.15, 0.08], false);
    b.tube([[0.039, 0.07, 0], [0.065, 0.068, 0], [0.068, 0.045, 0], [0.06, 0.022, 0], [0.039, 0.02, 0]], 0.005, 5, [0.86, 0.86, 0.82, 0.2]);
    b.box(-0.03, 0.04, 0.025, 0.012, 0.01, 0.004, [0.15, 0.15, 0.15]);
    b.pop();
    // thermos
    b.push(tr(-0.84, TOP, 0.24));
    b.lathe([[0, 0], [0.042, 0], [0.046, 0.01], [0.046, 0.23], [0.04, 0.25], [0.03, 0.26], [0.03, 0.265], [0, 0.265]], 14, [0.26, 0.42, 0.32, 0.2]);
    b.lathe([[0.047, 0.2], [0.047, 0.3], [0.044, 0.305], [0, 0.305]], 14, [0.6, 0.61, 0.6, 0.35]);
    for (const y of [0.04, 0.17]) b.lathe([[0.047, y], [0.047, y + 0.012]], 14, [0.18, 0.28, 0.22, 0.15]);
    b.cyl([0.044, 0.08, 0], [0.065, 0.12, 0], 0.006, 0.006, 5, BLACK); b.cyl([0.065, 0.12, 0], [0.045, 0.19, 0], 0.006, 0.006, 5, BLACK);
    b.pop();
    // clipboard with pencil
    b.push(mulAll(tr(0.15, TOP, 0.25), rotY(-0.35)));
    b.box(0, 0.004, 0, 0.23, 0.008, 0.32, [0.5, 0.36, 0.22]);
    b.box(0.003, 0.009, 0.01, 0.21, 0.002, 0.28, [0.93, 0.92, 0.88]); b.box(-0.004, 0.0105, 0.016, 0.21, 0.002, 0.27, [0.96, 0.95, 0.9]);
    for (let k = 0; k < 8; k++) b.box(-0.03, 0.012, -0.08 + k * 0.025, 0.13 - (k % 3) * 0.02, 0.0005, 0.004, [0.3, 0.32, 0.45]);
    b.box(0, 0.014, -0.15, 0.1, 0.012, 0.03, STEEL); b.cyl([-0.04, 0.02, -0.15], [0.04, 0.02, -0.15], 0.006, 0.006, 6, STEEL);
    b.cyl([0.06, 0.017, -0.08], [0.09, 0.017, 0.1], 0.004, 0.004, 6, [0.92, 0.75, 0.15]); b.cyl([0.09, 0.017, 0.1], [0.093, 0.017, 0.115], 0.004, 0.0005, 6, [0.8, 0.65, 0.5]);
    b.pop();
    // hard hat
    b.push(mulAll(tr(0.62, TOP, 0.28), rotY(0.4)));
    const HC = [0.92, 0.74, 0.18, 0.15];
    b.surf(20, 8, (u, v) => { const t = u * TAU, a = v * PI / 2, rr = Math.cos(a); return [rr * 0.105, 0.012 + Math.sin(a) * 0.115 * (1 - 0.15 * rr * rr) , rr * 0.13 * (1 + 0.05 * Math.cos(t))].map((q, k) => k === 0 ? q * Math.cos(t) : k === 2 ? rr * 0.13 * Math.sin(t) : q); }, (u, v) => v > 0.2 && v < 0.27 ? sh(HC, 0.85) : sh(HC, 0.95 + 0.05 * v), true);
    b.surf(20, 2, (u, v) => { const t = u * TAU, peak = Math.max(0, Math.sin(t)) ** 3, w = 0.006 + 0.03 * v + 0.04 * v * peak; return [Math.cos(t) * (0.105 + w), 0.014 - 0.006 * v - 0.004 * v * peak, Math.sin(t) * (0.13 + w)]; }, sh(HC, 0.9), true);
    b.beam([0, 0.126, -0.1], [0, 0.13, 0.0], 0.026, sh(HC, 1.03), 0.012); b.beam([0, 0.13, 0.0], [0, 0.122, 0.1], 0.026, sh(HC, 1.03), 0.012);
    b.box(0.07, 0.075, 0.08, 0.035, 0.028, 0.002, [0.15, 0.4, 0.75]);
    b.pop();
    // field book and a pebble holding the map corner
    b.push(mulAll(tr(-0.36, TOP, 0.28), rotY(0.25)));
    b.box(0, 0.007, 0, 0.12, 0.014, 0.19, [0.85, 0.62, 0.18]); b.box(0.002, 0.0072, 0, 0.115, 0.0125, 0.186, [0.92, 0.9, 0.84]);
    b.box(-0.058, 0.007, 0, 0.008, 0.0145, 0.19, [0.3, 0.2, 0.1]);
    b.cyl([0.02, 0.016, -0.06], [0.03, 0.016, 0.08], 0.0035, 0.0035, 6, [0.15, 0.3, 0.6]);
    b.pop();
    rock(b, 0.43, TOP + 0.026, -0.13, 0.04, 0.025, 0.03, 2201, [0.62, 0.48, 0.36], 8, 5, 0.3);
    b.pop();
    chair(b, -0.25, 0.86, PI + 0.18, [0.33, 0.42, 0.30], false, 1);
    chair(b, 1.32, 0.14, -PI / 2 + 0.28, [0.26, 0.34, 0.45], true, 1);
    return b;
  }

  // =========================================================================================================
  // 3. THEODOLITE / TOTAL STATION on a wooden tripod (telescope towards -X)
  // =========================================================================================================
  const WHITE_I = [0.86, 0.86, 0.82, 0.15], GREY_I = [0.28, 0.30, 0.30, 0.15], YEL = [0.84, 0.66, 0.14, 0.1], TRIM = [0.18, 0.42, 0.30, 0.15];
  function buildTheodolite(detail) {
    const b = new MB(), r = rnd(303), HY = 1.2;
    const legA = [PI * 0.5 + 0.1, PI * 0.5 + TAU / 3 - 0.05, PI * 0.5 + 2 * TAU / 3 + 0.08];
    if (!detail) {
      for (const a of legA) b.beam([Math.cos(a) * 0.07, HY, Math.sin(a) * 0.07], [Math.cos(a) * 0.64, -0.1, Math.sin(a) * 0.64], 0.04, WOOD);
      b.box(0, 1.27, 0, 0.16, 0.12, 0.16, GREY_I); b.box(0, 1.47, 0, 0.12, 0.22, 0.16, WHITE_I); b.box(0, 1.55, 0, 0.3, 0.06, 0.06, GREY_I);
      b.push(mulAll(tr(0.62, 0, 0.48), rotY(0.5))); b.box(0, 0.09, 0, 0.42, 0.18, 0.32, YEL); b.box(0, 0.26, -0.2, 0.42, 0.32, 0.08, YEL); b.pop();
      b.box(-1.55, 0.95, -0.3, 0.03, 2.25, 0.03, [0.85, 0.15, 0.12]);
      return b;
    }
    // tripod
    b.cyl([0, HY - 0.03, 0], [0, HY + 0.012, 0], 0.088, 0.088, 16, [0.6, 0.6, 0.58, 0.2]);
    b.cyl([0, HY - 0.15, 0], [0, HY - 0.03, 0], 0.01, 0.01, 6, DSTEEL); b.cyl([0, HY - 0.17, 0], [0, HY - 0.14, 0], 0.03, 0.03, 10, BLACK);
    legA.forEach((a, li) => {
      const ca = Math.cos(a), sa = Math.sin(a), T = [ca * 0.075, HY - 0.02, sa * 0.075], Fp = [ca * 0.64, 0, sa * 0.64], tg = [-sa, 0, ca];
      const P = t => lerp(T, Fp, t), off = (p, k) => add(p, scale(tg, k));
      b.cyl(off(T, -0.04), off(T, 0.04), 0.014, 0.014, 8, [0.55, 0.55, 0.53, 0.2]);
      const wsh = 0.85 + 0.12 * r();
      for (const k of [-0.03, 0.03]) b.beam(off(P(0.01), k), off(P(0.58), k), 0.032, sh(WOOD, wsh), 0.02);
      b.beam(P(0.42), P(0.97), 0.028, sh([0.56, 0.40, 0.24], wsh), 0.026);
      b.beam(P(0.3), P(0.34), 0.075, [0.2, 0.2, 0.2], 0.03);
      for (const t of [0.22, 0.4]) b.beam(off(P(t), -0.035), off(P(t), 0.035), 0.012, sh(WOOD_D, 1));
      // brass clamp with wing screw
      b.beam(P(0.53), P(0.59), 0.05, BRASS, 0.09);
      const out = [ca, 0, sa], cp = P(0.56);
      b.cyl(cp, add(cp, scale(out, 0.04)), 0.006, 0.006, 6, BRASS); b.beam(add(cp, add(scale(out, 0.04), [0, -0.015, 0])), add(cp, add(scale(out, 0.04), [0, 0.015, 0])), 0.008, BRASS, 0.004);
      // metal shoe and foot spur, extended into the ground
      const sf = add(Fp, scale(sub(Fp, T), 0.08));
      b.cyl(P(0.95), sf, 0.018, 0.004, 8, STEEL);
      b.beam(P(0.93), add(P(0.93), scale(out, 0.06)), 0.012, STEEL, 0.03);
      b.beam(P(0.92), P(0.97), 0.036, STEEL, 0.032);
      void li;
    });
    // tribrach with levelling screws
    b.push(tr(0, HY + 0.012, 0));
    const tri = []; for (let k = 0; k < 6; k++) { const a = k * PI / 3 + PI / 6, rr = k % 2 ? 0.05 : 0.085; tri.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    b.extrude(tri, 0, 0.02, [0.2, 0.22, 0.22, 0.1]);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + PI / 6, x = Math.cos(a) * 0.07, z = Math.sin(a) * 0.07; b.cyl([x, 0.02, z], [x, 0.05, z], 0.016, 0.016, 12, [0.15, 0.15, 0.15]); for (let g = 0; g < 6; g++) { const ga = g * PI / 3; b.box(x + Math.cos(ga) * 0.016, 0.035, z + Math.sin(ga) * 0.016, 0.004, 0.026, 0.004, [0.25, 0.25, 0.25]); } }
    b.cyl([0, 0.05, 0], [0, 0.07, 0], 0.075, 0.072, 16, [0.32, 0.38, 0.34, 0.15]);
    b.cyl([0.05, 0.07, 0.03], [0.05, 0.077, 0.03], 0.009, 0.009, 8, [0.4, 0.6, 0.5, 0.5]);
    b.pop();
    // alidade / body
    const BY = HY + 0.082;
    b.cyl([0, BY, 0], [0, BY + 0.04, 0], 0.075, 0.075, 18, WHITE_I);
    b.cyl([0, BY + 0.015, 0], [0, BY + 0.025, 0], 0.077, 0.077, 18, GREY_I);
    b.box(0, BY + 0.08, 0, 0.17, 0.08, 0.15, WHITE_I);
    b.box(0.0855, BY + 0.085, 0, 0.002, 0.06, 0.13, GREY_I);
    b.box(0.087, BY + 0.098, 0.02, 0.002, 0.03, 0.06, [0.35, 0.48, 0.40, 0.4]);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) b.box(0.088, BY + 0.062 + j * 0.012, -0.045 + i * 0.012 + (i > 1 ? 0.01 : 0), 0.004, 0.009, 0.009, j ? [0.15, 0.15, 0.15] : [0.85, 0.85, 0.82]);
    b.box(0.088, BY + 0.098, -0.04, 0.003, 0.022, 0.022, [0.12, 0.45, 0.2]);
    b.box(-0.0855, BY + 0.085, 0, 0.002, 0.06, 0.13, GREY_I);
    // standards
    const SY = BY + 0.12, AY = 1.55;
    for (const s of [-1, 1]) {
      b.box(0, (SY + AY) / 2, s * 0.068, 0.11, AY - SY, 0.032, WHITE_I);
      b.cyl([0, AY, s * 0.052], [0, AY, s * 0.084], 0.055, 0.055, 24, WHITE_I);
      b.box(0, SY + 0.02, s * 0.085, 0.112, 0.006, 0.003, GREY_I);
    }
    b.cyl([0, AY, 0.084], [0, AY, 0.1], 0.058, 0.052, 18, GREY_I);
    b.cyl([0, AY, 0.1], [0, AY, 0.112], 0.022, 0.02, 12, [0.15, 0.15, 0.15]);
    b.cyl([0, AY, -0.084], [0, AY, -0.11], 0.02, 0.02, 12, [0.15, 0.15, 0.15]);
    for (let g = 0; g < 8; g++) { const ga = g * PI / 4; b.box(Math.cos(ga) * 0.02, AY + Math.sin(ga) * 0.02, -0.098, 0.004, 0.004, 0.024, [0.25, 0.25, 0.25]); }
    b.cyl([0.03, SY + 0.03, -0.084], [0.03, SY + 0.03, -0.11], 0.012, 0.012, 10, [0.15, 0.15, 0.15]);
    b.cyl([0.06, BY + 0.06, 0.075], [0.06, BY + 0.06, 0.1], 0.012, 0.012, 10, [0.15, 0.15, 0.15]);
    b.cyl([-0.06, BY + 0.06, -0.075], [-0.06, BY + 0.06, -0.1], 0.014, 0.014, 10, [0.15, 0.15, 0.15]);
    // carrying handle
    b.tube([[0, AY + 0.045, -0.07], [0, AY + 0.12, -0.065], [0, AY + 0.135, -0.04], [0, AY + 0.135, 0.04], [0, AY + 0.12, 0.065], [0, AY + 0.045, 0.07]], 0.011, 8, GREY_I);
    // telescope
    b.box(0, AY, 0, 0.1, 0.085, 0.072, GREY_I);
    b.cyl([0.05, AY, 0], [0.13, AY, 0], 0.024, 0.02, 14, [0.18, 0.19, 0.19, 0.15]);
    b.cyl([0.13, AY, 0], [0.158, AY, 0], 0.017, 0.019, 12, RUBBER);
    b.cyl([0.158, AY, 0], [0.159, AY, 0], 0.012, 0.012, 10, GLASS);
    b.cyl([0.09, AY, 0], [0.1, AY, 0], 0.027, 0.027, 12, [0.12, 0.12, 0.12]);
    b.cyl([-0.05, AY, 0], [-0.13, AY, 0], 0.033, 0.037, 16, [0.18, 0.19, 0.19, 0.15]);
    b.cyl([-0.13, AY, 0], [-0.145, AY, 0], 0.04, 0.04, 16, [0.12, 0.12, 0.12, 0.15]);
    b.cyl([-0.145, AY, 0], [-0.146, AY, 0], 0.032, 0.032, 16, GLASS);
    b.box(0.0, AY + 0.052, 0, 0.07, 0.016, 0.018, [0.2, 0.2, 0.2]);
    b.cyl([-0.035, AY + 0.052, 0], [-0.04, AY + 0.052, 0], 0.006, 0.006, 6, GLASS);
    b.cyl([0.12, AY + 0.03, 0], [0.12, AY + 0.04, 0], 0.012, 0.012, 10, [0.15, 0.15, 0.15]);
    // extra instrument detail: colour trim, second keypad, battery, optical plummet, focus ring, sun shade, plumb bob
    b.box(0, BY + 0.043, 0, 0.172, 0.008, 0.152, TRIM);
    b.box(0, SY + 0.004, 0, 0.115, 0.008, 0.17, TRIM);
    b.box(-0.087, BY + 0.098, -0.02, 0.002, 0.03, 0.06, [0.35, 0.48, 0.40, 0.4]);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) b.box(-0.088, BY + 0.062 + j * 0.012, 0.045 - i * 0.012, 0.004, 0.009, 0.009, j ? [0.15, 0.15, 0.15] : [0.85, 0.85, 0.82]);
    b.box(0.0, SY + 0.08, -0.087, 0.075, 0.1, 0.012, [0.22, 0.23, 0.23, 0.1]);
    b.box(0.0, SY + 0.128, -0.094, 0.02, 0.008, 0.004, [0.6, 0.6, 0.6, 0.3]);
    b.cyl([0.086, BY + 0.03, -0.035], [0.11, BY + 0.03, -0.035], 0.009, 0.008, 10, [0.15, 0.15, 0.15]);
    b.cyl([0.11, BY + 0.03, -0.035], [0.111, BY + 0.03, -0.035], 0.006, 0.006, 8, GLASS);
    for (let g = 0; g < 12; g++) { const ga = g * TAU / 12; b.box(0.095, AY + Math.cos(ga) * 0.027, Math.sin(ga) * 0.027, 0.014, 0.004, 0.004, [0.08, 0.08, 0.08]); }
    b.cyl([-0.145, AY, 0], [-0.175, AY, 0], 0.041, 0.043, 16, [0.12, 0.12, 0.12, 0.1], false);
    b.tube([[0, HY - 0.17, 0], [0.002, 0.6, 0.001], [0.003, 0.33, 0.002]], 0.0012, 3, [0.85, 0.82, 0.7]);
    b.push(tr(0.003, 0.25, 0.002));
    b.lathe([[0, 0], [0.012, 0.03], [0.017, 0.055], [0.015, 0.07], [0.006, 0.08], [0, 0.082]], 12, BRASS);
    b.pop();
    // yellow hard case, open
    b.push(mulAll(tr(0.62, 0, 0.48), rotY(0.5)));
    const cw = 0.42, ch = 0.18, cd = 0.32, t = 0.014;
    b.box(0, 0.006, 0, cw, 0.012, cd, YEL);
    for (const s of [-1, 1]) { b.box(s * (cw / 2 - t / 2), ch / 2, 0, t, ch, cd, YEL); b.box(0, ch / 2, s * (cd / 2 - t / 2), cw, ch, t, YEL); b.box(0, 0.06, s * (cd / 2 + 0.003), cw + 0.01, 0.012, 0.006, sh(YEL, 0.85)); b.box(s * (cw / 2 + 0.003), 0.06, 0, 0.006, 0.012, cd + 0.01, sh(YEL, 0.85)); }
    b.box(0, ch - 0.03, 0, cw - 2 * t, 0.04, cd - 2 * t, [0.2, 0.2, 0.2]);
    b.box(0.0, ch - 0.028, 0, 0.18, 0.04, 0.16, [0.06, 0.06, 0.06]);
    b.box(0.13, ch - 0.028, 0.05, 0.08, 0.04, 0.06, [0.06, 0.06, 0.06]);
    for (const s of [-1, 1]) b.box(s * 0.13, ch - 0.02, cd / 2 + 0.01, 0.045, 0.04, 0.016, [0.2, 0.2, 0.2]);
    b.tube([[-0.06, 0.13, cd / 2], [-0.05, 0.13, cd / 2 + 0.035], [0.05, 0.13, cd / 2 + 0.035], [0.06, 0.13, cd / 2]], 0.01, 6, [0.15, 0.15, 0.15]);
    b.push(mulAll(tr(0, ch, -cd / 2), rotX(-1.95)));
    b.box(0, 0.09, cd / 2, cw, 0.012, cd, YEL);
    for (const s of [-1, 1]) { b.box(s * (cw / 2 - t / 2), 0.045, cd / 2, t, 0.09, cd, YEL); b.box(0, 0.045, cd / 2 + s * (cd / 2 - t / 2), cw, 0.09, t, YEL); }
    b.box(0, 0.06, cd / 2, cw - 2 * t, 0.04, cd - 2 * t, [0.26, 0.26, 0.25]);
    for (let k = 0; k < 3; k++) b.box(-0.12 + k * 0.12, 0.096, cd / 2, 0.06, 0.004, cd - 0.04, sh(YEL, 0.88));
    b.pop();
    for (const s of [-1, 1]) b.cyl([s * 0.15, ch, -cd / 2 - 0.006], [s * 0.1, ch, -cd / 2 - 0.006], 0.008, 0.008, 6, DSTEEL);
    b.pop();
    // surveyor's tape reel lying beside the case
    b.push(mulAll(tr(0.35, 0.03, 0.95), rotY(0.9), rotX(PI / 2 - 0.08)));
    b.lathe([[0, -0.03], [0.07, -0.03], [0.08, -0.02], [0.08, 0.02], [0.07, 0.03], [0, 0.03]], 18, [0.75, 0.2, 0.12, 0.1]);
    b.cyl([0, -0.031, 0], [0, -0.034, 0], 0.05, 0.05, 14, [0.2, 0.2, 0.2]);
    b.cyl([0, 0.031, 0], [0, 0.045, 0], 0.012, 0.012, 8, [0.2, 0.2, 0.2]); b.beam([0, 0.045, 0], [0.04, 0.05, 0], 0.012, [0.2, 0.2, 0.2], 0.008);
    b.pop();
    b.plate([0.35 + 0.07, 0.003, 0.95 - 0.05], [0.35 + 0.5, 0.003, 0.95 + 0.25], [0.35 + 0.51, 0.003, 0.95 + 0.235], [0.35 + 0.08, 0.003, 0.95 - 0.065], [0.92, 0.88, 0.7]);
    // ranging pole (red/white 0.5 m bands)
    const rb = [-1.55, 0, -0.3], dir = norm([0.03, 1, 0.02]);
    b.cyl(add(rb, scale(dir, -0.3)), add(rb, scale(dir, 0.0)), 0.004, 0.016, 8, STEEL);
    for (let k = 0; k < 4; k++) b.cyl(add(rb, scale(dir, k * 0.5)), add(rb, scale(dir, k * 0.5 + 0.5)), 0.016, 0.016, 10, k % 2 ? [0.9, 0.9, 0.86] : [0.82, 0.14, 0.1]);
    b.cyl(add(rb, scale(dir, 2.0)), add(rb, scale(dir, 2.02)), 0.017, 0.012, 10, [0.2, 0.2, 0.2]);
    for (const k of [1, 2, 3]) b.cyl(add(rb, scale(dir, k * 0.5 - 0.01)), add(rb, scale(dir, k * 0.5 + 0.01)), 0.0175, 0.0175, 10, [0.6, 0.6, 0.6, 0.3]);
    rock(b, rb[0] + 0.03, 0.0, rb[2] - 0.05, 0.07, 0.04, 0.05, 41, [0.58, 0.48, 0.38], 8, 4, 0.3);
    return b;
  }

  // =========================================================================================================
  // 4. CAMPFIRE
  // =========================================================================================================
  function buildCampfire(detail) {
    const b = new MB(), r = rnd(404), N = 13;
    const stones = []; for (let i = 0; i < N; i++) { const a = i / N * TAU + (r() - 0.5) * 0.25, rad = 0.52 + (r() - 0.5) * 0.06, rx = 0.11 + 0.06 * r(), ry = 0.075 + 0.045 * r(), rz = 0.09 + 0.04 * r(); stones.push({ a, rad, rx, ry, rz, ay: -a + (r() - 0.5) * 0.6, c: sh(mix([0.52, 0.42, 0.34], [0.46, 0.43, 0.41], r()), 0.85 + 0.25 * r()) }); }
    if (!detail) {
      for (const s of stones) b.sphere(Math.cos(s.a) * s.rad, s.ry * 0.5, Math.sin(s.a) * s.rad, s.rx, 4, s.c, s.ry);
      b.cyl([0, 0, 0], [0, 0.04, 0], 0.45, 0.4, 8, [0.4, 0.38, 0.36]);
      b.box(0, 0.08, 0, 0.6, 0.08, 0.08, [0.1, 0.09, 0.08]); b.box(0, 0.08, 0, 0.08, 0.08, 0.6, [0.1, 0.09, 0.08]);
      for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.3; b.beam([Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8], [0, 1.3, 0], 0.025, DSTEEL); }
      b.cyl([0, 0.42, 0], [0, 0.6, 0], 0.12, 0.08, 6, [0.12, 0.11, 0.1]);
      b.push(mulAll(tr(1.05, 0, 0.55), rotY(-0.4))); b.box(0, 0.12, 0, 0.42, 0.24, 0.32, [0.45, 0.33, 0.22]); b.pop();
      b.cyl([-0.95, 0, 0.78], [-0.95, 0.42, 0.78], 0.2, 0.2, 6, [0.42, 0.3, 0.2]); b.beam([-0.95, 0.42, 0.78], [-0.75, 0.95, 0.78], 0.04, WOOD);
      return b;
    }
    // ring stones (soot on the inner faces)
    stones.forEach((s, i) => {
      const cx = Math.cos(s.a) * s.rad, cz = Math.sin(s.a) * s.rad, rad = [cx / s.rad, 0, cz / s.rad];
      rock(b, cx, s.ry * 0.45, cz, s.rx, s.ry, s.rz, 500 + i, (d, u, v) => {
        const inward = -(d[0] * rad[0] + d[2] * rad[2]), soot = ss(-0.1, 0.9, inward + d[1] * 0.25);
        const speck = 0.92 + 0.12 * Math.sin(u * 40 + v * 23 + i);
        return mix(sh(s.c, speck), [0.16, 0.14, 0.13], soot * 0.7);
      }, 14, 8, s.ay, 0.2);
    });
    // ash bed
    b.surf(28, 8, (u, v) => { const t = u * TAU, rr = 0.47 * v; return [Math.cos(t) * rr, 0.045 * (1 - v * v) + 0.008 * Math.sin(t * 5 + v * 9) * v + 0.003, Math.sin(t) * rr]; },
      (u, v) => { const n = Math.sin(u * 61 + v * 13) * Math.sin(u * 23 - v * 17); return n > 0.5 ? [0.1, 0.09, 0.085] : n < -0.6 ? [0.46, 0.45, 0.43] : sh([0.30, 0.29, 0.28], 0.85 + 0.2 * Math.sin(u * 37 + v * 5)); }, true);
    // charred logs
    const logs = [[[-0.42, 0.06, -0.08], [0.12, 0.13, 0.02], 0.055], [[0.38, 0.06, -0.22], [-0.08, 0.14, 0.05], 0.05], [[0.12, 0.05, 0.42], [-0.02, 0.17, -0.08], 0.045], [[-0.2, 0.05, 0.34], [0.1, 0.1, -0.12], 0.04], [[-0.12, 0.04, -0.4], [0.06, 0.1, 0.1], 0.042]];
    logs.forEach(([A, B, rr], i) => logSurf(b, A, B, rr, 600 + i, (u, v) => {
      const crack = Math.sin(u * TAU * 7) * Math.sin(v * 46 + i) > 0.6;
      if (v > 0.93) return v > 0.985 ? EMBER : mix([0.1, 0.08, 0.07], EMBER2, (v - 0.93) / 0.07);
      if (v < 0.25) return mix([0.36, 0.26, 0.17], [0.09, 0.08, 0.07], v / 0.25);
      return crack ? [0.38, 0.37, 0.35] : [0.08, 0.07, 0.065];
    }, 10, 14));
    // embers
    for (let k = 0; k < 12; k++) { const a = r() * TAU, rr = 0.05 + 0.25 * r(); rock(b, Math.cos(a) * rr, 0.05 - rr * 0.06, Math.sin(a) * rr, 0.02 + 0.018 * r(), 0.014 + 0.01 * r(), 0.02 + 0.015 * r(), 700 + k, k % 3 ? EMBER : EMBER2, 6, 3, r() * 3, 0.25); }
    // cooking tripod, chain and kettle
    const AP = [0, 1.28, 0];
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.3, F = [Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82], d = sub(AP, F); b.cyl(add(F, scale(d, -0.2)), add(AP, scale(d, 0.07)), 0.011, 0.011, 6, DSTEEL); }
    ring(b, [0, 1.26, 0], 'y', 0.026, 0.006, DSTEEL, 10, 4);
    for (let k = 0; k < 12; k++) { const y = 1.24 - k * 0.042, pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * TAU, p = Math.cos(a) * 0.009, q = Math.sin(a) * 0.024; pts.push(k % 2 ? [p, y + q, 0] : [0, y + q, p]); } b.tube(pts, 0.0035, 3, [0.18, 0.17, 0.16, 0.15]); }
    b.tube([[0, 0.745, 0], [0.012, 0.73, 0], [0.0, 0.715, 0], [-0.012, 0.725, 0]], 0.004, 3, DSTEEL);
    b.push(tr(0, 0.43, 0));
    const KC = [0.11, 0.1, 0.09, 0.15];
    b.lathe([[0, 0], [0.08, 0], [0.11, 0.02], [0.125, 0.07], [0.12, 0.12], [0.09, 0.16], [0.06, 0.172], [0.062, 0.18], [0, 0.18]], 16, KC);
    b.lathe([[0.03, 0.18], [0.03, 0.19], [0.015, 0.2], [0, 0.205]], 8, BLACK);
    b.tube([[0.1, 0.06, 0], [0.15, 0.1, 0], [0.18, 0.14, 0], [0.2, 0.15, 0]], t => 0.022 - 0.012 * t, 8, KC);
    const bail = []; for (let i = 0; i <= 10; i++) { const a = PI * i / 10; bail.push([0, 0.15 + Math.sin(a) * 0.14, Math.cos(a) * 0.115]); } b.tube(bail, 0.004, 4, DSTEEL);
    b.pop();
    // firewood stack (split quarters with pale cut ends)
    b.push(mulAll(tr(1.05, 0, 0.55), rotY(-0.4)));
    const wedge = []; wedge.push([0, 0]); for (let k = 0; k <= 5; k++) { const a = k / 5 * PI / 2; wedge.push([Math.sin(a) * 0.085, Math.cos(a) * 0.085]); }
    const wc = wedge.reduce((m, p) => [m[0] + p[0] / wedge.length, m[1] + p[1] / wedge.length], [0, 0]); const wp = wedge.map(p => [p[0] - wc[0], p[1] - wc[1]]);
    const layers = [[4, 0.035], [3, 0.1], [2, 0.165]];
    layers.forEach(([cnt, y], li) => { for (let k = 0; k < cnt; k++) {
      const z = (k - (cnt - 1) / 2) * 0.095, sd = r();
      b.push(mulAll(tr((r() - 0.5) * 0.06, y + 0.005, z), rotY((r() - 0.5) * 0.15), rotX(sd * TAU)));
      const bark = sh([0.27, 0.19, 0.13], 0.85 + 0.3 * r()), split = sh([0.62, 0.50, 0.34], 0.9 + 0.15 * r());
      prism(b, wp, 0.4 + 0.06 * r(), i => (i === 0 || i === wp.length - 1) ? split : bark, sh([0.86, 0.75, 0.56], 0.95 + 0.08 * r()));
      b.pop(); void li;
    } });
    b.push(mulAll(tr(0.02, 0.05, 0.25), rotX(PI / 2), rotZ(PI / 2)));
    b.lathe([[0, -0.2, [0.85, 0.74, 0.55]], [0.05, -0.2, [0.85, 0.74, 0.55]], [0.05, -0.2], [0.05, 0.2, [0.85, 0.74, 0.55]], [0, 0.2]], 10, [0.36, 0.26, 0.17]);
    b.pop();
    b.pop();
    // chopping block + axe
    b.push(tr(-0.95, 0, 0.78));
    b.lathe([[0.21, -0.3], [0.22, 0.0], [0.2, 0.05], [0.2, 0.4], [0.205, 0.42, [0.78, 0.66, 0.48]], [0.15, 0.421, [0.72, 0.6, 0.42]], [0.1, 0.421, [0.8, 0.68, 0.5]], [0.05, 0.421, [0.7, 0.58, 0.4]], [0, 0.421]], 16, [0.29, 0.21, 0.14]);
    for (let k = 0; k < 6; k++) { const a = k * 1.1; b.beam([Math.cos(a) * 0.205, 0.05 + k * 0.05, Math.sin(a) * 0.205], [Math.cos(a) * 0.205, 0.22 + k * 0.03, Math.sin(a) * 0.205], 0.012, [0.25, 0.19, 0.13], 0.005); }
    // axe: blade sunk into the block, handle sticking out and up
    b.push(mulAll(tr(0.02, 0.421, 0.02), rotY(0.6), rotZ(0.12)));
    const AX = [0.32, 0.31, 0.3, 0.2], EDGE = [0.6, 0.61, 0.62, 0.35];
    b.box(0, 0.065, 0, 0.07, 0.05, 0.036, AX);
    b.plate([-0.035, 0.04, 0.018], [0.035, 0.04, 0.018], [0.055, -0.03, 0.004], [-0.05, -0.03, 0.004], AX);
    b.plate([-0.035, 0.04, -0.018], [0.035, 0.04, -0.018], [0.055, -0.03, -0.004], [-0.05, -0.03, -0.004], AX);
    b.plate([-0.035, 0.04, 0.018], [-0.035, 0.04, -0.018], [-0.05, -0.03, -0.004], [-0.05, -0.03, 0.004], AX);
    b.plate([0.035, 0.04, 0.018], [0.035, 0.04, -0.018], [0.055, -0.03, -0.004], [0.055, -0.03, 0.004], AX);
    b.box(0, 0.003, 0, 0.1, 0.006, 0.012, EDGE);
    b.box(0, 0.093, 0, 0.06, 0.008, 0.03, [0.42, 0.42, 0.42, 0.3]);
    b.tube([[-0.02, 0.065, 0], [0.12, 0.1, 0], [0.32, 0.16, 0.0], [0.52, 0.22, 0], [0.62, 0.27, 0], [0.66, 0.28, 0]], u => 0.019 + 0.004 * Math.sin(u * PI), 8, [0.62, 0.47, 0.3]);
    b.box(0.07, 0.085, 0, 0.03, 0.02, 0.026, [0.5, 0.36, 0.22]);
    b.pop();
    b.pop();
    rock(b, -0.62, 0.02, 0.5, 0.05, 0.03, 0.04, 801, [0.5, 0.45, 0.4], 6, 4, 0);
    return b;
  }

  // =========================================================================================================
  // 5. FLAGPOLE with windsock streaming towards -X
  // =========================================================================================================
  function buildFlagpole(detail) {
    const b = new MB(), r = rnd(505), PH = 6.0, POLE = [0.72, 0.73, 0.72, 0.2];
    const guyA = [0.4, 0.4 + TAU / 3, 0.4 + 2 * TAU / 3], GY = 4.6, GR = 2.6;
    if (!detail) {
      b.cyl([0, 0, 0], [0, 0.7, 0], 0.5, 0.2, 6, [0.6, 0.53, 0.45]);
      b.cyl([0, 0, 0], [0, PH, 0], 0.04, 0.025, 4, POLE);
      for (const a of guyA) b.beam([0, GY, 0], [Math.cos(a) * GR, 0.1, Math.sin(a) * GR], 0.01, DSTEEL);
      b.cyl([-0.12, 5.75, 0], [-1.55, 5.58, 0.05], 0.15, 0.07, 5, ORANGE, false);
      b.box(0.15, 2.1, 0.12, 0.4, 0.3, 0.05, [0.12, 0.16, 0.3]); b.box(0.08, 1.45, 0, 0.12, 0.25, 0.18, [0.62, 0.63, 0.6]);
      return b;
    }
    // cairn of flat stones
    const layers = [[8, 0.43, 0.06], [7, 0.36, 0.17], [6, 0.29, 0.28], [5, 0.22, 0.39], [4, 0.15, 0.5], [3, 0.08, 0.61]];
    let sd = 900;
    layers.forEach(([cnt, rad, y], li) => { const off = r() * TAU; for (let k = 0; k < cnt; k++) {
      const a = off + k / cnt * TAU, c = sh(mix([0.55, 0.44, 0.34], [0.48, 0.44, 0.40], r()), 0.85 + 0.25 * r());
      rock(b, Math.cos(a) * rad, y, Math.sin(a) * rad, 0.19 + 0.05 * r() - li * 0.012, 0.065 + 0.015 * r(), 0.13 + 0.03 * r() - li * 0.01, sd++, (d, u, v) => sh(c, 0.9 + 0.12 * Math.sin(u * 30 + v * 17) + (d[1] > 0.5 ? 0.08 : 0)), 8, 4, -a + (r() - 0.5) * 0.5, 0.1);
    } });
    rock(b, 0, 0.71, 0, 0.12, 0.05, 0.1, sd++, [0.52, 0.45, 0.38], 9, 5, 0.4, 0.1);
    b.lathe([[0.38, -0.05], [0.33, 0.15], [0.25, 0.35], [0.15, 0.55], [0.07, 0.68], [0, 0.7]], 10, [0.36, 0.3, 0.25]);
    // pole
    b.cyl([0, -0.6, 0], [0, PH, 0], 0.042, 0.026, 12, POLE);
    for (const y of [2.0, 4.0]) b.cyl([0, y - 0.04, 0], [0, y + 0.04, 0], 0.042 - 0.0027 * y + 0.006, 0.042 - 0.0027 * y + 0.006, 12, sh(POLE, 0.85));
    b.cyl([0, PH, 0], [0, PH + 0.015, 0], 0.03, 0.03, 10, DSTEEL);
    // guy collar, wires, turnbuckles, pegs
    b.cyl([0, GY - 0.03, 0], [0, GY + 0.03, 0], 0.045, 0.045, 12, DSTEEL);
    for (const a of guyA) {
      const ca = Math.cos(a), sa = Math.sin(a), A = [ca * 0.045, GY, sa * 0.045], P = [ca * GR, 0.1, sa * GR];
      b.beam([ca * 0.04, GY, sa * 0.04], [ca * 0.075, GY, sa * 0.075], 0.012, DSTEEL, 0.004);
      const T0 = lerp(A, P, 0.9), T1 = lerp(A, P, 0.95);
      rope(b, [ca * 0.075, GY, sa * 0.075], T0, 0.03, 0.0035, [0.55, 0.56, 0.57, 0.3], 8, 3);
      b.cyl(T0, T1, 0.009, 0.009, 6, STEEL);
      b.tube([T1, lerp(T1, P, 0.5), [P[0], P[1] + 0.02, P[2]]], 0.0035, 3, [0.55, 0.56, 0.57, 0.3]);
      b.cyl([P[0] - ca * 0.05, -0.4, P[2] - sa * 0.05], [P[0], 0.12, P[2]], 0.012, 0.012, 6, RUST);
      ring(b, [P[0], 0.13, P[2]], 'y', 0.018, 0.005, RUST, 8, 3);
      rock(b, P[0] + 0.12, 0.03, P[2] + 0.05, 0.1, 0.06, 0.08, sd++, [0.52, 0.44, 0.36], 8, 4, a, 0.12);
    }
    // windsock on a swivel arm
    const SY = 5.72;
    b.cyl([0, SY - 0.08, 0], [0, SY + 0.08, 0], 0.035, 0.035, 10, DSTEEL);
    b.beam([0.0, SY, 0], [-0.06, SY, 0], 0.016, DSTEEL);
    ring(b, [-0.06, SY, 0], 'x', 0.15, 0.007, DSTEEL, 18, 4);
    const sock = (t, th) => {
      const L = 1.42, x = -0.06 - L * t + 0.04 * t * t, cy = SY - 0.3 * Math.pow(t, 1.8) + 0.03 * Math.sin(t * 8) * t, cz = 0.11 * Math.sin(t * 6.5) * t;
      const R = (0.15 - 0.07 * t) * (1 + 0.1 * Math.sin(3 * th + t * 11) * t + 0.05 * Math.sin(t * 17) * t - 0.18 * t * t * Math.max(0, Math.sin(th)));
      return [x + 0.02 * Math.sin(t * 9 + th) * t, cy + Math.sin(th) * R, cz + Math.cos(th) * R];
    };
    for (let k = 0; k < 5; k++) {
      const t0 = k / 5, t1 = (k + 1) / 5, col = k % 2 ? [0.93, 0.91, 0.86] : sh(ORANGE, 1 - 0.04 * k);
      b.surf(18, 6, (u, v) => sock(t0 + (t1 - t0) * v, u * TAU), (u, v) => sh(col, 0.9 + 0.12 * Math.sin(u * TAU * 3 + v * 2)), true);
    }
    // anemometer at the top
    b.cyl([0, PH, 0], [0, PH + 0.16, 0], 0.012, 0.012, 8, STEEL);
    b.cyl([0, PH + 0.14, 0], [0, PH + 0.19, 0], 0.025, 0.02, 10, [0.85, 0.85, 0.82, 0.15]);
    for (let k = 0; k < 3; k++) {
      const a = k * TAU / 3 + 0.5, ca = Math.cos(a), sa = Math.sin(a), E = [ca * 0.13, PH + 0.17, sa * 0.13];
      b.cyl([ca * 0.02, PH + 0.17, sa * 0.02], E, 0.004, 0.004, 5, STEEL);
      b.push(mulAll(tr(E[0], E[1], E[2]), rotY(-a), rotX(PI / 2)));
      b.lathe([[0, -0.03], [0.02, -0.025], [0.03, -0.01], [0.032, 0.0], [0.029, 0.0], [0.027, -0.009], [0.018, -0.022], [0, -0.027]], 10, [0.85, 0.85, 0.82, 0.15]);
      b.pop();
    }
    // solar panel, equipment box and cables
    b.push(mulAll(tr(0, 2.15, 0), rotY(0.25)));
    b.beam([0, 0, 0], [0, 0, 0.16], 0.03, ALU);
    ring(b, [0, 0, 0], 'y', 0.05, 0.01, ALU, 12, 4);
    b.push(mulAll(tr(0, 0.0, 0.2), rotX(0.65)));
    b.box(0, 0, 0, 0.56, 0.025, 0.42, ALU);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) b.box(-0.225 + i * 0.09, 0.0135, -0.15 + j * 0.1, 0.084, 0.002, 0.094, sh([0.10, 0.14, 0.30, 0.4], 0.9 + 0.2 * ((i + j) % 2)));
    b.box(0, 0.0125, 0, 0.53, 0.0005, 0.39, [0.8, 0.82, 0.85]);
    b.box(0, -0.02, 0, 0.12, 0.015, 0.08, [0.15, 0.15, 0.15]);
    b.pop();
    b.cyl([0, -0.02, 0.15], [0, -0.06, 0.3], 0.01, 0.01, 5, ALU);
    b.pop();
    b.push(mulAll(tr(0, 1.45, 0), rotY(-0.3)));
    b.box(0.0, 0, 0.13, 0.22, 0.28, 0.14, [0.62, 0.63, 0.60, 0.1]);
    b.box(0.0, 0, 0.201, 0.2, 0.26, 0.004, [0.56, 0.57, 0.55, 0.1]);
    b.box(0.07, -0.14, 0.13, 0.03, 0.02, 0.03, [0.2, 0.2, 0.2]);
    b.box(-0.06, 0.06, 0.205, 0.04, 0.025, 0.004, [0.85, 0.75, 0.15]);
    for (const y of [-0.08, 0.08]) { b.box(0, y, 0.205, 0.235, 0.025, 0.006, [0.15, 0.15, 0.14]); for (const s of [-1, 1]) b.box(s * 0.115, y, 0.12, 0.006, 0.025, 0.17, [0.15, 0.15, 0.14]); ring(b, [0, y, 0], 'y', 0.042, 0.007, [0.15, 0.15, 0.14], 10, 3); }
    b.pop();
    const ca = Math.cos(-0.3), sa = Math.sin(-0.3), bx = [0.07 * ca + 0.13 * sa, 1.31, -0.07 * sa + 0.13 * ca];
    rope(b, [bx[0], 1.3, bx[2]], [0.03, 0.95, 0.02], -0.05, 0.005, BLACK, 6, 3);
    b.tube([[0.05, 2.1, 0.12], [0.07, 1.9, 0.1], [0.06, 1.65, 0.08], [0.03, 1.59, 0.1]], 0.005, 3, BLACK);
    b.tube([[0.028, 1.6, -0.02], [0.034, 3.0, -0.02], [0.03, 4.5, -0.02], [0.028, 5.9, -0.02], [0.02, 6.1, 0]], 0.004, 3, BLACK);
    for (let y = 2.5; y < 5.9; y += 0.7) ring(b, [0, y, 0], 'y', 0.042 - 0.0027 * y + 0.006, 0.005, BLACK, 8, 3);
    return b;
  }

  // =========================================================================================================
  // 6. SUPPLY STACK
  // =========================================================================================================
  function crate(b, x, y, z, ay, w, h, d, base, seed, stencil, detail) {
    b.push(mulAll(tr(x, y, z), rotY(ay)));
    const r = rnd(seed);
    if (!detail) { b.box(0, h / 2, 0, w, h, d, base); b.pop(); return; }
    b.box(0, h / 2, 0, w - 0.02, h - 0.01, d - 0.02, sh(base, 0.35));
    const n = Math.max(3, Math.round(h / 0.15)), ph = h / n;
    for (let i = 0; i < n; i++) {
      const yy = (i + 0.5) * ph;
      for (const s of [-1, 1]) {
        b.box(0, yy, s * (d / 2 - 0.009), w - 0.004, ph - 0.008, 0.018, mix(sh(base, 0.8 + 0.3 * r()), DUST, i === 0 ? 0.35 : 0.1 * r()));
        b.box(s * (w / 2 - 0.009), yy, 0, 0.018, ph - 0.008, d - 0.04, mix(sh(base, 0.8 + 0.3 * r()), DUST, i === 0 ? 0.35 : 0.1 * r()));
      }
    }
    const nt = Math.max(3, Math.round(w / 0.16)), tw = w / nt;
    for (let i = 0; i < nt; i++) b.box(-w / 2 + (i + 0.5) * tw, h - 0.009, 0, tw - 0.008, 0.018, d - 0.004, sh(base, 0.85 + 0.3 * r()));
    const bat = sh(base, 0.72), bt = 0.06;
    for (const s of [-1, 1]) {
      for (const e of [-1, 1]) { b.box(e * (w / 2 - bt / 2), h / 2, s * (d / 2 + 0.006), bt, h, 0.016, bat); b.box(s * (w / 2 + 0.006), h / 2, e * (d / 2 - bt / 2), 0.016, h, bt, bat); }
      for (const yy of [bt / 2, h - bt / 2]) { b.box(0, yy, s * (d / 2 + 0.006), w - 2 * bt, bt, 0.016, bat); b.box(s * (w / 2 + 0.006), yy, 0, 0.016, bt, d - 2 * bt, bat); }
      b.box(0, h + 0.006, s * (d / 2 - bt / 2), w, 0.014, bt, bat);
    }
    if (stencil) {                                    // blocky stencil lettering on the front (+Z)
      const sz = d / 2 + 0.0151, sc0 = stencil.col || [0.12, 0.12, 0.1], y0 = h * 0.55;
      for (let row = 0; row < 2; row++) { let xx = -w * 0.28; const cnt = row ? 6 : 4, lw = row ? 0.03 : 0.05, lh = row ? 0.035 : 0.06; for (let k = 0; k < cnt; k++) { if (r() > 0.12) b.box(xx, y0 - row * 0.09, sz, lw, lh, 0.002, sc0); xx += lw + 0.02; } }
      if (stencil.band) b.box(w * 0.22, y0 - 0.04, sz, 0.12, 0.12, 0.002, stencil.band);
      b.box(-w * 0.28 + 0.1, y0 - 0.17, sz, 0.22, 0.012, 0.002, sc0);
    }
    for (const s of [-1, 1]) b.tube([[s * (w / 2 + 0.014), h * 0.68, -0.08], [s * (w / 2 + 0.045), h * 0.62, -0.05], [s * (w / 2 + 0.045), h * 0.62, 0.05], [s * (w / 2 + 0.014), h * 0.68, 0.08]], 0.009, 5, ROPE);
    b.pop();
  }
  function jerrycan(b, x, z, ay, detail) {
    b.push(mulAll(tr(x, 0, z), rotY(ay)));
    const C = [0.33, 0.36, 0.22, 0.1], W = 0.165, H = 0.46, D = 0.34;
    b.box(0, H / 2 - 0.01, 0, W, H - 0.02, D, C);
    if (detail) {
      b.box(0, H - 0.01, 0, W - 0.02, 0.02, D - 0.02, C); b.box(0, 0.005, 0, W - 0.02, 0.01, D - 0.02, sh(C, 0.8));
      for (const s of [-1, 1]) {
        b.box(s * (W / 2 + 0.002), H / 2, 0, 0.004, H - 0.06, D - 0.04, sh(C, 0.9));
        b.beam([s * (W / 2 + 0.006), 0.06, -D / 2 + 0.05], [s * (W / 2 + 0.006), H - 0.07, D / 2 - 0.05], 0.035, sh(C, 1.12), 0.006);
        b.beam([s * (W / 2 + 0.006), 0.06, D / 2 - 0.05], [s * (W / 2 + 0.006), H - 0.07, -D / 2 + 0.05], 0.035, sh(C, 1.12), 0.006);
        b.box(s * (W / 2 + 0.004), H / 2, 0, 0.008, 0.012, D - 0.03, sh(C, 0.75));
      }
      for (let k = -1; k <= 1; k++) b.tube([[-0.02, H, k * 0.07 - 0.02], [-0.02, H + 0.04, k * 0.07 - 0.015], [-0.02, H + 0.04, k * 0.07 + 0.015], [-0.02, H, k * 0.07 + 0.02]], 0.008, 5, C);
      b.beam([-0.02, H + 0.04, -0.09], [-0.02, H + 0.04, 0.09], 0.016, C);
      b.cyl([0.02, H - 0.01, D / 2 - 0.05], [0.04, H + 0.04, D / 2 - 0.03], 0.024, 0.022, 10, C);
      b.cyl([0.04, H + 0.04, D / 2 - 0.03], [0.045, H + 0.055, D / 2 - 0.025], 0.026, 0.026, 10, sh(C, 0.8));
      b.box(-0.03, 0.1, 0, W + 0.012, 0.03, 0.08, mix(C, DUST, 0.5));
    }
    b.pop();
  }
  function buildSupply(detail) {
    const b = new MB(), r = rnd(606);
    const OLIVE_W = [0.40, 0.41, 0.28], GREYW = [0.55, 0.52, 0.46], PINE_W = [0.62, 0.50, 0.34];
    crate(b, -0.6, 0, -0.5, 0.04, 1.0, 0.72, 0.75, PINE_W, 11, { band: [0.75, 0.2, 0.12] }, detail);
    crate(b, -0.58, 0.725, -0.52, 0.11, 0.7, 0.48, 0.55, OLIVE_W, 12, { col: [0.88, 0.86, 0.78] }, detail);
    crate(b, 0.45, 0, -0.55, -0.06, 0.85, 0.6, 0.65, GREYW, 13, { band: [0.2, 0.35, 0.6] }, detail);
    crate(b, 0.0, 0, 0.35, 0.12, 1.2, 0.32, 0.4, sh(PINE_W, 0.85), 14, { col: [0.15, 0.15, 0.12] }, detail);
    crate(b, 1.15, 0, -0.7, 0.35, 0.45, 0.4, 0.4, sh(PINE_W, 1.08), 15, { col: [0.6, 0.15, 0.1] }, detail);
    // tarp folded on crate B, rock on top
    b.push(mulAll(tr(0.45, 0.6, -0.55), rotY(0.1)));
    const TC = [0.48, 0.52, 0.38];
    if (detail) {
      for (let k = 0; k < 4; k++) b.box((r() - 0.5) * 0.03, 0.017 + k * 0.03, (r() - 0.5) * 0.03, 0.72 - k * 0.01, 0.03, 0.5, sh(TC, 0.85 + 0.06 * k + 0.05 * r()));
      for (const s of [-1, 1]) b.surf(10, 4, (u, v) => [(u - 0.5) * 0.7, 0.015 + 0.105 * v, s * (0.25 + 0.015 * Math.sin(PI * v) + 0.006 * Math.sin(u * 30))], sh(TC, 0.8));
      b.surf(8, 6, (u, v) => [(u - 0.5) * 0.7, 0.125 + 0.01 * Math.sin(u * 9) * Math.sin(v * 7) - 0.015 * Math.exp(-((u - 0.45) ** 2 + (v - 0.5) ** 2) * 30), (v - 0.5) * 0.5], sh(TC, 1.05));
      for (let k = 0; k < 3; k++) b.box(0.3 + 0.01 * k, 0.05 + k * 0.03, 0.256, 0.02, 0.012, 0.002, [0.75, 0.72, 0.6]);
      rock(b, -0.05, 0.2, 0.0, 0.14, 0.08, 0.11, 1601, (d, u, v) => sh([0.56, 0.44, 0.34], 0.88 + 0.12 * Math.sin(u * 27 + v * 13) + 0.1 * d[1]), 12, 7, 0.6, 0.12);
    } else { b.box(0, 0.06, 0, 0.72, 0.12, 0.5, TC); b.box(-0.05, 0.19, 0, 0.26, 0.15, 0.2, [0.64, 0.5, 0.38]); }
    b.pop();
    // jerrycans
    jerrycan(b, 0.95, -0.02, 0.22, detail); jerrycan(b, 1.3, -0.1, -0.25, detail);
    // blue water barrel with tap
    b.push(tr(-1.42, 0, -0.45));
    const BL = [0.22, 0.40, 0.60, 0.1];
    if (detail) {
      b.lathe([[0, 0.0], [0.26, 0.0], [0.28, 0.02], [0.285, 0.12], [0.295, 0.14], [0.285, 0.16], [0.29, 0.43], [0.3, 0.45], [0.29, 0.47], [0.29, 0.73], [0.295, 0.75], [0.285, 0.77], [0.282, 0.86], [0.27, 0.885], [0.255, 0.89], [0, 0.89]], 22, (BL), 0, TAU);
      b.lathe([[0.282, 0.0], [0.282, 0.06], [0.284, 0.12]], 22, mix(BL, DUST, 0.6));
      b.lathe([[0.29, 0.6], [0.29, 0.86]], 22, sh(BL, 1.18));
      for (const [bx, bz] of [[0.14, 0.08], [-0.15, -0.06]]) { b.cyl([bx, 0.88, bz], [bx, 0.905, bz], 0.035, 0.035, 10, sh(BL, 0.8)); b.box(bx, 0.91, bz, 0.05, 0.008, 0.01, sh(BL, 0.7)); }
      b.cyl([0.0, 0.1, 0.28], [0.0, 0.1, 0.33], 0.022, 0.02, 8, [0.85, 0.85, 0.82]);
      b.cyl([0.0, 0.1, 0.33], [0.0, 0.06, 0.34], 0.012, 0.01, 8, [0.85, 0.85, 0.82]);
      b.box(0.0, 0.13, 0.33, 0.012, 0.04, 0.012, [0.8, 0.2, 0.12]);
      b.plate([-0.12, 0.6, 0.292], [0.12, 0.6, 0.292], [0.12, 0.7, 0.29], [-0.12, 0.7, 0.29], [0.92, 0.92, 0.88]);
      b.box(0, 0.65, 0.294, 0.16, 0.025, 0.002, [0.15, 0.25, 0.5]);
      rock(b, 0.05, 0.0, 0.42, 0.11, 0.06, 0.09, 1602, [0.6, 0.55, 0.5], 8, 4, 1, 0.2);
    } else { b.cyl([0, 0, 0], [0, 0.89, 0], 0.29, 0.29, 8, BL); }
    b.pop();
    // coil of climbing rope on crate D
    b.push(mulAll(tr(-0.05, 0.335, 0.33), rotY(0.4)));
    const RC = [0.82, 0.32, 0.12];
    if (detail) {
      const turns = 8, per = 20;
      for (let k = 0; k < turns; k++) { const pts = [], rr0 = 0.165 + 0.025 * Math.sin(k * 2.3), y0 = 0.015 + 0.022 * ((k * 0.618) % 1) + (k > 4 ? 0.02 : 0), ph = k * 0.7;
        for (let i = 0; i <= per; i++) { const a = i / per * TAU, rr = rr0 + 0.008 * Math.sin(a * 3 + ph); pts.push([Math.cos(a) * rr * 1.06, y0 + 0.006 * Math.sin(a * 2 + ph), Math.sin(a) * rr]); }
        b.tube(pts, 0.013, 5, sh(RC, 0.92 + 0.1 * Math.sin(k * 1.7))); }
      b.tube([[0.16, 0.03, 0.0], [0.24, 0.02, 0.05], [0.3, 0.0, 0.12], [0.32, -0.12, 0.17], [0.31, -0.25, 0.19]], 0.011, 5, sh(RC, 0.9));
      for (const a of [0.3, 0.3 + PI]) { const c = Math.cos(a), s = Math.sin(a); ring(b, [c * 0.16, 0.035, s * 0.15], 'x', 0.04, 0.009, [0.25, 0.25, 0.28], 10, 4); }
    } else b.cyl([0, 0, 0], [0, 0.06, 0], 0.17, 0.17, 8, RC);
    b.pop();
    // pick and shovel leaning against crate A
    if (detail) {
      const FZ = -0.5 + 0.375 + 0.02;
      const sB = [-0.92, -0.02, 0.4], sT = [-0.98, 0.95, FZ - 0.08];
      const dd = norm(sub(sT, sB));
      b.cyl(add(sB, scale(dd, 0.27)), sT, 0.017, 0.017, 8, [0.6, 0.46, 0.29]);
      b.tube([add(sT, scale(dd, -0.02)), add(add(sT, scale(dd, 0.05)), [-0.06, 0, 0]), add(add(sT, scale(dd, 0.16)), [-0.06, 0, 0]), add(add(sT, scale(dd, 0.16)), [0.06, 0, 0]), add(add(sT, scale(dd, 0.05)), [0.06, 0, 0]), add(sT, scale(dd, -0.02))], 0.01, 5, [0.2, 0.2, 0.2]);
      b.push(mulAll(along(sB, sT), tr(0, -Math.hypot(...sub(sT, sB)) / 2, 0)));
      b.cyl([0, 0.2, 0], [0, 0.33, 0], 0.024, 0.018, 8, [0.35, 0.36, 0.37, 0.2]);
      b.surf(10, 8, (u, v) => { const x = (u - 0.5) * 0.24 * (1 - 0.3 * (1 - v) ** 2), y = 0.29 * v; return [x, y, 0.035 * (2 * u - 1) ** 2 - 0.01]; }, (u, v) => v < 0.3 ? mix([0.45, 0.45, 0.43, 0.2], DUST, 0.6) : [0.38, 0.39, 0.4, 0.2]);
      b.pop();
      const pB = [-0.7, -0.02, 0.36], pT = [-0.72, 0.86, FZ - 0.02];
      b.cyl(pB, pT, 0.019, 0.022, 8, [0.62, 0.48, 0.3]);
      const pd = norm(sub(pT, pB)), side = [1, 0, 0], hc = add(pT, scale(pd, -0.03));
      const head = []; for (let i = 0; i <= 10; i++) { const t = i / 10 * 2 - 1; head.push(add(add(hc, scale(side, t * 0.28)), scale(pd, -0.06 * t * t))); }
      b.tube(head, t => 0.024 * (1 - Math.abs(2 * t - 1)) + 0.005, 6, [0.32, 0.3, 0.29, 0.15]);
      b.cyl(add(hc, scale(pd, -0.04)), add(hc, scale(pd, 0.04)), 0.032, 0.032, 8, [0.3, 0.28, 0.27, 0.15]);
    } else { b.beam([-0.92, 0, 0.4], [-0.98, 0.95, -0.2], 0.04, WOOD); b.beam([-0.7, 0, 0.36], [-0.72, 0.86, -0.15], 0.04, WOOD); }
    // storm lantern on crate E
    lantern(b, 1.13, 0.415, -0.7, 1, [0.66, 0.16, 0.11, 0.15], detail);
    // boots
    const boot = (x, z, ay, tip) => {
      b.push(mulAll(tr(x, 0, z), rotY(ay), rotZ(tip)));
      const L = [0.38, 0.26, 0.16];
      if (detail) {
        b.extrude([[-0.05, -0.13], [0.0, -0.14], [0.05, -0.12], [0.055, 0.05], [0.045, 0.14], [0.0, 0.155], [-0.045, 0.14], [-0.052, 0.05]], 0, 0.03, [0.12, 0.1, 0.08]);
        b.sphere(0, 0.07, 0.07, 0.052, 10, mix(L, DUST, 0.3), 0.055);
        b.box(0, 0.07, -0.02, 0.1, 0.08, 0.13, L);
        b.cyl([0, 0.03, -0.07], [0, 0.24, -0.075], 0.055, 0.058, 10, L);
        b.cyl([0, 0.235, -0.075], [0, 0.245, -0.075], 0.058, 0.058, 10, sh(L, 0.7));
        for (let k = 0; k < 5; k++) b.beam([-0.025, 0.09 + k * 0.03, 0.03 - k * 0.022], [0.025, 0.09 + k * 0.03, 0.03 - k * 0.022], 0.006, [0.7, 0.6, 0.4]);
        b.box(0, 0.12, 0.0, 0.05, 0.01, 0.08, sh(L, 0.8));
      } else b.box(0, 0.1, 0, 0.1, 0.2, 0.29, L);
      b.pop();
    };
    boot(-1.25, 0.15, 0.3, 0); boot(-1.05, 0.25, -0.5, PI / 2 - 0.15);
    // small generator with red fuel tank
    b.push(mulAll(tr(0.95, 0, 0.62), rotY(-0.35)));
    const GR = [0.72, 0.17, 0.11, 0.15], FR = [0.12, 0.12, 0.12, 0.15];
    if (detail) {
      for (const s of [-1, 1]) b.tube([[-0.27, 0.02, s * 0.2], [0.27, 0.02, s * 0.2], [0.29, 0.06, s * 0.2], [0.29, 0.4, s * 0.2], [0.26, 0.44, s * 0.2], [-0.26, 0.44, s * 0.2], [-0.29, 0.4, s * 0.2], [-0.29, 0.06, s * 0.2], [-0.27, 0.02, s * 0.2]], 0.014, 6, FR);
      for (const [x, y] of [[-0.29, 0.02], [0.29, 0.02], [-0.27, 0.44], [0.27, 0.44]]) b.cyl([x, y, -0.2], [x, y, 0.2], 0.013, 0.013, 6, FR);
      b.box(-0.04, 0.17, 0, 0.3, 0.22, 0.26, [0.3, 0.31, 0.3, 0.15]);
      for (let k = 0; k < 6; k++) b.box(-0.04, 0.1 + k * 0.025, 0.133, 0.26, 0.006, 0.006, [0.2, 0.2, 0.2]);
      b.cyl([-0.19, 0.18, 0], [-0.22, 0.18, 0], 0.09, 0.09, 14, GR);
      b.cyl([-0.22, 0.18, 0], [-0.235, 0.18, 0], 0.03, 0.03, 10, FR);
      b.cyl([0.17, 0.12, -0.08], [0.17, 0.12, 0.1], 0.05, 0.05, 12, [0.7, 0.71, 0.7, 0.3]);
      b.box(0.17, 0.17, 0.01, 0.12, 0.004, 0.2, [0.4, 0.4, 0.4, 0.2]);
      b.box(0.15, 0.28, 0.16, 0.18, 0.14, 0.03, [0.25, 0.25, 0.25]);
      for (const ox of [0.1, 0.18]) { b.box(ox, 0.27, 0.176, 0.04, 0.05, 0.004, [0.85, 0.85, 0.82]); b.box(ox, 0.27, 0.179, 0.006, 0.015, 0.003, BLACK); }
      b.box(0.22, 0.32, 0.177, 0.02, 0.02, 0.006, [0.85, 0.15, 0.1]);
      b.push(tr(0.0, 0.4, 0));
      b.box(0, 0, 0, 0.42, 0.12, 0.3, GR);
      b.box(0, 0.06, 0, 0.38, 0.01, 0.26, sh(GR, 1.08));
      for (const s of [-1, 1]) { b.box(0, 0, s * 0.15, 0.4, 0.1, 0.012, sh(GR, 0.9)); b.box(s * 0.21, 0, 0, 0.012, 0.1, 0.28, sh(GR, 0.9)); }
      b.cyl([0.1, 0.06, 0.05], [0.1, 0.085, 0.05], 0.035, 0.035, 12, FR);
      b.box(-0.08, 0.066, -0.05, 0.12, 0.002, 0.06, [0.9, 0.85, 0.6]);
      b.box(0.0, 0.02, 0.152, 0.16, 0.04, 0.002, [0.92, 0.92, 0.88]);
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
