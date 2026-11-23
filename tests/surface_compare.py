import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio
from playwright.async_api import async_playwright
exec(open('surf.py').read().split('async def main')[0].split('SIM = ')[0])
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
exec('async def grab' + open('surf.py').read().split('async def grab')[1].split('async def main')[0])
import sys
OLD = sys.argv[1] if len(sys.argv) > 1 else 'signal-run-v9-stalactite-cavern.html'   # the version to compare against
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        print('old', await grab(b, 'file://' + os.path.join(GAMEDIR, 'versions', OLD) + '?play=new', 's_old.png'))
        print('new', await grab(b, 'file://' + GAME + '?play=new', 's_new.png'))
        await b.close()
asyncio.run(main())

from PIL import Image, ImageChops
a = Image.open('s_old.png').convert('RGB'); b = Image.open('s_new.png').convert('RGB'); d = list(ImageChops.difference(a, b).convert('L').get_flattened_data())
print('identical pixels %.1f%%' % (100 * sum(1 for v in d if v < 12) / len(d)))
