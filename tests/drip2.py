import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':640,'height':360}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        toast = "document.getElementById('toast').textContent"
        # free play: D-8 opens, walk the drift, drop into the stalactite cavern
        await pg.goto('file://' + GAME + '?play=freenew&at=d8'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        r = await pg.evaluate(SIM+"(200,{KeyW:true})"); print('free: walk 6.6 s east through D-8', r[:4], 'open', await pg.evaluate("__bench.DOORS[1].open"))
        for i in range(30):
            r = await pg.evaluate(SIM+"(20,{})")
            if r[3]: break
        print('free: landed', r[:4], 'in stalactite cavern:', await pg.evaluate("__bench.CV.dripK(__bench.state.px,__bench.state.py+1,__bench.state.pz).toFixed(2)"), '| toast:', await pg.evaluate(toast))
        # campaign: dishes done, D-7 open; D-8 needs its coupling
        await pg.goto('file://' + GAME + '?play=new&at=d8'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        await pg.evaluate("__bench.game.online=7")
        r = await pg.evaluate(SIM+"(120,{KeyW:true})"); print('campaign: walk at D-8 without coupling', r[:3], 'open', await pg.evaluate("__bench.DOORS[1].open"), '| toast:', await pg.evaluate(toast))
        await pg.evaluate("(()=>{const B=__bench,s=B.state,P=B.PARTS[0].at; s.px=P[0]+1.5; s.pz=P[2]; s.py=P[1]+0.3; s.vx=s.vy=s.vz=0;})()")
        r = await pg.evaluate(SIM+"(40,{KeyA:true})"); print('campaign: walk over the coupling', r[:3], 'parts', await pg.evaluate("__bench.cave.parts"), '| toast:', await pg.evaluate(toast))
        await pg.evaluate("__bench.caveTeleport('d8')")
        r = await pg.evaluate(SIM+"(140,{KeyW:true})"); print('campaign: back at D-8 with coupling', r[:3], 'open', await pg.evaluate("__bench.DOORS[1].open"), '| toast:', await pg.evaluate(toast))
        await pg.evaluate("__bench.caveTeleport('d9')")
        r = await pg.evaluate(SIM+"(100,{KeyW:true})"); print('D-9 (next build)', r[:3], 'open', await pg.evaluate("__bench.DOORS[2].open"), '| toast:', await pg.evaluate(toast))
        print('save', await pg.evaluate("JSON.parse(localStorage.getItem('canyon-signal-run-v1')).cave.doors+' parts '+JSON.parse(localStorage.getItem('canyon-signal-run-v1')).cave.parts"))
        print('errors', errs[:3]); await b.close()
asyncio.run(main())
