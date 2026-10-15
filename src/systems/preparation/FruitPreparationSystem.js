export class FruitPreparationSystem {
  constructor(effects) { this.effects = effects; this.gestures = new Map(); }
  place(state, ingredient, quantity = 1, juiceCapacity = 20) {
    if (typeof state?.placeOrange === 'function') {
      if (ingredient === 'orange') return state.placeOrange();
      if (ingredient === 'lemongrass') return state.placeLemongrass();
      return false;
    }
    if (typeof state?.place === 'function') return state.place(quantity) > 0;
    if (state.fruit || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(juiceCapacity) || juiceCapacity <= 0) return false;
    state.fruit = { ingredient, quantity, sliced: false, extracted: 0, juiceCapacity }; state.revision++; return true;
  }
  move(key, state, point, zone, mode = 'slice') {
    const entry = this.gestures.get(key), previous = entry?.state === state ? entry.point : null;
    this.gestures.set(key, { state, point: { ...point } });
    if (!previous) return 0;
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y), ms = point.time - previous.time;
    if (distance < 3 || distance > 110 || ms <= 0 || ms > 300 || distance / Math.max(8, ms) > 4.5) return 0;
    if (typeof state?.sliceOrange === 'function') {
      if (mode === 'slice') {
        const dx = point.x - previous.x, dy = point.y - previous.y;
        const projection = Math.max(0, Math.min(1, ((zone.x - previous.x) * dx + (zone.y - previous.y) * dy) / (distance * distance)));
        const crossed = Math.hypot(previous.x + projection * dx - zone.x, previous.y + projection * dy - zone.y) < (zone.radius || 24);
        if (state.orangeSliced || !state.orangeOnBoard || distance < 18 || !crossed) return 0;
        const sliced = state.sliceOrange();
        if (sliced) this.effects?.particles(zone.x, zone.y, 0xf59e3d, 7);
        return sliced;
      }
      if (mode === 'roll' || mode === 'press') {
        if (!state.lemongrassOnBoard || state.lemongrassPrepared) return 0;
        const { progressed } = state.rollLemongrass(distance);
        if (progressed > 0) this.effects?.particles(zone.x, zone.y - 4, 0xb3c477, 4);
        return progressed;
      }
      if (!state.orangeSliced) return 0;
      const amount = state.squeezeOrange(distance);
      if (amount > 0) this.effects?.splash(zone.x, zone.y + 8, 0xf49d37, amount);
      return amount;
    }
    if (typeof state?.slice === 'function') {
      if (mode === 'slice') {
        const dx = point.x - previous.x, dy = point.y - previous.y;
        const projection = Math.max(0, Math.min(1, ((zone.x - previous.x) * dx + (zone.y - previous.y) * dy) / (distance * distance)));
        const crossed = Math.hypot(previous.x + projection * dx - zone.x, previous.y + projection * dy - zone.y) < (zone.radius || 22);
        if (state.sliced || distance < 18 || !crossed) return 0;
        const sliced = state.slice();
        if (sliced) this.effects?.particles(zone.x, zone.y, 0xf5cd79, 6);
        return sliced;
      }
      if (!state.sliced) return 0;
      const amount = state.squeeze(distance);
      if (amount > 0) this.effects?.splash(zone.x, zone.y + 8, 0xf5c850, amount);
      return amount;
    }
    if (!state.fruit) return 0;
    const fruit = state.fruit;
    if (mode === 'slice') {
      // Require a swipe through the fruit center, not any movement on the board.
      const dx = point.x - previous.x, dy = point.y - previous.y;
      const projection = Math.max(0, Math.min(1, ((zone.x - previous.x) * dx + (zone.y - previous.y) * dy) / (distance * distance)));
      const crossed = Math.hypot(previous.x + projection * dx - zone.x, previous.y + projection * dy - zone.y) < 16;
      if (fruit.sliced || distance < 22 || !crossed) return 0;
      fruit.sliced = true; state.revision++; this.effects?.particles(zone.x, zone.y, 0xf5cd79, 4); return 1;
    }
    if (!fruit.sliced) return 0;
    const amount = Math.min(distance * 0.08 * fruit.quantity, fruit.juiceCapacity * fruit.quantity - fruit.extracted);
    fruit.extracted += amount;
    if (amount > 0) { state.add('citrusJuice', amount); this.effects?.splash(zone.x, zone.y, 0xf5c850, amount); }
    return amount;
  }
  end(key) { this.gestures.delete(key); }
}
