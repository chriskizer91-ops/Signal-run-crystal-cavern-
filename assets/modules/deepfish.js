window.MODDEF = { fn: (function (K) {
  // Deep-lake fish for the flooded cavern.
  // Local frame: length along +x (head at +x, tail at -x), y = back (dorsal), z = sideways; origin at the body's middle; metres.
  // The game bends the mesh sideways (z) with a head-to-tail wave, so every part (body, fins, eyes, teeth) is built on
  // evenly spaced rings along x. Fin tips may be swept back in x, but each fin stays part of the lofted body surface.
  // Colour: rgb = colour, a = glow (body 0, faint side-line photophores 0.3-0.6, eye discs 0.9).
  // attach: [eyeL, eyeR] = eye centres, 1 cm proud of the domed disc. Fish's left is -z (head +x, back +y).
  const { MB, rnd, norm, sub, add, scale, cross, dot } = K;
  const PI = Math.PI, D = PI / 180;
  const cl = v => Math.max(0, Math.min(1, v));
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const G = (c, a) => [cl(c[0]), cl(c[1]), cl(c[2]), a];
  const sstep = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const bump = (a, m, b, x) => x <= a || x >= b ? 0 : (x < m ? sstep(a, m, x) : 1 - sstep(m, b, x));

  // ---------- palette (pale, sickly, faintly blue deep-cave flesh) ----------
  const BELLY = [0.86, 0.85, 0.86], SIDE = [0.74, 0.78, 0.83], BACK = [0.36, 0.40, 0.47], BLOT = [0.52, 0.55, 0.60];
  const FIN = [0.64, 0.74, 0.84], FINEDGE = [0.80, 0.90, 0.98], GILL = [0.62, 0.52, 0.56], LIP = [0.20, 0.17, 0.20];
  const SPOT = [0.55, 0.95, 1.00], TOOTH = [0.93, 0.91, 0.82], EYE = [0.86, 1.00, 0.94], EYERIM = [0.48, 0.92, 0.86];

  // ---------- the cross-section ----------
  // prof(t) returns { x, cy, h (top half-height), hb (bottom half-height), w (half-width), p (squareness exponent),
  //   dH, dSw (dorsal fin tip height / sweep back), vH, vSw (ventral), pS, pSw, pDr (pectoral span / sweep / droop), fb (fin root half-thickness) }
  // A ring is described by a list of slots: 'T' dorsal tip, 'B' ventral tip, 'P' pectoral tip, or a body angle in degrees (90 top .. -90 bottom).
  function bodyPt(P, deg, s) {
    const ph = deg * D, c = Math.cos(ph), sn = Math.sin(ph);
    let z = s * P.w * Math.pow(Math.abs(c), P.p), y = P.cy + (sn >= 0 ? P.h : P.hb) * Math.sign(sn) * Math.pow(Math.abs(sn), P.p);
    if (Math.abs(deg) >= 89.9) z = s * P.fb;                                 // fin root
    if (P.pS > 0 && Math.abs(deg) < 12) z = s * Math.max(Math.abs(z), P.w * 0.97);  // pectoral root stays on the widest line
    return [P.x, y, z];
  }
  function slotPt(P, slot, s) {
    if (slot === 'T') return [P.x - P.dSw, P.cy + P.h + P.dH, 0];
    if (slot === 'B') return [P.x - P.vSw, P.cy - P.hb - P.vH, 0];
    if (slot === 'P') return [P.x - P.pSw, P.cy - P.pDr, s * (P.w + P.pS)];
    return bodyPt(P, slot, s);
  }
  // the full ring: dorsal tip, right side top->bottom, ventral tip, left side bottom->top
  function ringSlots(side) {
    const out = [{ slot: 'T', s: 0 }];
    for (const a of side) out.push({ slot: a, s: 1 });
    out.push({ slot: 'B', s: 0 });
    for (let i = side.length - 1; i >= 0; i--) out.push({ slot: side[i], s: -1 });
    return out;
  }

  // loft rings (tail -> head) into one surface with smooth normals, closed at the head by a pole
  function loft(b, rings, cols, centres, pole, poleCol) {
    const R = rings.length, M = rings[0].length, ids = [];
    for (let i = 0; i < R; i++) {
      const row = [];
      for (let k = 0; k < M; k++) {
        const p = rings[i][k], a = sub(rings[i][(k + 1) % M], rings[i][(k + M - 1) % M]);
        const nxt = i + 1 < R ? rings[i + 1][k] : pole, prv = rings[Math.max(i - 1, 0)][k];
        let n = cross(a, sub(nxt, prv)); if (Math.hypot(n[0], n[1], n[2]) < 1e-12) n = [0, 1, 0];
        const out = sub(p, centres[i]); if (dot(n, out) < 0) n = scale(n, -1);
        row.push(b.v(p[0], p[1], p[2], n[0], n[1], n[2], cols[i][k]));
      }
      ids.push(row);
    }
    for (let i = 0; i < R - 1; i++) for (let k = 0; k < M; k++) { const k1 = (k + 1) % M; b.quad(ids[i][k], ids[i + 1][k], ids[i + 1][k1], ids[i][k1]); }
    const pc = b.v(pole[0], pole[1], pole[2], 1, 0, 0, poleCol), L = ids[R - 1];
    for (let k = 0; k < M; k++) b.tri(L[k], pc, L[(k + 1) % M]);
  }

  // analytic surface point + outward normal on the smooth body (used for eyes and teeth so both details agree)
  function surfFrame(prof, t, deg, s) {
    const P = prof(t), p = bodyPt(P, deg, s), e = 0.002;
    const pa = bodyPt(prof(t), deg + 1, s), pb = bodyPt(prof(t), deg - 1, s), pf = bodyPt(prof(t + e), deg, s), pk = bodyPt(prof(t - e), deg, s);
    let n = norm(cross(sub(pa, pb), sub(pf, pk))); if (dot(n, sub(p, [p[0], P.cy, 0])) < 0) n = scale(n, -1);
    return { p, n };
  }
  // domed glowing eye disc on the surface; returns the attach point (centre, 1 cm proud)
  function eye(b, prof, t, deg, s, r, fwd, segs, hi) {
    const f = surfFrame(prof, t, deg, s), n = norm(add(f.n, [fwd, 0, 0]));
    const u = norm(cross(n, Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), v = cross(n, u);
    const dome = r * 0.32, sink = r * 0.22, at = (rr, a, lift) => add(add(f.p, scale(n, lift)), add(scale(u, Math.cos(a) * rr), scale(v, Math.sin(a) * rr)));
    const top = add(f.p, scale(n, dome)), cTop = G(EYE, 0.9), cMid = G(mix(EYE, EYERIM, 0.4), 0.9), cRim = G(EYERIM, 0.9);
    const ci = b.v(top[0], top[1], top[2], n[0], n[1], n[2], cTop), outer = [], inner = [];
    for (let k = 0; k < segs; k++) {
      const a = k / segs * PI * 2, rn = norm(add(scale(n, 0.6), add(scale(u, Math.cos(a)), scale(v, Math.sin(a)))));
      const po = at(r, a, -sink); outer.push(b.v(po[0], po[1], po[2], rn[0], rn[1], rn[2], cRim));
      if (hi) { const pi = at(r * 0.62, a, dome * 0.72), ni = norm(add(n, scale(sub(pi, top), 1.5))); inner.push(b.v(pi[0], pi[1], pi[2], ni[0], ni[1], ni[2], cMid)); }
    }
    for (let k = 0; k < segs; k++) {
      const k1 = (k + 1) % segs;
      if (hi) { b.tri(ci, inner[k], inner[k1]); b.quad(inner[k], outer[k], outer[k1], inner[k1]); }
      else b.tri(ci, outer[k], outer[k1]);
    }
    return add(top, scale(n, 0.01)).map(q => +q.toFixed(3));
  }
  // needle tooth: one thin triangle standing off the lip line; dir = +1 points down (upper jaw), -1 points up
  function tooth(b, prof, t, deg, s, len, dir) {
    const f = surfFrame(prof, t, deg, s), w = 0.0055, c = G(TOOTH, 0);
    const base = add(f.p, scale(f.n, 0.004)), tip = add(add(base, [0.006, -dir * len, 0]), scale(f.n, len * 0.35));
    const a = add(base, [w, 0, 0]), c2 = add(base, [-w, 0, 0]), n = f.n;
    b.tri(b.v(a[0], a[1], a[2], n[0], n[1], n[2], c), b.v(tip[0], tip[1], tip[2], n[0], n[1], n[2], c), b.v(c2[0], c2[1], c2[2], n[0], n[1], n[2], c));
  }
  // smooth deterministic mottling, 0..1
  function mottler(seed) {
    const r = rnd(seed), ph = [], fr = [];
    for (let i = 0; i < 4; i++) { ph.push(r() * PI * 2); fr.push([3 + r() * 9, 1.5 + r() * 3]); }
    return (x, ang, s) => { let v = 0; for (let i = 0; i < 4; i++) v += Math.sin(fr[i][0] * x + fr[i][1] * ang * (i % 2 ? s : 1) + ph[i] + s * 1.7) / (i + 1.4); return cl(0.5 + 0.45 * v); };
  }
  // body skin colour from angle (deg), position along t, mottle
  function skin(deg, mot, t) {
    const up = Math.sin(deg * D);
    let c = up >= 0 ? mix(SIDE, BACK, Math.pow(up, 1.4) * (0.75 + 0.25 * t)) : mix(SIDE, BELLY, Math.pow(-up, 0.7));
    c = mix(c, BLOT, sstep(0.62, 0.95, mot) * (0.35 + 0.35 * Math.max(0, up)));
    return c;
  }

  // =====================================================================
  // lurker: ~2.6 m eel-like ambush hunter
  const LUR_L = 2.6, LUR_X0 = -1.30, LUR_HEAD = 0.76;
  function lurkerProf(t) {
    t = Math.max(0, Math.min(1, t));
    let e;
    if (t >= LUR_HEAD) e = Math.sqrt(Math.max(0, 1 - Math.pow((t - LUR_HEAD) / 0.265, 2)));
    else { const s = t / LUR_HEAD; e = 0.04 + 0.96 * Math.pow(s * s * (3 - 2 * s), 0.85); }
    const head = sstep(0.62, 0.95, t), tail = 1 - sstep(0.05, 0.55, t);
    const R = 0.185;
    const w = R * e * (0.92 + 0.36 * head - 0.38 * tail), h = R * e * (1.0 - 0.24 * head), hb = R * e * (1.05 + 0.08 * bump(0.45, 0.68, 0.9, t) - 0.25 * head);
    // continuous ribbon fins: dorsal from behind the head, ventral from the vent, both run into a pointed leaf tail
    const frill = 1 + 0.10 * Math.sin(t * 46);
    const dH = (0.072 * sstep(0.80, 0.60, t) + 0.035 * (1 - sstep(0.0, 0.25, t))) * frill;
    const vH = (0.062 * sstep(0.62, 0.48, t) + 0.035 * (1 - sstep(0.0, 0.25, t))) * frill;
    return { x: LUR_X0 + LUR_L * t, cy: -0.01 * head, h, hb, w, p: 0.9 - 0.1 * head, dH, dSw: dH * 0.45 + 0.03 * (1 - t), vH, vSw: vH * 0.45 + 0.03 * (1 - t), pS: 0, pSw: 0, pDr: 0, fb: Math.min(0.011, 0.35 * w + 0.002) };
  }
  function buildLurker(detail) {
    const b = new MB(), hi = detail > 0, mot = mottler(77);
    const NR = hi ? 29 : 10;
    const side = hi ? [90, 70, 48, 27, 8, -12, -32, -54, -74, -90] : [72, 22, -22, -70];
    const MOUTH = hi ? -12 : -22, LAT = hi ? 8 : 22;
    const slots = ringSlots(side), rings = [], cols = [], cent = [];
    for (let i = 0; i < NR; i++) {
      const t = i / (NR - 1), P = lurkerProf(t), ring = [], col = [];
      for (const sl of slots) {
        const p = slotPt(P, sl.slot, sl.s || 1); ring.push(p);
        let c;
        if (sl.slot === 'T' || sl.slot === 'B') {
          const fH = sl.slot === 'T' ? P.dH : P.vH;
          c = fH > 0.008 ? G(mix(FIN, FINEDGE, 0.5 + 0.5 * Math.sin(t * 46)), 0.1) : G(skin(sl.slot === 'T' ? 90 : -90, mot(P.x, 0, 1), t), 0);
        } else {
          const deg = sl.slot; c = skin(deg, mot(P.x, deg * D, sl.s), t);
          // gill slit shading behind the head, darker mouth line on the head
          if (t > 0.74 && t < 0.80 && deg > -40 && deg < 30) c = mix(c, GILL, 0.35);
          let a = 0;
          if (deg === MOUTH && t > 0.86) c = LIP;
          // side-line photophores: a row of faint cyan dots, plus a lower row toward the tail
          const dot3 = hi ? (i % 3) === 1 : (i % 2) === 1;
          if (hi && deg === LAT && dot3 && t > 0.08 && t < 0.80) { c = mix(c, SPOT, 0.45); a = 0.3 + 0.12 * sstep(0.1, 0.7, t); }
          c = G(c, a);
        }
        col.push(c);
      }
      rings.push(ring); cols.push(col); cent.push([P.x, P.cy, 0]);
    }
    const Ph = lurkerProf(1); loft(b, rings, cols, cent, [Ph.x + 0.035, Ph.cy - 0.012, 0], G(mix(SIDE, BACK, 0.25), 0));
    // big forward-set eyes high on the broad head
    const eL = eye(b, lurkerProf, 0.93, 40, -1, 0.056, 0.6, hi ? 9 : 6, hi), eR = eye(b, lurkerProf, 0.93, 40, 1, 0.056, 0.6, hi ? 9 : 6, hi);
    // a hint of needle teeth along the wide mouth line
    if (hi) for (const s of [-1, 1]) {
      const T = [0.995, 0.982, 0.968, 0.952, 0.935, 0.915, 0.895];
      T.forEach((t, k) => tooth(b, lurkerProf, t, MOUTH + (k % 2 ? -3 : 3), s, (k % 2 ? 0.022 : 0.032) * (1 - 0.35 * k / 6), k % 2 ? -1 : 1));
    }
    b.attach = [eL, eR];
    return b;
  }

  // =====================================================================
  // darter: ~1.6 m torpedo-shaped fast hunter
  const DAR_X0 = -0.62, DAR_L = 1.42;
  function darterProf(t) {
    t = Math.max(0, Math.min(1, t));
    let e;
    if (t >= 0.58) e = Math.pow(Math.cos((t - 0.58) / 0.44 * PI / 2), 0.75);
    else { const s = t / 0.58; e = 0.15 + 0.85 * Math.pow(sstep(0.08, 1, s), 0.75); }
    const w = 0.095 * e, h = 0.135 * e, hb = 0.125 * e;
    // tall swept dorsal sail, small anal fin, and the two lobes of the forked tail (tips swept back past the last ring)
    const sail = 0.17 * bump(0.40, 0.60, 0.67, t), anal = 0.06 * bump(0.22, 0.32, 0.40, t), caud = 0.31 * Math.pow(1 - sstep(0.0, 0.17, t), 1.3);
    const keel = 0.012 * bump(0.12, 0.25, 0.40, t);
    const dH = sail + caud + keel, vH = anal + caud + keel;
    const dSw = sail * 0.85 + caud * 0.72, vSw = anal * 0.8 + caud * 0.72;
    // long swept pectorals: tip runs out and back from the shoulder, drooping a little
    const pS = 0.39 * bump(0.47, 0.63, 0.75, t);
    return { x: DAR_X0 + DAR_L * t, cy: 0, h, hb, w, p: 1, dH, dSw, vH, vSw, pS, pSw: pS * 0.9, pDr: pS * 0.28, fb: Math.min(0.009, 0.3 * w + 0.002) };
  }
  function buildDarter(detail) {
    const b = new MB(), hi = detail > 0, mot = mottler(91);
    const NR = hi ? 20 : 9;
    const side = hi ? [90, 58, 28, 6, 'P', -6, -30, -60, -90] : [42, 'P', -42];
    const LAT = hi ? 28 : 42, MOUTH = hi ? -30 : -42;
    const slots = ringSlots(side), rings = [], cols = [], cent = [];
    for (let i = 0; i < NR; i++) {
      const t = i / (NR - 1), P = darterProf(t), ring = [], col = [];
      for (const sl of slots) {
        const p = slotPt(P, sl.slot, sl.s || 1); ring.push(p);
        let c;
        if (sl.slot === 'T' || sl.slot === 'B' || sl.slot === 'P') {
          const fH = sl.slot === 'T' ? P.dH : sl.slot === 'B' ? P.vH : P.pS;
          c = fH > 0.015 ? G(mix(FIN, FINEDGE, sl.slot === 'P' ? 0.7 : 0.4), 0.1) : G(skin(sl.slot === 'T' ? 90 : sl.slot === 'B' ? -90 : 0, mot(P.x, 0, 1), t), 0);
        } else {
          const deg = sl.slot; c = skin(deg, mot(P.x * 1.4, deg * D, sl.s), t);
          if (t > 0.70 && t < 0.78 && deg > -50 && deg < 40) c = mix(c, GILL, 0.3);
          let a = 0;
          if (deg === MOUTH && t > 0.90) c = LIP;
          if (deg === LAT && (i % 2) === 0 && t > 0.15 && t < 0.72) { c = mix(c, SPOT, 0.45); a = 0.35; }
          c = G(c, a);
        }
        col.push(c);
      }
      rings.push(ring); cols.push(col); cent.push([P.x, P.cy, 0]);
    }
    const Ph = darterProf(1); loft(b, rings, cols, cent, [Ph.x + 0.03, -0.004, 0], G(mix(SIDE, BACK, 0.3), 0));
    // very large eyes set well forward on the narrowing head
    const eL = eye(b, darterProf, 0.86, 16, -1, 0.05, 0.35, hi ? 10 : 6, hi), eR = eye(b, darterProf, 0.86, 16, 1, 0.05, 0.35, hi ? 10 : 6, hi);
    if (hi) for (const s of [-1, 1]) [0.975, 0.955, 0.935].forEach((t, k) => tooth(b, darterProf, t, MOUTH + 4, s, 0.016 - 0.003 * k, 1));
    b.attach = [eL, eR];
    return b;
  }

  // attach points are the same at both details (eyes sit on the analytic body surface)
  const LUR_ATTACH = buildLurker(1).attach, DAR_ATTACH = buildDarter(1).attach;
  return {
    name: 'deepfish',
    items: [
      { name: 'lurker', budget: 1400, build: buildLurker, colliders: [], attach: LUR_ATTACH },
      { name: 'darter', budget: 900, build: buildDarter, colliders: [], attach: DAR_ATTACH },
    ],
  };
}) };
