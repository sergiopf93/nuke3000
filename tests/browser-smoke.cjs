// Integración en navegador con estado de victoria controlado; no es partida E2E completa.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const viewport of [{width:1440,height:900}, {width:844,height:390}]) {
      const context = await browser.newContext({ viewport, serviceWorkers:'block' });
      const origin = `http://127.0.0.1:${server.address().port}`;
      await context.route('**/*', route => {
        const url = route.request().url();
        if (!url.startsWith(origin) && !url.startsWith('data:')) return route.abort();
        if (process.env.NUKE_MAP_BASELINE_DATA && url.endsWith('/js/data.js')) return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(process.env.NUKE_MAP_BASELINE_DATA,'utf8')});
        // No inicializar Firebase: pruebas locales sin tocar producción.
        if (url.endsWith('/js/firebase-config.js')) return route.fulfill({contentType:'text/javascript',body:''});
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(origin);
      await page.locator('#faction-grid [data-f="imp"]').click();
      await page.locator('#pname').fill('QA');
      await page.locator('#btnstart').click();
      assert.equal(await page.locator('[id^="tg-"]').count(), process.env.NUKE_MAP_BASELINE_DATA ? 59 : 60);
      await page.screenshot({path:`/tmp/nuke3000-${viewport.width}-setup.png`});
      await page.evaluate(() => { hideSetupPanel(); G.setup.claimCallback=null; updateMap(); });
      const tag=process.env.NUKE_MAP_BASELINE_DATA ? 'before' : 'after';
      await page.screenshot({path:`/tmp/nuke-map-${tag}-${viewport.width}.png`});
      const geometry=await page.locator('[id^="tg-"]').evaluateAll(els=>Object.fromEntries(els.map(el=>[el.id,el.outerHTML])));
      fs.writeFileSync(`/tmp/nuke-map-${tag}-${viewport.width}.json`,JSON.stringify(geometry));
      if(!process.env.NUKE_MAP_BASELINE_DATA) {
        await page.evaluate(()=>{G.setup._inSetup=false});
        await page.locator('#tc-06_07').click();
        assert.equal(await page.evaluate(()=>G.sel),'06_07');
      }
      await page.evaluate(() => {
        G.setup.order=['imp','lib','clt'];
        G.factions.lib.alive=false; G.factions.clt.alive=false;
        checkWinCondition(); checkWinCondition();
      });
      assert.equal(await page.locator('#game-result').count(), 1);
      assert.match(await page.locator('#game-result').innerText(), /IMPERATORS/);
      assert.equal(await page.evaluate(() => G.gameOver && G.result.winner==='imp'), true);
      await page.screenshot({path:`/tmp/nuke3000-${viewport.width}-result.png`});
      assert.deepEqual(errors, []);
      console.log(`PASS navegador ${viewport.width}x${viewport.height}: lobby, arranque, territorios y cierre controlado sin errores JS`);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(err => { console.error(err); process.exitCode=1; });
