# usage (from the assets folder): python3 shot.py modules/<module>.js <item> <out.png> [detail 1|0] [mode 0 prop | 1 crystal | 2 glow]
import asyncio, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
from playwright.async_api import async_playwright
async def main():
    f, item, out = sys.argv[1], sys.argv[2], sys.argv[3]; det = sys.argv[4] if len(sys.argv) > 4 else '1'; mode = sys.argv[5] if len(sys.argv) > 5 else '0'
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--allow-file-access-from-files'])
        pg = await b.new_page(viewport={'width':1280,'height':960})
        await pg.goto(f'file://{HERE}/preview.html?f={f}&item={item}&detail={det}&mode={mode}')
        await pg.wait_for_function('window.__done', timeout=120000)
        err = await pg.evaluate('window.__err||null')
        if err: print('ERROR', err)
        else: print('ok', await pg.evaluate('JSON.stringify(window.__info)'))
        await pg.screenshot(path=out); await b.close()
asyncio.run(main())
