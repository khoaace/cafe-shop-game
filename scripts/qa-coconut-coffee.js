async page => {
  await page.goto('http://127.0.0.1:5189'); await page.setViewportSize({width:480,height:800});
  await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene === 'Menu');
  const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
  const check = (v, message) => { if (!v) throw new Error(message); };
  const wait = (fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout });
  // Day 5 with the blender owned; exactly one serving of coconut cream in stock.
  const data = (await snap()).save; data.day=5; data.upgrades.phins=1; data.upgrades.blender=true;
  data.dayPlan={day:5,seed:11,event:null,vip:null,vipAt:1,expectedOrders:6,challenge:{kind:'served',target:3,reward:5000,label:'Phục vụ 3 khách'}};
  data.inventory={coffee:3,condensed:2,milk:0,egg:0,cream:0,salt:0,ice:3,coconutCream:60};
  await page.evaluate(data=>localStorage.setItem('phin-goc-pho:v3',JSON.stringify(data)),data);
  await page.reload(); await page.waitForFunction(() => window.__PHIN_QA__?.snapshot().scene==='Menu');
  const drag=async(x,y,tx,ty,hold=70)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:15});await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(260);};
  const shot = name => page.screenshot({path:`output/playwright/coconut-${name}.png`});
  await page.mouse.click(240,679); await wait(()=>window.__PHIN_QA__.snapshot().scene==='Game'); await page.waitForTimeout(250);
  // Recipe book page 2 → Cà phê dừa → use for station 1.
  await page.mouse.click(240,433); await page.waitForTimeout(150); await page.mouse.click(423,275); await page.waitForTimeout(150); await page.mouse.click(187,231); await page.waitForTimeout(150);
  await shot('book'); await page.mouse.click(240,615); await page.waitForTimeout(150);
  check((await snap()).stations[0].recipeId==='cotdua','Recipe selected through book');
  // Phin with the existing mechanic.
  await page.mouse.click(50,656); await page.waitForTimeout(150);
  await drag(40,715,240,517); await drag(120,715,240,517);
  await page.mouse.move(200,715);await page.mouse.down();await page.mouse.move(280,715,{steps:12});await page.mouse.move(240,517,{steps:15});await page.mouse.up();await page.waitForTimeout(250);
  await drag(360,715,240,517,740);
  await page.mouse.move(440,715);await page.mouse.down();await page.mouse.move(240,517,{steps:15});await wait(()=>window.__PHIN_QA__.snapshot().stations[0].drink.water>=0.97);await page.mouse.up();await page.waitForTimeout(250);
  const afterPhin = await snap(); check(afterPhin.stations[0].drink.state==='BREWING','Phin brewing'); check(afterPhin.session.ingredients.remaining.coffee===2,'Grounds charged once when the phin starts');
  // Tray 05: blender on the counter.
  await page.mouse.click(430,656); await page.waitForTimeout(200); await shot('tray');
  await page.mouse.move(268,716); await page.mouse.down(); await page.mouse.move(52,722,{steps:12}); await page.waitForTimeout(400); await page.mouse.up(); await page.waitForTimeout(250);
  check((await snap()).coconut.state.amounts.coconutCream===undefined,'Pouring before docking the jar adds nothing');
  await drag(128,738,52,722); check((await snap()).coconut.docked,'Jar docked on the base');
  await drag(52,776,52,776,500); check((await snap()).coconut.blendTime===0,'Empty jar without lid cannot blend');
  // Coconut cream: enter, move left to level, right to tilt; release at 60 ml.
  await page.mouse.move(268,716);await page.mouse.down();await page.mouse.move(40,722,{steps:15});await page.mouse.move(86,722,{steps:12});
  await wait(()=>window.__PHIN_QA__.snapshot().coconut.state.amounts.coconutCream>=59.4);await page.mouse.up();await page.waitForTimeout(260);
  let s = await snap(); const coco = s.coconut.state.amounts.coconutCream;
  check(Math.abs(s.session.ingredients.remaining.coconutCream - (60 - coco)) < 0.01,'Coconut cream deducted as it is poured into the jar');
  await page.mouse.move(324,716);await page.mouse.down();await page.mouse.move(40,722,{steps:15});await page.mouse.move(70,722,{steps:12});
  await wait(()=>window.__PHIN_QA__.snapshot().coconut.state.amounts.condensed>=0.97);await page.mouse.up();await page.waitForTimeout(260);
  s = await snap(); check(Math.abs(s.session.ingredients.remaining.condensed - (2 - s.coconut.state.amounts.condensed)) < 0.01,'Condensed milk deducted when added');
  await drag(380,716,52,722); s = await snap();
  check(s.coconut.state.amounts.ice===3 && s.session.ingredients.remaining.ice===2,'One scoop transfers 100 g ice and deducts one portion');
  await shot('jar-filled');
  // Holding the switch without the lid does nothing.
  await drag(52,776,52,776,600); check((await snap()).coconut.blendTime===0,'Blender requires the lid');
  await drag(190,748,52,688); s = await snap(); check(s.coconut.lid,'Lid snapped onto the jar');
  // Hold the switch: progress only while held, motor does not stop itself at Perfect.
  await page.mouse.move(52,776); await page.mouse.down(); await page.waitForTimeout(1300);
  s = await snap(); check(s.coconut.motor && s.coconut.blendTime>0.8,'Holding the switch runs the motor'); await shot('blending');
  await page.mouse.up(); await page.waitForTimeout(400); const paused = (await snap()).coconut.blendTime; await page.waitForTimeout(500);
  check((await snap()).coconut.blendTime===paused && !(await snap()).coconut.motor,'Releasing stops blending');
  await page.mouse.move(52,776); await page.mouse.down();
  await wait(()=>window.__PHIN_QA__.snapshot().coconut.blendTime>=4.3); await shot('perfect');
  check((await snap()).coconut.motor,'Motor keeps running at Perfect while held');
  await page.mouse.up(); await page.waitForTimeout(300); s = await snap(); check(s.coconut.stage==='PERFECT','Released inside the Perfect zone');
  // Lid on blocks pouring; remove it.
  await drag(52,722,240,517); check((await snap()).coconut.docked && (await snap()).stations[0].drink.preparation.amounts.coconutCream===undefined,'Lid on: jar cannot be poured');
  await drag(52,688,190,748); check(!(await snap()).coconut.lid,'Lid removed');
  // Phin still sits on the glass: pouring waits until the coffee has dripped.
  await wait(()=>window.__PHIN_QA__.snapshot().stations[0].drink.state==='BREWED');
  const stockBefore = (await snap()).session.ingredients.remaining;
  await page.mouse.move(52,722);await page.mouse.down();await page.mouse.move(210,517,{steps:15});await page.mouse.move(250,517,{steps:12});
  await wait(()=>window.__PHIN_QA__.snapshot().stations[0].drink.preparation.amounts.coconutCream>=25); await shot('pouring-mixture');
  await wait(()=>!(window.__PHIN_QA__.snapshot().coconut.state.amounts.coconutCream > 0)); await page.mouse.up(); await page.waitForTimeout(300);
  check(!(await snap()).coconut.docked,'Emptied jar goes back to the shelf for the next drink');
  s = await snap(); const prep = s.stations[0].drink.preparation;
  check(Math.abs(prep.amounts.coconutCream - coco) < 0.01 && prep.blendTechnique===1,'Whole blended mixture poured by hand, technique carried');
  check(JSON.stringify(s.session.ingredients.remaining)===JSON.stringify(stockBefore),'No stock charged while pouring the mixture');
  // Pitcher: the brewed coffee from this phin, poured into the coconut glass.
  await page.mouse.move(436,716);await page.mouse.down();await page.mouse.move(210,517,{steps:15});await page.mouse.move(250,517,{steps:12});
  await wait(()=>window.__PHIN_QA__.snapshot().stations[0].drink.preparation.amounts.brewedCoffee>=0.4); await shot('coffee-entering');
  await wait(()=>!(window.__PHIN_QA__.snapshot().stations[0].drink.coffeeSource.amounts.brewedCoffee > 0.005)); await page.mouse.up(); await page.waitForTimeout(300);
  s = await snap(); check(s.session.ingredients.remaining.coffee===2,'Brewed coffee not charged twice');
  check(s.stations[0].evaluation.valid && s.stations[0].evaluation.quality==='PERFECT','Prepared drink evaluates PERFECT '+JSON.stringify([s.stations[0].evaluation, s.stations[0].drink.preparation.amounts, s.stations[0].drink.grounds, s.stations[0].drink.water]));
  await page.waitForTimeout(2600); await shot('layered');
  // Out of coconut cream: the tin refuses and shows the stock message.
  await page.mouse.click(268,716); await page.waitForTimeout(200); s = await snap();
  check(s.toast==='Hết cốt dừa! Cần nhập thêm.','Out-of-stock message shown');
  await wait(()=>window.__PHIN_QA__.snapshot().customers.some(c=>c.recipe==='cotdua' && c.state==='WAITING'),{},60000);
  const customer=(await snap()).customers.find(c=>c.recipe==='cotdua' && c.state==='WAITING');
  await drag(240,517,[90,240,390][customer.seat],280); await page.waitForTimeout(700);
  const served=await snap(); check(served.session.served===1 && served.session.revenue===30000 && served.session.recipes.cotdua===1,'Coconut coffee sold at 30.000đ');
  await shot('served');
  return {result:'PASS', tips: served.session.tips, ingredients: served.session.ingredients, prep: s.stations[0].drink.preparation.amounts};
}
