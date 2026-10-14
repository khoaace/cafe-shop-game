async page => {
  await page.goto('http://127.0.0.1:5189');await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>window.__PHIN_QA__?.snapshot().scene==='Menu');
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot()), check=(v,m)=>{if(!v)throw new Error(m);};
  const data=(await snap()).save;data.day=4;data.upgrades.phins=1;data.settings.music=false;
  data.inventory={coffee:2,condensed:1,milk:0,egg:0,ice:2,cream:80,salt:1.2};
  data.dayPlan={day:4,seed:10,event:null,vip:null,vipAt:1,expectedOrders:6,challenge:{kind:'served',target:3,reward:5000,label:'Phục vụ 3 khách'}};
  await page.evaluate(data=>localStorage.setItem('phin-goc-pho:v3',JSON.stringify(data)),data);await page.reload();
  await page.waitForFunction(()=>window.__PHIN_QA__?.snapshot().scene==='Menu');
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const rect=await page.locator('canvas').boundingBox();
  const point=(x,y)=>({x:rect.x+x*rect.width/480,y:rect.y+y*rect.height/800,id:1,radiusX:3,radiusY:3,force:1});
  const start=async(x,y)=>cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(x,y)]});
  const move=async(x,y)=>cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x,y)]});
  const end=async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(260);};
  const tap=async(x,y)=>{await start(x,y);await end();};
  const path=async(x,y,tx,ty)=>{for(let i=1;i<=12;i++){await move(x+(tx-x)*i/12,y+(ty-y)*i/12);await page.waitForTimeout(12);}};
  const drag=async(x,y,tx,ty,hold=50)=>{await start(x,y);await path(x,y,tx,ty);await page.waitForTimeout(hold);await end();};
  await tap(240,679);await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().scene==='Game');
  await tap(240,433);await tap(423,275);await tap(240,615);check((await snap()).stations[0].recipeId==='muoi','Touch recipe book selection');
  await drag(40,715,240,517);await drag(120,715,240,517);
  await start(200,715);await path(200,715,280,715);await path(280,715,240,517);await end();
  await drag(360,715,240,517,740);await drag(440,715,240,517,1900);
  await tap(181,656);await drag(56,715,240,517,1530);await drag(240,715,240,517);
  await tap(335,656);
  await start(267,715);await path(267,715,40,727);await path(40,727,88,727);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().saltedCream.amounts.cream>=39.5);await end();
  // A cancelled measuring spoon must not add any salt.
  await start(325,715);await path(325,715,64,727);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(260);
  check(!(await snap()).saltedCream.amounts.salt,'Cancellation applies no salt');
  await drag(325,715,64,727);await drag(325,715,64,727);
  await start(383,715);await path(383,715,89,727);await page.waitForTimeout(700);check((await snap()).saltedCream.whipping===0,'Touch holding earns zero foam');
  for(let i=1;i<=180;i++){const a=i*Math.PI/20;await move(64+Math.cos(a)*25,727+Math.sin(a)*25);await page.waitForTimeout(16);if((await snap()).saltedCream.stage==='PERFECT CREAM')break;}
  await end();check((await snap()).saltedCream.stage==='PERFECT CREAM','Touch circles reach Perfect');
  await start(441,715);await path(441,715,216,517);await path(216,517,264,517);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[0].drink.preparation.amounts.brewedCoffee>=0.98);await end();
  await start(64,727);await path(64,727,216,517);await path(216,517,264,517);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[0].drink.preparation.amounts.cream>=39);await end();
  const ready=await snap();check(ready.stations[0].evaluation.quality==='PERFECT','Touch drink evaluates Perfect');
  await page.waitForTimeout(350);check((await snap()).stations[0].drink.preparation.amounts.cream===ready.stations[0].drink.preparation.amounts.cream,'Release immediately stops cream flow');
  await page.screenshot({path:'output/playwright/phase10-touch-layered.png'});
  // A new bowl independently demonstrates excess salt and overwhipping.
  await tap(182,758);await start(267,715);await path(267,715,40,727);await path(40,727,88,727);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().saltedCream.amounts.cream>=38);await end();
  for(let i=0;i<4;i++)await drag(325,715,64,727);
  await start(383,715);await path(383,715,89,727);
  for(let i=1;i<=250;i++){const a=i*Math.PI/20;await move(64+Math.cos(a)*25,727+Math.sin(a)*25);await page.waitForTimeout(16);if((await snap()).saltedCream.stage==='OVERWHIPPED')break;}
  await end();const over=await snap();check(over.saltedCream.stage==='OVERWHIPPED','Touch overwhipping tracked');
  check(over.saltedCream.amounts.salt>=0.59,'Four measured spoonfuls track excess salt');check(over.stations[0].evaluation.quality==='PERFECT','Second bowl does not alter first cup');
  check(over.diagnostics.inputListeners.every(n=>n===1),'Touch has no duplicate input handlers');check(await page.evaluate(()=>scrollX===0&&scrollY===0),'No page scroll');
  await page.screenshot({path:'output/playwright/phase10-touch-overwhipped.png'});await tap(445,34);await cdp.detach();
  return {result:'PASS: complete touch preparation, cancel, stationary hold, Perfect cream, controlled release, salty/overwhipped second bowl, independence',ready,over};
}
