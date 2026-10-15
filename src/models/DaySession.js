import { ARCHETYPES, RECIPES, RULES, unlockedRecipes } from '../config.js';
import { Customer } from './Customer.js';
import { normalizeUpgrades, difficulty } from '../logic/upgrades.js';
import { VIPS, seededRandom } from '../logic/dayPlan.js';
import { emptyRecipes, emptyStories, STORIES, storyAfter, challengeProgress } from '../logic/progression.js';
import { starGoals, dayStars, speedBonus } from '../logic/stars.js';
import { INGREDIENTS, INITIAL_INVENTORY, emptyIngredientTotals, normalizeInventory, canPrepareRecipe, recipeNeedsForModifiers, feasibleModifiersFor, ingredientValue } from '../logic/inventory.js';

function drinkStockAmounts(drink) {
  if (!drink) return {};
  const a = drink.getAmounts();
  const isCacao = drink.recipeId === 'cacao';
  const isMatcha = drink.recipeId === 'matcha';
  return {
    coffee: a.coffee || 0,
    condensed: isCacao ? (a.condensed || 0) / 15 : a.condensed || 0,
    milk: isCacao || isMatcha ? (a.milk || 0) / 50 : a.milk || 0,
    egg: a.foam || 0,
    ice: (a.ice || 0) / 3,
    cream: a.cream || 0,
    salt: a.salt || 0,
    coconutCream: a.coconutCream || 0,
    tea: a.tea || 0,
    kumquat: a.kumquat || 0,
    syrup: a.syrup || 0,
    peach: (a.peach || 0) / 4,
    orange: (a.orange || 0) > 0 || (a.orangeJuice || 0) > 0 ? 1 : 0,
    lemongrass: a.lemongrass || 0,
    peachSyrup: a.peachSyrup || 0,
    lychee: (a.lychee || 0) / 4,
    lycheeSyrup: a.lycheeSyrup || 0,
    cacao: a.cacao || 0,
    matcha: a.matcha || 0,
  };
}

export class DaySession {
  constructor(day = 1, tutorial = false, random = Math.random, options = {}) {
    this.day = day; this.tutorial = tutorial; this.plan = tutorial ? null : options.plan || null;
    this.random = this.plan ? seededRandom(this.plan.seed) : random; this.elapsed = 0;
    this.upgrades = normalizeUpgrades(tutorial ? {} : options.upgrades || { phins: 2 });
    this.difficulty = difficulty(day, this.upgrades); this.stories = options.stories || emptyStories();
    this.customers = []; this.nextSpawn = 0; this.spawnCount = 0; this.ended = false;
    this.revenue = 0; this.tips = 0; this.bonuses = 0; this.served = 0; this.lost = 0;
    this.perfect = 0; this.combo = 0; this.bestCombo = 0; this.ratings = []; this.review = '';
    this.recipes = emptyRecipes(); this.storyEncounters = new Set(); this.storyMessages = [];
    this.rushServed = 0; this.rushLost = 0; this.vipSpawned = false; this.wrongOrders = 0;
    this.openingInventory = normalizeInventory(options.inventory || INITIAL_INVENTORY); this.inventory = normalizeInventory(this.openingInventory);
    this.ingredientUsed = emptyIngredientTotals(); this.ingredientWasted = emptyIngredientTotals(); this.servedIngredients = emptyIngredientTotals();
    this.preparedRecipeProvider = () => [];
    this.stockout = false; this.endReason = null;
    this.maxCustomers = tutorial ? 1 : this.difficulty.capacity;
    this.speedBonuses = 0; this.fastServes = 0;
    this.starGoals = tutorial ? [] : starGoals(this.plan);
  }
  get stars() { return dayStars(this.starGoals, this, this.ended); }
  get event() { return this.plan?.event || null; }
  get rush() { return !this.tutorial && this.elapsed >= RULES.rushStart && this.elapsed < RULES.rushEnd; }
  get powerOut() { return this.event === 'outage' && this.elapsed >= 45 && this.elapsed < 75; }
  get fanActive() { return this.upgrades.fan && !this.powerOut; }
  get earnings() { return this.revenue + this.tips + this.bonuses; }
  get grossProfit() { return this.earnings - ingredientValue(this.ingredientUsed); }
  get rating() { return this.ratings.length ? this.ratings.reduce((a, b) => a + b, 0) / this.ratings.length : 0; }
  get challenge() { return challengeProgress(this.plan?.challenge, this); }
  arrivalInterval() { return (this.rush ? this.difficulty.rushInterval : this.difficulty.normalInterval) * (this.event === 'rain' ? 1.25 : this.event === 'festival' ? 0.85 : 1); }
  setPreparedRecipeProvider(provider) { this.preparedRecipeProvider = typeof provider === 'function' ? provider : () => []; }
  uncommittedInventory() {
    if (this.tutorial) return { ...INITIAL_INVENTORY };
    const waiting = this.customers.filter(c => !c.resolved);
    if (!waiting.length) return { ...this.inventory };
    const committed = emptyIngredientTotals();
    for (const c of waiting) {
      const needs = recipeNeedsForModifiers(c.recipeId, c.modifiers);
      if (needs) for (const id of Object.keys(INGREDIENTS)) committed[id] += needs[id] || 0;
    }
    const result = emptyIngredientTotals();
    for (const id of Object.keys(INGREDIENTS)) {
      const inProgress = Math.max(0, (this.ingredientUsed[id] || 0) - (this.ingredientWasted[id] || 0) - (this.servedIngredients[id] || 0));
      result[id] = Math.max(0, Math.round(((this.inventory[id] || 0) + inProgress - committed[id]) * 1000) / 1000);
    }
    return result;
  }
  canPrepare(recipeId, modifiers = null) { return this.tutorial || canPrepareRecipe(this.inventory, recipeId, modifiers); }
  availableRecipes() {
    if (this.tutorial) return ['den'];
    const prepared = new Set(this.preparedRecipeProvider() || []);
    return unlockedRecipes(this.day, this.upgrades).filter(id => this.canPrepare(id) || prepared.has(id));
  }
  consumeIngredient(id, amount) {
    if (!Object.hasOwn(INGREDIENTS, id) || !Number.isFinite(amount) || amount <= 0) return 0;
    if (this.tutorial) return amount;
    const snap = v => { const r = Math.round(v * 1000) / 1000, h = Math.round(r * 4) / 4; return Math.abs(r - h) < 0.002 ? h : r; };
    const used = Math.min(this.inventory[id], amount);
    if (used <= 1e-9) return 0;
    this.inventory[id] = Math.max(0, snap(this.inventory[id] - used));
    this.ingredientUsed[id] = snap(this.ingredientUsed[id] + used);
    return used;
  }
  refundIngredient(id, amount) {
    if (this.tutorial || !Object.hasOwn(INGREDIENTS, id) || !Number.isFinite(amount) || amount <= 0) return;
    const snap = v => { const r = Math.round(v * 1000) / 1000, h = Math.round(r * 4) / 4; return Math.abs(r - h) < 0.002 ? h : r; };
    this.inventory[id] = snap(this.inventory[id] + amount);
    this.ingredientUsed[id] = Math.max(0, snap(this.ingredientUsed[id] - amount));
  }
  // Discarded preparations stay consumed; the amounts are reported as waste (stock units).
  recordWaste(amounts) {
    if (this.tutorial || !amounts) return 0;
    const snap = v => { const r = Math.round(v * 1000) / 1000, h = Math.round(r * 4) / 4; return Math.abs(r - h) < 0.002 ? h : r; };
    let total = 0;
    for (const [id, amount] of Object.entries(amounts)) if (Object.hasOwn(INGREDIENTS, id) && Number.isFinite(amount) && amount > 0) {
      const wasted = Math.min(amount, this.ingredientUsed[id] - this.ingredientWasted[id]);
      if (wasted > 1e-9) { this.ingredientWasted[id] = snap(this.ingredientWasted[id] + wasted); total += wasted; }
    }
    return total;
  }
  recordDrinkWaste(drink) {
    if (!drink || drink.consumed) return 0;
    return this.recordWaste(drinkStockAmounts(drink));
  }
  discardSaltedCream(bowl) {
    if (!bowl) return 0;
    const stock = typeof bowl.stock === 'function' ? bowl.stock() : { cream: bowl.amounts?.cream || 0, salt: bowl.amounts?.salt || 0 };
    const wasted = this.recordWaste(stock);
    if (typeof bowl.clear === 'function') bowl.clear();
    return wasted;
  }
  addGrounds(drink, amount) {
    if (!drink || drink.state !== 'PHIN') return 0;
    const used = this.consumeIngredient('coffee', amount);
    if (!used || !drink.addGrounds(used)) { this.refundIngredient('coffee', used); return 0; }
    return used;
  }
  pourIngredient(drink, kind, amount) {
    if (!drink || drink.consumed || !Number.isFinite(amount) || amount <= 0) return 0;
    // Hot/warm water for cacao or matcha is not a purchased stock item; track poured ml directly on the drink.
    if ((drink.recipeId === 'cacao' || drink.recipeId === 'matcha') && kind === 'water') {
      return drink.addMeasuredIngredient('water', amount);
    }
    if (!Object.hasOwn(INGREDIENTS, kind)) return 0;
    // Cacao and Matcha measure condensed milk (15 ml = 1 phần) and fresh milk (50 ml = 1 phần) in milliliters.
    if ((drink.recipeId === 'cacao' || drink.recipeId === 'matcha') && (kind === 'condensed' || kind === 'milk')) {
      const mlPerPortion = kind === 'condensed' ? 15 : 50;
      const portionsNeeded = amount / mlPerPortion;
      const usedPortions = this.consumeIngredient(kind, portionsNeeded);
      const acceptedMl = usedPortions > 0 ? drink.addMeasuredIngredient(kind, usedPortions * mlPerPortion) : 0;
      this.refundIngredient(kind, usedPortions - acceptedMl / mlPerPortion);
      return acceptedMl;
    }
    const used = this.consumeIngredient(kind, amount);
    const accepted = used ? drink.addMeasuredIngredient(kind, used) : 0;
    this.refundIngredient(kind, used - accepted);
    return accepted;
  }
  // Kumquats are consumed in whole fruits when placed on the cutting board; slicing, squeezing and pouring never deduct again.
  placeKumquats(prep, count = 2) {
    if (!prep || !prep.empty || !Number.isInteger(count) || count <= 0) return 0;
    if (!this.tutorial && (this.inventory.kumquat || 0) + 1e-9 < count) return 0;
    const used = Math.floor(this.consumeIngredient('kumquat', count) + 1e-9);
    const accepted = used >= count ? prep.place(count) : 0;
    this.refundIngredient('kumquat', used - accepted);
    return accepted;
  }
  // Stage a whole orange on the board; stock is deducted once when cut into squeeze + garnish portions.
  stageOrange(prep) {
    if (!prep || prep.orangeOnBoard || prep.orangeSliced) return 0;
    if (!this.tutorial && (this.inventory.orange || 0) + 1e-9 < 1) return 0;
    return prep.placeOrange() ? 1 : 0;
  }
  cutOrange(prep) {
    if (!prep) return false;
    if (prep.orangeSliced) {
      if (prep.orangeStockDeducted) return false;
      if (!this.tutorial && (this.inventory.orange || 0) + 1e-9 < 1) return false;
      const used = Math.floor(this.consumeIngredient('orange', 1) + 1e-9);
      if (used < 1) return false;
      prep.orangeStockDeducted = true;
      return true;
    }
    if (!prep.orangeOnBoard && !this.stageOrange(prep)) return false;
    if (!this.tutorial && (this.inventory.orange || 0) + 1e-9 < 1) return false;
    const used = Math.floor(this.consumeIngredient('orange', 1) + 1e-9);
    if (used < 1) return false;
    if (!prep.sliceOrange()) { this.refundIngredient('orange', used); return false; }
    prep.orangeStockDeducted = true;
    return true;
  }
  placeOrangeGarnishIntoGlass(drink, prep) {
    if (!drink || drink.consumed || drink.recipeId !== 'tradao' || !prep || prep.garnishSlices <= 0) return 0;
    if ((drink.getAmounts().orange || 0) >= 1) return 0;
    const slice = prep.takeGarnishSlice();
    if (!slice) return 0;
    const accepted = drink.addMeasuredIngredient('orange', slice);
    if (!accepted) prep.garnishSlices += slice;
    return accepted;
  }
  stageLemongrass(prep) {
    if (!prep || prep.lemongrassOnBoard || prep.lemongrassPrepared) return 0;
    if (!this.tutorial && (this.inventory.lemongrass || 0) + 1e-9 < 1) return 0;
    return prep.placeLemongrass() ? 1 : 0;
  }
  prepareLemongrass(prep, distance = 40) {
    if (!prep) return { progressed: 0, justPrepared: false };
    if (!prep.lemongrassOnBoard && !prep.lemongrassPrepared && !this.stageLemongrass(prep)) return { progressed: 0, justPrepared: false };
    if (!prep.lemongrassStockDeducted) {
      if (!this.tutorial && (this.inventory.lemongrass || 0) + 1e-9 < 1) return { progressed: 0, justPrepared: false };
      const used = Math.floor(this.consumeIngredient('lemongrass', 1) + 1e-9);
      if (used < 1) return { progressed: 0, justPrepared: false };
      prep.lemongrassStockDeducted = true;
      prep.lemongrassConsumed = 1;
    }
    return distance > 0 ? prep.rollLemongrass(distance) : { progressed: 0, justPrepared: prep.lemongrassPrepared };
  }
  placeLemongrassIntoGlass(drink, prep) {
    if (!drink || drink.consumed || drink.recipeId !== 'tradao' || !prep || !prep.lemongrassPrepared) return 0;
    if ((drink.getAmounts().lemongrass || 0) >= 1) return 0;
    const stalk = prep.takeLemongrass();
    if (!stalk) return 0;
    const accepted = drink.addMeasuredIngredient('lemongrass', stalk);
    if (!accepted) { prep.lemongrassOnBoard = true; prep.lemongrassAvailable = 1; prep.lemongrassPrepared = true; }
    return accepted;
  }
  pickPeachWithTongs(slices = 1) {
    if (!Number.isInteger(slices) || slices <= 0 || this.heldPeachSlices > 0) return 0;
    const packNeeded = slices * 0.25;
    if (!this.tutorial && (this.inventory.peach || 0) + 1e-9 < packNeeded) return 0;
    const used = this.consumeIngredient('peach', packNeeded);
    if (used + 1e-9 < packNeeded) { this.refundIngredient('peach', used); return 0; }
    this.heldPeachSlices = slices;
    return slices;
  }
  cancelPeachDrag() {
    if (!(this.heldPeachSlices > 0)) return 0;
    const slices = this.heldPeachSlices;
    this.heldPeachSlices = 0;
    this.refundIngredient('peach', slices * 0.25);
    return slices;
  }
  pickPeachSliceIntoGlass(drink, slices = 1) {
    if (!drink || drink.consumed || drink.recipeId !== 'tradao' || !Number.isInteger(slices) || slices <= 0) {
      this.cancelPeachDrag();
      return 0;
    }
    const current = drink.getAmounts().peach || 0;
    const room = Math.max(0, 4 - current);
    if (room <= 0) { this.cancelPeachDrag(); return 0; }
    const wanted = Math.min(slices, room);
    if (this.heldPeachSlices > 0) {
      const held = this.heldPeachSlices;
      this.heldPeachSlices = 0;
      const accepted = drink.addMeasuredIngredient('peach', Math.min(held, wanted));
      if (held > accepted) this.refundIngredient('peach', (held - accepted) * 0.25);
      return accepted;
    }
    const packNeeded = wanted * 0.25;
    if (!this.tutorial && (this.inventory.peach || 0) + 1e-9 < packNeeded) return 0;
    const used = this.consumeIngredient('peach', packNeeded);
    const takenSlices = Math.floor(used * 4 + 1e-9);
    if (takenSlices <= 0) { this.refundIngredient('peach', used); return 0; }
    const accepted = drink.addMeasuredIngredient('peach', takenSlices);
    this.refundIngredient('peach', used - accepted * 0.25);
    return accepted;
  }
  scoopLycheeFromCan(fruits = 1) {
    if (!Number.isInteger(fruits) || fruits <= 0 || this.heldLycheeFruits > 0) return 0;
    const packNeeded = fruits * 0.25;
    if (!this.tutorial && (this.inventory.lychee || 0) + 1e-9 < packNeeded) return 0;
    const used = this.consumeIngredient('lychee', packNeeded);
    if (used + 1e-9 < packNeeded) { this.refundIngredient('lychee', used); return 0; }
    this.heldLycheeFruits = fruits;
    return fruits;
  }
  cancelLycheeScoop() {
    if (!(this.heldLycheeFruits > 0)) return 0;
    const fruits = this.heldLycheeFruits;
    this.heldLycheeFruits = 0;
    this.refundIngredient('lychee', fruits * 0.25);
    return fruits;
  }
  scoopLycheeIntoGlass(drink, fruits = 1) {
    if (!drink || drink.consumed || drink.recipeId !== 'travai' || !Number.isInteger(fruits) || fruits <= 0) {
      this.cancelLycheeScoop();
      return 0;
    }
    const current = drink.getAmounts().lychee || 0;
    const room = Math.max(0, 5 - current);
    if (room <= 0) { this.cancelLycheeScoop(); return 0; }
    const wanted = Math.min(fruits, room);
    if (this.heldLycheeFruits > 0) {
      const held = this.heldLycheeFruits;
      this.heldLycheeFruits = 0;
      const accepted = drink.addMeasuredIngredient('lychee', Math.min(held, wanted));
      if (held > accepted) this.refundIngredient('lychee', (held - accepted) * 0.25);
      return accepted;
    }
    const packNeeded = wanted * 0.25;
    if (!this.tutorial && (this.inventory.lychee || 0) + 1e-9 < packNeeded) return 0;
    const used = this.consumeIngredient('lychee', packNeeded);
    const takenFruits = Math.floor(used * 4 + 1e-9);
    if (takenFruits <= 0) { this.refundIngredient('lychee', used); return 0; }
    const accepted = drink.addMeasuredIngredient('lychee', takenFruits);
    this.refundIngredient('lychee', used - accepted * 0.25);
    return accepted;
  }
  addLycheeGarnish(drink, useAllocated = true) {
    if (!drink || drink.consumed || drink.recipeId !== 'travai' || drink.preparation.lycheeGarnish) return 0;
    if (useAllocated) {
      if ((drink.getAmounts().lychee || 0) < 1) return 0;
      return drink.placeLycheeGarnish(true) ? 1 : 0;
    }
    const added = this.scoopLycheeIntoGlass(drink, 1);
    if (!added) return 0;
    drink.placeLycheeGarnish(false);
    return added;
  }
  scoopCacaoFromCan(grams = 5) {
    if (!Number.isFinite(grams) || grams <= 0 || this.heldCacaoGrams > 0) return 0;
    if (!this.tutorial && (this.inventory.cacao || 0) + 1e-9 < grams) return 0;
    const used = this.consumeIngredient('cacao', grams);
    if (used + 1e-9 < grams) { this.refundIngredient('cacao', used); return 0; }
    this.heldCacaoGrams = grams;
    return grams;
  }
  cancelCacaoScoop() {
    if (!(this.heldCacaoGrams > 0)) return 0;
    const grams = this.heldCacaoGrams;
    this.heldCacaoGrams = 0;
    this.refundIngredient('cacao', grams);
    return grams;
  }
  scoopCacaoIntoGlass(drink, grams = 5) {
    if (!drink || drink.consumed || drink.recipeId !== 'cacao' || !Number.isFinite(grams) || grams <= 0) {
      this.cancelCacaoScoop();
      return 0;
    }
    const current = drink.getAmounts().cacao || 0;
    const room = Math.max(0, 40 - current);
    if (room <= 0) { this.cancelCacaoScoop(); return 0; }
    const wanted = Math.min(grams, room);
    if (this.heldCacaoGrams > 0) {
      const held = this.heldCacaoGrams;
      this.heldCacaoGrams = 0;
      const accepted = drink.addMeasuredIngredient('cacao', Math.min(held, wanted));
      if (held > accepted) this.refundIngredient('cacao', held - accepted);
      return accepted;
    }
    if (!this.tutorial && (this.inventory.cacao || 0) + 1e-9 < wanted) return 0;
    const used = this.consumeIngredient('cacao', wanted);
    if (used <= 0) return 0;
    const accepted = drink.addMeasuredIngredient('cacao', used);
    this.refundIngredient('cacao', used - accepted);
    return accepted;
  }
  discardTraDaoPrep(prep) {
    if (!prep || prep.empty) return 0;
    const wasted = this.recordWaste(prep.stock());
    prep.clear();
    return wasted;
  }
  scoopMatchaFromTin(grams = 2) {
    if (!Number.isFinite(grams) || grams <= 0 || this.heldMatchaGrams > 0) return 0;
    if (!this.tutorial && (this.inventory.matcha || 0) + 1e-9 < grams) return 0;
    const used = this.consumeIngredient('matcha', grams);
    if (used + 1e-9 < grams) { this.refundIngredient('matcha', used); return 0; }
    this.heldMatchaGrams = grams;
    return grams;
  }
  cancelMatchaScoop() {
    if (!(this.heldMatchaGrams > 0)) return 0;
    const grams = this.heldMatchaGrams;
    this.heldMatchaGrams = 0;
    this.refundIngredient('matcha', grams);
    return grams;
  }
  scoopMatchaIntoBowl(bowl, grams = 2) {
    if (!bowl || !Number.isFinite(grams) || grams <= 0) {
      this.cancelMatchaScoop();
      return 0;
    }
    const current = bowl.amounts?.matcha || 0;
    const room = Math.max(0, 16 - current);
    if (room <= 0) { this.cancelMatchaScoop(); return 0; }
    const wanted = Math.min(grams, room);
    if (this.heldMatchaGrams > 0) {
      const held = this.heldMatchaGrams;
      this.heldMatchaGrams = 0;
      const accepted = bowl.add('matcha', Math.min(held, wanted));
      if (held > accepted) this.refundIngredient('matcha', held - accepted);
      return accepted;
    }
    if (!this.tutorial && (this.inventory.matcha || 0) + 1e-9 < wanted) return 0;
    const used = this.consumeIngredient('matcha', wanted);
    if (used <= 0) return 0;
    const accepted = bowl.add('matcha', used);
    this.refundIngredient('matcha', used - accepted);
    return accepted;
  }
  pourWarmWaterIntoBowl(bowl, ml) {
    if (!bowl || !Number.isFinite(ml) || ml <= 0) return 0;
    return bowl.add('water', ml);
  }
  discardMatchaBowl(bowl) {
    if (!bowl || bowl.empty) return 0;
    const wasted = this.recordWaste(bowl.stock());
    bowl.clear();
    return wasted;
  }
  scoopIceIntoGlass(drink, cubes = 1) {
    if (!drink || drink.consumed || !Number.isInteger(cubes) || cubes <= 0) return 0;
    const current = drink.getAmounts().ice || 0;
    const wanted = Math.min(cubes, Math.max(0, 12 - current));
    if (wanted <= 0) return 0;
    if (!this.tutorial && (this.inventory.ice || 0) * 3 + 1e-9 < 1) return 0;
    const taken = this.tutorial ? wanted : Math.floor(this.consumeIngredient('ice', wanted / 3) * 3 + 1e-9);
    if (taken <= 0) return 0;
    const accepted = drink.addMeasuredIngredient('ice', taken);
    this.refundIngredient('ice', (taken - accepted) / 3);
    return accepted;
  }
  // Blender jar: stock is charged exactly when an ingredient enters the jar; blending and serving never charge again.
  pourIntoBlender(jar, kind, amount) {
    if (!jar || jar.lid || !['coconutCream', 'condensed'].includes(kind)) return 0;
    const used = this.consumeIngredient(kind, amount), accepted = used ? jar.add(kind, used) : 0;
    this.refundIngredient(kind, used - accepted); return accepted;
  }
  scoopIceIntoBlender(jar, cubes = 3) {
    if (!jar || jar.lid) return 0;
    const wanted = Math.min(cubes, 12 - (jar.amounts.ice || 0)), taken = wanted > 0 ? this.tutorial ? wanted : this.consumeIngredient('ice', wanted / 3) * 3 : 0;
    const accepted = Math.floor(taken + 1e-9) ? jar.add('ice', Math.floor(taken + 1e-9)) : 0;
    this.refundIngredient('ice', (taken - accepted) / 3); return accepted;
  }
  addIce(drink) {
    if (!drink || drink.consumed || (!this.tutorial && this.inventory.ice < 1)) return false;
    const used = this.consumeIngredient('ice', 1);
    if ((!used && !this.tutorial) || !drink.addIngredient('ice', 3)) { this.refundIngredient('ice', used); return false; }
    return true;
  }
  ingredientSummary() {
    const used = normalizeInventory(this.ingredientUsed, emptyIngredientTotals());
    const wasted = normalizeInventory(this.ingredientWasted, emptyIngredientTotals());
    return { opening: { ...this.openingInventory }, remaining: { ...this.inventory }, used, cost: ingredientValue(used), wasted, wasteCost: ingredientValue(wasted) };
  }
  spawn() {
    const occupied = new Set(this.customers.map(c => c.seat));
    const seat = Array.from({ length: this.upgrades.seats }, (_, i) => i).find(s => !occupied.has(s));
    if (seat === undefined || this.customers.filter(c => !c.resolved).length >= this.maxCustomers) return null;
    const unlocked = unlockedRecipes(this.day, this.upgrades), recipes = this.availableRecipes();
    if (!recipes.length) { this.stockout = true; return null; }
    const uncommitted = this.tutorial ? this.inventory : this.uncommittedInventory();
    const unreserved = this.tutorial ? recipes : unlocked.filter(id => canPrepareRecipe(uncommitted, id));
    const candidateRecipes = unreserved.length ? unreserved : (this.customers.some(c => !c.resolved) ? [] : recipes);
    if (!candidateRecipes.length) return null;
    const scheduled = unlocked[this.spawnCount % unlocked.length];
    const start = unlocked.indexOf(scheduled);
    const recipeId = Array.from({ length: unlocked.length }, (_, i) => unlocked[(start + i) % unlocked.length]).find(id => candidateRecipes.includes(id));
    let archetype = ARCHETYPES[this.spawnCount % ARCHETYPES.length], vip = false;
    if (this.plan?.vip && !this.vipSpawned && this.spawnCount >= this.plan.vipAt) {
      archetype = VIPS.find(v => v.id === this.plan.vip) || archetype; vip = true; this.vipSpawned = true;
    }
    const modifiers = this.tutorial ? null : feasibleModifiersFor(recipeId, uncommitted);
    const c = new Customer(archetype, recipeId, seat, this.tutorial, modifiers);
    c.vip = vip; c.wrongOrders = 0;
    this.customers.push(c); this.spawnCount++; return c;
  }
  update(seconds) {
    if (this.ended) return [];
    const events = []; seconds = Math.max(0, seconds);
    const before = this.elapsed; this.elapsed += seconds;
    // Integrate the fan over the outage boundary rather than applying a whole long frame incorrectly.
    const outageOverlap = this.event === 'outage' ? Math.max(0, Math.min(this.elapsed, 75) - Math.max(before, 45)) : 0;
    const patienceSeconds = this.upgrades.fan ? seconds * 0.85 + outageOverlap * 0.15 : seconds;
    for (const customer of [...this.customers]) {
      customer.update(seconds, patienceSeconds);
      if (customer.state === 'WAITING' && customer.ratio <= 0) {
        if (this.lose(customer)) events.push({ type: 'lost', customer });
      }
      if (customer.state === 'LEAVING' && customer.stateTime > 1.2) this.customers = this.customers.filter(c => c.id !== customer.id);
    }
    if (!this.tutorial && !this.customers.some(c => !c.resolved) && this.availableRecipes().length === 0) {
      this.stockout = true; this.ended = true; this.endReason = 'stockout'; events.push({ type: 'end', reason: 'stockout' }); return events;
    }
    if (!this.tutorial && this.elapsed >= RULES.daySeconds) {
      for (const c of this.customers) if (!c.resolved) {
        if (c.state !== 'WAITING') { c.state = 'WAITING'; c.stateTime = 0; }
        if (this.lose(c)) events.push({ type: 'lost', customer: c });
      }
      this.ended = true; this.endReason = 'closing'; events.push({ type: 'end', reason: 'closing' }); return events;
    }
    if (this.tutorial && this.served >= 3) { this.ended = true; events.push({ type: 'end' }); return events; }
    if ((this.tutorial || this.elapsed < RULES.lastArrival) && this.elapsed >= this.nextSpawn) {
      const customer = this.spawn();
      if (customer) { events.push({ type: 'arrived', customer }); this.nextSpawn = this.elapsed + (this.tutorial ? 1 : this.arrivalInterval()); }
      else if (!this.tutorial && this.stockout && !this.customers.some(c => !c.resolved)) {
        this.ended = true; this.endReason = 'stockout'; events.push({ type: 'end', reason: 'stockout' }); return events;
      }
    }
    return events;
  }
  lose(customer) {
    if (!this.customers.includes(customer) || !customer.resolve('lost')) return false;
    this.lost++; this.combo = 0; this.ratings.push(2); if (this.rush) this.rushLost++;
    this.setReview(['Cà phê thơm mà chờ lâu quá, hẹn quán lần sau.', 'Ghế còn ấm mà phải đi rồi. Mai quán pha nhanh hơn nha.']); return true;
  }
  setReview(lines) {
    const choices = lines.filter(line => line !== this.review);
    this.review = choices[Math.floor(this.random() * choices.length)] || lines[0];
  }
  serve(customer, drink) {
    if (this.ended || !customer || !this.customers.includes(customer) || customer.resolved || customer.state !== 'WAITING' || !drink || drink.consumed) return { valid: false, ignored: true, message: 'Khách chưa gọi món hoặc đã rời đi.' };
    const result = ['tratac', 'tradao', 'travai', 'cacao', 'matcha'].includes(customer.recipeId) ? drink.evaluate(customer.recipeId, customer.modifiers) : drink.evaluate(customer.recipeId);
    if (!result.valid) { this.combo = 0; customer.wrongOrders++; this.wrongOrders++; this.setReview(['Gọi một món, đưa một món khác. Quán xem lại sổ nha!', 'Ly này chưa đúng món của mình, nhờ quán pha lại nhé.']); return result; }
    if (!customer.resolve('served')) return { valid: false, ignored: true };
    drink.consumed = true;
    if (!this.tutorial) {
      const snap = v => { const r = Math.round(v * 1000) / 1000, h = Math.round(r * 4) / 4; return Math.abs(r - h) < 0.002 ? h : r; };
      for (const [id, amount] of Object.entries(drinkStockAmounts(drink))) if (Object.hasOwn(INGREDIENTS, id) && amount > 0) {
        this.servedIngredients[id] = snap((this.servedIngredients[id] || 0) + amount);
      }
    }
    if (customer.recipeId === 'muoi') { customer.servedDrink = drink; if (result.quality === 'ACCEPTABLE') customer.type = { ...customer.type, happy: 'Kem hơi lệch vị, lần sau pha khéo hơn nha.' }; }
    if (customer.recipeId === 'cotdua') { customer.servedDrink = drink; if (result.quality === 'ACCEPTABLE') customer.type = { ...customer.type, happy: result.message.includes('loãng') ? 'Dừa hơi loãng, lần sau xay vừa thôi nha.' : 'Còn hơi lợn cợn đá, lần sau xay mịn hơn nha.' }; }
    if (customer.recipeId === 'tratac') { customer.servedDrink = drink; if (result.quality === 'ACCEPTABLE') customer.type = { ...customer.type, happy: result.message.includes('ngọt') ? 'Hơi ngọt so với anh dặn, lần sau canh siro nha.' : 'Vị tắc hơi nhạt, lần sau vắt kỹ hơn nha.' }; }
    if (customer.recipeId === 'tradao') { customer.servedDrink = drink; if (result.quality === 'ACCEPTABLE') customer.type = { ...customer.type, happy: result.message.includes('đào') ? 'Hơi ít đào so với chị dặn, lần sau gắp thêm nha.' : 'Trà đào hơi lệch vị chút, lần sau pha khéo hơn nha.' }; }
    if (customer.recipeId === 'travai') { customer.servedDrink = drink; if (result.quality === 'ACCEPTABLE') customer.type = { ...customer.type, happy: result.message.includes('vải') ? 'Hơi thiếu trái vải em dặn, lần sau múc thêm nha.' : 'Trà vải hơi lệch độ ngọt, lần sau canh siro nha.' }; }
    if (customer.recipeId === 'cacao') { customer.servedDrink = drink; if (result.quality === 'ACCEPTABLE') customer.type = { ...customer.type, happy: result.message.includes('lợn cợn') || result.message.includes('vón cục') ? 'Cacao còn hơi vón bột, lần sau khuấy kỹ hơn nha.' : 'Vị cacao sữa hơi lệch chút, lần sau canh chuẩn hơn nha.' }; }
    if (customer.recipeId === 'matcha') { customer.servedDrink = drink; if (result.quality === 'ACCEPTABLE') customer.type = { ...customer.type, happy: result.message.includes('vón') || result.message.includes('bọt') ? 'Matcha còn hơi vón bột, lần sau đánh chổi tre kỹ hơn nha.' : 'Vị matcha latte hơi lệch chút, lần sau canh chuẩn hơn nha.' }; }
    const price = RECIPES[customer.recipeId].price;
    const premium = this.upgrades.premium && ['sua', 'bac'].includes(customer.recipeId) ? 1.2 : 1;
    const eventTip = this.event === 'rain' ? 1.2 : this.event === 'lucky' ? 1.25 : 1;
    const tip = Math.round(price * RULES.tipRates[result.quality] * (result.tipMultiplier || 1) * premium * eventTip * (customer.vip ? 1.5 : 1) / 100) * 100;
    this.revenue += price; this.tips += tip; this.served++; this.combo++; this.recipes[customer.recipeId] = (this.recipes[customer.recipeId] || 0) + 1;
    if (this.rush) this.rushServed++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const reviewerBonus = customer.type.id === 'reviewer' && result.quality === 'PERFECT' ? 10000 : 0;
    const fast = speedBonus(price, customer.ratio, this.tutorial);
    if (fast) { this.speedBonuses += fast; this.fastServes++; }
    const bonus = (RULES.comboRewards[this.combo] || 0) + reviewerBonus + fast;
    this.bonuses += bonus;
    if (result.quality === 'PERFECT') this.perfect++;
    const rating = Math.min(5, Math.max(3, result.score - (customer.ratio < 0.25 ? 0.4 : 0) - (customer.wrongOrders ? 0.2 : 0) + (this.upgrades.decor ? 0.1 : 0)));
    this.ratings.push(rating); if (reviewerBonus) this.ratings.push(5);
    const id = customer.type.id;
    let story = null;
    if (!this.tutorial && STORIES[id] && !this.storyEncounters.has(id)) {
      this.storyEncounters.add(id);
      const previous = this.stories[id] || emptyStories()[id], next = storyAfter(previous, this.day);
      if (next.chapter > previous.chapter) {
        story = { id, chapter: next.chapter, name: STORIES[id].name, text: STORIES[id].chapters[next.chapter - 1] }; this.storyMessages.push(story);
      }
    }
    const lines = customer.wrongOrders ? ['Pha lại đúng rồi! Nhớ nhìn đơn trước nha quán.', 'Hơi lộn món lúc đầu, nhưng quán sửa rất dễ thương.']
      : customer.ratio < 0.25 ? ['Cà phê ổn, mà ngồi chờ tới thuộc bài nhạc luôn.', 'Ngon đó, lần sau pha nhanh chút cho kịp giờ làm nha.']
        : result.quality === 'PERFECT' ? ['Cà phê ngon, ghế nhựa hơi thấp mà lòng vui quá!', 'Một ngụm là thấy Sài Gòn dễ thương liền!', 'Phin nhỏ từng giọt, niềm vui đầy cả ly.']
          : ['Quán nhỏ mà có gu. Mai ghé tiếp!', 'Cà phê vừa miệng, buổi sáng vừa vui.'];
    this.setReview(lines);
    return { ...result, price, tip, bonus, reviewerBonus, speedBonus: fast, combo: this.combo, story, total: price + tip + bonus };
  }
  summary() {
    const ingredients = this.ingredientSummary();
    return { day: this.day, tutorial: this.tutorial, revenue: this.revenue, tips: this.tips, bonuses: this.bonuses, earnings: this.earnings,
      ingredientCost: ingredients.cost, wasteCost: ingredients.wasteCost, grossProfit: this.earnings - ingredients.cost,
      served: this.served, lost: this.lost, perfect: this.perfect, bestCombo: this.bestCombo, elapsed: this.elapsed, ended: this.ended,
      event: this.event, challenge: this.plan?.challenge, challengeComplete: this.challenge.complete,
      recipes: { ...this.recipes }, storyEncounters: [...this.storyEncounters], rushServed: this.rushServed, rushLost: this.rushLost, wrongOrders: this.wrongOrders,
      ingredients, endReason: this.endReason, speedBonuses: this.speedBonuses, fastServes: this.fastServes,
      ...(() => { const result = dayStars(this.starGoals, this, true); return { starGoals: result.results, stars: this.tutorial ? 0 : result.stars }; })(),
      rating: this.rating, ratings: [...this.ratings], review: this.review || 'Một buổi sáng yên tĩnh. Ngày mai mình thử lại nhé!' };
  }
}
