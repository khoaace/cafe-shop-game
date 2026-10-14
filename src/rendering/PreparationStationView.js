import { PreparationState } from '../models/PreparationState.js';
import { INGREDIENT_DEFINITIONS } from '../data/drinkEngine.js';
import { LiquidLayerSystem } from '../systems/preparation/LiquidLayerSystem.js';

// Optional equipment for future recipes, instantiated only when their station layout is supplied.
export class PreparationStationView {
  constructor(scene, { id, type, x, y, capacity = 300, volumePerUnit = {}, takeIngredient, refundIngredient }) {
    this.scene = scene; this.id = id; this.type = type; this.x = x; this.y = y;
    this.state = new PreparationState(id, capacity, volumePerUnit); this.takeIngredient = takeIngredient; this.refundIngredient = refundIngredient;
    this.root = scene.add.container(x, y).setDepth(40); this.body = scene.add.graphics(); this.liquid = new LiquidLayerSystem(scene, this.root, { left: -28, right: 28, top: -33, bottom: 24 });
    this.details = scene.add.graphics(); this.caption = scene.add.text(0, 59, '', { fontSize: '12px', color: '#304d3b', align: 'center' }).setOrigin(0.5);
    this.root.add([this.body, this.liquid.graphics, this.details, this.caption]);
    const accepts = type === 'board' ? ['place', 'slice', 'squeeze'] : type === 'blender' ? ['scoop', 'pour', 'lid', 'blend'] : ['pour', 'scoop', 'whisk', 'stir'];
    this.unregister = scene.drinkEngine.registerTarget(id, {
      accepts, radius: 52, visible: () => this.root.visible && this.root.active,
      getState: () => this.state, center: () => ({ x: this.x, y: this.y }),
      contains: (px, py) => Math.abs(px - this.x) <= 52 && Math.abs(py - this.y) <= 48,
      takeIngredient: (ingredient, amount) => this.takeIngredient?.(ingredient, amount) || 0,
      acceptIngredient: (ingredient, amount) => {
        if (this.state.lid) return 0;
        const used = this.takeIngredient?.(ingredient, amount) || 0;
        const added = this.state.add(ingredient, used); this.refundIngredient?.(ingredient, used - added); return added;
      },
      render: (state, time, active) => this.render(time, active),
    });
    this.render(0, false); this.root.once('destroy', () => this.unregister());
  }
  render(time, active) {
    const g = this.body, d = this.details, s = this.state; g.clear(); d.clear();
    const reduced = this.scene.game.save?.data.settings.reducedMotion;
    this.root.setPosition(this.x + (this.type === 'blender' && active && s.lid && !reduced ? Math.sin(time / 18) * 1.4 : 0), this.y);
    if (this.type === 'board') {
      g.fillStyle(0xb98655); g.fillRoundedRect(-47, -35, 94, 70, 8);
      if (s.fruit) { const color = INGREDIENT_DEFINITIONS[s.fruit.ingredient].color; d.fillStyle(color); d.fillCircle(s.fruit.sliced ? -10 : 0, 0, 15); if (s.fruit.sliced) { d.fillCircle(16, 0, 14); d.lineStyle(2, 0xffefbb); d.strokeCircle(16, 0, 10); } }
      this.caption.setText(s.fruit ? `Nước quả: ${s.fruit.extracted.toFixed(1)} ml` : 'Kéo quả lên thớt · vuốt để cắt');
    } else {
      g.fillStyle(0xd6ece3, 0.18); g.fillRoundedRect(-31, -37, 62, 65, 8); g.lineStyle(2, 0xb8c8c2); g.strokeRoundedRect(-31, -37, 62, 65, 8);
      this.liquid.render(s.layers.map(l => ({ ...l, amount: l.amount * (s.volumePerUnit[l.id] || 1) / s.capacity * 57 })), time, s.mixing, s.foam);
      if (this.type === 'blender') {
        g.fillStyle(0x517357); g.fillRoundedRect(-35, 30, 70, 19, 5);
        if (s.lid) { d.fillStyle(0x97a67e); d.fillRoundedRect(-33, -43, 66, 9, 3); }
        if (active && s.lid) { d.lineStyle(2, 0xffffff, 0.5); for (let i = 0; i < 4; i++) d.strokeEllipse(reduced ? 0 : Math.sin(time / 100 + i) * 3, -18 + i * 9, 12 + i * 9, 4 + i * 2); }
        this.caption.setText(`${Math.round(s.consistency * 100)}% · ${s.lid ? 'Giữ công tắc để xay' : 'Kéo nắp lên bình'}`);
      } else this.caption.setText(`Bọt ${Math.round(s.foam * 100)}% · khuấy ${Math.round(s.mixing * 100)}%`);
      // Solid ingredients visibly enter the vessel before blending.
      let i = 0; for (const [id, amount] of Object.entries(s.amounts)) if (amount > 0 && !INGREDIENT_DEFINITIONS[id].liquid) { d.fillStyle(INGREDIENT_DEFINITIONS[id].color, 1 - s.consistency * 0.8); d.fillCircle(-17 + i++ * 10, 16, 4 + Math.min(3, amount)); }
    }
    if (active) { d.lineStyle(2, 0xe8b46b, 0.8); d.strokeRoundedRect(-49, -46, 98, 93, 9); }
  }
  destroy() { this.unregister(); this.root.destroy(); }
}
