# add (or replace) new model groups in the game's ASSET_DEFS. usage: python3 splice_add.py <game.html> <module> [...]
import sys, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = sys.argv[1]; s = open(P, encoding='utf-8').read()
for n in sys.argv[2:]:
    w = open(os.path.join(HERE, 'modules', '%s.js' % n), encoding='utf-8').read().strip()
    assert w.startswith('window.MODDEF = ') and w.endswith(';'), n
    body = w[len('window.MODDEF = '):-1]
    key = '  "%s": { fn: (function (K) {' % n
    end = s.rindex('};', 0, s.index('/* ---------- placed assets: modelled by sub-agents'))
    if key in s:                                   # replace an earlier copy: it runs up to the next module or the end
        st = s.index(key); nxt = s.find('\n  "', st + len(key)); en = nxt + 1 if 0 <= nxt < end else end
        s = s[:st] + '  "%s": ' % n + body + (',\n' if en != end else '\n') + s[en:]
        print('replaced', n)
    else:
        pre = s[:end].rstrip()
        s = pre + (',' if not pre.endswith(',') else '') + '\n  "%s": ' % n + body + '\n' + s[end:]
        print('added', n)
open(P, 'w', encoding='utf-8').write(s)
