async (page) => {
  await page.goto('http://127.0.0.1:5173'); await page.setViewportSize({width:480,height:800});
  await page.evaluate(() => {
    localStorage.setItem('phin-goc-pho:v3', JSON.stringify({ version:3, day:3, balance:0, upgrades:{phins:2,seats:3},
      dayPlan:{day:3,seed:1,event:null,vip:null,vipAt:1,expectedOrders:6,challenge:{kind:'served',target:4,label:'Phục vụ 4 khách',reward:10000}} }));
  });
  await page.reload(); await page.waitForTimeout(500); await page.mouse.click(240,679); await page.waitForTimeout(2100);
  const snap = () => page.evaluate(() => window.__PHIN_QA__.snapshot());
  const check = (v,m) => { if(!v) throw new Error(m); };
  const drag = async(x,y,tx,ty,hold=50) => { await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(tx,ty,{steps:8}); await page.waitForTimeout(hold); await page.mouse.up(); await page.waitForTimeout(80); };
  const brew = async(x) => {
    await page.mouse.click(80,656); await drag(40,715,x,517); await drag(120,715,x,517);
    await page.mouse.move(200,715); await page.mouse.down(); await page.mouse.move(280,715,{steps:8}); await page.mouse.move(x,517,{steps:8}); await page.mouse.up();
    await drag(360,715,x,517,750); await drag(440,715,x,517,1980);
  };
  await brew(126);
  await page.mouse.click(354,433); await page.waitForTimeout(100); await page.mouse.click(187,231); await page.waitForTimeout(100); await page.mouse.click(240,615); await page.waitForTimeout(100);
  await brew(354);
  const both = await snap(); check(both.stations.every(s=>s.drink), 'Two independent cups');
  check(both.stations[0].drink.brewElapsed > both.stations[1].drink.brewElapsed, 'First station continued while second was operated');
  check(both.stations[0].drink.id !== both.stations[1].drink.id, 'Unique cup identities');
  await page.mouse.click(242,656);
  await drag(240,715,126,517); await drag(240,715,354,517);
  await drag(56,715,354,517,1530);
  await page.waitForFunction(() => window.__PHIN_QA__.snapshot().stations.every(s=>s.drink.state==='BREWED'), null,{timeout:12000});
  await page.mouse.move(332,715); await page.mouse.down(); await page.mouse.move(384,517,{steps:8});
  for(let i=0;i<=80;i++){const a=i/80*Math.PI*4;await page.mouse.move(354+Math.cos(a)*30,517+Math.sin(a)*26);await page.waitForTimeout(12);}
  await page.mouse.up();
  const ready=await snap();check(ready.stations[1].drink.stir>=Math.PI*3,'Actual circular stirring');
  await page.screenshot({path:'output/playwright/two-stations.png'});
  const first=ready.customers.find(c=>c.recipe==='den'&&c.state==='WAITING');check(first,'Black-coffee customer waiting');
  await drag(126,517,[90,240,390][first.seat],280);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().customers.some(c=>c.recipe==='sua'&&c.state==='WAITING'),null,{timeout:40000});
  const second=(await snap()).customers.find(c=>c.recipe==='sua'&&c.state==='WAITING');
  await drag(354,517,[90,240,390][second.seat],280);
  const final=await snap();check(final.session.served===2,'Both recipes served');check(final.session.lost===0,'No unavoidable timeout');
  await page.mouse.click(445,34);
  return {result:'PASS: concurrent brewing, real milk pouring and circular stirring, black and milk coffee served', ready, final};
}
