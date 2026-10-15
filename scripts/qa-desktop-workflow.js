async browserPage => {
  const context = await browserPage.context().browser().newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  let debugPage, phase = "setup";
  try {
    const page = await context.newPage(), errors = [], cycles = [];
    debugPage = page;
    page.on('pageerror', e => errors.push(e.message));
    const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
    const check = (ok, msg) => { if (!ok) throw Error(msg); };
    const move = async (p, steps = 1) => { const l = (await snap()).layout, box = await page.locator('canvas').boundingBox(); await page.mouse.move(box.x + p.x * box.width / l.width, box.y + p.y * box.height / l.height, { steps }); };
    const click = async p => { await move(p); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(120); };
    const drag = async (a, b, hold = 50) => { await move(a); await page.mouse.down(); await move(b, 15); await page.waitForTimeout(hold); await page.mouse.up(); await page.waitForTimeout(260); };
    const tab = async i => { const l = (await snap()).layout, w = (l.tabs.w - 24) / 5; await click({ x: l.tabs.x + i % 5 * (w + 6) + w / 2, y: l.tabs.y + Math.floor(i / 5) * 44 + 20 }); };
    const tool = async kind => (await snap()).tools.find(t => t.kind === kind);
    await page.goto('http://localhost:5173'); await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene === 'Menu');
    let data = (await snap()).save;
    data.day = 1; data.dayPlan = { day: 1, seed: 42, event: null, vip: null, vipAt: 1, expectedOrders: 6, challenge: { kind: 'served', target: 3, reward: 5000, label: 'Phục vụ 3 khách' } };
    data.upgrades.phins = 4; data.upgrades.seats = 6; data.upgrades.blender = true; data.settings.sound = false; data.settings.music = false;
    await page.evaluate(d => localStorage.setItem('phin-goc-pho:v3', JSON.stringify(d)), data);
    await page.reload(); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Menu');
    await click({ x: 240, y: 679 }); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Game');
    phase = 'wait-customer';
    await page.waitForFunction(() => window.__PHIN_QA__.snapshot().customers.some(c => c.state === 'WAITING'));
    let s = await snap(), customer = s.customers.find(c => c.state === 'WAITING'), r = s.layout.customers;
    const customerPoint = { x: r.x + (customer.seat + 0.5) * r.w / 6, y: r.y + 35 };
    await click(customerPoint); check((await snap()).stations[0].recipeId === customer.recipe, 'Order click selects recipe on the empty station');
    await tab(0); let station = (await snap()).stations[0];
    await drag(await tool('glass'), station); await drag(await tool('phin'), station);
    const spoon = await tool('spoon'), grounds = await tool('grounds');
    await move(spoon); await page.mouse.down(); await move(grounds, 15); await move(station, 15); await page.mouse.up(); await page.waitForTimeout(260);
    check((await snap()).stations[0].drink.grounds === 1, 'Coffee scoop crosses the reflowed grounds jar');
    phase = 'compress';
    await drag(await tool('press'), station, 850);
    check((await snap()).stations[0].drink.state === 'PRESSED', 'Filter compressed');
    phase = 'pour-water';
    await move(await tool('kettle')); await page.mouse.down(); await move(station, 15);
    await page.waitForFunction(() => window.__PHIN_QA__.snapshot().stations[0].drink.water >= 0.99); await page.mouse.up(); await page.waitForTimeout(250);
    await tab(1); await drag(await tool('ice'), station);
    if (customer.recipe === 'sua') {
      await move(await tool('condensed')); await page.mouse.down(); await move(station, 15); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().stations[0].drink.condensed >= 0.98); await page.mouse.up();
    }
    phase = 'wait-brew';
    await page.waitForFunction(() => window.__PHIN_QA__.snapshot().stations[0].drink.state === 'BREWED');
    if (customer.recipe === 'sua') {
      await move(await tool('stir')); await page.mouse.down(); await move({ x: station.x + 23, y: station.y }, 15);
      for (let i = 1; i <= 90; i++) { const angle = i * 0.16; await move({ x: station.x + Math.cos(angle) * 23, y: station.y + Math.sin(angle) * 23 }); }
      await page.mouse.up();
    }
    s = await snap(); check(s.stations[0].evaluation.valid, 'Desktop brewed drink is valid');
    const id = s.stations[0].drink.id;
    await drag(station, s.stations[3]); s = await snap();
    check(s.stations[3].drink?.id === id && !s.stations[0].drink, 'Cup moves directly to station four without changing pages');
    await page.screenshot({ path: 'output/desktop-layout/brewed-station-four.png' });
    await drag(s.stations[3], customerPoint); check((await snap()).session.served === 1, 'Serving uses the desktop customer position');
    await tab(0); station = (await snap()).stations[2]; await drag(await tool('glass'), station);
    const trash = (await snap()).layout.trash; await drag(station, { x: trash.x + trash.w / 2, y: trash.y + trash.h / 2 });
    check(!(await snap()).stations[2].drink, 'Desktop trash accepts the dragged cup');

    // The smallest desktop keeps overflow inside the ingredient column.
    await page.setViewportSize({ width: 1024, height: 640 }); await page.waitForTimeout(300); await tab(9);
    s = await snap(); const beforeY = s.engineTools.find(t => t.id === 'matcha-fresh-milk').y;
    await move({ x: s.layout.tools.x + 100, y: s.layout.tools.y + s.layout.tools.h - 40 }); await page.mouse.wheel(0, 350); await page.waitForTimeout(250);
    s = await snap(); check(s.engineTools.find(t => t.id === 'matcha-fresh-milk').y < beforeY, 'Ingredient column scrolls without moving stations');
    await page.screenshot({ path: 'output/desktop-layout/scrolled-1024.png' });
    await page.setViewportSize({ width: 1366, height: 768 }); await page.waitForTimeout(250);
    s = await snap(); await click({ x: s.layout.width - 52, y: 34 }); await click({ x: s.layout.width / 2, y: s.layout.height / 2 + 151 }); await click({ x: s.layout.width / 2, y: s.layout.height / 2 + 151 });
    await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Menu');
    phase = 'cycles';
    for (let count = 1; count <= 4; count++) {
      data = (await snap()).save; data.upgrades.phins = count;
      await page.evaluate(d => localStorage.setItem('phin-goc-pho:v3', JSON.stringify(d)), data); await page.reload(); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Menu');
      await click({ x: 240, y: 679 }); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Game');
      s = await snap(); check(s.stations.length === count && s.stations.every(t => t.visible), 'Station count ' + count);
      await page.screenshot({ path: `output/desktop-layout/stations-${count}.png` });
      for (let i = 0; i < 10; i++) await tab(i);
      await click({ x: s.layout.width - 52, y: 34 }); await click({ x: s.layout.width / 2, y: s.layout.height / 2 + 151 }); await click({ x: s.layout.width / 2, y: s.layout.height / 2 + 151 });
      await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Menu');
      const menu = (await snap()).diagnostics; cycles.push(menu);
      check(menu.itemSprites === 0 && menu.inputListeners.every(n => n === 0), 'No preparation sprites or drag listeners after shutdown');
      if (count > 1) check(menu.textures === cycles[0].textures && menu.displayObjects === cycles[0].displayObjects, 'Stable menu textures and child count');
    }
    check(errors.length === 0, errors.join('\n'));
    return { result: 'PASS', servedRecipe: customer.recipe, cycles, errors };
  } catch (e) { await debugPage?.screenshot({path:'output/desktop-layout/workflow-failure.png'}); const state = await debugPage?.evaluate(() => window.__PHIN_QA__?.snapshot()); throw Error(phase + ': ' + e.message + ' STATE ' + JSON.stringify(state)); } finally { await context.close(); }
}
