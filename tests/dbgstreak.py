import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
import sys
DBG=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':640,'height':360})
        await pg.goto('file://' + GAME + '?play=new&at=cavern&cavedbg='+DBG); await pg.wait_for_function('window.__loadMs', timeout=300000)
        await pg.evaluate("document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true; document.getElementById('toast').style.display='none'; document.getElementById('visor').style.display='none'")
        await pg.evaluate(SIM+'(2,{})'); await pg.evaluate('__bench.cavePrebuild(120)')
        await pg.evaluate('(()=>{const B=__bench,s=B.state,C=B.CV.CAV;s.px=C.drop[0]-26;s.pz=C.drop[1]-14;s.py=B.CV.floorAt(s.px,-255,s.pz);s.yaw=2.4;s.pitch=0.12;s.dist=7;})()'); await pg.evaluate(SIM+'(1,{})')
        for name, off in [('dbg'+DBG,'{}')]:
            await pg.evaluate('__bench.CAVR.off={}' if off=='FLASH' else f'__bench.CAVR.off={off}')
            if off=='FLASH': await pg.evaluate('(__bench.cave.batt=0, __bench.cave.dead=true)')
            await pg.wait_for_timeout(14000); await pg.screenshot(path=f'st_{name}.png')
        await b.close()
asyncio.run(main())
