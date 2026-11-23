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
        ctx = await b.new_context(viewport={'width':915,'height':412}, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + ''); await pg.wait_for_function('window.__loadMs', timeout=300000)
        await pg.wait_for_timeout(8000); await pg.screenshot(path='v8_menu_phone.png')
        print('menu buttons', await pg.evaluate("[...document.querySelectorAll('#menu button')].filter(b=>!b.hidden).map(b=>b.textContent)"))
        # campaign with some progress, then switch to free play and back
        await pg.evaluate("document.getElementById('mNew').click()")
        await pg.evaluate("(()=>{const G=__bench.game; G.online=3; __bench.saveGameTest && 0})()")
        await pg.evaluate("(()=>{const G=__bench.game; localStorage.setItem('canyon-signal-run-v1', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('canyon-signal-run-v1')), {online:3})));})()")
        await pg.evaluate("(()=>{__bench.game.paused=false; document.getElementById('gMenu').click();})()")
        print('in-campaign menu', await pg.evaluate("[...document.querySelectorAll('#menu button')].filter(b=>!b.hidden).map(b=>b.textContent)"))
        await pg.evaluate("document.getElementById('mFree').click()")
        print('free play: online', await pg.evaluate('__bench.game.online'), 'tank', await pg.evaluate('__bench.game.tank'), 'free', await pg.evaluate('__bench.game.free'))
        await pg.evaluate("document.getElementById('gMenu').click()")
        print('in-free menu', await pg.evaluate("[...document.querySelectorAll('#menu button')].filter(b=>!b.hidden).map(b=>b.textContent)"))
        await pg.evaluate("document.getElementById('mPlay').click()")
        print('back to campaign: online', await pg.evaluate('__bench.game.online'), 'tank', await pg.evaluate('__bench.game.tank'), 'free', await pg.evaluate('__bench.game.free'))
        print('saves', await pg.evaluate("Object.keys(localStorage)"))
        # campaign unlock: all 7 dishes, then walk to the door
        await pg.evaluate("(()=>{const B=__bench; B.game.online=7; B.caveTeleport('door');})()")
        r = await pg.evaluate(SIM+"(140,{KeyW:true})"); print('campaign with 7 dishes, walking at the door:', r[:3], 'open', await pg.evaluate('__bench.DOOR.open'), 'toast', await pg.evaluate("document.getElementById('toast').textContent"))
        print('errors', errs[:3]); await b.close()
asyncio.run(main())
