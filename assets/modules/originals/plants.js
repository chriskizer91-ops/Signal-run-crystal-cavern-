window.MODDEF = { fn: (function (K) {
  // Desert vegetation of Utah / Arizona canyon country. Drawn instanced (random Y turn, 0.7-1.3x size, tint),
  // so every plant is irregular from all sides and budgets are tight. Origin = ground point; roots go to y = -0.4.
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd, norm, sub, add, scale, cross, dot, lerp } = K;
  const cl = v => Math.max(0, Math.min(1, v));
  const mix = (a, b, t) => [cl(a[0] + (b[0] - a[0]) * t), cl(a[1] + (b[1] - a[1]) * t), cl(a[2] + (b[2] - a[2]) * t)];
  const shade = (c, k) => [cl(c[0] * k), cl(c[1] * k), cl(c[2] * k)];
  const apply = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  const PI = Math.PI;

  // ---------- shared shapes ----------
  const ICO = (() => {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    return { v, f };
  })();
  const OCT = { v: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], f: [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]] };

  // jittered low-poly clump (foliage mass, leaf tuft, bell, fruit). Normals blend the clump's own radial with a
  // larger centre nC so a group of clumps shades like one soft crown. col(p, n, k) gives the vertex colour.
  function clump(b, poly, c, s, rx, ry, r, jit, col, nC, nMix, rz) {
    const m = mulAll(tr(c[0], c[1], c[2]), rotY(ry), rotX(rx), sc(s[0], s[1], s[2]), rotZ(rz || 0)), k = 0.86 + 0.24 * r();
    const ids = poly.v.map(v0 => {
      const j = 1 - jit + 2 * jit * r(), q = jit * 0.8, p = apply(m, [v0[0] * j + (r() - 0.5) * q, v0[1] * j + (r() - 0.5) * q, v0[2] * j + (r() - 0.5) * q]);
      const d1 = norm(sub(p, c)), d2 = nC ? norm(sub(p, nC)) : d1, w = nC ? nMix : 0;
      const n = norm([d1[0] * (1 - w) + d2[0] * w, d1[1] * (1 - w) + d2[1] * w + 0.35, d1[2] * (1 - w) + d2[2] * w]);
      return b.v(p[0], p[1], p[2], n[0], n[1], n[2], col(p, n, k));
    });
    for (const f of poly.f) b.tri(ids[f[0]], ids[f[1]], ids[f[2]]);
  }

  // round limb along points with optional spiral ridges (fibrous / twisted grain). rf(t) radius, col(t, a, bump).
  function limb(b, pts, rf, segs, col, rg) {
    const n = pts.length; let up = [0, 1, 0]; const rings = [];
    for (let i = 0; i < n; i++) {
      const d = norm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)]));
      if (Math.abs(dot(d, up)) > 0.95) up = [1, 0, 0];
      const s = norm(cross(d, up)), u = cross(s, d); up = u;
      const t = i / (n - 1), rr0 = rf(t), ring = [];
      for (let k = 0; k < segs; k++) {
        const a = k / segs * 2 * PI, ca = Math.cos(a), sa = Math.sin(a);
        const ph = rg ? rg.n * a + rg.tw * t + (rg.ph || 0) : 0, bump = rg ? Math.cos(ph) : 0, rr = rr0 * (1 + (rg ? rg.amp * bump : 0));
        const dir = [s[0] * ca + u[0] * sa, s[1] * ca + u[1] * sa, s[2] * ca + u[2] * sa];
        const tg = [-s[0] * sa + u[0] * ca, -s[1] * sa + u[1] * ca, -s[2] * sa + u[2] * ca], q = rg ? 0.6 * rg.amp * rg.n * Math.sin(ph) : 0;
        const p = pts[i];
        ring.push(b.v(p[0] + dir[0] * rr, p[1] + dir[1] * rr, p[2] + dir[2] * rr, dir[0] + tg[0] * q, dir[1] + tg[1] * q, dir[2] + tg[2] * q, col(t, a, bump)));
      }
      rings.push(ring);
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < segs; k++) b.quad(rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]);
  }
  // quadratic curve a -> b bending towards ctrl, n+1 points, with small random wobble (zero at the ends)
  function curve(a, ctrl, c, n, r, wob) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = add(add(scale(a, (1 - t) * (1 - t)), scale(ctrl, 2 * t * (1 - t))), scale(c, t * t)), w = (wob || 0) * Math.sin(PI * t);
      pts.push([p[0] + (r() - 0.5) * 2 * w, p[1] + (r() - 0.5) * w, p[2] + (r() - 0.5) * 2 * w]);
    }
    return pts;
  }
  // tapered blade strip (grass, yucca leaf): centre line fn(t), side vector, half-width wf(t); fold > 0 adds a midrib
  function blade(b, fn, side, wf, stations, colf, fold) {
    let prev = null;
    for (let i = 0; i < stations.length; i++) {
      const t = stations[i], p = fn(t), p2 = fn(Math.min(1, t + 0.02)), p1 = fn(Math.max(0, t - 0.02)), d = norm(sub(p2, p1)), nb = norm(cross(side, d)), w = wf(t);
      if (i === stations.length - 1) { const tip = b.v(p[0], p[1], p[2], nb[0], nb[1], nb[2], colf(t, 0.5)); if (prev.length === 3) { b.tri(prev[0], prev[1], tip); b.tri(prev[1], prev[2], tip); } else b.tri(prev[0], prev[1], tip); break; }
      const L = sub(p, scale(side, w)), R = add(p, scale(side, w)), ids = [b.v(L[0], L[1], L[2], nb[0], nb[1], nb[2], colf(t, 0))];
      if (fold) { const M = add(p, scale(nb, fold * w / 0.02)); ids.push(b.v(M[0], M[1], M[2], nb[0], nb[1], nb[2], colf(t, 0.5))); }
      ids.push(b.v(R[0], R[1], R[2], nb[0], nb[1], nb[2], colf(t, 1)));
      if (prev) { if (ids.length === 3) { b.quad(prev[0], prev[1], ids[1], ids[0]); b.quad(prev[1], prev[2], ids[2], ids[1]); } else b.quad(prev[0], prev[1], ids[1], ids[0]); }
      prev = ids;
    }
  }
  const horizSide = d => { const s = cross(d, [0, 1, 0]); return Math.hypot(s[0], s[1], s[2]) < 1e-6 ? [1, 0, 0] : norm(s); };
  const dirOf = (az, el) => [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
  // random point inside an ellipsoid, biased to the outer shell
  function inEll(r, c, rad, shell) { let u; do { u = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]; } while (Math.hypot(u[0], u[1], u[2]) > 1 || Math.hypot(u[0], u[1], u[2]) < 0.05); const l = Math.hypot(u[0], u[1], u[2]), f = Math.pow(l, 1 - shell) / l; return [c[0] + u[0] * f * rad[0], c[1] + u[1] * f * rad[1], c[2] + u[2] * f * rad[2]]; }
  // foliage colour: dark low / inside, light and yellower on top and outside
  function folCol(DARK, LIGHT, y0, y1, R) { return (p, n, k) => { const h = cl((p[1] - y0) / (y1 - y0)), e = cl(Math.hypot(p[0], p[2]) / R); return shade(mix(DARK, LIGHT, cl(0.05 + 0.4 * h + 0.32 * n[1] + 0.22 * e)), k); }; }
  // bark colour: ridges light, grooves dark, small speckle
  function barkCol(r, D, Lt, extra) { return (t, a, bump) => { let c = mix(D, Lt, cl(0.5 + 0.55 * bump + (r() - 0.5) * 0.3)); return extra ? extra(c, t, a) : c; }; }

  // ---------- 1. Utah juniper ----------
  function juniper(detail) {
    const b = new MB(), r = rnd(1101);
    const BARK_D = [0.22, 0.18, 0.15], BARK_L = [0.46, 0.41, 0.36], BLEACH_D = [0.60, 0.57, 0.52], BLEACH = [0.86, 0.83, 0.76];
    const FD = [0.09, 0.12, 0.09], FL = [0.35, 0.40, 0.32];
    const F = [0.06, 0.7, -0.04], J1 = [0.42, 1.25, 0.18], J2 = [-0.38, 1.35, -0.12];
    const masses = [
      { c: [1.05, 1.55, 0.3], rad: [0.75, 0.5, 0.7], n: 16, from: J1 },
      { c: [-0.95, 2.0, -0.4], rad: [0.8, 0.58, 0.75], n: 17, from: J2 },
      { c: [0.25, 2.7, 0.15], rad: [0.75, 0.52, 0.7], n: 16, from: J1 },
      { c: [0.45, 1.0, -0.95], rad: [0.6, 0.42, 0.55], n: 11, from: F },
      { c: [-0.45, 1.45, 0.95], rad: [0.55, 0.45, 0.6], n: 11, from: J2 },
      { c: [-0.25, 3.15, -0.4], rad: [0.42, 0.36, 0.4], n: 6, from: J2 },
    ];
    const fcol = folCol(FD, FL, 0.6, 3.5, 1.6);
    const bc = barkCol(r, BARK_D, BARK_L);
    if (detail) {
      limb(b, curve([0, -0.4, 0], [-0.12, 0.25, 0.1], F, 5, r, 0.02), t => 0.29 - 0.09 * t + 0.14 * Math.max(0, 0.35 - t) / 0.35, 10, bc, { n: 5, amp: 0.15, tw: 3.5 });
      limb(b, curve(F, [0.3, 0.85, 0.15], J1, 4, r, 0.04), t => 0.19 - 0.06 * t, 8, bc, { n: 4, amp: 0.13, tw: 2.5 });
      limb(b, curve(F, [-0.3, 0.9, 0.05], J2, 4, r, 0.04), t => 0.19 - 0.06 * t, 8, bc, { n: 4, amp: 0.13, tw: -2.5, ph: 1 });
      for (const M of masses) {
        const end = lerp(M.from, M.c, 0.85), mid = lerp(M.from, end, 0.5), ctrl = [mid[0] + (r() - 0.5) * 0.5, mid[1] - 0.1 + r() * 0.2, mid[2] + (r() - 0.5) * 0.5];
        const r0 = M.from === F ? 0.12 : 0.11;
        limb(b, curve(M.from, ctrl, end, 4, r, 0.08), t => r0 * (1 - 0.65 * t), 6, bc, { n: 3, amp: 0.12, tw: 2 });
        for (let k = 0; k < 3; k++) { const tp = inEll(r, M.c, M.rad.map(v => v * 0.8), 0.5); limb(b, curve(end, lerp(end, tp, 0.5).map((v, i) => v + (i === 1 ? 0.1 : (r() - 0.5) * 0.2)), tp, 2, r, 0), t => 0.035 * (1 - 0.7 * t), 3, bc); }
      }
      // dead bleached limb with spiral grain, broken pointed tip and a spur
      const dl = curve(J2, [-0.9, 1.5, 0.5], [-1.45, 2.6, 1.05], 4, r, 0.06), dc = barkCol(r, BLEACH_D, BLEACH);
      limb(b, dl, t => 0.12 * (1 - 0.8 * t), 6, dc, { n: 3, amp: 0.18, tw: 4 });
      limb(b, curve(dl[2], add(dl[2], [-0.1, 0.25, 0.05]), add(dl[2], [-0.15, 0.55, -0.15]), 2, r, 0), t => 0.03 * (1 - 0.9 * t), 4, dc);
      // foliage: a dark core per mass so it reads dense, then many small separate clumps with gaps
      for (const M of masses) clump(b, ICO, [M.c[0], M.c[1] - 0.05, M.c[2]], M.rad.map(v => v * 0.62), 0, r() * 6.3, r, 0.2, (q, n, kk) => shade(fcol(q, n, kk), 0.72), M.c, 0.3);
      for (const M of masses) for (let k = 0; k < M.n; k++) {
        const p = inEll(r, M.c, M.rad, 0.75), s = 0.19 + 0.14 * r(), inner = Math.hypot((p[0] - M.c[0]) / M.rad[0], (p[1] - M.c[1]) / M.rad[1], (p[2] - M.c[2]) / M.rad[2]);
        if (p[1] < M.c[1] - 0.4 * M.rad[1]) p[1] = M.c[1] - 0.4 * M.rad[1] + r() * 0.1;
        const col = inner < 0.6 ? (q, n, kk) => shade(fcol(q, n, kk), 0.78) : fcol;
        clump(b, ICO, p, [s, s * (0.8 + 0.2 * r()), s * (0.85 + 0.3 * r())], (r() - 0.5) * 0.8, r() * 6.3, r, 0.32, col, M.c, 0.45, r() * 3);
      }
      // a few blue-grey berries
      const BER = [0.55, 0.62, 0.72];
      for (let k = 0; k < 6; k++) { const M = masses[k % 6], d = norm([r() - 0.5, r() * 0.6, r() - 0.5]), p = [M.c[0] + d[0] * M.rad[0] * 1.02, M.c[1] + d[1] * M.rad[1] * 0.9, M.c[2] + d[2] * M.rad[2] * 1.02]; clump(b, OCT, p, [0.035, 0.035, 0.035], 0, 0, r, 0.1, () => BER, null, 0); }
    } else {
      limb(b, [[0, -0.4, 0], F, [0.15, 1.6, 0.05]], t => 0.27 - 0.15 * t, 5, () => [0.36, 0.31, 0.26]);
      limb(b, [F, J2, [-1.45, 2.6, 1.05]], t => 0.12 * (1 - 0.9 * t), 3, () => [0.78, 0.75, 0.68]);
      for (const M of masses) clump(b, ICO, M.c, [M.rad[0] * 1.1, M.rad[1] * 1.35, M.rad[2] * 1.1], (r() - 0.5) * 0.3, r() * 6.3, r, 0.18, (q, n, kk) => shade(fcol(q, n, kk), 0.8), [0, 1.8, 0], 0.4);
    }
    return b;
  }

  // ---------- 2. Pinyon pine ----------
  function pinyon(detail) {
    const b = new MB(), r = rnd(2207);
    const BARK_D = [0.22, 0.18, 0.15], BARK_L = [0.44, 0.37, 0.31], DEAD = [0.54, 0.51, 0.46];
    const ND = [0.07, 0.10, 0.06], NL = [0.25, 0.28, 0.15];
    const top = [0.95, 4.0, 0.35], trunk = curve([0, -0.4, 0], [0.8, 1.2, 0.2], top, 8, r, 0.05);
    const tAt = t => { const f = t * (trunk.length - 1), i = Math.min(trunk.length - 2, Math.floor(f)); return lerp(trunk[i], trunk[i + 1], f - i); };
    const fcol = folCol(ND, NL, 1.2, 4.6, 2.0), bc = barkCol(r, BARK_D, BARK_L);
    // branch layout: [t on trunk, azimuth, length, rise]
    const br = [], N = 7;
    for (let i = 0; i < N; i++) br.push({ t: 0.42 + 0.46 * i / (N - 1) + (r() - 0.5) * 0.04, az: i * 2.4 + (r() - 0.5) * 0.6, L: 1.75 - 0.95 * i / (N - 1) + r() * 0.3, rise: 0.15 + r() * 0.35 });
    const pads = [];
    for (const B of br) {
      const s = tAt(B.t), d = dirOf(B.az, 0), e = [s[0] + d[0] * B.L, s[1] + B.rise + 0.2 * B.L, s[2] + d[2] * B.L];
      B.s = s; B.e = e; B.ctrl = [s[0] + d[0] * B.L * 0.5, s[1] + B.rise * 0.1, s[2] + d[2] * B.L * 0.5];
      pads.push({ c: [e[0] - d[0] * 0.1, e[1] + 0.1, e[2] - d[2] * 0.1], rad: [0.55 + 0.25 * r(), 0.22 + 0.1 * r(), 0.55 + 0.25 * r()], n: 9, tilt: (r() - 0.5) * 0.5 });
    }
    pads.push({ c: [top[0], top[1] + 0.1, top[2]], rad: [0.5, 0.42, 0.5], n: 11, tilt: 0 });
    if (detail) {
      limb(b, trunk, t => 0.24 - 0.17 * t + 0.1 * Math.max(0, 0.15 - t) / 0.15, 8, bc, { n: 4, amp: 0.1, tw: 1.5 });
      for (const B of br) {
        const pts = curve(B.s, B.ctrl, B.e, 3, r, 0.08); limb(b, pts, t => 0.075 - 0.05 * t, 5, bc, { n: 2, amp: 0.1, tw: 1 });
        for (let k = 0; k < 2; k++) { const a = pts[1 + k], tp = add(a, [(r() - 0.5) * 0.7, 0.2 + r() * 0.25, (r() - 0.5) * 0.7]); limb(b, [a, tp], t => 0.03 * (1 - 0.6 * t), 3, bc); pads.push({ c: add(tp, [0, 0.06, 0]), rad: [0.32, 0.15, 0.32], n: 2, tilt: (r() - 0.5) * 0.6 }); }
      }
      // bare lower branches (dead, grey) with broken tips
      for (const [t, az, L] of [[0.3, 2.2, 1.15], [0.36, 4.6, 0.9]]) {
        const s = tAt(t), d = dirOf(az, 0.12), e = add(s, scale(d, L)), dc = barkCol(r, [0.42, 0.39, 0.35], DEAD);
        const pts = curve(s, add(s, scale(d, L * 0.5)), add(e, [0, 0.1, 0]), 2, r, 0.05); limb(b, pts, t => 0.065 * (1 - 0.85 * t), 4, dc);
        limb(b, [pts[1], add(pts[1], [d[2] * 0.25, 0.18, -d[0] * 0.25])], t => 0.02 * (1 - 0.8 * t), 3, dc);
      }
      // layered needle clumps: flattened, tilted, separate
      for (const P of pads) for (let k = 0; k < P.n; k++) {
        const p = inEll(r, P.c, P.rad, 0.4), s = 0.22 + 0.16 * r();
        p[1] += (p[0] - P.c[0]) * P.tilt * 0.3;
        clump(b, ICO, p, [s, s * (0.55 + 0.2 * r()), s * (0.9 + 0.3 * r())], (r() - 0.5) * 0.5 + P.tilt * 0.3, r() * 6.3, r, 0.36, fcol, [P.c[0], P.c[1] - 0.25, P.c[2]], 0.42);
      }
    } else {
      limb(b, [trunk[0], trunk[4], top], t => 0.24 - 0.17 * t, 4, () => [0.32, 0.27, 0.23]);
      for (const B of br) limb(b, [B.s, B.e], t => 0.07 - 0.04 * t, 2, () => [0.32, 0.27, 0.23]);
      { const s = tAt(0.22), e = add(s, scale(dirOf(2.2, 0), 0.9)); limb(b, [s, e], t => 0.05 * (1 - 0.8 * t), 3, () => DEAD); }
      for (let i = 0; i < pads.length; i++) { const P = pads[i]; clump(b, ICO, P.c, [P.rad[0] * 1.05, P.rad[1] * 1.5, P.rad[2] * 1.05], P.tilt * 0.3, r() * 6.3, r, 0.2, fcol, [P.c[0], P.c[1] - 0.3, P.c[2]], 0.5); }
    }
    return b;
  }

  // ---------- 3. Big sagebrush ----------
  function sagebrush(detail) {
    const b = new MB(), r = rnd(3313);
    const STEM_D = [0.26, 0.23, 0.20], STEM_L = [0.44, 0.41, 0.36], LD = [0.18, 0.22, 0.18], LL = [0.41, 0.45, 0.38], STRAW = [0.72, 0.63, 0.40];
    const fcol = folCol(LD, LL, 0.15, 0.95, 0.6), sc_ = barkCol(r, STEM_D, STEM_L);
    const tips = [];
    const NS = detail ? 13 : 2;
    for (let i = 0; i < NS; i++) {
      const az = i * 2.4 + (r() - 0.5) * 0.7, el = detail ? 0.5 + r() * 0.8 : 0.9 + i * 0.15, L = detail ? 0.5 + r() * 0.38 : 0.7;
      const s = [(r() - 0.5) * 0.1, 0.04, (r() - 0.5) * 0.1], d = dirOf(az, el), e = add(s, scale(d, L));
      e[1] = Math.min(e[1], 0.78);
      tips.push({ s, e, d, ctrl: add(s, add(scale(d, L * 0.5), [0, -0.06, 0])) });
    }
    if (detail) {
      limb(b, curve([0, -0.4, 0], [0.04, -0.1, -0.02], [0, 0.08, 0], 2, r, 0.01), t => 0.055 - 0.015 * t, 4, sc_);
      const tufts = [];
      tips.forEach((T, i) => {
        const pts = curve(T.s, T.ctrl, T.e, 2, r, 0.04);
        limb(b, pts, t => 0.016 * (1 - 0.6 * t), 3, sc_);
        tufts.push(T.e);
        if (i < 8) { const a = pts[1], tp = add(a, add(scale(T.d, 0.16), [(r() - 0.5) * 0.2, 0.12 + r() * 0.1, (r() - 0.5) * 0.2])); limb(b, [a, tp], t => 0.009, 3, sc_); tufts.push(tp); }
      });
      while (tufts.length < 40) { const T = tips[tufts.length % tips.length]; tufts.push(lerp(T.s, T.e, 0.35 + r() * 0.45).map((v, i) => v + (r() - 0.5) * 0.1)); }
      tufts.slice(0, 28).forEach((p, i) => { const big = i < 14, s = big ? 0.12 + 0.05 * r() : 0.08 + 0.04 * r(), ry = Math.atan2(p[0], p[2]); clump(b, big ? ICO : OCT, [p[0], p[1] + 0.03, p[2]], [s, s * (big ? 0.8 : 1.2), s * 0.9], 0.2 + r() * 0.3, ry, r, 0.3, fcol, [0, 0.15, 0], 0.45, (r() - 0.5) * 0.4); });
      // straw flower spikes sticking up above the bush
      for (let i = 0; i < 6; i++) {
        const T = tips[(i * 3 + 1) % tips.length], base = T.e, tp = add(base, [(r() - 0.5) * 0.1, 0.16 + r() * 0.12, (r() - 0.5) * 0.1]);
        limb(b, [base, tp], () => 0.006, 3, () => STRAW);
        clump(b, OCT, lerp(base, tp, 0.75), [0.022, 0.07, 0.022], (r() - 0.5) * 0.3, r() * 6.3, r, 0.2, () => shade(STRAW, 0.9 + 0.2 * r()), null, 0);
      }
    } else {
      limb(b, [[0, -0.4, 0], [0, 0.1, 0]], () => 0.05, 3, () => STEM_D);
      for (const T of tips) limb(b, [T.s, T.e], () => 0.02, 3, () => STEM_D);
      const blobs = [[0.32, 0.5, 0.1, 0.27], [-0.3, 0.55, -0.15, 0.27], [0.02, 0.58, 0.33, 0.25], [-0.08, 0.52, -0.38, 0.24], [0, 0.74, 0, 0.24]];
      for (const [x, y, z, s] of blobs) clump(b, OCT, [x, y, z], [s * 1.1, s * 0.85, s], 0.4, r() * 6.3, r, 0.25, fcol, [0, 0.2, 0], 0.4, 0.5);
    }
    return b;
  }

  // ---------- 4. Narrowleaf yucca ----------
  function yucca(detail) {
    const b = new MB(), r = rnd(4421);
    const BL = [0.25, 0.37, 0.34], EDGE = [0.46, 0.54, 0.45], BASE = [0.50, 0.50, 0.33], TIPC = [0.55, 0.48, 0.34], DEAD = [0.72, 0.63, 0.44], DEAD_D = [0.50, 0.42, 0.30];
    const STALK = [0.44, 0.41, 0.27], CREAM = [0.88, 0.85, 0.70];
    const NB = detail ? 30 : 14;
    for (let i = 0; i < NB; i++) {
      const f = i / NB, az = i * 2.39996 + (r() - 0.5) * 0.3, el = 1.45 - 0.95 * Math.sqrt(f) + (r() - 0.5) * 0.15, L = 0.5 + 0.2 * r();
      const d = dirOf(az, el), s0 = [d[0] * 0.04, 0.02, d[2] * 0.04], side = horizSide(d), droop = 0.06 * Math.cos(el);
      const fn = t => [s0[0] + d[0] * L * t, s0[1] + d[1] * L * t - droop * t * t, s0[2] + d[2] * L * t];
      const k = 0.88 + 0.22 * r(), colf = (t, e) => shade(mix(mix(BASE, BL, cl(t * 5)), EDGE, Math.abs(e - 0.5) * 2 * 0.5), k * (t > 0.85 ? 0.92 : 1)).map((v, j) => t > 0.9 ? cl(v * 0.6 + TIPC[j] * 0.4) : v);
      if (detail) blade(b, fn, side, t => 0.024 * Math.pow(1 - t, 0.7) * (t < 0.12 ? 0.6 + t * 3.3 : 1), [0, 0.25, 0.5, 0.75, 1], colf, 0.006);
      else { const tip = fn(1), w = 0.04; b.plate(sub(s0, scale(side, w)), add(s0, scale(side, w)), tip, tip, mix(BL, EDGE, 0.3)); }
    }
    // dead straw blades drooping at the base
    const ND = detail ? 7 : 3;
    for (let i = 0; i < ND; i++) {
      const az = i * 0.9 + r() * 0.5, el = 0.35 + r() * 0.3, L = 0.42 + r() * 0.15, d = dirOf(az, el), s0 = [d[0] * 0.05, 0.03, d[2] * 0.05], side = horizSide(d);
      const fn = t => [s0[0] + d[0] * L * t * (1 + 0.2 * t), Math.max(0.012, s0[1] + d[1] * L * t - 0.3 * t * t), s0[2] + d[2] * L * t * (1 + 0.2 * t)];
      if (detail) blade(b, fn, side, t => 0.017 * Math.pow(1 - t, 0.6), [0, 0.35, 0.7, 1], (t, e) => mix(DEAD_D, DEAD, cl(0.3 + t)), 0.004);
      else { const tip = fn(1), w = 0.035; b.plate(sub(s0, scale(side, w)), add(s0, scale(side, w)), tip, tip, DEAD); }
    }
    // flower stalk with cream bell clusters near the top
    const stalk = [[0, -0.4, 0], [0.01, 0.15, 0.0], [0.04, 0.8, 0.02], [0.08, 1.4, 0.04], [0.1, 1.82, 0.06]];
    if (detail) {
      limb(b, stalk, t => 0.032 - 0.02 * t, 5, t => mix(STALK, [0.66, 0.62, 0.46], t));
      const sAt = h => { const t = (h - 0.15) / (1.82 - 0.15); return [0.01 + 0.09 * t, h, 0.04 * t]; };
      for (let k = 0; k < 3; k++) { const s = sAt(1.32 + k * 0.12), az = k * 2.1 + 0.4, e = add(s, [Math.sin(az) * 0.12, 0.06, Math.cos(az) * 0.12]); limb(b, [s, e], () => 0.006, 3, () => STALK); }
      for (let k = 0; k < 28; k++) {
        const h = 1.28 + 0.48 * (k / 28) + (r() - 0.5) * 0.04, s = sAt(h), az = k * 2.39996, rad = 0.05 + 0.05 * (1 - (h - 1.28) / 0.5) + r() * 0.025;
        clump(b, OCT, [s[0] + Math.sin(az) * rad, h - 0.02, s[2] + Math.cos(az) * rad], [0.026, 0.038, 0.026], (r() - 0.5) * 0.5, az, r, 0.15, (p, n, kk) => n[1] > 0.5 ? [0.72, 0.74, 0.55] : shade(CREAM, kk), null, 0);
      }
      limb(b, [[0, -0.4, 0], [0, 0.05, 0]], () => 0.05, 5, () => shade(BASE, 0.7));
    } else {
      limb(b, [stalk[0], stalk[2], stalk[4]], t => 0.035 - 0.02 * t, 3, () => STALK);
      clump(b, OCT, [0.09, 1.5, 0.05], [0.09, 0.2, 0.09], 0, 0.5, r, 0.1, () => CREAM, null, 0);
      clump(b, OCT, [0.1, 1.72, 0.06], [0.06, 0.11, 0.06], 0, 0.2, r, 0.1, () => CREAM, null, 0);
    }
    return b;
  }

  // ---------- 5. Prickly pear ----------
  function pricklyPear(detail) {
    const b = new MB(), r = rnd(5531);
    const PAD = [0.23, 0.32, 0.19], PAD_OLD = [0.33, 0.34, 0.21], RIM = [0.34, 0.41, 0.23], AREOLE = [0.80, 0.77, 0.62], FRUIT = [0.62, 0.10, 0.35], FRUIT_D = [0.40, 0.06, 0.22];
    // build the pad tree: base pads lean out of the ground, children sprout from upper rims at angles
    const pads = [];
    let quota = 0;
    function grow(base, up, nrm, lvl) {
      const hh = 0.19 - 0.018 * lvl + r() * 0.03, hw = hh * (0.72 + 0.12 * r());
      const P = { base, up, nrm, hh, hw, lvl, c: add(base, scale(up, hh)) }; pads.push(P); quota--;
      if (quota <= 0 || lvl >= 2) return;
      const kids = Math.min(quota, lvl === 0 && r() < 0.6 ? 2 : 1);
      for (let k = 0; k < kids && quota > 0; k++) {
        const side = cross(up, nrm), ang = (kids === 1 ? (r() - 0.5) * 1.1 : (k === 0 ? -0.6 : 0.6) + (r() - 0.5) * 0.3);
        let u2 = norm(add(scale(up, Math.cos(ang)), scale(side, Math.sin(ang))));
        const at = add(P.c, add(scale(up, hh * Math.cos(ang) * 0.9), scale(side, hw * Math.sin(ang) * 0.9)));
        // twist the child out of the parent's plane and let it stand up more
        const tw = (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.8);
        let n2 = norm(add(scale(nrm, Math.cos(tw)), scale(cross(u2, nrm), Math.sin(tw))));
        u2 = norm(add(u2, [0, 0.5, 0])); n2 = norm(sub(n2, scale(u2, dot(n2, u2))));
        grow(at, u2, n2, lvl + 1);
      }
    }
    const roots = [[0.3, 0.08, 0.2, 0.5, 3], [1.5, 0.22, 0.42, 1.3, 3], [2.8, 0.2, 0.35, 2.4, 2], [4.0, 0.3, 0.75, 0.9, 2], [5.2, 0.22, 0.45, 1.9, 2]];
    for (const [az, d0, lean, tw, q] of roots) {
      const at = [Math.sin(az) * d0, -0.07, Math.cos(az) * d0], up = norm([Math.sin(az) * lean, 1, Math.cos(az) * lean]);
      const nd = dirOf(az + PI / 2 + (tw - 1.5) * 0.6, 0), n0 = norm(sub(nd, scale(up, dot(nd, up))));
      quota = q; grow(at, up, n0, 0);
      if (detail) limb(b, [[at[0] * 0.6, -0.4, at[2] * 0.6], add(at, scale(up, 0.04))], () => 0.035, 3, () => [0.36, 0.33, 0.22]);
    }
    if (!detail) limb(b, [[0, -0.4, 0], [0, 0.02, 0]], () => 0.12, 3, () => [0.33, 0.34, 0.21]);
    const tipPads = pads.filter(P => P.lvl >= 2 || P === pads[pads.length - 1]);
    for (const P of pads) {
      const side = cross(P.up, P.nrm), old = P.lvl === 0, base = old ? PAD_OLD : PAD, k = 0.9 + 0.18 * r(), th = 0.022;
      const pt = (a, f, z) => { const q = 1 + (r() - 0.5) * 0.06 * f; return add(add(P.c, add(scale(side, Math.cos(a) * P.hw * f * q), scale(P.up, Math.sin(a) * P.hh * f * q))), scale(P.nrm, z)); };
      if (detail) {
        const NR = 7, rim = [];
        for (let i = 0; i < NR; i++) rim.push(pt(i / NR * 2 * PI - PI / 2, 1, 0));
        for (const sgn of [1, -1]) {
          const nn = scale(P.nrm, sgn), cc = add(P.c, scale(nn, th * 1.15));
          const ci = b.v(cc[0], cc[1], cc[2], nn[0], nn[1], nn[2], shade(base, k * 0.95)), inner = [], outer = [];
          for (let i = 0; i < NR; i++) {
            const a = i / NR * 2 * PI - PI / 2, p = add(pt(a, 0.6, 0), scale(nn, th)), dout = norm(sub(rim[i], P.c)), ni = norm(add(nn, scale(dout, 0.35))), no = norm(add(scale(nn, 0.45), dout));
            inner.push(b.v(p[0], p[1], p[2], ni[0], ni[1], ni[2], shade(mix(base, RIM, 0.25), k)));
            outer.push(b.v(rim[i][0], rim[i][1], rim[i][2], no[0], no[1], no[2], shade(mix(base, RIM, 0.7), k * 1.03)));
          }
          for (let i = 0; i < NR; i++) { const j = (i + 1) % NR; b.tri(ci, inner[i], inner[j]); b.quad(inner[i], outer[i], outer[j], inner[j]); }
          // areoles: tiny pale bumps in a loose diamond pattern
          const NA = old ? 1 : 2;
          for (let q = 0; q < NA; q++) {
            const a = r() * 2 * PI, f = 0.3 + r() * 0.45, c0 = add(pt(a, f, 0), scale(nn, th * 1.1)), s1 = scale(side, 0.011), u1 = scale(P.up, 0.011), apex = add(c0, scale(nn, 0.01));
            const i0 = b.v(...add(c0, s1), ...nn, AREOLE), i1 = b.v(...add(c0, u1), ...nn, AREOLE), i2 = b.v(...sub(c0, s1), ...nn, AREOLE), i3 = b.v(...sub(c0, u1), ...nn, AREOLE), ia = b.v(...apex, ...nn, [0.95, 0.93, 0.82]);
            b.tri(i0, i1, ia); b.tri(i1, i2, ia); b.tri(i2, i3, ia);
          }
        }
      } else {
        const ids = []; for (let i = 0; i < 6; i++) { const p = pt(i / 6 * 2 * PI - PI / 2, 1, 0), nn = norm(add(scale(P.nrm, 0.3), [0, 0.9, 0])); ids.push(b.v(p[0], p[1], p[2], nn[0], nn[1], nn[2], shade(base, k))); }
        b.quad(ids[0], ids[1], ids[2], ids[3]); b.quad(ids[0], ids[3], ids[4], ids[5]);
      }
    }
    // magenta fruits on the upper rims of the top pads
    const fr = tipPads.slice(-4);
    for (const P of fr) {
      const side = cross(P.up, P.nrm), a = (r() - 0.5) * 1.2, at = add(P.c, add(scale(P.up, P.hh * Math.cos(a) * 1.08), scale(side, P.hw * Math.sin(a) * 1.08)));
      const uu = norm(add(add(scale(P.up, Math.cos(a)), scale(side, Math.sin(a))), [0, 0.3, 0]));
      if (detail) clump(b, OCT, add(at, scale(uu, 0.02)), [0.024, 0.036, 0.024], Math.acos(cl(uu[1])), Math.atan2(uu[0], uu[2]), r, 0.1, (p, n) => n[1] > 0.3 ? FRUIT : FRUIT_D, null, 0);
      else { const q = add(at, scale(uu, 0.05)), s1 = scale(side, 0.04); b.plate(sub(at, s1), add(at, s1), q, q, FRUIT); }
    }
    return b;
  }

  // ---------- 6. Dead juniper snag ----------
  function deadSnag(detail) {
    const b = new MB(), r = rnd(6607);
    const SIL_D = [0.27, 0.26, 0.24], SIL = [0.53, 0.52, 0.49], BARK_S = [0.26, 0.20, 0.15], BARK_S2 = [0.38, 0.29, 0.21];
    const trunk = curve([0, -0.4, 0], [-0.4, 2.0, 0.25], [0.3, 3.95, -0.2], detail ? 13 : 3, r, 0.12);
    const tAt = t => { const f = t * (trunk.length - 1), i = Math.min(trunk.length - 2, Math.floor(f)); return lerp(trunk[i], trunk[i + 1], f - i); };
    // bark strip: a band of angle that spirals with the grain
    const tw = 7.5, sil = (t, a, bump) => {
      const band = ((a + tw * t * 0.6) % (2 * PI) + 2 * PI) % (2 * PI);
      if (band > 0.5 && band < 1.7 && t < 0.8) return mix(BARK_S, BARK_S2, cl(0.5 + 0.5 * bump + (r() - 0.5) * 0.4));
      return mix(SIL_D, SIL, cl(0.55 + 0.5 * bump + (r() - 0.5) * 0.25 - 0.2 * (t < 0.08 ? 1 : 0)));
    };
    const limbs = [[0.36, 0.6, 1.3, 0.45], [0.5, 2.7, 1.0, 0.25], [0.64, 4.3, 1.1, 0.65], [0.76, 1.3, 0.8, 0.85], [0.46, 5.4, 0.6, -0.15], [0.84, 3.6, 0.6, 0.5]];
    if (detail) {
      limb(b, trunk, t => (0.27 - 0.21 * t + 0.16 * Math.max(0, 0.18 - t) / 0.18) * (t > 0.93 ? 1 - (t - 0.93) * 10 : 1), 14, sil, { n: 5, amp: 0.17, tw: tw });
      // second, shorter broken leader
      const sp = tAt(0.62), lead = curve(sp, add(sp, [0.25, 0.45, 0.25]), add(sp, [0.2, 1.15, 0.5]), 4, r, 0.06);
      limb(b, lead, t => 0.09 * (1 - 0.92 * t), 7, sil, { n: 3, amp: 0.16, tw: 5 });
      // broken pointed limbs
      for (const [t, az, L, el] of limbs) {
        const s = tAt(t), d = dirOf(az, el), e = add(s, scale(d, L)), pts = curve(s, add(s, add(scale(d, L * 0.5), [0, -0.12, 0])), e, 3, r, 0.08), r0 = 0.1 * (1 - 0.4 * t);
        limb(b, pts, q => q < 0.7 ? r0 * (1 - 0.5 * q) : r0 * 0.65 * (1 - (q - 0.7) / 0.3 * 0.9), 6, sil, { n: 3, amp: 0.15, tw: 4 });
        if (L > 0.9) { const a = pts[2], e2 = add(a, add(scale(d, 0.25), [d[2] * 0.25, 0.35, -d[0] * 0.25])); limb(b, [a, lerp(a, e2, 0.5), e2], q => r0 * 0.45 * (1 - 0.9 * q), 4, sil); }
      }
      // root knuckles at the base
      for (let k = 0; k < 3; k++) { const az = k * 2.1 + 0.5, d = dirOf(az, -0.35); limb(b, [[d[0] * 0.08, 0.15, d[2] * 0.08], [d[0] * 0.3, 0.02, d[2] * 0.3], [d[0] * 0.55, -0.3, d[2] * 0.55]], q => 0.1 * (1 - 0.6 * q), 5, sil, { n: 2, amp: 0.15, tw: 2 }); }
    } else {
      limb(b, trunk, t => 0.28 - 0.25 * t, 4, () => [0.50, 0.48, 0.45]);
      const sp = tAt(0.62); limb(b, [sp, add(sp, [0.2, 1.15, 0.5])], t => 0.08 * (1 - 0.9 * t), 3, () => [0.52, 0.50, 0.47]);
      for (const [t, az, L, el] of limbs.slice(0, 3)) { const s = tAt(t); limb(b, [s, add(s, scale(dirOf(az, el), L))], q => 0.08 * (1 - 0.8 * q), 3, () => [0.52, 0.50, 0.47]); }
    }
    return b;
  }

  // ---------- 7. Bunchgrass ----------
  function bunchgrass(detail) {
    const b = new MB(), r = rnd(7741);
    const BASEG = [0.34, 0.39, 0.23], STRAW = [0.64, 0.56, 0.37], SEED = [0.70, 0.62, 0.43];
    const NB = detail ? 19 : 6;
    for (let i = 0; i < NB; i++) {
      const az = i * 2.39996 + (r() - 0.5) * 0.4, lean = detail ? 0.15 + r() * 0.6 : 0.3 + (i % 3) * 0.2, L = 0.36 + r() * 0.16, bend = 0.2 + r() * 0.3;
      const o = [(r() - 0.5) * 0.06, -0.12, (r() - 0.5) * 0.06], h = [Math.sin(az), 0, Math.cos(az)], side = [Math.cos(az), 0, -Math.sin(az)];
      const fn = t => { const hz = L * (Math.sin(lean) * t + bend * t * t), y = 0.1 * Math.min(1, t * 8) + L * (Math.cos(lean) * t - bend * 0.7 * t * t); return [o[0] + h[0] * hz, o[1] + y, o[2] + h[2] * hz]; };
      const k = 0.88 + 0.24 * r(), g = r();
      const colf = t => shade(mix(BASEG, STRAW, cl(t * 1.2 + g * 0.4 - 0.1)), k);
      blade(b, fn, side, t => (detail ? 1 : 2.4) * (0.011 * (1 - 0.8 * t) + 0.002), detail ? [0, 0.3, 0.55, 0.8, 1] : [0, 0.5, 1], colf, 0);
    }
    if (detail) for (let i = 0; i < 4; i++) {
      const az = i * 1.7 + 0.3, h = [Math.sin(az), 0, Math.cos(az)], side = [Math.cos(az), 0, -Math.sin(az)], tilt = 0.08 + 0.1 * r();
      const base = [0, -0.1, 0], top = [h[0] * 0.5 * tilt * 1.5, 0.5 + r() * 0.07, h[2] * 0.5 * tilt * 1.5];
      blade(b, t => lerp(base, top, t * 0.8), side, () => 0.003, [0, 0.5, 1], () => STRAW, 0);
      const hs = lerp(base, top, 0.8);
      // seed head: two crossed thin diamonds
      for (const sd of [side, h]) { const m = lerp(hs, top, 0.5), w = scale(sd, 0.012); b.plate(hs, add(m, w), top, sub(m, w), SEED); }
    }
    return b;
  }

  return {
    name: 'plants',
    items: [
      { name: 'juniper', budget: 2600, build: juniper, colliders: [] },
      { name: 'pinyon', budget: 2600, build: pinyon, colliders: [] },
      { name: 'sagebrush', budget: 700, build: sagebrush, colliders: [] },
      { name: 'yucca', budget: 800, build: yucca, colliders: [] },
      { name: 'prickly_pear', budget: 700, build: pricklyPear, colliders: [] },
      { name: 'dead_snag', budget: 900, build: deadSnag, colliders: [] },
      { name: 'bunchgrass', budget: 180, build: bunchgrass, colliders: [] }
    ]
  };
}) };
