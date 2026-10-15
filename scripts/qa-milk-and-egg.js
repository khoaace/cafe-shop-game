async (page) => {
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot());
  const check=(v,m)=>{if(!v)throw new Error(m);};
  const drag=async(x,y,tx,ty,hold=50)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:8});await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(80);};
  if((await snap()).paused){await page.mouse.click(240,312);await page.waitForTimeout(100);}
  if((await snap()).stations[0].drink)await drag(126,517,441,613);
  const choose=async(x,index)=>{await page.mouse.click(x,433);await page.waitForTimeout(100);await page.mouse.click(80+107*index,231);await page.waitForTimeout(100);await page.mouse.click(240,615);await page.waitForTimeout(100);};
  const brew=async(x,waterTime)=>{
    await page.mouse.click(80,656);await drag(40,715,x,517);await drag(120,715,x,517);
    await page.mouse.move(200,715);await page.mouse.down();await page.mouse.move(280,715,{steps:8});await page.mouse.move(x,517,{steps:8});await page.mouse.up();
    await drag(360,715,x,517,750);await drag(440,715,x,517,waterTime);
  };
  await choose(126,2);await brew(126,940);
  check((await snap()).stations[0].drink.grounds===0.5,'Bac xiu takes half a spoon of grounds');
  await page.mouse.click(242,656);await drag(56,715,126,517,1530);await drag(148,715,126,517,3220);await drag(240,715,126,517);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[0].drink.state==='BREWED');
  await page.mouse.move(332,715);await page.mouse.down();await page.mouse.move(156,517,{steps:8});
  for(let i=0;i<=80;i++){const a=i/80*Math.PI*4;await page.mouse.move(126+Math.cos(a)*30,517+Math.sin(a)*26);await page.waitForTimeout(12);}
  await page.mouse.up();
  const bac=await snap();await page.screenshot({path:'output/playwright/bac-xiu.png'});
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().customers.some(c=>c.recipe==='bac'&&c.state==='WAITING'),null,{timeout:40000});
  const c=(await snap()).customers.find(c=>c.recipe==='bac'&&c.state==='WAITING');await drag(126,517,[90,240,390][c.seat],280);
  check((await snap()).session.served===3,'Bac xiu correctly served');{const s=(await snap()).session;check(s.bonuses-s.speedBonuses===3000,'Combo x3 awarded (excluding speed bonus)');}
  await choose(354,3);await brew(354,1980);await page.mouse.click(401,656);
  await page.mouse.move(280,715);await page.mouse.down();await page.mouse.move(140,715,{steps:8});
  const still=(await snap()).gesture.foam;await page.waitForTimeout(800);check((await snap()).gesture.foam===still,'Holding still cannot whisk foam');
  for(let i=0;i<26;i++){await page.mouse.move(i%2?166:114,715+(i%3-1)*7,{steps:3});await page.waitForTimeout(16);}
  await page.mouse.up();check((await snap()).gesture.foam>=950,'Actual whisk movement produces foam');
  await drag(140,715,354,517);check((await snap()).stations[1].drink.foam===1,'Bowl transfers foam');
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[1].drink.state==='BREWED');
  const egg=await snap();await page.screenshot({path:'output/playwright/egg-coffee.png'});
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().customers.some(c=>c.recipe==='trung'&&c.state==='WAITING'),null,{timeout:40000});
  const guest=(await snap()).customers.find(c=>c.recipe==='trung'&&c.state==='WAITING');await drag(354,517,[90,240,390][guest.seat],280);
  const final=await snap();check(final.session.served===4,'All four recipes served by pointer gestures');
  check(final.session.lost===0,'No lost customers while making all four recipes');await page.mouse.click(445,34);
  return {result:'PASS: half coffee, milk amounts, whisk movement, egg foam, four recipes, combo',bac,egg,final};
}
