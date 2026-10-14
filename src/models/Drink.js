import { INGREDIENT_NAMES, PITCHER_RECIPES, RECIPES, RULES } from '../config.js';
import { CoconutBlend } from './CoconutBlend.js';
import { PreparationState } from './PreparationState.js';
import { INGREDIENT_DEFINITIONS } from '../data/drinkEngine.js';
import { evaluatePreparation } from '../logic/drinkQuality.js';
let nextId = 0;
export class Drink {
  constructor(recipeId = 'den') {
    this.id = `cup-${++nextId}`;
    this.recipeId = recipeId;
    this.state = 'GLASS';
    this.grounds = 0;
    this.press = 0;
    this.water = 0;
    this.brewElapsed = 0;
    this.coffee = 0;
    this.condensed = 0;
    this.milk = 0;
    this.foam = 0;
    this.ice = 0;
    this.stir = 0;
    this.consumed = false;
    this.timedSteps = new Set();
    this.coffeeSource = new PreparationState(`${this.id}-phin-collection`, 3);
    this.creamTechniqueTotal = 0; this.creamMovementTotal = 0;
    this.blendTechniqueTotal = 0; this.blendTimeTotal = 0; this.blendedCoconut = 0;
    this.preparation = new PreparationState(this.id, RECIPES[recipeId]?.visual.capacity || 300, Object.fromEntries((RECIPES[recipeId]?.ingredients || []).filter(i => i.volumePerUnit).map(i => [i.id, i.volumePerUnit])));
  }
  placePhin() {
    if (RECIPES[this.recipeId]?.engine !== 'phin') return false;
    if (this.state !== 'GLASS') return false;
    this.state = 'PHIN'; return true;
  }
  addGrounds(amount) {
    if (this.state !== 'PHIN' || !Number.isFinite(amount) || amount <= 0) return false;
    this.grounds = Math.min(2, this.grounds + amount); return true;
  }
  compress(seconds) {
    if (this.state !== 'PHIN' || this.grounds <= 0) return false;
    this.press = Math.min(RULES.pressSeconds, this.press + Math.max(0, seconds));
    if (this.press >= RULES.pressSeconds - 1e-9) this.state = 'PRESSED';
    return true;
  }
  pourWater(seconds) {
    if (!['PRESSED', 'POURING'].includes(this.state) || seconds <= 0) return false;
    this.state = 'POURING';
    this.water = Math.min(2, this.water + seconds * RULES.waterRate); return true;
  }
  finishWater() {
    if (this.state !== 'POURING' || this.water <= 0) return false;
    this.state = 'BREWING'; return true;
  }
  startTimedSteps() {
    const recipe = RECIPES[this.recipeId];
    if (recipe?.engine !== 'gesture') return;
    for (const step of recipe.steps) if (step.action === 'brew' && step.after?.length && this.preparation.canStep(recipe, step.id) && (this.preparation.steps[step.id]?.amount || 0) < step.target) this.timedSteps.add(step.id);
  }
  update(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || this.consumed) return false;
    if (RECIPES[this.recipeId]?.engine === 'gesture') {
      let completed = false;
      for (const id of [...this.timedSteps]) {
        const step = RECIPES[this.recipeId].steps.find(s => s.id === id);
        this.preparation.record(id, seconds, step.target);
        if (this.preparation.steps[id].amount >= step.target) { this.timedSteps.delete(id); completed = true; }
      }
      this.startTimedSteps(); return completed;
    }
    if (this.state !== 'BREWING') return false;
    this.brewElapsed = Math.min(RULES.brewSeconds, this.brewElapsed + Math.max(0, seconds));
    this.coffee = this.water * this.brewElapsed / RULES.brewSeconds;
    if (this.brewElapsed >= RULES.brewSeconds) { this.state = 'BREWED'; if (PITCHER_RECIPES.includes(this.recipeId)) this.coffeeSource.add('brewedCoffee', this.coffee); return true; }
    return false;
  }
  addMeasuredIngredient(kind, amount) {
    if (this.consumed || !INGREDIENT_DEFINITIONS[kind] || !Number.isFinite(amount) || amount <= 0) return 0;
    if (RECIPES[this.recipeId]?.engine !== 'phin') {
      const accepted = this.preparation.add(kind, amount);
      if (accepted && INGREDIENT_DEFINITIONS[kind].liquid) for (const step of RECIPES[this.recipeId]?.steps || []) if (step.action === 'stir') delete this.preparation.steps[step.id];
      return accepted;
    }
    if (this.recipeId === 'muoi' && ['cream', 'salt', 'brewedCoffee'].includes(kind)) return this.preparation.add(kind, amount);
    // Coconut coffee receives milk and ice only through the blender jar, and coffee only from its pitcher.
    if (this.recipeId === 'cotdua') return 0;
    if (!Object.hasOwn(INGREDIENT_NAMES, kind)) return 0;
    const accepted = Math.min(amount, Math.max(0, (kind === 'ice' ? 9 : 5) - this[kind]));
    this[kind] += accepted;
    if (accepted && (kind === 'milk' || kind === 'condensed')) { this.stir = 0; delete this.preparation.steps.stir; this.preparation.mixing = 0; }
    if (accepted) this.preparation.revision++;
    return accepted;
  }
  addIngredient(kind, amount) { return this.addMeasuredIngredient(kind, amount) > 0; }
  getAmounts() {
    return RECIPES[this.recipeId]?.engine === 'phin'
      ? this.recipeId === 'cotdua' ? { coffee: this.grounds, water: this.water, ...this.preparation.amounts }
        : { coffee: this.grounds, water: this.water, condensed: this.condensed, milk: this.milk, foam: this.foam, ice: this.ice, ...(this.recipeId === 'muoi' ? this.preparation.amounts : {}) }
      : { ...this.preparation.amounts };
  }
  acceptPreparedMixture(mixture, source) {
    if (this.recipeId === 'cotdua') return this.acceptCoconutPour(mixture, source);
    if (this.recipeId !== 'muoi' || this.consumed || this.state !== 'BREWED') return 0;
    const coffee = mixture.brewedCoffee || 0, cream = mixture.cream || 0;
    if (coffee && source !== this.coffeeSource || !coffee && (!cream || !source?.whipping)) return 0;
    if (Object.keys(mixture).some(id => !['brewedCoffee', 'cream', 'salt'].includes(id))) return 0;
    const volume = coffee + cream, fraction = Math.min(1, Math.max(0, (this.preparation.capacity - this.preparation.volume) / (volume || 1)));
    for (const [id, n] of Object.entries(mixture)) this.addMeasuredIngredient(id, n * fraction);
    if (cream * fraction > 0) {
      this.creamTechniqueTotal += cream * fraction * source.consistency;
      this.creamMovementTotal += cream * fraction * Math.min(Math.PI * 6, source.whipping);
      this.preparation.creamTechnique = this.creamTechniqueTotal / this.preparation.amounts.cream;
      this.preparation.foam = source.foam;
      this.preparation.steps.whisk = { amount: this.creamMovementTotal / this.preparation.amounts.cream, technique: this.preparation.creamTechnique };
      this.preparation.revision++;
    }
    return fraction;
  }
  // Coffee is collected from this cup's own phin only after a blended coconut base is in the glass.
  acceptCoconutPour(mixture, source) {
    if (this.consumed || !source) return 0;
    const p = this.preparation, ids = Object.keys(mixture);
    if (source === this.coffeeSource) {
      if (this.state !== 'BREWED' || !((p.amounts.coconutCream || 0) > 0) || ids.some(id => id !== 'brewedCoffee')) return 0;
      const coffee = mixture.brewedCoffee || 0, room = Math.max(0, p.capacity - p.volume) / (p.volumePerUnit.brewedCoffee || 1);
      const fraction = Math.min(1, room / (coffee || 1));
      if (!(fraction > 0)) return 0;
      p.add('brewedCoffee', coffee * fraction); return fraction;
    }
    if (!(source instanceof CoconutBlend) || !(source.blendTime > 0) || !['GLASS', 'BREWED'].includes(this.state)) return 0;
    if (ids.some(id => !['coconutCream', 'condensed', 'ice'].includes(id))) return 0;
    const volume = ids.reduce((sum, id) => sum + (id === 'ice' ? 0 : mixture[id] * (p.volumePerUnit[id] || 1)), 0);
    const fraction = Math.min(1, Math.max(0, (p.capacity - p.volume) / (volume || 1)));
    if (!(fraction > 0)) return 0;
    for (const id of ids) p.add(id, mixture[id] * fraction);
    // Crushed ice is part of the slush, not loose cubes.
    p.ice = [];
    const coconut = (mixture.coconutCream || 0) * fraction;
    if (coconut > 0) {
      this.blendedCoconut += coconut; this.blendTechniqueTotal += coconut * source.technique; this.blendTimeTotal += coconut * source.blendTime;
      p.blendTechnique = this.blendTechniqueTotal / this.blendedCoconut; p.blendTime = this.blendTimeTotal / this.blendedCoconut;
      p.steps.blend = { amount: Math.min(4, p.blendTime), technique: p.blendTechnique };
      p.foam = source.foam; p.crush = source.crush; p.revision++;
    }
    return fraction;
  }
  recordAction(action, amount, technique = 1) {
    const recipe = RECIPES[this.recipeId];
    const step = recipe?.steps.find(s => s.action === action && this.preparation.canStep(recipe, s.id));
    return step ? this.preparation.record(step.id, amount, step.target, technique) : 0;
  }
  stirBy(radians) {
    if (this.consumed || this.state !== 'BREWED' || this.milk + this.condensed <= 0) return false;
    this.stir = Math.min(RULES.stirRadians, this.stir + Math.max(0, radians)); return true;
  }
  evaluate(recipeId) {
    const recipe = RECIPES[recipeId];
    if (!recipe || this.consumed) return { valid: false, quality: 'INCORRECT', finalQuality: 'INCORRECT', recipeCorrectness: false, amountAccuracy: 0, preparationTechnique: 0, message: 'Ly này đã phục vụ rồi.' };
    if (recipe.engine !== 'phin') return evaluatePreparation(recipe, this.getAmounts(), this.preparation.steps);
    const steps = {};
    const values = { ...Object.fromEntries(Object.entries(this.preparation.steps).map(([id, step]) => [id, step.amount])), collect: this.preparation.amounts.brewedCoffee || 0, 'cream-pour': this.preparation.amounts.cream || 0, salt: this.preparation.amounts.salt || 0, phin: this.state !== 'GLASS' ? 1 : 0, grounds: this.grounds, press: this.press, water: this.water, brew: this.brewElapsed, mix: this.stir, foam: this.foam * RULES.whiskDistance };
    for (const step of recipe.steps) steps[step.id] = { amount: values[step.id] || 0, technique: 1 };
    if (this.recipeId === 'muoi' && recipe.id === 'muoi') steps.whisk = this.preparation.steps.whisk || { amount: 0, technique: 0 };
    if (recipe.id === 'cotdua') {
      const a = this.preparation.amounts, blended = this.recipeId === 'cotdua' && (a.coconutCream || 0) > 0;
      Object.assign(steps, { coconut: { amount: a.coconutCream || 0, technique: 1 }, condensed: { amount: a.condensed || 0, technique: 1 }, ice: { amount: a.ice || 0, technique: 1 }, lid: { amount: blended ? 1 : 0, technique: 1 }, mixture: { amount: a.coconutCream || 0, technique: 1 }, collect: { amount: a.brewedCoffee || 0, technique: 1 }, blend: blended && this.preparation.steps.blend || { amount: 0, technique: 0 } });
    }
    const result = evaluatePreparation(recipe, this.getAmounts(), steps, this.state === 'BREWED');
    if (recipe.id === 'muoi') {
      const technique = this.preparation.creamTechnique || 0;
      result.perfectCream = technique >= 0.99;
      result.tipMultiplier = result.valid && result.perfectCream ? 1.15 : 1;
      if (result.valid && technique < 0.95 && result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; result.message = 'Kem hơi lệch độ bông, ly vẫn ngon!'; }
      if (result.valid && technique < 0.6) { result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.4; result.message = 'Kem chưa mịn hoặc quá bông rồi.'; }
      if (result.valid && (this.preparation.amounts.salt || 0) > 0.405) result.message = 'Hơi mặn rồi!';
    }
    if (recipe.id === 'cotdua' && this.recipeId === 'cotdua') {
      const technique = this.preparation.blendTechnique || 0, time = this.preparation.blendTime || 0;
      result.perfectBlend = technique >= 0.99;
      result.tipMultiplier = result.valid && result.perfectBlend ? 1.15 : 1;
      if (result.valid && technique < 0.95 && result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; result.message = 'Dừa xay mịn vừa, ly vẫn ngon!'; }
      if (result.valid && technique < 0.6) { result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.4; result.message = time >= 5.6 ? 'Xay quá nhuyễn, dừa hơi loãng rồi.' : 'Dừa còn lợn cợn đá, xay thêm chút nha.'; }
      if (!result.valid && result.recipeCorrectness && (this.preparation.steps.blend?.amount || 0) < 0.4 && (this.preparation.amounts.coconutCream || 0) > 0) result.message = 'Cốt dừa chưa được xay!';
    }
    if (this.state !== 'BREWED') { result.message = this.nextStep(); return result; }
    if (recipe.stir && this.stir < RULES.stirRadians * 0.05 && result.recipeCorrectness) {
      return { ...result, valid: false, quality: 'INCORRECT', finalQuality: 'INCORRECT', score: 0, message: 'Khuấy thêm chút nữa! Vẽ vòng tròn trong ly.' };
    }
    return result;
  }
  nextStep() {
    const recipe = RECIPES[this.recipeId];
    if (recipe?.engine !== 'phin') return recipe?.steps.find(s => (this.preparation.steps[s.id]?.amount || 0) < s.target)?.instruction || 'Kéo ly đến khách.';
    if (this.recipeId === 'cotdua' && this.state === 'GLASS') return (this.preparation.amounts.coconutCream || 0) > 0 ? 'Đã có dừa xay. Kéo phin lên ly để pha cà phê.' : 'Xay cốt dừa ở khay 05 rồi rót vào ly, hoặc đặt phin trước.';
    if (this.state === 'GLASS') return 'Kéo phin lên ly.';
    if (this.state === 'PHIN') return this.grounds ? 'Kéo lõi vào phin, giữ để nén.' : 'Kéo muỗng vào hũ bột, rồi vào phin.';
    if (this.state === 'PRESSED') return 'Kéo ấm vào phin, giữ rót rồi thả.';
    if (this.state === 'POURING') return 'Thả tay khi nước chạm vạch xanh.';
    if (this.state === 'BREWING') return 'Phin đang nhỏ giọt, chờ một chút nhé.';
    if (this.recipeId === 'muoi') { const result = this.evaluate('muoi'); return result.valid ? 'Kéo ly cà phê muối đến khách.' : result.message; }
    if (this.recipeId === 'cotdua') {
      if (!((this.preparation.amounts.coconutCream || 0) > 0)) return 'Rót cốt dừa đã xay từ cối vào ly (khay 05).';
      if (this.coffeeSource.volume > 0.01) return 'Kéo ca phin vào ly, nghiêng rót cà phê lên lớp dừa.';
      const result = this.evaluate('cotdua'); return result.valid ? 'Kéo ly cà phê cốt dừa đến khách.' : result.message;
    }
    return 'Thêm nguyên liệu, rồi kéo ly đến khách.';
  }
}
