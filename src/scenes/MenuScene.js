import Phaser from 'phaser';
import { COLORS as C, ARCHETYPES, money } from '../config.js';
import { street, label, round, createCupArt, toolArt, plant, person, tableArt, SERIF } from '../rendering/art.js';
import { button, wrappedLabel, announce } from '../ui/widgets.js';
import { inventoryShortage } from '../logic/inventory.js';
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    this.game.rendering?.attach(this);
    this.game.audio.resumeIfUnlocked();
    this.streetArt = street(this, { menu: true });
    const overlay = this.add.graphics();
    overlay.fillStyle(C.dark); overlay.fillRect(0, 0, 480, 68);
    label(this, 30, 33, 'MỘT BUỔI SÁNG Ở SÀI GÒN', 10, '#e6d7ae', { letterSpacing: 2 }).setOrigin(0, 0.5);
    label(this, 449, 33, '☀', 24, '#e7bc75');
    tableArt(this, 240, 450, 480, 250);
    const table = this.add.graphics();
    round(table, -15, 326, 510, 260, 0xb3bfa9, 40);
    round(table, -15, 327, 510, 250, 0xd5d8bd, 40, 0.7);
    table.lineStyle(2, 0xe8e5c9); table.strokeRoundedRect(10, 338, 460, 225, 35);
    this.menuPlant = plant(this, 412, 460, 1.15, 'ceramic');
    const shadow = this.add.ellipse(222, 475, 240, 52, 0x71836a, 0.22);
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
    const card = this.add.graphics(); round(card, 0, 518, 480, 300, C.cream, { tl: 28, tr: 28, bl: 0, br: 0 });
    label(this, 240, 542, 'TIỆM CÀ PHÊ PHIN VỈA HÈ', 9, '#9b8055', { letterSpacing: 3 });
    label(this, 240, 579, 'Pha chút bình yên.', 34, '#294937', { fontFamily: SERIF });
    wrappedLabel(this, 240, 621, 'Tự tay pha phin, đón những người khách quen.\nMột góc phố nhỏ, một buổi sáng của riêng bạn.', 410, 13, '#6b7058');
    const save = this.game.save.data, plan = this.game.save.prepareDay();
    button(this, 240, 679, 402, 51, save.day > 1 ? `Mở quán · Ngày ${save.day}` : 'Mở quán · Ngày đầu tiên', () => this.scene.start('Game'), { size: 17 });
    button(this, 106, 735, 133, 40, 'Cửa hàng', () => this.scene.start('Shop'), { fill: C.paper, color: '#576443', size: 12 });
    button(this, 245, 735, 133, 40, 'Sổ góc phố', () => this.scene.start('Notebook'), { fill: C.paper, color: '#576443', size: 12 });
    button(this, 384, 735, 133, 40, 'Học pha · 3 ly', () => this.scene.start('Tutorial'), { fill: C.paper, color: '#576443', size: 12 });
    this.saveNote = wrappedLabel(this, 240, 779, this.game.save.warning || inventoryShortage(save.inventory, save.day, plan.expectedOrders), 433, 10, '#8a8069');
    this.menuTime = 0; this.dialog = null;
    announce('Phin góc phố. Mở quán hoặc học pha phin qua 3 ly hướng dẫn.');
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
