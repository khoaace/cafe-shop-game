import { seatPosition } from '../logic/layout.js';
import { COLORS as C, RULES } from '../config.js';
import { round, line, label, SERIF } from './primitives.js';
export function leaf(g, x, y, angle, scale = 1, color = C.green) {
  g.save(); g.translateCanvas(x, y); g.rotateCanvas(angle); g.scaleCanvas(scale, scale);
  g.fillStyle(color); g.fillEllipse(0, 0, 12, 28); line(g, [[0, 9], [0, -8]], 0xadc080, 1, 0.55); g.restore();
}
export function plant(g, x, y, scale = 1) {
  g.save(); g.translateCanvas(x, y); g.scaleCanvas(scale, scale);
  g.fillStyle(0x233d31, 0.12); g.fillEllipse(0, 5, 58, 15);
  for (let i = 0; i < 7; i++) {
    const dx = Math.sin(i * 2.3) * 23; const dy = -30 - i * 7;
    line(g, [[0, -6], [dx, dy]], 0x4d7150, 2);
    leaf(g, dx, dy, Math.sin(i) * 0.9, 1.05, i % 2 ? 0x5b7e55 : 0x365e48);
  }
  g.fillStyle(0x85482f); g.fillPoints([{ x: -20, y: -23 }, { x: 20, y: -23 }, { x: 14, y: 4 }, { x: -14, y: 4 }], true);
  round(g, -23, -28, 46, 10, 0xd78b64, 4);
  g.fillStyle(0x583d2b); g.fillEllipse(0,-26,36,5); line(g,[[-18,-19],[15,-19]],0xedb281,1.5); line(g, [[-12, -16], [-9, -2]], 0xecb183, 3, 0.6); g.restore();
}
export function stool(g, x, y, scale = 1) {
  g.save(); g.translateCanvas(x, y); g.scaleCanvas(scale, scale);
  g.fillStyle(C.ink, 0.12); g.fillEllipse(0, 15, 52, 15);
  line(g, [[-15, -4], [-20, 14]], 0x367387, 5); line(g, [[15, -4], [20, 14]], 0x367387, 5);
  line(g, [[-18, 5], [18, 5]], 0x5593a0, 3);
  round(g, -26, -13, 52, 14, 0x245b6b, 5); round(g,-25,-14,50,10,0x4c99a9,4);
  for (let xx=-10;xx<=10;xx+=5) line(g,[[xx,-11],[xx,-8]],0x276477,1.4); line(g, [[-16, -8], [15, -8]], 0x78b4b9, 2); g.restore();
}
export function street(scene, { menu = false, seats = 3 } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(C.paper); g.fillRect(0, 0, 480, 800);
  g.fillStyle(0xe9d4ac); g.fillRect(0, 65, 480, 285);
  // Plaster, brickwork, a shutter and a quiet sunlit alley.
  g.fillStyle(0xd4bb8e); g.fillRect(0, 80, 57, 232); g.fillRect(427, 80, 53, 232);
  for (let y = 90; y < 310; y += 23) line(g, [[0, y], [53, y]], 0xbcaa87, 1, 0.4);
  round(g, 371, 107, 90, 151, 0x547460, 3);
  for (let x = 377; x < 460; x += 10) line(g, [[x, 112], [x, 253]], 0x314f40, 3, 0.45);
  round(g, 19, 196, 58, 76, 0x658575, 2);
  line(g, [[48, 199], [48, 270]], 0xd9d7a9, 3); line(g, [[20, 229], [76, 229]], 0xd9d7a9, 3);
  g.fillStyle(0xfff4ca, 0.19); g.fillPoints([{ x: 110, y: 80 }, { x: 245, y: 80 }, { x: 470, y: 365 }, { x: 260, y: 365 }], true);
  // Enamel sign.
  round(g, 94, 82, 270, 80, C.brown, 5);
  round(g, 98, 86, 262, 72, C.cream, 3);
  g.lineStyle(1, 0xb9925b); g.strokeRoundedRect(103, 91, 252, 62, 2);
  label(scene, 229, 113, 'PHIN GÓC PHỐ', 27, '#304737', { fontFamily: SERIF, fontStyle: 'bold', letterSpacing: 2 });
  label(scene, 229, 141, 'CÀ PHÊ VỈA HÈ  ·  TỪ 06:00 MỖI SÁNG', 9, '#7e6849', { letterSpacing: 1 });
  // Striped canvas awning with soft scallops.
  g.fillStyle(0x2b4035, 0.16); g.fillRect(0, 191, 480, 15);
  for (let x = 0; x < 480; x += 40) {
    g.fillStyle(x % 80 === 0 ? 0x476951 : 0xf3e5c7); g.fillRect(x, 166, 40, 23); g.fillEllipse(x + 20, 188, 40, 18);
    line(g, [[x+3,170],[x+3,184]], 0xffffff, 1, 0.18); line(g, [[x+6,193],[x+33,193]], 0x324f3c, 1, 0.18);
  }
  line(g, [[0, 166], [480, 166]], C.dark, 3);
  // Pavement: bounded repeating tile pattern.
  g.fillStyle(0xc3bba8); g.fillRect(0, 294, 480, 105);
  for (let y = 301; y < 400; y += 25) {
    line(g, [[0, y], [480, y]], 0xaa9f8a, 1);
    for (let x = (y % 2) * 22; x < 480; x += 62) line(g, [[x, y], [x - 10, y + 25]], 0xafa58f, 1);
  }
  for (let i = 0; i < seats; i++) { const p = seatPosition(i, seats); stool(g, p.x, p.y + (seats > 3 ? 16 : 27), seats > 3 ? 0.6 : 0.9); }
  plant(g, 31, 334, 0.8); plant(g, 454, 337, 0.82);
  // Café chalkboard.
  if (seats <= 3) {
  round(g, 178, 209, 122, 73, 0x957547, 5); round(g, 182, 213, 114, 65, C.dark, 3);
  label(scene, 239, 228, 'chậm một chút,', 12, '#eee3c5', { fontFamily: SERIF, fontStyle: 'italic' });
  label(scene, 239, 247, 'thơm cả ngày.', 15, '#e5c58c', { fontFamily: SERIF, fontStyle: 'italic' });
  label(scene, 239, 267, '—  CÀ PHÊ PHA PHIN  —', 7, '#acbda4');
  }
  if (!menu) {
    round(g, 0, 369, 480, 431, 0x83654b, 0);
    round(g, 0, 369, 480, 31, 0xd1a26d, 0);
    line(g, [[0, 374], [480, 374]], 0xf0d2a0, 2);
    for (let yy=376; yy<400; yy+=6) line(g, [[4,yy],[476,yy]], 0x9a693f, 0.7, 0.3);
    round(g, 10, 402, 460, 231, 0xb1bdb1, 14);
    round(g, 14, 405, 452, 223, 0xc2cbbb, 12);
    g.lineStyle(1, 0x617d70, 0.7); g.strokeRoundedRect(14, 405, 452, 223, 12);
    line(g, [[24, 409], [455, 409]], 0xf8f0d8, 2);
    round(g, 0, 639, 480, 161, C.dark, 0);
  }
  return g;
}

