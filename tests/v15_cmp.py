# v15 test (see docs/signal-run-engine-handoff.md, the v15 section). Run from tests/, passing the game file(s) to check, e.g.
#   python3 v15_cmp.py surface mine cave cavern drip lake ledge chamber   (after v15_snap.py has run for v14 and v15)
# Pictures and logs go to tests/out/ (git-ignored).
import os; os.makedirs('out', exist_ok=True)
import sys
from PIL import Image, ImageChops
for at in sys.argv[1:]:
    try: a = Image.open('out/v14_%s.png' % at).convert('RGB'); b = Image.open('out/v15_%s.png' % at).convert('RGB')
    except FileNotFoundError: print(at, 'not ready'); continue
    d = ImageChops.difference(a, b); px = a.size[0] * a.size[1]; g = d.convert('L'); h = g.histogram()
    diff = px - h[0]; big = sum(h[9:]); print('%-8s %dx%d  identical pixels %.3f%%  (differ at all: %d, differ by more than 8/255: %d, biggest difference %d)' % (at, a.size[0], a.size[1], 100 * (px - diff) / px, diff, big, max(i for i, v in enumerate(h) if v)))
    if diff: d.point(lambda v: min(255, v * 20)).save('out/diff_%s.png' % at)
