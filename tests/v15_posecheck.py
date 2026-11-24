# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_posecheck.py ../game/versions/signal-run-v14-ancient-site.html ../game/signal-run.html
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
import sys, time, pathlib
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist'])
    for f in sys.argv[1:]:
        pg = b.new_page(viewport={'width': 320, 'height': 180})
        pg.goto(pathlib.Path(f).resolve().as_uri() + '?play=freenew', timeout=180000); pg.wait_for_function('window.__loadMs !== undefined', timeout=180000, polling=100)
        pg.evaluate('''() => { const gl = document.getElementById('c').getContext('webgl2'); for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'blitFramebuffer', 'clear']) gl[k] = () => {}; window.__fr = 0; const tick = () => { window.__fr++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }''')
        for t in (5, 15, 30, 60):
            time.sleep(t if t == 5 else {15: 10, 30: 15, 60: 30}[t])
            r = pg.evaluate('''() => { const k = Object.keys(__bench.pose); let longest = 0; for (const s of k) if (s.length > longest) longest = s.length; return [window.__fr, k.length, longest, performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1, +__bench.perf.cpu.toFixed(1), Math.round(__bench.perf.fps)]; }''')
            print('%s after %2d s: %5d frames drawn | things in the pose list: %6d | longest name: %5d letters | script memory %4d MB | script %.1f ms/frame | %d frames/s' % (f[-8:-5], t, *r), flush=True)
        pg.close()
    b.close()
