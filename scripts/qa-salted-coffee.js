async page => {
  await page.goto('http://127.0.0.1:5189'); await page.setViewportSize({width:480,height:800});
  await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene === 'Menu');
  const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
  const check = (v, message) => { if (!v) throw new Error(message); };
  const data = (await snap()).save; data.day=4; data.dayPlan=null; data.upgrades.phins=2;
  data.dayPlan={day:4,seed:10,event:null,vip:null,vipAt:1,expectedOrders:6,challenge:{kind:'served',target:3,reward:5000,label:'Phục vụ 3 khách'}};
  data.inventory={coffee:3,condensed:1,milk:0,egg:0,cream:40,salt:0.3,ice:3};
  await page.evaluate(data=>localStorage.setItem('phin-goc-pho:v3',JSON.stringify(data)),data);
  await page.reload(); await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene==='Menu');
  const drag=async(x,y,tx,ty,hold=70)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:15});await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(250);};
  await page.mouse.click(240,679); await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().scene==='Game'); await page.waitForTimeout(200); await page.mouse.click(354,433); await page.waitForTimeout(150); await page.mouse.click(423,275); await page.waitForTimeout(150); await page.mouse.click(240,615); await page.waitForTimeout(150);
  check((await snap()).stations[1].recipeId==='muoi','Recipe selected through book');
  // Independent original and salted phins, all brewed with physical gestures.
  for (const x of [126,354]) {
    await drag(40,715,x,517);await drag(120,715,x,517);
    await page.mouse.move(200,715);await page.mouse.down();await page.mouse.move(280,715,{steps:12});await page.mouse.move(x,517,{steps:15});await page.mouse.up();await page.waitForTimeout(250);
    await drag(360,715,x,517,740);await drag(440,715,x,517,1950);
  }
  await page.mouse.click(181,656);await page.waitForTimeout(150);await drag(240,715,126,517);await drag(240,715,354,517);await drag(56,715,354,517,1570);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[0].drink.state==='BREWED');
  await drag(126,517,90,280);check((await snap()).session.served===1,'Original black coffee still served');
  await page.mouse.click(421,656);await page.waitForTimeout(150);
  // Cream pour starts only after entering the bowl and moving right to tilt.
  await page.mouse.move(267,715);await page.mouse.down();await page.mouse.move(40,727,{steps:15});await page.mouse.move(88,727,{steps:12});
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().saltedCream.amounts.cream >= 39.5);await page.mouse.up();await page.waitForTimeout(260);
  const amount = (await snap()).saltedCream.amounts.cream;
  await drag(325,715,64,727);await drag(325,715,64,727);
  check(Math.abs((await snap()).saltedCream.amounts.salt-0.3)<0.001,'Two measuring spoons add 0.3g exactly');
  await page.mouse.move(383,715);await page.mouse.down();await page.mouse.move(89,727,{steps:15});await page.waitForTimeout(650);
  check((await snap()).saltedCream.whipping===0,'Stationary hold produces no progress');
  for (let i=1;i<=165;i++) {const angle=i*Math.PI/20;await page.mouse.move(64+Math.cos(angle)*25,727+Math.sin(angle)*25);await page.waitForTimeout(13);if((await snap()).saltedCream.stage==='PERFECT CREAM')break;}
  await page.mouse.up();await page.waitForTimeout(260); const cream=(await snap()).saltedCream;
  check(cream.stage==='PERFECT CREAM','Actual circular motion reaches Perfect zone');
  await page.screenshot({path:'output/playwright/phase10-perfect-cream.png'});
  await page.mouse.move(441,715);await page.mouse.down();await page.mouse.move(330,517,{steps:15});await page.mouse.move(378,517,{steps:12});
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[1].drink.preparation.amounts.brewedCoffee>=0.98);await page.mouse.up();await page.waitForTimeout(260);
  const stock=(await snap()).session.ingredients.remaining;
  await page.mouse.move(64,727);await page.mouse.down();await page.mouse.move(330,517,{steps:15});await page.mouse.move(378,517,{steps:12});
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[1].drink.preparation.amounts.cream>=15);await page.screenshot({path:'output/playwright/phase10-cream-ribbon.png'});
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[1].drink.preparation.amounts.cream>=39);await page.mouse.up();await page.waitForTimeout(400);
  const ready=await snap();check(ready.stations[1].drink.preparation.creamTechnique===1,'Technique survives manual transfer');
  check(ready.session.ingredients.remaining.cream===stock.cream && ready.session.ingredients.remaining.salt===stock.salt,'No duplicate pantry charge');
  check(ready.stations[1].drink.preparation.mixing===0,'Distinct cream layers remain unmixed');
  check(ready.diagnostics.inputListeners.every(n=>n===1),'Single input owner');
  await page.screenshot({path:'output/playwright/phase10-layered-coffee.png'});
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().customers.some(c=>c.recipe==='muoi' && c.state==='WAITING'),{},{timeout:45000});
  const customer=(await snap()).customers.find(c=>c.recipe==='muoi' && c.state==='WAITING');
  await drag(354,517,[90,240,390][customer.seat],280); await page.waitForTimeout(650);
  const served=await snap();check(served.session.served===2,'Original and salted customers served');
  check(served.session.revenue===34000,'Salted menu price charged once');check(served.session.recipes.muoi===1,'Salted stats counted');
  await page.screenshot({path:'output/playwright/phase10-customer-reaction.png'});
  await page.mouse.click(445,34);
  return {result:'PASS: physical phins, original serving, measured salt, stationary/circular whisk, manual coffee and cream transfer',amount,cream,ready,served};
}
