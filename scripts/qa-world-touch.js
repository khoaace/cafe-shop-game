async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});
  const testPage=await context.newPage();
  try {
    const basic=await (async (page) => {
  await page.goto('http://localhost:5175');await page.waitForFunction(()=>window.__PHIN_QA__?.snapshot().scene==='Menu');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
  const cdp=await page.context().newCDPSession(page); await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:false}); await page.waitForTimeout(400);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const rect=await page.locator('canvas').boundingBox();
  const point=(x,y)=>({x:rect.x+x*rect.width/480,y:rect.y+y*rect.height/800,id:1,radiusX:3,radiusY:3,force:1});
  const start=async(x,y)=>cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(x,y)]});
  const move=async(x,y)=>cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x,y)]});
  const end=async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);};
  const tap=async(x,y)=>{await start(x,y);await end();};
  const drag=async(x,y,tx,ty,hold=70)=>{await start(x,y);for(let i=1;i<=12;i++){await move(x+(tx-x)*i/12,y+(ty-y)*i/12);await page.waitForTimeout(12);}await page.waitForTimeout(hold);await end();};
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot());const check=(v,m)=>{if(!v)throw new Error(m);};
  await tap(384,735);await page.waitForTimeout(2200);
  await drag(40,715,25,455);check((await snap()).stations[0].drink===null,'Invalid touch drop returns glass');
  await start(40,715);await move(240,517);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(150);
  check((await snap()).gesture.active===null,'Touch cancellation releases ownership');check((await snap()).stations[0].drink===null,'Canceled drop creates no cup');
  await drag(40,715,240,517);check((await snap()).stations[0].drink.state==='GLASS','Touch drag places glass');
  await drag(240,517,90,280);check((await snap()).session.served===0,'Incomplete cup rejected');check((await snap()).stations[0].drink.state==='GLASS','Incomplete cup returns safely');
  await drag(120,715,240,517);
  await start(200,715);await move(240,715);await move(280,715);await page.waitForTimeout(80);await move(260,610);await move(240,517);await end();
  await drag(360,715,240,517,750);await drag(440,715,240,517,1960);
  await tap(242,656);await drag(240,715,240,517);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[0].drink.state==='BREWED');
  await drag(240,517,90,280);check((await snap()).session.served===1,'Complete drink served using touch only');
  check(await page.evaluate(()=>scrollX===0&&scrollY===0),'Touch interaction did not scroll page');
  await page.screenshot({path:'output/playwright/world-touch-390.png'});
  // Discard is a real drag target and reliably frees the station.
  await tap(80,656);await drag(40,715,240,517);await drag(240,517,441,613);check((await snap()).stations[0].drink===null,'Discard frees station');
  const result=await snap();check(result.render.factor===2,'Touch uses high resolution backing canvas');await cdp.detach();return{result:'PASS: touch brewing, wrong drop, cancel, incomplete serve, discard, no page scroll',state:result};
})(testPage);
    const advanced=await (async (page) => {
  await page.goto('http://localhost:5175');await page.waitForFunction(()=>window.__PHIN_QA__?.snapshot().scene==='Menu');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
  const cdp=await page.context().newCDPSession(page); await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:false}); await page.waitForTimeout(400);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const rect=await page.locator('canvas').boundingBox();
  const point=(x,y)=>({x:rect.x+x*rect.width/480,y:rect.y+y*rect.height/800,id:1,radiusX:3,radiusY:3,force:1});
  const start=async(x,y)=>cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(x,y)]});
  const move=async(x,y)=>cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x,y)]});
  const end=async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);};
  const tap=async(x,y)=>{await start(x,y);await end();};
  const drag=async(x,y,tx,ty,hold=70)=>{await start(x,y);for(let i=1;i<=12;i++){await move(x+(tx-x)*i/12,y+(ty-y)*i/12);await page.waitForTimeout(12);}await page.waitForTimeout(hold);await end();};
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot());const check=(v,m)=>{if(!v)throw new Error(m);};
  await tap(384,735);await page.waitForTimeout(2100);
  await tap(240,433);await tap(187,231);await tap(240,615);
  await drag(40,715,240,517);await drag(120,715,240,517);
  await start(200,715);await move(280,715);await page.waitForTimeout(70);await move(260,600);await move(240,517);await end();
  await drag(360,715,240,517,750);await drag(440,715,240,517,1960);
  await tap(242,656);await drag(56,715,240,517,1470);await drag(240,715,240,517);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[0].drink.state==='BREWED');
  await start(332,715);await move(270,517);
  for(let i=0;i<=100;i++){const a=i/100*Math.PI*4;await move(240+Math.cos(a)*30,517+Math.sin(a)*25);await page.waitForTimeout(16);}await end();
  check((await snap()).stations[0].drink.stir>=Math.PI*3,'Touch circles stir milk coffee');
  await page.screenshot({path:'output/playwright/world-touch-milk.png'});
  await tap(401,656);await start(280,715);await move(140,715);
  const before=(await snap()).gesture.foam;await page.waitForTimeout(700);check((await snap()).gesture.foam===before,'Stationary touch does not whisk');
  for(let i=0;i<28;i++){await move(i%2?166:114,715+(i%3-1)*7);await page.waitForTimeout(30);}await end();
  check((await snap()).gesture.foam>=950,'Back-and-forth touch whisking creates foam');
  await drag(140,715,240,517);check((await snap()).stations[0].drink.foam===1,'Touch transfers foam');
  const state=await snap();check(state.render.factor===2,'Touch uses high resolution backing canvas');await cdp.detach();return{result:'PASS: touch milk pouring, circular stirring, stationary whisk rejection, foam preparation and transfer',state};
})(testPage);
    return {result:'PASS: both touch suites at persistent DPR 2',basic,advanced};
  } finally { await context.close(); }
}