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
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append(m.text[:300]))
        await pg.goto('file://' + GAME + '?play=new&at=crystal'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        await pg.evaluate("document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true")
        print('cavern init', await pg.evaluate('({ms:__bench.CAVR.ms, hits:__bench.CAVR.hits, inst:__bench.CAVR.count||0, kits:__bench.CAVR.kits.length, props:__bench.CAVR.props.length, spores:__bench.CAVR.nSpores})'))
        print('start', await pg.evaluate(SIM+'(3,{})'))
        await pg.wait_for_timeout(15000); await pg.screenshot(path='cv1_pit.png')
        print('step in', await pg.evaluate(SIM+'(25,{KeyW:true},(s,B)=>{const d=B.CV.CAV.drop;return Math.atan2(-(d[0]-s.px),-(d[1]-s.pz));})'))
        print('fall', await pg.evaluate(SIM+'(420,{})'))
        await pg.evaluate('(()=>{const s=__bench.state;s.pitch=0.05;s.yaw=0.07;s.dist=12;})()')
        await pg.wait_for_timeout(5000); await pg.screenshot(path='cv2_falling.png')
        print('land', await pg.evaluate(SIM+'(300,{})'))
        await pg.evaluate('(()=>{const s=__bench.state;s.pitch=0.15;s.yaw=0.07;s.dist=12;})()')
        for k in range(4):
            await pg.wait_for_timeout(15000)
            print(' chunks', await pg.evaluate('[__bench.cave.ch.filter(c=>c.m[1]).length, __bench.cave.ch.length, __bench.stats.cave, __bench.stats.submitted]'))
        await pg.screenshot(path='cv3_landed.png')
        print('hud', await pg.evaluate('document.getElementById("ustat").textContent'), 'visor', await pg.evaluate('document.getElementById("visor").style.opacity'))
        print('errors', errs[:6])
        await b.close()
asyncio.run(main())
