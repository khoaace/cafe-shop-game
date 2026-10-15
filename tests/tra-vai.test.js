import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, ARCHETYPES, unlockedRecipes } from '../src/config.js';
import { INGREDIENTS, INITIAL_INVENTORY, canPrepareRecipe, usablePortions, createSupplyPlan } from '../src/logic/inventory.js';
import { SaveManager, freshSave, SAVE_KEY } from '../src/systems/SaveManager.js';
import { DaySession } from '../src/models/DaySession.js';
import { Drink } from '../src/models/Drink.js';
import { Customer } from '../src/models/Customer.js';
import { recipePreview } from '../src/models/recipePreview.js';
import {
  TRAVAI_TEA_TARGET,
  TRAVAI_SYRUP_TARGET,
  TRAVAI_LYCHEE_TARGET,
  TRAVAI_ICE_TARGET,
  traVaiTargets,
  normalizeTraVaiModifiers,
} from '../src/models/TraVaiPrep.js';

const memory = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

const session = (inventory = {}, day = 4) =>
  new DaySession(day, false, () => 0, {
    upgrades: { phins: 2, seats: 4 },
    inventory: { ...INITIAL_INVENTORY, ...inventory },
  });

function prepareFullTraVai(s, {
  modifiers = null,
  lycheeCount = null,
  syrupMl = null,
  teaMl = TRAVAI_TEA_TARGET,
  iceCubes = null,
  garnishMode = 'none', // 'none' | 'allocated' | 'extra'
} = {}) {
  const targets = traVaiTargets(modifiers);
  const fruits = lycheeCount ?? targets.lychee;
  const syrup = syrupMl ?? targets.lycheeSyrup;
  const cubes = iceCubes ?? targets.ice;
  const drink = new Drink('travai', modifiers);

  // Step 1: Scoop lychee fruits one by one
  for (let i = 0; i < fruits; i++) {
    assert.equal(s.scoopLycheeFromCan(1), 1);
    assert.equal(s.scoopLycheeIntoGlass(drink, 1), 1);
  }
  // Step 2: Pour lychee syrup
  s.pourIngredient(drink, 'lycheeSyrup', syrup);
  // Step 3: Pour prepared tea
  s.pourIngredient(drink, 'tea', teaMl);
  // Step 4: Scoop ice cubes
  s.scoopIceIntoGlass(drink, cubes);
  // Step 5: Optional garnish & gentle stir
  if (garnishMode === 'allocated') {
    assert.equal(s.addLycheeGarnish(drink, true), 1);
  } else if (garnishMode === 'extra') {
    assert.equal(s.addLycheeGarnish(drink, false), 1);
  }
  drink.stirBy(Math.PI * 2);
  return drink;
}

test('recipe & shop catalog: Trà vải (24.000đ) unlocks on Day 4 and lychee & syrup can be purchased and converted to portions', () => {
  const r = RECIPES.travai;
  assert.ok(r, 'RECIPES.travai should be defined');
  assert.equal(r.name, 'Trà vải');
  assert.equal(r.price, 24000);
  assert.equal(r.unlock.day, 4);
  assert.ok(!unlockedRecipes(3).includes('travai'));
  assert.ok(unlockedRecipes(4).includes('travai'));
  assert.deepEqual(r.supplies, { tea: 150, lychee: 0.5, lycheeSyrup: 20, ice: 1 });

  // Catalog definitions and package-to-portion conversion (1 lon = 4 trái, pack = 2 lon = 8 trái)
  assert.equal(INGREDIENTS.lychee.price, 16000);
  assert.equal(INGREDIENTS.lychee.pack, 2);
  assert.equal(INGREDIENTS.lychee.portionsPerUnit, 4);
  assert.equal(INGREDIENTS.lycheeSyrup.price, 16000);
  assert.equal(INGREDIENTS.lycheeSyrup.pack, 160);

  const save = new SaveManager(memory());
  save.data.day = 4;
  save.data.balance = 80000;
  assert.equal(save.data.inventory.lychee, 2); // 8 fruits
  assert.equal(usablePortions(save.data.inventory, 'lychee'), 8);
  assert.equal(save.data.inventory.lycheeSyrup, 100);

  assert.equal(save.purchaseIngredient('lychee', 2).ok, true);
  assert.equal(save.data.inventory.lychee, 4); // 16 fruits
  assert.equal(usablePortions(save.data.inventory, 'lychee'), 16);

  assert.equal(save.purchaseIngredient('lycheeSyrup', 100).ok, true);
  assert.equal(save.data.inventory.lycheeSyrup, 260);
  assert.equal(save.data.balance, 80000 - 16000 - 16000);

  // Shortage detection blocks recipe when lychee or syrup is missing
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, lychee: 0.25 }, 'travai'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, lycheeSyrup: 19 }, 'travai'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, lychee: 0.5, lycheeSyrup: 20, tea: 150, ice: 1 }, 'travai'), true);

  const plan = createSupplyPlan({ ...INITIAL_INVENTORY, lychee: 0, lycheeSyrup: 0 }, 4, 6);
  assert.ok(plan.items.some(i => i.id === 'lychee'));
  assert.ok(plan.items.some(i => i.id === 'lycheeSyrup'));
});

test('lychee scoop & optional garnish: cancelled drag does not deduct stock; each transferred fruit deducts 0.25 lon; allocated garnish is free', () => {
  const s = session({ lychee: 2, lycheeSyrup: 100, tea: 300, ice: 6 });
  const drink = new Drink('travai');

  // Cancelled scoop refunds the held lychee back to the container
  assert.equal(s.scoopLycheeFromCan(1), 1);
  assert.equal(s.inventory.lychee, 1.75);
  assert.equal(s.cancelLycheeScoop(), 1);
  assert.equal(s.inventory.lychee, 2);
  assert.equal(s.ingredientUsed.lychee, 0);

  // Scooping 2 fruits into the glass deducts 0.5 lon (2 fruits)
  assert.equal(s.scoopLycheeFromCan(1), 1);
  assert.equal(s.scoopLycheeIntoGlass(drink, 1), 1);
  assert.equal(s.scoopLycheeFromCan(1), 1);
  assert.equal(s.scoopLycheeIntoGlass(drink, 1), 1);
  assert.equal(drink.getAmounts().lychee, 2);
  assert.equal(s.inventory.lychee, 1.5);
  assert.equal(usablePortions(s.inventory, 'lychee'), 6);

  // Pinning an already-allocated lychee onto the rim does NOT deduct additional fruit
  assert.equal(s.addLycheeGarnish(drink, true), 1);
  assert.equal(drink.preparation.lycheeGarnish, true);
  assert.equal(drink.preparation.lycheeGarnishFromAllocated, true);
  assert.equal(s.inventory.lychee, 1.5);
  assert.equal(drink.getAmounts().lychee, 2);

  // On a second cup, explicitly adding an extra garnish fruit deducts 1 extra fruit (0.25 lon)
  const drink2 = prepareFullTraVai(s, { lycheeCount: 2, garnishMode: 'extra' });
  assert.equal(drink2.preparation.lycheeGarnish, true);
  assert.equal(drink2.preparation.lycheeGarnishFromAllocated, false);
  assert.equal(drink2.getAmounts().lychee, 3);
  assert.equal(s.inventory.lychee, 0.75); // 2 - 0.5 (cup1) - 0.75 (cup2 with extra garnish) = 0.75
  assert.equal(drink2.evaluate('travai').quality, 'PERFECT');
});

test('measured volumes for syrup, tea, and ice consume exact stock; stirring and serving never double-deduct', () => {
  const s = session({ lychee: 2, lycheeSyrup: 100, tea: 300, ice: 6 });
  const drink = prepareFullTraVai(s, { lycheeCount: 2, syrupMl: TRAVAI_SYRUP_TARGET, teaMl: TRAVAI_TEA_TARGET, iceCubes: TRAVAI_ICE_TARGET, garnishMode: 'allocated' });

  const afterPrep = { ...s.inventory };
  assert.equal(afterPrep.lychee, 1.5);
  assert.equal(afterPrep.lycheeSyrup, 80);
  assert.equal(afterPrep.tea, 150);
  assert.equal(afterPrep.ice, 5);

  // Stirring again does not consume stock
  drink.stirBy(Math.PI * 2);
  assert.deepEqual(s.inventory, afterPrep);

  const evalStandard = drink.evaluate('travai', { lychee: 'normal', sweetness: 'normal', ice: 'normal' });
  assert.equal(evalStandard.valid, true);
  assert.equal(evalStandard.quality, 'PERFECT');

  // Serving does not deduct any stock a second time
  const customer = new Customer(ARCHETYPES[2], 'travai', 0, false, { lychee: 'normal', sweetness: 'normal', ice: 'normal' });
  for (const state of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) customer.transition(state);
  s.customers.push(customer);
  const res = s.serve(customer, drink);
  assert.equal(res.valid, true);
  assert.equal(res.quality, 'PERFECT');
  assert.deepEqual(s.inventory, afterPrep);
});

test('customer dialogue, custom modifiers ("nhiều vải", "ít ngọt", "nhiều đá"), waste tracking, and save migration', () => {
  const s = session({ lychee: 3, lycheeSyrup: 120, tea: 450, ice: 9 });

  // Default Trà vải customer asks: "Cho em trà vải nhiều trái nha!" ({ lychee: 'more' } -> 3 fruits)
  const customer = new Customer(ARCHETYPES[2], 'travai', 0);
  assert.equal(customer.type.line, 'Cho em trà vải nhiều trái nha!');
  assert.equal(customer.type.happy, 'Vải thơm ngọt quá, uống mát ghê!');
  assert.deepEqual(customer.modifiers, { lychee: 'more', sweetness: 'normal', ice: 'normal' });

  for (const state of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) customer.transition(state);
  s.customers.push(customer);

  const perfectMoreLychee = prepareFullTraVai(s, { modifiers: customer.modifiers });
  assert.equal(perfectMoreLychee.getAmounts().lychee, 3);
  assert.equal(s.inventory.lychee, 2.25); // 3 fruits = 0.75 lon deducted

  const served = s.serve(customer, perfectMoreLychee);
  assert.equal(served.valid, true);
  assert.equal(served.quality, 'PERFECT');
  assert.equal(served.price, 24000);
  assert.equal(customer.type.happy, 'Vải thơm ngọt quá, uống mát ghê!');

  // Combined custom modifiers: "nhiều vải, ít ngọt, nhiều đá" -> 3 lychees, 10ml syrup, 4 ice cubes (120g)
  const comboMods = normalizeTraVaiModifiers('Cho em trà vải nhiều vải, ít ngọt, nhiều đá nha!');
  assert.deepEqual(comboMods, { lychee: 'more', sweetness: 'less', ice: 'more' });
  const comboTargets = traVaiTargets(comboMods);
  assert.equal(comboTargets.lychee, 3);
  assert.equal(comboTargets.lycheeSyrup, 10);
  assert.equal(comboTargets.ice, 4);
  assert.equal(comboTargets.iceGrams, 120);

  const beforeCombo = { ...s.inventory };
  const comboDrink = prepareFullTraVai(s, { modifiers: comboMods });
  assert.equal(beforeCombo.lychee - s.inventory.lychee, 0.75); // 3 fruits
  assert.equal(beforeCombo.lycheeSyrup - s.inventory.lycheeSyrup, 10); // 10 ml
  assert.ok(Math.abs((beforeCombo.ice - s.inventory.ice) - 4 / 3) < 0.01); // 4 cubes
  assert.equal(comboDrink.evaluate('travai', comboMods).quality, 'PERFECT');

  // Discarding a drink records waste without refunding stock
  s.recordDrinkWaste(comboDrink);
  const summary = s.ingredientSummary();
  assert.equal(summary.wasted.lychee, 0.75);
  assert.equal(summary.wasted.lycheeSyrup, 10);
  assert.equal(summary.wasted.tea, 150);

  // Preview and existing save compatibility
  const preview = recipePreview(RECIPES.travai);
  assert.equal(preview.recipeId, 'travai');
  assert.equal(preview.preparation.amounts.tea, 150);
  assert.equal(preview.preparation.amounts.lychee, 2);

  const old = freshSave();
  delete old.inventory.lychee;
  delete old.inventory.lycheeSyrup;
  delete old.mastery.travai;
  const loaded = new SaveManager(memory({ [SAVE_KEY]: JSON.stringify(old) }));
  assert.equal(loaded.data.inventory.lychee, 2);
  assert.equal(loaded.data.inventory.lycheeSyrup, 100);
  assert.equal(loaded.data.mastery.travai, 0);
});
