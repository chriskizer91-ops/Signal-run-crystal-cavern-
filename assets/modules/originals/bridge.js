window.MODDEF = { fn: (function (K) {
  // Steel deck-arch highway bridge. Local frame: deck along X, road surface at y = 0, arch hangs below.
  const { MB, tr, rnd, norm } = K;

  // ---------- palette ----------
  const STEEL = [0.44, 0.46, 0.49, 0.17], RUST = [0.47, 0.29, 0.18, 0.08], DARKSTEEL = [0.30, 0.31, 0.32, 0.25];
  const CONC = [0.74, 0.70, 0.64, 1], SKEW = [0.71, 0.63, 0.55, 1], SIDEWALK = [0.80, 0.78, 0.74, 1], CURB = [0.86, 0.85, 0.82, 1];
  const ASPH = [0.22, 0.22, 0.23, 0], YELLOW = [0.93, 0.74, 0.10, 0], WHITE = [0.93, 0.93, 0.90, 0];
  const BRONZE = [0.42, 0.30, 0.15, 0.3], GOLD = [0.88, 0.72, 0.36, 0.35], LAMP = [1.0, 0.95, 0.80, 0.4], RED = [0.95, 0.12, 0.08, 0.3];
  const shade = (c, k) => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k), c[3] || 0];
  const mix = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t, a[3] + ((c[3] || 0) - a[3]) * t];

  // ---------- arch geometry (rib plane is XY, ribs at z = +-ZR) ----------
  const ZR = 5, HALF = 220, CROWN = -10, RISE = 90;       // centreline: crown y=-10, springing y=-100 at x=+-220
  const CH = 0.5, CW = 0.8;                                 // chord half-height (in plane) and half-width (z)
  const Cc = s => [HALF * s, CROWN - RISE * s * s];
  const Nn = s => { const n = norm([180 * s, HALF, 0]); return [n[0], n[1]]; };
  const Tt = s => { const t = norm([HALF, -2 * RISE * s, 0]); return [t[0], t[1]]; };
  const depth = s => 4 + 3 * s * s;                        // out-to-out rib depth
  const off = s => depth(s) / 2 - CH;                      // chord centre offset from rib centreline
  const topP = s => { const c = Cc(s), n = Nn(s), e = off(s); return [c[0] + n[0] * e, c[1] + n[1] * e]; };
  const botP = s => { const c = Cc(s), n = Nn(s), e = off(s); return [c[0] - n[0] * e, c[1] - n[1] * e]; };
  function solveTop(X) { let lo = -1.2, hi = 1.2; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (topP(m)[0] < X) lo = m; else hi = m; } return (lo + hi) / 2; }
  const NP = 40, PANEL = 5.5;                               // joints at top-chord x = 5.5 k, k = -40..40
  const JS = []; for (let k = -NP; k <= NP; k++) JS.push(solveTop(PANEL * k));
  const SE = JS[JS.length - 1];                             // rib end parameter (top chord at x = 220)
  const topY = X => { const s = solveTop(X); return topP(s)[1]; };

  // deck structure levels
  const SLAB_B = -0.35, GIRD_B = -2.55, FB_B = -1.75, STR_B = -1.25, DECK_END = 290;
  const COLS = []; for (let k = -10; k <= 10; k++) COLS.push(22 * k);
  const PIERS = [-264, -242, 242, 264];
  const SEGS = []; for (let x = -DECK_END; x < DECK_END - 0.1; x += 22) SEGS.push([x, Math.min(DECK_END, x + 22)]);   // 22 m girder pieces

  // ---------- helpers ----------
  function obox(b, c, t, n, sx, sy, sz, col) {      // box oriented with x along t, y along n (both in XY), z along Z
    b.push(new Float64Array([t[0], t[1], 0, 0, n[0], n[1], 0, 0, 0, 0, 1, 0, c[0], c[1], c[2], 1])); b.box(0, 0, 0, sx, sy, sz, col); b.pop();
  }
  // rectangular tube following a curve in an XY plane at depth z; hh = half size in plane, hw = half size along z
  function sweep(b, pts, z, hh, hw, colFn, caps) {
    const n = pts.length, nr = [];
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)], t = norm([c[0] - a[0], c[1] - a[1], 0]); nr.push([-t[1], t[0]]); }
    const corner = (i, sn, sz) => [pts[i][0] + nr[i][0] * hh * sn, pts[i][1] + nr[i][1] * hh * sn, z + hw * sz];
    for (let i = 0; i < n - 1; i++) {
      const col = colFn(i);
      for (const sn of [1, -1]) {                            // top / bottom faces, smooth normals
        const ids = [[i, -1], [i + 1, -1], [i + 1, 1], [i, 1]].map(([j, sz]) => { const p = corner(j, sn, sz); return b.v(p[0], p[1], p[2], nr[j][0] * sn, nr[j][1] * sn, 0, col); });
        b.quad(ids[0], ids[1], ids[2], ids[3]);
      }
      for (const sz of [1, -1]) {
        const ids = [[i, -1], [i + 1, -1], [i + 1, 1], [i, 1]].map(([j, sn]) => { const p = corner(j, sn, sz); return b.v(p[0], p[1], p[2], 0, 0, sz, col); });
        b.quad(ids[0], ids[1], ids[2], ids[3]);
      }
    }
    if (caps) for (const i of [0, n - 1]) b.plate(corner(i, 1, 1), corner(i, -1, 1), corner(i, -1, -1), corner(i, 1, -1), colFn(Math.min(i, n - 2)));
  }
  // H-section member in an XY plane (two flanges facing +-z and a web): a, b are [x,y]; wz = depth along z; wp = flange width in plane
  function hmem(b, a, c, z, wz, wp, col) {
    for (const s of [-1, 1]) b.beam([a[0], a[1], z + s * (wz / 2 - 0.03)], [c[0], c[1], z + s * (wz / 2 - 0.03)], 0.06, col, wp);
    b.beam([a[0], a[1], z], [c[0], c[1], z], wz - 0.08, col, 0.05);
  }
  // I-beam running along x (flanges horizontal)
  function ibeamX(b, x0, x1, z, yTop, h, fw, col) {
    const xm = (x0 + x1) / 2, L = x1 - x0;
    b.box(xm, yTop - 0.025, z, L, 0.05, fw, col); b.box(xm, yTop - h + 0.025, z, L, 0.05, fw, col); b.box(xm, yTop - h / 2, z, L, h - 0.1, 0.035, col);
  }
  function ibeamZ(b, z0, z1, x, yTop, h, fw, col) {
    const zm = (z0 + z1) / 2, L = z1 - z0;
    b.box(x, yTop - 0.025, zm, fw, 0.05, L, col); b.box(x, yTop - h + 0.025, zm, fw, 0.05, L, col); b.box(x, yTop - h / 2, zm, 0.035, h - 0.1, L, col);
  }
  // XY polygon (convex) extruded along z
  function prismXY(b, poly, z0, z1, col) {
    b.push(new Float64Array([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]));   // local (x, y, z) -> world (x, -z, y)
    b.extrude(poly.map(p => [p[0], -p[1]]), z0, z1, col); b.pop();
  }

  // ---------- 5x7 font for the name plaque ----------
  const FONT = {
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'], N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'], Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'], 6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
  };
  // text drawn in a local frame: u along the plaque, v up; place(u, v) -> world box call
  function text(b, str, u0, v0, px, put) {
    for (let ci = 0; ci < str.length; ci++) {
      const g = FONT[str[ci]] || FONT[' '];
      for (let r = 0; r < 7; r++) {
        let c = 0; while (c < 5) { if (g[r][c] === '1') { let e = c; while (e + 1 < 5 && g[r][e + 1] === '1') e++; put(u0 + (ci * 6 + (c + e + 1) / 2) * px, v0 + (6 - r + 0.5) * px, (e - c + 1) * px, px); c = e + 1; } else c++; }
      }
    }
  }

  // =====================================================================================
  function build(detail) {
    const b = new MB(), r = rnd(4471);
    const steel = () => shade(STEEL, 0.9 + 0.16 * r());
    const jointCol = () => mix(steel(), RUST, 0.08 + 0.5 * r() * r() * r());
    if (!detail) return buildLow(b);

    // ---------------- DECK ----------------
    // concrete slab and fascia
    for (let x = -DECK_END; x < DECK_END; x += 20) {
      const k = 0.94 + 0.1 * r();
      b.box(x + 10, -0.215, 0, 20, 0.27, 12, shade(CONC, k));
      b.box(x + 10, -0.04, 0, 20, 0.08, 8.8, shade(ASPH, 0.92 + 0.16 * r()));               // asphalt
      for (const s of [-1, 1]) {
        b.box(x + 10, 0.06, s * 5.08, 20, 0.28, 1.36, shade(SIDEWALK, 0.95 + 0.07 * r()));   // sidewalk
        b.box(x + 10, 0.07, s * 4.5, 20, 0.3, 0.2, shade(CURB, 0.97 + 0.05 * r()));          // curb
        b.box(x + 10, -0.15, s * 5.93, 20, 0.85, 0.14, shade(steel(), 0.95));               // steel fascia channel
        b.box(x + 10, 0.27, s * 5.83, 20, 0.14, 0.34, shade(CONC, 1.02));                     // railing plinth
      }
    }
    // sidewalk panel joints
    for (let x = -DECK_END + 3; x < DECK_END; x += 3) for (const s of [-1, 1]) b.box(x, 0.202, s * 5.08, 0.03, 0.006, 1.3, [0.5, 0.49, 0.46, 0]);
    // asphalt patches and wheel-path wear
    for (let i = 0; i < 26; i++) { const x = -280 + 560 * r(), z = (r() - 0.5) * 7, l = 1.5 + 5 * r(), w = 0.8 + 1.6 * r(); b.box(x, 0.003, z, l, 0.006, w, shade(ASPH, r() < 0.5 ? 0.75 : 1.25)); }
    for (const z of [-2.9, -1.0, 1.0, 2.9]) for (let x = -DECK_END; x < DECK_END; x += 58) b.box(x + 29, 0.002, z, 58, 0.004, 0.75, shade(ASPH, 1.05 + 0.04 * r()));
    // markings: double yellow centre line, white edge lines
    for (let x = -DECK_END; x < DECK_END; x += 58) {
      for (const z of [-0.13, 0.13]) b.box(x + 29, 0.006, z, 58, 0.012, 0.11, YELLOW);
      for (const z of [-4.0, 4.0]) b.box(x + 29, 0.006, z, 58, 0.012, 0.16, WHITE);
    }
    // railings: posts every 2.5 m, five rails
    for (const s of [-1, 1]) {
      const zp = s * 5.86;
      for (let x = -DECK_END + 1.25; x < DECK_END; x += 2.5) {
        const c = steel();
        b.box(x, 0.36, zp, 0.3, 0.03, 0.26, DARKSTEEL);                                      // base plate
        for (const bx of [-0.1, 0.1]) b.box(x + bx, 0.39, zp - s * 0.08, 0.05, 0.04, 0.05, RUST);  // anchor bolts
        b.box(x, 0.93, zp, 0.1, 1.12, 0.08, c);
      }
      for (let x = -DECK_END; x < DECK_END; x += 20) {
        b.box(x + 10, 1.52, zp, 20, 0.07, 0.11, steel());                                    // top rail cap
        for (const y of [0.62, 0.86, 1.1, 1.32]) b.box(x + 10, y, zp - s * 0.06, 20, 0.05, 0.04, steel());
      }
    }
    // expansion joints (finger plates) over the end and quarter columns
    for (const xj of [-220, -110, 110, 220]) {
      b.box(xj, 0.004, 0, 0.6, 0.012, 8.8, DARKSTEEL);
      for (let z = -4.3; z <= 4.31; z += 0.2) b.box(xj + ((Math.round(z * 5) & 1) ? 0.12 : -0.12), 0.012, z, 0.24, 0.006, 0.1, [0.4, 0.4, 0.41, 0.3]);
      b.box(xj, 0.012, 0, 0.04, 0.006, 8.8, [0.05, 0.05, 0.05, 0]);
      for (const s of [-1, 1]) b.box(xj, 0.205, s * 5.08, 0.5, 0.012, 1.3, DARKSTEEL);
    }
    // drain scuppers along both curbs
    for (let x = -DECK_END + 5.5; x < DECK_END; x += 11) for (const s of [-1, 1]) {
      b.box(x, 0.005, s * 4.25, 0.6, 0.01, 0.3, [0.12, 0.12, 0.12, 0.2]);
      for (let g = -1; g <= 1; g++) b.box(x + g * 0.15, 0.011, s * 4.25, 0.03, 0.004, 0.28, [0.35, 0.35, 0.35, 0.2]);
      if (Math.abs(x) < 288) b.cyl([x, SLAB_B, s * 4.25], [x, SLAB_B - 1.1, s * 4.25], 0.08, 0.08, 5, DARKSTEEL, false);
    }
    // lamp posts every 40 m, both sides
    for (let x = -260; x <= 260; x += 40) for (const s of [-1, 1]) {
      const xl = x + s * 10, z = s * 5.45, c = shade(STEEL, 1.05);
      b.box(xl, 0.32, z, 0.5, 0.25, 0.5, CONC);
      b.cyl([xl, 0.44, z], [xl, 9.6, z], 0.13, 0.08, 10, c, false);
      b.tube([[xl, 9.0, z], [xl, 9.75, z - s * 0.4], [xl, 10.0, z - s * 1.2], [xl, 10.02, z - s * 2.3]], 0.06, 6, c);
      b.box(xl, 9.98, z - s * 2.75, 0.45, 0.22, 1.0, shade(STEEL, 0.8));
      b.box(xl, 9.85, z - s * 2.75, 0.36, 0.05, 0.75, LAMP);
      b.box(xl, 1.6, z + s * 0.14, 0.16, 0.3, 0.06, DARKSTEEL);                              // access hatch
    }

    // ------- under-deck framing -------
    for (const s of [-1, 1]) {                                                               // main plate girders on the column lines
      const z = s * ZR;
      for (const [x0, x1] of SEGS) {
        const c = steel(), xm = (x0 + x1) / 2, L = x1 - x0;
        b.box(xm, SLAB_B - 0.03, z, L, 0.06, 0.8, c); b.box(xm, GIRD_B + 0.04, z, L, 0.08, 0.8, c);
        b.box(xm, (SLAB_B + GIRD_B) / 2, z, L, SLAB_B - GIRD_B - 0.14, 0.04, c);
      }
      for (let x = -DECK_END + 1.375; x < DECK_END; x += 2.75) for (const f of [-1, 1]) b.box(x, (SLAB_B + GIRD_B) / 2, z + f * 0.12, 0.04, SLAB_B - GIRD_B - 0.16, 0.2, shade(STEEL, 0.85));
      for (let x = -DECK_END + 11; x < DECK_END; x += 22) for (const f of [-1, 1]) b.box(x, (SLAB_B + GIRD_B) / 2, z + f * 0.03, 0.9, 1.9, 0.04, jointCol());   // web splices
    }
    for (let x = -DECK_END + 2.75; x < DECK_END; x += 5.5) {                                  // floor beams
      ibeamZ(b, -ZR + 0.05, ZR - 0.05, x, SLAB_B, SLAB_B - FB_B, 0.35, steel());
      for (const s of [-1, 1]) b.box(x, (SLAB_B + FB_B) / 2, s * (ZR - 0.15), 0.5, 1.2, 0.2, jointCol());   // connection angles
    }
    for (const z of [-3.3, -1.1, 1.1, 3.3]) for (const [x0, x1] of SEGS) ibeamX(b, x0, x1, z, SLAB_B, SLAB_B - STR_B, 0.3, steel());
    for (let x = -DECK_END + 5.5; x < DECK_END; x += 11) for (const s of [-1, 1]) b.beam([x - 5.5, GIRD_B + 0.1, s * (ZR - 0.4)], [x, GIRD_B + 0.1, 0], 0.14, shade(STEEL, 0.8)); // bottom lateral bracing
    for (const xc of [...COLS, ...PIERS]) {                                                  // cap cross-girders over each support
      b.box(xc, (SLAB_B + GIRD_B) / 2, 0, 0.7, SLAB_B - GIRD_B - 0.02, 2 * ZR - 0.1, shade(steel(), 0.95));
      for (const s of [-1, 1]) b.box(xc, GIRD_B - 0.22, s * ZR, 1.4, 0.36, 1.4, DARKSTEEL);    // bearings
    }
    // maintenance catwalk under the centre of the deck
    const CWY = -3.0;
    for (let x = -231; x < 231; x += 11) {
      b.box(x + 5.5, CWY - 0.04, 0, 11, 0.08, 1.1, [0.42, 0.43, 0.44, 0.2]);
      for (let g = 0; g < 11; g += 1) b.box(x + g + 0.5, CWY + 0.003, 0, 0.04, 0.006, 1.05, [0.3, 0.3, 0.31, 0.2]);
      for (const s of [-1, 1]) { b.box(x + 5.5, CWY + 1.0, s * 0.58, 11, 0.05, 0.05, [0.85, 0.7, 0.15, 0.15]); b.box(x + 5.5, CWY + 0.5, s * 0.58, 11, 0.04, 0.04, [0.85, 0.7, 0.15, 0.15]); b.box(x + 5.5, CWY + 0.05, s * 0.58, 11, 0.1, 0.02, shade(STEEL, 0.8)); }
    }
    for (let x = -228.25; x < 229; x += 5.5) {
      for (const s of [-1, 1]) {
        b.box(x, CWY + 0.52, s * 0.58, 0.05, 1.04, 0.05, [0.85, 0.7, 0.15, 0.15]);
        b.beam([x, FB_B, s * 0.58], [x, CWY + 1.0, s * 0.58], 0.04, DARKSTEEL);
      }
    }

    // ---------------- ARCH RIBS ----------------
    for (const zs of [-1, 1]) {
      const z = zs * ZR;
      // chords as continuous box sections, 3 sub-segments per panel
      const tp = [], bp = []; const segCols = [];
      for (let k = 0; k < JS.length - 1; k++) for (let q = 0; q < 3; q++) { const s = JS[k] + (JS[k + 1] - JS[k]) * q / 3; tp.push(topP(s)); bp.push(botP(s)); }
      tp.push(topP(SE)); bp.push(botP(SE));
      for (let i = 0; i < tp.length; i++) segCols.push(steel());
      sweep(b, tp, z, CH, CW, i => segCols[i], true);
      sweep(b, bp, z, CH, CW, i => shade(segCols[i], 0.97), true);
      // flange lips on the chords (thin wider plates top and bottom)
      const lip = (pts, sgn) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)], t = norm([c[0] - a[0], c[1] - a[1], 0]); return [p[0] - t[1] * CH * sgn, p[1] + t[0] * CH * sgn]; });
      sweep(b, lip(tp, 1), z, 0.03, CW + 0.12, () => shade(STEEL, 1.08), true);
      sweep(b, lip(bp, -1), z, 0.03, CW + 0.12, () => shade(STEEL, 1.04), true);
      // verticals, diagonals and gusset plates
      for (let j = 0; j < JS.length; j++) {
        const s = JS[j], t = Tt(s), n = Nn(s), T = topP(s), Bp = botP(s), k = j - NP;
        hmem(b, [T[0] - n[0] * CH, T[1] - n[1] * CH], [Bp[0] + n[0] * CH, Bp[1] + n[1] * CH], z, 1.3, 0.55, steel());
        for (const P of [T, Bp]) {
          const inward = P === T ? -1 : 1, gc = jointCol();
          for (const f of [-1, 1]) obox(b, [P[0] + n[0] * inward * (CH + 0.25) / 2, P[1] + n[1] * inward * (CH + 0.25) / 2, z + f * (CW + 0.03)], t, n, 2.2, CH + 0.65, 0.05, gc);
        }
        if (j < JS.length - 1) {                                                             // diagonal of the panel j..j+1
          const s2 = JS[j + 1], T2 = topP(s2), B2 = botP(s2);
          const outward = k >= 0;                                                            // diagonals fall away from the crown
          const a = outward ? T : T2, c = outward ? B2 : Bp;
          hmem(b, a, c, z, 1.2, 0.45, steel());
        }
      }
      // pin bearings at the springings
      for (const se of [-1, 1]) {
        const s = SE * se, c = Cc(s), t = Tt(s), n = Nn(s), out = se;                       // outward along tangent sign
        const e = [c[0] + t[0] * out * 0.6, c[1] + t[1] * out * 0.6];
        obox(b, [e[0], e[1], z], t, n, 1.2, depth(s) + 0.6, 2.2, DARKSTEEL);
        const pc = [c[0] + t[0] * out * 1.6, c[1] + t[1] * out * 1.6];
        b.cyl([pc[0], pc[1], z - 1.6], [pc[0], pc[1], z + 1.6], 0.75, 0.75, 16, shade(DARKSTEEL, 1.2));
        obox(b, [c[0] + t[0] * out * 2.3, c[1] + t[1] * out * 2.3, z], t, n, 1.4, 3.6, 2.8, shade(DARKSTEEL, 0.9));   // shoe
      }
    }
    // navigation lights at the crown
    for (const zs of [-1, 1]) {
      const B0 = botP(0);
      b.box(0, B0[1] - CH - 0.2, zs * ZR, 0.5, 0.4, 0.5, DARKSTEEL);
      b.sphere(0, B0[1] - CH - 0.55, zs * ZR, 0.28, 10, RED);
      b.box(0, topP(0)[1], zs * (ZR + CW + 0.25), 0.4, 0.4, 0.3, DARKSTEEL);
      b.sphere(0, topP(0)[1], zs * (ZR + CW + 0.45), 0.22, 8, RED);
    }

    // ---------------- LATERAL BRACING BETWEEN RIBS ----------------
    const zi = ZR - CW;
    for (let j = 0; j < JS.length; j++) {
      const s = JS[j], T = topP(s), Bp = botP(s);
      for (const P of [T, Bp]) b.beam([P[0], P[1], -zi], [P[0], P[1], zi], 0.55, steel());
      if (j < JS.length - 1) {
        const T2 = topP(JS[j + 1]), B2 = botP(JS[j + 1]);
        for (const [P, Q] of [[T, T2], [Bp, B2]]) { b.beam([P[0], P[1], -zi], [Q[0], Q[1], zi], 0.32, steel()); b.beam([P[0], P[1], zi], [Q[0], Q[1], -zi], 0.32, steel()); }
      }
      if ((j - NP) % 4 === 0) {                                                              // sway frames under each column pair
        b.beam([T[0], T[1] - 0.5, -zi], [Bp[0], Bp[1] + 0.5, zi], 0.36, steel());
        b.beam([T[0], T[1] - 0.5, zi], [Bp[0], Bp[1] + 0.5, -zi], 0.36, steel());
        b.box(T[0], T[1], 0, 1.2, 1.0, 0.06, jointCol());
      }
    }

    // ---------------- SPANDREL COLUMNS ----------------
    const colTop = GIRD_B - 0.4;
    for (const xc of COLS) {
      const s = solveTop(xc), yb = topP(s)[1] + CH * Nn(s)[1] + 0.05, H = colTop - yb;
      const big = Math.abs(xc) > 150, wx = big ? 1.3 : 1.05, wz = big ? 1.5 : 1.25;
      for (const zs of [-1, 1]) {
        const z = zs * ZR, c = steel();
        b.box(xc, yb + H / 2, z, wx, H, wz * 0.8, c);                                        // box column
        for (const f of [-1, 1]) b.box(xc, yb + H / 2, z + f * wz * 0.45, wx + 0.24, H, 0.06, shade(c, 0.93));   // flange plates
        for (let y = yb + 3; y < colTop - 1; y += 4) b.box(xc, y, z, wx + 0.1, 0.18, wz * 0.82, shade(c, 1.06)); // diaphragm bands
        b.box(xc, yb + 0.1, z, wx + 1.2, 0.2, wz + 0.9, mix(c, RUST, 0.4));                  // base plate
        for (const f of [-1, 1]) { b.box(xc + f * (wx / 2 + 0.3), yb + 0.6, z, 0.6, 1.0, 0.05, mix(c, RUST, 0.3)); b.box(xc, yb + 0.6, z + f * (wz / 2 + 0.3), 0.05, 1.0, 0.6, mix(c, RUST, 0.3)); }
        b.box(xc, colTop - 0.25, z, wx + 0.5, 0.5, wz + 0.4, shade(c, 0.9));                 // cap
      }
      if (H > 14) {                                                                          // cross bracing between the pair
        const levels = []; const n = Math.max(1, Math.round((H - 6) / 13));
        for (let i = 0; i <= n; i++) levels.push(colTop - 3.2 - (H - 6) * i / n);
        for (let i = 0; i < levels.length; i++) {
          const y = levels[i];
          b.box(xc, y, 0, 0.6, 0.8, 2 * ZR - 0.8, steel());
          if (i < levels.length - 1) {
            const y2 = levels[i + 1];
            b.beam([xc, y - 0.3, -ZR + 0.6], [xc, y2 + 0.3, ZR - 0.6], 0.4, steel());
            b.beam([xc, y - 0.3, ZR - 0.6], [xc, y2 + 0.3, -ZR + 0.6], 0.4, steel());
            b.box(xc, (y + y2) / 2, 0, 0.5, 1.0, 1.0, jointCol());
          }
        }
      }
    }

    // ---------------- SKEWBACKS ----------------
    for (const se of [-1, 1]) for (const zs of [-1, 1]) {
      const poly = skewPoly(se), z0 = zs > 0 ? 1.2 : -9.5, z1 = zs > 0 ? 9.5 : -1.2;
      prismXY(b, poly, z0, z1, shade(SKEW, 0.95 + 0.08 * r()));
      // stepped collar and top coping
      const xi = poly[2][0], xo = poly[3][0];
      b.box((xi + xo) / 2, -92.85, (z0 + z1) / 2, Math.abs(xo - xi) + 0.6, 0.3, z1 - z0 + 0.6, shade(CONC, 1.04));
      for (let q = 0; q < 5; q++) { const zf = zs > 0 ? z1 : z0, L = 6 + 14 * r(); b.box(xo - se * (1.5 + 3.5 * q), -93 - L / 2, zf + zs * 0.02, 0.25 + 0.3 * r(), L, 0.04, shade(SKEW, 0.84 + 0.06 * r())); }   // water streaks
    }

    // ---------------- APPROACH PIERS (concrete) ----------------
    for (const xp of PIERS) {
      const yb = Math.abs(xp) < 250 ? -92.7 : -55;
      b.box(xp, GIRD_B - 0.9, 0, 2.4, 1.0, 13.0, shade(CONC, 1.03));                          // cap beam
      for (const zs of [-1, 1]) {
        const z = zs * ZR, H = GIRD_B - 1.4 - yb;
        b.box(xp, yb + H / 2, z, 2.0, H, 2.4, shade(CONC, 0.95 + 0.06 * r()));
        b.box(xp, yb + 1, z, 3.6, 2, 4.0, shade(CONC, 0.92));
      }
      for (let y = GIRD_B - 16; y > yb + 6; y -= 16) b.box(xp, y, 0, 1.6, 1.4, 2 * ZR - 2, shade(CONC, 0.98));         // tie beams
    }

    // ---------------- NAME PLAQUES ----------------
    for (const [xc, s] of [[-236, 1], [236, -1]]) {
      const zf = s * 5.62;                                                                   // faces the road
      b.box(xc, 0.92, zf + s * 0.02, 4.4, 1.0, 0.05, BRONZE);
      b.box(xc, 0.92, zf + s * 0.04, 4.55, 1.1, 0.03, DARKSTEEL);
      text(b, 'SIGNAL CANYON', -13 * 6 * 0.05 / 2, 0.52, 0.05, (u, v, w, h) => b.box(xc + (s > 0 ? -u : u), 0.42 + v, zf - s * 0.02, w, h, 0.03, GOLD));
      text(b, 'BRIDGE 1966', -11 * 6 * 0.05 / 2, 0.05, 0.05, (u, v, w, h) => b.box(xc + (s > 0 ? -u : u), 0.42 + v, zf - s * 0.02, w, h, 0.03, GOLD));
    }
    return b;
  }

  // skewback outline in XY for side se (+1 east, -1 west)
  function skewPoly(se) {
    const s = SE * se, c = Cc(s), t = Tt(s), n = Nn(s), e = depth(s) / 2 + 1.0, o = 2.9;   // face sits behind the shoe
    const fT = [c[0] + n[0] * e + t[0] * se * o, c[1] + n[1] * e + t[1] * se * o], fB = [c[0] - n[0] * e + t[0] * se * o, c[1] - n[1] * e + t[1] * se * o];
    const topYv = -93, botYv = -136, xo = 246 * se;
    const A = [fT[0] + se * 3.6, topYv];
    const P = [fB, fT, A, [xo, topYv], [xo, botYv], [fB[0] - se * 3, botYv]];
    return se > 0 ? P : P.reverse();
  }

  // =====================================================================================
  function buildLow(b) {
    const G = shade(STEEL, 0.95);
    b.box(0, -1.2, 0, 580, 2.6, 12, shade(CONC, 0.9));
    b.box(0, 0.02, 0, 580, 0.04, 8.8, ASPH);
    for (const s of [-1, 1]) b.box(0, 0.8, s * 5.85, 580, 1.1, 0.12, G);
    for (const zs of [-1, 1]) {
      const z = zs * ZR;
      for (let j = 0; j < JS.length - 4; j += 4) {
        const s0 = JS[j], s1 = JS[j + 4];
        b.beam([...topP(s0), z], [...topP(s1), z], 1.5, G);
        b.beam([...botP(s0), z], [...botP(s1), z], 1.5, G);
        const out = j - NP >= 0;
        b.beam(out ? [...topP(s0), z] : [...topP(s1), z], out ? [...botP(s1), z] : [...botP(s0), z], 0.9, G);
      }
    }
    for (let j = 0; j < JS.length; j += 8) { const T = topP(JS[j]); b.beam([T[0], T[1], -ZR], [T[0], T[1], ZR], 0.6, G); }
    for (const xc of COLS) { const yb = topY(xc); for (const zs of [-1, 1]) b.box(xc, (yb + GIRD_B) / 2, zs * ZR, 1.3, GIRD_B - yb, 1.4, G); }
    for (const se of [-1, 1]) for (const zs of [-1, 1]) prismXY(b, skewPoly(se), zs > 0 ? 1.2 : -9.5, zs > 0 ? 9.5 : -1.2, SKEW);
    for (const xp of PIERS) { const yb = Math.abs(xp) < 250 ? -92.7 : -55; for (const zs of [-1, 1]) b.box(xp, (yb + GIRD_B) / 2, zs * ZR, 2.0, GIRD_B - yb, 2.4, CONC); }
    return b;
  }

  return {
    name: 'bridge',
    items: [{
      name: 'arch_bridge', budget: 150000, build,
      colliders: [
        { type: 'box', x: 0, z: 0, hx: 290, hz: 6, rot: 0, top: 0, solid: false },
        { type: 'box', x: -236.4, z: -5.35, hx: 9.6, hz: 4.15, rot: 0, top: -92.7, solid: true },
        { type: 'box', x: -236.4, z: 5.35, hx: 9.6, hz: 4.15, rot: 0, top: -92.7, solid: true },
        { type: 'box', x: 236.4, z: -5.35, hx: 9.6, hz: 4.15, rot: 0, top: -92.7, solid: true },
        { type: 'box', x: 236.4, z: 5.35, hx: 9.6, hz: 4.15, rot: 0, top: -92.7, solid: true }
      ]
    }]
  };
}) };
