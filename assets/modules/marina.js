window.MODDEF = { fn: (function (K) {
  // MARINA: a small floating marina on a desert reservoir. For every item y = 0 is the WATER SURFACE.
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd } = K;

  // ---------- palette ----------
  const STEEL = [0.52, 0.54, 0.55, 0.15], STEEL_D = [0.36, 0.37, 0.38, 0.15], RUST = [0.4, 0.27, 0.18, 0.05];
  const ALU = [0.74, 0.76, 0.78, 0.25], ALU_D = [0.58, 0.6, 0.62, 0.2];
  const RUBBER = [0.11, 0.11, 0.12, 0.05], WHITE = [0.9, 0.9, 0.87, 0.1], ORANGE = [0.95, 0.42, 0.08, 0.08];
  const RED = [0.74, 0.12, 0.1, 0.15], YELLOW = [0.92, 0.74, 0.12, 0.1], BLACK = [0.07, 0.07, 0.08, 0.05];
  const GLASS = [0.08, 0.12, 0.16, 0.5], ROPE = [0.82, 0.76, 0.6], ROPE_B = [0.25, 0.42, 0.7];
  // floats are weathered composite; the waterline growth is an alien blue-green film
  const FLOAT = [0.47, 0.47, 0.43, 0.05], ALGAE = [0.24, 0.32, 0.3], SOLAR = [0.1, 0.14, 0.3, 0.45];
  // composite deck panels (dusty grey-brown) instead of timber
  const DECKC = [0.42, 0.4, 0.36], DECKG = [0.38, 0.39, 0.37];
  // outpost retrofit colours
  const HAZ = [0.88, 0.66, 0.1, 0.06], OLIVE = [0.38, 0.4, 0.31, 0.08], OLIVE_D = [0.28, 0.3, 0.24, 0.08], ARMOR = [0.42, 0.43, 0.41, 0.12], ARMOR_D = [0.28, 0.29, 0.29, 0.12];
  const TEAL = [0.4, 0.98, 0.88, 0.4], AMBER = [1.0, 0.74, 0.3, 0.4], CABLE = [0.1, 0.1, 0.11, 0.05], CABLE_O = [0.82, 0.4, 0.1, 0.05], GRIT = [0.2, 0.21, 0.2, 0], COMP = [0.42, 0.41, 0.37, 0.03];
  const shade = (c, k) => { const o = [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)]; if (c[3] !== undefined) o.push(c[3]); return o; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] || 0) + ((b[3] || 0) - (a[3] || 0)) * t];

  // ---------- helpers ----------
  // weathered deck board colour
  function plankCol(r) { const s = 0.84 + 0.24 * r(), c = mix(DECKC, DECKG, r() < 0.25 ? 0.5 + 0.4 * r() : 0.25 * r()); return [Math.min(1, c[0] * s), Math.min(1, c[1] * s * (0.98 + 0.04 * r())), Math.min(1, c[2] * s * (0.95 + 0.08 * r()))]; }
  // a pair of screw heads on a deck board top (tiny flat squares), at points (x, z), deck top y
  function screws(b, pts, y) { const e = 0.009, c = [0.3, 0.29, 0.27, 0.2]; for (const [x, z] of pts) b.plate([x - e, y + 0.002, z - e], [x + e, y + 0.002, z - e], [x + e, y + 0.002, z + e], [x - e, y + 0.002, z + e], c); }
  // torus in the local XZ plane (axis = local Y)
  function torus(b, R, r, nu, nv, col) { b.surf(nu, nv, (u, v) => { const a = u * Math.PI * 2, t = v * Math.PI * 2, rr = R + r * Math.cos(t); return [rr * Math.cos(a), r * Math.sin(t), rr * Math.sin(a)]; }, col, true); }
  // rounded "box" float, superellipse in all directions, from x0..x1 (along local X) with half-width hz, y from yb to yt
  function floatTub(b, x0, x1, zc, hz, yb, yt, nu, nv) {
    const xm = (x0 + x1) / 2, hx = (x1 - x0) / 2, ym = (yb + yt) / 2, hy = (yt - yb) / 2, e = 2 / 5, sp = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
    b.surf(nu, nv, (u, v) => { const t = u * Math.PI * 2, ph = -Math.PI / 2 + v * Math.PI, k = Math.pow(Math.abs(Math.cos(ph)), e); return [xm + hx * sp(Math.sin(ph), e), ym + hy * k * sp(Math.sin(t), e), zc + hz * k * sp(Math.cos(t), e)]; },
      (u, v) => { const y = ym + hy * Math.sin(u * Math.PI * 2); return y > 0.09 ? FLOAT : (y > -0.04 ? ALGAE : mix(ALGAE, FLOAT, 0.3)); }, true);
  }
  // heavy mooring clamp (replaces the cleat) centred at (x, y, z), its jaw axis along local X turned by ang
  function cleat(b, x, y, z, ang, detail) {
    b.push(mulAll(tr(x, y, z), rotY(ang || 0)));
    b.box(0, 0.015, 0, 0.28, 0.03, 0.12, ARMOR_D);
    if (detail) { for (const s of [-1, 1]) b.box(s * 0.075, 0.08, 0, 0.07, 0.1, 0.1, ARMOR);
      b.cyl([-0.14, 0.095, 0], [0.14, 0.095, 0], 0.024, 0.024, 6, STEEL_D);
      b.box(0, 0.14, 0, 0.09, 0.02, 0.09, HAZ); b.beam([0, 0.15, 0.02], [0, 0.19, 0.15], 0.022, HAZ); }
    b.pop();
  }
  // a flat top rectangle (x0..x1, z0..z1) at height y facing up
  function topRect(b, x0, z0, x1, z1, y, col) { b.plate([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], col); }
  // hazard striping on a flat rectangle: corner o, unit u (along) and v (up), size L x H; its face looks along cross(u, v)
  function hazard(b, o, u, v, L, H, w) {
    w = w || 0.1; const n = K.cross(u, v), P = (s, t, k) => [o[0] + u[0] * s + v[0] * t + n[0] * k, o[1] + u[1] * s + v[1] * t + n[1] * k, o[2] + u[2] * s + v[2] * t + n[2] * k], c = x => Math.max(0, Math.min(L, x));
    b.plate(P(0, 0, 0), P(L, 0, 0), P(L, H, 0), P(0, H, 0), HAZ);
    const sl = Math.min(H, w);
    for (let s = -sl; s < L; s += 2 * w) b.plate(P(c(s), 0, 0.003), P(c(s + w), 0, 0.003), P(c(s + w + sl), H, 0.003), P(c(s + sl), H, 0.003), BLACK);
  }
  // composite deck panel with its top at DY: grip strips across the walking direction, bolt heads at the corners
  function compPanel(b, cx, cz, sx, sz, r, walkX, top) {
    const T = top === undefined ? DY : top;
    const c = shade(mix(COMP, DECKG, r() * 0.5), 0.9 + 0.16 * r());
    b.box(cx, T - 0.022 - r() * 0.003, cz, sx - 0.014, 0.044, sz - 0.014, c);
    const L = walkX ? sx : sz, n = Math.max(2, Math.round(L / 0.42)), g = shade(c, 0.8);
    for (let i = 0; i < n; i++) { const t = ((i + 0.5) / n - 0.5) * L;
      if (walkX) topRect(b, cx + t - 0.045, cz - sz / 2 + 0.07, cx + t + 0.045, cz + sz / 2 - 0.07, T + 0.002, g); else topRect(b, cx - sx / 2 + 0.07, cz + t - 0.045, cx + sx / 2 - 0.07, cz + t + 0.045, T + 0.002, g); }
    for (const a of [-1, 1]) for (const d of [-1, 1]) { const x = cx + a * (sx / 2 - 0.04), z = cz + d * (sz / 2 - 0.04); topRect(b, x - 0.014, z - 0.014, x + 0.014, z + 0.014, T + 0.003, STEEL); }
  }
  // stencilled unit code: text block at a transform
  function stencil(b, m, s, px, col) { b.push(m); text(b, s, px, 0.004, col); b.pop(); }
  // flat coil of rope lying on a deck at (x, y, z)
  function ropeCoil(b, x, y, z, R0, R1, turns, col) {
    const pts = [], n = turns * 14; for (let i = 0; i <= n; i++) { const a = i / 14 * Math.PI * 2, rr = R0 + (R1 - R0) * i / n; pts.push([x + rr * Math.cos(a), y + 0.018 + 0.004 * Math.sin(i), z + rr * Math.sin(a)]); }
    const a = Math.PI * 2 * turns; pts.push([x + R1 * Math.cos(a) + 0.25, y + 0.018, z + R1 * Math.sin(a) + 0.2]);
    b.tube(pts, 0.016, 5, col);
  }
  // 3x5-ish pixel font for signs made of blocks
  const FONT = {
    A: ['010', '101', '111', '101', '101'], C: ['111', '100', '100', '100', '111'], D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'],
    F: ['111', '100', '110', '100', '100'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'], K: ['101', '101', '110', '101', '101'],
    L: ['100', '100', '100', '100', '111'], M: ['10001', '11011', '10101', '10001', '10001'], N: ['1001', '1101', '1011', '1001', '1001'], O: ['111', '101', '101', '101', '111'],
    P: ['111', '101', '111', '100', '100'], R: ['110', '101', '110', '101', '101'], S: ['111', '100', '111', '001', '111'], T: ['111', '010', '010', '010', '010'],
    U: ['101', '101', '101', '101', '111'], W: ['10001', '10001', '10101', '11011', '10001'], Y: ['101', '101', '010', '010', '010'], G: ['111', '100', '101', '101', '111'],
    Z: ['111', '001', '010', '100', '111'], B: ['110', '101', '110', '101', '110'], '5': ['111', '100', '111', '001', '111'], ' ': ['00', '00', '00', '00', '00'], '-': ['000', '000', '111', '000', '000']
  };
  const textW = s => { let w = 0; for (const ch of s) w += FONT[ch][0].length + 1; return w - 1; };
  // draws text centred on the local origin in the XY plane, letters facing +Z, pixel size px, thickness d (from z=0 to z=d)
  function text(b, s, px, d, col) {
    let x = -textW(s) * px / 2; const h = 5 * px;
    for (const ch of s) { const g = FONT[ch];
      for (let row = 0; row < 5; row++) { const line = g[row]; let i = 0; while (i < line.length) { if (line[i] === '1') { let j = i; while (j < line.length && line[j] === '1') j++; b.box(x + (i + j) / 2 * px, h / 2 - (row + 0.5) * px, d / 2, (j - i) * px, px, d, col); i = j; } else i++; } }
      x += (g[0].length + 1) * px; }
  }
  // life ring (orange with 4 white bands) in the local XY plane facing +Z
  function lifeRing(b, x, y, z, ang, detail) {
    b.push(mulAll(tr(x, y, z), rotY(ang), rotX(Math.PI / 2)));
    torus(b, 0.3, 0.065, detail ? 28 : 8, detail ? 8 : 4, (u) => (Math.floor(u * 8 + 0.5) % 2 === 0 && Math.abs(((u * 8 + 0.5) % 1) - 0.5) < 0.25) ? WHITE : ORANGE);
    if (detail) { const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push([0.37 * Math.cos(a), 0.03 * Math.sin(a * 8), 0.37 * Math.sin(a)]); } b.tube(pts, 0.008, 4, WHITE); }
    b.pop();
  }

  // =====================================================================================
  // 1. DOCK
  // =====================================================================================
  const DY = 0.55, GW_L0 = [0, DY, -1.2], GW_L1 = [0, 12, -37];
  const GW_RUN = 35.8, GW_RISE = 12 - DY, GW_LEN = Math.hypot(GW_RUN, GW_RISE), GW_ANG = Math.atan2(GW_RISE, GW_RUN), FINGERS = [-18, -6, 6, 18];

  function buildDock(detail) {
    const b = new MB(), r = rnd(1201);
    if (!detail) return dockLow(b);
    // ---- main walkway: composite deck panels (1.25 m) with grip strips and dashed hazard-yellow edge lines
    for (let i = 0; i < 40; i++) { const x = -25 + 0.625 + i * 1.25; compPanel(b, x, 0, 1.25, 2.36, r, true);
      for (const s of [-1, 1]) topRect(b, x - 0.5, s * 1.13 - 0.03, x + 0.5, s * 1.13 + 0.03, DY + 0.003, HAZ); }
    // unit codes stencilled on the deck at the finger roots
    for (const fx of FINGERS) stencil(b, mulAll(tr(fx, DY + 0.004, 0.55), rotX(-Math.PI / 2)), fx < 0 ? (fx < -10 ? 'A' : 'B') : (fx < 10 ? 'C' : 'D'), 0.07, shade(HAZ, 0.95));
    // ---- walkway steel frame
    for (const s of [-1, 1]) {
      b.box(0, 0.4, s * 1.15, 50, 0.22, 0.08, STEEL);                     // side channel
      b.box(0, 0.51, s * 1.11, 50, 0.02, 0.16, STEEL_D);                  // channel flange
      b.box(0, 0.42, s * 1.215, 50, 0.24, 0.05, shade(DECKC, 0.8));        // timber fascia board
      for (let x = -24; x <= 24; x += 2) b.box(x + 1, 0.43, s * 1.27, 1.7, 0.13, 0.07, RUBBER);   // rubber bumper strips
      for (let x = -25; x <= 25.01; x += 1) b.box(x, 0.43, s * 1.245, 0.03, 0.03, 0.015, STEEL_D); // fascia bolts
      b.box(0, 0.465, s * 0.45, 50, 0.07, 0.08, shade(DECKC, 0.7));        // timber nailers
    }
    for (let x = -25; x <= 25.01; x += 1.25) b.box(x, 0.42, 0, 0.06, 0.16, 2.3, STEEL);   // cross joists
    for (const s of [-1, 1]) b.box(s * 25.02, 0.42, 0, 0.06, 0.26, 2.5, STEEL);            // end channels
    // floats under the walkway (20 tubs) and diagonal frame bracing between
    for (let i = 0; i < 20; i++) { const x0 = -25 + i * 2.5 + 0.12; floatTub(b, x0, x0 + 2.26, 0, 1.0, -0.6, 0.29, 24, 12); }
    for (let x = -25; x < 25; x += 2.5) { b.beam([x, 0.33, -1.1], [x + 1.25, 0.33, 1.1], 0.04, STEEL_D); b.beam([x + 1.25, 0.33, 1.1], [x + 2.5, 0.33, -1.1], 0.04, STEEL_D); }

    // ---- finger piers
    for (const fx of FINGERS) {
      for (let k = 0; k < 6; k++) compPanel(b, fx, 1.2 + 0.75 + k * 1.5, 1.12, 1.5, r, false);
      hazard(b, [fx - 0.56, DY + 0.004, 10.18], [1, 0, 0], [0, 0, -1], 1.12, 0.22, 0.09);   // striped finger tip
      for (const s of [-1, 1]) {
        b.box(fx + s * 0.55, 0.4, 5.7, 0.08, 0.22, 9.0, STEEL);
        b.box(fx + s * 0.615, 0.42, 5.75, 0.05, 0.24, 9.1, shade(DECKC, 0.8));
        for (let z = 1.6; z < 10; z += 2.1) b.box(fx + s * 0.665, 0.43, z + 0.9, 0.07, 0.13, 1.8, RUBBER);
        b.box(fx, 0.465, 5.7, 0.08, 0.07, 9.0, shade(DECKC, 0.7));
        // corner knee plates on the deck and gussets under it
        { const ids = [[fx + s * 0.56, 1.16], [fx + s * 1.45, 1.16], [fx + s * 0.56, 2.05]].map(p => b.v(p[0], DY + 0.006, p[1], 0, 1, 0, STEEL_D)); b.tri(ids[0], ids[1], ids[2]);
          const jd = [[fx + s * 0.56, 1.16], [fx + s * 1.45, 1.16], [fx + s * 0.56, 2.05]].map(p => b.v(p[0], 0.34, p[1], 0, -1, 0, STEEL)); b.tri(jd[0], jd[1], jd[2]);
          b.plate([fx + s * 1.45, 0.34, 1.16], [fx + s * 0.56, 0.34, 2.05], [fx + s * 0.56, DY + 0.006, 2.05], [fx + s * 1.45, DY + 0.006, 1.16], shade(DECKC, 0.8)); }
        for (let k = 0; k < 4; k++) b.box(fx + s * (0.75 + k * 0.17), DY + 0.012, 1.25 + 0.02, 0.03, 0.006, 0.03, STEEL);
      }
      b.box(fx, 0.42, 10.22, 1.3, 0.24, 0.05, shade(DECKC, 0.8));
      b.box(fx, 0.43, 10.27, 1.2, 0.13, 0.07, RUBBER);
      for (let z = 1.2; z <= 10.2; z += 1.5) b.box(fx, 0.42, z, 1.1, 0.16, 0.06, STEEL);
      for (let k = 0; k < 3; k++) { const z0 = 1.35 + k * 2.95; b.push(mulAll(tr(fx, 0, 0), rotY(-Math.PI / 2))); floatTub(b, z0, z0 + 2.75, 0, 0.5, -0.6, 0.29, 16, 10); b.pop(); }
      // cleats on finger
      for (const s of [-1, 1]) for (const z of [4.8, 9.7]) cleat(b, fx + s * 0.48, DY, z, Math.PI / 2, 1);
      // finger-tip light post (low bollard light)
      if (fx !== 18) { const x = fx - 0.42, z = 10.0; b.box(x, DY + 0.02, z, 0.22, 0.04, 0.22, ARMOR_D); b.box(x, DY + 0.4, z, 0.12, 0.8, 0.12, ARMOR);
        hazard(b, [x - 0.061, DY + 0.5, z + 0.061], [1, 0, 0], [0, 1, 0], 0.122, 0.2, 0.05);
        b.cyl([x, DY + 0.8, z], [x, DY + 0.92, z], 0.06, 0.06, 8, AMBER); b.box(x, DY + 0.945, z, 0.16, 0.05, 0.16, ARMOR_D);
        for (const [a, d] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(x + a * 0.07, DY + 0.86, z + d * 0.07, 0.018, 0.12, 0.018, ARMOR_D);
        b.cyl([x, DY + 0.97, z], [x, DY + 1.5, z], 0.008, 0.004, 4, BLACK, false); }
      // power pedestal at the finger root (on the walkway)
      if (fx !== 18) powerPedestal(b, fx + 1.0, DY, 0.9);
    }
    // ---- walkway cleats
    for (const x of [-22.5, -12, -0.0 + 3.5, 12, 22.5]) cleat(b, x, DY, 1.08, 0, 1);
    for (const x of [-21.5, -9.5, 6.5, 19.5]) cleat(b, x, DY, -1.08, 0, 1);
    // ---- guide pilings through pile hoops at both ends
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = sx * 25.42, pz = sz * 0.75;
      b.cyl([px, -8, pz], [px, 4, pz], 0.18, 0.18, 18, STEEL, false);
      b.cyl([px, -0.6, pz], [px, 0.3, pz], 0.185, 0.185, 18, RUST, false);           // waterline rust band
      b.cyl([px, 0.3, pz], [px, 1.1, pz], 0.183, 0.183, 18, mix(RUST, STEEL, 0.5), false);
      b.push(tr(px, 0, pz)); b.lathe([[0, 4.0], [0.2, 4.0], [0.2, 4.08], [0.15, 4.16], [0, 4.2]], 18, STEEL_D); b.pop();   // cap
      for (let k = 0; k < 4; k++) b.cyl([px, 3.0 + k * 0.24, pz], [px, 3.12 + k * 0.24, pz], 0.184, 0.184, 18, k % 2 ? BLACK : HAZ, false);   // hazard bands
      if (sz > 0) { b.cyl([px, 4.2, pz], [px, 4.32, pz], 0.05, 0.05, 8, AMBER); b.box(px, 4.34, pz, 0.12, 0.03, 0.12, STEEL_D); }   // beacon
      b.push(tr(px, 0.42, pz)); torus(b, 0.27, 0.035, 20, 6, STEEL_D); b.pop();       // hoop
      b.push(tr(px, 0.42, pz)); torus(b, 0.205, 0.025, 20, 5, RUBBER); b.pop();       // UHMW roller ring
      b.beam([sx * 25.04, 0.42, pz - 0.18], [px - sx * 0.2, 0.42, pz - 0.18], 0.07, STEEL_D);
      b.beam([sx * 25.04, 0.42, pz + 0.18], [px - sx * 0.2, 0.42, pz + 0.18], 0.07, STEEL_D);
      b.box(sx * 25.06, 0.42, pz, 0.03, 0.22, 0.5, STEEL);
    }
    // ---- lamp posts with solar lamps (on the -Z side, plus none at the gangway)
    for (const x of [-24, -12, 12, 24]) lampPost(b, x, -1.02);
    // ---- stencilled hazard markers on posts (where the life rings were)
    for (const x of [-15, 9]) { const z = -1.05; b.box(x, DY + 0.02, z, 0.24, 0.04, 0.24, ARMOR_D); b.box(x, DY + 0.75, z, 0.1, 1.5, 0.1, ARMOR);
      b.box(x, DY + 1.18, z + 0.08, 0.62, 0.62, 0.04, ARMOR_D);
      hazard(b, [x - 0.29, DY + 1.27, z + 0.101], [1, 0, 0], [0, 1, 0], 0.58, 0.2, 0.08);
      b.box(x, DY + 1.07, z + 0.101, 0.58, 0.3, 0.004, [0.16, 0.17, 0.17, 0.05]);
      stencil(b, tr(x, DY + 1.07, z + 0.103), 'HZ-5', 0.032, HAZ);
      b.box(x, DY + 1.55, z + 0.06, 0.1, 0.08, 0.1, ARMOR_D); b.cyl([x, DY + 1.59, z + 0.06], [x, DY + 1.66, z + 0.06], 0.035, 0.035, 8, AMBER); }
    // ---- armoured emergency cabinet on a post beside the gangway
    { const x = 2.2, z = -1.05; b.box(x, DY + 0.6, z, 0.08, 1.2, 0.08, STEEL); b.box(x, DY + 1.05, z + 0.17, 0.38, 0.62, 0.26, ARMOR_D); b.box(x, DY + 1.05, z + 0.305, 0.3, 0.5, 0.01, [0.62, 0.14, 0.1, 0.1]);
      hazard(b, [x - 0.15, DY + 1.24, z + 0.311], [1, 0, 0], [0, 1, 0], 0.3, 0.08, 0.04); b.box(x, DY + 1.0, z + 0.31, 0.2, 0.06, 0.005, [0.9, 0.88, 0.8]);
      for (const y of [0.8, 1.3]) b.box(x, DY + y, z + 0.17, 0.4, 0.03, 0.28, ARMOR); b.box(x + 0.16, DY + 1.05, z + 0.32, 0.03, 0.12, 0.03, STEEL_D); }
    // ---- sealed equipment lockers
    for (const [x, c] of [[-20, OLIVE], [-8.5, ARMOR], [16, OLIVE]]) dockBox(b, x, -0.82, c);
    // ---- coiled power and signal cables
    ropeCoil(b, -11.2, DY, 0.62, 0.06, 0.24, 6, CABLE);
    ropeCoil(b, 4.2, DY, 0.7, 0.05, 0.2, 5, CABLE_O);
    ropeCoil(b, -6.3, DY, 8.8, 0.05, 0.19, 5, CABLE);
    // ---- fluid-sampling station at the +18 finger tip
    fuelKiosk(b, 18, 9.2);
    // ---- hazard marker buoy off the east end
    noWakeBuoy(b, 30, 7);
    // ---- gangway and shore landing
    gangway(b);
    landing(b);
    return b;
  }

  // sensor and power post (replaces the shore-power pedestal)
  function powerPedestal(b, x, y, z) {
    b.box(x, y + 0.02, z, 0.38, 0.04, 0.28, ARMOR_D);
    b.box(x, y + 0.5, z, 0.28, 0.92, 0.2, OLIVE);
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) b.box(x + s * 0.15, y + 0.32 + k * 0.1, z, 0.03, 0.05, 0.16, OLIVE_D);   // heat fins
    b.box(x, y + 1.0, z, 0.32, 0.1, 0.24, ARMOR_D);
    b.box(x, y + 1.09, z + 0.02, 0.2, 0.08, 0.14, ARMOR);                         // sensor head
    b.box(x, y + 1.09, z + 0.092, 0.14, 0.03, 0.005, TEAL);
    b.cyl([x + 0.1, y + 1.05, z - 0.07], [x + 0.1, y + 1.7, z - 0.07], 0.008, 0.004, 4, BLACK, false);   // whip antenna
    for (const s of [-1, 1]) { b.box(x + s * 0.07, y + 0.62, z + 0.105, 0.09, 0.12, 0.02, BLACK); b.box(x + s * 0.07, y + 0.75, z + 0.103, 0.07, 0.03, 0.01, s < 0 ? TEAL : AMBER); }
    hazard(b, [x - 0.14, y + 0.26, z + 0.101], [1, 0, 0], [0, 1, 0], 0.28, 0.1, 0.05);
  }
  // sealed equipment locker
  function dockBox(b, x, z, c) {
    const y = DY;
    b.box(x, y + 0.03, z, 1.5, 0.06, 0.58, ARMOR_D);
    b.box(x, y + 0.32, z, 1.46, 0.52, 0.54, c);
    for (const s of [-1, 0, 1]) b.box(x + s * 0.5, y + 0.32, z, 0.05, 0.54, 0.57, shade(c, 0.8));   // stiffening ribs
    b.box(x, y + 0.6, z, 1.52, 0.06, 0.6, shade(c, 1.05));
    b.box(x, y + 0.567, z, 1.5, 0.012, 0.58, BLACK);                             // lid seal
    b.box(x, y + 0.64, z, 1.4, 0.02, 0.5, shade(c, 0.95));
    for (const s of [-1, 1]) { b.box(x + s * 0.3, y + 0.52, z + 0.29, 0.12, 0.1, 0.05, ARMOR_D); b.box(x + s * 0.55, y + 0.62, z - 0.3, 0.12, 0.04, 0.03, STEEL); }
    hazard(b, [x - 0.73, y + 0.08, z + 0.272], [1, 0, 0], [0, 1, 0], 1.46, 0.07, 0.07);
    stencil(b, tr(x - 0.25, y + 0.3, z + 0.272), 'SR-5', 0.03, [0.85, 0.83, 0.75]);
  }
  // sensor and light mast (replaces the solar lamp post)
  function lampPost(b, x, z) {
    const y = DY, P = ARMOR_D;
    b.box(x, y + 0.03, z, 0.3, 0.06, 0.3, STEEL_D);
    for (const [a, d] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.beam([x + a * 0.13, y + 0.06, z + d * 0.13], [x + a * 0.04, y + 0.5, z + d * 0.04], 0.025, P);
    b.box(x, y + 1.65, z, 0.09, 3.3, 0.09, P);
    b.cyl([x + 0.065, y + 0.06, z - 0.02], [x + 0.065, y + 3.2, z - 0.02], 0.016, 0.016, 5, CABLE, false);      // cable conduit
    // light bar on an arm toward the deck
    b.box(x, y + 3.22, z + 0.3, 0.06, 0.06, 0.62, P);
    b.box(x, y + 3.18, z + 0.6, 0.5, 0.1, 0.14, P); b.box(x, y + 3.125, z + 0.6, 0.44, 0.012, 0.1, [0.96, 0.94, 0.82, 0.4]);
    for (let i = -1; i <= 1; i++) b.box(x + i * 0.16, y + 3.25, z + 0.6, 0.02, 0.04, 0.14, STEEL_D);
    // sensor pod with a teal lens, and a small dish
    b.box(x, y + 2.6, z + 0.09, 0.16, 0.14, 0.1, ARMOR); b.box(x, y + 2.6, z + 0.141, 0.1, 0.05, 0.004, TEAL);
    b.push(mulAll(tr(x - 0.06, y + 2.95, z), rotZ(Math.PI / 2 - 0.3))); b.cyl([0, 0, 0], [0, 0.1, 0], 0.012, 0.012, 5, STEEL_D, false); b.push(tr(0, 0.1, 0)); b.lathe([[0, 0], [0.12, 0.05], [0.13, 0.06]], 10, [0.66, 0.66, 0.63, 0.1]); b.pop(); b.pop();
    // solar panel tilted on top
    b.push(mulAll(tr(x, y + 3.45, z - 0.05), rotX(-0.55)));
    b.box(0, 0, 0, 0.62, 0.035, 0.48, P); b.box(0, 0.02, 0, 0.58, 0.01, 0.44, SOLAR);
    for (let i = -1; i <= 1; i++) b.box(i * 0.145, 0.026, 0, 0.006, 0.004, 0.44, [0.6, 0.62, 0.66, 0.3]);
    b.pop();
    b.cyl([x, y + 3.3, z], [x, y + 3.42, z - 0.05], 0.025, 0.025, 6, P);
    b.cyl([x + 0.03, y + 3.3, z + 0.03], [x + 0.03, y + 4.3, z + 0.03], 0.01, 0.004, 4, BLACK, false);      // whip antenna
    // armoured battery box
    b.box(x, y + 1.6, z - 0.09, 0.18, 0.28, 0.09, OLIVE);
    hazard(b, [x + 0.09, y + 1.5, z - 0.136], [-1, 0, 0], [0, 1, 0], 0.18, 0.06, 0.04);
  }
  // fluid-sampling station (replaces the fuel kiosk): canopy, analyser cabinet, vial rack, sampling boom and tank
  function fuelKiosk(b, fx, z) {
    const y = DY;
    for (const s of [-1, 1]) { b.box(fx + s * 0.52, y + 1.25, z - 0.35, 0.08, 2.5, 0.08, ARMOR_D); hazard(b, [fx + s * 0.52 - 0.041, y + 0.1, z - 0.309], [1, 0, 0], [0, 1, 0], 0.082, 0.5, 0.04); }
    b.box(fx, y + 2.52, z - 0.05, 1.34, 0.07, 1.04, ARMOR);
    for (const s of [-1, 1]) b.box(fx + s * 0.6, y + 2.58, z - 0.05, 0.06, 0.06, 1.04, ARMOR_D);
    b.box(fx, y + 2.42, z + 0.45, 1.32, 0.22, 0.04, OLIVE_D);
    stencil(b, tr(fx, y + 2.42, z + 0.471), 'SAMPLE', 0.03, HAZ);
    b.box(fx, y + 2.47, z - 0.1, 0.9, 0.04, 0.1, ARMOR_D); b.box(fx, y + 2.445, z - 0.1, 0.84, 0.012, 0.07, [0.96, 0.94, 0.82, 0.4]);
    b.cyl([fx + 0.5, y + 2.55, z - 0.45], [fx + 0.5, y + 3.4, z - 0.45], 0.01, 0.004, 4, BLACK, false);
    b.push(mulAll(tr(fx - 0.35, y + 2.56, z - 0.3), rotX(-0.5))); b.cyl([0, 0, 0], [0, 0.15, 0], 0.015, 0.015, 5, STEEL_D, false); b.push(tr(0, 0.15, 0)); b.lathe([[0, 0], [0.14, 0.05], [0.15, 0.06]], 10, [0.66, 0.66, 0.63, 0.1]); b.pop(); b.pop();
    // analyser cabinet
    b.box(fx, y + 0.04, z - 0.3, 0.62, 0.08, 0.44, STEEL_D);
    b.box(fx, y + 0.65, z - 0.3, 0.54, 1.2, 0.36, OLIVE);
    b.box(fx, y + 1.0, z - 0.3, 0.56, 0.5, 0.38, ARMOR_D);
    b.box(fx, y + 1.08, z - 0.108, 0.3, 0.16, 0.01, GLASS); b.box(fx, y + 1.09, z - 0.103, 0.24, 0.05, 0.005, TEAL);
    b.box(fx, y + 1.3, z - 0.3, 0.6, 0.06, 0.4, ARMOR);
    for (let i = 0; i < 3; i++) b.box(fx - 0.1 + i * 0.1, y + 0.9, z - 0.11, 0.05, 0.05, 0.01, i === 1 ? AMBER : TEAL);
    for (let k = 0; k < 5; k++) b.box(fx - 0.285, y + 0.35 + k * 0.1, z - 0.3, 0.03, 0.05, 0.3, ARMOR_D);
    // rack of sample vials with coloured fluids
    b.box(fx, y + 0.6, z - 0.07, 0.44, 0.04, 0.1, ARMOR_D);
    const FL = [[0.3, 0.85, 0.7, 0.4], [0.75, 0.5, 0.95, 0.4], [0.95, 0.7, 0.25, 0.4], [0.3, 0.85, 0.7, 0.4], [0.55, 0.9, 0.35, 0.4]];
    for (let i = 0; i < 5; i++) b.cyl([fx - 0.16 + i * 0.08, y + 0.62, z - 0.07], [fx - 0.16 + i * 0.08, y + 0.78, z - 0.07], 0.022, 0.022, 6, FL[i]);
    b.box(fx, y + 0.72, z - 0.02, 0.44, 0.04, 0.012, ARMOR_D);
    hazard(b, [fx - 0.27, y + 0.1, z - 0.119], [1, 0, 0], [0, 1, 0], 0.54, 0.12, 0.06);
    // sampling boom at the finger tip: post, yellow arm, sheave and a line down to a probe in the water
    const bx = fx + 0.36, bz = z + 0.8;
    b.box(bx, y + 0.03, bz, 0.22, 0.06, 0.22, ARMOR_D);
    b.box(bx, y + 0.8, bz, 0.08, 1.6, 0.08, ARMOR);
    b.beam([bx, y + 1.55, bz - 0.04], [bx, y + 1.55, bz + 0.72], 0.07, HAZ);
    b.beam([bx, y + 1.05, bz], [bx, y + 1.52, bz + 0.45], 0.04, ARMOR_D);
    b.cyl([bx - 0.05, y + 1.5, bz + 0.66], [bx + 0.05, y + 1.5, bz + 0.66], 0.06, 0.06, 10, STEEL_D);
    b.cyl([bx, y + 1.44, bz + 0.71], [bx, -0.2, bz + 0.71], 0.008, 0.008, 4, CABLE, false);
    b.cyl([bx, -0.2, bz + 0.71], [bx, -0.55, bz + 0.71], 0.05, 0.05, 8, HAZ); b.cyl([bx, -0.55, bz + 0.71], [bx, -0.65, bz + 0.71], 0.05, 0.01, 8, STEEL_D);
    b.tube([[fx + 0.27, y + 1.1, z - 0.3], [fx + 0.38, y + 1.05, z - 0.2], [fx + 0.4, y + 0.3, z + 0.1], [bx, y + 0.25, bz - 0.06], [bx, y + 0.5, bz - 0.06]], 0.025, 6, CABLE_O);
    // pressurised sample tank
    b.box(fx - 0.38, y + 0.03, z + 0.25, 0.34, 0.06, 0.34, ARMOR_D);
    b.cyl([fx - 0.38, y + 0.06, z + 0.25], [fx - 0.38, y + 0.6, z + 0.25], 0.14, 0.14, 12, OLIVE, false);
    b.push(tr(fx - 0.38, y + 0.6, z + 0.25)); b.lathe([[0.14, 0], [0.12, 0.06], [0.06, 0.1], [0, 0.11]], 12, OLIVE); b.pop();
    b.cyl([fx - 0.38, y + 0.3, z + 0.25], [fx - 0.38, y + 0.38, z + 0.25], 0.142, 0.142, 12, HAZ, false);
    b.cyl([fx - 0.38, y + 0.7, z + 0.25], [fx - 0.38, y + 0.78, z + 0.25], 0.02, 0.02, 6, STEEL_D); b.box(fx - 0.38, y + 0.79, z + 0.25, 0.12, 0.02, 0.02, [0.62, 0.14, 0.1]);
  }
  // hazard marker buoy (replaces the 'no wake' buoy)
  function noWakeBuoy(b, x, z) {
    b.push(tr(x, 0, z));
    b.lathe([[0, -0.9], [0.24, -0.9], [0.24, 1.25], [0.2, 1.3], [0, 1.32]], 12, ARMOR);
    b.cyl([0, -0.3, 0], [0, 0.25, 0], 0.45, 0.45, 16, OLIVE_D);
    b.cyl([0, 0.25, 0], [0, 0.3, 0], 0.45, 0.4, 16, OLIVE);
    for (let k = 0; k < 4; k++) b.cyl([0, 0.38 + k * 0.1, 0], [0, 0.48 + k * 0.1, 0], 0.243, 0.243, 12, k % 2 ? BLACK : HAZ, false);
    b.box(0, 1.35, 0, 0.22, 0.06, 0.22, ARMOR_D);
    b.cyl([0, 1.38, 0], [0, 1.5, 0], 0.07, 0.07, 8, AMBER);
    for (const [a, d] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(a * 0.08, 1.44, d * 0.08, 0.02, 0.14, 0.02, ARMOR_D);
    b.box(0, 1.52, 0, 0.2, 0.03, 0.2, ARMOR_D);
    b.cyl([0.06, 1.53, 0.06], [0.06, 2.1, 0.06], 0.008, 0.004, 4, BLACK, false);
    for (const s of [1, -1]) {
      b.push(rotY(s > 0 ? 0 : Math.PI));
      b.box(0, 0.98, 0.25, 0.34, 0.3, 0.04, ARMOR_D);
      hazard(b, [-0.16, 1.06, 0.271], [1, 0, 0], [0, 1, 0], 0.32, 0.1, 0.05);
      stencil(b, tr(0, 0.95, 0.271), 'HZ-5', 0.018, HAZ);
      b.pop();
    }
    b.cyl([0, -0.9, 0], [0.05, -1.4, 0.04], 0.02, 0.02, 5, RUST);
    b.pop();
  }

  function gangway(b) {
    const GW_A = [0.62, 0.64, 0.66, 0.25], GW_D = [0.48, 0.5, 0.52, 0.2];
    b.push(mulAll(tr(GW_L0[0], GW_L0[1], GW_L0[2]), rotX(GW_ANG)));
    const L = GW_LEN, hw = 0.7, H = 1.1;
    // walking surface: plate plus transverse ribs
    b.box(0, -0.025, -L / 2, 1.38, 0.03, L, GW_D);
    for (let z = -0.15; z > -L + 0.1; z -= 0.3) b.box(0, 0.006, z, 1.32, 0.022, 0.035, GW_A);
    // side trusses
    for (const s of [-1, 1]) {
      const x = s * hw;
      b.box(x, -0.08, -L / 2, 0.08, 0.2, L, GW_A);                         // bottom chord (also kick plate)
      b.box(x * 0.985, 0.08, -L / 2, 0.012, 0.12, L, GW_D);              // toe board
      b.cyl([x, H, 0], [x, H, -L], 0.032, 0.032, 10, GW_A, true);          // top chord / handrail
      b.cyl([x, H * 0.55, 0], [x, H * 0.55, -L], 0.02, 0.02, 8, GW_A, true); // mid rail
      const n = Math.round(L / 1.5);
      for (let i = 0; i <= n; i++) {
        const z = -i * L / n;
        b.box(x, H / 2, z, 0.05, H, 0.05, GW_A);
        if (i < n) { const z2 = -(i + 1) * L / n; if (i % 2 === 0) b.beam([x, 0.02, z], [x, H - 0.03, z2], 0.035, GW_D); else b.beam([x, H - 0.03, z], [x, 0.02, z2], 0.035, GW_D); }
      }
    }
    // underside: cross members and lateral X-bracing, a cable conduit
    const n = Math.round(L / 1.5);
    for (let i = 0; i <= n; i++) { const z = -i * L / n; b.box(0, -0.15, z, 1.4, 0.08, 0.06, GW_D); if (i < n) { const z2 = -(i + 1) * L / n; b.beam([-hw, -0.18, z], [hw, -0.18, z2], 0.03, GW_D); b.beam([hw, -0.18, z], [-hw, -0.18, z2], 0.03, GW_D); } }
    b.cyl([0.45, -0.22, 0], [0.45, -0.22, -L], 0.03, 0.03, 6, [0.2, 0.2, 0.2, 0.05], false);
    // hinge knuckles at the bottom and the top
    for (const zz of [0, -L]) for (const s of [-1, 1]) { b.cyl([s * 0.45, -0.08, zz], [s * 0.75, -0.08, zz], 0.06, 0.06, 10, STEEL); b.box(s * 0.6, -0.08, zz + (zz === 0 ? -0.08 : 0.08), 0.3, 0.12, 0.16, STEEL_D); }
    b.pop();
    // transition plate on the walkway (bottom) with rollers
    b.box(0, DY + 0.006, -0.85, 1.3, 0.012, 0.7, GW_D);
    for (let z = -1.15; z < -0.5; z += 0.12) b.box(0, DY + 0.014, z, 1.24, 0.006, 0.03, GW_A);
    for (const s of [-1, 1]) { b.box(s * 0.6, DY + 0.08, -1.25, 0.24, 0.16, 0.12, STEEL_D); }
    hazard(b, [-0.65, DY + 0.016, -0.5], [1, 0, 0], [0, 0, -1], 1.3, 0.12, 0.08);
  }

  function landing(b) {
    const y = 12, z0 = -37, zc = -39, hw = 2;
    // deck planks across X
    const r = rnd(77);
    for (let k = 0; k < 4; k++) compPanel(b, 0, z0 - 0.5 - k, 3.94, 1.0, r, false, y);
    hazard(b, [-0.7, y + 0.004, z0 - 0.02], [1, 0, 0], [0, 0, -1], 1.4, 0.25, 0.1);   // striped gangway threshold
    // frame
    for (const s of [-1, 1]) { b.box(s * 1.96, y - 0.17, zc, 0.1, 0.26, 4.0, STEEL); b.box(0, y - 0.17, zc + s * 1.96, 4.0, 0.26, 0.1, STEEL); }
    for (let k = -1; k <= 1; k++) b.box(k * 1.0, y - 0.14, zc, 0.07, 0.2, 3.9, STEEL_D);
    // legs (8 m below the platform) with base plates & bracing
    const LX = 1.82, LZ = [z0 - 0.18, z0 - 3.82];
    for (const sx of [-1, 1]) for (const lz of LZ) { b.cyl([sx * LX, y - 0.3, lz], [sx * LX, y - 8, lz], 0.13, 0.13, 14, STEEL); b.box(sx * LX, y - 0.3, lz, 0.4, 0.04, 0.4, STEEL_D); b.cyl([sx * LX, y - 5.0, lz], [sx * LX, y - 8, lz], 0.135, 0.135, 14, RUST, false);
      for (let k = 0; k < 4; k++) b.cyl([sx * LX, y - 1.6 - k * 0.2, lz], [sx * LX, y - 1.8 - k * 0.2, lz], 0.134, 0.134, 14, k % 2 ? BLACK : HAZ, false); }
    for (const sx of [-1, 1]) { b.beam([sx * LX, y - 0.6, LZ[0]], [sx * LX, y - 4.5, LZ[1]], 0.07, STEEL_D); b.beam([sx * LX, y - 0.6, LZ[1]], [sx * LX, y - 4.5, LZ[0]], 0.07, STEEL_D); b.box(sx * LX, y - 4.6, zc, 0.08, 0.1, 3.64, STEEL_D); }
    for (const lz of LZ) { b.beam([-LX, y - 0.6, lz], [LX, y - 4.5, lz], 0.07, STEEL_D); b.beam([LX, y - 0.6, lz], [-LX, y - 4.5, lz], 0.07, STEEL_D); b.box(0, y - 4.6, lz, 3.64, 0.1, 0.08, STEEL_D); }
    // railing on both sides and the shore end (leaving a 1.4 m opening toward the shore)
    const RC = [0.3, 0.32, 0.33, 0.2];
    const rail = (a, c) => { b.cyl([a[0], y + 1.07, a[1]], [c[0], y + 1.07, c[1]], 0.03, 0.03, 8, RC); b.cyl([a[0], y + 0.55, a[1]], [c[0], y + 0.55, c[1]], 0.02, 0.02, 6, RC);
      const n = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.8)); for (let i = 0; i <= n; i++) { const t = i / n; b.box(a[0] + (c[0] - a[0]) * t, y + 0.53, a[1] + (c[1] - a[1]) * t, 0.05, 1.06, 0.05, RC); }
      b.box((a[0] + c[0]) / 2, y + 0.06, (a[1] + c[1]) / 2, Math.abs(c[0] - a[0]) + 0.02, 0.1, Math.abs(c[1] - a[1]) + 0.02, RC); };
    for (const s of [-1, 1]) { rail([s * 1.95, z0 - 0.05], [s * 1.95, z0 - 3.95]); rail([s * 1.95, z0 - 3.95], [s * 0.7, z0 - 3.95]); rail([s * 1.95, z0 - 0.05], [s * 0.72, z0 - 0.05]); }
    // outpost sign facing the gangway: dark armoured panel, stencil, hazard band, beacon on top
    const sx = -1.6, sz = z0 - 0.45;
    b.box(sx, y + 1.25, sz, 0.12, 2.5, 0.12, ARMOR_D);
    b.box(sx, y + 2.15, sz + 0.06, 1.6, 0.5, 0.04, OLIVE_D);
    b.box(sx, y + 2.15, sz + 0.05, 1.68, 0.58, 0.03, ARMOR_D);
    b.push(tr(sx, y + 2.22, sz + 0.08)); text(b, 'OUTPOST', 0.042, 0.01, HAZ); b.pop();
    hazard(b, [sx - 0.78, y + 1.9, sz + 0.081], [1, 0, 0], [0, 1, 0], 1.56, 0.08, 0.07);
    b.cyl([sx, y + 2.5, sz], [sx, y + 2.6, sz], 0.05, 0.05, 6, AMBER);
    // equipment crate (was a bench) and a gas cylinder (was a trash can) on the landing
    b.box(1.4, y + 0.24, z0 - 2.0, 0.5, 0.42, 1.4, OLIVE); b.box(1.4, y + 0.46, z0 - 2.0, 0.54, 0.04, 1.44, OLIVE_D);
    for (const s of [-1, 0, 1]) b.box(1.4, y + 0.24, z0 - 2.0 + s * 0.6, 0.53, 0.44, 0.05, OLIVE_D);
    hazard(b, [1.4 - 0.251, y + 0.06, z0 - 1.35], [0, 0, -1], [0, 1, 0], 1.3, 0.08, 0.08);
    b.cyl([1.45, y, z0 - 3.4], [1.45, y + 0.9, z0 - 3.4], 0.25, 0.25, 14, ARMOR); b.push(tr(1.45, y + 0.9, z0 - 3.4)); b.lathe([[0.25, 0], [0.2, 0.1], [0.08, 0.16], [0, 0.17]], 14, ARMOR); b.pop();
    for (const yy of [0.3, 0.42]) b.cyl([1.45, y + yy, z0 - 3.4], [1.45, y + yy + 0.06, z0 - 3.4], 0.253, 0.253, 14, yy < 0.35 ? HAZ : BLACK, false);
    b.cyl([1.45, y + 1.06, z0 - 3.4], [1.45, y + 1.16, z0 - 3.4], 0.03, 0.03, 6, STEEL_D); b.box(1.45, y + 1.17, z0 - 3.4, 0.16, 0.03, 0.03, [0.62, 0.14, 0.1]);
  }

  function dockLow(b) {
    b.box(0, 0.42, 0, 50, 0.26, 2.5, DECKC);
    b.box(0, -0.15, 0, 50, 0.9, 2.0, FLOAT);
    for (const fx of FINGERS) { b.box(fx, 0.42, 5.7, 1.2, 0.26, 9.0, DECKC); b.box(fx, -0.15, 5.7, 1.0, 0.9, 8.8, FLOAT); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl([sx * 25.42, -8, sz * 0.75], [sx * 25.42, 4.2, sz * 0.75], 0.18, 0.18, 5, STEEL, false);
    for (const x of [-24, -12, 12, 24]) b.box(x, DY + 1.7, -1.02, 0.1, 3.4, 0.1, ARMOR_D);
    b.push(mulAll(tr(GW_L0[0], GW_L0[1], GW_L0[2]), rotX(GW_ANG)));
    b.box(0, -0.05, -GW_LEN / 2, 1.4, 0.1, GW_LEN, ALU_D);
    for (const s of [-1, 1]) { b.box(s * 0.7, 0.55, -GW_LEN / 2, 0.05, 1.1, GW_LEN, [0.68, 0.7, 0.72]); }
    b.pop();
    b.box(0, 11.85, -39, 4, 0.3, 4, DECKC);
    for (const sx of [-1, 1]) for (const lz of [-37.18, -40.82]) b.box(sx * 1.82, 8, lz, 0.25, 8, 0.25, STEEL);
    b.box(-1.6, 13.25, -37.45, 0.1, 2.5, 0.1, STEEL); b.box(-1.6, 14.15, -37.4, 1.6, 0.5, 0.05, OLIVE_D);
    b.box(30, 0.2, 7, 0.5, 2.2, 0.5, HAZ);
    b.box(18, DY + 1.2, 9.0, 1.3, 2.4, 1.0, OLIVE);
    return b;
  }

  const dockColliders = [{ type: 'box', x: 0, z: 0, hx: 25, hz: 1.2, rot: 0, top: DY, solid: false }];
  for (const fx of FINGERS) dockColliders.push({ type: 'box', x: fx, z: 5.7, hx: 0.6, hz: 4.5, rot: 0, top: DY, solid: false });
  for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6; dockColliders.push({ type: 'box', x: 0, z: -1.2 - GW_RUN * t, hx: 0.7, hz: GW_RUN / 12, rot: 0, top: +(DY + GW_RISE * t).toFixed(3), solid: false }); }
  dockColliders.push({ type: 'box', x: 0, z: -39, hx: 2, hz: 2, rot: 0, top: 12, solid: false });

  // =====================================================================================
  // 2. BOATHOUSE
  // =====================================================================================
  const BH_W = 5, BH_D = 3.5, EAVE = 3.42, RIDGE = 4.1, ROOF_X = 5.45;
  const roofY = x => RIDGE - (RIDGE - 3.38) * Math.abs(x) / ROOF_X;
  const WALL = [0.41, 0.42, 0.36, 0.1], WALL_D = [0.33, 0.34, 0.3, 0.1], TRIM = [0.3, 0.31, 0.3, 0.15], GALV = [0.5, 0.51, 0.5, 0.2];
  const hash = i => { const x = Math.sin(i * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };
  // corrugated sheet wall: starts at p0 = [x, z], runs along unit dir [dx, dz] for len; corrugations vertical
  function corrWall(b, p0, dir, len, y0, y1f, col, pitch, amp) {
    const n = [dir[1], -dir[0]], waves = Math.round(len / pitch), nu = waves * 4;
    b.surf(nu, 1, (u, v) => { const s = u * len, o = amp * Math.sin(u * waves * Math.PI * 2), y = y0 + (y1f(s) - y0) * v; return [p0[0] + dir[0] * s + n[0] * o, y, p0[1] + dir[1] * s + n[1] * o]; },
      (u, v) => { const k = Math.floor(u * waves / 3), h = hash(k + 7 * len); const c = shade(col, 0.88 + 0.18 * h); return v < 0.12 ? shade(c, 0.8) : c; });
  }
  function buildBoathouse(detail) {
    const b = new MB(), r = rnd(4242);
    if (!detail) {
      for (const s of [-1, 1]) { b.box(s * 4.15, 0.0, 0, 1.6, 0.9, 7, FLOAT); b.box(s * 4.15, 0.47, 0, 1.7, 0.16, 7, DECKC); b.box(s * 5, 1.98, 0, 0.06, 2.9, 7, WALL); }
      b.box(0, 0.0, -2.65, 6.6, 0.9, 1.6, FLOAT); b.box(0, 0.47, -2.65, 6.6, 0.16, 1.7, DECKC); b.box(5.6, 0.47, 0, 1.2, 0.16, 7, DECKC); b.box(5.6, -0.05, 0, 1.0, 0.8, 6.8, FLOAT);
      b.box(0, 1.98, -3.5, 10, 2.9, 0.06, WALL);
      b.box(0, 3.2, 3.5, 10, 0.45, 0.06, WALL); for (const s of [-1, 1]) b.box(s * 4.15, 1.9, 3.5, 1.7, 2.7, 0.06, WALL);
      for (const s of [-1, 1]) b.plate([0, RIDGE, -3.85], [s * ROOF_X, 3.38, -3.85], [s * ROOF_X, 3.38, 3.9], [0, RIDGE, 3.9], GALV);
      b.box(0, 3.5, 3.62, 4.4, 0.8, 0.06, OLIVE_D); b.box(0.3, RIDGE + 1.4, -2.8, 0.04, 2.8, 0.04, BLACK); b.box(0, RIDGE + 0.6, 3.0, 0.03, 1.2, 0.03, BLACK);
      b.box(5.36, DY + 0.72, 2.68, 0.34, 1.44, 0.8, OLIVE); b.box(0, 2.82, 3.62, 6.6, 0.36, 0.22, ARMOR_D);
      return b;
    }
    // ---- floats under the U-shaped floor and the side walkway
    for (const s of [-1, 1]) { b.push(rotY(-Math.PI / 2)); floatTub(b, -3.4, 3.4, s * 4.15, 0.75, -0.6, 0.3, 28, 14); b.pop(); }
    floatTub(b, -3.2, 3.2, -2.65, 0.75, -0.6, 0.3, 28, 14);
    b.push(rotY(-Math.PI / 2)); floatTub(b, -3.4, 3.4, 5.6, 0.5, -0.55, 0.3, 18, 10); b.pop();
    // ---- floor framing and planks
    for (let k = 0; k < 5; k++) { const z = -3.5 + 0.7 + k * 1.4; compPanel(b, -4.15, z, 1.68, 1.4, r, false); compPanel(b, 4.15, z, 1.68, 1.4, r, false); compPanel(b, 5.6, z, 1.18, 1.4, r, false); }
    for (let k = 0; k < 5; k++) compPanel(b, -2.64 + k * 1.32, -2.65, 1.32, 1.68, r, true);
    for (const s of [-1, 1]) hazard(b, [s > 0 ? 3.57 : -3.33, DY + 0.004, 3.48], [0, 0, -1], [-1, 0, 0], 5.2, 0.24, 0.12);   // striped slip edges
    for (const s of [-1, 1]) { b.box(s * 3.31, 0.41, 0.85, 0.08, 0.24, 5.3, STEEL); b.box(s * 3.25, 0.43, 0.9, 0.07, 0.13, 5.2, RUBBER); b.box(s * 4.15, 0.41, 3.5, 1.7, 0.24, 0.08, STEEL); }
    b.box(0, 0.41, -1.81, 6.6, 0.24, 0.08, STEEL); b.box(0, 0.43, -1.76, 6.5, 0.13, 0.07, RUBBER);
    b.box(6.2, 0.42, 0, 0.06, 0.24, 7.0, shade(DECKC, 0.8)); b.box(6.25, 0.43, 0, 0.07, 0.13, 6.8, RUBBER);
    b.box(-5.02, 0.42, 0, 0.06, 0.24, 7.0, shade(DECKC, 0.8)); b.box(0, 0.42, -3.52, 12.4, 0.24, 0.06, shade(DECKC, 0.8));
    for (const s of [-1, 1]) for (const z of [-3.0, 3.0]) cleat(b, s * 3.5, DY, z * 0.9 + (z > 0 ? 0 : 1.6), Math.PI / 2, 1);
    cleat(b, 6.05, DY, -2.5, Math.PI / 2, 1); cleat(b, 6.05, DY, 2.5, Math.PI / 2, 1);
    // ---- timber frame (posts, plates) visible from inside
    const TIM = [0.5, 0.4, 0.3];
    for (const s of [-1, 1]) for (let z = -3.45; z <= 3.46; z += 2.3) b.box(s * 4.93, (DY + EAVE) / 2, z, 0.1, EAVE - DY, 0.1, shade(TIM, 0.9 + 0.2 * r()));
    for (const x of [-2.5, 0, 2.5]) b.box(x, (DY + roofY(x)) / 2, -3.43, 0.1, roofY(x) - DY, 0.1, TIM);
    for (const s of [-1, 1]) { b.box(s * 4.93, EAVE - 0.06, 0, 0.12, 0.12, 7.0, TIM); b.box(s * 3.3, 1.8, 3.43, 0.12, 2.5, 0.12, TIM); }
    // rafters
    for (let z = -3.4; z <= 3.41; z += 0.85) for (const s of [-1, 1]) b.beam([0, RIDGE - 0.1, z], [s * 5.0, roofY(5) - 0.1, z], 0.07, shade(TIM, 0.85), 0.14);
    b.box(0, RIDGE - 0.1, 0, 0.1, 0.16, 7.4, TIM);
    for (const z of [-1.7, 1.7]) b.box(0, 3.3, z, 9.9, 0.1, 0.1, TIM);    // tie beams
    // ---- corrugated walls
    const P = 0.1, A = 0.014;
    corrWall(b, [-5.0, -3.5], [0, 1], 7.0, DY - 0.05, () => EAVE, WALL, P, A);
    corrWall(b, [5.0, -3.5], [0, 1], 7.0, DY - 0.05, () => EAVE, WALL, P, A);
    corrWall(b, [-5.0, -3.5], [1, 0], 10.0, DY - 0.05, s => roofY(-5 + s) - 0.02, WALL, P, A);
    for (const s of [-1, 1]) corrWall(b, [s > 0 ? 3.3 : -5.0, 3.5], [1, 0], 1.7, DY - 0.05, () => EAVE, WALL, P, A);
    corrWall(b, [-5.0, 3.5], [1, 0], 10.0, 3.0, s => roofY(-5 + s) - 0.02, WALL, P, A);   // front header + gable
    // trim: corner boards, bay opening frame, base flashing
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 5.02, (DY + EAVE) / 2, sz * 3.52, 0.08, EAVE - DY, 0.08, TRIM);
    for (const s of [-1, 1]) b.box(s * 3.33, 1.78, 3.53, 0.1, 2.46, 0.06, TRIM);
    b.box(0, 3.0, 3.53, 6.76, 0.1, 0.06, TRIM);
    // ---- roof: corrugated galvanised sheets (corrugations down the slope), ridge cap, fascia
    for (const s of [-1, 1]) {
      const z0 = -3.85, z1 = 3.9, waves = 60, nu = waves * 4;
      b.surf(nu, 2, (u, v) => { const z = z0 + (z1 - z0) * u, x = s * ROOF_X * v, o = 0.025 * Math.sin(u * waves * Math.PI * 2); return [x, roofY(x) + 0.03 + o, z]; },
        (u, v) => { const k = Math.floor(u * waves / 6.5), h = hash(k * 3 + (s > 0 ? 1 : 0)); let c = shade(GALV, 0.86 + 0.2 * h); if (h > 0.72 && v > 0.45) c = mix(c, RUST, 0.25 + 0.4 * (v - 0.45)); return c; });
      b.beam([0, RIDGE + 0.03, z0 - 0.02], [0, RIDGE + 0.03, z1 + 0.02], 0.02, GALV);
      b.push(mulAll(tr(s * 0.17, RIDGE + 0.04 - 0.012, 0), rotZ(-s * Math.atan2(0.7, ROOF_X)))); b.box(0, 0, (z0 + z1) / 2, 0.36, 0.015, z1 - z0 + 0.04, shade(GALV, 1.08)); b.pop();
      b.box(s * (ROOF_X + 0.02), 3.33, (z0 + z1) / 2, 0.05, 0.16, z1 - z0, TRIM);                     // fascia
      b.beam([s * 0.05, RIDGE, z1 + 0.02], [s * (ROOF_X + 0.02), 3.39, z1 + 0.02], 0.05, TRIM, 0.16);   // barge boards
      b.beam([s * 0.05, RIDGE, z0 - 0.02], [s * (ROOF_X + 0.02), 3.39, z0 - 0.02], 0.05, TRIM, 0.16);
      b.cyl([s * (ROOF_X + 0.06), 3.25, z0], [s * (ROOF_X + 0.06), 3.25, z1], 0.06, 0.06, 8, GALV, true); // gutter
    }
    // ---- side walkway railing (outer edge, x = 6.15): steel with a hazard-yellow top rail
    const RC = ARMOR_D;
    for (let z = -3.4; z <= 3.41; z += 1.36) b.box(6.12, DY + 0.55, z, 0.08, 1.1, 0.08, RC);
    b.box(6.12, DY + 1.08, 0, 0.12, 0.05, 6.9, HAZ); b.box(6.12, DY + 0.6, 0, 0.04, 0.08, 6.9, RC);
    for (let z = -3.35; z <= 3.36; z += 0.2) b.box(6.12, DY + 0.55, z, 0.025, 0.9, 0.025, RC);
    // ---- sealed door on the +X wall: heavy frame, gasket, locking wheel, hazard jambs
    { const zc = -1.3;
      b.box(5.04, DY + 1.08, zc, 0.08, 2.2, 1.08, ARMOR_D);
      b.box(5.085, DY + 1.05, zc, 0.03, 2.04, 0.92, BLACK);
      b.box(5.1, DY + 1.04, zc, 0.04, 1.96, 0.84, OLIVE);
      for (const y of [0.35, 1.04, 1.73]) b.box(5.125, DY + y, zc, 0.015, 0.08, 0.8, OLIVE_D);
      b.box(5.125, DY + 1.5, zc, 0.012, 0.22, 0.3, GLASS);
      b.push(mulAll(tr(5.16, DY + 1.0, zc), rotZ(Math.PI / 2))); torus(b, 0.11, 0.015, 10, 4, STEEL_D); b.beam([0, 0, -0.11], [0, 0, 0.11], 0.02, STEEL_D); b.beam([-0.11, 0, 0], [0.11, 0, 0], 0.02, STEEL_D); b.pop();
      b.cyl([5.12, DY + 1.0, zc], [5.17, DY + 1.0, zc], 0.03, 0.03, 6, STEEL_D);
      for (const s of [-1, 1]) hazard(b, [5.081, DY + 0.04, zc + (s > 0 ? 0.54 : -0.46)], [0, 1, 0], [0, 0, 1], 2.1, 0.08, 0.08);
      b.box(5.12, DY + 2.25, zc, 0.24, 0.05, 1.1, TRIM); b.box(5.08, DY + 2.15, zc - 0.65, 0.1, 0.1, 0.1, ARMOR_D); b.box(5.135, DY + 2.15, zc - 0.65, 0.01, 0.06, 0.06, AMBER); }
    // ---- armoured viewports with half-closed louvres
    const win = (x, y, z, ax) => { b.push(mulAll(tr(x, y, z), rotY(ax))); b.box(0, 0, 0.035, 0.84, 0.66, 0.06, ARMOR_D); b.box(0, 0, 0.068, 0.62, 0.42, 0.01, GLASS); b.box(0, 0, 0.072, 0.03, 0.42, 0.012, ARMOR_D);
      for (let k = 0; k < 2; k++) b.box(0, 0.16 - k * 0.1, 0.08, 0.66, 0.05, 0.02, ARMOR); b.box(0, 0.36, 0.08, 0.9, 0.06, 0.12, ARMOR_D); b.box(0, -0.34, 0.07, 0.9, 0.05, 0.1, ARMOR_D); b.pop(); };
    win(-5.0, 2.1, -1.5, -Math.PI / 2); win(-5.0, 2.1, 1.6, -Math.PI / 2); win(5.0, 2.1, 1.7, Math.PI / 2); win(-2.4, 2.1, -3.5, Math.PI); win(2.4, 2.1, -3.5, Math.PI);
    // ---- stencilled bay sign above the opening
    b.push(tr(0, 3.5, 3.6));
    b.box(0, 0, 0, 4.4, 0.8, 0.05, OLIVE_D);
    b.box(0, 0, -0.01, 4.5, 0.9, 0.04, ARMOR_D);
    b.push(tr(0, 0.1, 0.025)); text(b, 'SAMPLE BAY', 0.075, 0.02, HAZ); b.pop();
    hazard(b, [-2.1, -0.34, 0.026], [1, 0, 0], [0, 1, 0], 4.2, 0.12, 0.12);
    b.pop();
    for (const s of [-1, 1]) b.beam([s * 1.8, 3.3, 3.55], [s * 1.8, 3.0, 3.5], 0.04, STEEL_D);
    // ---- bay: heavy seal frame with hazard jambs, roll-up shutter raised into its housing
    for (const s of [-1, 1]) { b.box(s * 3.22, 1.8, 3.56, 0.16, 2.5, 0.1, ARMOR_D); hazard(b, [s * 3.22 + 0.07, DY + 0.05, 3.612], [0, 1, 0], [-1, 0, 0], 2.2, 0.14, 0.12); }
    b.box(0, 2.82, 3.62, 6.6, 0.36, 0.22, ARMOR_D);
    for (let k = 0; k < 3; k++) b.box(0, 2.72 + k * 0.1, 3.735, 6.5, 0.02, 0.01, STEEL_D);
    b.box(0, 2.6, 3.56, 6.3, 0.09, 0.06, OLIVE); b.box(0, 2.55, 3.56, 6.3, 0.02, 0.07, BLACK);
    b.box(-2.9, 2.82, 3.74, 0.3, 0.2, 0.02, OLIVE_D); b.box(-2.9, 2.85, 3.752, 0.06, 0.06, 0.006, AMBER);
    // ---- sensor cluster with a small dish at the front of the ridge (was a weather vane)
    { const z = 3.0, y = RIDGE + 0.05; b.box(0, y + 0.02, z, 0.24, 0.04, 0.24, STEEL_D); b.box(0, y + 0.55, z, 0.06, 1.1, 0.06, ARMOR_D);
      b.box(0, y + 0.85, z, 0.6, 0.04, 0.04, ARMOR_D);
      for (const s of [-1, 1]) { b.box(s * 0.27, y + 0.92, z, 0.1, 0.1, 0.1, ARMOR); b.box(s * 0.27, y + 0.92, z + 0.051, 0.06, 0.03, 0.004, s > 0 ? TEAL : AMBER); }
      b.push(mulAll(tr(0, y + 1.1, z), rotX(0.5))); b.cyl([0, 0, 0], [0, 0.12, 0], 0.012, 0.012, 5, STEEL_D, false); b.push(tr(0, 0.12, 0)); b.lathe([[0, 0], [0.18, 0.07], [0.2, 0.08]], 12, [0.66, 0.66, 0.63, 0.1]); b.pop(); b.pop(); }
    // ---- radio mast at the back of the ridge, with a beacon
    { const z = -2.8, y = RIDGE + 0.04; b.box(0.3, y + 0.05, z, 0.12, 0.1, 0.12, STEEL_D); b.cyl([0.3, y + 0.1, z], [0.3, y + 2.8, z], 0.02, 0.006, 6, [0.25, 0.25, 0.25, 0.2]);
      for (let k = 0; k < 3; k++) b.cyl([0.3, y + 0.5 + k * 0.5, z], [0.3, y + 0.56 + k * 0.5, z], 0.03, 0.03, 6, BLACK);
      b.cyl([0.3, y + 0.12, z], [0.3, y + 0.22, z], 0.05, 0.05, 8, AMBER);
      b.tube([[0.3, y + 0.1, z], [0.6, y - 0.05, z], [4.9, roofY(4.9) - 0.2, z], [4.9, 2.6, z]], 0.008, 4, BLACK); }
    // ---- rooftop heat exchanger on the +X slope
    { const x = 2.6, z = -1.0, a = Math.atan2(RIDGE - 3.38, ROOF_X); b.push(mulAll(tr(x, roofY(x) + 0.05, z), rotZ(-a)));
      for (const s of [-1, 1]) b.box(s * 0.45, 0.03, 0, 0.06, 0.06, 0.9, STEEL_D);
      b.box(0, 0.2, 0, 1.0, 0.28, 0.8, ARMOR_D); for (let k = 0; k < 7; k++) b.box(-0.42 + k * 0.14, 0.38, 0, 0.03, 0.08, 0.76, STEEL_D);
      hazard(b, [-0.5, 0.07, 0.401], [1, 0, 0], [0, 1, 0], 1.0, 0.08, 0.08); b.pop();
      b.tube([[x - 0.5, roofY(x - 0.5) + 0.2, z], [x - 1.2, roofY(x - 1.2) + 0.2, z], [x - 1.3, roofY(x - 1.3) + 0.03, z]], 0.06, 6, ARMOR); }
    // ---- external ducting and a filter intake on the -X wall
    { const x = -5.17, z = 0.05; b.box(x, 2.35, z, 0.18, 1.9, 0.3, ARMOR);
      b.box(x - 0.02, 1.2, z, 0.26, 0.5, 0.44, ARMOR_D);
      for (let k = 0; k < 5; k++) b.box(x - 0.16, 1.02 + k * 0.09, z, 0.02, 0.04, 0.4, STEEL_D);
      for (const y of [1.8, 2.6, 3.15]) b.box(x, y, z, 0.22, 0.05, 0.34, STEEL_D);
      b.box(x, 3.3, z, 0.26, 0.12, 0.38, ARMOR_D); }
    // ---- stencilled unit code and a cable run on the back wall
    stencil(b, mulAll(tr(0, 2.3, -3.535), rotY(Math.PI)), 'SR-5', 0.09, shade(HAZ, 0.9));
    b.cyl([-4.9, 3.1, -3.56], [4.9, 3.1, -3.56], 0.025, 0.025, 5, CABLE, false); for (let x = -4.5; x <= 4.6; x += 1.5) b.box(x, 3.1, -3.55, 0.04, 0.08, 0.04, STEEL_D);
    // ---- external gas cylinders strapped to the +X wall on the side walkway
    for (const z of [2.45, 2.9]) { b.cyl([5.36, DY, z], [5.36, DY + 1.3, z], 0.17, 0.17, 12, OLIVE, false); b.push(tr(5.36, DY + 1.3, z)); b.lathe([[0.17, 0], [0.14, 0.08], [0.06, 0.13], [0, 0.14]], 12, OLIVE); b.pop();
      b.cyl([5.36, DY + 1.44, z], [5.36, DY + 1.54, z], 0.025, 0.025, 6, STEEL_D); b.box(5.36, DY + 1.55, z, 0.03, 0.02, 0.14, [0.62, 0.14, 0.1]);
      b.cyl([5.36, DY + 0.9, z], [5.36, DY + 0.98, z], 0.173, 0.173, 12, HAZ, false); }
    for (const y of [0.5, 1.1]) b.box(5.1, DY + y, 2.68, 0.06, 0.05, 0.9, STEEL_D);
    b.tube([[5.36, DY + 1.56, 2.45], [5.36, DY + 1.64, 2.68], [5.36, DY + 1.56, 2.9]], 0.012, 4, STEEL_D);
    b.tube([[5.36, DY + 1.62, 2.68], [5.1, DY + 1.72, 2.68], [5.03, DY + 1.72, 2.68]], 0.015, 5, CABLE);
    // ---- inside: stacked sample crates on a shelf, sealed canisters, workbench
    { const sx = 1.8, sz = -3.15; for (const y of [0.9, 1.5]) b.box(sx, y, sz, 1.6, 0.04, 0.5, TIM); for (const s of [-1, 1]) b.box(sx + s * 0.78, 1.1, sz, 0.05, 1.1, 0.5, TIM);
      const LJ = [[0.42, 0.44, 0.36], [0.5, 0.5, 0.48], [0.3, 0.46, 0.44], [0.8, 0.62, 0.15]];
      for (const [y0, n] of [[DY, 6], [0.92, 4], [1.52, 5]]) for (let st = 0; st < 3; st++) for (let k = 0; k < n - st; k++) {
        const c = LJ[Math.floor(r() * 4)], x = sx - 0.5 + st * 0.5 + (r() - 0.5) * 0.04, y = y0 + 0.035 + k * 0.07, z = sz + (r() - 0.5) * 0.04;
        b.box(x, y, z, 0.42, 0.065, 0.34, c); b.box(x, y + 0.004, z + 0.172, 0.3, 0.02, 0.005, BLACK); }
      for (let k = 0; k < 4; k++) { const x = -2.8 + k * 0.42; b.box(x, 2.25, -3.38, 0.05, 0.05, 0.08, STEEL_D); b.box(x, 1.95, -3.36, 0.36, 0.5, 0.08, LJ[k % 4]); b.box(x, 1.95, -3.315, 0.36, 0.04, 0.005, BLACK); b.box(x, 1.8, -3.315, 0.36, 0.04, 0.005, BLACK); } }
    { const cans = [OLIVE, OLIVE, ARMOR, HAZ, OLIVE];
      for (let k = 0; k < 5; k++) { const x = -4.6 + (k % 3) * 0.3, z = -3.1 + Math.floor(k / 3) * 0.45, y = DY + (k > 2 ? 0 : 0); b.push(mulAll(tr(x, y, z), rotY(0.15 * (r() - 0.5))));
        b.box(0, 0.24, 0, 0.18, 0.46, 0.34, cans[k]); b.box(0, 0.24, 0.172, 0.12, 0.3, 0.008, shade(cans[k], 0.8)); for (const s of [-1, 1]) b.box(0, 0.24, s * 0.06, 0.185, 0.3, 0.02, shade(cans[k], 0.85));
        b.beam([0, 0.5, -0.1], [0, 0.5, 0.05], 0.03, shade(cans[k], 0.9)); b.cyl([0, 0.47, 0.11], [0, 0.55, 0.14], 0.025, 0.02, 6, BLACK); b.pop(); } }
    { const x = -4.5, z = 0.6; b.box(x, DY + 0.9, z, 0.6, 0.06, 1.8, shade(TIM, 1.1)); for (const dz of [-0.8, 0.8]) b.box(x, DY + 0.45, z + dz, 0.5, 0.9, 0.06, TIM);
      b.box(x, DY + 0.3, z, 0.5, 0.04, 1.6, TIM); b.box(x + 0.05, DY + 1.0, z - 0.4, 0.3, 0.14, 0.2, OLIVE); b.box(x - 0.1, DY + 0.97, z + 0.3, 0.2, 0.08, 0.3, ARMOR); b.box(x - 0.1, DY + 1.015, z + 0.3, 0.12, 0.01, 0.18, TEAL);
      ropeCoil(b, x, DY + 0.3, z + 0.45, 0.04, 0.17, 4, CABLE_O); b.cyl([-4.97, 1.4, z - 0.9], [-4.97, 1.4, z + 0.9], 0.02, 0.02, 6, STEEL_D); }
    // ceiling light, sampling probe poles leaning in a corner, a stencilled hazard placard on the outer wall
    b.box(0, 3.25, 0, 0.12, 0.12, 1.2, [0.95, 0.94, 0.85, 0.4]);
    for (let k = 0; k < 3; k++) { b.cyl([4.75 - k * 0.08, DY, -3.3], [4.85 - k * 0.08, DY + 1.6, -3.2], 0.018, 0.018, 6, STEEL_D); b.box(4.75 - k * 0.08, DY + 0.16, -3.3, 0.05, 0.3, 0.07, k === 1 ? HAZ : OLIVE_D); }
    b.box(5.05, 2.0, 0.9, 0.03, 0.5, 0.5, ARMOR_D); hazard(b, [5.068, 2.12, 1.13], [0, 0, -1], [0, 1, 0], 0.46, 0.1, 0.06);
    stencil(b, mulAll(tr(5.068, 1.95, 0.9), rotY(Math.PI / 2)), 'HZ-5', 0.025, HAZ);
    return b;
  }
  const boathouseColliders = [
    { type: 'box', x: 0, z: 0.02, hx: 5.45, hz: 3.88, rot: 0, top: EAVE, solid: false },
    { type: 'box', x: -4.15, z: 0, hx: 0.85, hz: 3.5, rot: 0, top: DY, solid: false },
    { type: 'box', x: 4.6, z: 0, hx: 1.6, hz: 3.5, rot: 0, top: DY, solid: false },
    { type: 'box', x: 0, z: -2.65, hx: 3.3, hz: 0.85, rot: 0, top: DY, solid: false }
  ];
  // =====================================================================================
  // 3. PONTOON BOAT -> rugged survey barge on the same pontoons
  // =====================================================================================
  const PB_DECK = 0.6, PB_TOP = 2.36;
  const CARPET = [0.3, 0.31, 0.29], CUSH = [0.26, 0.27, 0.26], PIPE = HAZ, PANEL = ARMOR, STRIPE = HAZ, CANVAS = ARMOR_D;
  const TUBE = [0.38, 0.39, 0.36, 0.1], TUBE_D = [0.3, 0.31, 0.29, 0.08];
  // one pontoon tube (along Z) centred at x, centre height cy, radius R, flat stern cap at z0, raked nose cone ending at z1
  function pontoonTube(b, x, cy, R, z0, z1, nu) {
    const zs = [[z0, 0, 0], [z0, R * 0.92, 0], [z0 + 0.03, R, 0], [z1 - 0.7, R, 0], [z1 - 0.45, R * 0.95, 0.03], [z1 - 0.25, R * 0.78, 0.09], [z1 - 0.1, R * 0.48, 0.15], [z1 - 0.02, R * 0.18, 0.19], [z1, 0, 0.2]];
    b.surf(nu, zs.length - 1, (u, v) => { const j = Math.round(v * (zs.length - 1)), q = zs[j], a = u * Math.PI * 2; return [x + q[1] * Math.cos(a), cy + q[2] + q[1] * Math.sin(a), q[0]]; },
      (u, v) => { const yy = Math.sin(u * Math.PI * 2); return yy < -0.05 ? mix(TUBE_D, ALGAE, 0.35) : (Math.abs(yy - 0.15) < 0.12 ? shade(TUBE, 0.85) : TUBE); }, true);
    for (const s of [-1, 1]) b.beam([x + s * R * 0.92, cy - R * 0.38, z0 + 0.3], [x + s * R * 0.92, cy - R * 0.38, z1 - 0.8], 0.03, TUBE_D);   // lifting strakes
  }
  // rugged guard rail: square posts, hazard-yellow top rail, armour kick plate with a hazard band outside
  function fenceRun(b, a, c, out) {   // a, c = [x, z]; out = outward normal [x, z]
    const y0 = PB_DECK, L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(L / 0.9)), d = [(c[0] - a[0]) / L, (c[1] - a[1]) / L];
    for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (c[0] - a[0]) * t, z = a[1] + (c[1] - a[1]) * t; b.box(x, y0 + 0.43, z, 0.05, 0.86, 0.05, ARMOR_D); b.box(x, y0 + 0.01, z, 0.09, 0.02, 0.09, STEEL_D); }
    b.beam([a[0], y0 + 0.86, a[1]], [c[0], y0 + 0.86, c[1]], 0.05, HAZ);
    b.beam([a[0], y0 + 0.64, a[1]], [c[0], y0 + 0.64, c[1]], 0.03, ARMOR_D);
    const p = (x, z, y) => [x, y, z];
    b.plate(p(a[0], a[1], y0 + 0.05), p(c[0], c[1], y0 + 0.05), p(c[0], c[1], y0 + 0.46), p(a[0], a[1], y0 + 0.46), ARMOR);
    const outFace = -d[1] * out[0] + d[0] * out[1] > 0, s0 = outFace ? a : c, u = outFace ? [d[0], 0, d[1]] : [-d[0], 0, -d[1]];
    if (L < 1.5) hazard(b, [s0[0] + out[0] * 0.012, y0 + 0.34, s0[1] + out[1] * 0.012], u, [0, 1, 0], L, 0.09, 0.1);
    else b.plate([s0[0] + out[0] * 0.012, y0 + 0.36, s0[1] + out[1] * 0.012], [s0[0] + out[0] * 0.012 + u[0] * L, y0 + 0.36, s0[1] + out[1] * 0.012 + u[2] * L], [s0[0] + out[0] * 0.012 + u[0] * L, y0 + 0.42, s0[1] + out[1] * 0.012 + u[2] * L], [s0[0] + out[0] * 0.012, y0 + 0.42, s0[1] + out[1] * 0.012], OLIVE_D);
  }
  function buildPontoon(detail) {
    const b = new MB();
    if (!detail) {
      for (const s of [-1, 1]) { b.cyl([s * 0.9, 0.02, -3.35], [s * 0.9, 0.02, 3.0], 0.3, 0.3, 6, TUBE); b.cyl([s * 0.9, 0.02, 3.0], [s * 0.9, 0.22, 3.62], 0.3, 0.03, 6, TUBE); }
      b.box(0, 0.5, -0.05, 2.5, 0.2, 6.7, ARMOR_D); b.box(0, 0.6, -0.05, 2.45, 0.02, 6.6, CARPET);
      for (const s of [-1, 1]) { b.box(s * 1.2, 0.85, -0.05, 0.03, 0.5, 6.1, PANEL); b.box(s * 1.215, 0.98, -0.05, 0.01, 0.1, 6.1, STRIPE); } b.box(0, 0.85, -3.0, 2.4, 0.5, 0.03, PANEL); b.box(0, 0.85, 3.1, 1.7, 0.5, 0.03, PANEL);
      b.box(0, PB_TOP - 0.04, -0.5, 2.4, 0.08, 2.2, CANVAS); for (const s of [-1, 1]) b.box(s * 1.17, 1.45, -0.5, 0.06, 1.8, 0.06, ARMOR_D);
      b.box(0, 0.75, -3.8, 0.46, 0.9, 0.66, OLIVE); b.box(0.8, 1.0, 0.2, 0.5, 0.8, 0.7, ARMOR);
      b.box(-0.6, 2.58, -1.2, 0.06, 0.45, 0.06, ARMOR_D); b.box(0, 1.35, 3.25, 0.7, 1.5, 0.06, HAZ);
      return b;
    }
    // ---- tubes and under-deck structure
    for (const s of [-1, 1]) pontoonTube(b, s * 0.9, 0.02, 0.31, -3.35, 3.62, 40);
    for (let z = -3.1; z <= 2.95; z += 0.5) { b.box(0, 0.43, z, 2.4, 0.07, 0.05, STEEL_D); for (const s of [-1, 1]) b.box(s * 0.9, 0.36, z, 0.34, 0.06, 0.07, STEEL_D); }
    // deck with rounded bow, composite grip deck on top, rub rail and skirt
    const outline = [[-1.25, -3.3], [1.25, -3.3], [1.25, 2.85], [1.1, 3.2], [0.75, 3.38], [-0.75, 3.38], [-1.1, 3.2], [-1.25, 2.85]];
    b.extrude(outline, 0.47, PB_DECK - 0.01, [0.32, 0.33, 0.32], CARPET);
    b.extrude(outline.map(p => [p[0] * 0.985, p[1] * 0.99]), PB_DECK - 0.01, PB_DECK, CARPET, CARPET);
    for (let z = -3.05; z < 2.9; z += 0.42) topRect(b, -1.15, z - 0.05, 1.15, z + 0.05, PB_DECK + 0.002, shade(CARPET, 0.75));
    for (let i = 0; i < outline.length; i++) { const a = outline[i], c = outline[(i + 1) % outline.length]; b.beam([a[0] * 1.012, PB_DECK - 0.04, a[1] * 1.005], [c[0] * 1.012, PB_DECK - 0.04, c[1] * 1.005], 0.06, BLACK, 0.08); }
    for (const s of [-1, 1]) { b.plate([s * 1.26, 0.38, -3.1], [s * 1.26, 0.38, 2.7], [s * 1.26, 0.53, 2.7], [s * 1.26, 0.53, -3.1], ARMOR_D); b.plate([s * 1.262, 0.42, -3.0], [s * 1.262, 0.42, 2.6], [s * 1.262, 0.45, 2.6], [s * 1.262, 0.45, -3.0], HAZ); }
    // ---- guard rails (bow gate gap, port boarding gate gap, stern ladder gap)
    fenceRun(b, [1.2, -3.0], [1.2, 2.75], [1, 0]); fenceRun(b, [1.2, 2.75], [0.85, 3.12], [0.7, 0.7]); fenceRun(b, [0.85, 3.12], [0.42, 3.12], [0, 1]);
    fenceRun(b, [-0.42, 3.12], [-0.85, 3.12], [0, 1]); fenceRun(b, [-0.85, 3.12], [-1.2, 2.75], [-0.7, 0.7]); fenceRun(b, [-1.2, 2.75], [-1.2, 0.62], [-1, 0]);
    fenceRun(b, [-1.2, -0.22], [-1.2, -3.0], [-1, 0]); fenceRun(b, [-1.2, -3.0], [-0.5, -3.0], [0, -1]); fenceRun(b, [0.12, -3.0], [1.2, -3.0], [0, -1]);
    const gate = (hx, hz, ang, w) => { b.push(mulAll(tr(hx, PB_DECK, hz), rotY(ang))); b.box(w / 2, 0.86, 0, w, 0.05, 0.05, HAZ); b.box(w / 2, 0.1, 0, w, 0.03, 0.03, ARMOR_D); b.box(w - 0.02, 0.46, 0, 0.04, 0.76, 0.04, ARMOR_D);
      b.box(w / 2, 0.27, 0, w - 0.04, 0.4, 0.012, ARMOR); b.box(w / 2, 0.64, 0, w - 0.04, 0.03, 0.03, ARMOR_D); b.box(w - 0.07, 0.72, 0.02, 0.06, 0.06, 0.04, BLACK); b.pop(); };
    gate(0.42, 3.12, Math.PI, 0.84);
    gate(-1.2, -0.22, -0.55, 0.84);
    // ---- instrument deck: equipment cabinets, sample well, cylinder rack, rack of instruments
    const cab = (x0, x1, z0, z1, h, col, face) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, sx = x1 - x0, sz = z1 - z0, y = PB_DECK;
      b.box(cx, y + 0.03, cz, sx + 0.03, 0.06, sz + 0.03, STEEL_D); b.box(cx, y + h / 2, cz, sx, h, sz, col); b.box(cx, y + h + 0.02, cz, sx + 0.03, 0.04, sz + 0.03, shade(col, 0.8));
      const fx = cx + face * (sx / 2 + 0.004), n = Math.max(1, Math.round(sz / 0.55));
      for (let i = 0; i < n; i++) { const z = z0 + (i + 0.5) * sz / n; b.box(fx, y + h * 0.5, z, 0.01, h * 0.8, sz / n - 0.06, shade(col, 0.9)); b.box(fx + face * 0.01, y + h * 0.78, z, 0.02, 0.05, 0.1, ARMOR_D); }
      hazard(b, [fx + face * 0.002, y + 0.06, face > 0 ? z1 : z0], [0, 0, face > 0 ? -1 : 1], [0, 1, 0], sz, 0.07, 0.07);
    };
    // bow: rugged cases to starboard, instrument rack to port (screens face inboard)
    cab(0.62, 1.17, 1.0, 2.7, 0.5, OLIVE, -1);
    for (const z of [1.45, 2.25]) { b.box(0.9, PB_DECK + 0.6, z, 0.5, 0.16, 0.7, OLIVE_D); b.box(0.9, PB_DECK + 0.6, z + 0.351, 0.12, 0.06, 0.01, ARMOR_D); b.box(0.645, PB_DECK + 0.62, z, 0.012, 0.04, 0.5, HAZ); }
    cab(-1.17, -0.62, 1.0, 2.7, 0.72, ARMOR, 1);
    for (const z of [1.3, 1.85, 2.4]) { b.box(-0.6, PB_DECK + 0.55, z, 0.012, 0.18, 0.3, GLASS); b.box(-0.595, PB_DECK + 0.55, z, 0.008, 0.1, 0.22, z > 2 ? AMBER : TEAL); }
    // sample well (moon-pool hatch) amidships in the bow
    { const z = 1.9; b.box(0, PB_DECK + 0.03, z, 0.86, 0.06, 0.86, ARMOR_D); topRect(b, -0.35, z - 0.35, 0.35, z + 0.35, PB_DECK + 0.061, BLACK);
      for (let k = -2; k <= 2; k++) b.box(k * 0.13, PB_DECK + 0.07, z, 0.03, 0.02, 0.72, STEEL_D);
      hazard(b, [-0.43, PB_DECK + 0.062, z + 0.43], [1, 0, 0], [0, 0, -1], 0.86, 0.07, 0.07); hazard(b, [0.43, PB_DECK + 0.062, z - 0.43], [-1, 0, 0], [0, 0, 1], 0.86, 0.07, 0.07); }
    // winch on the foredeck and an A-frame davit over the bow with a line down to a sensor probe
    { const z = 2.75, y = PB_DECK; b.box(0, y + 0.02, z, 0.7, 0.04, 0.4, STEEL_D);
      for (const s of [-1, 1]) { b.box(s * 0.27, y + 0.18, z, 0.04, 0.32, 0.34, OLIVE); hazard(b, [s * 0.27 + s * 0.021, y + 0.06, z + s * 0.17], [0, 0, -s], [0, 1, 0], 0.34, 0.08, 0.06); }
      b.cyl([-0.25, y + 0.22, z], [0.25, y + 0.22, z], 0.07, 0.07, 10, STEEL_D); b.cyl([-0.2, y + 0.22, z], [0.2, y + 0.22, z], 0.11, 0.11, 12, CABLE);
      b.box(-0.38, y + 0.2, z, 0.16, 0.2, 0.22, ARMOR_D); for (let k = 0; k < 3; k++) b.box(-0.46, y + 0.14 + k * 0.06, z, 0.01, 0.03, 0.2, STEEL_D);
      for (const s of [-1, 1]) b.beam([s * 0.36, y, 2.98], [s * 0.3, y + 1.3, 3.5], 0.06, HAZ);
      b.beam([-0.33, y + 1.3, 3.5], [0.33, y + 1.3, 3.5], 0.07, HAZ);
      b.cyl([-0.04, y + 1.2, 3.5], [0.04, y + 1.2, 3.5], 0.07, 0.07, 10, STEEL_D);
      b.cyl([0, y + 0.33, z + 0.05], [0, y + 1.26, 3.45], 0.008, 0.008, 4, CABLE, false);
      b.cyl([0, y + 1.13, 3.56], [0, -0.2, 3.56], 0.008, 0.008, 4, CABLE, false);
      b.cyl([0, -0.2, 3.56], [0, -0.48, 3.56], 0.055, 0.055, 8, HAZ); b.cyl([0, -0.48, 3.56], [0, -0.56, 3.56], 0.055, 0.015, 8, STEEL_D);
      for (const s of [-1, 1]) b.box(s * 0.07, -0.34, 3.56, 0.012, 0.3, 0.012, ARMOR_D); }
    // stern: cylinder rack, battery / power unit, port instrument rack under the roof
    { const z = -2.7; b.box(0.68, PB_DECK + 0.03, z, 0.95, 0.06, 0.4, STEEL_D);
      for (const x of [0.4, 0.68, 0.96]) { b.cyl([x, PB_DECK + 0.06, z], [x, PB_DECK + 0.85, z], 0.11, 0.11, 10, OLIVE, false); b.push(tr(x, PB_DECK + 0.85, z)); b.lathe([[0.11, 0], [0.08, 0.06], [0, 0.09]], 10, OLIVE); b.pop();
        b.cyl([x, PB_DECK + 0.55, z], [x, PB_DECK + 0.61, z], 0.113, 0.113, 10, HAZ, false); b.cyl([x, PB_DECK + 0.94, z], [x, PB_DECK + 1.0, z], 0.02, 0.02, 6, STEEL_D); }
      for (const y of [0.35, 0.75]) b.box(0.68, PB_DECK + y, z + 0.12, 0.95, 0.04, 0.03, ARMOR_D); }
    cab(0.62, 1.17, -2.42, -1.5, 0.62, OLIVE_D, -1);
    for (let k = 0; k < 5; k++) b.box(0.89, PB_DECK + 0.66, -2.3 + k * 0.17, 0.5, 0.06, 0.03, STEEL_D);
    cab(-1.17, -0.62, -2.97, -0.9, 1.05, ARMOR, 1);
    for (const z of [-2.55, -1.85, -1.25]) { b.box(-0.6, PB_DECK + 0.78, z, 0.012, 0.26, 0.4, GLASS); b.box(-0.595, PB_DECK + 0.78, z, 0.008, 0.06, 0.3, TEAL); b.box(-0.598, PB_DECK + 0.84, z, 0.008, 0.03, 0.2, [0.55, 0.9, 0.35, 0.4]); }
    // ---- operator chair
    { const x = 0.75, z = -0.72; b.box(x, PB_DECK + 0.2, z, 0.08, 0.4, 0.08, ARMOR_D); b.box(x, PB_DECK + 0.02, z, 0.4, 0.04, 0.4, STEEL_D); b.box(x, PB_DECK + 0.47, z, 0.5, 0.12, 0.48, CUSH); b.box(x, PB_DECK + 0.8, z - 0.23, 0.5, 0.56, 0.12, CUSH); b.box(x, PB_DECK + 0.9, z - 0.24, 0.51, 0.04, 0.13, HAZ); for (const s of [-1, 1]) b.box(x + s * 0.27, PB_DECK + 0.62, z, 0.05, 0.05, 0.35, BLACK); }
    // ---- helm console with wheel, throttle and windscreen
    { const x = 0.82, z = 0.25, y = PB_DECK;
      b.box(x, y + 0.45, z, 0.6, 0.9, 0.7, ARMOR); b.box(x, y + 0.45, z - 0.351, 0.5, 0.8, 0.01, OLIVE_D); hazard(b, [x + 0.25, y + 0.08, z - 0.356], [-1, 0, 0], [0, 1, 0], 0.5, 0.08, 0.06);
      b.push(mulAll(tr(x, y + 0.98, z - 0.15), rotX(0.45))); b.box(0, 0, 0, 0.6, 0.12, 0.5, [0.14, 0.14, 0.15, 0.1]);
      for (let k = 0; k < 3; k++) { b.box(-0.18 + k * 0.18, 0.065, 0.05, 0.14, 0.012, 0.1, GLASS); b.box(-0.18 + k * 0.18, 0.072, 0.05, 0.1, 0.004, 0.04, k === 1 ? AMBER : TEAL); }
      b.box(0.0, 0.065, -0.12, 0.3, 0.01, 0.16, GLASS); b.box(0.0, 0.071, -0.12, 0.24, 0.004, 0.1, TEAL);
      b.cyl([0, 0.06, 0.18], [0, 0.18, 0.12], 0.025, 0.02, 8, BLACK);
      b.pop();
      b.push(mulAll(tr(x - 0.08, y + 1.05, z - 0.42), rotX(-0.55))); torus(b, 0.17, 0.02, 16, 5, BLACK); b.beam([-0.16, 0, 0], [0.16, 0, 0], 0.025, ARMOR_D); b.beam([0, 0, -0.16], [0, 0, 0.16], 0.025, ARMOR_D); b.cyl([0, -0.03, 0], [0, 0.05, 0], 0.035, 0.035, 8, ARMOR_D); b.pop();
      b.cyl([x - 0.08, y + 1.0, z - 0.33], [x - 0.08, y + 1.05, z - 0.42], 0.02, 0.02, 6, BLACK);
      b.box(x + 0.32, y + 0.95, z - 0.2, 0.06, 0.16, 0.16, BLACK); b.beam([x + 0.32, y + 1.0, z - 0.2], [x + 0.34, y + 1.2, z - 0.3], 0.025, ARMOR_D); b.box(x + 0.34, y + 1.22, z - 0.31, 0.06, 0.06, 0.06, BLACK);
      b.push(mulAll(tr(x, y + 1.15, z + 0.02), rotX(-0.35))); b.box(0, 0.12, 0, 0.6, 0.26, 0.012, [0.14, 0.18, 0.2, 0.5]); b.box(0, 0.255, 0, 0.64, 0.03, 0.03, ARMOR_D); for (const s of [-1, 1]) b.box(s * 0.31, 0.12, 0, 0.03, 0.28, 0.03, ARMOR_D); b.pop(); }
    // ---- rigid armoured roof on a roll cage, light bar, sensor mast, dish
    const cz0 = -1.6, cz1 = 0.6, rY = PB_TOP - 0.035;
    b.box(0, rY, (cz0 + cz1) / 2, 2.42, 0.06, cz1 - cz0, ARMOR);
    for (const s of [-1, 1]) b.box(s * 1.2, rY + 0.03, (cz0 + cz1) / 2, 0.05, 0.05, cz1 - cz0 + 0.04, ARMOR_D);
    for (const z of [cz0, cz1]) b.box(0, rY + 0.03, z, 2.44, 0.05, 0.05, ARMOR_D);
    for (let x = -0.9; x <= 0.91; x += 0.45) b.box(x, rY + 0.035, (cz0 + cz1) / 2, 0.03, 0.02, cz1 - cz0 - 0.1, STEEL_D);
    for (const s of [-1, 1]) for (const z of [cz0 + 0.05, cz1 - 0.05]) { b.box(s * 1.17, (PB_DECK + rY) / 2, z, 0.06, rY - PB_DECK, 0.06, ARMOR_D); }
    for (const s of [-1, 1]) { b.beam([s * 1.17, PB_DECK + 0.9, cz0 + 0.05], [s * 1.17, rY - 0.05, cz1 - 0.55], 0.04, ARMOR_D); b.box(s * 1.17, PB_DECK + 0.9, (cz0 + cz1) / 2, 0.04, 0.04, cz1 - cz0 - 0.1, ARMOR_D); }
    b.box(0, rY - 0.08, cz1 + 0.04, 1.4, 0.1, 0.1, ARMOR_D);
    for (let k = 0; k < 4; k++) b.box(-0.51 + k * 0.34, rY - 0.08, cz1 + 0.092, 0.26, 0.06, 0.008, [0.96, 0.94, 0.82, 0.4]);
    { const mx = -0.6, mz = -1.2; b.box(mx, rY + 0.04, mz, 0.2, 0.03, 0.2, STEEL_D); b.box(mx, rY + 0.25, mz, 0.05, 0.42, 0.05, ARMOR_D);
      b.box(mx, rY + 0.33, mz, 0.42, 0.07, 0.1, ARMOR); b.box(mx, rY + 0.33, mz + 0.051, 0.36, 0.03, 0.004, TEAL);
      b.cyl([mx, rY + 0.46, mz], [mx, rY + 0.49, mz], 0.06, 0.06, 8, ARMOR_D);
      b.cyl([mx + 0.12, rY + 0.04, mz + 0.05], [mx + 0.12, rY + 0.5, mz + 0.05], 0.008, 0.004, 4, BLACK, false);
      b.cyl([mx, rY + 0.38, mz], [mx, rY + 0.44, mz], 0.035, 0.035, 6, AMBER); }
    b.push(mulAll(tr(0.55, rY + 0.04, -1.25), rotX(-0.6))); b.cyl([0, 0, 0], [0, 0.12, 0], 0.015, 0.015, 5, STEEL_D, false); b.push(tr(0, 0.12, 0)); b.lathe([[0, 0], [0.2, 0.07], [0.22, 0.08]], 12, [0.66, 0.66, 0.63, 0.1]); b.pop(); b.pop();
    b.tube([[-1.17, rY - 0.05, cz0 + 0.12], [-1.12, PB_DECK + 1.2, cz0 + 0.12], [-1.1, PB_DECK + 0.9, -1.75]], 0.018, 5, CABLE);
    // ---- armoured electric drive pod on the stern
    { const z = -3.3, y = PB_DECK;
      b.box(0, 0.45, z - 0.06, 0.5, 0.3, 0.12, ARMOR_D); b.box(0, 0.6, z - 0.15, 0.24, 0.4, 0.14, ARMOR_D);
      b.box(0, y + 0.42, z - 0.5, 0.46, 0.44, 0.66, OLIVE); b.box(0, y + 0.66, z - 0.5, 0.5, 0.04, 0.7, OLIVE_D);
      for (let k = 0; k < 5; k++) b.box(0, y + 0.7, z - 0.26 - k * 0.12, 0.4, 0.04, 0.03, STEEL_D);
      for (const s of [-1, 1]) { b.box(s * 0.236, y + 0.42, z - 0.5, 0.012, 0.3, 0.52, OLIVE_D); hazard(b, [s * 0.243, y + 0.22, z - (s > 0 ? 0.8 : 0.2)], [0, 0, s], [0, 1, 0], 0.6, 0.07, 0.06); }
      stencil(b, mulAll(tr(0.244, y + 0.48, z - 0.5), rotY(Math.PI / 2)), 'SB-5', 0.022, HAZ);
      b.box(0, y - 0.15, z - 0.48, 0.15, 0.9, 0.26, ARMOR_D);
      b.box(0, -0.1, z - 0.48, 0.42, 0.02, 0.5, ARMOR_D);
      b.box(0, -0.25, z - 0.46, 0.11, 0.3, 0.22, ARMOR_D);
      b.cyl([0, -0.4, z - 0.25], [0, -0.4, z - 0.74], 0.07, 0.06, 10, ARMOR_D);
      b.box(0, -0.53, z - 0.5, 0.03, 0.14, 0.2, ARMOR_D);
      b.cyl([0, -0.4, z - 0.66], [0, -0.4, z - 0.86], 0.15, 0.15, 12, OLIVE_D, false);
      for (const s of [-1, 1]) b.box(0, -0.4 + s * 0.08, z - 0.76, 0.02, 0.14, 0.04, ARMOR_D);
      for (let k = 0; k < 3; k++) { b.push(mulAll(tr(0, -0.4, z - 0.78), rotZ(k * Math.PI * 2 / 3), rotY(0.35))); b.box(0, 0.07, 0, 0.08, 0.12, 0.012, [0.45, 0.46, 0.48, 0.35]); b.pop(); }
      b.cyl([0.08, 0.6, z - 0.1], [0.12, 0.8, z + 0.25], 0.02, 0.02, 6, CABLE, false);
      b.box(0, 0.7, z - 0.32, 0.1, 0.18, 0.12, ARMOR_D); }
    // boarding ladder at the stern gap
    for (const s of [-1, 1]) b.cyl([-0.19 + s * 0.17, PB_DECK + 0.02, -3.28], [-0.19 + s * 0.17, -0.5, -3.42], 0.016, 0.016, 6, ARMOR_D);
    for (let k = 0; k < 4; k++) b.box(-0.19, 0.4 - k * 0.27, -3.32 - k * 0.03, 0.34, 0.025, 0.06, HAZ);
    b.tube([[-0.36, PB_DECK, -3.25], [-0.36, PB_DECK + 0.5, -3.25], [-0.32, PB_DECK + 0.62, -3.22]], 0.016, 6, ARMOR_D);
    // ---- clamps, rubber bumpers, antenna with beacon, bow lights
    for (const s of [-1, 1]) { cleat(b, s * 0.95, PB_DECK, -3.18, 0, 1); cleat(b, s * 0.55, PB_DECK, 3.26, 0, 1); }
    for (const z of [-1.8, 1.6]) { b.box(-1.33, 0.68, z, 0.18, 0.56, 0.24, RUBBER); for (const yy of [0.5, 0.86]) b.box(-1.33, yy, z, 0.19, 0.03, 0.25, STEEL_D); b.tube([[-1.33, 0.96, z], [-1.3, 1.25, z], [-1.22, 1.43, z]], 0.008, 4, CABLE); }
    b.cyl([0.6, PB_DECK + 0.84, -2.98], [0.6, PB_DECK + 1.9, -2.98], 0.012, 0.006, 6, BLACK); b.cyl([0.6, PB_DECK + 1.9, -2.98], [0.6, PB_DECK + 1.97, -2.98], 0.03, 0.03, 6, AMBER);
    b.box(0, PB_DECK + 0.05, 3.3, 0.2, 0.06, 0.06, BLACK); b.box(-0.06, PB_DECK + 0.05, 3.33, 0.08, 0.04, 0.01, [0.9, 0.1, 0.1, 0.4]); b.box(0.06, PB_DECK + 0.05, 3.33, 0.08, 0.04, 0.01, [0.1, 0.8, 0.3, 0.4]);
    // equipment case and a coiled signal cable on the deck
    b.box(-0.2, PB_DECK + 0.2, -2.2, 0.55, 0.38, 0.36, OLIVE); b.box(-0.2, PB_DECK + 0.41, -2.2, 0.58, 0.05, 0.39, OLIVE_D); for (const s of [-1, 1]) b.box(-0.2 + s * 0.18, PB_DECK + 0.3, -2.019, 0.08, 0.08, 0.02, ARMOR_D);
    hazard(b, [-0.475, PB_DECK + 0.06, -2.017], [1, 0, 0], [0, 1, 0], 0.55, 0.06, 0.06);
    ropeCoil(b, -0.75, PB_DECK, 0.0, 0.04, 0.15, 4, CABLE_O);
    // stencilled unit codes on the skirt
    for (const s of [-1, 1]) { b.push(mulAll(tr(s * 1.27, 0.49, 2.0), rotY(s * Math.PI / 2))); text(b, 'SB-5', 0.02, 0.005, HAZ); b.pop(); }
    return b;
  }
  // =====================================================================================
  // 4. SKIFF
  // =====================================================================================
  // skiff hull section at t (0 = transom, 1 = bow): half-beam, chine half-width, sheer / chine / keel heights
  function skSec(t) {
    const q = Math.max(0, (t - 0.42) / 0.58), hb = t < 0.42 ? 0.72 + 0.09 * Math.sin(t / 0.42 * Math.PI / 2) : 0.81 * (1 - Math.pow(q, 1.8));
    const ky = -0.25 + 0.55 * Math.pow(Math.max(0, (t - 0.7) / 0.3), 1.8), sy = 0.42 + 0.17 * t * t * t;
    return { hb, cw: hb * 0.8, sy, cy: Math.min(sy - 0.06, ky + 0.07 + 0.1 * t), ky, z: -2.25 + 4.5 * t };
  }
  function skPt(t, w, side, inset) {     // w: 0 keel .. 0.5 chine .. 1 sheer
    const s = skSec(t), i = inset || 0; let x, y;
    if (w <= 0.5) { const f = w / 0.5; x = s.cw * f; y = s.ky + (s.cy - s.ky) * f; } else { const f = (w - 0.5) / 0.5; x = s.cw + (s.hb - s.cw) * f; y = s.cy + (s.sy - s.cy) * f; }
    return [side * Math.max(0, x - i), y + i * 0.8, s.z];
  }
  function skHalfW(t, y) { const s = skSec(t); return y >= s.cy ? s.cw + (s.hb - s.cw) * Math.min(1, (y - s.cy) / (s.sy - s.cy)) : s.cw * Math.max(0, (y - s.ky) / (s.cy - s.ky)); }
  const SK_GREEN = [0.33, 0.35, 0.27, 0.08], SK_ALU = [0.42, 0.43, 0.42, 0.14], SK_IN = [0.4, 0.41, 0.39, 0.12], WOOD = [0.36, 0.36, 0.33, 0.04];
  function buildSkiff(detail) {
    const b = new MB();
    const NU = detail ? 36 : 6, NV = detail ? 16 : 4;
    const hullFn = inset => (u, v) => { const side = v < 0.5 ? -1 : 1, w = Math.abs(v - 0.5) * 2; return skPt(u * (inset ? 0.985 : 1), w, side, inset); };
    b.surf(NU, NV, hullFn(0), (u, v) => Math.abs(v - 0.5) * 2 > 0.55 ? SK_GREEN : SK_ALU);
    if (!detail) {
      const pts = []; for (let k = 0; k <= 4; k++) { const w = k / 4; pts.push(skPt(0, 1 - w, -1)); } for (let k = 1; k <= 4; k++) pts.push(skPt(0, k / 4, 1));
      for (let k = 1; k < pts.length - 1; k++) b.tri(b.v(...pts[0], 0, 0, -1, SK_GREEN), b.v(...pts[k], 0, 0, -1, SK_GREEN), b.v(...pts[k + 1], 0, 0, -1, SK_GREEN));
      for (const z of [-1.7, -0.2, 1.1]) b.box(0, 0.3, z, 1.4, 0.04, 0.28, WOOD);
      b.box(0, 0.45, -2.45, 0.3, 0.9, 0.4, ARMOR_D);
      return b;
    }
    b.surf(NU, NV, hullFn(0.022), SK_IN);
    // transom (outer and inner faces) as a fan
    for (const [ins, col] of [[0, SK_GREEN], [0.022, SK_IN]]) {
      const pts = []; for (let k = 0; k <= 8; k++) pts.push(skPt(0, 1 - k / 8, -1, ins)); for (let k = 1; k <= 8; k++) pts.push(skPt(0, k / 8, 1, ins));
      const c = [0, (pts[0][1] + pts[8][1]) / 2, -2.25 + ins]; const ci = b.v(c[0], c[1], c[2], 0, 0, -1, col);
      for (let k = 0; k < pts.length - 1; k++) b.tri(ci, b.v(pts[k][0], pts[k][1], -2.25 + ins, 0, 0, -1, col), b.v(pts[k + 1][0], pts[k + 1][1], -2.25 + ins, 0, 0, -1, col));
      b.beam([pts[0][0], pts[0][1], -2.25 + ins], [pts[16][0], pts[16][1], -2.25 + ins], 0.02, SK_ALU);
    }
    b.box(0, 0.36, -2.21, 0.42, 0.16, 0.06, WOOD);                     // motor pad
    // gunwale caps, chine and spray rails
    for (const side of [-1, 1]) {
      const g = [], ch = [], sp = []; for (let i = 0; i <= 30; i++) { const t = i / 30; g.push(skPt(t, 1, side, 0.01)); ch.push(skPt(t, 0.5, side)); sp.push(skPt(t, 0.78, side)); }
      g[30] = [0, skSec(1).sy, 2.25];
      b.tube(g, 0.026, 6, SK_ALU); b.tube(ch.slice(0, 29), 0.012, 4, SK_ALU); b.tube(sp.slice(0, 29), 0.009, 4, shade(SK_GREEN, 0.8));
    }
    { const k = []; for (let i = 0; i <= 30; i++) k.push(skPt(i / 30, 0, 1)); b.tube(k, 0.018, 4, SK_ALU); }   // keel strip
    // ribs inside, with rivets showing outside
    for (let t = 0.07; t < 0.9; t += 0.075) {
      const pts = []; for (let k = 0; k <= 16; k++) { const v = k / 16, side = v < 0.5 ? -1 : 1; pts.push(skPt(t, Math.abs(v - 0.5) * 2, side, 0.035)); }
      b.tube(pts, 0.014, 4, shade(SK_IN, 0.85));
      for (let k = 1; k < 16; k++) { if (k === 8) continue; const v = k / 16, side = v < 0.5 ? -1 : 1, w = Math.abs(v - 0.5) * 2, p = skPt(t, w, side, -0.003), p2 = skPt(t, Math.min(1, w + 0.02), side, -0.003), d = K.norm(K.sub(p2, p)), e = 0.009;
        b.plate([p[0] - d[0] * e, p[1] - d[1] * e, p[2] - e], [p[0] + d[0] * e, p[1] + d[1] * e, p[2] - e], [p[0] + d[0] * e, p[1] + d[1] * e, p[2] + e], [p[0] - d[0] * e, p[1] - d[1] * e, p[2] + e], shade(SK_ALU, 1.15)); }
    }
    // floor slats
    for (const x of [-0.27, -0.09, 0.09, 0.27]) b.box(x, -0.15, -0.5, 0.15, 0.02, 3.0, shade(WOOD, 0.8 + 0.1 * Math.abs(x) * 3));
    // three bench seats
    for (const t of [0.1, 0.43, 0.74]) { const s = skSec(t), hw = skHalfW(t, 0.3) - 0.04; b.box(0, 0.3, s.z, 2 * hw, 0.04, 0.3, WOOD); b.box(0, 0.3, s.z + 0.12, 2 * hw, 0.045, 0.04, shade(WOOD, 0.85)); b.box(0, 0.26, s.z, 2 * hw, 0.05, 0.26, SK_IN);
      b.box(0, 0.08, s.z, 0.05, 0.4, 0.05, SK_IN); }
    // ---- rugged retrofit: thruster pod, sensor mast, battery, sampling boom, instrument cases
    // ducted electric thruster on a strut below the transom (replaces the outboard)
    { const z = -2.25; b.box(0, 0.3, z - 0.08, 0.32, 0.24, 0.14, ARMOR_D); for (const s of [-1, 1]) b.cyl([s * 0.08, 0.3, z + 0.0], [s * 0.08, 0.3, z + 0.06], 0.025, 0.025, 6, STEEL_D);
      b.box(0, 0.04, z - 0.2, 0.1, 0.52, 0.16, ARMOR_D); hazard(b, [0.051, 0.24, z - 0.12], [0, 0, -1], [0, 1, 0], 0.16, 0.12, 0.05);
      b.cyl([0, -0.22, z - 0.06], [0, -0.22, z - 0.42], 0.065, 0.05, 8, OLIVE_D);
      b.cyl([0, -0.22, z - 0.28], [0, -0.22, z - 0.47], 0.115, 0.115, 10, OLIVE_D, false);
      for (const s of [-1, 1]) b.box(s * 0.08, -0.22, z - 0.38, 0.06, 0.016, 0.03, ARMOR_D);
      for (let k = 0; k < 3; k++) { b.push(mulAll(tr(0, -0.22, z - 0.4), rotZ(k * Math.PI * 2 / 3), rotY(0.4))); b.box(0, 0.055, 0, 0.05, 0.09, 0.008, [0.5, 0.5, 0.52, 0.35]); b.pop(); }
      b.box(0, -0.33, z - 0.24, 0.02, 0.1, 0.2, ARMOR_D); }
    // sensor mast on the transom: A-braced post, forward sensor bar, rear beacon, GPS puck, whip antenna, side dish
    { const z = -2.1, y0 = 0.42; b.box(0, y0 + 0.0, z, 0.34, 0.05, 0.16, ARMOR_D);
      b.box(0, y0 + 0.42, z, 0.06, 0.8, 0.06, ARMOR_D);
      for (const s of [-1, 1]) b.beam([s * 0.15, y0 + 0.02, z], [0, y0 + 0.45, z], 0.025, ARMOR_D);
      b.box(0, y0 + 0.62, z + 0.02, 0.3, 0.08, 0.1, ARMOR); b.box(0, y0 + 0.62, z + 0.072, 0.24, 0.03, 0.004, TEAL);
      b.box(0, y0 + 0.5, z - 0.045, 0.08, 0.06, 0.03, AMBER);
      b.box(0, y0 + 0.83, z, 0.12, 0.03, 0.12, ARMOR_D); b.cyl([0, y0 + 0.845, z], [0, y0 + 0.88, z], 0.05, 0.05, 8, ARMOR);
      b.cyl([0.05, y0 + 0.85, z + 0.04], [0.05, 1.35, z + 0.04], 0.008, 0.004, 4, BLACK, false);
      b.push(mulAll(tr(0.03, y0 + 0.35, z), rotZ(-1.0))); b.cyl([0, 0, 0], [0, 0.08, 0], 0.01, 0.01, 4, STEEL_D, false); b.push(tr(0, 0.08, 0)); b.lathe([[0, 0], [0.1, 0.04], [0.11, 0.05]], 10, [0.66, 0.66, 0.63, 0.1]); b.pop(); b.pop();
      b.tube([[0.03, y0 + 0.05, z + 0.03], [0.2, 0.25, -1.95], [0.36, 0.12, -1.95]], 0.012, 5, CABLE); }
    // armoured battery box (replaces the fuel tank)
    { const x = 0.36, z = -1.95; b.box(x, -0.02, z, 0.3, 0.24, 0.48, OLIVE); b.box(x, 0.105, z, 0.32, 0.02, 0.5, OLIVE_D); for (let k = 0; k < 3; k++) b.box(x - 0.155, -0.02, z - 0.12 + k * 0.12, 0.012, 0.18, 0.05, OLIVE_D);
      hazard(b, [x + 0.151, -0.1, z + 0.24], [0, 0, -1], [0, 1, 0], 0.48, 0.06, 0.06); b.box(x, 0.125, z + 0.12, 0.08, 0.02, 0.06, AMBER); }
    // sampling boom on the starboard gunwale with a line down to a probe
    { const p = skPt(0.5, 1, 1, 0.02), x = p[0] - 0.04, z = p[2]; b.box(x, p[1] + 0.03, z, 0.1, 0.06, 0.12, ARMOR_D); b.box(x, p[1] + 0.22, z, 0.05, 0.38, 0.05, ARMOR_D);
      b.beam([x - 0.02, p[1] + 0.4, z], [0.92, p[1] + 0.4, z], 0.04, HAZ); b.beam([x, p[1] + 0.1, z], [x + 0.14, p[1] + 0.38, z], 0.025, ARMOR_D);
      b.cyl([0.91, p[1] + 0.38, z], [0.91, -0.12, z], 0.005, 0.005, 4, CABLE, false); b.cyl([0.91, -0.12, z], [0.91, -0.3, z], 0.032, 0.032, 6, HAZ); }
    // armoured foredeck cover over the bow with a hatch and a light bar
    { const q = [skPt(0.8, 1, -1, 0.02), skPt(0.8, 1, 1, 0.02), skPt(0.985, 1, 1, 0.02), skPt(0.985, 1, -1, 0.02)].map(p => [p[0], p[1] + 0.01, p[2]]);
      b.plate(q[0], q[1], q[2], q[3], ARMOR); b.plate([q[0][0], q[0][1] - 0.15, q[0][2]], [q[1][0], q[1][1] - 0.15, q[1][2]], q[1], q[0], ARMOR_D);
      const zc = (q[0][2] + q[2][2]) / 2, yc = (q[0][1] + q[2][1]) / 2; b.push(mulAll(tr(0, yc + 0.012, zc), rotX(-Math.atan2(q[2][1] - q[0][1], q[2][2] - q[0][2])))); b.box(0, 0, -0.05, 0.36, 0.02, 0.3, OLIVE_D); b.box(0, 0.012, -0.05, 0.08, 0.02, 0.04, STEEL_D);
      b.box(0, 0.03, 0.22, 0.3, 0.05, 0.06, ARMOR_D); b.box(0, 0.03, 0.252, 0.26, 0.03, 0.004, [0.96, 0.94, 0.82, 0.4]); b.pop(); }
    // instrument cases on the seats
    { const z = skSec(0.43).z; b.box(-0.25, 0.42, z, 0.34, 0.2, 0.24, ARMOR); b.box(-0.25, 0.53, z, 0.36, 0.02, 0.26, ARMOR_D); b.box(-0.25, 0.42, z + 0.121, 0.1, 0.04, 0.004, TEAL);
      const z2 = skSec(0.74).z; b.box(0.15, 0.4, z2, 0.3, 0.16, 0.22, OLIVE); b.box(0.15, 0.49, z2, 0.32, 0.02, 0.24, OLIVE_D); b.cyl([0.26, 0.5, z2 - 0.06], [0.26, 0.9, z2 - 0.06], 0.006, 0.003, 4, BLACK, false); }
    // anchor with coiled line in the bow
    { const z = 1.55, y = skSec(0.85).ky + 0.08; b.push(mulAll(tr(0.08, y, z), rotY(0.3)));
      b.box(0, 0.02, 0, 0.03, 0.03, 0.5, [0.35, 0.36, 0.37, 0.2]); b.box(0, 0.02, -0.22, 0.36, 0.03, 0.04, [0.35, 0.36, 0.37, 0.2]);
      for (const s of [-1, 1]) b.extrude([[s * 0.04, -0.22], [s * 0.18, -0.24], [s * 0.12, 0.06]], 0.005, 0.02, [0.38, 0.38, 0.4, 0.2]);
      b.push(tr(0, 0.02, 0.27)); b.push(rotZ(Math.PI / 2)); torus(b, 0.03, 0.008, 8, 4, STEEL_D); b.pop(); b.pop(); b.pop();
      ropeCoil(b, -0.12, y - 0.01, z - 0.25, 0.04, 0.12, 4, CABLE_O); }
    // bow eye, stern handles, a cleat each side
    b.push(mulAll(tr(0, 0.42, 2.27), rotY(Math.PI / 2), rotZ(Math.PI / 2))); torus(b, 0.035, 0.009, 10, 4, SK_ALU); b.pop();
    for (const side of [-1, 1]) { const p = skPt(0.02, 1, side, 0.05); b.tube([[p[0], p[1], -2.2], [p[0], p[1] + 0.07, -2.15], [p[0], p[1] + 0.07, -2.0], [p[0], p[1], -1.95]], 0.012, 5, SK_ALU); const q = skPt(0.9, 1, side, 0.06); cleat(b, q[0], q[1] - 0.005, q[2], Math.PI / 2, 1); }
    // stencilled unit code on the bow sides
    for (const side of [-1, 1]) { const p = skPt(0.76, 0.82, side, -0.012); b.push(mulAll(tr(p[0], p[1], p[2]), rotY(side * Math.PI / 2 - side * 0.25))); text(b, 'SR-5', 0.016, 0.004, HAZ); b.pop(); }
    return b;
  }
  // =====================================================================================
  // 5. BUOY
  // =====================================================================================
  // instrument buoy: float dome in hazard yellow, a low frame with three small solar panels, beacon and whip antenna on top, sensor cage below
  function buildBuoy(detail) {
    const b = new MB(), Y = [0.8, 0.62, 0.14, 0.06], Yd = [0.64, 0.5, 0.14, 0.06], G = [0.3, 0.31, 0.3, 0.1];
    if (!detail) { b.lathe([[0, -0.45], [0.39, -0.24], [0.45, 0.06, G], [0.42, 0.22], [0, 0.45]], 5, Y); b.box(0, 0.5, 0, 0.3, 0.14, 0.3, ARMOR_D); return b; }
    const prof = []; for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + Math.PI * k / 8, y = 0.45 * Math.sin(a), rr = 0.45 * Math.cos(a); prof.push([rr, y, (y > 0.0 && y < 0.2) ? G : (y < -0.02 ? Yd : Y)]); }
    prof[0][0] = 0; prof[8][0] = 0;
    b.lathe(prof, 12, Y);
    // low instrument frame on the crown: four legs, deck plate, three tilted solar panels, beacon and whip antenna
    for (const [a, d] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(a * 0.1, 0.47, d * 0.1, 0.025, 0.12, 0.025, ARMOR_D);
    b.box(0, 0.54, 0, 0.3, 0.025, 0.3, ARMOR_D);
    for (let k = 0; k < 3; k++) { b.push(mulAll(rotY(k * Math.PI * 2 / 3 + 0.5), tr(0, 0.51, 0.2), rotX(0.6))); b.box(0, 0, 0, 0.2, 0.015, 0.13, ARMOR_D); b.box(0, 0.009, 0, 0.18, 0.004, 0.11, SOLAR); b.pop(); }
    b.cyl([0, 0.555, 0], [0, 0.62, 0], 0.04, 0.04, 6, AMBER);
    b.cyl([0.09, 0.555, 0.09], [0.09, 0.72, 0.09], 0.007, 0.004, 4, BLACK, false);
    // sensor cage under the float: four bars and a base plate around a sensor canister
    for (const [a, d] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(a * 0.08, -0.53, d * 0.08, 0.02, 0.2, 0.02, ARMOR_D);
    b.box(0, -0.641, 0, 0.2, 0.022, 0.2, ARMOR_D);
    b.cyl([0, -0.44, 0], [0, -0.63, 0], 0.05, 0.05, 6, TEAL);
    return b;
  }

  return {
    name: 'marina',
    items: [
      { name: 'dock', budget: 60000, build: buildDock, colliders: dockColliders },
      { name: 'boathouse', budget: 20000, build: buildBoathouse, colliders: boathouseColliders },
      { name: 'pontoon_boat', budget: 14000, build: buildPontoon, colliders: [{ type: 'box', x: 0, z: 0.03, hx: 1.25, hz: 3.33, rot: 0, top: PB_DECK, solid: false }, { type: 'box', x: 0, z: -0.5, hx: 1.2, hz: 1.1, rot: 0, top: PB_TOP, solid: false }] },
      { name: 'skiff', budget: 9000, build: buildSkiff, colliders: [{ type: 'box', x: 0, z: -0.15, hx: 0.68, hz: 1.95, rot: 0, top: 0.32, solid: false }] },
      { name: 'buoy', budget: 500, build: buildBuoy }
    ]
  };
}) };
