async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.reload();await page.waitForTimeout(500);
  const point=async(x,y)=>{const r=await page.locator('canvas').boundingBox();return {x:r.x+x*r.width/480,y:r.y+y*r.height/800};};
  const click=async(x,y)=>{const p=await point(x,y);await page.mouse.click(p.x,p.y);await page.waitForTimeout(150);};
  const drag=async(x,y,tx,ty)=>{const a=await point(x,y),b=await point(tx,ty);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();await page.waitForTimeout(300);};
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('phin-goc-pho:v3')));
  const before=await read();if(before.day!==4||before.upgrades.phins!==2)throw Error('Run after four-recipe production day');
  await click(106,735);const p=await point(385,220);await page.mouse.dblclick(p.x,p.y,{delay:40});await page.waitForTimeout(500);
  const bought=await read();if(bought.upgrades.phins!==3||bought.balance!==before.balance-50000)throw Error('Purchase changed wrong amount/level');
  await page.screenshot({path:'output/playwright/sharp-shop.png'});await click(351,731);await page.waitForTimeout(2200);
  await drag(40,715,126,517);await click(298,385);await drag(40,715,126,517);await page.screenshot({path:'output/playwright/sharp-next-day.png'});
  await click(375,34);await page.screenshot({path:'output/playwright/sharp-production-book.png'});await click(419,145);
  await click(445,34);await click(240,551);await click(240,551);await click(245,735);await click(241,180);
  await page.screenshot({path:'output/playwright/sharp-notebook.png'});await page.reload();await page.waitForTimeout(300);
  const after=await read();if(after.balance!==bought.balance||after.upgrades.phins!==3||after.day!==4)throw Error('Reload economic regression');
  if(errors.length)throw Error(errors.join('\n'));return {result:'PASS: Retina production shop, repeated purchase, three phins/two pages, next day, book, notebook and reload',before,bought,after,errors};
}
