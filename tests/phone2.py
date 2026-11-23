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
        ctx = await b.new_context(viewport={'width':915,'height':412}, is_mobile=True, has_touch=True, device_scale_factor=1)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=new&at=cave'); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.wait_for_timeout(1000)
        await pg.evaluate("document.getElementById('soft').hidden=true")
        print('reel', await pg.evaluate(SIM+'(30,{KeyW:true},(s,B)=>{const a=[B.CV.SX+3.5,B.CV.SZ+2.5];return Math.atan2(-(a[0]-s.px),-(a[1]-s.pz));})'))
        print(await pg.evaluate(SIM+'(60,{KeyW:true},(s,B)=>-Math.PI/2+0.1)'))
        await pg.evaluate('(()=>{const s=__bench.state; s.pitch=0.2; s.yaw=Math.PI/2+0.15;})()')
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':120,'y':330,'id':1}]})
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':120,'y':300,'id':1}]})
        await pg.wait_for_timeout(14000); await pg.screenshot(path='p1_phone_cave.png')
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        # save + reload keeps the line, reel and battery
        saved = await pg.evaluate('(()=>{__bench.game&&0; return JSON.parse(localStorage.getItem("canyon-signal-run-v1")).cave})()')
        print('saved cave keys', list(saved.keys()), 'pts', len(saved['pts']), 'left', saved['left'])
        print('errors', errs)
        await b.close()
asyncio.run(main())
