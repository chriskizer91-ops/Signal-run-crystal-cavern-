# v9: the stalactite cavern below the crystal cavern, doors D-8 and D-9 with work lights, couplings for the campaign.
P = '/home/claude/src/signal-run-v2.html'
s = open(P).read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:100])
    s = s.replace(a, b)

# 1. CaveLib
lib = open('/home/claude/tools/cavelib.js').read().replace("if (typeof module !== 'undefined') module.exports = CaveLib;", '').rstrip() + '\n'
a = s.index('function CaveLib(cfg) {'); b = s.index('\n}\n', a) + 3
s = s[:a] + lib + s[b:]

# 2. shared shader bits: the stalactite cavern's region, its haze and glowworm sky light, and the work floodlight
rep("uniform vec4 uUG, uLd, uHole, uCav; uniform vec3 uFlP, uFlD, uCavR;", "uniform vec4 uUG, uLd, uHole, uCav, uDrp, uFdP, uFdD; uniform vec3 uFlP, uFlD, uCavR, uDrpR;")
rep("vec3 haze(vec3 c, vec3 w){ float d=length(w-uCam); return mix(c, vec3(0.012,0.05,0.06), (1.-exp(-d*0.0065))*cavK(w)*0.85); }",
    """float drpK(vec3 w){ vec3 q=(w-uDrp.xyz)/uDrpR; return (1.-smoothstep(0.95,1.35,length(q)))*uDrp.w; }   // 1 inside the stalactite cavern
vec3 drpAmb(vec3 w, vec3 n){ float hy=smoothstep(uDrp.y-uDrpR.y*0.6, uDrp.y+uDrpR.y*0.8, w.y); return drpK(w)*vec3(0.016,0.046,0.05)*(0.4+0.6*max(n.y,0.)+0.9*hy*max(-n.y,0.))*(0.75+0.5*vnoise3(w*0.04)); }      // soft blue-green light from the glowworm ceiling
vec3 haze(vec3 c, vec3 w){ float d=length(w-uCam); c=mix(c, vec3(0.012,0.05,0.06), (1.-exp(-d*0.0065))*cavK(w)*0.85); return mix(c, vec3(0.010,0.026,0.029), (1.-exp(-d*0.0085))*drpK(w)*0.85); }
vec3 floodL(vec3 w, vec3 n){ if(uFdP.w<=0.) return vec3(0.); vec3 L=uFdP.xyz-w; float d=length(L); vec3 l=L/max(d,1e-3); float cs=dot(-l,uFdD.xyz);   // the research team's work light
  float cone=smoothstep(uFdD.w-0.25,uFdD.w+0.12,cs)*0.85+0.15; return vec3(1.,0.9,0.74)*uFdP.w*cone*(max(dot(n,l),0.)*0.85+0.15)*30./(30.+d*d*0.35); }""")
rep("    r=mix(r, alb*(flashL(w,n)+vec3(0.9,0.95,1.05)*day*2.2+0.01+cavAmb(w)*2.6)*uUG.w, uUG.x); }",
    "    r=mix(r, alb*(flashL(w,n)+floodL(w,n)+vec3(0.9,0.95,1.05)*day*2.2+0.01+cavAmb(w)*2.6+drpAmb(w,n)*2.6)*uUG.w, uUG.x); }")

# 3. cave rock: limestone in the stalactite cavern, lit by the work light too
rep("""  col=pow(col,vec3(1.6));
  vec3 L=uFlP-w; vec3 l=normalize(L);
  vec3 fl=flashL(w,n);
  float wet=smoothstep(0.55,0.8,vnoise(w.xz*0.35+w.y*0.5))*step(k,1.5);""",
"""  float dk=drpK(w);
  if(dk>0.){ vec3 lime=mix(vec3(0.60,0.52,0.42),vec3(0.82,0.76,0.64),band); lime=mix(lime, vec3(0.50,0.33,0.19), smoothstep(0.62,0.86,vnoise3(w*vec3(0.14,0.7,0.14)))*0.55);
    lime*=(0.8+0.4*mix(0.5,alb,0.6))*(0.85+0.3*vnoise3(w*vec3(0.8,0.15,0.8))); col=mix(col, lime, dk); }
  col=pow(col,vec3(1.6));
  vec3 L=uFlP-w; vec3 l=normalize(L);
  vec3 fl=flashL(w,n)+floodL(w,n);
  float wet=max(smoothstep(0.55,0.8,vnoise(w.xz*0.35+w.y*0.5))*step(k,1.5), dk*(0.55+0.45*vnoise3(w*0.4)));""")
rep("  c+=col*cavAmb(w)*2.4*face*face;\n", "  c+=col*cavAmb(w)*2.4*face*face+col*drpAmb(w,n)*2.;\n")
# crystals and glowing life also catch the work light
rep("vec3 h2=hue*hue, body=h2*(0.02+fl*0.32+cavAmb(vW)*1.1)*(1.-0.4*cloud);", "vec3 h2=hue*hue, body=h2*(0.02+(fl+floodL(vW,n))*0.32+cavAmb(vW)*1.1)*(1.-0.4*cloud);")
rep("vec3 c=col*col*(flashL(vW,n)+cavAmb(vW)*2.4+0.004)+col*em*1.25", "vec3 c=col*col*(flashL(vW,n)+floodL(vW,n)+cavAmb(vW)*2.4+drpAmb(vW,n)*2.+0.004)+col*em*1.25")

# 4. new shaders: calcite kit pieces, rimstone pool water, glowworm lights
rep("const LINE_VS = `#version 300 es", """const DRIP_FS = `#version 300 es
precision highp float; in vec3 vW; in vec3 vN; in vec4 vC; in vec4 vI; out vec4 o;
${GLSL_COMMON}
void main(){ vec3 n=normalize(vN), v=normalize(uCam-vW); if(dot(n,v)<0.) n=-n;
  vec3 tint=mix(vec3(1.0,0.97,0.90), vec3(0.96,0.80,0.58), vI.x);          // per copy: ivory .. honey
  vec3 col=vC.rgb*vC.rgb*tint*(0.88+0.24*vnoise3(vW*2.7)); float tr=vC.a;
  vec3 fl=flashL(vW,n), fd=floodL(vW,n), L=normalize(uFlP-vW), Lf=normalize(uFdP.xyz-vW);
  float sp=pow(max(dot(n,normalize(L+v)),0.),70.)*0.8, spf=pow(max(dot(n,normalize(Lf+v)),0.),70.)*0.8;   // wet sheen
  float lf=length(fl), ld=length(fd), bk=max(dot(-n,L),0.)*tr;
  vec3 glow=vec3(1.,0.62,0.32)*(tr*(lf+ld)*0.28+bk*lf*0.35);                 // thin calcite glows warm when lit
  vec3 c=col*(fl+fd+drpAmb(vW,n)*2.+0.0015)+glow*col*1.3+fl*sp*0.55+fd*spf*0.55;
  c=haze(c,vW); o=vec4(tone(c*uUG.w), clamp(tr*(lf+ld)*0.04,0.,0.25)); }`;
const RIM_FS = `#version 300 es
precision highp float; in vec3 vW; out vec4 o;
${GLSL_COMMON}
void main(){ vec2 p=vW.xz; float t=uT;
  vec2 cell=floor(p/2.6), f=p/2.6-cell; float h=hash21(cell), ph=fract(t*0.23+h*7.); vec2 dc=(f-vec2(0.25+0.5*hash21(cell+3.1),0.25+0.5*hash21(cell+7.7)))*2.6;
  float rr=length(dc), ring=exp(-pow((rr-ph*1.3)*9.,2.))*(1.-ph)*step(0.55,h);    // drips landing in the pools
  vec2 g=rr>1e-3?dc/rr:vec2(0.); vec3 n=normalize(vec3(g.x*ring*0.35+sin(p.x*2.1+t*0.4)*0.004, 1., g.y*ring*0.35+cos(p.y*2.3+t*0.35)*0.004));
  vec3 v=normalize(uCam-vW); float fr=0.025+0.975*pow(1.-max(dot(n,v),0.),5.);
  vec3 fl=flashL(vW,n), fd=floodL(vW,n);
  vec3 body=vec3(0.10,0.42,0.44)*(length(fl)+length(fd))*0.16+vec3(0.003,0.012,0.013);   // milky turquoise lit from above
  vec3 rd=reflect(-v,n); float stars=smoothstep(0.93,1.,vnoise(rd.xz/max(rd.y,0.2)*14.))*0.35;
  vec3 refl=vec3(0.004,0.012,0.013)+vec3(0.3,0.95,0.85)*stars*drpK(vW)*0.5;
  vec3 c=mix(body, refl, fr);
  vec3 L=normalize(uFlP-vW), Lf=normalize(uFdP.xyz-vW);
  c+=vec3(1.,.95,.85)*pow(max(dot(n,normalize(L+v)),0.),300.)*uUG.y*2.5+vec3(1.,.9,.74)*pow(max(dot(n,normalize(Lf+v)),0.),300.)*uFdP.w*0.8;
  c=haze(c,vW); o=vec4(tone(c*uUG.w), mix(0.62,0.95,fr)); }`;
const WORM_VS = `#version 300 es
layout(location=0) in vec4 aP; uniform mat4 uVP; uniform float uT, uPx; uniform vec3 uCam; out float vA;
void main(){ gl_Position=uVP*vec4(aP.xyz,1.); float d=length(aP.xyz-uCam); gl_PointSize=max(clamp(46./d,1.,3.2)*uPx,1.6);
  vA=clamp(1.-d/260.,0.,1.)*(0.65+0.35*sin(uT*(0.25+aP.w*0.5)+aP.w*60.))*1.3; }`;
const WORM_FS = `#version 300 es
precision highp float; in float vA; out vec4 o;
void main(){ vec2 q=gl_PointCoord*2.-1.; float r=dot(q,q); if(r>1.) discard; float a=(1.-r)*vA; o=vec4(vec3(0.32,0.95,0.82)*a, a*0.6); }`;
const LINE_VS = `#version 300 es""")
rep(", pSpore = prog(SPORE_VS, SPORE_FS);", ", pSpore = prog(SPORE_VS, SPORE_FS), pDrip = prog(KIT_VS, DRIP_FS), pRim = prog(POOL_VS, RIM_FS), pWorm = prog(WORM_VS, WORM_FS);")
rep("  if (p.u.uCav) gl.uniform4f(p.u.uCav, CV.CAV.x, CV.CAV.y, CV.CAV.z, 1); if (p.u.uCavR) gl.uniform3f(p.u.uCavR, CV.CAV.rx, CV.CAV.ry, CV.CAV.rz);",
    """  if (p.u.uCav) gl.uniform4f(p.u.uCav, CV.CAV.x, CV.CAV.y, CV.CAV.z, 1); if (p.u.uCavR) gl.uniform3f(p.u.uCavR, CV.CAV.rx, CV.CAV.ry, CV.CAV.rz);
  if (p.u.uDrp) gl.uniform4f(p.u.uDrp, CV.DRIP.x, CV.DRIP.y, CV.DRIP.z, 1); if (p.u.uDrpR) gl.uniform3f(p.u.uDrpR, CV.DRIP.rx, CV.DRIP.ry, CV.DRIP.rz);
  if (p.u.uFdP) { const F = cave.flood; if (F && cave.visible) { gl.uniform4f(p.u.uFdP, F.lp[0], F.lp[1], F.lp[2], 1.35); gl.uniform4f(p.u.uFdD, F.dir[0], F.dir[1], F.dir[2], 0.78); } else gl.uniform4f(p.u.uFdP, 0, 0, 0, 0); }""")

# 5. replace the single-door code with the doors / couplings / work lights / stalactite cavern runtime
rt = open('/home/claude/tools/drip_runtime.js').read().replace('__D9PART__', '170, -300, -60')
a = s.index("/* ---------- the sealed door in the station's south wall ---------- */"); b = s.index("function caveStep(nx, nz, f) {\n")
s = s[:a] + rt + s[b:]
# camera: never behind any closed door
a = s.index("  const pz = DOOR.z - 0.55;                    // closed door: keep the camera on the side the player is on"); b = s.index("  }\n", s.index("if (kk > 0) { eye[0] = tgt[0] + ux * kk;", a)) + 4
s = s[:a] + """  for (const D of DOORS) {                     // closed doors: keep the camera on the side the player is on
    if (D.open >= 0.72 || eye[1] > D.y + 5.5 || eye[1] < D.y - 3) continue; const qe = doorLocal(D, eye[0], eye[2]), qt = doorLocal(D, tgt[0], tgt[2]), pz = -0.55;
    if (Math.abs(qe[0]) < 3.4 && (qe[1] > pz) !== (qt[1] > pz)) { const k = (pz - qt[1]) / (qe[1] - qt[1]) - 0.04; if (k > 0 && k < 1) { eye[0] = tgt[0] + (eye[0] - tgt[0]) * k; eye[1] = tgt[1] + (eye[1] - tgt[1]) * k; eye[2] = tgt[2] + (eye[2] - tgt[2]) * k; } }
  }
""" + s[b:]
rep(" cavernInit(); doorInit();", " cavernInit(); doorInit(); dripInit();")
rep("  drawDoor();\n  drawCavern();", "  drawDoor();\n  drawCavern();\n  drawDrip();")
rep("  drawCavernFx();\n", "  drawCavernFx();\n  drawDripFx();\n")
# save / load / reset / mode switch
rep("function caveSave() { return { door: DOOR.open >= 1 ? 1 : 0, batt:", "function caveSave() { return { doors: DOORS.map(d => d.open >= 1 ? 1 : 0), parts: (cave.parts || []).slice(), batt:")
rep("  DOOR.open = c.door ? 1 : 0;\n", "  DOORS.forEach((d, i) => { d.open = (Array.isArray(c.doors) ? c.doors[i] : (i ? 0 : c.door)) ? 1 : 0; }); if (Array.isArray(c.parts)) cave.parts = PARTS.map((p, i) => !!c.parts[i]);\n")
rep("function caveReset() { DOOR.open = 0; DOOR.moving = false;", "function caveReset() { DOORS.forEach(d => { d.open = 0; d.moving = false; }); cave.parts = PARTS.map(() => false);")
rep("game.free = free; game.loaded = false; DOOR.open = 0; DOOR.moving = false; }", "game.free = free; game.loaded = false; DOORS.forEach(d => { d.open = 0; d.moving = false; }); }")
# humidity in the stalactite cavern
rep("""  const inC = cave.under && cavInside(state.px, state.py + 1, state.pz), target = inC ? 97 : cave.under ? 64 : 22;""",
    """  const inC = cave.under && cavInside(state.px, state.py + 1, state.pz), inD = cave.under && CV.dripK(state.px, state.py + 1, state.pz) < 1.02, target = inC ? 97 : inD ? 99 : cave.under ? 64 : 22;""")
rep("CAVR.fog += ((inC ? 0.62 : 0) - CAVR.fog) * Math.min(1, dt * 0.25);", "CAVR.fog += ((inC ? 0.62 : inD ? 0.5 : 0) - CAVR.fog) * Math.min(1, dt * 0.25);")
rep("  if (inC && !CAVR.seen) {", "  if (inD && !DRIPR.seen) { DRIPR.seen = true; toast('Humidity 99%. Water drips all around you, into still pools.', 7); tone([262, 330, 392], 2.2, 'sine', 0.1, 0.45); }\n  if (inC && !CAVR.seen) {")
# draw distance by zone: Level 1 / crystal cavern / stalactite cavern, always open along a drop shaft
rep("""  const P = cam.planes, E = cam.eye, ck = CV.cavK(E[0], E[1], E[2]), DR = CV.CAV.drop;
  for (const c of cave.ch) {
    if (ck > 1.5 ? c.y0 + CAVE_CH < -136 : ck < 1.0 && c.y0 > -110 && Math.hypot(c.x0 + 12 - DR[0], c.z0 + 12 - DR[1]) > 30) continue;""",
"""  const P = cam.planes, E = cam.eye, D7 = CV.CAV.drop, D8 = CV.DRIP.drop;
  const nearCol = (c, D) => Math.hypot(c.x0 + 12 - D[0], c.z0 + 12 - D[1]) < 30, inCol = D => Math.hypot(E[0] - D[0], E[2] - D[1]) < 14;
  const zone = E[1] > -118 && !inCol(D7) ? 0 : E[1] > -225 ? 1 : 2;   // 0: Level 1, 1: crystal cavern, 2: stalactite cavern
  for (const c of cave.ch) {
    const top = c.y0 + CAVE_CH;
    if (zone === 0 ? top < -136 : zone === 1 ? (c.y0 > -110 && !nearCol(c, D7)) || (top < -235 && !nearCol(c, D8)) : c.y0 > -230 && !nearCol(c, D8)) continue;""")
# teleports
rep("  else if (where === 'cavern') {", """  else if (where === 'd8' || where === 'd9') { const D = DOORS.find(d => d.name === (where === 'd8' ? 'D-8' : 'D-9')), f = doorWorld(D, 0.6, -4.5); state.px = f[0]; state.pz = f[1]; state.py = CV.floorAt(f[0], D.y + 2, f[1]); state.yaw = D.yaw + Math.PI; state.heading = D.yaw; state.pitch = 0.18; }
  else if (where === 'drip') { const C = CV.DRIP; state.px = C.drop[0] + 1.5; state.pz = C.drop[1] + 2; state.py = CV.floorAt(state.px, C.y + 10, state.pz); state.yaw = -Math.PI / 2; state.heading = Math.PI / 2; state.pitch = 0.2; }
  else if (where === 'cavern') {""")
rep("else if (at === 'crystal' || at === 'door' || at === 'cavern') caveTeleport(at); }", "else if (['crystal', 'door', 'cavern', 'd8', 'd9', 'drip'].includes(at)) caveTeleport(at); }")
rep("window.__bench = { DOOR, state,", "window.__bench = { DOOR, DOORS, PARTS, FLOODS, DRIPR, state,")
open(P, 'w').write(s)
print('patched', len(s))
