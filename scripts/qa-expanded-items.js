async browserPage => {
  const context = await browserPage.context().browser().newContext({ viewport: { width: 480, height: 800 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  try {
  const errors = [], failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const shot = name => page.screenshot({ path: `output/playwright/expanded-${name}.png`, clip: { x: 0, y: 638, width: 480, height: 162 } });
  const drag = async (x, y, tx, ty) => { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(220); };
  const tab = async i => { await page.mouse.click(25.8 + i * 47.6, 656); await page.waitForTimeout(130); };
  const pour = async (x, y, tx, ty, condition) => {
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(tx - 24, ty, { steps: 12 }); await page.mouse.move(tx + 24, ty, { steps: 12 });
    await page.waitForFunction(condition, undefined, { timeout: 10000 }); await page.mouse.up(); await page.waitForTimeout(220);
  };
  await page.goto('http://localhost:5173');
  await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene === 'Menu');
  const data = (await snap()).save;
  data.day = 6; data.dayPlan = null; data.upgrades.phins = 2; data.upgrades.blender = true;
  data.settings.sound = false; data.settings.music = false;
  for (const name of Object.keys(data.inventory)) data.inventory[name] *= 10;
  await page.evaluate(data => localStorage.setItem('phin-goc-pho:v3', JSON.stringify(data)), data);
  await page.reload(); await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene === 'Menu');
  await page.mouse.click(240, 679); await page.waitForFunction(() => window.__PHIN_QA__.snapshot().scene === 'Game');
  const names = ['salt', 'coconut', 'tratac', 'tradao', 'travai', 'cacao', 'matcha'];
  for (let i = 0; i < names.length; i++) { await tab(i + 3); await shot(names[i]); }

  await tab(3);
  await pour(267, 716, 64, 727, () => window.__PHIN_QA__.snapshot().saltedCream.amounts.cream >= 39.5);
  await drag(325, 716, 64, 727); await drag(325, 716, 64, 727);
  await page.mouse.move(383, 716); await page.mouse.down(); await page.mouse.move(89, 727, { steps: 12 });
  for (let i = 1; i <= 200; i++) {
    const angle = i * Math.PI / 20;
    await page.mouse.move(64 + Math.cos(angle) * 25, 727 + Math.sin(angle) * 25);
    if ((await snap()).saltedCream.stage === 'PERFECT CREAM') break;
  }
  await page.mouse.up(); await page.waitForTimeout(220);
  check((await snap()).saltedCream.stage === 'PERFECT CREAM', 'Circular whisking still reaches perfect cream');
  await shot('salt-foam');

  await tab(4); await drag(128, 738, 52, 722);
  check((await snap()).coconut.docked, 'New jar docks using the original hit area');
  await pour(268, 716, 52, 722, () => window.__PHIN_QA__.snapshot().coconut.state.amounts.coconutCream >= 59);
  await pour(324, 716, 52, 722, () => window.__PHIN_QA__.snapshot().coconut.state.amounts.condensed >= 0.37);
  await drag(380, 716, 52, 722); await drag(380, 716, 52, 722);
  await drag(190, 748, 52, 688);
  await page.mouse.move(52, 776); await page.mouse.down();
  await page.waitForFunction(() => window.__PHIN_QA__.snapshot().coconut.stage === 'PERFECT', undefined, { timeout: 10000 });
  await page.mouse.up(); await page.waitForTimeout(220); await shot('coconut-blended');

  await tab(5); await drag(256, 715, 52, 726); check((await snap()).tratac.fruits === 2, 'Whole kumquats placed');
  await page.mouse.move(32, 726); await page.mouse.down(); await page.waitForTimeout(25); await page.mouse.move(76, 726); await page.mouse.up(); await page.waitForTimeout(250);
  check((await snap()).tratac.sliced, 'Kumquat slices switch artwork'); await shot('tratac-sliced');
  await drag(52, 726, 124, 722); check((await snap()).tratac.inSqueezer, 'Halves move to reamer');
  await page.mouse.move(124, 722); await page.mouse.down();
  for (let i = 0; i < 16; i++) await page.mouse.move(124 + (i % 2 ? -20 : 20), 722, { steps: 3 });
  await page.mouse.up(); await page.waitForTimeout(220);
  check((await snap()).tratac.amounts.citrusJuice >= 19, 'Squeezing fills transparent measuring jug'); await shot('tratac-juice');

  await tab(6); await drag(226, 715, 36, 718);
  await page.mouse.move(20, 718); await page.mouse.down(); await page.waitForTimeout(25); await page.mouse.move(57, 718); await page.mouse.up(); await page.waitForTimeout(200);
  check((await snap()).tradao.orangeSliced, 'Orange cutting uses the new wheel');
  await drag(271, 715, 48, 738); check((await snap()).tradao.lemongrassOnBoard, 'Lemongrass placed on board'); await page.mouse.move(29, 738); await page.mouse.down();
  for (let i = 0; i < 12; i++) await page.mouse.move(48 + (i % 2 ? -16 : 16), 738, { steps: 3 });
  await page.mouse.up(); await page.waitForTimeout(200); check((await snap()).tradao.lemongrassPrepared, 'Rolling switches to bruised stalk artwork'); await shot('tradao-prepared');

  await tab(9); const stockBefore = (await snap()).session.ingredients.remaining.matcha;
  await drag(208, 715, 240, 605);
  check((await snap()).session.ingredients.remaining.matcha === stockBefore, 'Cancelled powder drag refunds stock');
  await drag(208, 715, 112, 726); await drag(208, 715, 112, 726);
  check((await snap()).matcha.amounts.matcha === 4, 'Bamboo scoop transfers exact amount');
  await shot('matcha-powder');
  await pour(258, 715, 112, 726, () => window.__PHIN_QA__.snapshot().matcha.amounts.water >= 39);
  await page.mouse.move(308, 715); await page.mouse.down(); await page.mouse.move(112, 726, { steps: 12 });
  for (let i = 0; i < 24; i++) { await page.mouse.move(99, 716, { steps: 2 }); await page.mouse.move(108, 735, { steps: 2 }); await page.mouse.move(117, 716, { steps: 2 }); await page.mouse.move(126, 735, { steps: 2 }); }
  await page.mouse.up(); await page.waitForTimeout(220); await shot('matcha-whisked');
  check((await snap()).matcha.whiskProgress > 0, 'New chasen still records W gestures');

  // Warm all sprite pools before checking repeated tab switches and resizes.
  const baseline = (await snap()).diagnostics;
  for (let loop = 0; loop < 4; loop++) for (let i = 0; i < names.length; i++) await tab(i + 3);
  const after = (await snap()).diagnostics;
  check(after.textures === baseline.textures && after.itemSprites === baseline.itemSprites, 'Tab switches reuse textures and sprite children');
  for (const [width, height] of [[360, 800], [390, 844], [1440, 900], [480, 800]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
    const box = await page.locator('canvas').boundingBox();
    await page.mouse.click(box.x + box.width * (25.8 + 5 * 47.6) / 480, box.y + box.height * 656 / 800);
    await page.screenshot({ path: `output/playwright/expanded-resize-${width}.png` });
  }
  check(errors.length === 0 && failures.length === 0, JSON.stringify({ errors, failures }));
  const result = { result: 'PASS', desktop: names, baseline, after, errors, failures, final: await snap() };
  return result;
  } finally { await context.close(); }
}
