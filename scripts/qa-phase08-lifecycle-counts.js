async(page)=>{
  await page.goto('http://127.0.0.1:5173');await page.setViewportSize({width:480,height:800});await page.waitForTimeout(500);
  const click=async(x,y)=>{await page.mouse.click(x,y);await page.waitForTimeout(100);};
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot()),rows=[];
  for(let i=0;i<8;i++){
    await click(240,679);await page.waitForTimeout(2300);const active=await snap();
    if(active.diagnostics.inputListeners.some(n=>n!==1))throw Error('Duplicate input listener');
    await click(375,34);await click(419,145);await click(445,34);await click(240,551);await click(240,551);await page.waitForTimeout(250);
    const menu=await snap();if(menu.scene!=='Menu')throw Error('Scene exit');rows.push({iteration:i+1,active:active.diagnostics,menu:menu.diagnostics});
    if(menu.diagnostics.timers||menu.diagnostics.tweens)throw Error('Leaked timer/tween');if(i&&JSON.stringify(rows[0].menu)!==JSON.stringify({...menu.diagnostics,fps:rows[0].menu.fps}))throw Error('Menu object/listener growth');
  }
  await click(245,735);for(let tab=0;tab<5;tab++){await click(69+tab*86,180);await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/phase08-notebook-${tab}.png`});}
  return{result:'PASS: eight scene cycles, stable objects/timers/input and resize listeners, notebook five pages',rows};
}
