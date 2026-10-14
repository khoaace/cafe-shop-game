async(page)=>{
  await page.goto('http://127.0.0.1:5173');
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('phin-goc-pho:v3')||'null');if(d){d.settings={sound:true,music:true,reducedMotion:false};localStorage.setItem('phin-goc-pho:v3',JSON.stringify(d));}});await page.reload();await page.setViewportSize({width:480,height:800});await page.waitForTimeout(400);
  await page.mouse.click(240,679);await page.waitForTimeout(2200);
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot());const check=(v,m)=>{if(!v)throw new Error(m);};
  await page.mouse.click(445,34);const paused=await snap();await page.waitForTimeout(1200);const after=await snap();
  check(after.paused,'Pause menu pauses');check(paused.session.elapsed===after.session.elapsed,'Clock frozen');check(paused.customers[0].ratio===after.customers[0].ratio,'Patience frozen');
  await page.mouse.click(240,377);check((await snap()).save.settings.sound===false,'Mute persists');await page.mouse.click(240,485);check((await snap()).save.settings.reducedMotion===true,'Reduced-motion setting persists');
  await page.mouse.click(240,312);await page.waitForTimeout(200);
  // The automation browser keeps all tabs visible. Exercise the actual visibility
  // event handlers with an emulated document.hidden value, then restore the native getter.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  const hidden=await snap();await page.waitForTimeout(1200);const hiddenAfter=await snap();
  check(hidden.paused,'Visibility handler pauses game');check(hidden.session.elapsed===hiddenAfter.session.elapsed,'Hidden-tab clock frozen');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(200);check((await snap()).paused,'Return requires explicit resume');
  await page.mouse.click(240,312);await page.waitForTimeout(200);check(!(await snap()).paused,'Resume restores input');
  // Repeated scene changes do not leave event handlers owning the next session.
  for(let i=0;i<4;i++){
    await page.mouse.click(445,34);await page.waitForTimeout(70);await page.mouse.click(240,551);await page.waitForTimeout(70);await page.mouse.click(240,551);await page.waitForTimeout(100);
    check((await snap()).scene==='Menu','Return to menu');await page.mouse.click(240,679);await page.waitForTimeout(150);check((await snap()).scene==='Game','Game restarts');
  }
  await page.reload();await page.waitForTimeout(300);const final=await snap();check(final.save.settings.sound===false,'Reload keeps mute');check(final.save.settings.reducedMotion===true,'Reload keeps motion setting');
  return{result:'PASS: pause, simulated visibility events, audio setting, reduced motion, repeated scene transitions',final};
}
