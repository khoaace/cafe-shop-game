async (page) => {
  await page.goto('http://127.0.0.1:5173');
  await page.setViewportSize({ width: 480, height: 800 });
  await page.waitForTimeout(500);
  await page.mouse.click(384, 735);
  await page.waitForTimeout(2200);
  const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
  const check = (value, message) => { if (!value) throw new Error(message); };
  const drag = async (x, y, tx, ty, hold = 100) => {
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(tx, ty, { steps: 12 }); await page.waitForTimeout(hold); await page.mouse.up(); await page.waitForTimeout(120);
  };
  check((await snap()).scene === 'Tutorial', 'Tutorial opens');
  await drag(40, 715, 240, 507);
  check((await snap()).stations[0].drink?.state === 'GLASS', 'Glass snaps into station');
  await drag(120, 715, 240, 507);
  check((await snap()).stations[0].drink.state === 'PHIN', 'Phin attaches');
  await page.mouse.move(200, 715); await page.mouse.down();
  await page.mouse.move(280, 715, { steps: 12 }); await page.waitForTimeout(100);
  await page.mouse.move(240, 507, { steps: 12 }); await page.mouse.up();
  check((await snap()).stations[0].drink.grounds === 1, 'Spoon actually picks up and deposits grounds');
  await drag(360, 715, 240, 507, 850);
  check((await snap()).stations[0].drink.state === 'PRESSED', 'Holding compresses grounds');
  await drag(440, 715, 240, 507, 1950);
  check((await snap()).stations[0].drink.state === 'BREWING', 'Release starts brewing');
  await page.screenshot({path:'output/playwright/brewing.png'});
  await page.mouse.click(242, 656); await drag(240, 715, 240, 507);
  await page.waitForTimeout(8100);
  check((await snap()).stations[0].drink.state === 'BREWED', 'Automatic dripping finishes');
  const before = await snap();
  await page.screenshot({path:'output/playwright/ready.png'});
  await drag(240, 507, 90, 280);
  const after = await snap();
  check(after.session.served === 1, 'Serving grants one reward');
  check(after.stations[0].drink === null, 'Serving frees the station');
  await page.screenshot({path:'output/playwright/served.png'});
  return { before, after };
}
