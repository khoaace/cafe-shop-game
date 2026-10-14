import test from 'node:test';
import assert from 'node:assert/strict';
import { SaltedCream, creamStage, CREAM_PERFECT } from '../src/models/SaltedCream.js';
import { Drink } from '../src/models/Drink.js';
import { WhiskSystem } from '../src/systems/preparation/WhiskSystem.js';
import { LiquidPourSystem } from '../src/systems/preparation/LiquidPourSystem.js';
import { DaySession } from '../src/models/DaySession.js';
import { Customer } from '../src/models/Customer.js';
import { SaveManager, freshSave, SAVE_KEY } from '../src/systems/SaveManager.js';
import { RECIPES, RULES, ARCHETYPES, unlockedRecipes } from '../src/config.js';
import { canPrepareRecipe, INITIAL_INVENTORY } from '../src/logic/inventory.js';

const brew = (water = 1) => {
  const d = new Drink('muoi'); d.placePhin(); d.addGrounds(1); d.compress(RULES.pressSeconds);
  d.pourWater(water / RULES.waterRate); d.finishWater(); d.update(8); return d;
};
const bowl = (salt = 0.3, movement = Math.PI * 7, cream = 40) => {
  const b = new SaltedCream(); b.add('cream', cream); b.add('salt', salt); b.whip(movement); return b;
};
const transfer = (d, b, amount = 100) => new LiquidPourSystem().transfer(b, amount, mixture => d.acceptPreparedMixture(mixture, b));
const ready = (salt, movement, water, portion = 100) => {
  const d = brew(water); d.addIngredient('condensed', 1); d.addIngredient('ice', 3);
  transfer(d, d.coffeeSource); transfer(d, bowl(salt, movement), portion); return d;
};

test('only salted coffee is implemented; unlock and pantry block random locked or unavailable orders', () => {
  assert.equal(RECIPES.muoi.price, 22000); assert.equal(Object.keys(RECIPES).length, 6);
  assert.ok(!unlockedRecipes(3).includes('muoi')); assert.ok(unlockedRecipes(4).includes('muoi'));
  assert.ok(canPrepareRecipe(INITIAL_INVENTORY, 'muoi'));
  assert.equal(canPrepareRecipe({ ...INITIAL_INVENTORY, salt: 0 }, 'muoi'), false);
  assert.equal(new DaySession(3).availableRecipes().includes('muoi'), false);
});

test('brew must finish physically; collecting never creates or duplicates coffee', () => {
  const d = new Drink('muoi'); assert.equal(d.coffeeSource.volume, 0);
  assert.equal(transfer(d, d.coffeeSource), 0);
  d.placePhin(); d.addGrounds(1); d.compress(1); d.pourWater(1 / RULES.waterRate); d.finishWater();
  d.update(4); assert.equal(d.coffeeSource.volume, 0); d.update(4);
  assert.equal(d.coffeeSource.amounts.brewedCoffee, 1); assert.equal(d.getAmounts().brewedCoffee, undefined);
  assert.equal(transfer(d, d.coffeeSource, 0.4), 0.4); assert.equal(d.getAmounts().brewedCoffee, 0.4);
  assert.ok(Math.abs(transfer(d, d.coffeeSource) - 0.6) < 1e-9);
  d.update(100); assert.equal(transfer(d, d.coffeeSource), 0); assert.equal(d.getAmounts().brewedCoffee, 1);
  const other = brew(); assert.equal(transfer(other, d.coffeeSource), 0);
});

test('salted whisk uses real circular movement; holding, straight strokes, jitter and jumps fail', () => {
  const whisk = new WhiskSystem(), b = bowl(0.3, 0);
  const center = { x: 0, y: 0, radius: 38 };
  for (let i = 0; i < 40; i++) whisk.moveCircular(1, b, { x: 25, y: 0, time: i * 16 }, center);
  assert.equal(b.whipping, 0); whisk.end(1);
  for (let i = 0; i < 100; i++) whisk.moveCircular(1, b, { x: i % 2 ? 5 : -5, y: 25, time: i * 16 }, center);
  assert.equal(b.whipping, 0); whisk.end(1);
  for (let i = 0; i < 20; i++) whisk.moveCircular(1, b, { x: i % 2 ? 500 : -500, y: 0, time: i * 16 }, center);
  assert.equal(b.whipping, 0); whisk.end(1);
  for (let i = 0; i <= 150; i++) { const a = i * Math.PI / 20; whisk.moveCircular(1, b, { x: Math.cos(a) * 25, y: Math.sin(a) * 25, time: i * 16 }, center); }
  assert.equal(b.stage, 'PERFECT CREAM'); assert.equal(b.consistency, 1);
  const progress = b.whipping; for (let i = 0; i < 40; i++) whisk.moveCircular(1, b, { x: 0, y: -25, time: 3000 + i * 16 }, center);
  assert.equal(b.whipping, progress);
});

test('five cream stages and wide Perfect zone track actual motion, including overwhipping', () => {
  assert.deepEqual([0, Math.PI * 2, Math.PI * 4.5, Math.PI * 7, Math.PI * 10].map(creamStage), ['LIQUID', 'SMALL BUBBLES', 'SOFT FOAM', 'PERFECT CREAM', 'OVERWHIPPED']);
  const b = bowl(0.3, CREAM_PERFECT.start + 0.01); assert.equal(b.consistency, 1);
  b.whip(CREAM_PERFECT.end - b.whipping - 0.01); assert.equal(b.consistency, 1);
  b.whip(1); assert.equal(b.stage, 'OVERWHIPPED'); assert.ok(b.consistency < 1);
  b.add('cream', 40); assert.ok(b.whipping < CREAM_PERFECT.start);
});

test('manual cream transfer conserves salt proportion, amount and earned technique; no stock charged twice', () => {
  const session = new DaySession(4), d = brew(), b = new SaltedCream();
  b.add('cream', session.consumeIngredient('cream', 40)); b.add('salt', session.consumeIngredient('salt', 0.3)); b.whip(Math.PI * 7);
  const inventory = { ...session.inventory };
  transfer(d, b, 20.15); assert.ok(Math.abs(d.getAmounts().cream - 20) < 1e-6); assert.ok(Math.abs(d.getAmounts().salt - 0.15) < 1e-6);
  assert.ok(Math.abs(b.amounts.cream - 20) < 1e-6); assert.equal(d.preparation.creamTechnique, 1);
  transfer(d, b); assert.equal(transfer(d, b), 0); assert.deepEqual(session.inventory, inventory);
  assert.ok(Math.abs(d.getAmounts().cream - 40) < 1e-6); assert.ok(Math.abs(d.getAmounts().salt - 0.3) < 1e-6);
  b.add('cream', 40); assert.equal(b.whipping, 0); assert.equal(b.amounts.salt, undefined);
});

test('completed drink is Perfect with distinct layers; wrong salt and imperfect technique remain serveable', () => {
  const perfect = ready(); assert.match(perfect.nextStep(), /đến khách/); assert.equal(perfect.evaluate('muoi').quality, 'PERFECT'); assert.equal(perfect.evaluate('muoi').perfectCream, true);
  for (const salt of [0.24, 0.38, 0.6]) { const result = ready(salt).evaluate('muoi'); assert.ok(result.valid); assert.ok(result.recipeCorrectness); }
  assert.notEqual(ready(0.6).evaluate('muoi').quality, 'PERFECT'); assert.equal(bowl(0.6).salty, true);
  assert.equal(ready(0).evaluate('muoi').valid, false);
  assert.equal(ready(0.3, 0).evaluate('muoi').valid, false);
  assert.ok(ready(0.3, Math.PI * 4).evaluate('muoi').valid);
  assert.notEqual(ready(0.3, Math.PI * 11).evaluate('muoi').quality, 'PERFECT');
  assert.notEqual(ready(0.3, Math.PI * 7, 1.4).evaluate('muoi').quality, 'PERFECT');
  assert.notEqual(ready(0.3, Math.PI * 7, 1, 24.18).evaluate('muoi').quality, 'PERFECT');
  assert.equal(perfect.evaluate('den').valid, false);
  assert.deepEqual(perfect.preparation.layers.map(l => l.id), ['brewedCoffee', 'cream']);
  assert.equal(perfect.preparation.mixing, 0);
});

test('multiple cups and batches retain separate progress and cannot borrow another phin', () => {
  const a = brew(), b = brew(), first = bowl(), second = bowl(0.6, Math.PI * 11);
  transfer(a, first, 20.15); assert.equal(b.getAmounts().cream, undefined);
  transfer(b, second); assert.notEqual(a.preparation.creamTechnique, b.preparation.creamTechnique);
  assert.equal(transfer(a, b.coffeeSource), 0); assert.equal(b.coffeeSource.amounts.brewedCoffee, 1);
  assert.ok(Math.abs(first.amounts.cream - 20) < 1e-6);
});

test('orders, Vietnamese dialogue, price, cream tip, stats, saves and idempotent serving integrate', () => {
  const s = new DaySession(4, false, () => 0), c = new Customer(ARCHETYPES[0], 'muoi', 0);
  s.customers.push(c); for (const next of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) c.transition(next);
  assert.match(c.type.line, /lớp kem dày/); assert.match(c.type.happy, /béo mặn vừa đủ/);
  const d = ready(), result = s.serve(c, d); assert.ok(result.valid); assert.equal(result.price, 22000); assert.equal(result.tip, 6300); assert.equal(c.servedDrink, d);
  assert.equal(s.serve(c, d).valid, false); assert.equal(s.revenue, 22000); assert.equal(s.summary().recipes.muoi, 1);
  const old = freshSave(); delete old.inventory.cream; delete old.inventory.salt; delete old.mastery.muoi;
  old.balance = 123000; old.mastery.den = 9;
  const storage = { getItem: key => key === SAVE_KEY ? JSON.stringify(old) : null, setItem() {} };
  const save = new SaveManager(storage); assert.equal(save.data.version, 3); assert.equal(save.data.balance, 123000); assert.equal(save.data.mastery.den, 9);
  assert.equal(save.data.mastery.muoi, 0); assert.equal(save.data.inventory.cream, 240); assert.equal(save.data.inventory.salt, 3);
});

test('pour tilt recovers a right-to-left entry and stations cannot switch a prepared cup across salt/legacy flows', async () => {
  const { BrewingStation } = await import('../src/models/BrewingStation.js');
  const pour = new LiquidPourSystem(); pour.begin(1, { x: 140, y: 714 }, { rate: 18 });
  pour.move(1, { x: 80, y: 714 }); assert.equal(pour.sessions.get(1).tilt, 0);
  pour.move(1, { x: 128, y: 714 }); assert.equal(pour.sessions.get(1).tilt, 1);
  const station = new BrewingStation('a', 'muoi'); station.placeGlass(); assert.ok(station.chooseRecipe('den')); assert.equal(station.drink.preparation.capacity, 5); assert.ok(station.chooseRecipe('muoi')); assert.equal(station.drink.preparation.capacity, 80); assert.ok(station.chooseRecipe('den')); station.drink.placePhin();
  assert.equal(station.chooseRecipe('muoi'), false); assert.equal(station.recipeId, 'den');
  assert.ok(station.chooseRecipe('sua')); assert.equal(station.drink.state, 'PHIN');
});

test('combining cream batches weights their actual movement and technique by accepted cream portion', () => {
  const d = brew(), perfect = bowl(), soft = bowl(0.3, Math.PI * 4);
  transfer(d, perfect, 20.15); transfer(d, soft, 20.15);
  assert.ok(Math.abs(d.preparation.creamTechnique - (perfect.consistency + soft.consistency) / 2) < 1e-6);
  assert.ok(Math.abs(d.preparation.steps.whisk.amount - Math.PI * 5) < 1e-6);
  assert.ok(d.preparation.steps.whisk.amount > Math.PI * 4);
});
