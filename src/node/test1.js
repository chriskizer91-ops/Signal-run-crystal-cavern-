const CaveLib=require('./cavelib.js');const T=require('./terr.js');
const C=CaveLib({sx:1444,sz:1486,top:T.height(1444,1486)});
console.log('segments',C.segCount,'chunks',C.chunks.length);
let t=Date.now();let tot1=0;for(const c of C.chunks){const r=C.meshChunk(c[0],c[1],c[2],1);tot1+=r.tris;}console.log('LOD1 all chunks',tot1,'tris',(Date.now()-t)+'ms');
// a few LOD0
t=Date.now();let tot0=0,n0=0;for(const c of C.chunks.slice(0,12)){const r=C.meshChunk(c[0],c[1],c[2],0);tot0+=r.tris;n0++;}console.log('LOD0 12 chunks',tot0,'tris',(Date.now()-t)+'ms');
// plan view
const fs=require('fs');const W=260,H=260,x0=1394,z0=1286,s=2;const img=Buffer.alloc(W*H);
for(let j=0;j<H;j++)for(let i=0;i<W;i++){const x=x0+i*s,z=z0+j*s;let v=0;for(let y=-140;y<-30;y+=1.5){const d=C.base(x,y,z);if(d<0){v=Math.max(v,Math.min(255,60+(-y-40)*1.8));}}img[j*W+i]=v;}
fs.writeFileSync('plan.pgm',Buffer.concat([Buffer.from('P5 '+W+' '+H+' 255\n'),img]));
// floor & ceiling at a few spots
for(const p of [[0,-53,0],[60,-55,10],[205,-62,50],[300,-66,-70]]){const x=1444+p[0],z=1486+p[2];console.log(p,'floor',C.floorAt(x,p[1],z).toFixed(2),'ceil',C.ceilAt(x,p[1]-1,z).toFixed(2),'day',C.dayAt(x,p[1],z,0,1,0).toFixed(4));}
