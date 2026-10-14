import { RECIPES } from '../config.js';
import { Drink } from './Drink.js';
export class BrewingStation {
  constructor(id, recipeId = 'den') { this.id = id; this.recipeId = recipeId; this.drink = null; }
  placeGlass() {
    if (this.drink) return false;
    this.drink = new Drink(this.recipeId); return true;
  }
  chooseRecipe(id) {
    if (!RECIPES[id]) return false;
    // A partly prepared cup keeps its engine and materials when switching the quantity guide.
    if (this.drink && RECIPES[this.drink.recipeId]?.engine !== RECIPES[id].engine) return false;
    if (this.drink && this.drink.state !== 'GLASS' && (this.drink.recipeId === 'muoi') !== (id === 'muoi')) return false;
    // A coconut glass keeps its recipe once the phin or the coconut base is in it.
    if (this.drink && this.drink.recipeId !== id && (this.drink.recipeId === 'cotdua' || id === 'cotdua') && (this.drink.state !== 'GLASS' || this.drink.preparation.volume > 0)) return false;
    this.recipeId = id;
    if (this.drink) {
      this.drink.recipeId = id;
      if (this.drink.state === 'GLASS') { this.drink.preparation.capacity = RECIPES[id].visual.capacity || 300; this.drink.preparation.volumePerUnit = Object.fromEntries(RECIPES[id].ingredients.filter(i => i.volumePerUnit).map(i => [i.id, i.volumePerUnit])); }
    }
    return true;
  }
  discard() { const previous = this.drink; this.drink = null; return previous; }
  update(seconds) { return this.drink?.update(seconds) ?? false; }
}
