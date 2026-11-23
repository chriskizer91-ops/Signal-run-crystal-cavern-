import asyncio, sys, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.abspath(os.path.join(HERE, '..', 'game', 'signal-run.html'))
SIM = open(os.path.join(HERE, 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
HIDE = "document.getElementById('soft').hidden=true; document.getElementById('hint').hidden=true; document.getElementById('toast').style.visibility='hidden'; document.getElementById('visor').style.display='none';"
WAKE = "B.GEOR.seen=true; B.GEOR.pt0=-1e4;"
VIEWS = {
 'pool':  WAKE + "B.caveTeleport('pool'); s.pitch=0.1; s.dist=7;",
 'dim':   "B.GEOR.seen=false; B.GEOR.pt0=0; B.caveTeleport('pool'); s.pitch=0.1; s.dist=7;",
 'over':  WAKE + "const C=B.CV.GEO; s.px=C.x-95; s.pz=C.z+10; s.py=C.y+25; s.grounded=false; s.hover=true; s.vx=s.vy=s.vz=0; s.yaw=-Math.PI/2-0.05; s.heading=Math.PI/2; s.pitch=0.32; s.dist=9;",
 'geo':   WAKE + "B.caveTeleport('geo'); s.pitch=0.18; s.dist=8; s.yaw=-Math.PI/2-0.3;",
 'titan': WAKE + "const T=B.GEOR.titans.filter(t=>t.kind==='floor').sort((a,b)=>Math.abs(a.L-45)-Math.abs(b.L-45))[0]; const C=B.CV.GEO; const dx=T.mid[0]-C.x, dz=T.mid[2]-C.z, l=Math.hypot(dx,dz)||1; s.px=T.mid[0]-dx/l*34+dz/l*8; s.pz=T.mid[2]-dz/l*34-dx/l*8; s.py=T.mid[1]-8; s.grounded=false; s.hover=true; s.vx=s.vy=s.vz=0; s.heading=Math.atan2(dx,dz); s.yaw=s.heading+Math.PI; s.pitch=0.05; s.dist=7;",
 'reveal': WAKE + "B.caveTeleport('pool'); s.pitch=-0.12; s.dist=6; s.yaw=-Math.PI/2+0.5;",
 'under': WAKE + "const C=B.CV.GEO; s.px=C.pool[0]-3; s.pz=C.pool[1]+1; s.py=B.CV.LAKE.water-6; s.grounded=false; s.vx=s.vy=s.vz=0; s.yaw=-Math.PI/2+0.4; s.heading=Math.PI/2-0.4; s.pitch=-0.35; s.dist=5;",
 'bore': "B.GEOR.seen=false; B.GEOR.pt0=0; const Bo=B.CV.LAKE.bore; s.px=B.CV.SX+515; s.pz=Bo[0][2]; s.py=-449; s.grounded=false; s.vx=s.vy=s.vz=0; s.yaw=-Math.PI/2; s.heading=Math.PI/2; s.pitch=0.05; s.dist=4;",
 'hero': WAKE + "const C=B.CV.GEO; s.px=C.x-112; s.pz=C.z+18; s.py=C.y-52; s.grounded=false; s.hover=true; s.vx=s.vy=s.vz=0; s.heading=Math.PI/2-0.12; s.yaw=s.heading+Math.PI; s.pitch=0.02; s.dist=8;",
 'close': WAKE + "const T=B.GEOR.titans.filter(t=>t.kind==='pool')[0], C=B.CV.GEO; const dx=T.mid[0]-C.pool[0], dz=T.mid[2]-C.pool[1], l=Math.hypot(dx,dz)||1; s.px=T.mid[0]-dx/l*16; s.pz=T.mid[2]-dz/l*16; s.py=Math.max(T.p[1]+6, B.CV.LAKE.water+3); s.grounded=false; s.hover=true; s.vx=s.vy=s.vz=0; s.heading=Math.atan2(dx,dz); s.yaw=s.heading+Math.PI; s.pitch=-0.05; s.dist=6;",
 'tunwet': "B.GEOR.seen=false; B.GEOR.pt0=0; const T=B.CV.GEO.tunnel; s.px=T[1][0]+3; s.pz=T[1][2]-2; s.py=T[1][1]-1.2; s.grounded=false; s.vx=s.vy=s.vz=0; s.heading=Math.atan2(T[2][0]-T[1][0],T[2][2]-T[1][2]); s.yaw=s.heading+Math.PI; s.pitch=-0.15; s.dist=4;",
 'tunup': "B.GEOR.seen=false; B.GEOR.pt0=0; const K=B.STAKES.filter(k=>k.route==='GEO'); const a=K[K.length-5], c=K[K.length-3]; s.px=a.p[0]; s.pz=a.p[2]; s.py=a.p[1]; s.grounded=true; s.vx=s.vy=s.vz=0; s.heading=Math.atan2(c.p[0]-a.p[0],c.p[2]-a.p[2]); s.yaw=s.heading+Math.PI; s.pitch=0.05; s.dist=5;",
 'mouth': "B.GEOR.seen=false; B.GEOR.pt0=0; const T=B.CV.GEO.tunnel, n=T.length, a=T[n-2], c=T[n-1]; const d=[c[0]-a[0],c[2]-a[2]], l=Math.hypot(d[0],d[1]); s.px=c[0]-d[0]/l*3; s.pz=c[2]-d[1]/l*3; s.py=B.CV.floorAt(s.px,c[1],s.pz); s.grounded=true; s.vx=s.vy=s.vz=0; s.heading=Math.atan2(B.CV.GEO.x-s.px,B.CV.GEO.z-s.pz); s.yaw=s.heading+Math.PI; s.pitch=0.06; s.dist=5;",
 'ledge': WAKE + "B.caveTeleport('ledge'); s.pitch=0.12; s.dist=8;",
 'ledgedim': "B.caveTeleport('ledge'); s.pitch=0.12; s.dist=8;",
 'up':    WAKE + "const C=B.CV.GEO; s.px=C.x-20; s.pz=C.z-10; s.py=B.CV.floorAt(s.px,C.y,s.pz); s.yaw=-Math.PI/2; s.heading=Math.PI/2; s.pitch=-0.9; s.dist=6;",
}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=freenew&at=pool' + (('&' + os.environ['Q']) if os.environ.get('Q') else '')); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.evaluate(HIDE)
        for name in (sys.argv[1:] or VIEWS.keys()):
            await pg.evaluate('__bench.game.paused=false'); await pg.evaluate('(()=>{const B=__bench,s=B.state; ' + VIEWS[name] + '})()')
            await pg.evaluate(SIM+'(1,{})'); await pg.evaluate('__bench.cavePrebuild(330)'); await pg.evaluate(SIM+'(0.5,{})'); await pg.evaluate('__bench.game.paused=true')
            if name in ('dim','ledgedim','tunwet','tunup','mouth'): await pg.evaluate('__bench.GEOR.seen=false; __bench.GEOR.pt0=0')
            await pg.wait_for_timeout(int(os.environ.get('W', '30000'))); await pg.screenshot(path=f'v12_{name}.png', timeout=240000)
            print(name, await pg.evaluate('(()=>{const s=__bench.stats,st=__bench.state,G=__bench.GEOR; return {pos:[st.px,st.py,st.pz].map(v=>+v.toFixed(1)), under:__bench.LAKER.camUnder, lights:G.nl, grabs:G.grabs, lining:G.tris, cave:s.cave, submitted:Math.round(s.submitted), calls:s.calls}})()'))
        print('errors', errs[:3]); await b.close()
asyncio.run(main())
