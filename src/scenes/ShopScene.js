import Phaser from 'phaser';
import { COLORS as C, money } from '../config.js';
import { label, round, toolArt, stool, plant, fanArt, SERIF } from '../rendering/art.js';
import { button, wrappedLabel } from '../ui/widgets.js';
import { UPGRADES, quoteUpgrade } from '../logic/upgrades.js';
import { INGREDIENTS, inventoryShortage } from '../logic/inventory.js';

const amountText = value => Number.isInteger(value) ? String(value) : value.toFixed(1);

export class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); this.tab = 'upgrades'; this.supplyPage = 0; }
  create() {
    this.game.rendering?.attach(this);
    this.game.audio.resumeIfUnlocked();
    this.game.save.inShift = false;
    this.cameras.main.setBackgroundColor(C.dark);
    label(this, 240, 43, 'SẮM SỬA CHO QUÁN', 10, '#d9c59a', { letterSpacing: 3 });
    label(this, 240, 82, 'Chuẩn bị một sáng thật vui.', 26, '#fff0d2', { fontFamily: SERIF });
    this.balance = label(this, 240, 124, '', 20, '#e8b46b');
    this.tabs = {
      upgrades: button(this, 135, 169, 198, 40, 'NÂNG CẤP QUÁN', () => { this.tab = 'upgrades'; this.refresh(); }, { size: 11, radius: 7 }),
      supplies: button(this, 345, 169, 198, 40, 'NGUYÊN LIỆU', () => { this.tab = 'supplies'; this.refresh(); }, { size: 11, radius: 7 }),
    };
    this.cards = this.add.container(0, 0);
    this.quickRoot = this.add.container(0, 0);
    this.message = wrappedLabel(this, 240, 674, '', 430, 11, '#e0d8b6');
    button(this, 130, 731, 200, 48, 'Về trang đầu', () => this.scene.start('Menu'), { fill: 0x405d47, size: 14 });
    button(this, 351, 731, 200, 48, 'Mở quán', () => this.scene.start('Game'), { fill: C.gold, color: '#304b36', size: 14 });
    label(this, 240, 781, 'NHẬP HÀNG NGOÀI CA · MỖI GIAO DỊCH ĐƯỢC LƯU NGAY', 8, '#adbfa2');
    this.refresh();
  }
  refresh() {
    this.cards.removeAll(true); this.quickRoot.removeAll(true);
    const d = this.game.save.data;
    this.balance.setText(`Quỹ quán: ${money(d.balance)}`);
    this.tabs.upgrades.setAlpha(this.tab === 'upgrades' ? 1 : 0.58);
    this.tabs.supplies.setAlpha(this.tab === 'supplies' ? 1 : 0.58);
    if (this.tab === 'supplies') this.renderSupplies(); else this.renderUpgrades();
  }
  card(y) {
    const bg = this.add.graphics(); round(bg, 23, y - 31, 434, 69, C.cream, 11); this.cards.add(bg); return bg;
  }
  renderUpgrades() {
    const d = this.game.save.data;
    Object.entries(UPGRADES).forEach(([key, spec], i) => {
      const y = 230 + i * 77, q = quoteUpgrade(d.upgrades, key); this.card(y);
      let icon;
      if (['phin', 'condensed'].includes(spec.icon)) icon = toolArt(this, spec.icon, 61, y + 3).setScale(0.7);
      else if (key === 'seats') icon = stool(this, 61, y + 10, 0.65);
      else if (key === 'decor') icon = plant(this, 61, y + 27, 0.43);
      else if (key === 'blender') icon = toolArt(this, 'blender', 61, y + 2).setScale(0.8);
      else icon = fanArt(this, 61, y, 0.68);
      this.cards.add(icon);
      this.cards.add(label(this, 98, y - 12, spec.name, 14, '#304d3b', { fontStyle: 'bold' }).setOrigin(0, 0.5));
      this.cards.add(label(this, 98, y + 13, spec.description, 9, '#737557', { wordWrap: { width: 225 }, lineSpacing: 1 }).setOrigin(0, 0.5));
      const text = q ? `${money(q.price)}\n${spec.max ? `${d.upgrades[key]} → ${q.next}` : 'Sắm ngay'}` : 'Đã có ✓';
      const buy = button(this, 389, y + 3, 112, 49, text, () => {
        if (!q) return; buy.input.enabled = false;
        const result = this.game.save.purchase(key, q.current); this.message.setText(result.message);
        this.game.audio.play(result.ok ? 'money' : 'error');
        if (result.ok) this.tweens.add({ targets: icon, scale: icon.scaleX * 1.1, duration: 170, yoyo: true });
        this.time.delayedCall(350, () => this.refresh());
      }, { fill: q ? (d.balance >= q.price ? C.green : 0xa4967a) : 0xd7dbc3, color: q ? '#fff2d7' : '#667457', size: 11 });
      if (!q) buy.input.enabled = false; this.cards.add(buy);
    });
    this.message.setText('Nâng cấp dùng từ ca tiếp theo. Chi nâng cấp không tính vào doanh thu.');
  }
  renderSupplies() {
    const d = this.game.save.data, plan = this.game.save.supplyPlan();
    const supplies = Object.entries(INGREDIENTS);
    this.supplyPage = Math.min(this.supplyPage, Math.ceil(supplies.length / 5) - 1);
    supplies.slice(this.supplyPage * 5, this.supplyPage * 5 + 5).forEach(([id, spec], i) => {
      const y = 230 + i * 77; this.card(y);
      const icon = toolArt(this, spec.icon, 61, y + 2).setScale(id === 'ice' ? 0.64 : 0.7); this.cards.add(icon);
      this.cards.add(label(this, 98, y - 13, spec.name, 14, '#304d3b', { fontStyle: 'bold' }).setOrigin(0, 0.5));
      this.cards.add(label(this, 98, y + 12, `Còn ${amountText(d.inventory[id])} ${spec.unit} · Gói +${spec.pack}`, 10, d.inventory[id] < 1 ? '#a4513e' : '#737557').setOrigin(0, 0.5));
      const buy = button(this, 389, y + 3, 112, 49, `${money(spec.price)}\nNhập 1 gói`, () => {
        buy.input.enabled = false;
        const result = this.game.save.purchaseIngredient(id, d.inventory[id]); this.message.setText(result.message);
        this.game.audio.play(result.ok ? 'money' : 'error');
        if (result.ok) this.tweens.add({ targets: icon, scale: icon.scaleX * 1.1, duration: 170, yoyo: true });
        this.time.delayedCall(350, () => this.refresh());
      }, { fill: d.balance >= spec.price ? C.green : 0xa4967a, color: '#fff2d7', size: 10 });
      this.cards.add(buy);
    });
    if (supplies.length > 5) {
      const pages = Math.ceil(supplies.length / 5);
      this.cards.add(button(this, 44, 590, 44, 44, '‹', () => { this.supplyPage = (this.supplyPage - 1 + pages) % pages; this.refresh(); }));
      this.cards.add(button(this, 436, 590, 44, 44, '›', () => { this.supplyPage = (this.supplyPage + 1) % pages; this.refresh(); }));
    }
    const quick = button(this, 240, 622, 420, 43, plan.items.length ? `Nhập đủ ca tới · ${money(plan.price)}` : 'Kho đã đủ cho ca tới ✓', () => {
      quick.input.enabled = false;
      const result = this.game.save.purchaseSupplyPlan({ ...d.inventory }); this.message.setText(result.message);
      this.game.audio.play(result.ok ? 'money' : 'error');
      this.time.delayedCall(350, () => this.refresh());
    }, { fill: plan.items.length && d.balance >= plan.price ? C.gold : 0x7c846c, color: plan.items.length ? '#304b36' : '#e8ead5', size: 12 });
    if (!plan.items.length) quick.input.enabled = false; this.quickRoot.add(quick);
    this.message.setText(inventoryShortage(d.inventory, d.day, this.game.save.data.dayPlan.expectedOrders, d.upgrades));
  }
  update(_time, delta) { this.game.audio.ambient(Math.min(delta, 100) / 1000, false); }
}
