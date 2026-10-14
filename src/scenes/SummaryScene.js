import Phaser from 'phaser';
import { ACHIEVEMENTS } from '../logic/progression.js';
import { COLORS as C, money } from '../config.js';
import { label, round, drawCup, plant, SERIF } from '../rendering/art.js';
import { button, wrappedLabel, announce } from '../ui/widgets.js';
export class SummaryScene extends Phaser.Scene {
  constructor() { super('Summary'); }
  init(summary) { this.result = summary; }
  create() {
    this.game.rendering?.attach(this);
    this.game.audio.resumeIfUnlocked();
    const r = this.result;
    this.cameras.main.setBackgroundColor(C.dark);
    const g = this.add.graphics();
    plant(this, 20, 213, 1.4).setDepth(-1); plant(this, 459, 264, 1.4, 'ceramic').setDepth(-1);
    label(this, 240, 54, 'PHIN GÓC PHỐ', 12, '#d7c298', { letterSpacing: 3 });
    label(this, 240, 106, r.tutorial ? 'Bạn đã biết pha phin!' : 'Một sáng thật trọn vẹn.', 30, '#fff1d0', { fontFamily: SERIF });
    label(this, 240, 146, r.tutorial ? '3 LY ĐẦU TIÊN · SẴN SÀNG MỞ QUÁN' : `TỔNG KẾT NGÀY ${r.day} · ${r.endReason === 'stockout' ? 'HẾT NGUYÊN LIỆU' : '06:00—10:00'}`, 10, '#c3c9a9', { letterSpacing: 1 });
    round(g, 29, 185, 422, 476, C.cream, 20);
    label(this, 240, 225, r.tutorial ? 'TIỀN THƯỞNG LUYỆN TẬP' : 'TIỀN THU TRONG CA', 10, '#8e815d', { letterSpacing: 2 });
    label(this, 240, 271, money(r.earnings), 43, '#31523e', { fontFamily: SERIF, fontStyle: 'bold' });
    const rows = [
      ['Tiền bán cà phê', money(r.revenue)], ['Khách gửi thêm', money(r.tips)], ['Thưởng combo / VIP / thử thách', money(r.bonuses + (r.challengeReward || 0))],
      ['Giá trị nguyên liệu đã dùng', money(r.ingredientCost || r.ingredients?.cost || 0)], ['Khách vui / khách bỏ về', `${r.served} / ${r.lost}`], ['Ly Perfect / combo tốt nhất', `${r.perfect} / ×${r.bestCombo}`],
      ['Đánh giá trong ngày', r.ratings.length ? `${r.rating.toFixed(1)} / 5 ★` : 'Chưa có đánh giá'],
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = 318 + i * 31;
      label(this, 55, y, rows[i][0], 13, '#6a735a').setOrigin(0, 0.5);
      label(this, 424, y, rows[i][1], 14, '#334d39', { fontStyle: 'bold' }).setOrigin(1, 0.5);
      if (i < rows.length - 1) { g.lineStyle(1, 0xe6ddc1); g.lineBetween(55, y + 15, 425, y + 15); }
    }
    wrappedLabel(this, 240, 565, `“${r.review}”`, 345, 17, '#8e633f', { fontFamily: SERIF, fontStyle: 'italic' });
    if (r.challengeReward) label(this, 240, 604, `✓ Thử thách hoàn thành · +${money(r.challengeReward)}`, 12, '#5d7b46', { fontStyle: 'bold' });
    wrappedLabel(this, 240, 636, r.tutorial ? 'Tiền luyện tập không tính vào quán chính.\nSố phin trong quán giữ theo tiến trình của bạn.' : this.game.save.warning || `Đã lưu · Số dư hiện tại ${money(this.game.save.data.balance)}`, 350, 11, '#808367');
    button(this, 240, 707, 420, 51, r.tutorial ? 'Mở quán · Bắt đầu buổi sáng' : `Chào ngày mới · Ngày ${this.game.save.data.day}`, () => this.scene.start('Game'), { fill: C.gold, color: '#324734', size: 15 });
    button(this, 134, 765, 204, 38, 'Về trang đầu', () => this.scene.start('Menu'), { fill: 0x385441, size: 12 });
    button(this, 347, 765, 204, 38, r.tutorial ? 'Luyện pha lại' : 'Ghé cửa hàng', () => this.scene.start(r.tutorial ? 'Tutorial' : 'Shop'), { fill: 0x385441, size: 12 });
    if (r.unlocked?.length) {
      const text = label(this, 240, 188, `★ ${r.unlocked.map(id => ACHIEVEMENTS.find(a => a.id === id).name).join(' · ')}`, 11, '#fff0cf', { wordWrap: { width: 410 }, align: 'center', backgroundColor: '#57734d', padding: { x: 8, y: 6 } }).setDepth(20);
      if (!this.game.save.data.settings.reducedMotion) { text.setScale(0.9); this.tweens.add({ targets: text, scale: 1, duration: 350, ease: 'Back.Out' }); }
    }
    announce(`Kết thúc ${r.tutorial ? 'hướng dẫn' : `ngày ${r.day}${r.endReason === 'stockout' ? ' vì hết nguyên liệu' : ''}`}. Phục vụ ${r.served} khách, thu nhập ${money(r.earnings)}.`);
  }
  update(_time, delta) { this.game.audio.ambient(Math.min(delta, 100) / 1000, false); }
}
