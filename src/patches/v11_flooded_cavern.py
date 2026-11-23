# v11: the flooded cavern behind D-9: the lake, swimming and suit air, the murk, the fish, the dive station and its log.
# Run from the repo root after `python3 src/sync_cavelib.py to-game`:  python3 src/patches/v11_flooded_cavern.py
import os, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
P = os.path.join(ROOT, 'game', 'signal-run.html')
s = open(P, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

rep("const CAVE_AREA = [CV.SX - 200, CV.SZ - 220, CV.SX + 450, CV.SZ + 320];", "const CAVE_AREA = [CV.SX - 200, CV.SZ - 220, CV.SX + 560, CV.SZ + 320];")
# --- shared shader bits: the lake's region, under-water murk, looking down into the water
rep("uniform vec4 uUG, uLd, uHole, uCav, uDrp, uFdP, uFdD; uniform vec3 uFlP, uFlD, uCavR, uDrpR;", "uniform vec4 uUG, uLd, uHole, uCav, uDrp, uFdP, uFdD, uLke, uUW; uniform vec3 uFlP, uFlD, uCavR, uDrpR, uLkeR;")
rep("vec3 haze(vec3 c, vec3 w){ float d=length(w-uCam); c=mix(c, vec3(0.012,0.05,0.06), (1.-exp(-d*0.0065))*cavK(w)*0.85); return mix(c, vec3(0.010,0.026,0.029), (1.-exp(-d*0.0085))*drpK(w)*0.85); }",
"""float lkK(vec3 w){ vec3 q=(w-uLke.xyz)/uLkeR; return (1.-smoothstep(0.95,1.3,length(q)))*uLke.w; }   // 1 inside the flooded cavern
vec3 haze(vec3 c, vec3 w){ float d=length(w-uCam); c=mix(c, vec3(0.012,0.05,0.06), (1.-exp(-d*0.0065))*cavK(w)*0.85); c=mix(c, vec3(0.010,0.026,0.029), (1.-exp(-d*0.0085))*drpK(w)*0.85);
  c=mix(c, vec3(0.004,0.008,0.009), (1.-exp(-d*0.008))*lkK(w)*0.8);
  if(uUW.x>0.5){ vec3 v=(w-uCam)/max(d,1e-3), q=uCam+v*min(d,5.); float cs=dot(normalize(q-uFlP),uFlD);   // under water: murk, and the lamp's beam glowing in it
    vec3 murk=vec3(0.004,0.017,0.016)+vec3(0.06,0.11,0.10)*smoothstep(0.82,0.97,cs)*uUG.y*(1.-exp(-min(d,9.)*0.3));
    c=mix(c, murk, 1.-exp(-d*uUW.w)); }
  else if(w.y<uUW.y){ float lk=lkK(w); if(lk>0.){ vec3 v=normalize(w-uCam); float path=(uUW.y-w.y)/max(-v.y,0.1); c=mix(c, vec3(0.003,0.012,0.012), (1.-exp(-path*uUW.w*1.2))*lk); } }   // looking down into the lake
  return c; }""")
# --- cave rock: dark slate in the flooded cavern, silt under the water, a dark ring at the waterline; the bore is black, glassy, ringed
rep("""  col=pow(col,vec3(1.6));
  vec3 L=uFlP-w; vec3 l=normalize(L);
  vec3 fl=flashL(w,n)+floodL(w,n);""", """  float lk=lkK(w);
  if(lk>0.){ vec3 sl=mix(vec3(0.27,0.30,0.29),vec3(0.44,0.46,0.42),band)*(0.8+0.4*vnoise3(w*0.5));
    float uw=smoothstep(uUW.y+0.3,uUW.y-0.8,w.y);
    sl=mix(sl, vec3(0.42,0.39,0.33)*(0.85+0.3*vnoise3(w*1.3)), uw*smoothstep(0.2,0.8,n.y));
    sl=mix(sl, vec3(0.08,0.14,0.08), (1.-smoothstep(0.,0.6,abs(w.y-uUW.y-0.1)))*0.85);
    col=mix(col, sl, lk); }
  if(k>3.5){ float g=abs(fract(w.x*2.)-0.5); col=vec3(0.05,0.055,0.06)*mix(1.,0.35,smoothstep(0.43,0.48,g)); }
  col=pow(col,vec3(1.6));
  vec3 L=uFlP-w; vec3 l=normalize(L);
  vec3 fl=flashL(w,n)+floodL(w,n);""")
rep("dk*(0.55+0.45*vnoise3(w*0.4)));", "dk*(0.55+0.45*vnoise3(w*0.4))); if(k>3.5) wet=1.; else wet=max(wet, lk*smoothstep(uUW.y+0.8,uUW.y-0.5,w.y));")
# props underground take the cave's haze and murk (the surface keeps its fog)
rep("  c=tone(fogit(c,vW));\n  if(uOverlay>0)", "  c=tone(uUG.x>0.5 ? haze(c,vW) : fogit(c,vW));\n  if(uOverlay>0)")
# the research team's old line glows pale
rep("vec3 col=vK>0.5? vec3(1.0,0.5,0.12) : vec3(0.72,1.0,0.38);", "vec3 col=vK>1.5? vec3(0.55,0.75,0.8)*0.55 : vK>0.5? vec3(1.0,0.5,0.12) : vec3(0.72,1.0,0.38);")
# --- new shaders
rep("const LINE_VS = `#version 300 es", r"""const LAKE_FS = `#version 300 es
precision highp float; in vec3 vW; out vec4 o;
${GLSL_COMMON}
void main(){ vec2 p=vW.xz; float t=uT; bool below=uCam.y<vW.y;
  vec3 n=normalize(vec3((vnoise(p*0.9+t*0.25)-0.5)*0.05+sin(p.x*1.7+t*0.6)*0.01, 1., (vnoise(p*0.8-t*0.2+7.)-0.5)*0.05+cos(p.y*1.5+t*0.5)*0.01)); if(below) n=-n;
  vec3 v=normalize(uCam-vW); float fr=0.03+0.97*pow(1.-abs(dot(n,v)),5.);
  vec3 fl=flashL(vW,n), fd=floodL(vW,n), L=normalize(uFlP-vW), Lf=normalize(uFdP.xyz-vW);
  float sp=pow(max(dot(n,normalize(L+v)),0.),220.)*uUG.y*2.2, spf=pow(max(dot(n,normalize(Lf+v)),0.),220.)*uFdP.w*1.2;
  vec3 c;
  if(below){ c=vec3(0.006,0.02,0.018)+(length(fl)+length(fd))*vec3(0.05,0.09,0.08)*(0.6+0.8*vnoise(p*3.+t)); c=mix(c,c*2.5,fr); }   // the surface from beneath: a dim, rippling ceiling
  else { vec3 body=vec3(0.002,0.008,0.008)+(length(fl)+length(fd))*vec3(0.01,0.03,0.028);
    vec3 rd=reflect(-v,n); float stars=smoothstep(0.94,1.,vnoise(rd.xz/max(rd.y,0.2)*12.))*0.25*lkK(vW);
    c=mix(body, vec3(0.003,0.008,0.009)+vec3(0.3,0.95,0.85)*stars, fr)+vec3(1.,.95,.85)*sp+vec3(1.,.9,.74)*spf; }
  c=haze(c,vW); o=vec4(tone(c*uUG.w), below?0.85:0.9); }`;
const FISH_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aC;
uniform mat4 uVP, uM; uniform vec4 uSw; out vec3 vW; out vec3 vN; out vec4 vC;
void main(){ float L=uSw.z, s=clamp((L*0.5-aP.x)/L,0.,1.), amp=uSw.y*L*0.11*(0.08+0.92*s*s), ph=uSw.x-aP.x*uSw.w;   // a wave runs head to tail, growing toward the tail
  vec3 p=aP+vec3(0.,0.,sin(ph)*amp); float sl=-cos(ph)*amp*uSw.w;
  vec3 n=normalize(vec3(aN.x-aN.z*sl, aN.y, aN.z));
  vec4 w=uM*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(uM)*n); vC=aC; gl_Position=uVP*w; }`;
const FISH_FS = `#version 300 es
precision highp float; in vec3 vW; in vec3 vN; in vec4 vC; out vec4 o;
${GLSL_COMMON}
void main(){ vec3 n=normalize(vN), v=normalize(uCam-vW); if(dot(n,v)<0.) n=-n;
  vec3 col=vC.rgb*vC.rgb; float em=vC.a*(0.7+0.3*sin(uT*1.3+vW.x*2.));
  vec3 fl=flashL(vW,n)+floodL(vW,n); float rim=pow(1.-max(dot(n,v),0.),3.);
  vec3 c=col*(fl+0.003)+col*em*0.9+vec3(0.5,0.7,0.65)*rim*length(fl)*0.25+fl*pow(max(dot(n,normalize(normalize(uFlP-vW)+v)),0.),50.)*0.35;
  c=haze(c,vW); o=vec4(tone(c*uUG.w), clamp(em*0.4,0.,1.)); }`;
const SILT_VS = `#version 300 es
layout(location=0) in vec4 aP; uniform mat4 uVP; uniform float uT, uPx; uniform vec3 uCam, uFlP, uFlD; uniform vec4 uUG; out float vA;
void main(){ vec3 b=aP.xyz+vec3(sin(uT*0.2+aP.w*20.)*0.4, sin(uT*0.13+aP.w*31.)*0.3, cos(uT*0.17+aP.w*13.)*0.4);
  vec3 p=uCam+mod(b-uCam+8.,16.)-8.; gl_Position=uVP*vec4(p,1.); float d=length(p-uCam); gl_PointSize=clamp(9./d,1.,4.)*uPx;
  float cs=dot(normalize(p-uFlP),uFlD); vA=(0.1+1.2*smoothstep(0.86,0.97,cs)*uUG.y)*clamp(1.-d/8.,0.,1.); }`;
const SILT_FS = `#version 300 es
precision highp float; in float vA; out vec4 o;
void main(){ vec2 q=gl_PointCoord*2.-1.; float r=dot(q,q); if(r>1.) discard; float a=(1.-r)*vA; o=vec4(vec3(0.55,0.6,0.55)*a, a*0.3); }`;
const LINE_VS = `#version 300 es""")
rep(", pDrip = prog(KIT_VS, DRIP_FS), pRim = prog(POOL_VS, RIM_FS), pWorm = prog(WORM_VS, WORM_FS);",
    ", pDrip = prog(KIT_VS, DRIP_FS), pRim = prog(POOL_VS, RIM_FS), pWorm = prog(WORM_VS, WORM_FS), pLake = prog(POOL_VS, LAKE_FS), pFish = prog(FISH_VS, FISH_FS), pSilt = prog(SILT_VS, SILT_FS);")
rep("  if (p.u.uDrp) gl.uniform4f(p.u.uDrp, CV.DRIP.x, CV.DRIP.y, CV.DRIP.z, 1);",
    "  if (p.u.uLke) gl.uniform4f(p.u.uLke, CV.LAKE.x, CV.LAKE.y, CV.LAKE.z, 1); if (p.u.uLkeR) gl.uniform3f(p.u.uLkeR, CV.LAKE.rx, CV.LAKE.ry, CV.LAKE.rz); if (p.u.uUW) gl.uniform4f(p.u.uUW, LAKER.camUnder ? 1 : 0, CV.LAKE.water, 1, 0.115);\n  if (p.u.uDrp) gl.uniform4f(p.u.uDrp, CV.DRIP.x, CV.DRIP.y, CV.DRIP.z, 1);")
# --- runtime: the lake, inserted after the stalactite cavern's code
rt = open(os.path.join(ROOT, 'src', 'runtime', 'lake_runtime.js'), encoding='utf-8').read()
rep("function caveStep(nx, nz, f) {\n", rt + "function caveStep(nx, nz, f) {\n")
# doors: D-9 now opens onto the lake; D-10, deep in the bore, waits for the next build
rep("function doorReady(D) { return D.name !== 'D-9'; }      // D-9: the flooded level beyond comes in the next build",
    "function doorReady(D) { return D.name !== 'D-10'; }     // D-10: the giant crystal cavern beyond it comes in the next build")
rep(": !doorReady(D) ? D.name + ' won\\'t budge. Cold water seeps out from under it. (The flooded level comes in the next build.)'",
    ": !doorReady(D) ? D.name + ' is sealed tight. Beyond it the bore runs on, down into the dark. (The giant crystal cavern comes in the next build.)'")
rep(" cavernInit(); doorInit(); dripInit();", " cavernInit(); doorInit(); dripInit(); lakeInit();")
rep("  drawDoor();\n  drawCavern();\n  drawDrip();", "  drawDoor();\n  drawCavern();\n  drawDrip();\n  drawLake();")
rep("  drawCavernFx();\n  drawDripFx();\n", "  drawCavernFx();\n  drawDripFx();\n  drawLakeFx();\n")
rep("  drawDoorLamp();\n", "  drawDoorLamp(); drawLakeGlow();\n")
rep("  doorUpdate(dt);\n", "  doorUpdate(dt); lakeUpdate(dt);\n")
# --- swimming: chest under water means you swim; JET swims up, DIVE swims down, the jetpack does nothing in water
rep("    cave.under = caveUnder(state.px, state.pz, state.py);\n", "    cave.under = caveUnder(state.px, state.pz, state.py);\n    const swim = cave.under && inWater(state.px, state.py + 1.1, state.pz);\n")
rep("jet = !!keys.Space && hasFuel,", "jet = !!keys.Space && hasFuel && !swim,")
rep("    if (state.grounded) { const sp = fast ? 14 : 7, k = Math.min(1, dt * 12);",
    "    if (swim) { const sp = fast ? 5.5 : 3.4, k = 1 - Math.exp(-2.4 * dt); state.vx += ((ml > 0 ? mx * sp : 0) - state.vx) * k; state.vz += ((ml > 0 ? mz * sp : 0) - state.vz) * k; state.hover = false; state.grounded = false; }   // in water you float: nothing holds you to the bottom\n    else if (state.grounded) { const sp = fast ? 14 : 7, k = Math.min(1, dt * 12);")
rep("      if (!jet) {\n        if (state.hover", "      if (swim) { const vt = keys.Space ? 2.6 : drop ? -2.8 : 0; state.vy += (vt - state.vy) * Math.min(1, dt * 2.5); }\n      else if (!jet) {\n        if (state.hover")
rep("      state.py = Math.min(1800, state.py + state.vy * dt);\n", "      state.py = Math.min(1800, state.py + state.vy * dt);\n      if (swim && state.py > LWL - 1.25 && !(floorY > LWL - 1.4)) { state.py = LWL - 1.25; if (state.vy > 0) state.vy = 0; }   // float with your head out\n")
rep("state.thrust = ease(state.thrust, jet ? 1 :", "state.thrust = ease(state.thrust, swim ? 0 : jet ? 1 :")
# --- HUD: suit air while it matters
rep("(CAVR.humid > 80 ? ' · Humidity ' + Math.round(CAVR.humid) + '%' : '');", "(CAVR.humid > 80 ? ' · Humidity ' + Math.round(CAVR.humid) + '%' : '') + (LAKER.air < 99.5 || inWater(state.px, state.py + 1.6, state.pz) ? ' · Air ' + Math.round(LAKER.air) + '%' : '');")
# --- draw zones: add the flooded cavern
rep("""  const zone = E[1] > -118 && !inCol(D7) ? 0 : E[1] > -225 ? 1 : 2;   // 0: Level 1, 1: crystal cavern, 2: stalactite cavern""",
    """  const D9 = CV.LAKE.drop, zone = E[1] > -118 && !inCol(D7) ? 0 : E[1] > -225 ? 1 : E[1] > -345 ? 2 : 3;   // 0: Level 1, 1: crystal cavern, 2: stalactite cavern, 3: flooded cavern""")
rep("""    if (zone === 0 ? top < -136 : zone === 1 ? (c.y0 > -110 && !nearCol(c, D7)) || (top < -235 && !nearCol(c, D8)) : c.y0 > -230 && !nearCol(c, D8)) continue;""",
    """    if (zone === 0 ? top < -136 : zone === 1 ? (c.y0 > -110 && !nearCol(c, D7)) || (top < -235 && !nearCol(c, D8)) : zone === 2 ? (c.y0 > -230 && !nearCol(c, D8)) || (top < -355 && !nearCol(c, D9)) : c.y0 > -350 && !nearCol(c, D9)) continue;""")
# --- teleports
rep("  else if (where === 'd8' || where === 'd9') { const D = DOORS.find(d => d.name === (where === 'd8' ? 'D-8' : 'D-9')),",
    "  else if (where === 'lake') { const C = CV.LAKE; state.px = C.drop[0] - 1.5; state.pz = C.drop[1] + 1; state.py = CV.floorAt(state.px, C.y + 20, state.pz); state.yaw = -Math.PI / 2; state.heading = Math.PI / 2; state.pitch = 0.2; }\n  else if (where === 'd8' || where === 'd9' || where === 'd10') { const D = DOORS.find(d => d.name === (where === 'd8' ? 'D-8' : where === 'd9' ? 'D-9' : 'D-10')),")
rep("else if (['crystal', 'door', 'cavern', 'd8', 'd9', 'drip'].includes(at)) caveTeleport(at); }", "else if (['crystal', 'door', 'cavern', 'd8', 'd9', 'drip', 'lake', 'd10'].includes(at)) caveTeleport(at); }")
# --- the dive log reader: a button appears only when you stand at the terminal
rep('<div id="toast"></div>', '<div id="toast"></div>\n<button id="logBtn" hidden>Read the dive log</button>\n<div id="logCard" hidden><div id="logTitle"></div><div id="logText"></div><div class="lrow"><span id="logPage"></span><button id="logPrev">‹ Back</button><button id="logNext">Next ›</button><button id="logClose">Close</button></div></div>')
rep("  #fade { position: fixed;", """  #logBtn { position: fixed; left: 50%; bottom: 112px; transform: translateX(-50%); z-index: 5; padding: 9px 18px; border-radius: 10px; background: rgba(13, 17, 23, .85); border: 1px solid rgba(150, 240, 220, .5); color: #bff5e8; font: 600 14px system-ui, sans-serif; }
  #logCard { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 7; width: min(520px, 88vw); padding: 20px 22px 14px; background: rgba(6, 14, 14, .93); border: 1px solid rgba(150, 240, 220, .35); border-radius: 12px; color: #cfeee6; font: 15px/1.5 ui-monospace, Menlo, monospace; box-shadow: 0 0 40px rgba(60, 200, 180, .15); }
  #logTitle { font-weight: 700; color: #8ff0d8; margin-bottom: 10px; letter-spacing: .04em; }
  #logText { white-space: pre-wrap; min-height: 130px; }
  #logCard .lrow { display: flex; gap: 8px; align-items: center; margin-top: 14px; } #logCard .lrow span { margin-right: auto; opacity: .7; font-size: 13px; }
  #logCard button { padding: 6px 12px; border-radius: 8px; background: rgba(255, 255, 255, .08); border: 1px solid rgba(255, 255, 255, .18); color: inherit; font: 600 13px system-ui, sans-serif; } #logCard button:disabled { opacity: .35; }
  #fade { position: fixed;""")
rep("$('mPlay').onclick = () => startPlay(false, false);", "$('logBtn').onclick = () => logShow(0); $('logPrev').onclick = () => logShow(Math.max(0, LAKER.read - 1)); $('logNext').onclick = () => logShow(Math.min(LOG.length - 1, LAKER.read + 1)); $('logClose').onclick = () => logShow(-1);\n$('mPlay').onclick = () => startPlay(false, false);")
rep("""  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'Escape' || e.code === 'KeyP') {""", """  if (e.repeat) return;
  if (typeof LAKER !== 'undefined' && LAKER.read >= 0) { if (e.code === 'Escape' || e.code === 'KeyE') logShow(-1); else if (e.code === 'ArrowRight' || e.code === 'KeyD') logShow(Math.min(LOG.length - 1, LAKER.read + 1)); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') logShow(Math.max(0, LAKER.read - 1)); return; }
  if (e.code === 'KeyE' && !$('logBtn').hidden) { logShow(0); return; }
  keys[e.code] = true;
  if (e.code === 'Escape' || e.code === 'KeyP') {""")
# --- the lake trail (src/node/routes.js now also routes the flooded cavern)
routes = json.load(open(os.path.join(ROOT, 'src', 'node', 'routes.json')))
a = s.index('const ROUTES = '); b = s.index(';', a)
s = s[:a] + 'const ROUTES = ' + json.dumps(routes, separators=(',', ':')) + s[b:]
rep("window.__bench = { DOOR, DOORS, PARTS, FLOODS, STAKES, DRIPR,", "window.__bench = { DOOR, DOORS, PARTS, FLOODS, STAKES, DRIPR, LAKER, inWater, logShow,")
open(P, 'w', encoding='utf-8').write(s)
print('patched', len(s))
