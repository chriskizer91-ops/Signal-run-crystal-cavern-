// Works out the research team's marked routes: from where you land in a cavern to its exit door.
// Path search over a 2 m grid of floor heights (A*), preferring gentle ground, hopping cliffs only when needed.
// Then a stake every ~7 m, plus at the top and bottom of every climb. Output: src/node/routes.json (pasted into the game).
//   node src/node/routes.js
const CaveLib = require('../cavelib.js'), fs = require('fs');
const b = CaveLib({ sx: 1444, sz: 1486, top: 133.8 });
const C = b.CAV, D = b.DRIP, doors = b.DOORS;
function floorBelow(x, z, yTop, yBot) {      // the first rock surface under open air, scanning down from yTop
  let y = yTop, d = b.sdf(x, y, z);
  while (d > -0.3 && y > yBot) { y -= 1; d = b.sdf(x, y, z); }
  if (y <= yBot) return null;
  while (d < 0 && y > yBot) { y -= 0.25; d = b.sdf(x, y, z); }
  if (y <= yBot) return null;
  for (let k = 0; k < 6; k++) { const m = y + 0.125; if (b.sdf(x, m, z) < 0) break; y = m; }
  return y;
}
function route(name, cav, kFn, landing, door, water) {
  const H = 2, x0 = cav.x - cav.rx - 6, z0 = cav.z - cav.rz - 6, nx = Math.ceil((2 * cav.rx + 12) / H), nz = Math.ceil((2 * cav.rz + 12) / H);
  const F = new Float64Array(nx * nz).fill(NaN);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = x0 + i * H, z = z0 + j * H, f = floorBelow(x, z, cav.y + cav.ry * 0.25, cav.y - cav.ry - 12);
    if (f === null || kFn(x, f + 1, z) > 1.22) continue;
    if (b.sdf(x, f + 1.7, z) > -0.25) continue;            // no headroom
    if (water && f < water + 0.3) continue;                 // under the pool
    F[j * nx + i] = f;
  }
  const cell = p => [Math.round((p[0] - x0) / H), Math.round((p[2] - z0) / H)];
  const near = (p) => { const [ci, cj] = cell(p); let best = null, bd = 1e9; for (let i = ci - 4; i <= ci + 4; i++) for (let j = cj - 4; j <= cj + 4; j++) { if (i < 0 || j < 0 || i >= nx || j >= nz || isNaN(F[j * nx + i])) continue; const d = Math.hypot(i - ci, j - cj) + Math.abs(F[j * nx + i] - p[1]) * 0.5; if (d < bd) { bd = d; best = [i, j]; } } return best; };
  const s = near(landing), g = near(door); if (!s || !g) throw new Error(name + ': no start or goal cell');
  const N = nx * nz, cost = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), open = [[0, s[1] * nx + s[0]]];
  cost[s[1] * nx + s[0]] = 0; const gi = g[1] * nx + g[0];
  const hz = id => Math.hypot((id % nx - g[0]) * H, (Math.floor(id / nx) - g[1]) * H);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, id] = open.splice(bi, 1)[0]; if (id === gi) break;
    const i = id % nx, j = Math.floor(id / nx), f = F[id];
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue; const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= nx || c >= nz) continue;
      const nid = c * nx + a, f2 = F[nid]; if (isNaN(f2)) continue; const dh = f2 - f; if (Math.abs(dh) > 14) continue;
      const step = Math.hypot(di, dj) * H, w = step + Math.abs(dh) * 0.8 + Math.max(0, Math.abs(dh) - 1.3) * 6;   // gentle ground first, climbs cost extra
      const nc = cost[id] + w; if (nc < cost[nid]) { cost[nid] = nc; prev[nid] = id; open.push([nc + hz(nid), nid]); }
    }
  }
  if (!isFinite(cost[gi])) throw new Error(name + ': no route');
  const path = []; for (let id = gi; id >= 0; id = prev[id]) path.unshift([x0 + (id % nx) * H, F[id], z0 + Math.floor(id / nx) * H]);
  // stakes: every ~7 m along the way, and at the top and bottom of each climb; none right at the landing or the door
  const stakes = []; let run = 0;
  for (let k = 1; k < path.length; k++) {
    const p = path[k], q = path[k - 1], dh = p[1] - q[1]; run += Math.hypot(p[0] - q[0], p[2] - q[2]);
    const dl = Math.hypot(p[0] - landing[0], p[2] - landing[2]), dd = Math.hypot(p[0] - door[0], p[2] - door[2]);
    if (dl < 5 || dd < 4) continue;
    const climb = Math.abs(dh) > 2.5;
    if (run >= 7 || climb) { if (climb && stakes.length && Math.hypot(q[0] - stakes[stakes.length - 1][0], q[2] - stakes[stakes.length - 1][2]) > 2.5) stakes.push(q.map(v => +v.toFixed(2))); stakes.push(p.map(v => +v.toFixed(2))); run = 0; }
  }
  let climbs = 0, len = 0; for (let k = 1; k < path.length; k++) { len += Math.hypot(path[k][0] - path[k - 1][0], path[k][2] - path[k - 1][2]); if (Math.abs(path[k][1] - path[k - 1][1]) > 2.5) climbs++; }
  console.log(name + ': path ' + len.toFixed(0) + ' m, ' + climbs + ' climbs, ' + stakes.length + ' stakes, from y ' + path[0][1].toFixed(1) + ' to ' + path[path.length - 1][1].toFixed(1));
  return stakes;
}
const front = (d, v) => [d.x + d.dir[0] * v, d.floor, d.z + d.dir[1] * v];
const d8 = doors.find(d => d.name === 'D-8'), d9 = doors.find(d => d.name === 'D-9');
const LK = b.LAKE, d10 = doors.find(d => d.name === 'D-10');
const out = {
  'D-8': route('crystal cavern -> D-8', C, b.cavK, [C.drop[0], b.floorAt(C.drop[0], C.y + 22, C.drop[1]), C.drop[1]], front(d8, -4), C.pool),
  'D-9': route('stalactite cavern -> D-9', D, b.dripK, [D.drop[0], b.floorAt(D.drop[0], D.y + 10, D.drop[1]), D.drop[1]], front(d9, -4), null),
  // the lake: down the beach, along the lake floor (under water) to the bore's mouth, then into the bore to D-10
  'D-10': route('flooded cavern -> D-10', LK, b.lakeK, [LK.drop[0], b.floorAt(LK.drop[0], LK.y + 20, LK.drop[1]), LK.drop[1]], [LK.bore[0][0] + 8, -453.5, LK.bore[0][2]], null)
    .concat([[LK.bore[0][0] + 20, -452, LK.bore[0][2]], [LK.bore[0][0] + 30, -452, LK.bore[0][2]]]),
};
fs.writeFileSync(__dirname + '/routes.json', JSON.stringify(out));
