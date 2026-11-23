window.MODDEF = { fn: (function (K) {
  'use strict';
  const { MB, tr, sc, rotX, rotY, rotZ, mulAll, rnd } = K;
  const PI = Math.PI, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a.map((v, i) => i < 3 ? v + (b[i] - v) * t : (t < 0.5 ? (a[3] || 0) : (b[3] || 0)));
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k, c[3] || 0].map((v, i) => i < 3 ? clamp(v, 0, 1) : v);

  // ---------- shared palette: far-future outpost kit (weathered bone, safety orange, gunmetal) ----------
  const BONE = [0.7, 0.64, 0.52, 0.12], DUST = [0.72, 0.6, 0.44, 0];
  const SAFE = [0.95, 0.34, 0.04, 0.15], SAFE_D = [0.75, 0.25, 0.04, 0.12];
  const GUN = [0.25, 0.26, 0.28, 0.3], GUN_D = [0.15, 0.155, 0.165, 0.25], HAZ_K = [0.07, 0.07, 0.075, 0.05], SEAL = [0.05, 0.05, 0.05, 0.02];
  const GLASS = [0.07, 0.1, 0.11, 0.5], TRIM = [0.08, 0.08, 0.09, 0.05];
  const RUBBER = [0.07, 0.07, 0.075, 0], RUBBER_S = [0.11, 0.105, 0.1, 0], STEEL = [0.45, 0.47, 0.5, 0.3];
  const CHASSIS = [0.12, 0.12, 0.12, 0.1];
  const AMBER = [1.0, 0.58, 0.05, 0.5], RED_L = [0.78, 0.06, 0.05, 0.5], CLEAR_L = [0.88, 0.9, 0.92, 0.5], LAMP = [1.0, 0.98, 0.9, 0.5], LENS = [0.3, 0.62, 0.7, 0.5];
  // dust fade on the lower body: 0 above ~0.9 m, strongest at the sills
  const dusty = (c, y, top, k) => mix(c, DUST, Math.pow(clamp(((top || 0.9) - y) / 0.45, 0, 1), 1.3) * (k || 0.7));

  // ---------- wheel: built once along +Y (outer face at +Y), reused ----------
  function makeWheel(o) {
    const b = new MB(), R = o.R, Wd = o.W, rr = o.rim, h = Wd / 2, segs = o.segs;
    const T = R - o.tread;                           // radius of the tread base
    // tyre carcass
    b.lathe([[rr - 0.005, -h + 0.02, RUBBER], [rr + 0.03, -h - 0.005, RUBBER_S], [T - 0.06, -h - 0.01, RUBBER_S], [T - 0.02, -h + 0.005, RUBBER], [T, -h + 0.04, RUBBER], [T, h - 0.04, RUBBER], [T - 0.02, h - 0.005, RUBBER], [T - 0.06, h + 0.01, RUBBER_S], [rr + 0.03, h + 0.005, RUBBER_S], [rr - 0.005, h - 0.02, RUBBER]], segs, RUBBER);
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
    // rim: barrel, flanges, dished centre disc
    const d = o.dish;
    b.lathe([[rr - 0.012, -h + 0.005], [rr + 0.004, -h + 0.01], [rr - 0.012, -h + 0.03], [rr - 0.02, -h + 0.05], [rr - 0.02, h - 0.05], [rr - 0.012, h - 0.03], [rr + 0.004, h - 0.012], [rr - 0.006, h - 0.002], [rr - 0.03, h - 0.01], [rr * 0.82, d + 0.03], [rr * 0.66, d], [rr * 0.42, d + 0.008], [rr * 0.3, d + 0.012], [rr * 0.24, d + 0.03], [rr * 0.2, d + 0.05], [0, d + 0.05]], segs, o.rimCol);
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

  // ---------- retrofit kit: hazard stripes, stencils, flat bars, gas cylinders, sealed cases ----------
  // diagonal hazard stripes on a strip. map(s, t, e) -> [x, y, z]: s runs 0..L along the strip, t 0..H up it, e = 0 for the base, 1 for the stripes (lifted)
  function hazard(b, map, L, H, pitch, cA, cB) {
    if (cB) b.plate(map(0, 0, 0), map(L, 0, 0), map(L, H, 0), map(0, H, 0), cB);
    const w = pitch * 0.5, cl = x => clamp(x, 0, L);
    for (let s0 = -H; s0 < L; s0 += pitch) {
      const a = cl(s0), bb = cl(s0 + w), c = cl(s0 + w + H), d = cl(s0 + H);
      if (bb - a < 1e-4 && c - d < 1e-4) continue;
      b.plate(map(a, 0, 1), map(bb, 0, 1), map(c, H, 1), map(d, H, 1), cA);
    }
  }
  // 3x5 stencil glyphs
  const FONT = {
    '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '011', '001', '111'],
    '4': ['101', '101', '111', '001', '001'], '7': ['111', '001', '010', '010', '010'], '-': ['000', '000', '111', '000', '000'],
    'K': ['101', '101', '110', '101', '101'], 'R': ['110', '101', '110', '101', '101'], 'T': ['111', '010', '010', '010', '010'], 'O': ['111', '101', '101', '101', '111']
  };
  const textW = (str, px) => str.length * 4 * px - px;
  // stencilled text: map(s, t) -> [x, y, z] with s along the text (0..textW) and t up (0..5px)
  function stencil(b, str, px, map, col) {
    for (let c = 0; c < str.length; c++) { const g = FONT[str[c]]; if (!g) continue; for (let row = 0; row < 5; row++) for (let cc = 0; cc < 3; cc++) if (g[row][cc] === '1') {
      const s = c * 4 * px + cc * px, t = (4 - row) * px; b.plate(map(s, t), map(s + px, t), map(s + px, t + px), map(s, t + px), col);
    } }
  }
  // flat bar from a to c lying on a surface with normal n: 'wide' across the surface, 'deep' out of it
  function bar(b, a, c, wide, deep, n, col) {
    const d = K.sub(c, a), L = Math.hypot(d[0], d[1], d[2]); if (L < 1e-9) return; const f = K.norm(d), s = K.norm(K.cross(f, n)), u = K.cross(s, f);
    b.push(new Float64Array([s[0], s[1], s[2], 0, f[0], f[1], f[2], 0, u[0], u[1], u[2], 0, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2, 1])); b.box(0, 0, 0, wide, L, deep, col); b.pop();
  }
  // heavy frame round a window given by four corners (in order), bars overlap at the corners
  function frame(b, q, wide, deep, n, col) {
    for (let i = 0; i < 4; i++) { const a = q[i], c = q[(i + 1) % 4], f = K.norm(K.sub(c, a)), e = wide / 2; bar(b, K.sub(a, K.scale(f, e)), K.add(c, K.scale(f, e)), wide, deep, n, col); }
  }
  // pressure gas cylinder from its base a to its valve end c (radius r), body colour + shoulder band colour
  function gasCyl(b, a, c, r, body, band, segs) {
    const d = K.sub(c, a), h = Math.hypot(d[0], d[1], d[2]) / 2; b.push(K.along(a, c));
    b.lathe([[0, -h], [r * 0.75, -h], [r, -h + 0.03], [r, h - 0.2, band], [r, h - 0.13], [r * 0.92, h - 0.07], [r * 0.6, h - 0.025], [0.028, h - 0.01, GUN], [0.028, h + 0.03, GUN], [0, h + 0.03]], segs, body);
    b.box(0, h + 0.035, 0, 0.05, 0.03, 0.05, GUN);                         // valve block
    b.box(0, h + 0.058, 0, 0.09, 0.012, 0.016, SAFE);                      // valve handle
    b.pop();
  }
  // sealed hard case: body, pressure-seal line, corner guards, latches front and back
  function crate(b, x, y0, z, sx, sy, sz, body, trim) {
    b.box(x, y0 + sy / 2, z, sx, sy, sz, body);
    b.box(x, y0 + sy * 0.72, z, sx + 0.012, 0.014, sz + 0.012, SEAL);
    for (const i of [-1, 1]) for (const j of [-1, 1]) b.box(x + i * (sx / 2 - 0.014), y0 + sy / 2, z + j * (sz / 2 - 0.014), 0.04, sy + 0.01, 0.04, trim);
    for (const i of [-1, 1]) for (const j of [-1, 1]) b.box(x + i * sx * 0.25, y0 + sy * 0.72, z + j * (sz / 2 + 0.008), 0.05, 0.05, 0.012, trim);
  }

  // =====================================================================
  // 1. OUTPOST UTILITY TRUCK  (front = +Z)
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
  function sidePanel(b, side, zs, yb, yt, off, colFn, nv) {
    const n = zs.length - 1;
    b.surf(n, nv, (u, v) => { const z = zs[Math.round(u * n)], y0 = yb(z), y1 = yt(z), y = y0 + (y1 - y0) * v; return [side * (sideX(z, y) + off), y, z]; },
      (u, v) => { const z = zs[Math.round(u * n)], y0 = yb(z), y1 = yt(z), y = y0 + (y1 - y0) * v; return colFn(z, y); });
  }
  function sidePatch(b, side, z0, z1, y0, y1, off, col, nu) {
    b.surf(nu || 6, 2, (u, v) => { const z = z0 + (z1 - z0) * u, y = y0 + (y1 - y0) * v; return [side * (sideX(z, y) + off), y, z]; }, col);
  }
  // map for stencils / stripes hugging the body side; text reads front-to-back correctly from either side
  const sideMap = (side, zc, y0, off, w) => (s, t, e) => { const z = zc - side * (s - w / 2), y = y0 + t; return [side * (sideX(z, y) + off + (e || 0) * 0.003), y, z]; };

  function pickup(detail) {
    if (!detail) return pickupLow();
    const b = new MB();
    const paint = (z, y) => dusty(BONE, y, 0.95, 0.75);

    // ---------------- chassis & running gear ----------------
    for (const s of [-1, 1]) {
      b.box(s * 0.47, 0.5, 0.1, 0.08, 0.2, 5.0, CHASSIS);
      b.box(s * 0.47, 0.58, 2.4, 0.06, 0.12, 0.5, CHASSIS);
    }
    for (const z of [2.55, 1.0, 0.0, -1.0, -2.55]) b.box(0, 0.5, z, 0.9, 0.12, 0.08, CHASSIS);
    const SHOCK = [0.5, 0.5, 0.52, 0.3];
    for (const [zc, front] of [[P_.AXF, true], [P_.AXR, false]]) {
      b.cyl([-0.78, P_.WR, zc], [0.78, P_.WR, zc], 0.045, 0.045, 10, CHASSIS);
      const dx = front ? 0.12 : 0.0;
      b.sphere(dx, P_.WR, zc, 0.15, 14, [0.16, 0.16, 0.15, 0.12]);
      b.cyl([dx, P_.WR, zc - 0.05], [dx, P_.WR, zc - 0.2], 0.12, 0.09, 12, [0.16, 0.16, 0.15, 0.12]);
      b.cyl([dx, P_.WR, zc + 0.1], [dx, P_.WR, zc + 0.16], 0.12, 0.12, 12, GUN);
      b.box(dx, 0.235, zc, 0.38, 0.03, 0.46, GUN);                                                     // armoured diff guard
      for (const s of [-1, 1]) {
        b.cyl([s * 0.72, P_.WR, zc], [s * 0.78, P_.WR, zc], 0.09, 0.09, 12, CHASSIS);
        if (front) {
          for (let k = 0; k < 7; k++) { const y0 = P_.WR + 0.06 + k * 0.03; b.cyl([s * 0.5, y0, zc], [s * 0.5, y0 + 0.022, zc], 0.07, 0.07, 10, SAFE_D, false); }
          b.cyl([s * 0.5, P_.WR + 0.05, zc], [s * 0.5, 0.6, zc], 0.05, 0.05, 8, CHASSIS);
          b.cyl([s * 0.62, P_.WR, zc + 0.05], [s * 0.6, 0.72, zc + 0.1], 0.025, 0.025, 8, SHOCK);
          b.beam([s * 0.6, P_.WR - 0.05, zc], [s * 0.45, 0.45, zc - 0.9], 0.05, CHASSIS);
        } else {
          for (let L = 0; L < 5; L++) {
            const half = 0.7 - L * 0.12, y = P_.WR + 0.06 - L * 0.018, pts = [];
            for (let k = 0; k <= 10; k++) { const t = k / 10 * 2 - 1; pts.push([s * 0.47, y + 0.09 * t * t, zc + t * half]); }
            for (let k = 0; k < 10; k++) b.beam(pts[k], pts[k + 1], 0.06, [0.15 + L * 0.01, 0.14, 0.13, 0.12], 0.014);
          }
          b.beam([s * 0.47, P_.WR + 0.15, zc + 0.7], [s * 0.47, 0.45, zc + 0.72], 0.05, CHASSIS);
          b.beam([s * 0.47, P_.WR + 0.15, zc - 0.7], [s * 0.47, 0.48, zc - 0.8], 0.04, CHASSIS);
          b.box(s * 0.47, P_.WR + 0.0, zc, 0.1, 0.06, 0.14, CHASSIS);
          for (const dz of [-0.05, 0.05]) b.beam([s * 0.47 - 0.05, P_.WR - 0.04, zc + dz], [s * 0.47 - 0.05, P_.WR + 0.13, zc + dz], 0.015, STEEL);
          b.cyl([s * 0.6, P_.WR, zc - 0.12], [s * 0.55, 0.62, zc - 0.25], 0.025, 0.025, 8, SHOCK);
        }
      }
    }
    b.box(0.0, 0.48, 0.55, 0.3, 0.22, 0.4, [0.3, 0.3, 0.3, 0.2]);
    b.box(0.0, 0.62, 1.15, 0.4, 0.34, 0.8, [0.2, 0.2, 0.2, 0.15]);
    b.cyl([0.0, 0.46, 0.33], [0.0, P_.WR, P_.AXR + 0.2], 0.04, 0.04, 8, [0.3, 0.3, 0.3, 0.2]);
    b.cyl([0.06, 0.46, 0.75], [0.12, P_.WR, P_.AXF - 0.15], 0.035, 0.035, 8, [0.3, 0.3, 0.3, 0.2]);
    // armoured fuel cell (left) with its own skid plate; exhaust (right)
    b.box(-0.65, 0.42, -0.65, 0.32, 0.26, 0.85, GUN_D);
    b.box(-0.65, 0.28, -0.65, 0.38, 0.025, 0.92, GUN);
    const EX = [0.34, 0.33, 0.31, 0.15];
    b.tube([[0.25, 0.55, 1.4], [0.3, 0.33, 0.9], [0.3, 0.3, 0.2], [0.32, 0.3, -0.4]], 0.035, 8, EX);
    b.cyl([0.32, 0.3, -0.4], [0.32, 0.3, -1.2], 0.11, 0.11, 14, EX);
    b.tube([[0.32, 0.3, -1.2], [0.4, 0.3, -1.4], [0.65, 0.3, -1.45], [0.72, 0.3, -1.42], [0.75, 0.32, -1.45]], 0.035, 8, EX);
    b.cyl([0.75, 0.32, -1.45], [0.82, 0.32, -1.46], 0.04, 0.042, 10, [0.18, 0.17, 0.16, 0.2]);
    b.box(0, 0.6, 0.1, 1.7, 0.03, 2.2, [0.15, 0.14, 0.13]);
    b.box(0, 0.64, 2.25, 1.5, 0.03, 0.9, [0.15, 0.14, 0.13]);

    // ---------------- wheels: chunky all-terrain tyres on gunmetal beadlocks ----------------
    const W = makeWheel({ R: P_.WR, W: 0.31, rim: 0.23, tread: 0.03, segs: 40, blocks: 22, ribs: 0, dish: 0.06, vents: 6, lugs: 8, rimCol: GUN, capCol: SAFE, beadlock: GUN_D });
    for (const z of [P_.AXF, P_.AXR]) for (const s of [-1, 1]) putWheel(b, W, s * P_.TRACK, P_.WR, z);

    // ---------------- body sides ----------------
    for (const s of [-1, 1]) {
      sidePanel(b, s, zList(P_.CAB_BACK, P_.FACE, 46, P_.SILL), z => archBottom(z, P_.SILL - 0.09 * clamp((z - 2.24) / 0.16, 0, 1)), sideTop, 0, paint, 16);
      sidePanel(b, s, zList(P_.TAIL, P_.BED_F, 30, P_.SILL + 0.03), z => archBottom(z, P_.SILL + 0.03), () => P_.BED_RAIL, 0, paint, 14);
      sidePatch(b, s, P_.DOOR_R - 0.04, P_.DOOR_F + 0.02, P_.SILL, P_.SILL + 0.06, 0.003, dusty(GUN_D, 0.4, 0.9, 0.5), 4);
      // bolted armour plates over the lower doors
      for (const [z0, z1] of [[P_.DOOR_M + 0.025, P_.DOOR_F - 0.03], [P_.DOOR_R + 0.03, P_.DOOR_M - 0.025]]) {
        sidePatch(b, s, z0, z1, P_.SILL + 0.08, 0.8, 0.012, (u, v) => dusty(GUN, P_.SILL + 0.08 + 0.17 * v, 0.9, 0.3), 6);
        for (let k = 0; k < 4; k++) { const z = z0 + 0.05 + (z1 - z0 - 0.1) * k / 3; b.box(s * (sideX(z, 0.77) + 0.017), 0.77, z, 0.012, 0.024, 0.024, GUN_D); }
      }
      // safety-orange band
      sidePatch(b, s, P_.DOOR_R + 0.02, P_.DOOR_F - 0.02, 0.83, 0.88, 0.006, SAFE, 10);
      // stencilled unit code on the front door
      { const px = 0.03, str = 'KR-07', w = textW(str, px); stencil(b, str, px, sideMap(s, 0.64, 0.93, 0.006, w), HAZ_K); }
      // door seams = pressure seals (thick black gaskets)
      for (const z of [P_.DOOR_F, P_.DOOR_M, P_.DOOR_R]) sidePatch(b, s, z - 0.011, z + 0.011, P_.SILL + 0.06, P_.BELT - 0.01, 0.004, SEAL, 1);
      sidePatch(b, s, P_.DOOR_R, P_.DOOR_F, P_.SILL + 0.06, P_.SILL + 0.075, 0.004, SEAL, 6);
      for (const z of [P_.DOOR_M + 0.16, P_.DOOR_R + 0.14]) {                                        // lever latches
        const x = s * (sideX(z, 1.12) + 0.012); b.box(x, 1.12, z, 0.025, 0.05, 0.17, GUN_D); b.box(x + s * 0.01, 1.12, z + 0.05, 0.012, 0.03, 0.05, SAFE);
      }
      // gas port (left side of the bed)
      if (s < 0) { const z = -1.33, y = 1.12, x = -sideX(z, y); b.cyl([x + 0.01, y, z], [x - 0.02, y, z], 0.075, 0.075, 12, SAFE); b.cyl([x - 0.02, y, z], [x - 0.04, y, z], 0.052, 0.045, 12, GUN); }
      // hazard striping on the bed-side tail corners
      hazard(b, (q, t, e) => { const z = P_.TAIL + 0.04 + q, y = 1.06 + t; return [s * (sideX(z, y) + 0.004 + 0.003 * e), y, z]; }, 0.5, 0.16, 0.1, SAFE, HAZ_K);
      // vehicle number on the front fender
      { const px = 0.022, w = textW('07', px); stencil(b, '07', px, sideMap(s, 2.33, 0.98, 0.005, w), HAZ_K); }
      b.beam([s * 0.932, P_.BELT + 0.01, P_.WS_B], [s * 0.932, P_.BELT + 0.01, P_.RW_B + 0.02], 0.03, GUN_D, 0.035);   // heavy beltline frame
    }
    // armoured wheel-arch flares and inner liners
    for (const zc of [P_.AXF, P_.AXR]) for (const s of [-1, 1]) {
      const sill = zc > 0 ? P_.SILL : P_.SILL + 0.03, a0 = Math.asin((sill - 0.06 - P_.ARCH_Y) / P_.ARCH_R);
      const prof = [[-0.012, -0.004], [-0.005, 0.03], [0.03, 0.05], [0.085, 0.04], [0.11, 0.0]];
      b.surf(28, prof.length - 1, (u, v) => {
        const a = a0 + (PI - 2 * a0) * u, p = prof[Math.round(v * (prof.length - 1))], rr = P_.ARCH_R + p[0];
        const z = zc + rr * Math.cos(a), y = P_.ARCH_Y + rr * Math.sin(a); return [s * (sideX(z, y) + p[1]), y, z];
      }, (u, v) => dusty(GUN_D, P_.ARCH_Y + P_.ARCH_R * Math.sin(a0 + (PI - 2 * a0) * u), 0.8, 0.5));
      b.surf(20, 2, (u, v) => { const a = a0 + (PI - 2 * a0) * u, z = zc + (P_.ARCH_R - 0.01) * Math.cos(a), y = P_.ARCH_Y + (P_.ARCH_R - 0.01) * Math.sin(a); return [s * (0.56 + 0.38 * v), y, z]; }, [0.1, 0.09, 0.09]);
      b.surf(20, 1, (u, v) => { const a = a0 + (PI - 2 * a0) * u, rr = (P_.ARCH_R - 0.01) * v, z = zc + rr * Math.cos(a), y = P_.ARCH_Y + 0.0 + rr * Math.sin(a); return [s * 0.56, Math.max(y, sill - 0.05), z]; }, [0.08, 0.08, 0.08]);
      // mud flaps with hazard striping
      const fz = zc - 0.53;
      b.box(s * 0.84, 0.32, fz, 0.32, 0.36, 0.012, RUBBER);
      b.box(s * 0.84, 0.47, fz + 0.01, 0.3, 0.025, 0.01, GUN);
      hazard(b, (q, t, e) => [s * (0.7 + q), 0.17 + t, fz - 0.007 - 0.003 * e], 0.28, 0.12, 0.09, SAFE, HAZ_K);
    }

    // ---------------- hood with heat-fin block, cowl, front face ----------------
    const Wt = z => sideX(z, hoodY(z) - 0.03);
    b.surf(28, 30, (u, v) => {
      const z = P_.COWL_Z + (P_.FACE - P_.COWL_Z) * v, w = Wt(z), sx = u * 2 - 1, x = sx * w;
      let y = hoodY(z) + 0.02 * (1 - sx * sx) - 0.03 * Math.pow(Math.abs(sx), 10);
      y += 0.018 * Math.exp(-Math.pow(sx / 0.32, 6)) * clamp((z - P_.COWL_Z) / 0.2, 0, 1) * clamp((P_.FACE - 0.05 - z) / 0.2, 0, 1);
      y -= 0.03 * Math.pow(clamp((z - (P_.FACE - 0.08)) / 0.08, 0, 1), 2);
      return [x, y, z];
    }, (u, v) => (u > 0.03 && u < 0.97) ? BONE : shade(BONE, 0.6));
    for (const s of [-1, 1]) b.surf(14, 1, (u, v) => { const z = P_.COWL_Z + 0.02 + (P_.FACE - 0.1 - P_.COWL_Z) * u, w = Wt(z) - 0.035 - 0.006 * v; return [s * w, hoodY(z) + 0.004, z]; }, TRIM);
    {
      const zc = 1.98, ang = Math.atan2(P_.HOOD_R - P_.HOOD_F, P_.FACE - P_.COWL_Z);
      b.push(mulAll(tr(0, hoodY(zc) + 0.05, zc), rotX(ang)));
      b.box(0, 0, 0, 0.58, 0.035, 0.46, GUN_D);
      for (let k = 0; k < 9; k++) b.box(-0.24 + k * 0.06, 0.03, 0, 0.014, 0.035, 0.4, GUN);            // radiator fins
      b.box(0, 0.01, -0.235, 0.58, 0.02, 0.012, SAFE);
      b.pop();
    }
    b.plate([-0.9, P_.HOOD_R + 0.0, P_.COWL_Z], [0.9, P_.HOOD_R + 0.0, P_.COWL_Z], [0.88, P_.BELT, P_.WS_B], [-0.88, P_.BELT, P_.WS_B], TRIM);
    for (let k = 0; k < 9; k++) b.box(-0.56 + k * 0.14, P_.HOOD_R + 0.04, (P_.COWL_Z + P_.WS_B) / 2 + 0.01, 0.1, 0.01, 0.02, [0.03, 0.03, 0.03]);
    for (const x0 of [-0.62, 0.08]) {
      b.beam([x0, P_.BELT + 0.02, P_.WS_B - 0.01], [x0 + 0.55, P_.BELT + 0.1, P_.WS_B - 0.08], 0.018, TRIM, 0.012);
      b.beam([x0 + 0.02, P_.BELT + 0.035, P_.WS_B - 0.02], [x0 + 0.5, P_.BELT + 0.115, P_.WS_B - 0.09], 0.01, [0.03, 0.03, 0.03], 0.02);
      b.cyl([x0, P_.BELT - 0.02, P_.WS_B + 0.02], [x0, P_.BELT + 0.03, P_.WS_B], 0.02, 0.02, 8, TRIM);
    }
    // front face: nose panel, heavy grille, armoured lamps
    const FZ = P_.FACE, GR = GUN, GR2 = shade(GUN, 1.25);
    b.box(0, 0.84, FZ - 0.03, 1.8, 0.46, 0.06, shade(BONE, 0.95));
    b.box(0, 0.865, FZ + 0.005, 1.12, 0.43, 0.04, [0.05, 0.05, 0.05]);
    for (const s of [-1, 1]) b.box(s * 0.575, 0.865, FZ + 0.025, 0.07, 0.47, 0.05, GR);
    b.box(0, 1.085, FZ + 0.025, 1.22, 0.05, 0.05, GR);
    b.box(0, 0.645, FZ + 0.025, 1.22, 0.05, 0.05, GR);
    for (let k = 0; k < 3; k++) b.box(0, 0.735 + k * 0.13, FZ + 0.04, 1.08, 0.05, 0.04, GR2);
    for (let k = 0; k < 7; k++) b.box(0, 0.7 + k * 0.064, FZ + 0.02, 1.08, 0.012, 0.02, [0.14, 0.14, 0.14, 0.15]);
    for (let k = -5; k <= 5; k++) b.box(k * 0.095, 0.865, FZ + 0.022, 0.012, 0.4, 0.02, [0.14, 0.14, 0.14, 0.15]);
    for (const s of [-1, 1]) {
      const hx = s * 0.76;
      b.box(hx, 0.975, FZ - 0.0, 0.3, 0.18, 0.05, GUN_D);                                       // armoured bezel
      b.box(hx - s * 0.065, 0.985, FZ + 0.02, 0.12, 0.1, 0.03, LAMP);
      b.box(hx + s * 0.075, 0.985, FZ + 0.02, 0.1, 0.1, 0.03, CLEAR_L);
      for (const k of [-1, 0, 1]) b.box(hx + k * 0.07, 0.985, FZ + 0.045, 0.014, 0.15, 0.014, GUN);   // lamp guard bars
      b.box(hx, 0.9, FZ + 0.025, 0.28, 0.022, 0.025, AMBER);
      b.box(s * 0.905, 0.975, FZ - 0.08, 0.04, 0.12, 0.12, AMBER);
    }
    // armoured front bumper with hazard striping, winch fairlead, recovery shackles, aux lamps
    const BUMP = GUN_D;
    b.box(0, 0.5, FZ + 0.06, 1.98, 0.26, 0.16, BUMP);
    b.box(0, 0.64, FZ + 0.07, 1.96, 0.03, 0.2, GUN);
    b.box(0, 0.38, FZ + 0.03, 1.5, 0.05, 0.12, BUMP);
    for (const s of [-1, 1]) {
      b.box(s * 0.94, 0.5, FZ - 0.05, 0.12, 0.26, 0.2, BUMP);
      hazard(b, (q, t, e) => [s * (0.27 + q), 0.41 + t, FZ + 0.142 + 0.003 * e], 0.68, 0.18, 0.12, SAFE, HAZ_K);
      b.tube([[s * 0.42, 0.4, FZ + 0.02], [s * 0.42, 0.4, FZ + 0.1], [s * 0.42, 0.37, FZ + 0.135], [s * 0.42, 0.32, FZ + 0.125], [s * 0.42, 0.305, FZ + 0.08], [s * 0.42, 0.325, FZ + 0.05]], 0.018, 8, SAFE);
      b.box(s * 0.42, 0.4, FZ + 0.02, 0.07, 0.08, 0.06, CHASSIS);
      b.box(s * 0.62, 0.7, FZ + 0.06, 0.16, 0.1, 0.08, GUN_D);                                  // aux lamp
      b.box(s * 0.62, 0.7, FZ + 0.1, 0.12, 0.07, 0.01, LAMP);
    }
    b.box(0, 0.5, FZ + 0.15, 0.3, 0.14, 0.03, GUN);                                               // winch fairlead
    b.box(0, 0.5, FZ + 0.167, 0.17, 0.03, 0.006, HAZ_K);
    b.box(0, 0.46, FZ + 0.175, 0.04, 0.06, 0.025, SAFE);
    b.box(0, 0.345, FZ - 0.45, 1.2, 0.04, 1.0, GUN);                                              // skid plate

    // ---------------- pressurised cab: heavy frames, small armoured glass ----------------
    const YB = P_.BELT, YR = P_.ROOF, xg = y => 0.93 - 0.13 * (y - YB) / (YR - YB);
    const zWS = y => P_.WS_B + (P_.WS_T - P_.WS_B) * (y - YB) / (YR - YB), zRW = y => P_.RW_B + (P_.RW_T - P_.RW_B) * (y - YB) / (YR - YB);
    b.surf(10, 4, (u, v) => { const y = YB + 0.01 + (YR - YB - 0.02) * v, w = xg(y) - 0.02, sx = u * 2 - 1; return [sx * w, y, zWS(y) + 0.02 * (1 - sx * sx) - 0.005]; }, GLASS);
    b.beam([0, YB, zWS(YB) + 0.035], [0, YR, zWS(YR) + 0.035], 0.09, GUN, 0.04);                     // centre post: split screen
    b.beam([-0.9, YB + 0.035, zWS(YB + 0.035) + 0.03], [0.9, YB + 0.035, zWS(YB + 0.035) + 0.03], 0.05, GUN, 0.07);   // screen sill
    b.push(mulAll(tr(0, YR - 0.04, P_.WS_T + 0.12), rotX(0.32))); b.box(0, 0, 0, 1.6, 0.025, 0.3, GUN_D); b.pop();     // armoured visor
    // cab back: armoured wall with one small sealed pane
    b.plate([-xg(YB) + 0.01, YB, zRW(YB) - 0.008], [xg(YB) - 0.01, YB, zRW(YB) - 0.008], [xg(YR) - 0.01, YR, zRW(YR) - 0.008], [-xg(YR) + 0.01, YR, zRW(YR) - 0.008], BONE);
    {
      const rp = (x, y, e) => [x, y, zRW(y) - 0.014 - (e || 0)], q = [rp(-0.34, YB + 0.15), rp(0.34, YB + 0.15), rp(0.34, YR - 0.11), rp(-0.34, YR - 0.11)];
      b.plate(q[0], q[1], q[2], q[3], GLASS);
      frame(b, q.map(p => [p[0], p[1], p[2] - 0.012]), 0.05, 0.03, [0, 0, -1], GUN);
    }
    b.plate([-xg(YB), YB, P_.CAB_BACK], [xg(YB), YB, P_.CAB_BACK], [xg(YB), YB + 0.03, zRW(YB)], [-xg(YB), YB + 0.03, zRW(YB)], BONE);
    for (const s of [-1, 1]) {
      const SP = (z, y, e) => [s * (xg(y) - 0.006 + (e || 0)), y, z], n = [s, 0, 0];
      // side opening skinned in body colour, then two small armoured panes in heavy frames
      b.plate(SP(zWS(YB) - 0.03, YB + 0.01, -0.004), SP(zRW(YB) + 0.02, YB + 0.01, -0.004), SP(zRW(YR) + 0.02, YR - 0.02, -0.004), SP(zWS(YR) - 0.03, YR - 0.02, -0.004), BONE);
      const wy0 = YB + 0.13, wy1 = YR - 0.1;
      for (const q of [[SP(P_.DOOR_M + 0.09, wy0), SP(zWS(wy0) - 0.17, wy0), SP(zWS(wy1) - 0.17, wy1), SP(P_.DOOR_M + 0.09, wy1)],
                       [SP(P_.DOOR_R + 0.15, wy0), SP(P_.DOOR_M - 0.09, wy0), SP(P_.DOOR_M - 0.09, wy1), SP(P_.DOOR_R + 0.15, wy1)]]) {
        b.plate(q[0].map((v, i) => i ? v : v + s * 0.002), q[1].map((v, i) => i ? v : v + s * 0.002), q[2].map((v, i) => i ? v : v + s * 0.002), q[3].map((v, i) => i ? v : v + s * 0.002), GLASS);
        frame(b, q.map(p => [p[0] + s * 0.014, p[1], p[2]]), 0.05, 0.028, n, GUN);
      }
      b.beam([s * (xg(YB) - 0.035), YB, P_.WS_B - 0.02], [s * (xg(YR) - 0.035), YR + 0.01, P_.WS_T - 0.02], 0.11, GUN, 0.085);   // heavy A-pillar
      b.beam([s * (xg(YB) - 0.004), YB, P_.DOOR_M], [s * (xg(YR) - 0.004), YR, P_.DOOR_M - 0.03], 0.03, SEAL, 0.07);           // door seal
      b.beam([s * (xg(YB) - 0.03), YB, P_.RW_B + 0.06], [s * (xg(YR) - 0.03), YR + 0.01, P_.RW_T + 0.07], 0.07, BONE, 0.16);
      b.beam([s * (xg(YR) - 0.006), YR - 0.02, P_.WS_T - 0.03], [s * (xg(YR) - 0.006), YR - 0.02, P_.RW_T + 0.05], 0.03, TRIM, 0.02);
      b.beam([s * (xg(YR) - 0.02), YR + 0.01, P_.WS_T - 0.04], [s * (xg(YR) - 0.02), YR + 0.01, P_.RW_T + 0.02], 0.025, shade(BONE, 0.85), 0.02);
      // tall tow mirror
      const mz = P_.WS_B - 0.12, my = YB + 0.1;
      b.box(s * 0.94, my - 0.02, mz, 0.04, 0.12, 0.14, GUN_D);
      b.beam([s * 0.95, my + 0.03, mz], [s * 1.08, my + 0.05, mz - 0.02], 0.03, GUN_D);
      b.beam([s * 0.95, my - 0.06, mz], [s * 1.08, my - 0.04, mz - 0.02], 0.025, GUN_D);
      b.box(s * 1.12, my + 0.02, mz - 0.03, 0.09, 0.32, 0.12, GUN_D);
      b.box(s * 1.12, my + 0.06, mz - 0.093, 0.075, 0.2, 0.006, [0.55, 0.6, 0.65, 0.5]);
      b.box(s * 1.12, my - 0.1, mz - 0.093, 0.075, 0.07, 0.006, [0.45, 0.5, 0.55, 0.5]);
      b.box(s * 1.12, my + 0.02, mz + 0.032, 0.07, 0.025, 0.006, AMBER);
    }
    b.beam([-xg(YR) + 0.03, YR, P_.WS_T - 0.01], [xg(YR) - 0.03, YR, P_.WS_T - 0.01], 0.07, GUN, 0.06);
    b.surf(12, 10, (u, v) => {
      const sx = u * 2 - 1, sz = v * 2 - 1, z = P_.RW_T + (P_.WS_T - P_.RW_T) * v, y = YR + (P_.ROOF_TOP - YR) * (1 - Math.pow(Math.abs(sx), 6)) * (1 - Math.pow(Math.abs(sz), 6));
      return [sx * (xg(YR) - 0.005), y, z];
    }, BONE);
    b.box(0, YR + 0.0, P_.RW_T - 0.02, 0.3, 0.05, 0.03, RED_L);

    // ---------------- exo roll cage, light bar, sensor mast, snorkel ----------------
    const CR = 0.032;
    for (const s of [-1, 1]) {
      b.box(s * 0.97, 1.15, 1.36, 0.1, 0.04, 0.14, GUN_D);
      b.tube([[s * 0.97, 1.15, 1.36], [s * 0.97, 1.3, 1.2], [s * 0.9, 1.86, 0.66], [s * 0.87, 1.96, 0.52], [s * 0.86, 1.97, 0.35], [s * 0.86, 1.97, -0.95], [s * 0.87, 1.975, -1.1]], CR, 8, GUN);
      for (const z of [0.25, -0.6]) b.beam([s * 0.86, 1.97, z], [s * 0.78, 1.87, z], 0.035, GUN_D);
    }
    b.cyl([-0.87, 1.96, 0.52], [0.87, 1.96, 0.52], CR, CR, 8, GUN, false);
    b.cyl([-0.86, 1.97, -0.32], [0.86, 1.97, -0.32], 0.026, 0.026, 8, GUN, false);
    b.box(0, 2.03, 0.54, 1.3, 0.09, 0.1, GUN_D);
    for (let k = 0; k < 6; k++) b.box(-0.525 + k * 0.21, 2.03, 0.593, 0.17, 0.06, 0.01, LAMP);
    for (const s of [-1, 1]) b.box(s * 0.5, 1.985, 0.53, 0.04, 0.05, 0.05, GUN);
    {
      const mz = -0.5;
      b.box(0, 1.92, mz, 0.32, 0.05, 0.3, GUN_D);
      b.cyl([0, 1.94, mz], [0, 2.2, mz], 0.03, 0.025, 8, GUN);
      b.box(0, 2.08, mz + 0.06, 0.11, 0.09, 0.12, GUN_D);                         // sensor head
      b.box(0, 2.08, mz + 0.121, 0.07, 0.05, 0.004, LENS);
      b.push(mulAll(tr(0, 2.2, mz), rotX(0.55)));                                  // small dish, up and forward
      b.lathe([[0.012, 0.0], [0.07, 0.015], [0.13, 0.045], [0.15, 0.06]], 14, BONE);
      b.cyl([0, 0, 0], [0, 0.1, 0], 0.006, 0.006, 4, GUN);
      b.box(0, 0.105, 0, 0.025, 0.02, 0.025, SAFE);
      b.pop();
      for (const s of [-1, 1]) b.cyl([s * 0.12, 1.94, mz - 0.1], [s * 0.12, 2.3, mz - 0.1], 0.008, 0.004, 4, HAZ_K);
      b.tube([[0.1, 1.93, mz - 0.1], [0.5, 1.9, -0.78], [0.74, 1.8, -0.9], [0.79, 1.45, -0.965], [0.8, 1.36, -1.06]], 0.012, 5, HAZ_K);   // cable run
    }
    {
      const SN = GUN_D, zSn = y => 1.56 - (y - 1.2) * 0.52 / 0.6;
      b.tube([[0.86, 1.1, 1.66], [0.97, 1.13, 1.64], [1.01, 1.2, 1.56], [1.01, 1.8, 1.04], [1.0, 1.86, 1.0]], 0.045, 8, SN);
      b.cyl([1.0, 1.84, 1.0], [1.0, 1.98, 1.0], 0.062, 0.062, 10, SN);            // filter canister
      b.cyl([1.0, 1.88, 1.0], [1.0, 1.9, 1.0], 0.067, 0.067, 10, SAFE, false);
      b.cyl([1.0, 1.98, 1.0], [1.0, 2.0, 1.0], 0.07, 0.05, 10, GUN);
      b.box(1.0, 1.93, 1.065, 0.1, 0.08, 0.03, HAZ_K);                             // ram-air face
      for (const y of [1.45, 1.72]) b.beam([1.0, y, zSn(y)], [0.95, y, zSn(y) - 0.26], 0.025, GUN);
    }
    // rock sliders
    for (const s of [-1, 1]) {
      b.box(s * 1.0, 0.43, 0.1, 0.12, 0.07, 2.0, dusty(GUN_D, 0.4, 0.9, 0.4));
      b.cyl([s * 1.06, 0.47, -0.85], [s * 1.06, 0.47, 1.05], 0.025, 0.025, 8, GUN);
      for (const z of [-0.6, 0.1, 0.8]) b.beam([s * 1.0, 0.41, z], [s * 0.5, 0.5, z], 0.04, CHASSIS);
    }

    // ---------------- bed ----------------
    const BIN = P_.BED_IN, BF = P_.BED_FLOOR, BED_COL = [0.16, 0.16, 0.16, 0.05];
    b.box(0, BF - 0.02, (P_.BED_F + P_.TAIL) / 2, 2 * BIN, 0.04, P_.BED_F - P_.TAIL, BED_COL);
    for (let k = -7; k <= 7; k++) b.box(k * 0.11, BF + 0.008, (P_.BED_F + P_.TAIL) / 2, 0.045, 0.016, P_.BED_F - P_.TAIL - 0.08, [0.2, 0.2, 0.2]);
    for (const s of [-1, 1]) {
      b.box(s * BIN, (BF + P_.BED_RAIL) / 2, (P_.BED_F + P_.TAIL) / 2, 0.02, P_.BED_RAIL - BF, P_.BED_F - P_.TAIL, BED_COL);
      b.box(s * 0.905, P_.BED_RAIL + 0.012, (P_.BED_F + P_.TAIL) / 2 - 0.02, 0.12, 0.025, P_.BED_F - P_.TAIL + 0.03, GUN);
      for (const z of [P_.BED_F - 0.12, P_.TAIL + 0.12]) b.box(s * 0.905, P_.BED_RAIL + 0.026, z, 0.06, 0.004, 0.08, [0.03, 0.03, 0.03]);
      const zc = P_.AXR, rr = 0.48;
      b.surf(16, 1, (u, v) => { const a = PI * u, z = zc + rr * Math.cos(a), y = BF - 0.18 + (rr - 0.05) * Math.sin(a) + 0.0; return [s * (BIN - 0.24 * v), Math.max(y, BF), z]; }, BED_COL);
      b.surf(16, 1, (u, v) => { const a = PI * u, rr2 = rr * v, z = zc + rr2 * Math.cos(a), y = BF - 0.18 + (rr - 0.05) * v * Math.sin(a); return [s * (BIN - 0.24), Math.max(y, BF), z]; }, BED_COL);
      for (let k = 0; k < 3; k++) b.box(s * (BIN - 0.005), BF + 0.18 + k * 0.12, P_.BED_F - 0.3 - k * 0.5, 0.02, 0.05, 0.05, STEEL);
    }
    b.box(0, (P_.SILL + P_.BED_RAIL) / 2 + 0.015, P_.BED_F + 0.01, 1.9, P_.BED_RAIL - P_.SILL - 0.03, 0.03, shade(BONE, 0.9));
    b.box(0, (P_.SILL + P_.BELT) / 2, P_.CAB_BACK - 0.005, 1.84, P_.BELT - P_.SILL, 0.01, BONE);
    b.box(0, (P_.SILL + P_.BED_RAIL) / 2, (P_.CAB_BACK + P_.BED_F) / 2, 1.7, P_.BED_RAIL - P_.SILL, 0.06, [0.05, 0.05, 0.05]);
    // tailgate: stencilled unit code and a hazard band
    const TG = P_.TAIL;
    b.box(0, (0.66 + P_.BED_RAIL) / 2, TG + 0.03, 2 * BIN, P_.BED_RAIL - 0.66, 0.06, BONE);
    b.surf(14, 6, (u, v) => { const x = (u * 2 - 1) * (BIN - 0.01), y = 0.66 + (P_.BED_RAIL - 0.66) * v; return [x, y, TG - 0.001 - 0.012 * Math.sin(PI * v) * Math.sin(PI * u)]; }, (u, v) => dusty(BONE, 0.66 + (P_.BED_RAIL - 0.66) * v, 0.95, 0.75));
    b.box(0, P_.BED_RAIL - 0.08, TG - 0.016, 0.24, 0.06, 0.01, GUN_D);
    { const px = 0.032, str = 'KR-07', w = textW(str, px); stencil(b, str, px, (q, t) => [w / 2 - q, 0.99 + t, TG - 0.02], HAZ_K); }
    hazard(b, (q, t, e) => [-(BIN - 0.03) + q, 0.7 + t, TG - 0.012 - 0.003 * e], 2 * (BIN - 0.03), 0.1, 0.12, SAFE, HAZ_K);
    b.box(0, 0.68, TG - 0.006, 2 * BIN, 0.008, 0.005, SEAL);
    for (const s of [-1, 1]) {
      b.box(s * (BIN + 0.005), (0.66 + P_.BED_RAIL) / 2, TG - 0.006, 0.01, P_.BED_RAIL - 0.66, 0.01, SEAL);
      const tx = s * 0.905;
      b.box(tx, 1.1, TG - 0.01, 0.1, 0.4, 0.04, GUN_D);
      b.box(tx, 1.18, TG - 0.03, 0.085, 0.22, 0.01, RED_L);
      b.box(tx, 1.025, TG - 0.03, 0.085, 0.08, 0.01, CLEAR_L);
      b.box(tx, 0.945, TG - 0.03, 0.085, 0.06, 0.01, [0.6, 0.04, 0.04, 0.5]);
      for (const k of [-1, 1]) b.box(tx + k * 0.022, 1.08, TG - 0.042, 0.012, 0.42, 0.012, GUN);   // lamp guards
      b.box(s * 0.95, 0.8, TG + 0.05, 0.01, 0.04, 0.08, RED_L);
    }
    // armoured rear step bumper with hazard striping and hitch receiver
    const RB = dusty(GUN, 0.5, 0.95, 0.4);
    b.box(0, 0.52, P_.REAR + 0.08, 1.96, 0.2, 0.16, RB);
    b.box(0, 0.63, P_.REAR + 0.08, 1.92, 0.02, 0.15, [0.1, 0.1, 0.1]);
    for (const s of [-1, 1]) b.box(s * 0.5, 0.635, P_.REAR + 0.08, 0.4, 0.012, 0.12, [0.06, 0.06, 0.06]);
    hazard(b, (q, t, e) => [-0.95 + q, 0.44 + t, P_.REAR - 0.002 - 0.003 * e], 1.9, 0.16, 0.13, SAFE, HAZ_K);
    b.box(0, 0.38, P_.REAR + 0.15, 0.065, 0.065, 0.36, CHASSIS);
    b.box(0, 0.38, P_.REAR + 0.0, 0.07, 0.08, 0.04, CHASSIS);
    b.cyl([0.05, 0.38, P_.REAR + 0.06], [0.085, 0.38, P_.REAR + 0.06], 0.015, 0.015, 8, STEEL);

    // sealed crossbed equipment case (sits on the bed rails)
    const TB0 = P_.BED_F - 0.04, TB1 = TB0 - 0.5, TBY0 = P_.BED_RAIL + 0.025, TBY1 = TBY0 + 0.27, TBX = 0.97, TBZ = (TB0 + TB1) / 2;
    b.box(0, (TBY0 + TBY1) / 2, TBZ, 2 * TBX, TBY1 - TBY0, TB0 - TB1, GUN);
    b.box(0, (BF + TBY0) / 2, TBZ, 2 * BIN - 0.04, TBY0 - BF, TB0 - TB1 - 0.04, GUN_D);
    b.box(0, TBY1 + 0.015, TBZ, 2 * TBX - 0.08, 0.03, TB0 - TB1 - 0.08, shade(GUN, 1.15));
    for (let k = 0; k < 5; k++) b.box(-0.6 + k * 0.3, TBY1 + 0.036, TBZ, 0.04, 0.014, TB0 - TB1 - 0.12, GUN_D);
    b.box(0, TBY1 - 0.05, TBZ, 2 * TBX + 0.012, 0.014, TB0 - TB1 + 0.012, SEAL);
    for (const s of [-1, 1]) for (const k of [0.3, 0.75]) b.box(s * k, TBY1 - 0.05, TB1 - 0.012, 0.07, 0.06, 0.02, SAFE);
    b.box(0, TBY0 + 0.1, TB1 - 0.004, 0.2, 0.11, 0.006, BONE);
    { const px = 0.018, w = textW('O2', px); stencil(b, 'O2', px, (q, t) => [w / 2 - q, TBY0 + 0.055 + t, TB1 - 0.009], HAZ_K); }

    // headache rack, now carrying an amber beacon bar
    const RK = GUN, RZ = P_.BED_F - 0.02, RTOP = 1.98;
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

    // cargo: two gas cylinders in a cradle (left) and stacked sealed cases (right)
    {
      const cyY = BF + 0.18, za = -1.72, zb = -2.6;
      for (const z of [-1.95, -2.4]) b.box(-0.315, BF + 0.035, z, 0.6, 0.07, 0.08, GUN);
      gasCyl(b, [-0.45, cyY, za], [-0.45, cyY, zb], 0.12, BONE, SAFE, 12);
      gasCyl(b, [-0.18, cyY, za], [-0.18, cyY, zb], 0.12, GUN, SAFE, 12);
      for (const x of [-0.45, -0.18]) for (const z of [-1.95, -2.4]) b.cyl([x, cyY, z - 0.02], [x, cyY, z + 0.02], 0.128, 0.128, 12, GUN_D, false);
      crate(b, 0.33, BF, -2.15, 0.5, 0.3, 0.66, SAFE, GUN_D);
      crate(b, 0.3, BF + 0.3, -2.2, 0.42, 0.2, 0.48, BONE, GUN);
    }
    return b;
  }

  function pickupLow() {
    const b = new MB(), D = dusty(BONE, 0.6, 0.95, 0.6);
    b.box(0, 0.83, 0.85, 1.92, 0.56, 3.78, BONE);
    b.box(0, 0.61, 0.85, 1.94, 0.12, 3.7, D);
    for (const s of [-1, 1]) b.box(s * 0.91, 0.95, -1.9, 0.1, 0.76, 1.7, BONE);
    b.box(0, 0.62, -1.9, 1.72, 0.1, 1.7, D);
    b.box(0, 0.88, -1.9, 1.72, 0.04, 1.6, [0.16, 0.16, 0.16]);
    b.box(0, 0.99, -2.72, 1.72, 0.66, 0.06, BONE);
    b.box(0, 1.55, -0.15, 1.72, 0.66, 1.6, BONE);                       // sealed cab
    b.plate([-0.8, 1.26, 1.12], [0.8, 1.26, 1.12], [0.72, 1.82, 0.66], [-0.72, 1.82, 0.66], GLASS);
    b.box(0, 1.89, -0.12, 1.62, 0.04, 1.5, BONE);
    b.box(0, 0.86, 2.76, 1.1, 0.4, 0.04, [0.08, 0.08, 0.08]);
    b.box(0, 0.5, 2.8, 1.98, 0.24, 0.12, GUN_D);
    b.box(0, 0.52, -2.78, 1.96, 0.2, 0.14, GUN);
    b.box(0, 1.2, -1.4, 1.94, 0.6, 0.5, GUN);                           // crossbed case
    b.box(0, 2.04, -1.1, 1.16, 0.08, 0.09, AMBER);
    b.box(0, 2.03, 0.54, 1.3, 0.09, 0.1, LAMP);                         // light bar
    b.box(0, 2.08, -0.5, 0.06, 0.3, 0.06, GUN);                         // sensor mast
    b.beam([1.01, 1.15, 1.6], [1.0, 1.98, 1.0], 0.1, GUN_D);           // snorkel
    b.box(0.33, 1.05, -2.15, 0.5, 0.3, 0.66, SAFE);                     // cases
    for (const x of [-0.45, -0.18]) b.cyl([x, 1.08, -1.72], [x, 1.08, -2.6], 0.12, 0.12, 6, x < -0.3 ? BONE : GUN, false);
    for (const s of [-1, 1]) {
      for (const z of [P_.AXF, P_.AXR]) b.box(s * 0.975, 0.92, z, 0.04, 0.08, 1.05, GUN_D);
      b.box(s * 0.965, 0.855, 0.1, 0.02, 0.05, 2.1, SAFE);
      b.box(s * 0.875, 1.58, -0.15, 0.02, 0.3, 1.2, GLASS);             // small side panes
      b.beam([s * 0.86, 1.97, 0.5], [s * 0.86, 1.97, -1.1], 0.06, GUN);   // cage rail
      b.box(s * 0.905, 1.66, -1.1, 0.05, 0.64, 0.05, TRIM);
      b.box(s * 0.9, 1.1, -2.76, 0.1, 0.4, 0.04, RED_L);
      b.box(s * 1.12, 1.36, 1.03, 0.09, 0.32, 0.12, GUN_D);
      for (const z of [P_.AXF, P_.AXR]) b.cyl([s * 0.69, 0.4, z], [s * 0.99, 0.4, z], 0.4, 0.4, 8, RUBBER);
    }
    return b;
  }

  // =====================================================================
  // 2. SCOUT BUGGY  (front = +Z, driver on +X)
  // =====================================================================
  const U = {
    AXF: 1.05, AXR: -1.15, TRACK: 0.66, WR: 0.34, WW: 0.24,
    FLOOR: 0.36, SEAT_Y: 0.58, SEAT_Z: -0.12, SEAT_X: 0.33,
    COWL_Z: 0.52, NOSE_Z: 1.46, HOOD_R: 0.98, HOOD_F: 0.84,
    BED0: -0.58, BED1: -1.47, BED_Y: 0.82, BED_TOP: 1.1, BED_W: 0.66,
    CAGE_X: 0.67, CAGE_TOP: 1.88, CAGE_F: 0.04, CAGE_R: -0.46
  };
  const U_OR = BONE, U_OR_D = SAFE, U_GR = GUN, U_GR_D = GUN_D, U_CAGE = [0.19, 0.195, 0.21, 0.28], SEATC = [0.1, 0.1, 0.11, 0.02];
  const uHoodY = z => U.HOOD_R + (U.HOOD_F - U.HOOD_R) * clamp((z - U.COWL_Z) / (U.NOSE_Z - U.COWL_Z), 0, 1);
  const uHoodW = z => 0.5 - 0.1 * Math.pow(clamp((z - 1.1) / (U.NOSE_Z - 1.1), 0, 1), 2);

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
    b.box(0, U.FLOOR - 0.025, -0.05, 1.2, 0.05, 1.2, U_GR_D);
    b.box(0, 0.25, 0.1, 0.5, 0.06, 2.3, GUN);                                                  // armoured belly plate
    for (const s of [-1, 1]) {
      b.cyl([s * 0.22, 0.3, 1.35], [s * 0.22, 0.3, -1.3], 0.03, 0.03, 8, U_CAGE);
      b.tube([[s * U.CAGE_X, 0.42, 0.55], [s * U.CAGE_X, 0.42, -0.6]], 0.028, 10, U_CAGE);
      b.box(s * (U.CAGE_X - 0.08), 0.39, -0.02, 0.14, 0.04, 1.1, U_GR);
    }
    for (const z of [1.2, 0.55, -0.6, -1.25]) b.cyl([-0.22, 0.3, z], [0.22, 0.3, z], 0.025, 0.025, 8, U_CAGE);
    b.box(0, 0.6, -0.95, 0.55, 0.42, 0.55, [0.25, 0.25, 0.25, 0.2]);
    b.box(0.25, 0.55, -0.85, 0.12, 0.35, 0.5, [0.15, 0.15, 0.15, 0.1]);
    b.cyl([-0.2, 0.65, -1.15], [-0.2, 0.65, -1.45], 0.08, 0.08, 12, [0.45, 0.45, 0.46, 0.3]);
    b.cyl([-0.2, 0.65, -1.45], [-0.2, 0.67, -1.52], 0.03, 0.03, 8, [0.2, 0.2, 0.2, 0.3]);
    // ---------- wheels: knobbly tyres on gunmetal beadlocks ----------
    const W = makeWheel({ R: U.WR, W: U.WW, rim: 0.19, tread: 0.032, segs: 24, blocks: 18, ribs: 0, dish: 0.05, vents: 0, lugs: 4, rimCol: GUN_D, capCol: SAFE, beadlock: GUN });
    for (const z of [U.AXF, U.AXR]) for (const s of [-1, 1]) putWheel(b, W, s * U.TRACK, U.WR, z);
    // ---------- long-travel suspension ----------
    const SPR = SAFE, SHK = [0.6, 0.61, 0.63, 0.35];
    function coilOver(a, c) {
      b.cyl(a, K.lerp(a, c, 0.55), 0.013, 0.013, 8, SHK); b.cyl(K.lerp(a, c, 0.45), c, 0.028, 0.028, 10, [0.2, 0.2, 0.22, 0.3]);
      const d = K.sub(c, a), f = K.norm(d), s1 = K.norm(K.cross(f, [1, 0, 0])), s2 = K.cross(f, s1), pts = [];
      for (let k = 0; k <= 40; k++) { const t = 0.12 + 0.74 * k / 40, a2 = k / 40 * PI * 2 * 7; pts.push(K.add(K.add(a, K.scale(d, t)), K.add(K.scale(s1, 0.045 * Math.cos(a2)), K.scale(s2, 0.045 * Math.sin(a2))))); }
      b.tube(pts, 0.008, 4, SPR); b.cyl(K.lerp(a, c, 0.1), K.lerp(a, c, 0.12), 0.055, 0.055, 10, U_CAGE); b.cyl(K.lerp(a, c, 0.86), K.lerp(a, c, 0.88), 0.055, 0.055, 10, U_CAGE);
    }
    for (const s of [-1, 1]) {
      const hx = s * (U.TRACK - 0.1), z = U.AXF;
      b.box(hx, U.WR, z, 0.06, 0.2, 0.08, U_CAGE);
      for (const dz of [-0.17, 0.17]) { b.cyl([s * 0.22, 0.27, z + dz], [hx, 0.27, z], 0.018, 0.018, 8, U_CAGE); b.cyl([s * 0.24, 0.47, z + dz * 0.8], [hx, 0.44, z], 0.016, 0.016, 8, U_CAGE); }
      coilOver([s * 0.48, 0.29, z - 0.02], [s * 0.3, 0.86, z - 0.12]);
      b.cyl([s * 0.08, 0.32, z], [hx, U.WR, z], 0.02, 0.02, 8, [0.3, 0.3, 0.3, 0.3]);
      b.cyl([s * 0.4, 0.4, z + 0.2], [hx, 0.38, z + 0.12], 0.012, 0.012, 6, SHK);
      const rx = s * (U.TRACK - 0.1), rz = U.AXR;
      b.box(rx, U.WR, rz, 0.06, 0.2, 0.1, U_CAGE);
      b.beam([s * 0.58, 0.4, -0.35], [rx, U.WR, rz], 0.05, U_CAGE, 0.09);
      for (const dy of [0.27, 0.42]) b.cyl([s * 0.2, dy, rz + 0.1], [rx, dy, rz], 0.016, 0.016, 8, U_CAGE);
      coilOver([s * 0.52, 0.28, rz + 0.06], [s * 0.36, 0.96, rz + 0.3]);
      b.cyl([s * 0.08, 0.36, rz], [rx, U.WR, rz], 0.02, 0.02, 8, [0.3, 0.3, 0.3, 0.3]);
    }
    // ---------- front bodywork: bone panels, heat-fin vent, gunmetal lips ----------
    b.surf(18, 16, (u, v) => {
      const z = U.COWL_Z + (U.NOSE_Z - U.COWL_Z) * v, w = uHoodW(z), sx = u * 2 - 1;
      let y = uHoodY(z) + 0.03 * (1 - sx * sx) - 0.05 * Math.pow(Math.abs(sx), 8) - 0.06 * Math.pow(clamp((z - (U.NOSE_Z - 0.1)) / 0.1, 0, 1), 2);
      y -= 0.015 * Math.exp(-Math.pow((Math.abs(sx) - 0.5) / 0.06, 2));
      return [sx * w, y, z];
    }, (u, v) => (Math.abs(u - 0.5) < 0.12 && v > 0.15 && v < 0.75) ? U_GR_D : dusty(U_OR, 0.8 - 0.1 * Math.abs(u - 0.5), 0.8, 0.3));
    {
      const zc = 0.93, ang = Math.atan2(U.HOOD_R - U.HOOD_F, U.NOSE_Z - U.COWL_Z);
      b.push(mulAll(tr(0, uHoodY(zc) + 0.045, zc), rotX(ang)));
      b.box(0, 0, 0, 0.22, 0.02, 0.48, U_GR_D);
      for (let k = 0; k < 5; k++) b.box(-0.08 + k * 0.04, 0.02, 0, 0.012, 0.03, 0.44, GUN);
      b.pop();
    }
    for (const s of [-1, 1]) {
      b.surf(10, 3, (u, v) => { const z = U.COWL_Z + (U.NOSE_Z - 0.02 - U.COWL_Z) * u, w = uHoodW(z) - 0.01, yt = uHoodY(z) - 0.05, y = 0.42 + (yt - 0.42) * v; return [s * w, y, z]; }, U_GR);
      fender(b, s, U.AXF, [[0.5, 0.5], [0.44, 0.7], [0.3, 0.88], [0, 0.93], [-0.28, 0.92], [-0.4, 0.78], [-0.44, 0.56]], [[0, 0.44], [0.03, 0.47], [0.04, 0.64], [0.02, 0.78], [-0.03, 0.8]], U_OR, U_GR_D);
      fender(b, s, U.AXR, [[0.42, 0.56], [0.36, 0.74], [0.24, 0.82], [-0.24, 0.82], [-0.38, 0.76], [-0.46, 0.56]], [[0, 0.5], [0.02, 0.52], [0.03, 0.74], [-0.03, 0.8]], U_GR, U_GR_D);
      // armoured half doors: bone, hazard band, stencilled code
      b.surf(8, 4, (u, v) => { const z = 0.42 - 0.62 * u, y = 0.46 + 0.42 * v - 0.08 * u * v; return [s * (U.CAGE_X + 0.02 - 0.02 * v * v), y, z]; }, (u, v) => v > 0.85 ? U_GR_D : dusty(U_OR, 0.46 + 0.42 * v, 0.75, 0.5));
      b.tube([[s * (U.CAGE_X + 0.01), 0.88, 0.42], [s * (U.CAGE_X + 0.01), 0.82, -0.2]], 0.015, 6, U_GR_D);
      hazard(b, (q, t, e) => [s * (0.692 + 0.003 * e), 0.7 + t, 0.38 - q], 0.5, 0.07, 0.08, SAFE, HAZ_K);
      { const px = 0.022, str = 'KR-14', w = textW(str, px); stencil(b, str, px, (q, t) => [s * 0.697, 0.52 + t, 0.11 - s * (q - w / 2)], HAZ_K); }
      const hz = U.NOSE_Z - 0.02;
      b.box(s * 0.28, 0.7, hz, 0.24, 0.1, 0.05, GUN_D);
      b.box(s * 0.28, 0.705, hz + 0.02, 0.19, 0.06, 0.02, LAMP);
      for (const k of [-1, 1]) b.box(s * 0.28 + k * 0.05, 0.705, hz + 0.036, 0.012, 0.09, 0.012, GUN);
      b.box(s * 0.28, 0.66, hz + 0.025, 0.17, 0.012, 0.01, AMBER);
      b.box(s * 0.56, 0.95, U.BED1 - 0.01, 0.1, 0.06, 0.03, RED_L);
    }
    // nose: grille, armoured bumper with hazard striping, brush guard
    b.box(0, 0.62, U.NOSE_Z - 0.02, 0.36, 0.3, 0.04, [0.06, 0.06, 0.06]);
    for (let k = 0; k < 5; k++) b.box(0, 0.51 + k * 0.055, U.NOSE_Z + 0.005, 0.34, 0.015, 0.02, U_GR);
    b.box(0, 0.42, U.NOSE_Z - 0.05, 1.0, 0.1, 0.1, U_GR_D);
    hazard(b, (q, t, e) => [-0.48 + q, 0.38 + t, U.NOSE_Z + 0.002 + 0.003 * e], 0.96, 0.08, 0.09, SAFE, HAZ_K);
    b.tube([[-0.45, 0.4, U.NOSE_Z - 0.04], [-0.42, 0.4, U.NOSE_Z + 0.08], [-0.3, 0.42, U.NOSE_Z + 0.12], [0.3, 0.42, U.NOSE_Z + 0.12], [0.42, 0.4, U.NOSE_Z + 0.08], [0.45, 0.4, U.NOSE_Z - 0.04]], 0.026, 10, U_CAGE);
    b.tube([[-0.3, 0.42, U.NOSE_Z + 0.12], [-0.28, 0.66, U.NOSE_Z + 0.1], [-0.2, 0.72, U.NOSE_Z + 0.06], [0.2, 0.72, U.NOSE_Z + 0.06], [0.28, 0.66, U.NOSE_Z + 0.1], [0.3, 0.42, U.NOSE_Z + 0.12]], 0.022, 10, U_CAGE);
    b.box(0, 0.3, U.NOSE_Z - 0.02, 0.6, 0.02, 0.3, GUN);
    for (const s of [-1, 1]) b.cyl([s * 0.08, 0.34, U.NOSE_Z + 0.12], [s * 0.08, 0.3, U.NOSE_Z + 0.16], 0.015, 0.015, 6, SAFE);
    // dash, cowl, steering
    b.box(0, 0.92, U.COWL_Z - 0.02, 1.18, 0.12, 0.12, U_GR_D);
    b.box(0, 0.73, U.COWL_Z + 0.02, 1.0, 0.42, 0.06, U_GR);
    b.surf(10, 3, (u, v) => { const x = (u * 2 - 1) * 0.58, z = U.COWL_Z - 0.08 - 0.1 * v; return [x, 0.98 - 0.06 * v + 0.02 * (1 - (u * 2 - 1) ** 2), z]; }, U_GR);
    b.box(U.SEAT_X, 1.0, U.COWL_Z - 0.1, 0.2, 0.06, 0.04, [0.05, 0.05, 0.05, 0.3]);
    b.cyl([U.SEAT_X - 0.05, 1.005, U.COWL_Z - 0.122], [U.SEAT_X - 0.05, 1.005, U.COWL_Z - 0.126], 0.022, 0.022, 10, LENS);
    {
      const c0 = [U.SEAT_X, 0.9, U.COWL_Z - 0.06], c1 = [U.SEAT_X, 1.04, U.COWL_Z - 0.3], f = K.norm(K.sub(c1, c0));
      b.cyl(c0, c1, 0.02, 0.02, 8, U_GR_D);
      const s1 = [1, 0, 0], s2 = K.norm(K.cross(f, s1)), ring = [];
      for (let k = 0; k <= 28; k++) { const a = k / 28 * PI * 2; ring.push(K.add(c1, K.add(K.scale(s1, 0.17 * Math.cos(a)), K.scale(s2, 0.17 * Math.sin(a))))); }
      b.tube(ring, 0.016, 8, [0.06, 0.06, 0.06]);
      for (const a of [0, PI, PI * 1.5]) b.beam(c1, K.add(c1, K.add(K.scale(s1, 0.16 * Math.cos(a)), K.scale(s2, 0.16 * Math.sin(a)))), 0.025, U_GR, 0.012);
      b.cyl(c1, K.add(c1, K.scale(f, 0.03)), 0.045, 0.035, 10, SAFE);
    }
    b.box(0, 0.6, 0.0, 0.16, 0.28, 0.9, U_GR);
    b.cyl([0.05, 0.75, 0.3], [0.05, 0.9, 0.25], 0.01, 0.01, 6, [0.4, 0.4, 0.4, 0.3]);
    b.sphere(0.05, 0.9, 0.25, 0.025, 8, [0.06, 0.06, 0.06]);
    // ---------- bucket seats with harnesses ----------
    for (const s of [-1, 1]) {
      const sx = s * U.SEAT_X, sz = U.SEAT_Z;
      b.box(sx, U.SEAT_Y - 0.1, sz + 0.03, 0.44, 0.16, 0.44, U_GR_D);
      b.surf(10, 4, (u, v) => { const t = u * 2 - 1, x = sx + t * 0.23, y = U.SEAT_Y + 0.04 * Math.abs(t) ** 3 + 0.02 * v, z = sz + 0.22 - 0.46 * v; return [x, y, z]; }, SEATC);
      for (const o of [0, 0.05]) b.surf(o ? 6 : 10, o ? 5 : 8, (u, v) => {
        const t = u * 2 - 1, x = sx + t * 0.24, y = U.SEAT_Y + 0.04 + 0.66 * v, z = sz - 0.24 - 0.12 * v + 0.07 * t * t * (1 - 0.4 * v) - o;
        return [x, y, z];
      }, o ? U_GR_D : (u, v) => (Math.abs(u - 0.5) < 0.3 && v > 0.1 && v < 0.85) ? [0.16, 0.16, 0.17, 0.02] : SEATC);
      b.box(sx, U.SEAT_Y + 0.62, sz - 0.39, 0.28, 0.04, 0.06, SAFE);
      const HC = [0.95, 0.34, 0.04, 0.05];
      for (const t of [-1, 1]) {
        b.tube([[sx + t * 0.08, U.SEAT_Y + 0.72, sz - 0.32], [sx + t * 0.08, U.SEAT_Y + 0.6, sz - 0.27], [sx + t * 0.06, U.SEAT_Y + 0.3, sz - 0.24], [sx + t * 0.02, U.SEAT_Y + 0.08, sz - 0.12]], 0.012, 4, HC);
        b.tube([[sx + t * 0.22, U.SEAT_Y + 0.04, sz - 0.18], [sx + t * 0.12, U.SEAT_Y + 0.08, sz - 0.08], [sx + t * 0.02, U.SEAT_Y + 0.08, sz - 0.06]], 0.012, 4, HC);
      }
      b.box(sx, U.SEAT_Y + 0.08, sz - 0.07, 0.07, 0.07, 0.02, [0.7, 0.72, 0.75, 0.4]);
    }
    // ---------- cargo bed: racked gas cylinders and sealed cases ----------
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
    hazard(b, (q, t, e) => [0.6 - q, by + 0.12 + t, U.BED1 - 0.022 - 0.003 * e], 1.2, 0.08, 0.1, SAFE, HAZ_K);   // tailgate band
    b.box(0, (by + 0.6) / 2, U.BED1 + 0.05, 1.0, 0.4, 0.04, U_GR_D);
    {
      const cx = -0.5;
      b.box(-0.615, by + 0.3, -0.84, 0.03, 0.5, 0.5, U_GR_D);                                      // rack back plate
      for (const z of [-0.72, -0.96]) {
        gasCyl(b, [cx, by, z], [cx, by + 0.52, z], 0.085, z > -0.8 ? BONE : SAFE, z > -0.8 ? SAFE : BONE, 12);
        b.cyl([cx, by + 0.34, z], [cx, by + 0.37, z], 0.092, 0.092, 12, GUN, false);
      }
      crate(b, 0.26, by, -1.05, 0.6, 0.26, 0.5, SAFE, GUN_D);
      crate(b, -0.35, by, -1.26, 0.48, 0.2, 0.36, BONE, GUN);
    }
    // external oxygen bottle on the left bed side
    gasCyl(b, [-0.74, 0.98, -1.38], [-0.74, 0.98, -0.72], 0.055, BONE, SAFE, 10);
    for (const z of [-0.85, -1.22]) b.box(-0.705, 0.98, z, 0.07, 0.13, 0.03, GUN);
    // filter intake stack behind the passenger seat
    b.tube([[0.3, 0.75, -0.75], [0.52, 0.95, -0.66], [0.56, 1.1, -0.64], [0.56, 1.5, -0.64]], 0.035, 8, U_GR_D);
    b.cyl([0.56, 1.48, -0.64], [0.56, 1.6, -0.64], 0.055, 0.055, 10, U_GR_D);
    b.cyl([0.56, 1.53, -0.64], [0.56, 1.55, -0.64], 0.06, 0.06, 10, SAFE, false);
    b.cyl([0.56, 1.6, -0.64], [0.56, 1.63, -0.64], 0.075, 0.05, 10, GUN);
    // ---------- roll cage with an armoured roof, light bar, sensor mast ----------
    const CX = U.CAGE_X, CT = U.CAGE_TOP;
    for (const s of [-1, 1]) {
      const x = s * CX;
      b.tube([[x, 0.42, 0.55], [x, 0.86, 0.55], [x * 0.99, 1.4, 0.36], [x * 0.98, CT - 0.1, 0.12], [x * 0.98, CT - 0.02, U.CAGE_F + 0.02], [x * 0.98, CT, -0.05], [x * 0.98, CT, U.CAGE_R + 0.07], [x * 0.98, CT - 0.03, U.CAGE_R - 0.01], [x, CT - 0.12, U.CAGE_R - 0.05], [x, 1.15, -0.55], [x, 0.85, -0.58], [x, 0.42, -0.6]], 0.026, 10, U_CAGE);
      b.tube([[x, 1.1, -0.55], [x * 0.6, 1.35, -0.5], [0, 1.6, -0.47]], 0.02, 8, U_CAGE);
      b.tube([[x, 1.6, -0.5], [x * 0.5, 1.35, -0.5], [0, 1.1, -0.53]], 0.02, 8, U_CAGE);
      b.cyl([x, 1.6, U.CAGE_R - 0.09], [x * 0.9, 1.6, U.BED0 + 0.02], 0.02, 0.02, 8, U_CAGE);
      b.cyl([x * 0.75, 1.1, 0.48], [x * 0.75, 1.25, 0.43], 0.016, 0.016, 8, U_CAGE);
      b.tube([[x * 0.75, 1.25, 0.43], [x * 0.7, 1.32, 0.38], [x * 0.55, 1.32, 0.38]], 0.016, 8, [0.06, 0.06, 0.06]);
    }
    b.cyl([-CX * 0.98, CT, U.CAGE_F], [CX * 0.98, CT, U.CAGE_F], 0.026, 0.026, 10, U_CAGE);
    b.cyl([-CX * 0.98, CT - 0.04, U.CAGE_R], [CX * 0.98, CT - 0.04, U.CAGE_R], 0.026, 0.026, 10, U_CAGE);
    b.cyl([-CX, 1.15, -0.55], [CX, 1.15, -0.55], 0.024, 0.024, 10, U_CAGE);
    b.cyl([-CX, 0.86, 0.55], [CX, 0.86, 0.55], 0.024, 0.024, 10, U_CAGE);
    b.surf(14, 10, (u, v) => { const sx = u * 2 - 1, sz = v * 2 - 1, z = U.CAGE_R + 0.02 + (U.CAGE_F - 0.01 - U.CAGE_R - 0.02) * v; return [sx * (CX - 0.01), CT + 0.03 + 0.025 * (1 - sx ** 4) * (1 - sz ** 4), z]; }, (u, v) => (Math.floor(u * 7) % 2 && v > 0.1 && v < 0.9) ? U_GR_D : U_GR);
    b.box(0, CT + 0.07, U.CAGE_F - 0.02, 0.7, 0.05, 0.06, [0.06, 0.06, 0.06]);
    for (let k = 0; k < 5; k++) b.box(-0.28 + k * 0.14, CT + 0.07, U.CAGE_F + 0.012, 0.11, 0.035, 0.006, LAMP);
    b.box(-0.45, CT + 0.06, U.CAGE_R + 0.02, 0.08, 0.06, 0.08, AMBER);
    b.box(0, CT - 0.1, U.CAGE_F + 0.0, 0.26, 0.07, 0.025, [0.06, 0.06, 0.06]);
    b.box(0, CT - 0.1, U.CAGE_F - 0.014, 0.24, 0.055, 0.004, [0.55, 0.6, 0.65, 0.5]);
    {
      const mx = 0.3, mz = -0.3, ry = CT + 0.06;
      b.box(mx, ry, mz, 0.14, 0.03, 0.14, U_GR_D);
      b.cyl([mx, ry, mz], [mx, ry + 0.24, mz], 0.02, 0.016, 8, GUN);
      b.box(mx, ry + 0.12, mz + 0.04, 0.08, 0.07, 0.08, U_GR_D);
      b.box(mx, ry + 0.12, mz + 0.081, 0.05, 0.04, 0.004, LENS);
      b.push(mulAll(tr(mx, ry + 0.24, mz), rotX(0.6)));
      b.lathe([[0.01, 0.0], [0.05, 0.012], [0.095, 0.035], [0.11, 0.045]], 12, BONE);
      b.cyl([0, 0, 0], [0, 0.07, 0], 0.005, 0.005, 4, GUN);
      b.pop();
    }
    // ---------- radio whip with a small marker pennant on the rear-left corner ----------
    {
      const px = -CX - 0.04, pz = U.CAGE_R - 0.1;
      b.box(px, 1.18, pz, 0.05, 0.08, 0.05, U_CAGE);
      b.cyl([px, 1.15, pz], [px, 1.3, pz], 0.014, 0.012, 6, HAZ_K);
      b.cyl([px, 1.3, pz], [px, 3.0, pz - 0.05], 0.006, 0.003, 4, [0.12, 0.12, 0.13, 0.3]);
      const F0 = [px, 2.97, pz - 0.05], F1 = [px, 2.8, pz - 0.05], F2 = [px - 0.01, 2.885, pz - 0.3], fc = SAFE;
      b.tri(b.v(...F0, 1, 0, 0, fc), b.v(...F1, 1, 0, 0, fc), b.v(...F2, 1, 0, 0, fc));
    }
    return b;
  }
  function utvLow() {
    const b = new MB();
    b.box(0, 0.62, 0.98, 1.0, 0.5, 0.95, U_OR);
    b.box(0, 0.6, -0.1, 1.36, 0.45, 1.1, U_GR);
    b.box(0, 0.95, -1.02, 1.34, 0.3, 0.9, U_GR);
    b.box(0.26, 1.0, -1.05, 0.6, 0.26, 0.5, SAFE);
    b.box(-0.5, 1.08, -0.84, 0.17, 0.52, 0.42, BONE);
    for (const s of [-1, 1]) {
      b.box(s * 0.66, 0.84, U.AXF, 0.3, 0.06, 0.8, U_OR);
      b.box(s * 0.33, 0.9, -0.3, 0.44, 0.66, 0.1, SEATC);
      b.box(s * 0.69, 0.67, 0.11, 0.02, 0.42, 0.62, U_OR);
      b.beam([s * U.CAGE_X, 0.86, 0.55], [s * U.CAGE_X, U.CAGE_TOP, 0.04], 0.05, U_CAGE);
      b.beam([s * U.CAGE_X, 0.42, -0.58], [s * U.CAGE_X, U.CAGE_TOP, -0.46], 0.05, U_CAGE);
      for (const z of [U.AXF, U.AXR]) b.cyl([s * 0.54, U.WR, z], [s * 0.78, U.WR, z], U.WR, U.WR, 8, RUBBER);
    }
    b.box(0, U.CAGE_TOP + 0.03, -0.21, 1.34, 0.04, 0.5, U_GR);
    b.box(0.3, U.CAGE_TOP + 0.18, -0.3, 0.04, 0.24, 0.04, GUN);
    b.cyl([-0.71, 1.15, -0.56], [-0.71, 3.0, -0.61], 0.01, 0.01, 3, HAZ_K, false);
    return b;
  }

  // =====================================================================
  // 3. CARGO TRAILER with sealed cases and a pressure tank  (front / drawbar = +Z)
  // =====================================================================
  const T = { DECK: 0.7, DW: 0.85, D0: -2.5, D1: 1.4, AX1: -0.25, AX2: -1.05, WR: 0.33, WW: 0.2, TRACK: 1.0, COUPLER: 2.48 };
  const TSTEEL = [0.2, 0.205, 0.22, 0.25], DECKC = [0.3, 0.31, 0.32, 0.3];
  function trailer(detail) {
    if (!detail) return trailerLow();
    const b = new MB(), dk = T.DECK;
    // frame: perimeter rails, centre rails, crossmembers
    for (const s of [-1, 1]) {
      b.box(s * T.DW, dk - 0.1, (T.D0 + T.D1) / 2, 0.06, 0.15, T.D1 - T.D0, TSTEEL);
      b.box(s * T.DW + s * 0.03, dk - 0.1, (T.D0 + T.D1) / 2, 0.01, 0.11, T.D1 - T.D0 - 0.04, shade(TSTEEL, 0.7));
      b.box(s * 0.45, dk - 0.12, (T.D0 + T.D1) / 2 + 0.1, 0.05, 0.12, T.D1 - T.D0 - 0.2, TSTEEL);
      for (let k = 0; k < 6; k++) b.box(s * (T.DW + 0.035), dk - 0.04, T.D0 + 0.35 + k * 0.7, 0.05, 0.06, 0.06, k % 2 ? SAFE_D : TSTEEL);
    }
    for (let k = 0; k <= 8; k++) b.box(0, dk - 0.11, T.D0 + 0.04 + k * (T.D1 - T.D0 - 0.08) / 8, 2 * T.DW, 0.07, 0.05, TSTEEL);
    b.box(0, dk - 0.1, T.D0, 2 * T.DW + 0.06, 0.15, 0.06, TSTEEL);
    b.box(0, dk - 0.1, T.D1, 2 * T.DW + 0.06, 0.15, 0.06, TSTEEL);
    // steel deck plates
    const np = 7, pw = 2 * T.DW / np;
    for (let i = 0; i < np; i++) b.box(-T.DW + pw * (i + 0.5), dk - 0.02, (T.D0 + T.D1) / 2, pw - 0.01, 0.04, T.D1 - T.D0 - 0.02, shade(DECKC, i % 2 ? 0.9 : 1.0));
    // front headboard with a hazard-striped panel facing the tow vehicle
    for (const s of [-1, 1]) b.box(s * (T.DW - 0.02), dk + 0.25, T.D1 - 0.02, 0.05, 0.5, 0.05, TSTEEL);
    for (const y of [0.2, 0.48]) b.box(0, dk + y, T.D1 - 0.02, 2 * T.DW, 0.04, 0.04, TSTEEL);
    for (let k = -3; k <= 3; k++) b.box(k * 0.24, dk + 0.12, T.D1 - 0.02, 0.025, 0.24, 0.025, TSTEEL);
    b.box(0, dk + 0.34, T.D1 - 0.02, 2 * T.DW - 0.06, 0.24, 0.02, GUN_D);
    hazard(b, (q, t, e) => [-0.8 + q, dk + 0.25 + t, T.D1 - 0.008 + 0.003 * e], 1.6, 0.18, 0.16, SAFE, HAZ_K);
    // running gear: tandem axles on leaf springs with equaliser, fenders
    const W = makeWheel({ R: T.WR, W: T.WW, rim: 0.19, tread: 0.01, segs: 20, blocks: 0, ribs: 0, dish: 0.03, vents: 0, lugs: 5, rimCol: GUN, capCol: SAFE });
    for (const z of [T.AX1, T.AX2]) {
      b.cyl([-T.TRACK + 0.1, T.WR, z], [T.TRACK - 0.1, T.WR, z], 0.035, 0.035, 8, TSTEEL);
      for (const s of [-1, 1]) {
        putWheel(b, W, s * T.TRACK, T.WR, z);
        for (let L = 0; L < 2; L++) { const pts = []; for (let k = 0; k <= 4; k++) { const t = k / 2 - 1; pts.push([s * 0.75, T.WR + 0.05 - L * 0.016 + 0.06 * t * t, z + t * (0.32 - L * 0.1)]); } for (let k = 0; k < 4; k++) b.beam(pts[k], pts[k + 1], 0.05, TSTEEL, 0.012); }
        b.box(s * 0.75, T.WR, z, 0.08, 0.05, 0.1, TSTEEL);
      }
    }
    for (const s of [-1, 1]) {
      b.box(s * 0.75, dk - 0.25, (T.AX1 + T.AX2) / 2, 0.05, 0.14, 0.06, TSTEEL);
      b.box(s * 0.75, dk - 0.25, T.AX1 + 0.4, 0.05, 0.14, 0.05, TSTEEL);
      b.box(s * 0.75, dk - 0.25, T.AX2 - 0.4, 0.05, 0.14, 0.05, TSTEEL);
      b.surf(24, 2, (u, v) => {
        const z = T.AX2 - 0.48 + (T.AX1 - T.AX2 + 0.96) * u, t = (z - (T.AX1 + T.AX2) / 2) / 0.88, y = dk + 0.18 - 0.36 * Math.pow(Math.abs(t), 6);
        return [s * (T.DW + 0.05 + 0.28 * v), y, z];
      }, (u, v) => dusty(GUN, 0.5, 0.8, 0.4));
      b.plate([s * (T.DW + 0.33), dk - 0.18, T.AX2 - 0.48], [s * (T.DW + 0.33), dk + 0.18, T.AX2 - 0.2], [s * (T.DW + 0.33), dk + 0.18, T.AX1 + 0.2], [s * (T.DW + 0.33), dk - 0.18, T.AX1 + 0.48], shade(GUN, 0.8));
      hazard(b, (q, t, e) => [s * (T.DW + 0.334 + 0.003 * e), dk + 0.06 + t, T.AX2 - 0.2 + q], T.AX1 - T.AX2 + 0.4, 0.1, 0.12, SAFE, null);
      b.box(s * (T.DW + 0.33), dk + 0.05, T.AX1 + 0.47, 0.02, 0.05, 0.08, AMBER);
      b.box(s * (T.DW + 0.33), dk + 0.05, T.AX2 - 0.47, 0.02, 0.05, 0.08, RED_L);
      b.box(s * (T.DW - 0.1), dk - 0.1, T.D0 - 0.04, 0.18, 0.09, 0.03, [0.08, 0.08, 0.08]);
      b.box(s * (T.DW - 0.13), dk - 0.1, T.D0 - 0.056, 0.09, 0.06, 0.01, RED_L);
      b.box(s * (T.DW - 0.04), dk - 0.1, T.D0 - 0.056, 0.04, 0.06, 0.01, AMBER);
    }
    hazard(b, (q, t, e) => [0.6 - q, dk - 0.16 + t, T.D0 - 0.032 - 0.003 * e], 1.2, 0.12, 0.12, SAFE, HAZ_K);   // tail crossmember
    // drawbar (A-frame), coupler, safety chains, jack stand
    const cz = T.COUPLER, cy = 0.5;
    for (const s of [-1, 1]) b.beam([s * 0.75, dk - 0.1, T.D1], [s * 0.06, cy, cz - 0.3], 0.08, TSTEEL, 0.12);
    b.box(0, cy, cz - 0.2, 0.12, 0.12, 0.3, TSTEEL);
    b.box(0, cy + 0.02, cz - 0.02, 0.14, 0.1, 0.2, [0.3, 0.31, 0.33, 0.3]);
    b.sphere(0, cy - 0.02, cz + 0.05, 0.055, 12, [0.3, 0.31, 0.33, 0.3]);
    b.box(0, cy + 0.08, cz - 0.04, 0.05, 0.03, 0.16, SAFE);
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
      b.box(jx, 0.015, jz, 0.18, 0.03, 0.18, JC);
      b.tube([[jx, 0.88, jz], [jx, 0.93, jz], [jx + 0.14, 0.93, jz], [jx + 0.14, 0.88, jz]], 0.01, 6, STEEL);
      b.cyl([jx + 0.14, 0.88, jz], [jx + 0.14, 0.82, jz], 0.015, 0.015, 6, [0.06, 0.06, 0.06]);
    }
    // ---------- load 1: sealed cargo cases on skids ----------
    const cy0 = dk + 0.03, csy = 0.33, ctop = cy0 + csy;
    const cases = [[0, -1.95, 1.7, 1.05, BONE, GUN], [-0.45, -0.85, 0.84, 1.0, SAFE, GUN_D], [0.45, -0.85, 0.84, 1.0, BONE, GUN], [0, 0.12, 1.5, 0.6, GUN, SAFE_D]];
    for (const [x, z, sx, sz, body, trim] of cases) {
      for (const k of [-1, 1]) b.box(x + k * (sx / 2 - 0.12), dk + 0.015, z, 0.08, 0.03, sz - 0.06, GUN_D);
      crate(b, x, cy0, z, sx, sz === 0.6 ? 0.28 : csy, sz, body, trim);
    }
    { const px = 0.035, str = 'KR-T3', w = textW(str, px); stencil(b, str, px, (q, t) => [w / 2 - q, dk + 0.065 + t, -1.95 - 0.525 - 0.004], HAZ_K); }
    for (const s of [-1, 1]) hazard(b, (q, t, e) => [s * (0.85 + 0.003 + 0.003 * e), dk + 0.08 + t, -2.42 + q], 0.95, 0.12, 0.12, SAFE, HAZ_K);
    // tie-down straps over the cases
    const STRAP = [0.12, 0.12, 0.13, 0.05];
    for (const z of [-1.95, -0.85]) {
      const top = ctop + 0.006, pts = [[-T.DW - 0.04, dk - 0.04, z], [-0.86, top, z], [0.86, top, z], [T.DW + 0.04, dk - 0.04, z]];
      for (let k = 0; k < pts.length - 1; k++) b.beam(pts[k], pts[k + 1], 0.05, STRAP, 0.006);
      b.box(T.DW + 0.0, dk + 0.12, z, 0.05, 0.1, 0.09, GUN);
      b.box(T.DW + 0.02, dk + 0.12, z, 0.02, 0.12, 0.04, SAFE);
      for (const s of [-1, 1]) b.box(s * (T.DW + 0.04), dk - 0.05, z, 0.03, 0.05, 0.04, STEEL);
    }
    // ---------- load 2: pressure tank across the trailer in an open frame ----------
    const TZ = 0.92, TR = 0.42, TY = dk + TR + 0.05;
    b.push(mulAll(tr(0, TY, TZ), rotZ(PI / 2)));
    b.lathe([[0, -0.4], [0.2, -0.385], [0.32, -0.34], [0.39, -0.27], [TR, -0.19], [TR, -0.15, SAFE], [TR, -0.11], [TR, 0.11, SAFE], [TR, 0.15], [TR, 0.19], [0.39, 0.27], [0.32, 0.34], [0.2, 0.385], [0, 0.4]], 22, BONE);
    b.cyl([0, 0.39, 0], [0, 0.46, 0], 0.04, 0.04, 8, GUN);                            // end valve
    b.box(0, 0.47, 0, 0.12, 0.02, 0.02, SAFE);
    b.cyl([0.12, 0.36, 0.08], [0.12, 0.42, 0.08], 0.035, 0.035, 8, GUN_D);              // gauge
    b.cyl([0.12, 0.42, 0.08], [0.12, 0.425, 0.08], 0.03, 0.03, 8, LAMP);
    b.pop();
    b.cyl([0, TY + TR - 0.03, TZ], [0, TY + TR + 0.02, TZ], 0.1, 0.1, 10, GUN);        // manway
    for (const x of [-0.24, 0.24]) {
      b.box(x, dk + 0.1, TZ, 0.08, 0.2, 0.72, GUN);
      b.cyl([x - 0.02, TY, TZ], [x + 0.02, TY, TZ], TR + 0.008, TR + 0.008, 22, GUN_D, false);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 0.4, (dk + 1.6) / 2, TZ + sz * 0.44, 0.05, 1.6 - dk, 0.05, GUN);
    for (const sz of [-1, 1]) b.box(0, 1.6 - 0.02, TZ + sz * 0.44, 0.85, 0.04, 0.04, GUN);
    for (const sx of [-1, 1]) b.box(sx * 0.4, 1.6 - 0.02, TZ, 0.04, 0.04, 0.92, GUN);
    for (const sx of [-1, 1]) b.box(sx * 0.4, dk + 0.04, TZ, 0.05, 0.05, 0.92, GUN);
    return b;
  }
  function trailerLow() {
    const b = new MB(), dk = T.DECK;
    b.box(0, dk - 0.07, (T.D0 + T.D1) / 2, 2 * T.DW, 0.15, T.D1 - T.D0, DECKC);
    b.box(0, dk - 0.12, (T.D0 + T.D1) / 2, 2 * T.DW + 0.06, 0.06, T.D1 - T.D0, TSTEEL);
    b.beam([0, 0.5, T.COUPLER], [0, dk - 0.1, T.D1], 0.12, TSTEEL);
    b.box(0, dk + 0.2, -1.95, 1.7, 0.33, 1.05, BONE);
    b.box(-0.45, dk + 0.2, -0.85, 0.84, 0.33, 1.0, SAFE);
    b.box(0.45, dk + 0.2, -0.85, 0.84, 0.33, 1.0, BONE);
    b.box(0, dk + 0.17, 0.12, 1.5, 0.28, 0.6, GUN);
    b.cyl([-0.4, dk + 0.47, 0.92], [0.4, dk + 0.47, 0.92], 0.42, 0.42, 8, BONE);
    b.box(0, dk + 0.34, T.D1 - 0.02, 2 * T.DW - 0.06, 0.24, 0.02, SAFE);
    for (const s of [-1, 1]) {
      b.box(s * (T.DW + 0.19), dk + 0.12, (T.AX1 + T.AX2) / 2, 0.28, 0.06, 1.7, GUN);
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
