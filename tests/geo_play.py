# The giant crystal cavern by numbers (campaign): D-10 locked, the coupling on the lake floor, the spare tank,
# the dive to D-10 and up the tunnel past it onto the balcony (no spare tank), the reveal, standing on a titan.
import asyncio, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.abspath(os.path.join(HERE, '..', 'game', 'signal-run.html'))
SIM = open(os.path.join(HERE, 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
SWIM = r"""(()=>{ window.__swim = (wps, maxT, stopFn) => { const B=__bench, s=B.state; let i=0, t=0, under=0; const ev={};
  while (t < maxT && i < wps.length) { const w=wps[i], dx=w[0]-s.px, dz=w[2]-s.pz, dy=w[1]-(s.py+1), h=Math.hypot(dx,dz);
    if (Math.hypot(h,dy) < (w[3]||2.5)) { i++; continue; }
    s.yaw=Math.atan2(-dx,-dz); B.keys.KeyW=h>1.0; B.keys.ShiftLeft=true; B.keys.Space=dy>0.7; B.keys.KeyC=dy<-0.7;
    B.update(0.033); t+=0.033; if (B.inWater(s.px,s.py+1.6,s.pz)) under+=0.033; if (stopFn && stopFn(B)) break; }
  for (const k of ['KeyW','ShiftLeft','Space','KeyC']) B.keys[k]=false;
  return {t:+t.toFixed(1), reached:i, of:wps.length, underwater:+under.toFixed(1), air:+B.LAKER.air.toFixed(0), pos:[s.px-B.CV.SX,s.py,s.pz-B.CV.SZ].map(v=>+v.toFixed(1))}; }; return 1; })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':480,'height':270}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=new&at=lake'); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.evaluate(SWIM)
        D10 = "__bench.DOORS.find(d=>d.name==='D-10')"
        print('1. campaign start: D-10 unlocked?', await pg.evaluate(f"__bench.cave.parts.length+' couplings, D-10 needs one: '+!!{D10}"), '| coupling at (local)', await pg.evaluate("__bench.PARTS[2].at.map((v,i)=>+(v-[1444,0,1486][i]).toFixed(1))"), 'depth', await pg.evaluate("+(__bench.CV.LAKE.water-__bench.PARTS[2].at[1]).toFixed(1)"))
        # swim from the beach out to the coupling and down to it
        r = await pg.evaluate("(()=>{const P=__bench.PARTS[2].at, W=__bench.CV.LAKE.water; return __swim([[P[0],W-1.5,P[2],2.5],[P[0],P[1]+1.2,P[2],1.4]], 90, B=>B.cave.parts[2]);})()")
        await pg.evaluate(SIM + "(10,{})")
        print('2. dived to the coupling:', r, '| picked up:', await pg.evaluate('__bench.cave.parts[2]'), '|', await pg.evaluate("document.getElementById('toast').textContent"))
        # back up, and over to the rack for the spare tank
        r = await pg.evaluate("(()=>{const s=__bench.state, W=__bench.CV.LAKE.water; return __swim([[s.px,W-0.5,s.pz,1.5]], 30);})()"); await pg.evaluate(SIM + "(90,{})")
        print('3. surfaced, air refills:', r['air'], '->', await pg.evaluate('+__bench.LAKER.air.toFixed(0)'))
        await pg.evaluate("(()=>{const B=__bench,s=B.state,R=B.LAKER.rack; s.px=R.p[0]+1.2; s.pz=R.p[2]+1.2; s.py=B.CV.floorAt(s.px,R.p[1]+3,s.pz); s.vx=s.vy=s.vz=0; s.grounded=true;})()")
        await pg.evaluate(SIM + "(5,{})"); print('4. at the tank rack: spare tank', await pg.evaluate('__bench.cave.tank'), '|', await pg.evaluate("document.getElementById('toast').textContent"))
        # the full dive, WITHOUT the spare tank (worst case): beach -> down the old route to D-10 -> wait for it -> up the tunnel past it, out of the water, to the balcony
        await pg.evaluate("__bench.caveTeleport('lake'); __bench.LAKER.air=100; __bench.cave.tank=false;")
        wp = """(()=>{const B=__bench, W=B.CV.LAKE.water, D=B.DOORS.find(d=>d.name==='D-10'), r=B.STAKES.filter(k=>k.route==='D-10').map(k=>[k.p[0],k.p[1]+1.6,k.p[2]]); return [[r[0][0],W-1.5,r[0][2]], ...r, [D.x-3,D.y+1.6,D.z,1.5]]; })()"""
        wps = await pg.evaluate(wp)
        r1 = await pg.evaluate(f"__swim({wps}, 120)")
        print('5. beach -> D-10 (no spare tank):', r1, '| door open', await pg.evaluate(f"+{D10}.open.toFixed(2)"))
        r2 = await pg.evaluate(f"__swim([[{D10}.x-3,{D10}.y+1.6,{D10}.z,0.3]], 6, B=>{D10}.open>=0.99)"); await pg.evaluate(SIM + "(10,{})")
        print('6. waited at D-10 for it to open:', r2, '| open', await pg.evaluate(f"+{D10}.open.toFixed(2)"), '|', await pg.evaluate("document.getElementById('toast').textContent"))
        up = """(()=>{const B=__bench; return B.STAKES.filter(k=>k.route==='GEO').map(k=>[k.p[0],k.p[1]+1.0,k.p[2],1.6]); })()"""
        wps2 = await pg.evaluate(up)
        await pg.evaluate("(()=>{window.__airMin=100; window.__outAt=null; const B=__bench, f=B.update; B.update=(dt)=>{f(dt); __airMin=Math.min(__airMin,B.LAKER.air); if(__outAt===null && !B.inWater(B.state.px,B.state.py+1.6,B.state.pz)) __outAt=[B.state.px-B.CV.SX,B.state.py,B.state.pz-B.CV.SZ].map(v=>+v.toFixed(1));}; })()")
        r3 = await pg.evaluate(f"__swim({wps2}, 120, B=>B.GEOR.seen)")
        await pg.evaluate(SIM + "(10,{})")
        print('7. D-10 -> up the tunnel -> out onto the balcony:', r3, '| head out of the water at (local)', await pg.evaluate('__outAt'), '| revealed', await pg.evaluate('__bench.GEOR.seen'), '|', await pg.evaluate("document.getElementById('toast').textContent"))
        print('   total time under water', round(r1['underwater'] + r2['underwater'] + r3['underwater'], 1), 's of the 75 s suit; lowest air', await pg.evaluate('+__airMin.toFixed(0)'), '%; standing on the balcony at', r3['pos'], 'grounded', await pg.evaluate('__bench.state.grounded'))
        # titans: land on one, and get pushed out of one
        land = await pg.evaluate("""(()=>{const B=__bench,s=B.state,T=B.GEOR.titans.filter(t=>t.kind==='floor'&&t.ax[1]>0.85).sort((a,b)=>a.L-b.L)[0]; const top=[T.p[0]+T.ax[0]*T.L*0.5, T.p[1]+T.ax[1]*T.L*0.5, T.p[2]+T.ax[2]*T.L*0.5];
          s.px=T.p[0]+T.ax[0]*T.L*0.72; s.pz=T.p[2]+T.ax[2]*T.L*0.72; s.py=T.p[1]+T.ax[1]*T.L*1.05; s.vx=s.vy=s.vz=0; s.grounded=false; s.hover=false; for(let i=0;i<150;i++) B.update(0.033);
          const rock=B.CV.floorAt(s.px, s.py, s.pz); return {kind:T.kind, L:+T.L.toFixed(1), standingAt:+s.py.toFixed(1), rockBelow:+rock.toFixed(1), heightAboveRock:+(s.py-rock).toFixed(1), grounded:s.grounded}; })()""")
        print('8. dropped onto the side of a', land['kind'], 'titan', land['L'], 'm long:', land)
        push = await pg.evaluate("""(()=>{const B=__bench,s=B.state,T=B.GEOR.titans.filter(t=>t.kind==='floor')[1]; s.px=T.mid[0]; s.pz=T.mid[2]; s.py=T.mid[1]-1; s.vx=s.vy=s.vz=0; s.grounded=false; s.hover=true;
          const before=B.geoSDp?0:0; for(let i=0;i<20;i++) B.update(0.033); return {startedInsideTitanMetres:+(T.L*T.wf*0.17).toFixed(1), afterHalfSecond:[s.px,s.py,s.pz].map(v=>+v.toFixed(1)), distFromAxis:+Math.hypot(s.px-T.mid[0], s.pz-T.mid[2]).toFixed(1)}; })()""")
        print('9. started inside a titan:', push)
        print('errors', errs[:3]); await b.close()
asyncio.run(main())
