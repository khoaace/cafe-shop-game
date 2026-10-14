async(page)=>{
  await page.goto('http://127.0.0.1:5173');await page.setViewportSize({width:480,height:800});
  await page.evaluate(()=>{localStorage.setItem('phin-goc-pho:v3',JSON.stringify({version:3,day:10,upgrades:{phins:4,seats:6,fan:true,premium:true,decor:true},settings:{sound:false,music:false,reducedMotion:false},dayPlan:{day:10,seed:9,event:'festival',vip:'creator',vipAt:1,expectedOrders:8,challenge:{kind:'recipe',recipe:'bac',target:2,label:'Phục vụ 2 bạc xỉu',reward:15000}}}));});await page.reload();await page.waitForTimeout(500);await page.mouse.click(240,679);
  const snap=()=>page.evaluate(()=>window.__PHIN_QA__.snapshot()),check=(v,m)=>{if(!v)throw Error(m);};
  await page.waitForFunction(()=>window.__PHIN_QA__.snapshot().customers.filter(c=>c.state==='WAITING').length===6,null,{timeout:120000});
  const frames=await page.evaluate(()=>new Promise(resolve=>{let times=[],last=performance.now();function frame(t){times.push(t-last);last=t;if(times.length===121)resolve(times.slice(1));else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));frames.sort((a,b)=>a-b);const six=await snap();
  check(six.customers.filter(c=>c.state==='WAITING').length===6,'Six guests during live frame sample');
  const drag=async(x,y,tx,ty,hold=60)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:8});await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(80);};
  await page.mouse.click(414,385);
  for(const [seat,x,recipe]of[[4,354,0],[5,126,1]]){
    const guest=(await snap()).customers.find(c=>c.seat===seat&&c.state==='WAITING');check(!!guest,'Extra seat waiting');
    await page.mouse.click(80,656);await page.mouse.click(x,433);await page.mouse.click(80+recipe*107,231);await page.mouse.click(240,615);
    await drag(40,715,x,517);await drag(120,715,x,517);await page.mouse.move(200,715);await page.mouse.down();await page.mouse.move(280,715,{steps:8});await page.mouse.move(x,517,{steps:8});await page.mouse.up();await drag(360,715,x,517,750);await drag(440,715,x,517,1980);
    await page.mouse.click(242,656);if(recipe)await drag(56,715,x,517,1510);await drag(240,715,x,517);await page.waitForFunction((i)=>window.__PHIN_QA__.snapshot().stations[i].drink.state==='BREWED',x===354?3:2);
    if(recipe){await page.mouse.move(332,715);await page.mouse.down();await page.mouse.move(x+30,517,{steps:8});for(let j=0;j<=80;j++){const a=j/80*Math.PI*4;await page.mouse.move(x+Math.cos(a)*30,517+Math.sin(a)*26);await page.waitForTimeout(12);}await page.mouse.up();}
    const before=(await snap()).session.served;await drag(x,517,[90,240,390][seat%3],311);const after=await snap();check(after.session.served===before+1,'Seat '+(seat+1)+' received valid coffee');check(after.customers.find(c=>c.id===guest.id)?.state==='SERVED','Exact guest ID');
  }
  await page.screenshot({path:'output/playwright/phase08-extra-seats.png'});await page.mouse.click(445,34);
  return{result:'PASS: live six-guest frame sample, purchased seats 5/6 served independently with phins 4/3',frameMs:{median:frames[60],p95:frames[114],max:frames[119]},six,after:await snap()};
}
