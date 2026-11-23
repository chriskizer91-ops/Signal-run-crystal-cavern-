window.MODDEF = { fn: (function (K) {
  // Dripstone kit for the stalactite cavern (Signal Run).
  // Unit items (stalactite, stalactite_cluster, soda_straws, stalagmite, stalagmite_cluster, column, drapery):
  //   built along +Y from the rock (y = 0) to the tip at y = 1.0 exactly, base sunk to y = -0.12.
  //   The game scales y by the length L and x/z by L x a width factor, and turns +Y onto the surface normal.
  // Natural-size items (flowstone, helictites, glowworm_threads): metres, rock at y = 0, +Y away from the rock.
  // Calcite colour: rgb = calcite tint (squared by the shader), a = translucency (0 thick .. 1 thin, light shines through).
  // glowworm_threads uses the glow-life channels: rgb = colour, a = glow strength.
  const { MB, rnd, norm, sub, cross, dot } = K;
  const PI = Math.PI, TAU = PI * 2, cl = v => Math.max(0, Math.min(1, v));
  const ss = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3] || 0, b[3] || 0, t)];
  const A = (c, a) => [c[0], c[1], c[2], cl(a)];

  // ---------- calcite palette ----------
  const IVORY = [0.96, 0.93, 0.85], CREAM = [0.91, 0.85, 0.71], HONEY = [0.87, 0.69, 0.43], AMBER = [0.80, 0.54, 0.28];
  const OCHRE = [0.71, 0.51, 0.29], MUD = [0.50, 0.35, 0.22], DMUD = [0.38, 0.27, 0.17], WATER = [0.98, 0.97, 0.94];

  // ---------- triangle soup with smooth normals (shared by position within a group) ----------
  const Soup = () => ({ p: [], c: [], g: [], t: [] });
  const V = (S, p, c, g) => { S.p.push(p); S.c.push(c); S.g.push(g || 0); return S.p.length - 1; };
  const T = (S, a, b, c) => { S.t.push(a, b, c); };
  const Q = (S, a, b, c, d) => { S.t.push(a, b, c, a, c, d); };
  const fnorm = (S, a, b, c) => cross(sub(S.p[b], S.p[a]), sub(S.p[c], S.p[a]));
  const QW = (S, a, b, c, d, want) => { if (dot(fnorm(S, a, b, c), want) < 0) Q(S, a, d, c, b); else Q(S, a, b, c, d); };   // quad facing `want`
  const TO = (S, a, b, c, ctr) => { const m = [(S.p[a][0] + S.p[b][0] + S.p[c][0]) / 3, (S.p[a][1] + S.p[b][1] + S.p[c][1]) / 3, (S.p[a][2] + S.p[b][2] + S.p[c][2]) / 3]; if (dot(fnorm(S, a, b, c), sub(m, ctr)) < 0) T(S, a, c, b); else T(S, a, b, c); };   // triangle facing away from ctr
  function emit(S) {
    const mb = new MB(), key = i => S.g[i] + ':' + Math.round(S.p[i][0] * 1e5) + ',' + Math.round(S.p[i][1] * 1e5) + ',' + Math.round(S.p[i][2] * 1e5);
    const keys = S.p.map((_, i) => key(i)), acc = new Map();
    for (let i = 0; i < S.t.length; i += 3) {
      const n = fnorm(S, S.t[i], S.t[i + 1], S.t[i + 2]);
      for (let k = 0; k < 3; k++) { const kk = keys[S.t[i + k]], o = acc.get(kk); if (o) { o[0] += n[0]; o[1] += n[1]; o[2] += n[2]; } else acc.set(kk, [n[0], n[1], n[2]]); }
    }
    const ids = S.p.map((p, i) => { let n = acc.get(keys[i]) || [0, 1, 0]; if (Math.hypot(n[0], n[1], n[2]) < 1e-14) n = [0, 1, 0]; return mb.v(p[0], p[1], p[2], n[0], n[1], n[2], S.c[i]); });
    for (let i = 0; i < S.t.length; i += 3) mb.tri(ids[S.t[i]], ids[S.t[i + 1]], ids[S.t[i + 2]]);
    return mb;
  }
  // unit items: stretch y so the base plane y = -0.12 stays put and the highest point lands on y = 1.0 exactly
  function unit(S) {
    let m = -1e9; for (const p of S.p) m = Math.max(m, p[1]);
    const y0 = -0.12, k = (1 - y0) / (m - y0);
    for (const p of S.p) { p[1] = y0 + (p[1] - y0) * k; if (Math.abs(p[1] - 1) < 1e-9) p[1] = 1; }
    return emit(S);
  }

  // smooth periodic wobble round a ring: f(a) in about -1..1
  const wob = (R, n, f0) => { const ph = [], am = []; let tot = 0; for (let i = 0; i < n; i++) { ph.push(R() * TAU); const a = (0.6 + 0.8 * R()) / (i + 1); am.push(a); tot += a; } return a => { let s = 0; for (let i = 0; i < n; i++) s += am[i] * Math.sin((i + (f0 || 1)) * a + ph[i]); return s / tot; }; };

  // ---------- ring stack round +Y ----------
  // rings: [{y, r, x, z, m(a) radius factor, dy(a), c colour or fn(a), cu colour for the strip above}], n sides, ph start angle
  // cap {y, x, z, c, g}: apex closing the last ring (a point above it, or a shallow cup / hole below it)
  function spire(S, rings, n, ph, cap, g) {
    const pos = rings.map(rg => { const row = []; for (let s = 0; s < n; s++) { const a = ph + s * TAU / n, r = rg.r * (rg.m ? rg.m(a) : 1); row.push([(rg.x || 0) + r * Math.cos(a), rg.y + (rg.dy ? rg.dy(a) : 0), (rg.z || 0) + r * Math.sin(a)]); } return row; });
    const col = (c, s) => typeof c === 'function' ? c(ph + s * TAU / n) : c;
    for (let k = 0; k < rings.length - 1; k++) {
      const lo = [], hi = [], cLo = rings[k].cu || rings[k].c, cHi = rings[k + 1].c;
      for (let s = 0; s < n; s++) { lo.push(V(S, pos[k][s], col(cLo, s), g)); hi.push(V(S, pos[k + 1][s], col(cHi, s), g)); }
      for (let s = 0; s < n; s++) Q(S, lo[s], hi[s], hi[(s + 1) % n], lo[(s + 1) % n]);
    }
    if (cap) {
      const L = rings.length - 1, rg = rings[L], cg = cap.g === undefined ? g : cap.g, row = [];
      const ap = V(S, [cap.x === undefined ? (rg.x || 0) : cap.x, cap.y, cap.z === undefined ? (rg.z || 0) : cap.z], cap.c, cg);
      for (let s = 0; s < n; s++) row.push(V(S, pos[L][s], col(cap.cr || rg.cu || rg.c, s), cg));
      for (let s = 0; s < n; s++) T(S, row[s], ap, row[(s + 1) % n]);
    }
  }

  // ---------- round tube along a polyline, ending in a point ----------
  function tube(S, pts, rf, n, cf, tipLen, tipC, g) {
    const N = pts.length; let up = [0.3, 0.2, 1]; const rows = [];
    let d = [0, 1, 0];
    for (let i = 0; i < N; i++) {
      d = norm(sub(pts[Math.min(i + 1, N - 1)], pts[Math.max(i - 1, 0)])); if (Math.abs(dot(d, norm(up))) > 0.95) up = [1, 0, 0];
      const s = norm(cross(d, up)), u = cross(s, d); up = u; const r = rf(i / (N - 1)), c = cf(i / (N - 1)), row = [];
      for (let k = 0; k < n; k++) { const a = k / n * TAU, ca = Math.cos(a), sa = Math.sin(a); row.push(V(S, [pts[i][0] + (s[0] * ca + u[0] * sa) * r, pts[i][1] + (s[1] * ca + u[1] * sa) * r, pts[i][2] + (s[2] * ca + u[2] * sa) * r], c, g)); }
      rows.push(row);
    }
    for (let i = 0; i < N - 1; i++) for (let k = 0; k < n; k++) Q(S, rows[i][k], rows[i + 1][k], rows[i + 1][(k + 1) % n], rows[i][(k + 1) % n]);
    const e = pts[N - 1], ap = V(S, [e[0] + d[0] * tipLen, e[1] + d[1] * tipLen, e[2] + d[2] * tipLen], tipC, g), L = rows[N - 1];
    for (let k = 0; k < n; k++) T(S, L[k], ap, L[(k + 1) % n]);
  }

  // =====================================================================
  // STALACTITE: carrot body, faint growth rings, thin soda-straw end with a drip point at `top`
  // o: x, z, y0 (root ring, hidden), y1 (first visible ring), top, r0, rs (straw radius), sl (straw length), n, nb (body rings),
  //    lean [x, z] (tip offset as a fraction of length), seed, lo (no separate straw end ring), amp (lumpiness)
  function stalactite(S, o) {
    const R = rnd(o.seed), n = o.n, ph = R() * TAU, top = o.top, rs = o.rs, yS = top - o.sl, lumpA = wob(R, 3, 1), lumpB = wob(R, 2, 2);
    const lx = o.lean ? o.lean[0] : 0, lz = o.lean ? o.lean[1] : 0, wp = R() * TAU, wa = 0.006 * top, amp = o.amp === undefined ? 0.13 : o.amp;
    const axis = y => { const t = Math.max(0, y) / top; return [o.x + lx * top * t * t + wa * Math.sin(t * 7 + wp) * t, o.z + lz * top * t * t + wa * Math.cos(t * 6 + wp) * t]; };
    const rad = y => rs * 1.25 + (o.r0 - rs * 1.25) * Math.pow(1 - cl(y / yS), 0.85);
    const tint = (y, k) => {   // dirty ochre root -> honey -> cream body -> ivory tip; faint alternating growth bands
      const t = cl(y / top); let c = t < 0.35 ? mix(OCHRE, HONEY, ss(0, 0.35, t)) : mix(HONEY, CREAM, ss(0.35, 0.8, t));
      c = mix(c, IVORY, ss(0.75, 1, t)); if (k % 2) c = mix(c, AMBER, 0.3 * (1 - 0.6 * t)); else c = mix(c, IVORY, 0.15);
      return A(c, 0.04 + 0.4 * t * t);
    };
    const ring = (y, r, k, ampK) => { const [x, z] = axis(y), aa = amp * ampK; return { y, r, x, z, m: a => 1 + aa * lumpA(a + k * 0.35) + aa * 0.5 * lumpB(a - k * 0.5), c: tint(y, k) }; };
    const rings = [ring(o.y0, Math.max(rad(Math.max(o.y0, 0)), o.r0) * (o.y0 < 0 ? 1.22 : 1.05), 0, 1.2)];
    for (let i = 0; i < o.nb; i++) {
      const t = o.nb > 1 ? i / o.nb : 0, y = o.y1 + (yS - o.y1) * Math.pow(t, 0.92);
      rings.push(ring(y, rad(y) * (i % 2 ? 1.035 : 0.97), i + 1, 1 - t));
    }
    rings.push(Object.assign(ring(yS, rs * 1.2, 0, 0), { c: A(mix(CREAM, IVORY, 0.6), 0.8) }));
    if (!o.lo) rings.push(Object.assign(ring(top - rs * 1.3, rs * 1.1, 0, 0), { c: A(IVORY, 0.9) }));
    const [tx, tz] = axis(top);
    spire(S, rings, n, ph, { y: top, x: tx, z: tz, c: A(WATER, 0.97) });
  }

  function stalactiteItem(detail) {
    const S = Soup();
    if (detail) stalactite(S, { x: 0, z: 0, y0: -0.12, y1: 0, top: 1, r0: 0.06, rs: 0.0085, sl: 0.075, n: 8, nb: 6, lean: [0.03, -0.02], seed: 11 });
    else stalactite(S, { x: 0, z: 0, y0: -0.12, y1: 0.38, top: 1, r0: 0.06, rs: 0.011, sl: 0.07, n: 5, nb: 1, lean: [0.03, -0.02], seed: 11, lo: true, amp: 0.08 });
    return unit(S);
  }

  // lumpy shared base on the rock (clusters): ellipse rx x rz, height h
  function baseMound(S, o) {
    const R = rnd(o.seed), w = wob(R, 3, 1), w2 = wob(R, 3, 2), ph = R() * TAU;
    const ell = a => 1 / Math.sqrt(Math.pow(Math.cos(a) / o.rx, 2) + Math.pow(Math.sin(a) / o.rz, 2));
    const rings = o.prof.map(([rho, y, c], k) => ({ y, r: rho, m: a => ell(a) * (1 + 0.14 * w(a + k * 0.4)), dy: a => (k > 0 ? o.h * 0.25 * w2(a) * rho : 0), c, cu: c }));
    spire(S, rings, o.n, ph, { y: o.h, c: o.capC });
    return (x, z) => {   // rough surface height at (x, z), for placing pieces
      const a = Math.atan2(z, x), rho = Math.hypot(x, z) / ell(a);
      for (let k = o.prof.length - 1; k > 0; k--) { const [r0, y0] = o.prof[k], [r1, y1] = o.prof[k - 1]; if (rho <= r0) return lerp(o.h, y0, rho / r0); if (rho <= r1) return lerp(y0, y1, (rho - r0) / (r1 - r0)); }
      return o.prof[0][1];
    };
  }

  // =====================================================================
  function stalactiteCluster(detail) {
    const S = Soup(), hi = detail > 0;
    const hB = baseMound(S, hi
      ? { seed: 21, rx: 0.2, rz: 0.165, h: 0.09, n: 10, prof: [[1, -0.12, A(OCHRE, 0.03)], [0.85, 0.03, A(mix(OCHRE, HONEY, 0.5), 0.05)], [0.5, 0.075, A(HONEY, 0.08)]], capC: A(mix(HONEY, CREAM, 0.4), 0.1) }
      : { seed: 21, rx: 0.2, rz: 0.165, h: 0.085, n: 6, prof: [[1, -0.12, A(OCHRE, 0.03)], [0.6, 0.065, A(HONEY, 0.06)]], capC: A(HONEY, 0.1) });
    // [x, z, top, r0, lean x, lean z, sides hi, body rings hi, sides lo, body rings lo]
    const L = [
      [0.015, -0.01, 1.0, 0.05, 0.02, -0.015, 8, 5, 5, 1],
      [-0.085, 0.045, 0.74, 0.041, -0.05, 0.03, 7, 4, 4, 1],
      [0.09, 0.055, 0.55, 0.035, 0.06, 0.04, 6, 4, 3, 1],
      [0.05, -0.09, 0.4, 0.03, 0.03, -0.07, 6, 3, 3, 0],
      [-0.1, -0.06, 0.27, 0.025, -0.07, -0.04, 5, 2, 0, 0],
      [-0.02, 0.105, 0.17, 0.02, -0.02, 0.08, 5, 1, 0, 0]
    ];
    L.forEach(([x, z, top, r0, lx, lz, nh, bh, nl, bl], q) => {
      const y1 = hB(x, z) - 0.008, sl = Math.min(0.07, top * 0.1);
      if (hi) stalactite(S, { x, z, y0: 0, y1, top, r0, rs: 0.0075, sl, n: nh, nb: bh, lean: [lx, lz], seed: 30 + q });
      else if (nl) stalactite(S, { x, z, y0: 0, y1: bl ? y1 + (top - y1) * 0.3 : y1, top, r0, rs: 0.011, sl, n: nl, nb: bl, lean: [lx, lz], seed: 30 + q, lo: true, amp: 0.07 });
    });
    return unit(S);
  }

  // =====================================================================
  // SODA STRAWS: thin hollow tubes of mixed lengths, a few with a hanging drip
  function sodaStraws(detail) {
    const S = Soup(), R = rnd(41), hi = detail > 0;
    const Ls = [1.0, 0.83, 0.71, 0.6, 0.52, 0.44, 0.37, 0.31, 0.25, 0.2, 0.15, 0.11], drip = { 2: 1, 5: 1, 8: 1 };
    Ls.forEach((L, i) => {
      const a = i * 2.39996 + R() * 0.5, d = i === 0 ? 0.01 : 0.05 + 0.13 * Math.sqrt(i / Ls.length) + R() * 0.02;
      const x = Math.cos(a) * d, z = Math.sin(a) * d, ro = 0.0165 + 0.003 * R(), bx = (R() - 0.5) * 0.03 * L, bz = (R() - 0.5) * 0.03 * L;
      const tone = R(), body = mix(mix(CREAM, IVORY, 0.6), HONEY, tone * 0.55), root = mix(body, OCHRE, 0.45), ph = R() * TAU;
      if (!hi) { if (i < 8) spire(S, [{ y: -0.12, r: ro * 1.3, x, z, c: A(root, 0.3) }, { y: L, r: ro, x: x + bx, z: z + bz, c: A(body, 0.85) }], 3, ph); return; }
      const rings = [{ y: -0.12, r: ro * 1.4, x, z, c: A(root, 0.25) }];
      if (L >= 0.5) rings.push({ y: L * 0.5, r: ro * 1.02, x: x + bx * 0.3, z: z + bz * 0.3, c: A(mix(root, body, 0.7), 0.6) });
      const ex = x + bx, ez = z + bz;
      if (drip[i]) {   // drip bulb: the straw swells into a clear water drop
        rings.push({ y: L, r: ro, x: ex, z: ez, c: A(body, 0.88) });
        rings.push({ y: L + ro * 1.3, r: ro * 1.3, x: ex, z: ez, c: A(WATER, 1) });
        spire(S, rings, 5, ph, { y: L + ro * 2.8, x: ex, z: ez, c: A(WATER, 1) });
      } else {          // open end: a dark hole sunk into the tip
        rings.push({ y: L, r: ro, x: ex, z: ez, c: A(body, 0.9) });
        spire(S, rings, 5, ph, { y: L - ro * 2.5, x: ex, z: ez, c: A(DMUD, 0.4), cr: A(mix(body, AMBER, 0.4), 0.7), g: 1 + i });
      }
    });
    return unit(S);
  }

  // =====================================================================
  // STALAGMITE: candle-like stack of rounded lobes, rounded top with a shallow splash cup
  // o: x, z, y0 (root), foot (y of a visible foot ring or null), y1 (first lobe), H (top), r (girth), k (lobes), n, seed, rootR
  function stalagmite(S, o) {
    const R = rnd(o.seed), n = o.n, ph = R() * TAU, lumpA = wob(R, 3, 1), lumpB = wob(R, 2, 3), r = o.r, rings = [];
    const lump = (k, s) => a => 1 + s * lumpA(a + k * 0.7) + s * 0.6 * lumpB(a - k * 0.4);
    const rootR = o.rootR || r * 1.85;
    rings.push({ y: o.y0, r: rootR, x: o.x, z: o.z, m: lump(0, 0.1), c: A(MUD, 0.02) });
    if (o.foot !== null && o.foot !== undefined) rings.push({ y: o.foot, r: r * 1.55, x: o.x, z: o.z, m: lump(1, 0.12), c: A(OCHRE, 0.04) });
    const bulgeR = i => r * (1.16 - 0.3 * (o.k > 1 ? i / (o.k - 1) : 0.5)) * (1 + (R() - 0.5) * 0.08);
    const radii = []; for (let i = 0; i < o.k; i++) radii.push(bulgeR(i));
    const rb = radii[o.k - 1], yL = o.H - rb * 1.45;
    let px = o.x, pz = o.z;
    for (let i = 0; i < o.k; i++) {
      const y = o.k > 1 ? lerp(o.y1, yL, i / (o.k - 1)) : yL, ox = o.x + (R() - 0.5) * r * 0.3, oz = o.z + (R() - 0.5) * r * 0.3;
      const t = y / o.H, lob = mix(i % 2 ? HONEY : CREAM, IVORY, 0.35 * t);
      rings.push({ y, r: radii[i], x: ox, z: oz, m: lump(i + 2, 0.07), c: A(lob, 0.1 + 0.15 * t) });
      if (i < o.k - 1) {   // neck between lobes: a darker mud band
        const y2 = o.k > 1 ? lerp(o.y1, yL, (i + 0.5) / (o.k - 1)) : y, band = i % 2 ? MUD : mix(OCHRE, AMBER, 0.5);
        rings.push({ y: y2, r: (radii[i] + radii[i + 1]) * 0.5 * 0.82, x: (ox + o.x) / 2, z: (oz + o.z) / 2, m: lump(i + 9, 0.05), c: A(band, 0.06) });
      }
      px = ox; pz = oz;
    }
    // rounded wet top and the splash-cup rim at H
    rings.push({ y: o.H - rb * 0.48, r: rb * 0.8, x: px, z: pz, m: lump(20, 0.04), c: A(mix(CREAM, IVORY, 0.6), 0.3) });
    rings.push({ y: o.H, r: rb * 0.42, x: px, z: pz, c: A(IVORY, 0.5) });
    spire(S, rings, n, ph, { y: o.H - Math.min(0.012, rb * 0.15), x: px, z: pz, c: A(WATER, 0.7) });
  }
  function stalagmiteLo(S, o) {   // 3 bands + cup: foot, belly, neck, rim
    const R = rnd(o.seed), r = o.r, ph = R() * TAU, rings = [{ y: o.y0, r: o.rootR || r * 1.85, x: o.x, z: o.z, c: A(MUD, 0.02) }];
    if (o.mid) rings.push({ y: lerp(o.y1, o.H, 0.35), r: r * 1.1, x: o.x, z: o.z, c: A(CREAM, 0.1), cu: A(HONEY, 0.1) });
    rings.push({ y: lerp(o.y1, o.H, 0.78), r: r * 0.85, x: o.x, z: o.z, c: A(mix(OCHRE, MUD, 0.4), 0.06) });
    rings.push({ y: o.H, r: r * 0.45, x: o.x, z: o.z, c: A(IVORY, 0.45) });
    spire(S, rings, o.n, ph, { y: o.H - 0.01 * o.H, c: A(WATER, 0.7) });
  }

  function stalagmiteItem(detail) {
    const S = Soup();
    if (detail) stalagmite(S, { x: 0, z: 0, y0: -0.12, foot: 0.02, y1: 0.14, H: 1, r: 0.095, k: 4, n: 8, seed: 51, rootR: 0.175 });
    else stalagmiteLo(S, { x: 0, z: 0, y0: -0.12, y1: 0.02, H: 1, r: 0.095, n: 5, seed: 51, rootR: 0.175, mid: true });
    return unit(S);
  }

  // =====================================================================
  function stalagmiteCluster(detail) {
    const S = Soup(), hi = detail > 0;
    const hB = baseMound(S, hi
      ? { seed: 61, rx: 0.43, rz: 0.35, h: 0.125, n: 12, prof: [[1.0, -0.12, A(MUD, 0.03)], [0.9, 0.02, A(OCHRE, 0.12)], [0.62, 0.08, A(mix(HONEY, AMBER, 0.4), 0.25)], [0.3, 0.115, A(CREAM, 0.2)]], capC: A(CREAM, 0.2) }
      : { seed: 61, rx: 0.43, rz: 0.35, h: 0.12, n: 6, prof: [[1.0, -0.12, A(MUD, 0.03)], [0.55, 0.08, A(HONEY, 0.2)]], capC: A(CREAM, 0.2) });
    // [x, z, H, r, lobes, sides hi, sides lo]
    const L = [[0.02, 0.0, 1.0, 0.082, 4, 8, 5], [-0.17, 0.08, 0.7, 0.068, 3, 7, 4], [0.16, 0.1, 0.46, 0.058, 2, 7, 3], [0.05, -0.15, 0.3, 0.05, 2, 6, 0], [-0.13, -0.12, 0.2, 0.042, 1, 5, 0]];
    L.forEach(([x, z, H, r, k, nh, nl], q) => {
      const y1 = hB(x, z) + r * 0.5;
      if (hi) stalagmite(S, { x, z, y0: 0, foot: null, y1, H, r, k, n: nh, seed: 70 + q, rootR: r * 1.5 });
      else if (nl) stalagmiteLo(S, { x, z, y0: 0, y1, H, r, n: nl, seed: 70 + q, rootR: r * 1.4, mid: q === 0 });
    });
    return unit(S);
  }

  // =====================================================================
  // COLUMN: flared base, narrow waist, flared top meeting the ceiling at y = 1; fluted, lumpy, banded
  function column(detail) {
    const S = Soup(), R = rnd(81), hi = detail > 0, F = 8, phF = R() * TAU, lumpA = wob(R, 3, 1), lumpB = wob(R, 3, 2);
    const bands = [MUD, HONEY, CREAM, OCHRE, IVORY, AMBER, CREAM, DMUD, HONEY, CREAM, OCHRE, HONEY];
    const prof = hi
      ? [[-0.12, 0.3], [0, 0.27], [0.07, 0.2], [0.16, 0.155], [0.28, 0.125], [0.42, 0.108], [0.55, 0.1], [0.67, 0.106], [0.79, 0.126], [0.89, 0.162], [0.955, 0.205], [1.0, 0.245]]
      : [[-0.12, 0.29], [0.13, 0.165], [0.55, 0.1], [0.87, 0.155], [1.0, 0.245]];
    const flute = y => 0.15 * ss(0.05, 0.3, y) * (1 - ss(0.85, 1.0, y)) + 0.04;
    const rings = prof.map(([y, r], k) => {
      const fa = hi ? flute(y) : 0, la = 0.07 + 0.08 * (1 - ss(0, 0.25, y)) + 0.06 * ss(0.8, 1, y), sx = (R() - 0.5) * 0.035, sz = (R() - 0.5) * 0.035;
      const base = hi ? bands[k] : [MUD, CREAM, DMUD, CREAM, OCHRE][k], lit = 0.1 + 0.15 * ss(0.3, 0.6, y) * (1 - ss(0.6, 0.9, y));
      const c = a => { const f = Math.cos(F * a + phF + y * 1.5); return A(mix(f > 0 ? mix(base, IVORY, 0.25 * f) : mix(base, MUD, -0.3 * f), CREAM, 0.1), lit + 0.06 * f); };
      return { y, r, x: sx, z: sz, cu: hi ? undefined : [null, A(AMBER, 0.15), null, A(HONEY, 0.15), null][k] || undefined, m: a => 1 + fa * Math.cos(F * a + phF + y * 1.5) + la * lumpA(a + k * 0.5) + 0.03 * lumpB(a - k), c };
    });
    rings[0].x = rings[0].z = 0; rings[rings.length - 1].x = rings[rings.length - 1].z = 0;
    spire(S, rings, hi ? 16 : 7, R() * TAU);
    return unit(S);
  }

  // =====================================================================
  // DRAPERY: thin wavy flowstone curtain ("bacon strip") hanging along +Y, coloured bands parallel to the lower edge,
  // translucent thin edge. Two-sided: front and back sheets plus edge strips.
  function drapery(detail) {
    const S = Soup(), R = rnd(91), hi = detail > 0, nu = hi ? 8 : 3;
    const vs = hi ? [0, 0.12, 0.24, 0.35, 0.46, 0.57, 0.67, 0.77, 0.88, 1] : [0, 0.32, 0.6, 0.83, 1];
    const cols = hi ? [OCHRE, CREAM, AMBER, CREAM, MUD, HONEY, IVORY, mix(AMBER, MUD, 0.4), IVORY] : [OCHRE, mix(CREAM, AMBER, 0.5), MUD, IVORY];
    const up = 0.7, ph = R() * TAU, ph2 = R() * TAU;
    const Lu = u => { const e = u <= up ? (up - u) / up : (u - up) / (1 - up), drop = u <= up ? 0.34 : 0.14; return 1 - drop * e * e + 0.025 * Math.sin(u * 11 + ph2) * e; };
    const mid = (u, v) => {
      const y = -0.12 + (Lu(u) + 0.12) * v, yy = Math.max(0, y), W = 0.5 * (1 - 0.32 * yy), x = (u - 0.5) * W + 0.03 * yy * yy;
      const Am = 0.045 + 0.035 * yy, arg = TAU * 1.3 * u + ph + 1.2 * yy, z = Am * Math.sin(arg) + 0.06 * yy * yy;
      const dzdx = Am * Math.cos(arg) * TAU * 1.3 / W, n = norm([-dzdx, 0, 1]), th = 0.004 + 0.03 * Math.pow(1 - v, 1.2);
      return { p: [x, y, z], n, th };
    };
    const P = (u, v, side) => { const m = mid(u, v), h = m.th * 0.5 * side; return [m.p[0] + m.n[0] * h, m.p[1] + m.n[1] * h, m.p[2] + m.n[2] * h]; };
    const alpha = v => 0.08 + 0.87 * ss(0.4, 1, v);
    const colAt = (j, v) => A(cols[j], alpha(v));
    for (let j = 0; j < vs.length - 1; j++) {
      for (const side of [1, -1]) {
        const ids = [];
        for (let i = 0; i <= nu; i++) for (const v of [vs[j], vs[j + 1]]) ids.push(V(S, P(i / nu, v, side), colAt(j, v), side > 0 ? 1 : 2));
        for (let i = 0; i < nu; i++) {
          const a = ids[i * 2], b = ids[i * 2 + 1], c = ids[i * 2 + 3], d = ids[i * 2 + 2], m = mid((i + 0.5) / nu, (vs[j] + vs[j + 1]) / 2).n;
          QW(S, a, b, c, d, side > 0 ? m : [-m[0], -m[1], -m[2]]);
        }
      }
      if (hi) for (const [u, out] of [[0, [-1, 0, 0]], [1, [1, 0, 0]]]) {   // side edges
        const v0 = vs[j], v1 = vs[j + 1];
        QW(S, V(S, P(u, v0, 1), colAt(j, v0), 3), V(S, P(u, v1, 1), colAt(j, v1), 3), V(S, P(u, v1, -1), colAt(j, v1), 3), V(S, P(u, v0, -1), colAt(j, v0), 3), out);
      }
    }
    const jl = vs.length - 2;   // lower edge strip
    for (let i = 0; i < nu; i++) {
      const u0 = i / nu, u1 = (i + 1) / nu, c = colAt(jl, 1);
      QW(S, V(S, P(u0, 1, 1), c, 3), V(S, P(u1, 1, 1), c, 3), V(S, P(u1, 1, -1), c, 3), V(S, P(u0, 1, -1), c, 3), [0, 1, 0]);
    }
    return unit(S);
  }

  // =====================================================================
  // FLOWSTONE (metres): lumpy frozen-waterfall blanket ~2.4 x 2.0 m, 0.7 m high, rippled terraces stepping down and out
  function flowstone(detail) {
    const S = Soup(), R = rnd(101), hi = detail > 0, cx = 0, cz = -0.3, edge = wob(R, 4, 1), lump = wob(R, 4, 2), streak = wob(R, 3, 5);
    const lips = [wob(R, 3, 2), wob(R, 3, 3), wob(R, 3, 2)], tongue = wob(R, 3, 5);
    const dist = a => {   // from the peak (cx, cz) to the ellipse 1.2 x 1.0 along direction a, with a lumpy outline
      const dx = Math.cos(a), dz = Math.sin(a), qa = dx * dx / 1.21 + dz * dz / 0.9, qb = 2 * (cx * dx / 1.21 + cz * dz / 0.9), qc = cx * cx / 1.21 + cz * cz / 0.9 - 1;
      return (-qb + Math.sqrt(qb * qb - 4 * qa * qc)) / (2 * qa) * (1 + 0.07 * edge(a));
    };
    const tone = (c, a, k) => mix(c, a > 0 ? IVORY : MUD, Math.abs(a) * k);
    // [rho, height m, colour, translucency, terrace index for the lip wobble, lumpiness]
    const prof = hi ? [
      [1.06, -0.1, MUD, 0.03, -1, 0], [1.0, 0.025, OCHRE, 0.12, -1, 0.3], [0.86, 0.05, mix(AMBER, MUD, 0.3), 0.1, 2, 0.5], [0.8, 0.145, mix(CREAM, IVORY, 0.4), 0.5, 2, 0.5],
      [0.61, 0.2, mix(AMBER, OCHRE, 0.5), 0.12, 1, 0.6], [0.55, 0.33, mix(CREAM, IVORY, 0.3), 0.45, 1, 0.6], [0.36, 0.4, AMBER, 0.12, 0, 0.7], [0.3, 0.56, CREAM, 0.4, 0, 0.7],
      [0.14, 0.64, mix(CREAM, HONEY, 0.4), 0.25, -1, 0.8]
    ] : [[1.06, -0.1, MUD, 0.03, -1, 0], [0.95, 0.035, OCHRE, 0.1, -1, 0.3], [0.72, 0.16, mix(HONEY, CREAM, 0.5), 0.35, 1, 0.5], [0.34, 0.47, mix(CREAM, AMBER, 0.4), 0.3, 0, 0.7]];
    const rings = prof.map(([rho, h, c, al, li, lp], k) => ({
      y: h, r: rho, x: cx, z: cz,
      m: a => dist(a) * (1 + (li >= 0 ? 0.13 * lips[li](a) : 0) + 0.1 * rho * rho * tongue(a)),
      dy: a => lp * 0.05 * lump(a + k * 0.3) + (li >= 0 ? 0.07 * lips[li](a + 1.3) : 0) + 0.1 * rho * Math.min(0, Math.sin(a)) * (k > 0 ? 1 : 0),
      c: a => { const s = streak(a * 1.3 + k * 0.2); return A(tone(mix(c, HONEY, 0.35), s, 0.3), al + 0.08 * s); }
    }));
    spire(S, rings, hi ? 16 : 7, R() * TAU, { y: 0.7, x: cx, z: cz, c: A(mix(CREAM, HONEY, 0.3), 0.25) });
    return emit(S);
  }

  // =====================================================================
  // HELICTITES (metres): a ~0.6 m patch of thin twisting calcite growths curling every direction from a crust
  function helictites(detail) {
    const S = Soup(), R = rnd(111), hi = detail > 0, rx = 0.22, rz = 0.17, crustH = 0.045;
    const w = wob(R, 3, 1);
    spire(S, [...(hi ? [{ y: -0.035, r: 1, m: a => Math.hypot(Math.cos(a) * rx, Math.sin(a) * rz) * (1 + 0.15 * w(a)), c: A(OCHRE, 0.05) }] : []),
              { y: hi ? 0.03 : -0.02, r: hi ? 0.6 : 0.95, m: a => Math.hypot(Math.cos(a) * rx, Math.sin(a) * rz) * (1 + 0.15 * w(a + 1)), dy: a => 0.01 * w(a * 2), c: A(mix(HONEY, CREAM, 0.5), 0.15) }],
          hi ? 8 : 5, R() * TAU, { y: crustH, c: A(CREAM, 0.2) });
    const N = hi ? 9 : 3;
    for (let j = 0; j < N; j++) {
      const i = hi ? j : [0, 4, 6][j], Ri = rnd(120 + i), a0 = i * 2.39996 + Ri() * 0.6, rr = 0.15 + 0.55 * Math.sqrt((i + 0.5) / 10);
      const x0 = Math.cos(a0) * rx * rr, z0 = Math.sin(a0) * rz * rr, y0 = crustH * (1 - rr * rr) + 0.005;
      const long = i < 4, len = long ? 0.2 + 0.12 * Ri() : 0.08 + 0.1 * Ri(), segs = hi ? (long ? 6 : 3) : 2;
      let d = norm([Math.cos(a0) * (0.4 + rr), 0.8 + 0.4 * Ri(), Math.sin(a0) * (0.4 + rr)]);
      const axis = norm([Ri() - 0.5, Ri() - 0.5, Ri() - 0.5]), twist = (Ri() < 0.5 ? -1 : 1) * (0.9 + 0.9 * Ri());
      const pts = [[x0, y0 - 0.012, z0]];
      let p = [x0, y0, z0];
      // smooth twisting path: the direction swings round a random axis, plus a kink at each step
      const fine = 12, step = len / fine;
      const path = [p.slice()];
      for (let s = 0; s < fine; s++) {
        const ca = Math.cos(twist * 0.3), sa = Math.sin(twist * 0.3), k = axis, kd = dot(k, d), kx = cross(k, d);
        d = norm([d[0] * ca + kx[0] * sa + k[0] * kd * (1 - ca) + (Ri() - 0.5) * 0.3, d[1] * ca + kx[1] * sa + k[1] * kd * (1 - ca) + (Ri() - 0.5) * 0.3, d[2] * ca + kx[2] * sa + k[2] * kd * (1 - ca) + (Ri() - 0.5) * 0.3]);
        if (p[1] < 0.04 && d[1] < 0.1) d = norm([d[0], 0.4, d[2]]);
        p = [p[0] + d[0] * step, p[1] + d[1] * step, p[2] + d[2] * step];
        path.push(p.slice());
      }
      if (hi) for (let s = 1; s <= segs; s++) pts.push(path[Math.round(s * fine / segs)]);
      else { pts.length = 0; pts.push([x0, y0 - 0.01, z0], path[6], path[12]); }
      const tint = Ri(), body = mix(IVORY, HONEY, 0.25 * tint);
      tube(S, pts, t => (hi ? 0.0075 : 0.011) * (1 - 0.4 * t), 3, t => A(mix(mix(HONEY, CREAM, 0.4), body, ss(0, 0.4, t)), 0.35 + 0.5 * t), hi ? 0.012 : 0.02, A(WATER, 0.95), 10 + i);
    }
    return emit(S);
  }

  // =====================================================================
  // GLOWWORM THREADS (metres, glow-life channels: a = glow): silk threads hanging along +Y with glowing droplets,
  // a few glowing larvae at the top. Threads are crossed thin quads so they show from any angle.
  function glowworms(detail) {
    const S = Soup(), R = rnd(131), hi = detail > 0;
    const SILK = [0.5, 0.66, 0.7], BEAD = [0.18, 0.85, 0.72], BEAD2 = [0.2, 0.72, 0.95], LARVA = [0.55, 1.0, 0.82], BODY = [0.5, 0.62, 0.55];
    const N = 30, th = [];
    for (let i = 0; i < N; i++) {
      const a = i * 2.39996 + R() * 0.4, d = 0.3 * Math.sqrt((i + 0.5) / N) * (0.85 + 0.3 * R());
      const L = i === 7 ? 0.6 : 0.05 + 0.5 * Math.pow(R(), 1.7), beads = [{ t: 1, s: 0.007 + 0.004 * R() }];
      if (i % 3 === 0 && L > 0.12) beads.push({ t: 0.35 + 0.3 * R(), s: 0.005 + 0.002 * R() });
      th.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, L, beads, hue: R() < 0.7 ? BEAD : BEAD2, rot: R() * PI, sway: [(R() - 0.5) * 0.02, (R() - 0.5) * 0.02] });
    }
    const order = th.map((t, i) => i).sort((a, b) => th[b].L - th[a].L);
    const thread = t => {   // two crossed quads, wide-ish at the top, thinner below
      const w0 = 0.0022, w1 = 0.0014, top = [t.x, -0.004, t.z], bot = [t.x + t.sway[0], t.L, t.z + t.sway[1]];
      for (const ang of [t.rot, t.rot + PI / 2]) {
        const ax = Math.cos(ang), az = Math.sin(ang), n = [-az, 0, ax], g = 500 + Math.round(ang * 100);
        const a = V(S, [top[0] - ax * w0, top[1], top[2] - az * w0], A(SILK, 0.1), g), b = V(S, [bot[0] - ax * w1, bot[1], bot[2] - az * w1], A(mix(SILK, t.hue, 0.3), 0.06), g);
        const c = V(S, [bot[0] + ax * w1, bot[1], bot[2] + az * w1], A(mix(SILK, t.hue, 0.3), 0.06), g), d = V(S, [top[0] + ax * w0, top[1], top[2] + az * w0], A(SILK, 0.1), g);
        QW(S, a, b, c, d, n);
      }
    };
    let gid = 1000;
    const bead = (c, s, col, rot, stretch) => {   // small glowing droplet: a tetrahedron stretched along the thread
      const cr = Math.cos(rot), sr = Math.sin(rot), g = gid++;
      const P = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(q => { const k = s / Math.sqrt(3); return [c[0] + (q[0] * cr - q[2] * sr) * k, c[1] + q[1] * k * stretch, c[2] + (q[0] * sr + q[2] * cr) * k]; });
      const id = P.map(p => V(S, p, col, g));
      for (const [a, b, d] of [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]]) TO(S, id[a], id[b], id[d], c);
    };
    const beadsOf = (t, big) => t.beads.forEach(b => {
      if (!hi && b.t < 1) return;
      const s = b.s * big, y = t.L * b.t + (b.t === 1 ? s * 0.5 : 0);
      bead([t.x + t.sway[0] * b.t, y, t.z + t.sway[1] * b.t], s, A(mix(t.hue, [0.6, 1, 0.92], b.t === 1 ? 0.15 : 0), b.t === 1 ? 0.9 : 0.75), t.rot, 1.5);
    });
    if (hi) { th.forEach(t => { thread(t); beadsOf(t, 1); }); }
    else { order.slice(0, 3).forEach(i => thread(th[i])); order.slice(0, 7).forEach(i => beadsOf(th[i], 1.6)); }
    // glowing larvae lying along the rock among the thread roots (hi only): stretched 3-sided bipyramids, tail glows brightest
    if (hi) for (let i = 0; i < 3; i++) {
      const t = th[order[i * 3 + 1]], a = R() * TAU, dx = Math.cos(a), dz = Math.sin(a), Lb = 0.028 + 0.01 * R(), rb = 0.0045, c = [t.x + dx * 0.006, 0.006, t.z + dz * 0.006];
      const g = gid++, head = V(S, [c[0] - dx * Lb / 2, c[1], c[2] - dz * Lb / 2], A(BODY, 0.35), g), tail = V(S, [c[0] + dx * Lb / 2, c[1] + 0.002, c[2] + dz * Lb / 2], A(LARVA, 1.0), g);
      const ring = [0, 1, 2].map(k => { const b = k / 3 * TAU, oy = Math.cos(b) * rb, os = Math.sin(b) * rb; return V(S, [c[0] - dz * os, c[1] + oy, c[2] + dx * os], A(mix(BODY, LARVA, 0.6), 0.75), g); });
      for (let k = 0; k < 3; k++) { TO(S, head, ring[k], ring[(k + 1) % 3], c); TO(S, tail, ring[(k + 1) % 3], ring[k], c); }
    }
    return emit(S);
  }

  return {
    name: 'dripstone',
    items: [
      { name: 'stalactite', budget: 140, build: stalactiteItem, colliders: [] },
      { name: 'stalactite_cluster', budget: 520, build: stalactiteCluster, colliders: [] },
      { name: 'soda_straws', budget: 260, build: sodaStraws, colliders: [] },
      { name: 'stalagmite', budget: 180, build: stalagmiteItem, colliders: [] },
      { name: 'stalagmite_cluster', budget: 520, build: stalagmiteCluster, colliders: [] },
      { name: 'column', budget: 360, build: column, colliders: [] },
      { name: 'drapery', budget: 360, build: drapery, colliders: [] },
      { name: 'flowstone', budget: 300, build: flowstone, colliders: [] },
      { name: 'helictites', budget: 300, build: helictites, colliders: [] },
      { name: 'glowworm_threads', budget: 300, build: glowworms, colliders: [] }
    ]
  };
}) };
