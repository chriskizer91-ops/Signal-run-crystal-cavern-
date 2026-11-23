# v12: the giant crystal cavern behind D-10. See-through titan crystals (exact shape, light bent through them),
# a lining of small crystals, the crystals' own light on everything, glowing mist, a clear pool, the pulse, the reveal.
# Run from the repo root after `python3 src/sync_cavelib.py to-game` and `cd assets && python3 splice_add.py ../game/signal-run.html geode`:
#   python3 src/patches/v12_giant_crystal_cavern.py
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
P = os.path.join(ROOT, 'game', 'signal-run.html')
s = open(P, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

rep("const CAVE_AREA = [CV.SX - 200, CV.SZ - 220, CV.SX + 560, CV.SZ + 320];", "const CAVE_AREA = [CV.SX - 200, CV.SZ - 220, CV.SX + 780, CV.SZ + 320];")

# --- shared shader bits: palette, the pulse, the titans' light, the glowing mist ---
GEO_GLSL = r"""const GEO_GLSL = `
vec3 geoHue(float h){ h=fract(h)*5.; int i=int(h); float f=h-float(i); f=f*f*(3.-2.*f);   // cyan, mint, violet, rose, gold
  const vec3 P[6]=vec3[6](vec3(0.16,0.82,1.0),vec3(0.30,1.0,0.76),vec3(0.58,0.40,1.0),vec3(1.0,0.40,0.78),vec3(1.0,0.74,0.38),vec3(0.16,0.82,1.0));
  return mix(P[i],P[min(i+1,5)],f); }
float geoPulseT(vec3 w, float T, vec2 c){ float ph=mod(T*16.-length(w.xz-c),300.); return 1.+1.1*exp(-ph*ph/400.); }   // a ring of light running out from the pool
float geoWakeT(vec3 w, float T, float seen, vec2 c){ return 0.12+0.88*seen*clamp((T*16.-length(w.xz-c)+20.)/30.,0.,1.); }   // dim until the first ring passes
`;
const GLSL_COMMON = `"""
rep("const GLSL_COMMON = `", GEO_GLSL)
rep("uniform vec4 uUG, uLd, uHole, uCav, uDrp, uFdP, uFdD, uLke, uUW; uniform vec3 uFlP, uFlD, uCavR, uDrpR, uLkeR;   // underground: x on/off, y headlamp, z daylight here, w exposure; shaft light; ground hole",
    "uniform vec4 uUG, uLd, uHole, uCav, uDrp, uFdP, uFdD, uLke, uUW; uniform vec3 uFlP, uFlD, uCavR, uDrpR, uLkeR;   // underground: x on/off, y headlamp, z daylight here, w exposure; shaft light; ground hole\nuniform vec4 uGeo, uGQ, uGS, uGL[32]; uniform vec3 uGeoR;   // the giant crystal cavern: where, light count / mist / pool, pulse time / woken, 16 crystal lights")
rep("""float lkK(vec3 w){ vec3 q=(w-uLke.xyz)/uLkeR; return (1.-smoothstep(0.95,1.3,length(q)))*uLke.w; }   // 1 inside the flooded cavern
""", """float lkK(vec3 w){ vec3 q=(w-uLke.xyz)/uLkeR; return (1.-smoothstep(0.95,1.3,length(q)))*uLke.w; }   // 1 inside the flooded cavern
${GEO_GLSL}
float geoK(vec3 w){ vec3 q=(w-uGeo.xyz)/uGeoR; return (1.-smoothstep(0.95,1.3,length(q)))*uGeo.w; }   // 1 inside the giant crystal cavern
float geoPulse(vec3 w){ return geoPulseT(w,uGS.x,uGQ.zw); }
float geoWake(vec3 w){ return geoWakeT(w,uGS.x,uGS.y,uGQ.zw); }
vec3 geoLight(vec3 w, vec3 n){ vec3 s=vec3(0.); int N=int(uGQ.x); if(N==0) return s;   // light from the nearest titans, each a glowing line from base to tip
  for(int i=0;i<16;i++){ if(i>=N) break; vec4 A=uGL[2*i], B=uGL[2*i+1]; vec3 ab=B.xyz-A.xyz; float t=clamp(dot(w-A.xyz,ab)/dot(ab,ab),0.,1.); vec3 L=A.xyz+ab*t-w; float d2=dot(L,L);
    s+=geoHue(B.w)*A.w*(max(dot(n,L)*inversesqrt(d2+1e-4),0.)*0.85+0.15)*(260./(260.+d2)); }
  return s*geoK(w); }
vec3 geoIso(vec3 w){ vec3 s=vec3(0.); int N=int(uGQ.x);   // the same light, from every side (for mist and water)
  for(int i=0;i<16;i++){ if(i>=N) break; vec4 A=uGL[2*i], B=uGL[2*i+1]; vec3 ab=B.xyz-A.xyz; float t=clamp(dot(w-A.xyz,ab)/dot(ab,ab),0.,1.); vec3 L=A.xyz+ab*t-w; s+=geoHue(B.w)*A.w*(260./(260.+dot(L,L))); }
  return s; }
vec3 geoMist(vec3 w, float d){ if(uGQ.y<0.5||uGQ.x<0.5) return vec3(0.); vec3 v=(w-uCam)/max(d,1e-3); float D=min(d,120.), j=hash21(gl_FragCoord.xy*0.37)-0.5; vec3 s=vec3(0.);   // the air glows near the titans
  for(int i=0;i<3;i++){ vec3 p=uCam+v*D*(float(i)+0.5+j*0.8)/3.; s+=geoIso(p)*geoK(p); }
  return s*D*0.0013; }
""")
rep("""  c=mix(c, vec3(0.004,0.008,0.009), (1.-exp(-d*0.008))*lkK(w)*0.8);
  if(uUW.x>0.5){ vec3 v=(w-uCam)/max(d,1e-3), q=uCam+v*min(d,5.); float cs=dot(normalize(q-uFlP),uFlD);   // under water: murk, and the lamp's beam glowing in it
    vec3 murk=vec3(0.004,0.017,0.016)+vec3(0.06,0.11,0.10)*smoothstep(0.82,0.97,cs)*uUG.y*(1.-exp(-min(d,9.)*0.3));
    c=mix(c, murk, 1.-exp(-d*uUW.w)); }
  else if(w.y<uUW.y){ float lk=lkK(w); if(lk>0.){ vec3 v=normalize(w-uCam); float path=(uUW.y-w.y)/max(-v.y,0.1); c=mix(c, vec3(0.003,0.012,0.012), (1.-exp(-path*uUW.w*1.2))*lk); } }   // looking down into the lake""",
"""  c=mix(c, vec3(0.004,0.008,0.009), (1.-exp(-d*0.008))*lkK(w)*0.8);
  float gk=geoK(w); if(gk>0.){ c=mix(c, vec3(0.006,0.007,0.018), (1.-exp(-d*0.0042))*gk*0.7); if(uUW.x<0.5) c+=geoMist(w,d); }
  if(uUW.x>0.5){ vec3 v=(w-uCam)/max(d,1e-3), q=uCam+v*min(d,5.); float cs=dot(normalize(q-uFlP),uFlD);   // under water: murk, and the lamp's beam glowing in it
    vec3 murk=vec3(0.004,0.017,0.016)+vec3(0.06,0.11,0.10)*smoothstep(0.82,0.97,cs)*uUG.y*(1.-exp(-min(d,9.)*0.3));
    float gc=geoK(uCam); if(gc>0.) murk=mix(murk, murk*0.5+vec3(0.006,0.03,0.035)*geoWake(uCam)+geoIso(uCam+v*min(d,6.))*0.02, gc);   // the crystal pool glows
    if(uGS.z>0.){ vec3 Pc=vec3(uGQ.z,uUW.y-22.,uGQ.w), w0=Pc-uCam; vec3 cl=uCam+v*clamp(dot(w0,v),0.,d)-Pc;   // down the bore: light from the crystal pool ahead
      murk+=vec3(0.12,0.55,0.65)*geoPulseT(Pc,uGS.x,uGQ.zw)*(0.5+0.5*uGS.y)*exp(-dot(cl,cl)/600.)*(60./(60.+dot(w0,w0)*0.02)); }
    c=mix(c, murk, 1.-exp(-d*uUW.w)); }
  else if(w.y<uUW.y){ float lk=lkK(w), gp=geoK(w); if(lk+gp>0.){ vec3 v=normalize(w-uCam); float path=(uUW.y-w.y)/max(-v.y,0.1);   // looking down into the water
    c=mix(c, mix(vec3(0.003,0.012,0.012), vec3(0.01,0.07,0.08)+geoIso(w+vec3(0.,4.,0.))*0.02, gp), (1.-exp(-path*uUW.w*1.2))*max(lk,gp)); } }""")
rep("+0.01+cavAmb(w)*2.6+drpAmb(w,n)*2.6)*uUG.w, uUG.x); }", "+0.01+cavAmb(w)*2.6+drpAmb(w,n)*2.6+geoLight(w,n)*1.3)*uUG.w, uUG.x); }")

# --- rock: an agate lining in the giant cavern, banded like the inside of a geode, lit by the titans ---
rep("  if(k>3.5){ float g=abs(fract(w.x*2.)-0.5); col=vec3(0.05,0.055,0.06)*mix(1.,0.35,smoothstep(0.43,0.48,g)); }",
"""  float gk=geoK(w);
  if(gk>0.&&k<1.5){ vec3 q=(w-uGeo.xyz)/uGeoR; float rr=length(q)+0.05*vnoise3(w*0.06)+0.012*vnoise3(w*0.6), b=rr*46.;
    float bd=0.5+0.5*sin(b+2.5*vnoise3(w*0.025));
    vec3 ag=mix(vec3(0.24,0.24,0.33), vec3(0.52,0.50,0.62), bd);
    ag=mix(ag, vec3(0.84,0.82,0.90), smoothstep(0.9,0.98,0.5+0.5*sin(b*2.6+1.3))*0.35);
    ag=mix(ag, vec3(0.46,0.30,0.52), smoothstep(0.7,0.9,vnoise3(w*0.045+4.))*0.4);
    ag*=0.8+0.4*vnoise3(w*0.9)*mix(0.6,alb,0.5);
    col=mix(col, ag, gk); }
  if(k>3.5){ float g=abs(fract(w.x*2.)-0.5); col=vec3(0.05,0.055,0.06)*mix(1.,0.35,smoothstep(0.43,0.48,g)); }""")
rep("  c+=col*cavAmb(w)*2.4*face*face+col*drpAmb(w,n)*2.;\n",
    "  c+=col*cavAmb(w)*2.4*face*face+col*drpAmb(w,n)*2.;\n  if(gk>0.){ vec3 gl0=geoLight(w,n); c+=col*(gl0*1.25+vec3(0.05,0.065,0.13)*gk*geoWake(w)); c+=gl0*pow(max(dot(n,normalize(normalize(uGeo.xyz-w)+v)),0.),24.)*0.04; }\n")
# small crystals: the cavern's palette, the pulse, the titans' light
rep("  vec3 hue=mix(vec3(0.16,0.88,1.0), vec3(0.70,0.30,1.0), clamp(vI.x+(vC.g-0.5)*0.3,0.,1.));\n  float pulse=0.84+0.16*sin(uT*0.55+vI.x*9.+vW.x*0.04+vW.z*0.03);\n",
    "  vec3 hue=mix(vec3(0.16,0.88,1.0), vec3(0.70,0.30,1.0), clamp(vI.x+(vC.g-0.5)*0.3,0.,1.));\n  float gk=geoK(vW); if(gk>0.) hue=mix(hue, geoHue(vI.x+(vC.g-0.5)*0.08), gk);\n  float pulse=0.84+0.16*sin(uT*0.55+vI.x*9.+vW.x*0.04+vW.z*0.03); if(gk>0.) pulse*=mix(1.,geoPulse(vW),gk);\n")
rep("  c=haze(c,vW); o=vec4(tone(c*uUG.w), clamp(core*0.6+fr*0.15,0.,1.)); }", "  if(gk>0.){ float wk=mix(1.,geoWake(vW),gk); c*=wk; core*=wk; }\n  c=haze(c,vW); o=vec4(tone(c*uUG.w), clamp(core*0.6+fr*0.15,0.,1.)); }")
rep("body=h2*(0.02+(fl+floodL(vW,n))*0.32+cavAmb(vW)*1.1)*(1.-0.4*cloud);", "body=h2*(0.02+(fl+floodL(vW,n))*0.32+cavAmb(vW)*1.1+geoLight(vW,n)*0.45)*(1.-0.4*cloud);")
# the pool in the giant cavern: clear water lit from below by the drowned titans
rep("""void main(){ vec2 p=vW.xz; float t=uT; bool below=uCam.y<vW.y;
  vec3 n=normalize(vec3((vnoise(p*0.9+t*0.25)-0.5)*0.05+sin(p.x*1.7+t*0.6)*0.01, 1., (vnoise(p*0.8-t*0.2+7.)-0.5)*0.05+cos(p.y*1.5+t*0.5)*0.01)); if(below) n=-n;
""", """void main(){ vec2 p=vW.xz; float t=uT; bool below=uCam.y<vW.y;
  vec3 n=normalize(vec3((vnoise(p*0.9+t*0.25)-0.5)*0.05+sin(p.x*1.7+t*0.6)*0.01, 1., (vnoise(p*0.8-t*0.2+7.)-0.5)*0.05+cos(p.y*1.5+t*0.5)*0.01)); if(below) n=-n;
  if(geoK(vW)>0.5){ vec3 v=normalize(uCam-vW); float cv=abs(dot(n,v)), fr=0.03+0.97*pow(1.-cv,5.);
    vec3 up=vec3(0.006,0.035,0.042)+geoIso(vW-vec3(0.,3.,0.))*0.05;      // light from the crystals under the water
    vec3 Lh=normalize(uFlP-vW); float sp=pow(max(dot(n,normalize(Lh+v)),0.),220.)*uUG.y*2.2;
    if(below){ float win=smoothstep(0.6,0.7,cv); vec3 c=mix(up*1.6, geoIso(vW+vec3(0.,6.,0.))*0.04, win); o=vec4(tone(haze(c,vW)*uUG.w), mix(0.9,0.2,win)); return; }   // from under: a window to the cavern, mirror outside it
    vec3 rd=reflect(-v,n); float gs=smoothstep(0.9,1.,vnoise(rd.xz/max(rd.y,0.2)*9.+t*0.03));
    vec3 c=mix(up, geoIso(vW+rd*30.)*0.045+geoIso(vW+rd*8.)*0.02*gs, fr)+vec3(1.,.95,.85)*sp;
    o=vec4(tone(haze(c,vW)*uUG.w), mix(0.28,0.95,fr)); return; }
""")

# --- the titans: exact shape, light bent through them, glowing from inside; and far glitter ---
TITAN = r"""const TITAN_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aC;
layout(location=3) in vec4 iA; layout(location=4) in vec4 iB; layout(location=5) in vec4 iC;
uniform mat4 uVP; out vec3 vW; out vec3 vN; out vec4 vC; flat out vec3 vO; flat out vec3 vX; flat out vec3 vY; flat out vec3 vZ; flat out vec4 vT;
void main(){ vec3 f=iB.xyz, s=normalize(cross(f, abs(f.y)>0.95?vec3(1,0,0):vec3(0,1,0))), u=cross(s,f);
  float c=cos(iC.z), sn=sin(iC.z); vec3 s2=s*c+u*sn, u2=u*c-s*sn; float L=iA.w, W=iA.w*iB.w;
  vW=iA.xyz+f*(aP.y*L)+(s2*aP.x+u2*aP.z)*W; vN=normalize(s2*(aN.x/W)+f*(aN.y/L)+u2*(aN.z/W));
  vC=aC; vO=iA.xyz; vX=s2/W; vY=f/L; vZ=u2/W; vT=vec4(L,W,iC.x,iC.y); gl_Position=uVP*vec4(vW,1.); }`;
const TITAN_FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec4 vC; flat in vec3 vO; flat in vec3 vX; flat in vec3 vY; flat in vec3 vZ; flat in vec4 vT;
uniform sampler2D uGrab; uniform vec2 uRes; uniform float uGrabOn; uniform int uSteps; uniform mat4 uVP; out vec4 o;
${GLSL_COMMON}
const float TA=0.17, TK=0.7727273;
const vec2 HX[6]=vec2[6](vec2(1.,0.),vec2(0.5,0.8660254),vec2(-0.5,0.8660254),vec2(-1.,0.),vec2(-0.5,-0.8660254),vec2(0.5,-0.8660254));
vec3 toU(vec3 p){ vec3 d=p-vO; return vec3(dot(d,vX),dot(d,vY),dot(d,vZ)); }   // into the crystal's own frame: unit length, apothem 0.17
vec3 dirU(vec3 v){ return vec3(dot(v,vX),dot(v,vY),dot(v,vZ)); }
vec3 nW(vec3 N){ return normalize(N.x*vX+N.y*vY+N.z*vZ); }
void cut(vec3 N, float D, vec3 q, vec3 d, inout float tn, inout float tf, inout vec3 nI, inout vec3 nO){
  float den=dot(N,d), num=D-dot(N,q);
  if(den<-1e-9){ float t=num/den; if(t>tn){ tn=t; nI=N; } } else if(den>1e-9){ float t=num/den; if(t<tf){ tf=t; nO=N; } } else if(num<0.){ tn=1e9; tf=-1e9; } }
vec2 hull(vec3 q, vec3 d, float s, out vec3 nI, out vec3 nO){   // a ray against the crystal's 13 faces (shrunk by s about its base): metres in, metres out
  float tn=-1e9, tf=1e9; nI=vec3(0.,-1.,0.); nO=vec3(0.,1.,0.);
  q.y+=0.06; q/=s; q.y-=0.06; d/=s;
  for(int i=0;i<6;i++){ cut(vec3(HX[i].x,0.,HX[i].y),TA,q,d,tn,tf,nI,nO); cut(vec3(HX[i].x,TK,HX[i].y),TK,q,d,tn,tf,nI,nO); }
  cut(vec3(0.,-1.,0.),0.06,q,d,tn,tf,nI,nO);
  return vec2(tn,tf); }
void main(){
  vec3 V=vW-uCam; float dist=length(V); vec3 v=V/dist;
  vec3 nI, nO; vec2 th=hull(toU(uCam),dirU(v),1.,nI,nO); if(th.y<=th.x) th=vec2(dist,dist+0.02);
  bool inside=th.x<0.; if(!inside && abs(dist-th.x)>abs(dist-th.y)) discard;   // only the faces nearest the eye
  vec3 Ng=inside? -nW(nO) : nW(nI), nm=normalize(vN); if(dot(nm,v)>0.) nm=-nm;
  vec3 n=normalize(Ng+nm);                                                     // the true face, with the model's fine growth lines
  float frost=vC.r, lines=vC.g, edge=vC.b, L=vT.x, glow=vT.w; vec3 hue=geoHue(vT.z), h2=hue*hue, ec=h2;
  float wake=geoWake(vW), pul=geoPulse(vW), cosI=max(dot(-v,n),0.), F=0.04+0.96*pow(1.-cosI,5.);
  // bend in, cross the crystal, bend out
  vec3 dIn=v, pOut=vW, dOut=v, qa=toU(vW), da=dirU(v); float path=dist, tir=0.;
  if(!inside){ dIn=refract(v,n,1./1.55); if(dot(dIn,dIn)<0.5) dIn=v; qa=toU(vW); da=dirU(dIn);
    vec3 m1, m2; vec2 ex=hull(qa,da,1.,m1,m2); path=clamp(ex.y,0.05,3.*L); pOut=vW+dIn*path; vec3 nOut=nW(m2);
    dOut=refract(dIn,-nOut,1.55); if(dot(dOut,dOut)<0.5){ tir=1.; dOut=reflect(dIn,-nOut); } }
  else { qa=toU(uCam); da=dirU(v); dOut=refract(v,Ng,1.55); if(dot(dOut,dOut)<0.5) dOut=v; }
  vec3 sig=(1.-hue)*0.07+0.008+frost*0.03+lines*0.015, T=exp(-sig*path)*(1.-F);
  // what is behind, seen through the crystal: bent, tinted, split into colours at the edges, blurred where frosted
  vec2 uv0=gl_FragCoord.xy/uRes; vec4 cp=uVP*vec4(pOut+dOut*28.,1.); vec2 uv=cp.w>0.5? cp.xy/cp.w*0.5+0.5 : uv0, dv0=clamp(uv-uv0,vec2(-0.25),vec2(0.25)); float kk=1.;
  if(uv0.x+dv0.x>0.995) kk=min(kk,(0.995-uv0.x)/dv0.x); if(uv0.x+dv0.x<0.005) kk=min(kk,(uv0.x-0.005)/-dv0.x); if(uv0.y+dv0.y>0.995) kk=min(kk,(0.995-uv0.y)/dv0.y); if(uv0.y+dv0.y<0.005) kk=min(kk,(uv0.y-0.005)/-dv0.y);
  uv=uv0+dv0*max(kk,0.);   // never look past the edge of the screen (no smeared streaks)
  vec3 bg=vec3(0.); float bgA=0.;
  if(uGrabOn>0.5){ vec2 dv=uv-uv0; vec4 g=texture(uGrab,uv); bg=vec3(texture(uGrab,uv0+dv*0.955).r, g.g, texture(uGrab,clamp(uv0+dv*1.05,0.003,0.997)).b); bgA=g.a;
    if(frost>0.05){ vec2 r=vec2(frost*0.012, frost*0.012*uRes.x/uRes.y); bg=mix(bg,(texture(uGrab,uv+vec2(r.x,0.)).rgb+texture(uGrab,uv-vec2(r.x,0.)).rgb+texture(uGrab,uv+vec2(0.,r.y)).rgb+texture(uGrab,uv-vec2(0.,r.y)).rgb)*0.25,min(frost*1.5,1.)); } }
  // light from inside: brightest along the core, rising toward the tip, with veils of inclusions; deep light dims on its way out
  float j=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715)))), S=float(uSteps), dt=path/S, sg=dot(sig,vec3(0.3333)), Es=0., Ec=0.;
  for(int i=0;i<8;i++){ if(i>=uSteps) break;
    float tt=(float(i)+j)*dt; vec3 p=(inside?uCam+v*tt:vW+dIn*tt), q=toU(p);
    float r=max(max(abs(dot(HX[0],q.xz)),abs(dot(HX[1],q.xz))),abs(dot(HX[2],q.xz)))/TA;
    float veil=vnoise3(p*0.21+vec3(0.,uT*0.04,0.)); veil=veil*veil*veil*1.6;
    float at=exp(-sg*tt), up=0.4+0.6*smoothstep(-0.06,0.75,q.y); Ec+=exp(-r*r*9.)*2.*up*at; Es+=(0.05*up+veil)*at; }
  float kE=dt*glow*wake*pul*0.035*(1.+tir*0.25); Es*=kE; Ec*=kE;
  // phantoms: ghost outlines of the crystal's earlier, smaller selves, brightest where seen edge-on
  float ph=0., seed=hash11(dot(vO,vec3(0.13,0.71,0.37)));
  if(seed>0.25) for(int k=0;k<2;k++){ float sc=k==0?0.55+0.1*seed:0.8+0.07*seed; vec3 a1,a2; vec2 h=hull(qa,da,sc,a1,a2);
    if(h.y>h.x){ if(h.x>0.&&h.x<path) ph+=1./max(abs(dot(dIn,nW(a1))),0.12); if(h.y>0.&&h.y<path) ph+=1./max(abs(dot(dIn,nW(a2))),0.12); } }
  ph*=glow*wake*pul*0.03;
  // the surface: frost catches light, facet edges shine, the faces mirror the other titans
  vec3 fl=flashL(vW,n)+floodL(vW,n), gL=geoLight(vW,n), Lh=normalize(uFlP-vW), rd=reflect(v,n), gli=vec3(0.);
  float sp=pow(max(dot(n,normalize(Lh-v)),0.),160.)*(1.-frost*0.8);
  int N=int(uGQ.x); for(int i=0;i<16;i++){ if(i>=N) break; vec4 A=uGL[2*i], B=uGL[2*i+1]; if(distance(A.xyz,vO)<0.2*L) continue;
    vec3 ab=B.xyz-A.xyz, w0=A.xyz-vW; float a=dot(ab,ab), b=dot(ab,rd), d=dot(ab,w0), e=dot(rd,w0), dn=a-b*b, sa=dn>1e-4?clamp((b*e-d)/dn,0.,1.):0.;
    vec3 cpt=A.xyz+ab*sa-vW; float cl=length(cpt); gli+=geoHue(B.w)*A.w*pow(max(dot(rd,cpt/cl),0.),28.)*(900./(900.+cl*cl)); }
  vec3 own=ec*(Es+ph)+mix(hue,vec3(1.),0.3)*hue*Ec+mix(h2,hue,0.6)*edge*(0.18+(Es+Ec)*0.5)*wake+hue*(fl*0.22+gL*0.15)*(0.04+frost*0.8)+hue*lines*gL*0.15+(fl*sp*1.2+gli*0.6)*(0.12+F);
  own*=(1.-lines*0.3)*(1.-(1.-exp(-dist*0.0042))*geoK(vW)*0.7);
  vec3 tOwn=tone(own*uUG.w);
  if(uGrabOn>0.5){ vec3 tr=bg*pow(T,vec3(0.6))*(1.-lines*0.3); o=vec4(1.-(1.-tr)*(1.-tOwn), clamp(max(bgA*dot(T,vec3(0.3333)), dot(ec,vec3(0.3))*(Es+ph)*0.9+dot(hue,vec3(0.3))*Ec*1.2+edge*0.12*wake),0.,1.)); }
  else o=vec4(tOwn, clamp(1.-dot(T,vec3(0.3333))*0.8,0.35,1.));
}`;
const GEOPT_VS = `#version 300 es
layout(location=0) in vec4 aA; layout(location=1) in vec4 aB; layout(location=2) in vec4 aC;
uniform mat4 uVP; uniform vec3 uCam; uniform float uPx; uniform vec4 uGS; out vec3 vCol;
${GEO_GLSL}
void main(){ vec3 p=aA.xyz+aB.xyz*aA.w*0.3; gl_Position=uVP*vec4(p,1.); float d=length(p-uCam);
  gl_PointSize=clamp(aA.w*300./d,1.,5.)*uPx; float tw=0.5+0.5*sin(uGS.x*(0.7+fract(aC.z*3.1))+aC.z*17.);
  vCol=geoHue(aC.x)*aC.y*(0.25+0.75*tw)*geoPulseT(p,uGS.x,uGS.zw)*geoWakeT(p,uGS.x,uGS.y,uGS.zw)*smoothstep(38.,60.,d)*clamp(1.-d/380.,0.,1.)*0.75; }`;
const GEOPT_FS = `#version 300 es
precision highp float; in vec3 vCol; out vec4 o;
void main(){ vec2 q=gl_PointCoord*2.-1.; float r=dot(q,q); if(r>1.) discard; float a=1.-r; o=vec4(vCol*a, clamp(dot(vCol,vec3(0.3))*a,0.,1.)); }`;
const LINE_VS = `#version 300 es"""
rep("const LINE_VS = `#version 300 es", TITAN)
rep("pLake = prog(POOL_VS, LAKE_FS), pFish = prog(FISH_VS, FISH_FS), pSilt = prog(SILT_VS, SILT_FS);",
    "pLake = prog(POOL_VS, LAKE_FS), pFish = prog(FISH_VS, FISH_FS), pSilt = prog(SILT_VS, SILT_FS), pTitan = prog(TITAN_VS, TITAN_FS), pGeoPt = prog(GEOPT_VS, GEOPT_FS);")
rep("gl.uniform4f(p.u.uUW, LAKER.camUnder ? 1 : 0, CV.LAKE.water, 1, 0.115);", "gl.uniform4f(p.u.uUW, LAKER.camUnder ? 1 : 0, CV.LAKE.water, 1, 0.115 - 0.093 * GEOR.clearK);")
rep("  if (p.u.uFdP) { const F = cave.flood;", "  geoUniforms(p);\n  if (p.u.uFdP) { const F = cave.flood;")

# --- the runtime: placing titans and the lining, the lights, drawing, the reveal ---
rt = open(os.path.join(ROOT, 'src', 'runtime', 'geode_runtime.js'), encoding='utf-8').read()
rep("function caveStep(nx, nz, f) {\n", rt + "function caveStep(nx, nz, f) {\n")
rep(" cavernInit(); doorInit(); dripInit(); lakeInit();", " cavernInit(); geoInit(); doorInit(); dripInit(); lakeInit();")   # before doorInit: it adds the GEO route stakes
rep("  drawDrip();\n  drawLake();\n", "  drawDrip();\n  drawLake();\n  drawGeo();\n")
rep("  drawDripFx();\n  drawLakeFx();\n", "  drawDripFx();\n  drawLakeFx();\n  drawGeoFx();\n")
rep("  if (cave.surface) drawGlow();\n  drawCaveFx();\n", "  if (cave.surface) drawGlow();\n  if (cave.visible) drawTitans(useFx);\n  drawCaveFx();\n")
rep("  doorUpdate(dt); lakeUpdate(dt);\n", "  doorUpdate(dt); lakeUpdate(dt); geoUpdate(dt);\n")
# which rock to draw: a fifth zone for the giant cavern, and the lake no longer draws it
rep("const D9 = CV.LAKE.drop, zone = E[1] > -118 && !inCol(D7) ? 0 : E[1] > -225 ? 1 : E[1] > -345 ? 2 : 3;   // 0: Level 1, 1: crystal cavern, 2: stalactite cavern, 3: flooded cavern",
    "const D9 = CV.LAKE.drop, GX = CV.SX + 470, zone = E[0] > GX && E[1] < -200 ? 4 : E[1] > -118 && !inCol(D7) ? 0 : E[1] > -225 ? 1 : E[1] > -345 ? 2 : 3;   // 0: Level 1, 1: crystal cavern, 2: stalactite cavern, 3: flooded cavern, 4: giant crystal cavern")
rep(": zone === 2 ? (c.y0 > -230 && !nearCol(c, D8)) || (top < -355 && !nearCol(c, D9)) : c.y0 > -350 && !nearCol(c, D9)) continue;",
    ": zone === 2 ? (c.y0 > -230 && !nearCol(c, D8)) || (top < -355 && !nearCol(c, D9)) : zone === 3 ? (c.y0 > -350 && !nearCol(c, D9)) || (c.x0 > GX && c.y0 > -432) : c.x0 + CAVE_CH < CV.SX + 380 || c.y0 > -200) continue;")
# rock: a rough copy just behind each close-up piece fills the hairline gaps where close-up and rough pieces meet (they show against the bright geode)
rep("uniform mat4 uVP; out vec3 vW; out vec3 vN; out vec2 vD;\nvoid main(){ vW=aP; vN=aN; vD=aD; gl_Position=uVP*vec4(aP,1.); }`;",
    "uniform mat4 uVP; uniform vec3 uCam; uniform float uSink; out vec3 vW; out vec3 vN; out vec2 vD;\nvoid main(){ vW=aP; vN=aN; vD=aD; gl_Position=uVP*vec4(aP+normalize(aP-uCam)*uSink,1.); }`;")
rep("  setCommon(pCave); gl.disable(gl.CULL_FACE);\n", "  setCommon(pCave); gl.disable(gl.CULL_FACE); gl.uniform1f(pCave.u.uSink, 0); const under = [];\n")
rep("""    gl.bindVertexArray(m.vao); stats.cave += drawElems(m.count, gl.UNSIGNED_INT, 0);
  }
""", """    gl.bindVertexArray(m.vao); stats.cave += drawElems(m.count, gl.UNSIGNED_INT, 0);
    if (m === c.m[0] && c.m[1] && c.m[1].count) under.push(c.m[1]);
  }
  if (under.length) { gl.uniform1f(pCave.u.uSink, 0.15); for (const u of under) { gl.bindVertexArray(u.vao); stats.cave += drawElems(u.count, gl.UNSIGNED_INT, 0); } gl.uniform1f(pCave.u.uSink, 0); }
""")
# physics: stand on titans, slide along them
rep("    if (floorY > 1e8) floorY = CV.floorAt(state.px, state.py, state.pz, true);   // pressed against cave rock: land on the floor, not on the wall\n",
    "    if (floorY > 1e8) floorY = CV.floorAt(state.px, state.py, state.pz, true);   // pressed against cave rock: land on the floor, not on the wall\n    if (cave.under) floorY = Math.max(floorY, geoFloorY(state.px, state.pz, state.py));   // the top of a titan\n")
rep("    if (cave.under) cave.ceil = CV.ceilAt(state.px, state.py, state.pz);\n    caveUpdate(dt);\n",
    "    if (cave.under) { geoPush(); cave.ceil = CV.ceilAt(state.px, state.py, state.pz); }\n    caveUpdate(dt);\n")
# the fish keep to their own lake: they follow you into the mouth of the bore, no further
rep("const P = [state.px, state.py + 1.4, state.pz], playerIn = inWater(P[0], P[1], P[2]), t = state.time", "const P = [state.px, state.py + 1.4, state.pz], playerIn = inWater(P[0], P[1], P[2]) && CV.lakeK(P[0], P[1], P[2]) < 1.3, t = state.time")
# water: the giant cavern's pool counts as water
rep("  if (CV.lakeK(x, y, z) < 1.08) return true;\n", "  if (CV.lakeK(x, y, z) < 1.08 || CV.geoK(x, y, z) < 1.05) return true;\n")
# D-10 opens now; in the campaign it needs its coupling, which lies on the lake floor
rep("function doorReady(D) { return D.name !== 'D-10'; }     // D-10: the giant crystal cavern beyond it comes in the next build", "function doorReady(D) { return true; }")
rep("  { door: 'D-9', at: CV.floorNear(170, -300, -60), packYaw: 2.1 },\n", "  { door: 'D-9', at: CV.floorNear(170, -300, -60), packYaw: 2.1 },\n  { door: 'D-10', at: CV.floorNear(318, -432, -7), packYaw: 1.2 },   // on the lake floor, 16 m down\n")
rep("toast(D.i === 0 ? (game.free ? 'The deep door grinds open.' : 'The deep door has power again. It grinds open.') : game.free ? D.name + ' grinds open.' : 'You seat the coupling in ' + D.name + '. Its panel lights, and the door grinds open.', 5);",
    "toast((D.i === 0 ? (game.free ? 'The deep door grinds open.' : 'The deep door has power again. It grinds open.') : game.free ? D.name + ' grinds open.' : 'You seat the coupling in ' + D.name + '. Its panel lights, and the door grinds open.') + (D.name === 'D-10' ? ' Far down the bore, a light is pulsing.' : ''), D.name === 'D-10' ? 7 : 5);")
# the spare dive tank on the station's rack: twice the air (campaign; free play has it already)
rep("  place('divesite', 'tank_rack', S[0] - 4, S[1] - 3, 0.4);", "  LAKER.rack = place('divesite', 'tank_rack', S[0] - 4, S[1] - 3, 0.4);")
rep("  if (head) LAKER.air = Math.max(0, LAKER.air - dt * 100 / 75);", "  const R = LAKER.rack; if (R && !cave.tank && !game.free && cave.under && Math.hypot(R.p[0] - px, R.p[2] - pz) < 2.6 && Math.abs(R.p[1] - py) < 2.5) { cave.tank = true; tone([523, 659, 784], 0.5, 'triangle', 0.15); toast('You clip a spare tank from the rack onto your suit. Your air now lasts twice as long.', 7); saveGame(); }\n  if (head) LAKER.air = Math.max(0, LAKER.air - dt * 100 / (cave.tank || game.free ? 150 : 75));")
# saving: the spare tank, and whether you have seen the giant cavern
rep("parts: (cave.parts || []).slice(), batt:", "parts: (cave.parts || []).slice(), tank: cave.tank ? 1 : 0, geo: GEOR.seen ? 1 : 0, batt:")
rep("cave.parts = PARTS.map(() => false); cave.batt = 100;", "cave.parts = PARTS.map(() => false); cave.tank = false; GEOR.seen = false; GEOR.pt0 = 0; cave.batt = 100;")
rep("if (Array.isArray(c.parts)) cave.parts = PARTS.map((p, i) => !!c.parts[i]);", "if (Array.isArray(c.parts)) cave.parts = PARTS.map((p, i) => !!c.parts[i]); cave.tank = !!c.tank; if (c.geo) { GEOR.seen = true; GEOR.pt0 = -1e4; }")
# jumping straight there for tests and demos
rep("  else if (where === 'drip') {", "  else if (where === 'pool' || where === 'geo') { const C = GEOC; state.px = where === 'pool' ? C.pool[0] - 6 : C.pool[0] - 4; state.pz = C.pool[1] + (where === 'pool' ? 0 : 24); state.py = where === 'pool' ? LWL - 1.25 : CV.floorAt(state.px, LWL + 12, state.pz); state.yaw = -Math.PI / 2; state.heading = Math.PI / 2; state.pitch = where === 'pool' ? 0.12 : 0.2; }\n  else if (where === 'drip') {")
rep("['crystal', 'door', 'cavern', 'd8', 'd9', 'drip', 'lake', 'd10'].includes(at)", "['crystal', 'door', 'cavern', 'd8', 'd9', 'drip', 'lake', 'd10', 'pool', 'geo'].includes(at)")
rep("window.__bench = { DOOR, DOORS, PARTS, FLOODS, STAKES, DRIPR, LAKER, inWater, logShow,", "window.__bench = { DOOR, DOORS, PARTS, FLOODS, STAKES, DRIPR, LAKER, GEOR, GEOQ, inWater, logShow,")
open(P, 'w', encoding='utf-8').write(s)
print('v12 patch applied')
