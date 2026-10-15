import { pointerToWorld } from '../rendering/resolution.js';
import { LiquidPourSystem } from './preparation/LiquidPourSystem.js';
import { WhiskSystem } from './preparation/WhiskSystem.js';
import { StirringSystem } from './preparation/StirringSystem.js';
import { PreparationState } from '../models/PreparationState.js';
import { GestureTracker } from './GestureTracker.js';
import { toolArt, createCupArt, round, line } from '../rendering/art.js';
import { RULES, RECIPES, COLORS as C } from '../config.js';

export class DragController {
  constructor(scene) {
    this.scene = scene; this.active = null; this.spoonLoaded = 0; this.whiskProgress = 0;
    this.whiskEggLoaded = false;
    this.pourSystem = new LiquidPourSystem(); this.whiskSystem = new WhiskSystem(); this.stirSystem = new StirringSystem();
    this.whiskState = new PreparationState('egg-bowl');
    this.effects = scene.add.graphics().setDepth(110);
    this.down = this.onDown.bind(this); this.move = this.onMove.bind(this); this.up = this.onUp.bind(this);
    scene.input.on('pointerdown', this.down);
    scene.input.on('pointermove', this.move);
    scene.input.on('pointerup', this.up);
    scene.input.on('pointerupoutside', this.up);
    this.cancelEvent = () => this.cancel();
    scene.game.canvas.addEventListener('pointercancel', this.cancelEvent);
    scene.game.canvas.addEventListener('touchcancel', this.cancelEvent);
    scene.scale.on('resize', this.cancelEvent);
  }
  stationAt(x, y) { return this.scene.stations.find(s => !this.scene.drinkEngine.owners.has(s.model.id) && s.contains(x, y)); }
  onDown(pointer) {
    const scene = this.scene;
    if (scene.paused || scene.finishing) return;
    if (scene.drinkEngine.down(pointer)) return;
    if (this.active) return;
    scene.game.audio.unlock();
    const { x, y } = pointerToWorld(pointer, scene.cameras.main);
    // Customer bubbles are also shortcuts to the correct quantity guide.
    const customer = [...scene.customerViews.values()].find(c => c.contains(x, y));
    if (customer) {
      const free = scene.stations.find(s => s.visible && !s.model.drink) || scene.stations[scene.selectedStation];
      free.model.chooseRecipe(customer.model.recipeId, customer.model.modifiers); scene.selectedStation = free.index;
      scene.showDialogue(customer.model.type.name, customer.model.type.line);
      scene.game.audio.play('talk');
      return;
    }
    const station = this.stationAt(x, y);
    if (station && station.model.drink && Math.abs(x - station.x) < 65 && (scene.layout?.desktop ? Math.abs(y - station.y) < 80 : y < 551)) {
      this.start('cup', pointer, station); return;
    }
    const tool = scene.tools.find(item => scene.layout?.desktop ? x >= item.bounds.x && x <= item.bounds.x + item.bounds.w && y >= item.bounds.y && y <= item.bounds.y + item.bounds.h && y >= scene.layout.tabs.y + scene.layout.tabs.h && y <= scene.layout.tools.y + scene.layout.tools.h : Math.abs(x - item.x) <= item.width / 2 && y >= 675 && y <= 768);
    if (!tool) return;
    if (tool.kind === 'grounds') { scene.toast('Kéo muỗng vào hũ để xúc bột, rồi kéo tới phin.'); scene.game.audio.play('grounds'); return; }
    if (tool.kind === 'trash') { scene.toast('Kéo ly cần bỏ vào thùng ở cạnh bàn.'); scene.game.audio.play('trash'); return; }
    this.start(tool.kind, pointer, null, tool);
  }
  start(kind, pointer, station = null, tool = null) {
    const scene = this.scene;
    const point = pointerToWorld(pointer, scene.cameras.main);
    this.active = { kind, pointerId: pointer.id, x: point.x, y: point.y, originX: point.x, originY: point.y,
      source: station, tool, tracker: new GestureTracker(), waterStation: null, lastStation: null,
      loaded: kind === 'spoon' ? this.spoonLoaded : 0, worked: false, toastAt: 0 };
    const shadow = scene.add.ellipse(point.x + 4, point.y + 27, 58, 15, C.dark, 0.18).setDepth(98);
    const proxy = kind === 'cup' ? createCupArt(scene, station.model.drink) : toolArt(scene, kind);
    proxy.setPosition(point.x, point.y).setDepth(100).setScale(scene.layout?.desktop ? station?.geometry.cupScale || 1.15 : 1.08);
    this.pourSystem.begin(pointer.id, point, { rate: kind === 'kettle' ? RULES.waterRate : RULES.milkRate, initialTilt: 1 });
    this.active.proxy = proxy; this.active.shadow = shadow;
    if (station) { station.draggingCup = true; scene.selectedStation = station.index; }
    scene.game.audio.play(kind === 'glass' || kind === 'cup' ? 'glass' : kind === 'phin' ? 'phin' : 'pickup'); this.onMove(pointer);
  }
  onMove(pointer) {
    if (this.scene.drinkEngine.move(pointer)) return;
    const a = this.active; if (!a || pointer.id !== a.pointerId || this.scene.paused) return;
    const point = pointerToWorld(pointer, this.scene.cameras.main); a.x = point.x; a.y = point.y;
    a.proxy.setPosition(a.x, a.y - (a.kind === 'cup' ? 5 : 0)); a.shadow.setPosition(a.x + 3, a.y + 29);
    const station = this.stationAt(a.x, a.y);
    if (a.lastStation !== station) {
      a.tracker.reset(); this.stirSystem.end(pointer.id); this.whiskSystem.end(pointer.id); a.lastStation = station;
      if (station) this.pourSystem.begin(pointer.id, { x: station.x, y: point.y }, { rate: a.kind === 'kettle' ? RULES.waterRate : RULES.milkRate, initialTilt: 1 });
    }
    this.pourSystem.move(pointer.id, point);
    const grounds = this.scene.tools.find(t => t.kind === 'grounds'), bowl = this.scene.tools.find(t => t.kind === 'bowl');
    if (a.kind === 'spoon' && grounds && Math.abs(a.x - grounds.x) < 36 && Math.abs(a.y - grounds.y - 2) < 45 && this.scene.tray === 'brew' && !a.loaded) {
      const recipe = RECIPES[this.scene.stations[this.scene.selectedStation].model.recipeId];
      if (this.scene.tutorial || this.scene.session.inventory.coffee + 1e-9 >= recipe.coffee) {
        a.loaded = recipe.coffee; this.spoonLoaded = a.loaded;
        this.scene.toast(`Đã xúc ${a.loaded === 0.5 ? '½' : '1'} muỗng bột. Kéo đến phin.`);
        this.scene.game.audio.play('grounds');
      } else if (this.scene.visualTime >= a.toastAt) {
        a.toastAt = this.scene.visualTime + 1200; this.scene.toast('Hết bột cà phê. Ca sau ghé cửa hàng nhập thêm nhé.'); this.scene.game.audio.play('error');
      }
    }
    if (a.kind === 'whisk' && this.scene.tray === 'egg' && bowl && Math.abs(a.x - bowl.x) < 64 && Math.abs(a.y - bowl.y) < 48) {
      const amount = this.whiskSystem.move(pointer.id, this.whiskState, { x: a.x, y: a.y, time: performance.now() }, { x: bowl.x, y: bowl.y, radius: 64 }, RULES.whiskDistance);
      const before = this.whiskProgress;
      if (amount > 0 && !this.whiskEggLoaded) {
        const egg = this.scene.session.consumeIngredient('egg', 1);
        if (egg > 0) this.whiskEggLoaded = true;
        else { this.whiskState.steps = {}; this.whiskState.foam = 0; this.whiskSystem.end(pointer.id); a.tracker.reset(); if (this.scene.visualTime >= a.toastAt) { a.toastAt = this.scene.visualTime + 1200; this.scene.toast('Hết trứng rồi. Tô chưa thể đánh bọt.'); this.scene.game.audio.play('error'); } }
      }
      const progress = this.whiskEggLoaded ? amount : 0;
      this.whiskProgress = Math.min(RULES.whiskDistance, this.whiskProgress + progress);
      a.worked ||= progress > 0; a.proxy.rotation = Math.sin(a.x * 0.1) * 0.5;
      if (progress) this.scene.game.audio.play('whisk');
      if (before < RULES.whiskDistance && this.whiskProgress >= RULES.whiskDistance) this.scene.game.audio.play('done');
    } else if (a.kind === 'whisk') { a.tracker.reset(); this.whiskSystem.end(pointer.id); }
    if (a.kind === 'stir' && station?.model.drink) {
      const d = station.model.drink;
      const canStirTraTac = d.recipeId === 'tratac' && ((d.preparation.amounts.tea || 0) > 0 || (d.preparation.amounts.citrusJuice || 0) > 0 || (d.preparation.amounts.syrup || 0) > 0);
      if (!canStirTraTac && (d.state !== 'BREWED' || d.milk + d.condensed <= 0)) { this.stirSystem.end(pointer.id); return; }
      d.preparation.steps.stir = { amount: d.stir, technique: 1 };
      const amount = this.stirSystem.move(pointer.id, d.preparation, { x: a.x, y: a.y, time: performance.now() }, { x: station.x, y: station.y, radius: 61 }, RULES.stirRadians);
      const before = station.model.drink.stir;
      if (station.model.drink.stirBy(amount) && amount > 0) {
        a.worked = true; a.proxy.rotation = Math.atan2(a.y - station.y, a.x - station.x) + Math.PI / 3;
        this.scene.game.audio.play('stir');
        if (before < RULES.stirRadians && station.model.drink.stir >= RULES.stirRadians) { this.scene.toast('Khuấy đều rồi! Kéo ly đến khách nhé.'); this.scene.game.audio.play('done'); }
      }
    }
  }
  update(seconds, t) {
    const a = this.active; this.effects.clear(); if (!a) return;
    const station = this.stationAt(a.x, a.y); const drink = station?.model.drink;
    if (a.kind === 'cup') { a.proxy.paint(a.source.model.drink, t); }
    if (a.kind === 'spoon' && a.loaded) {
      this.effects.fillStyle(C.coffee); this.effects.fillEllipse(a.x + 15, a.y - 20, 12, 13);
    }
    if (a.waterStation && a.waterStation !== station) this.finishWater();
    if (a.kind === 'kettle' && drink) {
      const poured = this.pourSystem.update(a.pointerId, seconds, station, n => { const before = drink.water; drink.pourWater(n / RULES.waterRate); return drink.water - before; });
      if (poured > 0) {
        a.waterStation = station; a.worked = true; a.proxy.rotation = -0.65 * (this.pourSystem.sessions.get(a.pointerId)?.tilt || 0);
        a.proxy.setPosition(station.x + 44, station.y - 73); a.shadow.setPosition(station.x + 44, station.y + 28);
        this.stream(a, station, 0xd0e6d6, t, 2); this.scene.game.audio.play('pour');
        const target = RECIPES[station.model.recipeId].water;
        this.scene.setLiveHint(`Nước ${Math.round(drink.water * 100)}%  /  mục tiêu ${target * 100}% · thả tay để ủ phin`);
      }
    } else if (a.kind === 'press' && drink) {
      const was = drink.state;
      if (drink.compress(seconds)) {
        a.worked = true; a.proxy.y = station.y - 60 + drink.press / RULES.pressSeconds * 10;
        this.scene.game.audio.play('press');
        if (was !== drink.state) { this.scene.toast('Phin nén vừa rồi. Kéo ấm để rót nước.'); this.scene.game.audio.play('lock'); }
      }
    } else if ((a.kind === 'condensed' || a.kind === 'milk') && drink) {
      const poured = this.pourSystem.update(a.pointerId, seconds, station, n => this.scene.session.pourIngredient(drink, a.kind, n));
      if (!poured) {
        if ((this.pourSystem.sessions.get(a.pointerId)?.tilt || 0) < 0.15) { this.scene.setLiveHint('Di chuyển bình sang phải để nghiêng và rót.'); return; }
        if (this.scene.visualTime >= a.toastAt) { a.toastAt = this.scene.visualTime + 1200; this.scene.toast(drink.recipeId === 'cotdua' ? 'Cà phê cốt dừa: sữa đặc rót vào máy xay ở khay 05.' : `Hết ${a.kind === 'milk' ? 'sữa tươi' : 'sữa đặc'} rồi!`); this.scene.game.audio.play('error'); }
        return;
      }
      a.worked = true; a.proxy.rotation = -0.65 * (this.pourSystem.sessions.get(a.pointerId)?.tilt || 0);
      a.proxy.setPosition(station.x + 30, station.y - 58); a.shadow.setPosition(station.x + 30, station.y + 28);
      this.stream(a, station, a.kind === 'milk' ? 0xf9efd3 : 0xe8d59e, t, a.kind === 'milk' ? 3 : 5);
      this.scene.game.audio.play(a.kind === 'milk' ? 'milk' : 'condensed');
      const target = RECIPES[station.model.recipeId][a.kind];
      this.scene.setLiveHint(`${a.kind === 'milk' ? 'Sữa tươi' : 'Sữa đặc'}: ${drink[a.kind].toFixed(1)} / ${target} phần${drink[a.kind] > target * 1.3 ? ' · Hơi nhiều sữa!' : ' · thả tay để dừng'}`);
    }
    if (a.kind === 'whisk') {
      const percent = Math.round(this.whiskProgress / RULES.whiskDistance * 100);
      this.scene.setLiveHint(percent >= 100 ? 'Bọt bông rồi! Thả phới, kéo tô trứng đến ly.' : `Đánh trứng ${percent}% · di chuyển phới qua lại trong tô`);
    }
    if (a.kind === 'stir' && drink) {
      this.scene.setLiveHint(drink.recipeId !== 'tratac' && drink.state !== 'BREWED' ? 'Chờ phin nhỏ xong rồi khuấy nhé.' : `Khuấy ${Math.round(drink.stir / RULES.stirRadians * 100)}% · vẽ vòng tròn quanh tâm ly`);
    }
  }
  stream(a, station, color, t, width) {
    // Visual spout follows the illustration; gesture ownership stays at a.x/a.y.
    const localX = a.kind === 'kettle' ? -39 : -20, localY = a.kind === 'kettle' ? -19 : -24;
    const rotation = a.proxy.rotation, scale = a.proxy.scaleX;
    const sx = a.proxy.x + (localX * Math.cos(rotation) - localY * Math.sin(rotation)) * scale;
    const sy = a.proxy.y + (localX * Math.sin(rotation) + localY * Math.cos(rotation)) * scale;
    const end = [station.x + Math.sin(t * 0.02), station.y - (a.kind === 'kettle' ? 53 : 25)];
    line(this.effects, [[sx, sy], end], color, width, 0.9);
    line(this.effects, [[sx - 0.5, sy], [end[0] - 0.5, end[1]]], 0xfffbea, Math.max(0.6, width * 0.24), 0.5);
  }
  finishWater() {
    const station = this.active?.waterStation; if (!station) return;
    const d = station.model.drink;
    if (d?.finishWater()) {
      const error = Math.abs(d.water / RECIPES[station.model.recipeId].water - 1);
      this.scene.game.audio.play(error <= 0.15 ? 'perfect' : error <= 0.35 ? 'good' : 'miss');
      this.scene.toast(error <= 0.15 ? 'PERFECT · Chuẩn lượng nước! Phin bắt đầu nhỏ.' : error <= 0.35 ? 'GOOD · Phin đang nhỏ. Có thể chuẩn bị ly khác.' : 'BAD · Lượng nước hơi lệch. Ly vẫn pha được nhé.');
    }
    this.active.waterStation = null;
  }
  onUp(pointer) {
    if (this.scene.drinkEngine.up(pointer)) return;
    const a = this.active; if (!a || pointer.id !== a.pointerId) return;
    if (pointer.wasCanceled || this.scene.paused) { this.cancel(); return; }
    const point = pointerToWorld(pointer, this.scene.cameras.main); a.x = point.x; a.y = point.y;
    const scene = this.scene; const station = this.stationAt(a.x, a.y); const drink = station?.model.drink;
    let ok = false;
    if (a.kind === 'cup') {
      const trash = scene.layout?.trash || { x: 406, y: 589, w: 74, h: 48 };
      if (a.x >= trash.x && a.x <= trash.x + trash.w && a.y >= trash.y && a.y <= trash.y + trash.h) {
        scene.session.recordDrinkWaste(a.source.model.drink); a.source.model.discard(); scene.toast('Đã dọn ly. Bắt đầu lại thật thong thả nhé.'); scene.game.audio.play('trash'); a.heard = true; ok = true;
      } else {
        const target = [...scene.customerViews.values()].find(view => view.contains(a.x, a.y));
        if (target) {
          const result = scene.session.serve(target.model, a.source.model.drink);
          scene.toast(result.message || 'Khách đã rời quán.');
          if (result.valid) {
            scene.celebrate(target.x, target.y + 20, result);
            if (result.story) scene.showDialogue(result.story.name, result.story.text);
            if (!result.bonus) scene.toast(`${result.message} ${target.model.type.happy}`);
            a.source.model.discard(); a.heard = true; ok = true;
          } else { scene.game.audio.play('error'); a.heard = true; target.feedbackUntil = scene.visualTime + 1400; scene.shopkeeper.drawFace('angry'); scene.time.delayedCall(1400, () => scene.shopkeeper.drawFace('idle')); }
        } else if (station && station !== a.source && !station.model.drink) {
          const prevMods = a.source.model.modifiers;
          station.model.drink = a.source.model.discard(); station.model.chooseRecipe(station.model.drink.recipeId, prevMods); scene.game.audio.play('place'); a.heard = true; ok = true;
        }
      }
    } else if (a.kind === 'glass') {
      ok = station?.model.placeGlass() || false;
      if (ok) { scene.game.audio.play('glass'); a.heard = true; }
      else scene.toast('Kéo ly đến một trạm pha còn trống.');
    } else if (a.kind === 'phin') {
      ok = drink?.placePhin() || false;
      if (ok) { scene.game.audio.play('phin'); a.heard = true; }
      else scene.toast(drink ? 'Trạm này đã có phin rồi.' : 'Đặt ly lên trạm trước nhé.');
    } else if (a.kind === 'spoon') {
      if (a.loaded && scene.session.addGrounds(drink, a.loaded) > 0) {
        this.spoonLoaded = 0; ok = true; a.heard = true; scene.particles(station.x, station.y - 60, C.coffee, 9, true); scene.game.audio.play('grounds');
      } else if (!a.loaded) scene.toast('Muỗng chưa có bột. Kéo vào hũ cà phê trước.');
      else if (station) scene.toast('Đặt phin trước, thêm bột trước khi nén nhé.');
    } else if (a.kind === 'ice') {
      ok = scene.session.addIce(drink);
      if (ok) { scene.dropIce(station); scene.game.audio.play('ice'); a.heard = true; }
      else scene.toast(drink?.recipeId === 'cotdua' ? 'Cà phê cốt dừa: đá cho vào máy xay ở khay 05.' : drink ? 'Hết đá rồi. Ca sau nhập thêm trong cửa hàng nhé.' : 'Kéo đá vào ly ở trạm pha.');
    } else if (a.kind === 'bowl') {
      if (this.whiskProgress >= RULES.whiskDistance && drink) {
        ok = drink.addIngredient('foam', 1); this.whiskState = new PreparationState('egg-bowl'); this.whiskProgress = 0; this.whiskEggLoaded = false; scene.toast('Lớp bọt vàng mịn, thơm ghê!'); scene.game.audio.play('foam'); a.heard = true;
      } else scene.toast(this.whiskProgress < RULES.whiskDistance ? 'Bọt chưa bông. Kéo phới vào tô và đánh qua lại.' : 'Kéo tô trứng vào ly ở trạm pha.');
    } else if (a.kind === 'kettle') { this.finishWater(); ok = a.worked; if (!ok) scene.toast(drink?.nextStep() || 'Đặt ly và chuẩn bị phin trước nhé.'); }
    else if (a.kind === 'press') { ok = a.worked; if (!ok) scene.toast('Cho bột vào phin rồi kéo lõi vào, giữ để nén.'); }
    else if (['condensed', 'milk', 'stir', 'whisk'].includes(a.kind)) { ok = a.worked; if (!ok) scene.toast(a.kind === 'whisk' ? 'Di chuyển phới trong tô, giữ yên không tạo bọt.' : 'Kéo dụng cụ vào ly rồi thao tác nhé.'); }
    if (station && a.kind !== 'cup') scene.selectedStation = station.index;
    if (!a.heard && !a.worked) {
      const aimed = a.kind === 'cup'
        ? [...scene.customerViews.values()].some(view => view.contains(a.x, a.y)) || !!(station && station !== a.source)
        : !!station;
      scene.game.audio.play(!ok && aimed ? 'error' : 'place');
    }
    this.release(ok);
  }
  release(success) {
    const a = this.active; if (!a) return;
    this.pourSystem.end(a.pointerId); this.whiskSystem.end(a.pointerId); this.stirSystem.end(a.pointerId);
    if (a.source) a.source.draggingCup = false;
    const scene = this.scene;
    this.effects.clear(); this.active = null; scene.liveHint = null;
    if (success && a.kind === 'cup') { a.proxy.destroy(); a.shadow.destroy(); return; }
    const tx = a.source?.x ?? a.tool?.x ?? a.originX;
    const ty = a.source?.y ?? a.tool?.y ?? a.originY;
    if (scene.game.save.data.settings.reducedMotion || scene.paused) { a.proxy.destroy(); a.shadow.destroy(); return; }
    scene.tweens.add({ targets: a.proxy, x: tx, y: ty, rotation: 0, scale: 0.9, alpha: 0.2, duration: 220, ease: 'Back.Out', onComplete: () => a.proxy.destroy() });
    scene.tweens.add({ targets: a.shadow, alpha: 0, duration: 150, onComplete: () => a.shadow.destroy() });
  }
  cancel() {
    this.scene.drinkEngine?.cancel();
    this.pourSystem.cancelAll(); this.whiskSystem.gestures.clear(); this.stirSystem.gestures.clear();
    if (!this.active) return;
    this.finishWater();
    const a = this.active;
    if (a.source) a.source.draggingCup = false;
    a.proxy.destroy(); a.shadow.destroy(); this.effects.clear(); this.active = null; this.scene.liveHint = null;
  }
  destroy() {
    this.cancel(); this.effects.destroy();
    this.scene.input.off('pointerdown', this.down); this.scene.input.off('pointermove', this.move);
    this.scene.input.off('pointerup', this.up); this.scene.input.off('pointerupoutside', this.up);
    this.scene.game.canvas.removeEventListener('pointercancel', this.cancelEvent);
    this.scene.game.canvas.removeEventListener('touchcancel', this.cancelEvent);
    this.scene.scale.off('resize', this.cancelEvent);
  }
}
