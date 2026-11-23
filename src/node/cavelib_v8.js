function CaveLib(cfg) {
  'use strict';
  // Level 1 of the cave system: an old mine (square shaft, timbered drifts) that broke into natural caves.
  // Everything is a signed distance: negative = open air inside the cave, positive = solid rock.
  const SX = cfg.sx, SZ = cfg.sz, TOP = cfg.top;
  const imul = Math.imul, floor = Math.floor, sqrt = Math.sqrt, abs = Math.abs, min = Math.min, max = Math.max;
  const CH = 24, YCUT = -24, SHW = 1.9, SHB = -50;               // chunk size, nothing meshed above YCUT, shaft half-width and bottom
  const STATION = { x: SX, y: -53, z: SZ, hx: 6.5, hy: 3, hz: 5.5, floor: -56 };
  const LIGHT = [SX, SHB - 1.5, SZ];
  const AMP = [1.15, 0.3, 0.03, 1.35, 0.25, 2.3, 1.2, 0.3];   // + smooth natural tube (the door drop: no ledges to snag on)   // + crystal cavern, rock columns                    // rock roughness by kind: natural tunnel, mine drift, shaft, natural room, mine room
  const AMPMAX = 2.9;
  const RIM = cfg.rim || null;                                   // ground heights around the shaft opening: above them is open air
  function rimH(x, z) {
    if (!RIM) return 1e9; const fx = (x - RIM.x0) / RIM.s, fz = (z - RIM.z0) / RIM.s;
    if (fx < 0 || fz < 0 || fx >= RIM.n - 1 || fz >= RIM.n - 1) return 1e9;
    const i = floor(fx), j = floor(fz), u = fx - i, v = fz - j, H = RIM.h, n = RIM.n;
    return (H[j * n + i] * (1 - u) + H[j * n + i + 1] * u) * (1 - v) + (H[(j + 1) * n + i] * (1 - u) + H[(j + 1) * n + i + 1] * u) * v;
  }

  /* ---------- noise ---------- */
  function h3(i, j, k, s) { let h = imul(i, 0x27d4eb2d) ^ imul(j, 0x165667b1) ^ imul(k, 0x1b873593) ^ imul(s, 0x9e3779b1); h = imul(h ^ (h >>> 15), 0x85ebca6b); h = imul(h ^ (h >>> 13), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vn(x, y, z, s) {
    const i = floor(x), j = floor(y), k = floor(z); let fx = x - i, fy = y - j, fz = z - k; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    const a = h3(i, j, k, s), b = h3(i + 1, j, k, s), c = h3(i, j + 1, k, s), d = h3(i + 1, j + 1, k, s), e = h3(i, j, k + 1, s), f = h3(i + 1, j, k + 1, s), g = h3(i, j + 1, k + 1, s), hh = h3(i + 1, j + 1, k + 1, s);
    const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (hh - g) * fx, y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy;
    return (y1 + (y2 - y1) * fz) * 2 - 1;
  }
  function vn1(t, s) { const i = floor(t); let f = t - i; f = f * f * (3 - 2 * f); const a = h3(i, 0, 0, s), b = h3(i + 1, 0, 0, s); return (a + (b - a) * f) * 2 - 1; }
  function fbm(x, y, z) { return vn(x * 0.13, y * 0.17, z * 0.13, 11) * 0.55 + vn(x * 0.31, y * 0.37, z * 0.31, 12) * 0.27 + vn(x * 0.73, y * 0.8, z * 0.73, 13) * 0.13 + vn(x * 1.7, y * 1.7, z * 1.7, 14) * 0.05; }

  /* ---------- the network (local coordinates from the shaft: dx, y, dz, radius) ---------- */
  const MINE = [   // drifts: points are floor-centre positions
    { name: 'main drift', pts: [[0, -56, 0], [40, -56, 10], [95, -57, 8], [150, -58, 25], [195, -59, 44]] },
    { name: 'north crosscut', pts: [[40, -56, 10], [45, -56, -40], [70, -56.5, -75]] },
    { name: 'south crosscut', pts: [[95, -57, 8], [100, -57, 60], [60, -57.5, 95], [22, -58, 108]] },
  ];
  const NAT = [    // natural passages: points are passage centres
    { name: 'north passage', pts: [[205, -63, 50, 5], [250, -61, 20, 5.5], [290, -64, -20, 4.5], [300, -66, -70, 5], [270, -68, -110, 5.5]] },
    { name: 'grotto', pts: [[270, -68, -110, 4.5], [230, -70, -140, 4], [190, -69, -150, 4.5], [175, -69, -150, 5]] },
    { name: 'east loop', pts: [[270, -68, -110, 4.5], [310, -70, -150, 4], [355, -72, -130, 3.6], [375, -73, -75, 4.2], [370, -70, -20, 3.8], [350, -67, 40, 4.4], [310, -66, 70, 5]] },
    { name: 'east passage', pts: [[205, -63, 50, 5.5], [255, -64, 65, 6.5], [310, -66, 70, 6], [345, -67, 95, 5.5], [385, -68, 110, 7]] },
    { name: 'south passage', pts: [[205, -64, 52, 5], [195, -66, 100, 5.5], [230, -70, 140, 4.5], [210, -74, 185, 5], [250, -78, 215, 4.5], [230, -82, 258, 4]] },
    { name: 'south spur', pts: [[210, -74, 185, 4], [165, -74, 200, 3.5], [130, -73, 175, 3.2]] },
    { name: 'squeeze', pts: [[205, -66, 45, 3.2], [235, -75, 10, 2.8], [250, -80, -40, 2.6], [220, -84, -62, 2.7], [215, -86, -95, 3.2]] },
    { name: 'pit', pts: [[230, -82, 258, 3.6], [231, -95, 260, 3.4], [232, -110, 261, 3.6], [233, -124, 263, 4]], straight: true },
  ];
  // the crystal cavern: a 190 m dome right under the first room. A sealed door in the station's south wall opens onto a
  // short drift that ends at a 78 m drop through the cavern roof. (It was designed 234 m east and 90 m deeper; COFF moves
  // every part of it, and its rock noise is sampled at the old spot so its shape stays exactly as tested.)
  const COFF = [-234, 90, -245];
  const sh = p => [p[0] + COFF[0], p[1] + COFF[1], p[2] + COFF[2], p[3]];
  const CAV = { c: [230 + COFF[0], -250 + COFF[1], 205 + COFF[2]], r: [95, 52, 80], pool: -292 + COFF[1] };
  const COLS = [[180, 170, 6.5], [282, 250, 5], [300, 168, 7.5], [168, 238, 4.5], [236, 146, 5.5], [262, 212, 3.6]].map(c => [c[0] + COFF[0], c[1] + COFF[2], c[2]]);   // rock columns: x, z, radius
  const DOOR = { x: 0, z: 5.5, floor: -56 };                      // the door sits in the station's south wall
  const ACCESS = [[0, -56, 3.5], [0, -56.4, 21]];               // drift from the door to the lip of the drop
  NAT.push(
    { name: 'door drop', pts: [[0, -57, 20, 3.6], [0, -85, 20, 4.4], [0, -110, 20, 5.0], [0, -134, 20, 5.6]], straight: true, smooth: true },
    ...[
      { name: 'west gallery', pts: [[142, -262, 205, 5.5], [115, -260, 198, 5], [88, -257, 214, 4.5], [72, -256, 230, 4.2]] },
      { name: 'east gallery', pts: [[322, -255, 200, 6], [352, -252, 190, 5.2], [374, -250, 168, 4.6], [380, -249, 145, 4.2]] },
      { name: 'north gallery', pts: [[226, -258, 128, 5], [221, -256, 100, 4.6], [206, -254, 80, 4.2], [190, -253, 66, 4]] },
      { name: 'south-west gallery', pts: [[160, -266, 262, 5], [138, -264, 286, 4.4], [120, -263, 302, 4]] },
      { name: 'low gallery', pts: [[300, -281, 252, 5.5], [330, -283, 276, 5], [352, -286, 296, 4.6]] },
    ].map(g => ({ name: g.name, pts: g.pts.map(sh) })),
  );
  const ROOMS = [  // natural rooms: centre, radii, floor
    { name: 'breakthrough hall', c: [205, -62, 50], r: [17, 9, 15], floor: -68 },
    { name: 'grotto end', c: [172, -68, -150], r: [8, 5, 7], floor: -71.5 },
    { name: 'east chamber', c: [392, -67, 112], r: [11, 6, 9], floor: -71 },
    { name: 'pit bottom', c: [234, -127, 265], r: [9, 5, 8], floor: -131 },
  ];

  /* ---------- segments ---------- */
  const S = [];   // [kind, path, ax, ay, az, bx, by, bz, ra, rb, extra]
  let pathId = 0;
  const L = (p) => [SX + p[0], p[1], SZ + p[2]];
  // shaft (kind 2) and the station room under it (kind 4)
  S.push([2, pathId++, SX, SHB, SZ, SX, TOP + 50, SZ, SHW, SHW, 0]);
  S.push([4, pathId++, STATION.x, STATION.y, STATION.z, STATION.hx, STATION.hy, STATION.hz, 0.5, 0, 0]);
  const minePaths = [];
  for (const m of MINE) {
    const pts = m.pts.map(L), id = pathId++; minePaths.push(pts);
    for (let i = 0; i < pts.length - 1; i++) S.push([1, id, pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], 0, 0, 0]);
  }
  { const a = L(ACCESS[0]), b = L(ACCESS[1]); S.push([1, pathId++, a[0], a[1], a[2], b[0], b[1], b[2], 0, 0, 0]); }   // the door drift: cut later, no timber
  const natPaths = [];
  function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)); }
  NAT.forEach((n, ni) => {
    const P = n.pts.map(p => [SX + p[0], p[1], SZ + p[2], p[3]]), id = pathId++, out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[min(P.length - 1, i + 2)], len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]), ns = Math.max(1, Math.ceil(len / 2.5));
      for (let s = (i === 0 ? 0 : 1); s <= ns; s++) out.push(n.straight ? p1.map((v, k) => v + (p2[k] - v) * s / ns) : cr(p0, p1, p2, p3, s / ns));
    }
    let acc = 0;
    for (let i = 0; i < out.length; i++) {      // wander and breathe, but leave the two ends where the design put them
      if (i) acc += Math.hypot(out[i][0] - out[i - 1][0], out[i][2] - out[i - 1][2]);
      if (n.straight) continue;
      const a = out[min(i + 1, out.length - 1)], b = out[max(i - 1, 0)], dx = a[0] - b[0], dz = a[2] - b[2], l = Math.hypot(dx, dz) || 1;
      const endK = min(1, i / 6, (out.length - 1 - i) / 6), w = vn1(acc / 22 + ni * 7.3, 21) * 4.2 * endK, v = vn1(acc / 17 + ni * 3.1, 22) * 1.3 * endK;
      out[i][0] += -dz / l * w; out[i][2] += dx / l * w; out[i][1] += v; out[i][3] *= 0.82 + 0.36 * (vn1(acc / 13 + ni * 5.7, 23) * 0.5 + 0.5);
    }
    natPaths.push(out);
    for (let i = 0; i < out.length - 1; i++) S.push([n.smooth ? 7 : 0, id, out[i][0], out[i][1], out[i][2], out[i + 1][0], out[i + 1][1], out[i + 1][2], out[i][3], out[i + 1][3], 0]);
  });
  for (const r of ROOMS) S.push([3, pathId++, SX + r.c[0], r.c[1], SZ + r.c[2], r.r[0], r.r[1], r.r[2], r.floor, 0, 0]);
  const CX = SX + CAV.c[0], CY = CAV.c[1], CZ = SZ + CAV.c[2], RX = CAV.r[0], RY = CAV.r[1], RZ = CAV.r[2], POOL = CAV.pool;
  S.push([5, pathId++, CX, CY, CZ, RX, RY, RZ, POOL, 0, 0]);
  const COLW = COLS.map(c => [SX + c[0], SZ + c[1], c[2]]);
  // the cavern floor: a bowl rising to the walls in flat ledges with steep cliffs between them
  function cavFloor(x, z) {
    const nx = x - COFF[0], nz = z - COFF[2], u = (x - CX) / RX, v = (z - CZ) / RZ, t = sqrt(u * u + v * v) + vn(nx * 0.021, 3.7, nz * 0.021, 31) * 0.16;
    const h = CY - RY + 4 - COFF[1] + 78 * Math.pow(max(0, t - 0.2), 1.5) + vn(nx * 0.05, 1.3, nz * 0.05, 33) * 1.5, step = 9, q = h / step, k = floor(q), f = q - k;
    const e = min(1, max(0, (f - 0.8) / 0.2));
    return (k + e * e * (3 - 2 * e)) * step + COFF[1] + vn(nx * 0.17, 0.5, nz * 0.17, 32) * 0.35;
  }
  function cavK(x, y, z) { const a = (x - CX) / RX, b = (y - CY) / RY, c = (z - CZ) / RZ; return sqrt(a * a + b * b + c * c); }   // 1 = the cavern wall
  const NS = S.length, SG = new Float64Array(NS * 11);
  S.forEach((s, i) => SG.set(s, i * 11));

  // bounds of each segment (for the lookup grid and the chunk list)
  function segBox(i) {
    const o = i * 11, k = SG[o];
    if (k === 2) return [SG[o + 2] - SHW, SHB - 1, SG[o + 4] - SHW, SG[o + 2] + SHW, TOP + 50, SG[o + 4] + SHW];
    if (k === 5) return [SG[o + 2] - SG[o + 5] - 6, SG[o + 3] - SG[o + 6] - 8, SG[o + 4] - SG[o + 7] - 6, SG[o + 2] + SG[o + 5] + 6, SG[o + 3] + SG[o + 6] + 6, SG[o + 4] + SG[o + 7] + 6];
    if (k === 3 || k === 4) return [SG[o + 2] - SG[o + 5], SG[o + 3] - SG[o + 6], SG[o + 4] - SG[o + 7], SG[o + 2] + SG[o + 5], SG[o + 3] + SG[o + 6], SG[o + 4] + SG[o + 7]];
    if (k === 1) { const e = 3.8; return [min(SG[o + 2], SG[o + 5]) - e, min(SG[o + 3], SG[o + 6]) - 0.5, min(SG[o + 4], SG[o + 7]) - e, max(SG[o + 2], SG[o + 5]) + e, max(SG[o + 3], SG[o + 6]) + 4.5, max(SG[o + 4], SG[o + 7]) + e]; }
    const r = max(SG[o + 8], SG[o + 9]); return [min(SG[o + 2], SG[o + 5]) - r, min(SG[o + 3], SG[o + 6]) - r, min(SG[o + 4], SG[o + 7]) - r, max(SG[o + 2], SG[o + 5]) + r, max(SG[o + 3], SG[o + 6]) + r, max(SG[o + 4], SG[o + 7]) + r];
  }
  // lookup grid: 12 m cells, each holds the segments (sorted by passage) that can matter there
  const GC = 12, PAD = AMPMAX + 3.5, cells = new Map();
  const ck = (i, j, k) => (i * 73856093) ^ (j * 19349663) ^ (k * 83492791);
  const boxes = [];
  for (let i = 0; i < NS; i++) {
    const b = segBox(i); boxes.push(b);
    const i0 = floor((b[0] - PAD) / GC), i1 = floor((b[3] + PAD) / GC), j0 = floor((b[1] - PAD) / GC), j1 = floor((min(b[4], YCUT + 30) + PAD) / GC), k0 = floor((b[2] - PAD) / GC), k1 = floor((b[5] + PAD) / GC);
    for (let a = i0; a <= i1; a++) for (let c = j0; c <= j1; c++) for (let e = k0; e <= k1; e++) { const key = ck(a, c, e); let l = cells.get(key); if (!l) cells.set(key, l = []); l.push(i); }
  }
  for (const [key, l] of cells) cells.set(key, Int32Array.from(l));   // already in passage order: segments were added path by path

  /* ---------- distance to one segment ---------- */
  let gFloor = 0;   // floor height of the last segment measured (for smoother floors)
  function segD(i, x, y, z) {
    const o = i * 11, k = SG[o], ax = SG[o + 2], ay = SG[o + 3], az = SG[o + 4];
    if (k === 0 || k === 7) {
      const bx = SG[o + 5] - ax, by = SG[o + 6] - ay, bz = SG[o + 7] - az, px = x - ax, py = y - ay, pz = z - az;
      let t = (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz); t = t < 0 ? 0 : t > 1 ? 1 : t;
      const r = SG[o + 8] + (SG[o + 9] - SG[o + 8]) * t, dx = px - bx * t, dy = (py - by * t) * 1.3, dz = pz - bz * t, fl = ay + by * t - 0.62 * r;
      gFloor = fl; const d = (sqrt(dx * dx + dy * dy + dz * dz) - r) / 1.3;
      return d > fl - y ? d : fl - y;
    }
    if (k === 1) {
      const bx = SG[o + 5] - ax, bz = SG[o + 7] - az, len = sqrt(bx * bx + bz * bz), ux = bx / len, uz = bz / len, px = x - ax, pz = z - az;
      const along = px * ux + pz * uz, t = along / len, tc = t < 0 ? 0 : t > 1 ? 1 : t, fl = ay + (SG[o + 6] - ay) * tc;
      const out = along < -1.5 ? -1.5 - along : along > len + 1.5 ? along - len - 1.5 : 0;
      const perp = abs(-px * uz + pz * ux), vy = y - fl - 2.0, rr = vy > 0 ? 1.1 : 0.3;
      const qx = perp - 2.25 + rr, qy = abs(vy) - 2.0 + rr, ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0;
      gFloor = fl;
      return sqrt(ox * ox + oy * oy + out * out) + (out > 0 ? 0 : min(max(qx, qy), 0)) - rr;
    }
    if (k === 2) { gFloor = -1e9; const d = max(abs(x - ax), abs(z - az)) - SHW; return d > ay - y ? d : ay - y; }
    if (k === 3) {
      const rx = SG[o + 5], ry = SG[o + 6], rz = SG[o + 7], qx = (x - ax) / rx, qy = (y - ay) / ry, qz = (z - az) / rz, fl = SG[o + 8];
      gFloor = fl; const d = (sqrt(qx * qx + qy * qy + qz * qz) - 1) * min(rx, ry, rz);
      return d > fl - y ? d : fl - y;
    }
    if (k === 5) {
      const qx = (x - ax) / RX, qy = (y - ay) / RY, qz = (z - az) / RZ, fl = cavFloor(x, z);
      gFloor = fl; const d = (sqrt(qx * qx + qy * qy + qz * qz) - 1) * RY, df = (fl - y) * 0.3;
      return d > df ? d : df;
    }
    const rr = SG[o + 8], qx = abs(x - ax) - SG[o + 5] + rr, qy = abs(y - ay) - SG[o + 6] + rr, qz = abs(z - az) - SG[o + 7] + rr;
    gFloor = ay - SG[o + 6];
    return sqrt((qx > 0 ? qx * qx : 0) + (qy > 0 ? qy * qy : 0) + (qz > 0 ? qz * qz : 0)) + min(max(qx, qy, qz), 0) - rr;
  }
  /* ---------- the whole cave ---------- */
  let gKind = 0, gFl = 0;
  function base(x, y, z) {
    const l = cells.get(ck(floor(x / GC), floor(y / GC), floor(z / GC)));
    if (!l) {                                    // above the cave levels only the shaft exists, and the open air over the ground
      gKind = 2; gFl = -1e9; let r = min(40, segD(0, x, y, z));
      if (y > TOP - 30) { const g = rimH(x, z); if (g - y < r) r = g - y; }
      return r;
    }
    let res = 1e9, path = -1, pm = 1e9, best = 1e9, bk = 0, bf = 0;
    for (let q = 0; q < l.length; q++) {
      const i = l[q], p = SG[i * 11 + 1], d = segD(i, x, y, z);
      if (d < best) { best = d; bk = SG[i * 11]; bf = gFloor; }
      if (p !== path) { if (path >= 0) res = smin(res, pm); path = p; pm = d; } else if (d < pm) pm = d;
    }
    res = smin(res, pm); gKind = bk; gFl = bf;
    if (x > CX - RX && x < CX + RX && z > CZ - RZ && z < CZ + RZ && y < CY + RY && y > CY - RY - 10) {
      for (let c = 0; c < COLW.length; c++) {
        const cw = COLW[c], dx = x - cw[0], dz = z - cw[1], r0 = cw[2]; if (abs(dx) > r0 * 2 + 4 || abs(dz) > r0 * 2 + 4) continue;
        const tt = min(1, max(0, (y - (CY - RY)) / (2 * RY))), w = abs(2 * tt - 1), r = r0 * (0.62 + 0.55 * w * w * w) + vn((x - COFF[0]) * 0.4, (y - COFF[1]) * 0.15, (z - COFF[2]) * 0.4, 41) * 0.7;
        const dc = sqrt(dx * dx + dz * dz) - r; if (-dc > res - 2.5) { const h = max(2.5 - abs(res + dc), 0) / 2.5; res = max(res, -dc) + h * h * 2.5 * 0.25; if (-dc >= res - 0.01) gKind = 6; }
      }
    }
    return res;
  }
  function smin(a, b) { const k = 2.2, h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * 0.25; }
  function sdf(x, y, z) {
    const b = base(x, y, z); let a = AMP[gKind]; const lim = AMPMAX + 0.6;
    if (b > lim || b < -lim) return b;
    if (gKind === 5 || gKind === 6) { x -= COFF[0]; y -= COFF[1]; z -= COFF[2]; }   // the cavern keeps the rock it was designed with
    if (gKind === 5) { if (y < gFl - COFF[1] + 2.2) a = 0.12; else return b + a * fbm(x * 0.6, y * 0.6, z * 0.6) + 0.5 * fbm(x * 1.7, y * 1.7, z * 1.7); }
    else if (y < gFl - (gKind === 6 ? COFF[1] : 0) + 1.0) a *= 0.3;
    return b + a * fbm(x, y, z);
  }
  /* ---------- daylight falling down the shaft ---------- */
  const dayK = y => 0.9 * Math.exp(-(TOP - y) / 70);
  const DAY0 = dayK(SHB);
  function dayAt(x, y, z, nx, ny, nz) {
    if (max(abs(x - SX), abs(z - SZ)) < SHW + 0.3 && y > SHB - 0.5) return dayK(y) * (0.55 + 0.45 * max(0, ny + 0.4));
    const dx = LIGHT[0] - x, dy = LIGHT[1] - y, dz = LIGHT[2] - z, dist = sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 75) return 0;
    const ux = dx / dist, uy = dy / dist, uz = dz / dist; let t = 0.4;
    const px = x + nx * 0.3, py = y + ny * 0.3, pz = z + nz * 0.3;
    for (let it = 0; it < 160 && t < dist - 0.6; it++) { const d = base(px + ux * t, py + uy * t, pz + uz * t); if (d > -0.08) return 0; t += max(-d * 0.9, 0.12); }
    const lam = 0.35 + 0.65 * max(0, nx * ux + ny * uy + nz * uz);
    return DAY0 * lam * 3.5 / (1 + (dist / 6.5) * (dist / 6.5));
  }

  /* ---------- which chunks hold cave ---------- */
  const chunks = [];
  {
    const seen = new Set();
    for (const b of boxes) {
      const e = AMPMAX + 1.5, i0 = floor((b[0] - e) / CH), i1 = floor((b[3] + e) / CH), j0 = floor((b[1] - e) / CH), j1 = floor((min(b[4], YCUT - 0.01) + e) / CH), k0 = floor((b[2] - e) / CH), k1 = floor((b[5] + e) / CH);
      for (let a = i0; a <= i1; a++) for (let c = j0; c <= j1; c++) for (let d = k0; d <= k1; d++) { if ((c + 1) * CH > YCUT) continue; const key = a + ',' + c + ',' + d; if (!seen.has(key)) { seen.add(key); chunks.push([a, c, d]); } }
    }
  }

  /* ---------- meshing one chunk (surface nets) ---------- */
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  function meshChunk(ci, cj, ck2, lod) {
    const h = lod ? 0.6 : 0.2, n = Math.round(CH / h), N = n + 2, x0 = ci * CH - h, y0 = cj * CH - h, z0 = ck2 * CH - h, NN = N * N;
    const F = new Float32Array(N * NN);
    const B = 8, rad = B * h * 0.87 + AMPMAX + 0.8;
    let exact = 0;
    for (let bk = 0; bk < N; bk += B) for (let bj = 0; bj < N; bj += B) for (let bi = 0; bi < N; bi += B) {
      const ek = min(bk + B, N), ej = min(bj + B, N), ei = min(bi + B, N);
      const c = base(x0 + (bi + ei - 1) * 0.5 * h, y0 + (bj + ej - 1) * 0.5 * h, z0 + (bk + ek - 1) * 0.5 * h);
      if (c > rad || c < -rad) { for (let k = bk; k < ek; k++) for (let j = bj; j < ej; j++) F.fill(c, k * NN + j * N + bi, k * NN + j * N + ei); continue; }
      for (let k = bk; k < ek; k++) for (let j = bj; j < ej; j++) for (let i = bi; i < ei; i++) { F[k * NN + j * N + i] = sdf(x0 + i * h, y0 + j * h, z0 + k * h); exact++; }
    }
    const NC = N - 1, VI = new Int32Array(NC * NC * NC).fill(-1), V = [];
    const cv = new Float32Array(8);
    for (let k = 0; k < NC; k++) for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
      const o = k * NN + j * N + i;
      cv[0] = F[o]; cv[1] = F[o + 1]; cv[2] = F[o + N]; cv[3] = F[o + N + 1]; cv[4] = F[o + NN]; cv[5] = F[o + NN + 1]; cv[6] = F[o + NN + N]; cv[7] = F[o + NN + N + 1];
      let m = 0; for (let c = 0; c < 8; c++) if (cv[c] < 0) m |= 1 << c;
      if (m === 0 || m === 255) continue;
      let sx = 0, sy = 0, sz = 0, cnt = 0;
      for (const [a, b] of EDGES) {
        const fa = cv[a], fb = cv[b]; if ((fa < 0) === (fb < 0)) continue;
        const t = fa / (fa - fb);
        sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t; cnt++;
      }
      const gx = (cv[1] - cv[0]) + (cv[3] - cv[2]) + (cv[5] - cv[4]) + (cv[7] - cv[6]), gy = (cv[2] - cv[0]) + (cv[3] - cv[1]) + (cv[6] - cv[4]) + (cv[7] - cv[5]), gz = (cv[4] - cv[0]) + (cv[5] - cv[1]) + (cv[6] - cv[2]) + (cv[7] - cv[3]);
      const gl = sqrt(gx * gx + gy * gy + gz * gz) || 1;
      VI[k * NC * NC + j * NC + i] = V.length / 6;
      V.push(x0 + (i + sx / cnt) * h, y0 + (j + sy / cnt) * h, z0 + (k + sz / cnt) * h, -gx / gl, -gy / gl, -gz / gl);
    }
    const I = [];
    const cell = (i, j, k) => VI[k * NC * NC + j * NC + i];
    for (let k = 1; k <= n; k++) for (let j = 1; j <= n; j++) for (let i = 1; i <= n; i++) {
      const o = k * NN + j * N + i, f0 = F[o] < 0;
      if (f0 !== (F[o + 1] < 0)) { const a = cell(i, j - 1, k - 1), b = cell(i, j, k - 1), c = cell(i, j, k), d = cell(i, j - 1, k); if (a >= 0 && b >= 0 && c >= 0 && d >= 0) { if (f0) I.push(a, b, c, a, c, d); else I.push(a, c, b, a, d, c); } }
      if (f0 !== (F[o + N] < 0)) { const a = cell(i - 1, j, k - 1), b = cell(i, j, k - 1), c = cell(i, j, k), d = cell(i - 1, j, k); if (a >= 0 && b >= 0 && c >= 0 && d >= 0) { if (f0) I.push(a, c, b, a, d, c); else I.push(a, b, c, a, c, d); } }
      if (f0 !== (F[o + NN] < 0)) { const a = cell(i - 1, j - 1, k), b = cell(i, j - 1, k), c = cell(i, j, k), d = cell(i - 1, j, k); if (a >= 0 && b >= 0 && c >= 0 && d >= 0) { if (f0) I.push(a, b, c, a, c, d); else I.push(a, c, b, a, d, c); } }
    }
    // pack: position, normal, daylight, kind (1 = mine rock)
    const nv = V.length / 6, buf = new Float32Array(nv * 8);
    let minY = 1e9, maxY = -1e9;
    for (let v = 0; v < nv; v++) {
      const x = V[v * 6], y = V[v * 6 + 1], z = V[v * 6 + 2], nx = V[v * 6 + 3], ny = V[v * 6 + 4], nz = V[v * 6 + 5];
      base(x, y, z); const kind = gKind === 1 || gKind === 4 ? 1 : gKind === 2 ? 0.5 : 0;
      buf.set([x, y, z, nx, ny, nz, dayAt(x, y, z, nx, ny, nz), kind], v * 8);
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { buf, idx: new Uint32Array(I), tris: I.length / 3, exact, minY, maxY };
  }

  /* ---------- queries for the game ---------- */
  // floor under a standing body, or +1e9 if the body would be inside rock (a wall), or -1e9 if nothing below
  function floorAt(x, y, z, open) {          // open: skip the wall test (stepping into the shaft from above ground)
    if (!open && (sdf(x, y + 1.25, z) > -0.28 || sdf(x, y + 1.7, z) > -0.22)) return 1e9;
    let yy = y + 0.7, d = sdf(x, yy, z);
    if (d > -0.02) {                        // starting inside rock: the floor is the rock surface just above, if it is within reach
      if (!open) return yy;
      for (let it = 0; it < 80; it++) { yy += max(d * 0.85, 0.03); d = sdf(x, yy, z); if (d < -0.02) return yy; if (yy > y + 2.5) break; }
      return y;
    }
    for (let it = 0; it < 400; it++) { yy -= max(-d * 0.85, 0.03); d = sdf(x, yy, z); if (d > -0.02) return yy; if (yy < y - 260) break; }
    return -1e9;
  }
  function ceilAt(x, y, z) {
    let yy = y + 1.0, d = sdf(x, yy, z);
    for (let it = 0; it < 300; it++) { if (d > -0.03) return yy; yy += max(-d * 0.85, 0.03); if (yy > y + 120) return 1e9; d = sdf(x, yy, z); }
    return 1e9;
  }
  // where to put things on the floor near a design point
  function floorNear(lx, ly, lz) {           // first rock surface straight below a design point that sits in open air
    const x = SX + lx, z = SZ + lz; let y = ly, d = sdf(x, y, z);
    if (d > 0) return [x, ly, z];
    for (let it = 0; it < 400; it++) { y -= max(-d * 0.85, 0.02); d = sdf(x, y, z); if (d > -0.02) return [x, y, z]; }
    return [x, ly, z];
  }
  const inShaft = (x, z, m) => max(abs(x - SX), abs(z - SZ)) < SHW + (m || 0);
  function kindAt(x, y, z) { base(x, y, z); return gKind; }
  return { CH, YCUT, SHW, SHB, TOP, SX, SZ, STATION, LIGHT, chunks, segCount: NS, minePaths, natPaths, sdf, base, meshChunk, floorAt, ceilAt, floorNear, dayAt, dayK, inShaft, kindAt,
    CAV: { x: CX, y: CY, z: CZ, rx: RX, ry: RY, rz: RZ, pool: POOL, drop: [SX, SZ + 20] }, DOOR: { x: SX + DOOR.x, z: SZ + DOOR.z, floor: DOOR.floor }, cavFloor, cavK, COLW };
}
if (typeof module !== 'undefined') module.exports = CaveLib;
