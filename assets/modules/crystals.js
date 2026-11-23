window.MODDEF = { fn: (function (K) {
  // Cavern crystals (Signal Run, giant crystal cavern). Hue comes from the game per instance.
  // Local frame: grows along +Y, base buried a little (down to about y = -0.15), tallest tip at y = 1.0 exactly.
  // Colour channels: r = inner glow (dim at the rock, bright at tips), g = per-facet tint shift, b = cloudiness / frost, a = 0.
  // Every face is flat (own normal) so the facets stay crisp. Cross-sections are true irregular hexagons
  // (six cut lines at unequal distances), so opposite faces stay parallel like real quartz.
  const { MB, sc, rnd, norm, sub, add, scale, cross, dot } = K;
  const PI = Math.PI, cl = v => Math.max(0, Math.min(1, v));
  const ss = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // ---------- colour: r glow, g tint shift, b cloudiness ----------
  function face(R, milkyChance) { return { j: R() - 0.5, g: R() - 0.5, m: R() < (milkyChance || 0.18) ? 1 : 0 }; }
  function colr(hn, f, kind, G) {
    let r, b;
    if (kind === 'tip') { r = 0.3 + 0.36 * ss(0.55, 1.0, hn) + f.j * 0.34; b = 0.12 + f.m * 0.25 - 0.08 * ss(0.7, 1, hn); }
    else if (kind === 'frac') { r = 0.42 + 0.26 * ss(0.5, 1.0, hn) + f.j * 0.4; b = 0.34 + f.g * 0.3; }
    else if (kind === 'chip') { r = 0.3 + 0.36 * ss(0.0, 0.9, hn) + f.j * 0.2; b = 0.06; }
    else if (kind === 'matrix') { r = 0.06 + 0.05 * f.j; b = 0.9; }
    else { const r0 = 0.06 + 0.42 * ss(-0.02, 0.95, hn); r = Math.max(r0 * 0.6, r0 + f.j * 0.34 * ss(0.0, 0.35, hn)); b = 0.82 - 0.62 * ss(-0.04, 0.3, hn) + f.m * 0.32; }
    return [cl(r * G), cl(0.5 + f.g * 0.62), cl(b), 0];
  }

  // ---------- flat triangle with its normal pointing away from ref ----------
  function ftri(mb, a, b, c, ca, cb, cc, ref) {
    let n = norm(cross(sub(b, a), sub(c, a)));
    const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (dot(n, sub(cen, ref)) < 0) { const t = b; b = c; c = t; const u = cb; cb = cc; cc = u; n = scale(n, -1); }
    mb.tri(mb.v(a[0], a[1], a[2], n[0], n[1], n[2], ca), mb.v(b[0], b[1], b[2], n[0], n[1], n[2], cb), mb.v(c[0], c[1], c[2], n[0], n[1], n[2], cc));
  }

  // ---------- irregular cross-section: n cut lines at unequal distances, optional corner chamfers ----------
  function section(R, n, jit, chamfer) {
    const rot = R() * PI * 2, L = [];
    for (let j = 0; j < n; j++) L.push([rot + j * 2 * PI / n + (R() - 0.5) * 0.06, 1 + (R() * 2 - 1) * jit]);
    const P = [];
    for (let j = 0; j < n; j++) {
      const [t0, d0] = L[j], [t1, d1] = L[(j + 1) % n], det = Math.cos(t0) * Math.sin(t1) - Math.sin(t0) * Math.cos(t1);
      P.push([(d0 * Math.sin(t1) - d1 * Math.sin(t0)) / det, (Math.cos(t0) * d1 - Math.cos(t1) * d0) / det]);
    }
    if (!chamfer) return P;
    const Q = [];                       // cut every corner: narrow faces between the main faces (12-sided giant)
    for (let i = 0; i < n; i++) {
      const p = P[i], a = P[(i + n - 1) % n], b = P[(i + 1) % n], c = chamfer * (0.7 + 0.6 * R());
      Q.push([p[0] + (a[0] - p[0]) * c, p[1] + (a[1] - p[1]) * c], [p[0] + (b[0] - p[0]) * c, p[1] + (b[1] - p[1]) * c]);
    }
    return Q;
  }

  // ---------- one crystal ----------
  // o: B base point, F axis, len (tip height along axis), rad, sec (cross-section), rings [{h, k, off:[x,z], dh(i,x,z), pull:{i:amt}}],
  //    tip {h, ridge, dA, dB} or frac {jit}, G glow multiplier, seed
  function crystal(mb, o) {
    const R = rnd(o.seed), F = norm(o.F), S = norm(cross(F, Math.abs(F[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), U = cross(S, F), B = o.B, len = o.len, G = o.G || 1;
    const W = (h, x, z) => [B[0] + F[0] * h + S[0] * x + U[0] * z, B[1] + F[1] * h + S[1] * x + U[1] * z, B[2] + F[2] * h + S[2] * x + U[2] * z];
    const sec = o.sec, n = sec.length;
    // ring vertices in (h, x, z) local coords
    const rings = o.rings.map(rg => {
      const off = rg.off || [0, 0];
      return sec.map((p, i) => {
        const pf = rg.pull && rg.pull[i] !== undefined ? rg.pull[i] : 1, x = p[0] * o.rad * rg.k * pf + off[0], z = p[1] * o.rad * rg.k * pf + off[1];
        return { h: rg.h + (rg.dh ? rg.dh(i, x, z) : 0), x, z, chip: pf < 1, off };
      });
    });
    const P = q => W(q.h, q.x, q.z), cols = sec.map(() => face(R, o.milky));
    for (let r = 0; r < rings.length - 1; r++) {
      const r0 = rings[r], r1 = rings[r + 1], kind = o.rings[r + 1].kind || 'side';
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n, a = r0[i], b = r0[i1], c = r1[i1], d = r1[i], cf = cols[i], ledge = Math.abs(a.h - d.h) < o.rad * 0.1;
        const f = (ledge || kind === 'tip') ? face(R, o.milky) : { j: cf.j + (R() - 0.5) * 0.08, g: cf.g + (R() - 0.5) * 0.06, m: cf.m };
        const hmin = Math.min(a.h, b.h, c.h, d.h), mo = r0[0].off, ref = W(hmin - o.rad * 0.6, (mo[0] + r1[0].off[0]) / 2, (mo[1] + r1[0].off[1]) / 2);
        const kd = q => (a.chip || b.chip || c.chip || d.chip) ? 'chip' : kind;
        const C = q => colr(q.h / len, f, kd(q), G);
        ftri(mb, P(a), P(b), P(c), C(a), C(b), C(c), ref);
        ftri(mb, P(a), P(c), P(d), C(a), C(c), C(d), ref);
      }
    }
    const top = rings[rings.length - 1], toff = top[0].off;
    let hmin = 1e9; for (const q of top) hmin = Math.min(hmin, q.h);
    const ref = W(hmin - o.rad * 1.2, toff[0], toff[1]);
    if (o.tip) {
      // apex, or a short chisel ridge between two apex points A and B (slightly irregular tip)
      const t = o.tip, ra = (t.ang === undefined ? R() * PI : t.ang), rd = [Math.cos(ra), Math.sin(ra)], rl = (t.ridge || 0) * o.rad;
      const cx = toff[0] + (t.off ? t.off[0] * o.rad : 0), cz = toff[1] + (t.off ? t.off[1] * o.rad : 0);
      const A = { h: t.h - (t.dA || 0), x: cx + rd[0] * rl / 2, z: cz + rd[1] * rl / 2 }, Bq = { h: t.h - (t.dB || 0), x: cx - rd[0] * rl / 2, z: cz - rd[1] * rl / 2 };
      const side = top.map(q => rl > 0 && ((q.x - cx) * rd[0] + (q.z - cz) * rd[1]) < 0 ? Bq : A);
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n, a = top[i], b = top[i1], X = side[i], Y = side[i1], f = face(R, o.milky * 0.5);
        const C = q => colr(q.h / len, f, 'tip', G);
        ftri(mb, P(a), P(b), P(Y), C(a), C(b), C(Y), ref);
        if (X !== Y) ftri(mb, P(a), P(Y), P(X), C(a), C(Y), C(X), ref);
      }
    } else if (o.cap) {
      const f = face(R);
      for (let i = 1; i < n - 1; i++) ftri(mb, P(top[0]), P(top[i]), P(top[i + 1]), colr(top[0].h / len, f, 'frac', G), colr(top[i].h / len, f, 'frac', G), colr(top[i + 1].h / len, f, 'frac', G), ref);
    } else if (o.frac) {
      // broken top: an inner ring of fracture ridges and a low centre, every triangle its own facet
      const fj = o.frac.jit, cen = { h: o.frac.ch, x: toff[0], z: toff[1] }, inner = top.map((q, i) => {
        const x = toff[0] + (q.x - toff[0]) * (0.45 + 0.2 * R()), z = toff[1] + (q.z - toff[1]) * (0.45 + 0.2 * R());
        return { h: o.frac.plane(x, z) + (R() - 0.5) * fj * o.rad, x, z };
      });
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n, a = top[i], b = top[i1], c = inner[i1], d = inner[i], f1 = face(R), f2 = face(R), f3 = face(R);
        ftri(mb, P(a), P(b), P(c), colr(a.h / len, f1, 'frac', G), colr(b.h / len, f1, 'frac', G), colr(c.h / len, f1, 'frac', G), ref);
        if (o.frac.full) ftri(mb, P(a), P(c), P(d), colr(a.h / len, f2, 'frac', G), colr(c.h / len, f2, 'frac', G), colr(d.h / len, f2, 'frac', G), ref);
        else ftri(mb, P(a), P(c), P(d), colr(a.h / len, f1, 'frac', G), colr(c.h / len, f1, 'frac', G), colr(d.h / len, f1, 'frac', G), ref);
        ftri(mb, P(d), P(c), P(cen), colr(d.h / len, f3, 'frac', G), colr(c.h / len, f3, 'frac', G), colr(cen.h / len, f3, 'frac', G), ref);
      }
    }
  }

  // ---------- ring recipes ----------
  // full-detail terminated crystal: frosted base, body, optional growth steps, zig-zag shoulder, kinked termination, chisel tip
  function fullPoint(R, rad, len, opt) {
    opt = opt || {};
    const tipL = rad * (opt.tipK || 2.2), sh = len - tipL, taper = opt.taper === undefined ? 0.1 : opt.taper, zz = rad * 0.22;
    const k = h => 1 - taper * Math.max(0, h) / len, rings = [];
    rings.push({ h: opt.h0 === undefined ? -0.12 : opt.h0, k: 1.02 });
    for (const t of (opt.body || [0.1, 0.42])) {
      const h = sh * t; rings.push({ h, k: k(h) * (1 + (R() - 0.5) * 0.03) });
      if (opt.steps && opt.steps.indexOf(t) >= 0) rings.push({ h: h + rad * 0.02, k: k(h) * 0.955 });
    }
    rings.push({ h: sh, k: k(sh), dh: i => (i % 2 ? zz : -zz) * (0.6 + 0.8 * R()) });
    if (opt.kink !== false) {
      const hm = sh + tipL * 0.5;
      rings.push({ h: hm, k: k(sh) * 0.5, kind: 'tip', off: [(R() - 0.5) * rad * 0.15, (R() - 0.5) * rad * 0.15], dh: i => (i % 2 ? zz : -zz) * 0.5 * R() });
    }
    return { rings, tip: { h: len, ridge: opt.ridge === undefined ? 0.35 + 0.3 * R() : opt.ridge, dA: 0, dB: rad * (0.1 + 0.25 * R()), off: [(R() - 0.5) * 0.25, (R() - 0.5) * 0.25] } };
  }
  function lowPoint(rad, len, opt) {
    opt = opt || {};
    const sh = len - rad * (opt.tipK || 2.2);
    return { rings: [{ h: opt.h0 === undefined ? -0.12 : opt.h0, k: 1 }, { h: sh, k: 0.92 }], tip: { h: len, ridge: 0 } };
  }

  // places a crystal leaning away from +Y (tilt from vertical, azimuth)
  const dirOf = (tilt, az) => [Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az)];

  // finishes a model: uniform scale so the tallest point is exactly y = 1.0
  function finish(tmp) {
    const b = tmp.bounds(), k = 1 / b.max[1], out = new MB();
    out.push(sc(k, k, k)); out.merge(tmp); out.pop();
    // snap the very top exactly to 1.0
    let top = -1; for (let i = 1; i < out.P.length; i += 3) if (top < 0 || out.P[i] > out.P[top]) top = i;
    const m = out.P[top]; for (let i = 1; i < out.P.length; i += 3) if (Math.abs(out.P[i] - m) < 1e-9) out.P[i] = 1.0;
    return out;
  }

  // frosted rock-matrix mound where clustered crystals fuse (irregular low pyramid, mostly below the surface)
  function matrix(mb, R, rx, rz, sides, h) {
    const pts = [], apex = [(R() - 0.5) * rx * 0.2, h, (R() - 0.5) * rz * 0.2], ref = [0, -0.2, 0];
    for (let i = 0; i < sides; i++) { const a = i / sides * PI * 2 + (R() - 0.5) * 0.4, s = 0.75 + 0.35 * R(); pts.push([Math.cos(a) * rx * s, -0.05 - 0.04 * R(), Math.sin(a) * rz * s]); }
    for (let i = 0; i < sides; i++) {
      const f = face(R), a = pts[i], b = pts[(i + 1) % sides], C = q => colr(0, f, 'matrix', 1);
      ftri(mb, a, b, apex, C(a), C(b), C(apex), ref);
    }
  }

  // ======================= items =======================
  function point(detail) {
    const R = rnd(101), tmp = new MB(), rad = 0.098, sec = section(R, 6, 0.16);
    const spec = detail ? fullPoint(R, rad, 1, { body: [0.1, 0.4, 0.68], steps: [0.4] }) : lowPoint(rad, 1);
    crystal(tmp, Object.assign({ B: [0, 0, 0], F: [0.03, 1, -0.02], len: 1, rad, sec, G: 1, seed: 7, milky: 0.2 }, spec));
    return finish(tmp);
  }

  function double(detail) {
    const R = rnd(202), tmp = new MB(), rad = 0.1, sec = section(R, 6, 0.15);
    const main = detail ? fullPoint(R, rad, 1, { body: [0.1, 0.38, 0.7], steps: [0.7] }) : lowPoint(rad, 1);
    crystal(tmp, Object.assign({ B: [0, 0, 0], F: [-0.04, 1, 0.02], len: 1, rad, sec, G: 1, seed: 11, milky: 0.2 }, main));
    // sibling growing out of the side, its root buried inside the main body
    const R2 = rnd(203), r2 = 0.068, l2 = 0.6, sec2 = section(R2, detail ? 6 : 3, 0.18), F2 = dirOf(0.55, 0.4);
    const sib = detail ? fullPoint(R2, r2, l2, { body: [0.3, 0.65], h0: -0.03, kink: true, tipK: 2.0 }) : lowPoint(r2, l2, { h0: -0.03 });
    crystal(tmp, Object.assign({ B: [Math.cos(0.4) * 0.04, 0.24, Math.sin(0.4) * 0.04], F: F2, len: l2, rad: r2, sec: sec2, G: 0.95, seed: 12, milky: 0.15 }, sib));
    return finish(tmp);
  }

  function shard(detail) {
    const R = rnd(303), tmp = new MB(), rad = 0.16, sec = section(R, 6, 0.18), len = 1;
    // fracture plane tilted ~32 degrees, highest at +x side
    const plane = (x, z) => 0.8 + x * 0.62 + z * 0.12;
    const rings = detail ? [
      { h: -0.09, k: 1.02 }, { h: 0.08, k: 1.0 }, { h: 0.34, k: 0.99, off: [0.005, 0] },
      { h: 0.34 + 0.004, k: 0.95, off: [0.005, 0] }, { h: 0.55, k: 0.95, off: [0.01, 0.004] },
      { h: 0, k: 0.94, off: [0.012, 0.006], dh: (i, x, z) => plane(x, z) + (R() - 0.5) * 0.06 }
    ] : [
      { h: -0.09, k: 1 }, { h: 0, k: 0.95, dh: (i, x, z) => plane(x, z) }
    ];
    const o = { B: [0, 0.01, 0], F: dirOf(0.3, 0.9), len, rad, sec, rings, G: 1, seed: 21, milky: 0.25 };
    if (detail) o.frac = { plane, jit: 0.5, ch: 0.74, full: true };
    else o.frac = { plane, jit: 0, ch: 0.78, full: false };
    if (!detail) { o.frac = null; o.cap = true; }    // far away: the broken top as one flat sloped cap
    crystal(tmp, o);
    return finish(tmp);
  }

  function cluster(detail) {
    const R = rnd(404), tmp = new MB();
    // [tilt, azimuth, length, radius, base offset x, z]
    const L = [
      [0.1, 0.3, 1.0, 0.085, 0, 0],
      [0.48, 0.6, 0.8, 0.072, 0.03, 0.02], [0.62, 2.0, 0.68, 0.064, -0.02, 0.03], [0.55, 3.3, 0.74, 0.07, -0.03, -0.01],
      [0.7, 4.5, 0.58, 0.056, 0.0, -0.03], [0.85, 5.5, 0.5, 0.05, 0.03, -0.02], [0.95, 1.2, 0.42, 0.043, 0.02, 0.04],
      [1.05, 2.7, 0.34, 0.036, -0.04, 0.02]
    ];
    L.forEach(([tilt, az, len, rad, bx, bz], q) => {
      const Rq = rnd(410 + q), big = q < 4, sides = detail ? 6 : (q === 0 ? 6 : 3), sec = section(Rq, sides, 0.17);
      if (!detail && q >= 6) return;                   // far away: the two smallest drop out
      let spec;
      const h0 = q === 0 ? -0.1 : -0.07;
      if (detail) spec = q === 0 ? fullPoint(Rq, rad, len, { body: [0.1, 0.45], steps: [0.45], h0 })
        : big ? fullPoint(Rq, rad, len, { body: [0.15, 0.55], h0 })
        : fullPoint(Rq, rad, len, { body: [0.25], kink: q < 6, h0 });
      else spec = lowPoint(rad, len, { h0 });
      crystal(tmp, Object.assign({ B: [bx, -0.02, bz], F: dirOf(tilt, az), len, rad, sec, G: 0.9 + 0.1 * len, seed: 420 + q, milky: 0.2 }, spec));
    });
    if (detail) matrix(tmp, R, 0.2, 0.17, 8, 0.07);
    return finish(tmp);
  }

  function giant(detail) {
    const R = rnd(505), tmp = new MB(), rad = 0.105, len = 1;
    if (detail) {
      const sec = section(R, 6, 0.14, 0.13);                     // 12 faces: six broad, six narrow edge faces
      const tipL = rad * 2.4, sh = len - tipL, zz = rad * 0.2, k = h => 1 - 0.12 * Math.max(0, h);
      const rings = [{ h: -0.12, k: 1.02 }], chipI = 3, chipJ = 4;
      const levels = [0.05, 0.16, 0.27, 0.38, 0.5, 0.6, 0.7, 0.8, 0.9];
      const steps = { 0.16: 0.95, 0.38: 0.94, 0.5: 0.96, 0.9: 0.95 };       // growth lines: small inset ledges
      let kk = 1;
      for (const t of levels) {
        const h = sh * t, wob = 1 + (R() - 0.5) * 0.025;
        const pull = t === 0.6 ? { [chipI]: 0.5, [chipJ]: 0.72 } : t === 0.7 ? { [chipI]: 0.45, [chipJ]: 0.8 } : t === 0.8 ? { [chipI]: 0.7 } : null;   // chipped edge
        rings.push({ h, k: k(h) * kk * wob, pull });
        if (steps[t]) { kk *= steps[t]; rings.push({ h: h + rad * 0.03, k: k(h) * kk * wob, pull }); }
      }
      rings.push({ h: sh, k: k(sh) * kk, dh: i => (i % 2 ? zz : -zz) * (0.5 + R()), pull: { [chipI]: 0.78 } });
      rings.push({ h: sh + tipL * 0.35, k: k(sh) * kk * 0.7, kind: 'tip', dh: i => (R() - 0.5) * zz });
      rings.push({ h: sh + tipL * 0.68, k: k(sh) * kk * 0.36, kind: 'tip', off: [rad * 0.05, -rad * 0.03], dh: i => (R() - 0.5) * zz * 0.6 });
      crystal(tmp, { B: [0, 0, 0], F: [0.02, 1, 0.03], len, rad, sec, rings, tip: { h: len, ridge: 0.5, dB: rad * 0.2, off: [0.08, -0.05] }, G: 1.05, seed: 31, milky: 0.22 });
    } else {
      const sec = section(R, 6, 0.14), sh = len - rad * 2.4;
      crystal(tmp, { B: [0, 0, 0], F: [0.02, 1, 0.03], len, rad, sec, rings: [{ h: -0.12, k: 1 }, { h: sh * 0.4, k: 0.95 }, { h: sh, k: 0.88 }], tip: { h: len, ridge: 0.5 }, G: 1.05, seed: 31, milky: 0.2 });
    }
    // small crystals at the foot of the giant
    const kids = [[0.62, 0.4, 0.26, 0.036], [0.85, 1.5, 0.16, 0.026], [0.55, 2.6, 0.3, 0.04], [0.95, 3.4, 0.12, 0.02], [0.72, 4.3, 0.2, 0.03], [0.9, 5.3, 0.15, 0.024], [1.05, 6.0, 0.09, 0.016]];
    kids.forEach(([tilt, az, l, r], q) => {
      if (!detail && q > 3) return;
      const Rq = rnd(530 + q), d = dirOf(tilt, az), B = [Math.cos(az) * rad * 0.9, -0.025, Math.sin(az) * rad * 0.9];
      const sec = section(Rq, detail ? 6 : 3, 0.18);
      const spec = detail ? fullPoint(Rq, r, l, { body: [0.3], kink: false, h0: -0.03, ridge: 0.3 }) : lowPoint(r, l, { h0: -0.03 });
      crystal(tmp, Object.assign({ B, F: d, len: l, rad: r, sec, G: 0.85, seed: 540 + q, milky: 0.2 }, spec));
    });
    if (detail) matrix(tmp, R, 0.19, 0.17, 9, 0.03);
    return finish(tmp);
  }

  function spray(detail) {
    const R = rnd(606), tmp = new MB(), N = detail ? 17 : 12;
    for (let q = 0; q < N; q++) {
      const Rq = rnd(620 + q), main = q === 0;
      // fan: mostly spread in the x-y plane, a little depth in z
      const fanA = main ? 0.04 : (Rq() * 2 - 1) * 1.05, depth = (Rq() - 0.5) * 0.7 * (main ? 0.1 : 1);
      const d = norm([Math.sin(fanA), Math.cos(fanA) * Math.cos(depth), Math.sin(depth) * 0.9]);
      const len = main ? 1 : (0.95 - 0.5 * Math.abs(fanA) / 1.05) * (0.55 + 0.45 * Rq()), rad = 0.012 + 0.016 * len * (0.6 + 0.6 * Rq());
      const thick = detail && (main || len > 0.7);
      const sides = detail ? (thick ? 6 : 4) : 3, sec = section(Rq, sides, 0.2);
      const B = [(Rq() - 0.5) * 0.05, -0.03, (Rq() - 0.5) * 0.04];
      const tipK = 3.5 + Rq() * 2.5;
      const spec = detail
        ? { rings: [{ h: -0.05, k: 1 }, ...(thick ? [{ h: len * 0.12, k: 0.96 }] : []), { h: len - rad * tipK, k: 0.82, dh: i => (i % 2 ? 1 : -1) * rad * 0.4 }], tip: { h: len, ridge: thick ? 0.3 : 0 } }
        : { rings: [{ h: -0.05, k: 1 }], tip: { h: len, ridge: 0 } };
      crystal(tmp, Object.assign({ B, F: d, len, rad, sec, G: 0.95, seed: 640 + q, milky: 0.15 }, spec));
    }
    if (detail) matrix(tmp, R, 0.09, 0.06, 7, 0.03);
    return finish(tmp);
  }

  return {
    name: 'crystals',
    items: [
      { name: 'crystal_point', budget: 120, build: point, colliders: [] },
      { name: 'crystal_double', budget: 160, build: double, colliders: [] },
      { name: 'crystal_shard', budget: 120, build: shard, colliders: [] },
      { name: 'crystal_cluster', budget: 450, build: cluster, colliders: [] },
      { name: 'crystal_giant', budget: 700, build: giant, colliders: [] },
      { name: 'crystal_spray', budget: 300, build: spray, colliders: [] }
    ]
  };
}) };
