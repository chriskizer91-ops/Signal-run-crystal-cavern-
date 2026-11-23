import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio, sys
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
HIDE = "document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true; document.getElementById('toast').style.visibility='hidden';"
async def page(b, q):
    pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + GAME + '?' + q); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.evaluate(HIDE); return pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        # A: campaign, locked door, from the middle of the room
        pg, errs = await page(b, 'play=new&at=door')
        await pg.evaluate('(()=>{const B=__bench,s=B.state,D=B.DOOR;s.px=D.x-0.8;s.pz=D.z-6.5;s.py=B.CV.floorAt(s.px,-55,s.pz);s.yaw=Math.PI+0.12;s.heading=0;s.pitch=0.2;s.dist=7.5;})()')
        await pg.evaluate(SIM+'(3,{})'); await pg.evaluate('__bench.game.paused=true'); await pg.wait_for_timeout(16000); await pg.screenshot(path='v8_a_locked.png')
        print('A', await pg.evaluate('(()=>{const s=__bench.stats; return {cave:s.cave, submitted:s.submitted, calls:s.calls}})()'), errs[:2]); await pg.close()
        # B, C, D: free play
        pg, errs = await page(b, 'play=freenew&at=door')
        r = await pg.evaluate(SIM+'(130,{KeyW:true})'); print('walked to door', r, 'open', await pg.evaluate('__bench.DOOR.open'))
        await pg.evaluate('(()=>{const B=__bench,s=B.state,D=B.DOOR;D.open=1;D.moving=false;s.px=D.x+0.4;s.pz=D.z-3.2;s.py=B.CV.floorAt(s.px,-55,s.pz);s.vx=s.vy=s.vz=0;s.grounded=true;s.yaw=Math.PI;s.heading=0;s.pitch=0.28;s.dist=6.5;})()')
        await pg.evaluate(SIM+'(3,{})'); await pg.evaluate('__bench.game.paused=true'); await pg.wait_for_timeout(16000); await pg.screenshot(path='v8_b_open.png')
        # walk through, off the lip, release the keys and fall
        await pg.evaluate('__bench.game.paused=false')
        r = await pg.evaluate(SIM+'(75,{KeyW:true})'); print('through the door', r)
        top = None
        for i in range(40):
            r = await pg.evaluate(SIM+'(15,{})')
            if top is None and r[1] < -110: top = r; await pg.evaluate('(()=>{const s=__bench.state; s.pitch=1.25; s.dist=5;})()'); await pg.evaluate('__bench.cavePrebuild(330)'); await pg.evaluate('__bench.game.paused=true'); await pg.wait_for_timeout(22000); await pg.screenshot(path='v8_c_falling.png'); await pg.evaluate('__bench.game.paused=false'); print('falling shot at', r)
            if r[3]: break
        print('landed', r)
        await pg.evaluate('(()=>{const s=__bench.state; s.yaw=0.07; s.pitch=0.22; s.dist=9;})()'); await pg.evaluate(SIM+'(2,{})'); await pg.evaluate('__bench.game.paused=true'); await pg.wait_for_timeout(22000); await pg.screenshot(path='v8_d_landed.png')
        print('D', await pg.evaluate('(()=>{const s=__bench.stats; return {cave:s.cave, submitted:s.submitted, calls:s.calls}})()'), errs[:2]); await pg.close()
        await b.close()
asyncio.run(main())
