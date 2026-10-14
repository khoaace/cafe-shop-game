async(page)=>{
  const errors=[],failed=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto('http://127.0.0.1:4174/phin-goc-pho/');await page.setViewportSize({width:1920,height:1080});
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:2,mobile:false});
  const rect = await page.locator('canvas').boundingBox();
  const mouseMove=(x,y,options)=>page.mouse.move(rect.x+x*rect.width/480,rect.y+y*rect.height/800,options);
  const mouseClick=(x,y,options)=>page.mouse.click(rect.x+x*rect.width/480,rect.y+y*rect.height/800,options);
  await page.evaluate(()=>{localStorage.removeItem('phin-goc-pho:v1');localStorage.setItem('phin-goc-pho:v3',JSON.stringify({version:3,day:3,balance:0,upgrades:{phins:2,seats:3},settings:{sound:false,music:false,reducedMotion:false},dayPlan:{day:3,seed:15,event:'reviewer',vip:'reviewer',vipAt:1,expectedOrders:6,challenge:{kind:'perfect',target:3,label:'Pha 3 ly Perfect',reward:10000}}}));});await page.reload();await page.waitForTimeout(600);
  const pixels=await page.evaluate(()=>[document.querySelector('canvas').width,document.querySelector('canvas').height]);if(pixels[0]!==1440||pixels[1]!==2400)throw Error('Production HiDPI backing pixels');
  const click=(x,y)=>mouseClick(x,y),drag=async(x,y,tx,ty,hold=60)=>{await mouseMove(x,y);await page.mouse.down();await mouseMove(tx,ty,{steps:10});await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(80);};
  await click(240,679);const started=Date.now(),statuses=[];
  for(let i=0;i<4;i++){
    await page.waitForTimeout(Math.max(1,[2500,31500,60500,86500][i]-(Date.now()-started)));const x=i%2?354:126;
    await click(80,656);await click(x,433);await click(80+107*i,231);await click(240,615);
    await drag(40,715,x,517);await drag(120,715,x,517);await mouseMove(200,715);await page.mouse.down();await mouseMove(280,715,{steps:8});await mouseMove(x,517,{steps:8});await page.mouse.up();await drag(360,715,x,517,750);await drag(440,715,x,517,i===2?940:1980);const brew=Date.now();
    if(i<3){await click(242,656);if(i>0)await drag(56,715,x,517,1510);if(i===2)await drag(148,715,x,517,3210);await drag(240,715,x,517);}
    else{await click(401,656);await mouseMove(280,715);await page.mouse.down();await mouseMove(140,715,{steps:8});await page.waitForTimeout(600);for(let j=0;j<27;j++){await mouseMove(j%2?166:114,715+(j%3-1)*7,{steps:3});await page.waitForTimeout(16);}await page.mouse.up();await drag(140,715,x,517);}
    await page.waitForTimeout(Math.max(1,8300-(Date.now()-brew)));
    if(i===1||i===2){await mouseMove(332,715);await page.mouse.down();await mouseMove(x+30,517,{steps:8});for(let j=0;j<=80;j++){const a=j/80*Math.PI*4;await mouseMove(x+Math.cos(a)*30,517+Math.sin(a)*26);await page.waitForTimeout(12);}await page.mouse.up();}
    await page.screenshot({path:`output/playwright/sharp-production-recipe-${i}.png`});
    await drag(x,517,90,218);let status=await page.locator('#accessible-status').textContent();if(!/Perfect Brew|GOOD|COMBO|Reviewer|thử thách/.test(status)){await drag(x,517,240,218);status=await page.locator('#accessible-status').textContent();}
    if(!/Perfect Brew|GOOD|COMBO|Reviewer|thử thách/.test(status))throw Error(`Recipe ${i}: ${status}`);statuses.push(status);
  }
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('phin-goc-pho:v3')||'{}').day===4,null,{timeout:120000});const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('phin-goc-pho:v3')));
  if(Object.values(save.mastery).some(n=>n!==1))throw Error('Four recipes not all served: '+JSON.stringify(save.mastery));if(save.stats.lifetimeBonuses<23000)throw Error('Reviewer + combo + challenge rewards missing');
  await page.screenshot({path:'output/playwright/sharp-reviewer-summary.png'});await page.reload();await page.waitForTimeout(600);const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('phin-goc-pho:v3')));if(after.balance!==save.balance||after.day!==4)throw Error('Reload changed settlement');
  if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));return{result:'PASS: production subpath, four physically prepared recipes, reviewer Perfect bonus, optional challenge, end-day settlement and reload',pixels,statuses,save,errors,failed};
}
