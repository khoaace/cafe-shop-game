import { label, round, toolArt } from './art.js';
import { worldImage } from './worldAssets.js';
import { seatPosition, toolCell } from '../logic/layout.js';

export class DesktopGameView {
  constructor(scene) {
    this.scene = scene;
    this.clipShape = scene.make.graphics({ add: false }); this.clip = this.clipShape.createGeometryMask();
    scene.events.once('shutdown', () => { this.clip.destroy(); this.clipShape.destroy(); });
    this.scrollTrack = scene.add.graphics().setDepth(60);
    this.background = scene.add.graphics().setDepth(-2);
    this.street = scene.add.container(0, 0).setDepth(-1);
    this.facade = scene.add.tileSprite(0, 0, 1, 1, 'world-facade', 'main').setOrigin(0); this.street.add(this.facade);
    this.pavement = scene.add.tileSprite(0, 0, 1, 1, 'world-pavement', 'main').setOrigin(0); this.street.add(this.pavement);
    this.awning = scene.add.tileSprite(0, 0, 1, 1, 'world-awning', 'main').setOrigin(0); this.street.add(this.awning);
    this.stools = Array.from({ length: 6 }, () => worldImage(scene, 'stool', 'main')); this.street.add(this.stools);
    this.boardTitle = label(scene, 0, 0, 'BÀN PHA', 15, '#e4dfbf', { fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0, 0.5).setDepth(3);
    this.toolsTitle = label(scene, 0, 0, 'NGUYÊN LIỆU & DỤNG CỤ', 15, '#e4dfbf', { fontStyle: 'bold', letterSpacing: 1 }).setOrigin(0, 0.5).setDepth(3);
  }
  relayout() {
    const s = this.scene, l = s.layout, show = l.desktop;
    for (const o of [this.background, this.street, this.boardTitle, this.toolsTitle]) o.setVisible(show);
    s.streetArt.setVisible(!show); s.environment.static.setVisible(!show); s.environment.moving.setVisible(!show);
    s.hud.relayout();
    if (!show) { s.shopkeeper.root.setPosition(448, 344).setScale(0.48); return; }
    const g = this.background; g.clear().fillStyle(0x203b31).fillRect(0, 0, l.width, l.height);
    round(g, l.board.x, l.board.y, l.board.w, l.board.h, 0x365447, 18);
    round(g, l.tools.x, l.tools.y, l.tools.w, l.tools.h, 0x2d493b, 18);
    this.boardTitle.setPosition(l.board.x + 20, l.board.y + 23);
    this.toolsTitle.setPosition(l.tools.x + 18, l.tools.y + 23);
    const r = l.customers;
    this.facade.setPosition(r.x, r.y).setSize(r.w, r.h).setTileScale(0.52);
    this.pavement.setPosition(r.x, r.y + r.h - 64).setSize(r.w, 64).setTileScale(0.55);
    this.awning.setPosition(r.x, r.y).setSize(r.w, 35).setTileScale(0.36);
    this.stools.forEach((o, i) => { const p = seatPosition(i, s.session.upgrades.seats, l); o.setPosition(p.x, p.y + 27).setDisplaySize(54, 42).setVisible(i < s.session.upgrades.seats); });
    s.shopkeeper.root.setPosition(r.x + r.w - 28, r.y + r.h - 25).setScale(0.4);
  }
  scrollbar() {
    const s = this.scene, l = s.layout; this.scrollTrack.clear(); this.scrollMax = 0;
    if (!l.desktop) return;
    const adapter = s.preparationLayouts.find(a => a.view.root.visible), count = s.tools.length || adapter?.tiles.length || 0;
    if (!count) return;
    const last = toolCell(l, count - 1, count, !s.tools.length, 0), top = s.tools.length ? l.tabs.y + l.tabs.h + 20 : l.itemGrid.y;
    const bottom = l.tools.y + l.tools.h - 12;
    this.scrollMax = Math.max(0, last.y + last.h - bottom);
    this.toolsTitle.setText(this.scrollMax ? 'NGUYÊN LIỆU & DỤNG CỤ  ↕' : 'NGUYÊN LIỆU & DỤNG CỤ');
    if (!this.scrollMax) return;
    const x = l.tools.x + l.tools.w - 7, h = bottom - top;
    round(this.scrollTrack, x, top, 3, h, 0x1d362b, 2);
    const handle = Math.max(25, h * h / (h + this.scrollMax));
    round(this.scrollTrack, x, top + (h - handle) * (s.toolScroll || 0) / this.scrollMax, 3, handle, 0xb5c5a4, 2);
  }
  tray() {
    const s = this.scene, l = s.layout;
    s.tabButtons.forEach((b, i) => {
      const w = l.desktop ? (l.tabs.w - 24) / 5 : 45.5;
      b.setPosition(l.desktop ? l.tabs.x + i % 5 * (w + 6) + w / 2 : 25.8 + i * 47.6, l.desktop ? l.tabs.y + Math.floor(i / 5) * 44 + 20 : 656)
        .resize(w, l.desktop ? 38 : 32); b.title.setFontSize(l.desktop ? 12 : 6.8);
    });
    if (!l.desktop) { s.trayRoot.clearMask(); s.trayDetail.clearMask(); return; }
    const clipTop = l.tabs.y + l.tabs.h + 18;
    this.clipShape.clear().fillStyle(0xffffff).fillRect(l.tools.x + 10, clipTop, l.tools.w - 20, l.tools.y + l.tools.h - 12 - clipTop);
    s.trayRoot.setMask(this.clip); s.trayDetail.setMask(this.clip);
    s.trayRoot.removeAll(true);
    const items = s.tools;
    for (let i = 0; i < items.length; i++) {
      const t = items[i], c = toolCell(l, i, items.length, false, s.toolScroll || 0);
      t.x = c.x + c.w / 2; t.y = c.y + c.h * 0.46; t.width = c.w; t.bounds = c;
      const bg = s.add.graphics(); round(bg, c.x, c.y, c.w, c.h, 0x3d5c4a, 12);
      const art = toolArt(s, t.kind, t.x, t.y).setScale(1.15);
      const name = label(s, t.x, c.y + c.h - 21, t.name, 15, '#e9e4c7', { fontStyle: 'bold' });
      s.trayRoot.add([bg, art, name]);
      if (t.stockId && !s.tutorial) { t.stockLabel = label(s, c.x + c.w - 8, c.y + 14, '', 12, '#fff4d5').setOrigin(1, 0.5); s.trayRoot.add(t.stockLabel); }
    }
  }
}
