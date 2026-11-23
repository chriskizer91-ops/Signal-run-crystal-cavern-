import asyncio, sys, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.abspath(os.path.join(HERE, '..', 'game', 'signal-run.html'))
SIM = open(os.path.join(HERE, 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
HIDE = "document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true; document.getElementById('toast').style.visibility='hidden'; document.getElementById('visor').style.display='none';"
VIEWS = {
 'nofish': "B.caveTeleport('lake'); const L0=B.CV.LAKE; B.LAKER.fish.forEach(f=>{f.p=[L0.x+20,L0.water-20,L0.z]; f.goal=f.p.slice();}); s.pitch=0.22; s.dist=9; s.yaw=-Math.PI/2+0.2;",
 'beach': "B.caveTeleport('lake'); s.pitch=0.22; s.dist=9; s.yaw=-Math.PI/2+0.2;",
 'station': "B.caveTeleport('lake'); s.pz-=4; s.pitch=0.3; s.dist=10; s.yaw=-0.2; s.heading=Math.PI-0.2;",
 'log': "B.caveTeleport('lake'); const T=B.LAKER.term; s.px=T.p[0]+0.3; s.pz=T.p[2]+2.2; s.py=B.CV.floorAt(s.px,s.py+3,s.pz); s.yaw=0; s.heading=Math.PI; s.pitch=0.15; s.dist=4;",
 'under': "const L=B.CV.LAKE; s.px=L.x-28; s.pz=L.z-4; s.py=L.water-9; s.grounded=false; s.vx=s.vy=s.vz=0; s.yaw=-Math.PI/2; s.heading=Math.PI/2; s.pitch=0.05; s.dist=5; const f=B.LAKER.fish[0]; f.p=[s.px+9,s.py+1.2,s.pz+1.5]; f.mode='wander'; f.goal=[s.px+9,s.py+1.2,s.pz+40]; const g=B.LAKER.fish[4]; if(g){g.p=[s.px+15,s.py+2,s.pz-3]; g.goal=[s.px+15,s.py+2,s.pz-40];}",
 'bore':  "B.caveTeleport('d10'); s.py+=0.8; s.grounded=false; s.pitch=0.1; s.dist=6;",
 'peek':  "B.caveTeleport('lake'); s.px+=4.5; s.py=B.CV.floorAt(s.px,s.py+3,s.pz); s.yaw=-Math.PI/2; s.heading=Math.PI/2; s.pitch=0.32; s.dist=6; const L=B.CV.LAKE; B.LAKER.fish.forEach((f,i)=>{ if(i===0){ f.p=[s.px+7.5,L.water-1.4,s.pz+0.6]; f.mode='peek'; f.t=0; f.goal=f.p.slice(); } else if(i===4){ f.p=[s.px+12,L.water-2.6,s.pz-3]; f.mode='peek'; f.t=0; f.goal=f.p.slice(); } else { f.p=[L.x+30,L.water-15,L.z]; f.goal=f.p.slice(); } });",
 'up':    "const L=B.CV.LAKE; s.px=L.x-35; s.pz=L.z-8; s.py=L.water-6; s.grounded=false; s.vx=s.vy=s.vz=0; s.yaw=-Math.PI/2; s.heading=Math.PI/2; s.pitch=-0.6; s.dist=5;",
}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=freenew&at=lake'); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.evaluate(HIDE)
        print('fish', await pg.evaluate("__bench.LAKER.fish.map(f=>[f.kind, +(f.p[1]-__bench.CV.LAKE.water).toFixed(1)])"))
        print('lake', await pg.evaluate("(()=>{const L=__bench.LAKER; return {inst:L.count, hits:L.hits, worms:L.nWorms, fish:L.fish.length, fishModel:!!(L.fish[0]&&L.fish[0].mesh), props:L.props.length, term:!!L.term, line:!!L.oldLine, ms:L.ms, stakes:__bench.STAKES.filter(k=>k.route==='D-10').length}})()"))
        for name in (sys.argv[1:] or VIEWS.keys()):
            await pg.evaluate('__bench.game.paused=false'); await pg.evaluate('(()=>{const B=__bench,s=B.state; ' + VIEWS[name] + '})()')
            await pg.evaluate(SIM+'(2,{})'); await pg.evaluate('__bench.cavePrebuild(300)'); await pg.evaluate(SIM+'(1,{})'); await pg.evaluate('__bench.game.paused=true')
            await pg.wait_for_timeout(24000); await pg.screenshot(path=f'v11_{name}.png')
            print(name, await pg.evaluate('(()=>{const s=__bench.stats,st=__bench.state; return {pos:[st.px,st.py,st.pz].map(v=>+v.toFixed(1)), camUnder:__bench.LAKER.camUnder, cave:s.cave, submitted:s.submitted, calls:s.calls}})()'))
        print('errors', errs[:3]); await b.close()
asyncio.run(main())
