window.MODDEF = { fn: (function (K) {
  // The ancient site (Signal Run, beyond the giant crystal cavern). Halls cut millions of years ago by a non-human people:
  // near-black, glass-smooth stone in perfect geometry, with thin glowing channels, rings and rows of small glyphs inlaid.
  // Colour convention (all items except 'entity'): rgb = base colour (stone [0.055, 0.055, 0.065], accents up to 0.12-0.14),
  // a = glow (0 plain stone, 1 glowing channel / glyph / ring, 0.5 faint secondary channel). Inlays are flat strips a few
  // millimetres proud of the surface so they read crisply.
  // 'entity' (the builder's hologram) uses r = rim emphasis, g = inner structure, b = glyph markings, a = density.
  // Facing: every item's "front" is +z (pillar channel, tablet face, entity faces +z). portal_ring: axis +z, the bold
  // inlays are on the -z face (the face seen from the cavern when the tunnel runs away along +z).
  'use strict';
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd, cross, dot, norm, sub, add, scale, lerp } = K;
  const PI = Math.PI, TAU = PI * 2;
  const cl01 = x => Math.max(0, Math.min(1, x));

  // ---------- palette ----------
  const STONE = [0.055, 0.055, 0.065, 0], EDGE = [0.08, 0.08, 0.094, 0], ACC = [0.12, 0.12, 0.14, 0];
  const GLOW = [0.10, 0.10, 0.118, 1], FAINT = [0.08, 0.08, 0.095, 0.5], CLEAR = [0.12, 0.12, 0.14, 0.5];

  // ---------- low-level helpers ----------
  // flat quad facing 'want' (winding fixed to match)
  function fq(b, P, c, want) {
    let n = norm(cross(sub(P[1], P[0]), sub(P[3], P[0])));
    if (dot(n, want) < 0) { P = [P[0], P[3], P[2], P[1]]; n = scale(n, -1); }
    const id = P.map(p => b.v(p[0], p[1], p[2], n[0], n[1], n[2], c)); b.quad(id[0], id[1], id[2], id[3]);
  }
  // flat convex polygon facing 'want' (fan)
  function fpoly(b, P, c, want) {
    let n = norm(cross(sub(P[1], P[0]), sub(P[2], P[0])));
    if (dot(n, want) < 0) { P = [P[0]].concat(P.slice(1).reverse()); n = scale(n, -1); }
    const id = P.map(p => b.v(p[0], p[1], p[2], n[0], n[1], n[2], c)); for (let i = 1; i < id.length - 1; i++) b.tri(id[0], id[i], id[i + 1]);
  }
  const B = (b, x0, x1, y0, y1, z0, z1, c) => b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), c);
  // regular n-gon outline [[x, z], ...]
  const ngon = (n, R, rot) => { const o = []; for (let i = 0; i < n; i++) { const a = (rot || 0) + i * TAU / n; o.push([R * Math.cos(a), R * Math.sin(a)]); } return o; };
  // rectangle with cut corners, centred on (cx, cz)
  const cutRect = (hx, hz, c, cx, cz) => { cx = cx || 0; cz = cz || 0; return [[hx, hz - c], [hx - c, hz], [-hx + c, hz], [-hx, hz - c], [-hx, -hz + c], [-hx + c, -hz], [hx - c, -hz], [hx, -hz + c]].map(p => [p[0] + cx, p[1] + cz]); };
  const rect4 = (hx, hz, cx, cz) => [[hx + (cx || 0), hz + (cz || 0)], [-hx + (cx || 0), hz + (cz || 0)], [-hx + (cx || 0), -hz + (cz || 0)], [hx + (cx || 0), -hz + (cz || 0)]];
  const centroid = P => { let x = 0, z = 0; for (const p of P) { x += p[0] / P.length; z += p[1] / P.length; } return [x, z]; };
  // convex outline offset inward by d
  function inset(P, d) {
    const n = P.length, [cx, cz] = centroid(P);
    const L = P.map((a, i) => { const q = P[(i + 1) % n]; let nx = -(q[1] - a[1]), nz = q[0] - a[0]; const l = Math.hypot(nx, nz); nx /= l; nz /= l; if (nx * ((a[0] + q[0]) / 2 - cx) + nz * ((a[1] + q[1]) / 2 - cz) > 0) { nx = -nx; nz = -nz; } return { px: a[0] + nx * d, pz: a[1] + nz * d, dx: q[0] - a[0], dz: q[1] - a[1] }; });
    return P.map((_, i) => { const A = L[(i - 1 + n) % n], Q = L[i], den = A.dx * Q.dz - A.dz * Q.dx; const s = ((Q.px - A.px) * Q.dz - (Q.pz - A.pz) * Q.dx) / den; return [A.px + A.dx * s, A.pz + A.dz * s]; });
  }
  // side walls between outline P0 at y0 and outline P1 at y1 (same vertex count)
  function loft(b, P0, y0, P1, y1, c) {
    const n = P0.length, [cx, cz] = centroid(P0);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, mx = (P0[i][0] + P0[j][0]) / 2 - cx, mz = (P0[i][1] + P0[j][1]) / 2 - cz; fq(b, [[P0[i][0], y0, P0[i][1]], [P0[j][0], y0, P0[j][1]], [P1[j][0], y1, P1[j][1]], [P1[i][0], y1, P1[i][1]]], c, [mx, (y1 - y0) * 0.01 + (Math.hypot(P0[i][0] - cx, P0[i][1] - cz) - Math.hypot(P1[i][0] - cx, P1[i][1] - cz)), mz]); }
  }
  const cap = (b, P, y, c, up) => fpoly(b, P.map(p => [p[0], y, p[1]]), c, [0, up === false ? -1 : 1, 0]);
  // upright prism from y0 to y1 with an optional chamfer ch round the top edge; returns the top outline
  function tier(b, P, y0, y1, ch, cs, ct, bottom) {
    if (ch > 0) { const Q = inset(P, ch); loft(b, P, y0, P, y1 - ch, cs); loft(b, P, y1 - ch, Q, y1, ct || cs); cap(b, Q, y1, ct || cs); if (bottom) cap(b, P, y0, cs, false); return Q; }
    loft(b, P, y0, P, y1, cs); cap(b, P, y1, ct || cs); if (bottom) cap(b, P, y0, cs, false); return P;
  }
  // smooth path through control points (Catmull-Rom)
  function smooth(P, n) {
    if (n <= 1) return P.map(p => p.slice()); const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
      for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
    }
    out.push(P[P.length - 1].slice()); return out;
  }
  // free-form surface with winding that matches its normals. fn(u, v) -> [x, y, z]; col(u, v, p, n) -> colour or a colour.
  // flip turns the normals (and winding) round.
  function grid(b, nu, nv, fn, col, wrapU, flip, us, vs) {
    const W = nu + 1, H = nv + 1, pts = new Array(W * H), U = i => us ? us[i] : i / nu, V = j => vs ? vs[j] : j / nv;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) pts[j * W + i] = fn(wrapU && i === nu ? U(0) : U(i), V(j));
    const ids = new Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const il = wrapU ? (i === 0 ? nu - 1 : i - 1) : Math.max(i - 1, 0), ir = wrapU ? (i === nu ? 1 : i + 1) : Math.min(i + 1, nu);
      const a = sub(pts[j * W + ir], pts[j * W + il]), c2 = sub(pts[Math.min(j + 1, nv) * W + i], pts[Math.max(j - 1, 0) * W + i]);
      let n = cross(a, c2); if (Math.hypot(n[0], n[1], n[2]) < 1e-14) n = [0, 1, 0]; n = norm(n); if (flip) n = scale(n, -1);
      const p = pts[j * W + i]; ids[j * W + i] = b.v(p[0], p[1], p[2], n[0], n[1], n[2], typeof col === 'function' ? col(U(i), V(j), p, n) : col);
    }
    // split each quad along its shorter diagonal (keeps twisted or sheared grids from showing a saw-toothed edge)
    const P = b.P, L2 = (x, y) => (P[x * 3] - P[y * 3]) ** 2 + (P[x * 3 + 1] - P[y * 3 + 1]) ** 2 + (P[x * 3 + 2] - P[y * 3 + 2]) ** 2;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = ids[j * W + i], q = ids[j * W + i + 1], c = ids[(j + 1) * W + i + 1], d = ids[(j + 1) * W + i], alt = L2(q, d) < L2(a, c) * 0.98;
      if (!flip) { if (alt) { b.tri(a, q, d); b.tri(q, c, d); } else b.quad(a, q, c, d); }
      else { if (alt) { b.tri(a, d, q); b.tri(d, c, q); } else b.quad(a, d, c, q); }
    }
  }
  // tube along a path with radius rf(t) (number or function) and colour col(t, k, p, n) (colour or function)
  function tubeC(b, pts, rf, segs, col, phase) {
    const n = pts.length; if (n < 2) return; const rings = []; let up = [0, 1, 0];
    for (let i = 0; i < n; i++) {
      const d = norm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)])); if (Math.abs(dot(d, up)) > 0.95) up = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
      const s = norm(cross(d, up)), u = cross(s, d); up = u; const ring = [], t = i / (n - 1), rr = typeof rf === 'function' ? rf(t) : rf;
      for (let k = 0; k <= segs; k++) { const a = (k / segs + (phase || 0)) * TAU, ca = Math.cos(a), sa = Math.sin(a), nn = [s[0] * ca + u[0] * sa, s[1] * ca + u[1] * sa, s[2] * ca + u[2] * sa], p = [pts[i][0] + nn[0] * rr, pts[i][1] + nn[1] * rr, pts[i][2] + nn[2] * rr]; ring.push(b.v(p[0], p[1], p[2], nn[0], nn[1], nn[2], typeof col === 'function' ? col(t, k / segs, p, nn) : col)); }
      rings.push(ring);
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < segs; k++) b.quad(rings[i][k], rings[i + 1][k], rings[i + 1][k + 1], rings[i][k + 1]);
  }

  // ======================= glyphs =======================
  // A glyph is a few primitives in a unit cell (-0.5..0.5): short strokes, dots (diamonds), rings and arcs.
  // The builders' script: calm, geometric, never letters. kind picks the family; r is a seeded random.
  function glyphPrims(r, kind) {
    const P = [], S = (x0, y0, x1, y1) => P.push({ t: 's', x0, y0, x1, y1 }), D = (x, y, s) => P.push({ t: 'd', x, y, s: s || 0.17 });
    const C = (x, y, rad) => P.push({ t: 'c', x, y, rad }), A = (x, y, rad, a0, a1) => P.push({ t: 'a', x, y, rad, a0, a1 });
    const k = kind === undefined ? Math.floor(r() * 7) : kind, sg = r() < 0.5 ? -1 : 1;
    if (k === 0) {            // stem with ticks
      S(0, -0.45, 0, 0.45); const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) { const y = 0.3 - i * 0.3, s = (i % 2 ? -1 : 1) * sg; S(0, y, s * 0.36, y); }
      if (r() < 0.6) D(-sg * 0.28, -0.32);
    } else if (k === 1) {     // ring with a seed or a stem
      C(0, 0.08, 0.28); if (r() < 0.5) D(0, 0.08, 0.15); else S(0, -0.2, 0, -0.47);
    } else if (k === 2) {     // open arc with two dots
      const o = Math.floor(r() * 4) * PI / 2; A(0, 0, 0.32, o + 0.6, o + TAU - 0.6);
      D(Math.cos(o) * 0.05, Math.sin(o) * 0.05, 0.14); D(Math.cos(o) * 0.42, Math.sin(o) * 0.42, 0.12);
    } else if (k === 3) {     // twin stems under a small ring
      S(-0.17, -0.45, -0.17, 0.08); S(0.17, -0.45, 0.17, 0.08); C(0, 0.3, 0.13);
    } else if (k === 4) {     // three dots over a bar
      D(-0.3, 0.22); D(0, 0.4); D(0.3, 0.22); S(-0.38, -0.12, 0.38, -0.12); if (r() < 0.5) S(0, -0.12, 0, -0.45);
    } else if (k === 5) {     // dome over a line
      S(-0.42, -0.36, 0.42, -0.36); A(0, -0.36, 0.34, 0, PI); D(0, -0.1, 0.14);
    } else {                  // offset strokes and a dot
      S(-0.35, 0.3, 0.1, 0.3); S(-0.1, 0, 0.35, 0); S(-0.35, -0.3, 0.1, -0.3); D(sg * 0.32, sg * 0.3, 0.14);
    }
    return P;
  }
  // draw glyph primitives through map(x, y) -> world point (the offset off the surface is the map's job); want = normal
  function glyph(b, prims, map, want, col, segs, w) {
    w = w || 0.1; const wv = typeof want === 'function' ? want : () => want;
    for (const p of prims) {
      if (p.t === 's') {
        const dx = p.x1 - p.x0, dy = p.y1 - p.y0, L = Math.hypot(dx, dy) || 1, ux = dx / L * w / 2, uy = dy / L * w / 2;
        fq(b, [map(p.x0 - ux - uy, p.y0 - uy + ux), map(p.x0 - ux + uy, p.y0 - uy - ux), map(p.x1 + ux + uy, p.y1 + uy - ux), map(p.x1 + ux - uy, p.y1 + uy + ux)], col, wv(p.x0, p.y0));
      } else if (p.t === 'd') {
        const s = p.s / 2; fq(b, [map(p.x, p.y - s), map(p.x + s, p.y), map(p.x, p.y + s), map(p.x - s, p.y)], col, wv(p.x, p.y));
      } else {
        const a0 = p.t === 'c' ? 0 : p.a0, a1 = p.t === 'c' ? TAU : p.a1, n = Math.max(2, Math.round(segs * (a1 - a0) / TAU)), r0 = p.rad - w / 2, r1 = p.rad + w / 2;
        for (let k = 0; k < n; k++) {
          const ta = a0 + (a1 - a0) * k / n, tb = a0 + (a1 - a0) * (k + 1) / n, ca = Math.cos(ta), sa = Math.sin(ta), cb = Math.cos(tb), sb = Math.sin(tb);
          fq(b, [map(p.x + r0 * ca, p.y + r0 * sa), map(p.x + r1 * ca, p.y + r1 * sa), map(p.x + r1 * cb, p.y + r1 * sb), map(p.x + r0 * cb, p.y + r0 * sb)], col, wv(p.x + p.rad * ca, p.y + p.rad * sa));
        }
      }
    }
  }
  // map for a glyph cell on a plane: origin o, unit axes ux (right) and uy (up), cell centre (cx, cy), size s, offset off along n
  const planeMap = (o, ux, uy, n, cx, cy, s, off) => (x, y) => { const a = cx + x * s, c = cy + y * s; return [o[0] + ux[0] * a + uy[0] * c + n[0] * off, o[1] + ux[1] * a + uy[1] * c + n[1] * off, o[2] + ux[2] * a + uy[2] * c + n[2] * off]; };
  // flat strip on a plane between two points (in that plane), width w, offset off along n
  function strip(b, p0, p1, w, n, off, col) {
    const d = norm(sub(p1, p0)), s = scale(norm(cross(n, d)), w / 2), o = scale(n, off);
    fq(b, [add(add(p0, s), o), add(sub(p0, s), o), add(sub(p1, s), o), add(add(p1, s), o)], col, n);
  }

  // ======================= Artifact 1: relic_lens =======================
  // A thick black disc on edge in a small slotted foot. Glowing ring inlay on both faces, recessed clear-looking centre.
  function relicLens(d) {
    const b = new MB(), F = d > 0, CY = 0.29, R = 0.25, H = 0.06, HR = 0.034;
    // foot: chamfered block with two cheeks that hold the disc
    tier(b, F ? cutRect(0.17, 0.11, 0.035) : rect4(0.17, 0.11), 0, 0.06, F ? 0.01 : 0, STONE, EDGE);
    for (const s of [-1, 1]) tier(b, F ? cutRect(0.12, 0.022, 0.008, 0, s * 0.088) : rect4(0.12, 0.022, 0, s * 0.088), 0.06, 0.15, F ? 0.008 : 0, STONE, EDGE);
    if (F) {
      strip(b, [-0.14, 0.03, 0.11], [0.14, 0.03, 0.11], 0.008, [0, 0, 1], 0.002, FAINT);
      strip(b, [-0.14, 0.03, -0.11], [0.14, 0.03, -0.11], 0.008, [0, 0, -1], 0.002, FAINT);
    }
    // disc (lathe around local y, turned so its axis is +z)
    b.push(mulAll(tr(0, CY, 0), rotX(PI / 2)));
    const prof = F ? [
      [0, -HR, CLEAR], [0.112, -HR, ACC], [0.128, -0.05, STONE], [0.165, -0.054, GLOW], [0.188, -0.0555, STONE], [0.226, -H, EDGE], [R, -0.042, STONE],
      [R, -0.008, FAINT], [R, 0.008, STONE], [R, 0.042, EDGE], [0.226, H, STONE], [0.188, 0.0555, GLOW], [0.165, 0.054, STONE], [0.128, 0.05, ACC], [0.112, HR, CLEAR], [0, HR]
    ] : [
      [0, -HR, CLEAR], [0.12, -HR, STONE], [0.165, -0.054, GLOW], [0.2, -0.056, STONE], [R, -0.042, STONE], [R, 0.042, STONE], [0.2, 0.056, GLOW], [0.165, 0.054, STONE], [0.12, HR, CLEAR], [0, HR]
    ];
    b.lathe(prof, F ? 24 : 8, STONE);
    b.pop();
    return b;
  }

  // ======================= Artifact 2: relic_key =======================
  // A slender six-sided rod (0.8 m) with a slow twist, lying on two stone rests. Glowing channels run along three of its
  // faces, so they spiral round it.
  function relicKey(d) {
    const b = new MB(), F = d > 0, CY = 0.108, TW = TAU * 0.85;
    // rests: chamfered block plus two sloped jaws forming a V (built in the z-y plane, extruded along x)
    for (const X of [-0.24, 0.24]) {
      tier(b, F ? cutRect(0.045, 0.075, 0.015, X, 0) : rect4(0.045, 0.075, X, 0), 0, 0.07, F ? 0.008 : 0, STONE, EDGE);
      for (const s of [-1, 1]) {
        const prof = [[s * 0.018, 0.07], [s * 0.07, 0.07], [s * 0.07, 0.112], [s * 0.052, 0.122]];   // (z, y)
        const x0 = X - 0.035, x1 = X + 0.035, P3 = x => prof.map(([z, y]) => [x, y, z]);
        const A = P3(x0), Q = P3(x1);
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, mz = (prof[i][0] + prof[j][0]) / 2 - s * 0.05, my = (prof[i][1] + prof[j][1]) / 2 - 0.095; fq(b, [A[i], A[j], Q[j], Q[i]], i === 3 ? ACC : STONE, [0, my, mz]); }
        if (F) { fpoly(b, A, STONE, [-1, 0, 0]); fpoly(b, Q, STONE, [1, 0, 0]); }
      }
      if (F) strip(b, [X - 0.03, 0.035, 0.075], [X + 0.03, 0.035, 0.075], 0.006, [0, 0, 1], 0.002, FAINT);
    }
    // rod stations: [x, radius]; head collar at -x, pointed tip at +x
    const R0 = 0.034;
    const st = F ? [[-0.4, 0.0], [-0.398, 0.03], [-0.392, 0.046], [-0.36, 0.046], [-0.352, 0.036], [-0.34, R0]] : [[-0.4, 0.0], [-0.392, 0.046], [-0.36, 0.046], [-0.34, R0]];
    const NS = F ? 22 : 5; for (let i = 1; i <= NS; i++) st.push([-0.34 + i * 0.64 / NS, R0]);
    if (F) st.push([0.33, 0.04], [0.345, 0.04], [0.352, 0.03]); st.push([0.4, 0.0]);
    const ang = x => x * TW / 0.8, P = (x, r, k, da) => { const a = ang(x) + k * TAU / 6 + (da || 0); return [x, CY + r * Math.cos(a), r * Math.sin(a)]; };
    for (let i = 0; i < st.length - 1; i++) {
      const [x0, r0] = st[i], [x1, r1] = st[i + 1], collar = (r0 > R0 + 0.001 || r1 > R0 + 0.001);
      for (let k = 0; k < 6; k++) {
        const mid = P((x0 + x1) / 2, 1, k + 0.5); const want = [r0 > r1 + 0.001 ? 0.5 : r1 > r0 + 0.001 ? -0.5 : 0, mid[1] - CY, mid[2]];
        fq(b, [P(x0, r0, k), P(x0, r0, k + 1), P(x1, r1, k + 1), P(x1, r1, k)], collar && F ? EDGE : STONE, want);
      }
    }
    // spiral channels along faces 0, 2, 4 of the shaft (flush strips 1.5 mm proud of the face centre)
    const hw = F ? 0.11 : 0.16, x0 = -0.335, x1 = 0.325, NC = F ? 22 : 5;
    for (let k = 0; k < 6; k += 2) for (let i = 0; i < NC; i++) {
      const xa = x0 + (x1 - x0) * i / NC, xb = x0 + (x1 - x0) * (i + 1) / NC, rr = R0 * Math.cos(PI / 6) + 0.0015, rr2 = rr / Math.cos(hw * TAU / 6);
      const m = P((xa + xb) / 2, 1, k + 0.5);
      fq(b, [P(xa, rr2, k + 0.5, -hw * TAU / 6), P(xa, rr2, k + 0.5, hw * TAU / 6), P(xb, rr2, k + 0.5, hw * TAU / 6), P(xb, rr2, k + 0.5, -hw * TAU / 6)], GLOW, [0, m[1] - CY, m[2]]);
    }
    if (F) for (const x of [-0.37, 0.34]) for (let k = 0; k < 6; k++) {   // glowing notch on each collar face
      const m = P(x, 1, k + 0.5), rr = (x < 0 ? 0.046 : 0.04) * Math.cos(PI / 6) + 0.0015;
      fq(b, [P(x - 0.004, rr / Math.cos(0.3), k + 0.5, -0.3), P(x - 0.004, rr / Math.cos(0.3), k + 0.5, 0.3), P(x + 0.004, rr / Math.cos(0.3), k + 0.5, 0.3), P(x + 0.004, rr / Math.cos(0.3), k + 0.5, -0.3)], GLOW, [0, m[1] - CY, m[2]]);
    }
    return b;
  }

  // ======================= Artifact 3: relic_tablet =======================
  // A 0.6 x 0.4 x 0.06 m slab with cut corners, leaning back on a small stand; its front (+z) is rows of glowing glyphs.
  function relicTablet(d) {
    const b = new MB(), F = d > 0, W = 0.3, Hh = 0.4, T = 0.03, LEAN = 0.2, r = rnd(5151);
    // stand: base block with a lip in front and a sloped back prop
    tier(b, cutRect(0.26, 0.1, F ? 0.03 : 0.0, 0, -0.01), 0, 0.04, F ? 0.008 : 0, STONE, EDGE);
    B(b, -0.24, 0.24, 0.04, 0.075, 0.035, 0.06, STONE);
    if (F) for (const s of [-1, 1]) {       // two raking props behind the slab
      const x = s * 0.17, pr = [[x - 0.02, 0.04, -0.1], [x + 0.02, 0.04, -0.1], [x + 0.02, 0.04, -0.035], [x - 0.02, 0.04, -0.035]];
      const top = [[x - 0.02, 0.2, -0.07], [x + 0.02, 0.2, -0.07]];
      fq(b, [pr[0], pr[1], top[1], top[0]], STONE, [0, 0.5, -1]);
      fpoly(b, [pr[0], pr[3], top[0]], STONE, [-1, 0, 0]); fpoly(b, [pr[1], pr[2], top[1]], STONE, [1, 0, 0]);
    } else B(b, -0.2, 0.2, 0.04, 0.12, -0.09, -0.05, STONE);
    if (F) strip(b, [-0.22, 0.02, 0.09], [0.22, 0.02, 0.09], 0.006, [0, 0, 1], 0.002, FAINT);
    // slab, local frame: x across, y up the slab, z out of the face; leaning back by LEAN
    b.push(mulAll(tr(0, 0.04, 0.0), rotX(-LEAN)));
    b.push(rotX(PI / 2));          // so the tier helper's extrusion (local y) becomes +z and its outline (x, z) maps to (x, -y)
    const out = cutRect(W, Hh / 2, F ? 0.045 : 0.03, 0, -Hh / 2);
    tier(b, out, -T, T, F ? 0.008 : 0, STONE, STONE, true);
    b.pop();
    const n = [0, 0, 1], o = [0, 0, 0], FZ = T + 0.0015;
    if (F) {
      // border channel
      const bx = W - 0.022, y0 = 0.022, y1 = Hh - 0.022, c = 0.03;
      const pts = [[bx, y0 + c], [bx, y1 - c], [bx - c, y1], [-bx + c, y1], [-bx, y1 - c], [-bx, y0 + c], [-bx + c, y0], [bx - c, y0]];
      for (let i = 0; i < 8; i++) { const a = pts[i], q = pts[(i + 1) % 8]; strip(b, [a[0], a[1], T], [q[0], q[1], T], 0.006, n, 0.0015, GLOW); }
      // five rows of glyphs with faint baselines
      const rows = 5, cols = 9, cw = 0.056, rh = 0.066, gs = 0.04;
      for (let i = 0; i < rows; i++) {
        const cy = Hh - 0.065 - i * rh;
        strip(b, [-0.255, cy - 0.028, T], [0.255, cy - 0.028, T], 0.003, n, 0.0012, FAINT);
        for (let j = 0; j < cols; j++) {
          if ((i === 4 && j > 5)) continue;        // the last line ends early
          const cx = -0.224 + j * cw; glyph(b, glyphPrims(r), planeMap(o, [1, 0, 0], [0, 1, 0], n, cx, cy, gs, FZ), n, GLOW, 8, 0.11);
        }
      }
    } else {
      for (let i = 0; i < 5; i++) { const cy = 0.335 - i * 0.066; for (let j = 0; j < 8; j++) if (!(i === 4 && j > 4)) strip(b, [-0.235 + j * 0.06, cy, T], [-0.205 + j * 0.06, cy, T], 0.03, n, 0.0015, (i + j) % 3 ? FAINT : GLOW); }
    }
    b.pop();
    return b;
  }

  // ======================= Artifact 4: relic_sphere =======================
  // A 0.45 m sphere of nested curved shell segments over a glowing core (the seams glow), held in a three-pronged cradle.
  function relicSphere(d) {
    const b = new MB(), F = d > 0, C = [0, 0.335, 0], R = 0.225;
    // cradle base and prongs
    tier(b, ngon(6, 0.16, PI / 6), 0, 0.05, F ? 0.01 : 0, STONE, EDGE);
    if (F) { const Q = ngon(6, 0.108, PI / 6); for (let i = 0; i < 6; i++) { const a = Q[i], q = Q[(i + 1) % 6]; strip(b, [a[0], 0.05, a[1]], [q[0], 0.05, q[1]], 0.008, [0, 1, 0], 0.0015, GLOW); } }
    const prong = [[0.07, 0.04], [0.13, 0.1], [0.19, 0.19], [0.232, 0.29], [0.232, 0.37], [0.205, 0.45], [0.175, 0.49]];
    for (let k = 0; k < 3; k++) {
      const a = PI / 2 + k * TAU / 3, P = smooth((F ? prong : [prong[0], prong[2], prong[4], prong[6]]).map(([rr, y]) => [rr * Math.cos(a), y, rr * Math.sin(a)]), F ? 2 : 1);
      tubeC(b, P, t => (F ? 0.02 : 0.018) * (1 - 0.55 * t), 4, (t, kk) => (F && Math.abs(kk - 0.25) < 0.01) ? STONE : STONE, 0.125);
      if (F) { const tip = P[P.length - 1]; b.sphere(tip[0], tip[1], tip[2], 0.012, 4, GLOW); }
    }
    // the ball, tilted
    b.push(mulAll(tr(C[0], C[1], C[2]), rotZ(0.32), rotX(0.22)));
    const sph = (rr, th, ph) => [rr * Math.sin(th) * Math.cos(ph), rr * Math.cos(th), rr * Math.sin(th) * Math.sin(ph)];
    // glowing core (seen through the seams)
    grid(b, F ? 12 : 6, F ? 6 : 3, (u, v) => sph(R * 0.93, PI * v, -TAU * u), GLOW, true);
    // shell panels: polar caps and latitude bands, staggered like brickwork, alternating radius so they read as nested
    const gap = F ? 0.055 : 0.08;
    const bands = F ? [[0, 0.52, 1], [0.52, 1.18, 5], [1.18, 1.96, 6], [1.96, 2.62, 5], [2.62, PI, 1]] : [[0, 1.05, 1], [1.05, 2.09, 4], [2.09, PI, 1]];
    bands.forEach(([t0, t1, n], bi) => {
      for (let k = 0; k < n; k++) {
        const rr = R * ((bi + k) % 2 ? 1.0 : 1.03), off = bi % 2 ? 0.5 : 0, p0 = (k + off) / n * TAU + gap / 2, p1 = (k + 1 + off) / n * TAU - gap / 2;
        const th0 = t0 === 0 ? 0 : t0 + gap / 2, th1 = t1 >= PI - 1e-6 ? PI : t1 - gap / 2;
        if (n === 1) grid(b, F ? 10 : 6, 1, (u, v) => sph(rr, th0 + (th1 - th0) * v, -TAU * u), t0 === 0 ? (F ? EDGE : STONE) : STONE, true);
        else grid(b, F ? 3 : 2, F ? 2 : 1, (u, v) => sph(rr, th0 + (th1 - th0) * v, p0 + (p1 - p0) * (1 - u)), (bi + k) % 2 ? STONE : EDGE);
      }
    });
    b.pop();
    return b;
  }

  // ======================= Artifact 5: relic_seed =======================
  // A twisted seed about 0.5 m tall: its cross-section is a nautilus spiral that steps back once per turn, and the step
  // winds round and up the seed. The step's lip carries the glowing line.
  function relicSeed(d) {
    const b = new MB(), F = d > 0, TWIST = TAU * 1.1, K0 = 0.6;
    tier(b, ngon(6, 0.085, 0), 0, 0.04, F ? 0.008 : 0, STONE, EDGE);
    if (F) { const Q = ngon(12, 0.058, 0); for (let i = 0; i < 12; i++) { const a = Q[i], q = Q[(i + 1) % 12]; strip(b, [a[0], 0.04, a[1]], [q[0], 0.04, q[1]], 0.006, [0, 1, 0], 0.0015, GLOW); } }
    const Y = v => 0.018 + 0.482 * v, Rv = v => 0.118 * Math.pow(Math.sin(PI * (0.09 + 0.91 * Math.pow(v, 0.72))), 0.78);
    const pt = (u, v, k) => { const th = u * TAU + TWIST * v, rr = Rv(v) * (K0 + (1 - K0) * Math.pow(u, 0.9)) * (k || 1); return [rr * Math.cos(th), Y(v), rr * Math.sin(th)]; };
    const nu = F ? 12 : 5, nv = F ? 26 : 11;
    grid(b, nu, nv, (u, v) => pt(u, v), (u, v) => (F && Math.abs(u - 0.5) < 0.04) ? [0.07, 0.07, 0.083, 0] : STONE, false, true);
    // the step face (closes the spiral) and the glowing lip strip
    for (let j = 0; j < nv; j++) {
      const v0 = j / nv, v1 = (j + 1) / nv, o0 = pt(1, v0), o1 = pt(1, v1), i0 = pt(0, v0), i1 = pt(0, v1);
      const th = TWIST * (v0 + v1) / 2, want = [-Math.sin(th), 0, Math.cos(th)];
      fq(b, [i0, o0, o1, i1], F ? ACC : GLOW, want);
      if (F) {
        const a0 = pt(0.945, v0, 1.022), a1 = pt(0.945, v1, 1.022), q0 = pt(1, v0, 1.022), q1 = pt(1, v1, 1.022), m = pt(1, (v0 + v1) / 2);
        fpoly(b, [a0, q0, a1], GLOW, [m[0], 0, m[2]]); fpoly(b, [q0, q1, a1], GLOW, [m[0], 0, m[2]]);   // short diagonal: the strip is sheared by the twist
        const e0 = lerp(i0, o0, 0.5), e1 = lerp(i1, o1, 0.5);   // and a thin glowing line down the middle of the step face
        strip(b, e0, e1, 0.005, want, 0.003, GLOW);
      }
    }
    return b;
  }

  // ======================= socket_pillar =======================
  // Waist-high pedestal (seat at 1.1 m), 0.7 m wide, a shallow cradle on top. A glowing channel runs from the cradle down
  // its front (+z) and 0.6 m out across the floor.
  const PIL_SEAT = [0, 1.1, 0];
  function socketPillar(d) {
    const b = new MB(), F = d > 0, r = rnd(4242);
    const base = cutRect(0.38, 0.38, 0.1), bodyB = cutRect(0.33, 0.33, 0.09), bodyT = cutRect(0.285, 0.285, 0.075), capP = cutRect(0.33, 0.33, 0.085);
    tier(b, base, 0, 0.08, F ? 0.015 : 0, STONE, EDGE);
    loft(b, bodyB, 0.08, bodyT, 1.02, STONE);
    loft(b, bodyT, 1.02, capP, 1.04, EDGE);
    tier(b, capP, 1.04, 1.1, F ? 0.012 : 0, STONE, STONE);
    // cradle: raised lip with a glowing inner bevel round a lighter seat
    const prof = F ? [[0.25, 1.1, STONE], [0.244, 1.132, STONE], [0.205, 1.137, STONE], [0.182, 1.124, GLOW], [0.174, 1.103, ACC], [0.17, 1.1005, ACC], [0, 1.1005]]
      : [[0.25, 1.1, STONE], [0.21, 1.135, GLOW], [0.17, 1.1005, ACC], [0, 1.1005]];
    b.lathe(prof, F ? 24 : 8, STONE);
    if (F) for (let k = 0; k < 6; k++) {    // six small glowing studs round the lip
      const a = k * TAU / 6 + PI / 6, x = Math.cos(a) * 0.226, z = Math.sin(a) * 0.226; fq(b, [[x - 0.008, 1.1375, z - 0.008], [x + 0.008, 1.1375, z - 0.008], [x + 0.008, 1.1375, z + 0.008], [x - 0.008, 1.1375, z + 0.008]], GLOW, [0, 1, 0]);
    }
    // the channel: across the cap top, down the cap face, down the tapered body, over the plinth and out along the floor
    const w = F ? 0.03 : 0.04, cw = 0.012;
    const fz = (y) => 0.33 - (0.33 - 0.285) * (y - 0.08) / 0.94;
    const capZ = F ? 0.33 - 0.012 : 0.33;
    strip(b, [0, 1.1, 0.246], [0, 1.1, capZ], w, [0, 1, 0], 0.0015, GLOW);
    if (F) { const a = [0, 1.1, capZ], q = [0, 1.088, 0.33]; strip(b, a, q, w, norm([0, 1, 1]), 0.0015, GLOW); }
    strip(b, [0, F ? 1.088 : 1.1, 0.33], [0, 1.04, 0.33], w, [0, 0, 1], 0.0015, GLOW);
    { const a = [0, 1.02, fz(1.02)], q = [0, 0.08, fz(0.08)], n = norm([0, 0.045, 0.94]); strip(b, a, q, w, n, 0.0015, GLOW); }
    if (F) { const a = [0, 1.04, 0.33], q = [0, 1.02, fz(1.02)]; strip(b, a, q, w, norm([0, -1, 2]), 0.0015, GLOW); }
    strip(b, [0, 0.08, 0.38 - (F ? 0.015 : 0)], [0, 0.08, 0.31], w, [0, 1, 0], 0.0015, GLOW);
    if (F) strip(b, [0, 0.08, 0.38 - 0.015], [0, 0.065, 0.38], w, norm([0, 1, 1]), 0.0015, GLOW);
    strip(b, [0, F ? 0.065 : 0.08, 0.38], [0, 0, 0.38], w, [0, 0, 1], 0.0015, GLOW);
    strip(b, [0, 0, 0.38], [0, 0, 0.98], w, [0, 1, 0], 0.003, GLOW);
    if (F) {
      fq(b, [[-0.03, 0.003, 0.98], [0, 0.003, 0.95], [0.03, 0.003, 0.98], [0, 0.003, 1.01]], GLOW, [0, 1, 0]);   // the channel ends in a diamond
      // faint side channels framing the main one, and a column of glyphs either side
      for (const s of [-1, 1]) {
        const x = s * 0.09; strip(b, [x, 0.98, fz(0.98)], [x, 0.14, fz(0.14)], cw * 0.5, norm([0, 0.045, 0.94]), 0.0015, FAINT);
        for (let i = 0; i < 4; i++) {
          const y = 0.88 - i * 0.17, cx = s * 0.17, z = fz(y), n = norm([0, 0.045, 0.94]), uy = norm([0, 0.94, -0.045]);
          glyph(b, glyphPrims(r), planeMap([0, y, z], [1, 0, 0], uy, n, cx, 0, 0.085, 0.0018), n, GLOW, 8, 0.1);
        }
      }
      // faint ring line round the body just under the cap
      for (let i = 0; i < 8; i++) { const a = bodyT[i], q = bodyT[(i + 1) % 8], y = 0.98, k = (fz(y) / 0.285); const n = norm([(a[0] + q[0]) / 2, 0.04, (a[1] + q[1]) / 2]); if (Math.abs(n[2] - 1) < 0.01) continue; strip(b, [a[0] * k * 1.0, y, a[1] * k], [q[0] * k, y, q[1] * k], 0.006, n, 0.0015, FAINT); }
    }
    return b;
  }

  // ======================= floor_plate =======================
  // A hexagonal plate 2.4 m across (corner to corner), 0.08 m tall, with a glowing ring near its edge and one glyph in the middle.
  function floorPlate(d) {
    const b = new MB(), F = d > 0, Y = 0.08, n = [0, 1, 0];
    const top = tier(b, ngon(6, 1.2, 0), 0, Y, F ? 0.02 : 0, STONE, STONE);
    const ringSeg = F ? 36 : 12;
    glyph(b, [{ t: 'c', x: 0, y: 0, rad: 0.95 }], (x, y) => [x, Y + 0.002, y], n, GLOW, ringSeg, 0.07);
    if (F) {
      const Q = ngon(6, 0.83, 0); for (let i = 0; i < 6; i++) { const a = Q[i], q = Q[(i + 1) % 6]; strip(b, [a[0], Y, a[1]], [q[0], Y, q[1]], 0.02, n, 0.0015, FAINT); }
      for (const p of ngon(6, 1.07, 0)) fq(b, [[p[0] - 0.035, Y + 0.002, p[1]], [p[0], Y + 0.002, p[1] - 0.035], [p[0] + 0.035, Y + 0.002, p[1]], [p[0], Y + 0.002, p[1] + 0.035]], GLOW, n);
    }
    // the central glyph: a ring pierced by a stem, a seed in the ring, an arc beneath and two dots
    const prims = F ? [{ t: 'c', x: 0, y: 0.12, rad: 0.24 }, { t: 's', x0: 0, y0: -0.5, x1: 0, y1: -0.12 }, { t: 'd', x: 0, y: 0.12, s: 0.14 },
      { t: 'a', x: 0, y: -0.2, rad: 0.36, a0: PI + 0.5, a1: TAU - 0.5 }, { t: 'd', x: -0.34, y: 0.3, s: 0.1 }, { t: 'd', x: 0.34, y: 0.3, s: 0.1 }, { t: 's', x0: -0.18, y0: 0.5, x1: 0.18, y1: 0.5 }]
      : [{ t: 'c', x: 0, y: 0.12, rad: 0.24 }, { t: 's', x0: 0, y0: -0.5, x1: 0, y1: -0.12 }, { t: 'd', x: 0, y: 0.12, s: 0.14 }];
    glyph(b, prims, (x, y) => [x * 1.1, Y + 0.002, -y * 1.1], n, GLOW, F ? 20 : 8, 0.07);
    return b;
  }

  // ======================= dais =======================
  // Octagonal, 9 m across the flats, three 0.4 m steps up to 1.2 m. Eight glowing channels run in from the edge, up every
  // step, to an emitter ring in the middle of the top. A ring of glyphs circles the emitter.
  const DAIS_EMIT = [0, 1.32, 0];
  function dais(d) {
    const b = new MB(), F = d > 0, r = rnd(9090), APO = [4.5, 3.75, 3.0], TOP = [0.4, 0.8, 1.2], CH = F ? 0.05 : 0;
    const oct = a => ngon(8, a / Math.cos(PI / 8), PI / 8);
    for (let i = 0; i < 3; i++) tier(b, oct(APO[i]), i ? TOP[i - 1] : 0, TOP[i], CH, STONE, i === 2 ? STONE : STONE);
    // radial channels on the face mid-lines
    const w = F ? 0.09 : 0.12;
    for (let k = 0; k < 8; k++) {
      const a = k * PI / 4, dx = Math.cos(a), dz = Math.sin(a), P = (rr, y) => [dx * rr, y, dz * rr], nf = [dx, 0, dz];
      for (let i = 0; i < 3; i++) {
        const y0 = i ? TOP[i - 1] : 0, y1 = TOP[i], A = APO[i], inner = i < 2 ? APO[i + 1] : 1.45;
        strip(b, P(A, y0), P(A, y1 - CH), w, nf, 0.003, GLOW);
        if (F) strip(b, P(A, y1 - CH), P(A - CH, y1), w, norm([dx, 1, dz]), 0.003, GLOW);
        strip(b, P(A - CH, y1), P(inner, y1), w, [0, 1, 0], 0.003, GLOW);
      }
      if (F) fq(b, [P(1.45 - 0.09, 1.203), add(P(1.45, 1.203), [-dz * 0.09, 0, dx * 0.09]), P(1.45 + 0.09, 1.203), add(P(1.45, 1.203), [dz * 0.09, 0, -dx * 0.09])], GLOW, [0, 1, 0]);
    }
    // faint lines just inside each step's edge
    if (F) for (let i = 0; i < 3; i++) { const Q = oct(APO[i] - 0.22), y = TOP[i]; for (let k = 0; k < 8; k++) { const a = Q[k], q = Q[(k + 1) % 8]; strip(b, [a[0], y, a[1]], [q[0], y, q[1]], 0.025, [0, 1, 0], 0.002, FAINT); } }
    // emitter ring: a low raised ring with a glowing inner bevel round a dished lens
    const prof = F ? [[1.3, 1.2, EDGE], [1.26, 1.3, STONE], [1.1, 1.32, STONE], [0.96, 1.32, GLOW], [0.9, 1.31, STONE], [0.84, 1.25, ACC], [0.6, 1.235, FAINT], [0.5, 1.232, ACC], [0, 1.22]]
      : [[1.3, 1.2, STONE], [1.1, 1.32, STONE], [0.9, 1.31, GLOW], [0.6, 1.235, ACC], [0, 1.22]];
    b.lathe(prof, F ? 40 : 12, STONE);
    if (F) {
      b.lathe([[0.2, 1.221, CLEAR], [0, 1.222]], 12, CLEAR);
      // ring of glyphs round the emitter, curved along the circle
      const N = 23, Rg = 1.95, s = 0.32;
      for (let i = 0; i < N; i++) {
        const th = i / N * TAU + 0.05, prims = glyphPrims(r);
        glyph(b, prims, (x, y) => { const rr = Rg + y * s, t = th - x * s / Rg; return [rr * Math.cos(t), 1.2025, rr * Math.sin(t)]; }, [0, 1, 0], GLOW, 8, 0.1);
      }
      // two faint guide circles either side of the glyph ring
      for (const rr of [1.7, 2.2]) glyph(b, [{ t: 'c', x: 0, y: 0, rad: rr }], (x, y) => [x, 1.2015, y], [0, 1, 0], FAINT, 48, 0.02);
    }
    return b;
  }
  const DAIS_COL = [];
  for (const [a, t] of [[4.5, 0.4], [3.75, 0.8], [3.0, 1.2]]) for (const rot of [0, PI / 4]) DAIS_COL.push({ type: 'box', x: 0, z: 0, hx: a, hz: a, rot, top: t, solid: false });
  DAIS_COL.push({ type: 'cyl', x: 0, z: 0, r: 1.3, top: 1.32, solid: false });

  // ======================= monolith =======================
  // A 2.2 x 0.9 x 10 m slab with chamfered edges and a vertical column of glowing glyphs on each broad face (+z and -z).
  function monolith(d) {
    const b = new MB(), F = d > 0, r = rnd(31337), HX = 1.1, HZ = 0.45, Ht = 10, c = 0.12;
    const P = cutRect(HX, HZ, c);
    tier(b, P, 0, Ht, F ? 0.1 : 0, STONE, EDGE);
    if (F) for (const s of [-1, 1]) for (const x of [-1, 1]) strip(b, [x * (HX - c / 2), 0, s * (HZ - c / 2)], [x * (HX - c / 2), Ht - 0.1, s * (HZ - c / 2)], 0.012, norm([x, 0, s]), 0.003, FAINT);
    for (const s of [-1, 1]) {
      const n = [0, 0, s], ux = [s, 0, 0], z = s * HZ;
      // the column: two faint rails, glyphs between them, a glowing foot bar and crown bar
      for (const x of [-0.42, 0.42]) strip(b, [x, 0.6, z], [x, 9.3, z], F ? 0.025 : 0.04, n, 0.004, FAINT);
      strip(b, [-0.42, 0.6, z], [0.42, 0.6, z], 0.05, n, 0.004, GLOW);
      strip(b, [-0.42, 9.3, z], [0.42, 9.3, z], 0.05, n, 0.004, GLOW);
      const N = F ? 13 : 13;
      for (let i = 0; i < N; i++) {
        const y = 1.05 + i * 0.63;
        if (F) glyph(b, glyphPrims(r), planeMap([0, 0, z], ux, [0, 1, 0], n, 0, y, 0.5, 0.005), n, GLOW, 6, 0.1);
        else { const w2 = 0.12 + 0.12 * ((i * 7) % 3); strip(b, [-w2, y, z], [w2, y, z], 0.18, n, 0.005, GLOW); }
      }
    }
    return b;
  }

  // ======================= portal_ring =======================
  // A thick stone ring framing a round tunnel mouth: inner radius 3.0, outer 4.2, 0.8 m deep, centred on the origin with its
  // axis along +z. Bold glowing ring and a ring of glyphs on the -z face; a single glowing ring on the +z face.
  function portalRing(d) {
    const b = new MB(), F = d > 0, r = rnd(777), RI = 3.0, RO = 4.2, D2 = 0.4, seg = F ? 32 : 14, ch = 0.12;
    b.push(rotX(PI / 2));                 // lathe axis (local y) -> +z ; local z -> -y
    // profile in [radius, z]: start on the inner bore at the -z face and go round the cross-section with outward normals
    const prof = F ? [[RI, D2, STONE], [RI, -D2 + ch, EDGE], [RI + ch, -D2, STONE], [RO - ch, -D2, EDGE], [RO, -D2 + ch, STONE], [RO, D2, STONE], [RI, D2]]
      : [[RI, D2, STONE], [RI, -D2, STONE], [RO, -D2, STONE], [RO, D2, STONE], [RI, D2]];
    // lathe normals point "right" of travel; this order (bore, front face outward, rim, back face inward) gives outward normals
    b.lathe(prof.map(p => [p[0], -p[1], p[2]]), seg, STONE);
    b.pop();
    // glowing inlays: map polar (radius, angle) on the plane z = zf facing nz
    const face = (zf, nz) => (x, y) => [x, y, zf + nz * 0.006];
    const F0 = face(-D2, -1), F1 = face(D2, 1);
    glyph(b, [{ t: 'c', x: 0, y: 0, rad: 3.95 }], F0, [0, 0, -1], GLOW, seg, 0.17);
    glyph(b, [{ t: 'c', x: 0, y: 0, rad: RI + 0.24 }], F0, [0, 0, -1], GLOW, seg, F ? 0.08 : 0.1);
    if (F) {
      glyph(b, [{ t: 'c', x: 0, y: 0, rad: 3.95 }], F1, [0, 0, 1], FAINT, 16, 0.08);
      // twelve-fold key marks on the rim face and glyph ring between the rings
      const N = 16, Rg = 3.6, s = 0.5;
      for (let i = 0; i < N; i++) {
        const th = PI / 2 - i / N * TAU, prims = glyphPrims(r);
        glyph(b, prims, (x, y) => { const rr = Rg + y * s, t = th - x * s / Rg; return [rr * Math.cos(t), rr * Math.sin(t), -D2 - 0.006]; }, [0, 0, -1], GLOW, 6, 0.15);
      }
      for (let i = 0; i < 12; i++) {
        const t = i / 12 * TAU, c = Math.cos(t), s2 = Math.sin(t);
        fq(b, [[c * (RO + 0.005) - s2 * 0.05, s2 * (RO + 0.005) + c * 0.05, -0.25], [c * (RO + 0.005) + s2 * 0.05, s2 * (RO + 0.005) - c * 0.05, -0.25], [c * (RO + 0.005) + s2 * 0.05, s2 * (RO + 0.005) - c * 0.05, 0.25], [c * (RO + 0.005) - s2 * 0.05, s2 * (RO + 0.005) + c * 0.05, 0.25]], GLOW, [c, s2, 0]);
      }
    } else {
      for (let i = 0; i < 8; i++) { const t = i / 8 * TAU + PI / 8, c = Math.cos(t), s2 = Math.sin(t); strip(b, [c * 3.45, s2 * 3.45, -D2], [c * 3.75, s2 * 3.75, -D2], 0.2, [0, 0, -1], 0.006, GLOW); }
    }
    return b;
  }

  // ======================= entity: hologram of an ancient builder =======================
  // About 6.5 m tall, lowest point (the tail tip) at y = 0, facing +z. Tall slender body, long narrow faceless head that
  // sweeps back into a crest, four long arms (upper pair cupping an empty space in front of the chest, lower pair hanging),
  // a tail instead of legs, a pointed shoulder mantle and long thin drapes.
  // Channels: r = rim emphasis (1 on silhouettes/edges), g = inner structure (ribs, seams, spine), b = glyph markings, a = density.
  const ENT_CHART = [0, 4.45, 0.98];
  const E_H0 = [0, 5.22, 0.1], E_TL = 0.5, E_AX = [0, Math.cos(E_TL), -Math.sin(E_TL)], E_AZ = [0, Math.sin(E_TL), Math.cos(E_TL)], E_HL = 1.2;
  const ENT_HEAD = [0, +(E_H0[1] + E_AX[1] * (-0.08 + 0.45 * E_HL)).toFixed(3), +(E_H0[2] + E_AX[2] * (-0.08 + 0.45 * E_HL)).toFixed(3)];
  function entity(d) {
    const b = new MB(), F = d > 0, r = rnd(6502);
    const rim = n => cl01(Math.pow(1 - Math.abs(n[2]) * 0.92, 1.7) * 0.85 + 0.12);   // silhouette as seen from the front
    const C = (rr, g, bb, a) => [cl01(rr), cl01(g), cl01(bb), a === undefined ? 1 : a];

    // ---- body: tail tip (y = 0) to the base of the neck ----
    // keyframes: [y, centre z, half-width x, half-depth z]
    const KF = [[0, -0.62, 0.0, 0.0], [0.35, -0.5, 0.035, 0.035], [1.0, -0.3, 0.09, 0.085], [1.8, -0.12, 0.16, 0.14], [2.6, -0.02, 0.24, 0.2], [3.05, 0.0, 0.27, 0.21],
      [3.45, 0.0, 0.19, 0.155], [3.75, 0.0, 0.2, 0.16], [4.15, 0.02, 0.33, 0.22], [4.5, 0.02, 0.41, 0.245], [4.78, 0.0, 0.36, 0.22], [4.96, 0.0, 0.14, 0.12], [5.02, 0.02, 0.1, 0.09]];
    const YT = 5.02;
    const kf = y => { let i = 0; while (i < KF.length - 2 && KF[i + 1][0] < y) i++; const a = KF[i], q = KF[i + 1], t = cl01((y - a[0]) / (q[0] - a[0])), s = t * t * (3 - 2 * t); return [y, a[1] + (q[1] - a[1]) * s, a[2] + (q[2] - a[2]) * s, a[3] + (q[3] - a[3]) * s]; };
    // cross-section: rounded, with a keel down the front of the chest and a flatter back
    const body = (u, v) => {
      const [y, cz, hx, hz] = kf(v * YT), th = u * TAU, c = Math.cos(th), s = Math.sin(th);
      const keel = 1 + 0.16 * Math.pow(Math.max(0, s), 8) * cl01((y - 3.8) / 0.3), back = s < 0 ? 0.86 : 1;
      return [hx * c, y, cz + hz * s * keel * back];
    };
    // crisp structure lines: rows sit tight round each line so the g band stays thin
    const LINES = F ? [0.8, 1.4, 2.0, 2.6, 3.3, 4.0, 4.18, 4.36, 4.54, 4.88] : [1.4, 3.3, 4.18, 4.54];
    const FILL = F ? [0, 0.18, 0.4, 0.6, 1.1, 1.7, 2.3, 2.85, 3.05, 3.5, 3.68, 3.84, 4.72, 4.96, 5.02] : [0, 0.3, 0.8, 2.2, 3.0, 3.75, 4.75, 4.96, 5.02];
    const hw = F ? 0.022 : 0.04, rowsY = FILL.slice(); for (const l of LINES) rowsY.push(l - hw, l, l + hw);
    rowsY.sort((a, c) => a - c); const vs = rowsY.map(y => y / YT);
    const base = F ? 12 : 6, us = []; for (let i = 0; i < base; i++) us.push(i / base); if (F) us.push(0.25 - 0.012, 0.25 + 0.012, 0.75 - 0.012, 0.75 + 0.012);
    us.sort((a, c) => a - c); us.push(1);
    const bodyCol = (u, v, p, n) => {
      const y = p[1], front = Math.sin(u * TAU);
      let g = LINES.some(l => Math.abs(y - l) < 0.004) ? (y > 3.9 && y < 4.7 ? (front > -0.3 ? 1 : 0.45) : 0.85) : 0;
      if (Math.abs(u - 0.75) < 0.004 && y > 0.4) g = 1;                    // spine line down the back
      if (Math.abs(u - 0.25) < 0.004 && y > 3.85 && y < 4.95) g = 1;       // keel line down the chest
      return C(rim(n) + (y < 0.7 ? 0.35 : 0), g, 0, 1);
    };
    grid(b, us.length - 1, vs.length - 1, body, bodyCol, true, true, us, vs);

    // ---- neck and head (the head leans back along E_AX) ----
    tubeC(b, [[0, 4.92, 0.01], [0, 5.06, 0.05], [0, 5.18, 0.09], [0, 5.3, 0.08]], t => 0.088 - 0.012 * t, F ? 8 : 4, (t, k, p, n) => C(rim(n), t < 0.12 ? 0.8 : 0, 0, 1));
    const headR = t => { const s = Math.max(0, Math.sin(PI * Math.pow(t, 0.68))); return [0.14 * Math.pow(s, 0.55), 0.22 * Math.pow(s, 0.5)]; };
    const headP = (u, t) => {
      const [rx, rz] = headR(t), th = u * TAU, c = Math.cos(th), s = Math.sin(th);
      const front = s > 0 ? 1 + 0.1 * Math.sin(PI * Math.min(1, t * 1.3)) : 0.9;       // smooth forward dome where a face would be
      const along = -0.08 + t * E_HL;
      return [rx * c, E_H0[1] + E_AX[1] * along + E_AZ[1] * rz * s * front, E_H0[2] + E_AX[2] * along + E_AZ[2] * rz * s * front];
    };
    const hvs = F ? [0, 0.05, 0.1, 0.16, 0.2, 0.24, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.9, 0.96, 1] : [0, 0.12, 0.35, 0.6, 0.85, 1];
    const hus = []; const hb = F ? 12 : 6; for (let i = 0; i < hb; i++) hus.push(i / hb); if (F) hus.push(0.5 - 0.015, 0.5 + 0.015, 1 - 0.015); hus.sort((a, c) => a - c); hus.push(1);
    grid(b, hus.length - 1, hvs.length - 1, headP, (u, v, p, n) => {
      let g = Math.abs(v - 0.2) < 0.001 ? 0.9 : 0;                                    // seam ring where the head meets the neck
      if ((Math.abs(u - 0.5) < 0.001 || u < 0.001 || u > 0.999) && v > 0.3 && v < 0.9) g = 0.75;   // lines along both sides
      return C(rim(n) + (v > 0.9 ? 0.3 : 0), g, 0, 1);
    }, true, true, hus, hvs);
    // crest: a thin blade along the back midline that sweeps over the top and past it
    {
      const n = F ? 12 : 4, bases = [], tips = [];
      for (let i = 0; i <= n; i++) {
        const t = 0.26 + 0.74 * i / n, p = headP(0.75, Math.min(t, 0.999)), q = headP(0.75, Math.min(t, 0.999) - 0.01), w = headP(0.74, Math.min(t, 0.999));
        let nn = norm(cross(sub(w, p), sub(q, p))); if (dot(nn, sub(p, add(E_H0, scale(E_AX, -0.08 + t * E_HL)))) < 0) nn = scale(nn, -1);
        if (t > 0.97) nn = norm(lerp(nn, E_AX, (t - 0.97) / 0.03));
        const hgt = 0.03 + 0.24 * Math.pow((t - 0.26) / 0.74, 1.6);
        bases.push(add(p, scale(nn, -0.01))); tips.push(add(add(p, scale(nn, hgt)), scale(E_AX, 0.08 * Math.pow((t - 0.26) / 0.74, 3))));
      }
      for (const sx of [-1, 1]) for (let i = 0; i < n; i++) {
        const th = 0.014 * (1 - i / n) + 0.004, P = [add(bases[i], [sx * th, 0, 0]), add(bases[i + 1], [sx * th, 0, 0]), tips[i + 1], tips[i]];
        const id = P.map((p, k) => b.v(p[0], p[1], p[2], sx, 0, 0, C(k < 2 ? 0.5 : 1, k < 2 ? 0.5 : 0, 0, 0.9))); if (sx > 0) b.quad(id[0], id[1], id[2], id[3]); else b.quad(id[0], id[3], id[2], id[1]);
      }
    }
    // markings on the head: a column of three small glyphs where a face would be, and a short arc either side (b channel)
    const headSurf = (t, th, off) => { const u = th / TAU, p = headP(u, t), q = headP(u, t + 0.01), w = headP(u + 0.01, t); let n = norm(cross(sub(w, p), sub(q, p))); if (n[2] < 0 && Math.sin(th) > 0.5) n = scale(n, -1); return { p: add(p, scale(n, off)), n, up: norm(sub(q, p)), rt: norm(sub(w, p)) }; };
    const surfMap = (S, s) => (x, y) => add(add(S.p, scale(S.rt, -x * s)), scale(S.up, y * s));
    const GC = C(0.6, 0, 1, 1);
    for (const [t, kind] of (F ? [[0.3, 1], [0.41, 0], [0.52, 4]] : [[0.38, 1]])) { const S = headSurf(t, PI / 2, 0.006); glyph(b, glyphPrims(r, kind), surfMap(S, F ? 0.085 : 0.11), S.n, GC, F ? 8 : 6, 0.12); }
    if (F) for (const sx of [-1, 1]) { const th = PI / 2 - sx * 0.95, S = headSurf(0.42, th, 0.006); const out = [S.p[0] * 0 + sx, 0, 0.3]; if (dot(S.n, out) < 0) S.n = scale(S.n, -1); glyph(b, [{ t: 'a', x: 0, y: 0, rad: 0.32, a0: PI * 0.55, a1: PI * 1.45 }, { t: 's', x0: 0.05, y0: -0.3, x1: 0.05, y1: 0.3 }], surfMap(S, 0.14), S.n, GC, 6, 0.12); }

    // ---- shoulder mantle: a thin plate round the neck base, drawn out into points over the shoulders ----
    {
      const mant = (u, v) => { const th = u * TAU, c = Math.cos(th), s = Math.sin(th), ac = Math.pow(Math.abs(c), 3), R0 = 0.14 + v * (0.15 + 0.6 * ac); return [R0 * c, 4.99 - 0.14 * Math.pow(v, 1.4) - 0.24 * ac * v * v, R0 * s * (s > 0 ? 0.75 : 1.0) - 0.04 * v]; };
      const mu = F ? 20 : 8;
      grid(b, mu, F ? 3 : 1, mant, (u, v, p, n) => C(v > 0.99 ? 1 : 0.3 + rim(n) * 0.4, Math.abs(v - 0.67) < 0.01 ? 0.8 : 0, 0, 0.85), true, false, null, F ? [0, 0.6, 0.72, 1] : null);
      grid(b, mu, 1, (u, v) => { const p = mant(u, v); return [p[0], p[1] - 0.04 * (1 - v), p[2]]; }, (u, v) => C(v > 0.99 ? 1 : 0.4, 0, 0, 0.8), true, true);
    }

    // ---- arms ----
    function limb(ctrl, r0, r1, seams, per, segs) {
      const P = smooth(ctrl, per);
      tubeC(b, P, t => r0 + (r1 - r0) * t + 0.012 * Math.exp(-Math.pow((t - seams[0]) / 0.04, 2)), segs, (t, k, p, nn) => {
        const g = seams.reduce((m, s) => Math.max(m, 1 - Math.abs(t - s) / 0.03), 0);
        return C(rim(nn), g, 0, 1);
      });
      return P;
    }
    const UPA = sx => [[sx * 0.4, 4.74, 0.0], [sx * 0.72, 4.58, 0.0], [sx * 0.97, 4.24, 0.24], [sx * 0.9, 4.08, 0.6], [sx * 0.66, 4.1, 0.88], [sx * 0.5, 4.16, 0.96]];
    const LOA = sx => [[sx * 0.3, 4.3, -0.04], [sx * 0.52, 4.0, -0.1], [sx * 0.66, 3.4, -0.12], [sx * 0.7, 2.8, -0.04], [sx * 0.67, 2.3, 0.08]];
    for (const sx of [-1, 1]) {
      const up = UPA(sx), lo = LOA(sx);
      limb(up, 0.095, 0.05, [0.45, 0.97], F ? 3 : 1, F ? 7 : 4);
      limb(lo, 0.075, 0.042, [0.5, 0.97], F ? 3 : 1, F ? 6 : 4);
      // upper hand: palm low on the side of a 0.42 m ball of space round the chart point; four long fingers spread front to
      // back and curl up round the ball, so the two hands hold it like a globe
      const wrist = up[up.length - 1], Cc = ENT_CHART, Rr = 0.42, fs = F ? 4 : 3, n0 = norm([sx * 0.85, -0.5, 0.05]), palm = add(Cc, scale(n0, Rr + 0.03));
      tubeC(b, [wrist, palm], t => 0.05 - 0.01 * t, fs, (t, k, p, nn) => C(rim(nn), t < 0.15 ? 0.9 : 0, 0, 1));
      const az0 = Math.atan2(n0[2], n0[0]), el0 = Math.asin(n0[1]);
      for (const [spread, curl] of (F ? [[-0.42, 1.05], [-0.08, 1.2], [0.27, 1.15], [0.66, 0.8]] : [[-0.25, 1.1], [0.45, 1.0]])) {
        const pts = [palm], NF = F ? 6 : 3;
        for (let i = 1; i <= NF; i++) {
          const t = i / NF, az = az0 + sx * spread * (0.35 + 0.65 * t), elv = el0 + curl * t, rr = Rr + 0.03 - 0.035 * t;
          pts.push([Cc[0] + rr * Math.cos(elv) * Math.cos(az), Cc[1] + rr * Math.sin(elv), Cc[2] + rr * Math.cos(elv) * Math.sin(az)]);
        }
        tubeC(b, pts, t => 0.03 * (1 - 0.7 * t), fs, (t, k, p, nn) => C(rim(nn) + (t > 0.85 ? 0.4 : 0), (Math.abs(t - 0.38) < 0.06 || Math.abs(t - 0.7) < 0.06) ? 0.85 : 0, 0, 1));
      }
      // lower hand: palm and three long fingers, relaxed and slightly curled
      const lw = lo[lo.length - 1], d0 = norm(sub(lo[4], lo[3])), lp = add(lw, scale(d0, 0.12));
      tubeC(b, [lw, lp], t => 0.042 - 0.006 * t, fs, (t, k, p, nn) => C(rim(nn), t < 0.15 ? 0.9 : 0, 0, 1));
      for (const off of (F ? [-1, 0, 1] : [-0.6, 0.6])) {
        const pts = [lp], NF = F ? 4 : 2, spread = [sx * 0.02 * (1 + off), 0, 0.05 * off];
        for (let i = 1; i <= NF; i++) { const t = i / NF; pts.push(add(add(lp, scale(d0, 0.4 * t)), add(scale(spread, t * 2), [-sx * 0.05 * t * t, 0, 0.12 * t * t]))); }
        tubeC(b, pts, t => 0.022 * (1 - 0.65 * t), fs, (t, k, p, nn) => C(rim(nn) + (t > 0.85 ? 0.4 : 0), Math.abs(t - 0.45) < 0.08 ? 0.85 : 0, 0, 1));
      }
      // glyph band down the outer side of the upper forearm (b channel)
      if (F) {
        const P = smooth(up.slice(2, 5), 3);
        for (let i = 0; i < 3; i++) {
          const t = 0.15 + i * 0.3, k = Math.min(P.length - 2, Math.floor(t * (P.length - 1))), p = P[k], q = P[k + 1], dir = norm(sub(q, p));
          const outw = norm(sub([sx, 0.7, 0], scale(dir, dot([sx, 0.7, 0], dir)))), rt = norm(cross(outw, dir));
          glyph(b, glyphPrims(r), surfMap({ p: add(p, scale(outw, 0.074 + 0.012)), n: outw, up: dir, rt }, 0.075), outw, GC, 6, 0.13);
        }
      }
    }

    // ---- chest markings: a ring sigil on the breastbone and an arc of glyphs over it ----
    {
      const at = (x, y) => { const [, , hx] = kf(y), u = Math.acos(Math.max(-1, Math.min(1, x / hx))) / TAU, v = y / YT; const p = body(u, v), q = body(u, v + 0.003), w = body(u + 0.003, v); return { p, n: norm(cross(sub(q, p), sub(w, p))) }; };
      const map = (cx, cy, s) => (x, y) => { const X = cx + x * s, Y = cy + y * s, S = at(-X, Y); return add(S.p, scale(S.n, 0.01)); };
      glyph(b, [{ t: 'c', x: 0, y: 0, rad: 0.36 }, { t: 'd', x: 0, y: 0, s: 0.2 }, { t: 's', x0: 0, y0: -0.48, x1: 0, y1: -0.8 }], map(0, 4.45, 0.2), at(0, 4.45).n, GC, F ? 14 : 8, 0.1);
      if (F) for (let i = 0; i < 6; i++) { const a = PI * (0.12 + 0.76 * i / 5), cx = Math.cos(a) * 0.29, cy = 4.4 + Math.sin(a) * 0.22; glyph(b, glyphPrims(r), map(cx, cy, 0.085), at(-cx, cy).n, GC, 6, 0.13); }
    }

    // ---- inner structure seen through the hologram: a spine with nodes and a geometric heart (g channel) ----
    if (F) {
      const sp = []; for (let i = 0; i <= 12; i++) { const y = 0.35 + (4.95 - 0.35) * i / 12, [, cz] = kf(y); sp.push([0, y, cz - 0.03]); }
      sp.push([0, 5.15, 0.07], [0, 5.5, -0.02]);
      tubeC(b, sp, 0.016, 3, C(0.2, 1, 0, 0.6));
      for (let i = 2; i < 13; i += 2) { const p = sp[i]; b.push(tr(p[0], p[1], p[2])); b.lathe([[0, -0.03], [0.05, 0], [0, 0.03]], 4, C(0.2, 1, 0, 0.6)); b.pop(); }
      b.push(mulAll(tr(0, 4.36, 0.02), rotY(PI / 4))); b.lathe([[0, -0.15], [0.1, 0], [0, 0.15]], 4, C(0.3, 1, 0.6, 0.7)); b.pop();
    }

    // ---- drapes: long thin translucent fins from the back of the mantle, tapering to points ----
    {
      const nu = F ? 3 : 1, nv = F ? 11 : 3;
      for (const sx of [-1, 1]) {
        const t0 = [sx * 0.3, 4.86, -0.24], t1 = [sx * 0.66, 4.76, -0.12], L = 3.3;
        grid(b, nu, nv, (u, v) => {
          const w = Math.pow(1 - v, 0.8), uu = 0.5 + (u - 0.5) * w, p = lerp(t0, t1, uu);
          return [p[0] + sx * (0.18 * v + 0.05 * Math.sin(v * 5)), p[1] - L * v, p[2] - 0.22 * v + 0.05 * Math.sin(v * 6 + u * 2)];
        }, (u, v) => C(u < 0.01 || u > 0.99 ? 1 : 0.3, Math.abs(u - 0.5) < 0.2 ? 0.5 : 0, 0, 0.3 + 0.15 * (1 - v)), false, sx < 0);
      }
      grid(b, F ? 2 : 1, F ? 10 : 3, (u, v) => { const w = 0.17 * Math.pow(1 - v, 0.7) + 0.01; return [(u - 0.5) * 2 * w, 4.88 - v * 3.9, -0.26 - 0.3 * v * v - 0.04 * Math.sin(v * 7)]; },
        (u, v) => C(u < 0.01 || u > 0.99 ? 1 : 0.3, Math.abs(u - 0.5) < 0.2 ? 0.6 : 0, 0, 0.3 + 0.15 * (1 - v)), false, true);
    }
    return b;
  }

  return {
    name: 'ancient',
    items: [
      { name: 'relic_lens', budget: 900, build: relicLens, colliders: [] },
      { name: 'relic_key', budget: 900, build: relicKey, colliders: [] },
      { name: 'relic_tablet', budget: 900, build: relicTablet, colliders: [] },
      { name: 'relic_sphere', budget: 900, build: relicSphere, colliders: [] },
      { name: 'relic_seed', budget: 900, build: relicSeed, colliders: [] },
      { name: 'socket_pillar', budget: 600, build: socketPillar, colliders: [{ type: 'box', x: 0, z: 0, hx: 0.38, hz: 0.38, rot: 0, top: 1.1, solid: true }], attach: [PIL_SEAT] },
      { name: 'floor_plate', budget: 300, build: floorPlate, colliders: [] },
      { name: 'dais', budget: 1500, build: dais, colliders: DAIS_COL, attach: [DAIS_EMIT] },
      { name: 'monolith', budget: 400, build: monolith, colliders: [{ type: 'box', x: 0, z: 0, hx: 1.1, hz: 0.45, rot: 0, top: 10, solid: true }] },
      { name: 'portal_ring', budget: 800, build: portalRing, colliders: [] },
      // attach order: [chart, head] (names in attachNames)
      { name: 'entity', budget: 4000, build: entity, colliders: [], attach: [ENT_CHART, ENT_HEAD], attachNames: ['chart', 'head'] }
    ]
  };
}) };
