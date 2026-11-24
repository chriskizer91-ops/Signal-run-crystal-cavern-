# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_func.py ../game/versions/signal-run-v14-ancient-site.html ../game/signal-run.html
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
import sys, json, time, pathlib
from playwright.sync_api import sync_playwright
url = pathlib.Path(sys.argv[1]).resolve().as_uri()
ARGS = ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist']
def load(pg, q):
    pg.goto(url + q, timeout=180000); pg.wait_for_function('window.__loadMs !== undefined', timeout=180000, polling=200)
STEP = '''(n) => { const b = __bench; for (let i = 0; i < n; i++) b.update(0.033); return [+b.state.px.toFixed(2), +b.state.py.toFixed(2), +b.state.pz.toFixed(2), b.cave.under]; }'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    ctx = b.new_context(viewport={'width': 480, 'height': 270}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    # --- B1: resume deep underground
    load(pg, '?play=freenew&at=chamber')
    a = pg.evaluate(STEP, 40); pg.evaluate('__bench.keys.KeyW = true'); a = pg.evaluate(STEP, 60); pg.evaluate('__bench.keys.KeyW = false'); a = pg.evaluate(STEP, 20)
    pg.evaluate('__bench.saveGame()'); saved = pg.evaluate("JSON.parse(localStorage.getItem('canyon-signal-run-free-v1')).place")
    load(pg, '?play=free'); r = pg.evaluate(STEP, 3)
    print('B1 underground resume: stood at', a, '| saved', saved[:3], '| after reload', r, '| toast:', pg.evaluate("document.getElementById('toast').textContent"))
    # --- B2: resume on the surface after walking
    load(pg, '?play=freenew'); pg.evaluate('__bench.keys.KeyW = true'); a = pg.evaluate(STEP, 150); pg.evaluate('__bench.keys.KeyW = false'); a = pg.evaluate(STEP, 30)
    pg.evaluate('__bench.saveGame()'); load(pg, '?play=free'); r = pg.evaluate(STEP, 3)
    print('B2 surface resume: stood at', a, '| after reload', r)
    # --- B3: a saved place inside solid rock is refused
    pg.evaluate('''() => { const k = 'canyon-signal-run-free-v1', s = JSON.parse(localStorage.getItem(k)); s.place = [1700, -100, 1700, 0, 0.2, 9, 0]; localStorage.setItem(k, JSON.stringify(s)); }''')
    load(pg, '?play=free'); r = pg.evaluate(STEP, 3); print('B3 bad place refused -> back at the lookout:', r)
    # --- B4: an old v14 save (no place) still loads
    pg.evaluate('''() => { const k = 'canyon-signal-run-free-v1', s = JSON.parse(localStorage.getItem(k)); delete s.place; s.online = 3; localStorage.setItem(k, JSON.stringify(s)); }''')
    load(pg, '?play=free'); r = pg.evaluate(STEP, 3); print('B4 v14-style save loads:', r, 'dishes online', pg.evaluate('__bench.game.online'))
    # --- C: the marker after the array is online
    load(pg, '?play=new'); pg.evaluate(STEP, 3)
    o1 = pg.evaluate('''() => { const b = __bench; b.cells.forEach(c => c.got = true); b.game.online = 7; b.game.carrying = 0; b.update(0.033); const o = b.objective(); return o && [o.label, o.p.map(v => +v.toFixed(1))]; }''')
    o0 = pg.evaluate('''() => { const b = __bench; b.DOORS[0].open = 1; const o = b.objective(); b.DOORS[0].open = 0; return o; }''')
    print('C marker with 7 dishes online:', o1, '| after D-7 has been opened:', o0, '| on screen:', pg.evaluate("document.getElementById('markerTxt').textContent"))
    pg.evaluate('''() => { document.getElementById('toast').classList.remove('show'); }'''); time.sleep(4); pg.screenshot(path='out/v15_marker.png')
    # --- D: R underground asks first
    load(pg, '?play=freenew&at=cavern'); a = pg.evaluate(STEP, 20)
    pg.keyboard.press('KeyR'); r1 = pg.evaluate(STEP, 2); t1 = pg.evaluate("document.getElementById('toast').textContent")
    pg.keyboard.press('KeyR'); r2 = pg.evaluate(STEP, 2)
    print('D R underground: before', a, '| after 1st press', r1, '"%s"' % t1, '| after 2nd press', r2)
    load(pg, '?play=freenew'); pg.evaluate('__bench.keys.KeyW = true'); a = pg.evaluate(STEP, 60); pg.evaluate('__bench.keys.KeyW = false'); pg.keyboard.press('KeyR'); r = pg.evaluate(STEP, 2)
    print('D R on the surface is still immediate:', a, '->', r)
    print('page errors:', errs)
    b.close()
