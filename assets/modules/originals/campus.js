window.MODDEF = { fn: (function (K) {
  // Observatory campus: operations building, water tower, solar array row, equipment shed, yard clutter.
  // Every item is centred on the origin with its front facing +Z. Units are metres, y = 0 is the ground.
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd } = K;
  const PI = Math.PI;

  // ---------- palette ----------
  const STUCCO = [0.77, 0.65, 0.50], STUCCO_IN = [0.70, 0.60, 0.48], BASE = [0.44, 0.35, 0.27], REVEAL = [0.68, 0.58, 0.46];
  const CAP = [0.88, 0.83, 0.74], GLASS = [0.08, 0.12, 0.16, 0.5], BRONZE = [0.33, 0.25, 0.17, 0.25], CORTEN = [0.42, 0.22, 0.12, 0.05];
  const CORTEN_D = [0.32, 0.17, 0.09, 0.05], CONC = [0.66, 0.63, 0.58, 1], CONC_D = [0.46, 0.44, 0.41, 1], STEEL = [0.55, 0.57, 0.60, 0.3];
  const GALV = [0.68, 0.70, 0.72, 0.22], DKSTEEL = [0.22, 0.23, 0.25, 0.2], ROOFM = [0.64, 0.61, 0.56], WHITE = [0.92, 0.92, 0.90, 0.1];
  const DOOR = [0.42, 0.38, 0.32, 0.12], BLACK = [0.07, 0.07, 0.08, 0.05], RUBBER = [0.1, 0.1, 0.1];
  const GRAVEL = [0.62, 0.52, 0.42], ROCK = [0.58, 0.40, 0.30], AGAVE = [0.42, 0.55, 0.45], AGAVE_D = [0.32, 0.45, 0.38];
  const WOOD = [0.55, 0.40, 0.26], WOOD_D = [0.40, 0.29, 0.18];
  const sh = (c, k) => { const o = [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)]; if (c.length > 3) o.push(c[3]); return o; };
  const tint = (c, dr, dg, db) => { const o = [Math.max(0, Math.min(1, c[0] + dr)), Math.max(0, Math.min(1, c[1] + dg)), Math.max(0, Math.min(1, c[2] + db))]; if (c.length > 3) o.push(c[3]); return o; };
  const vary = (c, r, a) => { const k = 1 + (r() - 0.5) * 2 * a, w = (r() - 0.5) * a * 0.6; return tint(sh(c, k), w, w * 0.4, -w * 0.5); };

  // ---------- shared helpers (all in the current transform) ----------
  // Stucco skin over a wall lying in local u (along wall) / v (up) with +Z out of the wall, surface at z = 0.
  // bands: [{v0, v1, t, col, pw}] ; holes: [{u0,u1,v0,v1}] are left open (windows / doors / other volumes).
  function skin(b, M, u0, u1, bands, holes, r) {
    b.push(M);
    for (const bd of bands) {
      const pw = bd.pw || 3.2, gap = 0.025, n = Math.max(1, Math.round((u1 - u0) / pw)), step = (u1 - u0) / n;
      const joints = []; for (let k = 1; k < n; k++) joints.push(u0 + k * step);
      const cols = []; for (let k = 0; k < n; k++) cols.push(vary(bd.col, r, 0.06));
      const brk = new Set([u0, u1, ...joints]);
      for (const h of holes) { if (h.u0 > u0 && h.u0 < u1) brk.add(h.u0); if (h.u1 > u0 && h.u1 < u1) brk.add(h.u1); }
      const us = [...brk].sort((a, c) => a - c);
      const isJ = u => joints.some(j => Math.abs(j - u) < 1e-6);
      for (let i = 0; i < us.length - 1; i++) {
        const a = us[i], c = us[i + 1]; if (c - a < 0.005) continue; const mid = (a + c) / 2;
        const hs = holes.filter(h => h.u0 <= mid && h.u1 >= mid).sort((p, q) => p.v0 - q.v0);
        let v = bd.v0; const iv = [];
        for (const h of hs) { if (h.v0 > v) iv.push([v, Math.min(h.v0, bd.v1)]); v = Math.max(v, h.v1); }
        if (v < bd.v1) iv.push([v, bd.v1]);
        const gl = isJ(a) ? gap / 2 : 0, gr = isJ(c) ? gap / 2 : 0, col = cols[Math.min(n - 1, Math.floor((mid - u0) / step))];
        for (const [p, q] of iv) if (q - p > 0.005) b.box(mid + (gl - gr) / 2, (p + q) / 2, bd.t / 2, c - a - gl - gr, q - p, bd.t, col);
      }
    }
    b.pop();
  }
  // punched window in local wall coords (surface z = 0), with stucco reveal, sill, bronze frame and optional steel hood
  function windowUnit(b, uc, vc, w, h, r, hood) {
    const R = 0.13, d = 0.13, rv = vary(REVEAL, r, 0.03);
    b.box(uc, vc, 0.0, w, h, 0.04, vary(GLASS, r, 0.15));
    b.box(uc, vc + h / 2 + R / 2, d / 2, w + 2 * R, R, d, rv);
    b.box(uc - w / 2 - R / 2, vc, d / 2, R, h, d, rv); b.box(uc + w / 2 + R / 2, vc, d / 2, R, h, d, rv);
    b.box(uc, vc - h / 2 - 0.04, 0.12, w + 2 * R + 0.12, 0.08, 0.24, CAP);
    const f = 0.05;
    b.box(uc, vc + h / 2 - f / 2, 0.035, w, f, 0.04, BRONZE); b.box(uc, vc - h / 2 + f / 2, 0.035, w, f, 0.04, BRONZE);
    b.box(uc - w / 2 + f / 2, vc, 0.035, f, h, 0.04, BRONZE); b.box(uc + w / 2 - f / 2, vc, 0.035, f, h, 0.04, BRONZE);
    if (w > 1.1) b.box(uc, vc, 0.035, f, h, 0.04, BRONZE); else b.box(uc, vc - h * 0.15, 0.035, w, f, 0.04, BRONZE);
    if (hood) { b.box(uc, vc + h / 2 + R + 0.03, 0.32, w + 2 * R + 0.2, 0.06, 0.64, CORTEN); b.box(uc, vc + h / 2 + R + 0.12, 0.62, w + 2 * R + 0.2, 0.18, 0.04, CORTEN_D); }
  }
  // steel service door (single or double) in local wall coords, threshold at v0
  function serviceDoor(b, uc, v0, w, h, col, dbl) {
    const fr = 0.07;
    b.box(uc, v0 + h / 2, 0.0, w, h, 0.05, sh(col, 0.85));
    const leaves = dbl ? [[uc - w / 4, w / 2 - 0.01], [uc + w / 4, w / 2 - 0.01]] : [[uc, w - 0.02]];
    leaves.forEach(([lc, lw], i) => {
      b.box(lc, v0 + h / 2, 0.03, lw - 0.02, h - 0.02, 0.04, col);
      b.box(lc, v0 + 0.15, 0.055, lw - 0.1, 0.25, 0.01, GALV);                       // kick plate
      b.box(lc, v0 + h * 0.72, 0.055, lw * 0.5, 0.36, 0.012, sh(col, 0.75));         // vision panel recess
      const hx = dbl ? (i ? lc - lw / 2 + 0.1 : lc + lw / 2 - 0.1) : lc + lw / 2 - 0.12;
      b.box(hx, v0 + 1.02, 0.08, 0.04, 0.2, 0.03, STEEL); b.box(hx + (i ? 0.05 : -0.05), v0 + 1.05, 0.11, 0.13, 0.025, 0.025, STEEL);
      for (const hv of [0.25, h - 0.3, h * 0.55]) b.box(dbl ? (i ? lc + lw / 2 - 0.02 : lc - lw / 2 + 0.02) : lc - lw / 2 + 0.02, v0 + hv, 0.05, 0.03, 0.12, 0.03, DKSTEEL);
    });
    b.box(uc, v0 + h + fr / 2, 0.05, w + 2 * fr, fr, 0.1, DKSTEEL);
    b.box(uc - w / 2 - fr / 2, v0 + h / 2, 0.05, fr, h, 0.1, DKSTEEL); b.box(uc + w / 2 + fr / 2, v0 + h / 2, 0.05, fr, h, 0.1, DKSTEEL);
    b.box(uc, v0 + h + 0.35, 0.45, w + 0.6, 0.08, 0.9, CORTEN);                        // small hood
    b.box(uc, v0 + h + 0.25, 0.88, w + 0.6, 0.14, 0.04, CORTEN_D);
    for (const s of [-1, 1]) b.beam([uc + s * (w / 2 + 0.2), v0 + h + 0.8, 0.02], [uc + s * (w / 2 + 0.2), v0 + h + 0.36, 0.86], 0.025, DKSTEEL);
  }
  // wall-pack light fixture, local wall coords
  function wallPack(b, u, v) {
    b.box(u, v, 0.02, 0.3, 0.34, 0.04, DKSTEEL);
    b.box(u, v + 0.02, 0.13, 0.32, 0.2, 0.2, [0.25, 0.24, 0.22, 0.2]);
    b.box(u, v - 0.09, 0.15, 0.26, 0.02, 0.15, [0.96, 0.95, 0.85, 0.3]);
    b.box(u, v + 0.13, 0.13, 0.28, 0.02, 0.2, [0.3, 0.29, 0.27, 0.2]);
  }
  // simple tubular handrail along points with posts
  function rail(b, pts, hgt, col, postEvery) {
    const top = pts.map(p => [p[0], p[1] + hgt, p[2]]), mid = pts.map(p => [p[0], p[1] + hgt * 0.5, p[2]]);
    b.tube(top, 0.022, 8, col); b.tube(mid, 0.016, 6, col);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1], L = Math.hypot(c[0] - a[0], c[2] - a[2]), n = Math.max(1, Math.round(L / postEvery));
      for (let k = (i ? 1 : 0); k <= n; k++) { const t = k / n, p = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t]; b.cyl(p, [p[0], p[1] + hgt, p[2]], 0.022, 0.022, 8, col); b.cyl(p, [p[0], p[1] + 0.012, p[2]], 0.06, 0.06, 8, col); }
    }
  }
  function agave(b, x, y, z, s, r) {
    const n = 11 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + r() * 0.3, tilt = 0.35 + (i / n) * 0.9, L = s * (0.55 + 0.45 * (1 - i / n)) * (0.85 + 0.3 * r());
      const dx = Math.cos(a), dz = Math.sin(a), tip = [x + dx * Math.sin(tilt) * L, y + Math.cos(tilt) * L, z + dz * Math.sin(tilt) * L];
      b.beam([x, y, z], tip, s * 0.13, i % 2 ? AGAVE : AGAVE_D, s * 0.025);
    }
  }
  function rock(b, x, y, z, s, r) { b.push(mulAll(tr(x, y, z), rotY(r() * 6), sc(1, 0.6 + r() * 0.3, 0.8 + r() * 0.4))); b.sphere(0, 0, 0, s, 6, vary(ROCK, r, 0.12)); b.pop(); }

  // ======================================================================
  // 1. OPS BUILDING
  // ======================================================================
  function opsBuilding(detail) {
    const b = new MB(), r = rnd(1101);
    const H = 4.5, PT = 5.05, EH = 6.2, EPT = 6.6;
    if (!detail) {
      b.box(0, -0.2, 0.75, 36, 0.64, 21.5, CONC);
      b.box(0, 1.0, 0, 30.1, 7.0, 14.1, STUCCO); b.box(0, 4.78, 0, 30.1, 0.55, 14.1, CAP);
      b.box(0, 0.5, 0, 30.2, 0.8, 14.2, BASE);
      b.box(-6.5, 1.95, 2.0, 6.1, 9.1, 12.1, sh(STUCCO, 0.95));
      b.box(5.5, 2.1, 7.06, 18, 2.4, 0.1, GLASS); b.box(-6.5, 3.1, 8.06, 2.6, 5.0, 0.1, GLASS);
      b.box(5.65, 3.65, 8.7, 18.3, 0.35, 3.4, CORTEN);
      for (let x = -3.2; x < 15; x += 3.5) b.box(x, 1.8, 10.0, 0.2, 3.4, 0.2, DKSTEEL);
      b.box(-6.5, 0.36, 8.8, 6, 0.48, 1.6, CONC); b.box(-12.4, 0.3, 8.85, 5.8, 0.36, 1.4, CONC);
      b.box(5, 5.3, -2, 4, 1.6, 2.2, GALV); b.box(10, 5.2, 1.5, 3, 1.4, 1.8, GALV); b.box(-12, 5.0, -4, 2, 1.0, 1.4, GALV);
      b.box(13, 8.0, 4, 0.3, 7.0, 0.3, STEEL); b.box(-12, 5.9, 3, 1.2, 1.2, 0.5, WHITE);
      b.box(7, 0.4, 10.95, 13, 0.6, 0.7, sh(STUCCO, 0.9)); b.box(-12.5, 1.0, 10.85, 2.4, 1.8, 0.5, CORTEN);
      for (const x of [-13.6, -11]) b.box(x, 2.25, 7.03, 1.5, 1.5, 0.1, GLASS);
      for (const x of [12, 4, 1, -2, -11, -13]) b.box(x, 2.9, -7.03, 1.2, 0.9, 0.1, GLASS);
      for (const z of [-4.5, -1.5, 1.5, 4.5]) { b.box(15.03, 2.25, z, 0.1, 1.2, 1.2, GLASS); b.box(-15.03, 2.4, z, 0.1, 1.0, 1.0, GLASS); }
      b.box(8, 1.8, -7.04, 1.8, 2.4, 0.1, [0.36, 0.42, 0.44]); b.box(-6, 1.7, -7.04, 1.0, 2.2, 0.1, DOOR);
      b.box(-6.5, 5.85, 8.3, 3.4, 0.36, 0.7, CORTEN); b.box(16.6, 5.3, 10.6, 0.1, 10.4, 0.1, STEEL);
      b.box(-12.4, 0.75, 8.85, 5.8, 0.06, 1.5, sh(DKSTEEL, 1.2));
      return b;
    }

    // ---- paved apron (3 m around), slabs with joints and shade variation ----
    b.box(0, -0.75, 0.75, 36.4, 1.66, 21.9, CONC_D);               // underlay / edge, top 0.08 shows as joints
    for (const [x0, x1, z0, z1] of [[-18.2, 18.2, -10.2, -9.9], [-18.2, 18.2, 11.4, 11.7], [-18.2, -17.9, -10.2, 11.7], [17.9, 18.2, -10.2, 11.7]]) b.box((x0 + x1) / 2, -0.7, (z0 + z1) / 2, x1 - x0, 1.6, z1 - z0, CONC_D);
    const xs = []; for (let x = -18; x <= 18.01; x += 1.5) xs.push(x);
    const zs = [-10, -8.5, -7, -5.5, -4, -2.5, -1, 0.5, 2, 3.5, 5, 7, 8.125, 9.25, 10.375, 11.5];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1];
      if (x0 >= -15 && x1 <= 15 && z0 >= -7 && z1 <= 7) continue;
      b.box((x0 + x1) / 2, -0.21, (z0 + z1) / 2, x1 - x0 - 0.035, 0.66, z1 - z0 - 0.035, vary(CONC, r, 0.05));
    }

    // ---- main volume core, parapets, roof ----
    b.box(0, 1.0, 0, 29.9, 7.0, 13.9, STUCCO_IN);
    for (const [cx, cz, sx, sz] of [[0, 6.83, 30, 0.34], [0, -6.83, 30, 0.34], [14.83, 0, 0.34, 14], [-14.83, 0, 0.34, 14]]) b.box(cx, (H + PT) / 2, cz, sx, PT - H, sz, sh(STUCCO_IN, 1.04));
    for (let x = -15; x < 14.9; x += 2.5) { const c = vary(CAP, r, 0.03); for (const z of [6.9, -6.9]) b.box(x + 1.25, PT + 0.04, z, 2.48, 0.08, 0.42 + 0.06, c); }
    for (let z = -7.1; z < 7.0; z += 2.37) { const c = vary(CAP, r, 0.03); for (const x of [14.9, -14.9]) b.box(x, PT + 0.04, z + 1.185, 0.48, 0.08, 2.35, c); }
    for (let x = -14.6; x < 14.4; x += 2.92) for (let z = -6.6; z < 6.4; z += 2.64) b.box(x + 1.46, H + 0.012, z + 1.32, 2.9, 0.024, 2.62, vary(ROOFM, r, 0.04));

    // ---- stucco skins on the four main walls ----
    const bandsMain = [{ v0: -2.5, v1: 0.9, t: 0.09, col: BASE, pw: 3 }, { v0: 0.9, v1: PT, t: 0.05, col: STUCCO, pw: 3 }];
    // front (z = +7), u = x
    const MF = tr(0, 0, 6.95);
    const frontWins = [[-13.6, 2.25, 1.5, 1.5], [-11.0, 2.25, 1.5, 1.5]];
    skin(b, MF, -15.05, 15.05, bandsMain, [{ u0: -9.5, u1: -3.5, v0: -3, v1: 6 }, { u0: -3.5, u1: 14.5, v0: 0.9, v1: 3.3 }, ...frontWins.map(w => ({ u0: w[0] - w[2] / 2, u1: w[0] + w[2] / 2, v0: w[1] - w[3] / 2, v1: w[1] + w[3] / 2 }))], r);
    b.push(MF);
    frontWins.forEach(w => windowUnit(b, w[0], w[1], w[2], w[3], r, true));
    // curtain wall: 12 bays of 1.5 m, lower and upper panes, bronze mullions
    for (let k = 0; k < 12; k++) { const u = -3.5 + k * 1.5 + 0.75; b.box(u, 1.7, 0.0, 1.5, 1.6, 0.04, vary(GLASS, r, 0.18)); b.box(u, 2.9, 0.0, 1.5, 0.8, 0.04, vary(GLASS, r, 0.18)); }
    for (let k = 0; k <= 12; k++) { const u = -3.5 + k * 1.5; b.box(u, 2.1, 0.09, 0.075, 2.4, 0.18, BRONZE); b.box(u, 2.1, 0.19, 0.03, 2.4, 0.03, sh(BRONZE, 1.3)); }
    for (const v of [0.93, 2.5, 3.28]) b.box(5.5, v, 0.08, 18, 0.07, 0.16, BRONZE);
    b.box(5.5, 0.86, 0.14, 18.2, 0.06, 0.28, CAP);                 // sill ledge
    // fascia letters? no - a band of weathered steel above the canopy line
    b.box(5.5, 4.15, 0.07, 18.4, 0.12, 0.08, CORTEN_D);
    b.pop();

    // rear (z = -7), u = -x
    const MB_ = mulAll(tr(0, 0, -6.95), rotY(PI));
    const rearWins = [[-12, 2.9, 1.2, 0.9], [-4, 2.9, 1.2, 0.9], [-1, 2.9, 1.2, 0.9], [2, 2.9, 1.2, 0.9], [11, 2.9, 1.2, 0.9], [13, 2.9, 1.2, 0.9]];
    const rearDoors = [[-8, 1.8, 2.4, true], [6, 1.0, 2.2, false]];
    skin(b, MB_, -15.05, 15.05, bandsMain, [...rearWins.map(w => ({ u0: w[0] - w[2] / 2, u1: w[0] + w[2] / 2, v0: w[1] - w[3] / 2, v1: w[1] + w[3] / 2 })), ...rearDoors.map(d => ({ u0: d[0] - d[1] / 2, u1: d[0] + d[1] / 2, v0: 0.6, v1: 0.6 + d[2] }))], r);
    b.push(MB_);
    rearWins.forEach(w => windowUnit(b, w[0], w[1], w[2], w[3], r, false));
    rearDoors.forEach(d => {
      serviceDoor(b, d[0], 0.6, d[1], d[2], d[3] ? [0.36, 0.42, 0.44, 0.12] : DOOR, d[3]);
      b.box(d[0], 0.36, 0.85, d[1] + 1.2, 0.48, 1.7, vary(CONC, r, 0.04));
      b.box(d[0], 0.36, 1.85, d[1] + 0.8, 0.16, 0.3, CONC); b.box(d[0], 0.2, 2.15, d[1] + 0.8, 0.16, 0.3, CONC);
      rail(b, [[d[0] + d[1] / 2 + 0.5, 0.6, 0.15], [d[0] + d[1] / 2 + 0.5, 0.6, 1.65], [d[0] + d[1] / 2 + 0.5, 0.12, 2.3]], 0.95, [0.2, 0.3, 0.32, 0.15], 0.9);
      wallPack(b, d[0], 0.6 + d[2] + 0.75);
    });
    for (const u of [-11.5, -3, 2.8, 9.8]) wallPack(b, u, 3.6);
    // electrical panel with meter and conduits
    b.box(-5.4, 1.75, 0.15, 0.9, 1.2, 0.3, [0.62, 0.63, 0.6, 0.15]); b.box(-5.4, 1.75, 0.31, 0.8, 1.1, 0.02, [0.66, 0.67, 0.64, 0.15]);
    b.box(-5.05, 1.75, 0.34, 0.04, 0.2, 0.04, DKSTEEL); b.box(-5.4, 2.1, 0.33, 0.3, 0.12, 0.01, [0.85, 0.75, 0.2]);
    b.box(-4.6, 1.6, 0.12, 0.35, 0.5, 0.24, [0.6, 0.6, 0.58, 0.15]); b.cyl([-4.6, 1.65, 0.24], [-4.6, 1.65, 0.34], 0.12, 0.12, 14, [0.8, 0.85, 0.88, 0.4]);
    for (let k = 0; k < 3; k++) {
      const u = -5.65 + k * 0.25;
      b.tube([[u, 2.35, 0.12], [u, 4.9, 0.12], [u, 5.2, 0.05], [u, 5.25, -0.3]], 0.035, 8, GALV);
      b.tube([[u, 1.15, 0.12], [u, 0.5, 0.12], [u, 0.15, 0.2]], 0.035, 8, GALV);
      for (let v = 2.8; v < 4.9; v += 0.7) b.box(u, v, 0.07, 0.1, 0.05, 0.06, DKSTEEL);
    }
    b.tube([[-4.6, 1.35, 0.12], [-4.6, 0.3, 0.12]], 0.03, 8, GALV);
    // roof access ladder with goose-neck over the parapet
    for (const s of [-1, 1]) {
      b.tube([[8.5 + s * 0.24, 0.12, 0.25], [8.5 + s * 0.24, PT + 0.9, 0.25], [8.5 + s * 0.24, PT + 1.05, 0.0], [8.5 + s * 0.24, PT + 0.9, -0.4], [8.5 + s * 0.24, PT, -0.45]], 0.028, 8, GALV);
      for (const v of [0.8, 2.4, 4.0]) b.beam([8.5 + s * 0.24, v, 0.25], [8.5 + s * 0.24, v, 0.0], 0.04, DKSTEEL);
    }
    for (let v = 0.42; v < PT + 0.6; v += 0.3) b.cyl([8.26, v, 0.25], [8.74, v, 0.25], 0.017, 0.017, 6, GALV);
    // scuppers with downpipes
    for (const u of [-14, 0.5, 14]) {
      b.box(u, 4.75, 0.12, 0.3, 0.2, 0.24, CORTEN); b.box(u, 4.45, 0.2, 0.42, 0.4, 0.3, CORTEN);
      b.box(u, 2.3, 0.15, 0.14, 3.9, 0.12, CORTEN_D);
      for (const v of [1.2, 2.6, 3.8]) b.box(u, v, 0.1, 0.2, 0.05, 0.1, DKSTEEL);
      b.box(u, 0.14, 0.55, 0.4, 0.06, 0.8, CONC_D);
    }
    b.pop();

    // east (x = +15), u = -z
    const ME = mulAll(tr(14.95, 0, 0), rotY(PI / 2));
    const eastWins = [[-4.5, 2.25, 1.4, 1.3], [-1.5, 2.25, 1.4, 1.3], [1.5, 2.25, 1.4, 1.3]];
    skin(b, ME, -7.05, 7.05, bandsMain, [...eastWins.map(w => ({ u0: w[0] - w[2] / 2, u1: w[0] + w[2] / 2, v0: w[1] - w[3] / 2, v1: w[1] + w[3] / 2 })), { u0: 4.0, u1: 5.0, v0: 0.6, v1: 2.8 }], r);
    b.push(ME);
    eastWins.forEach(w => windowUnit(b, w[0], w[1], w[2], w[3], r, true));
    serviceDoor(b, 4.5, 0.6, 1.0, 2.2, DOOR, false);
    b.box(4.5, 0.36, 0.7, 2.0, 0.48, 1.4, CONC); b.box(4.5, 0.36, 1.55, 1.6, 0.16, 0.3, CONC); b.box(4.5, 0.2, 1.85, 1.6, 0.16, 0.3, CONC);
    wallPack(b, 4.5, 3.55); wallPack(b, -3, 3.6);
    b.tube([[6.2, 0.15, 0.1], [6.2, 4.9, 0.1], [6.2, 5.2, 0.0], [6.2, 5.25, -0.3]], 0.04, 8, GALV);
    b.box(6.2, 1.2, 0.12, 0.45, 0.6, 0.2, [0.6, 0.6, 0.57, 0.15]);
    b.pop();

    // west (x = -15), u = z
    const MW = mulAll(tr(-14.95, 0, 0), rotY(-PI / 2));
    const westWins = [[-4.5, 2.4, 1.0, 1.0], [-1.5, 2.4, 1.0, 1.0], [1.5, 2.4, 1.0, 1.0], [4.5, 2.4, 1.0, 1.0]];
    skin(b, MW, -7.05, 7.05, bandsMain, westWins.map(w => ({ u0: w[0] - w[2] / 2, u1: w[0] + w[2] / 2, v0: w[1] - w[3] / 2, v1: w[1] + w[3] / 2 })), r);
    b.push(MW);
    westWins.forEach(w => windowUnit(b, w[0], w[1], w[2], w[3], r, false));
    wallPack(b, 0, 3.7); wallPack(b, -6, 3.7); wallPack(b, 6, 3.7);
    b.pop();

    // ---- entrance volume (x -9.5..-3.5, z -4..8, roof 6.2) ----
    b.box(-6.5, 1.85, 2.0, 5.9, 8.7, 11.9, STUCCO_IN);
    for (const [cx, cz, sx, sz] of [[-6.5, 7.83, 6, 0.34], [-6.5, -3.83, 6, 0.34], [-3.67, 2, 0.34, 12], [-9.33, 2, 0.34, 12]]) b.box(cx, (EH + EPT) / 2, cz, sx, EPT - EH, sz, sh(STUCCO_IN, 1.04));
    for (let x = -9.6; x < -3.7; x += 2.03) { const c = vary(CAP, r, 0.03); for (const z of [7.9, -3.9]) b.box(x + 1.015, EPT + 0.04, z, 2.0, 0.08, 0.48, c); }
    for (let z = -4.1; z < 7.8; z += 3.03) { const c = vary(CAP, r, 0.03); for (const x of [-3.6, -9.4]) b.box(x, EPT + 0.04, z + 1.515, 0.48, 0.08, 3.0, c); }
    for (let x = -9.2; x < -4.0; x += 1.8) for (let z = -3.7; z < 7.5; z += 2.85) b.box(x + 0.9, EH + 0.012, z + 1.425, 1.78, 0.024, 2.83, vary(ROOFM, r, 0.04));
    const bandsE = [{ v0: -2.5, v1: 0.9, t: 0.09, col: BASE, pw: 3 }, { v0: 0.9, v1: EPT, t: 0.05, col: sh(STUCCO, 1.03), pw: 2 }];
    const ME_F = tr(0, 0, 7.95);
    skin(b, ME_F, -9.55, -3.45, bandsE, [{ u0: -7.8, u1: -5.2, v0: 0.6, v1: 5.6 }], r);
    skin(b, mulAll(tr(-3.45, 0, 0), rotY(PI / 2)), -8.0, -7.0, bandsE, [], r);
    skin(b, mulAll(tr(-9.55, 0, 0), rotY(-PI / 2)), 7.0, 8.0, bandsE, [], r);
    const upper = [{ v0: H, v1: EPT, t: 0.05, col: sh(STUCCO, 0.97), pw: 3 }];
    skin(b, mulAll(tr(-3.45, 0, 0), rotY(PI / 2)), -7.0, 4.05, upper, [], r);
    skin(b, mulAll(tr(-9.55, 0, 0), rotY(-PI / 2)), -4.05, 7.0, upper, [], r);
    skin(b, mulAll(tr(0, 0, -3.95), rotY(PI)), 3.45, 9.55, upper, [], r);
    for (const [x, z, w, d] of [[-3.45, 1.5, 0.12, 11.1], [-9.55, 1.5, 0.12, 11.1], [-6.5, -3.95, 6.2, 0.12]]) b.box(x, H + 0.1, z, w + 0.04, 0.2, d, GALV);   // flashing at roof line
    b.push(ME_F);
    // storefront: double glass doors, sidelights, transom and tall upper glazing
    b.box(-6.5, 3.1, 0.02, 2.6, 5.0, 0.03, sh(GLASS, 0.9));
    for (const [u, v, w, h] of [[-7.0, 1.75, 0.95, 2.25], [-6.0, 1.75, 0.95, 2.25]]) {
      b.box(u, v, 0.045, w, h, 0.03, vary(GLASS, r, 0.1));
      for (const [du, dv, ww, hh] of [[0, h / 2 - 0.05, w, 0.1], [0, -h / 2 + 0.09, w, 0.18], [-w / 2 + 0.04, 0, 0.08, h], [w / 2 - 0.04, 0, 0.08, h]]) b.box(u + du, v + dv, 0.05, ww, hh, 0.06, BRONZE);
      b.cyl([u + (u < -6.5 ? 0.38 : -0.38), v - 0.25, 0.12], [u + (u < -6.5 ? 0.38 : -0.38), v + 0.35, 0.12], 0.02, 0.02, 8, STEEL);
      for (const dv of [-0.25, 0.35]) b.beam([u + (u < -6.5 ? 0.38 : -0.38), v + dv, 0.06], [u + (u < -6.5 ? 0.38 : -0.38), v + dv, 0.12], 0.02, STEEL);
    }
    for (const u of [-7.8, -7.5, -6.5, -5.5, -5.2]) b.box(u, 3.1, 0.07, 0.08, 5.0, 0.14, BRONZE);
    for (const v of [0.63, 2.9, 3.3, 4.45, 5.57]) b.box(-6.5, v, 0.07, 2.66, 0.07, 0.14, BRONZE);
    b.box(-6.5, 3.1, 0.09, 0.05, 2.5, 0.1, BRONZE);
    // weathered-steel portal around the storefront
    b.box(-6.5, 5.85, 0.35, 3.4, 0.36, 0.7, CORTEN); b.box(-6.5, 5.66, 0.69, 3.4, 0.04, 0.04, CORTEN_D);
    for (const s of [-1, 1]) { b.box(-6.5 + s * 1.55, 3.2, 0.35, 0.3, 5.3, 0.7, CORTEN); b.box(-6.5 + s * 1.55, 3.2, 0.71, 0.32, 5.3, 0.02, CORTEN_D); }
    // coloured-block address numbers on the portal head
    for (let k = 0; k < 3; k++) b.box(-7.0 + k * 0.5, 6.25, 0.74, 0.3, 0.4, 0.05, [0.9, 0.86, 0.78, 0.2]);
    // gooseneck lights either side
    for (const s of [-1, 1]) { const u = -6.5 + s * 2.3; b.box(u, 3.6, 0.03, 0.18, 0.18, 0.06, DKSTEEL); b.tube([[u, 3.6, 0.03], [u, 3.6, 0.35], [u, 3.75, 0.55], [u, 3.7, 0.7]], 0.025, 8, DKSTEEL); b.cyl([u, 3.62, 0.72], [u, 3.48, 0.72], 0.05, 0.16, 12, DKSTEEL); b.cyl([u, 3.49, 0.72], [u, 3.47, 0.72], 0.15, 0.15, 12, [0.96, 0.94, 0.82, 0.3]); }
    b.pop();

    // ---- landing, steps and ramp with handrails ----
    b.box(-6.5, -0.15, 8.8, 6.0, 1.5, 1.6, vary(CONC, r, 0.03));            // landing top 0.6
    b.box(-6.5, 0.36, 9.75, 6.0, 0.16, 0.3, CONC); b.box(-6.5, 0.2, 10.05, 6.0, 0.16, 0.3, sh(CONC, 0.97));
    for (const z of [9.62, 9.92]) b.box(-6.5, z < 9.8 ? 0.43 : 0.27, z, 6.0, 0.025, 0.05, [0.85, 0.7, 0.2]);   // yellow nosings
    b.box(-6.5, 0.605, 8.4, 2.4, 0.01, 0.8, [0.25, 0.22, 0.2]);                // mat
    // ramp: x -9.5 (0.6) down to -15.3 (0.12)
    const rz0 = 8.15, rz1 = 9.55, rx0 = -9.5, rx1 = -15.3, ry0 = 0.6, ry1 = 0.12;
    b.plate([rx0, ry0, rz0], [rx1, ry1, rz0], [rx1, ry1, rz1], [rx0, ry0, rz1], vary(CONC, r, 0.04));
    for (const z of [rz0, rz1]) { b.plate([rx0, -0.3, z], [rx1, -0.3, z], [rx1, ry1, z], [rx0, ry0, z], CONC_D); b.beam([rx0, ry0 + 0.05, z], [rx1, ry1 + 0.05, z], 0.12, CONC); }
    b.box(rx1 - 0.5, 0.125, (rz0 + rz1) / 2, 1.0, 0.01, rz1 - rz0, [0.85, 0.7, 0.2]);   // warning strip at the foot
    const RC = [0.18, 0.28, 0.3, 0.15];
    rail(b, [[rx1 - 0.3, ry1, rz1 + 0.05], [rx1, ry1, rz1 + 0.05], [rx0, ry0, rz1 + 0.05], [-4.0, ry0, rz1 + 0.05]], 0.9, RC, 1.5);
    rail(b, [[rx1 - 0.3, ry1, rz0 - 0.05], [rx1, ry1, rz0 - 0.05], [rx0, ry0, rz0 - 0.05]], 0.9, RC, 1.5);
    rail(b, [[-3.6, ry0, 8.1], [-3.6, ry0, 9.6], [-3.6, 0.12, 10.25], [-3.6, 0.12, 10.55]], 0.9, RC, 1.0);
    rail(b, [[-6.5, ry0, 9.6], [-6.5, 0.12, 10.25], [-6.5, 0.12, 10.5]], 0.9, RC, 1.0);

    // ---- deep shading canopy on slender columns ----
    const cx0 = -3.45, cx1 = 14.85, cz0 = 7.0, cz1 = 10.4, cy = 3.5;
    b.box((cx0 + cx1) / 2, cy + 0.27, (cz0 + cz1) / 2, cx1 - cx0, 0.1, cz1 - cz0, sh(CORTEN, 0.85));          // deck
    b.box((cx0 + cx1) / 2, cy + 0.17, (cz0 + cz1) / 2, cx1 - cx0 - 0.1, 0.1, cz1 - cz0 - 0.1, DKSTEEL);
    b.box((cx0 + cx1) / 2, cy + 0.17, cz1 - 0.04, cx1 - cx0, 0.38, 0.08, CORTEN);                     // front fascia
    b.box((cx0 + cx1) / 2, cy + 0.33, cz1 - 0.04, cx1 - cx0, 0.04, 0.1, CORTEN_D);
    b.box(cx1 - 0.04, cy + 0.17, (cz0 + cz1) / 2, 0.08, 0.38, cz1 - cz0, CORTEN);
    for (let z = cz0 + 0.12; z < cz1 - 0.1; z += 0.16) b.box((cx0 + cx1) / 2, cy + 0.07, z, cx1 - cx0 - 0.2, 0.05, 0.1, vary(WOOD, r, 0.08));   // soffit slats
    for (let x = cx0 + 0.3; x < cx1; x += 3.05) b.box(x, cy + 0.01, (cz0 + cz1) / 2, 0.12, 0.1, cz1 - cz0, DKSTEEL);
    for (let x = cx0 + 1.8; x < cx1; x += 3.05) for (const z of [8.0, 9.4]) { b.cyl([x, cy + 0.02, z], [x, cy - 0.01, z], 0.1, 0.1, 10, DKSTEEL); b.cyl([x, cy - 0.012, z], [x, cy - 0.02, z], 0.08, 0.08, 10, [0.98, 0.95, 0.8, 0.3]); }
    b.box((cx0 + cx1) / 2, cy - 0.1, 10.0, cx1 - cx0, 0.2, 0.15, DKSTEEL);                          // beam on the columns
    for (const x of [-3.2, 0, 3, 6, 9, 12, 14.6]) {
      b.cyl([x, 0.12, 10.0], [x, cy - 0.2, 10.0], 0.085, 0.085, 12, DKSTEEL);
      b.box(x, 0.14, 10.0, 0.32, 0.04, 0.32, DKSTEEL); for (const s of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.cyl([x + s[0] * 0.11, 0.16, 10 + s[1] * 0.11], [x + s[0] * 0.11, 0.2, 10 + s[1] * 0.11], 0.018, 0.018, 6, STEEL);
      b.box(x, cy - 0.22, 10.0, 0.24, 0.04, 0.24, DKSTEEL);
      b.beam([x, 4.35, 7.05], [x, cy + 0.32, cz1 - 0.15], 0.035, DKSTEEL);                                       // tie rod
      b.box(x, 4.35, 7.07, 0.16, 0.2, 0.06, DKSTEEL);
    }

    // ---- planter wall with gravel, rocks and agaves ----
    const px0 = 0.5, px1 = 13.5, pz0 = 10.6, pz1 = 11.3, ph = 0.6;
    for (const [x, z, sx, sz] of [[(px0 + px1) / 2, pz1 - 0.08, px1 - px0, 0.16], [(px0 + px1) / 2, pz0 + 0.08, px1 - px0, 0.16], [px0 + 0.08, (pz0 + pz1) / 2, 0.16, pz1 - pz0], [px1 - 0.08, (pz0 + pz1) / 2, 0.16, pz1 - pz0]]) {
      const n = Math.max(1, Math.round(sx / 1.6)); for (let k = 0; k < n; k++) b.box(x - sx / 2 + (k + 0.5) * sx / n, (ph - 0.6) / 2 - 0.1 + 0.15, z, sx / n - 0.01, ph + 0.5, sz, vary(sh(STUCCO, 0.92), r, 0.04));
      b.box(x, ph + 0.03, z, sx + 0.06, 0.06, sz + 0.06, CORTEN);
    }
    b.box((px0 + px1) / 2, 0.42, (pz0 + pz1) / 2, px1 - px0 - 0.3, 0.06, pz1 - pz0 - 0.3, GRAVEL);
    for (let x = px0 + 1; x < px1 - 0.5; x += 2.2) { agave(b, x + r() * 0.4, 0.45, (pz0 + pz1) / 2, 0.55 + r() * 0.2, r); rock(b, x + 1.0, 0.46, (pz0 + pz1) / 2 + (r() - 0.5) * 0.2, 0.14, r); }
    // planting bed in front of the west wing, between wall and ramp
    for (let x = -14.3; x < -9.8; x += 1.5) { agave(b, x, 0.12, 7.6, 0.45, r); rock(b, x + 0.7, 0.12, 7.55, 0.12, r); }
    b.box(-12.25, 0.15, 7.6, 5.4, 0.06, 1.0, GRAVEL);

    // ---- monument sign of coloured blocks ----
    b.push(tr(-12.5, 0, 10.85));
    b.box(0, 0.2, 0, 2.6, 0.4, 0.6, vary(sh(STUCCO, 0.9), r, 0.02)); b.box(0, 0.42, 0, 2.7, 0.05, 0.7, CAP);
    b.box(0, 1.25, 0, 2.3, 1.6, 0.2, CORTEN); b.box(0, 1.25, 0.11, 2.2, 1.5, 0.02, CORTEN_D);
    b.box(0, 2.07, 0, 2.4, 0.06, 0.3, CORTEN);
    // logo: a white dish made of blocks + a red signal dot
    for (let k = -3; k <= 3; k++) b.box(-0.75 + k * 0.07, 1.55 + 0.012 * k * k, 0.14, 0.07, 0.07, 0.04, [0.93, 0.92, 0.88, 0.1]);
    b.box(-0.75, 1.42, 0.14, 0.05, 0.22, 0.04, [0.93, 0.92, 0.88, 0.1]); b.box(-0.75, 1.32, 0.14, 0.25, 0.04, 0.04, [0.93, 0.92, 0.88, 0.1]);
    b.box(-0.75, 1.82, 0.14, 0.08, 0.08, 0.04, [0.8, 0.2, 0.12, 0.1]);
    // "text" lines
    const tr2 = rnd(77);
    for (const [v, hgt, col] of [[1.72, 0.14, [0.93, 0.92, 0.88, 0.1]], [1.48, 0.1, [0.93, 0.92, 0.88, 0.1]], [1.15, 0.07, [0.82, 0.72, 0.5, 0.1]], [0.98, 0.07, [0.82, 0.72, 0.5, 0.1]]]) {
      let u = -0.35; while (u < 0.95) { const w = 0.05 + tr2() * 0.12; if (u + w > 0.95) break; b.box(u + w / 2, v, 0.14, w, hgt, 0.03, col); u += w + 0.03 + (tr2() < 0.2 ? 0.07 : 0); }
    }
    b.box(-0.2, 0.75, 0.14, 1.9, 0.05, 0.03, [0.3, 0.55, 0.62, 0.1]);
    b.pop();
    // bollard lights along the front path
    for (const x of [-2.2, 15.8, -16.5]) for (const z of [10.9]) { b.cyl([x, 0.12, z], [x, 0.95, z], 0.1, 0.1, 12, DKSTEEL); b.cyl([x, 0.75, z], [x, 0.9, z], 0.102, 0.102, 12, [0.95, 0.93, 0.8, 0.3]); b.cyl([x, 0.95, z], [x, 1.0, z], 0.12, 0.12, 12, DKSTEEL); }
    // bench and bin under the canopy
    b.box(9, 0.3, 7.8, 2.0, 0.08, 0.5, WOOD); b.box(9, 0.36, 7.8, 2.0, 0.04, 0.46, vary(WOOD, r, 0.1)); for (const s of [-0.8, 0.8]) b.box(9 + s, 0.21, 7.8, 0.08, 0.18, 0.46, DKSTEEL);
    b.cyl([11, 0.12, 7.7], [11, 1.0, 7.7], 0.25, 0.25, 14, CORTEN); b.cyl([11, 1.0, 7.7], [11, 1.05, 7.7], 0.27, 0.27, 14, DKSTEEL);

    // ---- rooftop equipment ----
    function ahu(x, z, L, h, W, rot) {
      b.push(mulAll(tr(x, H, z), rotY(rot)));
      b.box(0, 0.15, 0, L + 0.3, 0.3, W + 0.3, sh(GALV, 0.85));             // curb
      b.box(0, 0.3 + h / 2, 0, L, h, W, GALV);
      const n = Math.round(L / 0.6);
      for (let k = 0; k <= n; k++) for (const s of [-1, 1]) b.box(-L / 2 + k * L / n, 0.3 + h / 2, s * (W / 2 + 0.01), 0.04, h, 0.02, sh(GALV, 0.9));
      for (let k = 0; k < n; k++) if (k % 2) for (const s of [-1, 1]) { b.box(-L / 2 + (k + 0.5) * L / n, 0.3 + h * 0.55, s * (W / 2 + 0.02), 0.05, 0.12, 0.03, DKSTEEL); }
      for (let v = 0.4; v < 0.3 + h - 0.1; v += 0.09) b.beam([L / 2 + 0.03, v, -W / 2 + 0.1], [L / 2 + 0.03, v, W / 2 - 0.1], 0.06, sh(GALV, 0.7), 0.02);   // louvres
      b.box(0, 0.3 + h + 0.03, 0, L + 0.06, 0.06, W + 0.06, sh(GALV, 1.05));
      for (let k = 0; k < Math.max(1, Math.floor(L / 1.6)); k++) {
        const fx = -L / 2 + 0.9 + k * 1.6; const top = 0.36 + h;
        b.cyl([fx, top - 0.02, 0], [fx, top + 0.25, 0], 0.55, 0.55, 20, sh(GALV, 0.95), false);
        b.cyl([fx, top + 0.05, 0], [fx, top + 0.12, 0], 0.12, 0.12, 10, DKSTEEL);
        for (let a = 0; a < 6; a++) b.beam([fx, top + 0.1, 0], [fx + Math.cos(a) * 0.5, top + 0.1, Math.sin(a) * 0.5], 0.05, DKSTEEL, 0.01);
        b.push(tr(fx, 0, 0)); for (let rr = 0.2; rr < 0.56; rr += 0.12) b.lathe([[rr, top + 0.24], [rr + 0.015, top + 0.25]], 18, DKSTEEL);
        b.lathe([[0.1, top + 0.01], [0.53, top + 0.01]], 18, BLACK); b.pop();
      }
      b.pop();
    }
    ahu(5, -2.2, 4.0, 1.5, 2.2, 0); ahu(10.5, 1.8, 3.0, 1.3, 1.8, 0.0); ahu(-1.0, -4.3, 2.4, 1.0, 1.5, PI / 2);
    // supply / return ducts
    const DUCT = sh(GALV, 1.08);
    b.box(5, H + 0.9, -4.0, 1.0, 0.7, 1.4, DUCT); b.box(5, H + 0.35, -4.9, 1.0, 0.7, 0.6, DUCT);
    b.box(1.7, H + 1.05, -2.2, 2.6, 0.6, 0.9, DUCT); b.box(0.6, H + 0.5, -2.2, 0.9, 1.0, 0.9, DUCT);
    for (let x = 0.6; x < 3.0; x += 0.5) b.box(x, H + 1.05, -2.2, 0.04, 0.64, 0.94, sh(GALV, 0.9));
    b.tube([[10.5, H + 0.8, 0.85], [10.5, H + 0.8, -0.2], [10.3, H + 0.8, -0.8], [9.0, H + 0.8, -1.0], [7.2, H + 0.8, -1.0]], 0.3, 14, DUCT);
    for (const x of [7.8, 8.6]) { b.cyl([x, H, -1.0], [x, H + 0.5, -1.0], 0.04, 0.04, 6, DKSTEEL); b.cyl([x - 0.03, H + 0.8, -1.0], [x + 0.03, H + 0.8, -1.0], 0.325, 0.325, 14, DKSTEEL); }
    for (const z of [-0.2, -0.8]) b.box(10.5, H + 0.25, z, 0.08, 0.5, 0.08, DKSTEEL);
    b.tube([[7.2, H + 0.8, -1.0], [6.6, H + 0.8, -1.0], [6.4, H + 0.6, -1.0], [6.4, H, -1.0]], 0.3, 14, DUCT);
    // condensing units
    for (const [x, z] of [[-12.5, -4.8], [-12.5, -2.6], [-12.5, -0.4]]) {
      b.box(x, H + 0.08, z, 1.4, 0.16, 1.1, DKSTEEL); b.box(x, H + 0.6, z, 1.2, 0.85, 0.9, sh(WHITE, 0.92));
      for (let v = H + 0.25; v < H + 0.95; v += 0.06) b.box(x + 0.61, v, z, 0.01, 0.025, 0.8, sh(WHITE, 0.7));
      b.cyl([x, H + 1.03, z], [x, H + 1.07, z], 0.38, 0.38, 16, DKSTEEL); for (let a = 0; a < 4; a++) b.beam([x - 0.38 * Math.cos(a * 0.785), H + 1.08, z - 0.38 * Math.sin(a * 0.785)], [x + 0.38 * Math.cos(a * 0.785), H + 1.08, z + 0.38 * Math.sin(a * 0.785)], 0.02, BLACK);
      b.tube([[x - 0.6, H + 0.4, z + 0.2], [x - 1.2, H + 0.4, z + 0.2], [x - 1.3, H + 0.2, z + 0.2], [x - 1.3, H + 0.2, -6.0]], 0.035, 6, BLACK);
    }
    b.box(-13.8, H + 0.12, -3.0, 0.3, 0.12, 6.4, DKSTEEL);
    // exhaust fans, vent stacks, hatch, drains
    for (const [x, z] of [[1.5, 2.5], [-1.5, 4.5], [7.5, 4.5], [13.0, -4.5], [-12.0, 5.5]]) {
      b.box(x, H + 0.2, z, 0.8, 0.4, 0.8, sh(GALV, 0.9));
    }
    for (const [x, z] of [[1.5, 2.5], [-1.5, 4.5], [7.5, 4.5], [13.0, -4.5], [-12.0, 5.5]]) { b.push(tr(x, H, z)); b.lathe([[0.3, 0.4], [0.3, 0.65], [0.55, 0.7], [0.5, 0.85], [0.1, 0.95], [0, 0.96]], 16, GALV); b.pop(); }
    for (const [x, z, hh] of [[3.5, 0.5, 0.6], [-2.0, 0.0, 0.5], [12.5, 5.5, 0.7], [-10.5, -6.0, 0.6]]) { b.cyl([x, H, z], [x, H + hh, z], 0.06, 0.06, 10, [0.85, 0.85, 0.82, 0.1]); b.cyl([x, H, z], [x, H + 0.08, z], 0.12, 0.12, 10, BLACK); }
    b.box(8.5, H + 0.25, -5.6, 0.9, 0.5, 0.9, sh(GALV, 0.85)); b.box(8.5, H + 0.52, -5.6, 1.0, 0.06, 1.0, [0.6, 0.55, 0.2, 0.15]);
    for (const s of [-1, 1]) b.tube([[8.5 + s * 0.3, H + 0.55, -5.1], [8.5 + s * 0.3, H + 1.35, -5.1], [8.5 + s * 0.3, H + 1.4, -6.45]], 0.025, 6, [0.85, 0.7, 0.2, 0.1]);
    for (const [x, z] of [[-14, -6.2], [0.5, -6.2], [14, -6.2]]) b.cyl([x, H, z], [x, H + 0.07, z], 0.15, 0.15, 10, DKSTEEL);
    // small comms dish on a pipe mount
    b.push(tr(-12.0, H, 2.8));
    b.box(0, 0.1, 0, 1.2, 0.2, 1.2, CONC_D); for (const [a, c] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) b.beam([a, 0.2, c], [0, 1.0, 0], 0.05, GALV);
    b.cyl([0, 0.2, 0], [0, 1.45, 0], 0.05, 0.05, 10, GALV);
    b.push(mulAll(tr(0, 1.5, 0), rotY(0.4), rotX(0.95)));
    const dprof = []; for (let k = 0; k <= 8; k++) { const rr = 0.6 * k / 8; dprof.push([rr, rr * rr / 1.2]); } dprof.push([0.62, 0.32]);
    b.lathe(dprof, 28, WHITE); b.lathe(dprof.map(p => [p[0], p[1] - 0.012]), 28, sh(WHITE, 0.85));
    b.cyl([0, -0.15, 0], [0, 0.02, 0], 0.08, 0.1, 10, sh(WHITE, 0.8));
    b.beam([0.0, 0.05, -0.58], [0, 0.55, 0], 0.025, sh(WHITE, 0.9)); b.cyl([0, 0.5, 0], [0, 0.66, 0], 0.045, 0.035, 10, [0.3, 0.3, 0.32, 0.15]);
    b.pop(); b.pop();
    // lattice antenna mast with whips, guy wires and cable tray
    b.push(tr(13.0, H, 4.6));
    b.box(0, 0.1, 0, 1.0, 0.2, 1.0, CONC_D);
    const tri3 = [0, 1, 2].map(k => [Math.cos(k * 2.094) * 0.2, Math.sin(k * 2.094) * 0.2]);
    tri3.forEach(p => b.cyl([p[0], 0.2, p[1]], [p[0], 7.2, p[1]], 0.02, 0.02, 6, [0.85, 0.3, 0.2, 0.15]));
    for (let y = 0.2, k = 0; y < 7.1; y += 0.4, k++) for (let i = 0; i < 3; i++) { const a = tri3[i], c = tri3[(i + 1) % 3]; b.beam([a[0], y, a[1]], [c[0], y + 0.4, c[1]], 0.012, k % 2 ? [0.85, 0.3, 0.2, 0.15] : [0.92, 0.9, 0.86, 0.15]); }
    b.cyl([0, 7.2, 0], [0, 9.0, 0], 0.025, 0.012, 6, DKSTEEL);
    for (const a of [0.3, 2.4, 4.5]) { b.beam([0, 6.6, 0], [Math.cos(a) * 0.6, 6.6, Math.sin(a) * 0.6], 0.03, GALV); b.cyl([Math.cos(a) * 0.6, 6.3, Math.sin(a) * 0.6], [Math.cos(a) * 0.6, 7.8, Math.sin(a) * 0.6], 0.012, 0.008, 6, WHITE); }
    b.beam([0, 5.4, 0], [0, 5.4, -0.9], 0.03, GALV); b.beam([0, 5.4, -0.9], [0, 5.4, -1.8], 0.03, GALV); for (let k = 0; k < 6; k++) b.beam([-0.35 + 0.05 * k, 5.4, -0.4 - k * 0.27], [0.35 - 0.05 * k, 5.4, -0.4 - k * 0.27], 0.012, GALV);
    b.box(0.2, 3.0, 0.2, 0.12, 0.6, 0.08, [0.85, 0.85, 0.82, 0.1]); b.box(-0.2, 4.2, 0.0, 0.12, 0.6, 0.08, [0.85, 0.85, 0.82, 0.1]);
    for (const [gx, gz] of [[1.6, 1.8], [1.6, -3.5], [-4.5, -0.8]]) { b.beam([0, 5.0, 0], [gx, 0.25, gz], 0.012, [0.3, 0.3, 0.3, 0.2]); b.box(gx, 0.12, gz, 0.2, 0.24, 0.2, CONC_D); }
    b.tube([[0.1, 0.4, 0.1], [0.1, 2.0, 0.1]], 0.025, 6, BLACK);
    b.pop();
    for (let x = 12.6; x > 9.0; x -= 0.9) { b.box(x, H + 0.15, 4.4, 0.3, 0.3, 0.1, DKSTEEL); }
    b.box(10.8, H + 0.32, 4.4, 4.0, 0.05, 0.3, GALV); for (const s of [-1, 1]) b.box(10.8, H + 0.38, 4.4 + s * 0.15, 4.0, 0.1, 0.02, GALV);

    // ---- extra site and roof detail ----
    // skylight domes on the main roof
    for (const [x, z] of [[-1.5, -1.0], [2.5, 4.5], [5.5, 2.0], [-12.0, -6.0 + 7.5], [12.5, -2.8], [0.5, 0.5]]) {
      b.box(x, H + 0.2, z, 1.4, 0.4, 1.4, sh(GALV, 0.92)); b.box(x, H + 0.42, z, 1.5, 0.05, 1.5, DKSTEEL);
      b.push(mulAll(tr(x, H + 0.44, z), sc(1, 1, 1))); b.lathe([[0.68, 0], [0.62, 0.12], [0.48, 0.24], [0.28, 0.32], [0, 0.35]], 16, [0.75, 0.8, 0.82, 0.45]); b.pop();
    }
    // walkway pads to the equipment
    for (let k = 0; k < 9; k++) b.box(8.5 - k * 0.9, H + 0.03, -4.4 + k * 0.05, 0.8, 0.03, 0.8, [0.5, 0.5, 0.48]);
    for (let k = 0; k < 7; k++) b.box(-10.8, H + 0.03, -5.5 + k * 0.95, 0.8, 0.03, 0.8, [0.5, 0.5, 0.48]);
    // yellow gas line on sleepers along the roof
    const GAS = [0.86, 0.7, 0.16, 0.15];
    b.tube([[14.3, H + 0.3, -6.0], [14.3, H + 0.3, -3.5], [6.5, H + 0.3, -3.5], [6.5, H + 0.3, -2.2]], 0.04, 8, GAS);
    for (let x = 13.5; x > 6.6; x -= 1.4) { b.box(x, H + 0.13, -3.5, 0.15, 0.26, 0.35, BLACK); }
    b.tube([[14.3, H + 0.3, -6.0], [14.3, H + 0.9, -6.6], [14.3, H + 0.9, -7.3], [14.3, 0.9, -7.3], [14.3, 0.4, -7.3]], 0.04, 8, GAS);
    // flagpole with a flag at the front right corner
    b.cyl([16.6, 0.12, 10.6], [16.6, 0.4, 10.6], 0.35, 0.3, 12, CONC);
    b.cyl([16.6, 0.4, 10.6], [16.6, 10.5, 10.6], 0.07, 0.04, 10, [0.85, 0.85, 0.85, 0.35]); b.sphere(16.6, 10.55, 10.6, 0.08, 8, [0.85, 0.75, 0.3, 0.4]);
    b.surf(10, 4, (u, v) => [16.65 + u * 1.9, 10.3 - v * 1.1, 10.6 + Math.sin(u * 5 + v * 0.6) * 0.12 * u], (u, v) => (Math.floor(v * 4) % 2 ? [0.75, 0.2, 0.15] : [0.9, 0.88, 0.82]));
    b.surf(3, 2, (u, v) => [16.65 + u * 0.75, 10.3 - v * 0.55, 10.6 + Math.sin(u * 1.9 + v * 0.3) * 0.05 * u + 0.01], [0.2, 0.25, 0.5]);
    // bike rack near the entrance
    for (let k = 0; k < 5; k++) { const x = -1.6 + k * 0.4; b.tube([[x, 0.12, 10.9], [x, 0.75, 10.9], [x, 0.85, 11.0], [x, 0.85, 11.2], [x, 0.75, 11.3], [x, 0.12, 11.3]], 0.025, 8, GALV); }
    // picnic tables under a shade sail on the east apron
    for (const [x, z] of [[16.4, 2.0], [16.4, -3.0]]) {
      b.box(x, 0.85, z, 0.9, 0.05, 1.9, vary(WOOD, r, 0.1)); for (const s of [-1, 1]) { b.box(x + s * 0.65, 0.55, z, 0.3, 0.04, 1.9, vary(WOOD, r, 0.1)); for (const t of [-0.7, 0.7]) { b.beam([x - 0.6, 0.12, z + t], [x + 0.3 * s, 0.85, z + t], 0.05, DKSTEEL); b.beam([x + 0.6, 0.12, z + t], [x - 0.3 * s, 0.85, z + t], 0.05, DKSTEEL); } }
    }
    for (const [x, z] of [[15.6, 4.6], [17.6, -5.6]]) b.cyl([x, 0.12, z], [x, 3.4, z], 0.06, 0.05, 8, DKSTEEL);
    b.plate([15.6, 3.4, 4.6], [17.8, 2.8, 4.4], [17.6, 3.4, -5.6], [15.4, 2.8, -5.4], [0.85, 0.82, 0.74]);
    b.tube([[15.6, 3.4, 4.6], [17.8, 2.8, 4.4], [17.6, 3.4, -5.6], [15.4, 2.8, -5.4], [15.6, 3.4, 4.6]], 0.015, 5, DKSTEEL);
    for (const [x, z] of [[17.8, 4.4], [15.4, -5.4]]) { b.beam([x, 2.8, z], [x + (x > 16 ? 0.2 : -0.2), 0.12, z], 0.04, DKSTEEL); }
    // gas meter and hose bib on the east wall
    b.push(mulAll(tr(14.95, 0, 0), rotY(PI / 2)));
    b.tube([[-6.0, 0.15, 0.25], [-6.0, 0.9, 0.25], [-5.6, 0.9, 0.25], [-5.6, 1.2, 0.08]], 0.035, 8, GAS);
    b.box(-6.0, 1.1, 0.28, 0.35, 0.4, 0.25, [0.6, 0.6, 0.58, 0.2]); b.cyl([-6.0, 1.15, 0.4], [-6.0, 1.15, 0.43], 0.09, 0.09, 10, [0.8, 0.85, 0.88, 0.4]);
    b.cyl([2.8, 0.55, 0.0], [2.8, 0.55, 0.18], 0.025, 0.025, 6, [0.7, 0.55, 0.3, 0.4]); b.cyl([2.8, 0.55, 0.18], [2.8, 0.45, 0.2], 0.022, 0.022, 6, [0.7, 0.55, 0.3, 0.4]);
    b.pop();
    // creosote shrubs in gravel beds at the corners
    for (const [x, z] of [[-16.8, -8.5], [-16.6, 6.0], [16.9, -8.8], [16.9, 8.4], [-3.0, -9.0], [3.5, -9.2]]) {
      b.box(x, 0.13, z, 2.2, 0.03, 2.0, vary(GRAVEL, r, 0.05));
      for (let k = 0; k < 9; k++) { const a = r() * 6.3, d = r() * 0.6; b.push(mulAll(tr(x + Math.cos(a) * d, 0.3 + r() * 0.35, z + Math.sin(a) * d), sc(1, 0.8, 1))); b.sphere(0, 0, 0, 0.25 + r() * 0.2, 7, vary([0.42, 0.46, 0.3], r, 0.12)); b.pop(); }
      for (let k = 0; k < 5; k++) { const a = r() * 6.3; b.beam([x, 0.12, z], [x + Math.cos(a) * 0.5, 0.7, z + Math.sin(a) * 0.5], 0.03, [0.35, 0.28, 0.2]); }
      rock(b, x + 0.8, 0.13, z - 0.6, 0.18, r);
    }
    // horizontal reveal line in the stucco at the canopy height on all walls
    for (const [x, z, sx, sz] of [[0, -7.08, 30.1, 0.03], [15.08, 0, 0.03, 14.1], [-15.08, 0, 0.03, 14.1], [-12.25, 7.08, 5.5, 0.03], [14.75, 7.08, 0.5, 0.03]]) b.box(x, 3.95, z, sx, 0.05, sz, sh(STUCCO, 0.72));
    return b;
  }

  // ======================================================================
  // 2. WATER TOWER
  // ======================================================================
  function waterTower(detail) {
    const b = new MB(), r = rnd(2202);
    const TANK = [0.78, 0.80, 0.80, 0.15], TANK_D = [0.68, 0.70, 0.71, 0.15], LEG = [0.70, 0.72, 0.72, 0.15], BAND = [0.40, 0.55, 0.66, 0.1];
    const B0 = 3.2, B1 = 2.6, YT = 11.0;                       // leg spread at the ground and at the balcony, balcony height
    const RT = 3.2, Y0 = 11.6, Y1 = 15.6, YA = 16.6;            // tank radius, shell bottom / top, roof apex
    const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    const legAt = (c, y) => { const t = (y - 0.5) / (YT - 0.5), s = B0 + (B1 - B0) * t; return [c[0] * s, y, c[1] * s]; };
    if (!detail) {
      for (const c of corners) { b.cyl(legAt(c, -3), legAt(c, YT), 0.22, 0.2, 6, LEG); b.box(c[0] * B0, -1.2, c[1] * B0, 1.1, 3.6, 1.1, CONC); }
      for (const y of [3.7, 7.4]) for (let i = 0; i < 4; i++) b.beam(legAt(corners[i], y), legAt(corners[(i + 1) % 4], y), 0.12, LEG);
      b.cyl([0, 0, 0], [0, 10.4, 0], 0.45, 0.45, 6, TANK_D);
      b.lathe([[0.45, 10.3], [RT - 0.6, YT], [RT, Y0], [RT, 13.2], [RT, 13.2, BAND], [RT, 14.0], [RT, Y1], [0.3, YA], [0, YA + 0.6]], 12, TANK);
      b.lathe([[2.0, YT - 0.05], [4.1, YT - 0.05], [4.1, YT + 1.1], [4.05, YT + 1.1]], 12, DKSTEEL);
      b.box(0, 5.5, 3.65, 0.5, 11, 0.1, DKSTEEL);
      return b;
    }
    // footings, legs
    for (const c of corners) {
      const p = legAt(c, 0.5);
      b.cyl([p[0], -3, p[2]], [p[0], 0.15, p[2]], 0.6, 0.6, 14, vary(CONC, r, 0.04)); b.box(p[0], 0.35, p[2], 1.0, 0.4, 1.0, vary(CONC, r, 0.04));
      b.box(p[0], 0.58, p[2], 0.7, 0.06, 0.7, DKSTEEL);
      for (const [a, d] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { b.box(p[0] + a * 0.25, 0.66, p[2] + d * 0.25, 0.05, 0.12, 0.05, STEEL); b.box(p[0] + a * 0.25, 0.63, p[2] + d * 0.25, 0.1, 0.05, 0.1, STEEL); }
      b.cyl(p, legAt(c, YT + 0.1), 0.2, 0.2, 14, LEG);
      for (const y of [3.7, 7.4]) b.cyl(legAt(c, y - 0.05), legAt(c, y + 0.05), 0.235, 0.235, 14, sh(LEG, 0.88));     // splice collars
      b.box(...legAt(c, YT + 0.2), 0.6, 0.35, 0.6, sh(LEG, 0.9));
    }
    // horizontal struts and diagonal rods with turnbuckles
    const levels = [0.9, 3.7, 7.4, 10.6];
    for (let i = 0; i < 4; i++) {
      const c0 = corners[i], c1 = corners[(i + 1) % 4];
      for (const y of levels.slice(1)) { b.cyl(legAt(c0, y), legAt(c1, y), 0.09, 0.09, 10, sh(LEG, 0.95)); for (const c of [c0, c1]) b.box(...legAt(c, y), 0.42, 0.3, 0.42, sh(LEG, 0.85)); }
      for (let k = 0; k < 3; k++) {
        for (const [ca, cb] of [[c0, c1], [c1, c0]]) {
          const a = legAt(ca, levels[k] + 0.25), e = legAt(cb, levels[k + 1] - 0.25), m = [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2, (a[2] + e[2]) / 2];
          const d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], L = Math.hypot(...d), u = d.map(v => v / L);
          b.cyl(a, e, 0.022, 0.022, 5, DKSTEEL, false);
          b.cyl([m[0] - u[0] * 0.22, m[1] - u[1] * 0.22, m[2] - u[2] * 0.22], [m[0] + u[0] * 0.22, m[1] + u[1] * 0.22, m[2] + u[2] * 0.22], 0.05, 0.05, 6, STEEL);
          for (const q of [a, e]) b.box(q[0], q[1], q[2], 0.16, 0.16, 0.16, DKSTEEL);
        }
      }
    }
    // centre riser with flanges, base vault and valve
    b.box(0, -0.2, 0, 2.2, 0.7, 2.2, CONC); b.box(0, 0.2, 0, 1.6, 0.1, 1.6, sh(CONC, 0.9));
    b.cyl([0, 0.25, 0], [0, 10.5, 0], 0.42, 0.42, 18, TANK_D);
    for (let y = 1.2; y < 10.4; y += 2.0) b.cyl([0, y, 0], [0, y + 0.08, 0], 0.5, 0.5, 18, sh(TANK_D, 0.9));
    b.tube([[0, 0.8, 0.42], [0, 0.8, 1.4], [0, 0.3, 1.6], [0, -0.5, 1.6]], 0.15, 10, sh(TANK_D, 0.9));
    b.cyl([-0.25, 0.8, 1.0], [0.25, 0.8, 1.0], 0.22, 0.22, 10, [0.25, 0.4, 0.55, 0.15]); b.cyl([0, 0.8, 1.0], [0, 1.3, 1.0], 0.03, 0.03, 6, STEEL); b.cyl([0, 1.3, 0.85], [0, 1.3, 1.15], 0.18, 0.18, 10, [0.7, 0.15, 0.1, 0.1], true);
    b.box(1.6, 0.5, 0.8, 0.6, 0.8, 0.4, [0.62, 0.63, 0.6, 0.15]); b.tube([[1.6, 0.9, 0.8], [1.6, 1.4, 0.8], [0.45, 1.4, 0.3]], 0.03, 6, GALV);
    // overflow pipe down to the ground
    b.tube([[0.5, YT - 0.1, -1.2], [0.6, YT - 0.6, -1.4], [2.1, 7.4, -2.25], [2.6, 3.0, -2.8], [2.9, 0.6, -3.1], [3.4, 0.25, -3.7]], 0.08, 8, sh(TANK_D, 0.85));
    // tank: conical bottom, shell with seams, faded band, conical roof
    const tc = (y) => (y > 13.15 && y < 14.05) ? BAND : (Math.floor((y - Y0) / 1.0) % 2 ? TANK : sh(TANK, 0.95));
    const prof = [[0.42, 10.3, TANK_D], [0.7, 10.45, TANK_D]];
    for (let k = 1; k <= 6; k++) { const t = k / 6; prof.push([0.7 + (RT - 0.05 - 0.7) * t, 10.45 + (Y0 - 10.45) * t, k % 2 ? TANK_D : sh(TANK_D, 0.94)]); }
    prof.push([RT, Y0 + 0.05, TANK]);
    for (const yb of [12.6, 13.15, 14.05, 14.6]) {
      if (yb === 13.15 || yb === 14.05) { prof.push([RT, yb, tc(yb - 0.01)]); prof.push([RT + 0.004, yb, tc(yb + 0.01)]); continue; }
      prof.push([RT, yb - 0.05, tc(yb - 0.06)]); prof.push([RT + 0.025, yb - 0.04, tc(yb - 0.06)]); prof.push([RT + 0.025, yb + 0.04, tc(yb + 0.06)]); prof.push([RT, yb + 0.05, tc(yb + 0.06)]);
    }
    prof.push([RT + 0.06, Y1, TANK]); prof.push([RT + 0.06, Y1 + 0.1, TANK]);
    for (let k = 0; k <= 5; k++) { const t = k / 5; prof.push([RT + 0.06 - (RT - 0.35) * t, Y1 + 0.1 + (YA - Y1 - 0.1) * t, k % 2 ? sh(TANK, 1.03) : TANK]); }
    prof.push([0.35, YA + 0.25, TANK_D]); prof.push([0.55, YA + 0.3, TANK_D]); prof.push([0.5, YA + 0.5, TANK_D]); prof.push([0, YA + 0.55, TANK_D]);
    b.lathe(prof, 40, TANK);
    // vertical plate seams on the shell
    for (let k = 0; k < 12; k++) { const a = k / 12 * PI * 2 + (k % 2) * 0.1; for (let y = Y0 + 0.5; y < Y1 - 0.4; y += 1.0) { const streak = (k * 7 + Math.round(y)) % 5 === 0; b.box(Math.cos(a) * (RT + 0.012), y + ((k % 2) ? 0.5 : 0), Math.sin(a) * (RT + 0.012), streak ? 0.09 : 0.04, 0.95, streak ? 0.09 : 0.04, streak ? [0.62, 0.5, 0.4, 0.1] : sh(TANK, 0.9)); } }
    // logo block on the front: white dish symbol and a red dot on a faded panel
    b.push(mulAll(tr(0, 0, 0), rotY(0.35)));
    b.box(0, 14.55, RT + 0.03, 1.8, 0.9, 0.04, [0.88, 0.86, 0.8, 0.1]);
    for (let k = -4; k <= 4; k++) b.box(-0.45 + k * 0.08, 14.7 + 0.012 * k * k, RT + 0.06, 0.08, 0.08, 0.03, BAND);
    b.box(-0.45, 14.5, RT + 0.06, 0.06, 0.3, 0.03, BAND); b.box(-0.45, 14.33, RT + 0.06, 0.32, 0.05, 0.03, BAND); b.box(-0.45, 15.0, RT + 0.06, 0.09, 0.09, 0.03, [0.75, 0.22, 0.14, 0.1]);
    for (let k = 0; k < 5; k++) b.box(0.05 + k * 0.17, 14.7, RT + 0.06, 0.12, 0.22, 0.03, sh(BAND, 0.8));
    b.pop();
    // roof: vent with screen, hatch with railing, aviation beacon, lightning rod
    b.cyl([0, YA + 0.55, 0], [0, YA + 0.9, 0], 0.3, 0.3, 14, TANK_D); b.cyl([0, YA + 0.9, 0], [0, YA + 1.05, 0], 0.55, 0.45, 14, TANK);
    b.cyl([0, YA + 1.05, 0], [0, YA + 1.55, 0], 0.04, 0.04, 6, DKSTEEL); b.sphere(0, YA + 1.65, 0, 0.12, 10, [0.85, 0.12, 0.08, 0.4]);
    b.cyl([0.3, YA + 1.0, 0], [0.3, YA + 1.9, 0], 0.012, 0.006, 6, STEEL);
    const hatchA = 0.0;
    b.push(rotY(hatchA)); b.box(0, 16.0, 1.6, 0.8, 0.25, 0.8, TANK_D); b.box(0, 16.15, 1.6, 0.85, 0.06, 0.85, sh(TANK_D, 0.85));
    for (const s of [-1, 1]) { b.cyl([s * 0.6, Y1 + 0.25, RT - 0.1], [s * 0.6, Y1 + 1.15, RT - 0.1], 0.025, 0.025, 6, [0.85, 0.7, 0.2, 0.1]); b.tube([[s * 0.6, Y1 + 1.15, RT - 0.1], [s * 0.6, YA + 0.6, 0.6]], 0.025, 6, [0.85, 0.7, 0.2, 0.1]); }
    b.pop();
    // balcony: grating ring on brackets, railing
    const BR0 = 1.95, BR1 = 4.1, NB = 32;
    for (let k = 0; k < NB; k++) {
      const a0 = k / NB * PI * 2, a1 = (k + 1) / NB * PI * 2, col = k % 2 ? [0.55, 0.56, 0.56, 0.2] : [0.5, 0.51, 0.51, 0.2];
      b.plate([Math.cos(a0) * BR0, YT, Math.sin(a0) * BR0], [Math.cos(a1) * BR0, YT, Math.sin(a1) * BR0], [Math.cos(a1) * BR1, YT, Math.sin(a1) * BR1], [Math.cos(a0) * BR1, YT, Math.sin(a0) * BR1], col);
      b.beam([Math.cos(a0) * BR0, YT - 0.08, Math.sin(a0) * BR0], [Math.cos(a0) * BR1, YT - 0.08, Math.sin(a0) * BR1], 0.06, DKSTEEL, 0.14);
      for (let q = 1; q < 3; q++) { const am = a0 + (a1 - a0) * q / 3; b.beam([Math.cos(am) * BR0, YT + 0.01, Math.sin(am) * BR0], [Math.cos(am) * BR1, YT + 0.01, Math.sin(am) * BR1], 0.015, DKSTEEL); }
      if (k % 3 === 0) b.beam([Math.cos(a0) * BR1, YT - 0.1, Math.sin(a0) * BR1], [Math.cos(a0) * 1.4, YT - 1.2, Math.sin(a0) * 1.4], 0.05, DKSTEEL);
      if (k % 2 === 0) b.cyl([Math.cos(a0) * BR1, YT, Math.sin(a0) * BR1], [Math.cos(a0) * BR1, YT + 1.1, Math.sin(a0) * BR1], 0.025, 0.025, 6, [0.85, 0.7, 0.2, 0.1], false);
    }
    b.lathe([[BR1, YT - 0.15], [BR1 + 0.02, YT - 0.15], [BR1 + 0.02, YT + 0.12], [BR1, YT + 0.12]], 48, DKSTEEL);
    b.lathe([[BR0, YT - 0.15], [BR0, YT + 0.02]], 36, DKSTEEL);
    for (const [y, rr] of [[YT + 1.1, 0.03], [YT + 0.55, 0.02]]) { const pts = []; for (let k = 0; k <= 40; k++) { const a = k / 40 * PI * 2; pts.push([Math.cos(a) * BR1, y, Math.sin(a) * BR1]); } b.tube(pts, rr, 6, [0.85, 0.7, 0.2, 0.1]); }
    // ladder up the front with safety cage, standoffs to the struts
    const LZ = 3.75, LG = [0.85, 0.7, 0.2, 0.1];
    for (const s of [-1, 1]) b.cyl([s * 0.23, 0.15, LZ], [s * 0.23, YT + 1.2, LZ], 0.03, 0.03, 8, GALV);
    for (let y = 0.45; y < YT + 0.1; y += 0.3) b.beam([-0.23, y, LZ], [0.23, y, LZ], 0.03, GALV);
    for (const y of [3.7, 7.4, 10.6]) { const z = legAt([0, 1], y)[2]; for (const s of [-1, 1]) b.beam([s * 0.23, y, LZ], [s * 0.3, y, z], 0.04, DKSTEEL); }
    for (let y = 2.5; y < YT + 1.0; y += 0.9) { const pts = []; for (let k = 0; k <= 8; k++) { const a = PI * k / 8; pts.push([Math.cos(a) * 0.36, y, LZ + 0.05 + Math.sin(a) * 0.4]); } b.tube(pts, 0.018, 4, LG); }
    for (let k = 0; k < 5; k++) { const a = PI * (k + 0.5) / 5; b.cyl([Math.cos(a) * 0.36, 2.5, LZ + 0.05 + Math.sin(a) * 0.4], [Math.cos(a) * 0.36, YT + 0.8, LZ + 0.05 + Math.sin(a) * 0.4], 0.015, 0.015, 5, LG); }
    b.box(0, 2.0, LZ + 0.12, 0.6, 0.8, 0.04, [0.6, 0.6, 0.58, 0.15]); b.box(0, 2.1, LZ + 0.15, 0.4, 0.2, 0.02, [0.8, 0.2, 0.12, 0.1]);   // locked climb guard
    // tank ladder from balcony to the roof edge
    for (const s of [-1, 1]) b.cyl([s * 0.22, YT, RT + 0.25], [s * 0.22, Y1 + 0.4, RT + 0.25], 0.025, 0.025, 6, GALV);
    for (let y = YT + 0.3; y < Y1 + 0.3; y += 0.3) b.beam([-0.22, y, RT + 0.25], [0.22, y, RT + 0.25], 0.028, GALV);
    for (const y of [12.2, 14.0, 15.3]) for (const s of [-1, 1]) b.beam([s * 0.22, y, RT + 0.25], [s * 0.22, y, RT], 0.03, DKSTEEL);
    return b;
  }
  function solarArray(detail) {
    const b = new MB(), r = rnd(3303);
    const TILT = PI / 6, W = 2.0, Lg = 3.4, N = 12, YC = 1.55;
    const CELL = [0.07, 0.09, 0.17, 0.45], CELL2 = [0.09, 0.11, 0.2, 0.45], BACK = [0.80, 0.80, 0.78, 0.08], FRAME = [0.72, 0.74, 0.76, 0.3];
    const ct = Math.cos(TILT), st = Math.sin(TILT);
    const P = w => [w * ct, YC - w * st];                       // point at slope distance w (from the centre, + towards the front) -> [z, y]
    const postX = []; for (let k = 0; k <= 6; k++) postX.push(-12 + k * 4);
    if (!detail) {
      b.push(mulAll(tr(0, YC, 0), rotX(TILT))); b.box(0, 0.02, 0, N * W, 0.05, Lg, CELL); b.box(0, -0.15, 0, N * W, 0.1, Lg * 0.7, STEEL); b.pop();
      for (const x of [-12, -4, 4, 12]) { const f = P(1.2), k = P(-1.2); b.box(x, (f[1] - 2.2) / 2, f[0], 0.15, f[1] + 2, 0.15, STEEL); b.box(x, (k[1] - 2.2) / 2, k[0], 0.15, k[1] + 2, 0.15, STEEL); }
      b.box(12.9, 1.1, -0.9, 0.7, 1.0, 0.4, [0.75, 0.76, 0.74, 0.2]);
      return b;
    }
    // ---- panels (in the tilted frame: x along the row, z down-slope towards the front, y out of the glass) ----
    b.push(mulAll(tr(0, YC, 0), rotX(TILT)));
    for (let i = 0; i < N; i++) {
      const x0 = -N * W / 2 + i * W + 0.02, x1 = x0 + W - 0.04, cx = (x0 + x1) / 2, tone = 0.92 + r() * 0.16;
      b.box(cx, 0.0, 0, x1 - x0 - 0.04, 0.03, Lg - 0.04, BACK);
      const nc = 6, nr = 12, cw = (x1 - x0 - 0.1) / nc, chh = (Lg - 0.16) / nr;
      for (let a = 0; a < nc; a++) for (let c = 0; c < nr; c++) {
        const u0 = x0 + 0.05 + a * cw + 0.012, u1 = u0 + cw - 0.024, z0 = -Lg / 2 + 0.06 + c * chh + (c >= nr / 2 ? 0.04 : 0) + 0.01, z1 = z0 + chh - 0.02 - 0.004;
        const col = sh((a + c) % 2 ? CELL : CELL2, tone);
        b.plate([u0, 0.017, z0], [u1, 0.017, z0], [u1, 0.017, z1], [u0, 0.017, z1], col);
      }
      for (const [bx, bz, sx, sz] of [[cx, -Lg / 2 + 0.025, x1 - x0, 0.05], [cx, Lg / 2 - 0.025, x1 - x0, 0.05], [x0 + 0.025, 0, 0.05, Lg], [x1 - 0.025, 0, 0.05, Lg]]) b.box(bx, 0.015, bz, sx, 0.05, sz, FRAME);
      b.box(cx, 0.01, 0.02, x1 - x0, 0.03, 0.035, FRAME);                           // divider between the two half-modules
      for (let a = 1; a < 3; a++) b.box(x0 + (x1 - x0) * a / 3, 0.019, 0, 0.012, 0.004, Lg - 0.12, [0.7, 0.72, 0.75, 0.3]);   // bus ribbons
      for (const zz of [-0.9, 0.9]) for (const xx of [x0 + 0.02, x1 - 0.02]) b.box(xx, 0.05, zz, 0.06, 0.04, 0.12, DKSTEEL);    // module clamps
      b.box(cx, -0.06, -1.1, 0.2, 0.06, 0.14, BLACK);                               // junction box on the back
      b.box(cx, -0.03, -1.1, 0.24, 0.01, 0.18, sh(BACK, 0.8));
    }
    // purlins (C-channel) and rafters under the panels
    for (const zz of [-0.9, 0.9]) { b.box(0, -0.06, zz, N * W + 0.3, 0.12, 0.05, GALV); b.box(0, -0.12, zz - 0.04, N * W + 0.3, 0.02, 0.12, GALV); b.box(0, -0.0, zz - 0.04, N * W + 0.3, 0.02, 0.12, GALV); }
    for (const x of postX) { b.box(x, -0.2, 0, 0.09, 0.16, Lg - 0.6, sh(GALV, 0.9)); b.box(x, -0.13, 0, 0.16, 0.02, Lg - 0.6, sh(GALV, 0.9)); }
    b.pop();
    // ---- posts (I-section), braces, footings ----
    const toW = (w, n) => [w * ct + n * st, YC - w * st + n * ct];       // [z, y] of a point at slope w, normal offset n
    for (const x of postX) {
      for (const w of [1.2, -1.2]) {
        const [z, y] = toW(w, -0.28);
        b.box(x, (y - 2) / 2, z, 0.14, y + 2, 0.012 + 0.008, STEEL); b.box(x, (y - 2) / 2, z - 0.07, 0.14, y + 2, 0.015, STEEL); b.box(x, (y - 2) / 2, z + 0.07, 0.14, y + 2, 0.015, STEEL);
        b.box(x, (y - 2) / 2, z, 0.012, y + 2, 0.14, STEEL);
        b.box(x, 0.03, z, 0.3, 0.06, 0.3, vary(CONC, r, 0.05));                    // collar at grade
        b.box(x, y + 0.04, z, 0.2, 0.08, 0.2, DKSTEEL);
      }
      const f = toW(1.2, -0.28), k = toW(-1.2, -0.28);
      b.beam([x + 0.08, 0.5, f[0]], [x + 0.08, k[1] - 0.25, k[0]], 0.05, GALV);       // X-brace front to back
      b.beam([x + 0.08, 0.35, k[0]], [x + 0.08, f[1] - 0.15, f[0]], 0.05, GALV);
    }
    for (let k = 0; k < postX.length - 1; k += 2) { const z = toW(-1.2, -0.28)[0]; b.beam([postX[k], 0.6, z - 0.08], [postX[k + 1], 1.8, z - 0.08], 0.05, GALV); }   // row bracing at the rear
    // ---- cable tray along the back, drops to every junction box ----
    const TZ = toW(-1.2, -0.28)[0] - 0.25, TY = 1.0;
    b.box(0.5, TY, TZ, N * W + 1, 0.02, 0.3, GALV); for (const s of [-1, 1]) b.box(0.5, TY + 0.05, TZ + s * 0.15, N * W + 1, 0.1, 0.015, GALV);
    for (const x of postX) b.beam([x, TY - 0.02, TZ + 0.2], [x, TY - 0.02, TZ - 0.18], 0.04, DKSTEEL);
    b.tube([[-11.5, TY + 0.04, TZ - 0.05], [12.6, TY + 0.04, TZ - 0.05]], 0.03, 6, BLACK); b.tube([[-11.5, TY + 0.04, TZ + 0.05], [12.6, TY + 0.04, TZ + 0.05]], 0.03, 6, [0.5, 0.12, 0.1]);
    for (let i = 0; i < N; i++) {
      const cx = -N * W / 2 + i * W + W / 2, [jz, jy] = toW(-1.1, -0.1);
      b.tube([[cx, jy, jz], [cx + 0.1, jy - 0.25, jz - 0.05], [cx + 0.15, TY + 0.25, TZ + 0.05], [cx + 0.2, TY + 0.05, TZ + 0.02]], 0.012, 5, BLACK);
      b.tube([[cx + 0.06, jy, jz], [cx + 0.35, jy - 0.35, jz - 0.02], [cx + 0.6, jy - 0.15, jz + 0.05], [cx + W - 0.4, jy, jz]], 0.01, 4, BLACK);   // string jumper
    }
    // ---- inverter at the +X end on its own posts ----
    b.push(tr(12.9, 0, TZ));
    for (const s of [-1, 1]) { b.box(s * 0.3, -0.15, -0.1, 0.06, 3.7, 0.06, STEEL); }
    b.box(0, 1.55, -0.1, 0.8, 0.08, 0.08, STEEL); b.box(0, 0.7, -0.1, 0.8, 0.08, 0.08, STEEL);
    b.box(0, 1.15, 0.1, 0.72, 0.95, 0.3, [0.78, 0.79, 0.77, 0.2]);
    for (let k = 0; k < 8; k++) b.box(-0.37, 0.8 + k * 0.1, 0.1, 0.03, 0.05, 0.26, [0.6, 0.62, 0.62, 0.25]);
    b.box(0, 1.65, 0.12, 0.8, 0.04, 0.4, [0.7, 0.71, 0.7, 0.2]);
    b.box(0.1, 1.35, 0.26, 0.22, 0.14, 0.02, [0.1, 0.2, 0.15, 0.4]); b.box(0.1, 1.36, 0.27, 0.16, 0.08, 0.01, [0.3, 0.7, 0.4, 0.3]);
    b.box(-0.15, 1.05, 0.26, 0.2, 0.04, 0.01, [0.85, 0.7, 0.15]); b.box(0.15, 0.85, 0.26, 0.08, 0.08, 0.02, [0.2, 0.6, 0.3]);
    b.box(0, 0.45, 0.06, 0.4, 0.4, 0.2, [0.62, 0.63, 0.6, 0.15]); b.box(0.12, 0.45, 0.17, 0.06, 0.14, 0.04, [0.8, 0.15, 0.1]);    // disconnect
    b.tube([[-0.3, 1.0, 0.1], [-0.6, 1.0, 0.1], [-0.7, 1.0, -0.05], [-1.0, TY, 0.0]], 0.035, 6, GALV);
    b.tube([[0, 0.25, 0.06], [0, 0.05, 0.06], [0, -0.3, 0.3]], 0.035, 6, GALV);
    b.box(0, 0.03, 0.0, 1.0, 0.06, 0.7, vary(CONC, r, 0.05));
    b.pop();
    // gravel strip under the drip line
    b.box(0, 0.015, toW(1.39, 0)[0] + 0.15, N * W + 0.6, 0.03, 0.5, vary(GRAVEL, r, 0.05));
    return b;
  }
  function shed(detail) {
    const b = new MB(), r = rnd(4404);
    const PAINT = [0.44, 0.53, 0.39, 0.06], PAINT2 = [0.50, 0.57, 0.44, 0.06], RUST = [0.40, 0.27, 0.18, 0.03], RUST2 = [0.32, 0.21, 0.14, 0.03];
    const ROOF = [0.56, 0.58, 0.58, 0.1], TRIM = [0.80, 0.80, 0.74, 0.08], SLAT = [0.72, 0.72, 0.69, 0.15];
    const HX = 4, HZ = 3, EAVE = 3.0, RIDGE = 3.45, FL = 0.15, OV = 0.25;
    const slope = Math.atan2(RIDGE - EAVE, HZ + OV);
    const gableTop = u => EAVE + (RIDGE - EAVE) * Math.max(0, 1 - Math.abs(u) / HZ);
    const doorU0 = -2.4, doorU1 = 0.8, doorV1 = 2.75;
    if (!detail) {
      b.box(0, -1.2, 0.3, 8.4, 2.7, 7.0, CONC); b.box(0, (FL + EAVE) / 2, 0, 8, EAVE - FL, 6, sh(PAINT, 0.9));
      for (const sx of [-1, 1]) b.plate([sx * HX, EAVE, -HZ], [sx * HX, EAVE, HZ], [sx * HX, RIDGE, 0], [sx * HX, RIDGE, 0], PAINT);
      for (const s2 of [-1, 1]) { b.push(mulAll(tr(0, (EAVE + RIDGE) / 2 - 0.02, s2 * (HZ + OV) / 2), rotX(s2 * slope))); b.box(0, 0, 0, 8.5, 0.06, (HZ + OV) / Math.cos(slope) + 0.02, ROOF); b.pop(); }
      b.box((doorU0 + doorU1) / 2, (FL + doorV1) / 2, HZ + 0.03, doorU1 - doorU0, doorV1 - FL, 0.06, SLAT);
      b.box(0, RIDGE + 0.1, 0, 6, 0.2, 0.5, ROOF); b.box(0, 0.3, 0, 8.05, 0.3, 6.05, sh(RUST, 0.85));
      return b;
    }
    // slab and front apron
    b.box(0, (FL - 2.5) / 2, 0, 8.4, 2.5 + FL, 6.4, vary(CONC, r, 0.03));
    b.box((doorU0 + doorU1) / 2, (FL - 0.6) / 2 - 0.0, HZ + 1.2, 4.2, 0.6 + FL - 0.02, 2.0, vary(CONC, r, 0.05));
    b.box((doorU0 + doorU1) / 2, FL - 0.01, HZ + 0.21, 4.2, 0.02, 0.02, CONC_D);
    for (const u of [doorU0 - 0.45, doorU1 + 0.45]) { b.cyl([u, 0.1, HZ + 0.55], [u, 1.2, HZ + 0.55], 0.08, 0.08, 10, [0.85, 0.7, 0.15, 0.15]); b.cyl([u, 1.2, HZ + 0.55], [u, 1.26, HZ + 0.55], 0.08, 0.02, 10, [0.85, 0.7, 0.15, 0.15], false); }
    b.box(0, (FL + EAVE) / 2, 0, 7.9, EAVE - FL, 5.9, sh(PAINT, 0.7));                     // inner core, seen through gaps only
    // corrugated walls: sheets (skin) + ribs; rust band at the base
    function corrWall(M, u0, u1, topFn, holes, seed) {
      const rr = rnd(seed);
      const bands = [{ v0: FL - 0.05, v1: 0.42, t: 0.02, col: sh(RUST, 0.85), pw: 0.9 }, { v0: 0.42, v1: EAVE, t: 0.02, col: sh(PAINT, 0.8), pw: 0.9 }];
      skin(b, M, u0, u1, bands, holes, rr);
      b.push(M);
      if (topFn(0) > EAVE + 0.01) b.plate([u0, EAVE, 0.012], [u1, EAVE, 0.012], [0, topFn(0), 0.012], [0, topFn(0), 0.012], vary(PAINT, rr, 0.05));
      const sheetCols = []; for (let k = 0; k < 20; k++) sheetCols.push(vary(sh(k % 3 ? PAINT : PAINT2, 1.08), rr, 0.07));
      for (let u = u0 + 0.11; u < u1 - 0.05; u += 0.22) {
        const top = topFn(u) - 0.02, col = sheetCols[Math.floor((u - u0) / 0.9) % 20], rh = 0.25 + rr() * 0.3;
        const hs = holes.filter(h => u > h.u0 - 0.03 && u < h.u1 + 0.03);
        let segs = [[FL - 0.03, top]];
        for (const h of hs) segs = segs.flatMap(([a, c]) => [[a, Math.min(c, h.v0)], [Math.max(a, h.v1), c]].filter(q => q[1] - q[0] > 0.02));
        for (const [a, c] of segs) {
          if (a < FL + rh) { b.box(u, (a + Math.min(c, FL + rh)) / 2, 0.035, 0.06, Math.min(c, FL + rh) - a, 0.035, rr() < 0.5 ? RUST : RUST2); }
          if (c > FL + rh) b.box(u, (Math.max(a, FL + rh) + c) / 2, 0.035, 0.06, c - Math.max(a, FL + rh), 0.035, col);
        }
      }
      // base J-trim and corner trims
      b.box((u0 + u1) / 2, FL + 0.03, 0.04, u1 - u0, 0.06, 0.06, sh(TRIM, 0.8));
      for (const u of [u0, u1]) b.box(u, (FL + EAVE) / 2, 0.04, 0.12, EAVE - FL, 0.08, TRIM);
      b.pop();
    }
    const flat = () => EAVE;
    const MFr = tr(0, 0, HZ), MBk = mulAll(tr(0, 0, -HZ), rotY(PI)), MEa = mulAll(tr(HX, 0, 0), rotY(PI / 2)), MWe = mulAll(tr(-HX, 0, 0), rotY(-PI / 2));
    const sideDoor = { u0: -1.7, u1: -0.75, v0: FL, v1: FL + 2.1 };
    corrWall(MFr, -HX, HX, flat, [{ u0: doorU0, u1: doorU1, v0: FL - 0.1, v1: doorV1 }], 11);
    corrWall(MBk, -HX, HX, flat, [], 12);
    corrWall(MEa, -HZ, HZ, gableTop, [sideDoor], 13);
    corrWall(MWe, -HZ, HZ, gableTop, [{ u0: -0.5, u1: 0.5, v0: 1.8, v1: 2.5 }], 14);
    // ---- roll-up door ----
    b.push(MFr);
    const dw = doorU1 - doorU0, dc = (doorU0 + doorU1) / 2;
    b.box(dc, (FL + doorV1) / 2, -0.02, dw, doorV1 - FL, 0.03, sh(SLAT, 0.5));
    for (let v = FL + 0.02, k = 0; v < doorV1 - 0.08; v += 0.105, k++) {
      const col = vary(k % 2 ? SLAT : sh(SLAT, 0.94), r, 0.02);
      b.box(dc, v + 0.05, 0.03, dw - 0.06, 0.09, 0.03, v < FL + 0.5 ? tint(col, 0.03, -0.03, -0.06) : col);
      b.box(dc, v + 0.1, 0.045, dw - 0.06, 0.012, 0.012, sh(SLAT, 0.75));
    }
    b.box(dc, FL + 0.06, 0.06, dw - 0.04, 0.1, 0.06, [0.5, 0.5, 0.5, 0.2]); b.box(dc, FL + 0.01, 0.06, dw - 0.04, 0.02, 0.07, RUBBER);   // bottom bar and seal
    b.box(dc + 0.6, FL + 0.25, 0.1, 0.25, 0.04, 0.04, STEEL); for (const s of [-1, 1]) b.box(dc + 0.6 + s * 0.11, FL + 0.2, 0.08, 0.025, 0.1, 0.04, STEEL);   // lift handle
    b.box(dc - 1.2, FL + 0.18, 0.09, 0.1, 0.1, 0.04, DKSTEEL);                                                                       // slide lock
    for (const u of [doorU0 - 0.04, doorU1 + 0.04]) { b.box(u, (FL + doorV1) / 2 + 0.1, 0.05, 0.1, doorV1 - FL + 0.2, 0.1, [0.55, 0.56, 0.55, 0.2]); b.box(u, (FL + doorV1) / 2 + 0.1, 0.1, 0.14, doorV1 - FL + 0.2, 0.02, [0.5, 0.51, 0.5, 0.2]); }
    b.box(dc, doorV1 + 0.13, 0.17, dw + 0.4, 0.26, 0.34, sh(PAINT, 0.92)); b.box(dc, doorV1 + 0.27, 0.17, dw + 0.44, 0.03, 0.38, TRIM);   // hood over the coil
    b.box(dc, doorV1 + 0.01, 0.06, dw + 0.24, 0.04, 0.14, TRIM);
    // chain hoist on the side
    b.cyl([doorU1 + 0.2, doorV1 - 0.1, 0.12], [doorU1 + 0.2, doorV1 - 0.1, 0.25], 0.12, 0.12, 12, DKSTEEL);
    for (const du of [0.08, 0.32]) for (let v = 1.0; v < doorV1 - 0.15; v += 0.06) b.box(doorU1 + du, v, 0.2, 0.015, 0.045, 0.015, DKSTEEL);
    // wall light over the roll-up door with a little conduit
    wallPack(b, doorU0 - 0.55, 2.55);
    b.tube([[doorU0 - 0.55, 2.74, 0.05], [doorU0 - 0.55, 2.85, 0.05], [-HX + 0.25, 2.85, 0.05]], 0.018, 6, GALV);
    b.pop();
    // ---- east side: personnel door, electrical panel with conduit, light ----
    b.push(MEa);
    serviceDoor(b, (sideDoor.u0 + sideDoor.u1) / 2, FL, sideDoor.u1 - sideDoor.u0, 2.1, [0.52, 0.56, 0.46, 0.1], false);
    b.box((sideDoor.u0 + sideDoor.u1) / 2, (FL - 0.4) / 2, 0.55, 1.4, 0.4 + FL, 1.1, vary(CONC, r, 0.04));
    b.box((sideDoor.u0 + sideDoor.u1) / 2 - 0.05, 1.9, 0.09, 0.32, 0.16, 0.01, [0.85, 0.75, 0.15]);   // warning label
    wallPack(b, (sideDoor.u0 + sideDoor.u1) / 2, 2.85);
    // electrical panel, meter, disconnect and conduits
    const pu = 1.3;
    b.box(pu, 1.5, 0.12, 0.7, 0.95, 0.22, [0.6, 0.61, 0.58, 0.15]); b.box(pu, 1.5, 0.235, 0.62, 0.86, 0.01, [0.64, 0.65, 0.62, 0.15]);
    b.box(pu + 0.25, 1.5, 0.25, 0.04, 0.16, 0.03, DKSTEEL); b.box(pu, 1.82, 0.245, 0.24, 0.1, 0.008, [0.85, 0.75, 0.15]); b.box(pu - 0.12, 1.35, 0.245, 0.2, 0.12, 0.008, [0.9, 0.9, 0.88]);
    b.box(pu + 0.75, 1.55, 0.1, 0.32, 0.45, 0.2, [0.6, 0.61, 0.58, 0.15]); b.cyl([pu + 0.75, 1.6, 0.2], [pu + 0.75, 1.6, 0.3], 0.11, 0.11, 14, [0.8, 0.85, 0.88, 0.45]);
    b.box(pu - 0.7, 1.3, 0.09, 0.3, 0.4, 0.18, [0.55, 0.56, 0.53, 0.15]); b.box(pu - 0.6, 1.3, 0.19, 0.05, 0.16, 0.04, [0.75, 0.15, 0.1]);
    for (let k = 0; k < 2; k++) b.tube([[pu - 0.15 + k * 0.3, 1.97, 0.1], [pu - 0.15 + k * 0.3, EAVE - 0.05, 0.1], [pu - 0.15 + k * 0.3, EAVE + 0.15, 0.25], [pu - 0.15 + k * 0.3, EAVE + 0.15, 0.5]], 0.03, 8, GALV);
    b.tube([[pu, 1.03, 0.1], [pu, 0.4, 0.1], [pu, 0.1, 0.25], [pu, -0.3, 0.4]], 0.04, 8, GALV);
    b.tube([[pu + 0.75, 1.33, 0.1], [pu + 0.75, 0.1, 0.1], [pu + 0.75, -0.3, 0.3]], 0.03, 8, GALV);
    b.tube([[pu - 0.35, 1.3, 0.09], [pu - 0.55, 1.3, 0.09]], 0.025, 6, GALV);
    for (const v of [0.6, 2.3, 2.7]) for (const du of [-0.15, 0.15, 0]) if (du || v < 1) b.box(pu + du, v, 0.06, 0.08, 0.04, 0.05, DKSTEEL);
    b.pop();
    // ---- west gable: louvred vent ----
    b.push(MWe);
    b.box(0, 2.15, 0.03, 1.0, 0.7, 0.04, DKSTEEL);
    for (let v = 1.88; v < 2.45; v += 0.08) b.beam([-0.48, v, 0.05], [0.48, v, 0.05], 0.08, sh(PAINT, 0.85), 0.012);
    b.box(0, 2.15, 0.05, 1.08, 0.78, 0.02, TRIM);
    b.pop();
    // ---- roof: two low-pitch slopes with ribs, ridge vent, eave trim ----
    for (const s2 of [-1, 1]) {
      const run = (HZ + OV) / Math.cos(slope);
      b.push(mulAll(tr(0, (EAVE + RIDGE) / 2 + 0.03, s2 * (HZ + OV) / 2), rotX(s2 * slope)));
      const sc0 = []; for (let k = 0; k < 12; k++) sc0.push(vary(ROOF, r, 0.06));
      for (let k = 0; k < 9; k++) { const x0 = -HX - OV + k * (2 * HX + 2 * OV) / 9; b.box(x0 + (2 * HX + 2 * OV) / 18, 0, 0, (2 * HX + 2 * OV) / 9 - 0.01, 0.025, run, sc0[k]); }
      for (let x = -HX - OV + 0.12; x < HX + OV - 0.05; x += 0.26) b.box(x, 0.03, 0, 0.07, 0.04, run, sh(sc0[Math.floor((x + HX + OV) / ((2 * HX + 2 * OV) / 9)) % 12], 1.04));
      for (let k = 0; k < 3; k++) for (let x = -HX; x <= HX + 0.01; x += 1.0) b.box(x, 0.06, -run / 2 + 0.4 + k * (run - 0.8) / 2, 0.03, 0.02, 0.03, DKSTEEL);   // screw rows
      b.box(-HX - OV + 0.02, -0.04, 0, 0.06, 0.14, run, TRIM); b.box(HX + OV - 0.02, -0.04, 0, 0.06, 0.14, run, TRIM);   // rake trim
      b.pop();
      // gutter and eave trim
      const gz = s2 * (HZ + OV + 0.06), gy = EAVE - 0.05;
      b.box(0, gy - 0.07, gz, 2 * HX + 2 * OV, 0.02, 0.14, TRIM); b.box(0, gy, gz + s2 * 0.07, 2 * HX + 2 * OV, 0.15, 0.02, TRIM); b.box(0, gy + 0.05, gz - s2 * 0.06, 2 * HX + 2 * OV, 0.06, 0.02, TRIM);
      for (const x of [-HX - OV + 0.01, HX + OV - 0.01]) b.box(x, gy, gz, 0.02, 0.15, 0.14, TRIM);
      for (let x = -HX; x <= HX; x += 1.2) b.box(x, gy + 0.06, gz, 0.03, 0.02, 0.16, DKSTEEL);
      // soffit under the overhang
      b.plate([-HX - OV, EAVE - 0.02, s2 * HZ], [HX + OV, EAVE - 0.02, s2 * HZ], [HX + OV, EAVE - 0.04, s2 * (HZ + OV)], [-HX - OV, EAVE - 0.04, s2 * (HZ + OV)], sh(TRIM, 0.85));
    }
    for (const sx of [-1, 1]) b.plate([sx * (HX + 0.03), EAVE - 0.03, -HZ - OV], [sx * (HX + 0.03), EAVE - 0.03, HZ + OV], [sx * (HX + 0.03), EAVE - 0.03, HZ], [sx * (HX + 0.03), EAVE - 0.03, -HZ], sh(TRIM, 0.85));
    // downpipes at the front-east and back-west corners
    for (const [x, s2] of [[HX - 0.2, 1], [-HX + 0.2, -1]]) {
      const gz = s2 * (HZ + OV + 0.06);
      b.tube([[x, EAVE - 0.12, gz], [x, EAVE - 0.3, gz], [x, EAVE - 0.5, s2 * (HZ + 0.06)], [x, 0.45, s2 * (HZ + 0.06)], [x, 0.25, s2 * (HZ + 0.25)]], 0.045, 8, TRIM);
      for (const v of [0.9, 1.9]) b.box(x, v, s2 * (HZ + 0.04), 0.12, 0.04, 0.06, DKSTEEL);
      b.box(x, 0.04, s2 * (HZ + 0.55), 0.3, 0.06, 0.6, CONC_D);
    }
    // ridge vent with louvres and cap
    b.box(0, RIDGE + 0.05, 0, 6.0, 0.1, 0.55, sh(ROOF, 0.9));
    for (const s2 of [-1, 1]) for (let x = -2.95; x < 3.0; x += 0.12) b.box(x, RIDGE + 0.17, s2 * 0.2, 0.03, 0.16, 0.03, DKSTEEL);
    for (const s2 of [-1, 1]) b.box(0, RIDGE + 0.17, s2 * 0.215, 6.0, 0.15, 0.01, sh(DKSTEEL, 1.5));
    b.push(tr(0, RIDGE + 0.28, 0)); b.plate([-3.05, 0.05, 0], [3.05, 0.05, 0], [3.05, -0.03, 0.4], [-3.05, -0.03, 0.4], ROOF); b.plate([-3.05, 0.05, 0], [3.05, 0.05, 0], [3.05, -0.03, -0.4], [-3.05, -0.03, -0.4], ROOF); b.pop();
    for (const x of [-3.05, 3.05]) b.box(x, RIDGE + 0.2, 0, 0.03, 0.2, 0.5, ROOF);
    b.box(0, RIDGE + 0.04, 0, 2 * HX + 2 * OV, 0.06, 0.3, sh(ROOF, 1.05));
    return b;
  }
  function clutter(detail) {
    const b = new MB(), r = rnd(5505);
    const PLY = [0.60, 0.46, 0.30], PLY2 = [0.50, 0.38, 0.24], CABLE = [0.08, 0.08, 0.09, 0.12], ORANGE = [0.95, 0.42, 0.08, 0.1], HOSE = [0.20, 0.45, 0.22, 0.1];
    const D = detail;
    // ---- cable drum: axis along local Y from y = -w/2 to w/2 ----
    function drum(R, w, rc, fill, seed) {
      const rr = rnd(seed), ft = 0.07;
      for (const s of [-1, 1]) {
        const y = s * (w / 2 + ft / 2);
        b.cyl([0, y - ft / 2, 0], [0, y + ft / 2, 0], R, R, D ? 24 : 6, vary(PLY, rr, 0.08));
        if (D) {
          for (let x = -R + 0.18; x < R - 0.05; x += 0.18) { const L = 2 * Math.sqrt(Math.max(0, R * R - x * x)) - 0.04, yy = y + s * (ft / 2 + 0.002); b.plate([x - 0.008, yy, -L / 2], [x + 0.008, yy, -L / 2], [x + 0.008, yy, L / 2], [x - 0.008, yy, L / 2], PLY2); }
          for (const a of [0, PI / 2]) { b.push(rotY(a)); b.box(0, y + s * (ft / 2 + 0.02), 0, 0.12, 0.04, 2 * R - 0.15, vary(PLY2, rr, 0.08)); b.pop(); }   // battens
          b.cyl([0, y + s * ft / 2, 0], [0, y + s * (ft / 2 + 0.012), 0], 0.16, 0.16, 14, DKSTEEL); b.cyl([0, y + s * (ft / 2 + 0.012), 0], [0, y + s * (ft / 2 + 0.014), 0], 0.06, 0.06, 10, BLACK);
          for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; b.box(Math.cos(a) * 0.12, y + s * (ft / 2 + 0.017), Math.sin(a) * 0.12, 0.03, 0.035, 0.03, STEEL); }
          for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2 + 0.2; b.box(Math.cos(a) * (R - 0.08), y + s * (ft / 2 + 0.006), Math.sin(a) * (R - 0.08), 0.04, 0.012, 0.04, STEEL); }
          b.box(0.25, y + s * (ft / 2 + 0.003), R * 0.55, 0.3, 0.004, 0.18, [0.9, 0.88, 0.8]);   // stencil label
        }
      }
      if (D || fill <= rc) b.cyl([0, -w / 2, 0], [0, w / 2, 0], rc, rc, 16, PLY2);
      if (fill > rc) {
        b.cyl([0, -w / 2, 0], [0, w / 2, 0], fill - 0.02, fill - 0.02, D ? 22 : 6, CABLE, D ? true : false);
        if (D) { const pts = [], turns = Math.floor(w / 0.09); for (let k = 0; k <= turns * 10; k++) { const a = k / 10 * PI * 2, y = -w / 2 + 0.04 + (w - 0.08) * k / (turns * 10); pts.push([Math.cos(a) * fill, y, Math.sin(a) * fill]); } b.tube(pts, 0.03, 4, CABLE); }
      }
    }
    // upright drum (axis along X), resting on its rims
    const R1 = 1.0;
    b.push(mulAll(tr(-1.9, R1, -1.3), rotZ(PI / 2))); drum(R1, 1.0, 0.35, 0.78, 11); b.pop();
    for (const z of [-1.3 - 0.75, -1.3 + 0.75]) b.box(-1.9, 0.06, z, 1.4, 0.12, 0.14, vary(WOOD_D, r, 0.1));           // chocks
    // loose cable end from the upright drum down to the ground
    if (D) b.tube([[-1.5, 1.4, -0.52], [-1.4, 0.9, -0.2], [-1.3, 0.25, 0.05], [-1.2, 0.04, 0.3], [-0.9, 0.04, 0.35]], 0.03, 6, CABLE);
    // lying drum (axis vertical)
    const R2 = 0.85;
    b.push(tr(0.4, 0.07 + 0.4, -1.2)); drum(R2, 0.8, 0.3, 0.62, 12); b.pop();
    // ---- coiled loose cable on the ground ----
    if (D) { const pts = []; for (let k = 0; k <= 5 * 13; k++) { const a = k / 13 * PI * 2, rr2 = 0.42 + 0.03 * Math.sin(k * 0.7) + (k / 65) * 0.06; pts.push([-0.9 + Math.cos(a) * rr2, 0.03 + 0.045 * (k / 13) + 0.01 * Math.sin(a * 3), 0.6 + Math.sin(a) * rr2 * 0.9]); } pts.push([-0.4, 0.04, 1.2]); pts.push([0.0, 0.03, 1.35]); b.tube(pts, 0.028, 4, CABLE); }
    else b.cyl([-0.9, 0, 0.6], [-0.9, 0.25, 0.6], 0.45, 0.45, 8, CABLE);
    // ---- stack of pallets ----
    for (let k = 0; k < 5; k++) {
      b.push(mulAll(tr(2.2 + (r() - 0.5) * 0.08, k * 0.145, -1.6 + (r() - 0.5) * 0.08), rotY((r() - 0.5) * 0.12)));
      if (!D) { b.box(0, 0.072, 0, 1.2, 0.144, 1.0, vary(WOOD, r, 0.1)); b.pop(); continue; }
      for (let i = 0; i < 3; i++) b.box(-0.55 + i * 0.55, 0.011, 0, 0.1, 0.022, 1.0, vary(WOOD, r, 0.12));        // bottom boards
      for (const z of [-0.45, 0, 0.45]) for (const x of [-0.55, 0, 0.55]) b.box(x, 0.022 + 0.039, z, 0.1, 0.078, 0.1, vary(WOOD_D, r, 0.12));   // blocks
      for (const z of [-0.45, 0, 0.45]) b.box(0, 0.1 + 0.011, z, 1.2, 0.022, 0.1, vary(WOOD, r, 0.12));                  // stringer boards
      for (let i = 0; i < 7; i++) b.box(-0.54 + i * 0.18, 0.122 + 0.011, 0, 0.13, 0.022, 1.0, vary(i % 3 ? WOOD : PLY, r, 0.14));   // top deck
      b.pop();
    }
    // a broken board leaning on the stack
    if (D) b.beam([2.85, 0.0, -1.0], [2.82, 0.62, -1.25], 0.13, vary(WOOD, r, 0.1), 0.022);
    // ---- gas cylinders in a rack, chained ----
    b.push(tr(2.25, 0, 1.25));
    b.box(0, 0.03, 0, 1.0, 0.06, 0.4, DKSTEEL);
    for (const s2 of [-1, 1]) { b.box(s2 * 0.48, 0.65, -0.17, 0.05, 1.3, 0.05, [0.3, 0.38, 0.5, 0.15]); b.box(s2 * 0.48, 0.65, 0.17, 0.05, 1.3, 0.05, [0.3, 0.38, 0.5, 0.15]); b.box(s2 * 0.48, 1.0, 0, 0.05, 0.05, 0.34, [0.3, 0.38, 0.5, 0.15]); }
    for (const v of [0.45, 1.1]) b.box(0, v, -0.17, 1.0, 0.05, 0.05, [0.3, 0.38, 0.5, 0.15]);
    for (let s2 of [-1, 1]) b.beam([s2 * 0.48, 0.03, -0.17], [s2 * 0.48 + s2 * 0.0, -1.2, -0.17], 0.05, DKSTEEL);
    const GCOL = [[0.18, 0.42, 0.24, 0.2], [0.45, 0.46, 0.47, 0.2], [0.55, 0.32, 0.18, 0.2]];
    for (let i = 0; i < 3; i++) {
      const x = -0.31 + i * 0.31, c = GCOL[i], segs = D ? 14 : 6;
      b.push(tr(x, 0.06, 0.0));
      b.lathe(D ? [[0, 0], [0.1, 0], [0.115, 0.03], [0.115, 1.12], [0.105, 1.22], [0.08, 1.3], [0.04, 1.34], [0.035, 1.38], [0, 1.38]] : [[0, 0], [0.115, 0], [0.115, 1.2], [0.04, 1.36], [0, 1.36]], segs, c);
      if (D) {
        b.cyl([0, 1.0, 0], [0, 1.07, 0], 0.117, 0.117, segs, i === 1 ? [0.85, 0.75, 0.2, 0.15] : sh(c, 0.7), false);
        b.box(0, 0.75, 0.115, 0.08, 0.12, 0.01, [0.9, 0.9, 0.86]);
        if (i === 0) { b.lathe([[0, 1.32], [0.075, 1.32], [0.08, 1.48], [0.05, 1.53], [0, 1.53]], 12, [0.4, 0.4, 0.42, 0.2]); }
        else { b.cyl([0, 1.38, 0], [0, 1.5, 0], 0.025, 0.025, 8, [0.75, 0.6, 0.3, 0.4]); b.cyl([0, 1.43, 0], [0.07, 1.43, 0], 0.018, 0.018, 6, [0.75, 0.6, 0.3, 0.4]); b.cyl([0, 1.5, 0], [0, 1.52, 0], 0.045, 0.045, 10, i === 1 ? [0.2, 0.2, 0.2] : [0.15, 0.3, 0.15]); }
      }
      b.pop();
    }
    if (D) for (const v of [0.6, 1.08]) { const pts = []; for (let k = 0; k <= 16; k++) pts.push([-0.48 + k * 0.06, v - 0.03 * Math.sin(k / 16 * PI), 0.13 + 0.02 * Math.sin(k * 0.9)]); b.tube(pts, 0.01, 4, STEEL); }
    b.pop();
    // ---- traffic cones (one standing, one knocked over) ----
    function cone(seg) {
      b.box(0, 0.015, 0, 0.38, 0.03, 0.38, [0.15, 0.15, 0.15]);
      b.lathe(D ? [[0.16, 0.03, ORANGE], [0.14, 0.18, WHITE], [0.122, 0.28, ORANGE], [0.095, 0.42, WHITE], [0.08, 0.5, ORANGE], [0.03, 0.71, ORANGE], [0, 0.71]] : [[0.16, 0.03], [0.03, 0.71], [0, 0.71]], seg, ORANGE);
    }
    b.push(tr(-0.8, 0, 2.0)); cone(D ? 14 : 5); b.pop();
    b.push(mulAll(tr(0.25, 0.19, 2.15), rotY(0.6), rotZ(-PI / 2 + 0.2))); cone(D ? 14 : 5); b.pop();
    // ---- wheelie bin ----
    b.push(mulAll(tr(-2.35, 0, 1.45), rotY(0.25)));
    const BIN = [0.22, 0.32, 0.26, 0.1], BIN2 = [0.18, 0.27, 0.22, 0.1];
    const bw0 = 0.26, bd0 = 0.28, bw1 = 0.3, bd1 = 0.36, bh = 1.0, by0 = 0.05;
    const q = [[-bw0, by0, -bd0], [bw0, by0, -bd0], [bw0, by0, bd0], [-bw0, by0, bd0]], t = [[-bw1, bh, -bd1], [bw1, bh, -bd1], [bw1, bh, bd1], [-bw1, bh, bd1]];
    for (let i = 0; i < 4; i++) b.plate(q[i], q[(i + 1) % 4], t[(i + 1) % 4], t[i], i % 2 ? BIN : BIN2);
    b.plate(q[0], q[1], q[2], q[3], BIN2);
    b.box(0, bh + 0.03, 0.02, 2 * bw1 + 0.06, 0.05, 2 * bd1 + 0.08, sh(BIN, 1.1));
    if (D) {
      b.box(0, bh + 0.005, bd1 + 0.05, 0.3, 0.05, 0.04, sh(BIN, 1.2));
      for (const v of [0.35, 0.65]) b.box(0, v, bd0 + (bd1 - bd0) * v / bh + 0.012, 0.4, 0.04, 0.02, BIN2);
      b.box(0, 0.6, bd0 + 0.04 + 0.012, 0.18, 0.12, 0.01, [0.9, 0.9, 0.85]);
      b.cyl([-bw1 + 0.02, bh - 0.08, -bd1 - 0.05], [bw1 - 0.02, bh - 0.08, -bd1 - 0.05], 0.02, 0.02, 8, BIN2);
      for (const s2 of [-1, 1]) b.beam([s2 * (bw1 - 0.04), bh - 0.08, -bd1 - 0.05], [s2 * (bw1 - 0.04), bh - 0.15, -bd1 + 0.02], 0.03, BIN2);
    }
    for (const s2 of [-1, 1]) b.cyl([s2 * 0.28, 0.1, -bd0 - 0.02], [s2 * 0.34, 0.1, -bd0 - 0.02], 0.1, 0.1, D ? 14 : 6, RUBBER);
    b.cyl([-0.3, 0.1, -bd0 - 0.02], [0.3, 0.1, -bd0 - 0.02], 0.015, 0.015, 6, STEEL);
    b.pop();
    // ---- coiled garden hose with a brass nozzle ----
    if (D) {
      const pts = []; for (let k = 0; k <= 6 * 12; k++) { const a = k / 12 * PI * 2, rr2 = 0.22 + 0.035 * (k / 12); pts.push([0.9 + Math.cos(a) * rr2, 0.025 + 0.008 * Math.sin(a * 2 + k * 0.1), 0.55 + Math.sin(a) * rr2]); }
      pts.push([1.3, 0.025, 0.2]); pts.push([1.5, 0.025, 0.05]); b.tube(pts, 0.017, 5, HOSE);
      b.cyl([1.5, 0.025, 0.05], [1.58, 0.03, -0.04], 0.022, 0.022, 8, [0.75, 0.6, 0.3, 0.4]); b.cyl([1.58, 0.03, -0.04], [1.68, 0.04, -0.12], 0.03, 0.018, 8, [0.75, 0.6, 0.3, 0.4]);
    } else b.cyl([0.9, 0, 0.55], [0.9, 0.05, 0.55], 0.42, 0.42, 8, HOSE);
    // a few bits of scrap: a cinder block and a short length of conduit
    b.box(-2.4, 0.1, -0.05 + 0.0, 0.4, 0.2, 0.2, vary(CONC, r, 0.05));
    if (D) { b.cyl([1.4, 0.03, -0.3], [2.6, 0.03, 0.05], 0.03, 0.03, 8, GALV, false); b.cyl([-0.2, 0.025, 1.0], [0.4, 0.025, 0.8], 0.025, 0.025, 8, [0.85, 0.85, 0.82], false); }
    return b;
  }

  return {
    name: 'campus',
    items: [
      { name: 'ops_building', budget: 45000, build: opsBuilding, colliders: [
        { type: 'box', x: 0, z: 0, hx: 15.05, hz: 7.05, rot: 0, top: 4.5, solid: true },
        { type: 'box', x: -6.5, z: 2.0, hx: 3.05, hz: 6.05, rot: 0, top: 6.2, solid: true },
        { type: 'box', x: 5.7, z: 8.7, hx: 9.15, hz: 1.7, rot: 0, top: 3.82, solid: false },
        { type: 'box', x: -6.5, z: 8.8, hx: 3.0, hz: 0.8, rot: 0, top: 0.6, solid: true }
      ] },
      { name: 'water_tower', budget: 14000, build: waterTower, colliders: [
        { type: 'cyl', x: 0, z: 0, r: 3.25, top: 16.1, solid: false },
        { type: 'cyl', x: 2.9, z: 2.9, r: 0.5, top: 11.0, solid: true }, { type: 'cyl', x: -2.9, z: 2.9, r: 0.5, top: 11.0, solid: true },
        { type: 'cyl', x: -2.9, z: -2.9, r: 0.5, top: 11.0, solid: true }, { type: 'cyl', x: 2.9, z: -2.9, r: 0.5, top: 11.0, solid: true }
      ] },
      { name: 'solar_array', budget: 8000, build: solarArray, colliders: [
        { type: 'box', x: 0, z: 0, hx: 12.05, hz: 1.48, rot: 0, top: 1.6, solid: false }
      ] },
      { name: 'equipment_shed', budget: 10000, build: shed, colliders: [
        { type: 'box', x: 0, z: 0, hx: 4.05, hz: 3.05, rot: 0, top: 3.0, solid: true }
      ] },
      { name: 'yard_clutter', budget: 9000, build: clutter, colliders: [
        { type: 'box', x: -1.9, z: -1.3, hx: 0.6, hz: 1.0, rot: 0, top: 2.0, solid: true },
        { type: 'box', x: 1.3, z: -1.4, hx: 1.6, hz: 0.85, rot: 0, top: 0.95, solid: true }
      ] }
    ]
  };
}) };
