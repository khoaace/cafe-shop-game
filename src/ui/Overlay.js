import { recipePreview } from '../models/recipePreview.js';
import { INGREDIENT_DEFINITIONS } from '../data/drinkEngine.js';
import { mastery } from '../logic/progression.js';
import { RECIPES, unlockedRecipes, COLORS as C, money } from '../config.js';
import { label, round, createCupArt, SERIF } from '../rendering/art.js';
import { button, wrappedLabel } from './widgets.js';
export class Overlay {
  constructor(scene, reason) {
    this.scene = scene; this.reason = reason;
    scene.setPaused(reason, true);
    this.root = scene.add.container(0, 0).setDepth(300);
    const shade = scene.add.rectangle(240, 400, 480, 800, C.dark, 0.75).setInteractive();
    shade.on('pointerdown', (p, x, y, event) => event.stopPropagation());
    this.root.add(shade);
    const bg = scene.add.graphics(); round(bg, 24, 113, 432, 581, C.cream, 22); this.root.add(bg);
  }
  add(...objects) { this.root.add(objects); return objects[0]; }
  close() { this.root.destroy(); this.scene.overlay = null; this.scene.setPaused(this.reason, false); }
  book(initial = 'den', stationIndex = null) {
    const scene = this.scene;
    this.add(label(scene, 52, 147, 'SỔ TAY CỦA QUÁN', 10, '#8c7957', { letterSpacing: 2 }).setOrigin(0, 0.5));
    this.add(button(scene, 419, 145, 42, 38, '×', () => this.close(), { fill: C.paper, color: '#425744', size: 24 }));
    this.add(label(scene, 240, 185, 'Một chút khéo tay.', 28, '#2c4939', { fontFamily: SERIF }));
    this.content = scene.add.container(0, 0); this.root.add(this.content);
    let guideMode = 'ingredients', guidePage = 0, guideId = initial;
    const render = id => {
      if (guideId !== id) { guidePage = 0; guideId = id; }
      this.content.removeAll(true);
      const recipe = RECIPES[id];
      const page = (obj) => { this.content.add(obj); return obj; };
      const recipes = Object.values(RECIPES), selectedPage = Math.floor(recipes.findIndex(r => r.id === id) / 4);
      const unlocked = unlockedRecipes(scene.session.day, scene.session.upgrades);
      recipes.slice(selectedPage * 4, selectedPage * 4 + 4).forEach((r, i) => page(button(scene, 80 + i * 107, 231, 99, 37, `${unlocked.includes(r.id) ? '' : '🔒 '}${r.short}`, () => render(r.id), { fill: id === r.id ? C.dark : C.paper, color: id === r.id ? '#fff1d4' : '#566047', size: 11 })));
      if (recipes.length > 4) {
        page(button(scene, 57, 275, 46, 44, '‹', () => render(recipes[((selectedPage - 1 + Math.ceil(recipes.length / 4)) % Math.ceil(recipes.length / 4)) * 4].id)));
        page(button(scene, 423, 275, 46, 44, '›', () => render(recipes[((selectedPage + 1) % Math.ceil(recipes.length / 4)) * 4].id)));
      }
      const art = scene.add.graphics();
      round(art, 177, 267, 126, 115, 0xe9dfbd, 55);
      page(art); page(createCupArt(scene, recipePreview(recipe), 240, 327, 1.25));
      page(label(scene, 240, 405, recipe.name, 25, '#304d3b', { fontFamily: SERIF }));
      page(label(scene, 240, 435, `${money(recipe.price)} · ${mastery(scene.game.save.data.mastery[id])}`, 14, '#a46a3d', { fontStyle: 'bold' }));
      const lines = (recipe.engine === 'gesture' || recipe.id === 'muoi') ? (guideMode === 'ingredients' ? recipe.ingredients.map(i => `${INGREDIENT_DEFINITIONS[i.id].name}: ${i.target} ${i.unit}`) : recipe.steps.map(s => s.instruction)) : [
        `Bột cà phê: ${recipe.coffee === 0.5 ? '½ muỗng' : '1 muỗng'}   ·   Nước: ${recipe.water * 100}%`,
        recipe.condensed ? `Sữa đặc: ${recipe.condensed} phần${recipe.milk ? `   ·   Sữa tươi: ${recipe.milk} phần` : ''}` : recipe.foam ? 'Bọt trứng: đánh bông rồi kéo tô vào ly' : 'Cà phê nguyên chất, không thêm sữa',
        recipe.ice ? `Đá: ${recipe.ice} viên (1 lần kéo muỗng đá)` : 'Uống nóng · không thêm đá',
        recipe.stir ? 'Khuấy tròn 1½ vòng sau khi pha xong.' : recipe.foam ? 'Giữ lớp bọt vàng trên mặt, không khuấy.' : 'Chờ phin nhỏ xong rồi kéo ly đến khách.',
      ];
      if ((recipe.engine === 'gesture' || recipe.id === 'muoi')) {
        for (const [mode, title, x] of [['ingredients', 'Định lượng', 159], ['steps', 'Thao tác', 321]]) page(button(scene, x, 469, 146, 32, title, () => { guideMode = mode; guidePage = 0; render(id); }, { size: 12, fill: guideMode === mode ? C.green : C.sage }));
        const pages = Math.ceil(lines.length / 2); guidePage = Math.min(guidePage, pages - 1);
        page(wrappedLabel(scene, 240, 536, lines.slice(guidePage * 2, guidePage * 2 + 2).join('\n'), 320, 14));
        if (pages > 1) {
          page(button(scene, 54, 544, 44, 44, '‹', () => { guidePage = (guidePage - 1 + pages) % pages; render(id); }));
          page(button(scene, 426, 544, 44, 44, '›', () => { guidePage = (guidePage + 1) % pages; render(id); }));
        }
      } else page(wrappedLabel(scene, 240, 511, lines.join('\n'), 365, 14));
      if (stationIndex !== null && unlocked.includes(id)) {
        page(button(scene, 240, 615, 335, 45, `Dùng gợi ý này cho trạm ${stationIndex + 1}`, () => { if (scene.stations[stationIndex].model.chooseRecipe(id) === false) { scene.toast('Dọn ly cũ trước khi đổi loại dụng cụ.'); return; } scene.selectedStation = stationIndex; this.close(); scene.toast(`Trạm ${stationIndex + 1}: ${recipe.hint}`); }, { size: 13 }));
      } else page(button(scene, 240, 615, 335, 45, unlocked.includes(id) ? 'Nhớ rồi, về bàn pha thôi' : `Chưa mở · từ ngày ${recipe.unlock.day || 1}`, () => this.close()));
      page(label(scene, 240, 663, 'Đồng hồ, khách và phin đều đang tạm dừng.', 11, '#7b8068'));
    };
    render(initial);
  }
  pause(hidden = false) {
    const scene = this.scene;
    this.add(label(scene, 240, 175, hidden ? 'Mừng bạn trở lại.' : 'Nghỉ một chút nhé.', 29, '#304d3b', { fontFamily: SERIF }));
    this.add(wrappedLabel(scene, 240, 241, 'Quán đang tạm nghỉ. Khách sẽ chờ, cà phê cũng vậy.', 330, 16));
    this.add(button(scene, 240, 312, 330, 49, 'Tiếp tục buổi sáng', () => this.close()));
    const sound = button(scene, 240, 377, 330, 45, `Âm thanh: ${scene.game.save.data.settings.sound ? 'Bật' : 'Tắt'}`, () => {
      scene.game.audio.toggle(); scene.game.audio.pause(); sound.title.setText(`Âm thanh: ${scene.game.save.data.settings.sound ? 'Bật' : 'Tắt'}`);
    }, { fill: C.paper, color: '#435840' }); this.add(sound);
    const music = button(scene, 240, 431, 330, 42, `Nhạc nền: ${scene.game.save.data.settings.music ? 'Bật' : 'Tắt'}`, () => { scene.game.audio.toggle('music'); music.title.setText(`Nhạc nền: ${scene.game.save.data.settings.music ? 'Bật' : 'Tắt'}`); scene.game.audio.pause(); }, { fill: C.paper, color: '#435840' }); this.add(music);
    const motion = button(scene, 240, 485, 330, 45, `Giảm chuyển động: ${scene.game.save.data.settings.reducedMotion ? 'Bật' : 'Tắt'}`, () => {
      scene.game.save.settings({ reducedMotion: !scene.game.save.data.settings.reducedMotion }); motion.title.setText(`Giảm chuyển động: ${scene.game.save.data.settings.reducedMotion ? 'Bật' : 'Tắt'}`);
    }, { fill: C.paper, color: '#435840' }); this.add(motion);
    let confirming = false;
    const leave = button(scene, 240, 551, 330, 45, 'Về trang đầu', () => {
      if (!confirming) { confirming = true; leave.title.setText('Bỏ ca hiện tại và về trang đầu'); return; }
      this.close(); scene.scene.start('Menu');
    }, { fill: 0xe8d1ac, color: '#704e36', size: 13 }); this.add(leave);
    this.add(wrappedLabel(scene, 240, 627, 'Tiến trình chỉ lưu khi kết thúc ca.\nRời quán hoặc tải lại giữa ca sẽ chơi lại từ đầu ngày.', 336, 12));
  }
}
