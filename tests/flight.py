# Same moves in the old and new game: climb, let go, fly forward, let go, dive, let go. Prints simple numbers.
import asyncio, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); GAMEDIR = os.path.abspath(os.path.join(HERE, '..', 'game'))
FILES = {'v9 (old)': os.path.join(GAMEDIR, 'versions', 'signal-run-v9-stalactite-cavern.html'), 'v10 (new)': os.path.join(GAMEDIR, 'signal-run.html')}
STEP = """((n, keys) => { const B=__bench, s=B.state; for (const k in keys) B.keys[k]=keys[k]; let mxH=0, mxV=0, mnV=0;
  for (let i=0;i<n;i++){ B.update(0.033); const h=Math.hypot(s.vx,s.vz); mxH=Math.max(mxH,h); mxV=Math.max(mxV,s.vy); mnV=Math.min(mnV,s.vy); }
  for (const k in keys) B.keys[k]=false; return {x:s.px, y:s.py, z:s.pz, h:Math.hypot(s.vx,s.vz), vy:s.vy, mxH, mxV, mnV, fuel:B.game.fuel}; })"""
async def run(b, label, f, where):
    pg = await b.new_page(viewport={'width':320,'height':180}); await pg.goto('file://' + f + '?play=freenew' + where); await pg.wait_for_function('window.__loadMs', timeout=300000)
    st = lambda n, k: pg.evaluate(STEP + '(%d,%s)' % (n, k))
    a = await st(18, "{Space:true}"); b1 = await st(90, "{}")
    c = await st(70, "{KeyW:true}"); d = await st(60, "{}")
    slide = ((d['x'] - c['x']) ** 2 + (d['z'] - c['z']) ** 2) ** 0.5
    await st(60, "{Space:true}"); await st(30, "{}"); e = await st(15, "{KeyC:true}"); g = await st(45, "{}")
    gr = await pg.evaluate('__bench.state.grounded')
    print(f"{label:10} climb top speed {a['mxV']:5.1f} m/s | 3 s after letting go of JET: vertical {b1['vy']:6.1f} m/s, height change {b1['y']-a['y']:6.1f} m | forward top speed {c['mxH']:5.1f} m/s | slid {slide:5.1f} m after letting go | dive {e['mnV']:6.1f} m/s | 1.5 s after letting go of DIVE: {g['vy']:5.1f} m/s{' (landed)' if gr else ' (still in the air)'}")
    await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        for where, title in [('&at=cavern', 'IN THE CRYSTAL CAVERN'), ('', 'ON THE SURFACE (start, lookout)')]:
            print(title)
            for label, f in FILES.items(): await run(b, label, f, where)
        await b.close()
asyncio.run(main())
