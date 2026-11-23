window.MODDEF = { fn: (function (K) {
  // Bioluminescent cave life for the crystal cavern.
  // Local frame: the rock is the plane y = 0, +Y points away from the rock (surface normal); bases sink to y = -0.1.
  // The game turns +Y onto the surface normal and scales each copy 0.6-1.8x, so everything is built at natural size in metres.
  // Colour: rgb = colour, a = glow strength (0..0.15 dark structure, 0.6..1 glowing parts).
  const { MB, rnd, norm, sub, add, scale, cross, dot, lerp } = K;
  const PI = Math.PI, TAU = PI * 2;
  const cl = v => Math.max(0, Math.min(1, v));
  const mix = (a, b, t) => [cl(a[0] + (b[0] - a[0]) * t), cl(a[1] + (b[1] - a[1]) * t), cl(a[2] + (b[2] - a[2]) * t)];
  const G = (c, a) => [c[0], c[1], c[2], a];                    // colour + glow
  const mixG = (a, b, t) => { const m = mix(a, b, t); return [m[0], m[1], m[2], a[3] + (b[3] - a[3]) * t]; };

  // ---------- alien palette ----------
  const CYAN = [0.30, 0.95, 1.00], TEAL = [0.10, 0.85, 0.72], VIOLET = [0.62, 0.36, 1.00], MAGENTA = [1.00, 0.28, 0.78];
  const BLUE = [0.22, 0.40, 1.00], PALE = [0.80, 1.00, 1.00], PINK = [1.00, 0.70, 0.95];
  const ROCKMAT = [0.09, 0.11, 0.15], DTEAL = [0.06, 0.20, 0.22], DVIO = [0.15, 0.10, 0.24], STALK = [0.16, 0.13, 0.22], DBLUE = [0.07, 0.09, 0.22];
  const HUES = [CYAN, TEAL, VIOLET, MAGENTA, BLUE];

  // ---------- shared shapes ----------
  // round strand following pts; rfn(t) radius, cfn(t) colour (per ring), segs sides
  function strand(b, pts, rfn, segs, cfn) {
    const n = pts.length; if (n < 2) return; const rings = []; let up = [0, 0, 1];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), d = norm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)])); if (Math.abs(dot(d, up)) > 0.95) up = [1, 0, 0];
      const s = norm(cross(d, up)), u = cross(s, d); up = u; const rr = rfn(t), c = cfn(t), ring = [];
      for (let k = 0; k < segs; k++) { const a = k / segs * TAU, nx = s[0] * Math.cos(a) + u[0] * Math.sin(a), ny = s[1] * Math.cos(a) + u[1] * Math.sin(a), nz = s[2] * Math.cos(a) + u[2] * Math.sin(a); ring.push(b.v(pts[i][0] + nx * rr, pts[i][1] + ny * rr, pts[i][2] + nz * rr, nx, ny, nz, c)); }
      rings.push(ring);
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < segs; k++) b.quad(rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]);
  }
  // pointed frond: open pyramid from a ring of `sides` points round `base` up to `tip` (sides tris, flat faces)
  function spike(b, base, tip, r, sides, c0, c1, rot) {
    const d = norm(sub(tip, base)); let up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]; const s = norm(cross(d, up)), u = cross(s, d), P = [];
    for (let k = 0; k < sides; k++) { const a = (rot || 0) + k / sides * TAU; P.push(add(base, add(scale(s, Math.cos(a) * r), scale(u, Math.sin(a) * r)))); }
    for (let k = 0; k < sides; k++) { const p0 = P[k], p1 = P[(k + 1) % sides], n = norm(cross(sub(p1, p0), sub(tip, p0)));
      b.tri(b.v(p0[0], p0[1], p0[2], n[0], n[1], n[2], c0), b.v(p1[0], p1[1], p1[2], n[0], n[1], n[2], c0), b.v(tip[0], tip[1], tip[2], n[0], n[1], n[2], c1)); }
  }
  // droplet / bead: bipyramid with `sides` round the waist (2*sides tris), smooth radial normals
  function bead(b, c, r, h, sides, col, rot) {
    const top = b.v(c[0], c[1] + h, c[2], 0, 1, 0, col), bot = b.v(c[0], c[1] - h, c[2], 0, -1, 0, col), ring = [];
    for (let k = 0; k < sides; k++) { const a = (rot || 0) + k / sides * TAU, x = Math.cos(a), z = Math.sin(a); ring.push(b.v(c[0] + x * r, c[1], c[2] + z * r, x, 0, z, col)); }
    for (let k = 0; k < sides; k++) { const k1 = (k + 1) % sides; b.tri(top, ring[k1], ring[k]); b.tri(bot, ring[k], ring[k1]); }
  }
  // lumpy low mat: polar grid, radius R(theta) and height H(r01, theta) ; colour fn(r01, theta)
  function mat(b, nu, nv, R, H, cfn) {
    b.surf(nu, nv, (u, v) => { const th = u * TAU, r = v * R(th); return [Math.cos(th) * r, H(v, th), Math.sin(th) * r]; }, (u, v) => cfn(v, u * TAU), true);
  }
  const wob = (seed, n) => { const r = rnd(seed), ph = [], am = []; for (let i = 0; i < n; i++) { ph.push(r() * TAU); am.push((0.5 + r()) / (i + 1.5)); } return th => { let s = 0; for (let i = 0; i < n; i++) s += am[i] * Math.sin((i + 2) * th + ph[i]); return s; }; };

  // =====================================================================
  // glow_moss: a lumpy 1.5 m mat with glowing frond tips and dots
  function glowMoss(detail) {
    const b = new MB(), r = rnd(101), hi = detail > 0;
    const edge = wob(11, 4), lump = wob(12, 3);
    const R = th => 0.75 * (1 + 0.16 * edge(th));
    const H = (v, th) => -0.06 + 0.15 * (1 - v * v) * (0.8 + 0.35 * lump(th + v * 2)) + 0.02 * Math.sin(v * 9 + th * 3);
    const hAt = (x, z) => { const th = Math.atan2(z, x), v = Math.min(1, Math.hypot(x, z) / R(th)); return H(v, th); };
    mat(b, hi ? 10 : 6, hi ? 3 : 2, R, H, (v, th) => {
      const g = hi ? 0.06 : 0.3;                                        // far version: the mat itself carries some of the glow
      const c = mix(DTEAL, DVIO, 0.5 + 0.5 * Math.sin(th * 2 + v * 4));
      return G(mix(c, TEAL, hi ? 0.1 : 0.45 * (1 - v)), g * (1 - 0.6 * v));
    });
    // fronds: thin spikes, dark at the root, glowing at the tip
    const nF = hi ? 58 : 8;
    for (let i = 0; i < nF; i++) {
      const th = r() * TAU, rr = Math.sqrt(r()) * 0.88, x = Math.cos(th) * R(th) * rr, z = Math.sin(th) * R(th) * rr, y = hAt(x, z) - 0.01;
      const hue = r() < 0.65 ? CYAN : (r() < 0.6 ? TEAL : VIOLET), len = (hi ? 0.07 : 0.13) + r() * 0.08 * (1 - rr * 0.5), lean = 0.35 * rr;
      const tip = [x + Math.cos(th) * lean * len + (r() - 0.5) * 0.04, y + len, z + Math.sin(th) * lean * len + (r() - 0.5) * 0.04];
      spike(b, [x, y, z], tip, hi ? 0.012 : 0.03, 3, G(mix(DTEAL, hue, 0.25), 0.15), G(mix(hue, PALE, 0.35), 1.0), r() * TAU);
    }
    // glowing spore dots sitting on the lumps
    const nD = hi ? 6 : 0;
    for (let i = 0; i < nD; i++) {
      const th = r() * TAU, rr = 0.2 + r() * 0.55, x = Math.cos(th) * R(th) * rr, z = Math.sin(th) * R(th) * rr, s = 0.025 + r() * 0.02;
      bead(b, [x, hAt(x, z) + s * 0.4, z], s, s * 0.8, 4, G(r() < 0.5 ? MAGENTA : mix(CYAN, PALE, 0.4), 0.95), r());
    }
    return b;
  }

  // =====================================================================
  // glow_caps: 5-12 mushroom caps on dark stalks, glowing gills and rims
  function capShape(b, x, z, H, Rc, tilt, hue, segs, hi, r) {
    // stalk: slightly curved, dark, thicker at the foot
    const sr = Math.max(0.012, Rc * 0.16), top = [x + tilt[0] * H, H, z + tilt[1] * H];
    const mid = [x + tilt[0] * H * 0.35 + (r() - 0.5) * 0.03, H * 0.5, z + tilt[1] * H * 0.35 + (r() - 0.5) * 0.03];
    if (hi) strand(b, [[x, -0.08, z], mid, top], t => sr * (1.35 - 0.45 * t), 4, t => G(mix(STALK, hue, 0.12 * t), 0.03 + 0.12 * t));
    else strand(b, [[x, -0.08, z], top], () => sr * 1.1, 3, () => G(STALK, 0.08));
    // cap (lathe round its own up axis): underside gills glow, rim glows brightest, top dark with a faint sheen
    const cH = Rc * (0.45 + r() * 0.3), gill = G(mix(hue, PALE, 0.15), 0.9), rim = G(mix(hue, PALE, 0.45), 1.0), crown = G(mix(DVIO, hue, 0.25), 0.12), shoulder = G(mix(DVIO, hue, 0.45), 0.22);
    const prof = hi ? [[0, -cH * 0.1, gill], [Rc * 0.92, -cH * 0.12, rim], [Rc, cH * 0.05, shoulder], [Rc * 0.7, cH * 0.6, crown], [0, cH]]
                    : [[0, -cH * 0.1, gill], [Rc, -cH * 0.05, G(mix(DVIO, hue, 0.55), 0.6)], [0, cH]];
    const ax = norm([tilt[0] * 1.6, 1, tilt[1] * 1.6]), s = norm(cross(ax, [0, 0, 1])), u = cross(s, ax);
    b.push(new Float64Array([s[0], s[1], s[2], 0, ax[0], ax[1], ax[2], 0, u[0], u[1], u[2], 0, top[0], top[1], top[2], 1]));
    const ph = r() * TAU; b.lathe(prof, segs, crown, ph, ph + TAU);
    b.pop();
  }
  function glowCaps(detail) {
    const b = new MB(), r = rnd(202), hi = detail > 0, caps = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const big = i < 3, a = i * 2.4 + r() * 0.6, d = big ? 0.05 + r() * 0.12 : 0.15 + r() * 0.25;
      const H = big ? 0.6 + r() * 0.35 : 0.18 + r() * 0.35, Rc = big ? 0.12 + r() * 0.06 : 0.05 + H * 0.18;
      caps.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, H, Rc, tilt: [Math.cos(a) * (0.08 + r() * 0.15), Math.sin(a) * (0.08 + r() * 0.15)], hue: HUES[[0, 3, 2, 1, 0, 2, 3, 4, 1][i]] });
    }
    caps.sort((p, q) => q.H - p.H);
    caps.forEach((c, i) => {
      if (!hi && i >= 4) return;
      capShape(b, c.x, c.z, c.H, c.Rc, c.tilt, c.hue, hi ? (i < 4 ? 7 : 5) : 4, hi, rnd(300 + i));
    });
    return b;
  }

  // =====================================================================
  // filament_curtain: dark ceiling mat with 15-30 glowing beaded threads hanging along +Y
  function filamentCurtain(detail) {
    const b = new MB(), r = rnd(303), hi = detail > 0;
    const edge = wob(31, 3), lump = wob(32, 3);
    const R = th => 0.6 * (1 + 0.2 * edge(th));
    const H = (v, th) => -0.07 + 0.11 * (1 - v * v) * (0.8 + 0.4 * lump(th)) ;
    mat(b, hi ? 8 : 5, hi ? 2 : 1, R, H, (v, th) => G(mix(DBLUE, DVIO, 0.5 + 0.5 * Math.sin(th * 3)), 0.05 + 0.1 * v));
    // every thread is laid out the same way at both detail levels; far away keeps every third one
    const N = 17;
    for (let i = 0; i < N; i++) {
      const th = i * 2.399 + r() * 0.5, rr = Math.sqrt((i + 0.5) / N) * 0.85, x = Math.cos(th) * R(th) * rr, z = Math.sin(th) * R(th) * rr;
      const L = 1.5 + r() * 2.5 * (1 - rr * 0.5), sway = [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25], hue = r() < 0.6 ? CYAN : (r() < 0.5 ? VIOLET : BLUE);
      const y0 = H(rr, th) - 0.02, pt = t => [x + sway[0] * t * t, y0 + L * t, z + sway[1] * t * t];
      // droplets strung along the thread, the largest at the tip
      const drops = [0.32 + r() * 0.2, 0.62 + r() * 0.2, 1.0].filter((t, k) => k === 2 || r() >= 0.3).map(t => ({ t, s: t === 1 ? 0.032 : 0.018 + r() * 0.01, rot: r() * TAU }));
      if (!hi && i % 3) continue;
      const pts = hi ? [pt(0), pt(0.5), pt(1)] : [pt(0), pt(1)];
      strand(b, pts, t => (hi ? 0.014 : 0.024) * (1 - 0.5 * t), 3, t => G(mix(mix(DBLUE, hue, 0.3), hue, t), 0.35 + 0.5 * t));
      for (const d of drops) {
        if (!hi && d.t < 1) continue;
        const tipD = d.t === 1, sz = d.s * (hi ? 1 : 1.6), p = pt(d.t);
        bead(b, [p[0], p[1] + (tipD ? sz * 0.6 : 0), p[2]], sz, sz * (tipD ? 1.6 : 1.2), 3, G(mix(hue, PALE, tipD ? 0.45 : 0.2), 1.0), d.rot);
      }
    }
    return b;
  }

  // =====================================================================
  // bulb_pods: translucent-looking glowing bulbs on short curving stalks
  function glowBulbs(detail) {
    const b = new MB(), r = rnd(404), hi = detail > 0;
    // small dark root crust
    if (hi) mat(b, 7, 1, th => 0.26 * (1 + 0.15 * Math.sin(th * 3 + 1)), (v, th) => -0.08 + 0.1 * (1 - v), () => G(STALK, 0.04));
    const pods = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + r() * 0.5, d = i === 0 ? 0.02 : 0.08 + r() * 0.12, H = i === 0 ? 0.62 + r() * 0.15 : 0.22 + r() * 0.45, Rb = 0.06 + H * 0.12 + r() * 0.03;
      pods.push({ a, d, H, Rb, hue: [CYAN, VIOLET, TEAL, MAGENTA, CYAN, BLUE, VIOLET][i] });
    }
    pods.sort((p, q) => q.H - p.H);
    pods.forEach((p, i) => {
      if (!hi && i >= 3) return;
      const segs = hi ? (i < 4 ? 7 : 6) : 5, lean = (p.H * 0.35 + 0.05) * (i === 0 ? 0.4 : 1);
      const ox = Math.cos(p.a) * p.d, oz = Math.sin(p.a) * p.d, dx = Math.cos(p.a), dz = Math.sin(p.a);
      const stemTop = p.H - p.Rb * 1.6;
      // curving stalk: leans outward and bends back up under the bulb
      const pt = t => [ox + dx * lean * Math.sin(t * PI * 0.5), -0.06 + (stemTop + 0.06) * t, oz + dz * lean * Math.sin(t * PI * 0.5)];
      const top = pt(1);
      if (hi) strand(b, [pt(0), pt(0.55), top], t => p.Rb * (0.32 - 0.12 * t), 4, t => G(mix(STALK, p.hue, 0.2 * t), 0.04 + 0.2 * t * t));
      else strand(b, [pt(0), top], () => p.Rb * 0.3, 3, () => G(STALK, 0.08));
      // bulb: neck -> dim lower skin -> bright body -> pale hot crown (reads as light shining through)
      const R = p.Rb, hh = R * 1.5, body = G(p.hue, 0.62), hot = G(mix(p.hue, PALE, 0.35), 0.95), lower = G(mix(DVIO, p.hue, 0.55), 0.32), neck = G(mix(STALK, p.hue, 0.3), 0.2);
      const prof = hi ? [[R * 0.3, 0, neck], [R * 0.9, hh * 0.3, lower], [R, hh * 0.62, body], [R * 0.55, hh * 1.0, hot], [0, hh * 1.12]]
                      : [[R * 0.3, 0, body], [R, hh * 0.55, hot], [0, hh * 1.1]];
      const ph = r() * TAU; b.push(K.tr(top[0], top[1] - R * 0.05, top[2])); b.lathe(prof, segs, body, ph, ph + TAU); b.pop();
    });
    return b;
  }

  // =====================================================================
  // tube_colony: upright worm tubes with glowing open rims and feathery plumes
  function tubeColony(detail) {
    const b = new MB(), r = rnd(505), hi = detail > 0, tubes = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + r() * 0.6, d = i === 0 ? 0.03 : 0.1 + r() * 0.2, H = i === 0 ? 1.2 + r() * 0.2 : 0.3 + r() * 0.75, rad = 0.035 + H * 0.025 + r() * 0.01;
      tubes.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, H, rad, lean: [(r() - 0.5) * 0.12 + Math.cos(a) * 0.06, (r() - 0.5) * 0.12 + Math.sin(a) * 0.06], hue: [MAGENTA, CYAN, VIOLET, MAGENTA, TEAL, CYAN, VIOLET][i] });
    }
    tubes.sort((p, q) => q.H - p.H);
    tubes.forEach((t, i) => {
      if (!hi && i >= 5) return;
      const segs = hi ? (i < 3 ? 6 : 5) : 4, R = t.rad, H = t.H;
      const wall = G(mix(STALK, t.hue, 0.08), 0.03), wall2 = G(mix(DVIO, t.hue, 0.22), 0.13), rim = G(mix(t.hue, PALE, 0.4), 1.0), lip = G(t.hue, 0.85), deep = G(mix(DVIO, t.hue, 0.5), 0.5);
      const prof = hi ? [[R * 1.25, -0.1, wall], [R * 0.95, H * 0.55, wall2], [R * 1.05, H - 0.03, rim], [R * 1.2, H, lip], [R * 0.82, H - 0.02, deep], [R * 0.7, H - 0.3]]
                      : [[R * 1.2, -0.1, wall2], [R * 1.1, H * 0.88, rim], [R * 2.4, H + R * 2.6]];   // far: a glowing flared crown stands in for rim + plume
      const ax = norm([t.lean[0], 1, t.lean[1]]), s = norm(cross(ax, [0, 0, 1])), u = cross(s, ax);
      b.push(new Float64Array([s[0], s[1], s[2], 0, ax[0], ax[1], ax[2], 0, u[0], u[1], u[2], 0, t.x, 0, t.z, 1]));
      b.lathe(prof, segs, wall);
      // feathery plume: thin glowing fronds fanning out and up from inside the rim
      const nP = hi ? (i < 3 ? 7 : 4) : 0, ph = r() * TAU;
      for (let k = 0; k < nP; k++) {
        const a = ph + k / nP * TAU + (r() - 0.5) * 0.3, len = R * (2.6 + r() * 1.6), out = 0.75 + r() * 0.4;
        const base = [Math.cos(a) * R * 0.55, H - 0.04, Math.sin(a) * R * 0.55], tip = [Math.cos(a) * (R * 0.6 + len * out), H + len * (0.75 + r() * 0.3), Math.sin(a) * (R * 0.6 + len * out)];
        spike(b, base, tip, R * 0.22, 3, G(mix(t.hue, PINK, 0.1), 0.7), G(mix(t.hue, PALE, 0.7), 1.0), a);
      }
      b.pop();
    });
    return b;
  }

  // =====================================================================
  // vein_patch: thin branching glowing veins on the rock, ~2 m across, slightly raised
  function veinPatch(detail) {
    const b = new MB(), r = rnd(606), hi = detail > 0;
    // ridge with a roof cross-section: dim edges at y=-0.01, bright crest on top
    function ridge(pts, w0, w1, hue) {
      const n = pts.length; let prev = null;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), d = norm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)])), side = [-d[2], 0, d[0]], w = w0 + (w1 - w0) * t, h = w * 0.6 + 0.008;
        const L = add(pts[i], scale(side, w)), Rr = add(pts[i], scale(side, -w)), C = [pts[i][0], pts[i][1] + h, pts[i][2]]; L[1] -= 0.012; Rr[1] -= 0.012;
        const edge = G(mix(DTEAL, hue, 0.45), 0.4 - 0.15 * t), crest = G(mix(hue, PALE, 0.3 - 0.2 * t), 1.0 - 0.15 * t);
        const cur = [b.v(L[0], L[1], L[2], side[0] * 0.6, 0.8, side[2] * 0.6, edge), b.v(C[0], C[1], C[2], 0, 1, 0, crest), b.v(Rr[0], Rr[1], Rr[2], -side[0] * 0.6, 0.8, -side[2] * 0.6, edge)];
        if (prev) { b.quad(prev[0], cur[0], cur[1], prev[1]); b.quad(prev[1], cur[1], cur[2], prev[2]); }
        prev = cur;
      }
    }
    // the branching pattern is grown once (same at both detail levels); far away draws only the trunks, simplified and wider
    const segLen = 0.17, veins = [];
    function branch(p, ang, len, w, depth, hue) {
      const n = Math.max(2, Math.round(len / segLen)) + 1, pts = [p]; let a = ang, q = p;
      for (let i = 1; i < n; i++) { a += (r() - 0.5) * 0.9; q = [q[0] + Math.cos(a) * len / (n - 1), 0, q[2] + Math.sin(a) * len / (n - 1)]; pts.push(q); }
      veins.push({ pts, w, depth, hue });
      if (depth <= 0) return;
      // side branches start part way along and fork off at an angle
      const nb = depth > 1 ? 2 : 1;
      for (let k = 0; k < nb; k++) {
        const j = Math.max(1, Math.min(n - 2, Math.round((0.3 + 0.35 * k + r() * 0.15) * (n - 1)))), dd = sub(pts[j + 1], pts[j]);
        const ba = Math.atan2(dd[2], dd[0]) + (r() < 0.5 ? -1 : 1) * (0.55 + r() * 0.4);
        branch(pts[j], ba, len * (0.42 + r() * 0.15), w * 0.6, depth - 1, hue);
      }
    }
    const trunks = 4, ph = r() * TAU;
    for (let i = 0; i < trunks; i++) {
      const a = ph + i / trunks * TAU + (r() - 0.5) * 0.5, hue = i % 2 ? CYAN : (i === 2 ? VIOLET : TEAL);
      branch([Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05], a, 0.8 + r() * 0.2, 0.03, 2, hue);
    }
    for (const vn of veins) {
      if (hi) ridge(vn.pts, vn.w, vn.w * 0.25, vn.hue);
      else if (vn.depth === 2) { const P = vn.pts, m = P.length >> 1; ridge([P[0], P[m], P[P.length - 1]], vn.w * 1.7, vn.w * 0.6, vn.hue); }
    }
    return b;
  }

  return {
    name: 'glowlife',
    items: [
      { name: 'glow_moss', budget: 300, build: glowMoss, colliders: [] },
      { name: 'glow_caps', budget: 600, build: glowCaps, colliders: [] },
      { name: 'filament_curtain', budget: 500, build: filamentCurtain, colliders: [] },
      { name: 'bulb_pods', budget: 500, build: glowBulbs, colliders: [] },
      { name: 'tube_colony', budget: 500, build: tubeColony, colliders: [] },
      { name: 'vein_patch', budget: 250, build: veinPatch, colliders: [] },
    ],
  };
}) };
