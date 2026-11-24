# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_func3.py ../game/versions/signal-run-v14-ancient-site.html ../game/signal-run.html
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
import sys, json, time, pathlib
from playwright.sync_api import sync_playwright
url = pathlib.Path(sys.argv[1]).resolve().as_uri()
ARGS = ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist']
def load(pg, q):
    pg.goto(url + q, timeout=180000); pg.wait_for_function('window.__loadMs !== undefined', timeout=180000, polling=100)
STEP = '''(n) => { const b = __bench; for (let i = 0; i < n; i++) b.update(0.033); return [+b.state.px.toFixed(2), +b.state.py.toFixed(2), +b.state.pz.toFixed(2), b.cave.under, b.state.grounded]; }'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    ctx = b.new_context(viewport={'width': 480, 'height': 270}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    # 1. tapping a menu button before the behind-the-menu set-up has finished
    load(pg, ''); left = pg.evaluate('__bench.lateInit.length'); pg.evaluate("document.getElementById('mFree').click()")
    r = pg.evaluate('''() => { const b = __bench; return { leftAfter: b.lateInit.length, crystals: b.CAVR.count, drip: b.DRIPR.count, lake: b.LAKER.count, geode: b.GEOR.count, site: b.SITER.props.length, doors: b.DOORS.every(d => !!d.parts), play: b.state.play, paused: b.game.paused }; }''')
    print('1 tapped Free play with', left, 'set-up steps still waiting ->', json.dumps(r))
    # 2. the surface save now happens by itself
    pg.evaluate('__bench.keys.KeyW = true'); pg.evaluate(STEP, 40); pg.evaluate('__bench.keys.KeyW = false'); a = pg.evaluate(STEP, 330)
    s = pg.evaluate("JSON.parse(localStorage.getItem('canyon-signal-run-free-v1') || 'null')")
    print('2 after 12 s on the surface: standing at', a[:3], '| saved place', s and s.get('place') and s['place'][:3])
    # 3. leaving the tab: saved, sound stopped; coming back: sound on again
    r = pg.evaluate('''async () => { const b = __bench, out = {}; localStorage.removeItem('canyon-signal-run-free-v1');
      const snd = new (window.AudioContext || window.webkitAudioContext)(); await snd.close();
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); await new Promise(r => setTimeout(r, 300));
      out.savedOnHide = !!localStorage.getItem('canyon-signal-run-free-v1');
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); await new Promise(r => setTimeout(r, 300)); return out; }''')
    print('3 tab hidden ->', json.dumps(r))
    # 4. benchmark mode underground no longer writes over the campaign save
    ctx2 = b.new_context(viewport={'width': 480, 'height': 270}); pg2 = ctx2.new_page(); pg2.on('pageerror', lambda e: errs.append(str(e)))
    load(pg2, '?bench&at=cave'); a = pg2.evaluate(STEP, 400)
    print('4 benchmark mode, 13 s underground at', a[:4], '| campaign save written:', pg2.evaluate("localStorage.getItem('canyon-signal-run-v1') !== null"))
    # 5. phone-sized screen with touch
    ctx3 = b.new_context(viewport={'width': 915, 'height': 412}, has_touch=True, is_mobile=True, device_scale_factor=1); pg3 = ctx3.new_page(); pg3.on('pageerror', lambda e: errs.append(str(e)))
    load(pg3, '?play=new'); pg3.evaluate(STEP, 3)
    pg3.evaluate('''() => { const b = __bench; b.cells.forEach(c => c.got = true); b.game.online = 7; b.dishes.forEach(d => d.on = true); b.state.yaw = 1.75; b.update(0.033); document.getElementById('toast').style.display = 'none'; }''')
    time.sleep(25); pg3.screenshot(path='out/v15_phone_marker.png'); print('5 phone screenshot saved; marker reads:', pg3.evaluate("document.getElementById('markerTxt').textContent"), '| hint hidden:', pg3.evaluate("document.getElementById('hint').hidden"))
    print('page errors:', errs)
    b.close()
