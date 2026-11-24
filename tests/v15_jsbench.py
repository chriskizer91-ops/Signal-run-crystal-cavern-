# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_jsbench.py ../game/versions/signal-run-v14-ancient-site.html ../game/signal-run.html
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
# Script (CPU) time per frame with the drawing itself switched off, so frames run at full speed and only the game's own
# per-frame work is timed. Two windows: the first 20 s (v14 is still building every cavern then) and after 100 s (settled).
import sys, json, time, pathlib, collections
from playwright.sync_api import sync_playwright
ARGS = ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist']
STUB = '''() => { const gl = document.getElementById('c').getContext('webgl2'); for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'blitFramebuffer', 'clear']) gl[k] = () => {};
  window.__fr = 0; const tick = () => { window.__fr++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }'''
def window(pg, cdp, secs):
    m0 = {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
    cdp.send('Profiler.start'); f0 = pg.evaluate('window.__fr'); time.sleep(secs)
    prof = cdp.send('Profiler.stop')['profile']; f1 = pg.evaluate('window.__fr'); m1 = {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
    nodes = {n['id']: n for n in prof['nodes']}; us = collections.Counter()
    for sid, d in zip(prof['samples'], prof['timeDeltas']):
        n = nodes[sid]['callFrame']; us[n['functionName'] or '(anon:%d)' % n['lineNumber']] += d
    fr = max(1, f1 - f0); js = sum(v for k, v in us.items() if k not in ('(idle)', '(program)', '(garbage collector)'))
    top = ', '.join('%s %.2f' % (k[:16], v / fr / 1000) for k, v in us.most_common(7) if k not in ('(idle)', '(program)'))
    return '%4d frames (%.0f/s) | script %.2f ms/frame + clean-up (GC) %.2f | layouts/frame %.2f | top: %s' % (fr, fr / secs, js / fr / 1000, us['(garbage collector)'] / fr / 1000, (m1['LayoutCount'] - m0['LayoutCount']) / fr, top)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    for f in sys.argv[1:3]:
        for at in sys.argv[3:]:
            pg = b.new_page(viewport={'width': 480, 'height': 270})
            pg.goto(pathlib.Path(f).resolve().as_uri() + '?play=freenew' + ('' if at == 'surface' else '&at=' + at), timeout=180000); pg.wait_for_function('window.__loadMs !== undefined', timeout=180000, polling=100)
            pg.evaluate(STUB); cdp = pg.context.new_cdp_session(pg); cdp.send('Performance.enable'); cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 250})
            time.sleep(2); print('%s %-8s first 20 s : %s' % (f[-8:-5], at, window(pg, cdp, 20)), flush=True)
            time.sleep(80); print('%s %-8s settled    : %s' % (f[-8:-5], at, window(pg, cdp, 15)), flush=True)
            pg.close()
    b.close()
