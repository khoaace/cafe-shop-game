import { itemSurface } from './ItemSurface.js';
import {
  MatchaBowl,
  MATCHA_SCOOP_GRAMS,
  MATCHA_WATER_TARGET,
  MATCHA_WHISK_TARGET,
  matchaWhiskStage,
  matchaTargets,
  formatMatchaModifierLabel,
  matchaStockWarnings,
} from '../models/MatchaBowl.js';
import { INGREDIENTS, usablePortions as inventoryUsablePortions } from '../logic/inventory.js';
import { ICE_GRAMS_PER_CUBE } from '../models/KumquatPrep.js';
import { button } from '../ui/widgets.js';
import { toolArt, label, round, line } from './art.js';

const PANEL = { x: 6, y: 674, w: 178, h: 120 };
const TIN_POS = { x: 34, y: 726 };
const BOWL_POS = { x: 112, y: 726 };
const TONE = {
  done: [0x3f6a45, '#d6f0bb'],
  active: [0x7a5a2c, '#ffe2a6'],
  warn: [0x6e3f31, '#ffc3a8'],
  idle: [0x2b4438, '#a9bba0'],
};

export class MatchaStation {
  constructor(scene) {
    this.scene = scene;
    this.removers = [];
    this.tiles = [];
    this.toolObjects = [];
    this.cache = new Map();
    this.powderParticles = [];
    this.fallingPowder = [];
    this.lastTime = null;
    this.state = new MatchaBowl();
    const engine = scene.drinkEngine;

    this.root = scene.add.container(0, 0).setDepth(45).setVisible(false);
    this.panel = scene.add.graphics();
    this.tinArt = itemSurface(scene);
    this.stageArt = scene.add.graphics();
    this.fxArt = scene.add.graphics();
    this.bowl = scene.add.container(BOWL_POS.x, BOWL_POS.y).setDepth(100);
    this.bowlBody = itemSurface(scene);
    this.bowl.add(this.bowlBody);
    this.root.add([this.panel, this.tinArt, this.stageArt, this.bowl, this.fxArt]);

    this.chip = label(scene, 95, 682, '', 8, '#fff4de', { fontStyle: 'bold' });
    this.stageLabel = label(scene, 112, 697, '', 7.4, '#d9f7be', { fontStyle: 'bold' });
    this.stockLine = label(scene, 95, 761, '', 6.9, '#e9e4c7');
    this.priceLine = label(scene, 95, 772, '', 6.5, '#b9ccb9');
    this.warnLine = label(scene, 95, 784, '', 7, '#ffd2bd', { fontStyle: 'bold' });
    this.root.add([this.chip, this.stageLabel, this.stockLine, this.priceLine, this.warnLine]);

    this.resetBtn = button(scene, 34, 750, 48, 16, 'Rửa bát', () => {
      scene.drag.cancel();
      if (this.state.empty) {
        scene.toast('Bát đánh matcha đang trống.');
        return;
      }
      scene.session.discardMatchaBowl(this.state);
      scene.toast('Đã đổ bỏ bát matcha lỗi; bột đã múc không hoàn lại.');
    }, { size: 7.4, fill: 0x4c6a5a, color: '#f6efd9', radius: 5 });
    this.root.add(this.resetBtn);

    const cupOnly = t => t.recipeId?.() === 'matcha';
    const bowlOnly = t => t.id === 'matcha-bowl';
    const stock = id => scene.tutorial ? Infinity : scene.session.inventory[id] || 0;

    this.removers.push(engine.registerTarget('matcha-bowl', {
      accepts: ['pour', 'whisk', 'garnish'],
      radius: 38,
      visible: () => this.root.visible && this.root.active,
      contains: (x, y) => Math.abs(x - BOWL_POS.x) <= 42 && Math.abs(y - BOWL_POS.y) <= 34,
      center: () => ({ x: BOWL_POS.x, y: BOWL_POS.y, radius: 34 }),
      pourPoint: () => ({ x: BOWL_POS.x, y: BOWL_POS.y - 4 - this.state.foam * 6 }),
      getState: () => this.state,
      acceptIngredient: (id, requested) => {
        if (id !== 'water') return 0;
        return scene.session.pourWarmWaterIntoBowl(this.state, requested);
      },
      onChange: (action, amount) => {
        if (action === 'whisk' && amount) {
          scene.game.audio.play('creamWhisk');
          if (this.state.foam > 0.25) scene.game.audio.play('foamBubble');
          if (this.state.stage === 'MICROFOAM' && !this.state.perfectAnnounced) {
            this.state.perfectAnnounced = true;
            scene.drinkEngine.effects.perfect(BOWL_POS.x, BOWL_POS.y - 6);
            scene.toast('BỌT MATCHA MỊN HOÀN HẢO! Nghiêng bát rót lên lớp sữa tươi nhé.');
            scene.game.audio.play('creamPerfect', 0.024);
          }
        }
      },
      render: (_, time) => this.render(time),
    }));

    const addTool = (key, id, kind, x, name, options) => {
      const art = toolArt(scene, kind, x, 715).setScale(0.58);
      const tile = {
        key, x, art,
        name: label(scene, x, 752, name, 7.6, '#e9e4c7', { fontStyle: 'bold' }),
        badge: label(scene, x, 777, '', 7, '#fff4de', { fontStyle: 'bold' }),
        stock: label(scene, x + 19, 684, '', 6.8, '#fff4d5', { fontStyle: 'bold' }).setOrigin(1, 0.5),
      };
      this.tiles.push(tile);
      this.toolObjects.push(art);
      this.root.add([tile.name, tile.badge, tile.stock, art]);
      this.removers.push(engine.registerTool(id, art, { hitSize: 40, ...options }));
      return art;
    };

    // Step 1 — Measure matcha powder (2g per bamboo scoop into bowl)
    addTool('matcha', 'matcha-powder-spoon', 'matcha', 208, 'Múc matcha', {
      action: 'garnish',
      stepId: 'matcha',
      canTarget: bowlOnly,
      blocked: () => stock('matcha') + 1e-9 < MATCHA_SCOOP_GRAMS ? 'Hết bột matcha!' : null,
      onPickup: () => {
        if (!scene.session.scoopMatchaFromTin(MATCHA_SCOOP_GRAMS)) {
          scene.toast('Hết bột matcha!');
          return false;
        }
        this.spawnDustBurst(TIN_POS.x, TIN_POS.y - 10, 6);
        return true;
      },
      hint: () => {
        const targets = this.activeTargets();
        const grams = Math.round(this.state.amounts.matcha || 0);
        return `Bột matcha trong bát: ${grams}/${targets.matcha} g (${targets.matchaLabel}) · thả muỗng tre vào bát (+${MATCHA_SCOOP_GRAMS} g)`;
      },
      release: ({ target, canceled, matched }) => {
        if (canceled || !matched || target?.id !== 'matcha-bowl') {
          const refunded = scene.session.cancelMatchaScoop();
          if (refunded > 0) scene.toast('Đã trả bột matcha về hộp (không trừ kho).');
          return;
        }
        const accepted = scene.session.scoopMatchaIntoBowl(this.state, MATCHA_SCOOP_GRAMS);
        if (accepted > 0) {
          scene.game.audio.play('scoop');
          this.spawnFallingPowder(BOWL_POS.x, BOWL_POS.y - 26, BOWL_POS.y + 4);
          this.spawnDustBurst(BOWL_POS.x, BOWL_POS.y - 6, 8);
        } else {
          scene.session.cancelMatchaScoop();
        }
      },
    });

    // Step 2 — Pour warm water into matcha bowl
    addTool('water', 'matcha-warm-kettle', 'kettle', 258, 'Nước ấm', {
      action: 'pour',
      ingredient: 'water',
      stepId: 'water',
      rate: 18,
      spout: { x: -24, y: -12 },
      pourOffset: { x: 20, y: -56 },
      canTarget: bowlOnly,
      hint: () => `Nước ấm ${(this.state.amounts.water || 0).toFixed(0)}/${MATCHA_WATER_TARGET} ml · nghiêng ấm rót vào bát matcha`,
      onPour: () => scene.game.audio.play('pour'),
    });

    // Step 3 — Whisk matcha with bamboo chasen (W-shaped / zigzag strokes)
    addTool('whisk', 'matcha-bamboo-whisk', 'chasen', 308, 'Chổi tre', {
      action: 'whisk',
      stepId: 'whisk',
      matchaWhisk: true,
      canTarget: bowlOnly,
      blocked: () => {
        if ((this.state.amounts.matcha || 0) <= 0) return 'Hãy múc bột matcha vào bát trước khi đánh!';
        if ((this.state.amounts.water || 0) <= 0) return 'Hãy rót 40 ml nước ấm vào bát trước khi đánh chổi tre!';
        return null;
      },
      hint: () => {
        const stage = matchaWhiskStage(this.state.whiskProgress || 0);
        const pct = Math.min(100, Math.round((this.state.whiskProgress || 0) * 100));
        return `Đánh chữ W / zíc-zắc trong bát: ${stage.label} (${pct}%)`;
      },
    });

    // Step 4a — Add ice cubes to glass
    addTool('ice', 'matcha-ice-scoop', 'scoop', 358, 'Xúc đá', {
      action: 'iceScoopCup',
      stepId: 'ice',
      canTarget: cupOnly,
      blocked: () => stock('ice') * 3 < 1 ? 'Hết đá viên!' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const grams = Math.round((state.amounts.ice || 0) * ICE_GRAMS_PER_CUBE);
        return `Đá ${grams}/${targets.iceGrams} g (${targets.iceLabel}) · thả muỗng đá vào ly (+30 g/lần)`;
      },
      release: ({ target, canceled, matched }) => {
        if (canceled || !matched || target?.recipeId?.() !== 'matcha') return;
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

    // Step 4b — Pour fresh milk into glass
    addTool('milk', 'matcha-fresh-milk', 'milk', 410, 'Sữa tươi', {
      action: 'pour',
      ingredient: 'milk',
      stepId: 'milk',
      rate: 44,
      spout: { x: -18, y: -16 },
      pourOffset: { x: 20, y: -64 },
      canTarget: cupOnly,
      blocked: () => stock('milk') * 50 < 1 ? 'Không đủ sữa tươi!' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const ml = state.amounts.milk || 0;
        const [minM, maxM] = targets.milkRange;
        return `Sữa tươi ${ml.toFixed(0)}/${targets.milk} ml (vùng chuẩn ${minM}–${maxM} ml · ${targets.milkLabel})`;
      },
      onPour: () => scene.game.audio.play('pour'),
    });

    // Step 4c — Optional sugar syrup (10ml default for "ít ngọt")
    addTool('syrup', 'matcha-syrup-bottle', 'syrup', 458, 'Siro đường', {
      action: 'pour',
      ingredient: 'syrup',
      stepId: 'syrup',
      rate: 10,
      spout: { x: -8, y: -26 },
      pourOffset: { x: 16, y: -62 },
      canTarget: cupOnly,
      blocked: () => stock('syrup') < 0.5 ? 'Không đủ siro đường!' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const ml = state.amounts.syrup || 0;
        if (targets.syrup <= 0) return `Đơn khách dặn không đường (đã rót ${ml.toFixed(0)} ml)`;
        const [minS, maxS] = targets.syrupRange;
        return `Siro đường ${ml.toFixed(0)}/${targets.syrup} ml (vùng chuẩn ${minS}–${maxS} ml · ${targets.sweetnessLabel})`;
      },
      onPour: () => scene.game.audio.play('pour'),
    });

    // Step 5 — Pour whisked matcha bowl over milk & ice in glass
    this.removers.push(engine.registerTool('matcha-bowl-pour', this.bowl, {
      action: 'pour',
      ingredient: 'matcha',
      stepId: 'pourMatcha',
      rate: 22,
      hitSize: 66,
      sourceTarget: 'matcha-bowl',
      spout: { x: -28, y: -6 },
      pourOffset: { x: 18, y: -74 },
      sourceState: () => (this.state.amounts.matcha || 0) > 0 && (this.state.amounts.water || 0) > 0 ? this.state : null,
      emptyHint: 'Hãy múc bột matcha + rót 40 ml nước ấm và đánh chổi tre trước khi rót vào ly.',
      canTarget: cupOnly,
      hint: state => {
        const targets = this.activeTargets();
        const poured = state.amounts.matcha || 0;
        const stage = matchaWhiskStage(this.state.whiskProgress || 0);
        return `Rót matcha lên mặt sữa (${poured.toFixed(1)}/${targets.matcha} g · ${stage.label})`;
      },
      onPour: () => scene.game.audio.play('pour'),
    }));
  }

  activeDrink() {
    const d = this.scene.stations[this.scene.selectedStation]?.model.drink;
    return d?.recipeId === 'matcha' && !d.consumed ? d : null;
  }

  activeTargets(target = null) {
    const station = target && target.id !== 'matcha-bowl'
      ? this.scene.stations.find(s => s.model.id === target.id)
      : this.scene.stations[this.scene.selectedStation];
    const waitingCustomer = this.scene.session?.customers.find(c => !c.resolved && c.recipeId === 'matcha');
    const mod = station?.model.modifiers || station?.model.drink?.modifiers || waitingCustomer?.modifiers || null;
    return matchaTargets(mod);
  }

  spawnDustBurst(x, y, count = 6) {
    if (this.scene.game.save?.data.settings.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      this.powderParticles.push({
        x: x + (i - (count - 1) / 2) * 3.8,
        y,
        vx: (i - (count - 1) / 2) * 15 + Math.sin(i * 2.1) * 9,
        vy: -17 - (i % 3) * 11,
        life: 0,
        maxLife: 0.42 + (i % 3) * 0.08,
        r: 1.7 + (i % 2) * 0.7,
        color: i % 2 === 0 ? 0x6ac449 : 0x3f822b,
      });
    }
  }

  spawnFallingPowder(x, startY, endY) {
    if (this.scene.game.save?.data.settings.reducedMotion) return;
    for (let i = 0; i < 5; i++) {
      this.fallingPowder.push({
        x: x + (i - 2) * 2.8,
        y: startY - i * 3,
        startY: startY - i * 3,
        endY,
        life: 0,
        duration: 0.26 + i * 0.03,
      });
    }
  }

  setText(key, textObject, value, color = null) {
    const prev = this.cache.get(key);
    if (prev?.value === value && prev?.color === color) return;
    this.cache.set(key, { value, color });
    textObject.setText(value);
    if (color) textObject.setColor(color);
  }

  setVisible(visible) {
    this.root.setVisible(visible);
    this.bowl.setVisible(visible);
    this.toolObjects.forEach(t => t.setVisible(visible));
    this.resetBtn.input.enabled = visible;
    if (!visible) return;
    const station = this.scene.stations[this.scene.selectedStation]?.model;
    const waitingCustomer = this.scene.session?.customers.find(c => !c.resolved && c.recipeId === 'matcha');
    if (station && station.recipeId !== 'matcha' && !station.drink) {
      station.chooseRecipe('matcha', waitingCustomer?.modifiers || null);
    }
    if (station && !station.drink && station.recipeId === 'matcha') {
      station.placeGlass();
    }
    this.render(this.scene.visualTime || 0);
  }

  render(time = 0) {
    if (!this.root.visible) return;
    const dt = this.lastTime !== null && time >= this.lastTime ? Math.min(0.1, (time - this.lastTime) / 1000) : 1 / 60;
    this.lastTime = time;

    const drink = this.activeDrink();
    const cupAmounts = drink?.getAmounts() || {};
    const targets = this.activeTargets();
    const inv = this.scene.session.inventory;

    const matchaStockG = this.scene.tutorial ? 28 : Math.round(inv.matcha || 0);
    const milkStockMl = this.scene.tutorial ? 300 : Math.round((inv.milk || 0) * 50);
    const syrupStockMl = this.scene.tutorial ? 90 : Math.round(inv.syrup || 0);
    const iceStockCubes = this.scene.tutorial ? 36 : inventoryUsablePortions(inv, 'ice');

    const bowlMatcha = this.state.amounts.matcha || 0;
    const bowlWater = this.state.amounts.water || 0;
    const bowlWhisk = this.state.whiskProgress || 0;
    const cupMatcha = cupAmounts.matcha || 0;
    const cupMilk = cupAmounts.milk || 0;
    const cupSyrup = cupAmounts.syrup || 0;
    const cupIce = Math.round(cupAmounts.ice || 0);

    const effMatcha = Math.round(bowlMatcha + cupMatcha);
    const effWater = bowlWater + (cupAmounts.water || 0);
    const effWhisk = cupMatcha > 0 ? (drink?.preparation.matchaWhiskProgress || bowlWhisk) : bowlWhisk;
    const stage = matchaWhiskStage(effWhisk);

    let statusText = `B1: MÚC MATCHA VÀO BÁT (${effMatcha}/${targets.matcha}g · ${targets.matchaScoops} muỗng)`;
    if (effMatcha >= targets.matcha && effWater < targets.water * 0.8) {
      statusText = `B2: RÓT NƯỚC ẤM VÀO BÁT (${effWater.toFixed(0)}/${targets.water}ml)`;
    } else if (effWater >= targets.water * 0.8 && effWhisk < 0.92 && cupMatcha <= 0) {
      statusText = `B3: ĐÁNH CHỔI TRE CHỮ W (${stage.label.toUpperCase()})`;
    } else if (cupIce < targets.ice) {
      statusText = `B4A: XÚC ĐÁ VÀO LY (${cupIce * 30}/${targets.iceGrams}g)`;
    } else if (cupMilk < targets.milk * 0.85) {
      statusText = `B4B: RÓT SỮA TƯƠI VÀO LY (${cupMilk.toFixed(0)}/${targets.milk}ml)`;
    } else if (targets.syrup > 0 && cupSyrup < targets.syrup * 0.75) {
      statusText = `B4C: RÓT SIRO ĐƯỜNG (${cupSyrup.toFixed(0)}/${targets.syrup}ml)`;
    } else if (cupMatcha < targets.matcha * 0.8) {
      statusText = 'B5: NGHIÊNG BÁT RÓT MATCHA LÊN MẶT SỮA';
    } else {
      statusText = 'HOÀN TẤT · KÉO LY MATCHA LATTE ĐẾN KHÁCH!';
    }
    this.setText('chip', this.chip, statusText);
    this.setText('stageLabel', this.stageLabel, `${stage.label} (${Math.round(effWhisk * 100)}%)`, stage.id === 'MICROFOAM' ? '#b8f7a0' : '#ffe7be');

    this.setText(
      'stockLine',
      this.stockLine,
      this.scene.tutorial
        ? 'Kho hướng dẫn: Đầy đủ bột matcha, sữa tươi, siro, đá'
        : `Kho: Matcha ${matchaStockG}g · S.Tươi ${milkStockMl}ml · Siro ${syrupStockMl}ml · Đá ${iceStockCubes}v`
    );
    this.setText(
      'priceLine',
      this.priceLine,
      `Giá nhập: Hộp matcha ${INGREDIENTS.matcha.price / 1000}k/40g · Sữa tươi ${INGREDIENTS.milk.price / 1000}k · Siro ${INGREDIENTS.syrup.price / 1000}k`
    );

    const warnings = this.scene.tutorial ? [] : matchaStockWarnings(inv, drink?.modifiers);
    const modLabel = formatMatchaModifierLabel(drink?.modifiers);
    const warnStr = warnings.length
      ? `⚠ Cảnh báo: ${warnings.join(' · ')}`
      : modLabel
        ? `Đơn khách dặn: ${modLabel}`
        : 'Đơn chuẩn: 4g matcha · 40ml nước ấm · 150ml sữa tươi · 10ml siro';
    this.setText('warnLine', this.warnLine, warnStr, warnings.length ? '#ff9e80' : '#cfe5be');

    const tileStates = {
      matcha: {
        tone: effMatcha >= targets.matcha ? 'done' : matchaStockG < MATCHA_SCOOP_GRAMS ? 'warn' : 'active',
        badge: `${effMatcha}/${targets.matcha}g`,
        stock: this.scene.tutorial ? '' : `${matchaStockG}g`,
      },
      water: {
        tone: effWater >= targets.water * 0.85 ? 'done' : effMatcha >= targets.matcha ? 'active' : 'idle',
        badge: `${effWater.toFixed(0)}/${targets.water}ml`,
        stock: 'Ấm',
      },
      whisk: {
        tone: effWhisk >= 0.92 ? 'done' : effWater >= targets.water * 0.8 ? 'active' : 'idle',
        badge: stage.label,
        stock: `${Math.round(effWhisk * 100)}%`,
      },
      ice: {
        tone: cupIce >= targets.ice ? 'done' : iceStockCubes < targets.ice ? 'warn' : 'active',
        badge: `${cupIce * 30}/${targets.iceGrams}g`,
        stock: this.scene.tutorial ? '' : `${iceStockCubes}v`,
      },
      milk: {
        tone: cupMilk >= targets.milk * 0.85 ? 'done' : milkStockMl < targets.milk ? 'warn' : cupIce >= targets.ice ? 'active' : 'idle',
        badge: `${cupMilk.toFixed(0)}/${targets.milk}ml`,
        stock: this.scene.tutorial ? '' : `${milkStockMl}ml`,
      },
      syrup: {
        tone: targets.syrup <= 0 ? (cupSyrup <= 1 ? 'done' : 'warn') : cupSyrup >= targets.syrup * 0.8 ? 'done' : syrupStockMl < targets.syrup ? 'warn' : cupMilk >= targets.milk * 0.85 ? 'active' : 'idle',
        badge: targets.syrup <= 0 ? '0ml' : `${cupSyrup.toFixed(0)}/${targets.syrup}ml`,
        stock: this.scene.tutorial ? '' : `${syrupStockMl}ml`,
      },
    };

    for (const tile of this.tiles) {
      const st = tileStates[tile.key] || { tone: 'idle', badge: '', stock: '' };
      const [, textColor] = TONE[st.tone];
      this.setText(`badge-${tile.key}`, tile.badge, st.badge, textColor);
      this.setText(`stock-${tile.key}`, tile.stock, st.stock, st.tone === 'warn' ? '#ffb39c' : '#fff4d5');
    }

    this.drawPanel(tileStates);
    this.drawTin(matchaStockG);
    this.drawBowl(time, bowlMatcha, bowlWater, bowlWhisk);
    this.drawWhiskGauge(effWhisk, effWater > 0);
    this.drawParticles(dt);
  }

  drawPanel(tileStates) {
    const p = this.panel;
    p.clear();
    round(p, PANEL.x, PANEL.y + 3, PANEL.w, PANEL.h, 0x122f29, 12, 0.3);
    round(p, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x365448, 12);
    p.lineStyle(1.5, 0x7cb368, 0.45);
    p.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);
    round(p, 12, 678, 166, 13, 0x263f34, 6);

    for (const tile of this.tiles) {
      const st = tileStates[tile.key] || { tone: 'idle' };
      const [fill] = TONE[st.tone];
      round(p, tile.x - 23, 676, 46, 114, 0x1b332b, 9, 0.55);
      round(p, tile.x - 22, 677, 44, 112, 0x2f4b3f, 8);
      round(p, tile.x - 20, 767, 40, 18, fill, 6);
    }
  }

  drawTin(matchaStockG) {
    const g = this.tinArt;
    g.clear();
    const x = TIN_POS.x, y = TIN_POS.y;
    g.item('matcha-tin', x, y + 1, 34, 36);
    if (matchaStockG > 0) {
      const ratio = Math.min(1, matchaStockG / 40);
      g.fillStyle(0x5ca43f, 0.96);
      g.fillEllipse(x, y - 12, 22 * (0.45 + 0.55 * ratio), 5.5);
      g.fillStyle(0x88dc5e, 0.9);
      g.fillEllipse(x - 1, y - 12.5, 14 * (0.45 + 0.55 * ratio), 3.6);
    }
  }

  drawBowl(time, matchaG, waterMl, whiskProgress) {
    const g = this.bowlBody;
    g.clear();
    const reduced = this.scene.game.save?.data.settings.reducedMotion;
    const motion = reduced ? 0 : time;
    g.item('mixing-bowl', 0, 2, 64, 36);

    // Dry vibrant green powder mound before water is added
    if (matchaG > 0 && waterMl <= 0.5) {
      const moundR = Math.min(18, 7 + matchaG * 2);
      g.fillStyle(0x46852f, 0.95);
      g.fillEllipse(0, -5, moundR * 1.6, moundR * 0.65);
      g.fillStyle(0x74c94f, 0.92);
      g.fillEllipse(-1, -6, moundR * 1.15, moundR * 0.45);
      for (let i = 0; i < 6; i++) {
        const dx = -10 + (i * 4.2);
        const dy = -4 - (i % 3) * 1.5;
        g.fillStyle(i % 2 ? 0x93e66c : 0x3b7026, 0.9);
        g.fillCircle(dx, dy, 1.1);
      }
      return;
    }

    // Wet matcha + water in bowl
    if (waterMl > 0.5 || matchaG > 0) {
      const fillRatio = Math.min(1, (waterMl + matchaG * 2) / 52);
      const w = 48 * (0.65 + 0.35 * fillRatio);
      const h = 15 * (0.65 + 0.35 * fillRatio);
      const baseColor = whiskProgress >= 0.92 ? 0x62b846 : whiskProgress >= 0.62 ? 0x529e39 : 0x3f7d2b;
      g.fillStyle(baseColor, 0.96);
      g.fillEllipse(0, -6, w, h);

      // Green vortex and surface ripples while whisking or after whisking
      if (whiskProgress > 0.05) {
        const swirl = Math.sin(motion / 180) * 2.2;
        g.lineStyle(1.2, 0x9ce876, 0.55 + whiskProgress * 0.3);
        g.strokeEllipse(swirl * 0.6, -6, w * 0.68, h * 0.58);
        g.lineStyle(1, 0xcdf7b0, 0.45 + whiskProgress * 0.35);
        g.strokeEllipse(-swirl * 0.4, -6, w * 0.38, h * 0.34);
      }

      // Clumps shrink and disappear as W-whisking progresses
      if (matchaG > 0 && whiskProgress < 0.92) {
        const clumpFactor = 1 - whiskProgress;
        const clumpCount = Math.max(1, Math.ceil(clumpFactor * 6));
        for (let i = 0; i < clumpCount; i++) {
          const ang = (motion / 260) + i * 1.1;
          const rx = Math.cos(ang) * (4 + (i % 3) * 4) * clumpFactor;
          const ry = -6 + Math.sin(ang) * 3 * clumpFactor;
          const cr = (1.1 + (i % 2) * 0.7) * (0.45 + clumpFactor * 0.7);
          g.fillStyle(0x254d18, 0.92);
          g.fillCircle(rx, ry, cr);
          g.fillStyle(0x7cd456, 0.85);
          g.fillCircle(rx - 0.4, ry - 0.4, cr * 0.5);
        }
      }

      // Fine emerald microfoam bubbles
      if (whiskProgress >= 0.25) {
        const bubbleCount = Math.min(12, Math.floor(whiskProgress * 12));
        for (let i = 0; i < bubbleCount; i++) {
          const bx = -14 + (i * 2.5) + Math.sin(motion / 300 + i) * 1.1;
          const by = -6 + ((i % 3) - 1) * 2.2;
          g.fillStyle(whiskProgress >= 0.92 ? 0xd9f9c4 : 0xa7eb84, 0.78);
          g.fillCircle(bx, by, whiskProgress >= 0.92 ? 1.1 : 1.4);
        }
      }
    }
  }

  drawWhiskGauge(progress, hasLiquid) {
    const g = this.stageArt;
    g.clear();
    const gx = 68, gy = 748, gw = 108, gh = 7;
    round(g, gx, gy, gw, gh, 0x1c3128, 3.5);
    const colors = [0x4c7a3b, 0x619949, 0x76b858, 0x95e06c];
    const thresholds = [0, 0.25, 0.62, 0.92, 1];
    for (let i = 0; i < 4; i++) {
      const x0 = gx + gw * thresholds[i];
      const w = gw * (thresholds[i + 1] - thresholds[i]) - 1;
      const active = progress > thresholds[i];
      const segRatio = Math.max(0, Math.min(1, (progress - thresholds[i]) / (thresholds[i + 1] - thresholds[i])));
      round(g, x0, gy + 1, Math.max(2, w), gh - 2, 0x263f34, 2);
      if (active && hasLiquid) {
        round(g, x0, gy + 1, Math.max(2, w * segRatio), gh - 2, colors[i], 2);
      }
    }
  }

  drawParticles(dt) {
    const g = this.fxArt;
    g.clear();
    this.powderParticles = this.powderParticles.filter(p => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 46 * dt;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      g.fillStyle(p.color, alpha * 0.88);
      g.fillCircle(p.x, p.y, p.r);
      return true;
    });

    this.fallingPowder = this.fallingPowder.filter(f => {
      f.life += dt;
      if (f.life >= f.duration) return false;
      const t = f.life / f.duration;
      const cy = f.startY + (f.endY - f.startY) * (t * t);
      g.fillStyle(0x6ac449, 0.9 * (1 - t * 0.35));
      g.fillCircle(f.x, cy, 2.1);
      g.fillStyle(0x9ce876, 0.65 * (1 - t * 0.4));
      g.fillCircle(f.x + 1.2, cy - 3.5, 1.3);
      return true;
    });
  }

  destroy() {
    while (this.removers.length) this.removers.pop()();
    this.root.destroy();
  }
}
