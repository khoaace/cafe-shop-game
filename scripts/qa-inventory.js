async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const fixture = { version: 3, day: 3, balance: 100000, upgrades: { phins: 2, seats: 3 }, inventory: { coffee: 10, condensed: 6, milk: 6, egg: 4, ice: 12 }, settings: { sound: false, music: false, reducedMotion: false } };
  const logical = async (x, y) => {
    const box = await page.locator('canvas').boundingBox();
    return { x: box.x + x * box.width / 480, y: box.y + y * box.height / 800 };
  };
  const tap = async (x, y) => { const p = await logical(x, y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(100); };
  const drag = async (x, y, tx, ty) => {
    const from = await logical(x, y), to = await logical(tx, ty);
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(100);
  };
  await page.goto('http://127.0.0.1:5175');
  await page.evaluate(data => { localStorage.clear(); localStorage.setItem('phin-goc-pho:v3', JSON.stringify(data)); }, fixture);
  const sizes = [[360, 800], [390, 844], [430, 932], [480, 800], [1440, 900]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height }); await page.reload(); await page.waitForTimeout(500);
    await tap(106, 735); await tap(345, 169);
    await page.screenshot({ path: `output/playwright/inventory-shop-${width}x${height}.png` });
  }
  await page.setViewportSize({ width: 480, height: 800 }); await page.reload(); await page.waitForTimeout(400); await tap(106, 735); await tap(345, 169);
  const buy = await logical(389, 230); await page.mouse.dblclick(buy.x, buy.y); await page.waitForTimeout(500);
  let save = await page.evaluate(() => JSON.parse(localStorage.getItem('phin-goc-pho:v3')));
  if (save.inventory.coffee !== 20 || save.balance !== 80000 || save.stats.ingredientExpenses !== 20000) throw Error(`Double purchase was not guarded: ${JSON.stringify(save)}`);
  await tap(351, 731); await page.waitForTimeout(700);
  await drag(40, 715, 126, 517); await drag(120, 715, 126, 517);
  const spoon = await logical(200, 715), jar = await logical(280, 715), station = await logical(126, 517);
  await page.mouse.move(spoon.x, spoon.y); await page.mouse.down(); await page.mouse.move(jar.x, jar.y, { steps: 6 }); await page.mouse.move(station.x, station.y, { steps: 8 }); await page.mouse.up();
  await tap(242, 656); await drag(240, 715, 126, 517); await drag(126, 517, 441, 613);
  let snapshot = await page.evaluate(() => window.__PHIN_QA__.snapshot());
  if (snapshot.session.ingredients.used.coffee !== 1 || snapshot.session.ingredients.used.ice !== 1 || snapshot.stations[0].drink !== null) throw Error(`Physical consumption/discard failed: ${JSON.stringify(snapshot.session.ingredients)}`);
  save = await page.evaluate(() => JSON.parse(localStorage.getItem('phin-goc-pho:v3')));
  if (save.inventory.coffee !== 20 || save.inventory.ice !== 12) throw Error('Mid-shift consumption leaked into checkpoint');
  await page.reload(); await page.waitForTimeout(400); await tap(240, 679); await page.waitForTimeout(500);
  snapshot = await page.evaluate(() => window.__PHIN_QA__.snapshot());
  if (snapshot.session.ingredients.remaining.coffee !== 20 || snapshot.session.ingredients.remaining.ice !== 12) throw Error('Reload did not restore opening pantry');
  const empty = { ...fixture, balance: 0, inventory: { coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 0 }, dayPlan: { day: 3, seed: 9, event: null, vip: null, vipAt: 1, expectedOrders: 6, challenge: { kind: 'served', target: 3, reward: 10000, label: 'Phục vụ 3 khách' } } };
  await page.evaluate(data => localStorage.setItem('phin-goc-pho:v3', JSON.stringify(data)), empty); await page.reload(); await page.waitForTimeout(400); await tap(240, 679); await page.waitForTimeout(700);
  const status = await page.locator('#accessible-status').textContent(); save = await page.evaluate(() => JSON.parse(localStorage.getItem('phin-goc-pho:v3')));
  if (!status.includes('hết nguyên liệu') || save.day !== 4 || save.stats.lost !== 0) throw Error(`Stockout closing failed: ${status}`);
  await page.screenshot({ path: 'output/playwright/inventory-stockout-summary.png' });
  if (errors.length) throw Error(JSON.stringify(errors));
  return { result: 'PASS', viewports: sizes, migratedSave: save.version, stockoutDay: save.day, errors };
}
