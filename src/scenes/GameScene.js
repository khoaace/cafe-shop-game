import Phaser from 'phaser';
import { PreparationLayout } from '../rendering/PreparationLayout.js';
import { DesktopGameView } from '../rendering/DesktopGameView.js';
import { StationManager } from '../models/StationManager.js';
import { stationPosition } from '../logic/layout.js';
import { Environment } from '../rendering/Environment.js';
import { EVENTS } from '../logic/dayPlan.js';
import { DaySession } from '../models/DaySession.js';
import { INGREDIENT_DEFINITIONS } from '../data/drinkEngine.js';
import { InteractiveDrinkEngine } from '../systems/InteractiveDrinkEngine.js';
import { SaltedCreamStation } from '../rendering/SaltedCreamStation.js';
import { CoconutBlenderStation } from '../rendering/CoconutBlenderStation.js';
import { TraTacStation } from '../rendering/TraTacStation.js';
import { TraDaoStation } from '../rendering/TraDaoStation.js';
import { TraVaiStation } from '../rendering/TraVaiStation.js';
import { CacaoStation } from '../rendering/CacaoStation.js';
import { MatchaStation } from '../rendering/MatchaStation.js';
import { DragController } from '../systems/DragController.js';
import { CustomerView } from '../rendering/CustomerView.js';
import { StationView } from '../rendering/StationView.js';
import { street, label, round, toolArt, person } from '../rendering/art.js';
import { ARCHETYPES, RECIPES, COLORS as C, RULES, money } from '../config.js';
import { drinkHasRecipeMaterials } from '../logic/inventory.js';
import { button, announce } from '../ui/widgets.js';
import { HUD } from '../ui/HUD.js';
import { Overlay } from '../ui/Overlay.js';

export class GameScene extends Phaser.Scene {
  constructor(key = 'Game') { super(key); }
  create() {
    this.desktopUI = null; this.preparationLayouts = []; this.toolScroll = 0;
    this.game.rendering?.attach(this);
    this.tutorial = this.sys.settings.key === 'Tutorial';
    const saved = this.game.save.data;
    const plan = this.tutorial ? null : this.game.save.beginDay();
    this.session = new DaySession(saved.day, this.tutorial, Math.random, { upgrades: saved.upgrades, plan, stories: saved.stories, inventory: saved.inventory });
    this.finishing = false; this.pauseReasons = new Set(); this.overlay = null; this.visualTime = 0;
    this.selectedStation = 0; this.tray = 'brew'; this.toastUntil = 0; this.toastText = ''; this.liveHint = null;
    this.customerViews = new Map(); this.wasRush = false; this.challengeCelebrated = false; this.dialogue = null; this.particlePool = [];
    this.streetArt = street(this, { seats: this.session.upgrades.seats });
    this.environment = new Environment(this, this.session);
    this.shopkeeper = person(this, { ...ARCHETYPES[0], hair: 0x383b2c }, 448, 344, 0.48, true);
    this.shopkeeper.root.setDepth(21);
    this.stationManager = new StationManager(this.tutorial ? 1 : saved.upgrades.phins);
    this.stations = this.stationManager.models.map((model, i, models) => new StationView(this, model, i, stationPosition(i, models.length).x));
    this.session.setPreparedRecipeProvider(() => this.stationManager.models.filter(model => drinkHasRecipeMaterials(model.drink, model.recipeId)).map(model => model.recipeId));
    this.stationButtons = Array.from({ length: this.tutorial ? 1 : 4 }, (_, i) => button(this, this.tutorial ? 240 : 66 + i * 116, 385, this.tutorial ? 210 : 108, 28, `Phin ${i + 1}`, () => this.selectPage(Math.floor(i / 2), i), { size: 10, fill: 0x526b50, radius: 6 }));
    this.lockedSlot = label(this, 354, 513, 'PHIN 04 CHƯA MUA\nGhé cửa hàng sau ca nhé.', 14, '#71816b', { align: 'center', lineSpacing: 9 }).setVisible(false);
    this.selectPage(0);
    if (this.tutorial) {
      label(this, 56, 472, 'KÉO', 10, '#7c876d', { letterSpacing: 2 });
      label(this, 56, 491, '↓', 26, '#849474');
      label(this, 420, 488, 'CHẠM\n& GIỮ', 10, '#7c876d', { align: 'center', lineSpacing: 5 });
    }
    this.hud = new HUD(this);
    this.hint = label(this, 211, 613, '', 12, '#3e5840', { wordWrap: { width: 368 }, align: 'center', lineSpacing: 2 }).setDepth(60);
    const discard = toolArt(this, 'trash', 441, 613); this.discardArt = discard; discard.setScale(0.58).setDepth(60);
    const trashZone = this.add.zone(441, 613, 52, 42).setInteractive().setDepth(61);
    this.trashZone = trashZone;
    trashZone.on('pointerdown', (p, x, y, event) => { event.stopPropagation(); this.toast('Kéo ly cần bỏ vào thùng này để làm lại.'); });
    this.trayIds = ['brew', 'milk', 'egg', 'salt', 'coconut', 'tratac', 'tradao', 'travai', 'cacao', 'matcha'];
    this.tabButtons = [['01 PHIN', 0x58735a], ['02 SỮA·ĐÁ', 0x3b5645], ['03 TRỨNG', 0x3b5645], ['04 MUỐI', 0x3b5645], ['05 DỪA', 0x3b5645], ['06 TẮC', 0x3b5645], ['07 ĐÀO', 0x3b5645], ['08 VẢI', 0x3b5645], ['09 CACAO', 0x3b5645], ['10 MATCHA', 0x3b5645]]
      .map(([title, fill], i) => button(this, 25.8 + i * 47.6, 656, 45.5, 32, title, () => this.setTray(this.trayIds[i]), { fill, size: 6.8, radius: 6 }));
    this.trayRoot = this.add.container(0, 0).setDepth(30);
    this.trayDetail = this.add.graphics().setDepth(31);
    this.drinkEngine = new InteractiveDrinkEngine(this);
    for (const station of this.stations) this.drinkEngine.registerTarget(station.model.id, {
      accepts: ['pour', 'stir', 'ice', 'iceScoopCup', 'garnish', 'whisk', 'scoop'],
      visible: () => station.visible,
      contains: (x, y) => station.contains(x, y), center: () => ({ x: station.x, y: station.y }),
      pourPoint: () => ({ x: station.x, y: station.y + (24 - (station.cup.liquidLevel || 0)) * station.cup.scaleY }),
      recipeId: () => station.model.recipeId,
      getState: () => station.model.drink && !station.model.drink.consumed ? station.model.drink.preparation : null,
      onChange: (action, amount) => {
        if (action === 'stir' && station.model.drink?.recipeId === 'cacao') station.model.drink.stirBy(amount);
        station.model.drink?.startTimedSteps();
      },
      acceptIngredient: (id, amount) => id === 'water' && station.model.drink?.recipeId !== 'cacao' ? station.model.drink?.addMeasuredIngredient(id, amount) || 0 : this.session.pourIngredient(station.model.drink, id, amount),
      takeIngredient: (id, amount) => {
        const conversion = id === 'ice' ? 3 : 1;
        const available = this.tutorial ? amount : Math.floor((this.session.inventory[id] || 0) * conversion + 1e-9);
        return this.session.consumeIngredient(id, Math.min(Math.floor(amount), available) / conversion) * conversion;
      },
      acceptMixture: (mixture, consistency, source) => {
        const drink = station.model.drink;
        if (['muoi', 'cotdua', 'tratac', 'tradao', 'travai', 'cacao', 'matcha'].includes(drink?.recipeId)) return drink.acceptPreparedMixture(mixture, source);
        if (!drink || drink.consumed || drink.preparation.lid || RECIPES[drink.recipeId]?.engine !== 'gesture') return 0;
        const volume = Object.entries(mixture).reduce((sum, [id, n]) => sum + (INGREDIENT_DEFINITIONS[id].liquid || INGREDIENT_DEFINITIONS[id].foam ? n * (drink.preparation.volumePerUnit[id] || 1) : 0), 0);
        const room = drink.preparation.capacity - drink.preparation.volume;
        const ratio = volume ? Math.max(0, Math.min(1, room / volume)) : 1;
        for (const [id, n] of Object.entries(mixture)) drink.addMeasuredIngredient(id, n * ratio);
        drink.preparation.consistency = consistency;
        if (ratio > 0 && source) for (const step of RECIPES[drink.recipeId].steps) {
          const prepared = source.steps[step.action];
          if (prepared && ['blend', 'whisk', 'slice', 'squeeze'].includes(step.action)) drink.preparation.record(step.id, prepared.amount, step.target, prepared.technique);
        }
        return ratio;
      },
    });
    this.saltedCream = this.createPreparation(SaltedCreamStation, 238);
    this.coconut = this.createPreparation(CoconutBlenderStation, 238);
    this.tratac = this.createPreparation(TraTacStation, 234);
    this.tradao = this.createPreparation(TraDaoStation, 204);
    this.travai = this.createPreparation(TraVaiStation, 204);
    this.cacao = this.createPreparation(CacaoStation, 186);
    this.matcha = this.createPreparation(MatchaStation, 186);
    this.drag = new DragController(this);
    this.desktopUI = new DesktopGameView(this);
    this.relayout();
    this.onWheel = (pointer, objects, dx, dy) => {
      const p = this.drinkEngine.point(pointer), l = this.layout;
      if (!l.desktop || this.paused || this.drag.active || this.drinkEngine.active.size || p.x < l.tools.x || p.y < l.tabs.y + l.tabs.h) return;
      const count = this.tools.length || this.preparationLayouts.find(a => a.view.root.visible)?.tiles.length || 0;
      const start = this.tools.length ? l.tabs.y + l.tabs.h + 20 : l.itemGrid.y;
      const max = this.desktopUI.scrollMax || 0;
      this.toolScroll = Math.max(0, Math.min(max, this.toolScroll + dy * 0.7));
      this.renderTray();
    };
    this.input.on('wheel', this.onWheel);
    if (this.session.event) this.time.delayedCall(400, () => this.showDialogue(EVENTS[this.session.event].name, EVENTS[this.session.event].description));
    this.toast(this.tutorial ? 'Chào bạn! Kéo ly từ khay lên trạm để bắt đầu.' : 'Quán mở rồi! Chạm đơn của khách để xem lượng pha.');
    this.onVisibility = () => {
      if (document.hidden) { this.drag.cancel(); this.setPaused('hidden', true); }
      else {
        if (!this.overlay && !this.finishing) this.openPause(true);
        this.setPaused('hidden', false);
      }
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.escape = () => { if (this.overlay) this.overlay.close(); else this.openPause(); };
    this.input.keyboard?.on('keydown-ESC', this.escape);
    this.events.once('shutdown', () => {
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.input.keyboard?.off('keydown-ESC', this.escape);
      this.input.off('wheel', this.onWheel);
      this.drag.destroy(); this.saltedCream.destroy(); this.coconut.destroy(); this.tratac.destroy(); this.tradao.destroy(); this.travai.destroy(); this.cacao.destroy(); this.matcha.destroy(); this.drinkEngine.destroy();
      this.tweens.resumeAll(); this.time.paused = false;
      this.pauseReasons.clear(); this.game.save.inShift = false; this.game.audio.pause();
    });
  }
  createPreparation(Type, width) {
    const previous = new Set(this.drinkEngine.targets.keys()), view = new Type(this);
    const ids = [...this.drinkEngine.targets.keys()].filter(id => !previous.has(id));
    this.preparationLayouts.push(new PreparationLayout(this, view, ids, width));
    return view;
  }
  relayout() {
    if (!this.desktopUI) return;
    this.drag.cancel();
    const l = this.layout; this.toolScroll = 0;
    this.desktopUI.relayout();
    this.stations.forEach(s => s.relayout());
    this.selectPage(Math.floor(this.selectedStation / 2), this.selectedStation);
    this.stationButtons.forEach((b, i) => {
      b.setPosition(l.desktop ? l.board.x + l.board.w - 246 + i * 66 : this.tutorial ? 240 : 66 + i * 116, l.desktop ? l.board.y + 22 : 385)
        .resize(l.desktop ? 60 : this.tutorial ? 210 : 108, 28); b.title.setFontSize(l.desktop ? 9 : 10);
    });
    this.hint.setPosition(l.desktop ? l.board.x + (l.board.w - 60) / 2 : 211, l.desktop ? l.board.y + l.board.h - 24 : 613)
      .setColor(l.desktop ? '#d8dfc4' : '#3e5840').setWordWrapWidth(l.desktop ? l.board.w - 100 : 368).setText(''); // update() re-applies text and size
    const t = l.trash;
    this.discardArt.setPosition(l.desktop ? t.x + t.w / 2 : 441, l.desktop ? t.y + t.h / 2 : 613).setScale(l.desktop ? 0.7 : 0.58);
    this.trashZone.setPosition(l.desktop ? t.x + t.w / 2 : 441, l.desktop ? t.y + t.h / 2 : 613);
    for (const c of this.customerViews.values()) c.relayout();
    this.renderTray();
    if (this.overlay) {
      const old = this.overlay, reason = old.reason, recipe = old.recipeId, index = old.stationIndex;
      old.root.destroy(); this.overlay = new Overlay(this, reason);
      if (reason === 'book') this.overlay.book(recipe, index); else this.overlay.pause();
    }
  }
  selectPage(page, selected = page * 2) {
    if (this.paused || this.finishing) return;
    if (!this.stationManager.setPage(page)) { this.toast('Mua thêm phin trong cửa hàng sau ca nhé.'); this.game.audio.play('error'); return; }
    this.drag?.cancel(); this.selectedStation = Math.min(selected, this.stations.length - 1);
    this.stations.forEach(s => s.setVisible(this.layout?.desktop || this.stationManager.visible(s.model.id)));
    this.lockedSlot?.setVisible(!this.layout?.desktop && page === 1 && this.stations.length === 3);
  }
  showDialogue(name, text) {
    if (this.layout?.desktop) { this.toast(`${name}: ${text}`); return; }
    this.dialogue?.destroy();
    const root = this.add.container(0, 0).setDepth(65); this.dialogue = root;
    const bg = this.add.graphics(); round(bg, 11, 81, 458, 81, C.cream, 9);
    root.add([bg, label(this, 25, 95, name, 12, '#875937', { fontStyle: 'bold' }).setOrigin(0, 0.5),
      label(this, 25, 128, text, 12, '#415a43', { wordWrap: { width: 355 }, lineSpacing: 2 }).setOrigin(0, 0.5),
      button(this, 428, 121, 65, 42, 'Bỏ qua', () => { root.destroy(); if (this.dialogue === root) this.dialogue = null; }, { size: 10 })]);
    this.time.delayedCall(12000, () => { if (this.dialogue === root) { root.destroy(); this.dialogue = null; } });
  }
  get paused() { return this.pauseReasons.size > 0; }
  setPaused(reason, value) {
    this.drag?.cancel();
    if (value) this.pauseReasons.add(reason); else this.pauseReasons.delete(reason);
    if (this.paused) this.tweens.pauseAll(); else this.tweens.resumeAll();
    this.time.paused = this.paused;
    if (this.paused) this.game.audio.pause(); else this.game.audio.unlock();
  }
  openBook(recipe = 'den', stationIndex = null) {
    if (this.overlay || this.finishing) return;
    this.overlay = new Overlay(this, 'book'); this.overlay.book(recipe, stationIndex);
  }
  openPause(hidden = false) {
    if (this.overlay || this.finishing) return;
    this.overlay = new Overlay(this, 'pause'); this.overlay.pause(hidden);
  }
  setTray(id) {
    if (this.paused || this.finishing) return;
    this.drag.cancel(); this.toolScroll = 0; this.tray = id; this.renderTray();
    if (id === 'coconut') { this.toast(this.session.upgrades.blender ? 'Cối lên đế · 60 ml cốt dừa · 15 ml sữa đặc · 100 g đá · đậy nắp · giữ công tắc · rót vào ly · rót cà phê' : 'Chưa có máy xay. Mua trong cửa hàng sau ca nhé.'); return; }
    if (id === 'tratac') { this.toast('Thả 2 quả tắc lên thớt · quẹt cắt đôi · ép lấy 20 ml nước cốt · rót trà, tắc, siro · xúc đá · khuấy đều'); return; }
    if (id === 'tradao') { this.toast('Bổ cam (1 phần vắt, 1 lát trang trí) · đập dập sả · gắp đào · rót trà, siro đào, nước cam · xúc đá · gắn lát cam'); return; }
    if (id === 'travai') { this.toast('Múc 2 trái vải từ lon thả vào ly · rót 20 ml siro vải · rót 150 ml trà · xúc 90 g đá · gắn vải trang trí tùy chọn'); return; }
    if (id === 'cacao') { this.toast('Múc 15 g bột cacao (3 muỗng) · rót 30 ml nước nóng · khuấy tròn cho tan vón cục · rót 15 ml sữa đặc · 100 ml sữa tươi · xúc 90 g đá'); return; }
    if (id === 'matcha') { this.toast('Múc 4 g matcha (2 muỗng) vào chén · rót 40 ml nước ấm · đánh chổi tre chữ W tạo bọt mịn · xúc đá, rót sữa + siro · rót matcha lên trên'); return; }
    this.toast(id === 'brew' ? 'Ly → phin → muỗng vào hũ bột → nén → rót nước' : id === 'salt' ? 'Rót 40 ml kem vào tô · 2 muỗng muối · đánh tròn đến vùng xanh · kéo tô vào ly để rót' : id === 'milk' ? 'Kéo bình vào ly, di chuyển ngang để nghiêng · thả để dừng · khuấy tròn hoặc qua lại' : 'Kéo phới vào tô, đánh qua lại. Bông rồi kéo tô vào ly.');
  }
  renderTray() {
    this.saltedCream?.setVisible(this.tray === 'salt');
    this.coconut?.setVisible(this.tray === 'coconut');
    this.tratac?.setVisible(this.tray === 'tratac');
    this.tradao?.setVisible(this.tray === 'tradao');
    this.travai?.setVisible(this.tray === 'travai');
    this.cacao?.setVisible(this.tray === 'cacao');
    this.matcha?.setVisible(this.tray === 'matcha');
    this.trayRoot.removeAll(true);
    const groups = {
      brew: [['glass', 'Ly', 40], ['phin', 'Phin', 120], ['spoon', 'Muỗng', 200], ['grounds', 'Bột', 280], ['press', 'Lõi nén', 360], ['kettle', 'Ấm nước', 440]],
      milk: [['condensed', 'Sữa đặc', 56], ['milk', 'Sữa tươi', 148], ['ice', '3 viên đá', 240], ['stir', 'Khuấy', 332], ['trash', 'Bỏ ly', 424]],
      salt: [], coconut: [], tratac: [], tradao: [], travai: [], cacao: [], matcha: [],
      egg: [['bowl', 'Tô trứng', 140], ['whisk', 'Phới đánh', 280], ['trash', 'Bỏ ly', 410]],
    };
    const width = this.tray === 'brew' ? 70 : this.tray === 'milk' ? 82 : 108;
    this.tools = groups[this.tray].map(([kind, name, x]) => ({ kind, name, x, y: 715, width }));
    for (const tool of this.tools) {
      const bg = this.add.graphics(); round(bg, tool.x - width / 2, 679, width, 86, 0x46604c, 9);
      const art = toolArt(this, tool.kind, tool.x, 715).setScale(0.82);
      const name = label(this, tool.x, 751, tool.name, 11, '#e9e4c7');
      this.trayRoot.add([bg, art, name]);
      const stockId = tool.kind === 'grounds' ? 'coffee' : tool.kind === 'bowl' ? 'egg' : ['condensed', 'milk', 'ice'].includes(tool.kind) ? tool.kind : null;
      if (stockId && !this.tutorial) {
        tool.stockId = stockId;
        tool.stockLabel = label(this, tool.x + width / 2 - 10, 689, '', 9, '#fff4d5', { fontStyle: 'bold', backgroundColor: '#283d34', padding: { x: 4, y: 2 } }).setDepth(35);
        this.trayRoot.add(tool.stockLabel);
      }
    }
    this.trayFoot = label(this, 240, 784, ['salt', 'coconut', 'tratac', 'tradao', 'travai', 'cacao', 'matcha'].includes(this.tray) ? '' : this.tray === 'brew' ? 'DỤNG CỤ THẬT · CHẠM, KÉO VÀ GIỮ ĐỂ PHA' : this.tray === 'milk' ? 'THÊM MỘT CHÚT NGỌT NGÀO CHO BUỔI SÁNG' : 'BỌT TRỨNG CẦN CHUYỂN ĐỘNG · KHÔNG CHỈ GIỮ YÊN', 8, '#b2c09e', { letterSpacing: 1 });
    this.trayRoot.add(this.trayFoot);
    this.tabButtons.forEach((b, i) => b.setAlpha(this.trayIds[i] === this.tray ? 1 : 0.65));
    this.desktopUI?.tray();
    for (const adapter of this.preparationLayouts) adapter.relayout();
    this.desktopUI?.scrollbar();
  }
  toast(text) { this.toastText = text; this.toastUntil = this.visualTime + 3900; announce(text); }
  // Secondary news (goals, challenge) joins a message still on screen instead of hiding it.
  // Keeps the first message (usually the serve verdict) and drops middle ones to fit two lines.
  appendToast(text) {
    const parts = this.visualTime < this.toastUntil && this.toastText ? [...this.toastText.split('  ✦  '), text] : [text];
    while (parts.length > 2 && parts.join('  ✦  ').length > 100) parts.splice(1, 1);
    this.toast(parts.join('  ✦  '));
  }
  setLiveHint(text) { this.liveHint = text; }
  particles(x, y, color, count = 8, falling = false) {
    if (this.game.save.data.settings.reducedMotion) return;
    for (let i = 0; i < Math.min(count, 12); i++) {
      let dot = this.particlePool.find(p => !p.visible);
      if (!dot && this.particlePool.length < 32) { dot = this.add.circle(x, y, 3, color).setDepth(120); this.particlePool.push(dot); }
      if (!dot) break;
      dot.setPosition(x, y).setFillStyle(color).setAlpha(1).setScale(1).setVisible(true);
      this.tweens.add({ targets: dot, x: x + Math.cos(i * 2.4) * (15 + i * 3), y: falling ? y + 20 + i * 2 : y - 20 + Math.sin(i * 2.4) * 30, alpha: 0, scale: 0.2, duration: 500 + i * 30, ease: 'Quad.Out', onComplete: () => dot.setVisible(false) });
    }
  }
  dropIce(station) {
    if (this.game.save.data.settings.reducedMotion) return;
    station.kick = 1;
    this.particles(station.x, station.y - 12, 0xe5f6e9, 6);
    for (let i = 0; i < 3; i++) {
      const cube = this.add.graphics({ x: station.x - 12 + i * 12, y: station.y - 68 - i * 8 }).setDepth(105);
      round(cube, -6, -6, 12, 12, 0xd6ece3, 3, 0.9);
      this.tweens.add({ targets: cube, y: station.y + 9, rotation: (i - 1) * 0.3, duration: 390, delay: i * 40, ease: 'Bounce.Out', onComplete: () => {
        this.tweens.add({ targets: cube, alpha: 0, duration: 90, onComplete: () => cube.destroy() });
      } });
    }
  }
  rushBanner() {
    const banner = this.add.container(this.layout.desktop ? this.layout.width / 2 : 240, this.layout.desktop ? 96 : 174).setDepth(50);
    const bg = this.add.graphics(); round(bg, -201, -17, 402, 34, C.gold, 10);
    banner.add([bg, label(this, 0, 0, 'GIỜ CAO ĐIỂM · PHỐ MÌNH THỨC GIẤC!', 12, '#354c34', { fontStyle: 'bold' })]);
    const motion = !this.game.save.data.settings.reducedMotion;
    banner.setScale(motion ? 0.85 : 1);
    this.tweens.add({ targets: banner, scale: 1, duration: motion ? 280 : 1, ease: 'Back.Out' });
    this.tweens.add({ targets: banner, alpha: 0, delay: 2600, duration: 250, onComplete: () => banner.destroy() });
    this.game.audio.play('rush');
  }
  celebrate(x, y, result) {
    this.game.audio.play('success'); this.game.audio.play('money', 0.018);
    this.shopkeeper.drawFace('happy'); this.time.delayedCall(1700, () => this.shopkeeper.drawFace('idle'));
    const motion = !this.game.save.data.settings.reducedMotion;
    if (result.quality === 'PERFECT') this.drinkEngine.effects.perfect(x, y); else this.particles(x, y, C.gold, 8);
    // Big, readable verdict first, then the money — players learn what "Perfect" is worth.
    const [word, color] = { PERFECT: ['TUYỆT HẢO!', '#d9822b'], GOOD: ['NGON LẮM!', '#3f7a4d'], ACCEPTABLE: ['TẠM ỔN', '#8a6a45'] }[result.quality] || ['CẢM ƠN!', '#3f7a4d'];
    const verdict = label(this, x, y - 62, word, result.quality === 'PERFECT' ? 22 : 18, color, { fontStyle: 'bold', stroke: '#fff6e0', strokeThickness: 5 }).setDepth(122);
    const reward = label(this, x, y - 32, `+${money(result.total)}`, 18, '#315c3c', { fontStyle: 'bold', stroke: '#fff0ce', strokeThickness: 4 }).setDepth(121);
    const heart = label(this, x + 38, y - 10, '♥', 24, '#bb654c').setDepth(121);
    const extras = [verdict, reward, heart];
    if (result.speedBonus) extras.push(label(this, x, y - 8, `⚡ Nhanh tay +${money(result.speedBonus)}`, 11, '#7a5212', { fontStyle: 'bold', backgroundColor: '#ffe3a1', padding: { x: 6, y: 3 } }).setDepth(121));
    if (motion) { verdict.setScale(0.3); this.tweens.add({ targets: verdict, scale: 1, duration: 360, ease: 'Back.Out' }); }
    this.tweens.add({ targets: extras, y: '-=40', alpha: 0, duration: 1700, delay: 650, ease: 'Sine.Out', onComplete: () => extras.forEach(o => o.destroy()) });
    if (motion && (result.quality === 'PERFECT' || [3, 5, 10].includes(result.combo))) this.cameras.main.shake(result.combo >= 5 ? 220 : 140, result.combo >= 5 ? 0.006 : 0.003);
    if (result.bonus - (result.speedBonus || 0) > 0) {
      this.game.audio.play('combo');
      const comboBonus = result.bonus - (result.speedBonus || 0) - (result.reviewerBonus || 0);
      this.toast(result.reviewerBonus ? `Reviewer tặng 5 sao · Thưởng ${money(result.reviewerBonus)}!` : `${this.session.combo >= 10 ? 'HUYỀN THOẠI PHA PHIN' : this.session.combo >= 5 ? 'SUPER COMBO' : 'COMBO'} ×${this.session.combo} · Thưởng ${money(comboBonus)}!`);
      return true;
    }
    return false;
  }
  update(time, delta) {
    if (!this.session || this.paused || this.finishing) return;
    // A stalled frame must never consume a customer's entire patience bar.
    const seconds = Math.min(delta / 1000, 0.1); this.visualTime += seconds * 1000;
    for (const event of this.session.update(seconds)) {
      if (event.type === 'arrived') { this.customerViews.set(event.customer.id, new CustomerView(this, event.customer)); this.game.audio.play('arrive'); if (event.customer.vip) { this.showDialogue(event.customer.type.name, event.customer.type.line); this.particles(240, 175, C.gold, 12); } }
      if (event.type === 'lost') { this.toast(`${event.customer.type.name}: “${event.customer.type.angry}”`); this.game.audio.play('error'); this.shopkeeper.drawFace('angry'); this.time.delayedCall(1500, () => this.shopkeeper.drawFace('idle')); }
      if (event.type === 'end') { this.finishDay(); return; }
    }
    for (const [id, view] of this.customerViews) {
      if (!this.session.customers.includes(view.model)) { view.destroy(); this.customerViews.delete(id); }
      else view.update(this.visualTime);
    }
    if (this.session.rush && !this.wasRush) this.rushBanner();
    if (!this.tutorial && !this.closingWarned && this.session.elapsed >= RULES.lastArrival) {
      this.closingWarned = true; this.toast('09:30 · Quán ngừng đón khách mới. Phục vụ nốt những ly cuối nhé!'); this.game.audio.play('rush');
    }
    this.wasRush = this.session.rush;
    this.game.audio.ambient(seconds, this.session.rush, this.session.event);
    this.environment.update(this.visualTime);
    if (this.stationManager.models.some(m => m.drink?.state === 'BREWING') && Math.floor(this.visualTime / 750) !== this.lastDrip) { this.lastDrip = Math.floor(this.visualTime / 750); this.game.audio.play('drop'); }
    this.drag.update(seconds, this.visualTime);
    this.drinkEngine.update(seconds, this.visualTime);
    const ready = this.stationManager.update(seconds);
    for (const model of ready) {
      const station = this.stations.find(s => s.model === model);
      this.game.audio.play('ready'); if (station.visible) this.particles(station.x, station.y, C.gold, 6);
      this.toast(`Phin ${station.index + 1}: cà phê đã nhỏ xong!`);
    }
    for (const station of this.stations) {
      const active = this.drag.active;
      station.render(this.visualTime, this.drinkEngine.owners.has(station.model.id) || !!active && station.contains(active.x, active.y));
    }
    this.stationButtons.forEach((button, i) => {
      const s = this.stations[i], d = s?.model.drink;
      const timer = d?.timedSteps?.size ? [...d.timedSteps].map(id => { const step = RECIPES[d.recipeId].steps.find(s => s.id === id); return Math.ceil(step.target - (d.preparation.steps[id]?.amount || 0)); }).join('/') : null;
      const status = timer ? `${timer}s` : !s ? 'Chưa mua' : !d ? 'Trống' : d.state === 'BREWING' ? `${Math.ceil(RULES.brewSeconds - d.brewElapsed)}s` : d.state === 'BREWED' ? 'Xong ✓' : 'Đang làm';
      const short = { 'Chưa mua': '🔒', 'Trống': 'Trống', 'Đang làm': 'Làm', 'Xong ✓': '✓' }[status] ?? status;
      button.title.setText(this.layout?.desktop ? `P${i + 1} ${short}` : `P${i + 1} · ${status}`); button.setAlpha(s?.visible ? 1 : 0.65);
    });
    if (this.session.challenge.complete && !this.challengeCelebrated) {
      this.challengeCelebrated = true; this.appendToast('Xong thử thách! Thưởng chốt cuối ca.'); this.particles(240, 140, C.gold, 12); this.game.audio.play('combo');
    }
    this.shopkeeper.update(this.visualTime);
    this.streetArt?.updateArt?.(this.visualTime, this.game.save.data.settings.reducedMotion);
    this.hud.update();
    for (const adapter of this.preparationLayouts) adapter.render();
    this.trayDetail.clear();
    for (const tool of this.tools) if (tool.stockLabel) {
      const amount = this.session.inventory[tool.stockId];
      const shown = Number.isInteger(amount) ? amount : amount.toFixed(1);
      const warningAt = { coffee: 0.5, condensed: 1, milk: 2, egg: 1, ice: 1 }[tool.stockId];
      const low = amount + 1e-9 < warningAt;
      tool.stockLabel.setText(`×${shown}`).setColor(low ? '#ffd0bd' : '#fff4d5').setBackgroundColor(low ? '#8b493a' : '#283d34');
    }
    if (this.tray === 'brew' && this.drag.spoonLoaded) {
      const spoon = this.tools.find(t => t.kind === 'spoon');
      this.trayDetail.fillStyle(C.coffee); this.trayDetail.fillEllipse(this.layout.desktop ? spoon.x + 11 : 211, this.layout.desktop ? spoon.y - 16 : 699, 10, 11);
    }
    if (this.tray === 'egg') {
      const progress = this.drag.whiskProgress / RULES.whiskDistance;
      const bowl = this.tools.find(t => t.kind === 'bowl'), bx = this.layout.desktop ? bowl.x - 40 : 100, by = this.layout.desktop ? bowl.y + 34 : 766;
      round(this.trayDetail, bx, by, 80, 4, 0x223d2e, 2);
      round(this.trayDetail, bx, by, Math.max(1, 80 * progress), 4, C.gold, 2);
      for (let i = 0; i < Math.floor(progress * 10); i++) {
        this.trayDetail.fillStyle(0xffdf92); this.trayDetail.fillCircle((this.layout.desktop ? bowl.x - 17 : 123) + (i % 5) * 8, (this.layout.desktop ? bowl.y - 9 : 706) - Math.floor(i / 5) * 6, 4);
      }
    }
    const selected = this.stations[this.selectedStation]?.model;
    const fallback = selected?.drink?.nextStep(selected?.modifiers) || 'Kéo ly từ khay lên trạm. Chạm đơn khách để chọn gợi ý.';
    const hint = this.liveHint || (this.visualTime < this.toastUntil ? this.toastText : this.layout.desktop ? '' : fallback);
    if (hint !== this.hint.text) this.hint.setText(hint).setFontSize(this.layout.desktop ? (hint.length > 100 ? 12 : 14) : hint.length > 150 ? 9.5 : hint.length > 95 ? 10.5 : 12);
  }
  finishDay() {
    if (this.finishing) return;
    this.finishing = true; this.drag.cancel();
    const summary = this.session.summary(); this.game.save.completeDay(summary);
    this.scene.start('Summary', summary);
  }
}
export class TutorialScene extends GameScene {
  constructor() { super('Tutorial'); }
}
