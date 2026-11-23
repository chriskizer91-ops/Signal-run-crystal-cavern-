import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio, sys
from playwright.async_api import async_playwright
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
SIM = "(" + SIM.strip()[1:] if False else SIM
async def shot(pg, name, wait=9000):
    await pg.wait_for_timeout(wait); await pg.screenshot(path=name)
FOLLOW = '''(s,B)=>{if(!s._r){const P=PATH,R=[];for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],L=Math.hypot(b[0]-a[0],b[2]-a[2]);for(let t=0;t<L;t+=1.5)R.push([a[0]+(b[0]-a[0])*t/L,0,a[2]+(b[2]-a[2])*t/L]);}R.push(P[P.length-1]);s._r=R;} const R=s._r;let k=0,bd=1e9;for(let i=0;i<R.length;i++){const d=Math.hypot(R[i][0]-s.px,R[i][2]-s.pz);if(d<bd){bd=d;k=i;}} const t=R[Math.min(R.length-1,k+3)];return Math.atan2(-(t[0]-s.px),-(t[2]-s.pz));}'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=new&at=cave'); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.getElementById('soft').hidden=true")
        print('start', await pg.evaluate(SIM+'(5,{})'))
        await pg.evaluate('(()=>{const s=__bench.state; s.pitch=0.25; s.yaw=-Math.PI/2;})()')
        await shot(pg, 'u1_station.png', 14000)
        print('reel', await pg.evaluate(SIM+'(30,{KeyW:true},(s,B)=>{const a=[B.CV.SX+3.5,B.CV.SZ+2.5];return Math.atan2(-(a[0]-s.px),-(a[1]-s.pz));})'))
        f0 = FOLLOW.replace('PATH','B.CV.minePaths[0].concat([[B.CV.SX+200,-60,B.CV.SZ+48]])')
        print('drift', await pg.evaluate(SIM+'(560,{KeyW:true},'+f0+')'))
        await pg.evaluate('(()=>{const s=__bench.state; s.pitch=0.15;})()')
        await shot(pg, 'u2_drift.png', 16000)
        # step off the ledge into the breakthrough hall
        print('ledge', await pg.evaluate(SIM+'(90,{KeyW:true},(s,B)=>{const a=[B.CV.SX+207,B.CV.SZ+52];return Math.atan2(-(a[0]-s.px),-(a[1]-s.pz));})'))
        print('land', await pg.evaluate(SIM+'(90,{})'))
        await pg.evaluate('(()=>{const s=__bench.state; s.pitch=0.35; s.dist=13;})()')
        await shot(pg, 'u3_hall.png', 18000)
        # look back toward the line
        await pg.evaluate('(()=>{const s=__bench.state; s.yaw+=Math.PI; s.pitch=0.25;})()')
        await shot(pg, 'u4_lookback.png', 12000)
        await pg.evaluate('(()=>{const s=__bench.state; s.yaw-=Math.PI;})()')
        f3 = FOLLOW.replace('PATH','[[B.CV.SX+207,-66,B.CV.SZ+52],[B.CV.SX+255,-64,B.CV.SZ+65],[B.CV.SX+300,-66,B.CV.SZ+70]]')
        await pg.evaluate('__bench.state._r=null')
        print('east', await pg.evaluate(SIM+'(260,{KeyW:true},'+f3+')'))
        await pg.evaluate('(()=>{const s=__bench.state; s.pitch=0.2; s.dist=9;})()')
        await shot(pg, 'u5_natural.png', 18000)
        print('errors', errs)
        await b.close()
asyncio.run(main())
