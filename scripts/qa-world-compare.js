async (page) => {
 const phase='before', results=[];
 for(const dpr of [1,2]) for(const [width,height] of [[1366,768],[1920,1080],[2560,1440]]) {
  const ctx=await page.context().browser().newContext({viewport:{width,height},deviceScaleFactor:dpr});
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(String(e)));
  await p.goto('http://localhost:5175');
  await p.waitForFunction(()=>window.__PHIN_QA__?.snapshot().scene==='Menu');
  await p.evaluate(()=>localStorage.setItem('phin-goc-pho:v3',JSON.stringify({version:3,day:10,balance:1000000,upgrades:{phins:4,seats:6,fan:true,premium:true,decor:true},settings:{sound:false,music:false,reducedMotion:false}})));
  await p.reload();await p.waitForFunction(()=>window.__PHIN_QA__?.snapshot().scene==='Menu');
  const r=await p.locator('canvas').boundingBox();await p.mouse.click(r.x+r.width/2,r.y+r.height*679/800);
  await p.waitForTimeout(2400);
  const times=await p.evaluate(()=>new Promise(resolve=>{const ts=[];let last;function f(t){if(last)ts.push(t-last);last=t;if(ts.length===120)resolve(ts.sort((a,b)=>a-b));else requestAnimationFrame(f);}requestAnimationFrame(f);}));
  const snapshot=await p.evaluate(()=>window.__PHIN_QA__.snapshot());
  await p.screenshot({path:`output/playwright/world-${phase}-${width}x${height}-dpr${dpr}.png`});
  results.push({width,height,dpr,median:times[60],p95:times[114],render:snapshot.render,diagnostics:snapshot.diagnostics,errors});await ctx.close();
 }
 return {phase,results};
}
