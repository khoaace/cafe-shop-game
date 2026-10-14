import { SaltedCream, CREAM_PERFECT, CREAM_TARGET, SALT_TARGET } from '../models/SaltedCream.js';
import { button } from '../ui/widgets.js';
import { toolArt, label, round } from './art.js';
import { RULES } from '../config.js';

const STAGES = { LIQUID: 'Kem lỏng', 'SMALL BUBBLES': 'Bọt nhỏ', 'SOFT FOAM': 'Kem mềm', 'PERFECT CREAM': 'Hoàn hảo', OVERWHIPPED: 'Quá bông!' };
// Whisk meter segments (radians of circular motion), matching creamStage thresholds.
const METER_MAX = Math.PI * 12;
const SEGMENTS = [[0, Math.PI * 1.5, 0x4d6656], [Math.PI * 1.5, Math.PI * 4, 0x6c8263], [Math.PI * 4, CREAM_PERFECT.start, 0x93a573], [CREAM_PERFECT.start, CREAM_PERFECT.end, 0x8fc66c], [CREAM_PERFECT.end, METER_MAX, 0xb8775a]];
const SPOON = 0.15;
const BOWL = { x: 64, y: 727 };
const PANEL = { x: 8, y: 674, w: 226, h: 120 };
const TONE = { done: [0x3f6a45, '#d6f0bb'], active: [0x7a5a2c, '#ffe2a6'], warn: [0x6e3f31, '#ffc3a8'], idle: [0x2b4438, '#a9bba0'] };

export class SaltedCreamStation {
  constructor(scene) {
    this.scene = scene; this.toolObjects = []; this.tiles = []; this.state = new SaltedCream(); this.removers = []; this.cache = new Map();
    this.root = scene.add.container(0, 0).setDepth(45).setVisible(false);
    this.panel = scene.add.graphics(); this.root.add(this.panel);
    this.bowl = scene.add.container(BOWL.x, BOWL.y).setDepth(100);
    this.body = scene.add.graphics(); this.bowl.add(this.body); this.root.add(this.bowl);
    this.chip = label(scene, BOWL.x, 684, '', 9, '#fff4de', { fontStyle: 'bold' });
    this.gauge = scene.add.graphics();
    this.root.add([this.chip, this.gauge]);
    // Recipe checklist beside the bowl: each row shows its own measured progress.
    this.rows = ['Kem', 'Muối', 'Đánh'].map((name, i) => {
      const y = 690 + i * 19;
      const row = { y, name: label(scene, 138, y, name, 10, '#e9e4c7').setOrigin(0, 0.5), value: label(scene, 226, y, '', 10, '#fff4de', { fontStyle: 'bold' }).setOrigin(1, 0.5), mark: label(scene, 129, y, '', 8, '#203a30', { fontStyle: 'bold' }) };
      this.root.add([row.name, row.value, row.mark]); return row;
    });
    this.removers.push(scene.drinkEngine.registerTarget('salted-cream-bowl', {
      accepts: ['pour', 'scoop', 'whisk'], radius: 50,
      visible: () => this.root.visible && this.root.active,
      contains: (x, y) => Math.abs(x - BOWL.x) <= 54 && Math.abs(y - BOWL.y) <= 40,
      center: () => ({ x: BOWL.x, y: BOWL.y, radius: 40 }), pourPoint: () => ({ x: BOWL.x, y: BOWL.y - 4 - this.state.foam * 8 }), getState: () => this.state,
      acceptIngredient: (id, requested) => {
        if (!['cream', 'salt'].includes(id)) return 0;
        const used = scene.session.consumeIngredient(id, requested), accepted = this.state.add(id, used);
        scene.session.refundIngredient(id, used - accepted); return accepted;
      },
      onChange: (action, amount) => {
        if (action === 'whisk' && amount) { scene.game.audio.play('creamWhisk'); if (this.state.foam > 0.25) scene.game.audio.play('foamBubble'); }
        if (action === 'scoop' && amount) scene.drinkEngine.effects.particles(BOWL.x, BOWL.y - 6, 0xffffff, 5);
        if (this.state.salty) scene.toast('Hơi mặn rồi!');
        if (this.state.stage === 'PERFECT CREAM' && !this.state.perfectAnnounced) {
          this.state.perfectAnnounced = true; scene.drinkEngine.effects.perfect(BOWL.x, BOWL.y - 6);
          scene.toast('KEM BÔNG HOÀN HẢO! Thả tay rồi kéo tô vào ly.'); scene.game.audio.play('creamPerfect', 0.024);
        }
      }, render: (_, time) => this.render(time),
    }));
    const cupOnly = t => t.recipeId?.() === 'muoi';
    const bowlOnly = t => t.id === 'salted-cream-bowl';
    const addTool = (key, id, kind, x, name, options) => {
      const art = toolArt(scene, kind, x, 716).setScale(0.72);
      const tile = { key, x, art, name: label(scene, x, 752, name, 10, '#e9e4c7', { fontStyle: 'bold' }), badge: label(scene, x, 777, '', 9, '#fff4de', { fontStyle: 'bold' }) };
      this.tiles.push(tile); this.toolObjects.push(art);
      this.root.add([tile.name, tile.badge, art]);
      this.removers.push(scene.drinkEngine.registerTool(id, art, { hitSize: 56, ...options })); return art;
    };
    addTool('jug', 'salt-cream-jug', 'milk', 267, 'Kem béo', { action: 'pour', ingredient: 'cream', rate: 18, canTarget: bowlOnly,
      hint: () => `Kem ${(this.state.amounts.cream || 0).toFixed(0)}/${CREAM_TARGET} ml · kéo sang phải để nghiêng · thả tay để dừng`, onPour: () => scene.game.audio.play('creamPour') });
    const salt = addTool('spoon', 'salt-measure', 'spoon', 325, 'Muối', { action: 'scoop', ingredient: 'salt', quantity: SPOON, canTarget: bowlOnly });
    const crystals = scene.add.graphics(); crystals.fillStyle(0xffffff); for (let i = 0; i < 5; i++) crystals.fillCircle(9 + i % 3 * 3, -17 - Math.floor(i / 3) * 3, 1.5); if (salt.add) salt.add(crystals); else { crystals.setPosition(325, 716); this.root.add(crystals); }
    addTool('whisk', 'salt-whisk', 'whisk', 383, 'Phới', { action: 'whisk', circularOnly: true, canTarget: bowlOnly,
      hint: () => `${this.state.salty ? 'Hơi mặn rồi! · ' : ''}${STAGES[this.state.stage || 'LIQUID']} · vẽ vòng tròn trong tô · thả tay ở vùng xanh` });
    this.coffee = addTool('pitcher', 'salt-coffee-pitcher', 'milk', 441, 'Ca phin', { action: 'pour', ingredient: 'brewedCoffee', rate: 0.5, pourOffset: { x: 20, y: -64 }, canTarget: cupOnly,
      emptyHint: 'Phin trạm này chưa nhỏ xong; chờ cà phê rồi rót ca vào ly.', sourceState: target => { const d = scene.stations.find(s => s.model.id === target.id)?.model.drink; return d?.recipeId === 'muoi' && d.state === 'BREWED' ? d.coffeeSource : null; },
      hint: state => `Cà phê ${(state.amounts.brewedCoffee || 0).toFixed(1)}/1 phần · ca chỉ có cà phê từ phin đã ủ`, onPour: () => scene.game.audio.play('pour') });
    const coffeeFill = scene.add.graphics(); coffeeFill.fillStyle(0x48281b); coffeeFill.fillEllipse(-3, -21, 33, 7); this.coffeeFill = coffeeFill; if (this.coffee.add) this.coffee.add(coffeeFill); else { coffeeFill.setPosition(441, 716); this.root.add(coffeeFill); }
    this.removers.push(scene.drinkEngine.registerTool('salted-bowl-pour', this.bowl, { action: 'pour', ingredient: 'cream', rate: 18, hitSize: 80, sourceTarget: 'salted-cream-bowl', spout: { x: -44, y: -8 }, pourOffset: { x: 18, y: -78 }, sourceState: () => this.state.whipping >= Math.PI * 0.6 ? this.state : null, emptyHint: 'Kem chưa bông; vẽ vòng tròn trong tô trước khi rót.', canTarget: cupOnly,
      hint: state => `Kem ${(state.amounts.cream || 0).toFixed(0)}/${CREAM_TARGET} ml · rót chậm giữ lớp trắng trên mặt`,
      onPour: () => { scene.game.audio.play('creamPour'); scene.game.audio.play('creamLanding', 0.015); } }));
    this.reset = button(scene, 182, 758, 88, 20, 'Dọn tô', () => { scene.drag.cancel(); this.state = new SaltedCream(); scene.toast('Đã dọn tô; nguyên liệu đã dùng không hoàn lại.'); }, { size: 9, fill: 0x4c6a5a, color: '#f6efd9', radius: 6 });
    this.root.add(this.reset);
  }
  setVisible(visible) { this.root.setVisible(visible); this.bowl.setVisible(visible); this.toolObjects.forEach(tool => tool.setVisible(visible)); this.reset.input.enabled = visible; }
  // Phaser re-rasterises text on every setColor; only touch labels whose content changed.
  text(object, text, color) {
    const key = `${text}|${color}`; if (this.cache.get(object) === key) return;
    this.cache.set(object, key); object.setText(text).setColor(color);
  }
  // Selected station's brewed coffee, shown on the pitcher tile.
  coffeeStatus() {
    const d = this.scene.stations[this.scene.selectedStation]?.model.drink;
    if (d?.recipeId !== 'muoi') return { text: 'Chọn ly', tone: 'idle', ready: false };
    if (d.state === 'BREWED') return d.coffeeSource.volume > 0.01 ? { text: 'Sẵn sàng', tone: 'active', ready: true } : { text: '✓ Đã rót', tone: 'done', ready: false, poured: true };
    if (d.state === 'BREWING') return { text: `Chờ ${Math.ceil(RULES.brewSeconds - d.brewElapsed)}s`, tone: 'idle', ready: false };
    return { text: 'Chờ phin', tone: 'idle', ready: false };
  }
  render(time) {
    if (!this.root.visible) return;
    const s = this.state, cream = s.amounts.cream || 0, salt = s.amounts.salt || 0, spoons = Math.round(salt / SPOON);
    const reduced = this.scene.game.save.data.settings.reducedMotion, pulse = reduced ? 1 : 0.6 + 0.4 * Math.sin(time / 180);
    const coffee = this.coffeeStatus(); this.coffeeFill.setVisible(coffee.ready);
    const whisking = this.scene.drinkEngine.owners.get('salted-cream-bowl') === 'salt-whisk';
    const perfect = s.stage === 'PERFECT CREAM', over = s.stage === 'OVERWHIPPED', creamDone = Math.abs(cream - CREAM_TARGET) <= 4, creamOver = cream > CREAM_TARGET + 4;
    const saltDone = salt >= SALT_TARGET - 1e-6 && !s.salty, whipped = s.whipping >= CREAM_PERFECT.start;
    const pourable = cream > 0 && s.whipping >= Math.PI * 0.6;
    // Guided order: cream → salt → whisk → coffee → cream onto the coffee.
    const next = cream < CREAM_TARGET - 4 ? 'jug' : spoons < 2 ? 'spoon' : !whipped ? 'whisk' : coffee.ready ? 'pitcher' : coffee.poured ? 'bowl' : null;

    const p = this.panel; p.clear();
    const warn = s.salty || over || creamOver, glow = warn ? 0xe0906e : perfect ? 0xa3d17f : 0x99b299;
    round(p, PANEL.x, PANEL.y + 3, PANEL.w, PANEL.h, 0x122f29, 12, 0.3);
    round(p, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x365448, 12);
    p.lineStyle(perfect || warn ? 2 : 1, glow, perfect || warn ? 0.85 : 0.3); p.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);
    round(p, 122, 680, 108, 58, 0x2b4639, 8);
    // Bowl status chip.
    const chip = cream <= 0 ? ['Tô trống', 'idle'] : s.salty ? ['Hơi mặn!', 'warn'] : over ? ['Quá bông!', 'warn'] : whisking && perfect ? ['THẢ TAY!', 'done'] : next === 'bowl' ? ['Kéo tô → ly', 'active'] : whisking ? ['Đang đánh…', 'active'] : whipped && !next ? ['Chờ cà phê', 'idle'] : whipped ? ['Đã bông', 'done'] : ['Chưa đánh', 'idle'];
    const chipWidth = chip[0].length * 5.4 + 18;
    round(p, BOWL.x - chipWidth / 2, 677, chipWidth, 15, TONE[chip[1]][0], 7, chip[1] === 'active' || chip[0] === 'THẢ TAY!' ? pulse : 1);
    this.text(this.chip, chip[0], TONE[chip[1]][1]);
    // Checklist rows.
    const rows = [
      [`${cream.toFixed(0)}/${CREAM_TARGET} ml`, creamOver ? 'warn' : creamDone ? 'done' : next === 'jug' ? 'active' : 'idle'],
      [`${Math.min(spoons, 9)}/2 muỗng`, s.salty ? 'warn' : saltDone ? 'done' : next === 'spoon' ? 'active' : 'idle'],
      [cream > 0 ? STAGES[s.stage || 'LIQUID'] : '—', over ? 'warn' : perfect ? 'done' : next === 'whisk' ? 'active' : 'idle'],
    ];
    rows.forEach(([value, tone], i) => {
      const row = this.rows[i], [fill, color] = TONE[tone];
      p.fillStyle(tone === 'idle' ? 0x4b6355 : fill === TONE.active[0] ? 0xe8b46b : tone === 'done' ? 0x9fd07a : 0xe0906e, tone === 'active' ? pulse : 1); p.fillCircle(129, row.y, 5.5);
      this.text(row.mark, tone === 'done' ? '✓' : tone === 'warn' ? '!' : String(i + 1), tone === 'idle' ? '#a9bba0' : '#203a30');
      this.text(row.value, value, tone === 'idle' ? '#c9d3bd' : color);
      this.text(row.name, row.name.text, tone === 'active' ? '#ffe2a6' : '#e9e4c7');
    });
    this.drawBowl(time, reduced, perfect, over);
    this.drawMeter(s, whisking, pulse);
    // Tool tiles: highlight the next step, badge each tool's measured progress.
    const badges = {
      jug: [`${cream.toFixed(0)} ml`, rows[0][1]], spoon: [`${Math.min(spoons, 9)}/2`, rows[1][1]],
      whisk: [cream > 0 ? `${Math.round(Math.min(1, s.whipping / CREAM_PERFECT.start) * 100)}%` : '—', rows[2][1]], pitcher: [coffee.text, coffee.tone],
    };
    for (const tile of this.tiles) {
      const [text, tone] = badges[tile.key], active = next === tile.key, x = tile.x - 27;
      round(p, x, 676, 54, 116, active ? 0x52704f : 0x46604c, 9);
      if (active) { p.lineStyle(2, 0xe8b46b, pulse); p.strokeRoundedRect(x, 676, 54, 116, 9); }
      const [fill, color] = TONE[tone];
      round(p, tile.x - 23, 769, 46, 16, fill, 8);
      this.text(tile.badge, text, color);
      if (tone === 'done') { p.fillStyle(0x9fd07a); p.fillCircle(x + 46, 684, 6); p.lineStyle(1.6, 0x203a30); p.beginPath(); p.moveTo(x + 43, 684); p.lineTo(x + 45.5, 686.5); p.lineTo(x + 49.5, 681.5); p.strokePath(); }
    }
  }
  drawBowl(time, reduced, perfect, over) {
    const s = this.state, g = this.body, amount = s.amounts.cream || 0, foam = s.foam; g.clear();
    if (perfect) { g.lineStyle(3, 0xbfe59a, 0.35 + (reduced ? 0 : 0.2 * Math.sin(time / 200))); g.strokeEllipse(0, 4, 104, 50); }
    g.fillStyle(0x142e26, 0.3); g.fillEllipse(0, 25, 82, 12);
    round(g, -17, 19, 34, 7, 0x3c6758, 3);
    g.fillStyle(0x3f6b5d); g.fillEllipse(0, 7, 94, 42);
    g.fillStyle(0x7fae9b); g.fillEllipse(0, 5, 92, 39);
    g.fillStyle(0xa9cfbf, 0.6); g.fillEllipse(-18, 9, 36, 20);
    // Hand-painted band, like a Bát Tràng bowl.
    for (let i = 0; i < 7; i++) { g.fillStyle(0x2f5a4e, 0.55); g.fillCircle(-30 + i * 10, 13 + Math.abs(i - 3) * -0.8, 1.6); }
    g.fillStyle(0xeef3e6); g.fillEllipse(0, -4, 96, 30);
    g.fillStyle(0x2f5148); g.fillEllipse(0, -3, 86, 23);
    g.fillStyle(0x557a6c); g.fillEllipse(0, -1, 80, 18);
    if (amount > 0) {
      const fill = Math.min(1, amount / 40), color = (255 << 16) | (Math.round(239 + 16 * foam) << 8) | Math.round(221 + 34 * foam);
      const level = -1 - fill * (2 + foam * 7), width = 64 + fill * 16;
      g.fillStyle(over ? 0xeee6cf : color); g.fillEllipse(0, level, width, 15 + fill * 4 + foam * 5);
      const motion = reduced ? 0 : time / 400;
      g.lineStyle(1.2 + foam, 0xffffff, 0.25 + foam * 0.4);
      for (let i = 0; i < 3; i++) g.strokeEllipse(Math.sin(motion + i) * 5, level + Math.cos(motion + i) * 1.5, 12 + i * 15, 4 + i * 3);
      for (let i = 0; i < Math.floor(foam * 16); i++) { g.fillStyle(0xffffff, 0.65); g.fillCircle(-28 + i * 13 % 56, level - 5 + i * 7 % 10, 1 + foam * (i % 3) * 0.8); }
      if (foam > 0.65) for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 0.9); const x = -16 + i * 16; g.fillTriangle(x - 7, level + 2, x + 7, level + 2, x + 2, level - 5 - foam * 4); }
      if (over) { g.fillStyle(0xd9cdb0); for (let i = 0; i < 5; i++) g.fillCircle(-22 + i * 11, level + 1, 2.6); }
      if ((s.amounts.salt || 0) > 0) for (let i = 0; i < Math.min(8, Math.round(s.amounts.salt / 0.05)); i++) { g.fillStyle(0xf4f7ff, 0.9); g.fillRect(-12 + i * 7 % 26, level - 2 + i * 5 % 6, 1.6, 1.6); }
    }
    g.lineStyle(2, 0xf8f8ec, 0.95); g.strokeEllipse(0, -4, 94, 29);
    g.lineStyle(1.5, 0xc3dfc9, 0.6); g.beginPath(); g.moveTo(-36, 12); g.lineTo(-24, 18); g.lineTo(-10, 21); g.strokePath();
  }
  drawMeter(s, whisking, pulse) {
    const g = this.gauge; g.clear();
    const x = 20, y = 777, width = 202, scale = width / METER_MAX, progress = Math.min(1, s.whipping / METER_MAX);
    round(g, x - 2, y - 2, width + 4, 11, 0x1b3329, 5);
    SEGMENTS.forEach(([from, to, color], i) => {
      const lit = s.whipping > from, sx = x + from * scale, w = (to - from) * scale;
      g.fillStyle(color, lit ? 1 : 0.35);
      if (i === 0) g.fillRoundedRect(sx, y, w, 7, { tl: 3, bl: 3, tr: 0, br: 0 });
      else if (i === SEGMENTS.length - 1) g.fillRoundedRect(sx, y, w, 7, { tl: 0, bl: 0, tr: 3, br: 3 });
      else g.fillRect(sx, y, w, 7);
      if (i) { g.fillStyle(0x1b3329); g.fillRect(sx - 0.5, y, 1, 7); }
    });
    // Perfect zone brackets.
    const ps = x + CREAM_PERFECT.start * scale, pe = x + CREAM_PERFECT.end * scale;
    g.lineStyle(1.5, 0xd6f0bb, s.stage === 'PERFECT CREAM' && whisking ? pulse : 0.8);
    g.beginPath(); g.moveTo(ps, y - 4); g.lineTo(ps, y + 11); g.moveTo(pe, y - 4); g.lineTo(pe, y + 11); g.strokePath();
    g.fillStyle(0xd6f0bb); g.fillTriangle((ps + pe) / 2 - 3, y - 6, (ps + pe) / 2 + 3, y - 6, (ps + pe) / 2, y - 3);
    if (!(s.amounts.cream > 0)) return;
    const m = x + width * progress, color = s.stage === 'OVERWHIPPED' ? 0xffbd9e : s.stage === 'PERFECT CREAM' ? 0xe9ffd4 : 0xffe2a6;
    g.fillStyle(0x1b3329); g.fillCircle(m, y + 3.5, 6); g.fillStyle(color); g.fillCircle(m, y + 3.5, 4);
  }
  destroy() { for (const remove of this.removers) remove(); this.root.destroy(); }
}
