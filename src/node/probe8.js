const B = require('./cavelib.js'); const b = B({ sx: 1444, sz: 1486, top: 133.8 }); const SX = 1444, SZ = 1486;
for (const [x, z] of [[160, 45], [180, 50], [200, 45], [170, -60], [195, -62], [225, -50], [145, -45], [230, 35]]) {
  const p = b.floorNear(x, -300, z), w = b.dripWater(p[0], p[2]);
  console.log(x, z, 'floor', p[1].toFixed(1), w > -1e8 ? 'WET' : 'dry', 'dripK', b.dripK(p[0], p[1] + 1, p[2]).toFixed(2), 'sdf+1', b.sdf(p[0], p[1] + 1, p[2]).toFixed(2));
}
