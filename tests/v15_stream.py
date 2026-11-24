# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_stream.py ../game/versions/signal-run-v14-ancient-site.html ../game/signal-run.html
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
# how much cave rock is built and held, standing at the lookout and then moving between caverns (live frames, real workers)
import sys, json, time, pathlib
from playwright.sync_api import sync_playwright
ARGS = ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist']
STAT = '''() => { const b = __bench, ch = b.cave.ch; let built = 0, solid = 0, need = 0, far = 0, close = 0; for (const c of ch) { if (c.m[1]) built++; if (c.m[1] && c.m[1].vao) { solid++; if (c.d > 560) far++; } if (c.d < 330 && !c.m[1]) need++; if (c.m[0] && c.m[0].vao) close++; if (b.cave.visible && c.d < 26 && !c.m[0]) need++; }
  return { built, solid, missingInView: need, closeUp: close, heldBeyond560m: far, jobs: b.cave.jobs === undefined ? null : b.cave.jobs, MB: b.cave.bytes === undefined ? null : +(b.cave.bytes / 1048576).toFixed(1), eye: b.cam.eye.map(v => Math.round(v)) }; }'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    for f in sys.argv[1:]:
        pg = b.new_page(viewport={'width': 320, 'height': 180}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(pathlib.Path(f).resolve().as_uri() + '?play=freenew'); pg.wait_for_function('window.__loadMs !== undefined', timeout=180000, polling=200)
        pg.evaluate('__bench.CAVR.off = {crys:1, life:1, spore:1, rock:1, props:1, pool:1, line:1, geo:1, titan:1, water:1}'); print('==', f); time.sleep(40); print('  lookout, 40 s after start:', json.dumps(pg.evaluate(STAT)))
        for at in ['cavern', 'chamber', 'cavern']:
            pg.evaluate("__bench.caveTeleport('%s')" % at); t0 = time.time(); time.sleep(3)
            while time.time() - t0 < 400:
                s = pg.evaluate(STAT)
                if s['missingInView'] == 0: break
                time.sleep(1)
            t1 = time.time() - t0; fr = pg.evaluate('new Promise(r => { let n = 0; const t = performance.now(); const f = () => { if (++n < 20) requestAnimationFrame(f); else r(Math.round(20000 / (performance.now() - t))); }; requestAnimationFrame(f); })'); time.sleep(15); print('  -> (%d frames/s)' % fr, at, '| everything in view built after %.0f s |' % t1, json.dumps(pg.evaluate(STAT)))
        print('  errors', errs); pg.close()
    b.close()
