import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio, sys
from playwright.async_api import async_playwright
SIM = '''((n, keys, look) => { const B=__bench, s=B.state, out=[]; for (const k in keys) B.keys[k]=keys[k];
  for (let i=0;i<n;i++){ if(look) s.yaw=look(s,B); B.update(0.033); }
  for (const k in keys) B.keys[k]=false; const c=B.cave,l=B.line; return [+s.px.toFixed(1),+s.py.toFixed(1),+s.pz.toFixed(1),s.grounded,c.under,'batt',+c.batt.toFixed(1),'line',l.reel?+l.left.toFixed(0):null,l.pts.length,'close',c.ch.filter(q=>q.m[0]).length]; })'''
async def shot(pg, name, wait=9000):
    await pg.wait_for_timeout(wait); await pg.screenshot(path=name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=new&at=mine'); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.wait_for_timeout(1500)
        await pg.evaluate('__bench.toast=null')
        await shot(pg, 't1_top.png', 6000)
        await pg.evaluate('(()=>{const s=__bench.state,C=__bench.CV;const dx=C.SX-s.px,dz=C.SZ-s.pz;s.yaw=Math.atan2(-dx,-dz);s.pitch=1.0;})()')
        print('step in', await pg.evaluate(SIM+'(14,{KeyW:true})'))
        print('drift', await pg.evaluate(SIM+'(60,{})'))
        await pg.evaluate('__bench.state.pitch=-0.3')
        await shot(pg, 't2_shaft_up.png')
        print('fall', await pg.evaluate(SIM+'(560,{})'))
        await pg.evaluate('(()=>{const s=__bench.state; s.pitch=0.25; s.yaw=-Math.PI/2;})()')
        await shot(pg, 't3_bottom.png', 14000)
        # walk to the reel (3.5, 2.5 from shaft centre)
        print('to reel', await pg.evaluate(SIM+'(40,{KeyW:true},(s,B)=>{const a=[B.CV.SX+3.5,B.CV.SZ+2.5];return Math.atan2(-(a[0]-s.px),-(a[1]-s.pz));})'))
        print('after reel', await pg.evaluate(SIM+'(10,{})'))
        # walk east down the main drift for ~70 m, following the path points
        print('drift east', await pg.evaluate(SIM+'(330,{KeyW:true},(s,B)=>{const P=B.CV.minePaths[0];let best=null;for(let i=0;i<P.length;i++){if(P[i][0]>s.px+6){best=P[i];break;}}best=best||P[P.length-1];return Math.atan2(-(best[0]-s.px),-(best[2]-s.pz));})'))
        await pg.evaluate('(()=>{const s=__bench.state; s.pitch=0.2;})()')
        await shot(pg, 't4_drift.png', 16000)
        print('errors', errs)
        await b.close()
asyncio.run(main())
