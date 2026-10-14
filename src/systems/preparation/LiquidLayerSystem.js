const blendColor = (a, b, mix) => {
  const channel = shift => Math.round(((a >> shift) & 255) * (1 - mix) + ((b >> shift) & 255) * mix);
  return channel(16) << 16 | channel(8) << 8 | channel(0);
};

export class LiquidLayerSystem {
  constructor(scene, root, bounds = { left: -20, right: 20, top: -30, bottom: 24 }) {
    this.scene = scene; this.root = root; this.bounds = bounds; this.heights = []; this.targets = []; this.changes = []; this.lastTime = null;
    this.graphics = scene.add.graphics();
    // Geometry masks are in world space: transform the glass polygon on every render.
    this.clip = scene.add.graphics().setVisible(false); this.mask = this.clip.createGeometryMask(); this.graphics.setMask(this.mask);
    this.transform = root.getWorldTransformMatrix(); this.clipTransform = '';
    this.sync = () => this.syncClip(); scene.events.on('prerender', this.sync);
    root.once('destroy', () => this.destroy());
  }
  syncClip() {
    if (!this.clip || !this.root.active) return;
    const b = this.bounds, m = this.root.getWorldTransformMatrix(this.transform);
    const signature = [m.a, m.b, m.c, m.d, m.tx, m.ty].join('/');
    if (signature === this.clipTransform) return;
    this.clipTransform = signature; this.clip.clear();
    const points = [[b.left + 3, b.bottom], [b.left, b.top], [b.right, b.top], [b.right - 3, b.bottom]].map(([x, y]) => ({ x: m.a * x + m.c * y + m.tx, y: m.b * x + m.d * y + m.ty }));
    this.clip.fillStyle(0xffffff); this.clip.fillPoints(points, true);
  }
  render(layers, time = 0, mixing = 0, foam = 0) {
    const g = this.graphics, b = this.bounds; g.clear(); this.syncClip();
    const reduced = this.scene.game.save?.data.settings.reducedMotion;
    const dt = this.lastTime === null ? 1 : Math.max(0, Math.min(0.1, (time - this.lastTime) / 1000)); this.lastTime = time;
    const height = b.bottom - b.top, total = layers.reduce((sum, l) => sum + l.amount, 0);
    const shrink = Math.min(1, height / (total || 1));
    let targetColor = 0;
    if (total) for (const shift of [16, 8, 0]) targetColor |= Math.round(layers.reduce((sum, l) => sum + ((l.color >> shift) & 255) * l.amount, 0) / total) << shift;
    let filled = 0;
    layers.forEach((l, i) => {
      const target = l.amount * shrink;
      if (Math.abs(target - (this.targets[i] || 0)) > 0.01) this.changes[i] = time;
      this.targets[i] = target;
      this.heights[i] = reduced ? target : (this.heights[i] ?? target) + (target - (this.heights[i] ?? target)) * Math.min(1, dt * 12);
      const h = this.heights[i]; if (h < 0.01) return;
      const color = blendColor(l.color, targetColor, mixing);
      const spread = l.slowSpread ? Math.min(1, Math.max(0.12, h / 8)) : 1;
      const width = (b.right - b.left) * spread, left = (b.left + b.right - width) / 2;
      for (let strip = 0; strip < 4; strip++) {
        g.fillStyle(blendColor(color, 0xffffff, strip * 0.025), l.opacity ?? 0.96);
        g.fillRect(left, b.bottom - filled - h + h * strip / 4, width, h / 4 + 0.3);
      }
      const surface = b.bottom - filled - h;
      if (l.foam && i > 0 && !reduced) {
        const wobble = Math.sin(time / 180) * Math.min(1.3, h / 12) * (l.slowSpread ? Math.exp(-Math.max(0, time - (this.changes[i] || 0)) / 1800) : 1);
        g.lineStyle(1.5, l.color, 0.65);
        for (let swirl = 0; swirl < 3; swirl++) g.strokeEllipse(-12 + swirl * 12, b.bottom - filled + wobble, 11, 3);
        g.fillStyle(l.color, 0.45); g.fillEllipse(0, b.bottom - filled, width, 5 + Math.abs(wobble));
      }
      g.fillStyle(color, l.opacity ?? 0.96); g.fillEllipse(0, surface, width, 4);
      if (!reduced && mixing > 0 && mixing < 1) { g.lineStyle(1.5, 0xffffff, 0.15 * (1 - mixing)); g.strokeEllipse(Math.sin(time / 130) * 5, surface + h / 2, 26, Math.max(2, h / 3)); }
      filled += h;
    });
    this.heights.length = layers.length; this.targets.length = layers.length; this.changes.length = layers.length;
    if (filled) {
      g.lineStyle(1, 0xffffff, 0.24); g.strokeEllipse(reduced ? 0 : Math.sin(time / 190) * 1.3, b.bottom - filled, 38, 4);
      if (foam > 0 || layers.at(-1)?.foam) for (let i = 0; i < Math.ceil(foam * 8 + (layers.at(-1)?.foam ? 6 : 0)); i++) { g.fillStyle(0xfff8dd, 0.7); g.fillCircle(-16 + i * 7 % 33, b.bottom - filled + Math.sin(i * 3) * 2, 1.5 + i % 2); }
      g.fillStyle(0xffffff, 0.12); g.fillRoundedRect(-15, b.top + 3, 3, height - 8, 2);
    }
    return filled;
  }
  destroy() { if (!this.clip) return; this.scene.events.off('prerender', this.sync); this.transform.destroy(); this.graphics.clearMask(); this.mask.destroy(); this.clip.destroy(); this.clip = null; }
}
