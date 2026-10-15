async browserPage => {
  const context = await browserPage.context().browser().newContext({ viewport: { width: 480, height: 800 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage(), errors = [], rows = [];
    page.on('pageerror', error => errors.push(error.message));
    const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
    const click = async (x, y) => { await page.mouse.click(x, y); await page.waitForTimeout(100); };
    await page.goto('http://localhost:5173'); await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene === 'Menu');
    const data = (await snap()).save;
    data.day = 6; data.dayPlan = null; data.upgrades.blender = true; data.settings.sound = false; data.settings.music = false;
    await page.evaluate(data => localStorage.setItem('phin-goc-pho:v3', JSON.stringify(data)), data);
    await page.reload(); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Menu');
    for (let cycle = 0; cycle < 4; cycle++) {
      await click(240, 679); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Game');
      for (let i = 3; i <= 9; i++) await click(25.8 + i * 47.6, 656);
      const game = (await snap()).diagnostics;
      await click(445, 34); await click(240, 551); await click(240, 551);
      await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Menu');
      const menu = (await snap()).diagnostics;
      rows.push({ cycle, game, menu });
      if (menu.itemSprites || menu.timers || menu.tweens) throw Error('Station sprites or tasks survive scene shutdown');
      if (cycle && ['textures', 'displayObjects', 'objects', 'scaleListeners'].some(key => menu[key] !== rows[0].menu[key])) throw Error('Menu resources grow across scene cycles');
      if (cycle && game.itemSprites !== rows[0].game.itemSprites) throw Error('Station sprite pool grows across scene cycles');
    }
    if (errors.length) throw Error(errors.join('\n'));
    return { result: 'PASS', rows, errors };
  } finally { await context.close(); }
}
