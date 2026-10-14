import { recipePreview } from '../models/recipePreview.js';
import Phaser from 'phaser';
import { COLORS as C, RECIPES, money } from '../config.js';
import { label, round, createCupArt, SERIF } from '../rendering/art.js';
import { button, wrappedLabel } from '../ui/widgets.js';
import { ACHIEVEMENTS, STORIES, mastery } from '../logic/progression.js';
import { INGREDIENTS } from '../logic/inventory.js';
export class NotebookScene extends Phaser.Scene {
  constructor() { super('Notebook'); }
  create() {
    this.game.rendering?.attach(this);
    this.game.audio.resumeIfUnlocked();
    this.cameras.main.setBackgroundColor(C.dark);
    const bg = this.add.graphics(); round(bg, 20, 82, 440, 622, C.cream, 20);
    label(this, 240, 43, 'NHỮNG BUỔI SÁNG ĐÃ QUA', 10, '#dacda4', { letterSpacing: 2 });
    label(this, 240, 123, 'Sổ chuyện góc phố', 30, '#36513d', { fontFamily: SERIF });
    ['Thống kê', 'Huy hiệu', 'Món ngon', 'Chuyện', 'Cài đặt'].forEach((name, i) => button(this, 69 + i * 86, 180, 79, 39, name, () => this.render(i), { size: 10 }));
    this.content = this.add.container(0, 0); this.render(0);
    button(this, 130, 749, 200, 47, 'Về trang đầu', () => this.scene.start('Menu'), { size: 14, fill: 0x405b45 });
    button(this, 351, 749, 200, 47, 'Ghé cửa hàng', () => this.scene.start('Shop'), { size: 14, fill: C.gold, color: '#354b36' });
  }
  render(tab, character = 'driver', recipePage = 0) {
    this.content.removeAll(true); const d = this.game.save.data, add = o => { this.content.add(o); return o; };
    if (tab === 0) {
      const favorite = Object.entries(d.mastery).sort((a, b) => b[1] - a[1])[0];
      const pantry = Object.entries(INGREDIENTS).map(([id, spec]) => `${spec.name.replace('Bột cà phê', 'Bột').replace('Sữa ', '')} ${Number.isInteger(d.inventory[id]) ? d.inventory[id] : d.inventory[id].toFixed(1)}`).join(' · ');
      const rows = [['Ngày tiếp theo', d.day], ['Khách đã phục vụ / bỏ về', `${d.stats.served} / ${d.stats.lost}`], ['Tiền bán trọn đời', money(d.stats.lifetimeRevenue)], ['Tip trọn đời', money(d.stats.lifetimeTips)], ['Thưởng trọn đời', money(d.stats.lifetimeBonuses)], ['Tổng thu nhập', money(d.stats.lifetimeEarnings)], ['Chi nâng cấp', money(d.stats.upgradeExpenses)], ['Chi nhập nguyên liệu', money(d.stats.ingredientExpenses)], ['Kho hiện tại', pantry], ['Ly Perfect / combo tốt nhất', `${d.stats.perfect} / ×${d.stats.bestCombo}`], ['Món bán nhiều nhất', favorite[1] ? RECIPES[favorite[0]].short : 'Chưa có dữ liệu'], ['Ngày thu nhập tốt nhất', money(d.stats.bestDay)], ['Số lần mở ca', d.stats.sessions], ['Danh tiếng tích lũy', `${this.game.save.reputation.toFixed(2)} / 5`]];
      rows.forEach(([name, value], i) => { const y = 225 + i * 32; add(label(this, 44, y, name, 11, '#687357').setOrigin(0, 0.5)); add(label(this, 437, y, String(value), name === 'Kho hiện tại' ? 9 : 13, '#344d38', { fontStyle: 'bold' }).setOrigin(1, 0.5)); });
    } else if (tab === 1) {
      ACHIEVEMENTS.forEach((a, i) => { const unlocked = d.achievements.includes(a.id), y = 241 + i * 72; add(label(this, 44, y, `${unlocked ? '★' : '○'}  ${a.name}`, 17, unlocked ? '#9b7134' : '#79836d').setOrigin(0, 0.5)); add(label(this, 66, y + 25, a.description, 11, '#73765d', { wordWrap: { width: 358 } }).setOrigin(0, 0.5)); });
    } else if (tab === 2) {
      Object.values(RECIPES).slice(recipePage * 4, recipePage * 4 + 4).forEach((r, i) => { const y = 266 + i * 104, count = d.mastery[r.id] || 0; const g = createCupArt(this, recipePreview(r), 82, y, 0.77); add(g); add(label(this, 143, y - 18, `${count >= 5 ? '★ ' : ''}${r.name}`, 18, '#37533e', { fontFamily: SERIF }).setOrigin(0, 0.5)); add(label(this, 143, y + 12, `${mastery(count)} · ${count} ly đúng`, 13, '#907441').setOrigin(0, 0.5)); });
      if (Object.keys(RECIPES).length > 4) {
        const pages = Math.ceil(Object.keys(RECIPES).length / 4);
        add(button(this, 59, 656, 45, 44, '‹', () => this.render(2, character, (recipePage - 1 + pages) % pages)));
        add(button(this, 421, 656, 45, 44, '›', () => this.render(2, character, (recipePage + 1) % pages)));
      }
      add(label(this, 240, 681, 'Mốc 5 / 15 / 30 ly · huy hiệu trang trí, vẫn pha bằng tay.', 10, '#7b8068'));
    } else if (tab === 3) {
      Object.entries(STORIES).forEach(([id, story], i) => add(button(this, 101 + i * 139, 237, 127, 37, story.name, () => this.render(3, id), { size: 12, fill: id === character ? C.green : 0x9c9f80 })));
      const story = STORIES[character], progress = d.stories[character];
      add(label(this, 240, 281, `${progress.encounters} ngày phục vụ thành công · ${progress.chapter}/3 chương`, 12, '#8b7653'));
      story.chapters.forEach((text, i) => { const open = progress.chapter > i; add(label(this, 46, 328 + i * 113, `CHƯƠNG ${i + 1} ${open ? '✓' : '· Chưa mở'}`, 11, '#93723d', { fontStyle: 'bold' }).setOrigin(0, 0.5)); add(wrappedLabel(this, 240, 372 + i * 113, open ? text : `Từ ngày ${[2, 4, 7][i]}, sau ${[1, 3, 5][i]} ngày phục vụ nhân vật này.`, 380, 14, open ? '#435b43' : '#95947d')); });
    } else {
      [['sound', 'Hiệu ứng âm thanh'], ['music', 'Nhạc nền'], ['reducedMotion', 'Giảm chuyển động']].forEach(([key, name], i) => add(button(this, 240, 261 + i * 66, 360, 46, `${name}: ${d.settings[key] ? 'Bật' : 'Tắt'}`, () => { if (key === 'sound' || key === 'music') this.game.audio.toggle(key); else this.game.save.settings({ [key]: !d.settings[key] }); this.render(4); }, { fill: C.paper, color: '#41583f', size: 15 })));
      add(wrappedLabel(this, 240, 468, this.game.save.warning || 'Lưu cuối ca. Tải lại giữa ca sẽ chơi lại ngày đó, giữ nguyên sự kiện và thử thách.', 350, 14));
      let confirmed = false;
      const reset = button(this, 240, 568, 360, 46, 'Bắt đầu tiến trình mới', () => { if (!confirmed) { confirmed = true; reset.title.setText('Xóa tiến trình cũ và bắt đầu lại'); return; } this.game.save.reset(); this.scene.start('Menu'); }, { fill: 0xe3c69d, color: '#86553c', size: 13 }); add(reset);
      add(label(this, 240, 649, 'Âm thanh chỉ bắt đầu sau tương tác của bạn.', 11, '#808267'));
    }
  }
  update(_time, delta) { this.game.audio.ambient(Math.min(delta, 100) / 1000, false); }
}
