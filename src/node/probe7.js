const B = require('./cavelib.js'); const b = B({ sx: 1444, sz: 1486, top: 133.8 }); const SX = 1444, SZ = 1486;
function down(x, z, y0, y1) { let prev = b.sdf(x, y0, z); for (let y = y0 - 0.25; y > y1; y -= 0.25) { const d = b.sdf(x, y, z); if (prev < 0 && d >= 0) return y.toFixed(1); prev = d; } return '.'; }
console.log('D-9 approach z=-15:', [248, 252, 256, 258, 260, 262, 266, 274, 282].map(x => x + ':' + down(SX + x, SZ - 15, -310.5, -330)).join(' '));
console.log(b.DOORS);
// D-8 drop: snag scan around the tube
let sn = []; for (let a = 0; a < 360; a += 7.5) for (const rr of [2.5, 3.0, 3.4]) { const x = SX + 120 + Math.cos(a * Math.PI / 180) * rr, z = SZ - 15 + Math.sin(a * Math.PI / 180) * rr; if (x < SX + 120 - 1) continue; const f = b.floorAt(x, -182, z); if (f > -300 && f < 1e8) sn.push([a, rr, +f.toFixed(1)]); }
console.log('D-8 drop snags', sn.length, sn.slice(0, 6));
