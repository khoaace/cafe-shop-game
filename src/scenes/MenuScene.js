import Phaser from 'phaser';
import { COLORS as C, ARCHETYPES, money } from '../config.js';
import { street, label, round, createCupArt, toolArt, plant, person, tableArt, SERIF } from '../rendering/art.js';
import { button, wrappedLabel, announce } from '../ui/widgets.js';
import { inventoryShortage } from '../logic/inventory.js';
import { starGoals } from '../logic/stars.js';
import { EVENTS } from '../logic/dayPlan.js';
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    this.game.rendering?.attach(this);
    this.game.audio.resumeIfUnlocked();
    // Three groups so the same art can stack (phone) or sit side by side (desktop).
    const group = build => { const before = new Set(this.children.list); build(); const root = this.add.container(0, 0); root.add(this.children.list.filter(o => o !== root && !before.has(o))); return root; };
    this.backdrop = this.add.graphics().setDepth(-2);
    // Desktop only: tiled street behind the hero so wide screens never show empty bars.
    this.heroFill = ['world-facade', 'world-pavement'].every(key => this.textures.exists(key))
      ? [this.add.tileSprite(0, 0, 1, 1, 'world-facade', 'main').setOrigin(0).setDepth(-1), this.add.tileSprite(0, 0, 1, 1, 'world-pavement', 'main').setOrigin(0).setDepth(-1)] : [];
    this.hero = group(() => {
      this.streetArt = street(this, { menu: true });
      tableArt(this, 240, 450, 480, 250);
      const table = this.add.graphics();
      round(table, -15, 326, 510, 260, 0xb3bfa9, 40);
      round(table, -15, 327, 510, 250, 0xd5d8bd, 40, 0.7);
      table.lineStyle(2, 0xe8e5c9); table.strokeRoundedRect(10, 338, 460, 225, 35);
      this.menuPlant = plant(this, 412, 460, 1.15, 'ceramic');
      this.add.ellipse(222, 475, 240, 52, 0x71836a, 0.22);
      createCupArt(this, { coffee: 1, condensed: 0.9, milk: 0, foam: 0, ice: 3, state: 'BREWED', stir: 0 }, 228, 434, 2.1);
      toolArt(this, 'phin', 232, 313).setScale(1.7);
      const beans = this.add.graphics();
      for (let i = 0; i < 6; i++) {
        const x = 96 + i * 15, y = 462 + Math.sin(i * 2) * 12;
        beans.fillStyle(0x654029); beans.fillEllipse(x, y, 12, 18); beans.lineStyle(1, 0xb48554); beans.lineBetween(x, y - 5, x + 2, y + 4);
      }
      this.host = person(this, ARCHETYPES[0], 72, 295, 0.92, true);
      this.host.drawFace('happy');
      this.steam = this.add.graphics();
    });
    this.heroMaskShape = this.make.graphics({ add: false }); this.heroMask = this.heroMaskShape.createGeometryMask();
    this.events.once('shutdown', () => { this.heroMask.destroy(); this.heroMaskShape.destroy(); });
    const save = this.game.save.data, plan = this.game.save.prepareDay();
    this.header = group(() => {
      this.headerBar = this.add.graphics();
      this.headerTitle = label(this, 30, 33, 'MỘT BUỔI SÁNG Ở SÀI GÒN', 10, '#e6d7ae', { letterSpacing: 2 }).setOrigin(0, 0.5);
      this.sun = label(this, 449, 33, '☀', 24, '#e7bc75');
      this.starCount = save.stats.totalStars ? label(this, 400, 33, `★ ${save.stats.totalStars}`, 14, '#f2c66d', { fontStyle: 'bold' }) : null;
    });
    // Card content uses local coordinates: its top edge is y = 0 (was 518 on the phone screen).
    this.card = group(() => {
      this.cardBg = this.add.graphics();
      label(this, 240, 24, 'TIỆM CÀ PHÊ PHIN VỈA HÈ', 9, '#9b8055', { letterSpacing: 3 });
      label(this, 240, 61, 'Pha chút bình yên.', 34, '#294937', { fontFamily: SERIF });
      // Returning players see today's ★ goals and event up front — a reason to open one more shift.
      const teaser = save.day > 1
        ? `Hôm nay: ${starGoals(plan).map(g => `○ ${g.short}`).join('  ·  ')}${plan.event ? `\n${EVENTS[plan.event].name} · ${EVENTS[plan.event].description}` : '\nPha thật nhanh để nhận thưởng ⚡ Nhanh tay!'}`
        : 'Tự tay pha phin, đón những người khách quen.\nMột góc phố nhỏ, một buổi sáng của riêng bạn.';
      wrappedLabel(this, 240, 103, teaser, 420, save.day > 1 ? 12 : 13, save.day > 1 ? '#7a5f33' : '#6b7058');
      const open = button(this, 240, 161, 402, 51, save.day > 1 ? `Mở quán · Ngày ${save.day}` : 'Mở quán · Ngày đầu tiên', () => this.scene.start('Game'), { size: 17 });
      if (!save.settings.reducedMotion) this.tweens.add({ targets: open, scale: 1.035, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      button(this, 106, 217, 133, 40, 'Cửa hàng', () => this.scene.start('Shop'), { fill: C.paper, color: '#576443', size: 12 });
      button(this, 245, 217, 133, 40, 'Sổ góc phố', () => this.scene.start('Notebook'), { fill: C.paper, color: '#576443', size: 12 });
      button(this, 384, 217, 133, 40, 'Học pha · 3 ly', () => this.scene.start('Tutorial'), { fill: C.paper, color: '#576443', size: 12 });
      this.saveNote = wrappedLabel(this, 240, 261, this.game.save.warning || inventoryShortage(save.inventory, save.day, plan.expectedOrders, save.upgrades), 433, 10, '#8a8069');
    });
    this.menuTime = 0; this.dialog = null;
    this.relayout();
    announce('Phin góc phố. Mở quán hoặc học pha phin qua 3 ly hướng dẫn.');
  }
  relayout() {
    if (!this.card) return;
    const l = this.layout || { width: 480, height: 800 }, desktop = !!l.desktop, W = l.width, H = l.height;
    this.backdrop.clear();
    this.headerBar.clear().fillStyle(C.dark).fillRect(0, 0, desktop ? W : 480, 68);
    this.sun.setX(desktop ? W - 31 : 449); this.starCount?.setX(desktop ? W - 80 : 400);
    this.cardBg.clear();
    if (!desktop) {
      this.hero.setPosition(0, 0).setScale(1).clearMask();
      this.heroFill.forEach(o => o.setVisible(false));
      round(this.cardBg, 0, 0, 480, 300, C.cream, { tl: 28, tr: 28, bl: 0, br: 0 });
      this.card.setPosition(0, 518).setScale(1);
      return;
    }
    // Desktop: street scene fills the left, the menu card floats in the right column.
    const pad = W >= 1440 ? 32 : 20, top = 68 + pad, cardW = Math.min(620, Math.max(440, W * 0.36));
    this.backdrop.fillStyle(0x1d3029).fillRect(0, 0, W, H);
    const hero = { x: pad, y: top, w: W - cardW - pad * 3, h: H - top - pad };
    // Fit the 480 × 450 scene (y 68–518) by height, allowing a slight crop; tiled street fills the sides.
    const scale = Math.min(Math.max(hero.w / 480, hero.h / 450), hero.h / 450 * 1.12);
    this.hero.setScale(scale).setPosition(hero.x + (hero.w - 480 * scale) / 2, hero.y + (hero.h - 450 * scale) / 2 - 68 * scale);
    this.heroMaskShape.clear().fillStyle(0xffffff).fillRoundedRect(hero.x, hero.y, hero.w, hero.h, 24);
    this.hero.setMask(this.heroMask);
    const [facade, pavement] = this.heroFill, groundY = hero.y + (hero.h - 450 * scale) / 2 + (345 - 68 - 45) * scale;
    facade?.setVisible(true).setPosition(hero.x, hero.y).setSize(hero.w, hero.h).setTileScale(scale * 0.52).setMask(this.heroMask);
    pavement?.setVisible(true).setPosition(hero.x, groundY).setSize(hero.w, hero.y + hero.h - groundY).setTileScale(scale * 0.55).setMask(this.heroMask);
    const cardScale = Math.min(1.25, cardW / 480, (H - top - pad) / 290);
    round(this.cardBg, 0, -6, 480, 292, C.cream, 26);
    this.card.setScale(cardScale).setPosition(W - pad - cardW + (cardW - 480 * cardScale) / 2, top + (H - top - pad - 286 * cardScale) / 2);
  }
  storagePanel() {
    if (this.dialog) return;
    const root = this.add.container(0, 0).setDepth(200); this.dialog = root;
    const shade = this.add.rectangle(240, 400, 480, 800, C.dark, 0.78).setInteractive();
    shade.on('pointerdown', (p, x, y, e) => e.stopPropagation()); root.add(shade);
    const bg = this.add.graphics(); round(bg, 34, 245, 412, 335, C.cream, 22); root.add(bg);
    root.add(label(this, 240, 280, 'Chuyện của quán', 29, '#304d3b', { fontFamily: SERIF }));
    const d = this.game.save.data;
    root.add(wrappedLabel(this, 240, 354, `Ngày ${d.day} · Số dư ${money(d.balance)}\n${d.stats.served} khách đã phục vụ · ${d.stats.perfect} ly Perfect\nDanh tiếng ${this.game.save.reputation.toFixed(1)} / 5`, 346, 16));
    let confirm = false;
    const reset = button(this, 240, 454, 335, 44, 'Bắt đầu tiến trình mới', () => {
      if (!confirm) { confirm = true; reset.title.setText('Xóa tiến trình cũ và bắt đầu lại'); return; }
      this.game.save.reset(); this.scene.restart();
    }, { fill: 0xe9d4b0, color: '#8c513a', size: 12 }); root.add(reset);
    root.add(button(this, 240, 521, 335, 44, 'Về quán', () => { root.destroy(); this.dialog = null; }));
  }
  update(time, delta) {
    this.game.audio.ambient(Math.min(delta, 100) / 1000, false);
    this.menuTime += Math.min(delta, 100);
    this.host?.update(this.menuTime, false, 'happy');
    this.streetArt?.updateArt?.(this.menuTime, this.game.save.data.settings.reducedMotion);
    this.menuPlant?.updateArt(this.menuTime, this.game.save.data.settings.reducedMotion);
    this.steam?.clear();
    if (!this.game.save.data.settings.reducedMotion && this.steam) {
      for (let i = 0; i < 3; i++) {
        const phase = (this.menuTime / 45 + i * 13) % 43;
        this.steam.lineStyle(3, 0xfff3da, (1 - phase / 43) * 0.7);
        this.steam.beginPath(); this.steam.moveTo(215 + i * 15, 283 - phase);
        this.steam.lineTo(210 + i * 15 + Math.sin(phase * 0.12) * 6, 266 - phase); this.steam.strokePath();
      }
    }
  }
}
