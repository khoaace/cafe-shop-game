import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_INVENTORY, INGREDIENTS, canPrepareRecipe, createSupplyPlan, estimateDemand, ingredientValue, normalizeInventory, recipeNeeds } from '../src/logic/inventory.js';
import { DaySession } from '../src/models/DaySession.js';
import { Drink } from '../src/models/Drink.js';
import { SaveManager, SAVE_KEY, PREVIOUS_KEY } from '../src/systems/SaveManager.js';
import { RULES } from '../src/config.js';

function memory(entries = {}) {
  const map = new Map(Object.entries(entries));
  return { map, writes: 0, getItem(key) { return map.get(key) || null; }, setItem(key, value) { this.writes++; map.set(key, value); } };
}

function waiting(session) {
  const customer = session.spawn();
  assert.ok(customer);
  for (const state of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) customer.transition(state);
  return customer;
}

test('ingredient definitions match all four recipes and fixed pack values', () => {
  assert.deepEqual(recipeNeeds('den'), { coffee: 1, condensed: 0, milk: 0, egg: 0, ice: 1, cream: 0, salt: 0 });
  assert.deepEqual(recipeNeeds('sua'), { coffee: 1, condensed: 1, milk: 0, egg: 0, ice: 1, cream: 0, salt: 0 });
  assert.deepEqual(recipeNeeds('bac'), { coffee: 0.5, condensed: 1, milk: 2, egg: 0, ice: 1, cream: 0, salt: 0 });
  assert.deepEqual(recipeNeeds('trung'), { coffee: 1, condensed: 0, milk: 0, egg: 1, ice: 0, cream: 0, salt: 0 });
  assert.deepEqual(Object.fromEntries(Object.entries(INGREDIENTS).map(([id, item]) => [id, [item.pack, item.price]])), {
    coffee: [10, 20000], condensed: [8, 12000], milk: [10, 15000], egg: [6, 15000], ice: [12, 6000], cream: [240, 24000], salt: [6, 2000],
  });
});

test('inventory normalization supplies safe defaults and clamps corrupt quantities', () => {
  assert.deepEqual(normalizeInventory(), INITIAL_INVENTORY);
  assert.deepEqual(normalizeInventory({ coffee: 2000, condensed: -4, milk: 2.34567, egg: NaN, ice: 3 }), { coffee: 999, condensed: 0, milk: 2.346, egg: 0, ice: 3, cream: 240, salt: 3 });
});

test('forecast cycles unlocked recipes and adds one full mistake buffer', () => {
  assert.deepEqual(estimateDemand(1, 6), { coffee: 8, condensed: 4, milk: 0, egg: 0, ice: 8, cream: 0, salt: 0 });
  const plan = createSupplyPlan({ coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 0 }, 1, 6);
  assert.equal(plan.price, 38000); assert.deepEqual(plan.items.map(item => item.id), ['coffee', 'condensed', 'ice']);
  assert.equal(ingredientValue({ coffee: 1, condensed: 1, milk: 2, egg: 1, ice: 1 }), 9500);
});

test('v2 migrates to v3 with starter pantry and keeps the v2 recovery copy', () => {
  const old = { version: 2, day: 5, balance: 123000, upgrades: { phins: 3, seats: 4, fan: true }, stats: { served: 18 }, settings: { sound: false } };
  const storage = memory({ [PREVIOUS_KEY]: JSON.stringify(old) });
  const save = new SaveManager(storage);
  assert.equal(save.data.version, 3); assert.equal(save.data.day, 5); assert.equal(save.data.balance, 123000); assert.equal(save.data.upgrades.phins, 3);
  assert.deepEqual(save.data.inventory, INITIAL_INVENTORY); assert.ok(storage.map.has(PREVIOUS_KEY)); assert.ok(storage.map.has(SAVE_KEY));
});

test('single pack purchases are atomic, reject stale taps and stay outside shifts', () => {
  const storage = memory(), save = new SaveManager(storage); save.data.balance = 50000;
  const current = save.data.inventory.coffee;
  assert.equal(save.purchaseIngredient('coffee', current).ok, true); assert.equal(save.data.inventory.coffee, 20); assert.equal(save.data.balance, 30000); assert.equal(save.data.stats.ingredientExpenses, 20000);
  assert.equal(save.purchaseIngredient('coffee', current).ok, false); assert.equal(save.data.balance, 30000);
  save.inShift = true; assert.equal(save.purchaseIngredient('ice', save.data.inventory.ice).ok, false);
});

test('quick restock is all-or-nothing and buys the forecast exactly once', () => {
  const save = new SaveManager(memory()); save.data.balance = 100000; save.data.inventory = { coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 0 };
  save.prepareDay(10); const expected = { ...save.data.inventory }, plan = save.supplyPlan();
  assert.equal(plan.price, 38000); assert.equal(save.purchaseSupplyPlan(expected).ok, true); assert.equal(save.data.balance, 62000); assert.equal(save.data.stats.ingredientExpenses, 38000);
  assert.equal(save.purchaseSupplyPlan(expected).ok, false); assert.equal(save.data.balance, 62000);
  const poor = new SaveManager(memory()); poor.data.inventory = { coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 0 }; poor.prepareDay(10);
  assert.equal(poor.purchaseSupplyPlan({ ...poor.data.inventory }).ok, false); assert.deepEqual(poor.data.inventory, { coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 0 });
});

test('session consumes only successful physical ingredient actions', () => {
  const session = new DaySession(3, false, Math.random, { inventory: { coffee: 1, condensed: 1, milk: 2, egg: 1, ice: 1 } });
  const drink = new Drink('bac');
  assert.equal(session.addGrounds(drink, 0.5), 0); assert.equal(session.inventory.coffee, 1);
  drink.placePhin(); assert.equal(session.addGrounds(drink, 0.5), 0.5);
  assert.equal(session.pourIngredient(drink, 'condensed', 0.4), 0.4); assert.equal(session.pourIngredient(drink, 'milk', 3), 2);
  assert.equal(session.addIce(drink), true); assert.equal(session.addIce(drink), false);
  assert.equal(session.consumeIngredient('egg', 1), 1); assert.equal(session.consumeIngredient('egg', 1), 0);
  assert.deepEqual(session.ingredientSummary().used, { coffee: 0.5, condensed: 0.4, milk: 2, egg: 1, ice: 1, cream: 0, salt: 0 });
});

test('out-of-stock orders fall back to a feasible recipe and prepared cups count', () => {
  const denOnly = { coffee: 2, condensed: 0, milk: 0, egg: 0, ice: 2 };
  const session = new DaySession(3, false, Math.random, { inventory: denOnly }); session.spawnCount = 1;
  assert.deepEqual(session.availableRecipes(), ['den']); assert.equal(session.spawn().recipeId, 'den');
  const prepared = new DaySession(3, false, Math.random, { inventory: { coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 0 } });
  prepared.setPreparedRecipeProvider(() => ['trung']);
  assert.equal(prepared.canPrepare('trung'), false); assert.deepEqual(prepared.availableRecipes(), ['trung']); assert.equal(prepared.spawn().recipeId, 'trung');
  assert.equal(canPrepareRecipe(denOnly, 'sua'), false);
});

test('stockout waits for current guests, then ends once without charging a loss', () => {
  const session = new DaySession(1, false, Math.random, { inventory: { coffee: 1, condensed: 0, milk: 0, egg: 0, ice: 1 } });
  const customer = waiting(session); session.consumeIngredient('coffee', 1); session.consumeIngredient('ice', 1);
  assert.equal(session.update(0.1).some(event => event.type === 'end'), false);
  assert.equal(session.lose(customer), true); const events = session.update(0.1);
  assert.equal(events.filter(event => event.type === 'end' && event.reason === 'stockout').length, 1); assert.equal(session.lost, 1);
  assert.equal(session.update(1).length, 0);
});

test('closing settlement subtracts stock with income once; reload during shift keeps checkpoint', () => {
  const storage = memory(), save = new SaveManager(storage);
  const session = new DaySession(1, false, Math.random, { inventory: save.data.inventory }); const customer = waiting(session); const drink = new Drink('den');
  drink.placePhin(); session.addGrounds(drink, 1); drink.compress(1); drink.pourWater(1 / RULES.waterRate); drink.finishWater(); drink.update(RULES.brewSeconds); session.addIce(drink);
  assert.equal(session.serve(customer, drink).valid, true);
  assert.deepEqual(new SaveManager(storage).data.inventory, INITIAL_INVENTORY);
  const summary = session.summary(); assert.equal(save.completeDay(summary), true); assert.equal(save.data.inventory.coffee, 9); assert.equal(save.data.inventory.ice, 11); assert.equal(summary.ingredientCost, 2500);
  const balance = save.data.balance; assert.equal(save.completeDay(summary), false); assert.equal(save.data.balance, balance); assert.equal(save.data.inventory.coffee, 9);
});

test('tutorial has unlimited supplies and never changes the main pantry', () => {
  const tutorial = new DaySession(1, true, Math.random, { inventory: { coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 0 } });
  const drink = new Drink('den'); drink.placePhin(); assert.equal(tutorial.addGrounds(drink, 1), 1); assert.equal(tutorial.addIce(drink), true);
  assert.deepEqual(tutorial.ingredientSummary().used, { coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 0, cream: 0, salt: 0 });
});
