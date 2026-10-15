async browserPage => {
  const context = await browserPage.context().browser().newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage(), errors = [], failed = [], captures = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) failed.push(r.url()); });
    const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
    const check = (ok, msg) => { if (!ok) throw Error(msg); };
    const shot = async name => { const path = `output/desktop-layout/${name}.png`; await page.screenshot({ path }); captures.push(path); };
    const move = async (x, y, steps = 1) => { const s = await snap(), b = await page.locator('canvas').boundingBox(); await page.mouse.move(b.x + x * b.width / s.layout.width, b.y + y * b.height / s.layout.height, { steps }); };
    const click = async (x, y) => { await move(x, y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(140); };
    const drag = async (a, b, hold = 60) => { await move(a.x, a.y); await page.mouse.down(); await move(b.x, b.y, 14); await page.waitForTimeout(hold); await page.mouse.up(); await page.waitForTimeout(260); };
    const tab = async i => { const l = (await snap()).layout, w = (l.tabs.w - 24) / 5; await click(l.tabs.x + i % 5 * (w + 6) + w / 2, l.tabs.y + Math.floor(i / 5) * 44 + 20); };
    const legacy = async kind => (await snap()).tools.find(t => t.kind === kind);
    const tool = async id => (await snap()).engineTools.find(t => t.id === id && t.enabled);
    const target = async id => (await snap()).targets.find(t => t.id === id);
    const pour = async (id, to, scale, predicate) => { const from = await tool(id); await move(from.x, from.y); await page.mouse.down(); await move(to.x - 26 * scale, to.y, 14); await move(to.x + 26 * scale, to.y, 12); await page.waitForFunction(predicate, undefined, { timeout: 12000 }); await page.mouse.up(); await page.waitForTimeout(250); };
    const start = async (count = 4, day = 6) => {
      await page.goto('http://localhost:5173'); await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene === 'Menu');
      const data = (await snap()).save;
      data.day = day; data.dayPlan = { day, seed: 42, event: null, vip: null, vipAt: 1, expectedOrders: 7, challenge: { kind: 'served', target: 3, reward: 5000, label: 'Phục vụ 3 khách' } };
      data.upgrades.phins = count; data.upgrades.seats = 6; data.upgrades.blender = true; data.settings.sound = false; data.settings.music = false;
      await page.evaluate(d => localStorage.setItem('phin-goc-pho:v3', JSON.stringify(d)), data);
      await page.reload(); await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene === 'Menu');
      await click(240, 679); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Game');
    };
    await start();
    let s = await snap(); check(s.layout.desktop && s.stations.every(t => t.visible), 'All four desktop stations visible');
    for (let i = 0; i < 4; i++) { await tab(0); await drag(await legacy('glass'), (await snap()).stations[i]); }
    check((await snap()).stations.every(s => s.drink), 'Each visible station receives a glass');
    await shot('four-cups-1440');
    for (let i = 0; i < 10; i++) { await tab(i); await shot(`tray-${i}-1440`); }
    await tab(3);
    const scale = Math.min(s.layout.preparation.w / 238, s.layout.preparation.h / 120), bowl = await target('salted-cream-bowl');
    await pour('salt-cream-jug', bowl, scale, () => window.__PHIN_QA__.snapshot().saltedCream.amounts.cream >= 39);
    await drag(await tool('salt-measure'), bowl); await drag(await tool('salt-measure'), bowl);
    await move((await tool('salt-whisk')).x, (await tool('salt-whisk')).y); await page.mouse.down(); await move(bowl.x + 25 * scale, bowl.y, 14);
    for (let i = 1; i <= 200; i++) { const a = i * Math.PI / 20; await move(bowl.x + Math.cos(a) * 25 * scale, bowl.y + Math.sin(a) * 25 * scale); if ((await snap()).saltedCream.stage === 'PERFECT CREAM') break; }
    await page.mouse.up(); await page.waitForTimeout(200); check((await snap()).saltedCream.stage === 'PERFECT CREAM', 'Scaled bowl preserves circular whisking'); await shot('cream-perfect');

    await tab(4); let dock = await target('coconut-dock'); await drag(await tool('blender-jar-dock'), dock);
    check((await snap()).coconut.docked, 'Transformed jar docks');
    await pour('coconut-cream-tin', await target('coconut-blender'), scale, () => window.__PHIN_QA__.snapshot().coconut.state.amounts.coconutCream >= 59);
    await drag(await tool('blender-lid'), { x: dock.x, y: dock.y - 35 * scale });
    check((await snap()).coconut.lid, 'Transformed lid attaches');
    const sw = await tool('blender-switch'); await move(sw.x, sw.y); await page.mouse.down(); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().coconut.stage === 'PERFECT', undefined, { timeout: 10000 }); await page.mouse.up(); await shot('blender-perfect');

    await tab(5); const board = await target('tratac-board'), sq = await target('tratac-squeezer'); const ts = Math.min(s.layout.preparation.w / 234, s.layout.preparation.h / 120);
    await drag(await tool('tratac-kumquat'), board); await move(board.x - 22 * ts, board.y); await page.mouse.down(); await page.waitForTimeout(25); await move(board.x + 22 * ts, board.y); await page.mouse.up(); await page.waitForTimeout(250);
    check((await snap()).tratac.sliced, 'Scaled board recognizes slicing');
    await drag({ x: board.x, y: board.y }, sq); await move(sq.x, sq.y); await page.mouse.down();
    for (let i = 0; i < 16; i++) await move(sq.x + (i % 2 ? -20 : 20) * ts, sq.y, 3);
    await page.mouse.up(); await page.waitForTimeout(250); check((await snap()).tratac.amounts.citrusJuice >= 19, 'Scaled squeezing fills the measuring cup'); await shot('citrus-prepared');

    await tab(9); const mb = await target('matcha-bowl'), ms = Math.min(s.layout.preparation.w / 186, s.layout.preparation.h / 120);
    await drag(await tool('matcha-powder-spoon'), mb); await drag(await tool('matcha-powder-spoon'), mb);
    await pour('matcha-warm-kettle', mb, ms, () => window.__PHIN_QA__.snapshot().matcha.amounts.water >= 39);
    const ch = await tool('matcha-bamboo-whisk'); await move(ch.x, ch.y); await page.mouse.down(); await move(mb.x, mb.y, 12);
    for (let i = 0; i < 18; i++) for (const [x, y] of [[-13, -10], [-4, 9], [5, -10], [14, 9]]) await move(mb.x + x * ms, mb.y + y * ms, 2);
    await page.mouse.up(); check((await snap()).matcha.whiskProgress > 0.9, 'Scaled W gesture reaches microfoam'); await shot('matcha-prepared');

    const originalIds = (await snap()).stations.map(s => s.drink.id), results = [];
    for (const [width, height] of [[1024, 640], [1280, 720], [1366, 768], [1920, 1080], [2560, 1440], [390, 844], [1440, 900]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(350);
      s = await snap(); check(s.stations.map(s => s.drink.id).join() === originalIds.join(), 'Resize preserves all cup IDs');
      if (width >= 1024) { check(s.stations.every(s => s.visible), 'All desktop stations remain visible'); const b = await page.locator('canvas').boundingBox(); check(Math.abs(b.width - width) < 2 && Math.abs(b.height - height) < 2, 'Desktop canvas fills viewport'); }
      results.push({ width, height, render: s.render, diagnostics: s.diagnostics }); await shot(`resize-${width}`);
    }
    const resizeTool = await tool('matcha-bamboo-whisk');
    await move(resizeTool.x, resizeTool.y); await page.mouse.down();
    check((await snap()).engine.active === 1, 'Drag begins before resize');
    await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(300);
    check((await snap()).engine.active === 0, 'Resize cancels active preparation drag');
    await page.mouse.up(); await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);
    s = await snap(); await click(s.stations[0].geometry.rect.x + s.stations[0].geometry.rect.w / 2, s.stations[0].geometry.rect.y + 22); await shot('book-1440');
    await page.setViewportSize({ width: 1024, height: 640 }); await page.waitForTimeout(300); await shot('book-1024');
    check((await snap()).paused, 'Book survives breakpoint-aware resize');
    await page.keyboard.press('Escape'); await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);
    s = await snap(); await click(s.layout.width - 52, 34); await shot('pause-1440'); await page.keyboard.press('Escape');
    check(errors.length === 0 && failed.length === 0, JSON.stringify({ errors, failed }));
    return { result: 'PASS', results, captures, errors, failed, final: await snap() };
  } finally { await context.close(); }
}
