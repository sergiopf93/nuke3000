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
      // Controlled fixtures below are browser integration regressions, not the complete-game E2E.
      if(viewport.width===1440&&!process.env.NUKE_MAP_BASELINE_DATA){
        await page.evaluate(()=>{
          G.setup.order=['imp','lib','clt'];G.setup._stepIdx=2;G.setup._inSetup=true;G.setup.deployIdx=0;
          G.setup.soldiersLeft={imp:1,lib:0,clt:0};G.setup.nukesLeft={imp:1,lib:0,clt:0};
          G.factions.imp.mechs=1;G.factions.imp.soldiers=1;G.factions.lib.mechs=G.factions.clt.mechs=0;
          G.territories['01_01'].owner='imp';G.territories['01_01'].soldiers=1;
          setupStep_Deploy_ForFaction('imp');updateMap();
        });
        await page.locator('#tc-01_01').click();await page.locator('#soldier-counter-popup').getByRole('button',{name:'✓ OK',exact:true}).click();
        await page.waitForTimeout(150);await page.locator('#tc-01_01').click();
        await page.locator('#soldier-counter-popup').getByRole('button',{name:'+',exact:true}).last().click();
        await page.locator('#soldier-counter-popup').getByRole('button',{name:'✓ OK',exact:true}).click();
        await page.locator('#tc-01_01').click();
        await page.locator('#game-start-overlay').waitFor();
        assert.deepEqual(await page.evaluate(()=>({soldiers:G.territories['01_01'].soldiers,mechs:G.territories['01_01'].mechs,nuclear:G.territories['01_01'].hasNuclear})),{soldiers:2,mechs:1,nuclear:true});
        await page.locator('#game-start-overlay button').click();
        await page.evaluate(()=>{
          clearInteractionModes();G.setup._inSetup=false;G.awaitingStart=false;G.phase='combat';G_step={currentFk:'imp',isMyTurn:true,phase:'combat',idx:0};
          const a=G.territories['01_01'],b=G.territories['01_02'];Object.assign(a,{owner:'imp',soldiers:4,mechs:1,aircraft:0,scorpions:1});Object.assign(b,{owner:'clt',soldiers:1,mechs:0,aircraft:0,scorpions:0});
          Math.random=()=>0.99;updateStepUI(STEPS.combat[0]);updateMap();
        });
        await page.locator('#tc-01_01').click();await page.locator('#tc-01_02').click();await page.locator('#step-actions #ba-attack').click();
        await page.locator('#combat-guard').selectOption('scorp');await page.locator('#unit-sel-att > button').click();await page.locator('#btn-roll').click();
        assert.deepEqual(await page.evaluate(()=>({owner:G.territories['01_02'].owner,guard:G.territories['01_01'].scorpions,remaining:Battle.count(G.territories['01_01'])})),{owner:'imp',guard:1,remaining:1});
        await page.locator('#btn-cancel').click();
        await page.evaluate(()=>{
          G.phase='prep';G_step={currentFk:'imp',isMyTurn:true,phase:'prep',idx:2};Object.assign(G.territories['01_01'],{soldiers:6,mechs:0,scorpions:0});G.factions.imp.plutonium=10;updateStepUI(STEPS.prep[2]);updateMap();
        });
        await page.locator('#tc-01_01').click();await page.locator('#step-actions button').first().click();await page.locator('#upgrade-cancel').click();
        assert.equal(await page.evaluate(()=>G.territories['01_01'].soldiers),6);
        await page.locator('#step-actions button').first().click();await page.locator('#upgrade-ok').click();
        assert.deepEqual(await page.evaluate(()=>({soldiers:G.territories['01_01'].soldiers,mechs:G.territories['01_01'].mechs,pu:G.factions.imp.plutonium})),{soldiers:3,mechs:1,pu:9});
        await page.evaluate(()=>{
          G_step.idx=4;G.sel=null;Object.assign(G.territories['01_02'],{owner:'clt',soldiers:0,mechs:0,aircraft:2,scorpions:0});G.factions.clt.missiles=0;G.factions.imp.missiles=2;Math.random=()=>0.7;updateStepUI(STEPS.prep[4]);updateMap();
        });
        await page.locator('#step-actions').getByRole('button',{name:'Lanzar',exact:true}).click();await page.locator('#tc-01_02').click();
        await page.locator('#missile-launch').click();await page.locator('[data-missile-target="aircraft"]').click();
        assert.match(await page.locator('#step-actions').innerText(),/1\/5 misiles/);
        assert.equal(await page.evaluate(()=>G.territories['01_02'].aircraft),1);
        await page.locator('#missile-close').click();
        await page.getByRole('button',{name:'⚙ REGLAS',exact:true}).click();
        assert.equal(await page.locator('#rules-modal input:enabled').count(),0);
        await page.locator('#rules-modal').getByRole('button',{name:'CERRAR ▶',exact:true}).click();
        // Decisiones remotas con transporte controlado: UI real, sin Firebase.
        await page.evaluate(()=>{
          G.phase='combat';G_step={currentFk:'clt',phase:'combat',idx:0,isMyTurn:false};
          Object.assign(G.territories['01_02'],{owner:'clt',soldiers:3,mechs:0,aircraft:0,scorpions:0});
          Object.assign(G.territories['01_01'],{owner:'imp',soldiers:2,mechs:1,aircraft:0,scorpions:0});
          window.remoteReplies=[];
        });
        assert.equal(await page.locator('#unit-sel-def').count(),0);
        await page.evaluate(()=>showRemoteDecision({id:'fixture-intercept',turn:currentStepKey(),kind:'intercept',data:{targetId:'01_01',unitType:'mechs'}},async choice=>{remoteReplies.push(choice);document.getElementById('online-decision-modal').remove();return true;}));
        await page.locator('#remote-pass').click();
        assert.deepEqual(await page.evaluate(()=>remoteReplies[0]),{intercept:false});
        console.log('PASS integración Chrome: setup manual, combate/guarnición, mejoras, misil y decisiones remotas por clics (transporte controlado)');
      }

      await page.evaluate(() => {
        G.setup.order=['imp','lib','clt'];
        G.factions.lib.alive=false; G.factions.clt.alive=false;
        checkWinCondition(); checkWinCondition();
      });
      assert.equal(await page.locator('#game-result').count(), 1);
      assert.equal(await page.locator('#phase-badge').innerText(),'FINAL');
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
