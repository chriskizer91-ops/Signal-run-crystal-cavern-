# The flooded cavern by numbers: the D-9 drop, walking into the lake, swimming down and up, the air running out, reading the log.
import asyncio, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.abspath(os.path.join(HERE, '..', 'game', 'signal-run.html'))
SIM = open(os.path.join(HERE, 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
ST = "(()=>{const B=__bench,s=B.state,L=B.CV.LAKE; return {y:+s.py.toFixed(1), x:+s.px.toFixed(1), depth:+(L.water-s.py-1.6).toFixed(1), swim:B.inWater(s.px,s.py+1.1,s.pz), air:+B.LAKER.air.toFixed(0), grounded:s.grounded}})()"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=freenew&at=d9'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        await pg.evaluate(SIM + "(320,{KeyW:true})")
        for i in range(40):
            r = await pg.evaluate(SIM + "(20,{})")
            if r[3]: break
        print('1. through D-9 and down the drop: landed', await pg.evaluate(ST), 'D-9 open', await pg.evaluate('__bench.DOORS[2].open'))
        await pg.evaluate("__bench.caveTeleport('lake')"); await pg.evaluate(SIM + "(150,{KeyW:true})"); print('2. walked 5 s into the lake:', await pg.evaluate(ST))
        await pg.evaluate(SIM + "(150,{KeyW:true})"); print('2b. swam on 5 s:', await pg.evaluate(ST))
        await pg.evaluate(SIM + "(150,{KeyC:true})"); print('3. held DIVE 5 s:', await pg.evaluate(ST))
        await pg.evaluate(SIM + "(60,{})"); print('4. let go 2 s (neutral, hangs in the water):', await pg.evaluate(ST))
        await pg.evaluate(SIM + "(150,{Space:true})"); print('5. held JET 5 s (swims up):', await pg.evaluate(ST))
        await pg.evaluate(SIM + "(60,{Space:true})"); print('6. kept holding at the surface (floats, head out):', await pg.evaluate(ST))
        await pg.evaluate(SIM + "(40,{KeyC:true})"); await pg.evaluate("__bench.LAKER.air=4"); await pg.evaluate(SIM + "(140,{KeyC:true})")
        await pg.wait_for_timeout(4500); await pg.evaluate(SIM + "(3,{})")
        print('7. air ran out under water -> blacked out, woke on the shore:', await pg.evaluate(ST), '|', await pg.evaluate("document.getElementById('toast').textContent"))
        await pg.evaluate("(()=>{const B=__bench,s=B.state,T=B.LAKER.term; s.px=T.p[0]+0.3; s.pz=T.p[2]+2.2; s.py=B.CV.floorAt(s.px,s.py+3,s.pz); s.yaw=0; s.heading=Math.PI; s.pitch=0.15; s.dist=4;})()")
        await pg.evaluate(SIM + "(3,{})"); print('8. at the terminal, button shown:', await pg.evaluate("!document.getElementById('logBtn').hidden"))
        await pg.evaluate("document.getElementById('logBtn').click()"); await pg.evaluate("document.getElementById('logNext').click()"); await pg.evaluate("document.getElementById('logNext').click()")
        print('   reading page', await pg.evaluate("document.getElementById('logPage').textContent"), '| paused:', await pg.evaluate('__bench.game.paused'))
        await pg.wait_for_timeout(8000); await pg.screenshot(path='v11_logcard.png')
        await pg.evaluate("document.getElementById('logClose').click()"); print('   closed, paused:', await pg.evaluate('__bench.game.paused'))
        print('errors', errs[:3]); await b.close()
asyncio.run(main())
