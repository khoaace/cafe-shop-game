import { CoconutBlend, BLEND, BLEND_STAGES, COCONUT_TARGET, CONDENSED_ML, ICE_SCOOP, ICE_GRAMS } from '../models/CoconutBlend.js';
import { button } from '../ui/widgets.js';
import { toolArt, label, round, line } from './art.js';
import { RULES } from '../config.js';

// Blender on the work counter (tray 05). Jar dock, lid, switch and supplies are physical tools.
const DOCK = { x: 52, y: 722 };
const SHELF = { x: 128, y: 738 };
const LID_HOME = { x: 190, y: 748 };
const LID_ON = { x: DOCK.x, y: DOCK.y - 35 };
const SWITCH = { x: DOCK.x, y: 776 };
const METER = { x: 100, y: 786, w: 128 };
const PANEL = { x: 8, y: 674, w: 228, h: 120 };
const SEGMENTS = [[0, BLEND.good, 0x8d9a74], [BLEND.good, BLEND.perfect, 0xb9c97a], [BLEND.perfect, BLEND.over, 0x8fc66c], [BLEND.over, BLEND.max, 0xb8775a]];
const TONE = { done: [0x3f6a45, '#d6f0bb'], active: [0x7a5a2c, '#ffe2a6'], warn: [0x6e3f31, '#ffc3a8'], idle: [0x2b4438, '#a9bba0'] };
const lerp = (a, b, m) => { const c = s => Math.round(((a >> s) & 255) * (1 - m) + ((b >> s) & 255) * m); return c(16) << 16 | c(8) << 8 | c(0); };
// Inner half-width of the tapered jar at local y (rim -30, floor 26).
const halfWidth = y => 17 + (26 - y) * 6 / 56;

export class CoconutBlenderStation {
  constructor(scene) {
    this.scene = scene; this.state = new CoconutBlend(); this.docked = false; this.removers = []; this.tiles = []; this.cache = new Map();
    this.speed = 0; this.bladeAngle = 0; this.motorUntil = 0; this.lastTime = null; this.announced = '';
    const engine = scene.drinkEngine;
    this.root = scene.add.container(0, 0).setDepth(45).setVisible(false);
    this.panel = scene.add.graphics(); this.base = scene.add.graphics(); this.gauge = scene.add.graphics();
    this.root.add([this.panel, this.base, this.gauge]);
    this.chip = label(scene, 150, 684, '', 9, '#fff4de', { fontStyle: 'bold' });
    this.stageText = label(scene, METER.x + METER.w, 774, '', 9, '#e9e4c7', { fontStyle: 'bold' }).setOrigin(1, 0.5);
    this.meterName = label(scene, METER.x, 774, 'Độ mịn', 9, '#a9bba0').setOrigin(0, 0.5);
    this.locked = label(scene, 240, 734, 'MÁY XAY SINH TỐ CHƯA CÓ\nMua ở cửa hàng sau ca để mở Cà phê cốt dừa.', 13, '#e9e4c7', { align: 'center', lineSpacing: 8 });
    this.root.add([this.chip, this.stageText, this.meterName, this.locked]);
    // Switch, lid and jar draw above the panel so the jar can be carried over the cups.
    this.switch = scene.add.container(SWITCH.x, SWITCH.y); this.switchArt = scene.add.graphics(); this.switch.add(this.switchArt);
    this.jar = scene.add.container(SHELF.x, SHELF.y); this.jarArt = scene.add.graphics(); this.jar.add(this.jarArt);
    this.lid = scene.add.container(LID_HOME.x, LID_HOME.y); this.lidArt = scene.add.graphics(); this.lid.add(this.lidArt); this.drawLid();
    this.root.add([this.switch, this.jar, this.lid]);

    const jarOnly = t => t.id === 'coconut-blender';
    const cupOnly = t => t.recipeId?.() === 'cotdua';
    const stock = id => scene.tutorial ? Infinity : scene.session.inventory[id] || 0;
    this.removers.push(engine.registerTarget('coconut-blender', {
      accepts: ['pour', 'iceScoop', 'coverLid', 'blend'], radius: 40,
      visible: () => this.root.visible && this.root.active && this.owned,
      contains: (x, y) => this.docked && Math.abs(x - DOCK.x) <= 40 && y >= DOCK.y - 50 && y <= SWITCH.y + 18,
      center: () => ({ x: DOCK.x, y: DOCK.y, radius: 34 }),
      pourPoint: () => ({ x: DOCK.x, y: DOCK.y + 26 - this.fillHeight() }),
      getState: () => this.docked ? this.state : null,
      acceptIngredient: (id, requested) => scene.session.pourIntoBlender(this.state, id, requested),
      render: (_, time) => this.render(time),
    }));
    this.removers.push(engine.registerTarget('coconut-dock', {
      accepts: ['dock'], radius: 40, visible: () => this.root.visible && this.owned,
      contains: (x, y) => Math.abs(x - DOCK.x) <= 46 && Math.abs(y - DOCK.y) <= 52,
      center: () => ({ x: DOCK.x, y: DOCK.y }), getState: () => this.docked ? null : this.state,
    }));

    const addTool = (key, id, kind, x, name, options) => {
      const art = toolArt(scene, kind, x, 716).setScale(0.72);
      const tile = { key, x, art, name: label(scene, x, 752, name, 10, '#e9e4c7', { fontStyle: 'bold' }), badge: label(scene, x, 777, '', 9, '#fff4de', { fontStyle: 'bold' }), stock: label(scene, x + 22, 684, '', 8, '#fff4d5', { fontStyle: 'bold' }).setOrigin(1, 0.5) };
      this.tiles.push(tile); this.root.add([tile.name, tile.badge, tile.stock, art]);
      this.removers.push(engine.registerTool(id, art, { hitSize: 56, ...options })); return art;
    };
    addTool('coconut', 'coconut-cream-tin', 'coconut', 268, 'Cốt dừa', { action: 'pour', ingredient: 'coconutCream', rate: 20, noRecord: true, canTarget: jarOnly,
      blocked: () => stock('coconutCream') < 1 ? 'Hết cốt dừa! Cần nhập thêm.' : this.state.lid ? 'Mở nắp cối trước khi rót.' : null,
      hint: () => `Cốt dừa ${(this.state.amounts.coconutCream || 0).toFixed(0)}/${COCONUT_TARGET} ml · kéo sang phải để nghiêng · thả tay để dừng`,
      onPour: () => scene.game.audio.play('creamPour') });
    addTool('condensed', 'coconut-condensed', 'condensed', 324, 'Sữa đặc', { action: 'pour', ingredient: 'condensed', rate: 0.4, noRecord: true, canTarget: jarOnly,
      blocked: () => stock('condensed') < 0.05 ? 'Hết sữa đặc rồi! Cần nhập thêm.' : this.state.lid ? 'Mở nắp cối trước khi rót.' : null,
      hint: () => { const ml = (this.state.amounts.condensed || 0) * CONDENSED_ML; return `Sữa đặc ${ml.toFixed(0)}/15 ml${ml > 19 ? ' · Hơi ngọt rồi!' : ' · nghiêng nhẹ, thả tay để dừng'}`; },
      onPour: () => scene.game.audio.play('condensed') });
    addTool('ice', 'coconut-ice-scoop', 'scoop', 380, 'Xúc đá', { action: 'iceScoop', canTarget: jarOnly,
      blocked: () => stock('ice') < 1 ? 'Hết đá rồi! Cần nhập thêm.' : this.state.lid ? 'Mở nắp cối trước khi thả đá.' : null,
      hint: () => `Đá ${Math.round((this.state.amounts.ice || 0) * ICE_GRAMS)}/100 g · thả muỗng đá vào cối`,
      release: ({ target, state, canceled, matched }) => {
        if (canceled || !matched || target?.id !== 'coconut-blender' || state.lid) return;
        const accepted = scene.session.scoopIceIntoBlender(state, ICE_SCOOP);
        if (accepted) { scene.game.audio.play('ice'); for (let i = 0; i < accepted; i++) engine.effects.ice(DOCK.x - 8 + i * 8, DOCK.y + 10 - this.fillHeight() / 2, i * 45); }
      } });
    this.pitcher = addTool('pitcher', 'coconut-coffee-pitcher', 'milk', 436, 'Ca phin', { action: 'pour', ingredient: 'brewedCoffee', stepId: 'collect', rate: 0.5, pourOffset: { x: 20, y: -64 }, canTarget: cupOnly,
      sourceState: target => { const d = this.drinkFor(target); return d?.state === 'BREWED' && (d.preparation.amounts.coconutCream || 0) > 0 ? d.coffeeSource : null; },
      emptyHint: target => this.drinkFor(target)?.state !== 'BREWED' ? 'Phin trạm này chưa nhỏ xong; chờ cà phê rồi rót ca vào ly.' : 'Rót cốt dừa xay vào ly trước, rồi mới rót cà phê lên trên.',
      hint: state => `Cà phê ${(state.amounts.brewedCoffee || 0).toFixed(1)}/1 phần · rót chậm cho cà phê loang vào lớp dừa`, onPour: () => scene.game.audio.play('pour') });
    this.coffeeFill = scene.add.graphics(); this.coffeeFill.fillStyle(0x48281b); this.coffeeFill.fillEllipse(-3, -21, 33, 7);
    if (this.pitcher.add) this.pitcher.add(this.coffeeFill); else { this.coffeeFill.setPosition(436, 716); this.root.add(this.coffeeFill); }

    // The same jar is first docked on the motor base, later carried to the glass to pour.
    this.removers.push(engine.registerTool('blender-jar-dock', this.jar, { action: 'dock', hitSize: 60, enabled: () => !this.docked, canTarget: t => t.id === 'coconut-dock',
      hint: () => 'Đặt cối vào đế máy xay',
      release: ({ point, canceled }) => {
        if (canceled || Math.hypot(point.x - DOCK.x, point.y - DOCK.y) > 52) return;
        this.docked = true; this.setJarHome(DOCK); scene.game.audio.play('lock'); scene.toast('Cối đã khớp vào đế. Rót cốt dừa vào cối.');
      } }));
    this.removers.push(engine.registerTool('blender-jar-pour', this.jar, { action: 'pour', sourceType: 'blender', sourceTarget: 'coconut-blender', stepId: 'mixture', ingredient: 'coconutCream', rate: 32, hitSize: 60,
      spout: { x: -24, y: -30 }, pourOffset: { x: 26, y: -72 }, canTarget: cupOnly, enabled: () => this.docked,
      blocked: () => this.state.lid ? 'Tháo nắp cối trước khi rót.' : this.state.empty ? 'Cối đang trống. Rót cốt dừa vào trước.' : null,
      sourceState: target => this.state.blendTime > 0 && !this.state.lid && ['GLASS', 'BREWED'].includes(this.drinkFor(target)?.state) ? this.state : null,
      emptyHint: target => !(this.state.blendTime > 0) ? 'Chưa xay! Đậy nắp và giữ công tắc trước khi rót.' : 'Phin đang đặt trên ly; rót dừa trước khi đặt phin hoặc sau khi phin nhỏ xong.',
      hint: state => `Dừa xay ${(state.amounts.coconutCream || 0).toFixed(0)}/${COCONUT_TARGET} ml trong ly · nghiêng cối, thả tay để dừng`,
      onPour: () => { scene.game.audio.play('creamPour'); scene.game.audio.play('creamLanding', 0.012); },
      release: () => {
        if (!this.state.empty) return;
        this.docked = false; this.state = new CoconutBlend(); this.setJarHome(SHELF);
        scene.toast('Cối đã rót hết, tráng sạch để pha ly sau. Kéo ca phin rót cà phê lên lớp dừa.');
      } }));
    this.removers.push(engine.registerTool('blender-lid', this.lid, { action: 'coverLid', hitSize: 50, canTarget: jarOnly,
      blocked: () => this.motorRunning ? 'Thả công tắc cho máy dừng rồi mới mở nắp.' : null,
      hint: () => this.state.lid ? 'Kéo nắp ra khỏi cối để mở' : 'Kéo nắp lên miệng cối, thả tay để khớp',
      release: ({ point, canceled }) => {
        if (canceled) return;
        const near = this.docked && Math.abs(point.x - LID_ON.x) <= 42 && Math.abs(point.y - LID_ON.y) <= 46;
        if (!this.state.lid && near) {
          if (engine.blender.placeLid(this.state)) { this.setLidHome(LID_ON); scene.game.audio.play('lock'); engine.effects.particles(LID_ON.x, LID_ON.y, 0xd6ece3, 4); }
          else scene.toast('Cho nguyên liệu vào cối trước khi đậy nắp.');
        } else if (this.state.lid && !near && engine.blender.removeLid(this.state)) { this.setLidHome(LID_HOME); scene.game.audio.play('pickup'); }
      } }));
    this.removers.push(engine.registerTool('blender-switch', this.switch, { action: 'blend', hitSize: 36, canTarget: jarOnly,
      blocked: () => !this.docked ? 'Đặt cối lên đế máy trước.' : null,
      hold: (seconds, target, state) => this.hold(seconds, state),
      hint: state => !state.lid ? 'Đậy nắp cối trước khi bật máy!' : !state.canBlend ? 'Cối chưa có cốt dừa.' : `${BLEND_STAGES[state.stage]} · giữ để xay, thả tay để dừng` }));
    this.reset = button(scene, 196, 704, 70, 20, 'Đổ bỏ', () => this.discard(), { size: 9, fill: 0x4c6a5a, color: '#f6efd9', radius: 6 });
    this.root.add(this.reset);
  }
  get owned() { return this.scene.session.upgrades.blender === true; }
  get motorRunning() { return this.scene.visualTime < this.motorUntil; }
  drinkFor(target) { const d = this.scene.stations.find(s => s.model.id === target?.id)?.model.drink; return d?.recipeId === 'cotdua' && !d.consumed ? d : null; }
  setJarHome(p) { for (const id of ['blender-jar-dock', 'blender-jar-pour']) Object.assign(this.scene.drinkEngine.tools.get(id).home, { x: p.x, y: p.y }); }
  setLidHome(p) { Object.assign(this.scene.drinkEngine.tools.get('blender-lid').home, { x: p.x, y: p.y }); }
  fillHeight() { return Math.min(52, this.state.load * 0.27); }
  hold(seconds, state) {
    const before = state.stage, added = state.blend(seconds);
    if (!added) return 0;
    const scene = this.scene; this.motorUntil = scene.visualTime + 90;
    scene.game.audio.play('blender');
    if (state.crush < 1 && (state.amounts.ice || 0) > 0 && Math.random() < 0.18) scene.game.audio.play('iceCrack');
    if (state.stage !== before) {
      if (state.stage === 'PERFECT' && !state.perfectAnnounced) {
        state.perfectAnnounced = true; scene.drinkEngine.effects.perfect(DOCK.x, DOCK.y - 10);
        scene.toast('MỊN HOÀN HẢO! Thả công tắc để dừng máy.'); scene.game.audio.play('creamPerfect', 0.024);
      } else if (state.stage === 'OVERBLENDED') { scene.toast('Quá nhuyễn rồi! Dừa bắt đầu loãng.'); scene.game.audio.play('miss'); }
      else if (state.stage === 'GOOD') scene.toast('Đá đã vỡ nhỏ, dừa bắt đầu mịn…');
    }
    return added;
  }
  discard() {
    const scene = this.scene; scene.drag.cancel();
    if (!this.state.empty) { scene.session.recordWaste(this.state.stock()); scene.toast('Đã đổ bỏ cối; nguyên liệu đã dùng không hoàn lại.'); scene.game.audio.play('trash'); }
    this.state = new CoconutBlend(); this.setLidHome(LID_HOME); this.lid.setPosition(LID_HOME.x, LID_HOME.y);
  }
  setVisible(visible) {
    this.root.setVisible(visible);
    const usable = visible && this.owned;
    for (const object of [this.panel, this.base, this.gauge, this.chip, this.stageText, this.meterName, this.switch, this.jar, this.lid, this.reset, ...this.tiles.flatMap(t => [t.art, t.name, t.badge, t.stock])]) object.setVisible(usable);
    this.locked.setVisible(visible && !this.owned); this.reset.input.enabled = usable;
  }
  text(object, text, color) {
    const key = `${text}|${color}`; if (this.cache.get(object) === key) return;
    this.cache.set(object, key); object.setText(text).setColor(color);
  }
  coffeeStatus() {
    const d = this.scene.stations[this.scene.selectedStation]?.model.drink;
    if (d?.recipeId !== 'cotdua') return { text: 'Chọn ly', tone: 'idle', ready: false };
    if (d.state === 'BREWED') return d.coffeeSource.volume > 0.01 ? (d.preparation.amounts.coconutCream || 0) > 0 ? { text: 'Sẵn sàng', tone: 'active', ready: true } : { text: 'Chờ dừa', tone: 'idle', ready: true } : { text: '✓ Đã rót', tone: 'done', ready: false };
    if (d.state === 'BREWING') return { text: `Chờ ${Math.ceil(RULES.brewSeconds - d.brewElapsed)}s`, tone: 'idle', ready: false };
    return { text: 'Chờ phin', tone: 'idle', ready: false };
  }
  render(time) {
    if (!this.root.visible || !this.owned) return;
    const dt = this.lastTime === null ? 0 : Math.max(0, Math.min(0.1, (time - this.lastTime) / 1000)); this.lastTime = time;
    const s = this.state, reduced = this.scene.game.save.data.settings.reducedMotion, pulse = reduced ? 1 : 0.6 + 0.4 * Math.sin(time / 180);
    const running = this.motorRunning;
    // Motor spin-up and run-down; the blades keep turning briefly after release.
    this.speed += ((running ? 1 : 0) - this.speed) * Math.min(1, dt * (running ? 5 : 3));
    if (this.speed < 0.01) this.speed = 0;
    this.bladeAngle += this.speed * dt * 46;
    const coconut = s.amounts.coconutCream || 0, condensedMl = (s.amounts.condensed || 0) * CONDENSED_ML, iceGrams = (s.amounts.ice || 0) * ICE_GRAMS;
    const coffee = this.coffeeStatus(); this.coffeeFill.setVisible(coffee.ready);
    const blended = s.blendTime > 0, stage = s.stage;
    const next = !this.docked ? 'jar' : coconut < COCONUT_TARGET - 4 && !blended ? 'coconut' : condensedMl < 13 && !blended ? 'condensed' : iceGrams < 95 && !blended ? 'ice' : !s.lid && !blended ? 'lid' : s.lid && (stage === 'COARSE' || running) ? 'switch' : s.lid ? 'lid' : !s.empty ? 'jar' : coffee.ready ? 'pitcher' : null;
    const p = this.panel; p.clear();
    const warn = stage === 'OVERBLENDED' && blended, perfect = stage === 'PERFECT';
    round(p, PANEL.x, PANEL.y + 3, PANEL.w, PANEL.h, 0x122f29, 12, 0.3);
    round(p, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x365448, 12);
    p.lineStyle(perfect || warn ? 2 : 1, warn ? 0xe0906e : perfect ? 0xa3d17f : 0x99b299, perfect || warn ? 0.85 : 0.3); p.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);
    // Faint outlines show where the jar and lid belong.
    if (!this.docked) { p.lineStyle(1.5, 0xe8b46b, pulse * 0.8); p.strokeRoundedRect(DOCK.x - 26, DOCK.y - 34, 52, 64, 6); }
    p.fillStyle(0x2b4639); p.fillEllipse(SHELF.x, SHELF.y + 32, 50, 8); p.fillEllipse(LID_HOME.x, LID_HOME.y + 10, 52, 8);
    const steps = { jar: !this.docked ? '1 · Đặt cối lên đế' : '7 · Kéo cối lên ly, rót', coconut: '2 · Rót 60 ml cốt dừa', condensed: '3 · Rót 15 ml sữa đặc', ice: '4 · Xúc 100 g đá', lid: s.lid ? '7 · Mở nắp cối' : '5 · Đậy nắp cối', switch: running ? `Đang xay · ${BLEND_STAGES[stage]}` : '6 · Giữ công tắc để xay', pitcher: '8 · Rót cà phê phin' };
    const chip = next ? [steps[next], warn ? 'warn' : next === 'switch' && perfect ? 'done' : 'active'] : ['Cối sẵn sàng', 'idle'];
    const chipWidth = chip[0].length * 5.2 + 18;
    round(p, 150 - chipWidth / 2, 677, chipWidth, 15, TONE[chip[1]][0], 7, chip[1] === 'active' ? pulse : 1);
    this.text(this.chip, chip[0], TONE[chip[1]][1]);
    this.drawBase(time, running, pulse, next === 'switch');
    this.drawJar(time, reduced);
    this.drawMeter(s, running, pulse);
    if (next === 'lid' && !s.lid) { p.lineStyle(2, 0xe8b46b, pulse); p.strokeEllipse(LID_HOME.x, LID_HOME.y, 56, 22); }
    if (next === 'jar') { p.lineStyle(2, 0xe8b46b, pulse); p.strokeRoundedRect((this.docked ? DOCK.x : SHELF.x) - 28, (this.docked ? DOCK.y : SHELF.y) - 36, 56, 70, 8); }
    const stockText = id => { if (this.scene.tutorial) return ''; const n = this.scene.session.inventory[id] || 0; return id === 'coconutCream' ? `${Math.round(n)} ml` : `×${Number.isInteger(n) ? n : n.toFixed(1)}`; };
    const badges = {
      coconut: [`${coconut.toFixed(0)}/60 ml`, coconut > COCONUT_TARGET + 6 ? 'warn' : Math.abs(coconut - COCONUT_TARGET) <= 6 ? 'done' : next === 'coconut' ? 'active' : 'idle', 'coconutCream'],
      condensed: [`${condensedMl.toFixed(0)}/15 ml`, condensedMl > 19 ? 'warn' : condensedMl >= 12 ? 'done' : next === 'condensed' ? 'active' : 'idle', 'condensed'],
      ice: [`${Math.round(iceGrams)}/100 g`, iceGrams > 110 ? 'warn' : iceGrams >= 95 ? 'done' : next === 'ice' ? 'active' : 'idle', 'ice'],
      pitcher: [coffee.text, coffee.tone, null],
    };
    for (const tile of this.tiles) {
      const [text, tone, stockId] = badges[tile.key], active = next === tile.key, x = tile.x - 27;
      const empty = stockId && !this.scene.tutorial && (this.scene.session.inventory[stockId] || 0) < (stockId === 'condensed' ? 0.05 : 1);
      round(p, x, 676, 54, 116, active ? 0x52704f : 0x46604c, 9);
      if (active) { p.lineStyle(2, 0xe8b46b, pulse); p.strokeRoundedRect(x, 676, 54, 116, 9); }
      const [fill, color] = TONE[empty ? 'warn' : tone];
      round(p, tile.x - 25, 769, 50, 16, fill, 8);
      this.text(tile.badge, empty ? 'Hết hàng' : text, color);
      tile.art.setAlpha(empty ? 0.35 : 1);
      if (stockId) { this.text(tile.stock, stockText(stockId), empty ? '#ffc3a8' : '#fff4d5'); }
    }
  }
  drawBase(time, running, pulse, highlight) {
    const g = this.base; g.clear();
    g.fillStyle(0x122f29, 0.35); g.fillEllipse(DOCK.x, 792, 70, 8);
    round(g, DOCK.x - 31, 752, 62, 39, 0x23403a, 9);
    round(g, DOCK.x - 29, 753, 58, 35, 0x8fa9a0, 8);
    round(g, DOCK.x - 26, 755, 10, 30, 0xc4d6ce, 4);
    round(g, DOCK.x - 22, 748, 44, 8, 0x2b4741, 3); // Coupling plate the jar locks onto.
    g.fillStyle(running ? 0x9fe07c : 0x5a6e66); g.fillCircle(DOCK.x + 20, 760, 2.6);
    if (running) { g.fillStyle(0x9fe07c, 0.3); g.fillCircle(DOCK.x + 20, 760, 5); }
    const sw = this.switchArt; sw.clear();
    if (highlight) { sw.lineStyle(2, 0xe8b46b, pulse); sw.strokeCircle(0, 0, 15); }
    sw.fillStyle(0x1d3530); sw.fillCircle(0, 1, 11);
    sw.fillStyle(running ? 0xd76d4d : 0xe0906e); sw.fillCircle(0, running ? 1.5 : 0, running ? 8.5 : 9.5);
    sw.fillStyle(0xffffff, running ? 0.15 : 0.35); sw.fillEllipse(-2, running ? -1 : -3, 9, 4);
    line(sw, [[0, -4], [0, 2]], 0xfff4de, 1.6, 0.9);
  }
  drawJar(time, reduced) {
    const s = this.state, g = this.jarArt, speed = this.speed; g.clear();
    const carried = [...this.scene.drinkEngine.active.values()].some(a => a.tool.object === this.jar);
    if (this.docked && !carried && !this.scene.tweens.isTweening(this.jar)) {
      const shake = reduced ? 0 : speed;
      this.jar.setPosition(DOCK.x + Math.sin(time * 0.11) * 1.3 * shake, DOCK.y + Math.cos(time * 0.13) * 0.6 * shake);
    }
    const h = this.fillHeight(), top = 26 - h, crush = s.crush || 0, blendT = s.blendTime;
    const over = s.stage === 'OVERBLENDED' && blendT > 0;
    // Collar and blade assembly.
    round(g, -19, 24, 38, 10, 0x2f4a44, 3); round(g, -17, 25, 34, 4, 0x6d8780, 2);
    if (h > 0.5) {
      const poly = (y0, y1) => [{ x: -halfWidth(y0), y: y0 }, { x: halfWidth(y0), y: y0 }, { x: halfWidth(y1), y: y1 }, { x: -halfWidth(y1), y: y1 }];
      const fresh = 0xfff8ec, slush = over ? 0xe9e3d3 : 0xf3e9d6;
      g.fillStyle(lerp(fresh, slush, crush), over ? 0.86 : 0.97); g.fillPoints(poly(top, 26), true);
      const condensed = Math.min(h, (s.amounts.condensed || 0) * CONDENSED_ML * 0.27) * (1 - crush);
      if (condensed > 0.4) { g.fillStyle(0xe6c98c, 0.85 * (1 - crush)); g.fillPoints(poly(26 - condensed, 26), true); }
      // Streaks of condensed milk dissolving while the motor runs.
      if (speed > 0.05 && crush < 1) for (let i = 0; i < 4; i++) {
        const y = top + 4 + i * (h - 8) / 4, a = this.bladeAngle * 0.6 + i * 1.7, w = halfWidth(y) - 3;
        g.lineStyle(1.4, 0xd9b979, 0.55 * (1 - crush)); g.beginPath(); g.moveTo(Math.cos(a) * w, y); g.lineTo(Math.cos(a + 0.9) * w * 0.4, y + 3); g.lineTo(Math.cos(a + 1.8) * w, y + 5); g.strokePath();
      }
      // Ice: whole cubes break into shrinking pieces that orbit with the vortex.
      const pieces = Math.min(24, s.ice.length * (1 + Math.floor(crush * 3)));
      for (let i = 0; i < pieces; i++) {
        const cube = s.ice[i % Math.max(1, s.ice.length)], size = Math.max(1.4, 8 * (1 - crush * 0.8) / (1 + Math.floor(crush * 3)) ** 0.5);
        const depth = Math.min(h - 4, Math.max(3, (cube?.y || 0) + 3 + crush * (i % 5) * h / 6));
        const y = top + depth, w = halfWidth(y) - size;
        const a = (cube?.spin || 0) + i * 2.1 + this.bladeAngle * (0.25 + 0.2 * (i % 3));
        const x = speed > 0.02 || crush > 0 ? Math.cos(a) * w * 0.85 : Math.max(-w, Math.min(w, cube?.x || 0));
        g.fillStyle(0xd6eef0, 0.75 - crush * 0.35); g.fillRect(x - size / 2, y - size / 2, size, size);
        if (size > 3) { g.lineStyle(0.8, 0xffffff, 0.8); g.strokeRect(x - size / 2, y - size / 2, size, size); }
      }
      // Fine ice sparkle once crushed, coarser when under-blended.
      if (crush > 0.2) for (let i = 0; i < 14; i++) { const y = top + 3 + (i * 7 % Math.max(4, h - 4)), w = halfWidth(y) - 2; g.fillStyle(0xffffff, 0.55); g.fillCircle(-w + (i * 13 % (w * 2)), y, crush > 0.9 ? 0.6 : 1.1); }
      // Vortex funnel at the surface while spinning.
      if (speed > 0.05) {
        const depth = Math.min(h * 0.6, 16) * speed;
        g.fillStyle(lerp(lerp(fresh, slush, crush), 0x9c8a6a, 0.18), 0.8); g.fillTriangle(-halfWidth(top) * 0.7 * speed, top + 1, halfWidth(top) * 0.7 * speed, top + 1, Math.sin(time * 0.05) * 1.5, top + depth);
        for (let k = 0; k < 3; k++) { g.lineStyle(1.1, 0xffffff, 0.35 * speed); g.strokeEllipse(0, top + 1 + k * depth / 4, halfWidth(top) * 1.6 * (1 - k * 0.28) * speed, 3 * (1 - k * 0.2)); }
        // Spiral arms of the swirl, turning with the blades.
        for (let arm = 0; arm < 3; arm++) {
          g.lineStyle(1.3, 0xc9b48a, 0.65 * speed); g.beginPath();
          for (let k = 0; k <= 8; k++) {
            const r = 2 + k * (halfWidth(top) - 4) / 8, a = this.bladeAngle * 0.45 + arm * 2.094 + k * 0.32;
            const x = Math.cos(a) * r, y = top + 1 + depth * (1 - r / halfWidth(top)) * 0.85 + Math.sin(a) * 1.6;
            if (k) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.strokePath();
        }
      }
      // Foam: a pale, bubbly crown that builds with blending and collapses when overblended.
      const foam = (s.foam || 0) * (over ? 0.45 : 1);
      if (foam > 0.05) {
        g.fillStyle(0xfffdf7, 0.9); g.fillPoints(poly(top - foam * 4, top + 1.5), true);
        for (let i = 0; i < Math.floor(foam * 12); i++) { const x = -halfWidth(top) + 3 + (i * 9 % (halfWidth(top) * 2 - 6)); g.fillStyle(0xffffff, 0.85); g.fillCircle(x, top - foam * 4 + (i % 3) * 1.2, 0.8 + foam * (i % 2)); }
      } else { g.fillStyle(lerp(fresh, slush, crush)); g.fillEllipse(0, top, halfWidth(top) * 2, 3); }
    }
    // Blades: spin up with the motor, blur at speed.
    const bladeY = 20;
    if (speed > 0.35) { g.fillStyle(0xb8c8c2, 0.35); g.fillEllipse(0, bladeY, 26, 5); }
    for (let i = 0; i < 2; i++) {
      const a = this.bladeAngle + i * Math.PI / 2;
      line(g, [[-Math.cos(a) * 12, bladeY - Math.sin(a) * 2.5 + (i ? -1 : 1)], [Math.cos(a) * 12, bladeY + Math.sin(a) * 2.5 + (i ? -1 : 1)]], 0x6f8780, 2.2, speed > 0.35 ? 0.5 : 1);
    }
    g.fillStyle(0x4b625c); g.fillCircle(0, bladeY, 2.5);
    // Clear tapered jar, measuring marks, handle and spout.
    const outline = [{ x: -25, y: -32 }, { x: 25, y: -32 }, { x: 19, y: 26 }, { x: -19, y: 26 }];
    g.fillStyle(0xd6ece3, 0.12); g.fillPoints(outline, true);
    g.lineStyle(1.8, 0x5d8a80, 0.95); g.strokePoints(outline, true);
    g.lineStyle(1, 0xffffff, 0.35); g.beginPath(); g.moveTo(-19, -26); g.lineTo(-15, 20); g.strokePath();
    for (const [ml, y] of [[100, 26 - 100 * 0.27], [200, 26 - 200 * 0.27]]) { g.lineStyle(1, 0x5d8a80, 0.8); g.beginPath(); g.moveTo(halfWidth(y) - 7, y); g.lineTo(halfWidth(y) - 1, y); g.strokePath(); if (ml === 200) { g.lineStyle(1, 0x5d8a80, 0.5); g.beginPath(); g.moveTo(halfWidth(y) - 5, y + 6.75); g.lineTo(halfWidth(y) - 1, y + 6.75); g.strokePath(); } }
    g.lineStyle(4, 0x3f6b62); g.strokeRoundedRect(23, -22, 11, 34, 4);
    g.lineStyle(1.5, 0xc4dbcc, 0.8); g.strokeRoundedRect(24, -21, 9, 32, 3);
    g.fillStyle(0xd6ece3, 0.5); g.fillTriangle(-25, -32, -31, -36, -22, -28);
  }
  drawLid() {
    const g = this.lidArt; g.clear();
    g.fillStyle(0x122f29, 0.2); g.fillEllipse(1, 6, 52, 8);
    round(g, -27, -5, 54, 10, 0x2f5240, 4); round(g, -25, -5, 50, 6, 0x3f6b52, 3);
    round(g, -7, -11, 14, 7, 0x2a4a3a, 3); g.fillStyle(0xffffff, 0.2); g.fillRect(-22, -4, 16, 1.5);
  }
  drawMeter(s, running, pulse) {
    const g = this.gauge; g.clear();
    const { x, y, w } = METER, scale = w / BLEND.max;
    round(g, x - 2, y - 2, w + 4, 10, 0x1b3329, 5);
    SEGMENTS.forEach(([from, to, color], i) => {
      g.fillStyle(color, s.blendTime > from ? 1 : 0.35); g.fillRect(x + from * scale, y, (to - from) * scale, 6);
      if (i) { g.fillStyle(0x1b3329); g.fillRect(x + from * scale - 0.5, y, 1, 6); }
    });
    const ps = x + BLEND.perfect * scale, pe = x + BLEND.over * scale;
    g.lineStyle(1.5, 0xd6f0bb, s.stage === 'PERFECT' && running ? pulse : 0.8);
    g.beginPath(); g.moveTo(ps, y - 3); g.lineTo(ps, y + 9); g.moveTo(pe, y - 3); g.lineTo(pe, y + 9); g.strokePath();
    const blended = s.blendTime > 0;
    this.text(this.stageText, blended ? BLEND_STAGES[s.stage] : '—', !blended ? '#a9bba0' : s.stage === 'OVERBLENDED' ? '#ffc3a8' : s.stage === 'PERFECT' ? '#d6f0bb' : s.stage === 'GOOD' ? '#f2e8a6' : '#ffe2a6');
    if (!blended) return;
    const m = x + Math.min(w, s.blendTime * scale), color = s.stage === 'OVERBLENDED' ? 0xffbd9e : s.stage === 'PERFECT' ? 0xe9ffd4 : 0xffe2a6;
    g.fillStyle(0x1b3329); g.fillCircle(m, y + 3, 5.5); g.fillStyle(color); g.fillCircle(m, y + 3, 3.6);
  }
  destroy() { for (const remove of this.removers) remove(); this.root.destroy(); }
}
