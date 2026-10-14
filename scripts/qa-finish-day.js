async(page)=>{
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot());const check=(v,m)=>{if(!v)throw new Error(m);};
  const drag=async(x,y,tx,ty,hold=50)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:8});await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(80);};
  if((await snap()).paused){await page.mouse.click(240,312);await page.waitForTimeout(100);}
  const choose=async(x,index)=>{await page.mouse.click(x,433);await page.waitForTimeout(100);await page.mouse.click(80+107*index,231);await page.waitForTimeout(100);await page.mouse.click(240,615);await page.waitForTimeout(100);};
  const brew=async(x)=>{await page.mouse.click(80,656);await drag(40,715,x,517);await drag(120,715,x,517);await page.mouse.move(200,715);await page.mouse.down();await page.mouse.move(280,715,{steps:8});await page.mouse.move(x,517,{steps:8});await page.mouse.up();await drag(360,715,x,517,750);await drag(440,715,x,517,1980);};
  await choose(126,0);await brew(126);await choose(354,1);await brew(354);
  await page.mouse.click(242,656);await drag(240,715,126,517);await drag(240,715,354,517);await drag(56,715,354,517,1530);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations.every(s=>s.drink.state==='BREWED'));
  await page.mouse.move(332,715);await page.mouse.down();await page.mouse.move(384,517,{steps:8});
  for(let i=0;i<=80;i++){const a=i/80*Math.PI*4;await page.mouse.move(354+Math.cos(a)*30,517+Math.sin(a)*26);await page.waitForTimeout(12);}await page.mouse.up();
  for(const [recipe,x]of[['den',126],['sua',354]]){
    await page.waitForFunction(id=>window.__PHIN_QA__.snapshot().customers.some(c=>c.recipe===id&&c.state==='WAITING'),recipe,{timeout:40000});
    const c=(await snap()).customers.find(c=>c.recipe===recipe&&c.state==='WAITING');check(c,recipe+' waiting');await drag(x,517,[90,240,390][c.seat],280);
  }
  const before=await snap();check(before.session.served===6,'Six real orders served');check(before.session.bonuses===10000,'Combo milestones three and five');
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().scene==='Summary',null,{timeout:55000});
  const summary=await snap();check(summary.save.day===4,'Next day persisted');check(summary.save.stats.served===6,'Served count persisted exactly once');
  check(summary.save.balance===before.session.earnings+(before.session.challengeComplete?before.session.challenge.reward:0),'Closing balance matches live earnings');
  await page.screenshot({path:'output/playwright/day-complete.png'});
  await page.mouse.click(240,707);await page.waitForTimeout(500);const next=await snap();check(next.session.day===4,'Next-day scene starts');check(next.stations.length===2,'Two stations retained');
  await page.reload();await page.waitForTimeout(500);const reload=await snap();check(reload.save.balance===summary.save.balance,'Reload does not duplicate money');check(reload.save.day===4,'Reload preserves next day');
  return{result:'PASS: full 180-second day, combo 5, settlement, next day, reload',before,summary,next,reload};
}
