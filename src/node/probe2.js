const B = require('./cavelib.js'); const b = B({ sx: 1444, sz: 1486, top: 133.8 });
const X = 1444, Z = 1506; let worst = [];
for (let a = 0; a < 360; a += 7.5) for (const rr of [2.5, 3.0, 3.4, 3.8]) {
  const x = X + Math.cos(a * Math.PI / 180) * rr, z = Z + Math.sin(a * Math.PI / 180) * rr;
  if (z < 1486 + 16.8) continue;   // that side is the drift floor
  const f = b.floorAt(x, -58, z); if (f > -170 && f < 1e8) worst.push([a, rr, +f.toFixed(1)]);
}
console.log('snag points in the drop (floor found above -170):', worst.length, worst.slice(0, 12));
const c = b.CAV; console.log('landing at axis', b.floorAt(X, -140, Z).toFixed(2));
