window.MODDEF = { fn: (function (K) {
  // MARINA: a small floating marina on a desert reservoir. For every item y = 0 is the WATER SURFACE.
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd } = K;

  // ---------- palette ----------
  const STEEL = [0.52, 0.54, 0.55, 0.15], STEEL_D = [0.36, 0.37, 0.38, 0.15], RUST = [0.4, 0.27, 0.18, 0.05];
  const ALU = [0.74, 0.76, 0.78, 0.25], ALU_D = [0.58, 0.6, 0.62, 0.2];
  const RUBBER = [0.11, 0.11, 0.12, 0.05], WHITE = [0.9, 0.9, 0.87, 0.1], ORANGE = [0.95, 0.42, 0.08, 0.08];
  const RED = [0.74, 0.12, 0.1, 0.15], YELLOW = [0.92, 0.74, 0.12, 0.1], BLACK = [0.07, 0.07, 0.08, 0.05];
  const GLASS = [0.08, 0.12, 0.16, 0.5], ROPE = [0.82, 0.76, 0.6], ROPE_B = [0.25, 0.42, 0.7];
  const FLOAT = [0.78, 0.76, 0.7, 0.05], ALGAE = [0.33, 0.37, 0.2], SOLAR = [0.1, 0.14, 0.3, 0.45];
  const DECKC = [0.53, 0.46, 0.37], DECKG = [0.5, 0.49, 0.46];
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
  // mooring cleat centred at (x, y, z) with its horn along local X turned by ang
  function cleat(b, x, y, z, ang, detail) {
    b.push(mulAll(tr(x, y, z), rotY(ang || 0)));
    b.box(0, 0.01, 0, 0.16, 0.02, 0.07, ALU_D);
    if (detail) { b.cyl([-0.05, 0, 0], [-0.04, 0.06, 0], 0.022, 0.018, 6, ALU); b.cyl([0.05, 0, 0], [0.04, 0.06, 0], 0.022, 0.018, 6, ALU); b.cyl([-0.15, 0.075, 0], [0.15, 0.075, 0], 0.012, 0.012, 6, ALU); b.cyl([-0.05, 0.075, 0], [0.05, 0.075, 0], 0.024, 0.024, 6, ALU); }
    b.pop();
  }
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
    // ---- main walkway: planks across Z, pitch 0.15 along X
    for (let x = -25 + 0.075; x < 25; x += 0.15) { const c = plankCol(r); b.box(x + (r() - 0.5) * 0.004, DY - 0.02 - r() * 0.004, (r() - 0.5) * 0.02, 0.138, 0.04, 2.36, c); screws(b, [[x - 0.035, -1.1], [x + 0.035, -1.1], [x - 0.035, -0.45], [x + 0.035, -0.45], [x - 0.035, 0.45], [x + 0.035, 0.45], [x - 0.035, 1.1], [x + 0.035, 1.1]], DY); }
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
      for (let z = 1.2 + 0.075; z < 10.2; z += 0.15) { const c = plankCol(r); b.box(fx + (r() - 0.5) * 0.015, DY - 0.02 - r() * 0.004, z, 1.12, 0.04, 0.138, c); screws(b, [[fx - 0.52, z - 0.035], [fx - 0.52, z + 0.035], [fx, z], [fx + 0.52, z - 0.035], [fx + 0.52, z + 0.035]], DY); }
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
      if (fx !== 18) { b.cyl([fx - 0.42, DY, 10.0], [fx - 0.42, DY + 0.8, 10.0], 0.07, 0.07, 10, [0.25, 0.3, 0.28, 0.15]); b.cyl([fx - 0.42, DY + 0.8, 10.0], [fx - 0.42, DY + 0.92, 10.0], 0.075, 0.075, 10, [0.95, 0.92, 0.75, 0.4]); b.cyl([fx - 0.42, DY + 0.92, 10.0], [fx - 0.42, DY + 0.97, 10.0], 0.09, 0.02, 10, [0.25, 0.3, 0.28, 0.15]); }
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
      b.push(tr(px, 0.42, pz)); torus(b, 0.27, 0.035, 20, 6, STEEL_D); b.pop();       // hoop
      b.push(tr(px, 0.42, pz)); torus(b, 0.205, 0.025, 20, 5, RUBBER); b.pop();       // UHMW roller ring
      b.beam([sx * 25.04, 0.42, pz - 0.18], [px - sx * 0.2, 0.42, pz - 0.18], 0.07, STEEL_D);
      b.beam([sx * 25.04, 0.42, pz + 0.18], [px - sx * 0.2, 0.42, pz + 0.18], 0.07, STEEL_D);
      b.box(sx * 25.06, 0.42, pz, 0.03, 0.22, 0.5, STEEL);
    }
    // ---- lamp posts with solar lamps (on the -Z side, plus none at the gangway)
    for (const x of [-24, -12, 12, 24]) lampPost(b, x, -1.02);
    // ---- life rings on posts
    for (const x of [-15, 9]) { b.box(x, DY + 0.75, -1.05, 0.09, 1.5, 0.09, WHITE); b.box(x, DY + 1.42, -0.97, 0.05, 0.05, 0.12, STEEL_D); lifeRing(b, x, DY + 1.1, -0.93, 0, 1); b.box(x, DY + 1.58, -1.0, 0.24, 0.1, 0.01, RED); }
    // ---- fire extinguisher box on a post beside the gangway
    { const x = 2.2, z = -1.05; b.box(x, DY + 0.6, z, 0.08, 1.2, 0.08, STEEL); b.box(x, DY + 1.05, z + 0.17, 0.36, 0.6, 0.26, RED); b.box(x, DY + 1.05, z + 0.305, 0.28, 0.48, 0.01, [0.85, 0.85, 0.8, 0.4]);
      b.box(x, DY + 1.22, z + 0.312, 0.2, 0.06, 0.01, WHITE); b.box(x, DY + 1.05, z + 0.31, 0.08, 0.3, 0.005, RED); b.cyl([x, DY + 0.82, z + 0.3], [x, DY + 1.18, z + 0.3], 0.055, 0.055, 10, [0.85, 0.1, 0.08, 0.3]); b.box(x + 0.15, DY + 1.05, z + 0.32, 0.02, 0.08, 0.02, STEEL_D); }
    // ---- dock boxes
    for (const [x, c] of [[-20, WHITE], [-8.5, [0.82, 0.84, 0.86, 0.1]], [16, WHITE]]) dockBox(b, x, -0.82, c);
    // ---- coiled ropes
    ropeCoil(b, -11.2, DY, 0.62, 0.06, 0.24, 6, ROPE);
    ropeCoil(b, 4.2, DY, 0.7, 0.05, 0.2, 5, ROPE_B);
    ropeCoil(b, -6.3, DY, 8.8, 0.05, 0.19, 5, ROPE);
    // ---- fuel pump kiosk at the +18 finger tip
    fuelKiosk(b, 18, 9.2);
    // ---- 'no wake' buoy off the east end
    noWakeBuoy(b, 30, 7);
    // ---- gangway and shore landing
    gangway(b);
    landing(b);
    return b;
  }

  function powerPedestal(b, x, y, z) {
    b.box(x, y + 0.02, z, 0.36, 0.04, 0.26, STEEL_D);
    b.box(x, y + 0.5, z, 0.28, 0.92, 0.2, [0.78, 0.8, 0.78, 0.1]);
    b.box(x, y + 1.0, z, 0.32, 0.1, 0.24, [0.25, 0.42, 0.3, 0.1]);
    b.box(x, y + 1.07, z, 0.18, 0.05, 0.14, [0.95, 0.9, 0.7, 0.4]);
    for (const s of [-1, 1]) { b.box(x + s * 0.07, y + 0.62, z + 0.105, 0.09, 0.12, 0.02, BLACK); b.box(x + s * 0.07, y + 0.75, z + 0.103, 0.07, 0.03, 0.01, YELLOW); }
    b.box(x, y + 0.35, z + 0.104, 0.18, 0.12, 0.01, [0.6, 0.62, 0.6, 0.3]);
  }
  function dockBox(b, x, z, c) {
    const y = DY;
    b.box(x, y + 0.03, z, 1.5, 0.06, 0.58, shade(c, 0.85));
    b.box(x, y + 0.32, z, 1.46, 0.52, 0.54, c);
    b.box(x, y + 0.6, z, 1.52, 0.06, 0.6, shade(c, 1.05));
    b.box(x, y + 0.63, z, 1.4, 0.02, 0.5, shade(c, 0.95));
    b.box(x, y + 0.5, z + 0.29, 0.14, 0.08, 0.04, BLACK);        // latch
    for (const s of [-1, 1]) b.box(x + s * 0.55, y + 0.62, z - 0.3, 0.12, 0.04, 0.03, STEEL);   // hinges
    b.box(x - 0.45, y + 0.36, z + 0.276, 0.36, 0.08, 0.005, [0.2, 0.35, 0.6]);  // marina sticker
  }
  function lampPost(b, x, z) {
    const y = DY, P = [0.24, 0.27, 0.26, 0.2];
    b.box(x, y + 0.02, z, 0.26, 0.04, 0.26, STEEL_D);
    b.cyl([x, y, z], [x, y + 3.3, z], 0.055, 0.045, 10, P);
    b.cyl([x, y + 3.2, z], [x, y + 3.25, z + 0.55], 0.03, 0.03, 8, P);                    // arm toward the deck
    b.cyl([x, y + 3.32, z + 0.6], [x, y + 3.2, z + 0.6], 0.16, 0.18, 14, P);             // shade
    b.cyl([x, y + 3.2, z + 0.6], [x, y + 3.17, z + 0.6], 0.15, 0.12, 14, [0.96, 0.94, 0.82, 0.4]);  // lens
    // solar panel tilted on top
    b.push(mulAll(tr(x, y + 3.45, z - 0.05), rotX(-0.55)));
    b.box(0, 0, 0, 0.62, 0.035, 0.48, ALU_D); b.box(0, 0.02, 0, 0.58, 0.01, 0.44, SOLAR);
    for (let i = -1; i <= 1; i++) b.box(i * 0.145, 0.026, 0, 0.006, 0.004, 0.44, [0.6, 0.62, 0.66, 0.3]);
    b.pop();
    b.cyl([x, y + 3.3, z], [x, y + 3.42, z - 0.05], 0.025, 0.025, 6, P);
    b.box(x, y + 1.6, z - 0.06, 0.12, 0.22, 0.06, [0.3, 0.32, 0.3, 0.1]);             // battery box
  }
  function fuelKiosk(b, fx, z) {
    const y = DY, GRN = [0.16, 0.42, 0.3, 0.15];
    // canopy on two posts
    for (const s of [-1, 1]) b.box(fx + s * 0.52, y + 1.25, z - 0.35, 0.07, 2.5, 0.07, STEEL);
    b.box(fx, y + 2.52, z - 0.05, 1.3, 0.06, 1.0, [0.86, 0.86, 0.82, 0.15]);
    b.box(fx, y + 2.42, z + 0.45, 1.32, 0.22, 0.04, GRN);
    b.push(mulAll(tr(fx, y + 2.42, z + 0.475))); text(b, 'FUEL', 0.035, 0.012, WHITE); b.pop();
    // pump cabinet
    b.box(fx, y + 0.04, z - 0.3, 0.6, 0.08, 0.42, STEEL_D);
    b.box(fx, y + 0.65, z - 0.3, 0.54, 1.2, 0.36, [0.85, 0.84, 0.8, 0.1]);
    b.box(fx, y + 1.0, z - 0.3, 0.56, 0.5, 0.38, GRN);
    b.box(fx, y + 1.08, z - 0.108, 0.3, 0.14, 0.01, GLASS);
    b.box(fx, y + 1.09, z - 0.104, 0.26, 0.04, 0.005, [0.3, 0.8, 0.4, 0.4]);
    b.box(fx, y + 0.86, z - 0.11, 0.2, 0.1, 0.01, BLACK);
    b.box(fx, y + 1.3, z - 0.3, 0.6, 0.06, 0.4, [0.85, 0.84, 0.8, 0.1]);
    for (let i = 0; i < 3; i++) b.box(fx - 0.1 + i * 0.1, y + 0.55, z - 0.11, 0.06, 0.03, 0.01, i === 1 ? RED : YELLOW);
    // nozzle holster + nozzle on the side, hose coiled down onto the deck
    b.box(fx + 0.29, y + 0.9, z - 0.3, 0.05, 0.16, 0.1, BLACK);
    b.beam([fx + 0.33, y + 0.98, z - 0.3], [fx + 0.36, y + 0.82, z - 0.27], 0.035, [0.2, 0.55, 0.3, 0.2]);
    b.cyl([fx + 0.36, y + 0.82, z - 0.27], [fx + 0.38, y + 0.66, z - 0.3], 0.012, 0.01, 6, ALU);
    const pts = [[fx + 0.27, y + 1.15, z - 0.3], [fx + 0.4, y + 1.1, z - 0.3], [fx + 0.45, y + 0.6, z - 0.25]];
    for (let i = 0; i <= 26; i++) { const a = i / 13 * Math.PI * 2; pts.push([fx + 0.45 + 0.08 * Math.cos(a), y + 0.4 - i * 0.012, z - 0.05 + 0.18 * Math.sin(a)]); }
    pts.push([fx + 0.4, y + 0.06, z + 0.1], [fx + 0.3, y + 0.03, z + 0.3]);
    b.tube(pts, 0.02, 6, BLACK);
    b.box(fx - 0.2, y + 0.65, z - 0.11, 0.08, 0.08, 0.01, [0.9, 0.85, 0.2]);   // spill sign
    // spill kit bin
    b.box(fx - 0.38, y + 0.25, z + 0.25, 0.3, 0.5, 0.3, YELLOW); b.box(fx - 0.38, y + 0.51, z + 0.25, 0.32, 0.04, 0.32, shade(YELLOW, 0.8));
  }
  function noWakeBuoy(b, x, z) {
    b.push(tr(x, 0, z));
    b.lathe([[0, -0.9], [0.24, -0.9], [0.24, 1.25], [0.2, 1.3], [0, 1.32]], 18, WHITE);
    b.cyl([0, -0.3, 0], [0, 0.25, 0], 0.45, 0.45, 20, [0.95, 0.95, 0.92, 0.1]);       // foam collar
    b.cyl([0, 0.25, 0], [0, 0.3, 0], 0.45, 0.4, 20, [0.85, 0.85, 0.82, 0.1]);
    for (const y of [0.4, 1.15]) b.cyl([0, y, 0], [0, y + 0.08, 0], 0.243, 0.243, 18, ORANGE, false);
    b.cyl([0, 1.3, 0], [0, 1.45, 0], 0.02, 0.02, 6, STEEL); b.push(tr(0, 1.5, 0)); b.push(rotX(Math.PI / 2)); torus(b, 0.05, 0.012, 10, 4, STEEL); b.pop(); b.pop();
    for (const s of [1, -1]) {
      b.push(rotY(s > 0 ? 0 : Math.PI));
      // orange diamond
      const dc = [0, 0.82, 0.25], d = 0.17; b.beam([0, dc[1] + d, 0.25], [d, dc[1], 0.25], 0.035, ORANGE); b.beam([d, dc[1], 0.25], [0, dc[1] - d, 0.25], 0.035, ORANGE); b.beam([0, dc[1] - d, 0.25], [-d, dc[1], 0.25], 0.035, ORANGE); b.beam([-d, dc[1], 0.25], [0, dc[1] + d, 0.25], 0.035, ORANGE);
      b.box(0, 0.82, 0.225, 0.3, 0.3, 0.05, WHITE);
      b.push(tr(0, 0.86, 0.25)); text(b, 'NO', 0.022, 0.01, BLACK); b.pop();
      b.push(tr(0, 0.77, 0.25)); text(b, 'WAKE', 0.014, 0.01, BLACK); b.pop();
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
  }

  function landing(b) {
    const y = 12, z0 = -37, zc = -39, hw = 2;
    // deck planks across X
    const r = rnd(77);
    for (let z = z0 - 0.075; z > z0 - 4; z -= 0.15) b.box((r() - 0.5) * 0.02, y - 0.02, z, 3.94, 0.04, 0.138, plankCol(r));
    // frame
    for (const s of [-1, 1]) { b.box(s * 1.96, y - 0.17, zc, 0.1, 0.26, 4.0, STEEL); b.box(0, y - 0.17, zc + s * 1.96, 4.0, 0.26, 0.1, STEEL); }
    for (let k = -1; k <= 1; k++) b.box(k * 1.0, y - 0.14, zc, 0.07, 0.2, 3.9, STEEL_D);
    // legs (8 m below the platform) with base plates & bracing
    const LX = 1.82, LZ = [z0 - 0.18, z0 - 3.82];
    for (const sx of [-1, 1]) for (const lz of LZ) { b.cyl([sx * LX, y - 0.3, lz], [sx * LX, y - 8, lz], 0.13, 0.13, 14, STEEL); b.box(sx * LX, y - 0.3, lz, 0.4, 0.04, 0.4, STEEL_D); b.cyl([sx * LX, y - 5.0, lz], [sx * LX, y - 8, lz], 0.135, 0.135, 14, RUST, false); }
    for (const sx of [-1, 1]) { b.beam([sx * LX, y - 0.6, LZ[0]], [sx * LX, y - 4.5, LZ[1]], 0.07, STEEL_D); b.beam([sx * LX, y - 0.6, LZ[1]], [sx * LX, y - 4.5, LZ[0]], 0.07, STEEL_D); b.box(sx * LX, y - 4.6, zc, 0.08, 0.1, 3.64, STEEL_D); }
    for (const lz of LZ) { b.beam([-LX, y - 0.6, lz], [LX, y - 4.5, lz], 0.07, STEEL_D); b.beam([LX, y - 0.6, lz], [-LX, y - 4.5, lz], 0.07, STEEL_D); b.box(0, y - 4.6, lz, 3.64, 0.1, 0.08, STEEL_D); }
    // railing on both sides and the shore end (leaving a 1.4 m opening toward the shore)
    const RC = [0.3, 0.32, 0.33, 0.2];
    const rail = (a, c) => { b.cyl([a[0], y + 1.07, a[1]], [c[0], y + 1.07, c[1]], 0.03, 0.03, 8, RC); b.cyl([a[0], y + 0.55, a[1]], [c[0], y + 0.55, c[1]], 0.02, 0.02, 6, RC);
      const n = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.8)); for (let i = 0; i <= n; i++) { const t = i / n; b.box(a[0] + (c[0] - a[0]) * t, y + 0.53, a[1] + (c[1] - a[1]) * t, 0.05, 1.06, 0.05, RC); }
      b.box((a[0] + c[0]) / 2, y + 0.06, (a[1] + c[1]) / 2, Math.abs(c[0] - a[0]) + 0.02, 0.1, Math.abs(c[1] - a[1]) + 0.02, RC); };
    for (const s of [-1, 1]) { rail([s * 1.95, z0 - 0.05], [s * 1.95, z0 - 3.95]); rail([s * 1.95, z0 - 3.95], [s * 0.7, z0 - 3.95]); rail([s * 1.95, z0 - 0.05], [s * 0.72, z0 - 0.05]); }
    // sign post with MARINA sign facing the gangway
    const sx = -1.6, sz = z0 - 0.45;
    b.box(sx, y + 1.25, sz, 0.1, 2.5, 0.1, STEEL);
    b.box(sx, y + 2.15, sz + 0.06, 1.6, 0.5, 0.04, [0.15, 0.32, 0.55, 0.05]);
    b.box(sx, y + 2.15, sz + 0.055, 1.66, 0.56, 0.03, WHITE);
    b.push(tr(sx, y + 2.2, sz + 0.08)); text(b, 'MARINA', 0.05, 0.01, WHITE); b.pop();
    b.box(sx, y + 1.92, sz + 0.081, 1.4, 0.03, 0.01, ORANGE);
    // a small bench and trash can on the landing
    b.box(1.4, y + 0.42, z0 - 2.0, 0.4, 0.05, 1.4, plankCol(r)); for (const s of [-1, 1]) b.box(1.4, y + 0.2, z0 - 2.0 + s * 0.6, 0.36, 0.4, 0.05, STEEL_D);
    b.cyl([1.45, y, z0 - 3.4], [1.45, y + 0.9, z0 - 3.4], 0.25, 0.25, 14, [0.25, 0.38, 0.3, 0.15]); b.cyl([1.45, y + 0.9, z0 - 3.4], [1.45, y + 0.98, z0 - 3.4], 0.27, 0.2, 14, [0.2, 0.3, 0.25, 0.15]);
  }

  function dockLow(b) {
    b.box(0, 0.42, 0, 50, 0.26, 2.5, DECKC);
    b.box(0, -0.15, 0, 50, 0.9, 2.0, FLOAT);
    for (const fx of FINGERS) { b.box(fx, 0.42, 5.7, 1.2, 0.26, 9.0, DECKC); b.box(fx, -0.15, 5.7, 1.0, 0.9, 8.8, FLOAT); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl([sx * 25.42, -8, sz * 0.75], [sx * 25.42, 4.2, sz * 0.75], 0.18, 0.18, 5, STEEL, false);
    for (const x of [-24, -12, 12, 24]) b.box(x, DY + 1.7, -1.02, 0.1, 3.4, 0.1, [0.24, 0.27, 0.26]);
    b.push(mulAll(tr(GW_L0[0], GW_L0[1], GW_L0[2]), rotX(GW_ANG)));
    b.box(0, -0.05, -GW_LEN / 2, 1.4, 0.1, GW_LEN, ALU_D);
    for (const s of [-1, 1]) { b.box(s * 0.7, 0.55, -GW_LEN / 2, 0.05, 1.1, GW_LEN, [0.68, 0.7, 0.72]); }
    b.pop();
    b.box(0, 11.85, -39, 4, 0.3, 4, DECKC);
    for (const sx of [-1, 1]) for (const lz of [-37.18, -40.82]) b.box(sx * 1.82, 8, lz, 0.25, 8, 0.25, STEEL);
    b.box(-1.6, 13.25, -37.45, 0.1, 2.5, 0.1, STEEL); b.box(-1.6, 14.15, -37.4, 1.6, 0.5, 0.05, [0.15, 0.32, 0.55]);
    b.box(30, 0.2, 7, 0.5, 2.2, 0.5, WHITE);
    b.box(18, DY + 1.2, 9.0, 1.3, 2.4, 1.0, [0.16, 0.42, 0.3]);
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
  const WALL = [0.6, 0.33, 0.26, 0.08], WALL_D = [0.5, 0.27, 0.21, 0.08], TRIM = [0.88, 0.86, 0.8, 0.05], GALV = [0.54, 0.56, 0.57, 0.22];
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
      b.box(0, 3.5, 3.62, 4.4, 0.8, 0.06, TRIM); b.box(0.3, RIDGE + 1.4, -2.8, 0.04, 2.8, 0.04, BLACK); b.box(0, RIDGE + 0.6, 3.0, 0.03, 1.2, 0.03, BLACK);
      return b;
    }
    // ---- floats under the U-shaped floor and the side walkway
    for (const s of [-1, 1]) { b.push(rotY(-Math.PI / 2)); floatTub(b, -3.4, 3.4, s * 4.15, 0.75, -0.6, 0.3, 28, 14); b.pop(); }
    floatTub(b, -3.2, 3.2, -2.65, 0.75, -0.6, 0.3, 28, 14);
    b.push(rotY(-Math.PI / 2)); floatTub(b, -3.4, 3.4, 5.6, 0.5, -0.55, 0.3, 18, 10); b.pop();
    // ---- floor framing and planks
    const plank = (x, z, sx, sz) => { b.box(x, DY - 0.02 - r() * 0.004, z, sx, 0.04, sz, plankCol(r)); const lx = sx > sz, h = (lx ? sx : sz) / 2 - 0.08; screws(b, lx ? [[x - h, z], [x, z], [x + h, z]] : [[x, z - h], [x, z], [x, z + h]], DY); };
    for (let z = -3.5 + 0.075; z < 3.5; z += 0.15) { plank(-4.15, z, 1.68, 0.138); plank(4.15, z, 1.68, 0.138); plank(5.6, z, 1.18, 0.138); }
    for (let x = -3.3 + 0.075; x < 3.3; x += 0.15) plank(x, -2.65, 0.138, 1.68);
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
    // ---- side walkway railing (outer edge, x = 6.15)
    const RC = [0.86, 0.85, 0.8, 0.05];
    for (let z = -3.4; z <= 3.41; z += 1.36) b.box(6.12, DY + 0.55, z, 0.08, 1.1, 0.08, RC);
    b.box(6.12, DY + 1.08, 0, 0.12, 0.05, 6.9, RC); b.box(6.12, DY + 0.6, 0, 0.04, 0.08, 6.9, RC);
    for (let z = -3.35; z <= 3.36; z += 0.2) b.box(6.12, DY + 0.55, z, 0.025, 0.9, 0.025, RC);
    // ---- door on the +X wall
    { const zc = -1.3; b.box(5.03, DY + 1.05, zc, 0.04, 2.1, 0.95, TRIM); b.box(5.06, DY + 1.0, zc, 0.04, 1.96, 0.82, [0.24, 0.42, 0.5, 0.05]);
      for (const y of [0.45, 1.45]) b.box(5.08, DY + y, zc, 0.01, 0.6, 0.66, [0.2, 0.36, 0.44, 0.05]);
      b.box(5.09, DY + 1.66, zc, 0.01, 0.34, 0.5, GLASS);
      b.cyl([5.08, DY + 1.0, zc + 0.32], [5.15, DY + 1.0, zc + 0.32], 0.025, 0.03, 8, ALU);
      b.box(5.12, DY + 2.25, zc, 0.24, 0.05, 1.1, TRIM); b.box(5.05, DY + 2.15, zc - 0.65, 0.08, 0.06, 0.08, YELLOW); }
    // ---- small windows
    const win = (x, y, z, ax) => { b.push(mulAll(tr(x, y, z), rotY(ax))); b.box(0, 0, 0.03, 0.8, 0.62, 0.04, TRIM); b.box(0, 0, 0.055, 0.68, 0.5, 0.02, GLASS); b.box(0, 0, 0.07, 0.03, 0.5, 0.01, TRIM); b.box(0, -0.34, 0.07, 0.9, 0.05, 0.1, TRIM); b.pop(); };
    win(-5.0, 2.1, -1.5, -Math.PI / 2); win(-5.0, 2.1, 1.6, -Math.PI / 2); win(5.0, 2.1, 1.7, Math.PI / 2); win(-2.4, 2.1, -3.5, Math.PI); win(2.4, 2.1, -3.5, Math.PI);
    // ---- faded MARINA sign made of coloured blocks, above the bay
    b.push(tr(0, 3.5, 3.6));
    b.box(0, 0, 0, 4.4, 0.8, 0.05, [0.86, 0.82, 0.72]);
    b.box(0, 0, -0.01, 4.5, 0.9, 0.04, [0.42, 0.5, 0.55]);
    b.push(tr(0, 0.07, 0.025)); text(b, 'MARINA', 0.085, 0.02, [0.7, 0.33, 0.27]); b.pop();
    const stripes = [[0.84, 0.55, 0.3], [0.45, 0.62, 0.66], [0.85, 0.72, 0.42]];
    for (let i = 0; i < 3; i++) b.box(0, -0.25 - i * 0.04 + 0.04, 0.03, 4.1 - i * 0.6, 0.035, 0.01, stripes[i]);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.box(s * (1.75 + i * 0.13), 0.08, 0.03, 0.09, 0.35, 0.01, stripes[i]);
    b.pop();
    for (const s of [-1, 1]) b.beam([s * 1.8, 3.3, 3.55], [s * 1.8, 3.0, 3.5], 0.04, STEEL_D);
    // ---- weather vane at the front of the ridge, radio antenna at the back
    { const z = 3.0, y = RIDGE + 0.05; b.box(0, y + 0.02, z, 0.2, 0.04, 0.2, STEEL_D); b.cyl([0, y, z], [0, y + 1.2, z], 0.015, 0.012, 6, STEEL_D);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.beam([0, y + 0.85, z], [dx * 0.3, y + 0.85, z + dz * 0.3], 0.012, STEEL_D);
      b.push(mulAll(tr(0, y + 1.05, z), rotY(0.6))); b.box(0, 0, 0, 0.015, 0.015, 0.8, BLACK); b.extrude([[0, 0.48], [0.07, 0.36], [-0.07, 0.36]], -0.008, 0.008, BLACK); b.box(0, 0, -0.38, 0.01, 0.15, 0.14, BLACK); b.pop();
      b.sphere(0, y + 1.22, z, 0.03, 8, BLACK); }
    { const z = -2.8, y = RIDGE + 0.04; b.box(0.3, y + 0.05, z, 0.12, 0.1, 0.12, STEEL_D); b.cyl([0.3, y + 0.1, z], [0.3, y + 2.8, z], 0.02, 0.006, 6, [0.25, 0.25, 0.25, 0.2]);
      for (let k = 0; k < 3; k++) b.cyl([0.3, y + 0.5 + k * 0.5, z], [0.3, y + 0.56 + k * 0.5, z], 0.03, 0.03, 6, BLACK);
      b.tube([[0.3, y + 0.1, z], [0.6, y - 0.05, z], [4.9, roofY(4.9) - 0.2, z], [4.9, 2.6, z]], 0.008, 4, BLACK); }
    // ---- inside: stacked life jackets on a shelf, fuel cans, workbench
    { const sx = 1.8, sz = -3.15; for (const y of [0.9, 1.5]) b.box(sx, y, sz, 1.6, 0.04, 0.5, TIM); for (const s of [-1, 1]) b.box(sx + s * 0.78, 1.1, sz, 0.05, 1.1, 0.5, TIM);
      const LJ = [[0.95, 0.42, 0.08], [0.95, 0.6, 0.1], [0.9, 0.3, 0.1], [0.92, 0.78, 0.15]];
      for (const [y0, n] of [[DY, 6], [0.92, 4], [1.52, 5]]) for (let st = 0; st < 3; st++) for (let k = 0; k < n - st; k++) {
        const c = LJ[Math.floor(r() * 4)], x = sx - 0.5 + st * 0.5 + (r() - 0.5) * 0.04, y = y0 + 0.035 + k * 0.07, z = sz + (r() - 0.5) * 0.04;
        b.box(x, y, z, 0.42, 0.065, 0.34, c); b.box(x, y + 0.004, z + 0.172, 0.3, 0.02, 0.005, BLACK); }
      for (let k = 0; k < 4; k++) { const x = -2.8 + k * 0.42; b.box(x, 2.25, -3.38, 0.05, 0.05, 0.08, STEEL_D); b.box(x, 1.95, -3.36, 0.36, 0.5, 0.08, LJ[k % 4]); b.box(x, 1.95, -3.315, 0.36, 0.04, 0.005, BLACK); b.box(x, 1.8, -3.315, 0.36, 0.04, 0.005, BLACK); } }
    { const cans = [RED, RED, [0.8, 0.15, 0.1, 0.15], YELLOW, RED];
      for (let k = 0; k < 5; k++) { const x = -4.6 + (k % 3) * 0.3, z = -3.1 + Math.floor(k / 3) * 0.45, y = DY + (k > 2 ? 0 : 0); b.push(mulAll(tr(x, y, z), rotY(0.15 * (r() - 0.5))));
        b.box(0, 0.24, 0, 0.18, 0.46, 0.34, cans[k]); b.box(0, 0.24, 0.172, 0.12, 0.3, 0.008, shade(cans[k], 0.8)); for (const s of [-1, 1]) b.box(0, 0.24, s * 0.06, 0.185, 0.3, 0.02, shade(cans[k], 0.85));
        b.beam([0, 0.5, -0.1], [0, 0.5, 0.05], 0.03, shade(cans[k], 0.9)); b.cyl([0, 0.47, 0.11], [0, 0.55, 0.14], 0.025, 0.02, 6, BLACK); b.pop(); } }
    { const x = -4.5, z = 0.6; b.box(x, DY + 0.9, z, 0.6, 0.06, 1.8, shade(TIM, 1.1)); for (const dz of [-0.8, 0.8]) b.box(x, DY + 0.45, z + dz, 0.5, 0.9, 0.06, TIM);
      b.box(x, DY + 0.3, z, 0.5, 0.04, 1.6, TIM); b.box(x + 0.05, DY + 1.0, z - 0.4, 0.3, 0.14, 0.2, RED); b.box(x - 0.1, DY + 0.97, z + 0.3, 0.2, 0.08, 0.3, [0.2, 0.4, 0.7]);
      ropeCoil(b, x, DY + 0.3, z + 0.45, 0.04, 0.17, 4, ROPE); b.cyl([-4.97, 1.4, z - 0.9], [-4.97, 1.4, z + 0.9], 0.02, 0.02, 6, STEEL_D); }
    // ceiling light, paddles leaning in a corner, a life ring on the outer wall
    b.box(0, 3.25, 0, 0.12, 0.12, 1.2, [0.95, 0.94, 0.85, 0.4]);
    for (let k = 0; k < 3; k++) { b.cyl([4.75 - k * 0.08, DY, -3.3], [4.85 - k * 0.08, DY + 1.6, -3.2], 0.018, 0.018, 6, k === 1 ? [0.2, 0.3, 0.6] : [0.6, 0.45, 0.28]); b.box(4.75 - k * 0.08, DY + 0.22, -3.3, 0.02, 0.4, 0.17, k === 1 ? [0.85, 0.8, 0.2] : [0.6, 0.45, 0.28]); }
    lifeRing(b, 5.07, 2.0, 1.5 - 0.6, Math.PI / 2, 1);
    return b;
  }
  const boathouseColliders = [
    { type: 'box', x: 0, z: 0.02, hx: 5.45, hz: 3.88, rot: 0, top: EAVE, solid: false },
    { type: 'box', x: -4.15, z: 0, hx: 0.85, hz: 3.5, rot: 0, top: DY, solid: false },
    { type: 'box', x: 4.6, z: 0, hx: 1.6, hz: 3.5, rot: 0, top: DY, solid: false },
    { type: 'box', x: 0, z: -2.65, hx: 3.3, hz: 0.85, rot: 0, top: DY, solid: false }
  ];
  // =====================================================================================
  // 3. PONTOON BOAT
  // =====================================================================================
  const PB_DECK = 0.6, PB_TOP = 2.36;
  const CARPET = [0.26, 0.29, 0.33], CUSH = [0.88, 0.85, 0.76], PIPE = [0.22, 0.4, 0.55], PANEL = [0.9, 0.9, 0.88, 0.2], STRIPE = [0.12, 0.42, 0.52, 0.2], CANVAS = [0.2, 0.3, 0.42];
  // one pontoon tube (along Z) centred at x, centre height cy, radius R, flat stern cap at z0, raked nose cone ending at z1
  function pontoonTube(b, x, cy, R, z0, z1, nu) {
    const zs = [[z0, 0, 0], [z0, R * 0.92, 0], [z0 + 0.03, R, 0], [z1 - 0.7, R, 0], [z1 - 0.45, R * 0.95, 0.03], [z1 - 0.25, R * 0.78, 0.09], [z1 - 0.1, R * 0.48, 0.15], [z1 - 0.02, R * 0.18, 0.19], [z1, 0, 0.2]];
    b.surf(nu, zs.length - 1, (u, v) => { const j = Math.round(v * (zs.length - 1)), q = zs[j], a = u * Math.PI * 2; return [x + q[1] * Math.cos(a), cy + q[2] + q[1] * Math.sin(a), q[0]]; },
      (u, v) => { const yy = Math.sin(u * Math.PI * 2), T = [0.62, 0.64, 0.66, 0.3]; return yy < -0.05 ? ALU_D : (Math.abs(yy - 0.15) < 0.12 ? shade(T, 0.88) : T); }, true);
    for (const s of [-1, 1]) b.beam([x + s * R * 0.92, cy - R * 0.38, z0 + 0.3], [x + s * R * 0.92, cy - R * 0.38, z1 - 0.8], 0.025, ALU_D);   // lifting strakes
  }
  function cushionSeat(b, x0, x1, z0, z1, backSide) {       // seat box from x0..x1, z0..z1; backSide: 'x+', 'x-', 'z-', 'z+' or null
    const y0 = PB_DECK, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, sx = x1 - x0, sz = z1 - z0;
    b.box(cx, y0 + 0.19, cz, sx - 0.04, 0.38, sz - 0.04, [0.82, 0.8, 0.74, 0.1]);
    b.box(cx, y0 + 0.03, cz, sx - 0.02, 0.06, sz - 0.02, [0.3, 0.3, 0.3]);
    b.box(cx, y0 + 0.44, cz, sx, 0.12, sz, CUSH);
    b.box(cx, y0 + 0.385, cz, sx + 0.01, 0.015, sz + 0.01, PIPE);
    if (backSide) {
      const t = 0.14; let bx = cx, bz = cz, bsx = sx, bsz = sz;
      if (backSide === 'x+') { bx = x1 - t / 2; bsx = t; } if (backSide === 'x-') { bx = x0 + t / 2; bsx = t; } if (backSide === 'z-') { bz = z0 + t / 2; bsz = t; } if (backSide === 'z+') { bz = z1 - t / 2; bsz = t; }
      b.box(bx, y0 + 0.75, bz, bsx, 0.5, bsz, CUSH); b.box(bx, y0 + 0.51, bz, bsx + 0.01, 0.015, bsz + 0.01, PIPE);
      const n = Math.max(1, Math.round(Math.max(bsx, bsz) / 0.6)); for (let i = 1; i < n; i++) { const t2 = i / n; if (bsx > bsz) b.box(x0 + sx * t2, y0 + 0.75, bz, 0.01, 0.46, bsz + 0.01, shade(CUSH, 0.85)); else b.box(bx, y0 + 0.75, z0 + sz * t2, bsx + 0.01, 0.46, 0.01, shade(CUSH, 0.85)); }
    }
  }
  function fenceRun(b, a, c, out) {   // a, c = [x, z]; out = outward normal [x, z]
    const y0 = PB_DECK, L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(L / 0.9));
    for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (c[0] - a[0]) * t, z = a[1] + (c[1] - a[1]) * t; b.cyl([x, y0, z], [x, y0 + 0.82, z], 0.022, 0.022, 10, ALU, false); b.cyl([x, y0 + 0.8, z], [x, y0 + 0.87, z], 0.032, 0.032, 10, ALU_D, false); b.box(x, y0 + 0.01, z, 0.08, 0.02, 0.08, ALU_D); }
    b.cyl([a[0], y0 + 0.83, a[1]], [c[0], y0 + 0.83, c[1]], 0.028, 0.028, 12, ALU, true);
    b.cyl([a[0], y0 + 0.08, a[1]], [c[0], y0 + 0.08, c[1]], 0.018, 0.018, 6, ALU, true);
    const o = [out[0] * 0.012, out[1] * 0.012], p = (x, z, y) => [x, y, z];
    b.plate(p(a[0], a[1], y0 + 0.1), p(c[0], c[1], y0 + 0.1), p(c[0], c[1], y0 + 0.8), p(a[0], a[1], y0 + 0.8), PANEL);
    b.plate(p(a[0] + o[0], a[1] + o[1], y0 + 0.38), p(c[0] + o[0], c[1] + o[1], y0 + 0.38), p(c[0] + o[0], c[1] + o[1], y0 + 0.5), p(a[0] + o[0], a[1] + o[1], y0 + 0.5), STRIPE);
    b.plate(p(a[0] + o[0], a[1] + o[1], y0 + 0.31), p(c[0] + o[0], c[1] + o[1], y0 + 0.31), p(c[0] + o[0], c[1] + o[1], y0 + 0.35), p(a[0] + o[0], a[1] + o[1], y0 + 0.35), [0.25, 0.25, 0.27, 0.2]);
  }
  function buildPontoon(detail) {
    const b = new MB();
    if (!detail) {
      for (const s of [-1, 1]) { b.cyl([s * 0.9, 0.02, -3.35], [s * 0.9, 0.02, 3.0], 0.3, 0.3, 6, ALU); b.cyl([s * 0.9, 0.02, 3.0], [s * 0.9, 0.22, 3.62], 0.3, 0.03, 6, ALU); }
      b.box(0, 0.5, -0.05, 2.5, 0.2, 6.7, ALU_D); b.box(0, 0.6, -0.05, 2.45, 0.02, 6.6, CARPET);
      for (const s of [-1, 1]) { b.box(s * 1.2, 1.0, -0.05, 0.03, 0.8, 6.1, PANEL); b.box(s * 1.215, 1.04, -0.05, 0.01, 0.12, 6.1, STRIPE); } b.box(0, 1.0, -3.0, 2.4, 0.8, 0.03, PANEL); b.box(0, 1.0, 3.1, 1.7, 0.8, 0.03, PANEL);
      b.box(0, PB_TOP - 0.02, -0.5, 2.36, 0.08, 2.2, CANVAS); for (const s of [-1, 1]) b.box(s * 1.18, 1.85, -0.5, 0.05, 1.0, 0.05, ALU);
      b.box(0, 0.6, -3.7, 0.4, 1.8, 0.5, WHITE); b.box(0.8, 1.0, 0.2, 0.5, 0.8, 0.7, WHITE);
      return b;
    }
    // ---- tubes and under-deck structure
    for (const s of [-1, 1]) pontoonTube(b, s * 0.9, 0.02, 0.31, -3.35, 3.62, 40);
    for (let z = -3.1; z <= 2.95; z += 0.5) { b.box(0, 0.43, z, 2.4, 0.07, 0.05, ALU_D); for (const s of [-1, 1]) b.box(s * 0.9, 0.36, z, 0.34, 0.06, 0.07, ALU_D); }
    // deck with rounded bow, carpet on top, rub rail and skirt
    const outline = [[-1.25, -3.3], [1.25, -3.3], [1.25, 2.85], [1.1, 3.2], [0.75, 3.38], [-0.75, 3.38], [-1.1, 3.2], [-1.25, 2.85]];
    b.extrude(outline, 0.47, PB_DECK - 0.01, [0.45, 0.42, 0.38], CARPET);
    b.extrude(outline.map(p => [p[0] * 0.985, p[1] * 0.99]), PB_DECK - 0.01, PB_DECK, CARPET, CARPET);
    for (let i = 0; i < outline.length; i++) { const a = outline[i], c = outline[(i + 1) % outline.length]; b.beam([a[0] * 1.012, PB_DECK - 0.04, a[1] * 1.005], [c[0] * 1.012, PB_DECK - 0.04, c[1] * 1.005], 0.05, BLACK, 0.07); }
    for (const s of [-1, 1]) { b.plate([s * 1.26, 0.38, -3.1], [s * 1.26, 0.38, 2.7], [s * 1.26, 0.53, 2.7], [s * 1.26, 0.53, -3.1], [0.32, 0.34, 0.36, 0.2]); b.plate([s * 1.262, 0.42, -3.0], [s * 1.262, 0.42, 2.6], [s * 1.262, 0.45, 2.6], [s * 1.262, 0.45, -3.0], STRIPE); }
    // ---- fence (bow gate gap, port boarding gate gap, stern ladder gap)
    fenceRun(b, [1.2, -3.0], [1.2, 2.75], [1, 0]); fenceRun(b, [1.2, 2.75], [0.85, 3.12], [0.7, 0.7]); fenceRun(b, [0.85, 3.12], [0.42, 3.12], [0, 1]);
    fenceRun(b, [-0.42, 3.12], [-0.85, 3.12], [0, 1]); fenceRun(b, [-0.85, 3.12], [-1.2, 2.75], [-0.7, 0.7]); fenceRun(b, [-1.2, 2.75], [-1.2, 0.62], [-1, 0]);
    fenceRun(b, [-1.2, -0.22], [-1.2, -3.0], [-1, 0]); fenceRun(b, [-1.2, -3.0], [-0.5, -3.0], [0, -1]); fenceRun(b, [0.12, -3.0], [1.2, -3.0], [0, -1]);
    // bow gate (closed) and port boarding gate (swung open)
    const gate = (hx, hz, ang, w) => { b.push(mulAll(tr(hx, PB_DECK, hz), rotY(ang))); b.box(w / 2, 0.83, 0, w, 0.04, 0.04, ALU); b.box(w / 2, 0.1, 0, w, 0.03, 0.03, ALU); b.box(w - 0.02, 0.46, 0, 0.03, 0.74, 0.03, ALU);
      b.box(w / 2, 0.45, 0, w - 0.04, 0.66, 0.012, PANEL); b.box(w / 2, 0.44, 0.012, w - 0.04, 0.12, 0.004, STRIPE); b.box(w - 0.06, 0.7, 0.02, 0.05, 0.05, 0.03, BLACK); b.pop(); };
    gate(0.42, 3.12, Math.PI, 0.84);
    gate(-1.2, -0.22, -0.55, 0.84);
    // ---- seats: bow lounges, rear L, port rear bench, captain's chair
    cushionSeat(b, 0.62, 1.17, 1.0, 2.7, 'x+'); cushionSeat(b, -1.17, -0.62, 1.0, 2.7, 'x-');
    cushionSeat(b, 0.2, 1.17, -2.97, -2.42, 'z-'); cushionSeat(b, -1.17, -0.62, -2.97, -0.9, 'x-');
    cushionSeat(b, 0.62, 1.17, -2.42, -1.5, 'x+');
    { const x = 0.75, z = -0.72; b.cyl([x, PB_DECK, z], [x, PB_DECK + 0.4, z], 0.04, 0.04, 8, ALU); b.cyl([x, PB_DECK, z], [x, PB_DECK + 0.02, z], 0.22, 0.22, 10, ALU_D); b.box(x, PB_DECK + 0.47, z, 0.5, 0.12, 0.48, CUSH); b.box(x, PB_DECK + 0.8, z - 0.23, 0.5, 0.56, 0.12, CUSH); b.box(x, PB_DECK + 0.9, z - 0.24, 0.51, 0.04, 0.13, PIPE); for (const s of [-1, 1]) b.box(x + s * 0.27, PB_DECK + 0.62, z, 0.05, 0.05, 0.35, BLACK); }
    // table on a pedestal in the bow
    b.cyl([0, PB_DECK, 1.9], [0, PB_DECK + 0.7, 1.9], 0.035, 0.035, 8, ALU); b.cyl([0, PB_DECK + 0.7, 1.9], [0, PB_DECK + 0.73, 1.9], 0.38, 0.38, 18, [0.85, 0.82, 0.72]);
    b.cyl([0, PB_DECK, 1.9], [0, PB_DECK + 0.015, 1.9], 0.15, 0.15, 10, ALU_D);
    // ---- helm console with wheel, throttle and windscreen
    { const x = 0.82, z = 0.25, y = PB_DECK;
      b.box(x, y + 0.45, z, 0.6, 0.9, 0.7, [0.88, 0.88, 0.86, 0.15]); b.box(x, y + 0.45, z - 0.351, 0.5, 0.8, 0.01, STRIPE);
      b.push(mulAll(tr(x, y + 0.98, z - 0.15), rotX(0.45))); b.box(0, 0, 0, 0.6, 0.12, 0.5, [0.14, 0.14, 0.15, 0.1]);
      for (let k = 0; k < 3; k++) { b.cyl([-0.18 + k * 0.18, 0.06, 0.05], [-0.18 + k * 0.18, 0.075, 0.05], 0.05, 0.05, 12, [0.75, 0.78, 0.8, 0.4]); b.cyl([-0.18 + k * 0.18, 0.075, 0.05], [-0.18 + k * 0.18, 0.08, 0.05], 0.04, 0.04, 10, GLASS); }
      b.box(0.0, 0.065, -0.12, 0.3, 0.01, 0.16, GLASS);
      b.cyl([0, 0.06, 0.18], [0, 0.18, 0.12], 0.025, 0.02, 8, BLACK);
      b.pop();
      b.push(mulAll(tr(x - 0.08, y + 1.05, z - 0.42), rotX(-0.55))); torus(b, 0.17, 0.018, 22, 6, BLACK); b.beam([-0.16, 0, 0], [0.16, 0, 0], 0.02, ALU); b.beam([0, 0, -0.16], [0, 0, 0.16], 0.02, ALU); b.cyl([0, -0.03, 0], [0, 0.05, 0], 0.035, 0.035, 10, ALU); b.pop();
      b.cyl([x - 0.08, y + 1.0, z - 0.33], [x - 0.08, y + 1.05, z - 0.42], 0.02, 0.02, 6, BLACK);
      b.box(x + 0.32, y + 0.95, z - 0.2, 0.06, 0.16, 0.16, BLACK); b.beam([x + 0.32, y + 1.0, z - 0.2], [x + 0.34, y + 1.2, z - 0.3], 0.025, ALU); b.sphere(x + 0.34, y + 1.22, z - 0.31, 0.035, 8, BLACK);
      b.push(mulAll(tr(x, y + 1.15, z + 0.02), rotX(-0.35))); b.box(0, 0.12, 0, 0.6, 0.26, 0.012, [0.14, 0.18, 0.2, 0.5]); b.box(0, 0.255, 0, 0.62, 0.02, 0.02, BLACK); b.pop();
      b.box(x - 0.3, y + 0.6, z - 0.35, 0.012, 0.4, 0.4, shade(PANEL, 0.95)); }
    // ---- bimini canopy: frame bows pivoting on the fence, canvas over the helm
    const cz0 = -1.6, cz1 = 0.6, cH = PB_TOP;
    const canY = (x, z) => cH - 0.07 * (x / 1.2) * (x / 1.2) - 0.03 * Math.sin((z - cz0) / (cz1 - cz0) * Math.PI * 2) ** 2;
    b.surf(24, 16, (u, v) => { const x = -1.2 + 2.4 * u, z = cz0 + (cz1 - cz0) * v; return [x, canY(x, z), z]; }, (u, v) => { const k = Math.abs(v - 0.5) < 0.01 || Math.abs(u - 0.5) < 0.04 ? 0.86 : 1; return shade(CANVAS, k); });
    for (const s of [-1, 1]) b.plate([s * 1.2, canY(1.2, cz0), cz0], [s * 1.2, canY(1.2, cz1), cz1], [s * 1.2, canY(1.2, cz1) - 0.1, cz1], [s * 1.2, canY(1.2, cz0) - 0.1, cz0], shade(CANVAS, 0.8));
    for (const z of [cz0, cz1]) b.plate([-1.2, canY(1.2, z), z], [1.2, canY(1.2, z), z], [1.2, canY(1.2, z) - 0.1, z], [-1.2, canY(1.2, z) - 0.1, z], shade(CANVAS, 0.8));
    const mountZ = -0.55;
    for (const zb of [cz0 + 0.05, -0.5, cz1 - 0.05]) {
      const arc = []; for (let i = 0; i <= 10; i++) { const x = -1.17 + 2.34 * i / 10; arc.push([x, canY(x, zb) - 0.03, zb]); }
      b.tube(arc, 0.018, 6, ALU);
      for (const s of [-1, 1]) b.cyl([s * 1.17, canY(1.17, zb) - 0.03, zb], [s * 1.22, PB_DECK + 0.7, mountZ], 0.018, 0.018, 6, ALU, false);
    }
    for (const s of [-1, 1]) { b.box(s * 1.23, PB_DECK + 0.7, mountZ, 0.05, 0.08, 0.08, BLACK);
      b.cyl([s * 1.17, canY(1.17, cz1) - 0.03, cz1], [s * 1.2, PB_DECK + 0.84, 1.8], 0.008, 0.008, 4, BLACK, false);
      b.cyl([s * 1.17, canY(1.17, cz0) - 0.03, cz0], [s * 1.2, PB_DECK + 0.84, -2.9], 0.008, 0.008, 4, BLACK, false); }
    // ---- outboard motor on the stern
    { const z = -3.3, y = PB_DECK; const COWL = [0.92, 0.92, 0.9, 0.3], LOW = [0.15, 0.15, 0.16, 0.2];
      b.box(0, 0.45, z - 0.06, 0.5, 0.3, 0.12, ALU_D); b.box(0, 0.6, z - 0.15, 0.24, 0.4, 0.14, LOW);      // transom bracket and clamp
      b.push(mulAll(tr(0, y + 0.58, z - 0.5), sc(0.24, 0.24, 0.36))); b.sphere(0, 0, 0, 1, 16, COWL); b.pop();
      b.box(0, y + 0.42, z - 0.5, 0.44, 0.26, 0.66, LOW); b.box(0, y + 0.55, z - 0.5, 0.46, 0.02, 0.68, [0.6, 0.6, 0.62, 0.3]);
      for (const s of [-1, 1]) { b.box(s * 0.235, y + 0.6, z - 0.55, 0.005, 0.07, 0.4, [0.75, 0.1, 0.1, 0.2]); b.box(s * 0.24, y + 0.68, z - 0.45, 0.005, 0.03, 0.3, LOW); }
      b.box(0, y - 0.15, z - 0.48, 0.15, 0.9, 0.26, LOW);                     // midsection / leg
      b.box(0, -0.1, z - 0.48, 0.42, 0.02, 0.5, LOW);                         // anti-cavitation plate
      b.box(0, -0.25, z - 0.46, 0.11, 0.3, 0.22, LOW);
      b.cyl([0, -0.4, z - 0.25], [0, -0.4, z - 0.74], 0.07, 0.06, 10, LOW);
      b.box(0, -0.53, z - 0.5, 0.03, 0.14, 0.2, LOW);                         // skeg
      b.cyl([0, -0.4, z - 0.74], [0, -0.4, z - 0.86], 0.045, 0.03, 10, [0.3, 0.3, 0.32, 0.3]);
      for (let k = 0; k < 3; k++) { b.push(mulAll(tr(0, -0.4, z - 0.78), rotZ(k * Math.PI * 2 / 3), rotY(0.35))); b.box(0, 0.12, 0, 0.09, 0.18, 0.012, [0.45, 0.46, 0.48, 0.35]); b.pop(); }
      b.cyl([0.08, 0.6, z - 0.1], [0.12, 0.8, z + 0.25], 0.02, 0.02, 6, BLACK, false);   // steering/control cables
      b.box(0, 0.7, z - 0.32, 0.1, 0.18, 0.12, [0.6, 0.6, 0.6, 0.3]); }
    // swim ladder at the stern gap
    for (const s of [-1, 1]) b.cyl([-0.19 + s * 0.17, PB_DECK + 0.02, -3.28], [-0.19 + s * 0.17, -0.5, -3.42], 0.016, 0.016, 6, ALU);
    for (let k = 0; k < 4; k++) b.box(-0.19, 0.4 - k * 0.27, -3.32 - k * 0.03, 0.34, 0.025, 0.06, ALU_D);
    b.tube([[-0.36, PB_DECK, -3.25], [-0.36, PB_DECK + 0.5, -3.25], [-0.32, PB_DECK + 0.62, -3.22]], 0.016, 6, ALU);
    // ---- cleats, fenders, navigation light, bow nav light
    for (const s of [-1, 1]) { cleat(b, s * 0.95, PB_DECK, -3.18, 0, 1); cleat(b, s * 0.55, PB_DECK, 3.26, 0, 1); }
    for (const z of [-1.8, 1.6]) { b.cyl([-1.33, 0.42, z], [-1.33, 0.95, z], 0.1, 0.1, 12, WHITE); for (const yy of [0.42, 0.95]) b.cyl([-1.33, yy, z], [-1.33, yy + (yy > 0.5 ? 0.04 : -0.04), z], 0.1, 0.03, 12, WHITE); b.tube([[-1.33, 0.99, z], [-1.3, 1.25, z], [-1.22, 1.43, z]], 0.008, 4, ROPE); }
    b.cyl([0.6, PB_DECK + 0.84, -2.98], [0.6, PB_DECK + 1.9, -2.98], 0.012, 0.012, 6, ALU); b.sphere(0.6, PB_DECK + 1.93, -2.98, 0.035, 8, WHITE);
    b.box(0, PB_DECK + 0.05, 3.3, 0.2, 0.06, 0.06, BLACK); b.box(-0.06, PB_DECK + 0.05, 3.33, 0.08, 0.04, 0.01, [0.9, 0.1, 0.1, 0.4]); b.box(0.06, PB_DECK + 0.05, 3.33, 0.08, 0.04, 0.01, [0.1, 0.8, 0.3, 0.4]);
    // cooler and a coiled bow line on the deck
    b.box(-0.2, PB_DECK + 0.2, -2.2, 0.55, 0.38, 0.36, [0.86, 0.3, 0.2, 0.1]); b.box(-0.2, PB_DECK + 0.41, -2.2, 0.58, 0.05, 0.39, WHITE); b.box(-0.2, PB_DECK + 0.45, -2.2, 0.3, 0.03, 0.04, WHITE);
    ropeCoil(b, 0.25, PB_DECK, 3.0, 0.04, 0.15, 4, ROPE);
    // registration numbers on the skirt (block letters)
    for (const s of [-1, 1]) { b.push(mulAll(tr(s * 1.27, 0.49, 2.0), rotY(s * Math.PI / 2))); text(b, 'AZ 5 PR', 0.016, 0.005, BLACK); b.pop(); }
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
  const SK_GREEN = [0.24, 0.34, 0.26, 0.12], SK_ALU = [0.64, 0.66, 0.66, 0.22], SK_IN = [0.47, 0.49, 0.46, 0.15], WOOD = [0.55, 0.4, 0.25];
  function buildSkiff(detail) {
    const b = new MB();
    const NU = detail ? 36 : 6, NV = detail ? 16 : 4;
    const hullFn = inset => (u, v) => { const side = v < 0.5 ? -1 : 1, w = Math.abs(v - 0.5) * 2; return skPt(u * (inset ? 0.985 : 1), w, side, inset); };
    b.surf(NU, NV, hullFn(0), (u, v) => Math.abs(v - 0.5) * 2 > 0.55 ? SK_GREEN : SK_ALU);
    if (!detail) {
      const pts = []; for (let k = 0; k <= 4; k++) { const w = k / 4; pts.push(skPt(0, 1 - w, -1)); } for (let k = 1; k <= 4; k++) pts.push(skPt(0, k / 4, 1));
      for (let k = 1; k < pts.length - 1; k++) b.tri(b.v(...pts[0], 0, 0, -1, SK_GREEN), b.v(...pts[k], 0, 0, -1, SK_GREEN), b.v(...pts[k + 1], 0, 0, -1, SK_GREEN));
      for (const z of [-1.7, -0.2, 1.1]) b.box(0, 0.3, z, 1.4, 0.04, 0.28, WOOD);
      b.box(0, 0.45, -2.55, 0.3, 0.9, 0.4, [0.15, 0.15, 0.16]);
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
    // oarlocks and two oars stowed along the seats
    const ot = 0.52, os = skSec(ot);
    for (const side of [-1, 1]) { const p = [side * (os.hb - 0.01), os.sy + 0.02, os.z]; b.cyl([p[0], p[1] - 0.04, p[2]], [p[0], p[1] + 0.03, p[2]], 0.02, 0.02, 6, SK_ALU); b.tube([[p[0], p[1] + 0.1, p[2] - 0.05], [p[0], p[1] + 0.03, p[2] - 0.05], [p[0], p[1] + 0.03, p[2] + 0.05], [p[0], p[1] + 0.1, p[2] + 0.05]], 0.008, 4, SK_ALU);
      const a = [side * 0.3, 0.35, 0.95], c = [side * 0.5, 0.37, -1.4]; b.cyl(a, c, 0.022, 0.022, 7, [0.72, 0.58, 0.38]); b.cyl([a[0], a[1], a[2] + 0.15], a, 0.018, 0.022, 7, [0.25, 0.2, 0.15]);
      b.push(mulAll(tr(c[0] + side * 0.02, c[1] + 0.01, c[2] - 0.27), rotY(side * 0.08), rotZ(side * 0.2))); b.box(0, 0, 0, 0.15, 0.015, 0.55, [0.72, 0.58, 0.38]); b.pop(); }
    // tiller outboard on the transom
    { const z = -2.25, LOW = [0.18, 0.2, 0.22, 0.2], COWL = [0.2, 0.3, 0.55, 0.3];
      b.box(0, 0.42, z - 0.06, 0.16, 0.14, 0.12, LOW); for (const s of [-1, 1]) b.cyl([s * 0.06, 0.3, z + 0.02], [s * 0.06, 0.3, z + 0.08], 0.025, 0.025, 6, LOW);
      b.push(mulAll(tr(0, 0.72, z - 0.25), sc(0.16, 0.15, 0.24))); b.sphere(0, 0, 0, 1, 14, COWL); b.pop();
      b.box(0, 0.62, z - 0.25, 0.27, 0.1, 0.4, LOW); b.box(0, 0.665, z - 0.25, 0.28, 0.015, 0.41, [0.85, 0.85, 0.85, 0.2]);
      b.box(0, 0.12, z - 0.2, 0.09, 0.85, 0.14, LOW); b.box(0, -0.13, z - 0.2, 0.26, 0.015, 0.28, LOW);
      b.cyl([0, -0.25, z - 0.06], [0, -0.25, z - 0.36], 0.045, 0.04, 8, LOW); b.box(0, -0.33, z - 0.24, 0.02, 0.1, 0.12, LOW);
      for (let k = 0; k < 3; k++) { b.push(mulAll(tr(0, -0.25, z - 0.4), rotZ(k * Math.PI * 2 / 3), rotY(0.4))); b.box(0, 0.08, 0, 0.06, 0.12, 0.008, [0.5, 0.5, 0.52, 0.35]); b.pop(); }
      b.cyl([0, 0.62, z - 0.05], [0, 0.6, z + 0.55], 0.022, 0.026, 8, LOW); b.cyl([0, 0.6, z + 0.45], [0, 0.6, z + 0.62], 0.03, 0.03, 8, [0.3, 0.3, 0.3]);
      b.box(0.12, 0.8, z - 0.3, 0.02, 0.03, 0.1, [0.85, 0.85, 0.85]); }
    // red fuel tank with hose
    { const x = 0.36, z = -1.95; b.box(x, -0.02, z, 0.3, 0.24, 0.48, RED); b.box(x, 0.1, z, 0.26, 0.01, 0.42, shade(RED, 0.85)); b.cyl([x, 0.1, z + 0.14], [x, 0.14, z + 0.14], 0.035, 0.035, 8, BLACK); b.box(x, 0.13, z - 0.1, 0.18, 0.03, 0.04, shade(RED, 0.8));
      b.tube([[x - 0.06, 0.1, z - 0.18], [x - 0.15, 0.2, z - 0.3], [0.1, 0.35, -2.2], [0.05, 0.4, -2.33]], 0.01, 5, BLACK); }
    // anchor with coiled line in the bow
    { const z = 1.55, y = skSec(0.85).ky + 0.08; b.push(mulAll(tr(0.08, y, z), rotY(0.3)));
      b.box(0, 0.02, 0, 0.03, 0.03, 0.5, [0.35, 0.36, 0.37, 0.2]); b.box(0, 0.02, -0.22, 0.36, 0.03, 0.04, [0.35, 0.36, 0.37, 0.2]);
      for (const s of [-1, 1]) b.extrude([[s * 0.04, -0.22], [s * 0.18, -0.24], [s * 0.12, 0.06]], 0.005, 0.02, [0.38, 0.38, 0.4, 0.2]);
      b.push(tr(0, 0.02, 0.27)); b.push(rotZ(Math.PI / 2)); torus(b, 0.03, 0.008, 8, 4, STEEL_D); b.pop(); b.pop(); b.pop();
      ropeCoil(b, -0.12, y - 0.01, z - 0.25, 0.04, 0.12, 4, [0.75, 0.68, 0.3]); }
    // tackle box and a fishing rod leaning on the middle seat
    { const x = -0.3, z = -0.95; b.box(x, -0.04, z, 0.4, 0.2, 0.22, [0.22, 0.45, 0.3, 0.1]); b.box(x, 0.065, z, 0.41, 0.02, 0.23, [0.3, 0.55, 0.38, 0.1]); b.box(x, 0.09, z, 0.12, 0.03, 0.03, [0.9, 0.85, 0.75]); b.box(x + 0.19, 0.0, z, 0.03, 0.06, 0.05, [0.9, 0.85, 0.75]); }
    { const a = [0.42, -0.12, -1.35], c = [0.95, 1.35, 0.6]; b.cyl(a, c, 0.012, 0.003, 6, [0.15, 0.15, 0.18, 0.3]); b.cyl(a, K.lerp(a, c, 0.15), 0.017, 0.015, 6, [0.25, 0.18, 0.12]);
      const rp = K.lerp(a, c, 0.18); b.cyl([rp[0] - 0.04, rp[1] + 0.03, rp[2]], [rp[0] + 0.03, rp[1] + 0.03, rp[2]], 0.035, 0.035, 10, [0.6, 0.6, 0.62, 0.35]);
      for (let k = 1; k <= 4; k++) { const p = K.lerp(a, c, 0.3 + k * 0.16); b.box(p[0], p[1] + 0.012, p[2], 0.008, 0.02, 0.008, SK_ALU); } }
    // bow eye, stern handles, a cleat each side
    b.push(mulAll(tr(0, 0.42, 2.27), rotY(Math.PI / 2), rotZ(Math.PI / 2))); torus(b, 0.035, 0.009, 10, 4, SK_ALU); b.pop();
    for (const side of [-1, 1]) { const p = skPt(0.02, 1, side, 0.05); b.tube([[p[0], p[1], -2.2], [p[0], p[1] + 0.07, -2.15], [p[0], p[1] + 0.07, -2.0], [p[0], p[1], -1.95]], 0.012, 5, SK_ALU); const q = skPt(0.9, 1, side, 0.06); cleat(b, q[0], q[1] - 0.005, q[2], Math.PI / 2, 1); }
    // registration numbers on the bow sides
    for (const side of [-1, 1]) { const p = skPt(0.78, 0.82, side, -0.003); b.push(mulAll(tr(p[0], p[1], p[2]), rotY(side * Math.PI / 2 - side * 0.25))); text(b, 'AZ 5', 0.016, 0.004, WHITE); b.pop(); }
    return b;
  }
  // =====================================================================================
  // 5. BUOY
  // =====================================================================================
  function buildBuoy(detail) {
    const b = new MB(), O = [0.93, 0.34, 0.05, 0.12], Od = [0.78, 0.27, 0.05, 0.1], W = [0.92, 0.92, 0.88, 0.12];
    if (!detail) { b.lathe([[0, -0.45], [0.39, -0.24], [0.45, 0.06, W], [0.42, 0.22], [0, 0.45]], 5, O); return b; }
    const prof = []; for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + Math.PI * k / 10, y = 0.45 * Math.sin(a), rr = 0.45 * Math.cos(a); prof.push([rr, y, (y > 0.05 && y < 0.24) ? W : (y < -0.02 ? Od : O)]); }
    prof[0][0] = 0; prof[10][0] = 0;
    b.lathe(prof, 16, O);
    b.cyl([0, 0.43, 0], [0, 0.49, 0], 0.05, 0.04, 8, STEEL_D, false);
    b.push(mulAll(tr(0, 0.55, 0), rotX(Math.PI / 2))); torus(b, 0.055, 0.014, 8, 4, STEEL_D); b.pop();
    b.push(mulAll(tr(0, -0.5, 0), rotX(Math.PI / 2))); torus(b, 0.04, 0.012, 8, 3, RUST); b.pop();
    b.push(mulAll(tr(0, -0.6, 0), rotZ(Math.PI / 2), rotX(Math.PI / 2))); torus(b, 0.04, 0.012, 8, 3, RUST); b.pop();
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
