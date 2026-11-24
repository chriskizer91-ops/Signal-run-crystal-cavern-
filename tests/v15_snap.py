# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_snap.py ../game/versions/signal-run-v14-ancient-site.html v14 && python3 v15_snap.py ../game/signal-run.html v15 && python3 v15_cmp.py surface mine cave cavern drip lake ledge chamber
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
# Deterministic screenshots: frames are stepped by hand with a fixed clock, random numbers are seeded,
# and the picture is taken only once every mesh the view needs has arrived.
import sys, json, time, pathlib
from playwright.sync_api import sync_playwright
src, tag = sys.argv[1], sys.argv[2]
spots = sys.argv[3:] or ['surface', 'mine', 'cave', 'cavern', 'drip', 'lake', 'ledge', 'chamber']
INIT = '''
(() => { let s = 12345; Math.random = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
  window.__cb = null; window.__now = 1000; window.requestAnimationFrame = cb => { window.__cb = cb; return 1; };
  window.__step = (n, ms) => { for (let i = 0; i < n; i++) { const cb = window.__cb; if (!cb) return false; window.__cb = null; window.__now += ms; cb(window.__now); } return true; }; })();
'''
SETTLED = '''() => { const b = __bench, E = b.cam.eye; if (b.pending.size) return false;
  if (b.cave.visible) for (const c of b.cave.ch) { if (c.d < 330 && !c.m[1]) return false; if (c.d < 26 && !c.m[0]) return false; }
  return true; }'''
url = pathlib.Path(src).resolve().as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist'])
    for at in spots:
        pg = b.new_page(viewport={'width': 640, 'height': 360}); pg.add_init_script(INIT)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url + '?play=freenew' + ('' if at == 'surface' else '&at=' + at))
        pg.wait_for_function('window.__loadMs !== undefined', timeout=180000, polling=200)
        t0 = time.time()
        pg.evaluate('__step(8, 16.6667)')                       # a few live frames so the game knows where it is
        pg.evaluate('__bench.game.paused = true')
        pg.evaluate('__step(2, 16.6667)')
        pg.evaluate('__bench.cave.visible && __bench.cavePrebuild(330)')          # the documented test hook: all rough rock in view range, at once
        n = 0; ok = False
        while time.time() - t0 < 900:
            pg.evaluate('__step(1, 16.6667)'); n += 1; time.sleep(0.25)
            if n > 6 and pg.evaluate(SETTLED):
                pg.evaluate('__step(3, 16.6667)'); time.sleep(0.5)
                if pg.evaluate(SETTLED): ok = True; break
        pg.evaluate('''() => { __bench.state.time = 500; document.getElementById('toast').style.display = 'none'; document.getElementById('hint').style.display = 'none'; }''')
        pg.evaluate('__step(2, 16.6667)')
        st = pg.evaluate('({sub: __bench.stats.submitted, calls: __bench.stats.calls, cave: __bench.stats.cave, shadow: __bench.stats.shadow, px: +__bench.state.px.toFixed(2), py: +__bench.state.py.toFixed(2), pz: +__bench.state.pz.toFixed(2)})')
        out = 'out/%s_%s.png' % (tag, at); pg.screenshot(path=out)
        print(json.dumps({'at': at, 'settled': ok, 'frames': n, 'secs': round(time.time() - t0), **st, 'errors': errs[:3]}), flush=True)
        pg.close()
    b.close()
