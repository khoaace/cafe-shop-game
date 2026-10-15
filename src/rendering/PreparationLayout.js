import { toolCell } from '../logic/layout.js';
import { round } from './primitives.js';

// Keep preparation models and their local animation coordinates intact, while
// arranging the preparation surface and the individual ingredient cards separately.
export class PreparationLayout {
  constructor(scene, view, targetIds, width) {
    this.scene = scene; this.view = view; this.width = width; this.scale = 1;
    this.offset = { x: 0, y: 0 };
    this.original = [...view.root.list];
    this.tiles = view.tiles;
    this.details = [view.stockLine, view.priceLine, view.warnLine].filter(Boolean);
    this.detailBase = new Map(this.details.map(o => [o, { x: o.x, y: o.y, font: o.style.fontSize }]));
    this.parts = this.tiles.flatMap(t => [t.art, t.name, t.badge, t.stock].filter(Boolean));
    this.base = new Map(this.parts.map(o => [o, { x: o.x, y: o.y, sx: o.scaleX, sy: o.scaleY, font: o.style?.fontSize }]));
    this.stage = scene.add.container(0, 0); view.root.add(this.stage);
    this.cards = scene.add.graphics(); view.root.addAt(this.cards, 0);
    this.maskShape = scene.make.graphics({ add: false }); this.mask = this.maskShape.createGeometryMask();
    this.gridShape = scene.make.graphics({ add: false }); this.gridMask = this.gridShape.createGeometryMask();
    this.stageObjects = this.original.filter(o => !this.parts.includes(o) && !this.details.includes(o) && o !== view.fxArt && o !== view.locked);
    const tools = [...scene.drinkEngine.tools.values()].filter(t => this.original.includes(t.object));
    for (const tool of tools) {
      if (this.stageObjects.includes(tool.object) && tool.release) {
        const release = tool.release;
        tool.release = args => release({ ...args, point: this.toLocal(args.point) });
      }
    }
    for (const id of targetIds) {
      const target = scene.drinkEngine.targets.get(id), contains = target.contains, center = target.center, pourPoint = target.pourPoint;
      const radius = target.radius;
      if (target.onChange) {
        const changed = target.onChange;
        target.onChange = (...args) => { const fx = scene.drinkEngine.effects, previous = fx.layoutSpace; fx.layoutSpace = this; try { return changed(...args); } finally { fx.layoutSpace = previous; } };
      }
      target.contains = (x, y) => { const p = this.toLocal({ x, y }); return contains(p.x, p.y); };
      target.center = () => this.toWorld(center());
      target.gesturePoint = p => this.toLocal(p);
      target.gestureCenter = center;
      target.interactionScale = () => this.scale;
      if (pourPoint) target.pourPoint = () => this.toWorld(pourPoint());
      Object.defineProperty(target, 'radius', { get: () => radius * this.scale });
    }
    // Falling ingredients use world coordinates, unlike the physical prep surface.
    if (view.fxArt) for (const name of ['spawnDustBurst', 'spawnFallingPowder', 'spawnAroma', 'spawnDroplets']) {
      if (!view[name]) continue;
      const original = view[name].bind(view);
      view[name] = (x, y, value) => {
        if (this.scene.layout.desktop && x <= this.width && y >= 674) {
          const p = this.toWorld({ x, y });
          return original(p.x, p.y, name === 'spawnFallingPowder' ? this.toWorld({ x, y: value }).y : value);
        }
        return original(x, y, value);
      };
    }
    view.root.once('destroy', () => { this.mask.destroy(); this.maskShape.destroy(); this.gridMask.destroy(); this.gridShape.destroy(); });
  }
  toLocal(p) { return { ...p, x: (p.x - this.offset.x) / this.scale, y: (p.y - this.offset.y) / this.scale }; }
  toWorld(p) { return { ...p, x: p.x * this.scale + this.offset.x, y: p.y * this.scale + this.offset.y, ...(p.radius ? { radius: p.radius * this.scale } : {}) }; }
  relayout() {
    const layout = this.scene.layout;
    this.cards.clear(); this.maskShape.clear(); this.gridShape.clear();
    if (!layout.desktop) {
      this.scale = 1; this.offset = { x: 0, y: 0 }; this.view.root.add(this.original);
      this.view.panel.clearMask(); this.cards.clearMask();
      for (const o of this.parts) { o.clearMask(); o.desktopMask = null; o.layoutClip = null; }
      if (this.view.locked) this.view.locked.setPosition(240, 734);
      for (const [o, b] of this.detailBase) o.setPosition(b.x, b.y).setFontSize(b.font).setWordWrapWidth(0).setVisible(true); this.stage.setPosition(0, 0).setScale(1);
      for (const [o, b] of this.base) { o.setPosition(b.x, b.y).setScale(b.sx, b.sy); if (b.font) o.setFontSize(b.font); }
    } else {
      const r = layout.preparation;
      this.scale = Math.min(r.w / this.width, r.h / 120);
      this.offset = { x: r.x + (r.w - this.width * this.scale) / 2, y: r.y - 674 * this.scale };
      this.stage.add(this.stageObjects).setPosition(this.offset.x, this.offset.y).setScale(this.scale);
      this.maskShape.fillStyle(0xffffff).fillRect(this.offset.x, r.y - 2, this.width * this.scale, r.h + 4);
      this.view.panel.setMask(this.mask);
      const clip = { x: layout.itemGrid.x, y: layout.itemGrid.y, w: layout.itemGrid.w, h: Math.max(1, layout.tools.y + layout.tools.h - 12 - layout.itemGrid.y) };
      this.gridShape.fillStyle(0xffffff).fillRect(clip.x, clip.y, clip.w, clip.h);
      this.cards.setMask(this.gridMask);
      for (const o of this.parts) { o.setMask(this.gridMask); o.desktopMask = this.gridMask; o.layoutClip = clip; }
      this.tiles.forEach((tile, i) => {
        const cell = toolCell(layout, i, this.tiles.length, true, this.scene.toolScroll || 0);
        tile.desktopCell = cell;
        const center = cell.x + cell.w / 2;
        tile.art.setPosition(center, cell.y + cell.h * 0.28).setScale(Math.min(1.2, (cell.h - 55) / 66));
        tile.name.setPosition(center, cell.y + cell.h - 43).setScale(1).setFontSize(14);
        tile.badge.setPosition(center, cell.y + cell.h - 18).setScale(1).setFontSize(13);
        if (tile.stock) tile.stock.setPosition(cell.x + cell.w - 8, cell.y + 13).setFontSize(12);
      });
      for (const detail of this.details) this.view.root.bringToTop(detail);
      if (this.view.stockLine) this.view.stockLine.setPosition(layout.tools.x + layout.tools.w / 2, r.y + r.h - 24).setFontSize(11).setWordWrapWidth(r.w);
      if (this.view.priceLine) this.view.priceLine.setVisible(false);
      if (this.view.warnLine) this.view.warnLine.setPosition(layout.tools.x + layout.tools.w / 2, r.y + r.h - 7).setFontSize(11).setWordWrapWidth(r.w);
      if (this.view.locked) this.view.locked.setPosition(layout.tools.x + layout.tools.w / 2, layout.preparation.y + 70).setWordWrapWidth(layout.tools.w - 40);
    }
    for (const tool of this.scene.drinkEngine.tools.values()) if (this.parts.includes(tool.object)) {
      Object.assign(tool.home, { x: tool.object.x, y: tool.object.y, scaleX: tool.object.scaleX, scaleY: tool.object.scaleY });
      tool.layoutHitScale = layout.desktop ? 1.6 : 1;
    }
  }
  render() {
    this.cards.clear(); if (!this.scene.layout.desktop || !this.view.root.visible) return;
    for (const tile of this.tiles) {
      const c = tile.desktopCell, active = tile.badge.style.color === '#ffe2a6';
      round(this.cards, c.x, c.y, c.w, c.h, active ? 0x52704f : 0x3d5c4a, 12);
      if (active) this.cards.lineStyle(1.5, 0xe8b46b, 0.9).strokeRoundedRect(c.x, c.y, c.w, c.h, 12);
      round(this.cards, c.x + 8, c.y + c.h - 29, c.w - 16, 23, active ? 0x7a5a2c : 0x294638, 8);
    }
  }
}
