import os, asyncio
from playwright.async_api import async_playwright
GAME = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'signal-run.html'))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':640,'height':360}); errs=[]
        pg.on('pageerror', lambda e: errs.append('ERR '+str(e)+' '+str(e.stack)[:900])); pg.on('console', lambda m: errs.append(m.type+' '+m.text[:600]) if m.type in ('error','warning') else None)
        await pg.goto('file://' + GAME + '?play=freenew&at=pool'); 
        try: await pg.wait_for_function('window.__loadMs', timeout=240000)
        except Exception as e: print('no load', e)
        await pg.wait_for_timeout(5000)
        print('\n'.join(errs[:10])); print('loaded', await pg.evaluate('window.__loadMs||0'))
        print(await pg.evaluate("(()=>{const G=__bench.GEOR; return {titans:G.titans.length, kinds:G.titans.map(t=>t.kind[0]+Math.round(t.L)).join(' '), inst:G.count, hits:G.hits, kits:G.kits.map(k=>k.name), ranges:G.ranges.length, motes:G.nMotes, ms:G.ms, tier:__bench.GEOQ.tier, stakes:__bench.STAKES.filter(k=>k.route==='GEO').length, parts:__bench.PARTS.map(p=>p.door+':'+(p.at?p.at.map(v=>Math.round(v)).join(','):'none'))}})()"))
        await b.close()
asyncio.run(main())
