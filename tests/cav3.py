import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio, sys
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
VIEWS = {
 'vista': '(()=>{const B=__bench,s=B.state,C=B.CV.CAV;s.px=C.drop[0];s.pz=C.drop[1]-1;s.py=B.CV.floorAt(s.px,C.y-12,s.pz);s.yaw=0.05;s.pitch=0.32;s.dist=14;})()',
 'camp':  '(()=>{const B=__bench,s=B.state,C=B.CV.CAV;s.px=C.drop[0]+3;s.pz=C.drop[1]+3;s.py=B.CV.floorAt(s.px,C.y-12,s.pz);s.yaw=Math.PI/2-0.35;s.pitch=0.3;s.dist=11;})()',
 'close': '(()=>{const B=__bench,s=B.state,C=B.CV.CAV;s.px=C.drop[0]-26;s.pz=C.drop[1]-14;s.py=B.CV.floorAt(s.px,-255,s.pz);s.yaw=2.4;s.pitch=0.12;s.dist=7;})()',
 'drop':  '(()=>{const B=__bench,s=B.state,C=B.CV.CAV;s.px=C.drop[0];s.pz=C.drop[1];s.py=B.CV.CAV.y+18;s.grounded=false;s.yaw=0.25;s.pitch=0.95;s.dist=10;})()',
}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append(m.text[:300]))
        await pg.goto('file://' + GAME + '?play=new&at=cavern'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        await pg.evaluate("document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true; document.getElementById('toast').style.display='none'")
        await pg.evaluate(SIM+'(2,{})')
        print('prebuilt', await pg.evaluate('__bench.cavePrebuild(330)'))
        for name in sys.argv[1:]:
            await pg.evaluate(VIEWS[name]); await pg.evaluate(SIM+'(1,{})')
            await pg.wait_for_timeout(25000); await pg.screenshot(path=f'cv_{name}.png')
            print(name, await pg.evaluate('({cave:__bench.stats.cave, submitted:__bench.stats.submitted, calls:__bench.stats.calls})'))
        print('errors', errs[:6]); await b.close()
asyncio.run(main())
