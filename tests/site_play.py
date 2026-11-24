# The ancient site by numbers: walk into the second bore, drop down the shaft, find and scan the 5 artifacts,
# set them in the sockets, answer the signal on the plates (one wrong try first), the hologram and its message, then save/load.
import asyncio, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.abspath(os.path.join(HERE, '..', 'game', 'signal-run.html'))
STEP = r"""(()=>{ window.__toasts=[]; const T=document.getElementById('toast'); new MutationObserver(()=>{ const x=T.textContent; if(x && __toasts[__toasts.length-1]!==x) __toasts.push(x); }).observe(T,{childList:true,characterData:true,subtree:true});
  window.__run=(sec,keys,yaw,stop)=>{ const B=__bench,s=B.state; for(const k in keys) B.keys[k]=keys[k]; let t=0; while(t<sec){ if(yaw!==undefined) s.yaw=yaw; B.update(0.033); t+=0.033; if(stop&&stop(B)) break; } for(const k in keys) B.keys[k]=false; return +t.toFixed(2); };
  window.__goto=(x,z)=>{ const B=__bench,s=B.state; s.px=x; s.pz=z; s.py=B.CV.SITE.floor; s.vx=s.vy=s.vz=0; s.grounded=true; __run(0.4,{}); };
  return 1; })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':480,'height':270}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + GAME + '?play=freenew&at=portal'); await pg.wait_for_function('window.__loadMs', timeout=300000); await pg.evaluate(STEP)
        print('0. models:', await pg.evaluate("({props:__bench.SITER.props.length, relics:__bench.SITER.relics.filter(r=>r.mesh).length, entity:!!__bench.SITER.ent, sockets:__bench.SITER.sockets.length, plates:__bench.SITER.plates.length})"))
        # 1. walk east into the bore and off the edge of the shaft
        st = await pg.evaluate("(()=>{const B=__bench,s=B.state; const y0=s.py; const t1=__run(20,{KeyW:true},-Math.PI/2,B=>!B.state.grounded&&B.state.py<y0-3); const t2=__run(30,{},undefined,B=>B.state.grounded&&B.state.py<B.CV.SITE.floor+1); return {walked:t1, fell:t2, from:+y0.toFixed(1), landed:[s.px,s.py,s.pz].map(v=>+v.toFixed(1)), grounded:s.grounded}; })()")
        print('1. into the bore and down the shaft:', st, '| toast:', await pg.evaluate("__toasts.slice(-1)[0]"))
        # 2. the five artifacts: walk up to each, scan, close the card (take it)
        got = []
        for i in range(5):
            r = await pg.evaluate(f"(()=>{{const B=__bench,R=B.SITER.relics[{i}]; const dx=R.home[0]-(R.ped?R.ped.p[0]:R.home[0]); __goto(R.home[0]+ (Math.abs(R.home[2]-B.CV.SITE.hall[1])>3? 0:1.6), R.home[2]+(R.home[2]>B.CV.SITE.hall[1]? -1.7: 1.7)); const btn=!document.getElementById('siteBtn').hidden; B.siteAct(); const card=!document.getElementById('logCard').hidden, title=document.getElementById('logTitle').textContent; B.logShow(-1); return {{btn, card, title, state:B.siteState().r[{i}]}}; }})()")
            got.append(r)
        print('2. artifacts:', got, '| status line:', await pg.evaluate("document.getElementById('ustat').textContent"))
        # 3. into the chamber: past each socket
        socks = await pg.evaluate("(()=>{const B=__bench, out=[]; for(const S of B.SITER.sockets){ __goto(S.p[0]+(B.SITER.emit[0]-S.p[0])*0.1, S.p[2]+(B.SITER.emit[2]-S.p[2])*0.1); out.push(B.siteState().r.slice().join('')); } return {after:out, phase:B.SITER.phase, power:+B.SITER.power.toFixed(2)}; })()")
        print('3. sockets filled:', socks, '|', await pg.evaluate("__toasts.slice(-1)[0]"))
        # 4. let the chamber play its pattern, then a wrong answer, then the right one
        pat = await pg.evaluate("(()=>{const B=__bench; const lit=[]; let last=-1; __run(12,{},undefined,B=>{ const f=B.SITER.flash, m=f.indexOf(Math.max(...f)); if(Math.max(...f)>0.95&&m!==last){ lit.push(m); last=m; } return B.SITER.phase==='answer'; }); return {played:lit, phase:B.SITER.phase}; })()")
        print('4. the chamber played the plates in order:', pat)
        wrong = await pg.evaluate("(()=>{const B=__bench, P=B.SITER.plates, sq=[0,2,4,1,3]; const k=sq[1]; __goto(P[k].p[0],P[k].p[2]); return {stepped:k, phase:B.SITER.phase, toast:document.getElementById('toast').textContent}; })()")
        print('5. wrong plate first:', wrong)
        right = await pg.evaluate("(()=>{const B=__bench; __run(12,{},undefined,B=>B.SITER.phase==='answer'); const P=B.SITER.plates, sq=[0,2,4,1,3], tr=[]; for(const k of sq){ __goto(P[k].p[0],P[k].p[2]); tr.push(B.SITER.step); __goto(B.SITER.emit[0]-6, B.SITER.emit[2]); } return {steps:tr, phase:B.SITER.phase, solved:B.siteState().solved, toast:document.getElementById('toast').textContent}; })()")
        print('6. right order (star pattern):', right)
        holo = await pg.evaluate("(()=>{const B=__bench; const n0=__toasts.length; __run(48,{}); return {holo:+B.SITER.holo.toFixed(2), chart:B.SITER.chart, big:B.SITER.big, highlight:B.SITER.hl, heard:B.siteState().heard, said:(B.SITER.log||[])}; })()")
        print('7. the hologram and its message:'); [print('   ', k, v) for k, v in holo.items()]
        # 8. save, reload, and check it stays solved
        await pg.goto('file://' + GAME + '?play=free&at=chamber'); await pg.wait_for_function('window.__loadMs', timeout=300000)
        print('8. after reloading:', await pg.evaluate("(()=>{const s=__bench.siteState(); return {relics:s.r.join(''), solved:s.solved, heard:s.heard, seen:s.seen}; })()"))
        print('errors', errs[:3]); await b.close()
asyncio.run(main())
