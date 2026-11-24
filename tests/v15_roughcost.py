# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_roughcost.py ../game/versions/signal-run-v14-ancient-site.html ../game/signal-run.html
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
import sys, json, time, pathlib
from playwright.sync_api import sync_playwright
f = pathlib.Path(sys.argv[1]).resolve().as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width':320,'height':180})
    pg.goto(f+'?play=freenew&noworker')
    pg.wait_for_function('window.__loadMs !== undefined', timeout=180000)
    r = pg.evaluate('''() => { const b = __bench, CV = b.CV; b.game.paused = true; let bytes = 0, tris = 0, empty = 0, ms = 0, n = 0; const zones = {};
      const zoneOf = c => c.x0 > CV.SX + 720 && c.y0 < -440 ? '5 site' : c.x0 > CV.SX + 380 && c.y0 < -200 ? '4 geode' : c.y0 > -136 ? '0 level1' : c.y0 > -235 ? '1 crystal' : c.y0 > -350 ? '2 drip' : '3 lake';
      for (const c of b.cave.ch) { const t0 = performance.now(); const r = CV.meshChunk(c.i, c.j, c.k, 1); ms += performance.now() - t0; n++; const by = r.tris ? r.buf.byteLength + r.idx.byteLength : 0; bytes += by; tris += r.tris || 0; if (!r.tris) empty++; const z = zoneOf(c); zones[z] = zones[z] || {n: 0, mb: 0, tris: 0}; zones[z].n++; zones[z].mb += by / 1048576; zones[z].tris += r.tris || 0; }
      for (const k in zones) zones[k].mb = +zones[k].mb.toFixed(1);
      return { n, empty, seconds: +(ms / 1000).toFixed(1), MB: +(bytes / 1048576).toFixed(1), tris, zones }; }''')
    print(json.dumps(r, indent=1))
    b.close()
