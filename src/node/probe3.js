const B = require('./cavelib.js'); const b = B({ sx: 1444, sz: 1486, top: 133.8 });
const SX = 1444, SZ = 1486;
for (const z of [-60, -45, -30, -15, 0]) {
  let row = 'z ' + z + ': ';
  for (let x = 40; x <= 100; x += 6) { const f = b.floorAt(SX + x, -140, SZ + z); row += x + ':' + (f > 1e8 ? 'W' : f < -1e8 ? '-' : f.toFixed(0)) + ' '; }
  console.log(row);
}
console.log('crystal floor at centre', b.cavFloor(SX - 4, SZ - 40).toFixed(1), 'pool', b.CAV.pool);
