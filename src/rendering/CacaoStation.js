import { itemSurface } from './ItemSurface.js';
import {
  CACAO_SCOOP_GRAMS,
  CACAO_WATER_TARGET,
  CACAO_STIR_STAGES,
  cacaoDissolveStage,
  cacaoTargets,
  formatCacaoModifierLabel,
} from '../models/CacaoPrep.js';
import { INGREDIENTS, usablePortions as inventoryUsablePortions } from '../logic/inventory.js';
import { ICE_GRAMS_PER_CUBE } from '../models/KumquatPrep.js';
import { toolArt, label, round, line } from './art.js';

const PANEL = { x: 6, y: 674, w: 178, h: 120 };
const CAN_POS = { x: 42, y: 726 };
const TONE = {
  done: [0x3f6a45, '#d6f0bb'],
  active: [0x7a5a2c, '#ffe2a6'],
  warn: [0x6e3f31, '#ffc3a8'],
  idle: [0x2b4438, '#a9bba0'],
};

export class CacaoStation {
  constructor(scene) {
    this.scene = scene;
    this.removers = [];
    this.tiles = [];
    this.cache = new Map();
    this.powderParticles = [];
    this.fallingPowder = [];
    this.lastTime = null;
    this.state = { id: 'cacao-prep', amounts: {}, steps: {} };
    const engine = scene.drinkEngine;

    this.root = scene.add.container(0, 0).setDepth(45).setVisible(false);
    this.panel = scene.add.graphics();
    this.canArt = itemSurface(scene);
    this.stageArt = scene.add.graphics();
    this.fxArt = scene.add.graphics();
    this.root.add([this.panel, this.canArt, this.stageArt, this.fxArt]);

    this.chip = label(scene, 95, 683, '', 8.2, '#fff4de', { fontStyle: 'bold' });
    this.stageLabel = label(scene, 128, 703, '', 7.6, '#ffe7be', { fontStyle: 'bold' });
    this.stockLine = label(scene, 95, 761, '', 7, '#e9e4c7');
    this.priceLine = label(scene, 95, 772, '', 6.6, '#b9ccb9');
    this.warnLine = label(scene, 95, 784, '', 7, '#ffd2bd', { fontStyle: 'bold' });
    this.root.add([this.chip, this.stageLabel, this.stockLine, this.priceLine, this.warnLine]);

    const cupOnly = t => t.recipeId?.() === 'cacao';
    const stock = id => scene.tutorial ? Infinity : scene.session.inventory[id] || 0;

    this.removers.push(engine.registerTarget('cacao-can', {
      accepts: [],
      radius: 34,
      visible: () => this.root.visible && this.root.active,
      contains: (x, y) => Math.abs(x - CAN_POS.x) <= 34 && Math.abs(y - CAN_POS.y) <= 32,
      center: () => ({ x: CAN_POS.x, y: CAN_POS.y, radius: 24 }),
      getState: () => this.state,
      render: (_, time) => this.render(time),
    }));

    const addTool = (key, id, kind, x, name, options) => {
      const art = toolArt(scene, kind, x, 715).setScale(0.6);
      const tile = {
        key, x, art,
        name: label(scene, x, 752, name, 8, '#e9e4c7', { fontStyle: 'bold' }),
        badge: label(scene, x, 777, '', 7.2, '#fff4de', { fontStyle: 'bold' }),
        stock: label(scene, x + 20, 684, '', 7, '#fff4d5', { fontStyle: 'bold' }).setOrigin(1, 0.5),
      };
      this.tiles.push(tile);
      this.root.add([tile.name, tile.badge, tile.stock, art]);
      this.removers.push(engine.registerTool(id, art, { hitSize: 42, ...options }));
      return art;
    };

    // Step 1 — Scoop cocoa powder (5g per measuring spoon)
    addTool('cacao', 'cacao-powder-spoon', 'cacao', 210, 'Múc cacao', {
      action: 'garnish',
      stepId: 'cacao',
      canTarget: cupOnly,
      blocked: () => stock('cacao') + 1e-9 < CACAO_SCOOP_GRAMS ? 'Thiếu nguyên liệu: Hết bột cacao! Hãy mua thêm ở cửa hàng.' : null,
      onPickup: () => {
        if (!scene.session.scoopCacaoFromCan(CACAO_SCOOP_GRAMS)) {
          scene.toast('Thiếu nguyên liệu: Hết bột cacao!');
          return false;
        }
        this.spawnDustBurst(CAN_POS.x, CAN_POS.y - 10, 6);
        return true;
      },
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const grams = Math.round(state.amounts.cacao || 0);
        return `Bột cacao ${grams}/${targets.cacao} g (${targets.cacaoLabel}) · thả muỗng đong vào ly (+${CACAO_SCOOP_GRAMS} g)`;
      },
      release: ({ target, canceled, matched }) => {
        if (canceled || !matched || target?.recipeId?.() !== 'cacao') {
          const refunded = scene.session.cancelCacaoScoop();
          if (refunded > 0) scene.toast('Đã trả bột cacao về hộp (không trừ kho).');
          return;
        }
        const station = scene.stations.find(s => s.model.id === target.id);
        const drink = station?.model.drink;
        if (!drink) {
          scene.session.cancelCacaoScoop();
          return;
        }
        const accepted = scene.session.scoopCacaoIntoGlass(drink, CACAO_SCOOP_GRAMS);
        if (accepted > 0) {
          scene.game.audio.play('scoop');
          this.spawnFallingPowder(station.x, station.y - 34, station.y + 12);
          this.spawnDustBurst(station.x, station.y - 10, 9);
        } else {
          scene.session.cancelCacaoScoop();
        }
      },
    });

    // Step 2 — Add hot water to wet cocoa powder
    addTool('water', 'cacao-hot-kettle', 'kettle', 262, 'Nước nóng', {
      action: 'pour',
      ingredient: 'water',
      stepId: 'water',
      rate: 16,
      spout: { x: -24, y: -12 },
      pourOffset: { x: 22, y: -62 },
      canTarget: cupOnly,
      hint: state => `Nước nóng ${(state.amounts.water || 0).toFixed(0)}/${CACAO_WATER_TARGET} ml · nghiêng ấm rót làm ướt bột cacao`,
      onPour: () => scene.game.audio.play('pour'),
    });

    // Step 3 — Stir circularly to dissolve cocoa clumps
    addTool('stir', 'cacao-stir-spoon', 'stir', 314, 'Khuấy tan', {
      action: 'stir',
      stepId: 'stir',
      canTarget: cupOnly,
      blocked: () => {
        const d = this.activeDrink();
        if (!d) return null;
        if ((d.getAmounts().cacao || 0) <= 0) return 'Hãy múc bột cacao vào ly trước khi khuấy!';
        if ((d.getAmounts().water || 0) <= 0) return 'Hãy rót 30 ml nước nóng làm ướt bột cacao trước khi khuấy!';
        return null;
      },
      hint: state => {
        const stage = cacaoDissolveStage(state.cacaoDissolveProgress || 0);
        const pct = Math.min(100, Math.round((state.cacaoDissolveProgress || 0) * 100));
        return `Khuấy vòng tròn hòa tan cacao: ${stage.label} (${pct}%)`;
      },
    });

    // Step 4a — Pour condensed milk
    addTool('condensed', 'cacao-condensed-can', 'condensed', 366, 'Sữa đặc', {
      action: 'pour',
      ingredient: 'condensed',
      stepId: 'condensed',
      rate: 8,
      spout: { x: -12, y: -18 },
      pourOffset: { x: 16, y: -62 },
      canTarget: cupOnly,
      blocked: () => stock('condensed') * 15 < 0.5 ? 'Thiếu nguyên liệu: Hết sữa đặc! Hãy mua thêm ở cửa hàng.' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const ml = state.amounts.condensed || 0;
        const [minC, maxC] = targets.condensedRange;
        return `Sữa đặc ${ml.toFixed(0)}/${targets.condensed} ml (vùng chuẩn ${minC}–${maxC} ml · ${targets.condensedLabel})`;
      },
      onPour: () => scene.game.audio.play('condensed'),
    });

    // Step 4b — Pour fresh milk
    addTool('milk', 'cacao-fresh-milk', 'milk', 416, 'Sữa tươi', {
      action: 'pour',
      ingredient: 'milk',
      stepId: 'milk',
      rate: 38,
      spout: { x: -18, y: -16 },
      pourOffset: { x: 20, y: -64 },
      canTarget: cupOnly,
      blocked: () => stock('milk') * 50 < 1 ? 'Thiếu nguyên liệu: Hết sữa tươi! Hãy mua thêm ở cửa hàng.' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const ml = state.amounts.milk || 0;
        const [minM, maxM] = targets.milkRange;
        return `Sữa tươi ${ml.toFixed(0)}/${targets.milk} ml (vùng chuẩn ${minM}–${maxM} ml · ${targets.milkLabel})`;
      },
      onPour: () => scene.game.audio.play('pour'),
    });

    // Step 5 — Add ice cubes
    addTool('ice', 'cacao-ice-scoop', 'scoop', 462, 'Xúc đá', {
      action: 'iceScoopCup',
      stepId: 'ice',
      canTarget: cupOnly,
      blocked: () => stock('ice') * 3 < 1 ? 'Thiếu nguyên liệu: Hết đá viên! Hãy mua thêm ở cửa hàng.' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const grams = Math.round((state.amounts.ice || 0) * ICE_GRAMS_PER_CUBE);
        return `Đá ${grams}/${targets.iceGrams} g (${targets.iceLabel}) · thả muỗng đá vào ly (+30 g/lần)`;
      },
      release: ({ target, canceled, matched }) => {
        if (canceled || !matched || target?.recipeId?.() !== 'cacao') return;
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
  }

  activeDrink() {
    const d = this.scene.stations[this.scene.selectedStation]?.model.drink;
    return d?.recipeId === 'cacao' && !d.consumed ? d : null;
  }

  activeTargets(target = null) {
    const station = target ? this.scene.stations.find(s => s.model.id === target.id) : this.scene.stations[this.scene.selectedStation];
    const waitingCustomer = this.scene.session?.customers.find(c => !c.resolved && c.recipeId === 'cacao');
    const mod = station?.model.modifiers || station?.model.drink?.modifiers || waitingCustomer?.modifiers || null;
    return cacaoTargets(mod);
  }

  spawnDustBurst(x, y, count = 6) {
    if (this.scene.game.save?.data.settings.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      this.powderParticles.push({
        x: x + (i - (count - 1) / 2) * 4,
        y,
        vx: (i - (count - 1) / 2) * 16 + Math.sin(i * 2.1) * 10,
        vy: -18 - (i % 3) * 12,
        life: 0,
        maxLife: 0.42 + (i % 3) * 0.08,
        r: 1.8 + (i % 2) * 0.8,
        color: i % 2 === 0 ? 0x7b472b : 0x56301c,
      });
    }
  }

  spawnFallingPowder(x, startY, endY) {
    if (this.scene.game.save?.data.settings.reducedMotion) return;
    for (let i = 0; i < 5; i++) {
      this.fallingPowder.push({
        x: x + (i - 2) * 3,
        y: startY - i * 3,
        startY: startY - i * 3,
        endY,
        life: 0,
        duration: 0.28 + i * 0.03,
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
    if (!visible) return;
    const station = this.scene.stations[this.scene.selectedStation]?.model;
    const waitingCustomer = this.scene.session?.customers.find(c => !c.resolved && c.recipeId === 'cacao');
    if (station && station.recipeId !== 'cacao' && !station.drink) {
      station.chooseRecipe('cacao', waitingCustomer?.modifiers || null);
    }
    if (station && !station.drink && station.recipeId === 'cacao') {
      station.placeGlass();
    }
    this.render(this.scene.visualTime || 0);
  }

  render(time = 0) {
    if (!this.root.visible) return;
    const dt = this.lastTime !== null && time >= this.lastTime ? Math.min(0.1, (time - this.lastTime) / 1000) : 1 / 60;
    this.lastTime = time;

    const drink = this.activeDrink();
    const amounts = drink?.getAmounts() || {};
    const targets = this.activeTargets();
    const inv = this.scene.session.inventory;

    const cacaoGrams = this.scene.tutorial ? 90 : Math.round(inv.cacao || 0);
    const condensedMl = this.scene.tutorial ? 90 : Math.round((inv.condensed || 0) * 15);
    const milkMl = this.scene.tutorial ? 300 : Math.round((inv.milk || 0) * 50);
    const iceCubes = this.scene.tutorial ? 36 : inventoryUsablePortions(inv, 'ice');

    const cacaoInCup = Math.round(amounts.cacao || 0);
    const waterInCup = amounts.water || 0;
    const condensedInCup = amounts.condensed || 0;
    const milkInCup = amounts.milk || 0;
    const iceInCup = Math.round(amounts.ice || 0);
    const dissolveProgress = drink?.preparation.cacaoDissolveProgress || 0;
    const stage = cacaoDissolveStage(dissolveProgress);

    let statusText = `BƯỚC 1: MÚC BỘT CACAO (${cacaoInCup}/${targets.cacao}g · ${targets.cacaoScoops} muỗng)`;
    if (cacaoInCup >= targets.cacao && waterInCup < targets.water * 0.8) {
      statusText = `BƯỚC 2: RÓT NƯỚC NÓNG (${waterInCup.toFixed(0)}/${targets.water}ml)`;
    } else if (waterInCup >= targets.water * 0.8 && dissolveProgress < 0.92) {
      statusText = `BƯỚC 3: KHUẤY TAN CACAO (${stage.label.toUpperCase()})`;
    } else if (dissolveProgress >= 0.92 && condensedInCup < targets.condensed * 0.8) {
      statusText = `BƯỚC 4A: RÓT SỮA ĐẶC (${condensedInCup.toFixed(0)}/${targets.condensed}ml)`;
    } else if (condensedInCup >= targets.condensed * 0.8 && milkInCup < targets.milk * 0.85) {
      statusText = `BƯỚC 4B: RÓT SỮA TƯƠI (${milkInCup.toFixed(0)}/${targets.milk}ml)`;
    } else if (milkInCup >= targets.milk * 0.85 && iceInCup < targets.ice) {
      statusText = `BƯỚC 5: XÚC ĐÁ (${iceInCup * 30}/${targets.iceGrams}g)`;
    } else if (iceInCup >= targets.ice) {
      statusText = 'HOÀN TẤT · KÉO LY CACAO SỮA ĐÁ ĐẾN KHÁCH!';
    }
    this.setText('chip', this.chip, statusText);
    this.setText('stageLabel', this.stageLabel, `${stage.label} (${Math.round(dissolveProgress * 100)}%)`, stage.id === 'DISSOLVED' ? '#c8f5b8' : '#ffe7be');

    this.setText(
      'stockLine',
      this.stockLine,
      this.scene.tutorial
        ? 'Kho hướng dẫn: Đầy đủ bột cacao, sữa đặc, sữa tươi, đá'
        : `Kho: Cacao ${cacaoGrams}g · S.Đặc ${condensedMl}ml · S.Tươi ${milkMl}ml · Đá ${iceCubes}v`
    );
    this.setText(
      'priceLine',
      this.priceLine,
      `Giá nhập: Hộp cacao ${INGREDIENTS.cacao.price / 1000}k/120g · Sữa đặc ${INGREDIENTS.condensed.price / 1000}k · Sữa tươi ${INGREDIENTS.milk.price / 1000}k`
    );

    const lowItems = [];
    if (!this.scene.tutorial) {
      if (cacaoGrams < targets.cacao) lowItems.push('HẾT BỘT CACAO');
      else if (cacaoGrams <= 30) lowItems.push('Sắp hết cacao');
      if (condensedMl < targets.condensed) lowItems.push('HẾT SỮA ĐẶC');
      if (milkMl < targets.milk) lowItems.push('HẾT SỮA TƯƠI');
      if (iceCubes < targets.ice) lowItems.push('HẾT ĐÁ');
    }
    const modLabel = formatCacaoModifierLabel(drink?.modifiers);
    const warnStr = lowItems.length
      ? `⚠ Cảnh báo kho: ${lowItems.join(' · ')}`
      : modLabel
        ? `Đơn khách dặn: ${modLabel}`
        : 'Đơn chuẩn: 15g cacao · 30ml nước nóng · 15ml sữa đặc · 100ml sữa tươi';
    this.setText('warnLine', this.warnLine, warnStr, lowItems.length ? '#ff9e80' : '#cfe5be');

    const tileStates = {
      cacao: {
        tone: cacaoInCup >= targets.cacao ? 'done' : cacaoGrams < CACAO_SCOOP_GRAMS ? 'warn' : 'active',
        badge: `${cacaoInCup}/${targets.cacao}g`,
        stock: this.scene.tutorial ? '' : `${cacaoGrams}g`,
      },
      water: {
        tone: waterInCup >= targets.water * 0.85 ? 'done' : cacaoInCup > 0 ? 'active' : 'idle',
        badge: `${waterInCup.toFixed(0)}/${targets.water}ml`,
        stock: 'Ấm',
      },
      stir: {
        tone: dissolveProgress >= 0.92 ? 'done' : waterInCup > 0 && cacaoInCup > 0 ? 'active' : 'idle',
        badge: stage.short,
        stock: `${Math.round(dissolveProgress * 100)}%`,
      },
      condensed: {
        tone: condensedInCup >= targets.condensed * 0.8 ? 'done' : condensedMl < targets.condensed ? 'warn' : dissolveProgress >= 0.65 ? 'active' : 'idle',
        badge: `${condensedInCup.toFixed(0)}/${targets.condensed}ml`,
        stock: this.scene.tutorial ? '' : `${condensedMl}ml`,
      },
      milk: {
        tone: milkInCup >= targets.milk * 0.85 ? 'done' : milkMl < targets.milk ? 'warn' : condensedInCup > 0 ? 'active' : 'idle',
        badge: `${milkInCup.toFixed(0)}/${targets.milk}ml`,
        stock: this.scene.tutorial ? '' : `${milkMl}ml`,
      },
      ice: {
        tone: iceInCup >= targets.ice ? 'done' : iceCubes < 1 ? 'warn' : milkInCup > 0 ? 'active' : 'idle',
        badge: `${iceInCup * 30}/${targets.iceGrams}g`,
        stock: this.scene.tutorial ? '' : `${iceCubes}v`,
      },
    };

    const g = this.panel;
    g.clear();
    round(g, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x2d4438, 10);
    g.lineStyle(1.4, 0x97a67e, 0.55);
    g.strokeRoundedRect(PANEL.x + 1, PANEL.y + 1, PANEL.w - 2, PANEL.h - 2, 10);
    round(g, PANEL.x + 6, PANEL.y + 3, PANEL.w - 12, 14, 0x203329, 5);

    for (const tile of this.tiles) {
      const st = tileStates[tile.key] || { tone: 'idle', badge: '', stock: '' };
      const [badgeFill, badgeColor] = TONE[st.tone];
      const w = 48;
      round(g, tile.x - w / 2, 678, w, 86, st.tone === 'active' ? 0x526e56 : 0x425c48, 8);
      if (st.tone === 'active') {
        g.lineStyle(1.5, 0xe8b46b, 0.9);
        g.strokeRoundedRect(tile.x - w / 2, 678, w, 86, 8);
      }
      round(g, tile.x - w / 2 + 2, 768, w - 4, 18, badgeFill, 5);
      this.setText(`badge-${tile.key}`, tile.badge, st.badge, badgeColor);
      this.setText(`stock-${tile.key}`, tile.stock, st.stock);
      if (st.stock) {
        round(g, tile.x + 2, 678, 22, 12, st.tone === 'warn' ? 0x7b3326 : 0x25392f, 4);
      }
    }

    this.drawCocoaContainer(cacaoGrams);
    this.drawDissolveMeter(dissolveProgress, cacaoInCup, waterInCup);
    this.updateEffects(dt);
  }

  drawCocoaContainer(cacaoGrams) {
    const g = this.canArt;
    g.clear();
    const { x, y } = CAN_POS;
    g.item('cacao-tin', x, y + 1, 52, 48);
    const fillRatio = Math.min(1, cacaoGrams / 90);
    if (fillRatio > 0.02) {
      const moundW = 14 + fillRatio * 26;
      const moundH = 4 + fillRatio * 6;
      g.fillStyle(0x5b321d, 0.96);
      g.fillEllipse(x, y - 16, moundW, moundH * 0.6);
      g.fillStyle(0x834c2f, 0.85);
      g.fillEllipse(x - 2, y - 17, moundW * 0.65, moundH * 0.4);
    }
    if (this.scene.session.heldCacaoGrams > 0) {
      g.lineStyle(2, 0xe8b46b, 0.95);
      g.strokeCircle(x, y - 18, 22);
    }
  }

  drawDissolveMeter(progress, cacaoInCup, waterInCup) {
    const g = this.stageArt;
    g.clear();
    const x = 78;
    const y = 714;
    const w = 98;
    const h = 34;
    round(g, x, y, w, h, 0x203329, 6);
    g.lineStyle(1, 0x5c7c67, 0.7);
    g.strokeRoundedRect(x, y, w, h, 6);

    // 4 stage segments: Vón cục -> Đang tan -> Sánh mịn -> Tan hoàn toàn
    const segW = (w - 14) / 4;
    const colors = [0x8c4a27, 0xb87638, 0xd9a452, 0x4fa361];
    const thresholds = [0, 0.25, 0.65, 0.92];
    for (let i = 0; i < 4; i++) {
      const sx = x + 5 + i * (segW + 1.3);
      const active = progress >= thresholds[i] && (cacaoInCup > 0 || progress > 0);
      round(g, sx, y + 5, segW, 8, active ? colors[i] : 0x334b3f, 2, active ? 0.95 : 0.6);
    }

    // Visual cocoa texture preview inside the meter (clumps shrinking into smooth glossy chocolate)
    const previewY = y + 23;
    round(g, x + 6, y + 16, w - 12, 13, 0x3a2014, 4);
    if (cacaoInCup > 0) {
      const smoothAlpha = Math.min(1, 0.35 + progress * 0.65);
      round(g, x + 7, y + 17, (w - 14) * Math.max(0.25, progress), 11, 0x5e341e, 3, smoothAlpha);
      if (progress >= 0.65) {
        line(g, [[x + 12, previewY - 2], [x + 12 + (w - 28) * progress, previewY - 2]], 0xffe4b8, 1.5, 0.55);
      }
      const clumpCount = waterInCup > 0 ? Math.max(0, Math.ceil((1 - progress) * 5)) : 4;
      for (let i = 0; i < clumpCount; i++) {
        const cx = x + 16 + i * 16;
        const cr = (1.2 - progress * 0.85) * 3.2;
        if (cr > 0.5) {
          g.fillStyle(0x28140b, 0.92);
          g.fillCircle(cx, previewY, cr);
          g.fillStyle(0x7c472b, 0.75);
          g.fillCircle(cx - 0.8, previewY - 0.8, cr * 0.55);
        }
      }
    }
  }

  updateEffects(dt) {
    const g = this.fxArt;
    g.clear();

    for (let i = this.powderParticles.length - 1; i >= 0; i--) {
      const p = this.powderParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.powderParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 85 * dt;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      g.fillStyle(p.color, alpha * 0.88);
      g.fillCircle(p.x, p.y, p.r);
    }

    for (let i = this.fallingPowder.length - 1; i >= 0; i--) {
      const f = this.fallingPowder[i];
      f.life += dt;
      const t = Math.min(1, f.life / f.duration);
      if (t >= 1) {
        this.fallingPowder.splice(i, 1);
        continue;
      }
      const ease = t * t;
      f.y = f.startY + (f.endY - f.startY) * ease;
      g.fillStyle(0x5b321d, 0.92);
      g.fillCircle(f.x, f.y, 3.2 * (1 - t * 0.3));
      g.fillStyle(0x8c5538, 0.7);
      g.fillCircle(f.x - 1, f.y - 1, 1.6);
    }
  }

  destroy() {
    while (this.removers.length) this.removers.pop()();
    this.root.destroy(true);
  }
}
