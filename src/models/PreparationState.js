import { INGREDIENT_DEFINITIONS } from '../data/drinkEngine.js';

export class PreparationState {
  constructor(id, capacity = 300, volumePerUnit = {}) {
    this.id = id; this.capacity = capacity; this.volumePerUnit = { ...volumePerUnit }; this.amounts = {}; this.steps = {};
    this.layers = []; this.garnishes = []; this.ice = []; this.mixing = 0;
    this.foam = 0; this.consistency = 0; this.lid = false; this.fruit = null; this.revision = 0;
  }
  get volume() { return this.layers.reduce((sum, layer) => sum + layer.amount * (this.volumePerUnit[layer.id] || 1), 0); }
  add(id, requested) {
    const spec = INGREDIENT_DEFINITIONS[id];
    if (!spec || !Number.isFinite(requested) || requested <= 0) return 0;
    const amount = spec.liquid || spec.foam ? Math.min(requested, Math.max(0, (this.capacity - this.volume) / (this.volumePerUnit[id] || 1))) : requested;
    if (!amount) return 0;
    this.amounts[id] = (this.amounts[id] || 0) + amount;
    if (spec.liquid || spec.foam) {
      const last = this.layers.at(-1);
      if (last?.id === id) last.amount += amount;
      else this.layers.push({ id, amount, color: spec.color, opacity: spec.opacity ?? 0.96, foam: !!spec.foam });
      this.mixing = 0; delete this.steps.stir;
    }
    this.revision++; return amount;
  }
  remove(id, requested) {
    if (!Number.isFinite(requested) || requested <= 0) return 0;
    let remaining = Math.min(this.amounts[id] || 0, requested), used = remaining;
    this.amounts[id] = Math.max(0, (this.amounts[id] || 0) - used);
    for (const layer of this.layers) if (layer.id === id) { const n = Math.min(layer.amount, remaining); layer.amount -= n; remaining -= n; }
    this.layers = this.layers.filter(layer => layer.amount > 1e-8); if (used) this.revision++; return used;
  }
  record(step, amount, target, technique = 1) {
    if (!step || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(target) || target <= 0) return 0;
    const state = this.steps[step] ||= { amount: 0, technique: 1 };
    const added = Math.min(amount, Math.max(0, target - state.amount));
    if (!added) return 0;
    state.technique = (state.technique * state.amount + Math.max(0, Math.min(1, technique)) * added) / (state.amount + added);
    state.amount += added; this.revision++; return added;
  }
  canStep(recipe, stepId) {
    const step = recipe?.steps.find(s => s.id === stepId);
    return !!step && (step.after || []).every(id => (this.steps[id]?.amount || 0) >= recipe.steps.find(s => s.id === id).target);
  }
}
