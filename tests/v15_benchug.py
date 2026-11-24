# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_benchug.py ../game/versions/signal-run-v14-ancient-site.html ../game/signal-run.html
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
import sys, pathlib
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist'])
    for f in sys.argv[1:]:
        pg = b.new_page(viewport={'width': 320, 'height': 180})
        pg.goto(pathlib.Path(f).resolve().as_uri() + '?bench&at=cave'); pg.wait_for_function('window.__loadMs !== undefined', timeout=180000, polling=100)
        try:
            a = pg.evaluate('''() => { const b = __bench; for (let i = 0; i < 400; i++) b.update(0.033); return [b.cave.under, +b.state.py.toFixed(1), localStorage.getItem('canyon-signal-run-v1') !== null]; }''')
            print(f, 'benchmark mode 13 s underground: [under, height, campaign save written] =', a)
        except Exception as e: print(f, 'ERROR:', str(e).split('\n')[0][:160])
        pg.close()
    b.close()
