const B = require('./cavelib.js'); const b = B({ sx: 1444, sz: 1486, top: 133.8 }); const SX = 1444, SZ = 1486;
console.log('floorAt along D-8 drift (local x):', [100, 104, 108, 110, 111, 112, 114, 116, 118].map(x => { const f = b.floorAt(SX + x, -179.5, SZ - 15); return x + ':' + (f > 1e8 ? 'WALL' : f < -1e8 ? '-' : f.toFixed(1)); }).join(' '));
for (const y of [-180.2, -179, -178, -177, -176.5]) { let row = 'y' + y + ': '; for (let x = 100; x <= 124; x += 1) row += b.sdf(SX + x, y, SZ - 15) < 0 ? '.' : '#'; console.log(row); }
