import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TraDaoPrep,
  TRADAO_TEA_TARGET,
  TRADAO_SYRUP_TARGET,
  TRADAO_ORANGE_JUICE_TARGET,
  traDaoTargets,
  normalizeTraDaoModifiers,
} from '../src/models/TraDaoPrep.js';
import { Drink } from '../src/models/Drink.js';
import { BrewingStation } from '../src/models/BrewingStation.js';
import { LiquidPourSystem } from '../src/systems/preparation/LiquidPourSystem.js';
import { FruitPreparationSystem } from '../src/systems/preparation/FruitPreparationSystem.js';
import { DaySession } from '../src/models/DaySession.js';
import { Customer } from '../src/models/Customer.js';
import { SaveManager } from '../src/systems/SaveManager.js';
import { RECIPES, ARCHETYPES, unlockedRecipes } from '../src/config.js';
import {
  INGREDIENTS,
  INITIAL_INVENTORY,
  canPrepareRecipe,
  recipeNeeds,
  usablePortions,
} from '../src/logic/inventory.js';
import { recipePreview } from '../src/models/recipePreview.js';

function memory(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
}

function createSession(inventory = {}, day = 4) {
  return new DaySession(day, false, () => 0, {
    upgrades: { phins: 2, seats: 3 },
    inventory: { ...INITIAL_INVENTORY, ...inventory },
  });
}

function prepareFullTraDao(session, { peachSlices = 2, syrup = TRADAO_SYRUP_TARGET, tea = TRADAO_TEA_TARGET, iceCubes = 3, withGarnish = true, modifiers = null } = {}) {
  const prep = new TraDaoPrep();
  assert.equal(session.stageOrange(prep), 1);
  assert.equal(session.cutOrange(prep), true);
  prep.squeezeOrange(80);

  assert.equal(session.stageLemongrass(prep), 1);
  session.prepareLemongrass(prep, 40);
  assert.equal(prep.lemongrassPrepared, true);

  const drink = new Drink('tradao', modifiers);
  assert.equal(session.placeLemongrassIntoGlass(drink, prep), 1);
  for (let i = 0; i < peachSlices; i++) {
    assert.equal(session.pickPeachWithTongs(1), 1);
    assert.equal(session.pickPeachSliceIntoGlass(drink, 1), 1);
  }
  assert.equal(session.pourIngredient(drink, 'tea', tea), tea);
  assert.equal(session.pourIngredient(drink, 'peachSyrup', syrup), syrup);
  new LiquidPourSystem().transfer(prep, 100, m => drink.acceptPreparedMixture(m, prep));
  for (let i = 0; i < iceCubes; i++) {
    assert.equal(session.scoopIceIntoGlass(drink, 1), 1);
  }
  if (withGarnish) {
    assert.equal(session.placeOrangeGarnishIntoGlass(drink, prep), 1);
  }
  return { drink, prep };
}

test('recipe & shop catalog: Trà đào cam sả (25.000đ) unlocks on Day 4 and new ingredients can be purchased and converted to portions', () => {
  assert.equal(RECIPES.tradao.name, 'Trà đào cam sả');
  assert.equal(RECIPES.tradao.price, 25000);
  assert.ok(!unlockedRecipes(3).includes('tradao'));
  assert.ok(unlockedRecipes(4).includes('tradao'));

  assert.deepEqual(recipeNeeds('tradao'), {
    coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 1, cream: 0, salt: 0, coconutCream: 0,
    tea: 140, kumquat: 0, syrup: 0,
    peach: 0.5, orange: 1, lemongrass: 1, peachSyrup: 20, lychee: 0, lycheeSyrup: 0, cacao: 0, matcha: 0,
  });

  // Canned peach package-to-portion conversion: 1 hộp = 4 miếng đào (initial 2 hộp = 8 miếng).
  assert.equal(INITIAL_INVENTORY.peach, 2);
  assert.equal(usablePortions(INITIAL_INVENTORY, 'peach'), 8);
  assert.equal(usablePortions(INITIAL_INVENTORY, 'orange'), 5);
  assert.equal(usablePortions(INITIAL_INVENTORY, 'lemongrass'), 6);
  assert.equal(usablePortions(INITIAL_INVENTORY, 'ice'), 36);

  const storage = memory();
  const save = new SaveManager(storage);
  save.data.balance = 100000;

  for (const id of ['peach', 'orange', 'lemongrass', 'peachSyrup']) {
    const before = save.data.inventory[id];
    const res = save.purchaseIngredient(id, before);
    assert.equal(res.ok, true);
    assert.equal(save.data.inventory[id], before + INGREDIENTS[id].pack);
  }
  assert.equal(usablePortions(save.data.inventory, 'peach'), 16);

  const reloaded = new SaveManager(storage);
  assert.equal(reloaded.data.inventory.peach, save.data.inventory.peach);
  assert.equal(reloaded.data.inventory.orange, save.data.inventory.orange);
  assert.equal(reloaded.data.inventory.lemongrass, save.data.inventory.lemongrass);
  assert.equal(reloaded.data.inventory.peachSyrup, save.data.inventory.peachSyrup);
});

test('orange consumption: cutting 1 orange deducts 1 fruit once and creates both squeeze and garnish portions without double deduction', () => {
  const s = createSession({ orange: 3 });
  const prep = new TraDaoPrep();
  const fruitSys = new FruitPreparationSystem();
  const center = { x: 0, y: 0, radius: 28 };

  // Staging an orange on the board does not deduct until cut.
  assert.equal(s.stageOrange(prep), 1);
  assert.equal(s.inventory.orange, 3);

  // Swipe to slice deducts 1 whole orange once and creates 1 squeeze portion + 1 garnish slice.
  fruitSys.move(1, prep, { x: -20, y: 0, time: 0 }, center, 'slice');
  const sliced = fruitSys.move(1, prep, { x: 20, y: 0, time: 20 }, center, 'slice');
  fruitSys.end(1);
  assert.equal(sliced, 1);
  assert.equal(s.cutOrange(prep), true);
  assert.equal(s.inventory.orange, 2);
  assert.equal(prep.squeezePortions, 1);
  assert.equal(prep.garnishSlices, 1);

  // Attempting to cut the same orange again does not deduct another orange.
  assert.equal(s.cutOrange(prep), false);
  assert.equal(s.inventory.orange, 2);

  // Squeezing the prepared portion extracts 30 ml orange juice without deducting any more oranges.
  let strokes = 0;
  while (prep.extractedJuice < TRADAO_ORANGE_JUICE_TARGET - 0.01 && strokes < 12) {
    strokes++;
    fruitSys.move(2, prep, { x: -12, y: 0, time: strokes * 40 }, center, 'squeeze');
    fruitSys.move(2, prep, { x: 14, y: 0, time: strokes * 40 + 18 }, center, 'squeeze');
    fruitSys.end(2);
  }
  assert.equal(prep.extractedJuice, TRADAO_ORANGE_JUICE_TARGET);
  assert.equal(s.inventory.orange, 2);

  // Pouring the orange juice and placing the garnish slice onto the glass do not deduct another orange.
  const d = new Drink('tradao');
  new LiquidPourSystem().transfer(prep, 100, m => d.acceptPreparedMixture(m, prep));
  assert.equal(d.getAmounts().orangeJuice, 30);
  assert.equal(s.inventory.orange, 2);

  assert.equal(s.placeOrangeGarnishIntoGlass(d, prep), 1);
  assert.equal(d.getAmounts().orange, 1);
  assert.equal(prep.garnishSlices, 0);
  assert.equal(s.inventory.orange, 2);

  // An already used garnish slice cannot be placed again.
  const d2 = new Drink('tradao');
  assert.equal(s.placeOrangeGarnishIntoGlass(d2, prep), 0);
});

test('lemongrass preparation: press-and-roll gesture deducts 1 stalk once and transfers into glass without duplicate deduction', () => {
  const s = createSession({ lemongrass: 4 });
  const prep = new TraDaoPrep();
  assert.equal(s.stageLemongrass(prep), 1);
  assert.equal(s.inventory.lemongrass, 4);

  const r1 = s.prepareLemongrass(prep, 18);
  assert.equal(r1.justPrepared, false);
  assert.equal(s.inventory.lemongrass, 3);

  const r2 = s.prepareLemongrass(prep, 20);
  assert.equal(r2.justPrepared, true);
  assert.equal(prep.lemongrassPrepared, true);
  assert.equal(s.inventory.lemongrass, 3);

  const d = new Drink('tradao');
  assert.equal(s.placeLemongrassIntoGlass(d, prep), 1);
  assert.equal(d.getAmounts().lemongrass, 1);
  assert.equal(s.inventory.lemongrass, 3);
  assert.equal(s.placeLemongrassIntoGlass(d, prep), 0);
});

test('peach tongs edge cases: cancelled drag does not deduct unused peach, and used slices cannot reappear as free inventory', () => {
  const s = createSession({ peach: 1 }); // 1 hộp = 4 miếng
  assert.equal(usablePortions(s.inventory, 'peach'), 4);

  // Pick 1 peach slice with tongs, then cancel the drag: stock is restored to 4 slices (1.0 hộp).
  assert.equal(s.pickPeachWithTongs(1), 1);
  assert.equal(s.inventory.peach, 0.75);
  assert.equal(s.cancelPeachDrag(), 1);
  assert.equal(s.inventory.peach, 1);
  assert.equal(s.ingredientSummary().used.peach, 0);

  // Pick and drop 2 peach slices into the glass: deducts 0.5 hộp (2 slices) permanently.
  const d = new Drink('tradao');
  assert.equal(s.pickPeachWithTongs(1), 1);
  assert.equal(s.pickPeachSliceIntoGlass(d, 1), 1);
  assert.equal(s.pickPeachWithTongs(1), 1);
  assert.equal(s.pickPeachSliceIntoGlass(d, 1), 1);
  assert.equal(d.getAmounts().peach, 2);
  assert.equal(s.inventory.peach, 0.5);
  assert.equal(usablePortions(s.inventory, 'peach'), 2);

  // Calling cancelPeachDrag after the slice was already placed in the glass cannot refund it.
  assert.equal(s.cancelPeachDrag(), 0);
  assert.equal(s.inventory.peach, 0.5);
});

test('customer integration, modifiers ("nhiều đào"), decorative tolerance, and waste tracking', () => {
  const customer = new Customer(ARCHETYPES[1], 'tradao', 0);
  assert.equal(customer.type.line, 'Cho chị trà đào cam sả, nhiều đào nha!');
  assert.deepEqual(customer.modifiers, { peach: 'more', sweetness: 'normal', ice: 'normal' });
  assert.equal(customer.modifierLabel, 'nhiều đào');
  assert.equal(traDaoTargets(customer.modifiers).peach, 3);

  const station = new BrewingStation('s1');
  station.chooseRecipe('tradao', customer.modifiers);
  assert.deepEqual(station.modifiers, customer.modifiers);

  const s = createSession({ orange: 3, lemongrass: 3, peach: 2, tea: 500, peachSyrup: 100, ice: 5 });

  // 1) Perfect 3-peach preparation for "nhiều đào" customer:
  const { drink: perfectDrink } = prepareFullTraDao(s, { peachSlices: 3, modifiers: customer.modifiers });
  const evalPerfect = perfectDrink.evaluate('tradao', customer.modifiers);
  assert.equal(evalPerfect.valid, true);
  assert.equal(evalPerfect.quality, 'PERFECT');

  // Serving does not deduct any stock a second time.
  const invBeforeServe = { ...s.inventory };
  const waitingCustomer = s.spawn();
  waitingCustomer.recipeId = 'tradao';
  waitingCustomer.modifiers = normalizeTraDaoModifiers({ peach: 'more' });
  for (const st of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) waitingCustomer.transition(st);
  const served = s.serve(waitingCustomer, perfectDrink);
  assert.equal(served.valid, true);
  assert.equal(served.price, 25000);
  assert.deepEqual(s.inventory, invBeforeServe);
  assert.equal(s.recipes.tradao, 1);

  // 2) Minor decorative mistake (missing orange garnish slice) stays valid and lowers quality to GOOD instead of invalidating.
  const { drink: noGarnishDrink } = prepareFullTraDao(s, { peachSlices: 2, withGarnish: false });
  const evalNoGarnish = noGarnishDrink.evaluate('tradao');
  assert.equal(evalNoGarnish.valid, true);
  assert.equal(evalNoGarnish.quality, 'GOOD');

  // 3) Discarding a wrongly prepared drink or prep board keeps stock consumed and records waste.
  s.recordDrinkWaste(noGarnishDrink);
  const summary = s.ingredientSummary();
  assert.equal(summary.wasted.peach, 0.5);
  assert.equal(summary.wasted.orange, 1);
  assert.equal(summary.wasted.lemongrass, 1);
  assert.equal(summary.wasted.peachSyrup, 20);
  assert.equal(summary.wasted.tea, 140);

  // Preview for notebook is ready.
  const preview = recipePreview(RECIPES.tradao);
  assert.equal(preview.recipeId, 'tradao');
  assert.equal(preview.preparation.amounts.tea, 140);
  assert.equal(preview.preparation.amounts.peach, 2);
});
