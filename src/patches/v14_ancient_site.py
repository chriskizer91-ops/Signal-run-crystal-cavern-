# v14: the ancient site beyond the giant crystal cavern. A second bore from the giant cavern's east terrace, a 71 m drop,
# halls of black stone with glowing channels and glyphs, five artifacts to scan, the answer to the signal (walk the plates
# in the order the chamber plays), and the hologram of an ancient builder, whose message the suit AI only partly translates.
# Builds from v13. Run from the repo root after:
#   cp game/versions/signal-run-v13-dry-tunnel.html game/signal-run.html
#   python3 src/sync_cavelib.py to-game
#   cd assets && python3 splice_add.py ../game/signal-run.html ancient && cd ..
#   python3 src/patches/v14_ancient_site.py
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
P = os.path.join(ROOT, 'game', 'signal-run.html')
s = open(P, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

rep("const CAVE_AREA = [CV.SX - 200, CV.SZ - 220, CV.SX + 780, CV.SZ + 320];", "const CAVE_AREA = [CV.SX - 200, CV.SZ - 220, CV.SX + 1000, CV.SZ + 320];")

# --- shared shader bits: where the site is, its pulse, the hologram's light, the glowing channels ---
rep("uniform vec4 uGeo, uGQ, uGS, uGT, uGL[32]; uniform vec3 uGeoR;   // the giant crystal cavern: where, light count / mist / pool, pulse time / woken, the light down its tunnel, 16 crystal lights\n",
    "uniform vec4 uGeo, uGQ, uGS, uGT, uGL[32]; uniform vec3 uGeoR;   // the giant crystal cavern: where, light count / mist / pool, pulse time / woken, the light down its tunnel, 16 crystal lights\nuniform vec4 uSite, uSiteH;   // the ancient site: final chamber's centre, floor height, power; the hologram's light\n")
rep("""vec3 geoMist(vec3 w, float d){""", """float siteMask(vec3 w){ return step(uSite.x-150.,w.x)*step(w.y,uSite.y+45.)*step(abs(w.z-uSite.z),60.)*step(0.001,uSite.w); }   // 1 in the ancient site
float sitePulse(vec3 w){ float d=length(w.xz-uSite.xz); return 0.7+0.3*sin(d*0.35+uT*2.2)+0.5*pow(max(0.,sin(d*0.09+uT*0.9)),16.); }   // waves running in toward the final chamber
vec3 siteLight(vec3 w, vec3 n){ if(uSiteH.w<=0.) return vec3(0.); vec3 L=uSiteH.xyz-w; float d2=dot(L,L); return vec3(0.45,0.8,1.)*uSiteH.w*(max(dot(n,L)*inversesqrt(d2+1e-4),0.)*0.8+0.2)*(500./(500.+d2)); }
vec3 siteAmb(vec3 w){ return vec3(0.025,0.04,0.055)*uSite.w*siteMask(w); }
vec2 siteLines(vec3 w, vec3 n){   // the glowing channels and glyphs cut into the builders' stone: (bright core, soft halo)
  float h=w.y-uSite.y; vec2 q=w.xz-uSite.xz; float d=length(q), fw=length(fwidth(w))*1.2+1e-4;
  vec2 tg=normalize(vec2(-n.z,n.x)+vec2(1e-4)); float u=dot(w.xz,tg)/0.55, flatw=1.-smoothstep(0.015,0.06,length(fwidth(n)));   // no glyphs on rounded corners, where they'd turn to static
  float a=atan(q.y,q.x), sp=mod(a-3.14159,1.25664)-0.62832, ds=abs(sp)*d, e=1e3;
  if(n.y>0.7){
    if(d<23.){ e=min(min(abs(d-6.4),abs(d-10.)),min(abs(d-17.),abs(d-21.5))); if(d>6.4&&d<15.) e=min(e,ds); }   // rings round the dais, spokes to the sockets
    else if(w.x<uSite.x-23.) e=abs(abs(w.z-uSite.z)-4.);                                                    // two channels down the hall, toward the chamber
  } else if(abs(n.y)<0.3){
    e=min(abs(h-1.95),abs(h-2.95));                                                                       // a band of glyphs at eye height
    float fv=(h-2.15)/0.6;
    if(fv>0.&&fv<1.){ float g=hash11(floor(u)*7.31+3.), sg; vec2 p=vec2(fract(u),fv)-0.5;
      sg = g<0.2 ? abs(p.x) : g<0.4 ? abs(length(p)-0.28) : g<0.55 ? min(abs(p.y),abs(p.x)) : g<0.7 ? max(length(p)-0.07,0.) : g<0.85 ? min(abs(p.x-0.18),abs(p.x+0.18)) : abs(length(p-vec2(0.,-0.3))-0.42);
      e=min(e,mix(1e3,sg*0.55,flatw)); }
  }
  return vec2(1.-smoothstep(0.018,0.018+fw,e), exp(-max(e-0.018,0.)*9.)); }
vec3 geoMist(vec3 w, float d){""")
rep("  float gk=geoK(w); if(gk>0.){ c=mix(c, vec3(0.006,0.007,0.018), (1.-exp(-d*0.0042))*gk*0.7); if(uUW.x<0.5) c+=geoMist(w,d); }\n",
    "  float gk=geoK(w); if(gk>0.){ c=mix(c, vec3(0.006,0.007,0.018), (1.-exp(-d*0.0042))*gk*0.7); if(uUW.x<0.5) c+=geoMist(w,d); }\n  float smk=siteMask(w); if(smk>0.) c=mix(c, vec3(0.004,0.006,0.009), (1.-exp(-d*0.007))*0.8*smk);   // the site's still, dark air\n")
rep("+geoLight(w,n)*1.3+geoTun(w,n)*0.6)*uUG.w, uUG.x); }", "+geoLight(w,n)*1.3+geoTun(w,n)*0.6+(siteLight(w,n)*1.2+siteAmb(w)*2.)*siteMask(w))*uUG.w, uUG.x); }")

# --- rock: the builders' black stone, polished, with glowing channels; the second bore's rings follow it ---
rep("if(k>3.5){ float g=abs(fract(length(w-vec3(1844.,-450.,1471.))*2.)-0.5);",
    "if(k>3.5){ float g=abs(fract((w.x>2100.?(abs(w.x-2186.)<4.5&&abs(w.z-1471.)<4.5&&w.y<-401.?w.y:w.x):length(w-vec3(1844.,-450.,1471.)))*2.)-0.5);")
rep("   // the bore's rings, every half metre along it (counted from D-10)\n",
    "   // the bore's rings, every half metre along it (counted from D-10)\n  if(k>4.5) col=vec3(0.032,0.034,0.04)*(0.9+0.2*vnoise3(w*0.7));   // the builders' black stone\n")
rep("  // thin glowing mineral veins, only in some stretches of wall\n",
    "  float sgl=0.;\n  if(uSite.w>0.){ float sm=siteMask(w); if(sm>0.){ c+=col*(siteLight(w,n)*2.2+siteAmb(w)*3.);\n    if(k>4.5){ vec2 ln=siteLines(w,n); c+=(vec3(0.55,0.9,1.)*ln.x+vec3(0.06,0.32,0.9)*ln.y*0.3)*uSite.w*sitePulse(w)*1.15; sgl=ln.x*uSite.w*0.3; } } }\n  // thin glowing mineral veins, only in some stretches of wall\n")
rep("  o=vec4(tone(c*uUG.w),clamp(em*0.45,0.,1.));\n  if(CDBG==1)", "  o=vec4(tone(c*uUG.w),clamp(em*0.45+sgl,0.,1.));\n  if(CDBG==1)")

# --- the builders' pieces (glowing inlays), the hologram, the star chart, the light over the dais ---
SH = r"""const ANC_FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec4 vC; uniform vec4 uAnc; out vec4 o;
${GLSL_COMMON}
void main(){ vec3 n=normalize(vN), v=normalize(uCam-vW); if(dot(n,v)<0.) n=-n;
  vec3 col=vC.rgb*vC.rgb; float g=vC.a;
  vec3 c=shade(col,n,vW,0.9);
  vec3 Lh=normalize(uFlP-vW); c+=vec3(0.9,0.95,1.)*pow(max(dot(n,normalize(Lh+v)),0.),90.)*uUG.y*0.35*(1.-g);   // polished stone
  float pw=uAnc.x*sitePulse(vW)+uAnc.y;
  c=haze(c,vW)+mix(vec3(0.3,0.75,1.),vec3(1.,0.8,0.42),uAnc.z)*g*pw*1.6;                                       // the inlays glow, and their light carries through the haze
  o=vec4(tone(c*uUG.w), clamp(g*pw*0.6,0.,1.)); }`;
const HOLO_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aC;
uniform mat4 uVP, uM; uniform vec4 uHolo; out vec3 vW; out vec3 vN; out vec4 vC; out vec3 vL;
void main(){ vec3 p=aP; p.x+=uHolo.w*0.08*sin(p.y*23.+uHolo.z*40.); vec4 w=uM*vec4(p,1.); vW=w.xyz; vN=mat3(uM)*aN; vC=aC; vL=aP; gl_Position=uVP*w; }`;
const HOLO_FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec4 vC; in vec3 vL; uniform vec4 uHolo; uniform vec3 uCam; out vec4 o;
float h1(float n){ return fract(sin(n)*43758.5453); }
void main(){ vec3 n=normalize(vN), v=normalize(uCam-vW); float fr=pow(1.-abs(dot(n,v)),2.), t=uHolo.z, spk=uHolo.y;
  float rise=smoothstep(uHolo.x*7.5-0.6, uHolo.x*7.5, vL.y); if(rise>0.99) discard;   // it builds itself from the bottom up
  float scan=0.72+0.28*sin(vW.y*38.-t*7.), band=smoothstep(0.,0.25,0.25-abs(fract(vW.y*0.12-t*0.25)-0.5))*0.9, fl=0.88+0.12*h1(floor(t*24.));
  vec3 base=vec3(0.35,0.72,1.), gold=vec3(1.,0.82,0.45);
  vec3 c=base*(0.10*vC.a+fr*(0.6+0.9*vC.r))+base*vC.g*0.55+gold*vC.b*(0.35+0.9*spk*(0.5+0.5*sin(t*9.+vL.y*3.)));
  c*=scan*fl*(1.+band)*(1.-rise)*smoothstep(-0.2,0.8,vL.y);
  o=vec4(c*1.2, clamp(dot(c,vec3(0.3))*0.8,0.,1.)); }`;
const STAR_VS = `#version 300 es
layout(location=0) in vec4 aP; uniform mat4 uVP; uniform float uPx; uniform vec4 uChart, uChartB; out vec3 vC;
void main(){ float c=cos(uChartB.w), s=sin(uChartB.w); vec3 q=vec3(aP.x*c-aP.z*s, aP.y, aP.x*s+aP.z*c);   // the chart turns slowly
  gl_Position=uVP*vec4(uChart.xyz+q*uChart.w,1.);
  bool hl=aP.w>0.99&&aP.w<1.5, ring=aP.w>1.5; float tw=0.6+0.4*sin(uChartB.y*3.+aP.w*91.);
  float sz=ring?3.2:hl?(10.+3.*sin(uChartB.y*4.)):1.2+2.6*fract(aP.w*13.);
  gl_PointSize=sz*uPx*(0.7+0.3*min(uChart.w/8.,1.)*2.);
  vec3 col=(hl||ring)?vec3(1.,0.82,0.45):mix(vec3(0.55,0.8,1.),vec3(0.9,0.95,1.),fract(aP.w*7.));
  float a=ring?uChartB.z*(0.6+0.4*sin(uChartB.y*5.)):hl?mix(0.8,2.4,uChartB.z):tw*(0.35+0.65*fract(aP.w*5.));
  vC=col*a*uChartB.x; }`;
const STAR_FS = `#version 300 es
precision highp float; in vec3 vC; out vec4 o;
void main(){ vec2 q=gl_PointCoord*2.-1.; float r=dot(q,q); if(r>1.) discard; o=vec4(vC*(1.-r), clamp(dot(vC,vec3(0.3))*(1.-r),0.,1.)); }`;
const MOTE_VS = `#version 300 es
layout(location=0) in vec4 aP; uniform mat4 uVP; uniform float uT, uPx; uniform vec4 uBase; out float vA;
void main(){ float h=fract(aP.y+uT*0.12*(0.6+aP.w)); vec3 p=uBase.xyz+vec3(aP.x*(1.-h*0.4), 0.3+h*7.5, aP.z*(1.-h*0.4));
  gl_Position=uVP*vec4(p,1.); gl_PointSize=(2.+2.*aP.w)*uPx; vA=uBase.w*sin(h*3.1416)*(0.5+0.5*aP.w); }`;
const MOTE_FS = `#version 300 es
precision highp float; in float vA; out vec4 o;
void main(){ vec2 q=gl_PointCoord*2.-1.; float r=dot(q,q); if(r>1.) discard; vec3 c=vec3(0.45,0.8,1.)*vA*(1.-r); o=vec4(c, clamp(vA*0.4*(1.-r),0.,1.)); }`;
const LINE_VS = `#version 300 es"""
rep("const LINE_VS = `#version 300 es", SH)
rep("pTitan = prog(TITAN_VS, TITAN_FS), pGeoPt = prog(GEOPT_VS, GEOPT_FS);",
    "pTitan = prog(TITAN_VS, TITAN_FS), pGeoPt = prog(GEOPT_VS, GEOPT_FS), pAnc = prog(PROP_VS, ANC_FS), pHolo = prog(HOLO_VS, HOLO_FS), pStar = prog(STAR_VS, STAR_FS), pMote = prog(MOTE_VS, MOTE_FS);")
rep("  geoUniforms(p);\n  if (p.u.uFdP) { const F = cave.flood;", "  geoUniforms(p); siteUniforms(p);\n  if (p.u.uFdP) { const F = cave.flood;")

# keep titans and big crystals out of the second bore's mouth
rep("free = (p, gap) => Math.hypot(p[0] - LG[0], p[1] - LG[1], p[2] - LG[2]) > 30 &&", "free = (p, gap) => Math.hypot(p[0] - LG[0], p[1] - LG[1], p[2] - LG[2]) > 30 && Math.hypot(p[0] - CV.SITE.bore[0][0], p[2] - CV.SITE.bore[0][2]) > 45 &&")
rep("if (r() < 0.32 && tunnelD(p[0], p[1], p[2]) > 4.5 &&", "if (r() < 0.32 && tunnelD(p[0], p[1], p[2]) > 4.5 && !(p[0] > CV.SITE.bore[0][0] - 7 && Math.abs(p[2] - CV.SITE.bore[0][2]) < 6.5) &&")
# --- the runtime ---
rt = open(os.path.join(ROOT, 'src', 'runtime', 'site_runtime.js'), encoding='utf-8').read()
rep("function caveStep(nx, nz, f) {\n", rt + "function caveStep(nx, nz, f) {\n")
rep(" cavernInit(); geoInit(); doorInit();", " cavernInit(); geoInit(); siteInit(); doorInit();")
rep("  drawLake();\n  drawGeo();\n", "  drawLake();\n  drawGeo();\n  drawSite();\n")
rep("  drawLakeFx();\n  drawGeoFx();\n", "  drawLakeFx();\n  drawGeoFx();\n  drawSiteFx();\n")
rep("drawDoorLamp(); drawLakeGlow();", "drawDoorLamp(); drawLakeGlow(); drawSiteGlow();")
rep("  doorUpdate(dt); lakeUpdate(dt); geoUpdate(dt);\n", "  doorUpdate(dt); lakeUpdate(dt); geoUpdate(dt); siteUpdate(dt);\n")
rep("    if (cave.under) floorY = Math.max(floorY, geoFloorY(state.px, state.pz, state.py));   // the top of a titan\n",
    "    if (cave.under) floorY = Math.max(floorY, geoFloorY(state.px, state.pz, state.py), siteFloorY(state.px, state.pz, state.py));   // the top of a titan, or the dais's steps\n")
rep("    if (cave.under) { geoPush(); cave.ceil", "    if (cave.under) { geoPush(); sitePush(); cave.ceil")
# flying into a lower opening underground (like the second bore at the top of its shaft): duck under its lip instead of sticking to the ceiling
rep("      else if (f > state.py + 0.45) return false;\n      state.px = nx; state.pz = nz; return true; };",
    "      else if (f > state.py + 0.45) { if (cave.under && f > 1e8) for (const d of [0.4, 0.8, 1.2, 1.6, 2.0]) { const f2 = caveStep(nx, nz, floorAt(nx, nz, state.py - d)); if (f2 <= state.py - d + 0.45) { state.py -= Math.min(d, 3 * dt); break; } } return false; }\n      state.px = nx; state.pz = nz; return true; };")
# which rock to draw: a sixth zone for the site; the giant cavern skips the site under it
rep("zone = (E[0] > GX || GEOR.tun) && E[1] < -200 ? 4 :", "nearSh = c => Math.abs(c.x0 + 12 - SITE_SH[0]) < 30 && Math.abs(c.z0 + 12 - SITE_SH[2]) < 30, zone = E[0] > CV.SX + 728 && E[1] < -440 ? 5 : (E[0] > GX || GEOR.tun) && E[1] < -200 ? 4 :")
rep(": c.x0 + CAVE_CH < CV.SX + 380 || c.y0 > -200) continue;",
    ": zone === 4 ? c.x0 + CAVE_CH < CV.SX + 380 || c.y0 > -200 || (c.x0 > CV.SX + 728 && top < -445 && !nearSh(c)) : c.x0 + CAVE_CH < CV.SX + 720 || (c.y0 > -446 && !nearSh(c))) continue;")
# the scan button and card
rep("  #logBtn {", "  #logBtn, #siteBtn {")
rep('<button id="logBtn" hidden>Read the dive log</button>', '<button id="logBtn" hidden>Read the dive log</button>\n<button id="siteBtn" hidden>Scan the artifact</button>')
rep("  if (typeof LAKER !== 'undefined' && LAKER.read >= 0) {", "  if (typeof SITER !== 'undefined' && SITER.card >= 0) { if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Enter') logShow(-1); return; }\n  if (e.code === 'KeyE' && !$('siteBtn').hidden) { siteAct(); return; }\n  if (typeof LAKER !== 'undefined' && LAKER.read >= 0) {")
rep("$('logBtn').onclick = () => logShow(0);", "$('logBtn').onclick = () => logShow(0); $('siteBtn').onclick = () => siteAct();")
rep("function logShow(i) {\n", "function logShow(i) {\n  if (i < 0 && SITER.card >= 0) siteTake();\n")
# the status line: artifacts found, while you are in the site
rep("? ' · Air ' + Math.round(LAKER.air) + '%' : '');", "? ' · Air ' + Math.round(LAKER.air) + '%' : '') + (SITER.inSiteP && !siteState().solved ? ' · Artifacts ' + siteState().r.filter(v => v > 0).length + '/5' : '');")
# saving
rep("tank: cave.tank ? 1 : 0, geo: GEOR.seen ? 1 : 0, batt:", "tank: cave.tank ? 1 : 0, geo: GEOR.seen ? 1 : 0, site: cave.site ? JSON.parse(JSON.stringify(cave.site)) : null, batt:")
rep("cave.tank = false; GEOR.seen = false; GEOR.pt0 = 0;", "cave.tank = false; GEOR.seen = false; GEOR.pt0 = 0; cave.site = null; SITER.phase = 'idle'; SITER.holo = 0;")
rep("cave.tank = !!c.tank; if (c.geo) {", "cave.tank = !!c.tank; cave.site = c.site && Array.isArray(c.site.r) ? c.site : null; SITER.phase = 'idle'; SITER.holo = 0; if (c.geo) {")
# jumping straight there for tests and demos
rep("  else if (where === 'ledge') {", """  else if (where === 'portal' || where === 'site' || where === 'chamber') { const B0 = SITEC.bore[0];
    if (where === 'portal') { state.px = B0[0] - 12; state.pz = B0[2]; state.py = CV.floorAt(state.px, B0[1] + 2, state.pz); }
    else if (where === 'site') { state.px = SITEC.vest[0] - 2.5; state.pz = SITEC.vest[1] - 2; state.py = SF; }
    else { state.px = SITE_C[0] - 19; state.pz = SITE_C[2]; state.py = SF; }
    state.yaw = -Math.PI / 2; state.heading = Math.PI / 2; state.pitch = 0.15; }
  else if (where === 'ledge') {""")
rep("'d10', 'pool', 'geo', 'ledge'].includes(at)", "'d10', 'pool', 'geo', 'ledge', 'portal', 'site', 'chamber'].includes(at)")
rep("window.__bench = { DOOR, DOORS, PARTS, FLOODS, STAKES, DRIPR, LAKER, GEOR, GEOQ, inWater, logShow,", "window.__bench = { DOOR, DOORS, PARTS, FLOODS, STAKES, DRIPR, LAKER, GEOR, GEOQ, SITER, siteState, siteAct, inWater, logShow,")
open(P, 'w', encoding='utf-8').write(s)
print('v14 patch applied')
