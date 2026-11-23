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
        await pg.goto('file://' + GAME + '?play=new&at=cavern'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        await pg.evaluate("document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true")
        print('cavern init', await pg.evaluate('({ms:__bench.CAVR.ms, hits:__bench.CAVR.hits, instances:__bench.CAVR.count||0, kits:__bench.CAVR.kits.map(k=>k.name).join(","), camp:__bench.CAVR.props.length, spores:__bench.CAVR.nSpores})'))
        print('start', await pg.evaluate(SIM+'(3,{})'))
        await pg.evaluate('(()=>{const s=__bench.state;s.pitch=0.18;s.yaw=0.07;s.dist=10;})()')
        for k in range(14):
            await pg.wait_for_timeout(20000)
            n = await pg.evaluate('__bench.cave.ch.filter(c=>c.m[1]).length')
            if k%3==0: print(' rough pieces built', n, '/', await pg.evaluate('__bench.cave.ch.length'))
        await pg.screenshot(path='cv4_vista.png')
        print('vista', await pg.evaluate('({cave:__bench.stats.cave, submitted:__bench.stats.submitted, calls:__bench.stats.calls})'))
        # the camp: stand east of it, look west along the ledge
        await pg.evaluate('(()=>{const B=__bench,s=B.state,C=B.CV.CAV;s.px=C.drop[0]+3;s.pz=C.drop[1]+3;s.py=B.CV.floorAt(s.px,-262,s.pz);s.yaw=Math.PI/2-0.35;s.pitch=0.3;s.dist=11;})()')
        await pg.evaluate(SIM+'(2,{})'); await pg.wait_for_timeout(30000); await pg.screenshot(path='cv5_camp.png')
        # crystals close up: find a big floor cluster near the landing
        await pg.evaluate('(()=>{const B=__bench,s=B.state,C=B.CV.CAV;s.px=C.drop[0]-26;s.pz=C.drop[1]-14;s.py=B.CV.floorAt(s.px,-255,s.pz);s.yaw=2.4;s.pitch=0.12;s.dist=7;})()')
        await pg.evaluate(SIM+'(2,{})'); await pg.wait_for_timeout(30000); await pg.screenshot(path='cv6_close.png')
        print('close', await pg.evaluate('({p:[__bench.state.px,__bench.state.py,__bench.state.pz].map(v=>+v.toFixed(1)),cave:__bench.stats.cave, submitted:__bench.stats.submitted})'))
        print('errors', errs[:6])
        await b.close()
asyncio.run(main())
