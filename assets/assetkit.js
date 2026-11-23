function AssetKit() {
  'use strict';
  const mul = (a, b) => { const o = new Float64Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
  const mulAll = (...ms) => ms.reduce((a, b) => mul(a, b));
  const tr = (x, y, z) => new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  const sc = (x, y, z) => new Float64Array([x, 0, 0, 0, 0, y === undefined ? x : y, 0, 0, 0, 0, z === undefined ? x : z, 0, 0, 0, 0, 1]);
  const rotY = a => { const c = Math.cos(a), s = Math.sin(a); return new Float64Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
  const rotX = a => { const c = Math.cos(a), s = Math.sin(a); return new Float64Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
  const rotZ = a => { const c = Math.cos(a), s = Math.sin(a); return new Float64Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k], lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // seeded random numbers: rnd(seed) returns a function giving 0..1. Never use Math.random (the world must be identical every run).
  const rnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // matrix that maps local +Y onto the direction a->b, centred between them (used by beam / cyl)
  function along(a, b) { const d = sub(b, a), f = norm(d), s = norm(cross(f, Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), u = cross(s, f); return new Float64Array([s[0], s[1], s[2], 0, f[0], f[1], f[2], 0, u[0], u[1], u[2], 0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 1]); }

  class MB {
    constructor() { this.P = []; this.N = []; this.C = []; this.I = []; this.m = null; this.stack = []; }
    get tris() { return this.I.length / 3; }
    push(m) { this.stack.push(this.m); this.m = this.m ? mul(this.m, m) : m; return this; }
    pop() { this.m = this.stack.pop(); return this; }
    v(x, y, z, nx, ny, nz, c) {
      const m = this.m;
      if (m) {
        const X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], Z = m[2] * x + m[6] * y + m[10] * z + m[14];
        // normals use the cofactor matrix so squashed / stretched shapes stay correctly lit
        const c00 = m[5] * m[10] - m[6] * m[9], c01 = m[6] * m[8] - m[4] * m[10], c02 = m[4] * m[9] - m[5] * m[8], c10 = m[2] * m[9] - m[1] * m[10], c11 = m[0] * m[10] - m[2] * m[8], c12 = m[1] * m[8] - m[0] * m[9], c20 = m[1] * m[6] - m[2] * m[5], c21 = m[2] * m[4] - m[0] * m[6], c22 = m[0] * m[5] - m[1] * m[4];
        const NX = c00 * nx + c01 * ny + c02 * nz, NY = c10 * nx + c11 * ny + c12 * nz, NZ = c20 * nx + c21 * ny + c22 * nz; x = X; y = Y; z = Z; nx = NX; ny = NY; nz = NZ;
      }
      const l = Math.hypot(nx, ny, nz) || 1; this.P.push(x, y, z); this.N.push(nx / l, ny / l, nz / l);
      this.C.push(c[0], c[1], c[2], c[3] || 0); return this.P.length / 3 - 1;
    }
    tri(a, b, c) { this.I.push(a, b, c); }
    quad(a, b, c, d) { this.I.push(a, b, c, a, c, d); }
    // flat four-sided panel from four corner points [x,y,z] given in order around the panel
    plate(p0, p1, p2, p3, c) { const n = norm(cross(sub(p1, p0), sub(p3, p0))); this.quad(this.v(p0[0], p0[1], p0[2], n[0], n[1], n[2], c), this.v(p1[0], p1[1], p1[2], n[0], n[1], n[2], c), this.v(p2[0], p2[1], p2[2], n[0], n[1], n[2], c), this.v(p3[0], p3[1], p3[2], n[0], n[1], n[2], c)); }
    box(cx, cy, cz, sx, sy, sz, c) {
      const hx = sx / 2, hy = sy / 2, hz = sz / 2;
      for (const [n, u, w] of [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]]) {
        const id = []; for (const [su, sw] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) id.push(this.v(cx + (n[0] + u[0] * su + w[0] * sw) * hx, cy + (n[1] + u[1] * su + w[1] * sw) * hy, cz + (n[2] + u[2] * su + w[2] * sw) * hz, n[0], n[1], n[2], c));
        this.quad(id[0], id[1], id[2], id[3]);
      }
    }
    beam(a, b, w, c, w2) { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (L < 1e-9) return; this.push(along(a, b)); this.box(0, 0, 0, w, L, w2 === undefined ? w : w2, c); this.pop(); }   // square (or w x w2) bar from a to b
    cyl(a, b, r0, r1, segs, c, caps) {                                   // round bar / cone from a (radius r0) to b (radius r1)
      const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (L < 1e-9) return; this.push(along(a, b));
      const prof = [[r0, -L / 2], [r1, L / 2]]; if (caps !== false) { prof.unshift([0, -L / 2]); prof.push([0, L / 2]); } this.lathe(prof, segs, c); this.pop();
    }
    // revolve an outline of [radius, height] (optionally [radius, height, colour]) points around the local Y axis
    lathe(prof, segs, c, a0, a1) {
      a0 = a0 === undefined ? 0 : a0; a1 = a1 === undefined ? Math.PI * 2 : a1;
      for (let k = 0; k < prof.length - 1; k++) {
        const r0 = prof[k][0], y0 = prof[k][1], r1 = prof[k + 1][0], y1 = prof[k + 1][1]; let nr = y1 - y0, ny = -(r1 - r0); const l = Math.hypot(nr, ny); if (l < 1e-9) continue; nr /= l; ny /= l;
        const col = prof[k][2] || c; let prev = null;
        for (let s = 0; s <= segs; s++) { const a = a0 + (a1 - a0) * s / segs, ca = Math.cos(a), sa = Math.sin(a), i0 = this.v(r0 * ca, y0, r0 * sa, nr * ca, ny, nr * sa, col), i1 = this.v(r1 * ca, y1, r1 * sa, nr * ca, ny, nr * sa, col); if (prev) this.quad(prev[0], prev[1], i1, i0); prev = [i0, i1]; }
      }
    }
    sphere(cx, cy, cz, r, segs, c, ry) { const prof = [], n = Math.max(3, segs >> 1); ry = ry === undefined ? r : ry; for (let k = 0; k <= n; k++) { const a = Math.PI * k / n; prof.push([r * Math.sin(a), -ry * Math.cos(a)]); } this.push(tr(cx, cy, cz)); this.surf(segs, n, (u, v) => { const a = Math.PI * v, t = u * Math.PI * 2; return [r * Math.sin(a) * Math.cos(t), -ry * Math.cos(a), r * Math.sin(a) * Math.sin(t)]; }, c, true); this.pop(); }
    // round pipe following a list of points
    tube(pts, r, segs, c) {
      const n = pts.length; if (n < 2) return; const rings = []; let up = [0, 1, 0];
      for (let i = 0; i < n; i++) {
        const d = norm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)])); if (Math.abs(dot(d, up)) > 0.95) up = [1, 0, 0];
        const s = norm(cross(d, up)), u = cross(s, d); up = u; const ring = [], rr = typeof r === 'function' ? r(i / (n - 1)) : r;
        for (let k = 0; k <= segs; k++) { const a = k / segs * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), nx = s[0] * ca + u[0] * sa, ny = s[1] * ca + u[1] * sa, nz = s[2] * ca + u[2] * sa; ring.push(this.v(pts[i][0] + nx * rr, pts[i][1] + ny * rr, pts[i][2] + nz * rr, nx, ny, nz, c)); }
        rings.push(ring);
      }
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < segs; k++) this.quad(rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]);
    }
    // upright prism from a convex outline [[x,z],...] between heights y0 and y1 (sides + top and bottom caps)
    extrude(poly, y0, y1, c, cTop) {
      const n = poly.length; let cx = 0, cz = 0; for (const p of poly) { cx += p[0] / n; cz += p[1] / n; }
      for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; this.plate([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], c); }
      for (const [y, ny] of [[y1, 1], [y0, -1]]) { const col = y === y1 && cTop ? cTop : c, ctr = this.v(cx, y, cz, 0, ny, 0, col), ids = poly.map(p => this.v(p[0], y, p[1], 0, ny, 0, col)); for (let i = 0; i < n; i++) this.tri(ctr, ids[i], ids[(i + 1) % n]); }
    }
    // free-form surface: fn(u, v) -> [x, y, z] for u, v in 0..1; smooth normals come from the grid. c may be a colour or fn(u, v) -> colour.
    surf(nu, nv, fn, c, wrapU) {
      const W = nu + 1, H = nv + 1, pts = new Array(W * H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) pts[j * W + i] = fn(wrapU && i === nu ? 0 : i / nu, j / nv);
      const ids = new Array(W * H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const il = wrapU ? (i % nu + nu - 1) % nu : Math.max(i - 1, 0), ir = wrapU ? (i % nu + 1) % nu : Math.min(i + 1, nu), a = sub(pts[j * W + ir], pts[j * W + il]), b = sub(pts[Math.min(j + 1, nv) * W + i], pts[Math.max(j - 1, 0) * W + i]);
        let n = cross(a, b); if (Math.hypot(n[0], n[1], n[2]) < 1e-12) n = [0, b[1] > 0 ? -1 : 1, 0];
        const p = pts[j * W + i]; ids[j * W + i] = this.v(p[0], p[1], p[2], n[0], n[1], n[2], typeof c === 'function' ? c(i / nu, j / nv) : c);
      }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) this.quad(ids[j * W + i], ids[(j + 1) * W + i], ids[(j + 1) * W + i + 1], ids[j * W + i + 1]);
    }
    // copy another builder's geometry into this one through the current transform
    merge(o) { const base = this.P.length / 3; for (let i = 0; i < o.P.length / 3; i++) this.v(o.P[i * 3], o.P[i * 3 + 1], o.P[i * 3 + 2], o.N[i * 3], o.N[i * 3 + 1], o.N[i * 3 + 2], [o.C[i * 4], o.C[i * 4 + 1], o.C[i * 4 + 2], o.C[i * 4 + 3]]); for (const k of o.I) this.I.push(base + k); }
    bounds() { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < this.P.length; i += 3) for (let k = 0; k < 3; k++) { if (this.P[i + k] < mn[k]) mn[k] = this.P[i + k]; if (this.P[i + k] > mx[k]) mx[k] = this.P[i + k]; } return { min: mn, max: mx }; }
    // 28 bytes per vertex: position (3 floats), normal (3 floats), colour + material (4 bytes)
    pack() {
      const n = this.P.length / 3, buf = new ArrayBuffer(n * 28), f = new Float32Array(buf), u8 = new Uint8Array(buf), cl = v => Math.max(0, Math.min(255, Math.round(v * 255)));
      for (let i = 0; i < n; i++) { const q = i * 7; f[q] = this.P[i * 3]; f[q + 1] = this.P[i * 3 + 1]; f[q + 2] = this.P[i * 3 + 2]; f[q + 3] = this.N[i * 3]; f[q + 4] = this.N[i * 3 + 1]; f[q + 5] = this.N[i * 3 + 2]; const b = i * 28 + 24; u8[b] = cl(this.C[i * 4]); u8[b + 1] = cl(this.C[i * 4 + 1]); u8[b + 2] = cl(this.C[i * 4 + 2]); u8[b + 3] = cl(this.C[i * 4 + 3]); }
      return { buf, idx: new Uint32Array(this.I), tris: this.I.length / 3 };
    }
  }
  return { MB, mul, mulAll, tr, sc, rotX, rotY, rotZ, cross, dot, norm, sub, add, scale, lerp, rnd, along };
}
