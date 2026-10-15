import test from 'node:test';
import assert from 'node:assert/strict';
import { CoconutBlend, BLEND, blendStage } from '../src/models/CoconutBlend.js';
import { Drink } from '../src/models/Drink.js';
import { BrewingStation } from '../src/models/BrewingStation.js';
import { BlenderSystem } from '../src/systems/preparation/BlenderSystem.js';
import { LiquidPourSystem } from '../src/systems/preparation/LiquidPourSystem.js';
import { DaySession } from '../src/models/DaySession.js';
import { Customer } from '../src/models/Customer.js';
import { SaveManager, freshSave, SAVE_KEY } from '../src/systems/SaveManager.js';
import { RECIPES, RULES, ARCHETYPES, unlockedRecipes } from '../src/config.js';
import { INGREDIENTS, canPrepareRecipe, createSupplyPlan, ingredientValue } from '../src/logic/inventory.js';
import { UPGRADES, quoteUpgrade } from '../src/logic/upgrades.js';
import { recipePreview } from '../src/models/recipePreview.js';

const memory = (initial = {}) => { const map = new Map(Object.entries(initial)); return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }; };
const owned = { phins: 2, blender: true };
const session = (inventory, day = 5, upgrades = owned) => new DaySession(day, false, () => 0, { upgrades, inventory: { coffee: 5, condensed: 5, milk: 5, egg: 5, ice: 5, cream: 0, salt: 0, coconutCream: 120, ...inventory } });
const brew = d => { d.placePhin(); d.addGrounds(1); d.compress(RULES.pressSeconds); d.pourWater(1 / RULES.waterRate); d.finishWater(); d.update(RULES.brewSeconds); return d; };
const fillJar = (s, jar = new CoconutBlend()) => { s.pourIntoBlender(jar, 'coconutCream', 60); s.pourIntoBlender(jar, 'condensed', 1); s.scoopIceIntoBlender(jar, 3); return jar; };
const blend = (jar, seconds) => { const blender = new BlenderSystem(); blender.placeLid(jar); for (let t = 0; t < seconds - 1e-9; t += 0.05) jar.blend(0.05); blender.removeLid(jar); return jar; };
const pourJar = (d, jar) => new BlenderSystem().pour(jar, 1000, m => d.acceptPreparedMixture(m, jar));
const pourCoffee = d => new LiquidPourSystem().transfer(d.coffeeSource, 1, m => d.acceptPreparedMixture(m, d.coffeeSource));
const finished = (seconds = 4.5) => { const s = session(); const d = brew(new Drink('cotdua')); pourJar(d, blend(fillJar(s), seconds)); pourCoffee(d); return { s, d }; };

test('recipe: 30.000đ, suggested quantities, unlocked by day 5 and the blender; old recipes unchanged', () => {
  const r = RECIPES.cotdua;
  assert.equal(r.name, 'Cà phê cốt dừa'); assert.equal(r.price, 30000);
  assert.deepEqual(Object.fromEntries(r.ingredients.map(i => [i.id, i.target])), { coffee: 1, water: 1, brewedCoffee: 1, coconutCream: 60, condensed: 1, ice: 3 });
  assert.deepEqual(r.supplies, { coffee: 1, condensed: 1, ice: 1, coconutCream: 60 });
  assert.ok(!unlockedRecipes(5).includes('cotdua')); assert.ok(!unlockedRecipes(4, owned).includes('cotdua')); assert.ok(unlockedRecipes(5, owned).includes('cotdua'));
  assert.deepEqual(['den', 'sua', 'bac', 'trung', 'muoi'].map(id => [RECIPES[id].price, RECIPES[id].unlock.day]), [[12000, 1], [15000, 1], [18000, 2], [25000, 3], [22000, 4]]);
});

test('coconut cream is in the restocking catalog, bought by the 400 ml tin and stored in ml', () => {
  assert.deepEqual([INGREDIENTS.coconutCream.unit, INGREDIENTS.coconutCream.pack, INGREDIENTS.coconutCream.price], ['ml', 400, 28000]);
  const save = new SaveManager(memory()); save.data.balance = 50000; save.data.inventory.coconutCream = 10;
  const result = save.purchaseIngredient('coconutCream', 10);
  assert.equal(result.ok, true); assert.equal(save.data.inventory.coconutCream, 410); assert.equal(save.data.balance, 22000); assert.equal(save.data.stats.ingredientExpenses, 28000);
  // The day's supply plan only stocks coconut cream once the blender can make the drink.
  const empty = { coffee: 0, condensed: 0, milk: 0, egg: 0, ice: 0, cream: 0, salt: 0, coconutCream: 0 };
  assert.ok(!createSupplyPlan(empty, 5, 6).items.some(i => i.id === 'coconutCream'));
  assert.ok(createSupplyPlan(empty, 5, 6, owned).items.some(i => i.id === 'coconutCream'));
});

test('blender is a one-time upgrade stored in the save; orders need recipe, blender and stock', () => {
  assert.equal(UPGRADES.blender.price, 60000); assert.equal(freshSave().upgrades.blender, false);
  const storage = memory(), save = new SaveManager(storage); save.data.balance = 70000;
  assert.equal(save.purchase('blender', false).ok, true); assert.equal(quoteUpgrade(save.data.upgrades, 'blender'), null);
  assert.equal(new SaveManager(storage).data.upgrades.blender, true);
  assert.ok(!session({}, 5, { phins: 2 }).availableRecipes().includes('cotdua'));
  assert.ok(!session({}, 4).availableRecipes().includes('cotdua'));
  assert.ok(session({}).availableRecipes().includes('cotdua'));
  assert.ok(!session({ coconutCream: 59 }).availableRecipes().includes('cotdua'));
  assert.equal(canPrepareRecipe({ coffee: 1, condensed: 1, ice: 1, coconutCream: 60 }, 'cotdua'), true);
  const s = session({}); s.spawnCount = 5; const coconut = s.spawn(); assert.equal(coconut.recipeId, 'cotdua');
  assert.equal(coconut.type.line, 'Cho em cà phê dừa xay mịn, béo béo nha!');
});

test('stock is deducted exactly when each ingredient enters the jar, never during blending or serving', () => {
  const s = session({ coconutCream: 100, condensed: 2, ice: 2 }), jar = new CoconutBlend();
  assert.equal(s.pourIntoBlender(jar, 'coconutCream', 60), 60); assert.equal(s.inventory.coconutCream, 40);
  assert.equal(s.pourIntoBlender(jar, 'condensed', 1), 1); assert.equal(s.inventory.condensed, 1);
  assert.equal(s.scoopIceIntoBlender(jar, 3), 3); assert.equal(s.inventory.ice, 1); assert.equal(jar.amounts.ice, 3);
  assert.equal(s.pourIntoBlender(jar, 'milk', 1), 0); assert.equal(s.inventory.milk, 5);
  const before = { ...s.inventory };
  const d = brew(new Drink('cotdua')); s.inventory.coffee = before.coffee; // brew() bypasses the session for grounds.
  pourJar(d, blend(jar, 4.5)); pourCoffee(d);
  assert.deepEqual(s.inventory, before);
  const c = new Customer(ARCHETYPES[0], 'cotdua', 0); for (const next of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) c.transition(next); s.customers.push(c);
  assert.equal(s.serve(c, d).valid, true); assert.deepEqual(s.inventory, before);
});

test('grounds are charged once when the phin starts; collecting brewed coffee is free', () => {
  const s = session({ coffee: 2 }), d = new Drink('cotdua');
  d.placePhin(); assert.equal(s.addGrounds(d, 1), 1); assert.equal(s.inventory.coffee, 1);
  d.compress(RULES.pressSeconds); d.pourWater(1 / RULES.waterRate); d.finishWater(); d.update(RULES.brewSeconds);
  pourJar(d, blend(fillJar(s), 4.5)); pourCoffee(d);
  assert.equal(d.getAmounts().brewedCoffee, 1); assert.equal(s.inventory.coffee, 1); assert.equal(s.ingredientUsed.coffee, 1);
  assert.equal(pourCoffee(d), 0); assert.equal(d.getAmounts().brewedCoffee, 1);
});

test('out of coconut cream: nothing enters the jar and the recipe cannot be prepared', () => {
  const s = session({ coconutCream: 0 }), jar = new CoconutBlend();
  assert.equal(s.pourIntoBlender(jar, 'coconutCream', 20), 0); assert.equal(jar.empty, true);
  assert.equal(s.canPrepare('cotdua'), false);
});

test('blender requires ingredients and the lid; ingredients cannot be added with the lid on', () => {
  const blender = new BlenderSystem(), jar = new CoconutBlend();
  assert.equal(blender.placeLid(jar), false); assert.equal(jar.blend(1), 0);
  jar.add('ice', 3); assert.equal(blender.placeLid(jar), true); assert.equal(jar.blend(0.1), 0, 'ice alone is not a coconut mixture');
  assert.equal(jar.add('coconutCream', 60), 0); blender.removeLid(jar);
  jar.add('coconutCream', 60); assert.equal(jar.blend(0.1), 0, 'lid off');
  blender.placeLid(jar); assert.ok(jar.blend(0.1) > 0);
  assert.equal(blender.begin('switch', jar), true); assert.equal(blender.removeLid(jar), false, 'lid stays on while the motor runs');
  blender.end('switch'); assert.equal(blender.removeLid(jar), true);
});

test('blending only advances with sustained input and never stops itself at Perfect', () => {
  const jar = new CoconutBlend(); jar.add('coconutCream', 60); jar.add('ice', 3); jar.lid = true;
  assert.equal(jar.blend(5), 0.1, 'one frame cannot jump ahead');
  assert.deepEqual([0.5, 3, 4.5, 6].map(blendStage), ['COARSE', 'GOOD', 'PERFECT', 'OVERBLENDED']);
  let t = 0; while (jar.stage !== 'PERFECT') { jar.blend(0.05); t += 0.05; }
  assert.ok(Math.abs(t - BLEND.perfect) < 0.06); assert.equal(jar.technique, 1); assert.equal(jar.crush, 1);
  const stopped = jar.blendTime; assert.equal(jar.blendTime, stopped);
  for (let i = 0; i < 40; i++) jar.blend(0.05);
  assert.equal(jar.stage, 'OVERBLENDED'); assert.ok(jar.technique < 0.6);
  jar.lid = false; jar.add('coconutCream', 60); assert.ok(jar.blendTime < BLEND.over, 'fresh cream dilutes the texture');
});

test('the player pours the blended mixture by hand; never unblended, never through a phin', () => {
  const s = session({}), raw = fillJar(s), d = new Drink('cotdua');
  assert.equal(pourJar(d, raw), 0, 'unblended jar does not pour');
  const jar = blend(raw, 4.5), blender = new BlenderSystem();
  d.placePhin(); assert.equal(pourJar(d, jar), 0, 'phin is sitting on the glass');
  const fresh = new Drink('cotdua');
  assert.ok(blender.pour(jar, 30, m => fresh.acceptPreparedMixture(m, jar)) > 0);
  assert.ok(fresh.preparation.amounts.coconutCream > 20 && fresh.preparation.amounts.coconutCream < 40, 'partial pour');
  pourJar(fresh, jar); assert.ok(Math.abs(fresh.preparation.amounts.coconutCream - 60) < 1e-6); assert.equal(jar.empty, true);
  assert.equal(fresh.preparation.blendTechnique, 1);
  // Coffee only goes in on top of the coconut base.
  const bare = brew(new Drink('cotdua')); assert.equal(pourCoffee(bare), 0);
});

test('quality follows blend consistency, and Perfect coconut coffee earns a 15% better tip', () => {
  assert.equal(finished(4.5).d.evaluate('cotdua').quality, 'PERFECT');
  assert.equal(finished(3).d.evaluate('cotdua').quality, 'GOOD');
  assert.equal(finished(1).d.evaluate('cotdua').quality, 'ACCEPTABLE');
  const over = finished(7).d.evaluate('cotdua'); assert.equal(over.quality, 'ACCEPTABLE'); assert.match(over.message, /loãng/);
  const { s, d } = finished(4.5);
  const c = new Customer(ARCHETYPES[0], 'cotdua', 0); for (const next of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) c.transition(next); s.customers.push(c);
  const result = s.serve(c, d);
  assert.equal(result.price, 30000); assert.equal(result.tip, 8600); assert.equal(s.revenue, 30000); assert.equal(s.recipes.cotdua, 1);
  assert.equal(c.servedDrink, d);
  // A regular milk coffee is not a coconut coffee and vice versa.
  assert.equal(finished(4.5).d.evaluate('sua').valid, false);
});

test('direct milk or ice into a coconut glass is refused and refunded', () => {
  const s = session({ condensed: 2, ice: 2 }), d = brew(new Drink('cotdua'));
  assert.equal(s.pourIngredient(d, 'condensed', 1), 0); assert.equal(s.inventory.condensed, 2);
  assert.equal(s.addIce(d), false); assert.equal(s.inventory.ice, 2);
});

test('discarded mixtures stay consumed and are reported as ingredient waste', () => {
  const s = session({}), jar = blend(fillJar(s), 7);
  const remaining = { ...s.inventory };
  assert.ok(s.recordWaste(jar.stock()) > 0);
  assert.deepEqual(s.inventory, remaining);
  const summary = s.summary().ingredients;
  assert.deepEqual([summary.wasted.coconutCream, summary.wasted.condensed, summary.wasted.ice], [60, 1, 1]);
  assert.equal(summary.wasteCost, ingredientValue({ coconutCream: 60, condensed: 1, ice: 1 }));
  assert.equal(s.recordWaste(jar.stock()), 0, 'waste is capped by what was used');
  const cup = finished(4.5); assert.ok(cup.s.recordDrinkWaste(cup.d) > 0);
});

test('a started coconut glass keeps its recipe; other stations are independent', () => {
  const station = new BrewingStation('a', 'cotdua'); station.placeGlass();
  const s = session({}); pourJar(station.drink, blend(fillJar(s), 4.5));
  assert.equal(station.chooseRecipe('sua'), false); assert.equal(station.drink.recipeId, 'cotdua');
  const other = new BrewingStation('b', 'den'); other.placeGlass(); assert.equal(other.chooseRecipe('cotdua'), true);
});

test('final drink keeps distinct coconut and coffee layers for the marbled animation', () => {
  const { d } = finished(4.5);
  assert.deepEqual([...new Set(d.preparation.layers.map(l => l.id))].sort(), ['brewedCoffee', 'coconutCream', 'condensed']);
  assert.equal(d.preparation.layers.at(-1).id, 'brewedCoffee'); assert.ok(d.preparation.layers.some(l => l.id === 'coconutCream'));
  assert.equal(d.preparation.mixing, 0);
  const preview = recipePreview(RECIPES.cotdua); assert.equal(preview.recipeId, 'cotdua'); assert.ok(preview.preparation.amounts.brewedCoffee > 0 && preview.preparation.amounts.coconutCream > 0);
});

test('existing v3 saves gain the blender and coconut cream defaults without losing data', () => {
  const old = freshSave(); old.day = 9; old.balance = 77000; old.upgrades = { phins: 3, seats: 5, premium: true, fan: false, decor: true };
  old.inventory = { coffee: 4, condensed: 2, milk: 1, egg: 0, ice: 6, cream: 80, salt: 1 }; old.mastery = { den: 3, sua: 2, bac: 1, trung: 4, muoi: 7 };
  const save = new SaveManager(memory({ [SAVE_KEY]: JSON.stringify(old) }));
  assert.deepEqual(save.data.upgrades, { phins: 3, seats: 5, premium: true, fan: false, decor: true, blender: false });
  assert.equal(save.data.inventory.cream, 80); assert.equal(save.data.inventory.coconutCream, 240);
  assert.deepEqual(save.data.mastery, { den: 3, sua: 2, bac: 1, trung: 4, muoi: 7, cotdua: 0, tratac: 0, tradao: 0, travai: 0, cacao: 0, matcha: 0 });
  assert.equal(save.data.balance, 77000); assert.equal(save.data.day, 9);
});
