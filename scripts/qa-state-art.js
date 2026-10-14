async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:480,height:800},deviceScaleFactor:2});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
  try {
    await p.goto('http://localhost:5175');await p.waitForTimeout(400);await p.mouse.click(384,735);await p.waitForTimeout(2200);
    const snap=()=>p.evaluate(()=>window.__PHIN_QA__.snapshot());
    const check=(v,m)=>{if(!v)throw Error(m);};
    const shot=async name=>{await p.mouse.move(12,610);await p.waitForTimeout(300);await p.screenshot({path:`output/playwright/state-art-${name}.png`});};
    const drag=async(x,y,tx,ty,hold=70)=>{await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(tx,ty,{steps:8});await p.waitForTimeout(hold);await p.mouse.up();await p.waitForTimeout(300);};
    check((await snap()).stations[0].drink===null,'Starts without a glass');await shot('empty');
    await drag(40,715,240,517);check((await snap()).stations[0].drink.state==='GLASS','Glass placed');await shot('glass');
    await drag(120,715,240,517);let d=(await snap()).stations[0].drink;check(d.state==='PHIN'&&d.grounds===0&&d.coffee===0,'Empty phin has no grounds or brewed coffee');await shot('phin-empty');
    await p.mouse.move(200,715);await p.mouse.down();await p.mouse.move(280,715,{steps:8});await p.mouse.move(240,517,{steps:8});await p.mouse.up();await p.waitForTimeout(350);
    d=(await snap()).stations[0].drink;check(d.grounds===1&&d.coffee===0,'Grounds added without creating liquid');await shot('phin-grounds');
    await drag(240,517,441,613);check((await snap()).stations[0].drink===null,'Discard empties station');await shot('discarded');
    await drag(40,715,240,517);await drag(120,715,240,517);await p.mouse.move(200,715);await p.mouse.down();await p.mouse.move(280,715,{steps:8});await p.mouse.move(240,517,{steps:8});await p.mouse.up();
    await drag(360,715,240,517,750);await drag(440,715,240,517,1920);await p.mouse.click(242,656);await drag(240,715,240,517);
    await p.waitForFunction(()=>window.__PHIN_QA__.snapshot().stations[0].drink.state==='BREWED');await shot('ready');
    await drag(240,517,90,280);const after=await snap();check(after.session.served===1&&after.stations[0].drink===null,'Serving removes the actual glass');await shot('served');
    check(!errors.length,errors.join('\n'));return{result:'PASS: state-driven glass/grounds rendering, discard and complete manual brew/serve',after,errors};
  } finally {await context.close();}
}
