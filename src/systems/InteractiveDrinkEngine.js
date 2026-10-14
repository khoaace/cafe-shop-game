import { pointerToWorld } from '../rendering/resolution.js';
import { RECIPES } from '../config.js';
import { INGREDIENT_DEFINITIONS } from '../data/drinkEngine.js';
import { LiquidPourSystem } from './preparation/LiquidPourSystem.js';
import { WhiskSystem } from './preparation/WhiskSystem.js';
import { FruitPreparationSystem } from './preparation/FruitPreparationSystem.js';
import { BlenderSystem } from './preparation/BlenderSystem.js';
import { StirringSystem } from './preparation/StirringSystem.js';
import { IceSystem } from './preparation/IceSystem.js';
import { GarnishSystem } from './preparation/GarnishSystem.js';
import { PreparationEffects } from './preparation/PreparationEffects.js';

// Input is routed by DragController. This engine never subscribes to pointer events.
export class InteractiveDrinkEngine {
  constructor(scene) {
    this.scene = scene; this.tools = new Map(); this.targets = new Map(); this.active = new Map(); this.owners = new Map();
    this.effects = new PreparationEffects(scene); this.zones = scene.add.graphics().setDepth(90);
    this.pour = new LiquidPourSystem(); this.whisk = new WhiskSystem(); this.fruit = new FruitPreparationSystem(this.effects);
    this.blender = new BlenderSystem(); this.stir = new StirringSystem(); this.ice = new IceSystem(this.effects); this.garnish = new GarnishSystem(this.effects);
  }
  registerTool(id, object, options) {
    if (this.tools.has(id)) throw new Error(`Duplicate tool: ${id}`);
    const tool = { id, object, home: { x: object.x, y: object.y, scaleX: object.scaleX, scaleY: object.scaleY, rotation: object.rotation }, hitSize: 48, quantity: 1, ...options };
    this.tools.set(id, tool); return () => { for (const [key, a] of this.active) if (a.tool === tool) this.end(key, true); this.tools.delete(id); };
  }
  registerTarget(id, options) {
    if (this.targets.has(id)) throw new Error(`Duplicate station: ${id}`);
    this.targets.set(id, { id, radius: 60, ...options });
    return () => { for (const [key, a] of this.active) if (a.target?.id === id) this.end(key, true); this.targets.delete(id); };
  }
  point(pointer) { return { ...pointerToWorld(pointer, this.scene.cameras.main), time: performance.now() }; }
  targetAt(point, tool) {
    const legacy = this.scene.drag?.active;
    return [...this.targets.values()].find(t => !(legacy && (t.id === legacy.source?.model.id || t.contains(legacy.x, legacy.y))) && t.visible?.() !== false && t.accepts.includes(tool.action) && (!tool.canTarget || tool.canTarget(t)) && (!this.owners.has(t.id) || this.owners.get(t.id) === tool.id) && t.contains(point.x, point.y) && t.getState());
  }
  step(target, tool) {
    const recipe = RECIPES[target?.recipeId?.()];
    const step = recipe?.steps.find(s => tool.stepId ? s.id === tool.stepId : s.action === tool.action && (!s.ingredient || s.ingredient === tool.ingredient));
    if (recipe && (!step || !target.getState().canStep(recipe, step.id))) return null;
    return step || { id: tool.action, target: tool.progressTarget || 1, action: tool.action };
  }
  down(pointer) {
    if (this.scene.paused || this.scene.finishing || this.active.has(pointer.id)) return false;
    const p = this.point(pointer);
    const shown = object => { for (let parent = object; parent; parent = parent.parentContainer) if (!parent.visible || !parent.active) return false; return true; };
    const tool = [...this.tools.values()].reverse().find(t => shown(t.object) && t.object.visible && t.object.active && t.enabled?.() !== false && ![...this.active.values()].some(a => a.tool === t) && Math.abs(p.x - t.object.x) <= t.hitSize / 2 && Math.abs(p.y - t.object.y) <= t.hitSize / 2);
    if (!tool || tool.sourceTarget && this.owners.has(tool.sourceTarget)) return false;
    // A tool whose stock or prerequisite is missing stays put and explains why.
    const blocked = tool.blocked?.();
    if (blocked) { this.scene.toast(blocked); this.scene.game.audio.play('error'); return true; }
    if (tool.sourceTarget) this.owners.set(tool.sourceTarget, tool.id);
    const a = { tool, point: p, origin: { ...p }, target: null, worked: false, state: null, drawOffset: { x: 0, y: 0 } };
    this.active.set(pointer.id, a); this.scene.game.audio.unlock(); this.scene.tweens.killTweensOf(tool.object);
    tool.object.setScale(tool.home.scaleX * 1.06, tool.home.scaleY * 1.06); this.pour.begin(pointer.id, p, { rate: tool.rate ?? 25, initialTilt: 0 }); this.move(pointer); return true;
  }
  move(pointer) {
    const a = this.active.get(pointer.id); if (!a || this.scene.paused) return false;
    const p = this.point(pointer); a.point = p;
    if (a.tool.action !== 'blend') a.tool.object.setPosition(p.x + a.drawOffset.x, p.y + a.drawOffset.y);
    const target = this.targetAt(p, a.tool);
    const state = target?.getState();
    if (a.target !== target || a.state !== state) {
      if (a.target) this.owners.delete(a.target.id);
      this.whisk.end(pointer.id); this.stir.end(pointer.id); this.fruit.end(pointer.id); this.blender.end(pointer.id);
      a.target = target; a.state = state;
      if (target) {
        this.owners.set(target.id, a.tool.id);
        // Tilt begins after entering the drop zone rather than during the pickup drag.
        this.pour.begin(pointer.id, p, { rate: a.tool.rate ?? 25, initialTilt: 0 });
        if (a.tool.action === 'blend' && this.step(target, a.tool)) this.blender.begin(pointer.id, state);
      }
    }
    this.pour.move(pointer.id, p);
    if (!target) return true;
    const step = this.step(target, a.tool); if (!step) return true;
    const center = target.center(), action = a.tool.action;
    let amount = 0;
    if (action === 'whisk') amount = a.tool.circularOnly ? this.whisk.moveCircular(pointer.id, state, p, center) : this.whisk.move(pointer.id, state, p, center, step.target);
    else if (action === 'stir') amount = this.stir.move(pointer.id, state, p, center, step.target);
    else if (action === 'slice' || action === 'squeeze') amount = this.fruit.move(pointer.id, state, p, center, action);
    if (amount) {
      if (!a.tool.circularOnly && (!['whisk', 'stir'].includes(action) || step.id !== action)) state.record(step.id, amount, step.target);
      a.worked = true; target.onChange?.(action, amount);
      a.tool.object.rotation = Math.atan2(p.y - center.y, p.x - center.x) * 0.3;
    }
    return true;
  }
  update(seconds, time) {
    const g = this.zones; g.clear(); this.effects.streams.clear();
    for (const [key, a] of this.active) {
      for (const target of this.targets.values()) if (target.visible?.() !== false && target.accepts.includes(a.tool.action) && (!a.tool.canTarget || a.tool.canTarget(target)) && target.getState()) {
        const p = target.center(); g.lineStyle(target === a.target ? 3 : 2, target === a.target ? 0xe8b46b : 0x97a67e, 0.7); g.strokeCircle(p.x, p.y, target.radius);
      }
      const offset = a.target && a.tool.pourOffset || { x: 0, y: 0 };
      a.drawOffset.x += (offset.x - a.drawOffset.x) * Math.min(1, seconds * 18);
      a.drawOffset.y += (offset.y - a.drawOffset.y) * Math.min(1, seconds * 18);
      if (a.tool.action !== 'blend') a.tool.object.setPosition(a.point.x + a.drawOffset.x, a.point.y + a.drawOffset.y);
      if (!a.target) continue;
      const target = a.target, state = target?.getState(); if (!state || state !== a.state || target.visible?.() === false || !a.tool.object.active) { this.end(key, true); continue; }
      const step = this.step(target, a.tool); if (!step) continue;
      if (a.tool.action === 'pour') {
        const source = a.tool.sourceState?.(target);
        if (a.tool.sourceState && !source) { const hint = typeof a.tool.emptyHint === 'function' ? a.tool.emptyHint(target) : a.tool.emptyHint; this.scene.setLiveHint(hint || 'Nguồn nguyên liệu chưa sẵn sàng.'); continue; }
        const transfer = source && a.tool.sourceType === 'blender' ? this.blender : this.pour;
        const transferMethod = source && a.tool.sourceType === 'blender' ? 'pour' : 'transfer';
        const amount = this.pour.update(key, seconds, target, n => source ? transfer[transferMethod](source, n, (mixture, consistency) => {
          if (!target.acceptMixture) return 0;
          return target.acceptMixture(mixture, consistency, source);
        }) : target.acceptIngredient(a.tool.ingredient, n));
        a.tool.object.rotation = -(this.pour.sessions.get(key)?.tilt || 0) * 0.9;
        if (amount) {
          if (!a.tool.noRecord) state.record(step.id, amount, step.target); a.worked = true; target.onChange?.('pour', amount); a.tool.onPour?.(amount, target);
          const p = target.pourPoint?.() || target.center(), obj = a.tool.object;
          const spout = a.tool.spout || { x: -18, y: -8 };
          const m = obj.getWorldTransformMatrix();
          this.effects.stream(key, { x: m.tx + spout.x * m.a + spout.y * m.c, y: m.ty + spout.x * m.b + spout.y * m.d }, p, INGREDIENT_DEFINITIONS[a.tool.ingredient]?.color || 0xfff6e6, amount);
        }
      } else if (a.tool.action === 'press') {
        const amount = state.record(step.id, seconds, step.target); a.worked ||= amount > 0;
        a.tool.object.setScale(1.05, 1 - Math.min(0.15, (state.steps[step.id]?.amount || 0) / step.target * 0.15));
      } else if (a.tool.action === 'blend') {
        // Independent hold switches; releasing/leaving only stops this blender.
        if (a.tool.hold) { const amount = a.tool.hold(this.blender.running.has(key) ? seconds : 0, target, state); a.worked ||= amount > 0; }
        else if (this.blender.running.has(key)) {
          const amount = state.record('blend', seconds, step.target);
          if (step.id !== 'blend') state.record(step.id, amount, step.target);
          state.consistency = Math.min(1, (state.steps.blend?.amount || 0) / step.target); state.mixing = state.consistency;
          a.worked ||= amount > 0; target.onChange?.('blend', amount);
        }
      }
      if (a.tool.hint) { this.scene.setLiveHint(a.tool.hint(state, target)); continue; }
      const progress = Math.min(100, Math.round((state.steps[step.id]?.amount || 0) / step.target * 100));
      this.scene.setLiveHint(`${step.instruction || a.tool.instruction || 'Thao tác dụng cụ'} · ${progress}%`);
    }
    for (const target of this.targets.values()) target.render?.(target.getState(), time, this.owners.has(target.id));
    this.effects.render(time);
  }
  up(pointer) { if (!this.active.has(pointer.id)) return false; if (!pointer.wasCanceled) this.move(pointer); this.end(pointer.id, !!pointer.wasCanceled); return true; }
  end(key, canceled = false) {
    const a = this.active.get(key); if (!a) return;
    const t = a.target, state = t?.getState(), tool = a.tool;
    if (!canceled && state && state === a.state) {
      const step = this.step(t, tool); let amount = 0;
      if (step) {
        if (tool.action === 'ice') {
          const available = Math.min(tool.quantity, 12 - (state.amounts.ice || 0));
          const accepted = t.takeIngredient?.('ice', Math.floor(available)) || 0;
          amount = this.ice.drop(state, Math.floor(accepted), t.center());
        } else if (tool.action === 'garnish') {
          const available = Math.min(tool.quantity, 12 - state.garnishes.length);
          const accepted = t.takeIngredient?.(tool.ingredient, available) || 0;
          amount = this.garnish.drop(state, tool.ingredient, Math.floor(accepted), a.point, t.center());
        } else if (tool.action === 'lid') amount = (state.lid ? this.blender.removeLid(state) : this.blender.placeLid(state)) ? 1 : 0;
        else if (tool.action === 'place' && INGREDIENT_DEFINITIONS[tool.ingredient]?.fruit && !state.fruit) {
          const accepted = t.takeIngredient?.(tool.ingredient, tool.quantity) || 0;
          amount = accepted && this.fruit.place(state, tool.ingredient, accepted, tool.juiceCapacity ?? 20) ? accepted : 0;
        } else if (tool.action === 'scoop' && !state.lid) amount = t.acceptIngredient(tool.ingredient, tool.quantity);
        if (amount) { state.record(step.id, amount, step.target); t.onChange?.(tool.action, amount); }
      }
    }
    tool.release?.({ target: t, state, point: a.point, canceled, matched: !!state && state === a.state });
    this.effects.streams.delete(key); this.pour.end(key); this.whisk.end(key); this.stir.end(key); this.fruit.end(key); this.blender.end(key);
    if (t) this.owners.delete(t.id); if (tool.sourceTarget) this.owners.delete(tool.sourceTarget); this.active.delete(key); this.scene.liveHint = null;
    if (canceled || this.effects.reduced) tool.object.setPosition(tool.home.x, tool.home.y).setScale(tool.home.scaleX, tool.home.scaleY).setRotation(tool.home.rotation);
    else this.scene.tweens.add({ targets: tool.object, x: tool.home.x, y: tool.home.y, rotation: tool.home.rotation, scaleX: tool.home.scaleX, scaleY: tool.home.scaleY, duration: 220, ease: 'Back.Out' });
  }
  cancel() { for (const key of [...this.active.keys()]) this.end(key, true); this.zones.clear(); this.effects.streams.clear(); this.effects.graphics.clear(); }
  destroy() { this.cancel(); for (const tool of this.tools.values()) this.scene.tweens.killTweensOf(tool.object); this.tools.clear(); this.targets.clear(); this.zones.destroy(); this.effects.destroy(); }
}
