async browserPage => {
  const context = await browserPage.context().browser().newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
    const check = (ok, message) => { if (!ok) throw Error(message); };
    await page.goto('http://localhost:5173');
    await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene === 'Menu');
    const data = (await snap()).save;
    data.day = 6; data.dayPlan = null; data.upgrades.phins = 1; data.upgrades.blender = true;
    data.settings.sound = false; data.settings.music = false;
    await page.evaluate(data => localStorage.setItem('phin-goc-pho:v3', JSON.stringify(data)), data);
    await page.reload(); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Menu');
    const cdp = await context.newCDPSession(page);
    const position = async (x, y) => { const box = await page.locator('canvas').boundingBox(); return { x: box.x + x * box.width / 480, y: box.y + y * box.height / 800 }; };
    const tap = async (x, y) => { const p = await position(x, y); await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(350); };
    const touch = async (type, x = 0, y = 0) => {
      const p = await position(x, y);
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ ...p, id: 1, radiusX: 5, radiusY: 5, force: 1 }] });
    };
    const drag = async (x, y, tx, ty, cancel = false) => {
      await touch('touchStart', x, y);
      for (let i = 1; i <= 12; i++) { await touch('touchMove', x + (tx - x) * i / 12, y + (ty - y) * i / 12); await page.waitForTimeout(10); }
      await touch(cancel ? 'touchCancel' : 'touchEnd'); await page.waitForTimeout(260);
    };
    const tab = i => tap(25.8 + i * 47.6, 656);
    await tap(240, 679); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Game');
    let recipeIndex = 0;
    // Set up the recipe through the book; ingredient interactions below use touch.
    const selectRecipe = async index => {
      const click = async (x, y) => { const p = await position(x, y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(150); };
      const ids = ['den','sua','bac','trung','muoi','cotdua','tratac','tradao','travai','cacao','matcha'];
      recipeIndex = ids.indexOf((await snap()).stations[0].recipeId);
      await click(240, 433);
      const pageDelta = (Math.floor(index / 4) - Math.floor(recipeIndex / 4) + 3) % 3;
      if (pageDelta) await click(pageDelta === 1 ? 423 : 57, 275);
      await click(80 + index % 4 * 107, 231); await click(240, 615); recipeIndex = index;
      check((await snap()).stations[0].recipeId === ids[index], 'Recipe setup: '+JSON.stringify((await snap()).stations));
      await tab(0); await drag(40, 715, 240, 517);
      check(!!(await snap()).stations[0].drink, 'Touch glass placement');
    };
    const captures = [];
    for (let i = 3; i <= 9; i++) {
      await tab(i); const file = `output/playwright/expanded-touch-tab-${i}.png`; await page.screenshot({ path: file }); captures.push(file);
    }

    await selectRecipe(8); await tab(7);
    const lycheeBefore = (await snap()).session.ingredients.remaining.lychee;
    await drag(238, 715, 240, 604, true);
    check((await snap()).session.ingredients.remaining.lychee === lycheeBefore, 'Touch cancellation returns held lychee');
    await drag(238, 715, 240, 517);
    check((await snap()).stations[0].drink.preparation.amounts.lychee === 1, 'Touch scoop drops one fruit: ' + JSON.stringify({ stations: (await snap()).stations, toast: (await snap()).toast }));
    check((await snap()).session.ingredients.remaining.lychee === lycheeBefore - 0.25, 'Fruit charged once');
    await page.screenshot({ path: 'output/playwright/expanded-touch-lychee-dropped.png' });
    await drag(240, 517, 441, 613);

    await selectRecipe(9); await tab(8);
    const cacaoBefore = (await snap()).session.ingredients.remaining.cacao;
    await drag(210, 715, 240, 604, true);
    check((await snap()).session.ingredients.remaining.cacao === cacaoBefore, 'Cancelled cocoa scoop returns powder');
    await drag(210, 715, 240, 517);
    check((await snap()).stations[0].drink.preparation.amounts.cacao === 5, 'Cocoa spoon drops exact grams');
    await page.screenshot({ path: 'output/playwright/expanded-touch-cacao-dropped.png' });
    await drag(240, 517, 441, 613);

    await selectRecipe(7); await tab(6);
    const peachBefore = (await snap()).session.ingredients.remaining.peach;
    await drag(316, 715, 240, 517);
    check((await snap()).stations[0].drink.preparation.amounts.peach === 1, 'New tongs transfer peach through touch');
    check((await snap()).session.ingredients.remaining.peach === peachBefore - 0.25, 'Peach charged once');
    await page.screenshot({ path: 'output/playwright/expanded-touch-peach-dropped.png' });
    check((await snap()).engine.active === 0 && errors.length === 0, 'No stuck touch gestures or JS errors');
    await cdp.detach();
    return { result: 'PASS', captures, errors, final: await snap() };
  } finally { await context.close(); }
}
