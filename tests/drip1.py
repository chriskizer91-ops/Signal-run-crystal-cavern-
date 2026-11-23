import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio, sys
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
HIDE = "document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true; document.getElementById('toast').style.visibility='hidden'; document.getElementById('visor').style.display='none';"
VIEWS = {
 'd8':   "caveTeleport('d8'); (()=>{const s=__bench.state; s.pitch=0.22; s.dist=11; s.yaw+=0.35;})()",
 'land': "caveTeleport('drip'); (()=>{const s=__bench.state; s.pitch=0.18; s.dist=10;})()",
 'hall': "caveTeleport('drip'); (()=>{const B=__bench,s=B.state,C=B.CV.DRIP; s.px=C.x-25; s.pz=C.z+8; s.py=B.CV.floorAt(s.px,C.y,s.pz); s.yaw=-Math.PI/2-0.2; s.pitch=0.1; s.dist=8;})()",
 'over': "caveTeleport('drip'); (()=>{const s=__bench.state; s.pitch=0.42; s.dist=16; s.yaw=-Math.PI/2+0.15;})()",
 'up':   "caveTeleport('drip'); (()=>{const B=__bench,s=B.state,C=B.CV.DRIP; s.px=C.x+10; s.pz=C.z-5; s.py=B.CV.floorAt(s.px,C.y,s.pz); s.yaw=Math.PI/2; s.pitch=-0.3; s.dist=7;})()",
 'd9':   "caveTeleport('d9'); (()=>{const s=__bench.state; s.pitch=0.2; s.dist=12; s.yaw-=0.4;})()",
}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=' + (sys.argv[1] if len(sys.argv) > 1 else 'freenew')); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.evaluate(HIDE)
        print('drip', await pg.evaluate("(()=>{const D=__bench.DRIPR; return {count:D.count, hits:D.hits, worms:D.nWorms, water:D.water&&D.water.quads, ms:D.ms, kits:D.kits.map(k=>k.name)}})()"))
        print('floods', await pg.evaluate("__bench.FLOODS.map(f=>[f.door.name, +f.x.toFixed(1), +f.y.toFixed(1), +f.z.toFixed(1)])"), 'parts', await pg.evaluate("__bench.PARTS.map(p=>[p.door, p.at.map(v=>+v.toFixed(1)), !!p.pack])"))
        for name in (sys.argv[2:] or VIEWS.keys()):
            await pg.evaluate('__bench.game.paused=false'); await pg.evaluate('(()=>{const B=__bench; const caveTeleport=B.caveTeleport; ' + VIEWS[name] + '})()')
            await pg.evaluate(SIM+'(2,{})'); await pg.evaluate('__bench.cavePrebuild(330)'); await pg.evaluate(SIM+'(2,{})'); await pg.evaluate('__bench.game.paused=true')
            await pg.wait_for_timeout(24000); await pg.screenshot(path=f'v9_{name}.png')
            print(name, await pg.evaluate('(()=>{const s=__bench.stats,st=__bench.state; return {pos:[st.px,st.py,st.pz].map(v=>+v.toFixed(1)), cave:s.cave, submitted:s.submitted, calls:s.calls}})()'))
        print('errors', errs[:3]); await b.close()
asyncio.run(main())
