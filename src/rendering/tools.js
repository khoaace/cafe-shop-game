import { itemImage } from './itemAssets.js';
import { COLORS as C, RULES } from '../config.js';
import { round, line, label, SERIF } from './primitives.js';
// Brushed aluminium, with the same upper-left light as every tray illustration.
export function drawPhin(g, x = 0, y = 0, s = 1, pressed = false, grounds = 0) {
  g.save(); g.translateCanvas(x, y); g.scaleCanvas(s, s);
  g.fillStyle(0x203b35, 0.18); g.fillEllipse(3, 19, 68, 13);
  g.lineStyle(5, 0x466465); g.strokeRoundedRect(20, -17, 15, 22, 6);
  g.lineStyle(2, 0xdce9e0); g.strokeRoundedRect(21, -18, 13, 20, 5);
  round(g, -26, -24, 52, 40, 0x395857, 6);
  round(g, -24, -23, 48, 37, 0x9aafaa, 5);
  round(g, -21, -21, 14, 32, 0xe1ebe0, 3);
  round(g, -5, -21, 9, 32, 0xbecfc5, 2);
  round(g, 15, -21, 7, 32, 0x718d88, 2);
  line(g, [[-18, -16], [-18, 6]], 0xffffff, 1.5, 0.8);
  for (const y of [-7, -3, 1]) line(g, [[-4, y], [11, y]], 0x6f8880, 0.7, 0.5);
  g.fillStyle(0xe5eee2); g.fillEllipse(0, -23, 51, 14);
  g.lineStyle(1.5, 0x486662); g.strokeEllipse(0, -23, 51, 14);
  g.fillStyle(pressed ? 0x9cae9d : grounds > 0 ? 0x453226 : 0xadc2b7); g.fillEllipse(0, -23, 42, 8);
  if (!pressed && grounds <= 0) {
    // A bare aluminium filter, not a dark surface resembling coffee grounds.
    g.lineStyle(0.8, 0xe1ebe0); g.strokeEllipse(0, -23, 35, 5);
    for (const xx of [-12, -6, 0, 6, 12]) { g.fillStyle(0x748e83); g.fillCircle(xx, -23, 0.65); }
  } else if (!pressed) {
    for (let i = 0; i < 11; i++) { g.fillStyle(i % 2 ? 0x976846 : 0x65412c); g.fillCircle(-16 + i * 3, -23 + Math.sin(i * 2) * 1.5, 0.8); }
  }
  g.fillStyle(0x284440); g.fillEllipse(0, 14, 67, 12);
  g.fillStyle(0xb8cec4); g.fillEllipse(0, 12, 67, 12);
  g.fillStyle(0xecf2e4); g.fillEllipse(-2, 10, 61, 6);
  line(g, [[-25, 14], [22, 14]], 0x76948b, 1);
  if (pressed) { round(g, -3, -35, 6, 12, 0xc3d5c9, 2); g.fillStyle(0xf1f5e5); g.fillEllipse(0, -35, 15, 6); }
  g.restore();
}
export function drawCoaster(g, x, y) {
  g.fillStyle(0x5a513b, 0.13); g.fillEllipse(x + 1, y + 3, 90, 21);
  g.fillStyle(0xb9a57b); g.fillEllipse(x, y + 1.5, 88, 20);
  g.fillStyle(0xe0cc9f); g.fillEllipse(x, y, 88, 20);
  g.lineStyle(1, 0xb19d72); g.strokeEllipse(x, y, 88, 20);
  // Chords stay inside the ellipse; the glass base rests on its centre.
  for (const dy of [-6, -3, 0, 3, 6]) {
    const halfWidth = 39 * Math.sqrt(1 - (dy / 9) ** 2);
    line(g, [[x - halfWidth, y + dy], [x + halfWidth, y + dy]], 0xbda77a, 0.7, 0.5);
  }
}
export function drawCup(g, drink = null, x = 0, y = 0, scale = 1, t = 0) {
  g.save(); g.translateCanvas(x, y); g.scaleCanvas(scale, scale);
  g.fillStyle(0x253d34, 0.13); g.fillEllipse(1, 36, 66, 13);
  const left = -24; const width = 48; const bottom = 28;
  const quantities = drink ? [drink.condensed * 7, drink.milk * 10, drink.coffee * 27, drink.foam * 13] : [0, 0, 0, 0];
  const total = quantities.reduce((a, b) => a + b, 0);
  const shrink = total > 56 ? 56 / total : 1;
  const colors = [0xe5d6a4, 0xf5e8c9, C.coffee, 0xf2ce78];
  const mixture = drink && drink.stir > 0 && drink.milk + drink.condensed > 0;
  let filled = 0;
  for (let i = 0; i < quantities.length; i++) {
    const h = quantities[i] * shrink; if (h < 0.1) continue;
    let color = colors[i];
    if (mixture && i < 3) {
      const target = drink.milk ? 0xcfac79 : 0xa27148;
      const blend = Math.min(1, drink.stir / RULES.stirRadians);
      const channel = shift => Math.round(((color >> shift) & 255) * (1 - blend) + ((target >> shift) & 255) * blend);
      color = (channel(16) << 16) | (channel(8) << 8) | channel(0);
    }
    g.fillStyle(color, 0.95); g.fillRect(left, bottom - filled - h, width, h + 1);
    g.fillEllipse(0, bottom - filled - h, width, 6);
    filled += h;
  }
  g.fillStyle(0xc0e4d9, 0.12); g.fillRoundedRect(-27, -33, 54, 64, { tl: 3, tr: 3, bl: 10, br: 10 });
  g.lineStyle(2.4, 0x537d77, 0.95); g.strokeRoundedRect(-27, -33, 54, 65, { tl: 3, tr: 3, bl: 10, br: 10 });
  g.lineStyle(2, 0x547c76, 1); g.strokeEllipse(0, -33, 54, 10);
  g.lineStyle(1.2, 0xfffdf0, 0.9); g.strokeEllipse(-1, -34, 48, 7);
  g.lineStyle(1.5, 0xc4dbcc, 0.9); g.strokeEllipse(0, 28, 46, 6);
  line(g, [[-20, -21], [-20, 20]], 0xfffbec, 3, 0.6); line(g, [[18, -15], [18, 23]], 0xf5f3dc, 1, 0.4);
  if (drink?.ice) {
    for (let i = 0; i < Math.min(6, drink.ice); i++) {
      const ix = -13 + (i % 3) * 13, iy = bottom - Math.max(12, filled) + 10 + Math.floor(i / 3) * 13;
      round(g, ix - 6, iy - 5, 13, 13, 0xbde1e1, 3, 0.80);
      line(g, [[ix - 3, iy - 2], [ix + 3, iy - 2]], 0xffffff, 1.3, 0.8);
    }
  }
  if (drink?.foam > 0) {
    for (let i = 0; i < 7; i++) { g.fillStyle(0xffe3a0, 0.8); g.fillCircle(-18 + i * 6, bottom - filled - 1 + Math.sin(i * 3) * 2, 2); }
  }
  // Filter plate (local y=14) sits directly on the glass rim (local y=-33).
  if (drink && ['PHIN', 'PRESSED', 'POURING', 'BREWING'].includes(drink.state)) drawPhin(g, 0, -33 - 14 * 0.94, 0.94, drink.press > 0, drink.grounds);
  if (drink?.state === 'BREWING') {
    const phase = (t % 750) / 750;
    g.fillStyle(C.coffee); g.fillEllipse(0, -40 + phase * 37, 3.5, 5);
  }
  if (drink?.state === 'BREWED' && !drink.ice) {
    for (let i = 0; i < 3; i++) {
      const dy = ((t / 45 + i * 9) % 25);
      line(g, [[-10 + i * 10, -39 - dy], [-7 + i * 10, -46 - dy]], 0xfff2d6, 2, 0.35 * (1 - dy / 25));
    }
  }
  g.restore();
}
// Tray, dragged tool, recipe book and shop all use these exact silhouettes.
function proceduralToolArt(scene, kind, x = 0, y = 0) {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(0x102e29, 0.18); g.fillEllipse(2, 28, kind === 'whisk' ? 34 : 51, 9);
  switch (kind) {
    case 'glass': drawCup(g, null, 0, 0, 0.72); break;
    case 'phin': drawPhin(g, 0, 0, 0.8); break;
    case 'spoon': case 'stir':
      line(g, [[-14, 23], [13, -18]], 0x3a5b57, 7);
      line(g, [[-14, 22], [13, -18]], 0xb9d0c8, 4.5);
      line(g, [[-15, 21], [11, -17]], 0xf7fae9, 1.4);
      g.fillStyle(0x456861); g.fillEllipse(14, -20, 15, 23);
      g.fillStyle(0xe2ece0); g.fillEllipse(13, -21, 12, 20);
      g.fillStyle(0xadc6bd); g.fillEllipse(14, -21, 7, 13); break;
    case 'grounds':
      round(g, -23, -23, 46, 49, 0x432e22, 8); round(g, -21, -23, 42, 46, 0x875135, 7);
      round(g, -18, -19, 7, 38, 0xb1784b, 3); round(g, 15, -19, 5, 38, 0x653c2a, 2);
      round(g, -25, -29, 50, 12, 0x614532, 4); round(g, -24, -29, 48, 8, 0xd5ae71, 3);
      line(g, [[-19, -26], [18, -26]], 0xf6d7a0, 1.5);
      round(g, -18, -7, 36, 25, 0xffe9bd, 3);
      g.lineStyle(0.8, 0xb48951); g.strokeRoundedRect(-15, -4, 30, 19, 2);
      for (const [cx,cy,a] of [[-7,5,-0.5],[6,6,0.6]]) {
        g.save(); g.translateCanvas(cx,cy); g.rotateCanvas(a); g.fillStyle(0x704127); g.fillEllipse(0,0,9,13); line(g, [[1,-4],[-1,0],[1,4]],0xd0a16d,1); g.restore();
      } break;
    case 'press':
      g.fillStyle(0x3b5c54); g.fillEllipse(0, 15, 46, 12); g.fillStyle(0xaac4b8); g.fillEllipse(0, 12, 46, 12);
      g.lineStyle(1, 0xf5f6e5); g.strokeEllipse(-1, 11, 40, 7);
      for (let xx=-12;xx<=12;xx+=6) { g.fillStyle(0x66877a); g.fillCircle(xx,13,1); }
      line(g, [[0, 10], [0, -19]], 0x426960, 7); line(g, [[-1, 9], [-1, -19]], 0xd7e7d7, 4);
      g.fillStyle(0x739587); g.fillEllipse(0,-18,22,8); g.fillStyle(0xf1f3df); g.fillEllipse(-1,-20,22,7); break;
    case 'kettle':
      g.lineStyle(7, 0x193d37); g.strokeRoundedRect(8,-24,25,40,11);
      g.lineStyle(2, 0x67857a); g.strokeRoundedRect(10,-24,22,38,10);
      g.fillStyle(0x45665e); g.fillPoints([{x:-19,y:-2},{x:-35,y:-19},{x:-41,y:-17},{x:-28,y:16}],true);
      g.fillStyle(0xb9d0c3); g.fillPoints([{x:-20,y:-5},{x:-36,y:-21},{x:-39,y:-18},{x:-26,y:12}],true);
      round(g,-26,-21,49,47,0x45665e,17); round(g,-24,-21,44,44,0x9bb9ab,16);
      round(g,-20,-16,12,33,0xe5eee0,6); round(g,9,-14,8,31,0x76988a,4);
      g.fillStyle(0xd9e5d4); g.fillEllipse(-3,-20,39,10); g.lineStyle(1,0x58756a); g.strokeEllipse(-3,-20,39,10);
      round(g,-9,-29,12,9,0x284a3d,4); line(g,[[-7,-27],[-2,-27]],0x8caa95,1.5);
      line(g,[[-13,20],[10,20]],0xd5e4d2,1.5); break;
    case 'condensed': {
      const premium = scene.game.save.data.upgrades?.premium && !scene.tutorial;
      round(g,-21,-25,42,52,0x58726b,5); round(g,-19,-23,38,47,0xf8e6b6,3);
      round(g,-19,-10,38,28,premium?0x356450:0xb14f38,1); round(g,-17,-9,4,26,0xffffff,1,0.16);
      g.fillStyle(0xc7d8ca); g.fillEllipse(0,-24,42,9); g.lineStyle(1,0xf8fae9); g.strokeEllipse(-1,-25,35,5);
      g.fillStyle(0xffdf91); g.fillPoints(Array.from({length:10},(_,i)=>({x:Math.sin(i*Math.PI/5)*(i%2?5:11),y:3-Math.cos(i*Math.PI/5)*(i%2?5:11)})),true);
      line(g,[[-17,22],[16,22]],0xa3bcb0,2); break;
    }
    case 'milk':
      g.lineStyle(6,0x426f69); g.strokeRoundedRect(12,-13,18,28,7); g.lineStyle(2.5,0xd4e4d7); g.strokeRoundedRect(12,-14,17,27,6);
      round(g,-24,-22,43,49,0x568077,8); round(g,-22,-21,39,45,0xf2edcf,7);
      round(g,-18,-16,7,32,0xffffed,3); round(g,10,-15,5,33,0xc3d7c6,2);
      g.fillStyle(0x42726a); g.fillEllipse(-3,-21,42,12); g.fillStyle(0xfffbe2); g.fillEllipse(-3,-22,36,7);
      g.fillStyle(0xf4efd6); g.fillTriangle(-23,-24,-32,-28,-22,-14);
      line(g,[[-3,-6],[7,-6]],0x8cad9d,1); line(g,[[-3,2],[5,2]],0x8cad9d,1); line(g,[[-3,10],[7,10]],0x8cad9d,1); break;
    case 'ice':
      for (let i=0;i<3;i++) { const xx=i===2?0:-12+i*24, yy=i===2?-12:9;
        round(g,xx-12,yy-12,24,25,0x467d82,5); round(g,xx-10,yy-11,21,22,0xa7d9dc,4);
        g.fillStyle(0xe3faf0); g.fillTriangle(xx-9,yy-9,xx+9,yy-9,xx-9,yy+6);
        line(g,[[xx-6,yy+8],[xx+7,yy+8],[xx+7,yy-4]],0x6db2bd,1.5);
      } break;
    case 'bowl':
      g.fillStyle(0x244e46); g.fillEllipse(0,5,65,40); g.fillStyle(0x538e7c); g.fillEllipse(-2,3,60,36);
      line(g,[[-24,6],[-18,16],[-9,20]],0x89b5a0,2);
      round(g,-15,22,30,5,0x1c493e,3); g.fillStyle(0xd9e8c9); g.fillEllipse(0,-7,66,25);
      g.fillStyle(0x84663b); g.fillEllipse(0,-7,57,18); g.fillStyle(0xefc770); g.fillEllipse(-1,-8,55,16);
      g.fillStyle(0xffe8a1); g.fillEllipse(-9,-10,25,8); g.lineStyle(1,0xd7a651); g.strokeEllipse(4,-6,24,7);
      for(const [xx,yy] of [[-19,-8],[16,-9],[9,-3]]) {g.fillStyle(0xffedbb);g.fillCircle(xx,yy,1.5);} break;
    case 'whisk':
      line(g,[[15,-27],[-1,-2]],0x4c3527,9); line(g,[[14,-27],[-1,-3]],0xba7c43,6); line(g,[[12,-26],[-2,-3]],0xf0c187,1.5);
      g.lineStyle(3,0x426e64); g.strokeEllipse(-8,10,25,31); g.lineStyle(1.5,0xdce9d7); g.strokeEllipse(-8,9,23,30); g.strokeEllipse(-8,9,12,30);
      line(g,[[-1,-3],[-14,23]],0xf8fae6,1.5); break;
    case 'coconut':
      // Coconut cream tin: green label, half a coconut, white cream at the open rim.
      round(g,-20,-25,40,52,0x3d5f55,6); round(g,-18,-23,36,48,0xe8efe4,5);
      round(g,-18,-12,36,27,0x3f7a4f,2); round(g,-16,-11,4,25,0xffffff,2,0.18);
      g.fillStyle(0x6b4428); g.fillEllipse(0,2,24,17); g.fillStyle(0xfdf8ec); g.fillEllipse(0,0,19,12); g.fillStyle(0xeee3cc); g.fillEllipse(2,1,10,6);
      g.fillStyle(0xc9d7cb); g.fillEllipse(0,-24,40,9); g.fillStyle(0xfffaf0); g.fillEllipse(0,-24,32,6);
      g.lineStyle(1,0xa9bcb0); g.strokeEllipse(0,-24,40,9);
      line(g,[[-17,21],[16,21]],0xa3bcb0,2); break;
    case 'scoop':
      // Ice scoop resting in a small steel bin of cubes.
      round(g,-24,0,48,26,0x41625c,6); round(g,-22,2,44,22,0x9fb8b0,5);
      for (const [xx,yy] of [[-14,-2],[-3,-5],[9,-2],[16,-6]]) { round(g,xx-6,yy-6,12,12,0x6fa9ae,3); round(g,xx-5,yy-5,10,10,0xcdeef0,3); }
      line(g,[[4,-6],[22,-28]],0x2f4c45,6); line(g,[[4,-7],[22,-28]],0xc9d9d0,3.5);
      g.fillStyle(0x4f706a); g.fillEllipse(-2,-3,24,15); g.fillStyle(0xe2ece4); g.fillEllipse(-2,-4,20,12);
      round(g,-8,-9,6,6,0xe8fbf8,2); round(g,-1,-8,6,6,0xd2f1f1,2);
      line(g,[[-22,22],[20,22]],0x6c8a83,1.5); break;
    case 'blender':
      // Shop icon: steel motor base with a clear jar and green lid.
      round(g,-17,8,34,20,0x2f4a44,6); round(g,-15,9,30,16,0x9cb3aa,5); g.fillStyle(0x7fc06c); g.fillCircle(0,17,4);
      g.fillStyle(0xd7ebe6,0.55); g.fillPoints([{x:-15,y:-24},{x:15,y:-24},{x:11,y:7},{x:-11,y:7}],true);
      g.fillStyle(0xf6eedd); g.fillPoints([{x:-13,y:-9},{x:13,y:-9},{x:11,y:6},{x:-11,y:6}],true);
      g.lineStyle(1.5,0x58817a); g.strokePoints([{x:-15,y:-24},{x:15,y:-24},{x:11,y:7},{x:-11,y:7}],true);
      round(g,-16,-30,32,7,0x3f6b52,3); round(g,-4,-34,8,5,0x2f5240,2);
      g.lineStyle(2.5,0x58817a); g.strokeRoundedRect(14,-19,8,18,3); break;
    case 'tea':
      // Clear pitcher filled with golden-amber brewed tea, handle and pouring spout.
      g.lineStyle(5, 0x3b635a); g.strokeRoundedRect(12, -14, 16, 28, 6);
      g.lineStyle(2, 0xc9ddd3); g.strokeRoundedRect(12, -15, 15, 26, 5);
      round(g, -22, -22, 40, 48, 0x4b746a, 8); round(g, -20, -21, 36, 44, 0xd8ece4, 7, 0.35);
      round(g, -18, -6, 32, 27, 0xad702c, 5, 0.92);
      g.fillStyle(0xd89b38, 0.9); g.fillEllipse(-2, -6, 31, 6);
      round(g, -15, -16, 5, 34, 0xffffff, 2, 0.32);
      g.fillStyle(0x4b746a); g.fillTriangle(-20, -21, -29, -26, -19, -12);
      g.lineStyle(1.5, 0x567f75); g.strokeRoundedRect(-20, -21, 36, 44, 7);
      for (const yy of [-10, -2, 6, 14]) line(g, [[4, yy], [12, yy]], 0x567f75, 1, 0.7); break;
    case 'kumquat':
      // Cluster of fresh green-gold kumquats with a sliced half showing citrus segments.
      round(g, -22, 4, 44, 18, 0x7c5836, 7); round(g, -20, 5, 40, 14, 0xb58654, 6);
      for (const [cx, cy, r, c1, c2] of [[-10, -2, 10, 0x3f7b40, 0x6aa84f], [8, -4, 10, 0x4b8744, 0x82b855], [-1, -11, 9, 0x558f46, 0x93c45a]]) {
        g.fillStyle(c1); g.fillCircle(cx, cy, r); g.fillStyle(c2); g.fillCircle(cx - 2, cy - 2, r * 0.72);
        g.fillStyle(0xe8f5c8, 0.55); g.fillCircle(cx - 3, cy - 4, 2.2);
      }
      g.fillStyle(0x2f5e30); g.fillEllipse(-2, -21, 10, 5);
      g.fillStyle(0x3f7b40); g.fillCircle(9, 4, 9.5); g.fillStyle(0xfff3c4); g.fillCircle(9, 4, 7.8);
      g.fillStyle(0xe8ac30); g.fillCircle(9, 4, 6.4);
      g.lineStyle(0.9, 0xfff3c4);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(g, [[9, 4], [9 + Math.cos(a) * 6.5, 4 + Math.sin(a) * 6.5]], 0xfff3c4, 0.9); } break;
    case 'syrup':
      // Glass bottle of golden sugar syrup with precision pour spout.
      round(g, -15, -10, 30, 36, 0x4c6e65, 7); round(g, -13, -9, 26, 33, 0xe4f0ea, 6, 0.45);
      round(g, -12, -1, 24, 24, 0xd99238, 5, 0.92);
      g.fillStyle(0xf2b95e, 0.85); g.fillEllipse(0, -1, 23, 5);
      round(g, -6, -21, 12, 12, 0xd8eae2, 3); round(g, -7, -25, 14, 5, 0x8a5834, 2);
      line(g, [[0, -25], [-6, -32]], 0xc8d8d0, 3);
      round(g, -10, 4, 20, 11, 0xfff4d8, 2);
      g.lineStyle(1, 0xc78d42); g.strokeRoundedRect(-9, 5, 18, 9, 2);
      round(g, -10, -6, 3.5, 25, 0xffffff, 1.5, 0.35); break;
    case 'orange':
      // Whole bright orange with leaf + cut orange wheel showing citrus segments.
      g.fillStyle(0xd96b18); g.fillCircle(-6, -2, 15);
      g.fillStyle(0xf59d2a); g.fillCircle(-8, -4, 12);
      g.fillStyle(0xffe19c, 0.55); g.fillCircle(-12, -9, 3.5);
      g.fillStyle(0x3f7b40); g.fillEllipse(-4, -18, 12, 6);
      g.fillStyle(0xe87b1e); g.fillCircle(10, 6, 12);
      g.fillStyle(0xfff4d2); g.fillCircle(10, 6, 10);
      g.fillStyle(0xf59d2a); g.fillCircle(10, 6, 8.4);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        line(g, [[10, 6], [10 + Math.cos(a) * 8.4, 6 + Math.sin(a) * 8.4]], 0xfff4d2, 1);
      }
      break;
    case 'lemongrass':
      // Fresh lemongrass stalks with bulbous pale base and green blades.
      for (const [dx, dy, ang] of [[-7, 2, -0.18], [1, 0, -0.05], [8, 3, 0.12]]) {
        g.save(); g.translateCanvas(dx, dy); g.rotateCanvas(ang);
        round(g, -4, -22, 8, 42, 0x6f9e46, 4);
        round(g, -3.5, -18, 7, 36, 0x9bc468, 3);
        round(g, -4.5, 4, 9, 16, 0xdce8a8, 4);
        line(g, [[-1, -18], [-1, 16]], 0xf4f9d8, 1.2, 0.7);
        g.restore();
      }
      round(g, -13, 1, 26, 4, 0xa8763e, 2);
      break;
    case 'peach':
      // Canned peach bowl + stainless tongs gripping a golden peach slice.
      round(g, -22, -4, 44, 28, 0x4b746a, 8); round(g, -20, -3, 40, 25, 0xe4f2ec, 7, 0.5);
      for (const [cx, cy] of [[-8, 9], [6, 10], [-1, 3]]) {
        g.fillStyle(0xe37c24); g.fillEllipse(cx, cy, 18, 11);
        g.fillStyle(0xffb347); g.fillEllipse(cx, cy - 1, 15, 8);
      }
      line(g, [[-14, -24], [0, -5]], 0x5c7f76, 3);
      line(g, [[14, -24], [4, -5]], 0x5c7f76, 3);
      g.fillStyle(0xf59b32); g.fillEllipse(2, -5, 14, 9);
      break;
    case 'peachSyrup':
      // Glass bottle of amber-peach syrup with a peach label.
      round(g, -15, -10, 30, 36, 0x4c6e65, 7); round(g, -13, -9, 26, 33, 0xe4f0ea, 6, 0.45);
      round(g, -12, -1, 24, 24, 0xe0782c, 5, 0.92);
      g.fillStyle(0xffa857, 0.88); g.fillEllipse(0, -1, 23, 5);
      round(g, -6, -21, 12, 12, 0xd8eae2, 3); round(g, -7, -25, 14, 5, 0xb8592a, 2);
      line(g, [[0, -25], [-6, -32]], 0xc8d8d0, 3);
      round(g, -10, 4, 20, 11, 0xfff1dc, 2);
      g.fillStyle(0xf28b30); g.fillCircle(0, 9.5, 3.8);
      round(g, -10, -6, 3.5, 25, 0xffffff, 1.5, 0.35); break;
    case 'lychee':
      // Open lychee jar with stainless fruit scoop holding a translucent white peeled lychee + crimson shell accent.
      round(g, -22, -4, 44, 28, 0x4b746a, 8); round(g, -20, -3, 40, 25, 0xe8f4ee, 7, 0.55);
      round(g, -18, 2, 36, 18, 0xf5ebd6, 6, 0.55);
      for (const [cx, cy] of [[-8, 9], [7, 10], [0, 4]]) {
        g.fillStyle(0xe8ded0); g.fillEllipse(cx, cy, 14, 12);
        g.fillStyle(0xfdfaf4); g.fillEllipse(cx - 1, cy - 1, 11, 9);
        g.fillStyle(0x6d3b2c, 0.45); g.fillCircle(cx + 1, cy + 1, 2.2);
      }
      g.fillStyle(0xc84b52); g.fillCircle(-14, 14, 5.5);
      line(g, [[14, -24], [3, -6]], 0x5c7f76, 3.5);
      g.fillStyle(0xc9d9d0); g.fillEllipse(1, -6, 16, 11);
      g.fillStyle(0xfdfaf4); g.fillEllipse(1, -7, 12, 10);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(-1, -9, 2.2);
      break;
    case 'lycheeSyrup':
      // Glass bottle of pale golden-rose lychee syrup with a lychee emblem.
      round(g, -15, -10, 30, 36, 0x4c6e65, 7); round(g, -13, -9, 26, 33, 0xe4f0ea, 6, 0.45);
      round(g, -12, -1, 24, 24, 0xe6b566, 5, 0.9);
      g.fillStyle(0xf7d89c, 0.88); g.fillEllipse(0, -1, 23, 5);
      round(g, -6, -21, 12, 12, 0xd8eae2, 3); round(g, -7, -25, 14, 5, 0xc2525b, 2);
      line(g, [[0, -25], [-6, -32]], 0xc8d8d0, 3);
      round(g, -10, 4, 20, 11, 0xfff7ea, 2);
      g.fillStyle(0xd1525a); g.fillCircle(-2, 9.5, 3.4);
      g.fillStyle(0xfdfaf4); g.fillCircle(2, 9.5, 3.2);
      round(g, -10, -6, 3.5, 25, 0xffffff, 1.5, 0.35); break;
    case 'cacao':
      // Vintage cocoa powder tin + brass 5g measuring spoon mounded with rich brown cocoa powder.
      round(g, -21, -18, 42, 42, 0x3b2217, 7);
      round(g, -19, -16, 38, 38, 0x6b3e26, 6);
      round(g, -16, -2, 32, 18, 0xfff0d4, 3);
      g.lineStyle(1, 0xb8864b); g.strokeRoundedRect(-15, -1, 30, 16, 2);
      g.fillStyle(0x7c4527); g.fillEllipse(0, 7, 14, 9);
      line(g, [[-5, 7], [5, 7]], 0xf5d49c, 1);
      g.fillStyle(0x4a291a); g.fillEllipse(0, -16, 38, 10);
      g.fillStyle(0x7a472c); g.fillEllipse(-1, -17, 30, 8);
      line(g, [[16, -28], [3, -14]], 0x9b6b3b, 4);
      line(g, [[15, -28], [2, -15]], 0xe6be7a, 2);
      g.fillStyle(0xc8964e); g.fillEllipse(0, -14, 15, 10);
      g.fillStyle(0x5b321d); g.fillEllipse(0, -15, 12, 8);
      g.fillStyle(0x8c5538); g.fillCircle(-2, -16, 2.5);
      break;
    case 'matcha':
      // Ceramic matcha tin with vibrant green powder mound and curved bamboo chashaku scoop.
      round(g, -20, -17, 40, 40, 0x26412b, 7);
      round(g, -18, -15, 36, 36, 0x3f6b43, 6);
      round(g, -15, -2, 30, 17, 0xf7f2df, 3);
      g.lineStyle(1, 0x8bb369); g.strokeRoundedRect(-14, -1, 28, 15, 2);
      g.fillStyle(0x528f3d); g.fillEllipse(-2, 6, 11, 7);
      g.fillStyle(0x7ac154); g.fillEllipse(3, 6, 9, 5);
      g.fillStyle(0x28472b); g.fillEllipse(0, -15, 36, 9);
      g.fillStyle(0x63ab45); g.fillEllipse(0, -16, 28, 7);
      // Bamboo chashaku scoop holding vibrant matcha powder.
      line(g, [[16, -28], [2, -14]], 0xa57c48, 4.2);
      line(g, [[15, -28], [1, -15]], 0xe2c084, 2.2);
      g.fillStyle(0xd2ad6d); g.fillEllipse(0, -14, 14, 9);
      g.fillStyle(0x5ba33d); g.fillEllipse(0, -15, 11, 7);
      g.fillStyle(0x8be060); g.fillCircle(-1.5, -16, 2.4);
      break;
    case 'chasen':
      // Carved bamboo matcha whisk (chasen) with handle, black thread knot, and fine curved tines.
      round(g, -6, -27, 12, 16, 0x9b7240, 4);
      round(g, -5, -26, 10, 14, 0xd8b577, 3);
      round(g, -6.5, -13, 13, 3.5, 0x232320, 1.5);
      for (let i = -5; i <= 5; i++) {
        const x1 = i * 1.1;
        const x2 = i * 2.5;
        line(g, [[x1, -10], [x2, 8], [x2 * 0.78, 20]], i % 2 === 0 ? 0xe5c78a : 0xbe9656, 1.25);
      }
      g.lineStyle(1.3, 0xe8cd94, 0.9);
      g.strokeEllipse(0, 15, 24, 10);
      g.fillStyle(0x73bf4e, 0.75);
      g.fillEllipse(0, 19, 16, 5);
      break;
    case 'trash':
      round(g,-18,-14,36,38,0x395c52,5); round(g,-16,-14,32,35,0x789888,4); round(g,-14,-11,6,29,0xb2c5ad,2);
      round(g,-21,-21,42,8,0x2e5145,3); round(g,-20,-22,39,6,0xa7bfa7,3);
      g.lineStyle(3,0xb9ccb5); g.strokeRoundedRect(-7,-28,14,7,2);
      for(const xx of [-6,2,10]) line(g,[[xx,-7],[xx,16]],0x436c5a,2); break;
  }
  return g;
}

export function toolArt(scene, kind, x = 0, y = 0) {
  const illustrated = illustratedTool(scene, kind, x, y);
  if (illustrated) return illustrated;
  const name = kind === 'condensed' && scene.game.save?.data.upgrades?.premium && !scene.tutorial ? 'condensed-premium' : kind;
  if (!scene.textures.exists(`item-${name === 'stir' ? 'spoon' : name}`)) return proceduralToolArt(scene, kind, x, y);
  const root = scene.add.container(x, y);
  root.add(scene.add.ellipse(1, 30, 44, 7, 0x263c31, 0.15));
  root.add(itemImage(scene, name));
  return root;
}

// Shared pieces keep the tray, carried tool and prepared fruit in the same style.
function illustratedTool(scene, kind, x, y) {
  const dependencies = {
    kumquat: ['kumquat', 'kumquat-half'], orange: ['orange', 'orange-wheel'],
    lemongrass: ['lemongrass'], peach: ['tongs', 'peach-piece'],
    lychee: ['fruit-scoop', 'lychee-fruit'], cacao: ['spoon'], matcha: ['chashaku'],
    blender: ['blender-base', 'blender-jar', 'blender-lid'],
  }[kind];
  if (!dependencies || dependencies.some(name => !scene.textures.exists(`item-${name}`))) return null;
  const root = scene.add.container(x, y);
  const add = (name, ix, iy, w, h, angle = 0) => {
    const image = itemImage(scene, name, ix, iy, w, h).setRotation(angle);
    root.add(image); return image;
  };
  if (kind === 'kumquat') {
    add('kumquat', -11, 4, 27, 30); add('kumquat', 8, -6, 27, 30);
    add('kumquat-half', 11, 15, 25, 24);
  } else if (kind === 'orange') {
    add('orange', -5, -3, 39, 43); add('orange-wheel', 13, 15, 28, 27);
  } else if (kind === 'lemongrass') {
    add('lemongrass', -7, 1, 10, 64, -0.15); add('lemongrass', 7, 1, 10, 64, 0.13); add('lemongrass', 0, 0, 10, 66);
  } else if (kind === 'peach') {
    add('tongs', 3, -1, 37, 64); add('peach-piece', -10, 19, 27, 18, -0.2);
  } else if (kind === 'lychee') {
    add('fruit-scoop', 0, -1, 43, 65); add('lychee-fruit', -10, 18, 21, 20);
  } else if (kind === 'blender') {
    add('blender-base', 0, 20, 40, 25); add('blender-jar', 1, -9, 39, 44); add('blender-lid', -1, -32, 31, 10);
  } else {
    add(kind === 'cacao' ? 'spoon' : 'chashaku', 0, 0, 39, 65);
    const powder = scene.add.graphics();
    powder.fillStyle(kind === 'cacao' ? 0x593321 : 0x4e8736); powder.fillEllipse(11, -18, 13, 8);
    powder.fillStyle(kind === 'cacao' ? 0x8e5b3b : 0x82b354); powder.fillEllipse(9, -20, 10, 5);
    for (let i = 0; i < 7; i++) {
      powder.fillStyle(kind === 'cacao' ? 0xb17c51 : 0xb4d77d, 0.6);
      powder.fillCircle(6 + i * 1.5, -20 + (i % 3) * 1.2, 0.55);
    }
    root.add(powder);
  }
  return root;
}
