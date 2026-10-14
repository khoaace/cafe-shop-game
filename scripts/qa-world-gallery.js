async (page) => {
 const ctx=await page.context().browser().newContext({viewport:{width:960,height:900},deviceScaleFactor:2});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 try{
 await p.goto('http://localhost:5175');await p.waitForFunction(()=>window.__PHIN_QA__?.snapshot().scene==='Menu');
 await p.evaluate(async()=>{
  const {default:Phaser}=await import('/node_modules/.vite/deps/phaser.js');
  const {person}=await import('/src/rendering/characters.js');
  const {loadWorldAssets,prepareWorldAssets,WORLD_ART}=await import('/src/rendering/worldAssets.js');
  const {street,plant}=await import('/src/rendering/scenery.js');
  const {CustomerView}=await import('/src/rendering/CustomerView.js');
  const {Environment}=await import('/src/rendering/Environment.js');
  const {ARCHETYPES}=await import('/src/config.js');
  document.querySelector('#game').style.display='none';
  const mount=document.createElement('div');mount.id='art-fixture';document.body.append(mount);
  class Fixture extends Phaser.Scene {
   preload(){loadWorldAssets(this);}
   create(){prepareWorldAssets(this);this.game.save={data:{settings:{reducedMotion:false}}};window.fixture=this;this.rigs=[];this.mode='gallery';this.showGallery();}
   showGallery(){this.children.removeAll(true);this.rigs=[];this.mode='gallery';
    this.add.rectangle(480,450,960,900,0xf5e7cb);this.add.text(480,26,'NHỮNG GƯƠNG MẶT CỦA PHIN GÓC PHỐ',{fontSize:'22px',color:'#304d3b'}).setOrigin(.5);
    WORLD_ART.characters.forEach((id,i)=>{const x=160+(i%3)*320,y=198+Math.floor(i/3)*275;const rig=person(this,{id},x,y,1.65,id==='keeper');this.rigs.push(rig);this.add.text(x,y+103,id,{fontSize:'20px',color:'#304d3b'}).setOrigin(.5);});
   }
   showSeats(event='rain'){this.children.removeAll(true);this.rigs=[];this.mode='seats';
    this.session={upgrades:{seats:6,decor:true,fan:true},event,powerOut:false,fanActive:true};this.street=street(this,{seats:6});this.env=new Environment(this,this.session);
    this.views=Array.from({length:6},(_,i)=>new CustomerView(this,{id:'fixture-'+i,seat:i,type:ARCHETYPES[i%5],recipeId:['den','sua','bac','trung'][i%4],state:'WAITING',stateTime:2,ratio:.8,vip:false}));
    this.host=person(this,{id:'keeper'},448,344,.48,true);this.host.root.setDepth(21);
    this.add.text(250,445,'Fixture: 6 khách / không thay đổi save',{fontSize:'12px',color:'#304d3b'}).setOrigin(.5).setDepth(40);
   }
  }
  window.fixtureGame=new Phaser.Game({type:Phaser.WEBGL,parent:'art-fixture',width:960,height:900,backgroundColor:'#f5e7cb',audio:{noAudio:true},scene:[Fixture]});
 });
 await p.waitForFunction(()=>window.fixture?.rigs.length===9);
 const checks=await p.evaluate(()=>{
  const f=window.fixture,check=(v,m)=>{if(!v)throw Error(m);};
  for(const rig of f.rigs){
   for(const mood of ['idle','happy','angry']){rig.drawFace(mood);check(rig.parts.head.frame.name===mood,'expression '+mood);}
   rig.update(4600,false,'idle');check(rig.parts.head.frame.name==='blink','blink frame');
   rig.update(0,true,'idle');const a=rig.parts.leftLeg.rotation;rig.update(110,true,'idle');check(rig.parts.leftLeg.rotation!==a,'walking joint');
   rig.update(110,false,'idle',true,true);check(rig.parts.leftLeg.rotation<0&&rig.parts.rightArm.rotation<-1,'seat and order');
   f.game.save.data.settings.reducedMotion=true;rig.update(10,true,'happy');const before=rig.parts.rightArm.rotation;rig.update(999,true,'happy');check(before===rig.parts.rightArm.rotation,'reduced motion');f.game.save.data.settings.reducedMotion=false;
   rig.update(1200,false,'happy');
  }return {rigs:f.rigs.length,expressions:'idle/blink/happy/angry',joints:'walking/seated/ordering',reducedMotion:'PASS'};
 });
 await p.screenshot({path:'output/playwright/world-character-gallery.png'});
 for(const event of ['rain','festival','power']){
  await p.evaluate(e=>{const f=window.fixture;f.showSeats(e);f.session.powerOut=e==='power';f.session.fanActive=e!=='power';f.views.forEach(v=>v.update(2300));f.env.update(2300);f.street.updateArt(2300);},event);
  await p.screenshot({path:`output/playwright/world-six-seats-${event}.png`});
 }
 const seats=await p.evaluate(()=>{const f=window.fixture;const result=f.views.map(v=>({seat:v.model.seat,own:v.contains(v.x,v.layout.y),other:f.views.filter(q=>q!==v&&q.contains(v.x,v.layout.y)).length}));if(result.some(r=>!r.own||r.other))throw Error('Seat overlaps');const rotor=f.env.fan.list[0];f.env.update(2500);const a=rotor.rotation;f.env.update(2700);if(a!==rotor.rotation)throw Error('Power-out fan moves');f.session.fanActive=true;f.env.update(2900);if(a===rotor.rotation)throw Error('Powered fan does not move');return result;});
 await p.evaluate(()=>window.fixtureGame.destroy(true));
 if(errors.length)throw Error(errors.join('\n'));return {checks,seats,errors};
 }finally{await ctx.close();}
}
