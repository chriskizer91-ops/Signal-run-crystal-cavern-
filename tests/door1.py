import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio, sys, json
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
HIDE = "document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true;"
async def run(b, mode, shots):
    pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + GAME + f'?play={mode}&at=door'); await pg.wait_for_function('window.__loadMs', timeout=300000)
    await pg.evaluate(HIDE)
    info = await pg.evaluate("(()=>{const B=__bench,s=B.state; return {free:B.game.free, pos:[s.px,s.py,s.pz].map(v=>+v.toFixed(2)), door:[B.DOOR.x,B.DOOR.y,B.DOOR.z], tank:B.game.tank, spares:B.cave.spares}})()")
    print(mode, 'start', info)
    await pg.evaluate(SIM+'(3,{})'); await pg.wait_for_timeout(16000); await pg.screenshot(path=f'd_{mode}_0.png')
    # walk straight at the door (+z) for 5 s
    r = await pg.evaluate(SIM+"(150,{KeyW:true})"); print(mode, 'after walking 5 s', r, 'open', await pg.evaluate('__bench.DOOR.open'), 'toast:', await pg.evaluate("document.getElementById('toast').textContent"))
    if mode.startswith('free'):
        await pg.wait_for_timeout(15000); await pg.screenshot(path=f'd_{mode}_1.png')
        r = await pg.evaluate(SIM+"(120,{KeyW:true})"); print(mode, 'walk on', r)
        for i in range(12):
            r = await pg.evaluate(SIM+"(60,{})")
            if r[3]: break
        print(mode, 'landed', r)
        await pg.evaluate('__bench.cavePrebuild(330)'); await pg.evaluate(SIM+'(2,{})'); await pg.wait_for_timeout(25000); await pg.screenshot(path=f'd_{mode}_2.png')
        print('stats', await pg.evaluate('(()=>{const s=__bench.stats; return {cave:s.cave, submitted:s.submitted, calls:s.calls}})()'), 'toast:', await pg.evaluate("document.getElementById('toast').textContent"))
    print(mode, 'errors', errs[:3]); await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        for m in sys.argv[1:]: await run(b, m, True)
        await b.close()
asyncio.run(main())
