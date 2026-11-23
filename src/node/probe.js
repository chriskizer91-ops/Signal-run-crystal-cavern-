const B = require('./cavelib.js'); const b = B({ sx: 1444, sz: 1486, top: 133.8 });
const X = 1444, Z0 = 1486;
for (const y of [-60, -64, -66, -68, -69, -70, -74, -80]) {
  let row = ''; for (let z = 14; z <= 26; z += 0.5) { const d = b.sdf(X, y, Z0 + z); row += d < 0 ? (d < -1 ? ' ' : '.') : '#'; } console.log(String(y).padStart(4), row);
}
console.log('z: 14 .. 26 step 0.5');
for (const z of [17, 19, 20, 21, 22, 23, 23.4]) console.log('floorAt z', z, b.floorAt(X, -57, Z0 + z).toFixed(2));
