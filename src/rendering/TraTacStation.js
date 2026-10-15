import { itemSurface } from './ItemSurface.js';
import { KumquatPrep, KUMQUAT_FRUITS, JUICE_TARGET, TEA_TARGET, modifierTargets, formatModifierLabel, ICE_GRAMS_PER_CUBE } from '../models/KumquatPrep.js';
import { button } from '../ui/widgets.js';
import { toolArt, label, round, line } from './art.js';
import { RULES } from '../config.js';

const PANEL = { x: 8, y: 674, w: 224, h: 120 };
const BOARD = { x: 52, y: 726 };
const SQUEEZER = { x: 124, y: 722 };
const CUP_HOME = { x: 188, y: 728 };
const METER = { x: 16, y: 781, w: 142 };
const SYRUP_MAX = 30;
const TONE = { done: [0x3f6a45, '#d6f0bb'], active: [0x7a5a2c, '#ffe2a6'], warn: [0x6e3f31, '#ffc3a8'], idle: [0x2b4438, '#a9bba0'] };

export class TraTacStation {
  constructor(scene) {
    this.scene = scene;
    this.state = new KumquatPrep();
    this.removers = [];
    this.tiles = [];
    this.cache = new Map();
    this.droplets = [];
    this.lastTime = null;
    const engine = scene.drinkEngine;

    this.root = scene.add.container(0, 0).setDepth(45).setVisible(false);
    this.panel = scene.add.graphics();
    this.boardArt = itemSurface(scene);
    this.squeezerArt = itemSurface(scene);
    this.gauge = scene.add.graphics();
    this.root.add([this.panel, this.boardArt, this.squeezerArt, this.gauge]);

    this.chip = label(scene, 120, 683, '', 9, '#fff4de', { fontStyle: 'bold' });
    this.sweetLabel = label(scene, METER.x, 770, 'Độ ngọt', 8, '#a9bba0').setOrigin(0, 0.5);
    this.sweetValue = label(scene, METER.x + METER.w, 770, '', 8, '#e9e4c7', { fontStyle: 'bold' }).setOrigin(1, 0.5);
    this.root.add([this.chip, this.sweetLabel, this.sweetValue]);

    // Interactive handles on the cutting board, squeezer, and small measuring cup.
    this.boardHandle = scene.add.container(BOARD.x, BOARD.y);
    this.boardHandleArt = itemSurface(scene);
    this.boardHandle.add(this.boardHandleArt);

    this.squeezerHandle = scene.add.container(SQUEEZER.x, SQUEEZER.y);
    this.squeezerHandleArt = itemSurface(scene);
    this.squeezerHandle.add(this.squeezerHandleArt);

    this.measuringCup = scene.add.container(CUP_HOME.x, CUP_HOME.y);
    this.cupArt = itemSurface(scene);
    this.measuringCup.add(this.cupArt);

    this.root.add([this.boardHandle, this.squeezerHandle, this.measuringCup]);

    const boardOnly = t => t.id === 'tratac-board';
    const squeezerOnly = t => t.id === 'tratac-squeezer';
    const cupOnly = t => t.recipeId?.() === 'tratac';
    const stock = id => scene.tutorial ? Infinity : scene.session.inventory[id] || 0;

    this.removers.push(engine.registerTarget('tratac-board', {
      accepts: ['place', 'slice'],
      radius: 42,
      visible: () => this.root.visible && this.root.active,
      contains: (x, y) => Math.abs(x - BOARD.x) <= 44 && Math.abs(y - BOARD.y) <= 42,
      center: () => ({ x: BOARD.x, y: BOARD.y, radius: 28 }),
      getState: () => this.state,
      takeIngredient: (id, amount) => id === 'kumquat' ? scene.session.placeKumquats(this.state, amount) : 0,
      onChange: (action, amount) => {
        if (action === 'place' && amount > 0) {
          scene.game.audio.play('place');
          scene.toast('Đã đặt 2 quả tắc lên thớt (-2 quả). Vuốt qua quả tắc để cắt đôi.');
        }
        if (action === 'slice' && amount > 0) {
          scene.game.audio.play('grounds');
          this.spawnDroplets(BOARD.x, BOARD.y - 4, 6);
          scene.toast('Đã cắt đôi 2 quả tắc! Kéo tắc đã cắt sang khu vắt.');
        }
      },
      render: (_, time) => this.render(time),
    }));

    this.removers.push(engine.registerTarget('tratac-squeezer', {
      accepts: ['moveFruit', 'squeeze'],
      radius: 42,
      visible: () => this.root.visible && this.root.active,
      contains: (x, y) => Math.abs(x - SQUEEZER.x) <= 44 && Math.abs(y - SQUEEZER.y) <= 42,
      center: () => ({ x: SQUEEZER.x, y: SQUEEZER.y, radius: 30 }),
      getState: () => this.state,
      onChange: (action, amount) => {
        if (action === 'squeeze' && amount > 0) {
          scene.game.audio.play('drop');
          this.spawnDroplets(SQUEEZER.x, SQUEEZER.y + 6, 4);
          if (this.state.stage === 'READY' && !this.state.perfectAnnounced) {
            this.state.perfectAnnounced = true;
            scene.drinkEngine.effects.perfect(CUP_HOME.x, CUP_HOME.y - 10);
            scene.game.audio.play('creamPerfect', 0.024);
            scene.toast('ĐÃ VẮT ĐỦ 20 ML NƯỚC TẮC! Kéo ly đong rót vào ly.');
          }
        }
      },
    }));

    // Swipe gesture on the cutting board slices the 2 whole kumquats.
    this.removers.push(engine.registerTool('tratac-board-slice', this.boardHandle, {
      action: 'slice',
      hitSize: 64,
      canTarget: boardOnly,
      enabled: () => this.state.fruits > 0 && !this.state.sliced,
      hint: () => 'Vuốt ngang qua 2 quả tắc trên thớt để cắt đôi',
      release: () => { this.boardHandle.setPosition(BOARD.x, BOARD.y).setRotation(0); },
    }));

    // Dragging the cut halves from the cutting board to the squeezing area transfers them without deducting more fruit.
    this.removers.push(engine.registerTool('tratac-halves-move', this.boardHandle, {
      action: 'moveFruit',
      hitSize: 64,
      canTarget: squeezerOnly,
      enabled: () => this.state.sliced && !this.state.inSqueezer,
      hint: () => 'Kéo 4 nửa quả tắc sang khu vắt bên cạnh',
      release: ({ point, target, canceled }) => {
        this.boardHandle.setPosition(BOARD.x, BOARD.y).setRotation(0);
        if (canceled) return;
        if (target?.id === 'tratac-squeezer' || Math.hypot(point.x - SQUEEZER.x, point.y - SQUEEZER.y) <= 52) {
          if (this.state.moveToSqueezer()) {
            scene.game.audio.play('pickup');
            scene.toast('Nhấn và kéo qua lại trên khu vắt để ép 20 ml nước cốt tắc.');
          }
        }
      },
    }));

    // Pressing and dragging on the squeezing area compresses the cut fruit and fills the small measuring cup.
    this.removers.push(engine.registerTool('tratac-squeezer-press', this.squeezerHandle, {
      action: 'squeeze',
      hitSize: 68,
      canTarget: squeezerOnly,
      enabled: () => this.state.sliced && this.state.inSqueezer && this.state.extracted < JUICE_TARGET - 0.01,
      hint: () => `Nước tắc ${this.state.extracted.toFixed(0)}/${JUICE_TARGET} ml · nhấn và kéo để vắt (không tốn thêm quả)`,
      release: () => { this.squeezerHandle.setPosition(SQUEEZER.x, SQUEEZER.y).setRotation(0); },
    }));

    // Small measuring cup pours extracted citrusJuice + floating kumquat slices into the glass.
    this.removers.push(engine.registerTool('tratac-measuring-cup', this.measuringCup, {
      action: 'pour',
      ingredient: 'citrusJuice',
      stepId: 'juice',
      rate: 28,
      hitSize: 58,
      sourceTarget: 'tratac-squeezer',
      spout: { x: -16, y: -18 },
      pourOffset: { x: 20, y: -62 },
      canTarget: cupOnly,
      enabled: () => (this.state.amounts.citrusJuice || 0) > 0.1 || this.state.inSqueezer,
      blocked: () => !(this.state.amounts.citrusJuice > 0.1) ? 'Nhấn và kéo ở khu vắt để ép nước tắc vào ly đong trước.' : null,
      sourceState: () => (this.state.amounts.citrusJuice || 0) > 0.1 ? this.state : null,
      emptyHint: 'Chưa có nước tắc trong ly đong.',
      hint: state => `Nước tắc ${(state.amounts.citrusJuice || 0).toFixed(0)}/${JUICE_TARGET} ml · nghiêng ly đong để rót vào ly`,
      onPour: () => scene.game.audio.play('pour'),
      release: () => {
        if (this.state.empty) {
          this.state = new KumquatPrep();
          scene.toast('Đã rót nước cốt và lát tắc vào ly!');
        }
      },
    }));

    const addTool = (key, id, kind, x, name, options) => {
      const art = toolArt(scene, kind, x, 715).setScale(0.66);
      const tile = {
        key, x, art,
        name: label(scene, x, 752, name, 9, '#e9e4c7', { fontStyle: 'bold' }),
        badge: label(scene, x, 777, '', 8, '#fff4de', { fontStyle: 'bold' }),
        stock: label(scene, x + 19, 684, '', 8, '#fff4d5', { fontStyle: 'bold' }).setOrigin(1, 0.5),
      };
      this.tiles.push(tile);
      this.root.add([tile.name, tile.badge, tile.stock, art]);
      this.removers.push(engine.registerTool(id, art, { hitSize: 46, ...options }));
      return art;
    };

    addTool('kumquat', 'tratac-kumquat', 'kumquat', 256, 'Tắc tươi', {
      action: 'place',
      ingredient: 'kumquat',
      quantity: KUMQUAT_FRUITS,
      juiceCapacity: JUICE_TARGET / KUMQUAT_FRUITS,
      canTarget: boardOnly,
      blocked: () => !this.state.empty ? 'Trên thớt/ly đong đang có tắc đã chuẩn bị.' : stock('kumquat') < KUMQUAT_FRUITS ? 'Hết tắc tươi! Cần nhập thêm ở cửa hàng.' : null,
      hint: () => 'Thả 2 quả tắc tươi lên thớt gỗ để cắt',
    });

    addTool('tea', 'tratac-tea-pitcher', 'tea', 302, 'Bình trà', {
      action: 'pour',
      ingredient: 'tea',
      stepId: 'tea',
      rate: 55,
      spout: { x: -20, y: -18 },
      pourOffset: { x: 22, y: -64 },
      canTarget: cupOnly,
      blocked: () => stock('tea') < 1 ? 'Hết trà ủ sẵn! Cần nhập thêm ở cửa hàng.' : null,
      hint: state => `Trà ${(state.amounts.tea || 0).toFixed(0)}/${TEA_TARGET} ml · nghiêng bình rót dòng trà vàng óng`,
      onPour: () => scene.game.audio.play('pour'),
    });

    addTool('syrup', 'tratac-syrup-bottle', 'syrup', 348, 'Siro', {
      action: 'pour',
      ingredient: 'syrup',
      stepId: 'syrup',
      rate: 8,
      spout: { x: -6, y: -28 },
      pourOffset: { x: 16, y: -62 },
      canTarget: cupOnly,
      blocked: () => stock('syrup') < 0.5 ? 'Hết siro đường! Cần nhập thêm ở cửa hàng.' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const ml = state.amounts.syrup || 0;
        const note = ml > targets.syrupRange[1] + 2 ? ' · Hơi ngọt quá rồi!' : ` · mục tiêu ${targets.syrup} ml (${targets.sweetnessLabel})`;
        return `Siro ${ml.toFixed(0)}/${targets.syrup} ml${note}`;
      },
      onPour: () => scene.game.audio.play('condensed'),
    });

    addTool('ice', 'tratac-ice-scoop', 'scoop', 394, 'Xúc đá', {
      action: 'iceScoopCup',
      stepId: 'ice',
      canTarget: cupOnly,
      blocked: () => stock('ice') * 3 < 1 ? 'Hết đá viên! Cần nhập thêm ở cửa hàng.' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const grams = Math.round((state.amounts.ice || 0) * ICE_GRAMS_PER_CUBE);
        return `Đá ${grams}/${targets.iceGrams} g (${targets.iceLabel}) · thả muỗng đá vào ly (+30 g/lần)`;
      },
      release: ({ target, canceled, matched }) => {
        if (canceled || !matched || target?.recipeId?.() !== 'tratac') return;
        const station = scene.stations.find(s => s.model.id === target.id);
        const drink = station?.model.drink;
        if (!drink) return;
        const accepted = scene.session.scoopIceIntoGlass(drink, 1);
        if (accepted > 0) {
          scene.dropIce(station);
          scene.game.audio.play('ice');
          engine.effects.ice(station.x, station.y - 6, 0);
        }
      },
    });

    addTool('stir', 'tratac-stir-spoon', 'stir', 440, 'Khuấy', {
      action: 'stir',
      stepId: 'stir',
      canTarget: cupOnly,
      hint: state => `Khuấy ${Math.min(100, Math.round((state.steps.stir?.amount || 0) / RULES.stirRadians * 100))}% · xoay tròn trong ly cho trà tắc hòa quyện`,
      onChange: () => scene.game.audio.play('stir'),
    });

    this.reset = button(scene, 194, 782, 66, 18, 'Dọn thớt', () => this.discard(), { size: 8, fill: 0x4c6a5a, color: '#f6efd9', radius: 5 });
    this.root.add(this.reset);
  }

  activeDrink() {
    const d = this.scene.stations[this.scene.selectedStation]?.model.drink;
    return d?.recipeId === 'tratac' && !d.consumed ? d : null;
  }

  activeTargets(target = null) {
    const station = target ? this.scene.stations.find(s => s.model.id === target.id) : this.scene.stations[this.scene.selectedStation];
    const waitingCustomer = this.scene.session?.customers.find(c => !c.resolved && c.recipeId === 'tratac');
    const mod = station?.model.modifiers || station?.model.drink?.modifiers || waitingCustomer?.modifiers || null;
    return modifierTargets(mod);
  }

  spawnDroplets(x, y, count = 5) {
    if (this.scene.game.save?.data.settings.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      this.droplets.push({
        x: x + (i - (count - 1) / 2) * 5,
        y,
        vx: (i - (count - 1) / 2) * 14,
        vy: -22 - (i % 3) * 10,
        alpha: 1,
      });
    }
  }

  discard() {
    const scene = this.scene;
    scene.drag.cancel();
    if (!this.state.empty) {
      scene.session.recordWaste(this.state.stock());
      scene.toast('Đã dọn thớt & ly đong; tắc đã cắt không hoàn lại kho.');
      scene.game.audio.play('trash');
    }
    this.state = new KumquatPrep();
    this.measuringCup.setPosition(CUP_HOME.x, CUP_HOME.y).setRotation(0);
  }

  setVisible(visible) {
    this.root.setVisible(visible);
    this.boardHandle.setVisible(visible);
    this.squeezerHandle.setVisible(visible);
    this.measuringCup.setVisible(visible);
    this.reset.input.enabled = visible;
    for (const tile of this.tiles) {
      tile.art.setVisible(visible);
      tile.name.setVisible(visible);
      tile.badge.setVisible(visible);
      tile.stock.setVisible(visible);
    }
  }

  text(object, text, color) {
    const key = `${text}|${color}`;
    if (this.cache.get(object) === key) return;
    this.cache.set(object, key);
    object.setText(text).setColor(color);
  }

  render(time) {
    if (!this.root.visible) return;
    const dt = this.lastTime === null ? 0 : Math.max(0, Math.min(0.1, (time - this.lastTime) / 1000));
    this.lastTime = time;
    const s = this.state;
    const reduced = this.scene.game.save.data.settings.reducedMotion;
    const pulse = reduced ? 1 : 0.65 + 0.35 * Math.sin(time / 180);

    if (s.sliceBounce > 0) s.sliceBounce = Math.max(0, s.sliceBounce - dt * 3.2);
    if (s.compression > 0 && !this.scene.drinkEngine.owners.has('tratac-squeezer')) {
      s.compression = Math.max(0.12, s.compression - dt * 2.4);
    }
    for (const drop of this.droplets) {
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.vy += 120 * dt;
      drop.alpha = Math.max(0, drop.alpha - dt * 2.2);
    }
    this.droplets = this.droplets.filter(d => d.alpha > 0.05);

    const d = this.activeDrink();
    const a = d?.preparation.amounts || {};
    const targets = this.activeTargets();
    const teaMl = a.tea || 0;
    const syrupMl = a.syrup || 0;
    const juiceInCup = a.citrusJuice || 0;
    const iceCubes = a.ice || 0;
    const iceGrams = Math.round(iceCubes * ICE_GRAMS_PER_CUBE);
    const stirPct = Math.min(100, Math.round((d?.preparation.steps.stir?.amount || 0) / RULES.stirRadians * 100));

    const next = s.stage === 'EMPTY' && juiceInCup < JUICE_TARGET - 2 ? 'kumquat'
      : s.stage === 'WHOLE' ? 'slice'
      : s.stage === 'SLICED' ? 'moveFruit'
      : s.stage === 'SQUEEZING' ? 'squeeze'
      : (s.amounts.citrusJuice || 0) > 0.5 && juiceInCup < JUICE_TARGET - 2 ? 'pourJuice'
      : teaMl < targets.tea - 10 ? 'tea'
      : syrupMl < targets.syrupRange[0] ? 'syrup'
      : iceCubes < targets.ice ? 'ice'
      : stirPct < 100 ? 'stir'
      : null;

    const p = this.panel; p.clear();
    const overSweet = syrupMl > targets.syrupRange[1] + 2;
    round(p, PANEL.x, PANEL.y + 3, PANEL.w, PANEL.h, 0x122f29, 12, 0.3);
    round(p, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x365448, 12);
    p.lineStyle(overSweet ? 2 : 1, overSweet ? 0xe0906e : 0x99b299, overSweet ? 0.85 : 0.35);
    p.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);

    const stepText = {
      kumquat: '1 · Kéo 2 quả tắc lên thớt',
      slice: '2 · Vuốt qua tắc để cắt đôi',
      moveFruit: '3 · Kéo tắc sang khu vắt',
      squeeze: `4 · Nhấn & kéo vắt (${s.extracted.toFixed(0)}/20 ml)`,
      pourJuice: '5 · Kéo ly đong rót vào ly',
      tea: `6 · Rót ${targets.tea} ml trà`,
      syrup: `7 · Rót ${targets.syrup} ml siro (${targets.sweetnessLabel})`,
      ice: `8 · Xúc ${targets.iceGrams} g đá (${targets.iceLabel})`,
      stir: '9 · Khuấy đều trà tắc',
    }[next] || (d ? '✓ Trà tắc sẵn sàng phục vụ' : 'Đặt ly lên trạm để pha Trà tắc');

    const chipTone = overSweet ? 'warn' : !next && d ? 'done' : 'active';
    const chipWidth = Math.min(210, stepText.length * 4.8 + 16);
    round(p, 120 - chipWidth / 2, 676, chipWidth, 15, TONE[chipTone][0], 7, chipTone === 'active' ? pulse : 1);
    this.text(this.chip, stepText, TONE[chipTone][1]);

    this.drawBoard(time, pulse, next);
    this.drawSqueezerAndCup(time, pulse, next);
    this.drawSweetnessMeter(syrupMl, targets, pulse);

    const stockText = id => {
      if (this.scene.tutorial) return '';
      const n = this.scene.session.inventory[id] || 0;
      return id === 'tea' || id === 'syrup' ? `${Math.round(n)}ml` : `×${Number.isInteger(n) ? n : n.toFixed(1)}`;
    };

    const badges = {
      kumquat: [juiceInCup >= 18 ? '✓ 2 quả' : s.fruits ? 'Đã cắt' : '2 quả', juiceInCup >= 18 || s.fruits ? 'done' : next === 'kumquat' ? 'active' : 'idle', 'kumquat', 2],
      tea: [`${teaMl.toFixed(0)}/${targets.tea}`, teaMl > targets.tea + 20 ? 'warn' : Math.abs(teaMl - targets.tea) <= 15 ? 'done' : next === 'tea' ? 'active' : 'idle', 'tea', 10],
      syrup: [`${syrupMl.toFixed(0)}/${targets.syrup}ml`, overSweet ? 'warn' : syrupMl >= targets.syrupRange[0] && syrupMl <= targets.syrupRange[1] ? 'done' : next === 'syrup' ? 'active' : 'idle', 'syrup', 1],
      ice: [`${iceGrams}/${targets.iceGrams}g`, iceCubes > targets.ice ? 'warn' : iceCubes === targets.ice ? 'done' : next === 'ice' ? 'active' : 'idle', 'ice', 0.34],
      stir: [`${stirPct}%`, stirPct >= 95 ? 'done' : next === 'stir' ? 'active' : 'idle', null, 0],
    };

    for (const tile of this.tiles) {
      const [text, tone, stockId, minStock] = badges[tile.key];
      const active = next === tile.key;
      const x = tile.x - 22;
      const empty = stockId && !this.scene.tutorial && (this.scene.session.inventory[stockId] || 0) + 1e-9 < minStock;
      round(p, x, 676, 44, 116, active ? 0x52704f : 0x46604c, 8);
      if (active) {
        p.lineStyle(2, 0xe8b46b, pulse);
        p.strokeRoundedRect(x, 676, 44, 116, 8);
      }
      const [fill, color] = TONE[empty ? 'warn' : tone];
      round(p, tile.x - 20, 769, 40, 16, fill, 7);
      this.text(tile.badge, empty ? 'Hết' : text, color);
      tile.art.setAlpha(empty ? 0.35 : 1);
      if (stockId) this.text(tile.stock, stockText(stockId), empty ? '#ffc3a8' : '#fff4d5');
    }
  }

  drawBoard(time, pulse, next) {
    const g = this.boardArt, s = this.state; g.clear();
    g.item('board', BOARD.x, BOARD.y - 1, 72, 54);
    if (next === 'kumquat' || next === 'slice' || next === 'moveFruit') {
      g.lineStyle(2, 0xe8b46b, pulse);
      g.strokeRoundedRect(BOARD.x - 36, BOARD.y - 28, 72, 54, 8);
    }

    const hg = this.boardHandleArt; hg.clear();
    if (s.fruits > 0 && !s.inSqueezer) {
      const bounce = Math.sin(s.sliceBounce * Math.PI) * 4;
      if (!s.sliced) {
        // Two whole kumquats ready to slice.
        for (const [dx, dy] of [[-12, -3 - bounce], [12, 3 - bounce]]) {
          hg.item('kumquat', dx, dy, 22, 24);
        }
        // Swipe cutting guide line across the fruits.
        hg.lineStyle(1.5, 0xfff4de, pulse);
        hg.beginPath(); hg.moveTo(-26, -10); hg.lineTo(26, 10); hg.strokePath();
      } else {
        // Four separated cut kumquat halves with detailed citrus segments & tiny juice droplets.
        const sep = 3 + (1 - s.sliceBounce) * 4;
        for (const [dx, dy] of [[-14 - sep * 0.4, -7 - bounce], [-2 + sep * 0.4, -5 + bounce * 0.5], [-4 - sep * 0.3, 8 - bounce * 0.5], [13 + sep * 0.4, 7 + bounce]]) {
          this.drawCutHalf(hg, dx, dy, 8.5, 1, 1);
        }
        for (const [dx, dy] of [[-6, 0], [5, -1], [2, 12], [-12, 4]]) {
          hg.fillStyle(0xf5c850, 0.85); hg.fillCircle(dx, dy, 1.4);
        }
      }
    }
  }

  drawCutHalf(g, x, y, r, scaleX = 1, scaleY = 1) {
    g.item('kumquat-half', x, y, r * 2 * scaleX, r * 2 * scaleY);
  }

  drawSqueezerAndCup(time, pulse, next) {
    const g = this.squeezerArt, s = this.state; g.clear();
    g.item('squeezer', SQUEEZER.x, SQUEEZER.y, 54, 46);
    line(g, [[SQUEEZER.x + 18, SQUEEZER.y + 4], [CUP_HOME.x - 16, CUP_HOME.y - 6]], 0xf5c850, s.extracted > 0 ? 2 : 1, s.extracted > 0 ? 0.75 : 0.25);

    if (next === 'moveFruit' || next === 'squeeze') {
      g.lineStyle(2, 0xe8b46b, pulse);
      g.strokeRoundedRect(SQUEEZER.x - 27, SQUEEZER.y - 24, 54, 46, 9);
    }

    const sg = this.squeezerHandleArt; sg.clear();
    if (s.inSqueezer) {
      const comp = s.compression || 0;
      const sx = 1 + comp * 0.24, sy = 1 - comp * 0.3;
      for (const [dx, dy] of [[-8, -4], [8, -3], [-5, 6], [7, 5]]) {
        this.drawCutHalf(sg, dx, dy, 8, sx, sy);
      }
      if (comp > 0.2) {
        sg.fillStyle(0xf5c850, 0.75);
        sg.fillEllipse(0, 10, 22 * sx, 6);
      }
    }

    // Animated juice droplets during slicing and squeezing.
    for (const drop of this.droplets) {
      g.fillStyle(0xf5c850, drop.alpha);
      g.fillCircle(drop.x, drop.y, 2.2);
    }

    // Small measuring cup at CUP_HOME (or carried to the glass).
    const cg = this.cupArt; cg.clear();
    const juice = s.amounts.citrusJuice || 0;
    const fillH = Math.min(28, (juice / JUICE_TARGET) * 26);
    cg.fillStyle(0x122f29, 0.25); cg.fillEllipse(0, 22, 36, 8);
    if (fillH > 0.5) {
      round(cg, -13, 18 - fillH, 26, fillH, 0xf5c850, 4, 0.92);
      cg.fillStyle(0xffe28a, 0.9); cg.fillEllipse(0, 18 - fillH, 25, 4);
      if (s.sliced && juice >= 4) {
        this.drawCutHalf(cg, -4, 18 - fillH + 3, 4.5, 1, 0.8);
        this.drawCutHalf(cg, 5, 18 - fillH + 4, 4.5, 1, 0.8);
      }
    }
    cg.item('measuring-cup', 3, 2, 39, 38, 'cup', { front: true });
    if (next === 'pourJuice') { cg.lineStyle(1.5, 0xe8b46b, pulse); cg.strokeRoundedRect(-16, -17, 39, 39, 6); }
  }

  drawSweetnessMeter(syrupMl, targets, pulse) {
    const g = this.gauge; g.clear();
    const { x, y, w } = METER;
    const scale = w / SYRUP_MAX;
    round(g, x - 2, y - 2, w + 4, 9, 0x1b3329, 4);
    g.fillStyle(0x4b6355, 0.55); g.fillRoundedRect(x, y, w, 5, 2);
    const [r0, r1] = targets.syrupRange;
    g.fillStyle(0x8fc66c, 0.85);
    g.fillRect(x + r0 * scale, y, (r1 - r0) * scale, 5);
    g.lineStyle(1.4, 0xd6f0bb, pulse);
    g.beginPath();
    g.moveTo(x + r0 * scale, y - 2); g.lineTo(x + r0 * scale, y + 7);
    g.moveTo(x + r1 * scale, y - 2); g.lineTo(x + r1 * scale, y + 7);
    g.strokePath();

    const clamped = Math.min(SYRUP_MAX, syrupMl);
    if (clamped > 0) {
      const over = syrupMl > r1 + 2;
      g.fillStyle(over ? 0xe0906e : 0xe8b46b, 0.95);
      g.fillCircle(x + clamped * scale, y + 2.5, 3.8);
    }
    this.text(this.sweetLabel, `Ngọt (${targets.sweetnessLabel}: ${r0}–${r1}ml)`, '#a9bba0');
    this.text(this.sweetValue, `${syrupMl.toFixed(0)}ml`, syrupMl > r1 + 2 ? '#ffc3a8' : syrupMl >= r0 ? '#d6f0bb' : '#ffe2a6');
  }

  destroy() {
    for (const remove of this.removers) remove();
    this.root.destroy();
  }
}
