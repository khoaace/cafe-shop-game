async (page) => {
  await page.goto('http://127.0.0.1:5173');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
  const cdp=await page.context().newCDPSession(page);
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
  await page.screenshot({path:'output/playwright/touch-390.png'});
  // Discard is a real drag target and reliably frees the station.
  await tap(80,656);await drag(40,715,240,517);await drag(240,517,441,613);check((await snap()).stations[0].drink===null,'Discard frees station');
  const result=await snap();await cdp.detach();return{result:'PASS: touch brewing, wrong drop, cancel, incomplete serve, discard, no page scroll',state:result};
}
