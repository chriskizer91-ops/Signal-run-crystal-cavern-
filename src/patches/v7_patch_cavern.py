import sys
P = '/home/claude/src/signal-run-v2.html'
s = open(P, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: sys.exit('anchor found %d times (wanted %d): %r' % (n, count, old[:100]))
    s = s.replace(old, new)

# ---- the cave generator: swap in the version with the crystal cavern ----
a = s.index('function CaveLib(cfg) {'); b = s.index("\n(function () {\n'use strict';\nconst T = TerrainLib();")
new_cl = open('/home/claude/tools/cavelib.js', encoding='utf-8').read().replace("if (typeof module !== 'undefined') module.exports = CaveLib;\n", '').strip()
s = s[:a] + new_cl + '\n' + s[b:]

# ---- page: the fogging visor ----
rep('<div id="fade"></div>', '<div id="fade"></div>\n<div id="visor"></div>')
rep("  #fade { position: fixed;", "  #visor { position: fixed; inset: 0; pointer-events: none; opacity: 0; z-index: 2; background: radial-gradient(ellipse at center, rgba(200,230,235,0) 50%, rgba(190,222,228,.16) 70%, rgba(212,234,238,.5) 92%, rgba(225,240,242,.72) 100%); }\n  #fade { position: fixed;")

# ---- shared shader code: the cavern's glow light and haze ----
rep("uniform vec4 uUG, uLd, uHole; uniform vec3 uFlP, uFlD;",
    "uniform vec4 uUG, uLd, uHole, uCav; uniform vec3 uFlP, uFlD, uCavR;")
rep("vec3 flashL(vec3 w, vec3 n){",
    "float cavK(vec3 w){ vec3 q=(w-uCav.xyz)/uCavR; return (1.-smoothstep(0.92,1.4,length(q)))*uCav.w; }   // 1 inside the crystal cavern\n"
    "vec3 cavAmb(vec3 w){ return cavK(w)*vec3(0.06,0.19,0.21); }                                          // light from all the glowing life\n"
    "vec3 haze(vec3 c, vec3 w){ float d=length(w-uCam); return mix(c, vec3(0.02,0.075,0.085), (1.-exp(-d*0.006))*cavK(w)*0.9); }\n"
    "vec3 flashL(vec3 w, vec3 n){")
rep("    r=mix(r, alb*(flashL(w,n)+vec3(0.9,0.95,1.05)*day*2.2+0.01)*uUG.w, uUG.x); }",
    "    r=mix(r, alb*(flashL(w,n)+vec3(0.9,0.95,1.05)*day*2.2+0.01+cavAmb(w)*2.6)*uUG.w, uUG.x); }")
# cave rock: lit by the glow, patches of glowing film, haze
rep("  vec3 c=col*(fl+vec3(0.9,0.95,1.05)*vD.x*2.2+0.0012)+fl*sp*0.5;\n  o=vec4(tone(c*uUG.w),0.);\n}`;",
    "  vec3 c=col*(fl+vec3(0.9,0.95,1.05)*vD.x*2.2+0.0012)+fl*sp*0.5;\n"
    "  float ck=cavK(w); c+=col*cavAmb(w)*2.6;\n"
    "  float m=smoothstep(0.6,0.8,vnoise(w.xz*0.07+vec2(w.y*0.05)))*smoothstep(0.35,0.7,vnoise(w.xz*0.45+w.y*0.4+7.));\n"
    "  vec3 mc=mix(vec3(0.12,0.8,0.85),vec3(0.5,0.28,0.95),vnoise(w.xz*0.025+3.));\n"
    "  float em=m*ck*(0.75+0.25*sin(uT*0.4+w.x*0.03+w.z*0.02))*0.55; c+=mc*em;\n"
    "  c=haze(c,w);\n"
    "  o=vec4(tone(c*uUG.w),clamp(em*0.8,0.,1.));\n}`;")

KIT = r'''const KIT_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aC;
layout(location=3) in vec4 iA; layout(location=4) in vec4 iB; layout(location=5) in vec4 iC;
uniform mat4 uVP; out vec3 vW; out vec3 vN; out vec4 vC; out vec4 vI;
void main(){ vec3 f=iB.xyz, s=normalize(cross(f, abs(f.y)>0.95?vec3(1,0,0):vec3(0,1,0))), u=cross(s,f);
  float c=cos(iC.z), sn=sin(iC.z); vec3 s2=s*c+u*sn, u2=u*c-s*sn; float L=iA.w, W=iA.w*iB.w;
  vW=iA.xyz+f*(aP.y*L)+(s2*aP.x+u2*aP.z)*W; vN=normalize(s2*(aN.x/W)+f*(aN.y/L)+u2*(aN.z/W));
  vC=aC; vI=vec4(iC.xy, aP.y, 0.); gl_Position=uVP*vec4(vW,1.); }`;
const CRYS_FS = `#version 300 es
precision highp float; in vec3 vW; in vec3 vN; in vec4 vC; in vec4 vI; out vec4 o;
${GLSL_COMMON}
void main(){ vec3 n=normalize(vN), v=normalize(uCam-vW); if(dot(n,v)<0.) n=-n;
  vec3 hue=mix(vec3(0.16,0.88,1.0), vec3(0.70,0.30,1.0), clamp(vI.x+(vC.g-0.5)*0.3,0.,1.));
  float pulse=0.84+0.16*sin(uT*0.55+vI.x*9.+vW.x*0.04+vW.z*0.03);
  float core=vC.r*vI.y*pulse, fr=pow(1.-max(dot(n,v),0.),3.), cloud=vC.b;
  vec3 fl=flashL(vW,n), L=normalize(uFlP-vW); float sp=pow(max(dot(n,normalize(L+v)),0.),90.)*(1.-0.7*cloud);
  vec3 c=hue*hue*(0.04+fl*0.3+cavAmb(vW)*1.6)*(1.-0.4*cloud)+hue*core*1.35+hue*fr*(0.25+core)*0.55+(vec3(0.9,0.95,1.)*cloud*0.06)*cavK(vW)+fl*sp*1.6;
  c=haze(c,vW); o=vec4(tone(c*uUG.w), clamp(core*0.6+fr*0.15,0.,1.)); }`;
const LIFE_FS = `#version 300 es
precision highp float; in vec3 vW; in vec3 vN; in vec4 vC; in vec4 vI; out vec4 o;
${GLSL_COMMON}
void main(){ vec3 n=normalize(vN), v=normalize(uCam-vW); if(dot(n,v)<0.) n=-n;
  vec3 col=vC.rgb; float em=vC.a*vI.y*(0.8+0.2*sin(uT*0.9+vW.x*0.3+vW.z*0.2+vI.x*6.));
  vec3 c=col*col*(flashL(vW,n)+cavAmb(vW)*2.4+0.004)+col*em*1.25+flashL(vW,n)*pow(max(dot(n,normalize(normalize(uFlP-vW)+v)),0.),40.)*0.3;
  c=haze(c,vW); o=vec4(tone(c*uUG.w), clamp(em*0.65,0.,1.)); }`;
const POOL_VS = `#version 300 es
layout(location=0) in vec3 aP; uniform mat4 uVP; out vec3 vW; void main(){ vW=aP; gl_Position=uVP*vec4(aP,1.); }`;
const POOL_FS = `#version 300 es
precision highp float; in vec3 vW; out vec4 o;
${GLSL_COMMON}
void main(){ vec2 p=vW.xz; float t=uT;
  vec3 n=normalize(vec3(sin(p.x*0.9+t*0.7)*0.025+sin(p.y*1.7-t*0.9+p.x*0.3)*0.018, 1., cos(p.y*0.8+t*0.6)*0.025+cos(p.x*1.5+t*0.8)*0.015));
  vec3 v=normalize(uCam-vW); float fr=0.04+0.96*pow(1.-max(dot(n,v),0.),5.);
  vec3 rd=reflect(-v,n); float glints=smoothstep(0.86,1.,vnoise(rd.xz/max(rd.y,0.15)*6.+t*0.05))*0.9;
  vec3 refl=vec3(0.05,0.30,0.34)*(0.7+glints*1.6)+vec3(0.35,0.2,0.6)*glints*0.4;
  vec3 c=mix(vec3(0.004,0.022,0.03), refl, fr)+flashL(vW,n)*0.05;
  vec3 L=normalize(uFlP-vW); c+=vec3(1.,.95,.85)*pow(max(dot(n,normalize(L+v)),0.),240.)*uUG.y*2.;
  c=haze(c,vW); o=vec4(tone(c*uUG.w), clamp(glints*fr*0.5,0.,1.)); }`;
const SPORE_VS = `#version 300 es
layout(location=0) in vec4 aP; uniform mat4 uVP; uniform float uT, uPx; uniform vec3 uCam; out float vA;
void main(){ float s=aP.w; vec3 p=aP.xyz+vec3(sin(uT*0.13+s*37.)*3., mod(uT*(0.25+0.3*s)+s*90.,24.)-12., cos(uT*0.11+s*23.)*3.);
  gl_Position=uVP*vec4(p,1.); float d=length(p-uCam); gl_PointSize=clamp(70./d,1.,6.)*uPx;
  vA=clamp(1.-d/170.,0.,1.)*(0.45+0.55*sin(uT*(0.8+s)+s*40.)); }`;
const SPORE_FS = `#version 300 es
precision highp float; in float vA; out vec4 o;
void main(){ vec2 q=gl_PointCoord*2.-1.; float r=dot(q,q); if(r>1.) discard; float a=(1.-r)*vA; o=vec4(vec3(0.38,1.0,0.88)*a*0.85, a*0.7); }`;
'''
rep("const LINE_VS = `#version 300 es", KIT + "const LINE_VS = `#version 300 es")
rep("pCave = prog(CAVE_VS, CAVE_FS), pLine = prog(LINE_VS, LINE_FS);",
    "pCave = prog(CAVE_VS, CAVE_FS), pLine = prog(LINE_VS, LINE_FS), pCrys = prog(KIT_VS, CRYS_FS), pLife = prog(KIT_VS, LIFE_FS), pPool = prog(POOL_VS, POOL_FS), pSpore = prog(SPORE_VS, SPORE_FS);")
rep("if (p.u.uHole) gl.uniform4f(p.u.uHole, CV.SX, CV.SZ, HOLE, 0);",
    "if (p.u.uHole) gl.uniform4f(p.u.uHole, CV.SX, CV.SZ, HOLE, 0);\n"
    "  if (p.u.uCav) gl.uniform4f(p.u.uCav, CV.CAV.x, CV.CAV.y, CV.CAV.z, 1); if (p.u.uCavR) gl.uniform3f(p.u.uCavR, CV.CAV.rx, CV.CAV.ry, CV.CAV.rz);")

# ---- runtime: the cavern ----
rep("/* --- menu / mode switching --- */", open('/home/claude/tools/cavern_runtime.js', encoding='utf-8').read() + "\n/* --- menu / mode switching --- */")
rep("buildGame(); placeAssets(); caveInit(); buildPlants();", "buildGame(); placeAssets(); caveInit(); cavernInit(); buildPlants();")
rep("  if (cave.fixed) { gl.bindVertexArray(cave.fixed.vao); stats.cave += drawElems(cave.fixed.count, gl.UNSIGNED_INT, 0); }\n}",
    "  if (cave.fixed) { gl.bindVertexArray(cave.fixed.vao); stats.cave += drawElems(cave.fixed.count, gl.UNSIGNED_INT, 0); }\n  drawCavern();\n}")
rep("  if (cave.lineDirty && state.time - cave.lineT > 0.2) { cave.lineT = state.time; lineRebuild(); }",
    "  drawCavernFx();\n  if (cave.lineDirty && state.time - cave.lineT > 0.2) { cave.lineT = state.time; lineRebuild(); }")
# see across the whole cavern: draw the rock pieces much further away
rep("    if (c.d > 180 || !classify(P, c.x0", "    if (c.d > 330 || !classify(P, c.x0")
rep("want.push([cave.visible && c.d < 180 ? c.d : 1e5 + c.d, 1, c]);", "want.push([cave.visible && c.d < 330 ? c.d : 1e5 + c.d, 1, c]);")
# per frame
rep("  lineUpdate();\n  if (cave.under && state.time", "  lineUpdate();\n  cavernUpdate(dt);\n  if (cave.under && state.time")
# wading in the pool
rep("  if (caveUnder(x, z, py)) return CV.floorAt(x, py, z);\n",
    "  if (caveUnder(x, z, py)) { let f = CV.floorAt(x, py, z); const PL = CV.CAV.pool; if (f > -1e8 && f < PL - 1.1 && py > PL - 3 && CV.cavK(x, PL, z) < 1) f = PL - 1.1; return f; }   // wade waist-deep in the cavern pool\n")
# HUD: humidity reading in the cavern
rep("(line.reel ? ' · Line ' + Math.round(line.left) + ' m' : '');",
    "(line.reel ? ' · Line ' + Math.round(line.left) + ' m' : '') + (CAVR.humid > 80 ? ' · Humidity ' + Math.round(CAVR.humid) + '%' : '');")
# test shortcuts: ?at=crystal (the pit, beside the hole) and ?at=cavern (on the landing ledge)
rep("  else { state.px = CV.SX + 2.5; state.pz = CV.SZ - 1.5;",
    "  else if (where === 'crystal') { state.px = CV.CAV.drop[0] - 7.5; state.pz = CV.CAV.drop[1]; state.py = CV.floorAt(state.px, -128, state.pz); state.yaw = -Math.PI / 2; state.heading = Math.PI / 2; state.pitch = 0.45; }\n"
    "  else if (where === 'cavern') { state.px = CV.CAV.drop[0] - 2; state.pz = CV.CAV.drop[1] - 10; state.py = CV.floorAt(state.px, -228, state.pz); state.yaw = 0.07; state.heading = Math.atan2(-0.07, -1); state.pitch = 0.22; }\n"
    "  else { state.px = CV.SX + 2.5; state.pz = CV.SZ - 1.5;")
rep("    if (params.get('at') === 'mine' || params.get('at') === 'cave') caveTeleport(params.get('at') === 'mine' ? 'top' : 'station');",
    "    { const at = params.get('at'); if (at === 'mine') caveTeleport('top'); else if (at === 'cave') caveTeleport('station'); else if (at === 'crystal' || at === 'cavern') caveTeleport(at); }")
rep("cave, line, CV, caveTeleport, update,", "cave, line, CV, caveTeleport, update, CAVR,")
open(P, 'w', encoding='utf-8').write(s)
print('patched OK, size', len(s))
