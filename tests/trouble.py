import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
FOLLOW = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour2.py')).read().split("FOLLOW = '''")[1].split("'''")[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=new&at=cave'); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.wait_for_timeout(1000)
        await pg.evaluate("document.getElementById('soft').hidden=true")
        print('reel', await pg.evaluate(SIM+'(30,{KeyW:true},(s,B)=>{const a=[B.CV.SX+3.5,B.CV.SZ+2.5];return Math.atan2(-(a[0]-s.px),-(a[1]-s.pz));})'))
        f0 = FOLLOW.replace('PATH','B.CV.minePaths[0]')
        print('walk 40m', await pg.evaluate(SIM+'(190,{KeyW:true},'+f0+')'))
        # jetpack into the drift ceiling
        print('jet', await pg.evaluate(SIM+'(60,{Space:true})'), await pg.evaluate('[__bench.cave.ceil.toFixed(2)]'))
        print('settle', await pg.evaluate(SIM+'(120,{})'))
        # kill the light (no spares) and look back along the line
        await pg.evaluate('(()=>{const B=__bench;B.cave.batt=0.01;B.cave.spares=0;B.state.yaw+=Math.PI;B.state.pitch=0.2;})()')
        print('dies', await pg.evaluate(SIM+'(5,{})'), await pg.evaluate('[__bench.cave.dead, document.getElementById("toast").textContent]'))
        await pg.wait_for_timeout(12000); await pg.screenshot(path='d1_dark_line.png')
        # empty the reel and wander off without line: should pass out after 200 m and wake at the top
        await pg.evaluate('(()=>{const B=__bench;B.line.left=0;B.line.active=false;B.state.yaw-=Math.PI;B.state._r=null;})()')
        f1 = FOLLOW.replace('PATH','B.CV.minePaths[0].concat([[B.CV.SX+207,-66,B.CV.SZ+52],[B.CV.SX+255,-64,B.CV.SZ+65],[B.CV.SX+310,-66,B.CV.SZ+70],[B.CV.SX+345,-67,B.CV.SZ+95]])')
        print('wander', await pg.evaluate(SIM+'(1000,{KeyW:true},'+f1+')'), await pg.evaluate('[__bench.cave.darkWalk.toFixed(0), __bench.cave.passing]'))
        await pg.wait_for_timeout(1000); await pg.screenshot(path='d2_fade.png')
        await pg.wait_for_timeout(4000)
        print('after', await pg.evaluate(SIM+'(3,{})'), await pg.evaluate('[document.getElementById("toast").textContent, __bench.cave.batt]'))
        await pg.evaluate('__bench.state.pitch=0.3'); await pg.wait_for_timeout(9000); await pg.screenshot(path='d3_wake.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
