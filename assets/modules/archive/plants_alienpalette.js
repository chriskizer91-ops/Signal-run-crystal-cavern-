window.MODDEF = { fn: (function (K) {
  // Alien flora of the red canyon planet (reskin of the desert set: same species names, sizes and footprints).
  // Drawn instanced (random Y turn, 0.7-1.3x size, tint), so every plant is irregular from all sides and budgets are tight.
  // Origin = ground point; roots go to y = -0.4. Colours stay mid-bright so the per-instance tint still reads.
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd, norm, sub, add, scale, cross, dot, lerp } = K;
  const cl = v => Math.max(0, Math.min(1, v));
  const mix = (a, b, t) => [cl(a[0] + (b[0] - a[0]) * t), cl(a[1] + (b[1] - a[1]) * t), cl(a[2] + (b[2] - a[2]) * t)];
  const shade = (c, k) => [cl(c[0] * k), cl(c[1] * k), cl(c[2] * k)];
  const gloss = (c, a) => [c[0], c[1], c[2], a];
  const apply = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  const PI = Math.PI;

  // ---------- alien palette (no Earth greens) ----------
  const TEAL_D = [0.07, 0.27, 0.31], TEAL = [0.16, 0.50, 0.53], TEAL_L = [0.42, 0.80, 0.80], CYAN = [0.70, 0.96, 0.96];
  const VIO_D = [0.20, 0.13, 0.33], VIO = [0.42, 0.28, 0.62], LILAC = [0.84, 0.72, 0.97];
  const MAG_D = [0.36, 0.10, 0.24], MAG = [0.66, 0.22, 0.42], MAG_L = [0.92, 0.42, 0.70];
  const BARK_D = [0.17, 0.14, 0.23], BARK_L = [0.40, 0.34, 0.48];
  const BONE_D = [0.40, 0.35, 0.47], BONE = [0.86, 0.82, 0.90];

  // ---------- shared shapes ----------
  const ICO = (() => {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    return { v, f };
  })();
  const OCT = { v: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], f: [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]] };

  // jittered low-poly clump (lobe, bulb, pod). Normals blend the clump's own radial with a larger centre nC.
  // col(p, n, k) gives the vertex colour.
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

  // round limb along points with optional spiral ridges. rf(t) radius, col(t, a, bump).
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
  // tapered blade strip: centre line fn(t), side vector, half-width wf(t); fold > 0 adds a midrib
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
  // ridged stem colour: ridges light, grooves dark, small speckle
  function barkCol(r, D, Lt, extra) { return (t, a, bump) => { let c = mix(D, Lt, cl(0.5 + 0.55 * bump + (r() - 0.5) * 0.3)); return extra ? extra(c, t, a) : c; }; }

  // flat plate / fan pad: a scalloped rim of n points around c, in the plane facing `up`. The top bulges by h, the
  // underside by hb, the rim lifts by cup*R (a shallow dish). 2n triangles. cols = { top, rim, under } (or fns of k).
  function pad(b, c, up, R, n, h, hb, cup, scal, r, cols) {
    const u = norm(up), s = norm(cross(u, Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), t = cross(u, s), a0 = r() * 2 * PI, k = 0.88 + 0.22 * r();
    const tc = add(c, scale(u, h)), bc = sub(c, scale(u, hb));
    const it = b.v(tc[0], tc[1], tc[2], u[0], u[1], u[2], shade(cols.top, k)), ib = b.v(bc[0], bc[1], bc[2], -u[0], -u[1], -u[2], shade(cols.under, k));
    const top = [], bot = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + i / n * 2 * PI, rad = R * (1 + (i % 2 ? -scal : scal * 0.4)) * (0.93 + 0.14 * r());
      const dir = add(scale(s, Math.cos(a)), scale(t, Math.sin(a))), p = add(add(c, scale(dir, rad)), scale(u, cup * R * (0.7 + 0.6 * r())));
      const nt = norm(add(scale(u, 0.8), scale(dir, 0.55))), nb = norm(add(scale(u, -0.8), scale(dir, 0.55)));
      top.push(b.v(p[0], p[1], p[2], nt[0], nt[1], nt[2], shade(i % 2 ? mix(cols.rim, cols.top, 0.35) : cols.rim, k)));
      bot.push(b.v(p[0], p[1], p[2], nb[0], nb[1], nb[2], shade(mix(cols.under, cols.rim, 0.3), k)));
    }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; b.tri(it, top[i], top[j]); b.tri(ib, bot[j], bot[i]); }
  }
  // umbrella cap: a lathe from the underside centre out to the rim and over the dome to the top centre, facing `up`
  function cap(b, c, up, R, h, segs, cols, deep) {
    const u = norm(up), p0 = sub(c, u), p1 = add(c, u);
    b.push(K.along(p0, p1));
    const prof = deep
      ? [[0, 0.3 * h, cols.under], [0.85 * R, -0.05 * h, cols.rim], [R, 0.08 * h, cols.top], [0.62 * R, 0.72 * h, cols.crown], [0, h]]
      : [[0, 0.2 * h, cols.under], [R, 0, cols.top], [0.55 * R, 0.75 * h, cols.crown], [0, h]];
    b.lathe(prof, segs, cols.crown);
    b.pop();
  }

  // ---------- 1. Juniper -> squat twisted plate-tree ----------
  // Same twisted ridged trunk and limbs; the needle clumps become layered scalloped plate pads (deep blue-green dish,
  // teal-cyan rim, violet underside). Berries become small glowing cyan seed beads. The bleached limb is a pale lilac spike.
  function juniper(detail) {
    const b = new MB(), r = rnd(1101);
    const PALE_D = [0.52, 0.46, 0.60], PALE = [0.84, 0.78, 0.92];
    const F = [0.06, 0.7, -0.04], J1 = [0.42, 1.25, 0.18], J2 = [-0.38, 1.35, -0.12];
    const masses = [
      { c: [1.05, 1.55, 0.3], rad: [0.75, 0.5, 0.7], n: 15, from: J1 },
      { c: [-0.95, 2.0, -0.4], rad: [0.8, 0.58, 0.75], n: 16, from: J2 },
      { c: [0.25, 2.7, 0.15], rad: [0.75, 0.52, 0.7], n: 15, from: J1 },
      { c: [0.45, 1.0, -0.95], rad: [0.6, 0.42, 0.55], n: 10, from: F },
      { c: [-0.45, 1.45, 0.95], rad: [0.55, 0.45, 0.6], n: 10, from: J2 },
      { c: [-0.25, 3.15, -0.4], rad: [0.42, 0.36, 0.4], n: 5, from: J2 },
    ];
    const bc = barkCol(r, BARK_D, BARK_L, (c, t) => mix(c, MAG_D, 0.25 * (1 - t)));
    const padCols = hh => ({ top: mix(TEAL_D, TEAL, 0.35 + 0.5 * hh), rim: mix(TEAL_L, CYAN, 0.25 + 0.5 * hh), under: mix(VIO_D, VIO, 0.3 + 0.3 * hh) });
    if (detail) {
      limb(b, curve([0, -0.4, 0], [-0.12, 0.25, 0.1], F, 5, r, 0.02), t => 0.29 - 0.09 * t + 0.14 * Math.max(0, 0.35 - t) / 0.35, 10, bc, { n: 5, amp: 0.15, tw: 5 });
      limb(b, curve(F, [0.3, 0.85, 0.15], J1, 4, r, 0.04), t => 0.19 - 0.06 * t, 8, bc, { n: 4, amp: 0.16, tw: 3.5 });
      limb(b, curve(F, [-0.3, 0.9, 0.05], J2, 4, r, 0.04), t => 0.19 - 0.06 * t, 8, bc, { n: 4, amp: 0.16, tw: -3.5, ph: 1 });
      const ends = [];
      for (const M of masses) {
        const end = lerp(M.from, M.c, 0.85), mid = lerp(M.from, end, 0.5), ctrl = [mid[0] + (r() - 0.5) * 0.5, mid[1] - 0.1 + r() * 0.2, mid[2] + (r() - 0.5) * 0.5];
        const r0 = M.from === F ? 0.12 : 0.11;
        limb(b, curve(M.from, ctrl, end, 4, r, 0.08), t => r0 * (1 - 0.65 * t), 6, bc, { n: 3, amp: 0.14, tw: 3 });
        for (let k = 0; k < 3; k++) { const tp = inEll(r, M.c, M.rad.map(v => v * 0.8), 0.5); limb(b, curve(end, lerp(end, tp, 0.5).map((v, i) => v + (i === 1 ? 0.1 : (r() - 0.5) * 0.2)), tp, 2, r, 0), t => 0.035 * (1 - 0.7 * t), 3, bc); }
        ends.push(end);
      }
      // pale lilac spike limb with spiral grain and a spur
      const dl = curve(J2, [-0.9, 1.5, 0.5], [-1.45, 2.6, 1.05], 4, r, 0.06), dc = barkCol(r, PALE_D, PALE);
      limb(b, dl, t => 0.12 * (1 - 0.8 * t), 6, dc, { n: 3, amp: 0.2, tw: 5 });
      limb(b, curve(dl[2], add(dl[2], [-0.1, 0.25, 0.05]), add(dl[2], [-0.15, 0.55, -0.15]), 2, r, 0), t => 0.03 * (1 - 0.9 * t), 4, dc);
      // a broad dark shelf in each mass so it reads solid, then layered smaller scalloped plates
      for (const M of masses) pad(b, [M.c[0], M.c[1] - 0.12 * M.rad[1], M.c[2]], [(r() - 0.5) * 0.2, 1, (r() - 0.5) * 0.2], Math.max(M.rad[0], M.rad[2]) * 0.82, 10, 0.07, 0.03, 0.08, 0.12, r,
        { top: TEAL_D, rim: mix(TEAL, TEAL_L, 0.4), under: VIO_D });
      for (const M of masses) for (let k = 0; k < M.n; k++) {
        const p = inEll(r, M.c, M.rad.map(v => v * 1.12), 0.7), out = norm([p[0] - M.c[0], 0, p[2] - M.c[2]]), hh = cl((p[1] - M.c[1]) / M.rad[1] * 0.5 + 0.5);
        if (p[1] < M.c[1] - 0.35 * M.rad[1]) p[1] = M.c[1] - 0.35 * M.rad[1] + r() * 0.1;
        const R = 0.22 + 0.13 * r(), up = norm(add([0, 1, 0], scale(out, 0.25 + 0.3 * r())));
        pad(b, p, up, R, 10, 0.07, 0.035, 0.12 + 0.08 * r(), 0.14, r, padCols(hh));
      }
      // small glowing seed beads at the plate edges
      for (let k = 0; k < 6; k++) { const M = masses[k % 6], d = norm([r() - 0.5, r() * 0.6, r() - 0.5]), p = [M.c[0] + d[0] * M.rad[0] * 1.0, M.c[1] + d[1] * M.rad[1] * 0.9, M.c[2] + d[2] * M.rad[2] * 1.0]; clump(b, OCT, p, [0.04, 0.05, 0.04], 0, 0, r, 0.1, (q, n) => n[1] > 0.4 ? CYAN : mix(TEAL_L, CYAN, 0.4), null, 0); }
    } else {
      limb(b, [[0, -0.4, 0], F, [0.15, 1.6, 0.05]], t => 0.27 - 0.15 * t, 5, () => [0.30, 0.25, 0.36]);
      limb(b, [F, J2, [-1.45, 2.6, 1.05]], t => 0.12 * (1 - 0.9 * t), 3, () => [0.78, 0.72, 0.86]);
      for (const M of masses) pad(b, M.c, [(r() - 0.5) * 0.2, 1, (r() - 0.5) * 0.2], Math.max(M.rad[0], M.rad[2]) * 1.15, 10, M.rad[1] * 0.55, M.rad[1] * 0.3, 0.05, 0.12, r,
        { top: mix(TEAL_D, TEAL, 0.5), rim: mix(TEAL, TEAL_L, 0.6), under: VIO_D });
    }
    return b;
  }

  // ---------- 2. Pinyon -> tall umbrella-cap tree ----------
  // Same leaning trunk and branch layout; every needle pad becomes a violet umbrella cap with a lilac rim and a deep
  // blue-green gill underside, with cyan seed pods hanging beneath. The bare lower limbs stay as pale dead spines.
  function pinyon(detail) {
    const b = new MB(), r = rnd(2207);
    const DEAD = [0.70, 0.64, 0.76];
    const top = [0.95, 4.0, 0.35], trunk = curve([0, -0.4, 0], [0.8, 1.2, 0.2], top, 8, r, 0.05);
    const tAt = t => { const f = t * (trunk.length - 1), i = Math.min(trunk.length - 2, Math.floor(f)); return lerp(trunk[i], trunk[i + 1], f - i); };
    const bc = barkCol(r, BARK_D, BARK_L, (c, t) => mix(c, TEAL_D, 0.35 * t));
    // branch layout: [t on trunk, azimuth, length, rise]
    const br = [], N = 7;
    for (let i = 0; i < N; i++) br.push({ t: 0.42 + 0.46 * i / (N - 1) + (r() - 0.5) * 0.04, az: i * 2.4 + (r() - 0.5) * 0.6, L: 1.75 - 0.95 * i / (N - 1) + r() * 0.3, rise: 0.15 + r() * 0.35 });
    const pads = [];
    for (const B of br) {
      const s = tAt(B.t), d = dirOf(B.az, 0), e = [s[0] + d[0] * B.L, s[1] + B.rise + 0.2 * B.L, s[2] + d[2] * B.L];
      B.s = s; B.e = e; B.d = d; B.ctrl = [s[0] + d[0] * B.L * 0.5, s[1] + B.rise * 0.1, s[2] + d[2] * B.L * 0.5];
      pads.push({ c: [e[0] - d[0] * 0.1, e[1] + 0.1, e[2] - d[2] * 0.1], R: 0.72 + 0.25 * r(), tilt: (r() - 0.5) * 0.3, d, big: true });
    }
    pads.push({ c: [top[0], top[1] + 0.12, top[2]], R: 0.72, tilt: 0, d: [0, 0, 1], big: true });
    const CAP = [0.46, 0.22, 0.74], capCols = j => ({ top: mix(CAP, MAG, 0.1 + 0.25 * j), crown: mix(CAP, LILAC, 0.35), rim: LILAC, under: mix(TEAL_D, TEAL, 0.4) });
    if (detail) {
      limb(b, trunk, t => 0.24 - 0.17 * t + 0.1 * Math.max(0, 0.15 - t) / 0.15, 8, bc, { n: 4, amp: 0.1, tw: 2.5 });
      for (const B of br) {
        const pts = curve(B.s, B.ctrl, B.e, 3, r, 0.08); limb(b, pts, t => 0.075 - 0.05 * t, 5, bc, { n: 2, amp: 0.1, tw: 1 });
        for (let k = 0; k < 2; k++) { const a = pts[1 + k], tp = add(a, [(r() - 0.5) * 0.7, 0.2 + r() * 0.25, (r() - 0.5) * 0.7]); limb(b, [a, tp], t => 0.03 * (1 - 0.6 * t), 3, bc); pads.push({ c: add(tp, [0, 0.05, 0]), R: 0.26 + 0.08 * r(), tilt: (r() - 0.5) * 0.5, d: B.d, big: false }); }
      }
      // bare lower spines (dead, pale lilac) with broken tips
      for (const [t, az, L] of [[0.3, 2.2, 1.15], [0.36, 4.6, 0.9]]) {
        const s = tAt(t), d = dirOf(az, 0.12), e = add(s, scale(d, L)), dc = barkCol(r, [0.42, 0.37, 0.48], DEAD);
        const pts = curve(s, add(s, scale(d, L * 0.5)), add(e, [0, 0.1, 0]), 2, r, 0.05); limb(b, pts, t => 0.065 * (1 - 0.85 * t), 4, dc);
        limb(b, [pts[1], add(pts[1], [d[2] * 0.25, 0.18, -d[0] * 0.25])], t => 0.02 * (1 - 0.8 * t), 3, dc);
      }
      // caps: big umbrellas at the branch ends (two tiers on the four largest), small cupped discs on the twigs
      pads.forEach((P, i) => {
        const up = norm([P.d[0] * P.tilt, 1, P.d[2] * P.tilt]), j = r();
        if (P.big) {
          cap(b, P.c, up, P.R, 0.36, 12, capCols(j), true);
          if (P.R > 0.85 || i === 7) cap(b, add(P.c, [0, 0.26, 0]), up, P.R * 0.55, 0.26, 9, capCols(1 - j), false);
          for (let k = 0; k < 3; k++) { const a = k * 2.1 + r(), rr = P.R * (0.35 + 0.35 * r()), q = [P.c[0] + Math.sin(a) * rr, P.c[1] - 0.06 - 0.1 * r(), P.c[2] + Math.cos(a) * rr];
            clump(b, OCT, q, [0.05, 0.08, 0.05], 0, a, r, 0.12, (p, n) => n[1] < -0.3 ? CYAN : mix(TEAL_L, CYAN, 0.5), null, 0); }
        } else {
          cap(b, P.c, up, P.R, 0.16, 8, capCols(j), false);
          clump(b, OCT, add(P.c, [0, -0.05, 0]), [0.035, 0.06, 0.035], 0, r() * 6.3, r, 0.1, () => CYAN, null, 0);
        }
      });
    } else {
      limb(b, [trunk[0], trunk[4], top], t => 0.24 - 0.17 * t, 4, () => [0.28, 0.24, 0.34]);
      for (const B of br) limb(b, [B.s, B.e], t => 0.07 - 0.04 * t, 2, () => [0.28, 0.24, 0.34]);
      { const s = tAt(0.22), e = add(s, scale(dirOf(2.2, 0), 0.9)); limb(b, [s, e], t => 0.05 * (1 - 0.8 * t), 3, () => DEAD); }
      for (const P of pads) pad(b, add(P.c, [0, 0.1, 0]), [P.d[0] * P.tilt, 1, P.d[2] * P.tilt], P.R * 1.05, 10, 0.3, -0.06, -0.12, 0.05, r,
        { top: [0.50, 0.22, 0.70], rim: mix([0.46, 0.22, 0.74], LILAC, 0.25), under: TEAL_D });
    }
    return b;
  }

  // ---------- 3. Sagebrush -> low coral mound ----------
  // A low rounded mound of branching coral: rust-magenta forked arms ending in lilac knobs, with fleshy violet lobes
  // in the middle and small cyan polyps along the arms.
  function sagebrush(detail) {
    const b = new MB().push(rotY(195 * PI / 180)), r = rnd(3313);   // turned so the footprint matches the old bush
    const armCol = (t) => mix(MAG_D, MAG, cl(0.3 + 0.8 * t));
    if (detail) {
      limb(b, curve([0, -0.4, 0], [0.04, -0.1, -0.02], [0, 0.08, 0], 2, r, 0), t => 0.055 - 0.015 * t, 4, () => MAG_D);
      // small fleshy violet lobes low in the middle
      for (const [x, y, z, sz] of [[0.1, 0.17, 0.04, 0.14], [-0.1, 0.19, -0.07, 0.13], [0.0, 0.2, 0.12, 0.12]]) clump(b, ICO, [x, y, z], [sz, sz * 1.1, sz], (r() - 0.5) * 0.4, r() * 6.3, r, 0.18,
        (p, n, k) => shade(mix(VIO_D, VIO, cl(0.25 + 0.6 * n[1])), k), [0, 0.1, 0], 0.4);
      const NS = 9, knob = (p, sz) => clump(b, OCT, p, [sz, sz * 1.1, sz], 0, r() * 6.3, r, 0.15, (q, n, k) => shade(n[1] > 0.3 ? LILAC : mix(MAG_L, LILAC, 0.45), k), null, 0);
      for (let i = 0; i < NS; i++) {
        const az = i * 2.39996 + (r() - 0.5) * 0.5, el = 0.45 + 0.75 * (i % 3) / 2 + (r() - 0.5) * 0.2;
        const s = [(r() - 0.5) * 0.1, 0.06, (r() - 0.5) * 0.1], d = dirOf(az, el);
        const fork = add(s, [d[0] * 0.3, 0.16 + 0.2 * Math.sin(el), d[2] * 0.3]);
        limb(b, curve(s, add(lerp(s, fork, 0.5), [0, -0.03, 0]), fork, 2, r, 0.02), t => 0.05 - 0.014 * t, 4, armCol);
        // two arms fork off and curl upward; their tips sit on a low dome (wide and low at the edge, high in the middle)
        for (const off of [-0.45, 0.45]) {
          const a2 = az + off + (r() - 0.5) * 0.2, e2 = Math.min(1.3, 0.12 + (el - 0.45) * 1.25 + r() * 0.2), Rh = 0.66 * Math.cos(e2) + 0.04 * r();
          const tip = [Math.sin(a2) * Rh, 0.12 + 0.72 * Math.sin(e2), Math.cos(a2) * Rh];
          const ctrl = [fork[0] * 0.2 + tip[0] * 0.8, fork[1] + (tip[1] - fork[1]) * 0.15, fork[2] * 0.2 + tip[2] * 0.8];
          limb(b, curve(fork, ctrl, tip, 2, r, 0.02), t => 0.04 * (1 - 0.3 * t), 3, t => armCol(0.6 + 0.4 * t));
          knob(tip, 0.075);
        }
        // a short upright stub between the arms
        if (i < 8) { const tp = add(fork, [d[0] * 0.08, 0.15 + 0.05 * r(), d[2] * 0.08]); limb(b, [fork, tp], t => 0.026, 3, () => armCol(0.8)); knob(tp, 0.06); }
      }
    } else {
      limb(b, [[0, -0.4, 0], [0, 0.1, 0]], () => 0.06, 3, () => MAG_D);
      for (const [az, el] of [[0.4, 1.0], [3.3, 1.15]]) { const d = dirOf(az, el); limb(b, [[0, 0.04, 0], [d[0] * 0.7, 0.04 + d[1] * 0.7, d[2] * 0.7]], () => 0.025, 3, () => MAG); }
      const blobs = [[0.32, 0.5, 0.1, 0.27], [-0.3, 0.55, -0.15, 0.27], [0.02, 0.58, 0.33, 0.25], [-0.08, 0.52, -0.38, 0.24], [0, 0.74, 0, 0.24]];
      blobs.forEach(([x, y, z, s], i) => clump(b, OCT, [x, y, z], [s * 1.05, s * 0.9, s], 0.4, r() * 6.3, r, 0.25,
        (p, n, k) => shade(n[1] > 0.75 ? mix(MAG_L, LILAC, 0.4) : (i % 2 ? MAG : VIO), k), [0, 0.2, 0], 0.4, 0.5));
    }
    return b;
  }

  // ---------- 4. Yucca -> spiral blade rosette with a seed-pod spire ----------
  // Stiff deep blue-green blades swept into a spiral, teal edges and magenta tips; dead blades are faded rust-violet.
  // The flower stalk carries a spiral of glossy violet seed pods with cyan caps.
  function yucca(detail) {
    const b = new MB(), r = rnd(4421);
    const BL = [0.12, 0.34, 0.40], EDGE = [0.36, 0.66, 0.68], BASE = [0.30, 0.18, 0.36], TIPC = MAG_L, DEAD = [0.62, 0.42, 0.50], DEAD_D = [0.38, 0.22, 0.32];
    const STALK = [0.30, 0.22, 0.38];
    const NB = detail ? 30 : 14;
    for (let i = 0; i < NB; i++) {
      const f = i / NB, az = i * 2.39996 + (r() - 0.5) * 0.3, el = 1.45 - 0.95 * Math.sqrt(f) + (r() - 0.5) * 0.15, L = 0.5 + 0.2 * r();
      const d = dirOf(az, el), s0 = [d[0] * 0.04, 0.02, d[2] * 0.04], side = horizSide(d), droop = 0.06 * Math.cos(el), sw = 0.28 * Math.cos(el);
      // centre line sweeps sideways as it rises: the spiral twist of the rosette
      const fn = t => { const tw = sw * t * t; return [s0[0] + d[0] * L * t + side[0] * tw * L, s0[1] + d[1] * L * t - droop * t * t, s0[2] + d[2] * L * t + side[2] * tw * L]; };
      const k = 0.88 + 0.22 * r(), colf = (t, e) => shade(mix(mix(BASE, BL, cl(t * 5)), EDGE, Math.abs(e - 0.5) * 2 * 0.55), k).map((v, j) => t > 0.8 ? cl(v * 0.35 + TIPC[j] * 0.65) : v);
      if (detail) blade(b, fn, side, t => 0.026 * Math.pow(1 - t, 0.7) * (t < 0.12 ? 0.6 + t * 3.3 : 1), [0, 0.25, 0.5, 0.75, 1], colf, 0.006);
      else { const tip = fn(1), w = 0.04; b.plate(sub(s0, scale(side, w)), add(s0, scale(side, w)), tip, tip, mix(BL, EDGE, 0.35)); }
    }
    // withered blades drooping at the base
    const ND = detail ? 7 : 3;
    for (let i = 0; i < ND; i++) {
      const az = i * 0.9 + r() * 0.5, el = 0.35 + r() * 0.3, L = 0.42 + r() * 0.15, d = dirOf(az, el), s0 = [d[0] * 0.05, 0.03, d[2] * 0.05], side = horizSide(d);
      const fn = t => [s0[0] + d[0] * L * t * (1 + 0.2 * t), Math.max(0.012, s0[1] + d[1] * L * t - 0.3 * t * t), s0[2] + d[2] * L * t * (1 + 0.2 * t)];
      if (detail) blade(b, fn, side, t => 0.017 * Math.pow(1 - t, 0.6), [0, 0.35, 0.7, 1], (t, e) => mix(DEAD_D, DEAD, cl(0.3 + t)), 0.004);
      else { const tip = fn(1), w = 0.035; b.plate(sub(s0, scale(side, w)), add(s0, scale(side, w)), tip, tip, DEAD); }
    }
    // seed-pod spire
    const stalk = [[0, -0.4, 0], [0.01, 0.15, 0.0], [0.04, 0.8, 0.02], [0.08, 1.4, 0.04], [0.1, 1.82, 0.06]];
    const POD = gloss([0.48, 0.24, 0.76], 0.3), POD_D = gloss([0.28, 0.12, 0.48], 0.3), POD_T = gloss(CYAN, 0.2);
    if (detail) {
      limb(b, stalk, t => 0.034 - 0.02 * t, 5, t => mix(STALK, [0.50, 0.40, 0.60], t));
      const sAt = h => { const t = (h - 0.15) / (1.82 - 0.15); return [0.01 + 0.09 * t, h, 0.04 * t]; };
      for (let k = 0; k < 3; k++) { const s = sAt(1.32 + k * 0.12), az = k * 2.1 + 0.4, e = add(s, [Math.sin(az) * 0.12, 0.06, Math.cos(az) * 0.12]); limb(b, [s, e], () => 0.006, 3, () => STALK); }
      for (let k = 0; k < 28; k++) {
        const h = 1.24 + 0.52 * (k / 28), s = sAt(h), az = k * 1.1, rad = 0.035 + 0.07 * (1 - (h - 1.24) / 0.52);
        clump(b, OCT, [s[0] + Math.sin(az) * rad, h - 0.02, s[2] + Math.cos(az) * rad], [0.036, 0.052, 0.036], 0.35, az, r, 0.12, (p, n) => n[1] > 0.45 ? POD_T : (n[1] < -0.2 ? POD_D : POD), null, 0);
      }
      limb(b, [[0, -0.4, 0], [0, 0.05, 0]], () => 0.05, 5, () => shade(BASE, 0.8));
    } else {
      limb(b, [stalk[0], stalk[2], stalk[4]], t => 0.035 - 0.02 * t, 3, () => STALK);
      clump(b, OCT, [0.09, 1.5, 0.05], [0.09, 0.2, 0.09], 0, 0.5, r, 0.1, (p, n) => n[1] > 0.4 ? POD_T : POD, null, 0);
      clump(b, OCT, [0.1, 1.72, 0.06], [0.06, 0.11, 0.06], 0, 0.2, r, 0.1, () => POD_T, null, 0);
    }
    return b;
  }

  // ---------- 5. Prickly pear -> stacked translucent bladders ----------
  // Same branching stack of pads, now puffed into rounder bladders: glossy pale aqua with a bright milky centre and
  // a darker teal rim (reads as see-through), older base bladders tinged violet, violet nodes and glowing magenta buds.
  function pricklyPear(detail) {
    const b = new MB(), r = rnd(5531);
    const A = 0.3, PAD = [0.40, 0.74, 0.78], PAD_OLD = [0.50, 0.52, 0.80], RIM = [0.12, 0.40, 0.50], CORE = [0.78, 0.97, 0.96], NODE = [0.50, 0.26, 0.70], FRUIT = [0.95, 0.35, 0.72], FRUIT_D = [0.55, 0.12, 0.40];
    const pads = [];
    let quota = 0;
    function grow(base, up, nrm, lvl) {
      const hh = 0.19 - 0.018 * lvl + r() * 0.03, hw = hh * (0.84 + 0.12 * r());
      const P = { base, up, nrm, hh, hw, lvl, c: add(base, scale(up, hh)) }; pads.push(P); quota--;
      if (quota <= 0 || lvl >= 2) return;
      const kids = Math.min(quota, lvl === 0 && r() < 0.6 ? 2 : 1);
      for (let k = 0; k < kids && quota > 0; k++) {
        const side = cross(up, nrm), ang = (kids === 1 ? (r() - 0.5) * 1.1 : (k === 0 ? -0.6 : 0.6) + (r() - 0.5) * 0.3);
        let u2 = norm(add(scale(up, Math.cos(ang)), scale(side, Math.sin(ang))));
        const at = add(P.c, add(scale(up, hh * Math.cos(ang) * 0.9), scale(side, hw * Math.sin(ang) * 0.9)));
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
      if (detail) limb(b, [[at[0] * 0.6, -0.4, at[2] * 0.6], add(at, scale(up, 0.04))], () => 0.035, 3, () => [0.30, 0.22, 0.40]);
    }
    if (!detail) limb(b, [[0, -0.4, 0], [0, 0.02, 0]], () => 0.12, 3, () => [0.30, 0.24, 0.42]);
    const tipPads = pads.filter(P => P.lvl >= 2 || P === pads[pads.length - 1]);
    for (const P of pads) {
      const side = cross(P.up, P.nrm), old = P.lvl === 0, base = old ? PAD_OLD : PAD, k = 0.9 + 0.18 * r(), th = 0.04;
      const pt = (a, f, z) => { const q = 1 + (r() - 0.5) * 0.06 * f; return add(add(P.c, add(scale(side, Math.cos(a) * P.hw * f * q), scale(P.up, Math.sin(a) * P.hh * f * q))), scale(P.nrm, z)); };
      if (detail) {
        const NR = 7, rim = [];
        for (let i = 0; i < NR; i++) rim.push(pt(i / NR * 2 * PI - PI / 2, 1, 0));
        for (const sgn of [1, -1]) {
          const nn = scale(P.nrm, sgn), cc = add(P.c, scale(nn, th * 1.45));
          const ci = b.v(cc[0], cc[1], cc[2], nn[0], nn[1], nn[2], gloss(shade(mix(base, CORE, 0.75), k), A)), inner = [], outer = [];
          for (let i = 0; i < NR; i++) {
            const a = i / NR * 2 * PI - PI / 2, p = add(pt(a, 0.62, 0), scale(nn, th)), dout = norm(sub(rim[i], P.c)), ni = norm(add(nn, scale(dout, 0.5))), no = norm(add(scale(nn, 0.3), dout));
            inner.push(b.v(p[0], p[1], p[2], ni[0], ni[1], ni[2], gloss(shade(mix(base, CORE, 0.3), k), A)));
            outer.push(b.v(rim[i][0], rim[i][1], rim[i][2], no[0], no[1], no[2], gloss(shade(mix(base, RIM, 0.65), k), A)));
          }
          for (let i = 0; i < NR; i++) { const j = (i + 1) % NR; b.tri(ci, inner[i], inner[j]); b.quad(inner[i], outer[i], outer[j], inner[j]); }
          // small violet nodes on the skin
          const NA = old ? 1 : 2;
          for (let q = 0; q < NA; q++) {
            const a = r() * 2 * PI, f = 0.3 + r() * 0.45, c0 = add(pt(a, f, 0), scale(nn, th * (1.05 + 0.4 * (1 - f)))), s1 = scale(side, 0.014), u1 = scale(P.up, 0.014), apex = add(c0, scale(nn, 0.012));
            const i0 = b.v(...add(c0, s1), ...nn, NODE), i1 = b.v(...add(c0, u1), ...nn, NODE), i2 = b.v(...sub(c0, s1), ...nn, NODE), i3 = b.v(...sub(c0, u1), ...nn, NODE), ia = b.v(...apex, ...nn, LILAC);
            b.tri(i0, i1, ia); b.tri(i1, i2, ia); b.tri(i2, i3, ia);
          }
        }
      } else {
        const ids = []; for (let i = 0; i < 6; i++) { const p = pt(i / 6 * 2 * PI - PI / 2, 1, 0), nn = norm(add(scale(P.nrm, 0.3), [0, 0.9, 0])); ids.push(b.v(p[0], p[1], p[2], nn[0], nn[1], nn[2], gloss(shade(mix(base, CORE, 0.25), k), A))); }
        b.quad(ids[0], ids[1], ids[2], ids[3]); b.quad(ids[0], ids[3], ids[4], ids[5]);
      }
    }
    // glowing magenta buds on the upper rims of the top bladders
    const fr = tipPads.slice(-4);
    for (const P of fr) {
      const side = cross(P.up, P.nrm), a = (r() - 0.5) * 1.2, at = add(P.c, add(scale(P.up, P.hh * Math.cos(a) * 1.08), scale(side, P.hw * Math.sin(a) * 1.08)));
      const uu = norm(add(add(scale(P.up, Math.cos(a)), scale(side, Math.sin(a))), [0, 0.3, 0]));
      if (detail) clump(b, OCT, add(at, scale(uu, 0.025)), [0.032, 0.04, 0.032], Math.acos(cl(uu[1])), Math.atan2(uu[0], uu[2]), r, 0.1, (p, n) => n[1] > 0.3 ? FRUIT : FRUIT_D, null, 0);
      else { const q = add(at, scale(uu, 0.05)), s1 = scale(side, 0.04); b.plate(sub(at, s1), add(at, s1), q, q, FRUIT); }
    }
    return b;
  }

  // ---------- 6. Dead snag -> bleached ribbed husk ----------
  // Same leaning trunk and broken limbs, now a bone-pale lilac husk with deep vertical ribs and dark violet grooves,
  // a rust-magenta seam spiralling up it, and limbs that hook upward like spines of a skeleton.
  function deadSnag(detail) {
    const b = new MB(), r = rnd(6607);
    const SEAM = [0.34, 0.12, 0.24], SEAM2 = [0.56, 0.22, 0.38];
    const trunk = curve([0, -0.4, 0], [-0.4, 2.0, 0.25], [0.3, 3.95, -0.2], detail ? 13 : 3, r, 0.12);
    const tAt = t => { const f = t * (trunk.length - 1), i = Math.min(trunk.length - 2, Math.floor(f)); return lerp(trunk[i], trunk[i + 1], f - i); };
    const SNAG_PH = 1.55, tw = 2.2, sil = (t, a, bump) => {
      const band = ((a + tw * t * 0.6) % (2 * PI) + 2 * PI) % (2 * PI);
      if (band > 0.5 && band < 1.2 && t < 0.85) return mix(SEAM, SEAM2, cl(0.5 + 0.5 * bump + (r() - 0.5) * 0.4));
      return mix(BONE_D, BONE, cl(0.45 + 0.65 * bump + (r() - 0.5) * 0.2 - 0.2 * (t < 0.08 ? 1 : 0)));
    };
    const limbs = [[0.36, 0.6, 1.3, 0.45], [0.5, 2.7, 1.0, 0.25], [0.64, 4.3, 1.1, 0.65], [0.76, 1.3, 0.8, 0.85], [0.46, 5.4, 0.6, -0.15], [0.84, 3.6, 0.6, 0.5]];
    if (detail) {
      limb(b, trunk, t => (0.27 - 0.21 * t + 0.16 * Math.max(0, 0.18 - t) / 0.18) * (t > 0.93 ? 1 - (t - 0.93) * 10 : 1), 14, sil, { n: 7, amp: 0.17, tw: tw, ph: SNAG_PH });
      const sp = tAt(0.62), lead = curve(sp, add(sp, [0.25, 0.45, 0.25]), add(sp, [0.2, 1.15, 0.5]), 4, r, 0.06);
      limb(b, lead, t => 0.09 * (1 - 0.92 * t), 7, sil, { n: 4, amp: 0.22, tw: 2 });
      // spine limbs: bow down then hook up at the tip
      for (const [t, az, L, el] of limbs) {
        const s = tAt(t), d = dirOf(az, el), e = add(s, scale(d, L)), pts = curve(s, add(s, add(scale(d, L * 0.55), [0, -0.2, 0])), add(e, [0, 0.05, 0]), 3, r, 0.05), r0 = 0.1 * (1 - 0.4 * t);
        limb(b, pts, q => q < 0.7 ? r0 * (1 - 0.5 * q) : r0 * 0.65 * (1 - (q - 0.7) / 0.3 * 0.9), 6, sil, { n: 3, amp: 0.22, tw: 1.5 });
        if (L > 0.9) { const a = pts[2], e2 = add(a, add(scale(d, 0.15), [d[2] * 0.2, 0.4, -d[0] * 0.2])); limb(b, [a, lerp(a, e2, 0.5), e2], q => r0 * 0.45 * (1 - 0.9 * q), 4, sil); }
      }
      // root knuckles at the base
      for (let k = 0; k < 3; k++) { const az = k * 2.1 + 0.5, d = dirOf(az, -0.35); limb(b, [[d[0] * 0.08, 0.15, d[2] * 0.08], [d[0] * 0.3, 0.02, d[2] * 0.3], [d[0] * 0.55, -0.3, d[2] * 0.55]], q => 0.1 * (1 - 0.6 * q), 5, sil, { n: 2, amp: 0.2, tw: 2 }); }
    } else {
      limb(b, trunk, t => 0.28 - 0.25 * t, 4, () => [0.74, 0.70, 0.80]);
      const sp = tAt(0.62); limb(b, [sp, add(sp, [0.2, 1.15, 0.5])], t => 0.08 * (1 - 0.9 * t), 3, () => [0.78, 0.74, 0.84]);
      for (const [t, az, L, el] of limbs.slice(0, 3)) { const s = tAt(t); limb(b, [s, add(s, scale(dirOf(az, el), L))], q => 0.08 * (1 - 0.8 * q), 3, () => [0.78, 0.74, 0.84]); }
    }
    return b;
  }

  // ---------- 7. Bunchgrass -> filament tuft with bulb tips ----------
  // A clump of thin teal tube-stalks arching out, each ending in a small pale cyan bulb, plus a few bare violet hairs.
  // Far away: flat ribbons that swell into a bright bulb shape near the tip.
  function bunchgrass(detail) {
    const b = new MB(), r = rnd(7741);
    const STEM = [0.10, 0.36, 0.40], STEM_L = [0.30, 0.66, 0.68], HAIR = [0.46, 0.34, 0.66], HAIR_L = [0.76, 0.64, 0.92];
    if (detail) {
      // [azimuth, lean]: three long arching stalks set the old tuft's footprint, the rest stand more upright
      const STALKS = [[-1.57, 0.95], [0.1, 0.92], [3.1, 0.84], [1.45, 0.52], [2.3, 0.3], [-0.7, 0.42], [4.0, 0.14]];
      for (const [az0, lean0] of STALKS) {
        const az = az0 + (r() - 0.5) * 0.1, lean = lean0 + (r() - 0.5) * 0.04, L = 0.53 + r() * 0.05;
        const h = [Math.sin(az), 0, Math.cos(az)], o = [(r() - 0.5) * 0.06, -0.114, (r() - 0.5) * 0.06];
        const tip = [o[0] + h[0] * L * Math.sin(lean) * 0.95, -0.12 + L * Math.cos(lean) * 0.95 + 0.1, o[2] + h[2] * L * Math.sin(lean) * 0.95];
        const ctrl = [o[0] + h[0] * L * Math.sin(lean) * 0.25, -0.12 + L * 0.6, o[2] + h[2] * L * Math.sin(lean) * 0.25];
        const k = 0.88 + 0.24 * r();
        limb(b, curve(o, ctrl, tip, 2, r, 0), t => 0.013 - 0.006 * t, 3, t => shade(mix(STEM, STEM_L, t), k));
        clump(b, OCT, tip, [0.032, 0.045, 0.032], (r() - 0.5) * 0.4, r() * 6.3, r, 0.1, (p, n) => n[1] > 0.3 ? CYAN : mix(TEAL_L, CYAN, 0.45), null, 0);
      }
      // bare hairs: thin arching ribbons
      for (let i = 0; i < 7; i++) {
        const az = i * 2.39996 + 1.6 + (r() - 0.5) * 0.4, lean = 0.35 + r() * 0.35, L = 0.38 + r() * 0.1, bend = 0.1 + r() * 0.1;
        const o = [(r() - 0.5) * 0.06, -0.12, (r() - 0.5) * 0.06], h = [Math.sin(az), 0, Math.cos(az)], side = [Math.cos(az), 0, -Math.sin(az)];
        const fn = t => { const hz = L * (Math.sin(lean) * t + bend * t * t), y = 0.1 * Math.min(1, t * 8) + L * (Math.cos(lean) * t - bend * 0.7 * t * t); return [o[0] + h[0] * hz, o[1] + y, o[2] + h[2] * hz]; };
        blade(b, fn, side, t => 0.01 * (1 - 0.8 * t) + 0.002, [0, 0.5, 1], t => mix(HAIR, HAIR_L, t), 0);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const az = i * 2.39996 + 0.4, lean = 0.2 + (i % 3) * 0.25, L = 0.55;
        const h = [Math.sin(az), 0, Math.cos(az)], side = [Math.cos(az), 0, -Math.sin(az)];
        const fn = t => [h[0] * L * Math.sin(lean) * t, -0.12 + (L * Math.cos(lean) + 0.1) * t, h[2] * L * Math.sin(lean) * t];
        blade(b, fn, side, t => t < 0.7 ? 0.018 + 0.03 * t / 0.7 : 0.048, [0, 0.72, 1], t => t > 0.6 ? mix(TEAL_L, CYAN, (t - 0.6) / 0.4) : mix(STEM, STEM_L, t), 0);
      }
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
