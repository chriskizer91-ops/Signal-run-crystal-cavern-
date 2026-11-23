import re, sys
P = '/home/claude/src/signal-run-v2.html'
s = open(P, encoding='utf-8').read()
cavelib = open('/home/claude/tools/cavelib.js', encoding='utf-8').read().replace("if (typeof module !== 'undefined') module.exports = CaveLib;\n", '')
runtime = open('/home/claude/tools/cave_runtime.js', encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit('anchor found %d times (wanted %d): %r' % (n, count, old[:90]))
    s = s.replace(old, new)

# ---- page: HUD readout + fade overlay ----
rep('<span id="gstat"></span>', '<span id="gstat"></span><span id="ustat" hidden></span>')
rep('<div id="toast"></div>', '<div id="toast"></div>\n<div id="fade"></div>')
rep('  /* touch controls: only on phones/tablets, only while playing */',
    '  #ustat { font: 600 13px system-ui, sans-serif; color: #ffd98a; text-shadow: 0 1px 3px rgba(0, 0, 0, .9); }\n'
    '  #fade { position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none; transition: opacity 1.5s; z-index: 6; } #fade.on { opacity: 1; }\n'
    '  /* touch controls: only on phones/tablets, only while playing */')

# ---- CaveLib goes next to TerrainLib (plain function, so workers can be built from its source) ----
rep("(function () {\n'use strict';\nconst T = TerrainLib();", cavelib + "\n(function () {\n'use strict';\nconst T = TerrainLib();")

# ---- shared shader code: underground lighting (headlamp + shaft daylight) and the hole in the ground ----
rep("uniform vec4 uShMap; uniform highp sampler2DShadow uChS; uniform mat4 uChM; uniform float uChK, uT;",
    "uniform vec4 uShMap; uniform highp sampler2DShadow uChS; uniform mat4 uChM; uniform float uChK, uT;\n"
    "uniform vec4 uUG, uLd, uHole; uniform vec3 uFlP, uFlD;   // underground: x on/off, y headlamp, z daylight here, w exposure; shaft light; ground hole")
rep("vec2 shUV(vec2 p){ return p*uShMap.xy+uShMap.zw; }",
    "vec2 shUV(vec2 p){ return p*uShMap.xy+uShMap.zw; }\n"
    "vec3 flashL(vec3 w, vec3 n){ vec3 L=uFlP-w; float d=length(L); vec3 l=L/max(d,1e-3); float cs=dot(-l,uFlD);\n"
    "  float cone=smoothstep(0.86,0.975,cs)*0.72+smoothstep(0.55,0.9,cs)*0.24+0.035;\n"
    "  return vec3(1.,0.93,0.82)*uUG.y*cone*(max(dot(n,l),0.)*0.88+0.12)*9./(1.+d*d*0.02); }")
rep("  amb+=vec3(0.55,0.36,0.22)*0.10*(1.-lm.b)*(1.-0.5*n.y);          // warm light bounced off canyon walls\n  return alb*(sun+amb);\n}",
    "  amb+=vec3(0.55,0.36,0.22)*0.10*(1.-lm.b)*(1.-0.5*n.y);          // warm light bounced off canyon walls\n"
    "  vec3 r=alb*(sun+amb);\n"
    "  if(uUG.x>0.){ vec3 dv=w-uLd.xyz; float day=max(uUG.z, uLd.w/(1.+dot(dv,dv)/42.));\n"
    "    r=mix(r, alb*(flashL(w,n)+vec3(0.9,0.95,1.05)*day*2.2+0.01)*uUG.w, uUG.x); }\n"
    "  return r;\n}")
rep("  return mix(c, mix(uFog, vec3(1.0,0.88,0.70), s*0.55), f); }",
    "  return mix(mix(c, mix(uFog, vec3(1.0,0.88,0.70), s*0.55), f), c, uUG.x); }")
rep("vec3 col=vC.rgb*vC.rgb*uTint, c; float lit=texture(uSh,shUV(vW.xz)).r, glint=0.;",
    "vec3 col=vC.rgb*vC.rgb*uTint, c; float lit=texture(uSh,shUV(vW.xz)).r*(1.-uUG.x), glint=0.;")
rep("c=mix(c, sky*1.5, clamp(g*(0.10+0.9*fr),0.,1.)*0.85)+vec3(0.5,0.6,0.8)*fr*0.10;",
    "c=mix(c, sky*1.5, clamp(g*(0.10+0.9*fr),0.,1.)*0.85*(1.-uUG.x))+vec3(0.5,0.6,0.8)*fr*0.10*(1.-uUG.x);")
rep("void main(){\n  vec3 n=normalize(vN); vec3 w=vW;\n  float slope=1.-n.y;",
    "void main(){\n  if(max(abs(vW.x-uHole.x),abs(vW.z-uHole.y))<uHole.z) discard;   // the mine shaft opening\n  vec3 n=normalize(vN); vec3 w=vW;\n  float slope=1.-n.y;")

CAVE_SH = r'''const CAVE_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aD;
uniform mat4 uVP; out vec3 vW; out vec3 vN; out vec2 vD;
void main(){ vW=aP; vN=aN; vD=aD; gl_Position=uVP*vec4(aP,1.); }`;
const CAVE_FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec2 vD; uniform sampler2D uRock; out vec4 o;
${GLSL_COMMON}
void main(){
  vec3 n=normalize(vN), w=vW, v=normalize(uCam-w); if(dot(n,v)<0.) n=-n;
  float k=vD.y;
  // banded limestone with old red sandstone through it; kind: 0 cave, 0.5 shaft, 1 mine, 2 timber, 3 iron
  float yy=w.y+4.*(vnoise(w.xz*0.05)-.5), li=yy/2.3, i0=floor(li);
  float band=mix(hash11(i0+5.),hash11(i0+6.),smoothstep(.3,.7,fract(li)));
  vec3 rock=mix(vec3(0.40,0.35,0.30), vec3(0.64,0.56,0.47), band);
  rock=mix(rock, vec3(0.56,0.30,0.19), smoothstep(0.55,0.8,vnoise(w.xz*0.02+w.y*0.03))*0.6);
  rock*=0.8+0.4*vnoise(w.xz*0.7+w.y*0.9);
  if(k>0.7&&k<1.5) rock*=vec3(0.80,0.78,0.76);
  vec3 col=k>1.5 ? (k>2.5 ? vec3(0.30,0.22,0.17) : vec3(0.40,0.28,0.17)*(0.8+0.4*vnoise(vec2(w.x+w.z,w.y)*3.))) : rock;
  vec3 bw=pow(abs(n),vec3(4.)); bw/=bw.x+bw.y+bw.z;
  vec4 tX=texture(uRock,w.zy*0.23), tY=texture(uRock,w.xz*0.23), tZ=texture(uRock,w.xy*0.23);
  vec2 dX=tX.xy*2.-1., dY=tY.xy*2.-1., dZ=tZ.xy*2.-1.;
  float alb=bw.x*tX.b+bw.y*tY.b+bw.z*tZ.b, cav=bw.x*tX.a+bw.y*tY.a+bw.z*tZ.a;
  if(k<1.5){ n=normalize(n+(bw.x*vec3(0.,dX.y,dX.x)+bw.y*vec3(dY.x,0.,dY.y)+bw.z*vec3(dZ.x,dZ.y,0.))*0.75); col*=(0.6+0.8*alb)*(0.7+0.45*cav); }
  col=pow(col,vec3(1.6));
  vec3 L=uFlP-w; vec3 l=normalize(L);
  vec3 fl=flashL(w,n);
  float wet=smoothstep(0.55,0.8,vnoise(w.xz*0.35+w.y*0.5))*step(k,1.5);
  float sp=pow(max(dot(n,normalize(l+v)),0.),60.)*(0.12+1.3*wet);
  vec3 c=col*(fl+vec3(0.9,0.95,1.05)*vD.x*2.2+0.0012)+fl*sp*0.5;
  o=vec4(tone(c*uUG.w),0.);
}`;
const LINE_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in float aK; uniform mat4 uVP; out vec3 vW; out float vK;
void main(){ vW=aP; vK=aK; gl_Position=uVP*vec4(aP,1.); }`;
const LINE_FS = `#version 300 es
precision highp float; in vec3 vW; in float vK; uniform vec3 uFlP, uFlD; uniform vec4 uUG; out vec4 o;
void main(){ vec3 L=uFlP-vW; float d=length(L), cs=dot(-L/max(d,1e-3),uFlD);
  float lit=(smoothstep(0.82,0.96,cs)*0.8+0.2*smoothstep(0.55,0.85,cs))*uUG.y/(1.+d*d*0.008);
  vec3 col=vK>0.5? vec3(1.0,0.5,0.12) : vec3(0.72,1.0,0.38);
  float I=0.16+2.6*lit; o=vec4(col*I, clamp(I*0.5,0.,1.)); }`;
'''
rep("function prog(vs, fs) {", CAVE_SH + "function prog(vs, fs) {")
rep("pGlow = prog(GLOW_VS, GLOW_FS), pPost = prog(SKY_VS, POST_FS);", "pGlow = prog(GLOW_VS, GLOW_FS), pPost = prog(SKY_VS, POST_FS), pCave = prog(CAVE_VS, CAVE_FS), pLine = prog(LINE_VS, LINE_FS);")
rep("plants: 0, fx: 0, sky: 0, hiTiles: 0,", "plants: 0, fx: 0, sky: 0, cave: 0, hiTiles: 0,")

# ---- runtime block ----
rep("/* --- menu / mode switching --- */", runtime + "\n/* --- menu / mode switching --- */")

# ---- physics: the cave owns floor, walls and ceiling below ground ----
rep("function floorAt(x, z, py) {\n", "function floorAt(x, z, py) {\n  if (caveUnder(x, z, py)) return CV.floorAt(x, py, z);\n")
rep("    const fw = Math.max(-1, Math.min(1, (keys.KeyW", "    cave.under = caveUnder(state.px, state.pz, state.py);\n    const fw = Math.max(-1, Math.min(1, (keys.KeyW")
rep("      state.py = Math.min(1800, state.py + state.vy * dt);\n",
    "      state.py = Math.min(1800, state.py + state.vy * dt);\n"
    "      if (cave.under) { const c = CV.ceilAt(state.px, state.py, state.pz); if (c < 1e8 && c > state.py + 1.0 && state.py + 1.85 > c) { state.py = c - 1.85; if (state.vy > 0) state.vy = 0; } }\n")
rep("    if (play) gameUpdate(dt, prev);", "    if (cave.under) cave.ceil = CV.ceilAt(state.px, state.py, state.pz);\n    caveUpdate(dt);\n    if (play) gameUpdate(dt, prev);")
rep("  if (eye[0] > 0 && eye[0] < WORLD && eye[2] > 0 && eye[2] < WORLD) { const ge = T.height(eye[0], eye[2]) + 0.7; if (eye[1] < ge) eye[1] = ge; }\n"
    "  const f = norm([tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]]), L = lookDir(eye, f), near = Math.max(0.1, Math.min(2, state.dist * 0.05));",
    "  if (cave.under) caveCamera(tgt, eye);\n"
    "  else if (eye[0] > 0 && eye[0] < WORLD && eye[2] > 0 && eye[2] < WORLD) { const ge = T.height(eye[0], eye[2]) + 0.7; if (eye[1] < ge) eye[1] = ge; }\n"
    "  const f = norm([tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]]), L = lookDir(eye, f), near = cave.under ? Math.max(0.06, Math.min(2, Math.hypot(eye[0] - tgt[0], eye[1] - tgt[1], eye[2] - tgt[2]) * 0.05)) : Math.max(0.1, Math.min(2, state.dist * 0.05));\n"
    "  cave.flD = f; cave.flP = [state.px + Math.sin(state.heading) * 0.2, state.py + 1.62, state.pz + Math.cos(state.heading) * 0.2]; caveView(eye);")

# ---- shared uniforms ----
rep("  if (p.u.uT) gl.uniform1f(p.u.uT, state.time); if (p.u.uTint) gl.uniform3f(p.u.uTint, 1, 1, 1);",
    "  if (p.u.uT) gl.uniform1f(p.u.uT, state.time); if (p.u.uTint) gl.uniform3f(p.u.uTint, 1, 1, 1);\n"
    "  if (p.u.uUG) gl.uniform4f(p.u.uUG, 0, cave.flash, cave.pday, cave.expo); if (p.u.uFlP) gl.uniform3fv(p.u.uFlP, cave.flP); if (p.u.uFlD) gl.uniform3fv(p.u.uFlD, cave.flD);\n"
    "  if (p.u.uLd) gl.uniform4f(p.u.uLd, CV.LIGHT[0], CV.LIGHT[1], CV.LIGHT[2], CV.dayK(CV.SHB) * 5); if (p.u.uHole) gl.uniform4f(p.u.uHole, CV.SX, CV.SZ, HOLE, 0);")

# ---- rendering: draw the surface or the cave (or both, looking down or up the shaft) ----
rep("  chK = 0.85 * Math.max(0, 1 - (state.py - terrainFloor(state.px, state.pz)) / 260);",
    "  chK = cave.under ? 0 : 0.85 * Math.max(0, 1 - (state.py - terrainFloor(state.px, state.pz)) / 260);\n  caveStream();")
rep("  gl.clearColor(FOG[0], FOG[1], FOG[2], 0); gl.clear(", "  if (cave.surface) gl.clearColor(FOG[0], FOG[1], FOG[2], 0); else gl.clearColor(0, 0, 0, 0);\n  gl.clear(")
rep("  setCommon(pSky); gl.uniform3fv(pSky.u.uR, cam.r); gl.uniform3fv(pSky.u.uU, cam.u); gl.uniform3fv(pSky.u.uF, cam.f); gl.uniform2fv(pSky.u.uTan, cam.tan);\n  gl.bindVertexArray(null); stats.sky += drawArr(3);",
    "  if (cave.sky) { setCommon(pSky); gl.uniform3fv(pSky.u.uR, cam.r); gl.uniform3fv(pSky.u.uU, cam.u); gl.uniform3fv(pSky.u.uF, cam.f); gl.uniform2fv(pSky.u.uTan, cam.tan);\n  gl.bindVertexArray(null); stats.sky += drawArr(3); }")
rep("  for (let i = 0; i < vis.length; i++) {\n    const e = vis[i], t = e.t;\n    if (e.want === BASE",
    "  for (let i = 0; i < (cave.surface ? vis.length : 0); i++) {\n    const e = vis[i], t = e.t;\n    if (e.want === BASE")
rep("  for (const p of props) {\n    if (!classify(", "  for (const p of (cave.surface ? props : [])) {\n    if (!classify(")
rep("  drawBirds();\n  // character", "  if (cave.surface) drawBirds();\n  // character")
rep("  drawCharacter(pProp.u.uM, m10 ? 2 : state.play ? 1 : 0, 'chr');\n  drawPlants();",
    "  gl.uniform4f(pProp.u.uUG, cave.under ? 1 : 0, cave.flash, cave.pday, cave.expo);\n"
    "  drawCharacter(pProp.u.uM, m10 ? 2 : state.play ? 1 : 0, 'chr');\n"
    "  gl.uniform4f(pProp.u.uUG, 0, cave.flash, cave.pday, cave.expo);\n"
    "  if (cave.surface) drawPlants();\n  drawCave();")
rep("  for (let k = 0; k < 2; k++) { gl.uniform1f(pWater.u.uKind, k);", "  for (let k = 0; k < (cave.surface ? 2 : 0); k++) { gl.uniform1f(pWater.u.uKind, k);")
rep("  drawGlow();\n  gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);",
    "  if (cave.surface) drawGlow();\n  drawCaveFx();\n  gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);")

# ---- HUD, saving, plants, start-up ----
rep("  if (!ob) { mk.hidden = true; return; }",
    "  const us = $('ustat'); us.hidden = !cave.under;\n"
    "  if (cave.under) us.textContent = (cave.dead ? 'Light dead' : 'Light ' + Math.ceil(cave.batt) + '%') + (cave.spares ? ' +' + cave.spares : '') + (line.reel ? ' · Line ' + Math.round(line.left) + ' m' : '');\n"
    "  if (!ob || cave.under) { mk.hidden = true; return; }")
rep("best: game.best, done: game.done })); } catch (err)", "best: game.best, done: game.done, cave: caveSave() })); } catch (err)")
rep("game.best = s.best || {}; game.done = !!s.done;", "game.best = s.best || {}; game.done = !!s.done; caveLoad(s.cave);")
rep("game.online = 0; game.carrying = 0; game.done = false; game.trial = null; applyUpgrades(true);", "game.online = 0; game.carrying = 0; game.done = false; game.trial = null; caveReset(); applyUpgrades(true);")
rep("if (Math.hypot(x - OBS[0], z - OBS[1]) < 178 || Math.hypot(x - LOOK[0], z - LOOK[1]) < 26) continue;",
    "if (Math.hypot(x - OBS[0], z - OBS[1]) < 178 || Math.hypot(x - LOOK[0], z - LOOK[1]) < 26 || Math.hypot(x - MINE_AT[0], z - MINE_AT[1]) < 7) continue;")
rep("buildGame(); placeAssets(); buildPlants();", "buildGame(); placeAssets(); caveInit(); buildPlants();")
rep("} else if (params.has('bench') || params.has('mode')) { game.inMode = 'bench'; startBench(); if (params.get('mode') === 'explore') setMode(0); } else showMenu(true);",
    "} else if (params.has('bench') || params.has('mode')) { game.inMode = 'bench'; startBench(); if (params.get('mode') === 'explore') setMode(0); } else showMenu(true);\n"
    "    if (params.get('at') === 'mine' || params.get('at') === 'cave') caveTeleport(params.get('at') === 'mine' ? 'top' : 'station');")
rep("      'Character (+ its shadow)  '", "      'Caves                     ' + fmt(stats.cave) + ' (' + cave.ch.filter(c => c.m[0] && c.m[0].count).length + ' close-up, ' + cave.ch.filter(c => c.m[1]).length + ' of ' + cave.ch.length + ' rough pieces, ' + cave.mode + ')\\n' +\n      'Character (+ its shadow)  '")
rep("get plantTotal() { return plantTotal; },", "get plantTotal() { return plantTotal; }, cave, line, CV, caveTeleport,")
open(P, 'w', encoding='utf-8').write(s)
print('patched OK, size', len(s))
