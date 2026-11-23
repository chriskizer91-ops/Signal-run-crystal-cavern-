window.MODDEF = { fn: (function (K) {
  'use strict';
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd } = K;
  const PI = Math.PI, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a.map((v, i) => i < 3 ? v + (b[i] - v) * t : (t < 0.5 ? (a[3] || 0) : (b[3] || 0)));
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k, c[3] || 0].map((v, i) => i < 3 ? clamp(v, 0, 1) : v);

  // ---------- shared palette ----------
  const WHITE = [0.93, 0.93, 0.9, 0.3], DUST = [0.72, 0.6, 0.44, 0], DUST_D = [0.55, 0.45, 0.33, 0];
  const GLASS = [0.08, 0.12, 0.16, 0.5], TRIM = [0.08, 0.08, 0.09, 0.05], PLAST = [0.13, 0.13, 0.14, 0.05];
  const RUBBER = [0.07, 0.07, 0.075, 0], RUBBER_S = [0.11, 0.105, 0.1, 0], STEELW = [0.6, 0.61, 0.6, 0.25], STEEL = [0.45, 0.47, 0.5, 0.3];
  const CHASSIS = [0.12, 0.12, 0.12, 0.1], ORANGE = [0.95, 0.42, 0.06, 0.3], NAVY = [0.07, 0.13, 0.32, 0.3];
  const AMBER = [1.0, 0.58, 0.05, 0.5], RED_L = [0.78, 0.06, 0.05, 0.5], CLEAR_L = [0.88, 0.9, 0.92, 0.5], ALU = [0.72, 0.73, 0.75, 0.35];
  const CONE_O = [1.0, 0.38, 0.05, 0.05];
  // dust fade on the lower body: 0 above ~0.9 m, strongest at the sills
  const dusty = (c, y, top, k) => mix(c, DUST, Math.pow(clamp(((top || 0.9) - y) / 0.45, 0, 1), 1.3) * (k || 0.7));

  // ---------- wheel: built once along +Y (outer face at +Y), reused ----------
  function makeWheel(o) {
    const b = new MB(), R = o.R, Wd = o.W, rr = o.rim, h = Wd / 2, segs = o.segs;
    const T = R - o.tread;                           // radius of the tread base
    // tyre carcass
    b.lathe([[rr - 0.005, -h + 0.02, RUBBER], [rr + 0.03, -h - 0.005, RUBBER_S], [T - 0.06, -h - 0.01, RUBBER_S], [T - 0.02, -h + 0.005, RUBBER], [T, -h + 0.04, RUBBER], [T, h - 0.04, RUBBER], [T - 0.02, h - 0.005, RUBBER], [T - 0.06, h + 0.01, RUBBER_S], [rr + 0.03, h + 0.005, RUBBER_S], [rr - 0.005, h - 0.02, RUBBER]], segs, RUBBER);
    // raised lettering band / sidewall ribs (outer side)
    for (let i = 0; i < o.ribs; i++) {
      const a = i / o.ribs * PI * 2; b.push(mulAll(rotY(-a), tr((rr + T) / 2 + 0.01, h + 0.008, 0))); b.box(0, 0, 0, 0.05, 0.008, 0.012, RUBBER_S); b.pop();
    }
    // tread blocks: two staggered rows plus shoulder lugs that wrap onto the sidewall
    const nb = o.blocks;
    for (let i = 0; i < nb; i++) {
      for (const s of [-1, 1]) {
        const a = (i + (s > 0 ? 0.5 : 0)) / nb * PI * 2, len = 2 * PI * T / nb * 0.62;
        b.push(mulAll(rotY(-a), tr(T + o.tread / 2, s * h * 0.42, 0), rotX(s * 0.18))); b.box(0, 0, 0, o.tread, h * 0.62, len, RUBBER); b.pop();
        b.push(mulAll(rotY(-a), tr(T - 0.025, s * (h - 0.005), 0))); b.box(0, 0, 0, 0.05, 0.03, len * 0.8, RUBBER); b.pop();
      }
    }
    // steel rim: barrel, flanges, dished centre disc
    const d = o.dish;
    b.lathe([[rr - 0.012, -h + 0.005], [rr + 0.004, -h + 0.01], [rr - 0.012, -h + 0.03], [rr - 0.02, -h + 0.05], [rr - 0.02, h - 0.05], [rr - 0.012, h - 0.03], [rr + 0.004, h - 0.012], [rr - 0.006, h - 0.002], [rr - 0.03, h - 0.01], [rr * 0.82, d + 0.03], [rr * 0.66, d], [rr * 0.42, d + 0.008], [rr * 0.3, d + 0.012], [rr * 0.24, d + 0.03], [rr * 0.2, d + 0.05], [0, d + 0.05]], segs, o.rimCol);
    // vent holes in the disc (dark insets) and lug nuts
    for (let i = 0; i < o.vents; i++) { const a = (i + 0.5) / o.vents * PI * 2; b.push(mulAll(rotY(-a), tr(rr * 0.74, d + 0.018, 0), rotX(0))); b.cyl([0, -0.004, 0], [0, 0.004, 0], 0.03, 0.03, 8, TRIM); b.pop(); }
    for (let i = 0; i < o.lugs; i++) { const a = i / o.lugs * PI * 2, x = Math.cos(a) * rr * 0.36, z = Math.sin(a) * rr * 0.36; b.cyl([x, d + 0.008, z], [x, d + 0.035, z], 0.013, 0.013, 6, STEEL); b.cyl([x, d + 0.035, z], [x, d + 0.042, z], 0.011, 0.006, 6, STEEL, true); }
    b.cyl([0, d + 0.04, 0], [0, d + 0.075, 0], rr * 0.18, rr * 0.14, 14, o.capCol);
    if (o.beadlock) {                                // bolted outer ring on the rim face
      b.lathe([[rr + 0.012, h - 0.004], [rr + 0.012, h + 0.012], [rr - 0.03, h + 0.012], [rr - 0.03, h - 0.004]], segs, o.beadlock);
      for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2, x = Math.cos(a) * (rr - 0.009), z = Math.sin(a) * (rr - 0.009); b.cyl([x, h + 0.012, z], [x, h + 0.024, z], 0.007, 0.007, 4, STEEL); }
    }
    return b;
  }
  function putWheel(b, W, x, y, z) { b.push(mulAll(tr(x, y, z), rotZ(x > 0 ? -PI / 2 : PI / 2))); b.merge(W); b.pop(); }

  // flat strip of small raised diamond pyramids on a plane: origin o, axes u (len lu), v (len lv), normal n
  function diamondPlate(b, o, u, v, n, lu, lv, pitch, base, hi) {
    const P = (a, c, e) => [o[0] + u[0] * a + v[0] * c + n[0] * e, o[1] + u[1] * a + v[1] * c + n[1] * e, o[2] + u[2] * a + v[2] * c + n[2] * e];
    b.plate(P(0, 0, 0), P(lu, 0, 0), P(lu, lv, 0), P(0, lv, 0), base);
    const nu = Math.floor(lu / pitch), nv = Math.floor(lv / (pitch * 0.6));
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const cu = (i + 0.5 + (j % 2) * 0.5) * pitch, cv = (j + 0.5) * pitch * 0.6; if (cu > lu - pitch * 0.3) continue;
      const flip = (i + j) % 2, a = flip ? 0.022 : 0.006, c = flip ? 0.006 : 0.022;
      const top = P(cu, cv, 0.004), q = [P(cu - a, cv - c * 0, 0.0005), P(cu, cv - c, 0.0005), P(cu + a, cv, 0.0005), P(cu, cv + c, 0.0005)];
      q[0] = P(cu - a, cv, 0.0005);
      for (let k = 0; k < 4; k++) { const p0 = q[k], p1 = q[(k + 1) % 4], nn = K.norm(K.cross(K.sub(p1, p0), K.sub(top, p0))); b.tri(b.v(p0[0], p0[1], p0[2], nn[0], nn[1], nn[2], hi), b.v(p1[0], p1[1], p1[2], nn[0], nn[1], nn[2], hi), b.v(top[0], top[1], top[2], nn[0], nn[1], nn[2], hi)); }
    }
  }

  // =====================================================================
  // 1. PICKUP TRUCK  (front = +Z)
  // =====================================================================
  const P_ = {
    FRONT: 2.85, FACE: 2.74, REAR: -2.85, TAIL: -2.75,
    AXF: 1.72, AXR: -1.95,                // wheelbase 3.67
    TRACK: 0.84,                          // wheel centre x
    WR: 0.40, WW: 0.29,                   // tyre radius / width
    ARCH_R: 0.5, ARCH_Y: 0.44,            // wheel-arch opening
    SILL: 0.55, BELT: 1.24, ROOF: 1.86, ROOF_TOP: 1.905,
    HOOD_F: 1.10, HOOD_R: 1.17, COWL_Z: 1.26,
    WS_B: 1.18, WS_T: 0.62,               // windshield base / top z
    RW_B: -0.97, RW_T: -0.88,             // rear window base / top z
    CAB_BACK: -1.0, BED_F: -1.08, BED_RAIL: 1.33, BED_FLOOR: 0.9, BED_IN: 0.85,
    HW: 0.96,                              // body half width
    DOOR_F: 1.16, DOOR_M: 0.1, DOOR_R: -0.95
  };
  // half-width of the body side at (z, y): tumblehome, under-curve, a shoulder crease and rounded front corners
  function sideX(z, y) {
    let x = P_.HW;
    if (y > 1.0) x -= 0.045 * Math.pow((y - 1.0) / 0.3, 2);
    if (y < 0.72) x -= 0.035 * Math.pow((0.72 - y) / 0.2, 2);
    x += 0.012 * Math.exp(-Math.pow((y - 1.02) / 0.035, 2));     // shoulder crease
    if (z > 2.45) x -= 0.06 * Math.pow((z - 2.45) / (P_.FACE - 2.45), 2);
    if (z < -2.6) x -= 0.012 * Math.pow((-2.6 - z) / 0.15, 2);
    return x;
  }
  const hoodY = z => P_.HOOD_R + (P_.HOOD_F - P_.HOOD_R) * clamp((z - P_.COWL_Z) / (P_.FACE - P_.COWL_Z), 0, 1);
  // top edge of the lower body side along z (fender line -> cab beltline -> bed rail)
  function sideTop(z) {
    if (z >= P_.WS_B + 0.05) return hoodY(z) - 0.03;
    if (z > P_.CAB_BACK - 0.01) { const t = clamp((P_.WS_B + 0.05 - z) / 0.12, 0, 1); return (hoodY(P_.WS_B + 0.05) - 0.03) * (1 - t) + P_.BELT * t; }
    return P_.BED_RAIL;
  }
  function archBottom(z, sill) {
    let y = sill;
    for (const zc of [P_.AXF, P_.AXR]) { const d = z - zc; if (Math.abs(d) < P_.ARCH_R) y = Math.max(y, P_.ARCH_Y + Math.sqrt(P_.ARCH_R * P_.ARCH_R - d * d)); }
    return y;
  }
  // z sample list: uniform plus dense angular samples round each arch, so the arch cut-out stays round
  function zList(z0, z1, n, sill) {
    const zs = []; for (let i = 0; i <= n; i++) zs.push(z0 + (z1 - z0) * i / n);
    for (const zc of [P_.AXF, P_.AXR]) {
      const s0 = Math.asin(clamp((sill - P_.ARCH_Y) / P_.ARCH_R, -1, 1));
      for (let k = 0; k <= 24; k++) { const a = s0 + (PI - 2 * s0) * k / 24, z = zc + P_.ARCH_R * Math.cos(a); if (z > Math.min(z0, z1) && z < Math.max(z0, z1)) zs.push(z); }
      const ze = P_.ARCH_R * Math.cos(s0); for (const z of [zc - ze - 0.001, zc + ze + 0.001]) if (z > Math.min(z0, z1) && z < Math.max(z0, z1)) zs.push(z);
    }
    zs.sort((a, c) => a - c); const out = [zs[0]]; for (const z of zs) if (z - out[out.length - 1] > 0.004) out.push(z); if (out[out.length - 1] < Math.max(z0, z1) - 1e-6) out.push(Math.max(z0, z1));
    return out;
  }
  // body side panel: surface hugging sideX between a bottom curve and a top curve
  function sidePanel(b, side, zs, yb, yt, off, colFn, nv) {
    const n = zs.length - 1;
    b.surf(n, nv, (u, v) => { const z = zs[Math.round(u * n)], y0 = yb(z), y1 = yt(z), y = y0 + (y1 - y0) * v; return [side * (sideX(z, y) + off), y, z]; },
      (u, v) => { const z = zs[Math.round(u * n)], y0 = yb(z), y1 = yt(z), y = y0 + (y1 - y0) * v; return colFn(z, y); });
  }
  // thin coloured patch on the side surface (stripes, seams, logo)
  function sidePatch(b, side, z0, z1, y0, y1, off, col, nu) {
    b.surf(nu || 6, 2, (u, v) => { const z = z0 + (z1 - z0) * u, y = y0 + (y1 - y0) * v; return [side * (sideX(z, y) + off), y, z]; }, col);
  }

  const FONT = { '0': ['111', '101', '101', '101', '111'], '7': ['111', '001', '010', '010', '010'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'], '4': ['101', '101', '111', '001', '001'] };
  // block digits on the body side; zc = text centre, y0 = baseline, px = pixel size
  function sideText(b, side, str, zc, y0, px) {
    const w = str.length * 4 * px - px;
    for (let c = 0; c < str.length; c++) { const g = FONT[str[c]]; for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) if (g[row][col] === '1') {
      const t = c * 4 * px + col * px - w / 2, z = side > 0 ? zc - t - px : zc + t, y = y0 + (4 - row) * px;
      sidePatch(b, side, z, z + px, y, y + px, 0.005, TRIM, 1);
    } }
  }
  function pickup(detail) {
    const b = new MB(), r = rnd(31);
    if (!detail) return pickupLow();
    const paint = (z, y) => dusty(WHITE, y, 0.95, 0.75);

    // ---------------- chassis & running gear ----------------
    for (const s of [-1, 1]) {
      b.box(s * 0.47, 0.5, 0.1, 0.08, 0.2, 5.0, CHASSIS);                       // frame rails
      b.box(s * 0.47, 0.58, 2.4, 0.06, 0.12, 0.5, CHASSIS);
    }
    for (const z of [2.55, 1.0, 0.0, -1.0, -2.55]) b.box(0, 0.5, z, 0.9, 0.12, 0.08, CHASSIS);   // crossmembers
    // front solid axle, diff, coil springs, shocks; rear axle on leaf springs
    for (const [zc, front] of [[P_.AXF, true], [P_.AXR, false]]) {
      b.cyl([-0.78, P_.WR, zc], [0.78, P_.WR, zc], 0.045, 0.045, 10, CHASSIS);
      const dx = front ? 0.12 : 0.0;
      b.sphere(dx, P_.WR, zc, 0.15, 14, [0.16, 0.16, 0.15, 0.12]);
      b.cyl([dx, P_.WR, zc - 0.05], [dx, P_.WR, zc - 0.2], 0.12, 0.09, 12, [0.16, 0.16, 0.15, 0.12]);       // pinion housing
      b.cyl([dx, P_.WR, zc + 0.1], [dx, P_.WR, zc + 0.16], 0.12, 0.12, 12, [0.2, 0.2, 0.19, 0.15]);         // diff cover
      for (const s of [-1, 1]) {
        b.cyl([s * 0.72, P_.WR, zc], [s * 0.78, P_.WR, zc], 0.09, 0.09, 12, CHASSIS);                   // hub knuckle
        if (front) {
          for (let k = 0; k < 7; k++) { const y0 = P_.WR + 0.06 + k * 0.03; b.cyl([s * 0.5, y0, zc], [s * 0.5, y0 + 0.022, zc], 0.07, 0.07, 10, [0.6, 0.12, 0.1, 0.2], false); }   // coil
          b.cyl([s * 0.5, P_.WR + 0.05, zc], [s * 0.5, 0.6, zc], 0.05, 0.05, 8, CHASSIS);
          b.cyl([s * 0.62, P_.WR, zc + 0.05], [s * 0.6, 0.72, zc + 0.1], 0.025, 0.025, 8, [0.85, 0.7, 0.1, 0.2]);  // shock (yellow)
          b.beam([s * 0.6, P_.WR - 0.05, zc], [s * 0.45, 0.45, zc - 0.9], 0.05, CHASSIS);           // radius arm
        } else {
          // leaf spring pack: stacked arcs from front hanger to rear shackle
          for (let L = 0; L < 5; L++) {
            const half = 0.7 - L * 0.12, y = P_.WR + 0.06 - L * 0.018, pts = [];
            for (let k = 0; k <= 10; k++) { const t = k / 10 * 2 - 1; pts.push([s * 0.47, y + 0.09 * t * t, zc + t * half]); }
            for (let k = 0; k < 10; k++) b.beam(pts[k], pts[k + 1], 0.06, [0.15 + L * 0.01, 0.14, 0.13, 0.12], 0.014);
          }
          b.beam([s * 0.47, P_.WR + 0.15, zc + 0.7], [s * 0.47, 0.45, zc + 0.72], 0.05, CHASSIS);          // hanger
          b.beam([s * 0.47, P_.WR + 0.15, zc - 0.7], [s * 0.47, 0.48, zc - 0.8], 0.04, CHASSIS);           // shackle
          b.box(s * 0.47, P_.WR + 0.0, zc, 0.1, 0.06, 0.14, CHASSIS);                                    // U-bolt plate
          for (const dz of [-0.05, 0.05]) b.beam([s * 0.47 - 0.05, P_.WR - 0.04, zc + dz], [s * 0.47 - 0.05, P_.WR + 0.13, zc + dz], 0.015, STEEL);
          b.cyl([s * 0.6, P_.WR, zc - 0.12], [s * 0.55, 0.62, zc - 0.25], 0.025, 0.025, 8, [0.85, 0.7, 0.1, 0.2]);
        }
      }
    }
    // transfer case + drive shafts
    b.box(0.0, 0.48, 0.55, 0.3, 0.22, 0.4, [0.3, 0.3, 0.3, 0.2]);
    b.box(0.0, 0.62, 1.15, 0.4, 0.34, 0.8, [0.2, 0.2, 0.2, 0.15]);                    // transmission
    b.cyl([0.0, 0.46, 0.33], [0.0, P_.WR, P_.AXR + 0.2], 0.04, 0.04, 8, [0.3, 0.3, 0.3, 0.2]);
    b.cyl([0.06, 0.46, 0.75], [0.12, P_.WR, P_.AXF - 0.15], 0.035, 0.035, 8, [0.3, 0.3, 0.3, 0.2]);
    // fuel tank (left, outside the rail) and exhaust (right, exits behind the rear wheel)
    b.box(-0.65, 0.42, -0.65, 0.32, 0.26, 0.85, [0.1, 0.1, 0.1, 0.05]);
    const EX = [0.34, 0.33, 0.31, 0.15];
    b.tube([[0.25, 0.55, 1.4], [0.3, 0.33, 0.9], [0.3, 0.3, 0.2], [0.32, 0.3, -0.4]], 0.035, 8, EX);
    b.cyl([0.32, 0.3, -0.4], [0.32, 0.3, -1.2], 0.11, 0.11, 14, EX);                              // muffler
    b.tube([[0.32, 0.3, -1.2], [0.4, 0.3, -1.4], [0.65, 0.3, -1.45], [0.72, 0.3, -1.42], [0.75, 0.32, -1.45]], 0.035, 8, EX);
    b.cyl([0.75, 0.32, -1.45], [0.82, 0.32, -1.46], 0.04, 0.042, 10, [0.18, 0.17, 0.16, 0.2]);
    // underbody pan
    b.box(0, 0.6, 0.1, 1.7, 0.03, 2.2, [0.15, 0.14, 0.13]);
    b.box(0, 0.64, 2.25, 1.5, 0.03, 0.9, [0.15, 0.14, 0.13]);

    // ---------------- wheels ----------------
    const W = makeWheel({ R: P_.WR, W: P_.WW, rim: 0.23, tread: 0.016, segs: 40, blocks: 34, ribs: 30, dish: 0.07, vents: 8, lugs: 8, rimCol: STEELW, capCol: [0.5, 0.5, 0.5, 0.3] });
    for (const z of [P_.AXF, P_.AXR]) for (const s of [-1, 1]) putWheel(b, W, s * P_.TRACK, P_.WR, z);

    // ---------------- body sides ----------------
    for (const s of [-1, 1]) {
      // front clip + cab: one panel from the grille corner to the cab back
      sidePanel(b, s, zList(P_.CAB_BACK, P_.FACE, 46, P_.SILL), z => archBottom(z, P_.SILL - 0.09 * clamp((z - 2.24) / 0.16, 0, 1)), sideTop, 0, paint, 16);
      // bed side
      sidePanel(b, s, zList(P_.TAIL, P_.BED_F, 30, P_.SILL + 0.03), z => archBottom(z, P_.SILL + 0.03), () => P_.BED_RAIL, 0, paint, 14);
      // rocker / sill under the doors (dark)
      sidePatch(b, s, P_.DOOR_R - 0.04, P_.DOOR_F + 0.02, P_.SILL, P_.SILL + 0.06, 0.003, dusty(TRIM, 0.4, 0.9, 0.5), 4);
      // stripes: orange over navy along the doors
      sidePatch(b, s, P_.DOOR_R + 0.02, P_.DOOR_F - 0.02, 0.8, 0.86, 0.004, ORANGE, 10);
      sidePatch(b, s, P_.DOOR_R + 0.02, P_.DOOR_F - 0.02, 0.865, 0.905, 0.004, NAVY, 10);
      // door logo block: navy panel with an orange dish emblem and white "text" bars
      const lz = s > 0 ? [0.42, 0.98] : [0.98, 0.42], zl = (t) => lz[0] + (lz[1] - lz[0]) * t;
      sidePatch(b, s, 0.42, 0.98, 0.94, 1.15, 0.005, NAVY, 6);
      // emblem (orange dish shape) on the front end of the logo
      const em = s > 0 ? 0.9 : 0.9;
      sidePatch(b, s, em - 0.07, em + 0.02, 0.985, 1.105, 0.008, ORANGE, 3);
      sidePatch(b, s, em - 0.045, em - 0.005, 1.0, 1.09, 0.009, NAVY, 2);
      for (let k = 0; k < 3; k++) sidePatch(b, s, 0.48, k === 0 ? 0.78 : 0.7 - k * 0.04, 1.08 - k * 0.04, 1.105 - k * 0.04, 0.008, k ? [0.85, 0.85, 0.85, 0.2] : [0.97, 0.97, 0.95, 0.3], 3);
      // door seams (thin dark inset strips)
      for (const z of [P_.DOOR_F, P_.DOOR_M, P_.DOOR_R]) sidePatch(b, s, z - 0.006, z + 0.006, P_.SILL + 0.06, P_.BELT - 0.01, 0.003, TRIM, 1);
      sidePatch(b, s, P_.DOOR_R, P_.DOOR_F, P_.SILL + 0.06, P_.SILL + 0.07, 0.003, TRIM, 6);
      // door handles + key lock
      for (const z of [P_.DOOR_M + 0.16, P_.DOOR_R + 0.14]) {
        const x = s * (sideX(z, 1.12) + 0.012); b.box(x, 1.12, z, 0.025, 0.04, 0.17, TRIM); b.box(x - s * 0.01, 1.12, z, 0.01, 0.06, 0.21, shade(TRIM, 1.6));
      }
      // fuel filler door (left side of bed)
      if (s < 0) sidePatch(b, s, -1.42, -1.24, 1.04, 1.2, 0.004, shade(WHITE, 0.82), 2);
      // unit number "07" on the front fender, reads correctly from either side
      sideText(b, s, '07', 2.36, 1.0, 0.02);
      // beltline window trim
      b.beam([s * 0.932, P_.BELT + 0.01, P_.WS_B], [s * 0.932, P_.BELT + 0.01, P_.RW_B + 0.02], 0.025, TRIM, 0.03);
    }
    // wheel-arch flares (black plastic, wrap round the opening) and inner liners
    for (const zc of [P_.AXF, P_.AXR]) for (const s of [-1, 1]) {
      const sill = zc > 0 ? P_.SILL : P_.SILL + 0.03, a0 = Math.asin((sill - 0.06 - P_.ARCH_Y) / P_.ARCH_R);
      const prof = [[-0.012, -0.004], [-0.005, 0.03], [0.03, 0.05], [0.085, 0.04], [0.11, 0.0]];
      b.surf(28, prof.length - 1, (u, v) => {
        const a = a0 + (PI - 2 * a0) * u, p = prof[Math.round(v * (prof.length - 1))], rr = P_.ARCH_R + p[0];
        const z = zc + rr * Math.cos(a), y = P_.ARCH_Y + rr * Math.sin(a); return [s * (sideX(z, y) + p[1]), y, z];
      }, (u, v) => dusty(PLAST, P_.ARCH_Y + P_.ARCH_R * Math.sin(a0 + (PI - 2 * a0) * u), 0.8, 0.5));
      // liner
      b.surf(20, 2, (u, v) => { const a = a0 + (PI - 2 * a0) * u, z = zc + (P_.ARCH_R - 0.01) * Math.cos(a), y = P_.ARCH_Y + (P_.ARCH_R - 0.01) * Math.sin(a); return [s * (0.56 + 0.38 * v), y, z]; }, [0.1, 0.09, 0.09]);
      b.surf(20, 1, (u, v) => { const a = a0 + (PI - 2 * a0) * u, rr = (P_.ARCH_R - 0.01) * v, z = zc + rr * Math.cos(a), y = P_.ARCH_Y + 0.0 + rr * Math.sin(a); return [s * 0.56, Math.max(y, sill - 0.05), z]; }, [0.08, 0.08, 0.08]);
      // mud flaps behind each wheel
      const fz = zc - 0.53;
      b.box(s * 0.84, 0.32, fz, 0.32, 0.36, 0.012, RUBBER);
      b.box(s * 0.84, 0.47, fz + 0.01, 0.3, 0.025, 0.01, STEEL);
    }

    // ---------------- hood, cowl, front face ----------------
    const Wt = z => sideX(z, hoodY(z) - 0.03);
    b.surf(28, 30, (u, v) => {
      const z = P_.COWL_Z + (P_.FACE - P_.COWL_Z) * v, w = Wt(z), sx = u * 2 - 1, x = sx * w;
      let y = hoodY(z) + 0.02 * (1 - sx * sx) - 0.03 * Math.pow(Math.abs(sx), 10);
      y += 0.018 * Math.exp(-Math.pow(sx / 0.32, 6)) * clamp((z - P_.COWL_Z) / 0.2, 0, 1) * clamp((P_.FACE - 0.05 - z) / 0.2, 0, 1);   // power bulge
      y -= 0.03 * Math.pow(clamp((z - (P_.FACE - 0.08)) / 0.08, 0, 1), 2);                                                                 // nose roll
      return [x, y, z];
    }, (u, v) => (u > 0.03 && u < 0.97) ? WHITE : shade(WHITE, 0.6));
    // hood-to-fender shut lines
    for (const s of [-1, 1]) b.surf(14, 1, (u, v) => { const z = P_.COWL_Z + 0.02 + (P_.FACE - 0.1 - P_.COWL_Z) * u, w = Wt(z) - 0.035 - 0.006 * v; return [s * w, hoodY(z) + 0.004, z]; }, TRIM);
    // cowl panel with vent slots and wipers
    b.plate([-0.9, P_.HOOD_R + 0.0, P_.COWL_Z], [0.9, P_.HOOD_R + 0.0, P_.COWL_Z], [0.88, P_.BELT, P_.WS_B], [-0.88, P_.BELT, P_.WS_B], TRIM);
    for (let k = 0; k < 9; k++) b.box(-0.56 + k * 0.14, P_.HOOD_R + 0.04, (P_.COWL_Z + P_.WS_B) / 2 + 0.01, 0.1, 0.01, 0.02, [0.03, 0.03, 0.03]);
    for (const x0 of [-0.62, 0.08]) {
      b.beam([x0, P_.BELT + 0.02, P_.WS_B - 0.01], [x0 + 0.55, P_.BELT + 0.1, P_.WS_B - 0.08], 0.018, TRIM, 0.012);
      b.beam([x0 + 0.02, P_.BELT + 0.035, P_.WS_B - 0.02], [x0 + 0.5, P_.BELT + 0.115, P_.WS_B - 0.09], 0.01, [0.03, 0.03, 0.03], 0.02);
      b.cyl([x0, P_.BELT - 0.02, P_.WS_B + 0.02], [x0, P_.BELT + 0.03, P_.WS_B], 0.02, 0.02, 8, TRIM);
    }
    // front face: nose panel, big work-truck grille, headlights, emblem
    const FZ = P_.FACE, GR = [0.2, 0.2, 0.21, 0.2], GR2 = [0.32, 0.32, 0.33, 0.25];
    b.box(0, 0.84, FZ - 0.03, 1.8, 0.46, 0.06, shade(WHITE, 0.95));                               // nose panel
    b.box(0, 0.865, FZ + 0.005, 1.12, 0.43, 0.04, [0.05, 0.05, 0.05]);                            // grille recess
    for (const s of [-1, 1]) b.box(s * 0.575, 0.865, FZ + 0.025, 0.07, 0.47, 0.05, GR);          // grille surround sides
    b.box(0, 1.085, FZ + 0.025, 1.22, 0.05, 0.05, GR);
    b.box(0, 0.645, FZ + 0.025, 1.22, 0.05, 0.05, GR);
    for (let k = 0; k < 3; k++) b.box(0, 0.735 + k * 0.13, FZ + 0.04, 1.08, 0.05, 0.04, GR2);      // three heavy bars
    for (let k = 0; k < 7; k++) b.box(0, 0.7 + k * 0.064, FZ + 0.02, 1.08, 0.012, 0.02, [0.14, 0.14, 0.14, 0.15]);   // mesh
    for (let k = -5; k <= 5; k++) b.box(k * 0.095, 0.865, FZ + 0.022, 0.012, 0.4, 0.02, [0.14, 0.14, 0.14, 0.15]);
    b.box(0, 0.865, FZ + 0.065, 0.24, 0.1, 0.02, [0.55, 0.57, 0.6, 0.4]);                         // badge
    b.box(0, 0.865, FZ + 0.072, 0.19, 0.06, 0.01, NAVY);
    b.box(0, 0.865, FZ + 0.076, 0.1, 0.015, 0.008, ORANGE);
    for (const s of [-1, 1]) {
      const hx = s * 0.76;
      b.box(hx, 0.975, FZ - 0.0, 0.3, 0.18, 0.05, [0.05, 0.05, 0.06, 0.3]);                    // headlight bezel
      b.box(hx + s * 0.05, 0.985, FZ + 0.02, 0.15, 0.12, 0.03, CLEAR_L);                      // main lamp
      b.cyl([hx - s * 0.065, 0.985, FZ + 0.02], [hx - s * 0.065, 0.985, FZ + 0.042], 0.048, 0.048, 12, [0.97, 0.97, 0.98, 0.5]);
      b.box(hx, 0.9, FZ + 0.025, 0.28, 0.022, 0.025, AMBER);                                    // turn signal strip
      b.box(s * 0.905, 0.975, FZ - 0.08, 0.04, 0.12, 0.12, AMBER);                               // side marker wrap
    }
    // front bumper, skid plate, tow hooks, fog lamps
    const BUMP = [0.11, 0.11, 0.12, 0.15];
    b.box(0, 0.5, FZ + 0.06, 1.98, 0.26, 0.16, BUMP);
    b.box(0, 0.62, FZ + 0.1, 1.9, 0.02, 0.08, shade(BUMP, 1.3));
    b.box(0, 0.38, FZ + 0.03, 1.5, 0.05, 0.12, BUMP);
    for (const s of [-1, 1]) {
      b.box(s * 0.94, 0.5, FZ - 0.05, 0.12, 0.26, 0.2, BUMP);                                     // bumper end caps
      b.cyl([s * 0.66, 0.48, FZ + 0.13], [s * 0.66, 0.48, FZ + 0.145], 0.045, 0.045, 12, CLEAR_L); // fog lamp
      // tow hook: red J hook
      b.tube([[s * 0.42, 0.4, FZ + 0.02], [s * 0.42, 0.4, FZ + 0.1], [s * 0.42, 0.37, FZ + 0.135], [s * 0.42, 0.32, FZ + 0.125], [s * 0.42, 0.305, FZ + 0.08], [s * 0.42, 0.325, FZ + 0.05]], 0.018, 8, [0.8, 0.1, 0.07, 0.2]);
      b.box(s * 0.42, 0.4, FZ + 0.02, 0.07, 0.08, 0.06, CHASSIS);
    }
    b.box(0, 0.5, FZ + 0.145, 0.62, 0.11, 0.01, [0.06, 0.06, 0.06]);                              // lower intake
    b.box(0, 0.5, FZ + 0.15, 0.32, 0.16, 0.01, [0.95, 0.95, 0.93]);                               // front plate
    b.box(0, 0.5, FZ + 0.152, 0.26, 0.05, 0.005, NAVY);
    b.box(0, 0.36, FZ - 0.25, 1.1, 0.02, 0.6, [0.25, 0.25, 0.26, 0.15]);                          // skid plate

    // ---------------- greenhouse: pillars, glass, roof ----------------
    const YB = P_.BELT, YR = P_.ROOF, xg = y => 0.93 - 0.13 * (y - YB) / (YR - YB);
    const zWS = y => P_.WS_B + (P_.WS_T - P_.WS_B) * (y - YB) / (YR - YB), zRW = y => P_.RW_B + (P_.RW_T - P_.RW_B) * (y - YB) / (YR - YB);
    // windshield (slightly bowed)
    b.surf(10, 4, (u, v) => { const y = YB + 0.01 + (YR - YB - 0.02) * v, w = xg(y) - 0.02, sx = u * 2 - 1; return [sx * w, y, zWS(y) + 0.02 * (1 - sx * sx) - 0.005]; }, GLASS);
    // rear window: three panes, centre slider
    b.plate([-xg(YB) + 0.03, YB + 0.02, zRW(YB) - 0.01], [xg(YB) - 0.03, YB + 0.02, zRW(YB) - 0.01], [xg(YR) - 0.03, YR - 0.03, zRW(YR) - 0.01], [-xg(YR) + 0.03, YR - 0.03, zRW(YR) - 0.01], GLASS);
    for (const s of [-1, 1]) b.beam([s * 0.22, YB + 0.02, zRW(YB) - 0.015], [s * 0.22, YR - 0.03, zRW(YR) - 0.015], 0.025, TRIM);
    b.plate([-xg(YB), YB, P_.CAB_BACK], [xg(YB), YB, P_.CAB_BACK], [xg(YB), YB + 0.03, zRW(YB)], [-xg(YB), YB + 0.03, zRW(YB)], WHITE);
    for (const s of [-1, 1]) {
      // side glass: one plane, B-pillar covers the door split
      b.plate([s * (xg(YB) - 0.006), YB + 0.01, zWS(YB) - 0.03], [s * (xg(YB) - 0.006), YB + 0.01, zRW(YB) + 0.02], [s * (xg(YR) - 0.006), YR - 0.02, zRW(YR) + 0.02], [s * (xg(YR) - 0.006), YR - 0.02, zWS(YR) - 0.03], GLASS);
      // A-pillar (paint), B-pillar (black), C-pillar (paint)
      b.beam([s * (xg(YB) - 0.035), YB, P_.WS_B - 0.02], [s * (xg(YR) - 0.035), YR + 0.01, P_.WS_T - 0.02], 0.085, WHITE, 0.07);
      b.beam([s * (xg(YB) - 0.01), YB, P_.DOOR_M], [s * (xg(YR) - 0.01), YR, P_.DOOR_M - 0.03], 0.03, TRIM, 0.09);
      b.beam([s * (xg(YB) - 0.03), YB, P_.RW_B + 0.06], [s * (xg(YR) - 0.03), YR + 0.01, P_.RW_T + 0.07], 0.07, WHITE, 0.16);
      // window seals along the door tops
      b.beam([s * (xg(YR) - 0.006), YR - 0.02, P_.WS_T - 0.03], [s * (xg(YR) - 0.006), YR - 0.02, P_.RW_T + 0.05], 0.03, TRIM, 0.02);
      // roof drip rail
      b.beam([s * (xg(YR) - 0.02), YR + 0.01, P_.WS_T - 0.04], [s * (xg(YR) - 0.02), YR + 0.01, P_.RW_T + 0.02], 0.025, shade(WHITE, 0.85), 0.02);
      // side mirror: arm + tall tow mirror head with glass on the back
      const mz = P_.WS_B - 0.12, my = YB + 0.1;
      b.box(s * 0.94, my - 0.02, mz, 0.04, 0.12, 0.14, TRIM);
      b.beam([s * 0.95, my + 0.03, mz], [s * 1.08, my + 0.05, mz - 0.02], 0.03, TRIM);
      b.beam([s * 0.95, my - 0.06, mz], [s * 1.08, my - 0.04, mz - 0.02], 0.025, TRIM);
      b.box(s * 1.12, my + 0.02, mz - 0.03, 0.09, 0.32, 0.12, TRIM);
      b.box(s * 1.12, my + 0.06, mz - 0.093, 0.075, 0.2, 0.006, [0.55, 0.6, 0.65, 0.5]);
      b.box(s * 1.12, my - 0.1, mz - 0.093, 0.075, 0.07, 0.006, [0.45, 0.5, 0.55, 0.5]);
      b.box(s * 1.12, my + 0.02, mz + 0.032, 0.07, 0.025, 0.006, AMBER);
    }
    // windshield header + roof
    b.beam([-xg(YR) + 0.03, YR, P_.WS_T - 0.01], [xg(YR) - 0.03, YR, P_.WS_T - 0.01], 0.05, WHITE, 0.05);
    b.surf(20, 16, (u, v) => {
      const sx = u * 2 - 1, sz = v * 2 - 1, z = P_.RW_T + (P_.WS_T - P_.RW_T) * v, y = YR + (P_.ROOF_TOP - YR) * (1 - Math.pow(Math.abs(sx), 6)) * (1 - Math.pow(Math.abs(sz), 6));
      return [sx * (xg(YR) - 0.005), y, z];
    }, WHITE);
    for (const x of [-0.18, 0, 0.18]) b.box(x, P_.ROOF_TOP - 0.005, P_.WS_T - 0.08, 0.07, 0.03, 0.04, AMBER);        // cab marker lights
    b.box(0, YR + 0.0, P_.RW_T - 0.02, 0.3, 0.05, 0.03, RED_L);                                                   // 3rd brake light
    // whip antenna on the right front fender
    b.cyl([0.86, hoodY(1.45) - 0.02, 1.45], [0.86, hoodY(1.45) + 0.04, 1.45], 0.015, 0.012, 8, TRIM);
    b.cyl([0.86, hoodY(1.45) + 0.04, 1.45], [0.9, hoodY(1.45) + 1.0, 1.32], 0.004, 0.0025, 4, [0.15, 0.15, 0.15, 0.3]);
    // running boards
    for (const s of [-1, 1]) {
      b.box(s * 1.0, 0.42, 0.1, 0.16, 0.04, 2.0, dusty(TRIM, 0.4, 0.9, 0.4));
      for (let k = 0; k < 18; k++) b.box(s * 1.0, 0.443, -0.75 + k * 0.1, 0.13, 0.008, 0.035, [0.18, 0.18, 0.18]);
      for (const z of [-0.6, 0.1, 0.8]) b.beam([s * 1.0, 0.41, z], [s * 0.5, 0.5, z], 0.04, CHASSIS);
    }

    // ---------------- bed ----------------
    const BIN = P_.BED_IN, BF = P_.BED_FLOOR, BED_COL = [0.16, 0.16, 0.16, 0.05];
    b.box(0, BF - 0.02, (P_.BED_F + P_.TAIL) / 2, 2 * BIN, 0.04, P_.BED_F - P_.TAIL, BED_COL);                        // floor (bedliner)
    for (let k = -7; k <= 7; k++) b.box(k * 0.11, BF + 0.008, (P_.BED_F + P_.TAIL) / 2, 0.045, 0.016, P_.BED_F - P_.TAIL - 0.08, [0.2, 0.2, 0.2]);   // floor ribs
    for (const s of [-1, 1]) {
      b.box(s * BIN, (BF + P_.BED_RAIL) / 2, (P_.BED_F + P_.TAIL) / 2, 0.02, P_.BED_RAIL - BF, P_.BED_F - P_.TAIL, BED_COL);   // inner wall
      b.box(s * 0.905, P_.BED_RAIL + 0.012, (P_.BED_F + P_.TAIL) / 2 - 0.02, 0.12, 0.025, P_.BED_F - P_.TAIL + 0.03, shade(TRIM, 1.4));  // rail cap
      for (const z of [P_.BED_F - 0.12, P_.TAIL + 0.12]) b.box(s * 0.905, P_.BED_RAIL + 0.026, z, 0.06, 0.004, 0.08, [0.03, 0.03, 0.03]);  // stake pockets
      // inner wheel tubs
      const zc = P_.AXR, rr = 0.48;
      b.surf(16, 1, (u, v) => { const a = PI * u, z = zc + rr * Math.cos(a), y = BF - 0.18 + (rr - 0.05) * Math.sin(a) + 0.0; return [s * (BIN - 0.24 * v), Math.max(y, BF), z]; }, BED_COL);
      b.surf(16, 1, (u, v) => { const a = PI * u, rr2 = rr * v, z = zc + rr2 * Math.cos(a), y = BF - 0.18 + (rr - 0.05) * v * Math.sin(a); return [s * (BIN - 0.24), Math.max(y, BF), z]; }, BED_COL);
      for (let k = 0; k < 3; k++) b.box(s * (BIN - 0.005), BF + 0.18 + k * 0.12, P_.BED_F - 0.3 - k * 0.5, 0.02, 0.05, 0.05, STEEL);   // tie-down cleats
    }
    // bed front wall (outer + inner) and cab-bed gap closure
    b.box(0, (P_.SILL + P_.BED_RAIL) / 2 + 0.015, P_.BED_F + 0.01, 1.9, P_.BED_RAIL - P_.SILL - 0.03, 0.03, shade(WHITE, 0.9));
    b.box(0, (P_.SILL + P_.BELT) / 2, P_.CAB_BACK - 0.005, 1.84, P_.BELT - P_.SILL, 0.01, WHITE);
    b.box(0, (P_.SILL + P_.BED_RAIL) / 2, (P_.CAB_BACK + P_.BED_F) / 2, 1.7, P_.BED_RAIL - P_.SILL, 0.06, [0.05, 0.05, 0.05]);
    // tailgate
    const TG = P_.TAIL;
    b.box(0, (0.66 + P_.BED_RAIL) / 2, TG + 0.03, 2 * BIN, P_.BED_RAIL - 0.66, 0.06, WHITE);
    b.surf(14, 6, (u, v) => { const x = (u * 2 - 1) * (BIN - 0.01), y = 0.66 + (P_.BED_RAIL - 0.66) * v; return [x, y, TG - 0.001 - 0.012 * Math.sin(PI * v) * Math.sin(PI * u)]; }, (u, v) => dusty(WHITE, 0.66 + (P_.BED_RAIL - 0.66) * v, 0.95, 0.75));
    b.box(0, P_.BED_RAIL - 0.08, TG - 0.016, 0.24, 0.06, 0.01, TRIM);                                                // handle
    b.box(0, 1.05, TG - 0.016, 0.44, 0.08, 0.005, NAVY);                                                             // fleet lettering block
    b.box(-0.1, 1.05, TG - 0.02, 0.18, 0.025, 0.005, [0.95, 0.95, 0.93]);
    b.box(0.13, 1.05, TG - 0.02, 0.1, 0.025, 0.005, ORANGE);
    b.box(0, 0.68, TG - 0.006, 2 * BIN, 0.008, 0.005, TRIM);                                                         // tailgate gap
    for (const s of [-1, 1]) {
      b.box(s * (BIN + 0.005), (0.66 + P_.BED_RAIL) / 2, TG - 0.006, 0.01, P_.BED_RAIL - 0.66, 0.01, TRIM);
      // tail lights: vertical clusters on the bed corners
      const tx = s * 0.905;
      b.box(tx, 1.1, TG - 0.01, 0.1, 0.4, 0.04, [0.1, 0.1, 0.1, 0.3]);
      b.box(tx, 1.18, TG - 0.03, 0.085, 0.22, 0.01, RED_L);
      b.box(tx, 1.025, TG - 0.03, 0.085, 0.08, 0.01, CLEAR_L);
      b.box(tx, 0.945, TG - 0.03, 0.085, 0.06, 0.01, [0.6, 0.04, 0.04, 0.5]);
      // bed corner caps + side reflector
      b.box(s * 0.95, 0.8, TG + 0.05, 0.01, 0.04, 0.08, RED_L);
    }
    // rear step bumper with license plate and hitch receiver
    const RB = dusty([0.62, 0.63, 0.63, 0.3], 0.5, 0.95, 0.4);
    b.box(0, 0.52, P_.REAR + 0.08, 1.96, 0.2, 0.16, RB);
    b.box(0, 0.63, P_.REAR + 0.08, 1.92, 0.02, 0.15, [0.1, 0.1, 0.1]);
    for (const s of [-1, 1]) b.box(s * 0.5, 0.635, P_.REAR + 0.08, 0.4, 0.012, 0.12, [0.06, 0.06, 0.06]);
    b.box(0, 0.52, P_.REAR - 0.002, 0.34, 0.17, 0.01, [0.05, 0.05, 0.05]);
    b.box(0, 0.52, P_.REAR - 0.006, 0.3, 0.15, 0.008, [0.95, 0.94, 0.88]);
    for (let k = 0; k < 6; k++) b.box(-0.11 + k * 0.044, 0.515, P_.REAR - 0.011, 0.028, 0.06, 0.004, [0.12, 0.2, 0.45]);
    b.box(0, 0.38, P_.REAR + 0.15, 0.065, 0.065, 0.36, CHASSIS);
    b.box(0, 0.38, P_.REAR + 0.0, 0.07, 0.08, 0.04, CHASSIS);
    b.cyl([0.05, 0.38, P_.REAR + 0.06], [0.085, 0.38, P_.REAR + 0.06], 0.015, 0.015, 8, STEEL);

    // crossbed diamond-plate toolbox (sits on the bed rails)
    const TB0 = P_.BED_F - 0.04, TB1 = TB0 - 0.5, TBY0 = P_.BED_RAIL + 0.025, TBY1 = TBY0 + 0.27, TBX = 0.97;
    b.box(0, (TBY0 + TBY1) / 2, (TB0 + TB1) / 2, 2 * TBX, TBY1 - TBY0, TB0 - TB1, ALU);
    b.box(0, (BF + TBY0) / 2, (TB0 + TB1) / 2, 2 * BIN - 0.04, TBY0 - BF, TB0 - TB1 - 0.04, shade(ALU, 0.92));
    diamondPlate(b, [-TBX, TBY1 + 0.001, TB1], [1, 0, 0], [0, 0, 1], [0, 1, 0], 2 * TBX, TB0 - TB1, 0.055, ALU, [0.84, 0.85, 0.87, 0.4]);
    diamondPlate(b, [-TBX, TBY0, TB1 - 0.001], [1, 0, 0], [0, 1, 0], [0, 0, -1], 2 * TBX, TBY1 - TBY0, 0.055, ALU, [0.84, 0.85, 0.87, 0.4]);
    diamondPlate(b, [-(BIN - 0.02), BF + 0.02, TB1 + 0.019], [1, 0, 0], [0, 1, 0], [0, 0, -1], 2 * (BIN - 0.02), TBY0 - BF - 0.03, 0.055, shade(ALU, 0.92), [0.8, 0.81, 0.83, 0.4]);
    for (const s of [-1, 1]) {
      b.box(s * TBX * 0.5, TBY1 + 0.006, TB1 + 0.01, 0.9, 0.012, 0.02, shade(ALU, 0.8));      // lid lip
      b.box(s * 0.32, TBY1 - 0.06, TB1 - 0.008, 0.12, 0.04, 0.012, TRIM);                    // lock handles
      b.cyl([s * 0.32, TBY1 - 0.06, TB1 - 0.014], [s * 0.32, TBY1 - 0.06, TB1 - 0.02], 0.012, 0.012, 8, STEEL);
      b.box(s * TBX, (TBY0 + TBY1) / 2, (TB0 + TB1) / 2, 0.01, TBY1 - TBY0 - 0.02, TB0 - TB1 - 0.02, shade(ALU, 1.05));
    }
    b.box(0, TBY1 + 0.006, (TB0 + TB1) / 2, 0.012, 0.012, TB0 - TB1, shade(ALU, 0.75));             // lid split

    // tubular headache rack with amber LED bar
    const RK = [0.1, 0.1, 0.11, 0.25], RZ = P_.BED_F - 0.02, RTOP = 1.98;
    for (const s of [-1, 1]) {
      b.box(s * 0.905, P_.BED_RAIL + 0.03, RZ, 0.1, 0.03, 0.1, RK);
      b.tube([[s * 0.905, P_.BED_RAIL + 0.03, RZ], [s * 0.905, RTOP - 0.1, RZ], [s * 0.88, RTOP - 0.02, RZ], [s * 0.8, RTOP, RZ]], 0.025, 10, RK);
    }
    b.cyl([-0.8, RTOP, RZ], [0.8, RTOP, RZ], 0.025, 0.025, 10, RK, false);
    b.cyl([-0.905, TBY1 + 0.02, RZ], [0.905, TBY1 + 0.02, RZ], 0.022, 0.022, 10, RK, false);
    for (let k = -3; k <= 3; k++) b.cyl([k * 0.2, TBY1 + 0.02, RZ], [k * 0.2, RTOP, RZ], 0.012, 0.012, 6, RK, false);
    b.box(0, RTOP + 0.06, RZ, 1.16, 0.075, 0.085, TRIM);
    for (let k = 0; k < 8; k++) b.box(-0.5 + k * 0.143, RTOP + 0.06, RZ - 0.044, 0.12, 0.055, 0.008, AMBER);
    for (const s of [-1, 1]) b.box(s * 0.5, RTOP + 0.015, RZ, 0.04, 0.03, 0.05, TRIM);

    // cargo: jerrycan (left rear) and a traffic cone (right)
    {
      const jx = -0.66, jz = TG + 0.3, JC = [0.36, 0.4, 0.22, 0.1];
      b.box(jx, BF + 0.235, jz, 0.17, 0.47, 0.35, JC);
      for (const s of [-1, 1]) { b.beam([jx + s * 0.088, BF + 0.08, jz - 0.13], [jx + s * 0.088, BF + 0.39, jz + 0.13], 0.03, shade(JC, 1.15), 0.01); b.beam([jx + s * 0.088, BF + 0.08, jz + 0.13], [jx + s * 0.088, BF + 0.39, jz - 0.13], 0.03, shade(JC, 1.15), 0.01); }
      for (const dz of [-0.1, 0, 0.1]) b.box(jx, BF + 0.5, jz + dz - 0.05, 0.03, 0.06, 0.025, shade(JC, 0.9));
      b.box(jx, BF + 0.53, jz - 0.05, 0.03, 0.02, 0.24, shade(JC, 0.9));
      b.cyl([jx, BF + 0.45, jz + 0.12], [jx, BF + 0.52, jz + 0.16], 0.025, 0.025, 8, shade(JC, 0.8));
    }
    {
      const cx = 0.55, cz = TG + 0.45;
      b.box(cx, BF + 0.02, cz, 0.38, 0.04, 0.38, [0.1, 0.1, 0.1]);
      b.push(tr(cx, BF, cz)); b.lathe([[0.16, 0.04, CONE_O], [0.13, 0.16, CONE_O], [0.105, 0.3, [0.95, 0.95, 0.95, 0.3]], [0.085, 0.42, CONE_O], [0.07, 0.5, [0.95, 0.95, 0.95, 0.3]], [0.055, 0.57, CONE_O], [0.025, 0.71, CONE_O], [0, 0.71]], 20, CONE_O); b.pop();
    }
    return b;
  }

  function pickupLow() {
    const b = new MB(), D = dusty(WHITE, 0.6, 0.95, 0.6);
    b.box(0, 0.83, 0.85, 1.92, 0.56, 3.78, WHITE);                       // front clip + cab lower
    b.box(0, 0.61, 0.85, 1.94, 0.12, 3.7, D);
    for (const s of [-1, 1]) b.box(s * 0.91, 0.95, -1.9, 0.1, 0.76, 1.7, WHITE);   // bed sides
    b.box(0, 0.62, -1.9, 1.72, 0.1, 1.7, D);
    b.box(0, 0.88, -1.9, 1.72, 0.04, 1.6, [0.16, 0.16, 0.16]);          // bed floor
    b.box(0, 0.99, -2.72, 1.72, 0.66, 0.06, WHITE);                     // tailgate
    b.box(0, 1.55, -0.15, 1.72, 0.66, 1.6, GLASS);                      // greenhouse
    b.box(0, 1.89, -0.12, 1.62, 0.04, 1.5, WHITE);
    b.box(0, 0.86, 2.76, 1.1, 0.4, 0.04, [0.08, 0.08, 0.08]);
    b.box(0, 0.5, 2.8, 1.98, 0.24, 0.12, [0.11, 0.11, 0.12]);
    b.box(0, 0.52, -2.78, 1.96, 0.2, 0.14, [0.6, 0.6, 0.6]);
    b.box(0, 1.2, -1.4, 1.94, 0.6, 0.5, ALU);                           // toolbox
    b.box(0, 2.04, -1.1, 1.16, 0.08, 0.09, AMBER);
    for (const s of [-1, 1]) {
      for (const z of [P_.AXF, P_.AXR]) b.box(s * 0.975, 0.92, z, 0.04, 0.08, 1.05, PLAST);
      b.box(s * 0.965, 0.83, 0.1, 0.02, 0.06, 2.1, ORANGE);
      b.box(s * 0.965, 0.885, 0.1, 0.02, 0.04, 2.1, NAVY);
      b.box(s * 0.905, 1.66, -1.1, 0.05, 0.64, 0.05, TRIM);
      b.box(s * 0.9, 1.1, -2.76, 0.1, 0.4, 0.04, RED_L);
      b.box(s * 1.12, 1.36, 1.03, 0.09, 0.32, 0.12, TRIM);
      for (const z of [P_.AXF, P_.AXR]) b.cyl([s * 0.69, 0.4, z], [s * 0.99, 0.4, z], 0.4, 0.4, 8, RUBBER);
    }
    return b;
  }

  // =====================================================================
  // 2. UTV side-by-side  (front = +Z, driver on +X)
  // =====================================================================
  const U = {
    AXF: 1.05, AXR: -1.15, TRACK: 0.66, WR: 0.34, WW: 0.24,
    FLOOR: 0.36, SEAT_Y: 0.58, SEAT_Z: -0.12, SEAT_X: 0.33,
    COWL_Z: 0.52, NOSE_Z: 1.46, HOOD_R: 0.98, HOOD_F: 0.84,
    BED0: -0.58, BED1: -1.47, BED_Y: 0.82, BED_TOP: 1.1, BED_W: 0.66,
    CAGE_X: 0.67, CAGE_TOP: 1.88, CAGE_F: 0.04, CAGE_R: -0.46
  };
  const U_OR = [0.92, 0.32, 0.04, 0.3], U_OR_D = [0.75, 0.25, 0.04, 0.25], U_GR = [0.21, 0.22, 0.23, 0.12], U_GR_D = [0.13, 0.135, 0.14, 0.08], U_CAGE = [0.17, 0.17, 0.18, 0.25], SEATC = [0.1, 0.1, 0.11, 0.02];
  const uHoodY = z => U.HOOD_R + (U.HOOD_F - U.HOOD_R) * clamp((z - U.COWL_Z) / (U.NOSE_Z - U.COWL_Z), 0, 1);
  const uHoodW = z => 0.5 - 0.1 * Math.pow(clamp((z - 1.1) / (U.NOSE_Z - 1.1), 0, 1), 2);

  // angular wheel arch: path = [[dz, y], ...] round the wheel, sec = [[dy, x], ...] across the fender
  function fender(b, s, zc, path, sec, col, lip) {
    const n = path.length - 1, m = sec.length - 1;
    b.surf(n * 3, m, (u, v) => {
      const t = u * n, i = Math.min(n - 1, Math.floor(t)), f = t - i, p = [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f], q = sec[Math.round(v * m)];
      return [s * q[1], p[1] + q[0], zc + p[0]];
    }, (u, v) => v > 0.7 ? lip : col);
  }
  function utv(detail) {
    if (!detail) return utvLow();
    const b = new MB();
    // ---------- chassis, floor, rockers ----------
    b.box(0, U.FLOOR - 0.025, -0.05, 1.2, 0.05, 1.2, U_GR_D);                               // floor pan
    b.box(0, 0.25, 0.1, 0.5, 0.06, 2.3, [0.5, 0.52, 0.53, 0.3]);                              // aluminium skid / bash plate
    for (const s of [-1, 1]) {
      b.cyl([s * 0.22, 0.3, 1.35], [s * 0.22, 0.3, -1.3], 0.03, 0.03, 8, U_CAGE);               // frame rails
      b.tube([[s * U.CAGE_X, 0.42, 0.55], [s * U.CAGE_X, 0.42, -0.6]], 0.028, 10, U_CAGE);      // rocker tube
      b.box(s * (U.CAGE_X - 0.08), 0.39, -0.02, 0.14, 0.04, 1.1, U_GR);                         // rock slider panel
    }
    for (const z of [1.2, 0.55, -0.6, -1.25]) b.cyl([-0.22, 0.3, z], [0.22, 0.3, z], 0.025, 0.025, 8, U_CAGE);
    // engine + CVT under the bed, exhaust
    b.box(0, 0.6, -0.95, 0.55, 0.42, 0.55, [0.25, 0.25, 0.25, 0.2]);
    b.box(0.25, 0.55, -0.85, 0.12, 0.35, 0.5, [0.15, 0.15, 0.15, 0.1]);
    b.cyl([-0.2, 0.65, -1.15], [-0.2, 0.65, -1.45], 0.08, 0.08, 12, [0.55, 0.55, 0.55, 0.35]);
    b.cyl([-0.2, 0.65, -1.45], [-0.2, 0.67, -1.52], 0.03, 0.03, 8, [0.2, 0.2, 0.2, 0.3]);
    // ---------- wheels: knobbly tyres on beadlock rims ----------
    const W = makeWheel({ R: U.WR, W: U.WW, rim: 0.19, tread: 0.032, segs: 24, blocks: 18, ribs: 0, dish: 0.05, vents: 0, lugs: 4, rimCol: [0.16, 0.16, 0.17, 0.25], capCol: U_OR, beadlock: [0.62, 0.63, 0.64, 0.35] });
    for (const z of [U.AXF, U.AXR]) for (const s of [-1, 1]) putWheel(b, W, s * U.TRACK, U.WR, z);
    // ---------- long-travel suspension: A-arms + coil-over shocks front, trailing arms rear ----------
    const SPR = [0.95, 0.42, 0.06, 0.3], SHK = [0.75, 0.76, 0.78, 0.4];
    function coilOver(a, c) {                         // shock body + chrome shaft + coil spring from a (bottom) to c (top)
      b.cyl(a, K.lerp(a, c, 0.55), 0.013, 0.013, 8, SHK); b.cyl(K.lerp(a, c, 0.45), c, 0.028, 0.028, 10, [0.2, 0.2, 0.22, 0.3]);
      const d = K.sub(c, a), L = Math.hypot(d[0], d[1], d[2]), f = K.norm(d), s1 = K.norm(K.cross(f, [1, 0, 0])), s2 = K.cross(f, s1), pts = [];
      for (let k = 0; k <= 48; k++) { const t = 0.12 + 0.74 * k / 48, a2 = k / 48 * PI * 2 * 7; pts.push(K.add(K.add(a, K.scale(d, t)), K.add(K.scale(s1, 0.045 * Math.cos(a2)), K.scale(s2, 0.045 * Math.sin(a2))))); }
      b.tube(pts, 0.008, 4, SPR); b.cyl(K.lerp(a, c, 0.1), K.lerp(a, c, 0.12), 0.055, 0.055, 10, U_CAGE); b.cyl(K.lerp(a, c, 0.86), K.lerp(a, c, 0.88), 0.055, 0.055, 10, U_CAGE);
    }
    for (const s of [-1, 1]) {
      const hx = s * (U.TRACK - 0.1), z = U.AXF;
      b.box(hx, U.WR, z, 0.06, 0.2, 0.08, U_CAGE);                                         // knuckle
      for (const dz of [-0.17, 0.17]) { b.cyl([s * 0.22, 0.27, z + dz], [hx, 0.27, z], 0.018, 0.018, 8, U_CAGE); b.cyl([s * 0.24, 0.47, z + dz * 0.8], [hx, 0.44, z], 0.016, 0.016, 8, U_CAGE); }
      coilOver([s * 0.48, 0.29, z - 0.02], [s * 0.3, 0.86, z - 0.12]);
      b.cyl([s * 0.08, 0.32, z], [hx, U.WR, z], 0.02, 0.02, 8, [0.3, 0.3, 0.3, 0.3]);       // CV axle
      b.cyl([s * 0.4, 0.4, z + 0.2], [hx, 0.38, z + 0.12], 0.012, 0.012, 6, SHK);           // tie rod
      // rear: trailing arm, radius rods, coil-over
      const rx = s * (U.TRACK - 0.1), rz = U.AXR;
      b.box(rx, U.WR, rz, 0.06, 0.2, 0.1, U_CAGE);
      b.beam([s * 0.58, 0.4, -0.35], [rx, U.WR, rz], 0.05, U_CAGE, 0.09);
      for (const dy of [0.27, 0.42]) b.cyl([s * 0.2, dy, rz + 0.1], [rx, dy, rz], 0.016, 0.016, 8, U_CAGE);
      coilOver([s * 0.52, 0.28, rz + 0.06], [s * 0.36, 0.96, rz + 0.3]);
      b.cyl([s * 0.08, 0.36, rz], [rx, U.WR, rz], 0.02, 0.02, 8, [0.3, 0.3, 0.3, 0.3]);
    }
    // ---------- front bodywork: hood, nose, fenders ----------
    b.surf(18, 16, (u, v) => {
      const z = U.COWL_Z + (U.NOSE_Z - U.COWL_Z) * v, w = uHoodW(z), sx = u * 2 - 1;
      let y = uHoodY(z) + 0.03 * (1 - sx * sx) - 0.05 * Math.pow(Math.abs(sx), 8) - 0.06 * Math.pow(clamp((z - (U.NOSE_Z - 0.1)) / 0.1, 0, 1), 2);
      y -= 0.015 * Math.exp(-Math.pow((Math.abs(sx) - 0.5) / 0.06, 2));                      // two styling creases
      return [sx * w, y, z];
    }, (u, v) => (Math.abs(u - 0.5) < 0.12 && v > 0.15 && v < 0.75) ? U_GR : U_OR);
    for (const s of [-1, 1]) {
      b.surf(10, 3, (u, v) => { const z = U.COWL_Z + (U.NOSE_Z - 0.02 - U.COWL_Z) * u, w = uHoodW(z) - 0.01, yt = uHoodY(z) - 0.05, y = 0.42 + (yt - 0.42) * v; return [s * w, y, z]; }, U_GR);   // nose sides
      // front fender: curved band over the wheel, orange top, dark lip
      // front fender: angular arch over the wheel, orange top, dark lip
      fender(b, s, U.AXF, [[0.5, 0.5], [0.44, 0.7], [0.3, 0.88], [0, 0.93], [-0.28, 0.92], [-0.4, 0.78], [-0.44, 0.56]], [[0, 0.44], [0.03, 0.47], [0.04, 0.64], [0.02, 0.78], [-0.03, 0.8]], U_OR, U_GR_D);
      // rear fender under the bed
      fender(b, s, U.AXR, [[0.42, 0.56], [0.36, 0.74], [0.24, 0.82], [-0.24, 0.82], [-0.38, 0.76], [-0.46, 0.56]], [[0, 0.5], [0.02, 0.52], [0.03, 0.74], [-0.03, 0.8]], U_GR, U_GR_D);
      // side door panels / lower nets (orange plastic half doors)
      b.surf(8, 4, (u, v) => { const z = 0.42 - 0.62 * u, y = 0.46 + 0.42 * v - 0.08 * u * v; return [s * (U.CAGE_X + 0.02 - 0.02 * v * v), y, z]; }, (u, v) => v > 0.85 ? U_GR_D : U_OR);
      b.tube([[s * (U.CAGE_X + 0.01), 0.88, 0.42], [s * (U.CAGE_X + 0.01), 0.82, -0.2]], 0.015, 6, U_GR_D);
      // headlight pods in the nose
      const hz = U.NOSE_Z - 0.02;
      b.box(s * 0.28, 0.7, hz, 0.24, 0.1, 0.05, [0.05, 0.05, 0.05, 0.3]);
      b.box(s * 0.28, 0.705, hz + 0.02, 0.19, 0.06, 0.02, CLEAR_L);
      b.box(s * 0.28, 0.66, hz + 0.025, 0.17, 0.012, 0.01, [1, 1, 1, 0.5]);
      // tail lights on the bed corners
      b.box(s * 0.56, 0.95, U.BED1 - 0.01, 0.1, 0.06, 0.03, RED_L);
    }
    // nose: grille + front bumper / brush guard
    b.box(0, 0.62, U.NOSE_Z - 0.02, 0.36, 0.3, 0.04, [0.06, 0.06, 0.06]);
    for (let k = 0; k < 5; k++) b.box(0, 0.51 + k * 0.055, U.NOSE_Z + 0.005, 0.34, 0.015, 0.02, U_GR);
    b.box(0, 0.42, U.NOSE_Z - 0.05, 1.0, 0.1, 0.1, U_GR_D);
    b.tube([[-0.45, 0.4, U.NOSE_Z - 0.04], [-0.42, 0.4, U.NOSE_Z + 0.08], [-0.3, 0.42, U.NOSE_Z + 0.12], [0.3, 0.42, U.NOSE_Z + 0.12], [0.42, 0.4, U.NOSE_Z + 0.08], [0.45, 0.4, U.NOSE_Z - 0.04]], 0.026, 10, U_CAGE);
    b.tube([[-0.3, 0.42, U.NOSE_Z + 0.12], [-0.28, 0.66, U.NOSE_Z + 0.1], [-0.2, 0.72, U.NOSE_Z + 0.06], [0.2, 0.72, U.NOSE_Z + 0.06], [0.28, 0.66, U.NOSE_Z + 0.1], [0.3, 0.42, U.NOSE_Z + 0.12]], 0.022, 10, U_CAGE);
    b.box(0, 0.3, U.NOSE_Z - 0.02, 0.6, 0.02, 0.3, [0.36, 0.37, 0.38, 0.3]);                // bash plate
    for (const s of [-1, 1]) b.cyl([s * 0.08, 0.34, U.NOSE_Z + 0.12], [s * 0.08, 0.3, U.NOSE_Z + 0.16], 0.015, 0.015, 6, [0.8, 0.1, 0.07, 0.2]);   // tow points
    // dash, cowl, steering
    b.box(0, 0.92, U.COWL_Z - 0.02, 1.18, 0.12, 0.12, U_GR_D);
    b.box(0, 0.73, U.COWL_Z + 0.02, 1.0, 0.42, 0.06, U_GR);
    b.surf(10, 3, (u, v) => { const x = (u * 2 - 1) * 0.58, z = U.COWL_Z - 0.08 - 0.1 * v; return [x, 0.98 - 0.06 * v + 0.02 * (1 - (u * 2 - 1) ** 2), z]; }, U_GR);
    b.box(U.SEAT_X, 1.0, U.COWL_Z - 0.1, 0.2, 0.06, 0.04, [0.05, 0.05, 0.05, 0.3]);            // gauge pod
    b.cyl([U.SEAT_X - 0.05, 1.005, U.COWL_Z - 0.122], [U.SEAT_X - 0.05, 1.005, U.COWL_Z - 0.126], 0.022, 0.022, 10, [0.75, 0.8, 0.85, 0.5]);
    {
      const c0 = [U.SEAT_X, 0.9, U.COWL_Z - 0.06], c1 = [U.SEAT_X, 1.04, U.COWL_Z - 0.3], f = K.norm(K.sub(c1, c0));
      b.cyl(c0, c1, 0.02, 0.02, 8, U_GR_D);
      const s1 = [1, 0, 0], s2 = K.norm(K.cross(f, s1)), ring = [];
      for (let k = 0; k <= 28; k++) { const a = k / 28 * PI * 2; ring.push(K.add(c1, K.add(K.scale(s1, 0.17 * Math.cos(a)), K.scale(s2, 0.17 * Math.sin(a))))); }
      b.tube(ring, 0.016, 8, [0.06, 0.06, 0.06]);
      for (const a of [0, PI, PI * 1.5]) b.beam(c1, K.add(c1, K.add(K.scale(s1, 0.16 * Math.cos(a)), K.scale(s2, 0.16 * Math.sin(a)))), 0.025, U_GR, 0.012);
      b.cyl(c1, K.add(c1, K.scale(f, 0.03)), 0.045, 0.035, 10, U_OR);
    }
    b.box(0, 0.6, 0.0, 0.16, 0.28, 0.9, U_GR);                                                  // centre console
    b.cyl([0.05, 0.75, 0.3], [0.05, 0.9, 0.25], 0.01, 0.01, 6, [0.4, 0.4, 0.4, 0.3]);
    b.sphere(0.05, 0.9, 0.25, 0.025, 8, [0.06, 0.06, 0.06]);
    // ---------- bucket seats with harnesses ----------
    for (const s of [-1, 1]) {
      const sx = s * U.SEAT_X, sz = U.SEAT_Z;
      b.box(sx, U.SEAT_Y - 0.1, sz + 0.03, 0.44, 0.16, 0.44, U_GR_D);                           // seat base
      b.surf(10, 4, (u, v) => { const t = u * 2 - 1, x = sx + t * 0.23, y = U.SEAT_Y + 0.04 * Math.abs(t) ** 3 + 0.02 * v, z = sz + 0.22 - 0.46 * v; return [x, y, z]; }, SEATC);   // cushion
      for (const o of [0, 0.05]) b.surf(10, 8, (u, v) => {
        const t = u * 2 - 1, x = sx + t * 0.24, y = U.SEAT_Y + 0.04 + 0.66 * v, z = sz - 0.24 - 0.12 * v + 0.07 * t * t * (1 - 0.4 * v) - o;
        return [x, y, z];
      }, o ? U_GR_D : (u, v) => (Math.abs(u - 0.5) < 0.3 && v > 0.1 && v < 0.85) ? [0.16, 0.16, 0.17, 0.02] : SEATC);                // backrest + shell
      b.box(sx, U.SEAT_Y + 0.62, sz - 0.39, 0.28, 0.04, 0.06, U_OR);                             // headrest stitch band
      // harness: two shoulder belts, lap belt, buckle
      const HC = [0.85, 0.12, 0.08, 0.05];
      for (const t of [-1, 1]) {
        b.tube([[sx + t * 0.08, U.SEAT_Y + 0.72, sz - 0.32], [sx + t * 0.08, U.SEAT_Y + 0.6, sz - 0.27], [sx + t * 0.06, U.SEAT_Y + 0.3, sz - 0.24], [sx + t * 0.02, U.SEAT_Y + 0.08, sz - 0.12]], 0.012, 4, HC);
        b.tube([[sx + t * 0.22, U.SEAT_Y + 0.04, sz - 0.18], [sx + t * 0.12, U.SEAT_Y + 0.08, sz - 0.08], [sx + t * 0.02, U.SEAT_Y + 0.08, sz - 0.06]], 0.012, 4, HC);
      }
      b.box(sx, U.SEAT_Y + 0.08, sz - 0.07, 0.07, 0.07, 0.02, [0.7, 0.72, 0.75, 0.4]);
    }
    // ---------- cargo bed with toolbox and a coil of cable ----------
    const by = U.BED_Y, bw = U.BED_W;
    b.box(0, by - 0.02, (U.BED0 + U.BED1) / 2, 2 * bw, 0.04, U.BED0 - U.BED1, U_GR_D);
    for (let k = -4; k <= 4; k++) b.box(k * 0.13, by + 0.005, (U.BED0 + U.BED1) / 2, 0.04, 0.012, U.BED0 - U.BED1 - 0.06, U_GR);
    for (const s of [-1, 1]) {
      b.box(s * bw, (by + U.BED_TOP) / 2, (U.BED0 + U.BED1) / 2, 0.04, U.BED_TOP - by, U.BED0 - U.BED1, U_GR);
      b.box(s * bw, U.BED_TOP + 0.01, (U.BED0 + U.BED1) / 2, 0.07, 0.02, U.BED0 - U.BED1 + 0.02, U_OR_D);
      for (const z of [U.BED0 - 0.15, U.BED1 + 0.15]) b.box(s * (bw - 0.03), by + 0.15, z, 0.02, 0.04, 0.06, STEEL);
    }
    b.box(0, (by + U.BED_TOP) / 2, U.BED0, 2 * bw, U.BED_TOP - by, 0.04, U_GR);
    b.box(0, (by + U.BED_TOP) / 2, U.BED1, 2 * bw, U.BED_TOP - by, 0.04, U_GR);
    b.box(0, U.BED_TOP - 0.05, U.BED1 - 0.025, 0.3, 0.04, 0.012, U_GR_D);
    b.box(0, (by + 0.6) / 2, U.BED1 + 0.05, 1.0, 0.4, 0.04, U_GR_D);                          // rear panel under bed
    // toolbox (red steel) against the front of the bed
    {
      const tz = U.BED0 - 0.2, TBC = [0.72, 0.1, 0.08, 0.25];
      b.box(-0.25, by + 0.13, tz, 0.55, 0.26, 0.26, TBC);
      b.box(-0.25, by + 0.265, tz, 0.56, 0.02, 0.27, shade(TBC, 0.8));
      b.box(-0.25, by + 0.29, tz, 0.2, 0.025, 0.03, [0.1, 0.1, 0.1]);
      for (const dx of [-0.1, 0.1]) b.box(-0.25 + dx, by + 0.275, tz, 0.02, 0.03, 0.02, [0.1, 0.1, 0.1]);
      b.box(-0.25, by + 0.22, tz - 0.133, 0.06, 0.04, 0.005, STEEL);
    }
    // coil of cable: helix around a vertical axis lying in the bed
    {
      const cx = 0.28, cz = U.BED1 + 0.35, pts = [];
      for (let k = 0; k <= 120; k++) { const a = k / 120 * PI * 2 * 6, rr = 0.2 + 0.012 * Math.sin(k * 1.3); pts.push([cx + rr * Math.cos(a), by + 0.02 + k / 120 * 0.12, cz + rr * Math.sin(a)]); }
      b.tube(pts, 0.016, 4, [0.1, 0.1, 0.1, 0.05]);
      b.tube([[cx + 0.2, by + 0.14, cz], [cx + 0.25, by + 0.1, cz - 0.1], [cx + 0.15, by + 0.03, cz - 0.25]], 0.016, 5, [0.1, 0.1, 0.1, 0.05]);
      b.box(cx + 0.15, by + 0.03, cz - 0.27, 0.04, 0.03, 0.06, [0.75, 0.6, 0.15, 0.3]);       // brass connector
    }
    // ---------- roll cage (tubes) with a hard roof ----------
    const CX = U.CAGE_X, CT = U.CAGE_TOP;
    for (const s of [-1, 1]) {
      const x = s * CX;
      b.tube([[x, 0.42, 0.55], [x, 0.86, 0.55], [x * 0.99, 1.4, 0.36], [x * 0.98, CT - 0.1, 0.12], [x * 0.98, CT - 0.02, U.CAGE_F + 0.02], [x * 0.98, CT, -0.05], [x * 0.98, CT, U.CAGE_R + 0.07], [x * 0.98, CT - 0.03, U.CAGE_R - 0.01], [x, CT - 0.12, U.CAGE_R - 0.05], [x, 1.15, -0.55], [x, 0.85, -0.58], [x, 0.42, -0.6]], 0.026, 10, U_CAGE);
      b.tube([[x, 1.1, -0.55], [x * 0.6, 1.35, -0.5], [0, 1.6, -0.47]], 0.02, 8, U_CAGE);            // rear X brace
      b.tube([[x, 1.6, -0.5], [x * 0.5, 1.35, -0.5], [0, 1.1, -0.53]], 0.02, 8, U_CAGE);
      b.cyl([x, 1.6, U.CAGE_R - 0.09], [x * 0.9, 1.6, U.BED0 + 0.02], 0.02, 0.02, 8, U_CAGE);     // grab handle stays
      b.cyl([x * 0.75, 1.1, 0.48], [x * 0.75, 1.25, 0.43], 0.016, 0.016, 8, U_CAGE);
      b.tube([[x * 0.75, 1.25, 0.43], [x * 0.7, 1.32, 0.38], [x * 0.55, 1.32, 0.38]], 0.016, 8, [0.06, 0.06, 0.06]);   // passenger grab bar
    }
    b.cyl([-CX * 0.98, CT, U.CAGE_F], [CX * 0.98, CT, U.CAGE_F], 0.026, 0.026, 10, U_CAGE);
    b.cyl([-CX * 0.98, CT - 0.04, U.CAGE_R], [CX * 0.98, CT - 0.04, U.CAGE_R], 0.026, 0.026, 10, U_CAGE);
    b.cyl([-CX, 1.15, -0.55], [CX, 1.15, -0.55], 0.024, 0.024, 10, U_CAGE);
    b.cyl([-CX, 0.86, 0.55], [CX, 0.86, 0.55], 0.024, 0.024, 10, U_CAGE);
    b.surf(14, 10, (u, v) => { const sx = u * 2 - 1, sz = v * 2 - 1, z = U.CAGE_R + 0.02 + (U.CAGE_F - 0.01 - U.CAGE_R - 0.02) * v; return [sx * (CX - 0.01), CT + 0.03 + 0.025 * (1 - sx ** 4) * (1 - sz ** 4), z]; }, (u, v) => (Math.floor(u * 7) % 2 && v > 0.1 && v < 0.9) ? U_GR_D : U_GR);
    b.box(0, CT + 0.07, U.CAGE_F - 0.02, 0.7, 0.05, 0.06, [0.06, 0.06, 0.06]);                     // roof LED bar
    for (let k = 0; k < 5; k++) b.box(-0.28 + k * 0.14, CT + 0.07, U.CAGE_F + 0.012, 0.11, 0.035, 0.006, CLEAR_L);
    b.box(-0.45, CT + 0.06, U.CAGE_R + 0.02, 0.08, 0.06, 0.08, AMBER);                              // beacon
    // rear-view mirror
    b.box(0, CT - 0.1, U.CAGE_F + 0.0, 0.26, 0.07, 0.025, [0.06, 0.06, 0.06]);
    b.box(0, CT - 0.1, U.CAGE_F - 0.014, 0.24, 0.055, 0.004, [0.55, 0.6, 0.65, 0.5]);
    // ---------- whip flag on the rear-left cage corner ----------
    {
      const px = -CX - 0.04, pz = U.CAGE_R - 0.1;
      b.box(px, 1.18, pz, 0.04, 0.06, 0.04, U_CAGE);
      b.cyl([px, 1.15, pz], [px, 3.0, pz - 0.05], 0.007, 0.004, 6, [0.95, 0.45, 0.1, 0.1]);
      const F0 = [px, 3.0, pz - 0.05], F1 = [px, 2.7, pz - 0.05], F2 = [px - 0.02, 2.86, pz - 0.48], fc = [1.0, 0.35, 0.02, 0];
      b.tri(b.v(...F0, 1, 0, 0, fc), b.v(...F1, 1, 0, 0, fc), b.v(...F2, 1, 0, 0, fc));
    }
    return b;
  }
  function utvLow() {
    const b = new MB();
    b.box(0, 0.62, 0.98, 1.0, 0.5, 0.95, U_OR);
    b.box(0, 0.6, -0.1, 1.36, 0.45, 1.1, U_GR);
    b.box(0, 0.95, -1.02, 1.34, 0.3, 0.9, U_GR);
    for (const s of [-1, 1]) {
      b.box(s * 0.66, 0.84, U.AXF, 0.3, 0.06, 0.8, U_OR);
      b.box(s * 0.33, 0.9, -0.3, 0.44, 0.66, 0.1, SEATC);
      b.box(s * 0.69, 0.67, 0.11, 0.02, 0.42, 0.62, U_OR);
      b.beam([s * U.CAGE_X, 0.86, 0.55], [s * U.CAGE_X, U.CAGE_TOP, 0.04], 0.05, U_CAGE);
      b.beam([s * U.CAGE_X, 0.42, -0.58], [s * U.CAGE_X, U.CAGE_TOP, -0.46], 0.05, U_CAGE);
      for (const z of [U.AXF, U.AXR]) b.cyl([s * 0.54, U.WR, z], [s * 0.78, U.WR, z], U.WR, U.WR, 8, RUBBER);
    }
    b.box(0, U.CAGE_TOP + 0.03, -0.21, 1.34, 0.04, 0.5, U_GR);
    b.cyl([-0.71, 1.15, -0.56], [-0.71, 3.0, -0.61], 0.01, 0.01, 3, ORANGE, false);
    return b;
  }

  // =====================================================================
  // 3. FLATBED TRAILER with a dish reflector panel and a cable drum  (front / drawbar = +Z)
  // =====================================================================
  const T = { DECK: 0.7, DW: 0.85, D0: -2.5, D1: 1.4, AX1: -0.25, AX2: -1.05, WR: 0.33, WW: 0.2, TRACK: 1.0, COUPLER: 2.48 };
  const WOODS = [[0.52, 0.37, 0.22], [0.46, 0.32, 0.19], [0.56, 0.41, 0.26], [0.42, 0.3, 0.18], [0.5, 0.36, 0.23]];
  const TSTEEL = [0.13, 0.135, 0.14, 0.2], PANEL = [0.92, 0.92, 0.9, 0.25], PANEL_B = [0.7, 0.71, 0.72, 0.2], STRAP = [0.95, 0.75, 0.08, 0.05];
  // dish panel geometry: centre of the face at (0, PY, PZ); 3 m along z, 2 m across x
  const PZ = -1.02, PY = 1.0, PHX = 1.0, PHZ = 1.5, SAG = 0.05;
  const dishY = (x, z) => PY + SAG * (x * x + (z - PZ) * (z - PZ));
  function trailer(detail) {
    if (!detail) return trailerLow();
    const b = new MB(), r = rnd(77), dk = T.DECK;
    // frame: perimeter rails, centre rails, crossmembers
    for (const s of [-1, 1]) {
      b.box(s * T.DW, dk - 0.1, (T.D0 + T.D1) / 2, 0.06, 0.15, T.D1 - T.D0, TSTEEL);
      b.box(s * T.DW + s * 0.03, dk - 0.1, (T.D0 + T.D1) / 2, 0.01, 0.11, T.D1 - T.D0 - 0.04, shade(TSTEEL, 0.7));
      b.box(s * 0.45, dk - 0.12, (T.D0 + T.D1) / 2 + 0.1, 0.05, 0.12, T.D1 - T.D0 - 0.2, TSTEEL);
      for (let k = 0; k < 6; k++) b.box(s * (T.DW + 0.035), dk - 0.04, T.D0 + 0.35 + k * 0.7, 0.05, 0.06, 0.06, TSTEEL);   // stake pockets
    }
    for (let k = 0; k <= 8; k++) b.box(0, dk - 0.11, T.D0 + 0.04 + k * (T.D1 - T.D0 - 0.08) / 8, 2 * T.DW, 0.07, 0.05, TSTEEL);
    b.box(0, dk - 0.1, T.D0, 2 * T.DW + 0.06, 0.15, 0.06, TSTEEL);
    b.box(0, dk - 0.1, T.D1, 2 * T.DW + 0.06, 0.15, 0.06, TSTEEL);
    // wooden deck planks along the length, with gaps
    const np = 13, pw = 2 * T.DW / np;
    for (let i = 0; i < np; i++) {
      const c = WOODS[i % WOODS.length].map(v => v * (0.88 + 0.2 * r())), x = -T.DW + pw * (i + 0.5);
      b.box(x, dk - 0.02, (T.D0 + T.D1) / 2, pw - 0.012, 0.04, T.D1 - T.D0 - 0.02, c);
      for (const z of [T.D0 + 0.05, T.D1 - 0.05]) b.box(x, dk + 0.001, z, 0.014, 0.004, 0.014, [0.3, 0.3, 0.3, 0.2]);   // bolts
    }
    // front headboard rail
    for (const s of [-1, 1]) b.box(s * (T.DW - 0.02), dk + 0.25, T.D1 - 0.02, 0.05, 0.5, 0.05, TSTEEL);
    for (const y of [0.2, 0.48]) b.box(0, dk + y, T.D1 - 0.02, 2 * T.DW, 0.04, 0.04, TSTEEL);
    for (let k = -3; k <= 3; k++) b.box(k * 0.24, dk + 0.22, T.D1 - 0.02, 0.025, 0.44, 0.025, TSTEEL);
    // running gear: tandem axles on leaf springs with equaliser, fenders
    const W = makeWheel({ R: T.WR, W: T.WW, rim: 0.19, tread: 0.01, segs: 20, blocks: 0, ribs: 0, dish: 0.03, vents: 0, lugs: 5, rimCol: [0.85, 0.85, 0.83, 0.3], capCol: STEEL });
    for (const z of [T.AX1, T.AX2]) {
      b.cyl([-T.TRACK + 0.1, T.WR, z], [T.TRACK - 0.1, T.WR, z], 0.035, 0.035, 8, TSTEEL);
      for (const s of [-1, 1]) {
        putWheel(b, W, s * T.TRACK, T.WR, z);
        for (let L = 0; L < 2; L++) { const pts = []; for (let k = 0; k <= 4; k++) { const t = k / 2 - 1; pts.push([s * 0.75, T.WR + 0.05 - L * 0.016 + 0.06 * t * t, z + t * (0.32 - L * 0.1)]); } for (let k = 0; k < 4; k++) b.beam(pts[k], pts[k + 1], 0.05, TSTEEL, 0.012); }
        b.box(s * 0.75, T.WR, z, 0.08, 0.05, 0.1, TSTEEL);
      }
    }
    for (const s of [-1, 1]) {
      b.box(s * 0.75, dk - 0.25, (T.AX1 + T.AX2) / 2, 0.05, 0.14, 0.06, TSTEEL);              // equaliser hanger
      b.box(s * 0.75, dk - 0.25, T.AX1 + 0.4, 0.05, 0.14, 0.05, TSTEEL);
      b.box(s * 0.75, dk - 0.25, T.AX2 - 0.4, 0.05, 0.14, 0.05, TSTEEL);
      // fender: curved steel sheet over both wheels plus a flat step top
      b.surf(24, 2, (u, v) => {
        const z = T.AX2 - 0.48 + (T.AX1 - T.AX2 + 0.96) * u, t = (z - (T.AX1 + T.AX2) / 2) / 0.88, y = dk + 0.18 - 0.36 * Math.pow(Math.abs(t), 6);
        return [s * (T.DW + 0.05 + 0.28 * v), y, z];
      }, (u, v) => dusty(TSTEEL, 0.5, 0.8, 0.4));
      b.plate([s * (T.DW + 0.33), dk - 0.18, T.AX2 - 0.48], [s * (T.DW + 0.33), dk + 0.18, T.AX2 - 0.2], [s * (T.DW + 0.33), dk + 0.18, T.AX1 + 0.2], [s * (T.DW + 0.33), dk - 0.18, T.AX1 + 0.48], shade(TSTEEL, 0.8));
      b.box(s * (T.DW + 0.33), dk + 0.05, T.AX1 + 0.47, 0.02, 0.05, 0.08, AMBER);                 // side marker
      b.box(s * (T.DW + 0.33), dk + 0.05, T.AX2 - 0.47, 0.02, 0.05, 0.08, RED_L);
      // tail light boxes
      b.box(s * (T.DW - 0.1), dk - 0.1, T.D0 - 0.04, 0.18, 0.09, 0.03, [0.08, 0.08, 0.08]);
      b.box(s * (T.DW - 0.13), dk - 0.1, T.D0 - 0.056, 0.09, 0.06, 0.01, RED_L);
      b.box(s * (T.DW - 0.04), dk - 0.1, T.D0 - 0.056, 0.04, 0.06, 0.01, AMBER);
    }
    b.box(0, dk - 0.1, T.D0 - 0.034, 0.3, 0.13, 0.01, [0.95, 0.94, 0.88]);                       // plate
    for (let k = 0; k < 5; k++) b.box(-0.1 + k * 0.05, dk - 0.1, T.D0 - 0.04, 0.03, 0.05, 0.004, [0.12, 0.2, 0.45]);
    // drawbar (A-frame), coupler, safety chains, jack stand
    const cz = T.COUPLER, cy = 0.5;
    for (const s of [-1, 1]) b.beam([s * 0.75, dk - 0.1, T.D1], [s * 0.06, cy, cz - 0.3], 0.08, TSTEEL, 0.12);
    b.box(0, cy, cz - 0.2, 0.12, 0.12, 0.3, TSTEEL);
    b.box(0, cy + 0.02, cz - 0.02, 0.14, 0.1, 0.2, [0.3, 0.31, 0.33, 0.3]);
    b.sphere(0, cy - 0.02, cz + 0.05, 0.055, 12, [0.3, 0.31, 0.33, 0.3]);
    b.box(0, cy + 0.08, cz - 0.04, 0.05, 0.03, 0.16, [0.75, 0.1, 0.07, 0.2]);                        // latch lever
    for (const s of [-1, 1]) {
      const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([s * (0.08 + 0.04 * Math.sin(t * PI)), cy - 0.06 - 0.18 * Math.sin(t * PI), cz - 0.3 + 0.3 * t]); }
      b.tube(pts, 0.012, 5, [0.5, 0.5, 0.52, 0.3]);
      b.tube([[s * 0.08, cy - 0.06, cz - 0.0], [s * 0.1, cy - 0.12, cz + 0.08], [s * 0.08, cy - 0.16, cz + 0.12]], 0.012, 5, [0.5, 0.5, 0.52, 0.3]);
    }
    {
      const jx = 0.28, jz = 1.95, JC = [0.2, 0.2, 0.22, 0.25];
      b.box(jx - 0.05, 0.55, jz, 0.18, 0.06, 0.06, TSTEEL);
      b.cyl([jx, 0.12, jz], [jx, 0.85, jz], 0.04, 0.04, 10, JC);
      b.cyl([jx, 0.85, jz], [jx, 0.88, jz], 0.05, 0.05, 10, JC);
      b.cyl([jx, 0.03, jz], [jx, 0.12, jz], 0.025, 0.025, 8, STEEL);
      b.box(jx, 0.015, jz, 0.18, 0.03, 0.18, JC);                                                   // foot plate on the ground
      b.tube([[jx, 0.88, jz], [jx, 0.93, jz], [jx + 0.14, 0.93, jz], [jx + 0.14, 0.88, jz]], 0.01, 6, STEEL);
      b.cyl([jx + 0.14, 0.88, jz], [jx + 0.14, 0.82, jz], 0.015, 0.015, 6, [0.06, 0.06, 0.06]);
    }
    // ---------- load 1: dish reflector panel on timber blocks ----------
    const nu = 20, nv = 28, TH = 0.025;
    b.surf(nu, nv, (u, v) => { const x = (u * 2 - 1) * PHX, z = PZ + (v * 2 - 1) * PHZ; return [x, dishY(x, z), z]; }, (u, v) => {
      const k = 0.96 + 0.04 * Math.sin(u * 17 + v * 11); return [PANEL[0] * k, PANEL[1] * k, PANEL[2] * k, PANEL[3]];
    });
    b.surf(nu / 2, nv / 2, (u, v) => { const x = (u * 2 - 1) * PHX, z = PZ + (v * 2 - 1) * PHZ; return [x, dishY(x, z) - TH, z]; }, PANEL_B);
    // panel edge
    const edge = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40 * 4; let x, z; if (t < 1) { x = -PHX + 2 * PHX * t; z = PZ - PHZ; } else if (t < 2) { x = PHX; z = PZ - PHZ + 2 * PHZ * (t - 1); } else if (t < 3) { x = PHX - 2 * PHX * (t - 2); z = PZ + PHZ; } else { x = -PHX; z = PZ + PHZ - 2 * PHZ * (t - 3); } edge.push([x, z]); }
    for (let i = 0; i < 40; i++) { const [x0, z0] = edge[i], [x1, z1] = edge[i + 1]; b.plate([x0, dishY(x0, z0) + 0.005, z0], [x1, dishY(x1, z1) + 0.005, z1], [x1, dishY(x1, z1) - TH, z1], [x0, dishY(x0, z0) - TH, z0], PANEL_B); }
    // ribs on the back: 3 along z, 5 across x, deep T-sections following the curve
    const RIBC = [0.6, 0.62, 0.64, 0.3];
    for (const x of [-0.8, 0, 0.8]) for (let k = 0; k < 14; k++) {
      const z0 = PZ - PHZ + 0.05 + k * (2 * PHZ - 0.1) / 14, z1 = z0 + (2 * PHZ - 0.1) / 14;
      b.plate([x, dishY(x, z0) - TH, z0], [x, dishY(x, z1) - TH, z1], [x, dishY(x, z1) - TH - 0.09, z1], [x, dishY(x, z0) - TH - 0.09, z0], RIBC);
      b.plate([x - 0.025, dishY(x, z0) - TH - 0.09, z0], [x + 0.025, dishY(x, z0) - TH - 0.09, z0], [x + 0.025, dishY(x, z1) - TH - 0.09, z1], [x - 0.025, dishY(x, z1) - TH - 0.09, z1], shade(RIBC, 0.9));
    }
    for (const zr of [-1.3, -0.65, 0, 0.65, 1.3]) for (let k = 0; k < 10; k++) {
      const z = PZ + zr, x0 = -PHX + 0.05 + k * (2 * PHX - 0.1) / 10, x1 = x0 + (2 * PHX - 0.1) / 10;
      b.plate([x0, dishY(x0, z) - TH, z], [x1, dishY(x1, z) - TH, z], [x1, dishY(x1, z) - TH - 0.06, z], [x0, dishY(x0, z) - TH - 0.06, z], RIBC);
    }
    // mounting lugs at the corners (where it bolts to the dish frame)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = sx * (PHX - 0.08), z = PZ + sz * (PHZ - 0.08); b.box(x, dishY(x, z) - TH - 0.04, z, 0.08, 0.07, 0.08, RIBC); }
    // timber bearers + blocks under the ribs
    for (const zr of [-0.9, 0.9]) {
      const z = PZ + zr;
      b.box(0, dk + 0.05, z, 1.6, 0.1, 0.15, WOODS[1]);
      for (const x of [-0.8, 0.8]) { const top = dishY(x, z) - TH - 0.09; b.box(x, (dk + 0.1 + top) / 2, z, 0.15, top - dk - 0.1, 0.2, WOODS[2]); }
      const x = 0, top = dishY(0, z) - TH - 0.09; b.box(x, (dk + 0.1 + top) / 2, z, 0.12, Math.max(0.01, top - dk - 0.1), 0.18, WOODS[4]);
    }
    // ---------- load 2: wooden cable drum, axis across the trailer ----------
    const DZ = 0.92, DR = 0.45, DCX = 0, DY = dk + DR + 0.01, DW2 = 0.32;
    b.push(mulAll(tr(DCX, DY, DZ), rotZ(PI / 2)));
    for (const s of [-1, 1]) {
      b.lathe([[0, s * DW2 - 0.03], [DR, s * DW2 - 0.03], [DR, s * DW2 + 0.03], [0.06, s * DW2 + 0.03], [0.06, s * DW2 + 0.06], [0, s * DW2 + 0.06]], 28, WOODS[0]);
      for (let k = 0; k < 6; k++) { const a = k / 6 * PI; b.push(rotY(a)); b.box(0, s * (DW2 + 0.032), 0, 2 * DR - 0.04, 0.006, 0.01, [0.32, 0.23, 0.14]); b.pop(); }   // plank joints
      for (let k = 0; k < 4; k++) { const a = k / 4 * PI * 2 + 0.4; b.box(Math.cos(a) * 0.15, s * (DW2 + 0.035), Math.sin(a) * 0.15, 0.025, 0.012, 0.025, STEEL); }
    }
    // wound cable: ridged black layers
    const prof = []; for (let k = 0; k <= 10; k++) { const y = -DW2 + 0.03 + k * (2 * DW2 - 0.06) / 10; prof.push([0.33 + (k % 2 ? 0.012 : 0), y, [0.06, 0.06, 0.065, 0.1]]); }
    b.lathe([[0.33, -DW2 + 0.03], ...prof.map(p => [p[0], p[1]]), [0.33, DW2 - 0.03]], 22, [0.06, 0.06, 0.065, 0.1]);
    b.pop();
    b.tube([[DCX + DW2 - 0.05, DY + 0.34, DZ - 0.05], [DCX + 0.3, DY + 0.25, DZ - 0.4], [DCX + 0.32, dk + 0.04, DZ - 0.6], [DCX + 0.45, dk + 0.03, DZ - 0.75]], 0.018, 6, [0.06, 0.06, 0.065, 0.1]);   // loose cable end
    for (const s of [-1, 1]) b.extrude([[-0.2, 0], [0.2, 0], [0.2, 0.12], [-0.2, 0.02]].map(p => [p[0], p[1]]).map(([x, w]) => [x, DZ + s * (DR - 0.05 + w)]), dk, dk + 0.12, WOODS[3]);   // chocks
    // ---------- ratchet straps ----------
    for (const zr of [-0.55, 0.55]) {
      const z = PZ + zr, pts = [[-T.DW - 0.04, dk - 0.04, z]];
      for (let k = 0; k <= 16; k++) { const x = -PHX + 2 * PHX * k / 16; pts.push([x, dishY(x, z) + 0.012, z]); }
      pts.push([T.DW + 0.04, dk - 0.04, z]);
      pts.splice(1, 0, [-PHX - 0.02, dishY(-PHX, z) + 0.005, z]); pts.splice(pts.length - 1, 0, [PHX + 0.02, dishY(PHX, z) + 0.005, z]);
      for (let k = 0; k < pts.length - 1; k++) b.beam(pts[k], pts[k + 1], 0.05, STRAP, 0.006);
      b.box(T.DW + 0.0, dk + 0.12, z, 0.05, 0.1, 0.09, [0.55, 0.56, 0.58, 0.35]);                  // ratchet buckle
      b.box(T.DW + 0.02, dk + 0.12, z, 0.02, 0.12, 0.04, [0.8, 0.1, 0.07, 0.2]);
      for (const s of [-1, 1]) b.box(s * (T.DW + 0.04), dk - 0.05, z, 0.03, 0.05, 0.04, STEEL);   // hooks
    }
    {
      // strap over the top of the drum, front end to the headboard, rear end to a deck cleat
      const p2 = [[0.15, dk + 0.48, T.D1 - 0.04], [0.15, DY + 0.25, DZ + DR + 0.02]];
      for (let k = 0; k <= 14; k++) { const a = PI * (0.3 + 0.75 * k / 14), rr = DR + 0.012; p2.push([0.15, DY + rr * Math.sin(a), DZ + rr * Math.cos(a)]); }
      p2.push([0.15, dk + 0.02, DZ - 0.75]);
      for (let k = 0; k < p2.length - 1; k++) b.beam(p2[k], p2[k + 1], 0.05, STRAP, 0.006);
      b.box(0.15, DY - 0.1, DZ - DR - 0.13, 0.09, 0.05, 0.1, [0.55, 0.56, 0.58, 0.35]);
    }
    return b;
  }
  function trailerLow() {
    const b = new MB(), dk = T.DECK;
    b.box(0, dk - 0.07, (T.D0 + T.D1) / 2, 2 * T.DW, 0.15, T.D1 - T.D0, WOODS[0]);
    b.box(0, dk - 0.12, (T.D0 + T.D1) / 2, 2 * T.DW + 0.06, 0.06, T.D1 - T.D0, TSTEEL);
    b.beam([0, 0.5, T.COUPLER], [0, dk - 0.1, T.D1], 0.12, TSTEEL);
    b.box(0, PY + 0.03, PZ, 2 * PHX, 0.12, 2 * PHZ, PANEL);
    b.box(0, dk + 0.15, PZ, 1.6, 0.2, 2.0, WOODS[2]);
    b.cyl([-0.35, dk + 0.46, 0.92], [0.35, dk + 0.46, 0.92], 0.45, 0.45, 8, WOODS[0]);
    for (const s of [-1, 1]) {
      b.box(s * (T.DW + 0.19), dk + 0.12, (T.AX1 + T.AX2) / 2, 0.28, 0.06, 1.7, TSTEEL);
      for (const z of [T.AX1, T.AX2]) b.cyl([s * 0.9, T.WR, z], [s * 1.1, T.WR, z], T.WR, T.WR, 8, RUBBER);
    }
    return b;
  }

  return {
    name: 'vehicles',
    items: [
      { name: 'pickup_truck', budget: 45000, build: pickup, colliders: [
        { type: 'box', x: 0, z: 2.0, hx: 1.0, hz: 0.85, rot: 0, top: 1.15, solid: true },
        { type: 'box', x: 0, z: 0.1, hx: 1.0, hz: 1.1, rot: 0, top: 1.9, solid: true },
        { type: 'box', x: 0, z: -1.95, hx: 1.0, hz: 0.9, rot: 0, top: 1.35, solid: true }] },
      { name: 'utv', budget: 22000, build: utv, colliders: [
        { type: 'box', x: 0, z: 0, hx: 0.8, hz: 1.5, rot: 0, top: 1.15, solid: true },
        { type: 'box', x: 0, z: -0.21, hx: 0.69, hz: 0.27, rot: 0, top: 1.94, solid: false }] },
      { name: 'flatbed_trailer', budget: 12000, build: trailer, colliders: [
        { type: 'box', x: 0, z: -0.55, hx: 1.2, hz: 1.95, rot: 0, top: 0.7, solid: true },
        { type: 'box', x: 0, z: -1.02, hx: 1.0, hz: 1.5, rot: 0, top: 1.08, solid: true },
        { type: 'box', x: 0, z: 0.92, hx: 0.4, hz: 0.46, rot: 0, top: 1.61, solid: true }] }
    ]
  };
}) };
