export const FONT = '"Trebuchet MS", Arial, sans-serif';
export const SERIF = 'Georgia, "Times New Roman", serif';
export function label(scene, x, y, text, size = 16, color = '#283d34', options = {}) {
  const object = scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, ...options }).setOrigin(0.5);
  return scene.game.rendering ? scene.game.rendering.text(object) : object;
}
export function round(g, x, y, w, h, color, radius = 12, alpha = 1) {
  g.fillStyle(color, alpha); g.fillRoundedRect(x, y, w, h, radius); return g;
}
export function line(g, points, color, width = 2, alpha = 1) {
  g.lineStyle(width, color, alpha); g.beginPath();
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.strokePath();
}
