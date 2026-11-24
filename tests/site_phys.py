# The ancient site's physical checks: walk up the dais steps, bump into a pillar, fly back up the shaft to the giant cavern.
import asyncio, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.abspath(os.path.join(HERE, '..', 'game', 'signal-run.html'))
RUN = r"""(()=>{ window.__run=(sec,keys,yaw,stop)=>{ const B=__bench,s=B.state; for(const k in keys) B.keys[k]=keys[k]; let t=0; while(t<sec){ if(yaw!==undefined) s.yaw=yaw; B.update(0.033); t+=0.033; if(stop&&stop(B)) break; } for(const k in keys) B.keys[k]=false; return +t.toFixed(2); }; return 1; })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for mode in ['freenew', 'new']:
            pg = await b.new_page(viewport={'width':320,'height':180}); await pg.goto('file://' + GAME + '?play=' + mode + '&at=chamber'); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.evaluate(RUN)
            if mode == 'freenew':
                dais = await pg.evaluate("(()=>{const B=__bench,s=B.state,C=B.SITER.emit; s.px=C[0]-8; s.pz=C[2]; s.py=B.CV.SITE.floor; s.grounded=true; s.vx=s.vy=s.vz=0; const h=[]; for(let i=0;i<6;i++){ __run(0.5,{KeyW:true},-Math.PI/2); h.push(+(s.py-B.CV.SITE.floor).toFixed(2)); } return {heightsWhileWalkingIn:h, endDistFromMiddle:+Math.hypot(s.px-C[0],s.pz-C[2]).toFixed(1)}; })()")
                print('dais: walking in from 8 m out, height above the floor every 0.5 s:', dais)
                pil = await pg.evaluate("(()=>{const B=__bench,s=B.state,S=B.SITER.sockets[0]; const dx=S.p[0]-B.SITER.emit[0], dz=S.p[2]-B.SITER.emit[2], l=Math.hypot(dx,dz); s.px=S.p[0]+dx/l*3; s.pz=S.p[2]+dz/l*3; s.py=B.CV.SITE.floor; s.grounded=true; s.vx=s.vy=s.vz=0; const yaw=Math.atan2(dx,dz); __run(3,{KeyW:true},yaw); return {closestToPillarCentre:+Math.hypot(s.px-S.p[0],s.pz-S.p[2]).toFixed(2), height:+(s.py-B.CV.SITE.floor).toFixed(2)}; })()")
                print('pillar: walking straight at a socket pillar for 3 s:', pil)
            up = await pg.evaluate("(()=>{const B=__bench,s=B.state,V=B.CV.SITE.vest, top=B.CV.SITE.bore[1][1]; s.px=V[0]; s.pz=V[1]; s.py=B.CV.SITE.floor; s.grounded=true; s.vx=s.vy=s.vz=0; const f0=B.game.fuel!==undefined?B.game.fuel:null; const t=__run(40,{Space:true},undefined,B=>B.state.py>top-1); const f1=B.game.fuel; const t2=__run(8,{KeyW:true},Math.PI/2,B=>B.state.px<B.CV.SITE.bore[0][0]); return {climbed:+(s.py-B.CV.SITE.floor).toFixed(1), seconds:t, fuelBefore:f0, fuelAfter:f1!==undefined?+(+f1).toFixed(0):null, thenWalkedOutIn:t2, outAt:[s.px,s.py,s.pz].map(v=>+v.toFixed(1))}; })()")
            print(mode, '| flying back up the 71 m shaft from the round room:', up)
            await pg.close()
        await b.close()
asyncio.run(main())
