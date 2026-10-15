import test from 'node:test';
import assert from 'node:assert/strict';
import { KumquatPrep, KUMQUAT_FRUITS, JUICE_TARGET, TEA_TARGET, SYRUP_TARGET, modifierTargets, formatModifierLabel } from '../src/models/KumquatPrep.js';
import { FruitPreparationSystem } from '../src/systems/preparation/FruitPreparationSystem.js';
import { LiquidPourSystem } from '../src/systems/preparation/LiquidPourSystem.js';
import { StirringSystem } from '../src/systems/preparation/StirringSystem.js';
import { Drink } from '../src/models/Drink.js';
import { BrewingStation } from '../src/models/BrewingStation.js';
import { DaySession } from '../src/models/DaySession.js';
import { Customer } from '../src/models/Customer.js';
import { SaveManager, freshSave, SAVE_KEY } from '../src/systems/SaveManager.js';
import { RECIPES, RULES, ARCHETYPES, unlockedRecipes } from '../src/config.js';
import { INGREDIENTS, INITIAL_INVENTORY, canPrepareRecipe, ingredientValue, recipeNeeds } from '../src/logic/inventory.js';
import { recipePreview } from '../src/models/recipePreview.js';

function memory(entries = {}) {
  const map = new Map(Object.entries(entries));
  return { map, writes: 0, getItem(key) { return map.get(key) || null; }, setItem(key, value) { this.writes++; map.set(key, value); } };
}

function session(inventoryOverrides = {}) {
  return new DaySession(3, false, () => 0, {
    upgrades: { phins: 2, seats: 3 },
    inventory: { ...INITIAL_INVENTORY, ...inventoryOverrides },
  });
}

function extractKumquatJuice(s) {
  const prep = new KumquatPrep();
  const fruitSys = new FruitPreparationSystem();
  assert.equal(s.placeKumquats(prep, KUMQUAT_FRUITS), 2);
  fruitSys.move(1, prep, { x: -34, y: 0, time: 0 }, { x: 0, y: 0, radius: 56 }, 'slice');
  const sliced = fruitSys.move(1, prep, { x: 34, y: 0, time: 28 }, { x: 0, y: 0, radius: 56 }, 'slice');
  assert.equal(sliced, 1);
  fruitSys.end(1);
  assert.equal(prep.sliced, true);
  assert.equal(prep.halves, 4);
  assert.equal(prep.moveToSqueezer(), true);

  let stepTime = 100;
  for (let pass = 0; pass < 3 && prep.extracted < JUICE_TARGET - 0.01; pass++) {
    fruitSys.move(2, prep, { x: -18, y: -6, time: stepTime }, { x: 0, y: 0, radius: 54 }, 'squeeze');
    stepTime += 24;
    fruitSys.move(2, prep, { x: 18, y: 8, time: stepTime }, { x: 0, y: 0, radius: 54 }, 'squeeze');
    stepTime += 24;
    fruitSys.end(2);
  }
  assert.equal(prep.extracted, JUICE_TARGET);
  return prep;
}

function prepareTraTac(s, { tea = TEA_TARGET, syrup = SYRUP_TARGET, iceCubes = 3, stir = RULES.stirRadians } = {}) {
  const prep = extractKumquatJuice(s);
  const d = new Drink('tratac');
  assert.equal(s.pourIngredient(d, 'tea', tea), tea);
  new LiquidPourSystem().transfer(prep, 100, m => d.acceptPreparedMixture(m, prep));
  if (syrup > 0) assert.equal(s.pourIngredient(d, 'syrup', syrup), syrup);
  for (let i = 0; i < iceCubes; i++) assert.equal(s.scoopIceIntoGlass(d, 1), 1);
  if (stir > 0) d.stirBy(stir);
  return { d, prep };
}

test('recipe & shop integration: Trà tắc unlocks on Day 3 and kumquats, tea, and syrup can be purchased and persisted', () => {
  assert.equal(RECIPES.tratac.name, 'Trà tắc');
  assert.equal(RECIPES.tratac.price, 12000);
  assert.ok(!unlockedRecipes(2).includes('tratac'));
  assert.ok(unlockedRecipes(3).includes('tratac'));
  assert.deepEqual(recipeNeeds('tratac'), {
    coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 1, cream: 0, salt: 0, coconutCream: 0,
    tea: 150, kumquat: 2, syrup: 15, peach: 0, orange: 0, lemongrass: 0, peachSyrup: 0, lychee: 0, lycheeSyrup: 0, cacao: 0, matcha: 0,
  });
  assert.ok(canPrepareRecipe(INITIAL_INVENTORY, 'tratac'));
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, kumquat: 1 }, 'tratac'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, tea: 140 }, 'tratac'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, syrup: 5 }, 'tratac'), false);

  const storage = memory();
  const save = new SaveManager(storage);
  save.data.balance = 50000;
  const k0 = save.data.inventory.kumquat;
  const s0 = save.data.inventory.syrup;
  const t0 = save.data.inventory.tea;

  assert.equal(save.purchaseIngredient('kumquat', k0).ok, true);
  assert.equal(save.data.inventory.kumquat, k0 + INGREDIENTS.kumquat.pack);
  assert.equal(save.purchaseIngredient('syrup', s0).ok, true);
  assert.equal(save.data.inventory.syrup, s0 + INGREDIENTS.syrup.pack);
  assert.equal(save.purchaseIngredient('tea', t0).ok, true);
  assert.equal(save.data.inventory.tea, t0 + INGREDIENTS.tea.pack);

  const reloaded = new SaveManager(storage);
  assert.equal(reloaded.data.inventory.kumquat, k0 + 10);
  assert.equal(reloaded.data.inventory.syrup, s0 + 150);
  assert.equal(reloaded.data.inventory.tea, t0 + 600);
});

test('kumquat count decreases by 2 whole fruits once on placement; slicing, squeezing, and pouring never deduct extra fruits', () => {
  const s = session({ kumquat: 6 });
  const prep = new KumquatPrep();
  const fruitSys = new FruitPreparationSystem();

  assert.equal(s.placeKumquats(prep, 2), 2);
  assert.equal(s.inventory.kumquat, 4);
  assert.equal(s.ingredientUsed.kumquat, 2);
  // Cannot place another pair on an occupied board.
  assert.equal(s.placeKumquats(prep, 2), 0);
  assert.equal(s.inventory.kumquat, 4);

  // Stationary touch does not slice; swipe across center slices 2 fruits into 4 halves.
  assert.equal(fruitSys.move(1, prep, { x: -30, y: 0, time: 0 }, { x: 0, y: 0, radius: 56 }, 'slice'), 0);
  assert.equal(prep.sliced, false);
  assert.equal(fruitSys.move(1, prep, { x: 30, y: 0, time: 25 }, { x: 0, y: 0, radius: 56 }, 'slice'), 1);
  assert.equal(prep.sliced, true);
  assert.equal(prep.halves, 4);
  assert.equal(s.inventory.kumquat, 4, 'slicing must not deduct additional kumquats');

  assert.equal(prep.moveToSqueezer(), true);
  // Repeated squeeze gestures extract up to 20 ml juice in 2-3 passes without consuming more fruit.
  for (let i = 0; i < 6; i++) {
    fruitSys.move(2, prep, { x: -16, y: 0, time: i * 50 }, { x: 0, y: 0, radius: 54 }, 'squeeze');
    fruitSys.move(2, prep, { x: 16, y: 4, time: i * 50 + 25 }, { x: 0, y: 0, radius: 54 }, 'squeeze');
    fruitSys.end(2);
  }
  assert.equal(prep.extracted, 20);
  assert.equal(prep.amounts.citrusJuice, 20);
  assert.equal(s.inventory.kumquat, 4, 'squeezing must not deduct additional kumquats');

  // Pouring extracted juice into the glass transfers citrusJuice + 2 kumquats (4 floating slices) without touching stock.
  const d = new Drink('tratac');
  new LiquidPourSystem().transfer(prep, 100, m => d.acceptPreparedMixture(m, prep));
  assert.equal(d.getAmounts().citrusJuice, 20);
  assert.equal(d.getAmounts().kumquat, 2);
  assert.equal(d.preparation.garnishes.length, 4);
  assert.equal(s.inventory.kumquat, 4, 'pouring prepared juice must not deduct additional kumquats');
  assert.equal(s.ingredientUsed.kumquat, 2);
});

test('actual stock consumption for tea, syrup, and ice, and excess syrup lowers quality while consuming real stock', () => {
  const s = session({ tea: 300, kumquat: 4, syrup: 60, ice: 3 });
  const { d } = prepareTraTac(s, { tea: 150, syrup: 15, iceCubes: 3 });
  const evalPerfect = d.evaluate('tratac');
  assert.equal(evalPerfect.valid, true);
  assert.equal(evalPerfect.quality, 'PERFECT');
  assert.equal(evalPerfect.perfectCitrus, true);
  assert.equal(evalPerfect.tipMultiplier, 1.15);

  // Check exact stock deductions: 150ml tea, 2 kumquats, 15ml syrup, 1 ice pack unit (3 cubes = 90g).
  assert.equal(s.inventory.tea, 150);
  assert.equal(s.inventory.kumquat, 2);
  assert.equal(s.inventory.syrup, 45);
  assert.equal(s.inventory.ice, 2);

  // Now prepare a second glass with excess syrup (30ml instead of 15ml).
  const { d: overSweet } = prepareTraTac(s, { tea: 150, syrup: 30, iceCubes: 3 });
  const evalOverSweet = overSweet.evaluate('tratac');
  assert.equal(evalOverSweet.valid, true);
  assert.equal(evalOverSweet.quality, 'ACCEPTABLE');
  assert.match(evalOverSweet.message, /ngọt quá/);
  // Real inventory lost the full 30ml of syrup!
  assert.equal(s.inventory.syrup, 15);
  assert.equal(s.ingredientUsed.syrup, 45);
});

test('customer quantity modifiers ("Cho anh trà tắc ít ngọt, nhiều đá nha!") adjust targets, tips, money, and day-end stats', () => {
  const s = session();
  const c = new Customer(ARCHETYPES[0], 'tratac', 0);
  s.customers.push(c);
  for (const state of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) assert.equal(c.transition(state), true);

  assert.equal(c.type.line, 'Cho anh trà tắc ít ngọt, nhiều đá nha!');
  assert.deepEqual(c.modifiers, { sweetness: 'less', ice: 'more' });
  assert.equal(c.modifierLabel, 'ít ngọt, nhiều đá');

  const targets = modifierTargets(c.modifiers);
  assert.equal(targets.syrup, 10);
  assert.equal(targets.ice, 4);
  assert.equal(targets.iceGrams, 120);

  // Standard 15ml syrup & 3 cubes lowers quality when the customer asked for ít ngọt (10ml), nhiều đá (4 cubes).
  const { d: standardDrink } = prepareTraTac(s, { tea: 150, syrup: 15, iceCubes: 3 });
  assert.equal(standardDrink.evaluate('tratac', c.modifiers).quality, 'ACCEPTABLE');

  // Matching 10ml syrup (ít ngọt) and 4 cubes / 120g ice (nhiều đá) earns PERFECT + citrus tip bonus!
  const { d: tailoredDrink } = prepareTraTac(s, { tea: 150, syrup: 10, iceCubes: 4 });
  const evaluation = tailoredDrink.evaluate('tratac', c.modifiers);
  assert.equal(evaluation.valid, true);
  assert.equal(evaluation.quality, 'PERFECT');

  const result = s.serve(c, tailoredDrink);
  assert.equal(result.valid, true);
  assert.equal(result.quality, 'PERFECT');
  assert.equal(result.price, 12000);
  assert.equal(result.tip, 3400);
  assert.equal(s.revenue, 12000);
  assert.equal(s.tips, 3400);
  assert.equal(s.recipes.tratac, 1);

  const storage = memory();
  const save = new SaveManager(storage);
  save.data.day = 3;
  const summary = s.summary();
  assert.equal(save.completeDay(summary), true);
  assert.equal(save.data.mastery.tratac, 1);
  assert.equal(save.data.stats.lifetimeRevenue, 12000);
  assert.equal(save.data.stats.lifetimeTips, 3400);
});

test('fast preparation while coffee phins are brewing on adjacent stations and distinct visual layers', () => {
  const s = session();
  const phinStation = new BrewingStation('station-0', 'den');
  const teaStation = new BrewingStation('station-1', 'tratac');

  // Start brewing a phin on station 0.
  phinStation.placeGlass();
  phinStation.drink.placePhin();
  s.addGrounds(phinStation.drink, 1);
  phinStation.drink.compress(RULES.pressSeconds);
  phinStation.drink.pourWater(1 / RULES.waterRate);
  phinStation.drink.finishWater();
  assert.equal(phinStation.drink.state, 'BREWING');

  // Prepare Trà tắc on station 1 while station 0 is still mid-brew (only 3s elapsed).
  phinStation.update(3);
  assert.equal(phinStation.drink.state, 'BREWING');

  teaStation.placeGlass();
  const prep = extractKumquatJuice(s);
  s.pourIngredient(teaStation.drink, 'tea', 150);
  new LiquidPourSystem().transfer(prep, 100, m => teaStation.drink.acceptPreparedMixture(m, prep));
  s.pourIngredient(teaStation.drink, 'syrup', 15);
  for (let i = 0; i < 3; i++) s.scoopIceIntoGlass(teaStation.drink, 1);

  // Before stirring, mixing is 0 and drink requires stirring.
  assert.equal(teaStation.drink.preparation.mixing, 0);
  assert.equal(teaStation.drink.evaluate('tratac').valid, false);
  assert.match(teaStation.drink.evaluate('tratac').message, /Khuấy/);

  // Circular stirring blends the drink to ready while phin is still brewing.
  const stir = new StirringSystem();
  for (let i = 0; i < 90; i++) {
    const a = i * 0.16;
    const delta = stir.move(1, teaStation.drink.preparation, { x: Math.cos(a) * 28, y: Math.sin(a) * 28, time: i * 16 }, { x: 0, y: 0, radius: 60 }, RULES.stirRadians);
    teaStation.drink.stirBy(delta);
  }
  assert.ok(teaStation.drink.preparation.mixing > 0.8);
  assert.equal(teaStation.drink.evaluate('tratac').valid, true);
  assert.equal(teaStation.drink.evaluate('tratac').quality, 'PERFECT');
  assert.equal(phinStation.drink.state, 'BREWING');

  // Finish phin brew afterwards: both drinks are valid and distinct.
  phinStation.update(5);
  assert.equal(phinStation.drink.state, 'BREWED');
  assert.equal(s.addIce(phinStation.drink), true);
  assert.equal(phinStation.drink.evaluate('den').quality, 'PERFECT');

  const preview = recipePreview(RECIPES.tratac);
  assert.equal(preview.recipeId, 'tratac');
  assert.equal(preview.preparation.amounts.tea, 150);
  assert.equal(preview.preparation.amounts.citrusJuice, 20);
  assert.equal(preview.preparation.garnishes.length, 4);
  assert.equal(formatModifierLabel({ sweetness: 'more', ice: 'less' }), 'nhiều ngọt, ít đá');
});

test('discarding prepared kumquats or a Trà tắc cup records waste without refunding consumed stock', () => {
  const s = session({ kumquat: 8, tea: 450, syrup: 90, ice: 12 });
  const prep = extractKumquatJuice(s);
  assert.equal(s.inventory.kumquat, 6);
  assert.equal(s.recordWaste(prep.stock()), 2);
  assert.equal(s.inventory.kumquat, 6);
  assert.equal(s.ingredientWasted.kumquat, 2);

  const { d } = prepareTraTac(s, { tea: 150, syrup: 15, iceCubes: 3 });
  assert.ok(s.recordDrinkWaste(d) > 0);
  const summary = s.summary().ingredients;
  assert.equal(summary.wasted.kumquat, 4);
  assert.equal(summary.wasted.tea, 150);
  assert.equal(summary.wasted.syrup, 15);
  assert.equal(summary.wasted.ice, 1);
  assert.equal(summary.wasteCost, ingredientValue({ kumquat: 4, tea: 150, syrup: 15, ice: 1 }));
});
