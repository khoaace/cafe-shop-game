import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, ARCHETYPES, unlockedRecipes } from '../src/config.js';
import { INGREDIENTS, INITIAL_INVENTORY, canPrepareRecipe, recipeNeeds, ingredientValue } from '../src/logic/inventory.js';
import { SaveManager } from '../src/systems/SaveManager.js';
import { DaySession } from '../src/models/DaySession.js';
import { Drink } from '../src/models/Drink.js';
import { Customer } from '../src/models/Customer.js';
import { BrewingStation } from '../src/models/BrewingStation.js';
import { StirringSystem } from '../src/systems/preparation/StirringSystem.js';
import { recipePreview } from '../src/models/recipePreview.js';
import {
  CACAO_POWDER_TARGET,
  CACAO_SCOOP_GRAMS,
  CACAO_WATER_TARGET,
  CACAO_CONDENSED_TARGET,
  CACAO_MILK_TARGET,
  CACAO_ICE_TARGET,
  CACAO_STIR_RADIANS,
  cacaoDissolveStage,
  cacaoTargets,
  normalizeCacaoModifiers,
  formatCacaoModifierLabel,
} from '../src/models/CacaoPrep.js';

const memory = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

const session = (inventory = {}, day = 5) =>
  new DaySession(day, false, () => 0, {
    upgrades: { phins: 2, seats: 4 },
    inventory: { ...INITIAL_INVENTORY, ...inventory },
  });

function prepareFullCacao(s, {
  modifiers = null,
  cacaoGrams = null,
  waterMl = CACAO_WATER_TARGET,
  stirRadians = CACAO_STIR_RADIANS,
  condensedMl = null,
  milkMl = null,
  iceCubes = CACAO_ICE_TARGET,
} = {}) {
  const targets = cacaoTargets(modifiers);
  const powder = cacaoGrams ?? targets.cacao;
  const condensed = condensedMl ?? targets.condensed;
  const milk = milkMl ?? targets.milk;
  const drink = new Drink('cacao', modifiers);

  // Step 1: Scoop cocoa powder in 5g increments
  let remaining = powder;
  while (remaining > 0) {
    const scoop = Math.min(CACAO_SCOOP_GRAMS, remaining);
    assert.equal(s.scoopCacaoFromCan(scoop), scoop);
    assert.equal(s.scoopCacaoIntoGlass(drink, scoop), scoop);
    remaining -= scoop;
  }

  // Step 2: Pour hot water (30ml)
  if (waterMl > 0) {
    assert.equal(s.pourIngredient(drink, 'water', waterMl), waterMl);
  }

  // Step 3: Stir to dissolve cocoa
  if (stirRadians > 0) {
    drink.stirBy(stirRadians);
  }

  // Step 4: Pour condensed milk & fresh milk
  if (condensed > 0) {
    assert.equal(s.pourIngredient(drink, 'condensed', condensed), condensed);
  }
  if (milk > 0) {
    assert.equal(s.pourIngredient(drink, 'milk', milk), milk);
  }

  // Step 5: Scoop ice cubes
  if (iceCubes > 0) {
    assert.equal(s.scoopIceIntoGlass(drink, iceCubes), iceCubes);
  }

  return drink;
}

test('recipe & shop catalog: Cacao sữa đá (22.000đ) unlocks on Day 5 and cocoa powder can be purchased in 120g packs', () => {
  const r = RECIPES.cacao;
  assert.ok(r, 'RECIPES.cacao should be defined');
  assert.equal(r.name, 'Cacao sữa đá');
  assert.equal(r.price, 22000);
  assert.equal(r.unlock.day, 5);
  assert.ok(!unlockedRecipes(4).includes('cacao'));
  assert.ok(unlockedRecipes(5).includes('cacao'));
  assert.deepEqual(r.supplies, { cacao: 15, condensed: 1, milk: 2, ice: 1 });

  assert.equal(INGREDIENTS.cacao.name, 'Bột cacao');
  assert.equal(INGREDIENTS.cacao.unit, 'g');
  assert.equal(INGREDIENTS.cacao.pack, 120);
  assert.equal(INGREDIENTS.cacao.price, 18000);
  assert.equal(INITIAL_INVENTORY.cacao, 90);

  const save = new SaveManager(memory());
  save.data.day = 5;
  save.data.balance = 50000;
  assert.equal(save.data.inventory.cacao, 90);
  const res = save.purchaseIngredient('cacao', 90);
  assert.equal(res.ok, true);
  assert.equal(save.data.inventory.cacao, 210);
  assert.equal(save.data.balance, 32000);
  assert.equal(save.data.stats.ingredientExpenses, 18000);

  // Shortage detection blocks recipe when cocoa, condensed milk, fresh milk, or ice is insufficient
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, cacao: 14 }, 'cacao'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, condensed: 0.9 }, 'cacao'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, milk: 1.9 }, 'cacao'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, ice: 0.9 }, 'cacao'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, cacao: 15, condensed: 1, milk: 2, ice: 1 }, 'cacao'), true);
});

test('scooping cocoa deducts exact grams per scoop, and cancelled drags refund the held powder without deducting stock', () => {
  const s = session({ cacao: 30, condensed: 4, milk: 6, ice: 4 });
  const drink = new Drink('cacao');

  // Pickup 1st 5g scoop and cancel drag outside glass -> stock refunded to 30g
  assert.equal(s.scoopCacaoFromCan(5), 5);
  assert.equal(s.inventory.cacao, 25);
  assert.equal(s.cancelCacaoScoop(), 5);
  assert.equal(s.inventory.cacao, 30);
  assert.equal(s.ingredientUsed.cacao, 0);
  assert.equal(drink.getAmounts().cacao || 0, 0);

  // Scoop 3 times (3 x 5g = 15g) into glass -> deducts exactly 15g
  for (let i = 1; i <= 3; i++) {
    assert.equal(s.scoopCacaoFromCan(5), 5);
    assert.equal(s.scoopCacaoIntoGlass(drink, 5), 5);
    assert.equal(drink.getAmounts().cacao, i * 5);
    assert.equal(s.inventory.cacao, 30 - i * 5);
  }
  assert.equal(s.ingredientUsed.cacao, 15);
});

test('hot water wets cocoa into clumps, and circular stirring dissolves cocoa through 4 states without deducting extra powder', () => {
  const s = session({ cacao: 45, condensed: 4, milk: 6, ice: 4 });
  const drink = new Drink('cacao');

  // Cannot stir before cocoa and hot water are in the glass
  assert.equal(drink.stirBy(1.0), false);
  for (let i = 0; i < 3; i++) {
    s.scoopCacaoFromCan(5);
    s.scoopCacaoIntoGlass(drink, 5);
  }
  assert.equal(drink.stirBy(1.0), false, 'dry cocoa cannot be dissolved without hot water');

  // Pour 30ml hot water -> free resource, cocoa becomes wet and CLUMPY
  const beforeInv = { ...s.inventory };
  assert.equal(s.pourIngredient(drink, 'water', 30), 30);
  assert.deepEqual(s.inventory, beforeInv, 'hot water must not deduct inventory stock');
  assert.equal(drink.preparation.cacaoDissolveStage, 'CLUMPY');

  // Circular pointer gestures via StirringSystem progress through CLUMPY -> PARTIAL -> SMOOTH -> DISSOLVED
  const stir = new StirringSystem();
  const seenStages = new Set([drink.preparation.cacaoDissolveStage]);
  for (let i = 0; i < 120; i++) {
    const angle = i * 0.16;
    const delta = stir.move(
      1,
      drink.preparation,
      { x: Math.cos(angle) * 28, y: Math.sin(angle) * 28, time: i * 16 },
      { x: 0, y: 0, radius: 60 },
      CACAO_STIR_RADIANS
    );
    if (delta > 0) drink.stirBy(delta);
    seenStages.add(drink.preparation.cacaoDissolveStage);
  }

  assert.ok(seenStages.has('CLUMPY'));
  assert.ok(seenStages.has('PARTIAL'));
  assert.ok(seenStages.has('SMOOTH'));
  assert.ok(seenStages.has('DISSOLVED'));
  assert.equal(drink.preparation.cacaoDissolveStage, 'DISSOLVED');
  assert.equal(s.inventory.cacao, 30, 'stirring must never deduct additional cocoa powder');

  // Finish milk and ice -> pouring milk preserves dissolved cocoa state and yields PERFECT quality
  assert.equal(s.pourIngredient(drink, 'condensed', 15), 15);
  assert.equal(s.pourIngredient(drink, 'milk', 100), 100);
  assert.equal(s.scoopIceIntoGlass(drink, 3), 3);

  const evalPerfect = drink.evaluate('cacao');
  assert.equal(evalPerfect.valid, true);
  assert.equal(evalPerfect.quality, 'PERFECT');
  assert.equal(evalPerfect.dissolveStage, 'DISSOLVED');
  assert.equal(evalPerfect.perfectCacao, true);
});

test('imperfect stirring reduces drink quality (CLUMPY is invalid, PARTIAL is ACCEPTABLE, SMOOTH is GOOD, DISSOLVED is PERFECT)', () => {
  const s = session({ cacao: 90, condensed: 6, milk: 10, ice: 6 });

  const clumpy = prepareFullCacao(s, { stirRadians: CACAO_STIR_RADIANS * 0.1 });
  const evalClumpy = clumpy.evaluate('cacao');
  assert.equal(evalClumpy.valid, false);
  assert.equal(evalClumpy.dissolveStage, 'CLUMPY');
  assert.match(evalClumpy.message, /vón cục/);

  const partial = prepareFullCacao(s, { stirRadians: CACAO_STIR_RADIANS * 0.4 });
  const evalPartial = partial.evaluate('cacao');
  assert.equal(evalPartial.valid, true);
  assert.equal(evalPartial.dissolveStage, 'PARTIAL');
  assert.equal(evalPartial.quality, 'ACCEPTABLE');
  assert.match(evalPartial.message, /lợn cợn/);

  const smooth = prepareFullCacao(s, { stirRadians: CACAO_STIR_RADIANS * 0.78 });
  const evalSmooth = smooth.evaluate('cacao');
  assert.equal(evalSmooth.valid, true);
  assert.equal(evalSmooth.dissolveStage, 'SMOOTH');
  assert.equal(evalSmooth.quality, 'GOOD');

  const dissolved = prepareFullCacao(s, { stirRadians: CACAO_STIR_RADIANS });
  const evalDissolved = dissolved.evaluate('cacao');
  assert.equal(evalDissolved.valid, true);
  assert.equal(evalDissolved.dissolveStage, 'DISSOLVED');
  assert.equal(evalDissolved.quality, 'PERFECT');
});

test('excess cocoa powder or milk consumes real inventory and lowers drink quality; serving never double-deducts', () => {
  const s = session({ cacao: 60, condensed: 4, milk: 6, ice: 4 });

  // Prepare with excess cocoa (25g = 5 scoops) and excess condensed milk (30ml = 2 portions) and excess fresh milk (150ml = 3 portions)
  const over = prepareFullCacao(s, { cacaoGrams: 25, condensedMl: 30, milkMl: 150 });
  assert.equal(s.inventory.cacao, 35); // 60 - 25 = 35g
  assert.equal(s.inventory.condensed, 2); // 4 - (30 / 15) = 2 portions
  assert.equal(s.inventory.milk, 3); // 6 - (150 / 50) = 3 portions
  assert.equal(s.inventory.ice, 3); // 4 - 1 = 3 portions

  const evalOver = over.evaluate('cacao');
  assert.equal(evalOver.valid, true);
  assert.equal(evalOver.quality, 'ACCEPTABLE');

  // Serve standard cacao to a customer and verify serving does not deduct any stock again
  const standard = prepareFullCacao(s, { modifiers: { cacao: 'strong' } }); // 20g cacao, 15ml condensed (1p), 100ml milk (2p), 3 ice (1p)
  const beforeServe = { ...s.inventory };
  const c = new Customer(ARCHETYPES[2], 'cacao', 0);
  for (const st of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) c.transition(st);
  s.customers.push(c);

  const served = s.serve(c, standard);
  assert.equal(served.valid, true);
  assert.equal(served.quality, 'PERFECT');
  assert.deepEqual(s.inventory, beforeServe, 'serving must never deduct ingredients again');
});

test('customer modifiers ("đậm cacao", "ít ngọt", "ít sữa") adjust targets, dialogue, tips, and day summary', () => {
  const s = session({ cacao: 60, condensed: 6, milk: 6, ice: 6 });
  const c = new Customer(ARCHETYPES[0], 'cacao', 0);
  for (const st of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) c.transition(st);
  s.customers.push(c);

  // Default order for cacao is "đậm cacao" (20g = 4 scoops)
  assert.equal(c.type.line, 'Cho em cacao sữa đá, đậm cacao nha!');
  assert.deepEqual(c.modifiers, { cacao: 'strong', sweetness: 'normal', milk: 'normal' });
  assert.equal(c.modifierLabel, 'đậm cacao');

  // Serving only 15g (3 scoops) to a "đậm cacao" customer lowers quality to GOOD
  const standard15g = prepareFullCacao(s, { cacaoGrams: 15 });
  assert.equal(standard15g.evaluate('cacao', c.modifiers).quality, 'GOOD');

  // Serving 20g (4 scoops) earns PERFECT + 1.15x tip multiplier
  const strong20g = prepareFullCacao(s, { modifiers: c.modifiers });
  assert.equal(strong20g.getAmounts().cacao, 20);
  const res = s.serve(c, strong20g);
  assert.equal(res.valid, true);
  assert.equal(res.quality, 'PERFECT');
  assert.equal(res.price, 22000);
  assert.equal(res.tip, 6300); // round(22000 * 0.25 * 1.15 / 100) * 100 = 6300
  assert.equal(s.recipes.cacao, 1);

  // Test combined modifiers ("đậm cacao, ít ngọt, ít sữa")
  const c2 = new Customer(ARCHETYPES[1], 'cacao', 1, false, { cacao: 'strong', sweetness: 'less', milk: 'less' });
  assert.equal(c2.type.line, 'Cho em cacao sữa đá, đậm cacao, ít ngọt, ít sữa nha!');
  const t2 = cacaoTargets(c2.modifiers);
  assert.equal(t2.cacao, 20);
  assert.equal(t2.condensed, 10);
  assert.equal(t2.milk, 70);

  const preview = recipePreview(RECIPES.cacao);
  assert.equal(preview.recipeId, 'cacao');
  assert.equal(preview.preparation.cacaoDissolveStage, 'DISSOLVED');
});

test('discarding a poorly prepared cocoa mixture keeps stock consumed and records waste accurately', () => {
  const s = session({ cacao: 60, condensed: 4, milk: 6, ice: 4 });
  const station = new BrewingStation('station-0', 'cacao');
  station.placeGlass();

  // Prepare an under-stirred cup (15g cacao, 30ml water, 15ml condensed, 100ml milk, 3 ice) and discard it
  for (let i = 0; i < 3; i++) {
    s.scoopCacaoFromCan(5);
    s.scoopCacaoIntoGlass(station.drink, 5);
  }
  s.pourIngredient(station.drink, 'water', 30);
  station.drink.stirBy(0.4); // Still CLUMPY
  s.pourIngredient(station.drink, 'condensed', 15);
  s.pourIngredient(station.drink, 'milk', 100);
  s.scoopIceIntoGlass(station.drink, 3);

  const remainingAfterPrep = { ...s.inventory };
  assert.equal(remainingAfterPrep.cacao, 45);
  assert.equal(remainingAfterPrep.condensed, 3);
  assert.equal(remainingAfterPrep.milk, 4);
  assert.equal(remainingAfterPrep.ice, 3);

  const discarded = station.discard();
  assert.ok(s.recordDrinkWaste(discarded) > 0);
  assert.deepEqual(s.inventory, remainingAfterPrep, 'discarding must not refund consumed stock');

  const summary = s.summary().ingredients;
  assert.equal(summary.wasted.cacao, 15);
  assert.equal(summary.wasted.condensed, 1);
  assert.equal(summary.wasted.milk, 2);
  assert.equal(summary.wasted.ice, 1);
  assert.equal(summary.wasteCost, ingredientValue({ cacao: 15, condensed: 1, milk: 2, ice: 1 }));
});
