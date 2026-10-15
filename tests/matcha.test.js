import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, ARCHETYPES, unlockedRecipes } from '../src/config.js';
import { INGREDIENTS, INITIAL_INVENTORY, canPrepareRecipe } from '../src/logic/inventory.js';
import { SaveManager } from '../src/systems/SaveManager.js';
import { DaySession } from '../src/models/DaySession.js';
import { Drink } from '../src/models/Drink.js';
import { Customer } from '../src/models/Customer.js';
import { BrewingStation } from '../src/models/BrewingStation.js';
import { WhiskSystem } from '../src/systems/preparation/WhiskSystem.js';
import { LiquidPourSystem } from '../src/systems/preparation/LiquidPourSystem.js';
import { recipePreview } from '../src/models/recipePreview.js';
import {
  MATCHA_POWDER_TARGET,
  MATCHA_SCOOP_GRAMS,
  MATCHA_WATER_TARGET,
  MATCHA_MILK_TARGET,
  MATCHA_ICE_TARGET,
  MATCHA_SYRUP_TARGET,
  MATCHA_WHISK_TARGET,
  MatchaBowl,
  matchaTargets,
  matchaStockWarnings,
  normalizeMatchaModifiers,
  formatMatchaModifierLabel,
} from '../src/models/MatchaBowl.js';

const memory = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

const session = (inventory = {}, day = 6) =>
  new DaySession(day, false, () => 0, {
    upgrades: { phins: 2, seats: 4 },
    inventory: { ...INITIAL_INVENTORY, ...inventory },
  });

function prepareFullMatcha(s, {
  modifiers = null,
  matchaGrams = null,
  waterMl = MATCHA_WATER_TARGET,
  whiskProgress = 1,
  milkMl = null,
  syrupMl = null,
  iceCubes = MATCHA_ICE_TARGET,
} = {}) {
  const targets = matchaTargets(modifiers);
  const powder = matchaGrams ?? targets.matcha;
  const milk = milkMl ?? targets.milk;
  const syrup = syrupMl ?? targets.syrup;

  const bowl = new MatchaBowl();
  // Step 1: Measure matcha powder into ceramic bowl in 2g bamboo scoops
  let remaining = powder;
  while (remaining > 0) {
    const scoop = Math.min(MATCHA_SCOOP_GRAMS, remaining);
    assert.equal(s.scoopMatchaFromTin(scoop), scoop);
    assert.equal(s.scoopMatchaIntoBowl(bowl, scoop), scoop);
    remaining -= scoop;
  }

  // Step 2: Add warm water to bowl
  if (waterMl > 0) {
    assert.equal(s.pourWarmWaterIntoBowl(bowl, waterMl), waterMl);
  }

  // Step 3: Whisk matcha with bamboo whisk (chasen)
  if (whiskProgress > 0) {
    bowl.whisk(whiskProgress * MATCHA_WHISK_TARGET);
  }

  // Step 4: Prepare glass (ice, fresh milk, optional syrup)
  const drink = new Drink('matcha', modifiers);
  if (iceCubes > 0) {
    assert.equal(s.scoopIceIntoGlass(drink, iceCubes), iceCubes);
  }
  if (milk > 0) {
    assert.equal(s.pourIngredient(drink, 'milk', milk), milk);
  }
  if (syrup > 0) {
    assert.equal(s.pourIngredient(drink, 'syrup', syrup), syrup);
  }

  // Step 5: Pour whisked matcha from bowl over milk
  const pour = new LiquidPourSystem();
  const bowlVolume = (bowl.amounts.matcha || 0) + (bowl.amounts.water || 0);
  if (bowlVolume > 0) {
    pour.transfer(bowl, bowlVolume, (mixture, consistency, source) => drink.acceptPreparedMixture(mixture, source));
  }

  return { drink, bowl };
}

test('recipe & shop catalog: Matcha latte đá (28.000đ) unlocks on Day 6 and matcha powder is purchased in 40g packs for 28.000đ', () => {
  const r = RECIPES.matcha;
  assert.ok(r, 'RECIPES.matcha should be defined');
  assert.equal(r.name, 'Matcha latte đá');
  assert.equal(r.price, 28000);
  assert.equal(r.unlock.day, 6);
  assert.ok(!unlockedRecipes(5).includes('matcha'));
  assert.ok(unlockedRecipes(6).includes('matcha'));
  assert.deepEqual(r.supplies, { matcha: 4, milk: 3, ice: 1, syrup: 10 });

  assert.equal(INGREDIENTS.matcha.name, 'Bột matcha');
  assert.equal(INGREDIENTS.matcha.unit, 'g');
  assert.equal(INGREDIENTS.matcha.pack, 40);
  assert.equal(INGREDIENTS.matcha.price, 28000);
  assert.equal(INITIAL_INVENTORY.matcha, 28);

  const save = new SaveManager(memory());
  save.data.day = 6;
  save.data.balance = 60000;
  assert.equal(save.data.inventory.matcha, 28);
  const res = save.purchaseIngredient('matcha', 28);
  assert.equal(res.ok, true);
  assert.equal(save.data.inventory.matcha, 68);
  assert.equal(save.data.balance, 32000);
  assert.equal(save.data.stats.ingredientExpenses, 28000);

  // Shortage detection blocks recipe when matcha, milk, ice, or syrup is insufficient
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, matcha: 3.9 }, 'matcha'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, milk: 2.9 }, 'matcha'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, ice: 0.9 }, 'matcha'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, syrup: 9 }, 'matcha'), false);
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, matcha: 4, milk: 3, ice: 1, syrup: 10 }, 'matcha'), true);
});

test('specific stock warnings: "Hết bột matcha!", "Không đủ sữa tươi!", and "Matcha chỉ còn đủ 1 ly!"', () => {
  const noMatcha = matchaStockWarnings({ ...INITIAL_INVENTORY, matcha: 0 });
  assert.ok(noMatcha.includes('Hết bột matcha!'));

  const oneCupLeft = matchaStockWarnings({ ...INITIAL_INVENTORY, matcha: 5 });
  assert.ok(oneCupLeft.includes('Matcha chỉ còn đủ 1 ly!'));

  const lowMilk = matchaStockWarnings({ ...INITIAL_INVENTORY, milk: 2 });
  assert.ok(lowMilk.includes('Không đủ sữa tươi!'));

  const plenty = matchaStockWarnings({ ...INITIAL_INVENTORY, matcha: 20, milk: 6 });
  assert.deepEqual(plenty, []);
});

test('measuring matcha deducts exact grams per scoop, and cancelled drags refund the held 2g scoop without deducting stock', () => {
  const s = session({ matcha: 12, milk: 6, ice: 4, syrup: 40 });
  const bowl = new MatchaBowl();

  // Pick up 2g scoop and cancel drag outside bowl -> stock refunded to 12g
  assert.equal(s.scoopMatchaFromTin(2), 2);
  assert.equal(s.inventory.matcha, 10);
  assert.equal(s.cancelMatchaScoop(), 2);
  assert.equal(s.inventory.matcha, 12);
  assert.equal(s.ingredientUsed.matcha, 0);
  assert.equal(bowl.amounts.matcha || 0, 0);

  // Scoop twice (2 x 2g = 4g) into ceramic bowl -> deducts 4g once
  assert.equal(s.scoopMatchaFromTin(2), 2);
  assert.equal(s.scoopMatchaIntoBowl(bowl, 2), 2);
  assert.equal(s.scoopMatchaFromTin(2), 2);
  assert.equal(s.scoopMatchaIntoBowl(bowl, 2), 2);
  assert.equal(bowl.amounts.matcha, 4);
  assert.equal(s.inventory.matcha, 8);
  assert.equal(s.ingredientUsed.matcha, 4);
});

test('bamboo whisk requires W-shaped / zigzag pointer movement (stationary holding gives 0 progress) and never deducts matcha powder again', () => {
  const s = session({ matcha: 16, milk: 6, ice: 4, syrup: 40 });
  const bowl = new MatchaBowl();
  const whisk = new WhiskSystem();

  // Scoop 4g matcha into bowl
  for (let i = 0; i < 2; i++) {
    s.scoopMatchaFromTin(2);
    s.scoopMatchaIntoBowl(bowl, 2);
  }
  assert.equal(s.inventory.matcha, 12);

  // Cannot whisk dry powder before warm water is added
  assert.equal(bowl.whisk(50), 0);

  // Add 40ml warm water (free resource)
  const beforeInv = { ...s.inventory };
  assert.equal(s.pourWarmWaterIntoBowl(bowl, 40), 40);
  assert.deepEqual(s.inventory, beforeInv, 'warm water must not deduct inventory stock');
  assert.equal(bowl.stage, 'CLUMPY');

  // Stationary pointer hold inside the bowl must NOT advance whisking
  for (let i = 0; i < 40; i++) {
    const delta = whisk.moveMatcha(1, bowl, { x: 10, y: 5, time: i * 16 }, { x: 0, y: 0, radius: 60 }, MATCHA_WHISK_TARGET);
    assert.equal(delta, 0);
  }
  assert.equal(bowl.whiskProgress, 0);
  assert.equal(bowl.stage, 'CLUMPY');
  whisk.end(1);

  // W-shaped / zigzag alternating strokes advance through CLUMPY -> MIXING -> SMOOTH -> MICROFOAM
  const seenStages = new Set([bowl.stage]);
  const wPoints = [
    [-28, -16], [-18, 18], [-6, -16], [6, 18], [18, -16], [28, 18],
    [18, -16], [6, 18], [-6, -16], [-18, 18],
  ];
  for (let pass = 0; pass < 14; pass++) {
    for (let k = 0; k < wPoints.length; k++) {
      const [px, py] = wPoints[k];
      const t = (pass * wPoints.length + k) * 24;
      whisk.moveMatcha(1, bowl, { x: px, y: py, time: t }, { x: 0, y: 0, radius: 60 }, MATCHA_WHISK_TARGET);
      seenStages.add(bowl.stage);
    }
  }
  whisk.end(1);

  assert.ok(seenStages.has('CLUMPY'));
  assert.ok(seenStages.has('MIXING'));
  assert.ok(seenStages.has('SMOOTH'));
  assert.ok(seenStages.has('MICROFOAM'));
  assert.equal(bowl.stage, 'MICROFOAM');
  assert.ok(bowl.whiskProgress >= 0.92);
  assert.equal(s.inventory.matcha, 12, 'whisking must never deduct additional matcha powder');

  // Pour whisked matcha into glass over milk & ice -> must NOT deduct matcha powder again
  const drink = new Drink('matcha');
  assert.equal(s.scoopIceIntoGlass(drink, 3), 3);
  assert.equal(s.pourIngredient(drink, 'milk', 150), 150);
  assert.equal(s.pourIngredient(drink, 'syrup', 10), 10);

  const pour = new LiquidPourSystem();
  const transferred = pour.transfer(bowl, 44, (mixture, consistency, source) => drink.acceptPreparedMixture(mixture, source));
  assert.ok(transferred > 40);
  assert.equal(s.inventory.matcha, 12, 'pouring prepared matcha into glass must not deduct matcha powder again');
  assert.equal(s.inventory.milk, 3); // 6 - 3 portions (150ml)
  assert.equal(s.inventory.ice, 3); // 4 - 1 portion (3 cubes)
  assert.equal(s.inventory.syrup, 30); // 40 - 10ml

  const evalPerfect = drink.evaluate('matcha');
  assert.equal(evalPerfect.valid, true);
  assert.equal(evalPerfect.quality, 'PERFECT');
  assert.equal(evalPerfect.whiskStage, 'MICROFOAM');
  assert.equal(evalPerfect.perfectMatcha, true);
});

test('imperfect whisking reduces drink quality (CLUMPY is invalid, MIXING is ACCEPTABLE, SMOOTH is GOOD, MICROFOAM is PERFECT)', () => {
  const s = session({ matcha: 40, milk: 20, ice: 10, syrup: 80 });

  const { drink: clumpy } = prepareFullMatcha(s, { whiskProgress: 0.12 });
  const evalClumpy = clumpy.evaluate('matcha');
  assert.equal(evalClumpy.valid, false);
  assert.equal(evalClumpy.whiskStage, 'CLUMPY');
  assert.match(evalClumpy.message, /vón cục/);

  const { drink: mixing } = prepareFullMatcha(s, { whiskProgress: 0.42 });
  const evalMixing = mixing.evaluate('matcha');
  assert.equal(evalMixing.valid, true);
  assert.equal(evalMixing.whiskStage, 'MIXING');
  assert.equal(evalMixing.quality, 'ACCEPTABLE');

  const { drink: smooth } = prepareFullMatcha(s, { whiskProgress: 0.78 });
  const evalSmooth = smooth.evaluate('matcha');
  assert.equal(evalSmooth.valid, true);
  assert.equal(evalSmooth.whiskStage, 'SMOOTH');
  assert.equal(evalSmooth.quality, 'GOOD');

  const { drink: microfoam } = prepareFullMatcha(s, { whiskProgress: 1.0 });
  const evalMicrofoam = microfoam.evaluate('matcha');
  assert.equal(evalMicrofoam.valid, true);
  assert.equal(evalMicrofoam.whiskStage, 'MICROFOAM');
  assert.equal(evalMicrofoam.quality, 'PERFECT');
});

test('customer modifiers ("ít ngọt", "không đường", "ngọt vừa", "đậm matcha") and serving dialogue ("Matcha mịn ghê, đẹp quá không nỡ uống!")', () => {
  const s = session({ matcha: 40, milk: 20, ice: 10, syrup: 80 });

  // 1. Default "ít ngọt" (10ml syrup, 4g matcha, 150ml milk)
  const cLess = new Customer(ARCHETYPES[1], 'matcha', 0, () => 0.1, { sweetness: 'less', matcha: 'normal', milk: 'normal' });
  assert.equal(cLess.type.line, 'Cho em matcha latte, ít ngọt thôi nha!');
  assert.equal(cLess.modifierLabel, 'ít ngọt');
  for (const st of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) cLess.transition(st);
  s.customers.push(cLess);

  const { drink: dLess } = prepareFullMatcha(s, { modifiers: cLess.modifiers });
  const beforeServe = { ...s.inventory };
  const servedLess = s.serve(cLess, dLess);
  assert.equal(servedLess.valid, true);
  assert.equal(servedLess.quality, 'PERFECT');
  assert.equal(cLess.type.happy, 'Matcha mịn ghê, đẹp quá không nỡ uống!');
  assert.deepEqual(s.inventory, beforeServe, 'serving must not deduct ingredients again');

  // 2. "không đường" (0ml syrup) — adding 0ml syrup consumes 0 syrup stock and scores PERFECT
  const syrupBeforeUnsweet = s.inventory.syrup;
  const { drink: dUnsweet } = prepareFullMatcha(s, { modifiers: { sweetness: 'none' } });
  assert.equal(s.inventory.syrup, syrupBeforeUnsweet, '0ml syrup must not deduct syrup inventory');
  assert.equal(dUnsweet.evaluate('matcha', { sweetness: 'none' }).quality, 'PERFECT');
  // Adding 15ml syrup to a "không đường" order lowers quality
  const { drink: dTooSweet } = prepareFullMatcha(s, { modifiers: { sweetness: 'none' }, syrupMl: 15 });
  assert.notEqual(dTooSweet.evaluate('matcha', { sweetness: 'none' }).quality, 'PERFECT');

  // 3. "ngọt vừa" (15ml syrup) and "đậm matcha" (6g = 3 scoops)
  const strongMod = { sweetness: 'normal', matcha: 'strong' };
  assert.equal(formatMatchaModifierLabel(strongMod), 'đậm matcha, ngọt vừa');
  const { drink: dStrong } = prepareFullMatcha(s, { modifiers: strongMod });
  assert.equal(dStrong.getAmounts().matcha, 6);
  assert.equal(dStrong.getAmounts().syrup, 15);
  assert.equal(dStrong.evaluate('matcha', strongMod).quality, 'PERFECT');
});

test('discarding a failed matcha bowl or drink keeps consumed stock deducted and records waste', () => {
  const s = session({ matcha: 20, milk: 6, ice: 4, syrup: 30 });
  const bowl = new MatchaBowl();

  // Scoop 4g matcha into bowl + 40ml warm water, then discard bowl
  s.scoopMatchaFromTin(2);
  s.scoopMatchaIntoBowl(bowl, 2);
  s.scoopMatchaFromTin(2);
  s.scoopMatchaIntoBowl(bowl, 2);
  s.pourWarmWaterIntoBowl(bowl, 40);
  assert.equal(s.inventory.matcha, 16);

  assert.equal(s.discardMatchaBowl(bowl), 4);
  assert.equal(bowl.amounts.matcha || 0, 0);
  assert.equal(s.inventory.matcha, 16, 'discarded matcha bowl must keep stock consumed');
  assert.equal(s.ingredientWasted.matcha, 4);

  // Prepare a matcha drink in station and discard it -> milk, ice, syrup, and matcha remain consumed
  const station = new BrewingStation(0);
  station.chooseRecipe('matcha');
  const { drink } = prepareFullMatcha(s);
  station.drink = drink;

  const invBeforeDiscard = { ...s.inventory };
  s.recordDrinkWaste(station.discard());
  assert.equal(station.drink, null);
  assert.deepEqual(s.inventory, invBeforeDiscard, 'discarded drink must not refund consumed ingredients');
  assert.equal(s.ingredientWasted.matcha, 8);
  assert.equal(s.ingredientWasted.milk, 3);
  assert.equal(s.ingredientWasted.ice, 1);
  assert.equal(s.ingredientWasted.syrup, 10);
});

test('recipePreview builds a valid layered preview for Matcha latte đá', () => {
  const preview = recipePreview(RECIPES.matcha);
  assert.equal(preview.recipeId, 'matcha');
  assert.equal(preview.preparation.amounts.matcha, 4);
  assert.equal(preview.preparation.amounts.milk, 150);
  assert.equal(preview.preparation.amounts.ice, 3);
  assert.equal(preview.preparation.steps.whisk.amount, 1);
});
