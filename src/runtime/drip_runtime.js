/* ---------- sealed doors: D-7 in the mine station, D-8 in the crystal cavern, D-9 in the stalactite cavern ---------- */
// Campaign: D-7 opens when all seven dishes are online; each deeper door needs the power coupling the research team pulled
// and left somewhere in that cavern. Free play: all open. A door slides open when you walk up to it, and stays open.
const DOORS = CV.DOORS.map((d, i) => {
  const yaw = Math.atan2(d.dir[0], d.dir[1]), c = Math.cos(yaw), s = Math.sin(yaw);
  const fy = [-1.2, 1.2].map(k => CV.floorAt(d.x + s * k, d.floor + 1, d.z + c * k)).filter(v => v > d.floor - 4 && v < d.floor + 4);
  return { i, name: d.name, x: d.x, z: d.z, y: fy.length ? Math.max(...fy) : d.floor - 0.15, yaw, c, s, open: 0, moving: false, told: -99, parts: null, lamp: [d.x, d.floor + 1.5, d.z], sfx: i ? '_' + d.name.toLowerCase().replace('-', '') : '' };
});
const DOOR = DOORS[0];                       // the first door (D-7)
function doorLocal(D, x, z) { const dx = x - D.x, dz = z - D.z; return [D.c * dx - D.s * dz, D.s * dx + D.c * dz]; }   // u across the doorway, v along the tunnel (behind the door: v > 0)
function doorWorld(D, u, v) { return [D.x + D.c * u + D.s * v, D.z - D.s * u + D.c * v]; }
const PARTS = [                              // the power couplings (campaign): where the research team left them
  { door: 'D-8', at: CV.floorNear(-44, -163, -179), packYaw: 0.6 },
  { door: 'D-9', at: CV.floorNear(__D9PART__), packYaw: 2.1 },
];
const STATION_PROPS = [], FLOODS = [];
function doorReady(D) { return D.name !== 'D-9'; }      // D-9: the flooded level beyond comes in the next build
function doorUnlocked(D) {
  if (!doorReady(D)) return false; if (game.free) return true; if (D.i === 0) return game.online >= 7;
  const k = PARTS.findIndex(p => p.door === D.name); return k >= 0 && !!(cave.parts && cave.parts[k]);
}
function doorBlocks(x, z, py) {
  for (const D of DOORS) { if (D.open >= 0.72 || py < D.y - 3 || py > D.y + 5) continue; const q = doorLocal(D, x, z); if (Math.abs(q[0]) < 3 && q[1] > -0.7 && q[1] < 18) return true; }
  return false;
}
function doorUpdate(dt) {
  for (const D of DOORS) {
    const f = doorWorld(D, 0, -2), d = Math.hypot(state.px - f[0], state.pz - f[1]), near = cave.under && d < 6.5 && Math.abs(state.py - D.y) < 4, un = doorUnlocked(D);
    if (D.open < 1 && un && near && !D.moving) {
      D.moving = true; thud(0.5, 120); tone([110, 147, 165], 1.4, 'sawtooth', 0.05, 0.25);
      toast(D.i === 0 ? (game.free ? 'The deep door grinds open.' : 'The deep door has power again. It grinds open.') : game.free ? D.name + ' grinds open.' : 'You seat the coupling in ' + D.name + '. Its panel lights, and the door grinds open.', 5);
    }
    if (D.moving) { D.open = Math.min(1, D.open + dt / 3.6); if (D.open >= 1) { D.moving = false; thud(0.6, 90); saveGame(); } }
    if (!un && near && d < 4.5 && state.time - D.told > 25) {
      D.told = state.time; tone([196, 185], 0.6, 'sine', 0.1, 0.3);
      toast(D.i === 0 ? 'A sealed door. Its panel is dead. A cable runs from it back up the shaft, toward the surface.'
        : !doorReady(D) ? D.name + ' won\'t budge. Cold water seeps out from under it. (The flooded level comes in the next build.)'
        : D.name + ' won\'t open: its power coupling has been pulled. The research team must have left it somewhere in this cavern.', 7);
    }
  }
  if (!game.free) PARTS.forEach((p, k) => {    // couplings: walk over one to pick it up
    if (cave.parts[k] || !p.at) return; if (Math.hypot(p.at[0] - state.px, p.at[2] - state.pz) > 2.2 || Math.abs(p.at[1] - state.py) > 2.5) return;
    cave.parts[k] = true; tone([523, 784, 1047], 0.6, 'triangle', 0.18); toast('Power coupling for ' + p.door + '. The work light beside the door marks the way.', 7); saveGame();
  });
  // the work light nearest the camera is the one that lights the rock
  const E = cam.eye; let best = null, bd = 260;
  for (const F of FLOODS) { const d = Math.hypot(F.lp[0] - E[0], F.lp[1] - E[1], F.lp[2] - E[2]); if (d < bd) { bd = d; best = F; } }
  cave.flood = best;
}
function doorInit() {
  const mk = name => { const a = assetItem('deepdoor', name); return a ? { hi: a.hi, lo: a.lo, it: a.it } : null; };
  let fb = null;
  for (const D of DOORS) {
    const fr = mk('deep_door_frame' + D.sfx), lr = mk('deep_door_leaf_r' + D.sfx), ll = mk('deep_door_leaf_l' + D.sfx); let at = [2.3, 1.5, -0.6];
    if (fr && lr && ll) { D.parts = { fr, lr, ll }; if (fr.it.attach && fr.it.attach[0]) at = fr.it.attach[0]; }
    else {                                   // fallback if the door module is missing: plain slabs
      if (!fb) { const box = (x0, x1, y0, y1, z0, z1, c) => { const b = new MB(); b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, c); const g = b.finish(); return { hi: g, lo: g }; };
        const F = new MB(), C = [0.28, 0.28, 0.27, 0.12]; F.box(-2.35, 2.65, -0.05, 1.7, 5.5, 1.1, C); F.box(2.35, 2.65, -0.05, 1.7, 5.5, 1.1, C); F.box(0, 4.3, -0.05, 3.0, 2.2, 1.1, C); const g = F.finish();
        fb = { fr: { hi: g, lo: g }, lr: box(0, 1.52, 0, 3.2, -0.15, 0.15, [0.33, 0.31, 0.27, 0.1]), ll: box(-1.52, 0, 0, 3.2, -0.15, 0.15, [0.33, 0.31, 0.27, 0.1]) }; }
      D.parts = fb;
    }
    D.lamp = [D.x + D.c * at[0] + D.s * at[2], D.y + at[1], D.z - D.s * at[0] + D.c * at[2]];
    D.m = new Float32Array(mulAll(tr(D.x, D.y, D.z), rotY(D.yaw)));
  }
  // the research team's leftovers in the station: a work bench and their crates
  for (const [name, dx, dz, rot] of [['field_lab', -4.6, -3.0, Math.PI / 2], ['crate_stack', 4.9, 3.7, Math.PI]]) {
    const a = assetItem('survey', name); if (!a) continue; const x = CV.SX + dx, z = CV.SZ + dz, y = CV.floorAt(x, -55, z); if (!(y > -1e8 && y < 1e8)) continue;
    STATION_PROPS.push({ hi: a.hi, lo: a.lo, m: new Float32Array(K.mulAll(K.tr(x, y, z), K.rotY(rot))), p: [x, y, z] });
  }
  // a work floodlight in front of each deeper door, aimed at it, still switched on
  const fm = assetItem('worklight', 'flood_mast');
  for (const D of DOORS) {
    if (!D.i) continue;
    const p = doorWorld(D, -3.6, -7.5), y = CV.floorAt(p[0], D.y + 2.5, p[1]); if (!(y > D.y - 6 && y < D.y + 6)) continue;
    const yaw = Math.atan2(D.x - p[0], D.z - p[1]), c = Math.cos(yaw), s = Math.sin(yaw);
    const A = fm && fm.it.attach && fm.it.attach.length ? fm.it.attach : [[-0.55, 3.3, 0.3], [0.55, 3.3, 0.3]];
    const lamps = A.map(a => [p[0] + c * a[0] + s * a[2], y + a[1], p[1] - s * a[0] + c * a[2]]);
    const lp = [0, 1, 2].map(k => lamps.reduce((t, q) => t + q[k], 0) / lamps.length), tg = [D.x, D.y + 1.3, D.z], dir = norm([tg[0] - lp[0], tg[1] - lp[1], tg[2] - lp[2]]);
    FLOODS.push({ door: D, x: p[0], y, z: p[1], yaw, lamps, lp, dir, mesh: fm, m: new Float32Array(mulAll(tr(p[0], y, p[1]), rotY(yaw))) });
  }
  // the couplings and the packs dropped beside them
  const pc = assetItem('worklight', 'power_coupling'), pk = assetItem('worklight', 'dropped_pack');
  PARTS.forEach(p => {
    p.mesh = pc; if (!p.at || !pk) return;
    const x = p.at[0] + 1.2, z = p.at[2] + 0.7, y = CV.floorAt(x, p.at[1] + 1.5, z);
    if (y > p.at[1] - 3 && y < p.at[1] + 3) p.pack = { mesh: pk, m: new Float32Array(mulAll(tr(x, y, z), rotY(p.packYaw))), p: [x, y, z] };
  });
}
function drawDoor() {
  const E = cam.eye; setCommon(pProp); gl.uniform4f(pProp.u.uUG, 1, cave.flash, cave.pday, cave.expo); gl.uniform1f(pProp.u.uChar, 0);
  const draw = (mesh, m, d) => { gl.uniformMatrix4fv(pProp.u.uM, false, m); const g = d < 45 ? mesh.hi : mesh.lo; gl.bindVertexArray(g.vao); stats.cave += drawElems(g.count, gl.UNSIGNED_INT, 0); };
  const dist = p => Math.hypot(p[0] - E[0], p[1] - E[1], p[2] - E[2]);
  for (const D of DOORS) {
    if (!D.parts) continue; const d = dist([D.x, D.y, D.z]); if (d > 140) continue; const P = D.parts, sl = D.open * 1.6;
    draw(P.fr, D.m, d);
    draw(P.lr, new Float32Array(mulAll(tr(D.x, D.y, D.z), rotY(D.yaw), tr(sl, 0, 0))), d); draw(P.ll, new Float32Array(mulAll(tr(D.x, D.y, D.z), rotY(D.yaw), tr(-sl, 0, 0))), d);
  }
  for (const p of STATION_PROPS) { const d = dist(p.p); if (d < 140) draw(p, p.m, d); }
  for (const F of FLOODS) if (F.mesh) { const d = dist([F.x, F.y, F.z]); if (d < 180) draw(F.mesh, F.m, d); }
  PARTS.forEach((p, k) => {
    if (p.pack) { const d = dist(p.pack.p); if (d < 120) draw(p.pack.mesh, p.pack.m, d); }
    if (game.free || !p.at || cave.parts[k] || !p.mesh) return; const d = dist(p.at); if (d > 120) return;
    const b = 0.75 + 0.08 * Math.sin(state.time * 2 + k); draw(p.mesh, new Float32Array(mulAll(tr(p.at[0], p.at[1] + b, p.at[2]), rotY(state.time * 1.2), rotZ(0.25))), d);
  });
  gl.uniform4f(pProp.u.uUG, 0, cave.flash, cave.pday, cave.expo);
}
function drawDoorLamp() {                    // glows: door status lamps, the work lights' lamp heads, couplings waiting to be found
  const E = cam.eye, dist = p => Math.hypot(p[0] - E[0], p[1] - E[1], p[2] - E[2]);
  for (const D of DOORS) {
    const L = D.lamp; if (dist(L) > 140) continue; const on = doorUnlocked(D), k = on ? 1.3 : 0.55 + 0.45 * Math.max(0, Math.sin(state.time * 1.7));
    glowDraw(crystal, mulAll(tr(L[0], L[1], L[2]), sc(0.07, 0.07, 0.07)), on ? 0.25 : 1.0, on ? 1.0 : 0.12, on ? 0.45 : 0.08, k, 0);
  }
  for (const F of FLOODS) for (const L of F.lamps) if (dist(L) < 400) glowDraw(crystal, mulAll(tr(L[0], L[1], L[2]), sc(0.34, 0.24, 0.34)), 1.0, 0.92, 0.74, 1.7, 0);
  if (!game.free) PARTS.forEach((p, k) => { if (!p.at || cave.parts[k]) return; const b = 0.75 + 0.08 * Math.sin(state.time * 2 + k); if (dist(p.at) < 160) glowDraw(crystal, mulAll(tr(p.at[0], p.at[1] + b, p.at[2]), rotY(state.time), sc(0.2, 0.3, 0.2)), 0.4, 0.95, 1.0, 0.9, 0); });
}

/* ---------- the stalactite cavern: dripstone, glowworms and rimstone pools ---------- */
const DRIPR = { kits: [], ranges: [], inst: null, water: null, worms: null, nWorms: 0, count: 0, seen: false };
function dripHits() {
  const C = CV.DRIP, out = [], r = cavRnd(4411);
  const origins = [[0, 0, 0], [-40, -12, 0], [40, -15, 0], [0, -12, -35], [0, -12, 35], [-30, 8, -28], [30, 5, 28], [-25, -20, 25], [25, -22, -25], [55, -25, 10], [-55, -8, -10]];
  for (const o of origins) {
    const ox = C.x + o[0], oy = C.y + o[1], oz = C.z + o[2]; if (CV.sdf(ox, oy, oz) > -2) continue;
    const N = 1500;
    for (let i = 0; i < N; i++) {
      const yv = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - yv * yv), ph = i * 2.39996 + r() * 0.3, dx = Math.cos(ph) * rr, dy = yv, dz = Math.sin(ph) * rr;
      let t = 0, hit = null;
      for (let it = 0; it < 220 && t < 240; it++) { const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t, d = CV.sdf(x, y, z); if (d > -0.04) { hit = [x, y, z]; break; } t += Math.max(-d * 0.8, 0.12); }
      if (!hit || CV.dripK(hit[0], hit[1], hit[2]) > 1.25) continue;
      const e = 0.35, g = [CV.sdf(hit[0] + e, hit[1], hit[2]) - CV.sdf(hit[0] - e, hit[1], hit[2]), CV.sdf(hit[0], hit[1] + e, hit[2]) - CV.sdf(hit[0], hit[1] - e, hit[2]), CV.sdf(hit[0], hit[1], hit[2] + e) - CV.sdf(hit[0], hit[1], hit[2] - e)];
      if (Math.hypot(hit[0] - C.drop[0], hit[2] - C.drop[1]) < 7.5 && hit[1] > C.y - 20) continue;   // keep the drop clear
      out.push({ p: hit, n: norm([-g[0], -g[1], -g[2]]) });
    }
  }
  return out;
}
function dripScatter(hits) {
  const r = cavRnd(2207), C = CV.DRIP, drip = {}, life = {}, worms = [], push = (bag, k, v) => (bag[k] = bag[k] || []).push(v);
  const pick = (opts) => { let x = r() * opts.reduce((a, o) => a + o[1], 0); for (const o of opts) { x -= o[1]; if (x <= 0) return o[0]; } return opts[0][0]; };
  const tintAt = p => Math.min(1, Math.max(0, 0.32 + 0.4 * Math.sin(p[0] * 0.05 + 0.7) * Math.cos(p[2] * 0.045 - 0.3) + (r() - 0.5) * 0.35));   // ivory fields, honey fields
  const tangent = n => { const a = norm(cross(n, Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])); return [a, cross(n, a)]; };
  const land = [C.drop[0], CV.floorAt(C.drop[0], C.y + 20, C.drop[1]), C.drop[1]];
  const D9 = DOORS.find(d => d.name === 'D-9'), d9f = D9 ? doorWorld(D9, 0, -6) : null;
  const clear = p => (Math.hypot(p[0] - land[0], p[2] - land[2]) < 6.5 && p[1] < land[1] + 5) || (d9f && Math.hypot(p[0] - d9f[0], p[2] - d9f[1]) < 10 && p[1] < D9.y + 7) || FLOODS.some(F => Math.hypot(p[0] - F.x, p[2] - F.z) < 3.5 && p[1] < F.y + 5);
  const down = () => norm([(r() - 0.5) * 0.1, -1, (r() - 0.5) * 0.1]), up = () => norm([(r() - 0.5) * 0.16, 1, (r() - 0.5) * 0.16]);
  for (const h of hits) {
    const p = h.p, n = h.n, floor = n[1] > 0.55, ceil = n[1] < -0.5, tint = tintAt(p);
    if (ceil) {
      if (r() < 0.82) {                      // stalactites hang straight down whatever the ceiling's slope
        const big = r() < 0.07, L = big ? 4 + r() * 9 : 0.3 * Math.exp(r() * 2.3), item = big ? pick([['stalactite', 4], ['stalactite_cluster', 2]]) : pick([['stalactite', 6], ['stalactite_cluster', 2.2], ['soda_straws', 2.6]]), ax = down();
        push(drip, item, [p[0], p[1] + 0.12 * L, p[2], L, ax[0], ax[1], ax[2], item === 'soda_straws' ? 0.9 : 0.75 + r() * 0.6, tint, 1, r() * 6.283, 0]);
        const [ta, tb] = tangent(n);
        for (let k = 0; k < 1 + (r() * 3 | 0); k++) {                    // a few smaller ones hang beside it
          const u = (r() - 0.5) * 2.6, v = (r() - 0.5) * 2.6, q = [p[0] + ta[0] * u + tb[0] * v, p[1] + ta[1] * u + tb[1] * v, p[2] + ta[2] * u + tb[2] * v], d = CV.sdf(q[0], q[1], q[2]);
          if (d < -1 || d > 0.8) continue; const L2 = 0.2 * Math.exp(r() * 2), a2 = down();
          push(drip, r() < 0.3 ? 'soda_straws' : 'stalactite', [q[0], q[1] + d + 0.12 * L2 + 0.1, q[2], L2, a2[0], a2[1], a2[2], 0.8 + r() * 0.4, tint, 1, r() * 6.283, 0]);
        }
        if (r() < (big ? 0.75 : 0.22)) {      // drips land below: a stalagmite grows up to meet it, or the two have joined into a column
          const fy = CV.floorAt(p[0], p[1] - L - 0.4, p[2]);
          if (fy > -1e8 && fy < p[1] && !clear([p[0], fy, p[2]])) {
            const gap = p[1] - fy;
            if (big && gap < L * 1.25) push(drip, 'column', [p[0], fy - 0.4, p[2], gap + 0.8, 0, 1, 0, 0.8 + r() * 0.5, tint, 1, r() * 6.283, 0]);
            else { const Lm = Math.min(gap - L - 0.3, L * (0.3 + r() * 0.5)), a2 = up(); if (Lm > 0.25) push(drip, Lm > 1.5 && r() < 0.4 ? 'stalagmite_cluster' : 'stalagmite', [p[0], fy - 0.06 * Lm, p[2], Lm, a2[0], a2[1], a2[2], 0.85 + r() * 0.5, tint, 1, r() * 6.283, 0]); }
          }
        }
      }
      if (r() < 0.36) push(life, 'glowworm_threads', [p[0] - n[0] * 0.03, p[1] - n[1] * 0.03, p[2] - n[2] * 0.03, 0.7 + r() * 0.8, n[0], n[1], n[2], 1, 0.5, 0.8 + r() * 0.4, r() * 6.283, 0]);
      const [ta, tb] = tangent(n);           // glowworm lights dotted over the ceiling
      for (let k = 0; k < 8; k++) {
        const u = (r() - 0.5) * 3.2, v = (r() - 0.5) * 3.2, q = [p[0] + ta[0] * u + tb[0] * v, p[1] + ta[1] * u + tb[1] * v, p[2] + ta[2] * u + tb[2] * v], d = CV.sdf(q[0], q[1], q[2]);
        if (d > -1.2 && d < 0.6) worms.push(q[0] + n[0] * (d + 0.08), q[1] + n[1] * (d + 0.08), q[2] + n[2] * (d + 0.08), r());
      }
    } else if (floor) {
      if (clear(p)) continue;
      const g = r(); const wet = CV.dripWater(p[0], p[2]) > p[1];
      if (g < 0.34) { const L = 0.25 * Math.exp(r() * 2.2), ax = up(); push(drip, pick([['stalagmite', 5], ['stalagmite_cluster', wet ? 0.5 : 2]]), [p[0], p[1] - 0.06 * L, p[2], L, ax[0], ax[1], ax[2], 0.8 + r() * 0.6, tint, 1, r() * 6.283, 0]); }
      else if (g < 0.4 && !wet && n[1] < 0.85) { const s = 0.7 + r() * 0.9, a2 = norm([n[0] * 0.5, 1, n[2] * 0.5]); push(drip, 'flowstone', [p[0], p[1] - 0.1 * s, p[2], s, a2[0], a2[1], a2[2], 1, tint * 0.6, 1, Math.atan2(n[0], n[2]) + Math.PI, 0]); }   // only where the floor meets the walls
      if (r() < 0.1) { const cy = CV.ceilAt(p[0], p[1] + 0.5, p[2]), gap = cy - p[1]; if (gap > 2 && gap < 15) push(drip, 'column', [p[0], p[1] - 0.4, p[2], gap + 0.8, 0, 1, 0, 0.8 + r() * 0.9, tint, 1, r() * 6.283, 0]); }
    } else {                                 // walls and the sides of the great columns
      if (clear(p)) continue;
      const g = r();
      if (g < 0.3 && n[1] < 0.35) { const L = 0.8 + r() * 3.6, nx = Math.hypot(n[0], n[2]) || 1; push(drip, 'drapery', [p[0] - n[0] * 0.12, p[1] + 0.25, p[2] - n[2] * 0.12, L, 0, -1, 0, 0.9 + r() * 0.5, tint, 1, Math.atan2(n[2] / nx, -n[0] / nx), 0]); }
      else if (g < 0.4) { const s = 0.7 + r() * 0.8; push(drip, 'helictites', [p[0], p[1], p[2], s, n[0], n[1], n[2], 1, tint, 1, r() * 6.283, 0]); }
    }
  }
  // giants: the longest stalactites in the middle of the hall, and great stalagmites rising to meet them
  const ceils = hits.filter(h => h.n[1] < -0.6 && CV.dripK(h.p[0], h.p[1], h.p[2]) < 1.05), floors = hits.filter(h => h.n[1] > 0.6 && !clear(h.p));
  for (let k = 0; k < 16 && ceils.length; k++) { const h = ceils[(r() * ceils.length) | 0], L = 11 + r() * 9, ax = down(); push(drip, k % 3 ? 'stalactite' : 'stalactite_cluster', [h.p[0], h.p[1] + 1, h.p[2], L, ax[0], ax[1], ax[2], 0.85 + r() * 0.35, tintAt(h.p), 1, r() * 6.283, 0]); }
  for (let k = 0; k < 14 && floors.length; k++) { const h = floors[(r() * floors.length) | 0], L = 5 + r() * 7, ax = up(); push(drip, k % 3 ? 'stalagmite' : 'stalagmite_cluster', [h.p[0], h.p[1] - 0.3, h.p[2], L, ax[0], ax[1], ax[2], 1.0 + r() * 0.4, tintAt(h.p), 1, r() * 6.283, 0]); }
  return { drip, life, worms };
}
function dripInit() {
  const t0 = performance.now(), hits = dripHits(), sc = dripScatter(hits), all = [], CELL = 48;
  for (const name in Object.assign({}, sc.drip, sc.life)) {
    const bag = sc.drip[name] ? sc.drip : sc.life, a = assetItem('dripstone', name); if (!a) continue;
    const kit = { name, hi: a.hi, lo: a.lo, prog: bag === sc.life ? 'life' : 'drip' }; DRIPR.kits.push(kit);
    const cells = new Map();
    for (const v of bag[name]) { const key = Math.floor(v[0] / CELL) + ',' + Math.floor(v[1] / CELL) + ',' + Math.floor(v[2] / CELL); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(v); }
    for (const [key, list] of cells) {
      let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (const v of list) for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], v[q] - v[3]); mx[q] = Math.max(mx[q], v[q] + v[3]); }
      DRIPR.ranges.push({ kit, first: all.length / 12, count: list.length, mn, mx }); for (const v of list) all.push(...v);
    }
  }
  DRIPR.count = all.length / 12; DRIPR.hits = hits.length;
  if (all.length) { DRIPR.inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, DRIPR.inst); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(all), gl.STATIC_DRAW); }
  for (const k of DRIPR.kits) for (const m of [k.hi, k.lo]) {
    if (m.instReady) continue; m.instReady = true; gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, DRIPR.inst);
    for (let q = 3; q <= 5; q++) { gl.enableVertexAttribArray(q); gl.vertexAttribDivisor(q, 1); gl.vertexAttribPointer(q, 4, gl.FLOAT, false, 48, (q - 3) * 16); }
  }
  gl.bindVertexArray(null);
  // glowworm lights on the ceiling
  if (sc.worms.length) { const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sc.worms), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); gl.bindVertexArray(null); DRIPR.worms = vao; DRIPR.nWorms = sc.worms.length / 4; }
  // the rimstone pools: water held behind each terrace's rim
  { const C = CV.DRIP, V = [], I = [], h = 0.6; let n = 0;
    for (let x = C.x - C.rx; x < C.x + C.rx; x += h) for (let z = C.z - C.rz; z < C.z + C.rz; z += h) {
      const cx = x + h / 2, cz = z + h / 2, lv = CV.dripWater(cx, cz); if (lv < -1e8) continue;
      if (CV.dripK(cx, lv + 0.5, cz) > 1.0 || CV.sdf(cx, lv + 0.3, cz) > 0) continue;
      V.push(x, lv, z, x + h, lv, z, x + h, lv, z + h, x, lv, z + h); I.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
    }
    if (n) { const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW); gl.bindVertexArray(null); DRIPR.water = { vao, count: I.length, quads: n }; }
  }
  DRIPR.ms = Math.round(performance.now() - t0);
}
function drawDrip() {
  const E = cam.eye; if (!DRIPR.inst || CV.dripK(E[0], E[1], E[2]) > 1.7) return;
  const P = cam.planes;
  for (const [prog, tag] of [[pDrip, 'drip'], [pLife, 'life']]) {
    setCommon(prog);
    for (const g of DRIPR.ranges) {
      if (g.kit.prog !== tag || !classify(P, g.mn[0], g.mn[1], g.mn[2], g.mx[0], g.mx[1], g.mx[2], 0)) continue;
      const cx = Math.max(g.mn[0], Math.min(E[0], g.mx[0])), cy = Math.max(g.mn[1], Math.min(E[1], g.mx[1])), cz = Math.max(g.mn[2], Math.min(E[2], g.mx[2])), d = Math.hypot(cx - E[0], cy - E[1], cz - E[2]);
      const m = d < (tag === 'drip' ? 40 : 25) ? g.kit.hi : g.kit.lo; gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, DRIPR.inst);
      for (let q = 3; q <= 5; q++) gl.vertexAttribPointer(q, 4, gl.FLOAT, false, 48, g.first * 48 + (q - 3) * 16);
      gl.drawElementsInstanced(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0, g.count); stats.cave += m.tris * g.count; stats.calls++; stats.submitted += m.tris * g.count;
    }
  }
  gl.bindVertexArray(null);
}
function drawDripFx() {
  const E = cam.eye; if (CV.dripK(E[0], E[1], E[2]) > 1.7) return;
  if (DRIPR.water) { gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false); setCommon(pRim); gl.bindVertexArray(DRIPR.water.vao); stats.cave += drawElems(DRIPR.water.count, gl.UNSIGNED_INT, 0); gl.depthMask(true); gl.disable(gl.BLEND); }
  if (DRIPR.worms) {
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); gl.useProgram(pWorm.p);
    gl.uniformMatrix4fv(pWorm.u.uVP, false, cam.vp32); gl.uniform1f(pWorm.u.uT, state.time); gl.uniform3fv(pWorm.u.uCam, cam.eye); gl.uniform1f(pWorm.u.uPx, canvas.height / 900);
    gl.bindVertexArray(DRIPR.worms); gl.drawArrays(gl.POINTS, 0, DRIPR.nWorms); stats.calls++;
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
  gl.bindVertexArray(null);
}
