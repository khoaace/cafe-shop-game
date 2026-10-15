import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, RULES } from '../src/config.js';
import {
  INGREDIENTS,
  INITIAL_INVENTORY,
  STANDARD_SERVING_UNITS,
  configureIngredientPrice,
  standardServingSize,
  standardServingsAvailable,
  canPrepareRecipe,
  recipeNeeds,
  recipeNeedsForModifiers,
  feasibleModifiersFor,
  ingredientValue,
  createSupplyPlan,
  emptyIngredientTotals,
} from '../src/logic/inventory.js';
import { DaySession } from '../src/models/DaySession.js';
import { Drink } from '../src/models/Drink.js';
import { SaltedCream } from '../src/models/SaltedCream.js';
import { CoconutBlend } from '../src/models/CoconutBlend.js';
import { KumquatPrep } from '../src/models/KumquatPrep.js';
import { TraDaoPrep } from '../src/models/TraDaoPrep.js';
import { MatchaBowl, MATCHA_WHISK_TARGET } from '../src/models/MatchaBowl.js';
import { CACAO_STIR_RADIANS } from '../src/models/CacaoPrep.js';
import { BlenderSystem } from '../src/systems/preparation/BlenderSystem.js';
import { LiquidPourSystem } from '../src/systems/preparation/LiquidPourSystem.js';
import { SaveManager, PREVIOUS_KEY } from '../src/systems/SaveManager.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
  };
}

function fullStock(multiplier = 4) {
  return Object.fromEntries(Object.keys(INGREDIENTS).map(id => [id, INGREDIENTS[id].pack * multiplier]));
}

function makeSession(day = 6, upgrades = { phins: 2, seats: 4, blender: true }, inventory = fullStock(2)) {
  return new DaySession(day, false, () => 0, {
    upgrades,
    inventory,
    dayPlan: { day, seed: 42, event: null, vip: null, expectedOrders: 6 },
  });
}

function brewPhin(session, drink) {
  drink.placePhin();
  assert.equal(session.addGrounds(drink, 1), 1);
  drink.compress(RULES.pressSeconds);
  drink.pourWater(1 / RULES.waterRate);
  drink.finishWater();
  drink.update(RULES.brewSeconds);
  return drink;
}

test('Phase 17.1 — Ingredient catalog completeness, package conversion, and configurable prices', () => {
  const allDrinks = ['den', 'sua', 'bac', 'trung', 'muoi', 'cotdua', 'tratac', 'tradao', 'travai', 'cacao', 'matcha'];
  for (const recipeId of allDrinks) {
    assert.ok(RECIPES[recipeId], `Missing recipe definition for ${recipeId}`);
    const supplies = RECIPES[recipeId].supplies || {};
    const needs = recipeNeeds(recipeId);
    assert.ok(needs, `Missing recipeNeeds entry for ${recipeId}`);
    assert.ok(Object.values(supplies).some(v => v > 0), `Recipe ${recipeId} has no positive supplies`);
    for (const [ingId, amount] of Object.entries(supplies)) {
      assert.ok(INGREDIENTS[ingId], `Recipe ${recipeId} references unknown ingredient ${ingId}`);
      assert.ok(amount >= 0, `Recipe ${recipeId} has negative requirement for ${ingId}`);
      assert.equal(needs[ingId], amount);
    }
  }

  for (const [id, spec] of Object.entries(INGREDIENTS)) {
    assert.equal(spec.id, id);
    assert.ok(spec.pack > 0 && spec.price > 0);
    assert.ok(STANDARD_SERVING_UNITS[id] > 0, `Missing standard serving unit for ${id}`);
    assert.equal(standardServingSize(id), STANDARD_SERVING_UNITS[id]);
    assert.ok(standardServingsAvailable({ [id]: spec.pack }, id) >= 1);
  }

  const originalMatchaPrice = INGREDIENTS.matcha.price;
  assert.equal(configureIngredientPrice('matcha', 30000), 30000);
  assert.equal(INGREDIENTS.matcha.price, 30000);
  assert.equal(configureIngredientPrice('matcha', originalMatchaPrice), originalMatchaPrice);
  assert.throws(() => configureIngredientPrice('unknown', 5000));
});

test('Phase 17.2 & 17.3 — Intermediate products and cancelled actions never double-deduct stock', () => {
  const session = makeSession(6);

  // Cancelled scoops/tongs refund unused stock immediately
  assert.equal(session.scoopMatchaFromTin(2), 2);
  session.cancelMatchaScoop();
  assert.equal(session.ingredientUsed.matcha, 0);

  assert.equal(session.scoopCacaoFromCan(5), 5);
  session.cancelCacaoScoop();
  assert.equal(session.ingredientUsed.cacao, 0);

  assert.equal(session.scoopLycheeFromCan(1), 1);
  session.cancelLycheeScoop();
  assert.equal(session.ingredientUsed.lychee, 0);

  assert.equal(session.pickPeachWithTongs(1), 1);
  session.cancelPeachDrag();
  assert.equal(session.ingredientUsed.peach, 0);

  // Salted cream discard records waste once without refunding stock
  const creamBowl = new SaltedCream();
  const creamBefore = session.inventory.cream;
  const saltBefore = session.inventory.salt;
  creamBowl.add('cream', session.consumeIngredient('cream', 40));
  creamBowl.add('salt', session.consumeIngredient('salt', 0.3));
  assert.equal(session.inventory.cream, creamBefore - 40);
  assert.equal(session.inventory.salt, saltBefore - 0.3);
  const creamWaste = session.discardSaltedCream(creamBowl);
  assert.ok(creamWaste > 0);
  assert.equal(session.ingredientWasted.cream, 40);
  assert.equal(session.ingredientWasted.salt, 0.3);
  assert.equal(creamBowl.amounts.cream || 0, 0);
  assert.equal(creamBowl.amounts.salt || 0, 0);
});

test('Phase 17.4 — Multiple active orders reserve shared stock and clamp modifiers to uncommitted stock', () => {
  const inventory = {
    ...emptyIngredientTotals(),
    tea: 300,          // 2 servings of tea (150ml + 140ml <= 300ml)
    peach: 0.5,        // 2 slices of peach (enough for 1 standard tradao, NOT enough for "nhiều đào" which needs 0.75)
    orange: 1,         // 1 orange (enough for 1 tradao only)
    lemongrass: 1,     // 1 stalk (enough for 1 tradao only)
    peachSyrup: 20,    // 1 serving of peachSyrup
    lychee: 0.5,       // 2 lychee fruits (enough for 1 standard travai, NOT enough for "nhiều vải" which needs 0.75)
    lycheeSyrup: 20,   // 1 serving of lycheeSyrup
    ice: 2,            // 2 servings of ice (enough for 2 normal-ice drinks, NOT enough for 2 "nhiều đá" drinks)
  };
  const session = makeSession(4, { phins: 2, seats: 3, blender: false }, inventory);

  const first = session.spawn();
  assert.ok(first);
  assert.ok(['tradao', 'travai'].includes(first.recipeId));
  // Because peach=0.5 and lychee=0.5, neither can request "more" fruit!
  if (first.recipeId === 'tradao') assert.equal(first.modifiers.peach, 'normal');
  if (first.recipeId === 'travai') assert.equal(first.modifiers.lychee, 'normal');

  // Second customer while first customer is still WAITING:
  // First customer reserved either all tradao stock or all travai stock, so second customer must pick the other one!
  const second = session.spawn();
  assert.ok(second);
  assert.notEqual(second.recipeId, first.recipeId);
  assert.equal(second.modifiers.ice, 'normal');

  // Third customer while first and second are still WAITING: all tea and ice are now committed!
  const third = session.spawn();
  assert.equal(third, null);
});

test('Phase 17.5 & 17.6 — Restocking shop, economy margins, and gross profit calculation without double deduction', () => {
  for (const [recipeId, spec] of Object.entries(RECIPES)) {
    const cost = ingredientValue(recipeNeeds(recipeId));
    assert.ok(spec.price > cost, `Recipe ${recipeId} selling price (${spec.price}) must exceed standard ingredient cost (${cost})`);
  }

  const storage = memoryStorage();
  const save = new SaveManager(storage);
  save.data.day = 6;
  save.data.balance = 500000;
  save.data.upgrades.blender = true;
  save.data.inventory = emptyIngredientTotals();
  save.write();

  const plan = save.supplyPlan();
  assert.ok(plan.items.length > 0);
  assert.ok(plan.price > 0);

  const balanceBeforeRestock = save.data.balance;
  const purchaseRes = save.purchaseSupplyPlan(save.data.inventory);
  assert.equal(purchaseRes.ok, true);
  assert.equal(save.data.balance, balanceBeforeRestock - plan.price);
  assert.equal(save.data.stats.ingredientExpenses, plan.price);

  // Run a shift and verify completeDay adds revenue+tips+bonuses once without subtracting ingredientCost a second time
  const balanceBeforeShift = save.data.balance;
  save.beginDay();
  const session = new DaySession(save.data.day, false, () => 0, save.data);
  const customer = session.spawn();
  customer.recipeId = 'den';
  customer.state = 'WAITING';
  const drink = brewPhin(session, new Drink('den'));
  assert.equal(session.addIce(drink), true);
  const serveRes = session.serve(customer, drink);
  assert.equal(serveRes.valid, true);

  const summary = session.summary();
  assert.equal(summary.ingredientCost, ingredientValue({ coffee: 1, ice: 1 }));
  assert.equal(summary.grossProfit, summary.earnings - summary.ingredientCost);

  assert.equal(save.completeDay(summary), true);
  assert.equal(save.data.balance, balanceBeforeShift + summary.earnings);
  assert.equal(summary.grossProfit, summary.earnings - summary.ingredientCost);
});

test('Phase 17.8 — Save & migration safety preserves legacy progress and populates all new ingredient keys', () => {
  const v2State = {
    version: 2,
    day: 5,
    balance: 145000,
    ratingSum: 24,
    ratingCount: 5,
    tutorialDone: true,
    upgrades: { phins: 2, seats: 4, thermos: true, grinder: false, condense: false, ice: false, fan: true, decor: false, premium: false },
    mastery: { den: 5, sua: 4, bac: 2, trung: 1 },
    stories: {},
    achievements: ['first_cup'],
    stats: { served: 12, lost: 0, perfect: 8, bestCombo: 5, lifetimeRevenue: 180000, lifetimeTips: 25000, lifetimeBonuses: 10000, lifetimeEarnings: 215000, upgradeExpenses: 70000, bestDay: 65000, sessions: 4 },
  };
  const storage = memoryStorage({ [PREVIOUS_KEY]: JSON.stringify(v2State) });
  const save = new SaveManager(storage);
  assert.equal(save.data.version, 3);
  assert.equal(save.data.day, 5);
  assert.equal(save.data.balance, 145000);
  for (const id of Object.keys(INGREDIENTS)) {
    assert.equal(save.data.inventory[id], INITIAL_INVENTORY[id], `Missing starter stock for ${id} after v2 migration`);
  }
  for (const recipeId of Object.keys(RECIPES)) {
    assert.ok(Object.hasOwn(save.data.mastery, recipeId), `Missing mastery key ${recipeId}`);
  }
});

test('Scenario A — Buy ingredients -> make Cà phê muối -> serve customer -> verify stock and money', () => {
  const save = new SaveManager(memoryStorage());
  save.data.day = 4;
  save.data.balance = 50000;
  save.data.inventory = { ...emptyIngredientTotals(), coffee: 2, condensed: 2, ice: 2 };
  assert.equal(save.purchaseIngredient('cream', 0).ok, true);
  assert.equal(save.purchaseIngredient('salt', 0).ok, true);

  const session = makeSession(4, save.data.upgrades, save.data.inventory);
  const customer = session.spawn();
  customer.recipeId = 'muoi';
  customer.state = 'WAITING';

  const cup = brewPhin(session, new Drink('muoi'));
  assert.equal(session.pourIngredient(cup, 'condensed', 1), 1);
  assert.equal(session.scoopIceIntoGlass(cup, 3), 3);
  const pour = new LiquidPourSystem();
  pour.transfer(cup.coffeeSource, 1, mixture => cup.acceptPreparedMixture(mixture, cup.coffeeSource));

  const bowl = new SaltedCream();
  bowl.add('cream', session.consumeIngredient('cream', 40));
  bowl.add('salt', session.consumeIngredient('salt', 0.3));
  bowl.whip(Math.PI * 7);
  pour.transfer(bowl, 100, mixture => cup.acceptPreparedMixture(mixture, bowl));

  const res = session.serve(customer, cup);
  assert.equal(res.valid, true);
  assert.equal(session.ingredientUsed.coffee, 1);
  assert.equal(session.ingredientUsed.cream, 40);
  assert.equal(session.ingredientUsed.salt, 0.3);
  assert.equal(session.ingredientUsed.condensed, 1);
  assert.equal(session.ingredientUsed.ice, 1);
  assert.ok(session.earnings >= RECIPES.muoi.price);
});

test('Scenario B — Buy coconut ingredients -> blend Cà phê cốt dừa -> serve -> verify stock', () => {
  const save = new SaveManager(memoryStorage());
  save.data.day = 5;
  save.data.balance = 60000;
  save.data.upgrades.blender = true;
  save.data.inventory = { ...emptyIngredientTotals(), coffee: 2, condensed: 2, ice: 2 };
  assert.equal(save.purchaseIngredient('coconutCream', 0).ok, true);

  const session = makeSession(5, save.data.upgrades, save.data.inventory);
  const customer = session.spawn();
  customer.recipeId = 'cotdua';
  customer.state = 'WAITING';

  const cup = brewPhin(session, new Drink('cotdua'));
  const jar = new CoconutBlend();
  assert.equal(session.pourIntoBlender(jar, 'coconutCream', 60), 60);
  assert.equal(session.pourIntoBlender(jar, 'condensed', 1), 1);
  assert.equal(session.scoopIceIntoBlender(jar, 3), 3);

  const blender = new BlenderSystem();
  blender.placeLid(jar);
  for (let t = 0; t < 4.5 - 1e-9; t += 0.05) jar.blend(0.05);
  blender.removeLid(jar);
  blender.pour(jar, 1000, m => cup.acceptPreparedMixture(m, jar));
  new LiquidPourSystem().transfer(cup.coffeeSource, 1, m => cup.acceptPreparedMixture(m, cup.coffeeSource));

  const res = session.serve(customer, cup);
  assert.equal(res.valid, true);
  assert.equal(session.ingredientUsed.coconutCream, 60);
  assert.equal(session.ingredientUsed.condensed, 1);
  assert.equal(session.ingredientUsed.ice, 1);
  assert.equal(session.ingredientUsed.coffee, 1);
});

test('Scenario C — Cut 1 kumquat -> squeeze several times -> verify only 1 kumquat deducted', () => {
  const session = makeSession(3);
  const prep = new KumquatPrep();
  const initialKumquat = session.inventory.kumquat;

  assert.equal(session.placeKumquats(prep, 1), 1);
  assert.equal(session.inventory.kumquat, initialKumquat - 1);
  assert.equal(session.ingredientUsed.kumquat, 1);
  assert.equal(prep.slice(), 1);

  for (let i = 0; i < 6; i++) {
    prep.squeeze(24);
  }
  assert.equal(prep.extracted, 10);
  assert.equal(prep.stage, 'READY');
  assert.equal(session.inventory.kumquat, initialKumquat - 1);
  assert.equal(session.ingredientUsed.kumquat, 1);

  const cup = new Drink('tratac');
  new LiquidPourSystem().transfer(prep, 20, (mixture, _c, source) => cup.acceptPreparedMixture(mixture, source));
  assert.equal(session.inventory.kumquat, initialKumquat - 1);
  assert.equal(session.ingredientUsed.kumquat, 1);
});

test('Scenario D — Cut 1 orange -> squeeze + garnish -> verify 1 orange total', () => {
  const session = makeSession(4);
  const prep = new TraDaoPrep();
  const initialOrange = session.inventory.orange;

  assert.equal(session.stageOrange(prep), 1);
  assert.equal(session.cutOrange(prep), true);
  assert.equal(session.inventory.orange, initialOrange - 1);
  assert.equal(session.ingredientUsed.orange, 1);

  for (let i = 0; i < 8; i++) prep.squeezeOrange(24);
  assert.equal(prep.extractedJuice, 30);

  const cup = new Drink('tradao');
  session.pourIngredient(cup, 'tea', 140);
  session.pourIngredient(cup, 'peachSyrup', 20);
  new LiquidPourSystem().transfer(prep, 30, (mixture, _c, source) => cup.acceptPreparedMixture(mixture, source));
  assert.equal(session.placeOrangeGarnishIntoGlass(cup, prep), 1);

  // Still only 1 orange deducted after both squeezing juice and adding garnish slice!
  assert.equal(session.inventory.orange, initialOrange - 1);
  assert.equal(session.ingredientUsed.orange, 1);
});

test('Scenario E — Scoop cocoa -> stir 5 seconds -> verify single powder deduction', () => {
  const session = makeSession(5);
  const cup = new Drink('cacao');
  const initialCocoa = session.inventory.cacao;

  for (let i = 0; i < 3; i++) {
    assert.equal(session.scoopCacaoFromCan(5), 5);
    assert.equal(session.scoopCacaoIntoGlass(cup, 5), 5);
  }
  assert.equal(session.inventory.cacao, initialCocoa - 15);
  assert.equal(session.ingredientUsed.cacao, 15);

  assert.equal(session.pourIngredient(cup, 'water', 30), 30);
  // Stir in circular gestures for ~5 seconds
  cup.stirBy(CACAO_STIR_RADIANS);
  assert.equal(cup.preparation.cacaoDissolveStage, 'DISSOLVED');
  assert.equal(session.pourIngredient(cup, 'condensed', 15), 15);
  assert.equal(session.pourIngredient(cup, 'milk', 100), 100);
  assert.equal(session.scoopIceIntoGlass(cup, 3), 3);

  const customer = session.spawn();
  customer.recipeId = 'cacao';
  customer.modifiers = { ice: 'normal', sweetness: 'normal', cacao: 'normal', extras: [] };
  customer.state = 'WAITING';
  const res = session.serve(customer, cup);
  assert.equal(res.valid, true);
  assert.equal(session.inventory.cacao, initialCocoa - 15);
  assert.equal(session.ingredientUsed.cacao, 15);
});

test('Scenario F — Whisk matcha -> pour into milk -> discard failed cup -> verify consumed stock is not refunded', () => {
  const session = makeSession(6);
  const bowl = new MatchaBowl();
  const initialMatcha = session.inventory.matcha;
  const initialMilk = session.inventory.milk;
  const initialIce = session.inventory.ice;

  assert.equal(session.scoopMatchaFromTin(2), 2);
  assert.equal(session.scoopMatchaIntoBowl(bowl, 2), 2);
  assert.equal(session.scoopMatchaFromTin(2), 2);
  assert.equal(session.scoopMatchaIntoBowl(bowl, 2), 2);
  assert.equal(session.pourWarmWaterIntoBowl(bowl, 40), 40);
  bowl.whisk(MATCHA_WHISK_TARGET);
  assert.equal(bowl.stage, 'MICROFOAM');

  const cup = new Drink('matcha');
  assert.equal(session.scoopIceIntoGlass(cup, 3), 3);
  assert.equal(session.pourIngredient(cup, 'milk', 150), 150);
  new LiquidPourSystem().transfer(bowl, 44, (mixture, _c, source) => cup.acceptPreparedMixture(mixture, source));

  // Stock before discard (150ml milk = 3 portions, 3 ice cubes = 1 portion)
  assert.equal(session.inventory.matcha, initialMatcha - 4);
  assert.equal(session.inventory.milk, initialMilk - 3);
  assert.equal(session.inventory.ice, initialIce - 1);

  // Discard cup -> stock is NOT refunded, and waste is recorded
  const wasted = session.recordDrinkWaste(cup);
  assert.ok(wasted > 0);
  assert.equal(session.inventory.matcha, initialMatcha - 4);
  assert.equal(session.inventory.milk, initialMilk - 3);
  assert.equal(session.inventory.ice, initialIce - 1);
  assert.equal(session.ingredientWasted.matcha, 4);
  assert.equal(session.ingredientWasted.milk, 3);
  assert.equal(session.ingredientWasted.ice, 1);
});
