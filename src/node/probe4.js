const B = require('./cavelib.js'); const b = B({ sx: 1444, sz: 1486, top: 133.8 }); const SX = 1444, SZ = 1486;
const D = b.DRIP; console.log('drip', D);
const f = (x, y, z) => { const v = b.floorAt(SX + x, y, SZ + z); return v > 1e8 ? 'W' : v < -1e8 ? '-' : v.toFixed(1); };
console.log('D-8 approach z=-15:', [60, 66, 72, 78, 82, 86, 100, 112, 116].map(x => x + ':' + f(x, -177, -15)).join(' '));
console.log('fall from D-8 lip to', f(120, -185, -15));
for (const z of [-40, -15, 5, 25]) console.log('drip floor z=' + z + ':', [110, 130, 150, 170, 190, 210, 230, 240, 250, 260].map(x => x + ':' + f(x, -250, z)).join(' '));
let wet = 0, n = 0; for (let x = 100; x < 270; x += 1) for (let z = -85; z < 55; z += 1) { const w = b.dripWater(SX + x, SZ + z); if (b.dripK(SX + x, D.y - 30, SZ + z) < 1) { n++; if (w > -1e8) wet++; } }
console.log('pool coverage', (100 * wet / n).toFixed(0) + '% of', n, 'm2');
console.log('chunks', b.chunks.length, 'segments', b.segCount);
