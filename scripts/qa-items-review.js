async (page) => {
 const context=await page.context().browser().newContext({viewport:{width:480,height:800},deviceScaleFactor:2});
 const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 try {
const pages=await (async (page) => {
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://localhost:5175'); await page.setViewportSize({width:480,height:800});
  await page.evaluate(()=>{localStorage.removeItem('phin-goc-pho:v1');localStorage.setItem('phin-goc-pho:v3',JSON.stringify({version:3,day:10,balance:1000000,upgrades:{phins:4,seats:6,fan:true,premium:true,decor:true},settings:{sound:true,music:true,reducedMotion:false},dayPlan:{day:10,seed:9,event:'festival',vip:'creator',vipAt:1,expectedOrders:8,challenge:{kind:'recipe',recipe:'bac',target:2,label:'Phục vụ 2 bạc xỉu',reward:15000}}}));});
  await page.reload();await page.waitForTimeout(600);await page.mouse.click(240,679);await page.waitForTimeout(2100);
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot()), check=(v,m)=>{if(!v)throw Error(m);};
  const drag=async(x,y,tx,ty,hold=60)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:10});await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(80);};
  const brew=async(x)=>{await page.mouse.click(80,656);await drag(40,715,x,517);await drag(120,715,x,517);await page.mouse.move(200,715);await page.mouse.down();await page.mouse.move(280,715,{steps:8});await page.mouse.move(x,517,{steps:8});await page.mouse.up();await drag(360,715,x,517,750);await drag(440,715,x,517,1980);};
  await brew(126); const first=(await snap()).stations[0].drink;
  await page.mouse.click(298,385);check((await snap()).stations[0].visible===false,'Page one hidden');
  await brew(126);check((await snap()).stations[2].drink.id!==first.id,'Page two has unique cup');
  await page.waitForTimeout(8100);let s=await snap();check(s.stations[0].drink.state==='BREWED','Hidden phin finished');check(s.stations[2].drink.state==='BREWED','Visible phin finished independently');
  // A second pointer can change pages while the first is holding a cup; cancellation must restore it.
  await page.mouse.move(126,517);await page.mouse.down();await page.mouse.move(170,475,{steps:8});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:66,y:385,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.mouse.up();await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  s=await snap();check(s.gesture.active===null,'Switching page cancels dragging');check(s.stations[2].drink!==null,'Canceled cup retained');check(new Set(s.stations.filter(v=>v.drink).map(v=>v.drink.id)).size===2,'No duplicated cups');
  await page.mouse.click(66,385);await page.mouse.click(242,656);await drag(240,715,126,517);await drag(126,517,90,218);check((await snap()).session.served===1,'First row receives correct cup');
  await page.mouse.click(298,385);await drag(126,517,441,613);check((await snap()).stations[2].drink===null,'Discard on page two frees exact model');
  await page.mouse.click(445,34);const paused=await snap();await page.waitForTimeout(600);const later=await snap();check(paused.session.elapsed===later.session.elapsed,'Pause freezes day and customer clocks');await page.mouse.click(240,312);
  const frames=await page.evaluate(()=>new Promise(resolve=>{let times=[],last=performance.now();function frame(t){times.push(t-last);last=t;if(times.length>=120)resolve(times.slice(1));else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));frames.sort((a,b)=>a-b);
  await page.screenshot({path:'output/playwright/items-four-phins.png'});await page.mouse.click(445,34);
  check(errors.length===0,errors.join('\n'));
  return {result:'PASS: four independent IDs, hidden brewing, pointer/page cancellation, serving/discarding and pause',frameMs:{median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)]},snapshot:await snap(),errors};
}
)(p);
const resize=await (async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://localhost:5175'); await page.setViewportSize({width:480,height:800});
  await page.waitForTimeout(300);
  const cdp=await page.context().newCDPSession(page);
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot());
  const check=(v,m)=>{if(!v)throw Error(m);};
  const point=async(x,y)=>{const r=await page.locator('canvas').boundingBox();return {x:r.x+x*r.width/480,y:r.y+y*r.height/800};};
  const move=async(x,y)=>{const p=await point(x,y);await page.mouse.move(p.x,p.y,{steps:8});};
  const click=async(x,y)=>{const p=await point(x,y);await page.mouse.click(p.x,p.y);await page.waitForTimeout(120);};
  const drag=async(x,y,tx,ty)=>{await move(x,y);await page.mouse.down();await move(tx,ty);await page.mouse.up();await page.waitForTimeout(200);};
  await click(384,735);await page.waitForTimeout(2100);await drag(40,715,240,517);
  const original=await snap(), rows=[];
  for(let cycle=0;cycle<2;cycle++) for(const [width,height,dpr] of [[1366,768,1],[1920,1080,2],[2560,1440,2],[360,800,2],[390,844,2],[430,932,2],[480,800,1],[1440,900,2]]) {
    await move(240,517);await page.mouse.down();await move(260,490);check((await snap()).gesture.active==='cup','Can pick cup before resize');
    await page.setViewportSize({width,height});await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});await page.waitForTimeout(250);await page.mouse.up();
    let state=await snap();const expected=Math.max(1,Math.min(4,Math.ceil(Math.min(width/480,height/800)*Math.min(dpr,2))));
    check(state.render.factor===expected,'Factor '+width);check(state.render.canvas[0]===480*expected&&state.render.canvas[1]===800*expected,'Backing store');
    check(state.render.textResolution===expected,'Text resolution');check(Math.abs(state.render.textPixels[0]-state.render.textLogical[0]*expected)<1,'Real text texture pixels');
    check(state.stations[0].drink.id===original.stations[0].drink.id,'Resize retains exact cup');check(state.gesture.active===null,'Resize cancels drag');check(state.session.elapsed>=original.session.elapsed,'No session restart');
    await click(375,34);const paused=await snap();await page.waitForTimeout(120);check((await snap()).session.elapsed===paused.session.elapsed,'Overlay clock freeze');await click(419,145);
    await drag(120,715,240,517);check((await snap()).stations[0].drink.state==='PHIN','Scaled pointer places phin');
    await drag(240,517,441,613);check((await snap()).stations[0].drink===null,'Scaled discard');await drag(40,715,240,517);
    // Keep a stable model identity for the next iteration's cancellation assertion.
    original.stations[0].drink=(await snap()).stations[0].drink;
    state=await snap();rows.push({cycle,width,height,dpr,render:state.render,diagnostics:state.diagnostics});
    if(cycle===1)await page.screenshot({path:`output/playwright/items-resize-${width}x${height}.png`});
  }
  const grouped=rows.filter(r=>r.width===480);check(grouped[0].render.textureCount===grouped[1].render.textureCount,'Texture cache stable after resize cycles');check(grouped[0].render.textCount===grouped[1].render.textCount,'Text registry stable');
  check(!errors.length,errors.join('\n'));await cdp.detach();return {result:'PASS: live resize, logical hit areas, DPR changes, exact cup identity, overlays, stable texture/text counts',rows,errors};
}
)(p);
const lifecycle=await (async(page)=>{
  await page.goto('http://localhost:5175');await page.setViewportSize({width:480,height:800});await page.waitForTimeout(500);
  const click=async(x,y)=>{await page.mouse.click(x,y);await page.waitForTimeout(100);};
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot()),rows=[];
  for(let i=0;i<8;i++){
    await click(240,679);await page.waitForTimeout(2300);const active=await snap();
    if(active.diagnostics.inputListeners.some(n=>n!==1))throw Error('Duplicate input listener');
    await click(375,34);await click(419,145);await click(445,34);await click(240,551);await click(240,551);await page.waitForTimeout(250);
    const menu=await snap();if(menu.scene!=='Menu')throw Error('Scene exit');rows.push({iteration:i+1,active:active.diagnostics,menu:menu.diagnostics});
    if(menu.diagnostics.timers||menu.diagnostics.tweens)throw Error('Leaked timer/tween');if(i&&JSON.stringify(rows[0].menu)!==JSON.stringify({...menu.diagnostics,fps:rows[0].menu.fps}))throw Error('Menu object/listener growth');
  }
  await click(245,735);for(let tab=0;tab<5;tab++){await click(69+tab*86,180);await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/items-notebook-${tab}.png`});}
  return{result:'PASS: eight scene cycles, stable objects/timers/input and resize listeners, notebook five pages',rows};
}
)(p);

 await p.goto('http://localhost:5175');await p.setViewportSize({width:480,height:800});
 await p.waitForFunction(()=>window.__PHIN_QA__?.snapshot().scene==='Menu');
 await p.screenshot({path:'output/playwright/items-menu.png'});
 await p.mouse.click(106,735);await p.waitForTimeout(350);await p.screenshot({path:'output/playwright/items-shop.png'});
 await p.mouse.click(130,731);await p.waitForTimeout(150);await p.mouse.click(384,735);await p.waitForTimeout(2200);
 for(const [tab,x] of [['brew',80],['milk',242],['egg',401]]) {await p.mouse.click(x,656);await p.waitForTimeout(200);await p.screenshot({path:`output/playwright/items-tray-${tab}.png`});}
 await p.mouse.click(375,34);
 for(let i=0;i<4;i++){await p.mouse.click(80+107*i,231);await p.waitForTimeout(150);await p.screenshot({path:`output/playwright/items-book-${i}.png`});}
 if(errors.length)throw Error(errors.join('\n'));
 return {result:'PASS: pages, resize, lifecycle, all trays/book/shop captures',pages,resize,lifecycle,errors};
 } finally {await context.close();}
}
