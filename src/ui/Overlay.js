import { recipePreview } from '../models/recipePreview.js';
import { INGREDIENT_DEFINITIONS } from '../data/drinkEngine.js';
import { mastery } from '../logic/progression.js';
import { RECIPES, unlockedRecipes, COLORS as C, RULES, money, clockText } from '../config.js';
import { label, round, createCupArt, SERIF } from '../rendering/art.js';
import { button, wrappedLabel } from './widgets.js';
import { EVENTS } from '../logic/dayPlan.js';
import { GAME_MINUTES_PER_SECOND } from '../logic/dayClock.js';
const capitalize = text => text.charAt(0).toLocaleUpperCase('vi') + text.slice(1);
export class Overlay {
  constructor(scene, reason) {
    this.scene = scene; this.reason = reason;
    scene.setPaused(reason, true);
    this.root = scene.add.container(0, 0).setDepth(300);
    const l = scene.layout || { width: 480, height: 800 };
    const shade = scene.add.rectangle(l.width / 2, l.height / 2, l.width, l.height, C.dark, 0.75).setInteractive();
    shade.on('pointerdown', (p, x, y, event) => event.stopPropagation());
    this.root.add(shade);
    const bg = scene.add.graphics();
    this.bounds = l.desktop ? { x: (l.width - Math.min(1060, l.width - 64)) / 2, y: 24, w: Math.min(1060, l.width - 64), h: Math.min(720, l.height - 48) } : { x: 24, y: 113, w: 432, h: 581 };
    if (l.desktop && reason !== 'book') { this.bounds.w = Math.min(540, l.width - 64); this.bounds.h = Math.min(620, l.height - 48); this.bounds.x = (l.width - this.bounds.w) / 2; }
    this.bounds.y = l.desktop ? (l.height - this.bounds.h) / 2 : 113;
    const r = this.bounds; round(bg, r.x, r.y, r.w, r.h, C.cream, 22); this.root.add(bg);
  }
  add(...objects) { this.root.add(objects); return objects[0]; }
  close() { this.root.destroy(); this.scene.overlay = null; this.scene.setPaused(this.reason, false); this.onClose?.(); }
  book(initial = 'den', stationIndex = null) {
    this.recipeId = initial; this.stationIndex = stationIndex;
    if (this.scene.layout?.desktop) { this.desktopBook(initial, stationIndex); return; }
    const scene = this.scene;
    this.add(label(scene, 52, 147, 'SỔ TAY CỦA QUÁN', 10, '#8c7957', { letterSpacing: 2 }).setOrigin(0, 0.5));
    this.add(button(scene, 419, 145, 42, 38, '×', () => this.close(), { fill: C.paper, color: '#425744', size: 24 }));
    this.add(label(scene, 240, 185, 'Một chút khéo tay.', 28, '#2c4939', { fontFamily: SERIF }));
    this.content = scene.add.container(0, 0); this.root.add(this.content);
    let guideMode = 'ingredients', guidePage = 0, guideId = initial;
    const render = id => {
      if (guideId !== id) { guidePage = 0; guideId = id; }
      this.content.removeAll(true);
      this.recipeId = id;
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
      const structured = recipe.engine === 'gesture' || ['muoi', 'cotdua'].includes(recipe.id);
      const lines = structured ? (guideMode === 'ingredients' ? recipe.ingredients.map(i => `${capitalize(INGREDIENT_DEFINITIONS[i.id].name)}: ${i.label || `${i.target} ${i.unit}`}`) : recipe.steps.map(s => s.instruction)) : [
        `Bột cà phê: ${recipe.coffee === 0.5 ? '½ muỗng' : '1 muỗng'}   ·   Nước: ${recipe.water * 100}%`,
        recipe.condensed ? `Sữa đặc: ${recipe.condensed} phần${recipe.milk ? `   ·   Sữa tươi: ${recipe.milk} phần` : ''}` : recipe.foam ? 'Bọt trứng: đánh bông rồi kéo tô vào ly' : 'Cà phê nguyên chất, không thêm sữa',
        recipe.ice ? `Đá: ${recipe.ice} viên (1 lần kéo muỗng đá)` : 'Uống nóng · không thêm đá',
        recipe.stir ? 'Khuấy tròn 1½ vòng sau khi pha xong.' : recipe.foam ? 'Giữ lớp bọt vàng trên mặt, không khuấy.' : 'Chờ phin nhỏ xong rồi kéo ly đến khách.',
      ];
      if (structured) {
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
      } else page(button(scene, 240, 615, 335, 45, unlocked.includes(id) ? 'Nhớ rồi, về bàn pha thôi' : `Chưa mở · từ ngày ${recipe.unlock.day || 1}${recipe.unlock.upgrades?.blender && !scene.session.upgrades.blender ? ' · cần máy xay' : ''}`, () => this.close()));
      page(label(scene, 240, 663, 'Đồng hồ, khách và phin đều đang tạm dừng.', 11, '#7b8068'));
    };
    render(initial);
  }
  desktopBook(initial, stationIndex) {
    const scene = this.scene, r = this.bounds, unlocked = unlockedRecipes(scene.session.day, scene.session.upgrades);
    this.add(label(scene, r.x + 26, r.y + 28, 'SỔ CÔNG THỨC', 16, '#6b7055', { fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0, 0.5));
    this.add(button(scene, r.x + r.w - 32, r.y + 29, 40, 36, '×', () => this.close(), { fill: C.paper, color: '#425744', size: 24 }));
    this.content = scene.add.container(); this.root.add(this.content);
    const recipes = Object.values(RECIPES), listW = 215;
    const render = id => {
      this.recipeId = id; this.content.removeAll(true);
      const add = object => { this.content.add(object); return object; }, recipe = RECIPES[id];
      const rowH = Math.min(46, (r.h - 110) / recipes.length);
      recipes.forEach((item, i) => add(button(scene, r.x + 20 + listW / 2, r.y + 70 + i * rowH, listW, rowH - 5, `${unlocked.includes(item.id) ? '' : '🔒 '}${item.short}`, () => render(item.id), { fill: item.id === id ? C.green : C.paper, color: item.id === id ? '#fff4de' : '#4a604c', size: 14, radius: 8 })));
      const left = r.x + listW + 52, width = r.w - listW - 80;
      add(label(scene, left, r.y + 76, recipe.name, 25, '#304d3b', { fontFamily: SERIF }).setOrigin(0, 0.5));
      add(label(scene, left, r.y + 108, `${money(recipe.price)} · ${mastery(scene.game.save.data.mastery[id])}`, 14, '#a46a3d').setOrigin(0, 0.5));
      add(createCupArt(scene, recipePreview(recipe), left + 85, r.y + 214, 1.45));
      const ingredients = recipe.ingredients.map(i => `${capitalize(INGREDIENT_DEFINITIONS[i.id].name)}: ${i.label || `${i.target} ${i.unit}`}`).join('\n');
      add(label(scene, left + 185, r.y + 145, 'ĐỊNH LƯỢNG', 14, '#526b50', { fontStyle: 'bold' }).setOrigin(0, 0));
      const amounts = add(label(scene, left + 185, r.y + 172, ingredients, 14, '#56644c', { wordWrap: { width: width - 185 }, lineSpacing: 5 }).setOrigin(0, 0));
      // Long ingredient lists (7+ lines) push the steps down instead of overlapping them.
      const stepsY = Math.max(r.y + 310, amounts.y + amounts.height + 18);
      add(label(scene, left, stepsY, 'CÁCH PHA', 14, '#526b50', { fontStyle: 'bold' }).setOrigin(0, 0));
      const colW = (width - 20) / 2, split = Math.ceil(recipe.steps.length / 2);
      for (let col = 0; col < 2; col++) {
        const steps = recipe.steps.slice(col * split, (col + 1) * split).map((step, i) => `${col * split + i + 1}. ${step.instruction}`).join('\n\n');
        add(label(scene, left + col * (colW + 20), stepsY + 28, steps, 14, '#56644c', { wordWrap: { width: colW }, lineSpacing: 4 }).setOrigin(0, 0));
      }
      const available = unlocked.includes(id);
      add(button(scene, left + width / 2, r.y + r.h - 48, Math.min(420, width), 42, !available ? `Chưa mở · từ ngày ${recipe.unlock.day || 1}` : stationIndex !== null ? `Dùng cho trạm ${stationIndex + 1}` : 'Về bàn pha', () => {
        if (!available) return;
        if (stationIndex !== null) {
          if (!scene.stations[stationIndex].model.chooseRecipe(id)) { scene.toast('Dọn ly cũ trước khi đổi loại dụng cụ.'); return; }
          scene.selectedStation = stationIndex;
        }
        this.close();
      }, { size: 15 }));
      add(label(scene, r.x + 22, r.y + r.h - 24, 'Quán đang tạm dừng.', 11, '#7b8068').setOrigin(0, 0.5));
    };
    render(initial);
  }
  // Shift briefing: the clock waits until the player opens the shop, so the fast day never starts unannounced.
  intro() {
    const scene = this.scene, session = scene.session;
    if (scene.layout?.desktop) {
      const body = scene.add.container((scene.layout.width - 480) / 2, (scene.layout.height - 800) / 2);
      this.root.add(body); this.add = (...objects) => { body.add(objects); return objects[0]; };
    }
    this.add(label(scene, 240, 146, `NGÀY ${session.day} · CA SÁNG`, 10, '#8c7957', { letterSpacing: 2 }));
    this.add(label(scene, 240, 180, 'Sẵn sàng mở quán?', 28, '#304d3b', { fontFamily: SERIF }));
    this.add(wrappedLabel(scene, 240, 226, `Ca ${clockText(0)} → ${clockText(RULES.daySeconds)} chỉ dài ${Math.round(RULES.daySeconds / 60)} phút thật.\nĐồng hồ chạy nhanh: 1 giây ≈ ${GAME_MINUTES_PER_SECOND.toFixed(1).replace('.', ',')} phút trong quán.`, 380, 13, '#5b6a4f'));
    // Timeline of the shift with the moments that will be announced.
    const g = scene.add.graphics(); this.add(g);
    const x0 = 66, x1 = 414, y = 300, at = s => x0 + (x1 - x0) * s / RULES.daySeconds;
    round(g, x0, y - 4, x1 - x0, 8, 0xd9d2b6, 4);
    round(g, at(RULES.rushStart), y - 4, at(RULES.rushEnd) - at(RULES.rushStart), 8, C.gold, 2);
    round(g, at(RULES.lastArrival), y - 4, x1 - at(RULES.lastArrival), 8, 0xd98d6d, 2);
    const marks = [[0, 'Mở cửa', -1], [RULES.rushStart, 'Cao điểm', 1], [RULES.rushEnd, 'Hết cao điểm', -1], [RULES.lastArrival, 'Ngừng đón khách', 1], [RULES.daySeconds, 'Đóng cửa', -1]];
    for (const [time, name, side] of marks) {
      const x = at(time); g.fillStyle(0x304d3b); g.fillCircle(x, y, 4);
      this.add(label(scene, x, y + side * 17, clockText(time), 10, '#304d3b', { fontStyle: 'bold' }));
      this.add(label(scene, x, y + side * 31, name, 9, '#7b6a49'));
    }
    const goals = session.starGoals.map(goal => `☆ ${goal.label}`).join('\n');
    this.add(label(scene, 240, 368, 'MỤC TIÊU ★ HÔM NAY', 10, '#8c7957', { letterSpacing: 2 }));
    this.add(wrappedLabel(scene, 240, 410, goals, 360, 14, '#3f5a43'));
    const event = EVENTS[session.event];
    const extra = [event ? `${event.name}: ${event.description}` : null, session.plan?.challenge ? `Thử thách: ${session.plan.challenge.label} · +${money(session.plan.challenge.reward)}` : null].filter(Boolean).join('\n');
    if (extra) this.add(wrappedLabel(scene, 240, 492, extra, 380, 12, '#875937'));
    this.add(button(scene, 240, 568, 330, 50, 'Mở cửa · Bắt đầu ca', () => this.close(), { size: 16 }));
    this.add(wrappedLabel(scene, 240, 630, 'Đồng hồ chỉ chạy khi bạn bắt đầu — chạm bất kỳ đâu.\nCần nghỉ? Bấm Ⅱ để tạm dừng bất cứ lúc nào.', 360, 11, '#7b8068'));
    // A tap anywhere starts the shift; only the clock waited, nothing else to confirm.
    // Arm on press so the release of the menu's "Mở quán" tap cannot skip the briefing.
    const shade = this.root.list[0]; let armed = false;
    shade.on('pointerdown', () => { armed = true; });
    shade.on('pointerup', () => { if (armed && this.root.active) this.close(); });
  }
  pause(hidden = false) {
    const scene = this.scene;
    if (scene.layout?.desktop) {
      const body = scene.add.container((scene.layout.width - 480) / 2, (scene.layout.height - 800) / 2);
      this.root.add(body); this.add = (...objects) => { body.add(objects); return objects[0]; };
    }
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
