import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':640,'height':360}); errs=[]
        pg.on('pageerror', lambda e: errs.append('ERR '+str(e)+' '+str(e.stack)[:600])); pg.on('console', lambda m: errs.append(m.type+' '+m.text[:300]) if m.type in ('error','warning') else None)
        await pg.goto('file://' + GAME + '?play=freenew&at=lake'); await pg.wait_for_timeout(40000)
        print('\n'.join(errs[:10])); print('loaded', await pg.evaluate('window.__loadMs||0'))
        await b.close()
asyncio.run(main())
