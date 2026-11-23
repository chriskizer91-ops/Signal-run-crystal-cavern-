import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
async def grab(b, url, name):
    pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(url); await pg.wait_for_function('window.__loadMs', timeout=300000)
    await pg.evaluate("document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true")
    await pg.evaluate('(()=>{const s=__bench.state; s.time=100;})()')
    await pg.wait_for_timeout(15000); await pg.screenshot(path=name)
    st = await pg.evaluate('(()=>{const s=__bench.stats; return {submitted:s.submitted, cave:s.cave||0, calls:s.calls}})()')
    await pg.close(); return st, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        print('before', await grab(b, 'file://' + os.path.join(GAMEDIR, 'versions/signal-run-v3-mobile.html') + '?play=new', 's_before.png'))
        print('after ', await grab(b, 'file://' + GAME + '?play=new', 's_after.png'))
        # underground triangle budget, deep in the hall
        pg = await b.new_page(viewport={'width':960,'height':540})
        await pg.goto('file://' + GAME + '?play=new&at=cave'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        await pg.evaluate('(()=>{const B=__bench,s=B.state,C=B.CV;s.px=C.SX+207;s.pz=C.SZ+52;s.py=C.floorAt(s.px,-66,s.pz);s.grounded=true;})()')
        await pg.evaluate(SIM+'(5,{})'); await pg.wait_for_timeout(20000)
        print('underground', await pg.evaluate('(()=>{const s=__bench.stats,c=__bench.cave; return {submitted:s.submitted, cave:s.cave, calls:s.calls, closeUp:c.ch.filter(q=>q.m[0]&&q.m[0].count).length, rough:c.ch.filter(q=>q.m[1]).length, all:c.ch.length, roughTris:c.ch.reduce((a,q)=>a+(q.m[1]?q.m[1].tris:0),0)}})()'))
        await b.close()
asyncio.run(main())
