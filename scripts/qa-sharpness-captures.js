async (page) => {
  const phase = new URL(page.url()).port === '4173' ? 'before' : 'after';
  const cdp = await page.context().newCDPSession(page);
  const reports=[];
  for(const dpr of [1,2]) for(const [width,height] of [[1366,768],[1920,1080],[2560,1440]]) {
    await page.setViewportSize({width,height});
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});
    await page.goto(phase==='before'?'http://localhost:4173':'http://localhost:5175'); await page.waitForTimeout(350);
    const box=await page.locator('canvas').boundingBox();
    await page.mouse.click(box.x+384/480*box.width,box.y+735/800*box.height); await page.waitForTimeout(2500);
    const metrics=await page.evaluate(()=>({dpr:devicePixelRatio,pixels:[document.querySelector('canvas').width,document.querySelector('canvas').height],render:window.__PHIN_QA__?.snapshot().render}));
    const frame=await page.evaluate(()=>new Promise(resolve=>{const a=[];let last=performance.now();const tick=t=>{a.push(t-last);last=t;if(a.length<90)requestAnimationFrame(tick);else{a.sort((a,b)=>a-b);resolve({median:a[45],p95:a[85]});}};requestAnimationFrame(tick);}));
    await page.screenshot({path:`output/playwright/sharp-${phase}-${width}x${height}-dpr${dpr}.png`}); reports.push({width,height,...metrics,frame});
  }
  await cdp.detach(); return {phase,reports};
}
