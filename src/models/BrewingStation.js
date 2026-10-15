import { RECIPES } from '../config.js';
import { Drink } from './Drink.js';
import { normalizeModifiers } from './KumquatPrep.js';
import { normalizeTraDaoModifiers } from './TraDaoPrep.js';
import { normalizeTraVaiModifiers } from './TraVaiPrep.js';
import { normalizeCacaoModifiers } from './CacaoPrep.js';
import { normalizeMatchaModifiers } from './MatchaBowl.js';
export class BrewingStation {
  constructor(id, recipeId = 'den') { this.id = id; this.recipeId = recipeId; this.modifiers = null; this.drink = null; }
  placeGlass() {
    if (this.drink) return false;
    this.drink = new Drink(this.recipeId, this.modifiers); return true;
  }
  chooseRecipe(id, modifiers = null) {
    if (!RECIPES[id]) return false;
    const hasProgress = this.drink && (this.drink.state !== 'GLASS' || this.drink.preparation.volume > 0 || Object.values(this.drink.getAmounts()).some(v => v > 0));
    if (this.drink && RECIPES[this.drink.recipeId]?.engine !== RECIPES[id].engine && hasProgress) return false;
    if (this.drink && this.drink.state !== 'GLASS' && (this.drink.recipeId === 'muoi') !== (id === 'muoi')) return false;
    // A coconut, trà tắc, trà đào, trà vải, cacao, or matcha glass keeps its recipe once preparation has started in it.
    if (this.drink && this.drink.recipeId !== id && (['cotdua', 'tratac', 'tradao', 'travai', 'cacao', 'matcha'].includes(this.drink.recipeId) || ['cotdua', 'tratac', 'tradao', 'travai', 'cacao', 'matcha'].includes(id)) && hasProgress) return false;
    this.recipeId = id;
    this.modifiers = id === 'tratac' ? normalizeModifiers(modifiers) : id === 'tradao' ? normalizeTraDaoModifiers(modifiers) : id === 'travai' ? normalizeTraVaiModifiers(modifiers) : id === 'cacao' ? normalizeCacaoModifiers(modifiers) : id === 'matcha' ? normalizeMatchaModifiers(modifiers) : null;
    if (this.drink) {
      this.drink.recipeId = id;
      this.drink.modifiers = this.modifiers;
      if (this.drink.state === 'GLASS' && !hasProgress) {
        this.drink.preparation.capacity = RECIPES[id].visual.capacity || 300;
        this.drink.preparation.volumePerUnit = Object.fromEntries(RECIPES[id].ingredients.filter(i => i.volumePerUnit).map(i => [i.id, i.volumePerUnit]));
      }
    }
    return true;
  }
  discard() { const previous = this.drink; this.drink = null; return previous; }
  update(seconds) { return this.drink?.update(seconds) ?? false; }
}
