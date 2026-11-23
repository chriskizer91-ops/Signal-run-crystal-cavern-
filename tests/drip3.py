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
        await pg.goto('file://' + GAME + '?play=freenew&at=d8'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        r = await pg.evaluate(SIM+"(330,{KeyW:true})"); print('walked 11 s east through D-8:', r[:4])
        for i in range(40):
            r = await pg.evaluate(SIM+"(20,{})")
            if r[3]: break
        print('landed at', r[:4], 'inside the stalactite cavern:', await pg.evaluate("__bench.CV.dripK(__bench.state.px,__bench.state.py+1,__bench.state.pz) < 1"), 'errors', errs[:2]); await b.close()
asyncio.run(main())
