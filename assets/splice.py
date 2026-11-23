# put work/<module>.js back into the game file. usage: python3 splice.py <game.html> <module> [<module> ...]
import sys, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = sys.argv[1]; s = open(P, encoding='utf-8').read()
names = ['bridge','camp','campus','marina','plants','power','vehicles']
for n in sys.argv[2:]:
    w = open(os.path.join(HERE, 'modules', '%s.js' % n), encoding='utf-8').read().strip()
    assert w.startswith('window.MODDEF = ') and w.endswith(';'), n
    body = w[len('window.MODDEF = '):-1]
    st = s.index('  "%s": { fn: (function (K) {' % n)
    i = names.index(n)
    if i + 1 < len(names): en = s.index('  "%s": { fn: (function (K) {' % names[i + 1]); tail = ',\n'
    else: en = s.rindex('};', 0, s.index('/* ---------- placed assets: modelled by sub-agents')); tail = '\n'
    s = s[:st] + '  "%s": ' % n + body + tail + s[en:]
    print('spliced', n)
open(P, 'w', encoding='utf-8').write(s)
