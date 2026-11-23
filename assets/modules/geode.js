window.MODDEF = { fn: (function (K) {
  // Geode kit (Signal Run, the giant crystal cavern behind D-10).
  //
  // TITANS (titan_a, titan_b, titan_c): unit frame, grows along +Y; the game stretches y by length and x/z by length x width.
  //   Exact hull the see-through shader assumes:
  //     regular hexagon, apothem A = 0.17, face normals at 0, 60 ... 300 degrees around +Y,
  //     prism from y = -0.06 (buried) to y = 0.78, six flat termination faces from the prism's top edges to one tip at (0, 1, 0).
  //   All surface detail stays inside the hull by at most 0.005 (growth steps, etch pits, chips, frost roughness).
  //   Colour: r = frost (0 clear .. 1 milky), g = line darkness (growth lines, etch pits, phantom outlines 0.4-0.8),
  //           b = edge brightness (1 on facet edges and chips, fading to 0 over 0.012), a = 0.
  //   Built as flat 2D polygons on each face, cut into bands and regions, then joined without cracks (no T-junctions).
  //
  // DRUSE (druse_patch, druse_cluster): natural size in metres, rock plane y = 0, +Y away from the rock.
  //   Same convention as crystals.js: r = inner glow (dim at the rock, bright at tips), g = tint shift, b = cloudiness, a = 0.
  const { MB, rnd, norm, sub, scale, cross, dot } = K;
  const PI = Math.PI, cl = v => Math.max(0, Math.min(1, v));
  const ss = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // =====================================================================================
  // TITAN HULL
  // =====================================================================================
  const A = 0.17, YB = -0.06, YS = 0.78, TIP = 1.0, HT = TIP - YS;
  const H0 = A * Math.tan(PI / 6);          // half width of a prism face (0.0981)
  const SL = Math.hypot(A, HT);             // slant height of a termination face (0.278)
  const W = 0.012;                          // width of the bright edge strips
  const NK = k => [Math.cos(k * PI / 3), 0, Math.sin(k * PI / 3)];
  const TK = k => [-Math.sin(k * PI / 3), 0, Math.cos(k * PI / 3)];
  const NT = k => norm([Math.cos(k * PI / 3), A / HT, Math.sin(k * PI / 3)]);       // termination face normal
  const CORNER = k => { const a = k * PI / 3 + PI / 6, r = A / Math.cos(PI / 6); return [r * Math.cos(a), YS, r * Math.sin(a)]; };   // corner between face k and k+1

  // face parameters (t, y): t across the face (along TK), y height. Termination faces use the same (t, y), seen straight on.
  function to3(kind, k, t, y) {
    const n = NK(k), tt = TK(k), s = kind === 'p' ? A : A * (TIP - y) / HT;
    return [n[0] * s + tt[0] * t, y, n[2] * s + tt[2] * t];
  }
  // termination: in-plane slant coordinate u <-> y
  const uOf = y => (y - YS) * SL / HT, yOf = u => YS + u * HT / SL;

  // hull edges (for edge brightness): vertical prism edges, shoulder edges, termination edges
  const EDGES = [];
  for (let k = 0; k < 6; k++) {
    const c = CORNER(k), c2 = CORNER((k + 1) % 6);
    EDGES.push([[c[0], 0, c[2]], c], [c, c2], [c, [0, TIP, 0]]);
  }
  function segDist(p, a, b) {
    const v = sub(b, a), w = sub(p, a), u = cl(dot(w, v) / dot(v, v));
    return Math.hypot(w[0] - v[0] * u, w[1] - v[1] * u, w[2] - v[2] * u);
  }
  const edgeB = P => { let d = 1e9; for (const e of EDGES) d = Math.min(d, segDist(P, e[0], e[1])); return P[1] < 0 ? 0 : cl(1 - d / W); };

  // ---------- 2D convex polygon tools (face parameter space) ----------
  const area2 = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const cen2 = P => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };
  function clean(P) { const o = []; for (const p of P) { const q = o[o.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-11) o.push(p); } if (o.length > 1 && Math.hypot(o[0][0] - o[o.length - 1][0], o[0][1] - o[o.length - 1][1]) < 1e-11) o.pop(); return o; }
  // keep the part of P on the left of the line a + s*d (sgn = 1) or on the right (sgn = -1)
  function half(P, a, d, sgn) {
    const side = q => sgn * (d[0] * (q[1] - a[1]) - d[1] * (q[0] - a[0])), o = [];
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length], sp = side(p), sq = side(q);
      if (sp >= -1e-13) o.push(p);
      if ((sp > 1e-13 && sq < -1e-13) || (sp < -1e-13 && sq > 1e-13)) {
        // intersection computed from the endpoints in a fixed order so both halves get identical numbers
        const flip = (p[0] > q[0]) || (p[0] === q[0] && p[1] > q[1]), P0 = flip ? q : p, Q0 = flip ? p : q;
        const s0 = flip ? sq : sp, s1 = flip ? sp : sq, t = s0 / (s0 - s1);
        o.push([P0[0] + (Q0[0] - P0[0]) * t, P0[1] + (Q0[1] - P0[1]) * t]);
      }
    }
    return clean(o);
  }
  const ok = P => P.length >= 3 && Math.abs(area2(P)) > 1e-11;
  const inConvex = (P, q) => { const s = Math.sign(area2(P)); for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if (s * ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) < -1e-12) return false; } return true; };
  const ccw = P => area2(P) < 0 ? P.slice().reverse() : P;

  // split every polygon passing pred by the line a + s*d
  function cutAll(polys, pred, a, d) {
    const out = [];
    for (const p of polys) {
      if (!pred(p)) { out.push(p); continue; }
      const L = half(p.pts, a, d, 1), R = half(p.pts, a, d, -1);
      if (ok(L) && ok(R)) { out.push(Object.assign({}, p, { pts: L, tag: Object.assign({}, p.tag) }), Object.assign({}, p, { pts: R, tag: Object.assign({}, p.tag) })); }
      else out.push(p);
    }
    return out;
  }
  const hcut = (polys, pred, y) => cutAll(polys, pred, [0, y], [1, 0]);
  const vcut = (polys, pred, t) => cutAll(polys, pred, [t, 0], [0, 1]);
  // cut out a convex region (CCW, face coords) from every polygon of face k it overlaps; the inside pieces get tag[name] = val
  function isolate(polys, pred, region, name, val) {
    region = ccw(region);
    const out = [];
    for (const p of polys) {
      if (!pred(p)) { out.push(p); continue; }
      let inside = p.pts; for (let i = 0; i < region.length && inside.length; i++) inside = half(inside, region[i], sub2(region[(i + 1) % region.length], region[i]), 1);
      if (!ok(inside)) { out.push(p); continue; }
      let rest = p.pts;
      for (let i = 0; i < region.length; i++) {
        const a = region[i], d = sub2(region[(i + 1) % region.length], region[i]);
        const outer = half(rest, a, d, -1), inner = half(rest, a, d, 1);
        if (ok(outer) && ok(inner)) { out.push(Object.assign({}, p, { pts: outer, tag: Object.assign({}, p.tag) })); rest = inner; }
        else if (!ok(inner)) { rest = null; break; }
      }
      if (rest && ok(rest)) { const tag = Object.assign({}, p.tag); tag[name] = val === undefined ? 1 : val; out.push(Object.assign({}, p, { pts: rest, tag })); }
      else out.push(p);
    }
    return out;
  }
  const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];

  // ear clipping for convex polygons that may carry extra points along their edges (never makes zero-area triangles)
  function triangulate(P) {
    const s = Math.sign(area2(P)) || 1, ar = (a, b, c) => s * ((P[b][0] - P[a][0]) * (P[c][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[c][0] - P[a][0]));
    let idx = P.map((_, i) => i); const out = [];
    const nonDeg = id => { for (let i = 0; i < id.length; i++) if (Math.abs(ar(id[(i + id.length - 1) % id.length], id[i], id[(i + 1) % id.length])) > 1e-13) return true; return false; };
    while (idx.length > 3) {
      let best = -1, bA = 1e-13;
      for (let i = 0; i < idx.length; i++) {
        const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length], v = ar(a, b, c);
        if (v > bA && nonDeg(idx.filter((_, j) => j !== i))) { best = i; bA = v; }
      }
      if (best < 0) return null;
      out.push([idx[(best + idx.length - 1) % idx.length], idx[best], idx[(best + 1) % idx.length]]); idx.splice(best, 1);
    }
    if (ar(idx[0], idx[1], idx[2]) > 1e-13) out.push(idx);
    return out;
  }

  // termination face triangle in in-plane coords (t, u); nested similar triangles; rings between them
  const FACE = [[-H0, 0], [H0, 0], [0, SL]];
  const r0 = H0 * SL / (H0 + Math.hypot(H0, SL)), f0 = (r0 - W) / r0;           // incircle radius; inner triangle scale
  const triIn = (s, cu) => FACE.map(v => [v[0] * s, cu + (v[1] - cu) * s]);      // FACE scaled by s about (0, cu)
  const toTY = v => [v[0], yOf(v[1])];
  // three trapezoids between an outer and an inner triangle (both CCW, same orientation)
  const ring = (k, O, I, tag) => [0, 1, 2].map(i => ({ k, kind: 't', pts: [O[i], O[(i + 1) % 3], I[(i + 1) % 3], I[i]].map(toTY), tag: Object.assign({}, tag) }));

  // ---------- titan builder ----------
  // cfg: { detail, seed, decorate(polys, R) -> polys, extra: [3D points to weld into edges], disp(P, kind) -> P, col(P, poly, t, y) -> [r, g], pitDepth }
  function titan(cfg) {
    // every face = an inner panel plus a ring of three edge strips W wide (they carry the edge glow, b)
    const iw = H0 - W, it = YS - W;
    const inner = triIn(f0, r0);
    let polys = [];
    for (let k = 0; k < 6; k++) {
      polys.push({ k, kind: 'p', pts: [[-H0, YB], [-iw, YB], [-iw, it], [-H0, YS]], tag: { strip: 1 } });
      polys.push({ k, kind: 'p', pts: [[iw, YB], [H0, YB], [H0, YS], [iw, it]], tag: { strip: 1 } });
      polys.push({ k, kind: 'p', pts: [[-iw, it], [iw, it], [H0, YS], [-H0, YS]], tag: { strip: 1 } });
      polys.push({ k, kind: 'p', pts: [[-iw, YB], [iw, YB], [iw, it], [-iw, it]], tag: { mid: 1 } });
      polys.push(...ring(k, FACE, inner, {}));
      polys.push({ k, kind: 't', pts: inner.map(toTY), tag: { inner: 1 } });
    }
    const isP = p => p.kind === 'p', isT = p => p.kind === 't';
    polys = cfg.decorate(polys, { isP, isT, inner });

    // ---- 3D, weld points, remove T-junctions ----
    const G = [];   // global unique points (undisplaced)
    const weld = P => { for (const q of G) if (Math.abs(q[0] - P[0]) < 1e-9 && Math.abs(q[1] - P[1]) < 1e-9 && Math.abs(q[2] - P[2]) < 1e-9) return q; G.push(P); return P; };
    for (const p of polys) p.P3 = p.pts.map(q => weld(to3(p.kind, p.k, q[0], q[1])));
    for (const e of (cfg.extra || [])) weld(e);
    for (const p of polys) {
      const pts = [], P3 = [], n = p.pts.length;
      for (let i = 0; i < n; i++) {
        const a = p.P3[i], b = p.P3[(i + 1) % n], v = sub(b, a), L2 = dot(v, v), ins = [];
        pts.push(p.pts[i]); P3.push(a);
        for (const q of G) {
          if (q === a || q === b) continue;
          const w = sub(q, a), u = dot(w, v) / L2; if (u < 1e-7 || u > 1 - 1e-7) continue;
          if (Math.hypot(w[0] - v[0] * u, w[1] - v[1] * u, w[2] - v[2] * u) < 1e-9) ins.push([u, q]);
        }
        ins.sort((x, y) => x[0] - y[0]);
        const qa = p.pts[i], qb = p.pts[(i + 1) % n];
        for (const [u, q] of ins) { pts.push([qa[0] + (qb[0] - qa[0]) * u, qa[1] + (qb[1] - qa[1]) * u]); P3.push(q); }
      }
      p.pts = pts; p.P3 = P3;
    }

    // ---- emit flat triangles ----
    const mb = new MB();
    const emit = (p, a, b, c, ca, cb, cc) => {
      const want = p.kind === 'p' ? NK(p.k) : NT(p.k);
      let nrm = cross(sub(b, a), sub(c, a));
      if (dot(nrm, want) < 0) { const t = b; b = c; c = t; const u = cb; cb = cc; cc = u; nrm = scale(nrm, -1); }
      nrm = norm(nrm);
      mb.tri(mb.v(a[0], a[1], a[2], nrm[0], nrm[1], nrm[2], ca), mb.v(b[0], b[1], b[2], nrm[0], nrm[1], nrm[2], cb), mb.v(c[0], c[1], c[2], nrm[0], nrm[1], nrm[2], cc));
    };
    const colour = (P, p, t, y, extraG) => { const rg = cfg.col(P, p, t, y); return [cl(rg[0]), cl(rg[1] + (extraG || 0)), cl(Math.max(edgeB(P), cfg.chipB ? cfg.chipB(P) : 0)), 0]; };
    for (const p of polys) {
      const D = p.P3.map(P => cfg.disp(P, p.kind)), C = p.P3.map((P, i) => colour(P, p, p.pts[i][0], p.pts[i][1]));
      if (p.tag.pit) {
        // shallow pyramidal etch pit: centre pushed into the face
        const c2 = cen2(p.pts), c3 = to3(p.kind, p.k, c2[0], c2[1]), nt = NT(p.k), dep = cfg.pitDepth || 0.0035;
        const cP = [c3[0] - nt[0] * dep, c3[1] - nt[1] * dep, c3[2] - nt[2] * dep], cC = colour(c3, p, c2[0], c2[1], 0.12);
        for (let i = 0; i < D.length; i++) emit(p, D[i], D[(i + 1) % D.length], cP, C[i], C[(i + 1) % D.length], cC);
        continue;
      }
      const T = triangulate(p.pts);
      if (!T) throw new Error('titan: could not triangulate a polygon');
      for (const [a, b, c] of T) emit(p, D[a], D[b], D[c], C[a], C[b], C[c]);
    }
    return mb;
  }

  // deterministic hash of a point (same point -> same number, on every face that shares it)
  const hashP = (P, s) => rnd(((Math.round(P[0] * 1e5) * 73856093) ^ (Math.round(P[1] * 1e5) * 19349663) ^ (Math.round(P[2] * 1e5) * 83492791) ^ s) >>> 0)();
  // inset a prism point by d (moves it onto the face plane d further in; corners stay shared)
  const insetP = (P, d) => [P[0] * (1 - d / A), P[1], P[2] * (1 - d / A)];
  const lerpTab = (tab, y) => { if (y <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) { const [y0, v0] = tab[i - 1], [y1, v1] = tab[i]; return y1 - y0 < 1e-12 ? v1 : v0 + (v1 - v0) * (y - y0) / (y1 - y0); } return tab[tab.length - 1][1]; };
  const baseFrost = y => 0.3 * (1 - ss(-0.04, 0.05, y));     // rock contact: a little milky where it is buried

  // place an equilateral etch triangle (in-plane coords t,u) inside the inner triangle
  function etchTri(R, innerU, size, placed) {
    for (let tries = 0; tries < 80; tries++) {
      const a = R(), b = R(), w0 = Math.min(a, b), w1 = Math.abs(a - b), w2 = 1 - Math.max(a, b);
      const c = [innerU[0][0] * w0 + innerU[1][0] * w1 + innerU[2][0] * w2, innerU[0][1] * w0 + innerU[1][1] * w1 + innerU[2][1] * w2];
      const rot = -PI / 2 + (R() - 0.5) * 0.3, rr = size / Math.sqrt(3);     // one point toward the base, like quartz trigons
      const tri = [0, 1, 2].map(i => [c[0] + rr * Math.cos(rot + i * 2 * PI / 3), c[1] + rr * Math.sin(rot + i * 2 * PI / 3)]);
      const shrink = innerU.map(v => { const m = cen2(innerU); return [m[0] + (v[0] - m[0]) * 0.88, m[1] + (v[1] - m[1]) * 0.88]; });
      if (!tri.every(q => inConvex(shrink, q))) continue;
      if (placed.some(q => Math.hypot(q[0] - c[0], q[1] - c[1]) < size * 1.6)) continue;
      placed.push(c); return tri.map(q => [q[0], yOf(q[1])]);
    }
    return null;
  }

  // ---------- titan_a: growth striations (small steps) + etched triangles ----------
  function titanA(detail) {
    const R = rnd(1101);
    // striation lines: [y, line width, darkness]; each is a thin band whose top edge is set 0.003 in (a tiny growth step)
    const lines = [];
    if (detail) {
      let y = 0.035;
      while (lines.length < 8) {
        y += 0.045 + 0.075 * R(); if (y > 0.71) break;
        const lw = 0.0045 + 0.004 * R(); lines.push([y, lw, 0.42 + 0.3 * R()]);
        if (R() < 0.45 && lines.length < 8) { const y2 = y + lw + 0.006 + 0.008 * R(); const lw2 = 0.004 + 0.003 * R(); if (y2 + lw2 < 0.72) { lines.push([y2, lw2, 0.4 + 0.25 * R()]); y = y2 + lw2; } }
        else y += lw;
      }
    }
    const step = 0.003, dTab = [[YB, 0]];
    for (const [y, lw] of lines) dTab.push([y, 0], [y + lw, step]);
    dTab.push([YS - W, 0], [YS, 0]);
    // etched triangles per face (in-plane size)
    const etchN = detail ? [2, 0, 1, 1, 0, 2] : [0, 0, 0, 0, 0, 0];
    return titan({
      decorate(polys, h) {
        for (const [y, lw, g] of lines) {
          polys = hcut(polys, p => p.tag.mid, y); polys = hcut(polys, p => p.tag.mid, y + lw);
          for (const p of polys) if (p.tag.mid) { const c = cen2(p.pts)[1]; if (c > y && c < y + lw) p.tag.line = g; }
        }
        for (let k = 0; k < 6; k++) {
          const placed = [];
          for (let e = 0; e < etchN[k]; e++) {
            const tri = etchTri(R, h.inner, 0.016 + 0.014 * R(), placed);
            if (tri) polys = isolate(polys, p => p.kind === 't' && p.k === k && p.tag.inner, tri, 'pit', 0.55 + 0.2 * R());
          }
        }
        return polys;
      },
      disp: (P, kind) => kind === 'p' && P[1] < YS - 1e-9 ? insetP(P, lerpTab(dTab, P[1])) : P,
      col: (P, p) => [baseFrost(P[1]), p.tag.line || p.tag.pit || 0],
      pitDepth: 0.0035
    });
  }

  // ---------- titan_b: two phantom outlines + chipped tip edges ----------
  function titanB(detail) {
    const R = rnd(2202);
    // phantoms: ghost outlines of two earlier, smaller tips, drawn on every termination face (similar triangles, nested)
    // [scale of the face triangle, line width (in-plane), darkness]; centred a little below the face's incentre
    const phantoms = detail ? [[0.6, 0.0055, 0.5], [0.34, 0.0045, 0.42]] : [];
    // chips: on some termination edges near the tip, [edge k, s start, s length, depth] (s: 0 shoulder corner .. 1 tip)
    const chips = [], extra = [], chipD = new Map(), chipZone = [];
    if (detail) {
      const spec = [[0, 0.62, 0.09, 0.0045], [0, 0.86, 0.07, 0.0035], [2, 0.74, 0.1, 0.005], [3, 0.9, 0.06, 0.004], [5, 0.58, 0.08, 0.004], [5, 0.8, 0.11, 0.0048]];
      for (const [k, s0, sl, dep] of spec) {
        const c = CORNER(k), tip = [0, TIP, 0], at = s => [c[0] + (tip[0] - c[0]) * s, c[1] + (tip[1] - c[1]) * s, c[2] + (tip[2] - c[2]) * s];
        const bis = norm(scale([NT(k)[0] + NT((k + 1) % 6)[0], NT(k)[1] + NT((k + 1) % 6)[1], NT(k)[2] + NT((k + 1) % 6)[2]], -1));
        // a conchoidal nick: steep on the tip side, gentle on the other, with a slightly uneven floor
        const prof = [[0, 0], [0.22, 0.75 + 0.2 * R()], [0.55, 1], [0.82, 0.8 + 0.15 * R()], [1, 0]];
        for (const [u, d] of prof) { const P = at(s0 + sl * u); extra.push(P); if (d > 0) chipD.set(P, scale(bis, d * dep)); }
        chipZone.push([at(s0 - 0.02), at(s0 + sl + 0.02)]);
      }
    }
    const cu = r0 * 0.82, tris = [triIn(f0, r0)];
    for (const [sc0, lw] of phantoms) { const o = triIn(sc0, cu), ir = sc0 * r0, ic = cu + (r0 - cu) * sc0; tris.push(o, o.map(v => [v[0] * (ir - lw) / ir, ic + (v[1] - ic) * (ir - lw) / ir])); }
    for (let i = 1; i < tris.length; i++) if (!tris[i].every(q => inConvex(tris[i - 1], q))) throw new Error('titan_b: phantom outlines overlap');
    return titan({
      decorate(polys) {
        if (!phantoms.length) return polys;
        polys = polys.filter(p => !p.tag.inner);
        for (let k = 0; k < 6; k++) {
          for (let i = 0; i < tris.length - 1; i++) polys.push(...ring(k, tris[i], tris[i + 1], i % 2 ? { ph: phantoms[(i - 1) >> 1][2] } : {}));
          polys.push({ k, kind: 't', pts: tris[tris.length - 1].map(toTY), tag: {} });
        }
        return polys;
      },
      extra,
      disp: (P, kind) => { const d = chipD.get(P); return d ? [P[0] + d[0], P[1] + d[1], P[2] + d[2]] : P; },
      chipB: P => { for (const [a, b] of chipZone) if (segDist(P, a, b) < 1e-6) return 1; return 0; },
      col: (P, p) => [baseFrost(P[1]), p.tag.ph || 0]
    });
  }

  // ---------- titan_c: frosted, milky lower third with a fine rough skin; clean glass above ----------
  function titanC(detail) {
    const FT = 0.30;                                     // frost fades out around here
    const rows = detail ? [0.0, 0.06, 0.12, 0.18, 0.23, 0.28, 0.33, 0.375, 0.42] : [0.3];
    const wob = P => { const a = Math.atan2(P[2], P[0]); return 0.035 * Math.sin(a * 5 + 1.3) + 0.02 * Math.sin(a * 11 + 0.4); };
    const frost = P => Math.max(baseFrost(P[1]), P[1] > 0.415 ? 0 : 0.82 * (1 - ss(FT - 0.08, FT + 0.06, P[1] + wob(P))));   // wob <= 0.055, so it is 0 by y 0.415
    return titan({
      decorate(polys) {
        for (const y of rows) polys = hcut(polys, p => p.tag.mid, y);
        if (detail) {
          polys = hcut(polys, p => p.tag.strip, 0.2);         // strips: keep frost from streaking up the edges
          polys = hcut(polys, p => p.tag.strip, 0.42);
          for (const t of [-0.033, 0.033]) polys = vcut(polys, p => p.tag.mid && cen2(p.pts)[1] < 0.42, t);
        }
        return polys;
      },
      // micro-roughness: every vertex in the frosted zone sinks 0..0.004 (hash of its position, so shared corners agree)
      disp: (P, kind) => {
        if (!detail || kind !== 'p' || P[1] >= 0.4 || P[1] < -0.059) return P;
        return insetP(P, 0.004 * hashP(P, 77) * (1 - ss(0.28, 0.4, P[1])));
      },
      col: P => [frost(P), 0]
    });
  }

  // =====================================================================================
  // DRUSE (crystal-kit convention, natural size)
  // =====================================================================================
  function face(R, milkyChance) { return { j: R() - 0.5, g: R() - 0.5, m: R() < (milkyChance || 0.18) ? 1 : 0 }; }
  function colr(hn, f, kind, G) {
    let r, b;
    if (kind === 'tip') { r = 0.3 + 0.36 * ss(0.55, 1.0, hn) + f.j * 0.34; b = 0.12 + f.m * 0.25 - 0.08 * ss(0.7, 1, hn); }
    else if (kind === 'matrix') { r = 0.06 + 0.05 * f.j; b = 0.9; }
    else { const r0 = 0.06 + 0.42 * ss(-0.02, 0.95, hn); r = Math.max(r0 * 0.6, r0 + f.j * 0.34 * ss(0.0, 0.35, hn)); b = 0.82 - 0.62 * ss(-0.04, 0.3, hn) + f.m * 0.32; }
    return [cl(r * G), cl(0.5 + f.g * 0.62), cl(b), 0];
  }
  function ftri(mb, a, b, c, ca, cb, cc, ref) {
    let n = norm(cross(sub(b, a), sub(c, a)));
    const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (dot(n, sub(cen, ref)) < 0) { const t = b; b = c; c = t; const u = cb; cb = cc; cc = u; n = scale(n, -1); }
    mb.tri(mb.v(a[0], a[1], a[2], n[0], n[1], n[2], ca), mb.v(b[0], b[1], b[2], n[0], n[1], n[2], cb), mb.v(c[0], c[1], c[2], n[0], n[1], n[2], cc));
  }
  // irregular cross-section: n cut lines at unequal distances (opposite faces stay parallel)
  function section(R, n, jit) {
    const rot = R() * PI * 2, L = [];
    for (let j = 0; j < n; j++) L.push([rot + j * 2 * PI / n + (R() - 0.5) * 0.06, 1 + (R() * 2 - 1) * jit]);
    const P = [];
    for (let j = 0; j < n; j++) {
      const [t0, d0] = L[j], [t1, d1] = L[(j + 1) % n], det = Math.cos(t0) * Math.sin(t1) - Math.sin(t0) * Math.cos(t1);
      P.push([(d0 * Math.sin(t1) - d1 * Math.sin(t0)) / det, (Math.cos(t0) * d1 - Math.cos(t1) * d0) / det]);
    }
    return P;
  }
  // one crystal: B base point, F axis, len, rad, sec, rings [{h, k, off, dh, kind}], tip {h, ridge, dB, off}
  function crystal(mb, o) {
    const R = rnd(o.seed), F = norm(o.F), S = norm(cross(F, Math.abs(F[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), U = cross(S, F), B = o.B, len = o.len, G = o.G || 1;
    const Wp = (h, x, z) => [B[0] + F[0] * h + S[0] * x + U[0] * z, B[1] + F[1] * h + S[1] * x + U[1] * z, B[2] + F[2] * h + S[2] * x + U[2] * z];
    const sec = o.sec, n = sec.length;
    const rings = o.rings.map(rg => { const off = rg.off || [0, 0]; return sec.map((p, i) => { const x = p[0] * o.rad * rg.k + off[0], z = p[1] * o.rad * rg.k + off[1]; return { h: rg.h + (rg.dh ? rg.dh(i) : 0), x, z, off }; }); });
    const P = q => Wp(q.h, q.x, q.z), cols = sec.map(() => face(R, o.milky));
    for (let r = 0; r < rings.length - 1; r++) {
      const r0 = rings[r], r1 = rings[r + 1], kind = o.rings[r + 1].kind || 'side';
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n, a = r0[i], b = r0[i1], c = r1[i1], d = r1[i], cf = cols[i], ledge = Math.abs(a.h - d.h) < o.rad * 0.1;
        const f = (ledge || kind === 'tip') ? face(R, o.milky) : { j: cf.j + (R() - 0.5) * 0.08, g: cf.g + (R() - 0.5) * 0.06, m: cf.m };
        const hmin = Math.min(a.h, b.h, c.h, d.h), ref = Wp(hmin - o.rad * 0.6, (r0[0].off[0] + r1[0].off[0]) / 2, (r0[0].off[1] + r1[0].off[1]) / 2);
        const C = q => colr(q.h / len, f, kind, G);
        ftri(mb, P(a), P(b), P(c), C(a), C(b), C(c), ref);
        ftri(mb, P(a), P(c), P(d), C(a), C(c), C(d), ref);
      }
    }
    const top = rings[rings.length - 1], toff = top[0].off;
    let hmin = 1e9; for (const q of top) hmin = Math.min(hmin, q.h);
    const ref = Wp(hmin - o.rad * 1.2, toff[0], toff[1]);
    const t = o.tip, ra = (t.ang === undefined ? R() * PI : t.ang), rd = [Math.cos(ra), Math.sin(ra)], rl = (t.ridge || 0) * o.rad;
    const cx = toff[0] + (t.off ? t.off[0] * o.rad : 0), cz = toff[1] + (t.off ? t.off[1] * o.rad : 0);
    const TA = { h: t.h, x: cx + rd[0] * rl / 2, z: cz + rd[1] * rl / 2 }, TB = { h: t.h - (t.dB || 0), x: cx - rd[0] * rl / 2, z: cz - rd[1] * rl / 2 };
    const side = top.map(q => rl > 0 && ((q.x - cx) * rd[0] + (q.z - cz) * rd[1]) < 0 ? TB : TA);
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n, a = top[i], b = top[i1], X = side[i], Y = side[i1], f = face(R, o.milky * 0.5), C = q => colr(q.h / len, f, 'tip', G);
      ftri(mb, P(a), P(b), P(Y), C(a), C(b), C(Y), ref);
      if (X !== Y) ftri(mb, P(a), P(Y), P(X), C(a), C(Y), C(X), ref);
    }
  }
  const dirOf = (tilt, az) => [Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az)];
  // full-detail point: base, body (optional growth step), zig-zag shoulder, kinked termination, chisel tip
  function fullPoint(R, rad, len, opt) {
    opt = opt || {};
    const tipL = rad * (opt.tipK || 2.2), sh = len - tipL, taper = opt.taper === undefined ? 0.08 : opt.taper, zz = rad * 0.22;
    const k = h => 1 - taper * Math.max(0, h) / len, rings = [{ h: opt.h0 === undefined ? -0.03 : opt.h0, k: 1.02 }];
    for (const tt of (opt.body || [])) {
      const h = sh * tt; rings.push({ h, k: k(h) * (1 + (R() - 0.5) * 0.03) });
      if (opt.steps && opt.steps.indexOf(tt) >= 0) rings.push({ h: h + rad * 0.03, k: k(h) * 0.95 });
    }
    rings.push({ h: sh, k: k(sh), dh: i => (i % 2 ? zz : -zz) * (0.6 + 0.8 * R()) });
    if (opt.kink) rings.push({ h: sh + tipL * 0.5, k: k(sh) * 0.5, kind: 'tip', off: [(R() - 0.5) * rad * 0.15, (R() - 0.5) * rad * 0.15], dh: i => (i % 2 ? zz : -zz) * 0.5 * R() });
    return { rings, tip: { h: len, ridge: opt.ridge === undefined ? 0.35 + 0.3 * R() : opt.ridge, dB: rad * (0.1 + 0.25 * R()), off: [(R() - 0.5) * 0.25, (R() - 0.5) * 0.25] } };
  }
  // simple point: one band + pyramid (or pyramid only)
  function simplePoint(rad, len, h0, pyramidOnly, tipK) {
    if (pyramidOnly) return { rings: [{ h: h0, k: 1 }], tip: { h: len, ridge: 0 } };
    return { rings: [{ h: h0, k: 1 }, { h: len - rad * (tipK || 2.0), k: 0.93 }], tip: { h: len, ridge: 0 } };
  }
  // fused rock-matrix crust at the root of a cluster
  function matrix(mb, R, rx, rz, sides, h) {
    const pts = [], apex = [(R() - 0.5) * rx * 0.2, h, (R() - 0.5) * rz * 0.2], ref = [0, -0.2, 0];
    for (let i = 0; i < sides; i++) { const a = i / sides * PI * 2 + (R() - 0.5) * 0.4, s = 0.75 + 0.35 * R(); pts.push([Math.cos(a) * rx * s, -0.02 - 0.02 * R(), Math.sin(a) * rz * s]); }
    for (let i = 0; i < sides; i++) { const f = face(R), a = pts[i], b = pts[(i + 1) % sides], C = colr(0, f, 'matrix', 1); ftri(mb, a, b, apex, C, C, C, ref); }
  }

  // ---------- druse_patch: a 1.6 m carpet of small points, for tiling over whole walls ----------
  const PATCH = (() => {
    const R = rnd(3303), out = [], N = 62, RMAX = 0.8;
    const edge = a => RMAX * (0.9 + 0.07 * Math.sin(3 * a + 0.7) + 0.04 * Math.sin(5 * a + 2.1));     // slightly ragged outline
    // sizes first, biggest placed first (they sit nearer the middle so tiled copies blend at their edges)
    const sizes = []; for (let i = 0; i < N; i++) { const u = R(); sizes.push(0.05 + 0.3 * Math.pow(u, 1.8)); }
    sizes.sort((a, b) => b - a);
    for (const len of sizes) {
      const rad = len * (0.19 + 0.07 * R()) + 0.011;
      let best = null;
      for (let tries = 0; tries < 400 && !best; tries++) {
        const a = R() * PI * 2, rr = Math.sqrt(R()), lim = edge(a) * (1 - 0.45 * (len - 0.05) / 0.3) - rad * 0.5, x = Math.cos(a) * rr * lim, z = Math.sin(a) * rr * lim;
        const relax = tries > 250 ? 0.62 : 0.78;
        if (out.every(c => Math.hypot(c.x - x, c.z - z) > (c.rad + rad) * relax)) best = { x, z };
      }
      if (!best) continue;
      const d = Math.hypot(best.x, best.z) / RMAX, az = Math.atan2(best.z, best.x) + (R() - 0.5) * 1.8;
      const tilt = 0.04 + 0.26 * d + 0.1 * R();
      out.push({ x: best.x, z: best.z, len, rad, tilt, az, seed: 3400 + out.length, G: 0.8 + 0.25 * R() });
    }
    return out;
  })();
  function drusePatch(detail) {
    const mb = new MB();
    PATCH.forEach((c, i) => {
      const Rq = rnd(c.seed), big = i < 22;
      if (!detail && i >= 26) return;
      const sides = detail ? (big ? 6 : 4) : 3, sec = section(Rq, sides, 0.16);
      const spec = detail ? simplePoint(c.rad, c.len, -0.03, false, 1.8 + 0.6 * Rq()) : simplePoint(c.rad, c.len, -0.03, i >= 12, 1.9);
      crystal(mb, Object.assign({ B: [c.x, 0, c.z], F: dirOf(c.tilt, c.az), len: c.len, rad: c.rad, sec, G: c.G, seed: c.seed + 50, milky: 0.2 }, spec));
    });
    return mb;
  }

  // ---------- druse_cluster: a 0.8 m sea-urchin burst of 13 crystals from one root ----------
  const CLUSTER = (() => {
    const R = rnd(4404), out = [];
    // [tilt, azimuth, length]: long ones near upright, short ones lying out sideways
    const golden = PI * (3 - Math.sqrt(5));
    for (let q = 0; q < 13; q++) {
      const tilt = q === 0 ? 0.08 : 0.32 + 1.0 * Math.pow(q / 12, 0.8) + (R() - 0.5) * 0.14;
      const az = q * golden + (R() - 0.5) * 0.5;
      const len = q === 0 ? 0.9 : Math.max(0.2, 0.82 - 0.55 * (tilt - 0.3) / 1.0 + (R() - 0.5) * 0.12);
      const rad = 0.018 + 0.05 * len;
      out.push({ tilt, az, len, rad, seed: 4500 + q });
    }
    return out;
  })();
  function druseCluster(detail) {
    const mb = new MB(), R = rnd(4405);
    CLUSTER.forEach((c, q) => {
      const Rq = rnd(c.seed), F = dirOf(c.tilt, c.az), B = [F[0] * 0.02, 0.012, F[2] * 0.02];
      const sides = detail ? 6 : (q === 0 ? 6 : 3), sec = section(Rq, sides, 0.15), h0 = -0.04;
      let spec;
      if (!detail) spec = simplePoint(c.rad, c.len, h0, false, 2.1);
      else if (q < 6) spec = fullPoint(Rq, c.rad, c.len, { body: [0.12, 0.42, 0.7], steps: q < 3 ? [0.42] : [], kink: true, h0, ridge: 0.3 + 0.3 * Rq() });
      else spec = fullPoint(Rq, c.rad, c.len, { body: [0.35], kink: q < 10, h0 });
      crystal(mb, Object.assign({ B, F, len: c.len, rad: c.rad, sec, G: 0.88 + 0.12 * c.len, seed: c.seed + 40, milky: 0.18 }, spec));
    });
    if (detail) matrix(mb, R, 0.11, 0.1, 9, 0.035);
    return mb;
  }

  return {
    name: 'geode',
    items: [
      { name: 'titan_a', budget: 700, build: titanA, colliders: [] },
      { name: 'titan_b', budget: 700, build: titanB, colliders: [] },
      { name: 'titan_c', budget: 700, build: titanC, colliders: [] },
      { name: 'druse_patch', budget: 900, build: drusePatch, colliders: [] },
      { name: 'druse_cluster', budget: 900, build: druseCluster, colliders: [] }
    ]
  };
}) };
