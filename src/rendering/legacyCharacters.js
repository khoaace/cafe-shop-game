import { COLORS as C, RULES } from '../config.js';
import { round, line, label, SERIF } from './primitives.js';
export function person(scene, type, x, y, scale = 1, shopkeeper = false) {
  const root = scene.add.container(x, y).setScale(scale);
  const id = shopkeeper ? 'keeper' : type.id;
  const skin = id === 'driver' ? 0xdca579 : id === 'tourist' ? 0xf2c7a5 : 0xedbd96;
  const shirt = shopkeeper ? 0xffe6bd : type.color;
  const shadow = scene.add.ellipse(0, 47, 55, 10, 0x263c31, 0.19);
  const leg = (side) => {
    const g = scene.add.graphics(); const xx = side * 10;
    line(g, [[xx, 18], [xx + side * 2, 39]], 0x213f3b, 12);
    line(g, [[xx-2, 20], [xx+side*2-2, 36]], 0x506e61, 3);
    round(g, xx-8, 36, 20, 10, 0x27342e, 4);
    round(g, xx-7, 36, 17, 6, id==='student'?0xf0dec0:0x66503c, 3);
    line(g, [[xx-7, 44], [xx+10, 44]], 0xc6bb94, 1.5); return g;
  };
  const leftLeg = leg(-1), rightLeg = leg(1);
  const body = scene.add.graphics();
  if(id==='student') { round(body,-27,-13,54,43,0x6b5840,12); round(body,-27,-8,8,33,0x917447,4); }
  round(body,-24,-19,48,52,0x384c3b,15); round(body,-22,-19,44,49,shirt,14);
  round(body,-20,-14,8,36,0xffffff,4,0.13); round(body,15,-10,6,35,0x213d33,3,0.16);
  line(body,[[-16,27],[15,27]],0x263d32,1.2,0.25);
  round(body,-6,-24,12,14,skin,4);
  if (shopkeeper) {
    round(body,-17,-5,34,37,0x416e58,5); line(body,[[-12,-16],[-9,0],[10,0],[13,-16]],0x718f65,4);
    round(body,-10,12,20,13,0x779772,3); line(body,[[-9,13],[9,13]],0xd7d5a4,1.2);
    body.fillStyle(0xe2bc71); body.fillEllipse(0,7,7,9);
  } else if(id==='office') {
    body.fillStyle(0xffeed4); body.fillTriangle(-12,-17,0,-8,-5,1); body.fillTriangle(12,-17,0,-8,5,1);
    line(body,[[0,-4],[0,25]],0x8f5948,1);
    for(const y of [5,15,24]) {body.fillStyle(0xf9d9a7);body.fillCircle(2,y,1.3);}
    line(body,[[11,-16],[7,9]],0x314e47,2); round(body,3,8,12,10,0xf3e5bd,2);
  } else if(id==='driver') {
    line(body,[[0,-12],[0,29]],0x244e42,2); line(body,[[-21,0],[20,0]],0xe8dd9d,3);
    round(body,-14,7,11,10,0x326f5a,2); line(body,[[-12,9],[-5,9]],0x98c0a1,1);
    line(body,[[8,-15],[4,-8],[9,-2]],0x97b894,2);
  } else if(id==='student') {
    line(body,[[-15,-14],[-11,23]],0xf3d99d,5); line(body,[[15,-14],[11,23]],0xf3d99d,5);
    line(body,[[-6,-11],[0,-6],[6,-11]],0x9b6d34,2); round(body,-8,5,16,15,0xe9bc6c,3);
    line(body,[[-6,8],[5,8]],0x9c6f34,1);
  } else if(id==='uncle') {
    line(body,[[0,-15],[0,28]],0x456b74,1.5); line(body,[[-12,-15],[-4,-6],[0,-13],[5,-6],[12,-15]],0xb7d0c8,2);
    round(body,7,4,10,10,0x608692,2); line(body,[[10,3],[10,9]],0xe3d9ac,1.5);
    for(const yy of [1,12,24]) {body.fillStyle(0xe2dbc0);body.fillCircle(1,yy,1.3);}
  } else if(id==='tourist') {
    line(body,[[-14,-15],[0,13],[14,-15]],0x4a4230,3);
    round(body,-12,6,24,17,0x233c36,4); round(body,-10,7,8,4,0xb0c1a8,1);
    body.fillStyle(0x849e95);body.fillCircle(1,15,7);body.fillStyle(0x284f52);body.fillCircle(1,15,4);body.fillStyle(0xd8e2c9);body.fillCircle(-1,13,1.5);
  } else if(id==='reviewer') {
    line(body,[[-15,-15],[-4,5],[-10,10]],0xe7cab0,4);line(body,[[15,-15],[4,5],[10,10]],0xe7cab0,4);
    round(body,-12,5,24,19,0x543f3c,3);round(body,-10,5,20,16,0xffe7bc,2);
    for(const yy of [9,13,17])line(body,[[-6,yy],[6,yy]],0x957756,1);
  } else if(id==='celebrity') {
    line(body,[[-15,-17],[-3,-6],[14,-16]],0xe8bb5d,4);line(body,[[-13,-16],[-3,4],[11,-16]],0xefd798,1);
    body.fillStyle(0xffd97e);body.fillCircle(-3,4,3);round(body,8,5,11,6,0xf0d6a0,1);
  } else if(id==='creator') {
    line(body,[[-11,-15],[-14,4],[14,4],[11,-15]],0xb8c6c0,4);round(body,-17,-2,7,12,0x354850,3);round(body,10,-2,7,12,0x354850,3);
    round(body,-7,7,15,23,0x273d44,3);round(body,-5,9,11,17,0x82b1a4,2);body.fillStyle(0xf3e2a9);body.fillCircle(0,15,2);
  }
  const arm = side => {
    const g = scene.add.graphics();
    line(g, [[side*19,-10],[side*28,10]],0x3d4e3b,12);
    line(g, [[side*19,-11],[side*27,8]],shirt,10);
    line(g, [[side*26,9],[side*28,17]],skin,8);
    g.fillStyle(skin);g.fillEllipse(side*28,17,10,12);
    line(g,[[side*29,18],[side*29,21]],0xbb8563,0.8);return g;
  };
  const leftArm = arm(-1), rightArm = arm(1);
  const head = scene.add.graphics();
  const hair = shopkeeper ? 0x302e28 : type.hair;
  if(['office','keeper'].includes(id)){head.fillStyle(hair);head.fillCircle(23,-47,11);head.fillStyle(0x685039);head.fillCircle(21,-50,5);}
  head.fillStyle(hair); head.fillEllipse(0,-38,47,49);
  head.fillStyle(0xb78360);head.fillCircle(-21,-33,5);head.fillCircle(21,-33,5);
  head.fillStyle(skin);head.fillEllipse(-1,-34,41,43);
  head.fillStyle(0xffdeb7,0.4);head.fillEllipse(-8,-39,22,30);
  head.fillStyle(0xc28a67,0.22);head.fillEllipse(16,-31,6,24);
  head.fillStyle(hair);head.fillEllipse(-6,-55,37,18);head.fillEllipse(-19,-44,8,22);
  if(id==='student'||id==='creator') {
    head.fillTriangle(-19,-54,-9,-68,0,-52);head.fillTriangle(-6,-57,6,-66,16,-48);head.fillTriangle(7,-57,21,-62,23,-42);
  } else if(id==='uncle') {
    head.fillStyle(skin);head.fillEllipse(0,-55,28,11);head.fillStyle(0xe1dcc4);head.fillEllipse(-18,-45,7,17);head.fillEllipse(18,-45,7,17);
  } else if(id==='celebrity') {
    head.fillStyle(hair);head.fillEllipse(7,-57,35,17);line(head,[[-12,-58],[0,-62],[14,-59]],0x70594c,2);
  } else { line(head,[[-15,-56],[-5,-59],[6,-58]],0xffffff,1,0.13); }
  if(id==='driver') {
    round(head,-26,-66,52,24,0x234b40,15);round(head,-24,-66,48,20,0x539477,13);
    line(head,[[-18,-61],[12,-61]],0x8dc2a0,2);line(head,[[-24,-45],[24,-45]],0xf4e5b8,3);
    line(head,[[-22,-42],[-18,-24],[-10,-18]],0x355a4b,1.7);
  }
  if(id==='tourist') {
    round(head,-20,-68,40,19,0xc49b5b,8);round(head,-18,-68,34,13,0xf0d69a,7);
    round(head,-21,-55,43,6,0x7e6847,2);round(head,-30,-51,60,7,0xf1dca5,3);line(head,[[-25,-51],[22,-51]],0xffeac1,1.5);
  }
  if(shopkeeper) {line(head,[[-19,-56],[3,-62],[18,-55]],0xa2bb88,5);head.fillStyle(0xecc480);head.fillCircle(19,-55,4);}
  if(id==='reviewer') {round(head,-24,-63,48,13,0x6c5262,7);head.fillStyle(0x6c5262);head.fillEllipse(-9,-64,34,13);}
  head.fillStyle(0xd8816a,0.5);head.fillEllipse(-13,-28,9,5);head.fillEllipse(13,-28,9,5);
  line(head,[[0,-33],[-2,-28],[2,-28]],0xbf8262,1.1);
  const face = scene.add.graphics();
  let currentMood = 'idle', blinking = false;
  const drawFace = (mood, closed = false) => {
    currentMood = mood;
    face.clear();
    if (mood === 'happy') {
      line(face, [[-12, -35], [-8, -38], [-4, -35]], 0x443d31, 2);
      line(face, [[4, -35], [8, -38], [12, -35]], 0x443d31, 2);
      face.fillStyle(0x793f31); face.fillEllipse(0, -26, 10, 7);
    } else {
      face.fillStyle(0x443d31); face.fillEllipse(-8, -35, closed ? 7 : 3, closed ? 1 : 4); face.fillEllipse(8, -35, closed ? 7 : 3, closed ? 1 : 4);
      line(face, mood === 'angry' ? [[-4, -24], [0, -27], [4, -24]] : [[-4, -26], [0, -24], [4, -26]], 0x9a5440, 1.5);
      if (mood === 'angry') { line(face, [[-13, -42], [-5, -39]], 0x594034, 2); line(face, [[5, -39], [13, -42]], 0x594034, 2); }
    }
    if (['uncle', 'reviewer'].includes(id)) {
      face.lineStyle(1, 0x5f695b); face.strokeCircle(-8, -35, 7); face.strokeCircle(8, -35, 7); line(face, [[-1, -35], [1, -35]], 0x5f695b, 1);
    }
    if (id === 'celebrity') { round(face,-17,-39,15,9,0x283d3c,3); round(face,2,-39,15,9,0x283d3c,3); line(face,[[-2,-36],[2,-36]],0xc3ad6f,2); line(face,[[-14,-37],[-8,-37]],0x829a89,1); }
  };
  drawFace('idle'); root.add([shadow, leftLeg, rightLeg, body, leftArm, rightArm, head, face]);
  return { root, drawFace, update(t, walking = false, mood = currentMood, seated = false, ordering = false) {
    const motion = scene.game.save.data.settings.reducedMotion ? 0 : 1;
    head.y = face.y = Math.sin(t * 0.002) * 1.2 * motion;
    body.scaleY = 1 + Math.sin(t * 0.002) * 0.013 * motion;
    const swing = walking ? Math.sin(t * 0.012) * 0.17 * motion : Math.sin(t * 0.002) * 0.025 * motion;
    leftLeg.rotation = swing; rightLeg.rotation = -swing; leftArm.rotation = -swing; rightArm.rotation = swing;
    const closed = !!motion && t % 4700 > 4550 && mood === 'idle';
    if (closed !== blinking || mood !== currentMood) { blinking = closed; drawFace(mood, closed); }
    if (seated) { leftLeg.rotation = -0.27; rightLeg.rotation = 0.27; }
    if (ordering) rightArm.rotation = -0.65;
    if (mood === 'angry') head.x = face.x = Math.sin(t / 95) * 2 * motion; else head.x = face.x = 0;
    if (mood === 'happy') rightArm.rotation = -0.8 + Math.sin(t * 0.01) * 0.16 * motion;
  } };
}

