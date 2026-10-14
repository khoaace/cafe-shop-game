import { seatPosition } from '../logic/layout.js';
import { COLORS as C } from '../config.js';
import { round, line, label, SERIF } from './primitives.js';
import { plant as legacyPlant, stool as legacyStool, street as legacyStreet } from './legacyScenery.js';
import { worldImage, hasWorldArt } from './worldAssets.js';
export { leaf } from './legacyScenery.js';

export function plant(scene, x, y, scale = 1, variant = 'terra') {
  const root = scene.add.container(x, y).setScale(scale), id = `plant-${variant}`;
  if (!hasWorldArt(scene, id)) { const g=scene.add.graphics(); legacyPlant(g,0,0); root.add(g); root.updateArt=()=>{}; return root; }
  const hanging = variant === 'hanging';
  if (!hanging) root.add(scene.add.ellipse(0, 3, 49, 9, C.dark, 0.16));
  const pot = worldImage(scene, id, 'pot', 0, 0);
  const leaves = worldImage(scene, id, 'leaves', 0, hanging ? -20 : -25);
  root.add([pot, leaves]);
  root.updateArt = (t, reduced = false) => { leaves.rotation = reduced ? 0 : Math.sin(t / 1700 + x) * 0.025; };
  return root;
}
export function stool(scene, x, y, scale = 1) {
  const root=scene.add.container(x,y).setScale(scale);
  if (hasWorldArt(scene,'stool')) {
    root.add(scene.add.ellipse(0,17,53,9,C.dark,0.15));
    root.add(worldImage(scene,'stool','main',0,0));
  } else { const g=scene.add.graphics(); legacyStool(g,0,0);root.add(g); }
  return root;
}
export function fanArt(scene, x, y, scale = 1) {
  const root=scene.add.container(x,y).setScale(scale);
  if (!hasWorldArt(scene,'fan')) {
    const g=scene.add.graphics(); g.lineStyle(2,C.green);g.strokeCircle(0,-10,20);line(g,[[0,7],[0,28]],C.green,4);line(g,[[-13,28],[13,28]],C.green,4);root.add(g);root.updateArt=()=>{};return root;
  }
  const rotor=worldImage(scene,'fan','blades',0,-10), body=worldImage(scene,'fan','body');
  root.add([rotor,body]);let previous=null,angle=0;
  root.updateArt=(t,active,reduced=false)=>{if(previous!==null&&active&&!reduced)angle+=(t-previous)/120;previous=t;rotor.rotation=angle;body.setTint(active?0xffffff:0xc3c4b4);};
  return root;
}
export function tableArt(scene, x, y, width, height) {
  const art=worldImage(scene,'table','main',x,y);
  if(art)return art.setDisplaySize(width,height);
  return scene.add.rectangle(x,y,width,height,0x99704e);
}
export function street(scene, { menu = false, seats = 3 } = {}) {
  if (!['facade','awning','pavement','table','sign','stool'].every(id=>hasWorldArt(scene,id))) return legacyStreet(scene,{menu,seats});
  const root=scene.add.container(0,0);
  root.add(scene.add.rectangle(240,400,480,800,C.paper));
  root.add(worldImage(scene,'facade','main',240,207));
  const ground=worldImage(scene,'pavement','main',240,seats>3?315:345);
  if(ground){if(seats>3)ground.setDisplaySize(480,168);root.add(ground);}
  // Text remains vector-backed Phaser Text, independent of painted boards.
  const sign=worldImage(scene,'sign','main',229,122);if(sign)root.add(sign);
  root.add(label(scene,229,112,'PHIN GÓC PHỐ',27,'#304737',{fontFamily:SERIF,fontStyle:'bold',letterSpacing:2}));
  root.add(label(scene,229,140,'CÀ PHÊ VỈA HÈ  ·  TỪ 06:00 MỖI SÁNG',9,'#705639',{letterSpacing:1}));
  const awning=worldImage(scene,'awning','main',240,177);if(awning)root.add(awning);
  const greenery=[plant(scene,29,337,.78),plant(scene,454,339,.8,'ceramic')];root.add(greenery);
  for(let i=0;i<seats;i++){const p=seatPosition(i,seats);root.add(stool(scene,p.x,p.y+(seats>3?16:27),seats>3?.6:.9));}
  if(seats<=3){
    const g=scene.add.graphics();round(g,179,214,122,68,0x705438,5);round(g,183,218,114,60,C.dark,3);root.add(g);
    root.add(label(scene,240,235,'chậm một chút,',12,'#eee3c5',{fontFamily:SERIF,fontStyle:'italic'}));
    root.add(label(scene,240,255,'thơm cả ngày.',15,'#e5c58c',{fontFamily:SERIF,fontStyle:'italic'}));
    root.add(label(scene,240,272,'—  CÀ PHÊ PHA PHIN  —',7,'#acbda4'));
  }
  if(!menu){
    root.add(tableArt(scene,240,504,480,270));
    const g=scene.add.graphics();line(g,[[0,371],[480,371]],0xf2cf94,2);
    round(g,10,402,460,231,0x658477,14);round(g,14,405,452,223,0xc8d0bd,12);
    g.lineStyle(1,0x617d70,.7);g.strokeRoundedRect(14,405,452,223,12);line(g,[[24,409],[455,409]],0xf8f0d8,2);
    round(g,0,639,480,161,C.dark,0);root.add(g);
  }
  root.updateArt=(t,reduced=false)=>greenery.forEach(p=>p.updateArt(t,reduced));
  return root;
}
