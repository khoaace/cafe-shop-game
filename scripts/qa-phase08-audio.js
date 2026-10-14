async(page)=>{
  await page.addInitScript(()=>{const Native=window.AudioContext;window.__qaAudio=[];window.AudioContext=class extends Native{constructor(...args){super(...args);window.__qaAudio.push(this);}};});
  await page.goto('http://127.0.0.1:5173');await page.setViewportSize({width:480,height:800});
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('phin-goc-pho:v3')||'{"version":3}');d.settings={sound:true,music:true,reducedMotion:false};localStorage.setItem('phin-goc-pho:v3',JSON.stringify(d));});await page.reload();await page.waitForTimeout(500);
  const check=(v,m)=>{if(!v)throw Error(m);},state=()=>page.evaluate(()=>({audio:[...new Set(window.__qaAudio)].map(c=>c.state),game:window.__PHIN_QA__.snapshot()}));
  check((await state()).audio.length===0,'No audio before first interaction');await page.mouse.click(240,679);await page.waitForTimeout(1000);check((await state()).audio[0]==='running','Audio unlocked');
  await page.mouse.click(445,34);await page.waitForTimeout(200);check((await state()).audio[0]==='suspended','Pause suspends audio');
  await page.mouse.click(240,377);await page.waitForTimeout(200);let s=await state();check(!s.game.save.settings.sound&&s.game.save.settings.music,'Independent SFX toggle');check(s.audio[0]==='suspended','Pause remains silent after changing SFX');
  await page.mouse.click(240,431);await page.mouse.click(240,312);await page.waitForTimeout(300);s=await state();check(!s.game.save.settings.music,'Music muted separately');
  await page.evaluate(()=>window.__qaAudio[0].suspend());const before=(await state()).game.session.elapsed;await page.waitForTimeout(500);check((await state()).game.session.elapsed>before,'Audio suspension does not stop gameplay');
  await page.mouse.click(445,34);await page.mouse.click(240,431);await page.mouse.click(240,312);await page.waitForTimeout(300);check((await state()).audio[0]==='running','Audio recovers on user interaction');
  await page.mouse.click(445,34);return{result:'PASS: gesture unlock, independent music/SFX, paused loop silence and interrupted-context recovery',state:await state()};
}
