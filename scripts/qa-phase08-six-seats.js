async(page)=>{
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot()),check=(v,m)=>{if(!v)throw Error(m);};
  if((await snap()).paused)await page.mouse.click(240,312);
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().customers.filter(c=>c.state==='WAITING').length===6,null,{timeout:120000});
  await page.mouse.click(445,34);const full=await snap();check(full.customers.filter(c=>c.state==='WAITING').length===6,'Six distinct customers waiting');
  const layouts=[];
  for(const[width,height]of[[360,800],[390,844],[430,932],[480,800],[1440,900]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(500);const b=await page.locator('canvas').boundingBox();
    check(b.x>=-1&&b.y>=-1&&b.x+b.width<=width+1&&b.y+b.height<=height+1,'Unclipped '+width);check(Math.abs(b.width/b.height-.6)<.002,'Aspect ratio');
    const click=async(x,y)=>page.mouse.click(b.x+x*b.width/480,b.y+y*b.height/800);
    await click(240,312);await page.screenshot({path:`output/playwright/phase08-six-${width}.png`});await click(445,34);layouts.push({width,height,box:b});
  }
  await page.setViewportSize({width:480,height:800});await page.waitForTimeout(500);await page.mouse.click(240,312);
  // Customer on the newly purchased fourth chair expects den. Use a real physical brew.
  const fourth=(await snap()).customers.find(c=>c.seat===3&&c.state==='WAITING');check(fourth?.recipe==='den','Fourth chair order identity');
  const drag=async(x,y,tx,ty,hold=50)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:8});await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(60);};
  await page.mouse.click(298,385);await page.mouse.click(80,656);await drag(40,715,126,517);await drag(120,715,126,517);await page.mouse.move(200,715);await page.mouse.down();await page.mouse.move(280,715,{steps:8});await page.mouse.move(126,517,{steps:8});await page.mouse.up();await drag(360,715,126,517,750);await drag(440,715,126,517,1980);await page.mouse.click(242,656);await drag(240,715,126,517);await page.waitForTimeout(8100);
  const before=(await snap()).session.served;await drag(126,517,90,311);const after=await snap();check(after.session.served===before+1,'Fourth chair served exactly once');check(after.customers.find(c=>c.id===fourth.id)?.state==='SERVED','Correct ID resolved');
  await page.mouse.click(445,34);return{result:'PASS: six real scheduled guests, five viewport sizes, fourth seat served using third phin',full,layouts,after};
}
