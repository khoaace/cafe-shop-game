async(page)=>{
  await page.goto('http://127.0.0.1:5173');await page.waitForTimeout(500);
  const results=[];
  for(const [width,height]of[[360,800],[390,844],[430,932],[480,800],[1440,900]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(700);
    const box=await page.locator('canvas').boundingBox();
    if(box.x < -1||box.y < -1||box.x+box.width>width+1||box.y+box.height>height+1)throw new Error('Clipped canvas at '+width+'x'+height);
    if(Math.abs(box.width/box.height-0.6)>0.002)throw new Error('Wrong aspect ratio');
    await page.screenshot({path:'output/playwright/layout-'+width+'x'+height+'.png'});results.push({width,height,box});
  }
  await page.setViewportSize({width:360,height:800});await page.waitForTimeout(300);
  const box=await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x+240*box.width/480,box.y+679*box.height/800);await page.waitForTimeout(2300);
  await page.screenshot({path:'output/playwright/game-360.png'});
  return{result:'PASS: all requested viewports fit within safe bounds',results};
}
