async (page) => {
  const errors=[],failed=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto('http://127.0.0.1:4173');await page.setViewportSize({width:480,height:800});
  await page.evaluate(()=>{localStorage.removeItem('phin-goc-pho:v1');localStorage.removeItem('phin-goc-pho:v3');});await page.reload();await page.waitForTimeout(600);
  if(await page.evaluate(()=>typeof window.__PHIN_QA__!=='undefined'))throw Error('Dev observer leaked');
  const click=(x,y)=>page.mouse.click(x,y),drag=async(x,y,tx,ty,hold=60)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:10});await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(80);};
  await click(240,679);const started=Date.now();
  for(let i=0;i<6;i++){
    await page.waitForTimeout(Math.max(1,[2500,32500,62500,86500,110500,134500][i]-(Date.now()-started)));
    await click(80,656);await click(240,433);await click(80+(i%2)*107,231);await click(240,615);
    await drag(40,715,240,517);await drag(120,715,240,517);await page.mouse.move(200,715);await page.mouse.down();await page.mouse.move(280,715,{steps:8});await page.mouse.move(240,517,{steps:8});await page.mouse.up();
    await drag(360,715,240,517,750);await drag(440,715,240,517,1980);
    await click(242,656);if(i%2)await drag(56,715,240,517,1510);await drag(240,715,240,517);
    await page.waitForTimeout(8100);
    if(i%2){await page.mouse.move(332,715);await page.mouse.down();await page.mouse.move(270,517,{steps:8});for(let j=0;j<=80;j++){const a=j/80*Math.PI*4;await page.mouse.move(240+Math.cos(a)*30,517+Math.sin(a)*26);await page.waitForTimeout(12);}await page.mouse.up();}
    await drag(240,517,90,218);const status=await page.locator('#accessible-status').textContent();if(!/Perfect Brew|GOOD|COMBO|thử thách/.test(status))throw Error('Serve '+i+': '+status);
  }
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('phin-goc-pho:v3')||'{}').day===2,null,{timeout:60000});
  const day=await page.evaluate(()=>JSON.parse(localStorage.getItem('phin-goc-pho:v3')));if(day.stats.served!==6)throw Error('Served '+day.stats.served);
  await page.screenshot({path:'output/playwright/phase08-day-one-summary.png'});await click(347,765);await page.waitForTimeout(300);
  const before=day.balance;await page.mouse.dblclick(385,220,{delay:40});await page.waitForTimeout(500);
  const bought=await page.evaluate(()=>JSON.parse(localStorage.getItem('phin-goc-pho:v3')));if(bought.upgrades.phins!==2||bought.balance!==before-25000)throw Error('Purchase duplicated or failed');
  await page.screenshot({path:'output/playwright/phase08-shop.png'});await click(351,731);await page.waitForTimeout(2200);
  await drag(40,715,126,517);await drag(40,715,354,517);await page.screenshot({path:'output/playwright/phase08-next-day.png'});
  await page.reload();await page.waitForTimeout(500);const reloaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('phin-goc-pho:v3')));if(reloaded.day!==2||reloaded.balance!==bought.balance||reloaded.upgrades.phins!==2)throw Error('Reload checkpoint failed');
  if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));return{result:'PASS: new save, six physical serves, complete 180s day, challenge settlement, repeat-click safe phin purchase, next day two cups and reload',day,bought,reloaded,errors,failed};
}
