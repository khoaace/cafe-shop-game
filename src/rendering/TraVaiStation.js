import { itemSurface } from './ItemSurface.js';
import {
  TRAVAI_TEA_TARGET,
  traVaiTargets,
  formatTraVaiModifierLabel,
} from '../models/TraVaiPrep.js';
import { INGREDIENTS, usablePortions as inventoryUsablePortions } from '../logic/inventory.js';
import { ICE_GRAMS_PER_CUBE } from '../models/KumquatPrep.js';
import { button } from '../ui/widgets.js';
import { toolArt, label, round, line } from './art.js';

const PANEL = { x: 6, y: 674, w: 196, h: 120 };
const CAN_POS = { x: 52, y: 730 };
const TONE = {
  done: [0x3f6a45, '#d6f0bb'],
  active: [0x7a5a2c, '#ffe2a6'],
  warn: [0x6e3f31, '#ffc3a8'],
  idle: [0x2b4438, '#a9bba0'],
};

export class TraVaiStation {
  constructor(scene) {
    this.scene = scene;
    this.removers = [];
    this.tiles = [];
    this.cache = new Map();
    this.droplets = [];
    this.fallingLychees = [];
    this.lastTime = null;
    this.state = { id: 'travai-prep', amounts: {}, steps: {} };
    const engine = scene.drinkEngine;

    this.root = scene.add.container(0, 0).setDepth(45).setVisible(false);
    this.panel = scene.add.graphics();
    this.canArt = itemSurface(scene);
    this.sweetnessArt = scene.add.graphics();
    this.fxArt = itemSurface(scene);
    this.root.add([this.panel, this.canArt, this.sweetnessArt, this.fxArt]);

    this.chip = label(scene, 104, 683, '', 8.5, '#fff4de', { fontStyle: 'bold' });
    this.stockLine = label(scene, 104, 761, '', 7.2, '#e9e4c7');
    this.priceLine = label(scene, 104, 772, '', 6.8, '#b9ccb9');
    this.warnLine = label(scene, 104, 784, '', 7.2, '#ffd2bd', { fontStyle: 'bold' });
    this.root.add([this.chip, this.stockLine, this.priceLine, this.warnLine]);

    this.allocGarnishBtn = button(
      scene,
      145,
      714,
      98,
      20,
      'Ghim vải sẵn (0)',
      () => this.applyOptionalGarnish(true),
      { size: 7.5, fill: 0x3f6854, color: '#f6efd9', radius: 5 }
    );
    this.extraGarnishBtn = button(
      scene,
      145,
      738,
      98,
      20,
      '+1 Vải decor (-1)',
      () => this.applyOptionalGarnish(false),
      { size: 7.5, fill: 0x6b4e35, color: '#f6efd9', radius: 5 }
    );
    this.root.add([this.allocGarnishBtn, this.extraGarnishBtn]);

    const cupOnly = t => t.recipeId?.() === 'travai';
    const stock = id => scene.tutorial ? Infinity : scene.session.inventory[id] || 0;

    this.removers.push(engine.registerTarget('travai-can', {
      accepts: [],
      radius: 36,
      visible: () => this.root.visible && this.root.active,
      contains: (x, y) => Math.abs(x - CAN_POS.x) <= 38 && Math.abs(y - CAN_POS.y) <= 34,
      center: () => ({ x: CAN_POS.x, y: CAN_POS.y, radius: 26 }),
      getState: () => this.state,
      render: (_, time) => this.render(time),
    }));

    const addTool = (key, id, kind, x, name, options) => {
      const art = toolArt(scene, kind, x, 715).setScale(0.64);
      const tile = {
        key, x, art,
        name: label(scene, x, 752, name, 8.5, '#e9e4c7', { fontStyle: 'bold' }),
        badge: label(scene, x, 777, '', 7.5, '#fff4de', { fontStyle: 'bold' }),
        stock: label(scene, x + 22, 684, '', 7.5, '#fff4d5', { fontStyle: 'bold' }).setOrigin(1, 0.5),
      };
      this.tiles.push(tile);
      this.root.add([tile.name, tile.badge, tile.stock, art]);
      this.removers.push(engine.registerTool(id, art, { hitSize: 44, ...options }));
      return art;
    };

    // Step 1 — Scoop lychee from container and release over glass
    addTool('lychee', 'travai-lychee-scoop', 'lychee', 238, 'Múc vải', {
      action: 'garnish',
      stepId: 'lychee',
      canTarget: cupOnly,
      blocked: () => stock('lychee') + 1e-9 < 0.25 ? 'Thiếu nguyên liệu: Hết vải ngâm! Hãy mua thêm ở cửa hàng.' : null,
      onPickup: () => {
        if (!scene.session.scoopLycheeFromCan(1)) {
          scene.toast('Thiếu nguyên liệu: Hết vải ngâm!');
          return false;
        }
        return true;
      },
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const count = Math.round(state.amounts.lychee || 0);
        return `Vải ${count}/${targets.lychee} trái (${targets.lycheeLabel}) · thả muỗng vải vào ly (+1 trái)`;
      },
      release: ({ target, canceled, matched }) => {
        if (canceled || !matched || target?.recipeId?.() !== 'travai') {
          const refunded = scene.session.cancelLycheeScoop();
          if (refunded > 0) scene.toast('Đã trả trái vải về lon (không trừ kho).');
          return;
        }
        const station = scene.stations.find(s => s.model.id === target.id);
        const drink = station?.model.drink;
        if (!drink) {
          scene.session.cancelLycheeScoop();
          return;
        }
        const accepted = scene.session.scoopLycheeIntoGlass(drink, 1);
        if (accepted > 0) {
          scene.game.audio.play('ice');
          this.spawnFallingLychee(station.x, station.y - 34, station.y + 8);
          scene.drinkEngine.effects.splash(station.x, station.y + 2, 0xfdfaf4);
        } else {
          scene.session.cancelLycheeScoop();
        }
      },
    });

    // Step 2 — Add lychee syrup with target sweetness display
    addTool('lycheeSyrup', 'travai-syrup-bottle', 'lycheeSyrup', 298, 'Siro vải', {
      action: 'pour',
      ingredient: 'lycheeSyrup',
      stepId: 'lycheeSyrup',
      rate: 9,
      spout: { x: -6, y: -28 },
      pourOffset: { x: 16, y: -62 },
      canTarget: cupOnly,
      blocked: () => stock('lycheeSyrup') < 0.5 ? 'Thiếu nguyên liệu: Hết siro vải! Hãy mua thêm ở cửa hàng.' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const ml = state.amounts.lycheeSyrup || 0;
        const [minS, maxS] = targets.syrupRange;
        return `Siro vải ${ml.toFixed(0)}/${targets.lycheeSyrup} ml (vùng chuẩn ${minS}–${maxS} ml · ${targets.sweetnessLabel})`;
      },
      onPour: () => scene.game.audio.play('condensed'),
    });

    // Step 3 — Pour prepared tea
    addTool('tea', 'travai-tea-pitcher', 'tea', 358, 'Bình trà', {
      action: 'pour',
      ingredient: 'tea',
      stepId: 'tea',
      rate: 58,
      spout: { x: -20, y: -18 },
      pourOffset: { x: 22, y: -64 },
      canTarget: cupOnly,
      blocked: () => stock('tea') < 1 ? 'Thiếu nguyên liệu: Hết trà ủ sẵn! Hãy mua thêm ở cửa hàng.' : null,
      hint: state => `Trà ${(state.amounts.tea || 0).toFixed(0)}/${TRAVAI_TEA_TARGET} ml · nghiêng bình rót dòng trà vàng nhạt`,
      onPour: () => scene.game.audio.play('pour'),
    });

    // Step 4 — Add ice with scoop
    addTool('ice', 'travai-ice-scoop', 'scoop', 416, 'Xúc đá', {
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
        if (canceled || !matched || target?.recipeId?.() !== 'travai') return;
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

    // Step 5 — Stirring
    addTool('stir', 'travai-stir-spoon', 'stir', 462, 'Khuấy', {
      action: 'stir',
      stepId: 'stir',
      canTarget: cupOnly,
      hint: () => 'Khuấy nhẹ vòng tròn trong ly cho trà vải hòa quyện',
    });
  }

  activeDrink() {
    const d = this.scene.stations[this.scene.selectedStation]?.model.drink;
    return d?.recipeId === 'travai' && !d.consumed ? d : null;
  }

  activeTargets(target = null) {
    const station = target ? this.scene.stations.find(s => s.model.id === target.id) : this.scene.stations[this.scene.selectedStation];
    const waitingCustomer = this.scene.session?.customers.find(c => !c.resolved && c.recipeId === 'travai');
    const mod = station?.model.modifiers || station?.model.drink?.modifiers || waitingCustomer?.modifiers || null;
    return traVaiTargets(mod);
  }

  applyOptionalGarnish(useAllocated = true) {
    if (!this.root.visible || this.scene.paused || this.scene.finishing) return;
    const station = this.scene.stations[this.scene.selectedStation]?.model;
    if (!station) return;
    const waitingCustomer = this.scene.session?.customers.find(c => !c.resolved && c.recipeId === 'travai');
    if (station.recipeId !== 'travai' && !station.drink) {
      station.chooseRecipe('travai', waitingCustomer?.modifiers || null);
    }
    if (!station.drink && station.recipeId === 'travai') station.placeGlass();
    const drink = this.activeDrink();
    if (!drink) {
      this.scene.toast('Hãy đặt ly Trà vải lên trạm trước.');
      return;
    }
    if (drink.preparation.lycheeGarnish) {
      this.scene.toast('Ly này đã có trái vải trang trí trên miệng ly rồi.');
      return;
    }
    if (useAllocated && (drink.getAmounts().lychee || 0) < 1) {
      this.scene.toast('Múc vải vào ly trước khi ghim vải có sẵn lên miệng ly nhé!');
      this.scene.game.audio.play('error');
      return;
    }
    if (!useAllocated && !this.scene.tutorial && inventoryUsablePortions(this.scene.session.inventory, 'lychee') < 1) {
      this.scene.toast('Kho đã hết vải ngâm để gắn thêm trang trí!');
      this.scene.game.audio.play('error');
      return;
    }
    const added = this.scene.session.addLycheeGarnish(drink, useAllocated);
    if (added > 0) {
      const stationView = this.scene.stations[this.scene.selectedStation];
      if (stationView) this.spawnDroplets(stationView.x + 10, stationView.y - 24, 5);
      this.scene.game.audio.play('place');
      this.scene.toast(
        useAllocated
          ? 'Đã ghim 1 trái vải có sẵn trong ly lên miệng ly trang trí (không tốn thêm kho).'
          : 'Đã lấy thêm 1 trái vải từ lon gắn lên miệng ly trang trí (-1 trái vải).'
      );
    }
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

  spawnFallingLychee(x, startY, targetY) {
    if (this.scene.game.save?.data.settings.reducedMotion) return;
    this.fallingLychees.push({
      x,
      y: startY,
      targetY,
      vy: 64,
      angle: -0.25,
      vAngle: 1.5,
      alpha: 1,
      settled: false,
    });
  }

  setVisible(visible) {
    this.root.setVisible(visible);
    this.allocGarnishBtn.input.enabled = visible;
    this.extraGarnishBtn.input.enabled = visible;
    if (!visible) this.scene.session.cancelLycheeScoop();
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
    const reduced = this.scene.game.save.data.settings.reducedMotion;
    const pulse = reduced ? 1 : 0.65 + 0.35 * Math.sin(time / 180);

    for (const drop of this.droplets) {
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.vy += 120 * dt;
      drop.alpha = Math.max(0, drop.alpha - dt * 2.2);
    }
    this.droplets = this.droplets.filter(d => d.alpha > 0.05);

    for (const item of this.fallingLychees) {
      item.y += item.vy * dt;
      item.vy += 170 * dt;
      item.angle += item.vAngle * dt;
      if (item.y >= item.targetY && !item.settled) {
        item.y = item.targetY;
        item.vy = -16;
        item.settled = true;
        this.spawnDroplets(item.x, item.targetY - 6, 4);
      } else if (item.settled) {
        item.alpha = Math.max(0, item.alpha - dt * 3.0);
      }
    }
    this.fallingLychees = this.fallingLychees.filter(p => p.alpha > 0.05);

    const drink = this.activeDrink();
    const amounts = drink?.getAmounts() || {};
    const targets = this.activeTargets();
    const next = this.nextAction(drink, targets);

    this.drawPanel(next, pulse, amounts, targets);
    this.drawCan();
    this.drawSweetnessBar(amounts.lycheeSyrup || 0, targets);
    this.drawEffects();
    this.updateLabels(drink, amounts, targets, next);
  }

  nextAction(drink, targets) {
    const a = drink?.getAmounts() || {};
    if ((a.lychee || 0) < targets.lychee) return 'lychee';
    if ((a.lycheeSyrup || 0) < targets.lycheeSyrup * 0.8) return 'lycheeSyrup';
    if ((a.tea || 0) < targets.tea * 0.8) return 'tea';
    if ((a.ice || 0) < targets.ice) return 'ice';
    return 'done';
  }

  updateLabels(drink, amounts, targets, next) {
    const inv = this.scene.session.inventory;
    const lycheePortions = this.scene.tutorial ? 99 : inventoryUsablePortions(inv, 'lychee');
    const lycheeCans = this.scene.tutorial ? 24 : Math.round((inv.lychee || 0) * 100) / 100;
    const syrupMl = this.scene.tutorial ? 999 : Math.floor(inv.lycheeSyrup || 0);
    const teaMl = this.scene.tutorial ? 999 : Math.floor(inv.tea || 0);
    const iceCubes = this.scene.tutorial ? 99 : Math.floor((inv.ice || 0) * 3 + 1e-9);
    const modLabel = formatTraVaiModifierLabel(drink?.modifiers);

    const chipState = {
      lychee: [`B1 MÚC ${targets.lychee} TRÁI VẢI`, 'active'],
      lycheeSyrup: [`B2 RÓT ${targets.lycheeSyrup} ML SIRO VẢI`, 'active'],
      tea: [`B3 RÓT ${targets.tea} ML TRÀ`, 'active'],
      ice: [`B4 XÚC ${targets.iceGrams}G ĐÁ`, 'active'],
      done: [drink?.preparation?.lycheeGarnish ? 'HOÀN TẤT (+VẢI DECOR)' : 'TRÀ VẢI SẴN SÀNG', 'done'],
    }[next];
    this.text(this.chip, chipState[0], TONE[chipState[1]][1]);

    this.text(
      this.stockLine,
      `Kho: ${lycheePortions} trái vải (${lycheeCans} lon) · Siro ${syrupMl}ml`,
      '#e9e4c7'
    );
    this.text(
      this.priceLine,
      `Giá mua: Vải ${INGREDIENTS.lychee.price.toLocaleString('vi-VN')}đ/2 lon · Siro ${INGREDIENTS.lycheeSyrup.price.toLocaleString('vi-VN')}đ`,
      '#b9ccb9'
    );

    const warnings = [];
    if (!this.scene.tutorial) {
      if (lycheePortions < targets.lychee) warnings.push('HẾT VẢI');
      else if (lycheePortions <= 3) warnings.push(`SẮP HẾT VẢI (${lycheePortions})`);
      if (syrupMl < targets.lycheeSyrup) warnings.push('HẾT SIRO');
      else if (syrupMl <= 35) warnings.push(`SẮP HẾT SIRO (${syrupMl}ml)`);
      if (teaMl < targets.tea) warnings.push('HẾT TRÀ');
      if (iceCubes < targets.ice) warnings.push('HẾT ĐÁ');
    }
    this.text(
      this.warnLine,
      warnings.length ? `⚠ ${warnings.join(' · ')}` : `Chuẩn ngọt: ${targets.lycheeSyrup}ml${modLabel ? ` (${modLabel})` : ''}`,
      warnings.length ? '#ffb399' : '#cfe8c9'
    );

    const tileMeta = {
      lychee: [
        `${Math.round(amounts.lychee || 0)}/${targets.lychee} trái`,
        (amounts.lychee || 0) >= targets.lychee ? 'done' : next === 'lychee' ? 'active' : 'idle',
        this.scene.tutorial ? '' : `${lycheePortions} trái`,
      ],
      lycheeSyrup: [
        `${Math.round(amounts.lycheeSyrup || 0)}/${targets.lycheeSyrup}ml`,
        (amounts.lycheeSyrup || 0) >= targets.lycheeSyrup * 0.85 && (amounts.lycheeSyrup || 0) <= targets.lycheeSyrup * 1.2
          ? 'done'
          : (amounts.lycheeSyrup || 0) > targets.lycheeSyrup * 1.25
            ? 'warn'
            : next === 'lycheeSyrup' ? 'active' : 'idle',
        this.scene.tutorial ? '' : `${syrupMl}ml`,
      ],
      tea: [
        `${Math.round(amounts.tea || 0)}/${targets.tea}ml`,
        (amounts.tea || 0) >= targets.tea * 0.85 ? 'done' : next === 'tea' ? 'active' : 'idle',
        this.scene.tutorial ? '' : `${teaMl}ml`,
      ],
      ice: [
        `${Math.round((amounts.ice || 0) * ICE_GRAMS_PER_CUBE)}/${targets.iceGrams}g`,
        (amounts.ice || 0) >= targets.ice ? 'done' : next === 'ice' ? 'active' : 'idle',
        this.scene.tutorial ? '' : `${iceCubes}v`,
      ],
      stir: [
        drink?.preparation?.lycheeGarnish ? 'Đã decor' : 'Khuấy',
        (drink?.preparation?.mixing || 0) >= 0.35 ? 'done' : 'idle',
        '',
      ],
    };

    for (const tile of this.tiles) {
      const [badgeText, tone, stockText] = tileMeta[tile.key];
      this.text(tile.badge, badgeText, TONE[tone][1]);
      const lowStock = !this.scene.tutorial && (
        (tile.key === 'lychee' && lycheePortions < 2) ||
        (tile.key === 'lycheeSyrup' && syrupMl < 20) ||
        (tile.key === 'tea' && teaMl < TRAVAI_TEA_TARGET) ||
        (tile.key === 'ice' && iceCubes < 3)
      );
      this.text(tile.stock, stockText, lowStock ? '#ffb399' : '#fff4d5');
    }
  }

  drawPanel(next, pulse, amounts, targets) {
    const g = this.panel; g.clear();
    round(g, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x263c33, 10);
    g.lineStyle(1.5, 0x739c88, 0.55);
    g.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 10);

    const chipKey = next === 'done' ? 'done' : 'active';
    round(g, 14, 675, 180, 16, TONE[chipKey][0], 5, 0.92);

    for (const tile of this.tiles) {
      const active = next === tile.key;
      round(g, tile.x - 24, 677, 48, 86, active ? 0x527158 : 0x46604c, 8);
      if (active) {
        g.lineStyle(1.5, 0xffe2a6, 0.5 + pulse * 0.4);
        g.strokeRoundedRect(tile.x - 24, 677, 48, 86, 8);
      }
      const done = (
        (tile.key === 'lychee' && (amounts.lychee || 0) >= targets.lychee) ||
        (tile.key === 'lycheeSyrup' && (amounts.lycheeSyrup || 0) >= targets.lycheeSyrup * 0.85 && (amounts.lycheeSyrup || 0) <= targets.lycheeSyrup * 1.2) ||
        (tile.key === 'tea' && (amounts.tea || 0) >= targets.tea * 0.85) ||
        (tile.key === 'ice' && (amounts.ice || 0) >= targets.ice) ||
        (tile.key === 'stir' && (this.activeDrink()?.preparation?.mixing || 0) >= 0.35)
      );
      const warn = tile.key === 'lycheeSyrup' && (amounts.lycheeSyrup || 0) > targets.lycheeSyrup * 1.25;
      const tone = warn ? 'warn' : done ? 'done' : active ? 'active' : 'idle';
      round(g, tile.x - 23, 769, 46, 16, TONE[tone][0], 4, 0.92);
    }
  }

  drawCan() {
    const g = this.canArt; g.clear();
    const inv = this.scene.session.inventory;
    const lycheeFruits = this.scene.tutorial ? 8 : inventoryUsablePortions(inv, 'lychee');
    g.item('lychee-container', CAN_POS.x, CAN_POS.y - 2, 65, 42);
    const visibleFruits = Math.min(6, lycheeFruits);
    const positions = [
      [-15, 2], [0, 4], [15, 2],
      [-10, -7], [8, -7], [0, -10],
    ];
    for (let i = 0; i < visibleFruits; i++) {
      const [dx, dy] = positions[i];
      const cx = CAN_POS.x + dx;
      const cy = CAN_POS.y + dy;
      g.item('lychee-fruit', cx, cy, 15, 13);
    }
  }

  drawSweetnessBar(currentSyrup, targets) {
    const g = this.sweetnessArt; g.clear();
    const x = 216, y = 788, w = 258, h = 6;
    const maxSyrup = 36;
    round(g, x, y, w, h, 0x22352c, 3);
    const [minIdeal, maxIdeal] = targets.syrupRange;
    const idealStart = x + Math.min(1, minIdeal / maxSyrup) * w;
    const idealWidth = Math.max(8, (Math.min(maxSyrup, maxIdeal) - minIdeal) / maxSyrup * w);
    round(g, idealStart, y + 1, idealWidth, h - 2, 0x4d8a59, 2, 0.82);
    if (currentSyrup > 0) {
      const fillW = Math.min(w, (currentSyrup / maxSyrup) * w);
      const inRange = currentSyrup >= minIdeal && currentSyrup <= maxIdeal;
      round(g, x, y + 1, fillW, h - 2, inRange ? 0xf2c96d : 0xe07a4b, 2);
    }
    const targetX = x + Math.min(1, targets.lycheeSyrup / maxSyrup) * w;
    line(g, [[targetX, y - 1.5], [targetX, y + h + 1.5]], 0xfff5d6, 1.5);
  }

  drawEffects() {
    const g = this.fxArt; g.clear();
    for (const drop of this.droplets) {
      g.fillStyle(0xfdfaf4, drop.alpha);
      g.fillCircle(drop.x, drop.y, 2.2);
    }
    for (const p of this.fallingLychees) {
      g.item('lychee-fruit', p.x, p.y, 14, 12, undefined, { rotation: p.angle, alpha: p.alpha });

    }
  }

  destroy() {
    for (const remove of this.removers) remove();
    this.root.destroy();
  }
}
