// Bounded pool shared by all stations. Gameplay amounts drive emission.
export class PreparationEffects {
  constructor(scene) { this.scene = scene; this.pool = []; this.streams = new Map(); this.graphics = scene.add.graphics().setDepth(109); }
  get reduced() { return this.scene.game.save?.data.settings.reducedMotion; }
  acquire(x, y, color, radius = 3, shape = 'circle') {
    let dot = this.pool.find(p => !p.visible && p.effectShape === shape);
    if (!dot && this.pool.length < 48) { dot = (shape === 'ice' ? this.scene.add.rectangle(x, y, radius * 2, radius * 2, color, 0.85).setStrokeStyle(1, 0xffffff, 0.65) : this.scene.add.circle(x, y, radius, color)).setDepth(110); dot.effectShape = shape; this.pool.push(dot); }
    if (!dot) return null;
    this.scene.tweens.killTweensOf(dot); if (shape === 'circle') dot.setRadius(radius);
    dot.setPosition(x, y).setFillStyle(color).setVisible(true).setAlpha(1).setScale(1); return dot;
  }
  particles(x, y, color, count = 6) {
    if (this.reduced) return;
    for (let i = 0; i < Math.min(12, count); i++) {
      const p = this.acquire(x, y, color); if (!p) break;
      this.scene.tweens.add({ targets: p, x: x + Math.cos(i * 2.4) * 23, y: y + Math.sin(i * 2.4) * 18 - 8, alpha: 0, scale: 0.2, duration: 350 + i * 20, onComplete: () => p.setVisible(false) });
    }
  }
  splash(x, y, color, amount) { if (amount > 0) this.particles(x, y, color, Math.max(2, Math.min(8, Math.ceil(amount)))); }
  ice(x, y, delay = 0) {
    if (this.reduced) return;
    const p = this.acquire(x, y - 48, 0xd6ece3, 6, 'ice'); if (!p) return;
    this.scene.tweens.add({ targets: p, y: y + 14, rotation: 0.7, delay, duration: 430, ease: 'Bounce.Out', onComplete: () => { this.splash(x, y + 14, 0xd6ece3, 2); p.setVisible(false); } });
  }
  landing(x, y, tx, ty, color) {
    if (this.reduced) return;
    const p = this.acquire(x, y, color, 6); if (!p) return;
    this.scene.tweens.add({ targets: p, x: tx, y: ty, scaleX: 1.2, scaleY: 0.8, duration: 220, ease: 'Bounce.Out', onComplete: () => p.setVisible(false) });
  }
  stream(key, from, to, color, amount) { if (amount > 0) this.streams.set(key, { from, to, color, amount }); else this.streams.delete(key); }
  render(time) {
    const g = this.graphics; g.clear();
    for (const { from, to, color, amount } of this.streams.values()) {
      const width = Math.max(1.5, Math.min(5, amount * 20));
      g.lineStyle(width, color, 0.9); g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(to.x + (this.reduced ? 0 : Math.sin(time / 60)), to.y); g.strokePath();
      g.lineStyle(0.8, 0xffffff, 0.45); g.beginPath(); g.moveTo(from.x - 0.5, from.y); g.lineTo(to.x - 0.5, to.y); g.strokePath();
    }
    this.streams.clear();
  }
  perfect(x, y) { this.particles(x, y, 0xffd477, 12); }
  reward(x, y, text) {
    const label = this.scene.add.text(x, y, text, { fontSize: '18px', color: '#315c3c', stroke: '#fff0ce', strokeThickness: 3 }).setOrigin(0.5).setDepth(121);
    this.scene.tweens.add({ targets: label, y: y - 35, alpha: 0, duration: this.reduced ? 400 : 1300, onComplete: () => label.destroy() });
  }
  destroy() { this.graphics.destroy(); for (const p of this.pool) { this.scene.tweens.killTweensOf(p); p.destroy(); } this.pool.length = 0; this.streams.clear(); }
}
