const B = require('./cavelib.js'); const b = B({ sx: 1444, sz: 1486, top: 133.8 }); const SX = 1444, SZ = 1486;
const D = b.DRIP;
function down(x, z, y0, y1) { let prev = b.sdf(x, y0, z); for (let y = y0 - 0.25; y > y1; y -= 0.25) { const d = b.sdf(x, y, z); if (prev < 0 && d >= 0) return y.toFixed(1); prev = d; } return '.'; }
console.log('D-8 drift floor z=-15:', [60, 66, 72, 78, 82, 86, 100, 112, 116, 119].map(x => x + ':' + down(SX + x, SZ - 15, -177.5, -200)).join(' '));
console.log('D-8 drop lands', b.floorAt(SX + 120, -190, SZ - 15).toFixed(1));
for (const z of [-60, -40, -15, 5, 25, 45]) console.log('drip z=' + z + ':', [105, 120, 140, 160, 180, 200, 220, 240, 255, 265].map(x => x + ':' + down(SX + x, SZ + z, D.y + 40, D.y - 60)).join(' '));
let wet = 0, n = 0; for (let x = 100; x < 270; x += 1) for (let z = -85; z < 55; z += 1) { if (b.dripK(SX + x, b.dripFloor(SX + x, SZ + z) + 1, SZ + z) < 1) { n++; if (b.dripWater(SX + x, SZ + z) > -1e8) wet++; } }
console.log('pool coverage', (100 * wet / n).toFixed(0) + '% of', n, 'm2 of floor');
