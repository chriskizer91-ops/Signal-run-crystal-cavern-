// usage: node tally.js module item  -> triangles per source line of the build
const fs=require('fs'); global.window=global; eval(fs.readFileSync('assetkit.js','utf8'));
const K=AssetKit(); const P=K.MB.prototype; const tally={}; const file=process.argv[2];
for (const m of ['box','beam','cyl','lathe','sphere','tube','extrude','surf','plate','tri','quad']) { const o=P[m]; P[m]=function(...a){ const t0=this.tris; const st=new Error().stack.split('\n').filter(l=>l.includes('divesite')).map(l=>l.match(/:(\d+):\d+\)?$/)[1]); const r=o.apply(this,a); if(this.__top!==false){ const key=st[st.length-2]||st[0]; } return r; }; }
eval(fs.readFileSync(file,'utf8')); const mod=window.MODDEF.fn(K); const it=mod.items.find(i=>i.name===process.argv[3]);
// simpler: sample tris before/after each top-level statement is hard; use stack-based attribution at the build function level
const ob=K.MB.prototype.quad, ot=K.MB.prototype.tri; const cnt={};
K.MB.prototype.quad=function(...a){ const st=new Error().stack.split('\n'); const l=st.find(s=>s.includes('divesite')&&!s.includes('quad')); const ln=(l||'').match(/:(\d+):\d+\)?$/); const ln2=st.filter(s=>s.includes('divesite')).map(s=>(s.match(/:(\d+):\d+\)?$/)||[])[1]); const key=ln2[ln2.length-1-0]; cnt[key]=(cnt[key]||0)+2; return ob.apply(this,a); };
K.MB.prototype.tri=function(...a){ const st=new Error().stack.split('\n'); const ln2=st.filter(s=>s.includes('divesite')).map(s=>(s.match(/:(\d+):\d+\)?$/)||[])[1]); const key=ln2[ln2.length-1]; cnt[key]=(cnt[key]||0)+1; return ot.apply(this,a); };
it.build(1); console.log(Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,25).map(e=>'line '+e[0]+': '+e[1]).join('\n'));
