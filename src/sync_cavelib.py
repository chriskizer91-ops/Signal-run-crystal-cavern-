# Keep the two copies of CaveLib identical: src/cavelib.js (for Node checks) and the one inside game/signal-run.html.
#   python3 src/sync_cavelib.py check    -> says whether they match
#   python3 src/sync_cavelib.py to-game   -> copies src/cavelib.js into the game file
#   python3 src/sync_cavelib.py from-game -> copies the game's CaveLib out to src/cavelib.js
import sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
GAME, LIB = os.path.join(ROOT, 'game', 'signal-run.html'), os.path.join(ROOT, 'src', 'cavelib.js')
EXPORT = "if (typeof module !== 'undefined') module.exports = CaveLib;"
s = open(GAME, encoding='utf-8').read(); a = s.index('function CaveLib(cfg) {'); b = s.index('\n}\n', a) + 3
game_lib, src_lib = s[a:b], open(LIB, encoding='utf-8').read().replace(EXPORT, '').rstrip() + '\n'
mode = sys.argv[1] if len(sys.argv) > 1 else 'check'
if mode == 'check': print('match' if game_lib == src_lib else 'DIFFERENT')
elif mode == 'to-game': open(GAME, 'w', encoding='utf-8').write(s[:a] + src_lib + s[b:]); print('copied src/cavelib.js into the game')
elif mode == 'from-game': open(LIB, 'w', encoding='utf-8').write(game_lib + EXPORT + '\n'); print('copied the game CaveLib to src/cavelib.js')
