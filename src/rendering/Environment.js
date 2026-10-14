import { COLORS as C } from '../config.js';
import { plant, fanArt, line } from './art.js';
import { worldImage } from './worldAssets.js';
export class Environment {
  constructor(scene, session) {
    this.scene = scene; this.session = session;
    this.static = scene.add.container(0,0).setDepth(1);
    this.moving = scene.add.graphics().setDepth(2);
    this.plants=[];
    if(session.upgrades.decor){
      this.plants.push(plant(scene,27,165,.65,'hanging'));
      if(!session.upgrades.fan)this.plants.push(plant(scene,454,165,.65,'hanging'));
      this.static.add(this.plants);
    }
    if(session.event==='festival'){
      const garland=worldImage(scene,'festival','main',240,89);if(garland)this.static.add(garland);
    }else if(session.upgrades.decor){
      const lights=scene.add.graphics();line(lights,[[0,79],[120,92],[240,79],[360,92],[480,79]],0x716145,1);
      for(let i=0;i<12;i++){lights.fillStyle(C.gold);lights.fillCircle(i*43,82+Math.sin(i)*6,3);}this.static.add(lights);
    }
    this.bike=worldImage(scene,'motorbike','main',-70,176);
    if(this.bike){this.bike.setDisplaySize(50,35).setAlpha(.38);this.static.add(this.bike);}
    if(session.upgrades.fan){this.fan=fanArt(scene,447,133,.85);this.static.add(this.fan);}
    this.rain=Array.from({length:36},(_,i)=>({x:(i*73)%480,y:(i*47)%280,speed:.08+i%3*.015}));
    this.lastFrame=-1;
  }
  update(t) {
    const reduced=this.scene.game.save.data.settings.reducedMotion;
    const frame=Math.floor(t/(reduced?500:33));if(frame===this.lastFrame)return;this.lastFrame=frame;
    const g=this.moving;g.clear();const s=this.session,motion=reduced?0:t;
    this.plants.forEach(p=>p.updateArt(t,reduced));this.fan?.updateArt(t,s.fanActive,reduced);
    if(this.bike){this.bike.setVisible(!reduced);this.bike.x=(motion/33)%620-70;}
    if(s.event==='rain'||s.powerOut){g.fillStyle(0x456878,s.powerOut ? .12 : .16);g.fillRect(0,75,480,290);}
    if(s.event==='rain')for(const drop of this.rain){const y=78+(drop.y+motion*drop.speed)%275;line(g,[[drop.x,y],[drop.x-3,y+9]],0xc2d5d0,1,.45);}
    else{g.fillStyle(0xfff0b8,.04+(reduced?0:Math.sin(t/4500)*.02));g.fillTriangle(0,75,90,75,190,355);}
    if(!reduced){const bx=(motion/65)%550-40,by=95+Math.sin(motion/800)*7;line(g,[[bx-7,by-3],[bx,by],[bx+7,by-3]],0x6a7659,1.5,.5);}
  }
}
