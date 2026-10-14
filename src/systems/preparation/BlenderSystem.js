export class BlenderSystem {
  constructor() { this.running = new Map(); }
  insert(state, ingredient, amount) { return state.lid ? 0 : state.add(ingredient, amount); }
  placeLid(state) { if (!Object.keys(state.amounts).some(id => state.amounts[id] > 0) || state.lid) return false; state.lid = true; state.revision++; return true; }
  removeLid(state) { if (!state.lid || [...this.running.values()].includes(state)) return false; state.lid = false; state.revision++; return true; }
  begin(key, state) { if (!state.lid || !Object.values(state.amounts).some(n => n > 0) || [...this.running.values()].includes(state)) return false; this.running.set(key, state); return true; }
  update(seconds, targetSeconds = 4) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    for (const state of this.running.values()) {
      state.record('blend', Math.min(seconds, 0.1), targetSeconds);
      state.consistency = Math.min(1, (state.steps.blend?.amount || 0) / targetSeconds); state.mixing = state.consistency;
    }
  }
  end(key) { this.running.delete(key); }
  // Used by LiquidPourSystem: retain every original ingredient's identity in the mixture.
  pour(state, amount, accept) {
    if (this.running.size && [...this.running.values()].includes(state)) return 0;
    if (state.consistency <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
    const total = Object.values(state.amounts).reduce((sum, n) => sum + n, 0);
    if (!total) return 0;
    const ratio = Math.min(1, amount / total);
    const mixture = Object.fromEntries(Object.entries(state.amounts).map(([id, n]) => [id, n * ratio]));
    const accepted = Math.max(0, Math.min(1, accept(mixture, state.consistency)));
    let poured = 0; for (const [id, n] of Object.entries(mixture)) poured += state.remove(id, n * accepted);
    return poured;
  }
}
