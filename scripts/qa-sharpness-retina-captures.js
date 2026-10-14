async (page) => {
  const reports=[];
  for(const dpr of [1,2]) for(const [width,height] of [[1366,768],[1920,1080],[2560,1440]]) {
    const context=await page.context().browser().newContext({viewport:{width,height},deviceScaleFactor:dpr});
    const shot=await context.newPage();
    try {
      await shot.goto('http://localhost:5175');await shot.waitForTimeout(400);
      const box=await shot.locator('canvas').boundingBox();await shot.mouse.click(box.x+384/480*box.width,box.y+735/800*box.height);await shot.waitForTimeout(2500);
      const metrics=await shot.evaluate(()=>({dpr:devicePixelRatio,pixels:[document.querySelector('canvas').width,document.querySelector('canvas').height],render:window.__PHIN_QA__.snapshot().render,diagnostics:window.__PHIN_QA__.snapshot().diagnostics}));
      const frame=await shot.evaluate(()=>new Promise(resolve=>{const a=[];let last=performance.now();const tick=t=>{a.push(t-last);last=t;if(a.length<90)requestAnimationFrame(tick);else{a.sort((a,b)=>a-b);resolve({median:a[45],p95:a[85]});}};requestAnimationFrame(tick);}));
      await shot.screenshot({path:`output/playwright/sharp-after-${width}x${height}-dpr${dpr}.png`});
      if(await shot.evaluate(()=>devicePixelRatio)!==dpr)throw Error('Screenshot changed DPR');reports.push({width,height,...metrics,frame});
    } finally { await context.close(); }
  }
  return {result:'PASS: native-resolution screenshots and measurements with persistent DPR',phase:'after',reports};
}
