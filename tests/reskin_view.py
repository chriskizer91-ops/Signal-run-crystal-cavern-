import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
SPOTS = [  # name, player x,z, camera yaw (camera sits on that side), pitch, dist
  ('camp',    2228, 1632, 3.6, 0.35, 11),
  ('campus',  1112, 1146, 2.4, 0.30, 26),
  ('marina',  1010, 1452, 0.7, 0.35, 40),
  ('flyers',  1800, 1330, 3.14, -0.05, 6),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append(m.text))
        await pg.goto('file://' + GAME + '?play=new'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        await pg.evaluate("document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true")
        print('placed', await pg.evaluate('__bench.placedLog.length'), 'plants', await pg.evaluate('__bench.plantTotal'))
        for name,x,z,yaw,pit,dist in SPOTS:
            await pg.evaluate(f'(()=>{{const s=__bench.state;s.px={x};s.pz={z};s.py=__bench.T.height({x},{z})+(\"{name}\"==="flyers"?330:0);s.yaw={yaw};s.pitch={pit};s.dist={dist};s.grounded=\"{name}\"!=="flyers";}})()')
            await pg.evaluate(SIM+'(2,{})')
            await pg.wait_for_timeout(22000); await pg.screenshot(path=f'r_{name}.png')
            print(name, await pg.evaluate('({tris:__bench.stats.submitted})'))
        print('errors', errs)
        await b.close()
asyncio.run(main())
