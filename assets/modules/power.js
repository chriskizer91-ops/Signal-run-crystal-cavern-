window.MODDEF = { fn: (function (K) {
  'use strict';
  const { MB, tr, rotY, mulAll, rnd, along, norm, sub, add, scale, cross, dot, lerp } = K;

  // ---------------------------------------------------------------- palette
  const GALV = [0.43, 0.45, 0.46, 0.15];          // galvanised steel
  const GALV_D = [0.34, 0.36, 0.38, 0.15];
  const CONC = [0.7, 0.68, 0.63, 1];
  const PORC = [0.36, 0.19, 0.11, 0.35];        // brown glazed porcelain
  const FIT = [0.5, 0.52, 0.55, 0.3];            // cast fittings
  const BLACK = [0.07, 0.07, 0.07, 0];
  const WHITE = [0.92, 0.92, 0.9, 0.05];
  const RED = [0.75, 0.12, 0.1, 0.1];
  const YEL = [0.95, 0.78, 0.12, 0.1];
  const sh = (c, k) => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k), c[3] || 0];
  const neg = v => [-v[0], -v[1], -v[2]];
  const len = v => Math.hypot(v[0], v[1], v[2]);

  // ---------------------------------------------------------------- generic helpers
  // box with explicit unit axes
  function obox(b, c, ax, ay, az, sx, sy, sz, col) {
    b.push(new Float64Array([ax[0], ax[1], ax[2], 0, ay[0], ay[1], ay[2], 0, az[0], az[1], az[2], 0, c[0], c[1], c[2], 1]));
    b.box(0, 0, 0, sx, sy, sz, col); b.pop();
  }
  const perp = (d, f) => { const p = sub(d, scale(f, dot(d, f))); return len(p) < 1e-6 ? norm(cross(f, Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])) : norm(p); };
  // steel angle (L section): heel on the line a-p, the two flanges point towards d1 and d2
  function angle(b, a, p, w, d1, d2, col) {
    const L = len(sub(p, a)); if (L < 1e-6) return;
    const f = norm(sub(p, a)), m = lerp(a, p, 0.5), t = Math.max(0.014, w * 0.11);
    for (const d of [d1, d2]) { const e = perp(d, f), n = cross(f, e); obox(b, add(m, scale(e, w / 2)), e, f, n, w, L, t, col); }
  }
  // flat-ish bar lying in a face whose normal is n
  function bar(b, a, p, w, n, col, t) {
    const L = len(sub(p, a)); if (L < 1e-6) return;
    const f = norm(sub(p, a)), az = perp(n, f), ax = cross(f, az);
    obox(b, lerp(a, p, 0.5), ax, f, az, w, L, t || w * 0.5, col);
  }
  // thin two-sided strip (wire, spike) - 2 triangles
  function strip(b, a, p, w, n, col) {
    const f = norm(sub(p, a)), s = scale(norm(cross(f, n)), w / 2);
    b.plate(sub(a, s), add(a, s), add(p, s), sub(p, s), col);
  }
  // square plate centred at c in the plane (u, v)
  function sqPlate(b, c, u, v, su, sv, col) {
    const U = scale(u, su / 2), V = scale(v, sv / 2);
    b.plate(sub(sub(c, U), V), sub(add(c, U), V), add(add(c, U), V), add(sub(c, U), V), col);
  }

  // square lattice body. lv = [[y, halfWidth], ...] bottom to top. o = member sizes and options.
  function latticeBody(b, cx, cz, lv, o, r) {
    const P = (i, sx, sz) => [cx + sx * lv[i][1], lv[i][0], cz + sz * lv[i][1]];
    const col = () => sh(GALV, 0.9 + 0.16 * r());
    const nL = lv.length;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < nL - 1; i++)
      angle(b, P(i, sx, sz), P(i + 1, sx, sz), o.leg(lv[i][0]), [-sx, 0, 0], [0, 0, -sz], col());
    const faces = [[[0, 0, 1], [-1, 1], [1, 1]], [[0, 0, -1], [1, -1], [-1, -1]], [[1, 0, 0], [1, 1], [1, -1]], [[-1, 0, 0], [-1, -1], [-1, 1]]];
    for (const [n, A, B] of faces) {
      for (let i = 0; i < nL - 1; i++) {
        const p0 = P(i, A[0], A[1]), p1 = P(i, B[0], B[1]), p2 = P(i + 1, B[0], B[1]), p3 = P(i + 1, A[0], A[1]);
        const u = norm(sub(p1, p0)), v = norm(cross(n, u)).map(x => x * Math.sign(cross(n, u)[1] || 1)), out = scale(n, 0.035);
        const hor = (a, c) => (o.horBar && o.horBar(lv[i + 1][0])) ? bar(b, a, c, o.hor, n, col(), o.hor * 0.6) : angle(b, a, c, o.hor, neg(n), [0, -1, 0], col());
        if (i === 0 && o.bottomHor) hor(p0, p1);
        hor(p3, p2);
        const w0 = lv[i][1], w1 = lv[i + 1][1], t = w0 / (w0 + w1), X = lerp(p0, p2, t);
        if (o.kBrace && o.kBrace(i)) {           // K bracing: bottom corners to top middle
          const m = lerp(p3, p2, 0.5); bar(b, p0, m, o.diag, n, col()); bar(b, p1, m, o.diag, n, col());
          sqPlate(b, add(m, out), u, [0, 1, 0], 0.4, 0.3, sh(GALV, 1.05));
        } else {
          bar(b, p0, p2, o.diag, n, col()); bar(b, p1, p3, o.diag, n, col());
          if (o.plates) sqPlate(b, add(X, scale(n, o.diag * 0.3)), u, [0, 1, 0], 0.22, 0.22, sh(GALV, 1.08));
        }
        if (o.redund && o.redund(i)) {           // secondary members in big panels
          const mL = lerp(p0, p3, 0.5), mR = lerp(p1, p2, 0.5), rw = o.diag * 0.7;
          bar(b, mL, X, rw, n, col()); bar(b, mR, X, rw, n, col()); bar(b, X, (i === 0 && !o.bottomHor) ? lerp(p3, p2, 0.5) : lerp(p0, p1, 0.5), rw, n, col());
        }
        if (o.plates) for (const [p, s] of [[p3, 1], [p2, -1]]) {   // gusset plates at the leg joints
          sqPlate(b, add(add(p, scale(u, s * 0.24)), out), u, [0, 1, 0], 0.42, 0.5, sh(GALV, 1.06));
        }
      }
    }
    if (o.plan) for (let i = 0; i < nL; i++) if (o.plan(lv[i][0])) {
      bar(b, P(i, -1, -1), P(i, 1, 1), o.diag, [0, 1, 0], col()); bar(b, P(i, 1, -1), P(i, -1, 1), o.diag, [0, 1, 0], col());
    }
  }

  // trussed arm: root bottom pair, root top pair, tip bottom pair, tip top point. Bottom plane + two side faces braced.
  function armTruss(b, rB, rT, tB, tT, N, o, r) {
    const col = () => sh(GALV, 0.9 + 0.16 * r());
    const BL = k => lerp(rB[0], tB[0], k / N), BR = k => lerp(rB[1], tB[1], k / N), TL = k => lerp(rT[0], tT, k / N), TR = k => lerp(rT[1], tT, k / N);
    const out = norm(sub(lerp(tB[0], tB[1], 0.5), lerp(rB[0], rB[1], 0.5)));
    const side = norm(sub(rB[1], rB[0]));
    angle(b, rB[0], tB[0], o.chord, [0, 1, 0], side, col()); angle(b, rB[1], tB[1], o.chord, [0, 1, 0], neg(side), col());
    angle(b, rT[0], tT, o.chord, [0, -1, 0], side, col()); angle(b, rT[1], tT, o.chord, [0, -1, 0], neg(side), col());
    for (let k = 1; k <= N; k++) {
      if (k < N) { bar(b, BL(k), BR(k), o.web, [0, 1, 0], col()); bar(b, BL(k), TL(k), o.web, side, col()); bar(b, BR(k), TR(k), o.web, side, col()); if (o.topX && len(sub(TL(k), TR(k))) > 0.15) bar(b, TL(k), TR(k), o.web, [0, 1, 0], col()); }
      const a = k % 2;   // zig-zag diagonals
      bar(b, a ? BL(k - 1) : TL(k - 1), a ? TL(k) : BL(k), o.web, side, col());
      bar(b, a ? BR(k - 1) : TR(k - 1), a ? TR(k) : BR(k), o.web, side, col());
      bar(b, a ? BL(k - 1) : BR(k - 1), a ? BR(k) : BL(k), o.web, [0, 1, 0], col());
    }
    // tip end plate
    const tc = lerp(lerp(tB[0], tB[1], 0.5), tT, 0.5);
    obox(b, tc, side, [0, 1, 0], out, len(sub(tB[1], tB[0])) + 0.16, tT[1] - tB[0][1] + 0.12, 0.04, sh(GALV, 1.05));
  }

  // box truss beam between A and B (bottom-centre line), width w along 'side', depth hgt up
  function boxTruss(b, A, B, side, w, hgt, N, o, r) {
    const col = () => sh(GALV, 0.9 + 0.16 * r());
    const up = [0, hgt, 0], s = scale(side, w / 2), dir = norm(sub(B, A));
    const C = [[sub(A, s), sub(B, s)], [add(A, s), add(B, s)], [add(sub(A, s), up), add(sub(B, s), up)], [add(add(A, s), up), add(add(B, s), up)]];
    const ins = [[side, [0, 1, 0]], [neg(side), [0, 1, 0]], [side, [0, -1, 0]], [neg(side), [0, -1, 0]]];
    C.forEach((c, i) => angle(b, c[0], c[1], o.chord, ins[i][0], ins[i][1], col()));
    const at = (c, k) => lerp(C[c][0], C[c][1], k / N);
    for (let k = 0; k <= N; k++) {
      bar(b, at(0, k), at(2, k), o.web, side, col()); bar(b, at(1, k), at(3, k), o.web, side, col());
      bar(b, at(0, k), at(1, k), o.web, [0, 1, 0], col()); bar(b, at(2, k), at(3, k), o.web, [0, 1, 0], col());
      if (k === N) break;
      const z = k % 2;
      bar(b, at(0, k + z), at(2, k + 1 - z), o.web, side, col()); bar(b, at(1, k + z), at(3, k + 1 - z), o.web, side, col());
      bar(b, at(0, k + z), at(1, k + 1 - z), o.web, [0, 1, 0], col()); bar(b, at(2, k + 1 - z), at(3, k + z), o.web, [0, 1, 0], col());
    }
    void dir;
  }

  // cap-and-pin disc insulator string from 'top' to 'bot' (any direction). Returns nothing; bot is the conductor clamp point.
  function discString(b, top, bot, o) {
    const L = len(sub(bot, top)); b.push(along(top, bot));   // local +Y runs from top (y=-L/2) to bottom (y=+L/2)
    const y0 = -L / 2, segs = o.segs || 8, rD = o.r || 0.135, col = o.col || PORC;
    b.box(0, y0 + 0.06, 0, 0.14, 0.12, 0.05, FIT);             // shackle / clevis
    b.cyl([0, y0 + 0.1, 0], [0, y0 + L - 0.2, 0], 0.028, 0.028, 4, FIT, false);   // link + pins through the caps
    const first = y0 + 0.36, last = y0 + L - 0.32, n = Math.max(2, Math.round((last - first) / (o.pitch || 0.165)) + 1), pitch = (last - first) / (n - 1);
    for (let i = 0; i < n; i++) {
      const y = first + i * pitch, c = sh(col, 0.92 + 0.12 * ((i * 7) % 3) / 2);
      b.lathe([[0.04, y - 0.065], [rD, y + 0.02], [rD * 0.96, y + 0.045], [0.035, y + 0.05]], segs, c);
    }
    b.box(0, y0 + L - 0.2, 0, 0.3, 0.05, 0.06, FIT);             // yoke
    b.box(0, y0 + L - 0.07, 0, 0.12, 0.14, 0.08, FIT);           // conductor clamp
    if (o.horns) { b.beam([0, y0 + 0.3, 0], [0.32, y0 + 0.5, 0], 0.025, FIT); b.beam([0, y0 + L - 0.2, 0], [0.32, y0 + L - 0.45, 0], 0.025, FIT); }
    b.pop();
  }

  // ======================================================================== 1. PYLON
  const PH = y => y <= 24 ? 4.5 - 3 * y / 24 : 1.5 - 0.28 * (y - 24) / 16;     // leg half-width at height y
  const ARMS = [[36, 5.6], [31, 7.2], [26, 6.3]];                               // [y, reach] top to bottom
  const ARM_H = 2.4, STR = 3.0, EW = [42.05, 4.0];
  const PYLON_ATTACH = [];
  for (const s of [-1, 1]) for (const [y, R] of ARMS) PYLON_ATTACH.push([0, +(y - STR).toFixed(2), s * R]);
  PYLON_ATTACH.push([0, +(EW[0] - 0.45).toFixed(2), -EW[1]], [0, +(EW[0] - 0.45).toFixed(2), EW[1]]);

  function footings(b, detail) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const a = [sx * PH(-3.2), -3.2, sz * PH(-3.2)], t = [sx * PH(0.9), 0.9, sz * PH(0.9)];
      if (detail) {
        b.box(a[0], -2.9, a[2], 2.6, 0.6, 2.6, sh(CONC, 0.95));
        b.beam(a, t, 1.1, CONC);
        b.beam([t[0], 0.88, t[2]], [t[0], 0.98, t[2]], 0.7, sh(CONC, 1.08));   // chamfered cap
        b.box(t[0], 0.99, t[2], 0.5, 0.03, 0.5, GALV_D);                       // leg cleat plate
        for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.cyl([t[0] + u * 0.18, 0.98, t[2] + w * 0.18], [t[0] + u * 0.18, 1.06, t[2] + w * 0.18], 0.025, 0.025, 5, FIT, false);
      } else b.beam(a, t, 1.1, CONC);
    }
  }

  function buildPylon(detail) {
    const b = new MB(), r = rnd(4242);
    if (!detail) return pylonLow(b);
    footings(b, 1);
    const ys = [0.9, 4.6, 8.6, 12.6, 16.4, 20.2, 24, 26, 28.4, 31, 33.4, 36, 38.4, 40];
    const lv = ys.map(y => [y, PH(y)]);
    // legs below the panels (inside the footing chimneys)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) angle(b, [sx * PH(-3), -3, sz * PH(-3)], [sx * PH(0.9), 0.9, sz * PH(0.9)], 0.2, [-sx, 0, 0], [0, 0, -sz], GALV);
    latticeBody(b, 0, 0, lv, {
      leg: y => y < 12 ? 0.2 : y < 24 ? 0.18 : 0.15, hor: 0.13, diag: 0.1, plates: true,
      horBar: y => y > 12 && ![24, 26, 31, 36, 40].includes(y), redund: i => i < 2, plan: y => [20.2, 24, 26, 31, 36, 40].includes(y), kBrace: i => i === 13
    }, r);
    // crossarms (trussed) and insulator strings
    for (const s of [-1, 1]) for (const [ya, R] of ARMS) {
      const h0 = PH(ya), h1 = PH(ya + ARM_H);
      armTruss(b, [[-h0, ya, s * h0], [h0, ya, s * h0]], [[-h1, ya + ARM_H, s * h1], [h1, ya + ARM_H, s * h1]],
        [[-0.22, ya, s * R], [0.22, ya, s * R]], [0, ya + 0.4, s * R], R > 6.5 ? 6 : 5, { chord: 0.14, web: 0.075 }, r);
      b.box(0, ya - 0.04, s * (R - 0.02), 0.2, 0.08, 0.2, FIT);       // hanger bracket
      discString(b, [0, ya - 0.06, s * R], [0, ya - STR, s * R], { horns: true, pitch: 0.178 });
    }
    // shield-wire peaks
    for (const s of [-1, 1]) {
      const hB = PH(38.4), hT = PH(40), tip = EW[0];
      armTruss(b, [[-hB, 38.4, s * hB], [hB, 38.4, s * hB]], [[-hT, 40, s * hT], [hT, 40, s * hT]],
        [[-0.12, tip - 0.35, s * EW[1]], [0.12, tip - 0.35, s * EW[1]]], [0, tip, s * EW[1]], 3, { chord: 0.12, web: 0.07 }, r);
      b.box(0, tip - 0.4, s * EW[1], 0.1, 0.1, 0.1, FIT);   // earthwire suspension clamp
      b.cyl([0, tip - 0.4, s * EW[1]], [0, tip - 0.45, s * EW[1]], 0.04, 0.04, 6, FIT);
    }
    b.box(0, 40.03, 0, 2 * PH(40) + 0.1, 0.06, 2 * PH(40) + 0.1, sh(GALV, 1.04));   // peak cap plate
    // step bolts on the +X+Z leg, above the anti-climb guard
    for (let k = 0, y = 3.9; y < 39.5; k++, y += 0.45) {
      const h = PH(y);
      if (k % 2) b.cyl([h - 0.1, y, h], [h - 0.1, y, h + 0.22], 0.018, 0.018, 3, FIT, false);
      else b.cyl([h, y, h - 0.1], [h + 0.22, y, h - 0.1], 0.018, 0.018, 3, FIT, false);
    }
    // anti-climb guard: a ring of angles at 3.4 m with outward-down spikes and a barbed strand
    const ya = 3.4, ha = PH(ya), faces = [[[0, 0, 1], [-1, 1], [1, 1]], [[0, 0, -1], [1, -1], [-1, -1]], [[1, 0, 0], [1, 1], [1, -1]], [[-1, 0, 0], [-1, -1], [-1, 1]]];
    for (const [n, A, B] of faces) {
      const p0 = [A[0] * ha, ya, A[1] * ha], p1 = [B[0] * ha, ya, B[1] * ha];
      angle(b, p0, p1, 0.1, n, [0, 1, 0], GALV_D);
      const L = len(sub(p1, p0)), N = Math.round(L / 0.3), wire = [];
      for (let k = 0; k <= N; k++) {
        const p = lerp(p0, p1, k / N), q = add(add(p, scale(n, 0.38)), [0, -0.22, 0]);
        if (k > 0 && k < N) { strip(b, p, q, 0.03, [0, 1, 0], GALV_D); strip(b, p, q, 0.03, n, GALV_D); }
        wire.push(add(q, [0, 0.02, 0]));
      }
      b.tube(wire, 0.012, 3, sh(GALV_D, 0.8));
      if (n[2] === 1) b.box(0.3, ya + 0.25, ha + 0.04, 0.6, 0.5, 0.03, sh(GALV_D, 0.9));   // locked climbing gate plate
    }
    // warning sign on the +Z face at the panel crossing
    const sy = 2.75, sz = PH(sy) + 0.07;
    b.box(0, sy, sz, 0.52, 0.64, 0.025, WHITE);
    b.box(0, sy + 0.27, sz + 0.016, 0.52, 0.1, 0.01, RED); b.box(0, sy - 0.29, sz + 0.016, 0.52, 0.06, 0.01, RED);
    b.plate([0.06, sy + 0.17, sz + 0.016], [-0.09, sy - 0.02, sz + 0.016], [0.0, sy - 0.02, sz + 0.016], [0.12, sy + 0.17, sz + 0.016], BLACK);   // lightning bolt
    b.plate([0.05, sy - 0.0, sz + 0.016], [-0.06, sy - 0.21, sz + 0.016], [-0.02, sy - 0.21, sz + 0.016], [0.1, sy - 0.0, sz + 0.016], BLACK);
    b.box(0, sy, sz - 0.02, 0.06, 0.6, 0.02, GALV_D);
    // number plate on the +X face
    b.box(PH(5.2) + 0.05, 5.2, 0, 0.025, 0.3, 0.42, YEL);
    for (const [dz, wz] of [[-0.09, 0.05], [0.05, 0.05], [0.11, 0.05]]) b.box(PH(5.2) + 0.066, 5.2, dz, 0.01, 0.2, wz, BLACK);
    return b;
  }

  function pylonLow(b) {
    footings(b, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.beam([sx * PH(0.9), 0.9, sz * PH(0.9)], [sx * PH(24), 24, sz * PH(24)], 0.22, GALV); b.beam([sx * PH(24), 24, sz * PH(24)], [sx * PH(40), 40, sz * PH(40)], 0.2, GALV); }
    const P = (y, sx, sz) => [sx * PH(y), y, sz * PH(y)];
    for (const y of [8.6, 16.4, 24, 31, 40]) for (const [a, c] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) b.beam(P(y, ...a), P(y, ...c), 0.14, GALV_D);
    for (const [y0, y1] of [[0.9, 8.6], [8.6, 16.4], [16.4, 24]]) for (const s of [-1, 1]) { b.beam(P(y0, -1, s), P(y1, 1, s), 0.12, GALV_D); b.beam(P(y0, s, 1), P(y1, s, -1), 0.12, GALV_D); }
    for (const s of [-1, 1]) {
      for (const [ya, R] of ARMS) {
        const h = PH(ya);
        b.beam([0, ya, s * h], [0, ya, s * R], 0.3, GALV, 0.5 * h);
        b.beam([0, ya + ARM_H, s * PH(ya + ARM_H)], [0, ya + 0.4, s * R], 0.16, GALV);
        b.cyl([0, ya, s * R], [0, ya - STR, s * R], 0.12, 0.12, 4, PORC, false);
      }
      b.beam([0, 39.2, s * PH(39)], [0, EW[0], s * EW[1]], 0.2, GALV);
    }
    return b;
  }

  // ======================================================================== 3. GANTRY (powerhouse roof take-off)
  const G_PH = [-5, 0, 5], G_Y = 12.8;
  const GANTRY_ATTACH = G_PH.map(z => gantryString(z)[1].map(v => +v.toFixed(2)));
  function gantryString(z) { return [[0.35, G_Y - 0.05, z], [0.35 + 2.9 * Math.sin(0.5), G_Y - 0.05 - 2.9 * Math.cos(0.5), z]]; }
  function buildGantry(detail) {
    const b = new MB(), r = rnd(77);
    if (!detail) {
      for (const s of [-1, 1]) { b.beam([0, 0, s * 8], [0, 14, s * 8], 0.9, GALV, 0.9); b.box(0, 0.05, s * 8, 1.6, 0.1, 1.6, GALV_D); }
      b.beam([0, G_Y + 0.6, -8.4], [0, G_Y + 0.6, 8.4], 1.3, GALV, 1.0);
      for (const z of G_PH) { const [a, c] = gantryString(z); b.cyl(a, c, 0.12, 0.12, 4, PORC, false); }
      return b;
    }
    for (const s of [-1, 1]) {
      const lv = [[0.1, 0.7], [4.3, 0.58], [8.5, 0.48], [G_Y, 0.42], [14, 0.42]];
      latticeBody(b, 0, s * 8, lv, { leg: () => 0.13, hor: 0.1, diag: 0.07, plates: false, bottomHor: true, horBar: y => y < 12, plan: y => y === G_Y }, r);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // base plates and anchor bolts
        const x = sx * 0.7, z = s * 8 + sz * 0.7;
        b.box(x, 0.03, z, 0.5, 0.06, 0.5, GALV_D);
        for (const [u, w] of [[-1, -1], [1, 1]]) b.cyl([x + u * 0.17, 0.05, z + w * 0.17], [x + u * 0.17, 0.16, z + w * 0.17], 0.022, 0.022, 4, FIT, false);
        b.beam([x, 0.06, z], [x - sx * 0.15, 0.4, z - sz * 0.15], 0.06, GALV, 0.3);
      }
      b.cyl([0, 14, s * 8], [0, 15.2, s * 8], 0.06, 0.02, 6, GALV);   // lightning spike
    }
    boxTruss(b, [0, G_Y, -8.42], [0, G_Y, 8.42], [1, 0, 0], 0.84, 1.2, 7, { chord: 0.12, web: 0.065 }, r);
    for (const z of G_PH) {
      const [a, c] = gantryString(z);
      b.box(0.36, G_Y + 0.05, z, 0.12, 0.25, 0.3, FIT);   // dead-end bracket on beam face
      discString(b, a, c, { horns: true, segs: 7, pitch: 0.2 });
    }
    // sign
    b.box(0, 2.2, -8 + 0.72, 0.5, 0.6, 0.02, WHITE); b.box(0, 2.45, -8 + 0.735, 0.5, 0.1, 0.01, RED);
    return b;
  }

  // ======================================================================== 2. SUBSTATION
  const ALU = [0.7, 0.72, 0.74, 0.3], WIRE = [0.42, 0.42, 0.4, 0.3], TPAINT = [0.55, 0.6, 0.62, 0.2], GRAVEL = [0.53, 0.48, 0.42, 0];
  const POLY = [0.5, 0.52, 0.5, 0.15], BLOCK = [0.76, 0.69, 0.57, 0], MORTAR = [0.55, 0.52, 0.47, 0];
  const LP = [-5, 0, 5], BUSX = [0, 1.6, 3.2], BUS_Y = 6.65;
  const SG_X = 14, SG_Y = 12.15, TR = [[-10, -6.3], [-10, 6.3]], TB_DZ = [-1.5, 0, 1.5];
  const SUB_ATTACH = LP.map(z => [17.6, +(SG_Y - 0.15).toFixed(2), z]);

  // vertical ribbed porcelain / polymer insulator with metal end flanges, from y0 up H. Returns top y.
  function ribIns(b, x, y0, z, H, rc, rs, n, segs, col, endCol) {
    const F = endCol || FIT, p = [[rc + 0.05, y0, F], [rc + 0.05, y0 + 0.08, F], [rc, y0 + 0.08, col]];
    const pitch = (H - 0.16) / n;
    for (let i = 0; i < n; i++) {
      const yb = y0 + 0.08 + (i + 0.55) * pitch, r = i % 2 ? rs * 0.82 : rs, c = sh(col, 0.94 + 0.1 * (i % 3) / 2);
      p.push([r, yb, c], [r, yb + 0.022, c], [rc, yb + 0.32 * pitch, col]);
    }
    p.push([rc, y0 + H - 0.08, F], [rc + 0.05, y0 + H - 0.08, F], [rc + 0.05, y0 + H, F], [rc * 0.5, y0 + H + 0.02, F]);
    b.push(tr(x, 0, z)); b.lathe(p, segs, col); b.pop();
    return y0 + H;
  }
  // sagging conductor through key points
  function wire(b, pts, r) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1], L = len(sub(c, a)), N = Math.max(2, Math.round(L / 0.8));
      for (let k = i ? 1 : 0; k <= N; k++) { const t = k / N, q = lerp(a, c, t); q[1] -= Math.sin(Math.PI * t) * L * 0.035; out.push(q); }
    }
    b.tube(out, r || 0.022, 4, WIRE);
  }
  // wide-flange (H) steel member from a to p; web plane contains 'webDir'
  function hbeam(b, a, p, d, wf, webDir, col) {
    const f = norm(sub(p, a)), wd = perp(webDir, f), fl = cross(f, wd), L = len(sub(p, a)), m = lerp(a, p, 0.5);
    obox(b, m, wd, f, fl, d - 0.03, L, 0.012, col);
    obox(b, add(m, scale(wd, d / 2 - 0.008)), wd, f, fl, 0.016, L, wf, col);
    obox(b, add(m, scale(wd, -d / 2 + 0.008)), wd, f, fl, 0.016, L, wf, col);
  }
  function pedestal(b, x, z, H, r) {
    b.box(x, 0.03, z, 0.6, 0.06, 0.6, GALV_D);
    b.cyl([x, 0.06, z], [x, H, z], r, r * 0.85, 10, GALV, false);
    b.box(x, H, z, 0.42, 0.04, 0.42, GALV_D);
    for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.cyl([x + u * 0.22, 0.06, z + w * 0.22], [x + u * 0.22, 0.14, z + w * 0.22], 0.02, 0.02, 4, FIT, false);
  }
  function concPad(b, x, z, sx, sz, h) { b.box(x, h / 2 - 0.4, z, sx, h + 0.8, sz, sh(CONC, 0.98)); }

  // pixel-font sign text
  const FONT = { D: ['110', '101', '101', '101', '110'], A: ['010', '101', '111', '101', '101'], N: ['1001', '1101', '1011', '1001', '1001'], G: ['011', '100', '101', '101', '011'], E: ['111', '100', '110', '100', '111'], R: ['110', '101', '110', '101', '101'] };
  function dangerSign() {   // local: centred on origin, face towards +Z, 0.74 x 0.52
    const s = new MB();
    s.box(0, 0, 0, 0.74, 0.52, 0.02, YEL);
    const px = 0.026, word = 'DANGER', z = 0.0115; let wpx = 0; for (const ch of word) wpx += FONT[ch][0].length + 1; wpx -= 1;
    s.box(0, 0.165, z - 0.001, 0.7, 0.17, 0.002, BLACK);
    let cx = -wpx * px / 2;
    for (const ch of word) {
      const g = FONT[ch];
      g.forEach((row, ry) => { let i = 0; while (i < row.length) { if (row[i] === '1') { let j = i; while (j < row.length && row[j] === '1') j++; const x0 = cx + i * px, x1 = cx + j * px, y1 = 0.23 - ry * px, y0 = y1 - px; s.plate([x0, y0, z + 0.001], [x1, y0, z + 0.001], [x1, y1, z + 0.001], [x0, y1, z + 0.001], YEL); i = j; } else i++; } });
      cx += (g[0].length + 1) * px;
    }
    s.plate([0.04, 0.05, z], [-0.1, -0.08, z], [0.0, -0.08, z], [0.09, 0.05, z], BLACK);       // lightning bolt
    s.plate([0.03, -0.06, z], [-0.08, -0.21, z], [-0.03, -0.21, z], [0.08, -0.06, z], BLACK);
    s.plate([-0.34, -0.17, z], [-0.16, -0.17, z], [-0.16, -0.14, z], [-0.34, -0.14, z], BLACK);
    s.plate([0.14, -0.17, z], [0.34, -0.17, z], [0.34, -0.14, z], [0.14, -0.14, z], BLACK);
    s.plate([-0.36, -0.245, z], [0.36, -0.245, z], [0.36, -0.225, z], [-0.36, -0.225, z], BLACK);
    return s;
  }
  function placeSign(b, sign, x, y, z, a) { b.push(mulAll(tr(x, y, z), rotY(a))); b.merge(sign); b.pop(); }

  // chain-link mesh between ground points A and B (on fence line) from y0 to y1, plus outward normal n
  function chainLink(b, A, B, y0, y1, n, col) {
    const u = norm(sub(B, A)), L = len(sub(B, A)), H = y1 - y0, sp = 0.32, P = (s, t) => [A[0] + u[0] * s, y0 + t, A[2] + u[2] * s];
    for (const dir of [1, -1]) for (let c = -H; c < L; c += sp) {
      // line: s = c + t (dir 1) or s = c + H - t (dir -1), clipped to 0..L
      let t0 = 0, t1 = H; if (dir > 0) { t0 = Math.max(0, -c); t1 = Math.min(H, L - c); } else { t0 = Math.max(0, c + H - L); t1 = Math.min(H, c + H); }
      if (t1 - t0 < 0.05) continue;
      const sOf = t => dir > 0 ? c + t : c + H - t;
      strip(b, P(sOf(t0), t0), P(sOf(t1), t1), 0.022, n, col);
    }
  }

  function fence(b, sign, r) {
    const FX = 17.8, FZ = 11.8, PCOL = [0.5, 0.52, 0.53, 0.2], MESH = [0.4, 0.42, 0.43, 0.2];
    const sides = [[[-FX, -FZ], [FX, -FZ], [0, 0, -1]], [[FX, -FZ], [FX, FZ], [1, 0, 0]], [[FX, FZ], [-FX, FZ], [0, 0, 1]], [[-FX, FZ], [-FX, -FZ], [-1, 0, 0]]];
    const GATE = [-5.5, -9.5];   // on the -X side, z from -5.5 to -9.5 (walking order)
    for (const [A2, B2, n] of sides) {
      const A = [A2[0], 0, A2[1]], B = [B2[0], 0, B2[1]], u = norm(sub(B, A)), L = len(sub(B, A));
      const gateSide = n[0] === -1;
      // on the -X side walking from z=+FZ to -FZ: s = FZ - z, so the gate (z -5.5..-9.5) is s 17.3..21.3
      const segs2 = gateSide ? [[0, FZ - GATE[0]], [FZ - GATE[1], L]] : [[0, L]];
      for (const [s0, s1] of segs2) {
        const N = Math.max(1, Math.round((s1 - s0) / 3));
        for (let k = 0; k <= N; k++) {
          const s = s0 + (s1 - s0) * k / N, p = add(A, scale(u, s)), corner = (s === 0 || s === L), gp = gateSide && (k === 0 && s0 > 0 || k === N && s1 < L), rr = corner || gp ? 0.055 : 0.038;
          if (s !== L) {
            b.cyl([p[0], -0.4, p[2]], [p[0], 2.1, p[2]], rr, rr, 8, sh(PCOL, 0.95 + 0.1 * r()), false);
            b.sphere(p[0], 2.1, p[2], rr * 1.15, 6, PCOL);
            b.cyl([p[0], -0.05, p[2]], [p[0], 0.05, p[2]], 0.13, 0.11, 8, CONC);
            const arm = add(add(p, scale(n, 0.32)), [0, 2.4, 0]);
            b.beam([p[0], 2.08, p[2]], arm, 0.035, PCOL);
          }
          if (corner || gp) { const q = add(p, scale(u, (s === 0 || (gp && k === N) ? 1 : -1) * (gp && k === N ? -1.8 : 1.8))); b.cyl([p[0], 1.9, p[2]], [q[0], 0.15, q[2]], 0.025, 0.025, 5, PCOL, false); }
        }
        const a = add(A, scale(u, s0)), c = add(A, scale(u, s1));
        b.cyl([a[0], 2.05, a[2]], [c[0], 2.05, c[2]], 0.025, 0.025, 6, PCOL, false);   // top rail
        b.cyl([a[0], 0.06, a[2]], [c[0], 0.06, c[2]], 0.008, 0.008, 3, MESH, false);   // bottom tension wire
        for (const t of [0.33, 0.66, 1]) { const o = add(scale(n, 0.32 * t), [0, 2.08 + 0.32 * t, 0]); b.cyl(add(a, o), add(c, o), 0.008, 0.008, 3, MESH, false); }
        chainLink(b, a, c, 0.06, 2.03, n, MESH);
      }
      // signs on the outside face of each side (and two each on the long sides)
      const nS = Math.abs(n[2]) ? 2 : 1, ang = n[0] === 1 ? Math.PI / 2 : n[0] === -1 ? -Math.PI / 2 : n[2] === 1 ? 0 : Math.PI;
      for (let k = 0; k < nS; k++) {
        const s = gateSide ? FZ + 3.6 : L * (k + 1) / (nS + 1) + 1.5, p = add(A, scale(u, s));
        placeSign(b, sign, p[0] + n[0] * 0.06, 1.55, p[2] + n[2] * 0.06, ang);
      }
    }
    // double gate on the -X side, z -9.5..-5.5, closed
    for (const [z0, z1] of [[-5.55, -7.48], [-7.52, -9.45]]) {
      const x = -FX - 0.02, f = [[x, 0.12, z0], [x, 0.12, z1], [x, 2.0, z1], [x, 2.0, z0]];
      for (let i = 0; i < 4; i++) b.cyl(f[i], f[(i + 1) % 4], 0.025, 0.025, 6, PCOL, false);
      b.cyl([x, 1.06, z0], [x, 1.06, z1], 0.02, 0.02, 5, PCOL, false);
      b.cyl([x, 0.12, z0], [x, 2.0, z1], 0.018, 0.018, 5, PCOL, false);
      chainLink(b, [x, 0, z0], [x, 0, z1], 0.14, 1.98, [-1, 0, 0], MESH);
    }
    b.box(-FX - 0.05, 1.0, -7.5, 0.05, 0.2, 0.12, [0.25, 0.25, 0.27, 0.3]);   // padlock & chain
    b.cyl([-FX - 0.05, 0.0, -7.5], [-FX - 0.05, 0.6, -7.5], 0.012, 0.012, 4, PCOL, false);   // drop rod
    placeSign(b, sign, -FX - 0.06, 1.45, -6.5, -Math.PI / 2);
  }

  function gravelSlab(b, r, detail) {
    const X = 18.5, Z = 12.5;
    for (const [p, q] of [[[-X, -Z], [X, -Z]], [[X, -Z], [X, Z]], [[X, Z], [-X, Z]], [[-X, Z], [-X, -Z]]]) b.plate([p[0], -2.5, p[1]], [q[0], -2.5, q[1]], [q[0], 0, q[1]], [p[0], 0, p[1]], sh(GRAVEL, 0.85));
    if (!detail) { b.plate([-X, 0, -Z], [X, 0, -Z], [X, 0, Z], [-X, 0, Z], GRAVEL); return; }
    const NX = 20, NZ = 14;
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
      const x0 = -X + 2 * X * i / NX, x1 = -X + 2 * X * (i + 1) / NX, z0 = -Z + 2 * Z * j / NZ, z1 = -Z + 2 * Z * (j + 1) / NZ, k = 0.9 + 0.17 * r(), w = 0.97 + 0.06 * r();
      b.plate([x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [GRAVEL[0] * k * w, GRAVEL[1] * k, GRAVEL[2] * k / w, 0]);
    }
    // a scatter of larger stones
    for (let i = 0; i < 120; i++) { const x = -X + 2 * X * r(), z = -Z + 2 * Z * r(), s = 0.08 + 0.12 * r(); b.box(x, s * 0.25, z, s, s * 0.5, s * (0.6 + 0.6 * r()), sh(GRAVEL, 0.75 + 0.35 * r())); }
  }

  function trench(b, x0, z0, x1, z1, r) {   // covered concrete cable trench, axis-aligned
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), N = Math.round(L / 1.0), W = 0.75;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    b.box(cx, -0.2, cz, alongX ? L : W, 0.42, alongX ? W : L, sh(CONC, 0.8));
    for (let k = 0; k < N; k++) {
      const t = (k + 0.5) / N, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, l = L / N - 0.03;
      b.box(x, 0.065, z, alongX ? l : W - 0.08, 0.05, alongX ? W - 0.08 : l, sh([0.42, 0.41, 0.39, 1], 0.9 + 0.15 * r()));
    }
  }

  function transformer(b, cx, cz, r) {
    const s = Math.sign(cz) || 1;
    // containment curb with dark rock, concrete plinth, skid
    for (const [x, z, sx, sz] of [[cx, cz - 3.2, 7.0, 0.2], [cx, cz + 3.2, 7.0, 0.2], [cx - 3.4, cz, 0.2, 6.6], [cx + 3.4, cz, 0.2, 6.6]]) b.box(x, 0.0, z, sx, 0.7, sz, CONC);
    b.plate([cx - 3.3, 0.02, cz - 3.1], [cx + 3.3, 0.02, cz - 3.1], [cx + 3.3, 0.02, cz + 3.1], [cx - 3.3, 0.02, cz + 3.1], [0.38, 0.35, 0.32, 0]);
    b.box(cx, 0.15, cz, 4.6, 0.3, 3.0, sh(CONC, 1.04));
    for (const dz of [-1, 1]) b.box(cx, 0.38, cz + dz * 0.9, 4.3, 0.16, 0.2, GALV_D);
    // tank with stiffener ribs and bolted cover
    const T0 = 0.46, T1 = 3.45, HX = 2.0, HZ = 1.3;
    b.box(cx, (T0 + T1) / 2, cz, 2 * HX, T1 - T0, 2 * HZ, TPAINT);
    b.box(cx, T1 + 0.04, cz, 2 * HX + 0.12, 0.08, 2 * HZ + 0.12, sh(TPAINT, 1.06));
    b.box(cx, T1 + 0.14, cz, 2 * HX - 0.2, 0.12, 2 * HZ - 0.2, sh(TPAINT, 0.98));
    for (let i = 0; i < 7; i++) { const x = cx - HX + 0.3 + i * (2 * HX - 0.6) / 6; for (const d of [-1, 1]) b.box(x, (T0 + T1) / 2, cz + d * (HZ + 0.04), 0.1, T1 - T0, 0.08, sh(TPAINT, 0.92)); }
    for (let i = 0; i < 4; i++) { const z = cz - HZ + 0.3 + i * (2 * HZ - 0.6) / 3; for (const d of [-1, 1]) b.box(cx + d * (HX + 0.04), (T0 + T1) / 2, z, 0.08, T1 - T0, 0.1, sh(TPAINT, 0.92)); }
    for (const d of [-1, 1]) for (const e of [-1, 1]) b.box(cx + d * (HX - 0.15), T1 + 0.25, cz + e * (HZ + 0.02), 0.2, 0.25, 0.05, sh(TPAINT, 0.9));   // lifting lugs
    // radiator banks on both Z faces
    for (const d of [-1, 1]) {
      const z0 = cz + d * (HZ + 0.12);
      for (const hy of [3.05, 0.85]) b.cyl([cx - 1.65, hy, z0 + d * 0.05], [cx + 1.65, hy, z0 + d * 0.05], 0.09, 0.09, 8, sh(TPAINT, 0.9));
      for (let i = 0; i < 15; i++) {
        const x = cx - 1.6 + i * 3.2 / 14, k = 0.9 + 0.06 * (i % 2);
        b.box(x, 1.95, z0 + d * 0.38, 0.035, 2.3, 0.62, sh(TPAINT, k));
      }
      for (const fx of [-0.85, 0.85]) {   // fans on the outer face of the bank
        const c = [cx + fx, 1.6, z0 + d * 0.75], c2 = [c[0], c[1], c[2] + d * 0.28];
        b.cyl(c, c2, 0.42, 0.42, 14, sh(GALV, 0.9), false);
        b.cyl(c, add(c, [0, 0, d * 0.12]), 0.08, 0.08, 8, BLACK);
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4, e1 = [Math.cos(a), Math.sin(a), 0], e2 = [Math.cos(a + 0.5), Math.sin(a + 0.5), 0]; b.plate(add(c, add(scale(e1, 0.08), [0, 0, d * 0.06])), add(c, add(scale(e1, 0.38), [0, 0, d * 0.03])), add(c, add(scale(e2, 0.38), [0, 0, d * 0.09])), add(c, add(scale(e2, 0.08), [0, 0, d * 0.08])), [0.2, 0.21, 0.22, 0.2]); }
        for (const g of [-0.25, 0, 0.25]) { b.beam([c2[0] + g, c2[1] - 0.38, c2[2]], [c2[0] + g, c2[1] + 0.38, c2[2]], 0.02, GALV_D); b.beam([c2[0] - 0.38, c2[1] + g, c2[2]], [c2[0] + 0.38, c2[1] + g, c2[2]], 0.02, GALV_D); }
        b.beam([c[0], c[1] - 0.42, c[2] + d * 0.1], [c[0], 0.85, c[2] - d * 0.2], 0.05, GALV_D);
      }
    }
    // conservator tank on a stand, Buchholz pipe
    const cvy = 5.0, cvx0 = cx - 1.9, cvx1 = cx + 0.4, cvz = cz - s * 0.85;
    b.push(mulAll(tr((cvx0 + cvx1) / 2, cvy, cvz), K.rotZ(Math.PI / 2)));
    b.lathe([[0, -1.35], [0.3, -1.3], [0.45, -1.15], [0.45, 1.15], [0.3, 1.3], [0, 1.35]], 14, sh(TPAINT, 1.03));
    for (const y of [-0.8, 0.8]) b.cyl([0, y - 0.03, 0], [0, y + 0.03, 0], 0.47, 0.47, 14, sh(TPAINT, 0.92), false);
    b.pop();
    for (const x of [cvx0 + 0.5, cvx1 - 0.5]) { b.beam([x, T1 + 0.2, cvz - 0.3], [x, cvy - 0.4, cvz], 0.08, GALV_D); b.beam([x, T1 + 0.2, cvz + 0.3], [x, cvy - 0.4, cvz], 0.08, GALV_D); b.box(x, cvy - 0.42, cvz, 0.12, 0.06, 0.7, GALV_D); }
    b.tube([[cvx1 - 0.3, cvy - 0.4, cvz], [cvx1 - 0.3, 4.2, cvz], [cvx1 + 0.2, 3.95, cvz], [cvx1 + 0.4, T1 + 0.2, cvz]], 0.05, 6, sh(TPAINT, 0.9));
    b.box(cvx1 - 0.08, 4.1, cvz, 0.22, 0.2, 0.18, [0.7, 0.68, 0.6, 0.2]);
    b.cyl([cvx0 - 0.15, cvy, cvz], [cvx0 - 0.22, cvy, cvz], 0.12, 0.12, 10, WHITE);   // level gauge
    // HV bushings (+X edge) and LV bushings (-X edge)
    TB_DZ.forEach((dz, i) => {
      const x = cx + HX - 0.45, z = cz + dz * 0.6;
      b.cyl([x, T1 + 0.08, z], [x, T1 + 0.5, z], 0.24, 0.22, 10, sh(TPAINT, 0.95));
      const top = ribIns(b, x, T1 + 0.5, z, 2.2, 0.11, 0.21, 12, 10, PORC);
      b.cyl([x, top, z], [x, top + 0.18, z], 0.06, 0.06, 6, ALU); b.box(x, top + 0.22, z, 0.12, 0.08, 0.04, ALU);
      void i;
    });
    for (let i = 0; i < 4; i++) {
      const x = cx - HX + 0.45, z = cz + (i - 1.5) * 0.55;
      b.cyl([x, T1 + 0.08, z], [x, T1 + 0.3, z], 0.14, 0.13, 8, sh(TPAINT, 0.95));
      const top = ribIns(b, x, T1 + 0.3, z, 0.75, 0.07, 0.13, 4, 8, PORC);
      b.box(x, top + 0.06, z, 0.08, 0.12, 0.05, [0.7, 0.45, 0.3, 0.4]);
    }
    b.box(cx - HX + 0.45, T1 + 1.25, cz, 0.15, 0.08, 1.9, [0.7, 0.45, 0.3, 0.4]);   // LV copper bus bar
    for (let i = 0; i < 4; i++) b.cyl([cx - HX + 0.45, T1 + 1.25, cz + (i - 1.5) * 0.55], [cx - HX + 0.45, T1 + 1.17, cz + (i - 1.5) * 0.55], 0.03, 0.03, 4, [0.7, 0.45, 0.3, 0.4], false);
    // control cabinet, tap changer, ladder, pressure relief, nameplate
    const ex = cx - HX - 0.3;
    b.box(ex, 1.6, cz + s * 0.5, 0.5, 1.5, 1.0, sh(TPAINT, 1.05));
    b.box(ex - 0.26, 1.6, cz + s * 0.5, 0.02, 1.35, 0.9, sh(TPAINT, 0.9)); b.box(ex - 0.28, 1.6, cz + s * 0.85, 0.03, 0.15, 0.03, BLACK);
    b.box(cx + 0.6, 2.4, cz - s * (HZ + 0.4), 1.1, 1.4, 0.55, sh(TPAINT, 1.02));
    b.cyl([cx + 0.6, 1.0, cz - s * (HZ + 0.2)], [cx + 0.6, 1.7, cz - s * (HZ + 0.2)], 0.06, 0.06, 6, GALV_D);
    for (const dz of [-0.22, 0.22]) b.beam([ex - 0.1, 0.5, cz - s * 0.6 + dz], [ex - 0.1, T1 + 0.1, cz - s * 0.6 + dz], 0.04, GALV);
    for (let y = 0.8; y < T1; y += 0.32) b.beam([ex - 0.1, y, cz - s * 0.6 - 0.22], [ex - 0.1, y, cz - s * 0.6 + 0.22], 0.03, GALV);
    b.cyl([cx - 0.8, T1 + 0.2, cz + s * 0.6], [cx - 0.8, T1 + 0.45, cz + s * 0.6], 0.12, 0.1, 8, sh(TPAINT, 0.85));
    b.box(cx + HX + 0.09, 2.2, cz, 0.02, 0.4, 0.6, [0.75, 0.72, 0.62, 0.3]);
    for (let i = 0; i < 4; i++) b.box(cx + HX + 0.1, 2.32 - i * 0.08, cz, 0.01, 0.025, 0.45, BLACK);
    b.box(cx + HX + 0.09, 1.4, cz, 0.02, 0.5, 0.7, YEL); b.box(cx + HX + 0.1, 1.55, cz, 0.01, 0.12, 0.6, BLACK);
    b.tube([[cx + HX, 0.5, cz + 1.0], [cx + HX + 0.3, 0.2, cz + 1.0], [cx + HX + 0.8, 0.03, cz + 1.0]], 0.015, 4, [0.6, 0.38, 0.25, 0.4]);   // ground strap
  }

  function breakerPole(b, x, z) {   // live-tank SF6 breaker pole; returns [mid pad, top pad]
    pedestal(b, x, z, 2.4, 0.14);
    const t1 = ribIns(b, x, 2.42, z, 1.5, 0.12, 0.22, 7, 10, PORC);
    b.cyl([x, t1, z], [x, t1 + 0.4, z], 0.21, 0.21, 10, ALU);
    b.box(x + 0.25, t1 + 0.2, z, 0.25, 0.1, 0.14, ALU); b.box(x - 0.25, t1 + 0.2, z, 0.25, 0.1, 0.14, ALU);
    const t2 = ribIns(b, x, t1 + 0.4, z, 1.1, 0.13, 0.22, 5, 10, PORC);
    b.cyl([x, t2, z], [x, t2 + 0.22, z], 0.2, 0.17, 10, ALU);
    b.box(x - 0.24, t2 + 0.1, z, 0.25, 0.08, 0.14, ALU); b.box(x + 0.24, t2 + 0.1, z, 0.25, 0.08, 0.14, ALU);
    return [[x + 0.37, t1 + 0.2, z], [x - 0.36, t2 + 0.1, z]];
  }
  function breakerCabinet(b, x, z, pz0, pz1) {
    b.box(x + 0.45, 1.3, z, 0.6, 1.5, 0.9, [0.62, 0.64, 0.62, 0.2]);
    b.box(x + 0.76, 1.3, z, 0.02, 1.35, 0.78, [0.55, 0.57, 0.55, 0.2]); b.box(x + 0.78, 1.35, z + 0.3, 0.03, 0.15, 0.03, BLACK);
    b.box(x + 0.45, 0.28, z, 0.5, 0.56, 0.7, GALV_D);
    b.cyl([x + 0.18, 2.1, pz0], [x + 0.18, 2.1, pz1], 0.05, 0.05, 6, GALV_D);   // interpole linkage tube
  }
  function arrester(b, x, z) {
    pedestal(b, x, z, 2.6, 0.12);
    const t = ribIns(b, x, 2.62, z, 1.7, 0.1, 0.17, 10, 8, POLY, ALU);
    const ring = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI * 2; ring.push([x + 0.32 * Math.cos(a), t - 0.15, z + 0.32 * Math.sin(a)]); }
    b.tube(ring, 0.025, 4, ALU);
    for (let k = 0; k < 3; k++) { const a = k * 2.094; b.beam([x, t - 0.1, z], [x + 0.32 * Math.cos(a), t - 0.15, z + 0.32 * Math.sin(a)], 0.02, ALU); }
    b.box(x + 0.2, 1.4, z, 0.14, 0.22, 0.14, [0.7, 0.7, 0.66, 0.2]);   // surge counter
    b.tube([[x, 2.62, z + 0.1], [x + 0.17, 2.2, z + 0.1], [x + 0.17, 1.5, z]], 0.01, 3, [0.6, 0.38, 0.25, 0.4]);
    b.tube([[x + 0.17, 1.3, z], [x + 0.17, 0.4, z], [x + 0.4, 0.02, z]], 0.01, 3, [0.6, 0.38, 0.25, 0.4]);
    b.box(x, t + 0.05, z, 0.14, 0.08, 0.1, ALU);
    return [x, t + 0.06, z];
  }
  function disconnects(b, xc) {   // 3-phase centre-break switch on a 4-column stand
    const H = 2.8, xs = [xc - 0.8, xc + 0.8];
    for (const x of xs) for (const z of [-7.2, 7.2]) { b.box(x, 0.03, z, 0.5, 0.06, 0.5, GALV_D); hbeam(b, [x, 0.06, z], [x, H, z], 0.25, 0.25, [1, 0, 0], GALV); }
    for (const x of xs) hbeam(b, [x, H + 0.13, -7.4], [x, H + 0.13, 7.4], 0.25, 0.2, [0, 1, 0], GALV);
    const ends = [];
    for (const z of LP) {
      b.box(xc, H + 0.3, z, 1.9, 0.08, 0.25, GALV_D);
      const tops = xs.map(x => ribIns(b, x, H + 0.34, z, 1.35, 0.09, 0.17, 7, 8, PORC));
      for (const [i, x] of xs.entries()) { b.box(x, tops[i] + 0.05, z, 0.22, 0.1, 0.16, ALU); }
      b.cyl([xs[0], tops[0] + 0.14, z], [xc + 0.05, tops[0] + 0.14, z], 0.04, 0.04, 6, ALU);      // blades meeting in the centre
      b.cyl([xc - 0.05, tops[0] + 0.14, z], [xs[1], tops[1] + 0.14, z], 0.04, 0.04, 6, ALU);
      b.box(xc, tops[0] + 0.14, z, 0.16, 0.1, 0.12, ALU);
      ends.push([[xs[1] + 0.12, tops[1] + 0.06, z], [xs[0] - 0.12, tops[0] + 0.06, z]]);
    }
    b.cyl([xs[0], H + 0.38, -7.2], [xs[0], H + 0.38, 7.2], 0.03, 0.03, 5, GALV_D);   // interphase rod
    b.cyl([xs[0] - 0.1, H + 0.3, -7.2], [xs[0] - 0.1, 1.2, -7.2], 0.03, 0.03, 5, GALV_D);   // operating rod
    b.box(xs[0] - 0.1, 1.1, -7.0, 0.3, 0.35, 0.22, [0.6, 0.62, 0.6, 0.2]); b.beam([xs[0] - 0.25, 1.1, -7.0], [xs[0] - 0.5, 1.2, -7.0], 0.04, YEL);
    return ends;
  }
  function busPortal(b, z) {
    const x0 = -0.9, x1 = 4.1, H = 5.0;
    for (const x of [x0, x1]) { b.box(x, 0.03, z, 0.5, 0.06, 0.5, GALV_D); concPad(b, x, z, 0.7, 0.7, 0.12); hbeam(b, [x, 0.12, z], [x, H + 0.3, z], 0.3, 0.25, [0, 0, 1], GALV); b.beam([x, H - 0.9, z], [x + Math.sign(1.6 - x) * 0.8, H + 0.05, z], 0.1, GALV); }
    hbeam(b, [x0 - 0.2, H + 0.15, z], [x1 + 0.2, H + 0.15, z], 0.3, 0.22, [0, 1, 0], GALV);
    for (const x of BUSX) { b.box(x, H + 0.32, z, 0.4, 0.04, 0.4, GALV_D); const t = ribIns(b, x, H + 0.34, z, 1.15, 0.09, 0.17, 6, 8, PORC); b.box(x, t + 0.06, z, 0.16, 0.12, 0.2, ALU); }
  }
  function floodlight(b, x, z) {
    concPad(b, x, z, 0.6, 0.6, 0.25);
    b.cyl([x, 0.25, z], [x, 9.5, z], 0.11, 0.06, 8, GALV, false);
    const dx = -Math.sign(x) * 0.5, dz = -Math.sign(z) * 0.5;
    b.beam([x, 9.35, z], [x + dx, 9.5, z + dz], 0.06, GALV);
    b.beam([x, 9.35, z], [x + dz, 9.5, z - dx], 0.06, GALV);
    for (const [ox, oz] of [[dx, dz], [dz, -dx]]) {
      b.push(mulAll(tr(x + ox * 1.1, 9.45, z + oz * 1.1), rotY(Math.atan2(ox, oz)), K.rotX(0.6)));
      b.box(0, 0, 0, 0.45, 0.4, 0.15, [0.3, 0.31, 0.32, 0.2]); b.box(0, 0, 0.08, 0.4, 0.34, 0.02, [0.85, 0.85, 0.75, 0.5]);
      b.pop();
    }
    b.box(x + 0.13 * Math.sign(-x), 1.4, z, 0.12, 0.3, 0.15, GALV_D);
  }
  function hut(b, r, detail) {
    const x0 = -17.3, x1 = -13.7, z0 = -3, z1 = 3, H = 3.0;
    b.box((x0 + x1) / 2, H / 2 - 0.4, 0, x1 - x0, H + 0.8, z1 - z0, MORTAR);
    b.box((x0 + x1) / 2, H + 0.12, 0, x1 - x0 + 0.3, 0.24, z1 - z0 + 0.3, sh(CONC, 1.02));
    b.box((x0 + x1) / 2, H + 0.28, 0, x1 - x0 + 0.3, 0.08, z1 - z0 + 0.3, [0.5, 0.48, 0.45, 0]);
    if (!detail) return;
    const door = [-1.7, -0.7];   // z range on +X face
    const walls = [[[x1, z0], [x1, z1], [1, 0, 0]], [[x1, z1], [x0, z1], [0, 0, 1]], [[x0, z1], [x0, z0], [-1, 0, 0]], [[x0, z0], [x1, z0], [0, 0, -1]]];
    for (const [A, B, n] of walls) {
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), u = [(B[0] - A[0]) / L, 0, (B[1] - A[1]) / L];
      for (let c = 0; c < 15; c++) {
        const y0 = c * 0.2, off = c % 2 ? 0.2 : 0;
        for (let s = -off; s < L; s += 0.4) {
          const s0 = Math.max(0, s) + 0.006, s1 = Math.min(L, s + 0.4) - 0.006; if (s1 - s0 < 0.05) continue;
          const z0w = A[1] + u[2] * s0, z1w = A[1] + u[2] * s1, x0w = A[0] + u[0] * s0, x1w = A[0] + u[0] * s1;
          if (n[0] === 1) { const zz0 = Math.min(z0w, z1w), zz1 = Math.max(z0w, z1w); if (y0 < 2.2 && zz1 > door[0] - 0.1 && zz0 < door[1] + 0.1) continue; if (y0 > 1.7 && y0 < 2.3 && zz1 > 0.6 && zz0 < 1.6) continue; }
          const k = 0.9 + 0.15 * r(), col = [BLOCK[0] * k, BLOCK[1] * k, BLOCK[2] * k * (0.97 + 0.06 * r()), 0], o = 0.012;
          b.plate([x0w + n[0] * o, y0 + 0.006, z0w + n[2] * o], [x1w + n[0] * o, y0 + 0.006, z1w + n[2] * o], [x1w + n[0] * o, y0 + 0.194, z1w + n[2] * o], [x0w + n[0] * o, y0 + 0.194, z0w + n[2] * o], col);
        }
      }
    }
    // steel door with frame, handle, step; louvre vent; AC unit; light; conduit run into the trench
    const dz = (door[0] + door[1]) / 2;
    b.box(x1 + 0.03, 1.05, dz, 0.06, 2.1, 1.0, [0.28, 0.4, 0.42, 0.2]);
    for (const zz of [door[0] - 0.04, door[1] + 0.04]) b.box(x1 + 0.04, 1.1, zz, 0.08, 2.2, 0.08, [0.22, 0.24, 0.25, 0.2]);
    b.box(x1 + 0.04, 2.18, dz, 0.08, 0.08, 1.16, [0.22, 0.24, 0.25, 0.2]);
    b.box(x1 + 0.09, 1.05, door[1] - 0.12, 0.05, 0.04, 0.14, ALU);
    b.box(x1 + 0.065, 1.55, dz, 0.01, 0.3, 0.45, YEL); b.box(x1 + 0.07, 1.62, dz, 0.01, 0.07, 0.4, BLACK);
    b.box(x1 + 0.45, 0.06, dz, 0.9, 0.12, 1.4, sh(CONC, 1.05));
    b.box(x1 + 0.02, 2.0, 1.1, 0.04, 0.5, 0.9, [0.45, 0.46, 0.45, 0.2]);
    for (let i = 0; i < 5; i++) b.box(x1 + 0.06, 1.8 + i * 0.09, 1.1, 0.04, 0.025, 0.84, [0.3, 0.31, 0.3, 0.2]);
    b.box(x1 + 0.12, 2.55, dz, 0.2, 0.15, 0.3, [0.3, 0.3, 0.3, 0.2]); b.box(x1 + 0.2, 2.5, dz, 0.04, 0.06, 0.24, [0.95, 0.92, 0.75, 0.5]);
    b.box(-15.5, 1.6, z1 + 0.35, 1.0, 0.75, 0.6, [0.82, 0.8, 0.74, 0.1]);
    b.cyl([-15.5, 1.6, z1 + 0.66], [-15.5, 1.6, z1 + 0.68], 0.25, 0.25, 12, [0.25, 0.25, 0.25, 0.1]);
    for (const xx of [-15.9, -15.1]) b.beam([xx, 1.22, z1], [xx, 1.22, z1 + 0.65], 0.04, GALV_D);
    for (let i = 0; i < 3; i++) b.tube([[x1, 0.5 + i * 0.12, 1.3 + i * 0.12], [x1 + 0.35, 0.5 + i * 0.12, 1.3 + i * 0.12], [x1 + 0.55, 0.15, 1.3 + i * 0.12], [x1 + 0.6, -0.2, 1.3 + i * 0.12]], 0.05, 6, [0.55, 0.56, 0.58, 0.2]);
    b.tube([[x1 + 0.03, H + 0.05, 2.6], [x1 + 0.03, 0.3, 2.6], [x1 + 0.4, 0.05, 2.6]], 0.04, 6, [0.55, 0.56, 0.58, 0.2]);   // roof drain / riser
    b.box(x1 + 0.08, 0.2, 2.6, 0.1, 0.1, 0.1, [0.5, 0.5, 0.5, 0.2]);
  }

  const SIGN = (() => dangerSign())();
  function buildSubstation(detail) {
    const b = new MB(), r = rnd(9001);
    gravelSlab(b, r, detail);
    if (!detail) return substationLow(b);
    fence(b, SIGN, r);
    // cable trenches
    trench(b, -13.0, -1.5, 12.5, -1.5, r); trench(b, -13.0, -1.1, -13.0, 1.9, r); trench(b, -5.9, -8.2, -5.9, -1.9, r); trench(b, -5.9, -1.1, -5.9, 8.2, r); trench(b, 7.2, -6, 7.2, -1.9, r); trench(b, 7.2, -1.1, 7.2, 6, r);
    hut(b, r, 1);
    for (const [x, z] of TR) transformer(b, x, z, r);
    // incoming dead-end gantry at +X
    for (const s of [-1, 1]) {
      const lv = [[0.12, 0.75], [4.2, 0.63], [8.0, 0.52], [SG_Y - 0.6, 0.46], [SG_Y + 0.6, 0.46]];
      concPad(b, SG_X, s * 8, 2.1, 2.1, 0.12);
      latticeBody(b, SG_X, s * 8, lv, { leg: () => 0.13, hor: 0.1, diag: 0.07, plates: false, bottomHor: true, horBar: y => y < 9, plan: y => y > 11 }, r);
      b.cyl([SG_X, SG_Y + 0.6, s * 8], [SG_X, SG_Y + 2.4, s * 8], 0.07, 0.02, 6, GALV);
    }
    boxTruss(b, [SG_X, SG_Y - 0.6, -8.46], [SG_X, SG_Y - 0.6, 8.46], [1, 0, 0], 0.92, 1.2, 10, { chord: 0.12, web: 0.065 }, r);
    const arr = LP.map(z => arrester(b, 12, z));
    const dis = disconnects(b, 9);
    const lineBr = LP.map(z => breakerPole(b, 6, z));
    breakerCabinet(b, 6, -2.5, -5, 5);
    for (const z of [-8.5, -2.75, 2.75, 8.5]) busPortal(b, z);
    for (const x of BUSX) { b.cyl([x, BUS_Y + 0.06, -9.1], [x, BUS_Y + 0.06, 9.1], 0.06, 0.06, 8, ALU, false); for (const e of [-9.1, 9.1]) b.sphere(x, BUS_Y + 0.06, e, 0.1, 8, ALU); }
    LP.forEach((z, i) => {
      b.box(SG_X + 0.48, SG_Y, z, 0.1, 0.3, 0.3, FIT);
      discString(b, [SG_X + 0.5, SG_Y, z], [17.6, SG_Y - 0.15, z], { horns: true, segs: 7, pitch: 0.19 });
      wire(b, [[17.6, SG_Y - 0.15, z], [16.8, 10.2, z], [13.8, 6.4, z], arr[i]], 0.025);
      wire(b, [arr[i], dis[i][0]]);
      wire(b, [dis[i][1], lineBr[i][0]]);
      const bx = BUSX[i]; wire(b, [lineBr[i][1], [4.6, 7.3, z], [bx + 0.5, 7.45, z], [bx, BUS_Y + 0.12, z]]);
    });
    // transformer bays: breaker, then to the HV bushings
    for (const [tx, tz] of TR) {
      const pls = TB_DZ.map(dz => breakerPole(b, -4, tz + dz));
      breakerCabinet(b, -4, tz - Math.sign(tz) * 2.2, tz - Math.sign(tz) * 2.2, tz + Math.sign(tz) * 1.5);
      TB_DZ.forEach((dz, i) => {
        const z = tz + dz, bush = [tx + 2.0 - 0.45, 3.45 + 0.5 + 2.2 + 0.24, tz + dz * 0.6];
        wire(b, [[pls[i][0][0] - 0.74, pls[i][0][1], z], [-6.2, 6.6, z], bush]);
        const bx = BUSX[i]; wire(b, [[pls[i][1][0] + 0.72, pls[i][1][1], z], [-2.4, 7.35, z], [bx - 0.5, 7.45, z], [bx, BUS_Y + 0.12, z]]);
      });
    }
    for (const [x, z] of [[16.6, 10.6], [16.6, -10.6], [-16.6, 10.6], [-12.2, -10.6]]) floodlight(b, x, z);
    return b;
  }
  function substationLow(b) {
    const FX = 17.8, FZ = 11.8;
    b.box(-15.5, 1.5, 0, 3.6, 3.0, 6, MORTAR); b.box(-15.5, 3.15, 0, 3.9, 0.3, 6.3, CONC);
    for (const [x, z] of TR) { b.box(x, 1.9, z, 4.0, 3.0, 2.6, TPAINT); b.box(x, 1.95, z, 3.3, 2.3, 4.0, sh(TPAINT, 0.9)); b.cyl([x - 1.9, 5.0, z - Math.sign(z) * 0.85], [x + 0.4, 5.0, z - Math.sign(z) * 0.85], 0.45, 0.45, 6, TPAINT); for (const dz of TB_DZ) b.cyl([x + 1.55, 3.5, z + dz * 0.6], [x + 1.55, 6.1, z + dz * 0.6], 0.18, 0.18, 4, PORC, false); }
    for (const s of [-1, 1]) b.beam([SG_X, 0, s * 8], [SG_X, SG_Y + 2.4, s * 8], 1.1, GALV, 1.1);
    b.beam([SG_X, SG_Y, -8.5], [SG_X, SG_Y, 8.5], 1.2, GALV, 0.9);
    for (const z of LP) b.cyl([SG_X + 0.5, SG_Y, z], [17.6, SG_Y - 0.15, z], 0.12, 0.12, 4, PORC, false);
    for (const z of [-8.5, -2.75, 2.75, 8.5]) { for (const x of [-0.9, 4.1]) b.beam([x, 0, z], [x, 5.3, z], 0.3, GALV); b.beam([-1.1, 5.15, z], [4.3, 5.15, z], 0.3, GALV); }
    for (const x of BUSX) b.beam([x, BUS_Y, -9.1], [x, BUS_Y, 9.1], 0.14, ALU);
    for (const [x, zs, h] of [[12, LP, 4.3], [9.8, LP, 4.4], [8.2, LP, 4.4], [6, LP, 5.6], [-4, [-7.8, -6.3, -4.8, 4.8, 6.3, 7.8], 5.6]]) for (const z of zs) { b.cyl([x, 0, z], [x, h * 0.45, z], 0.14, 0.14, 4, GALV, false); b.cyl([x, h * 0.45, z], [x, h, z], 0.18, 0.18, 4, PORC, false); }
    b.box(9, 2.9, 0, 1.9, 0.25, 14.8, GALV);
    const P = [[-FX, -FZ], [FX, -FZ], [FX, FZ], [-FX, FZ]];
    for (let i = 0; i < 4; i++) {
      const a = P[i], c = P[(i + 1) % 4], L = Math.hypot(c[0] - a[0], c[1] - a[1]), N = Math.round(L / 6);
      for (let k = 0; k < N; k++) { const t = k / N; b.box(a[0] + (c[0] - a[0]) * t, 1.2, a[1] + (c[1] - a[1]) * t, 0.1, 2.4, 0.1, GALV); }
      b.beam([a[0], 2.1, a[1]], [c[0], 2.1, c[1]], 0.08, GALV);
      b.plate([a[0], 0.05, a[1]], [c[0], 0.05, c[1]], [c[0], 2.05, c[1]], [a[0], 2.05, a[1]], [0.45, 0.47, 0.48, 0.2]);
    }
    for (const [x, z] of [[16.6, 10.6], [16.6, -10.6], [-16.6, 10.6], [-12.2, -10.6]]) b.beam([x, 0, z], [x, 9.6, z], 0.18, GALV);
    return b;
  }

  return {
    name: 'power',
    items: [
      { name: 'pylon', budget: 14000, build: buildPylon, attach: PYLON_ATTACH,
        colliders: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ({ type: 'cyl', x: sx * PH(0.9), z: sz * PH(0.9), r: 0.8, top: 1.0, solid: true })) },
      { name: 'substation', budget: 60000, build: buildSubstation, attach: SUB_ATTACH,
        colliders: [
          { type: 'box', x: -10, z: -6.3, hx: 2.05, hz: 2.15, rot: 0, top: 3.6, solid: true },
          { type: 'box', x: -10, z: 6.3, hx: 2.05, hz: 2.15, rot: 0, top: 3.6, solid: true },
          { type: 'box', x: -15.5, z: 0, hx: 1.95, hz: 3.15, rot: 0, top: 3.32, solid: true },
          { type: 'box', x: 0, z: -11.8, hx: 17.85, hz: 0.06, rot: 0, top: 2.4, solid: true },
          { type: 'box', x: 0, z: 11.8, hx: 17.85, hz: 0.06, rot: 0, top: 2.4, solid: true },
          { type: 'box', x: -17.8, z: 0, hx: 0.06, hz: 11.85, rot: 0, top: 2.4, solid: true },
          { type: 'box', x: 17.8, z: 0, hx: 0.06, hz: 11.85, rot: 0, top: 2.4, solid: true }
        ] },
      { name: 'gantry', budget: 5000, build: buildGantry, attach: GANTRY_ATTACH, colliders: [] }
    ]
  };
}) };
