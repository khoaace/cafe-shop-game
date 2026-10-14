async (page) => {
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173'); await page.setViewportSize({width:480,height:800});
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
  await page.screenshot({path:'output/playwright/phase08-four-phins.png'});await page.mouse.click(445,34);
  check(errors.length===0,errors.join('\n'));
  return {result:'PASS: four independent IDs, hidden brewing, pointer/page cancellation, serving/discarding and pause',frameMs:{median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)]},snapshot:await snap(),errors};
}
