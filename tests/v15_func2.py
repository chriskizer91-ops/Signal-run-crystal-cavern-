# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_func2.py ../game/versions/signal-run-v14-ancient-site.html ../game/signal-run.html
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
import sys, json, time, pathlib
from playwright.sync_api import sync_playwright
url = pathlib.Path(sys.argv[1]).resolve().as_uri()
ARGS = ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist']
def load(pg, q):
    pg.goto(url + q, timeout=180000); pg.wait_for_function('window.__loadMs !== undefined', timeout=180000, polling=200)
STEP = '''(n) => { const b = __bench; for (let i = 0; i < n; i++) b.update(0.033); return [+b.state.px.toFixed(2), +b.state.py.toFixed(2), +b.state.pz.toFixed(2), b.cave.under, b.state.grounded]; }'''
EDIT = '''(fn) => { const k = 'canyon-signal-run-free-v1', s = JSON.parse(localStorage.getItem(k)); (new Function('s', fn))(s); localStorage.setItem(k, JSON.stringify(s)); __bench.state.play = false; }'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    ctx = b.new_context(viewport={'width': 480, 'height': 270}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    load(pg, '?play=freenew'); pg.evaluate('__bench.keys.KeyW = true'); pg.evaluate(STEP, 150); pg.evaluate('__bench.keys.KeyW = false')
    for i in range(40):
        a = pg.evaluate(STEP, 30)
        if a[4]: break
    load(pg, '?play=free'); r = pg.evaluate(STEP, 3)          # leaving the page saves by itself
    print('B2 surface: walked off the lookout and landed at', a[:3], '| after reload', r[:3])
    pg.evaluate(EDIT, 's.place = [1700, -100, 1700, 0, 0.2, 9, 0];'); load(pg, '?play=free'); r = pg.evaluate(STEP, 3); print('B3 a saved place inside solid rock is refused -> lookout:', r[:3])
    pg.evaluate(EDIT, 'delete s.place; s.online = 3; s.got = [true, true, true, false, false, false, false];'); load(pg, '?play=free'); r = pg.evaluate(STEP, 3); print('B4 a v14 save (no place) loads:', r[:3], '| dishes online', pg.evaluate('__bench.game.online'))
    # bench and back
    load(pg, '?play=freenew&at=lake'); a = pg.evaluate(STEP, 30); pg.evaluate("document.getElementById('gMenu').click()"); pg.evaluate("document.getElementById('mBench').click()"); bb = pg.evaluate(STEP, 3)
    pg.evaluate("__bench.showMenu(true)"); pg.evaluate("document.getElementById('mFree').click()"); r = pg.evaluate(STEP, 3)
    print('B5 play -> Benchmark -> back to free play: was', a[:3], '| in benchmark', bb[:3], '| back', r[:3])
    print('page errors:', errs)
    b.close()
