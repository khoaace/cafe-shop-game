async (page) => {
  await page.goto('http://127.0.0.1:5173'); await page.setViewportSize({width:480,height:800});
  await page.waitForTimeout(400); await page.mouse.click(384,735); await page.waitForTimeout(2100);
  const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
  const check = (v, m) => { if (!v) throw new Error(m); };
  const drag = async (x,y,tx,ty,hold=50) => {
    await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(tx,ty,{steps:8});
    await page.waitForTimeout(hold); await page.mouse.up(); await page.waitForTimeout(80);
  };
  const balanceBefore = (await snap()).save.balance;
  for (let cup=0; cup<3; cup++) {
    await page.mouse.click(80,656);
    await drag(40,715,240,517); await drag(120,715,240,517);
    await page.mouse.move(200,715); await page.mouse.down(); await page.mouse.move(280,715,{steps:8});
    await page.mouse.move(240,517,{steps:8}); await page.mouse.up();
    await drag(360,715,240,517,750); await drag(440,715,240,517,1980);
    await page.mouse.click(242,656); await drag(240,715,240,517);
    if (cup === 0) {
      // Book pauses the independent model clocks while a phin is active.
      await page.mouse.click(375,34); const paused = await snap(); await page.waitForTimeout(1000);
      const later = await snap(); check(paused.paused, 'Book pauses game');
      check(paused.session.elapsed === later.session.elapsed, 'Day clock paused');
      check(paused.stations[0].drink.brewElapsed === later.stations[0].drink.brewElapsed, 'Brew paused');
      await page.screenshot({path:'output/playwright/recipe-book.png'});
      await page.mouse.click(419,145);
    }
    await page.waitForFunction(() => window.__PHIN_QA__.snapshot().stations[0].drink.state === 'BREWED', null,{timeout:12000});
    const state = await snap(); const customer = state.customers.find(c=>c.state==='WAITING');
    check(customer, 'Customer waiting');
    await drag(240,517,[90,240,390][customer.seat],280);
    if (cup<2) check((await snap()).session.served === cup+1, 'Exactly one reward per serve');
  }
  await page.waitForTimeout(200);
  const final = await snap(); check(final.scene === 'Summary', 'Tutorial ends after three customers');
  check(final.save.tutorialDone, 'Tutorial completion persists'); check(final.save.balance===balanceBefore, 'Practice does not inflate balance');
  await page.screenshot({path:'output/playwright/tutorial-complete.png'});
  return {result:'PASS: three physical brews, book pause, tutorial summary, save isolation',final};
}
