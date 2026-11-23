const A = require('./cavelib_v7.js'), B = require('./cavelib.js');
const cfg = { sx: 1444, sz: 1486, top: 133.8 };
const a = A(cfg), b = B(cfg), O = [-234, 90, -245];
let n = 0, bad = 0, maxd = 0, airA = 0, airB = 0;
let seed = 7; const r = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const C = a.CAV;
for (let i = 0; i < 20000; i++) {
  const x = C.x + (r() * 2 - 1) * 100, y = C.y + (r() * 2 - 1) * 58, z = C.z + (r() * 2 - 1) * 86;
  if (Math.hypot(x - (1444 + 234), z - (1486 + 265)) < 9) continue;           // skip the old drop column
  const da = a.sdf(x, y, z), db = b.sdf(x + O[0], y + O[1], z + O[2]); n++;
  if (da < 0) airA++; if (db < 0) airB++;
  const d = Math.abs(da - db); if (d > maxd) maxd = d; if (d > 0.05) bad++;
}
console.log('points', n, 'differ>5cm', bad, 'max diff', maxd.toFixed(3), 'air old/new', airA, airB);
console.log('old drop', a.CAV.drop, 'new drop', b.CAV.drop, 'door', b.DOOR, 'cavern centre', [b.CAV.x, b.CAV.y, b.CAV.z], 'pool', b.CAV.pool);
const D = b.DOOR;
const f = (x, y, z) => b.floorAt(x, y, z);
console.log('station floor', f(D.x, -55, D.z - 3).toFixed(2), 'drift floor', f(D.x, -55, D.z + 6).toFixed(2), 'lip z+11', f(D.x, -55, D.z + 11).toFixed(2), 'over drop', f(D.x, -55, D.z + 14.5));
console.log('landing below drop', f(b.CAV.drop[0], -138, b.CAV.drop[1]).toFixed(2), 'old landing', a.floorAt(a.CAV.drop[0], -228, a.CAV.drop[1]).toFixed(2));
console.log('old pit hole now', b.floorAt(1444 + 234, -126, 1486 + 265).toFixed(2), 'segments', a.segCount, b.segCount, 'chunks', a.chunks.length, b.chunks.length);
seed = 7; const pts = [];
for (let i = 0; i < 20000; i++) {
  const x = C.x + (r() * 2 - 1) * 100, y = C.y + (r() * 2 - 1) * 58, z = C.z + (r() * 2 - 1) * 86;
  if (Math.hypot(x - (1444 + 234), z - (1486 + 265)) < 9) continue;
  const da = a.sdf(x, y, z), db = b.sdf(x + O[0], y + O[1], z + O[2]);
  if (Math.abs(da - db) > 0.05) { a.base(x, y, z); pts.push([Math.round(x - C.x), Math.round(y - C.y), Math.round(z - C.z), +da.toFixed(2), +db.toFixed(2), +a.cavK(x, y, z).toFixed(2)]); }
}
const inside = pts.filter(p => p[5] < 0.97);
console.log('differing inside the dome', inside.length, inside.slice(0, 8));
console.log('outside', pts.length - inside.length, pts.filter(p => p[5] >= 0.97).slice(0, 5));
const f2 = (dz) => b.floorAt(D.x, -55, D.z + dz);
console.log('walk line:', [3, 8, 10.5, 11, 11.5, 12, 14.5, 17].map(dz => dz + ':' + (f2(dz) > 1e8 ? 'WALL' : f2(dz).toFixed(1))).join('  '));
