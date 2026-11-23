import os
GAMEDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
GAME = os.path.abspath(os.path.join(GAMEDIR, 'signal-run.html'))
GAMEDIR = os.path.abspath(GAMEDIR)
import asyncio
from playwright.async_api import async_playwright
exec(open('surf.py').read().split('async def main')[0].split('SIM = ')[0])
SIM = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tour.py')).read().split("SIM = '''")[1].split("'''")[0]
exec('async def grab' + open('surf.py').read().split('async def grab')[1].split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        print('v6 ', await grab(b, 'file://' + os.path.join(GAMEDIR, 'versions/signal-run-v6.html') + '?play=new', 's6.png'))
        print('v7 ', await grab(b, 'file://' + GAME + '?play=new', 's7.png'))
        await b.close()
asyncio.run(main())
