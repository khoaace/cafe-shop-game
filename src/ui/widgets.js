import Phaser from 'phaser';
import { label, round, FONT } from '../rendering/art.js';
import { COLORS as C } from '../config.js';
export function button(scene, x, y, width, height, title, action, options = {}) {
  const root = scene.add.container(x, y);
  const bg = scene.add.graphics();
  round(bg, -width / 2, -height / 2 + 3, width, height, 0x102e22, options.radius ?? 10, 0.13);
  round(bg, -width / 2, -height / 2, width, height, options.fill ?? C.dark, options.radius ?? 10);
  const text = label(scene, 0, 0, title, options.size ?? 14, options.color ?? '#fff1d4', { fontStyle: options.bold === false ? 'normal' : 'bold' });
  root.add([bg, text]);
  root.setSize(width, height).setInteractive(new Phaser.Geom.Rectangle(0, (height - Math.max(44, height)) / 2, width, Math.max(44, height)), Phaser.Geom.Rectangle.Contains);
  // Phaser input adds the container display origin before testing local bounds.
  root.on('pointerdown', (pointer, lx, ly, event) => { event.stopPropagation(); scene.game.audio.unlock(); scene.game.audio.play('ui'); action(); });
  root.on('pointerover', () => bg.setAlpha(0.87)); root.on('pointerout', () => bg.setAlpha(1));
  root.input.cursor = 'pointer';
  root.title = text; return root;
}
export function announce(text) {
  const node = document.getElementById('accessible-status'); if (node) node.textContent = text;
}
export function panel(scene, x, y, w, h, color = C.cream) {
  const g = scene.add.graphics(); round(g, x + 2, y + 6, w, h, C.dark, 18, 0.14); round(g, x, y, w, h, color, 18); return g;
}
export function wrappedLabel(scene, x, y, text, width, size = 15, color = '#435447', options = {}) {
  return label(scene, x, y, text, size, color, { fontFamily: FONT, wordWrap: { width, useAdvancedWrap: true }, align: 'center', lineSpacing: 6, ...options });
}
