import { INGREDIENT_DEFINITIONS } from '../../data/drinkEngine.js';
export class GarnishSystem {
  constructor(effects) { this.effects = effects; }
  drop(state, ingredient, quantity, point, center) {
    const spec = INGREDIENT_DEFINITIONS[ingredient];
    if (!spec || !Number.isInteger(quantity) || quantity <= 0 || state.garnishes.length + quantity > 12) return 0;
    state.add(ingredient, quantity);
    for (let i = 0; i < quantity; i++) state.garnishes.push({ id: ingredient, x: Math.max(-18, Math.min(18, point.x - center.x + i * 4)), y: Math.max(-24, Math.min(18, point.y - center.y)), color: spec.color });
    this.effects?.landing(point.x, point.y, center.x, center.y, spec.color); return quantity;
  }
}
