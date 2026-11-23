// usage (from the assets folder): node stats.js modules/vehicles.js [modules/originals/vehicles.js]
const fs=require('fs'); global.window=global;
eval(fs.readFileSync(__dirname+'/assetkit.js','utf8'));
function load(f){ eval(fs.readFileSync(f,'utf8')); const K=AssetKit(); return window.MODDEF.fn(K); }
function info(mod){ const o={}; for(const it of mod.items){ const hi=it.build(1), lo=it.build(0), b=hi.bounds(); o[it.name]={hiTris:hi.tris, loTris:lo.tris, budget:it.budget, min:b.min.map(v=>+v.toFixed(2)), max:b.max.map(v=>+v.toFixed(2)), colliders:JSON.stringify(it.colliders||[]), attach:JSON.stringify(it.attach||[])}; } return o; }
const A=info(load(process.argv[2])), B=process.argv[3]?info(load(process.argv[3])):null;
for(const k in A){ const a=A[k]; let line=`${k}: hi ${a.hiTris} tris, lo ${a.loTris} tris, budget ${a.budget}, bounds ${JSON.stringify(a.min)}..${JSON.stringify(a.max)}`;
  if(B&&B[k]){ const b=B[k]; line+=`\n   original: hi ${b.hiTris}, lo ${b.loTris}, bounds ${JSON.stringify(b.min)}..${JSON.stringify(b.max)}`; if(a.colliders!==b.colliders) line+='\n   !! colliders changed'; if(a.attach!==b.attach) line+='\n   !! attach points changed'; }
  console.log(line); }
if(B) for(const k in B) if(!A[k]) console.log('!! missing item', k);
