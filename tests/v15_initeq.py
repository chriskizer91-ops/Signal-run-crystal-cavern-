# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_initeq.py ../game/versions/signal-run-v14-ancient-site.html ../game/signal-run.html
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
# the menu path: is everything laid out exactly as in v14 once the deferred set-up has finished?
import sys, json, time, pathlib
from playwright.sync_api import sync_playwright
ARGS = ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist']
DUMP = '''() => { const b = __bench, sum = a => +a.reduce((s, v) => s + v, 0).toFixed(3);
  return { world: b.world.total, plants: b.plantTotal, crystalCavern: [b.CAVR.count, b.CAVR.hits, b.CAVR.props.length, b.CAVR.ranges.length], drip: [b.DRIPR.count, b.DRIPR.nWorms, b.DRIPR.ranges.length], lake: [b.LAKER.count, b.LAKER.nWorms, b.LAKER.props.length, b.LAKER.fish.length],
    geode: [b.GEOR.count, b.GEOR.titans.length, b.GEOR.hits, sum(b.GEOR.titans.map(t => t.p[0] + t.p[1] + t.p[2] + t.L))], site: [b.SITER.props.length, b.SITER.relics.length, b.SITER.sockets.length, b.SITER.plates.length],
    doors: b.DOORS.map(d => [d.name, !!d.parts, +d.x.toFixed(2), +d.z.toFixed(2)]), parts: b.PARTS.map(p => p.at ? p.at.map(v => +v.toFixed(2)) : Object.keys(p)), floods: b.FLOODS.length, stakes: b.STAKES.length, props: b.props.length }; }'''
out = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    for f in sys.argv[1:]:
        pg = b.new_page(viewport={'width': 480, 'height': 270}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        t0 = time.time(); pg.goto(pathlib.Path(f).resolve().as_uri()); pg.wait_for_function('window.__loadMs !== undefined', timeout=180000, polling=100)
        menu = pg.evaluate('window.__loadMs'); late = None
        if pg.evaluate('!!__bench.lateInit'):
            pg.wait_for_function('__bench.lateInit.length === 0', timeout=120000, polling=100); late = round(pg.evaluate('performance.now()'))
        out[f] = pg.evaluate(DUMP); print(f, '| menu up at', menu, 'ms', '| deferred set-up done at', late, 'ms | menu visible:', pg.evaluate("!document.getElementById('menu').hidden"), '| errors', errs)
        pg.close()
    b.close()
a, c = [json.dumps(out[f], sort_keys=True) for f in sys.argv[1:3]]
print('IDENTICAL' if a == c else 'DIFFERENT'); print(a[:900])
if a != c: print(c[:900])
