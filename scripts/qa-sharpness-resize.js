async (page) => {
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
    if(cycle===1)await page.screenshot({path:`output/playwright/sharp-resize-${width}x${height}.png`});
  }
  const grouped=rows.filter(r=>r.width===480);check(grouped[0].render.textureCount===grouped[1].render.textureCount,'Texture cache stable after resize cycles');check(grouped[0].render.textCount===grouped[1].render.textCount,'Text registry stable');
  check(!errors.length,errors.join('\n'));await cdp.detach();return {result:'PASS: live resize, logical hit areas, DPR changes, exact cup identity, overlays, stable texture/text counts',rows,errors};
}
