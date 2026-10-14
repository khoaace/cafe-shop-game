import { SaltedCream, CREAM_PERFECT } from '../models/SaltedCream.js';
import { button } from '../ui/widgets.js';
import { toolArt, label, round } from './art.js';

const STAGES = { LIQUID: 'Kem lỏng', 'SMALL BUBBLES': 'Bọt nhỏ', 'SOFT FOAM': 'Kem mềm', 'PERFECT CREAM': 'Kem hoàn hảo', OVERWHIPPED: 'Quá bông rồi!' };
export class SaltedCreamStation {
  constructor(scene) {
    this.scene = scene; this.toolObjects = []; this.state = new SaltedCream(); this.removers = [];
    this.root = scene.add.container(0, 0).setDepth(45).setVisible(false);
    this.bowl = scene.add.container(90, 714).setDepth(100);
    this.body = scene.add.graphics(); this.bowl.add(this.body); this.root.add(this.bowl);
    this.gauge = scene.add.graphics(); this.caption = label(scene, 90, 684, '', 10, '#fff4de');
    this.stageText = label(scene, 90, 752, '', 10, '#fff4de');
    this.root.add([this.gauge, this.caption, this.stageText]);
    this.removers.push(scene.drinkEngine.registerTarget('salted-cream-bowl', {
      accepts: ['pour', 'scoop', 'whisk'], radius: 48,
      visible: () => this.root.visible && this.root.active,
      contains: (x, y) => Math.abs(x - 90) <= 53 && Math.abs(y - 714) <= 38,
      center: () => ({ x: 90, y: 714, radius: 38 }), pourPoint: () => ({ x: 90, y: 710 - this.state.foam * 8 }), getState: () => this.state,
      acceptIngredient: (id, requested) => {
        if (!['cream', 'salt'].includes(id)) return 0;
        const used = scene.session.consumeIngredient(id, requested), accepted = this.state.add(id, used);
        scene.session.refundIngredient(id, used - accepted); return accepted;
      },
      onChange: (action, amount) => {
        if (action === 'whisk' && amount) { scene.game.audio.play('creamWhisk'); if (this.state.foam > 0.25) scene.game.audio.play('foamBubble'); }
        if (this.state.salty) scene.toast('Hơi mặn rồi!');
        if (this.state.stage === 'PERFECT CREAM' && !this.state.perfectAnnounced) {
          this.state.perfectAnnounced = true; scene.drinkEngine.effects.perfect(90, 708);
          scene.toast('KEM BÔNG HOÀN HẢO!'); scene.game.audio.play('creamPerfect', 0.024);
        }
      }, render: (_, time) => this.render(time),
    }));
    const cupOnly = t => t.recipeId?.() === 'muoi';
    const bowlOnly = t => t.id === 'salted-cream-bowl';
    const addTool = (id, kind, x, name, options) => {
      const bg = scene.add.graphics(); round(bg, x - 33, 679, 66, 86, 0x46604c, 8);
      const art = toolArt(scene, kind, x, 715).setScale(0.76);
      this.toolObjects.push(art);
      this.root.add([bg, art, label(scene, x, 751, name, 10, '#fff4de')]);
      this.removers.push(scene.drinkEngine.registerTool(id, art, { hitSize: 56, ...options })); return art;
    };
    addTool('salt-cream-jug', 'milk', 210, 'Kem béo', { action: 'pour', ingredient: 'cream', rate: 18, canTarget: bowlOnly,
      hint: () => `Kem ${this.state.amounts.cream?.toFixed(0) || 0}/40 ml · nghiêng sang phải · thả để dừng`, onPour: () => scene.game.audio.play('creamPour') });
    const salt = addTool('salt-measure', 'spoon', 290, '0,15 g muối', { action: 'scoop', ingredient: 'salt', quantity: 0.15, canTarget: bowlOnly });
    const crystals = scene.add.graphics(); crystals.fillStyle(0xffffff); for (let i = 0; i < 5; i++) crystals.fillCircle(9 + i % 3 * 3, -17 - Math.floor(i / 3) * 3, 1.5); if (salt.add) salt.add(crystals); else { crystals.setPosition(290, 715); this.root.add(crystals); }
    addTool('salt-whisk', 'whisk', 370, 'Đánh tròn', { action: 'whisk', circularOnly: true, canTarget: bowlOnly,
      hint: () => `${this.state.salty ? 'Hơi mặn rồi! · ' : ''}${STAGES[this.state.stage || 'LIQUID']} · vẽ vòng tròn trong tô · dừng ở vùng xanh` });
    this.coffee = addTool('salt-coffee-pitcher', 'milk', 444, 'Ca phin', { action: 'pour', ingredient: 'brewedCoffee', rate: 0.5, pourOffset: { x: 20, y: -64 }, canTarget: cupOnly,
      emptyHint: 'Phin trạm này chưa nhỏ xong; chờ cà phê rồi rót ca vào ly.', sourceState: target => { const d = scene.stations.find(s => s.model.id === target.id)?.model.drink; return d?.recipeId === 'muoi' && d.state === 'BREWED' ? d.coffeeSource : null; },
      hint: state => `Cà phê ${(state.amounts.brewedCoffee || 0).toFixed(1)}/1 phần · ca chỉ có cà phê từ phin đã ủ`, onPour: () => scene.game.audio.play('pour') });
    const coffeeFill = scene.add.graphics(); coffeeFill.fillStyle(0x48281b); coffeeFill.fillEllipse(-3, -21, 33, 7); this.coffeeFill = coffeeFill; if (this.coffee.add) this.coffee.add(coffeeFill); else { coffeeFill.setPosition(444, 715); this.root.add(coffeeFill); }
    this.removers.push(scene.drinkEngine.registerTool('salted-bowl-pour', this.bowl, { action: 'pour', ingredient: 'cream', rate: 18, hitSize: 78, sourceTarget: 'salted-cream-bowl', spout: { x: -40, y: -8 }, pourOffset: { x: 18, y: -78 }, sourceState: () => this.state.whipping >= Math.PI * 0.6 ? this.state : null, emptyHint: 'Kem chưa bông; vẽ vòng tròn trong tô trước khi rót.', canTarget: cupOnly,
      hint: state => `Kem ${(state.amounts.cream || 0).toFixed(0)}/40 ml · rót chậm giữ lớp trắng trên mặt`,
      onPour: () => { scene.game.audio.play('creamPour'); scene.game.audio.play('creamLanding', 0.015); } }));
    this.reset = button(scene, 158, 714, 44, 52, 'Dọn\ntô', () => { scene.drag.cancel(); this.state = new SaltedCream(); scene.toast('Đã dọn tô; nguyên liệu đã dùng không hoàn lại.'); }, { size: 10, fill: 0x46604c });
    this.root.add(this.reset);
  }
  setVisible(visible) { this.root.setVisible(visible); this.bowl.setVisible(visible); this.toolObjects.forEach(tool => tool.setVisible(visible)); this.reset.input.enabled = visible; }
  render(time) {
    if (!this.root.visible) return;
    const selected = this.scene.stations[this.scene.selectedStation]?.model.drink;
    this.coffeeFill.setVisible(selected?.recipeId === 'muoi' && selected.coffeeSource.volume > 0);
    const s = this.state, g = this.body; g.clear();
    const amount = s.amounts.cream || 0, foam = s.foam, reduced = this.scene.game.save.data.settings.reducedMotion;
    g.fillStyle(0x254c43); g.fillEllipse(0, 12, 88, 44); g.fillStyle(0x86ad9a); g.fillEllipse(0, 8, 85, 40);
    g.lineStyle(2, 0xe0ead8); g.strokeEllipse(0, -3, 88, 34);
    if (amount > 0) {
      const light = Math.round(221 + 34 * foam), color = (255 << 16) | (Math.round(239 + 16 * foam) << 8) | light;
      const level = -1 - Math.min(1, amount / 40) * (3 + foam * 8);
      g.fillStyle(color); g.fillEllipse(0, level, 77, 25 + foam * 6);
      const motion = reduced ? 0 : time / 400;
      g.lineStyle(1.5 + foam, 0xffffff, 0.3 + foam * 0.4);
      for (let i = 0; i < 3; i++) g.strokeEllipse(Math.sin(motion + i) * 6, level + Math.cos(motion + i) * 2, 12 + i * 15, 5 + i * 4);
      for (let i = 0; i < Math.floor(foam * 18); i++) { g.fillStyle(0xffffff, 0.6); g.fillCircle(-32 + i * 13 % 64, level - 7 + i * 7 % 14, 1 + foam * (i % 3)); }
      if (foam > 0.65) for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 0.8); const x = -18 + i * 18; g.fillTriangle(x - 7, level + 2, x + 7, level + 2, x + 2, level - 5 - foam * 3); }
      if (s.stage === 'OVERWHIPPED') { g.fillStyle(0xe5dcc6); for (let i = 0; i < 5; i++) g.fillCircle(-25 + i * 12, level + 2, 3); }
    }
    this.caption.setText(`${amount.toFixed(0)}/40 ml · ${(s.amounts.salt || 0).toFixed(2)} g`);
    this.stageText.setText(s.salty ? 'Hơi mặn rồi!' : STAGES[s.stage || 'LIQUID']).setColor(s.salty || s.stage === 'OVERWHIPPED' ? '#ffbd9e' : '#fff4de');
    const gauge = this.gauge; gauge.clear(); const max = Math.PI * 12;
    round(gauge, 40, 768, 100, 7, 0x263c31, 3);
    round(gauge, 40 + CREAM_PERFECT.start / max * 100, 766, (CREAM_PERFECT.end - CREAM_PERFECT.start) / max * 100, 11, 0x97ba76, 2);
    round(gauge, 40, 768, Math.max(1, Math.min(100, s.whipping / max * 100)), 4, 0xffe0a2, 2);
  }
  destroy() { for (const remove of this.removers) remove(); this.root.destroy(); }
}
