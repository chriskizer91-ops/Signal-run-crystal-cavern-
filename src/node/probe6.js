const B = require('./cavelib.js'); const b = B({ sx: 1444, sz: 1486, top: 133.8 }); const SX = 1444, SZ = 1486;
for (const z of [-25, -15, -5]) for (const y of [-312, -310, -306]) { let row = 'z' + z + ' y' + y + ': '; for (let x = 236; x <= 272; x += 2) row += b.sdf(SX + x, y, SZ + z) < 0 ? '.' : '#'; console.log(row); }
console.log('x: 236..272 step 2');
function down(x, z, y0, y1) { let prev = b.sdf(x, y0, z); for (let y = y0 - 0.25; y > y1; y -= 0.25) { const d = b.sdf(x, y, z); if (prev < 0 && d >= 0) return y.toFixed(1); prev = d; } return '.'; }
console.log('floor z=-15:', [236, 240, 244, 248, 252, 256, 260].map(x => x + ':' + down(SX + x, SZ - 15, -290, -340)).join(' '));
