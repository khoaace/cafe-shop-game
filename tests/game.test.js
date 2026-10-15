import test from 'node:test';
import assert from 'node:assert/strict';
import { Drink } from '../src/models/Drink.js';
import { SaltedCream } from '../src/models/SaltedCream.js';
import { CoconutBlend } from '../src/models/CoconutBlend.js';
import { KumquatPrep } from '../src/models/KumquatPrep.js';
import { MatchaBowl, MATCHA_WHISK_TARGET } from '../src/models/MatchaBowl.js';
import { BlenderSystem } from '../src/systems/preparation/BlenderSystem.js';
import { LiquidPourSystem } from '../src/systems/preparation/LiquidPourSystem.js';
import { BrewingStation } from '../src/models/BrewingStation.js';
import { Customer } from '../src/models/Customer.js';
import { DaySession } from '../src/models/DaySession.js';
import { SaveManager, SAVE_KEY, freshSave } from '../src/systems/SaveManager.js';
import { GestureTracker } from '../src/systems/GestureTracker.js';
import { ARCHETYPES, RECIPES, RULES, clockText, unlockedRecipes } from '../src/config.js';

function prepare(id = 'den', additionsFirst = false) {
  const r = RECIPES[id]; const d = new Drink(id);
  if (id === 'tratac') {
    const prep = new KumquatPrep(); prep.place(2); prep.slice(); prep.moveToSqueezer(); prep.squeeze(80);
    const addJuiceAndSyrup = () => {
      new LiquidPourSystem().transfer(prep, 100, m => d.acceptPreparedMixture(m, prep));
      d.addMeasuredIngredient('syrup', 15); d.addMeasuredIngredient('ice', 3);
    };
    if (additionsFirst) addJuiceAndSyrup();
    d.addMeasuredIngredient('tea', 150);
    if (!additionsFirst) addJuiceAndSyrup();
    d.stirBy(RULES.stirRadians);
    return d;
  }
  if (id === 'tradao') {
    const addFruitAndJuice = () => {
      d.addMeasuredIngredient('lemongrass', 1);
      d.addMeasuredIngredient('peach', 2);
      d.addMeasuredIngredient('orangeJuice', 30);
      d.addMeasuredIngredient('peachSyrup', 20);
      d.addMeasuredIngredient('ice', 3);
      d.addMeasuredIngredient('orange', 1);
    };
    if (additionsFirst) addFruitAndJuice();
    d.addMeasuredIngredient('tea', 140);
    if (!additionsFirst) addFruitAndJuice();
    return d;
  }
  if (id === 'travai') {
    const addLycheeAndSyrup = () => {
      d.addMeasuredIngredient('lychee', 2);
      d.addMeasuredIngredient('lycheeSyrup', 20);
      d.addMeasuredIngredient('ice', 3);
    };
    if (additionsFirst) addLycheeAndSyrup();
    d.addMeasuredIngredient('tea', 150);
    if (!additionsFirst) addLycheeAndSyrup();
    d.stirBy(RULES.stirRadians);
    return d;
  }
  if (id === 'cacao') {
    const addMilkAndIce = () => {
      d.addMeasuredIngredient('condensed', 15);
      d.addMeasuredIngredient('milk', 100);
      d.addMeasuredIngredient('ice', 3);
    };
    if (additionsFirst) addMilkAndIce();
    d.addMeasuredIngredient('cacao', 15);
    d.addMeasuredIngredient('water', 30);
    d.stirBy(Math.PI * 3.2);
    if (!additionsFirst) addMilkAndIce();
    return d;
  }
  if (id === 'matcha') {
    const bowl = new MatchaBowl();
    bowl.add('matcha', 4);
    bowl.add('water', 40);
    bowl.whisk(MATCHA_WHISK_TARGET);
    const addMilkAndIce = () => {
      d.addMeasuredIngredient('ice', 3);
      d.addMeasuredIngredient('milk', 150);
      d.addMeasuredIngredient('syrup', 10);
    };
    if (additionsFirst) addMilkAndIce();
    if (!additionsFirst) addMilkAndIce();
    new LiquidPourSystem().transfer(bowl, 100, m => d.acceptPreparedMixture(m, bowl));
    return d;
  }
  const add = () => {
    if (id === 'cotdua') {
      const jar = new CoconutBlend(); jar.add('coconutCream', 60); jar.add('condensed', 1); jar.add('ice', 3); jar.lid = true; for (let i = 0; i < 45; i++) jar.blend(0.1); jar.lid = false;
      new BlenderSystem().pour(jar, 1000, m => d.acceptPreparedMixture(m, jar)); return;
    }
    for (const k of ['condensed', 'milk', 'ice', 'foam']) if (r[k]) d.addIngredient(k, r[k]);
  };
  if (additionsFirst) add();
  d.placePhin(); d.addGrounds(r.coffee); d.compress(RULES.pressSeconds);
  d.pourWater(r.water / RULES.waterRate); d.finishWater(); d.update(RULES.brewSeconds);
  if (!additionsFirst) add();
  if (id === 'muoi') {
    const bowl = new SaltedCream(); bowl.add('cream', 40); bowl.add('salt', 0.3); bowl.whip(Math.PI * 7);
    const pour = new LiquidPourSystem(); pour.transfer(d.coffeeSource, 1, m => d.acceptPreparedMixture(m, d.coffeeSource)); pour.transfer(bowl, 40.3, m => d.acceptPreparedMixture(m, bowl));
  }
  if (id === 'cotdua') new LiquidPourSystem().transfer(d.coffeeSource, 1, m => d.acceptPreparedMixture(m, d.coffeeSource));
  if (r.stir) d.stirBy(RULES.stirRadians);
  return d;
}
function waiting(session, recipe = 'den') {
  session.customers = session.customers.filter(c => !c.resolved);
  const c = session.spawn(); c.recipeId = recipe;
  for (const next of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) assert.equal(c.transition(next), true);
  return c;
}
function memoryStorage(initial = null) {
  let value = initial;
  return { getItem: () => value, setItem: (key, next) => { assert.equal(key, SAVE_KEY); value = next; } };
}

test('brewing rejects out-of-order actions and progresses from actual elapsed time', () => {
  const d = new Drink(); assert.equal(d.pourWater(1), false); assert.equal(d.addGrounds(1), false);
  assert.equal(d.compress(1), false); assert.equal(d.placePhin(), true); assert.equal(d.placePhin(), false);
  assert.equal(d.compress(1), false); d.addGrounds(1); d.compress(0.3); assert.equal(d.state, 'PHIN');
  d.compress(0.35); assert.equal(d.state, 'PRESSED'); d.pourWater(1 / RULES.waterRate);
  assert.equal(d.state, 'POURING'); d.finishWater(); d.update(4); assert.equal(d.coffee, 0.5);
  assert.equal(d.evaluate('den').valid, false); d.update(4); assert.equal(d.state, 'BREWED');
});
for (const id of Object.keys(RECIPES)) {
  test(`${id}: correct physical preparation is PERFECT`, () => {
    const d = prepare(id); assert.equal(d.evaluate(id).quality, 'PERFECT'); assert.equal(d.evaluate(id).valid, true);
  });
  test(`${id}: harmless ingredient order does not invalidate recipe`, () => {
    assert.equal(prepare(id, true).evaluate(id).quality, 'PERFECT');
  });
}
test('too much milk reduces quality rather than invalidating the correct drink', () => {
  const d = prepare('sua'); d.addIngredient('condensed', 1); d.stirBy(RULES.stirRadians);
  assert.equal(d.evaluate('sua').valid, true); assert.notEqual(d.evaluate('sua').quality, 'PERFECT');
});
test('wrong ingredient, insufficient ice and insufficient stirring report actionable feedback', () => {
  const black = prepare('den'); black.addIngredient('milk', 0.2); assert.match(black.evaluate('den').message, /không có sữa tươi/);
  const iced = prepare('den'); iced.ice = 0; assert.match(iced.evaluate('den').message, /Thiếu đá/);
  const milk = prepare('sua'); milk.stir = 0; assert.match(milk.evaluate('sua').message, /Khuấy thêm/);
});
test('adding milk after stirring requires another real stir', () => {
  const d = prepare('sua'); d.addIngredient('condensed', 0.1); assert.equal(d.stir, 0); assert.equal(d.evaluate('sua').valid, false);
});
test('independent stations brew without overwriting each other and discard frees a station', () => {
  const a = new BrewingStation('a'), b = new BrewingStation('b');
  a.placeGlass(); b.placeGlass(); assert.notEqual(a.drink.id, b.drink.id); assert.equal(a.placeGlass(), false);
  a.drink.placePhin(); a.drink.addGrounds(1); a.drink.compress(1); a.drink.pourWater(2); a.drink.finishWater();
  a.update(8); b.update(8); assert.equal(a.drink.state, 'BREWED'); assert.equal(b.drink.state, 'GLASS');
  a.discard(); assert.equal(a.placeGlass(), true); assert.equal(b.drink.state, 'GLASS');
});
test('movement is required for whisking; teleport jumps do not count', () => {
  const g = new GestureTracker(); assert.equal(g.whisk(20, 20, 0), 0);
  assert.equal(g.whisk(20, 20, 1000), 0); assert.equal(g.whisk(25, 20, 1020), 5);
  assert.equal(g.whisk(500, 500, 1040), 0);
});
test('stirring recognizes circles across angle wrap and rejects holding/straight center jitter', () => {
  const g = new GestureTracker(); let progress = 0;
  for (let i = 0; i <= 100; i++) { const a = i / 100 * Math.PI * 4; progress += g.stir(Math.cos(a) * 30, Math.sin(a) * 30, 0, 0); }
  assert.ok(progress > RULES.stirRadians);
  g.reset(); for (let i = 0; i < 50; i++) assert.equal(g.stir(0, 0, 0, 0), 0);
  g.reset(); assert.equal(g.stir(30, 0, 0, 0), 0); assert.equal(g.stir(30, 0, 0, 0), 0);
});
test('customer states are explicit and resolution is idempotent', () => {
  const c = new Customer(ARCHETYPES[0], 'den', 0); assert.equal(c.transition('SERVED'), false);
  for (const next of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) assert.equal(c.transition(next), true);
  assert.equal(c.resolve('served'), true); assert.equal(c.resolve('lost'), false); assert.equal(c.state, 'SERVED');
});
test('correct serving grants menu price and tip exactly once', () => {
  const day = new DaySession(); const c = waiting(day); const d = prepare();
  const reward = day.serve(c, d); assert.equal(reward.price, 12000); assert.equal(reward.tip, 3000);
  assert.equal(day.earnings, 15000); assert.equal(day.serve(c, d).valid, false); assert.equal(day.earnings, 15000);
  assert.equal(day.lose(c), false); assert.equal(day.ratings.length, 1);
});
test('wrong orders reset combo but retain cup and waiting customer for correction', () => {
  const day = new DaySession(); day.combo = 2; const c = waiting(day, 'sua'); const d = prepare('den');
  assert.equal(day.serve(c, d).valid, false); assert.equal(day.combo, 0); assert.equal(d.consumed, false);
  assert.equal(c.state, 'WAITING'); assert.equal(day.revenue, 0);
});
test('combo milestone rewards 3 / 5 / 10 are applied once per reached streak', () => {
  const day = new DaySession(3);
  for (let i = 0; i < 10; i++) assert.equal(day.serve(waiting(day), prepare()).valid, true);
  assert.equal(day.bonuses, 25000); assert.equal(day.bestCombo, 10); assert.equal(day.served, 10);
  const loser = waiting(day); assert.equal(day.lose(loser), true); assert.equal(day.combo, 0);
});
test('independent patience expiry does not duplicate customer exits or ratings', () => {
  const day = new DaySession(); const a = waiting(day); const b = waiting(day);
  a.waited = a.patience - 0.05; const before = b.waited;
  day.update(0.1); assert.equal(day.lost, 1); assert.equal(b.waited, before + 0.1);
  day.update(0.1); assert.equal(day.lost, 1); assert.equal(day.ratings.length, 1);
});
test('day has rush hour, last call and one closing settlement', () => {
  const day = new DaySession(); day.elapsed = RULES.rushStart; assert.equal(day.rush, true);
  day.elapsed = RULES.rushEnd; assert.equal(day.rush, false);
  day.elapsed = RULES.lastArrival; day.update(0.1); assert.equal(day.customers.length, 0);
  const c = waiting(day); day.elapsed = RULES.daySeconds - 0.1;
  assert.equal(day.update(0.2).filter(e => e.type === 'end').length, 1);
  assert.equal(day.lost, 1); assert.equal(day.update(1).length, 0); assert.equal(day.lose(c), false);
});
test('tutorial is untimed and ends after three customers', () => {
  const day = new DaySession(1, true); const c = waiting(day); c.update(1000); assert.equal(c.ratio, 1);
  day.serve(c, prepare()); day.serve(waiting(day), prepare()); day.serve(waiting(day), prepare());
  assert.equal(day.update(0.1).some(e => e.type === 'end'), true);
});
test('difficulty unlocks recipes gradually and limits pending orders', () => {
  assert.deepEqual(unlockedRecipes(1), ['den', 'sua']); assert.equal(unlockedRecipes(2).length, 3); assert.equal(unlockedRecipes(3).length, 5);
  const day = new DaySession(1); assert.ok(day.spawn()); assert.ok(day.spawn()); assert.equal(day.spawn(), null);
  const later = new DaySession(3); assert.ok(later.spawn()); assert.ok(later.spawn()); assert.ok(later.spawn()); assert.equal(later.spawn(), null);
});
test('06:00–10:00 clock mapping is correct', () => {
  assert.equal(clockText(0), '06:00'); assert.equal(clockText(45), '07:00'); assert.equal(clockText(112.5), '08:30'); assert.equal(clockText(180), '10:00');
});
test('summary totals separate revenue, tips and bonuses', () => {
  const day = new DaySession(); for (let i = 0; i < 3; i++) day.serve(waiting(day), prepare());
  const s = day.summary(); assert.equal(s.revenue, 36000); assert.equal(s.tips, 9000); assert.equal(s.bonuses, 3000); assert.equal(s.earnings, 48000);
});
test('day save persists, prevents duplicate settlement and smooths reputation', () => {
  const storage = memoryStorage(); const manager = new SaveManager(storage);
  const day = new DaySession(); day.serve(waiting(day), prepare()); const s = day.summary();
  assert.equal(manager.completeDay(s), true); assert.equal(manager.completeDay(s), false);
  const reload = new SaveManager(storage); assert.equal(reload.data.day, 2); assert.equal(reload.data.balance, 15000);
  assert.equal(reload.data.stats.served, 1); assert.ok(reload.reputation > 4 && reload.reputation < 5);
});
test('tutorial cannot inflate the main economy', () => {
  const manager = new SaveManager(memoryStorage()); const day = new DaySession(1, true);
  day.serve(waiting(day), prepare()); manager.completeDay(day.summary());
  assert.equal(manager.data.tutorialDone, true); assert.equal(manager.data.balance, 0); assert.equal(manager.data.day, 1);
});
test('midday reload retains the start-of-day checkpoint', () => {
  const storage = memoryStorage(); const manager = new SaveManager(storage); const day = new DaySession();
  day.serve(waiting(day), prepare()); assert.equal(day.earnings, 15000);
  assert.equal(new SaveManager(storage).data.balance, 0); assert.equal(manager.data.day, 1);
});
test('corrupt, unsupported and partially malformed saves recover safely', () => {
  for (const raw of ['broken json', 'null', '{"version":9}', '[]']) {
    const m = new SaveManager(memoryStorage(raw)); assert.equal(m.data.day, 1); assert.equal(m.data.balance, 0); assert.ok(m.warning);
  }
  const m = new SaveManager(memoryStorage(JSON.stringify({ version: 1, day: -1, balance: 'NaN', stats: { served: -90 } })));
  assert.equal(m.data.day, 1); assert.equal(m.data.balance, 0); assert.equal(m.data.stats.served, 0);
});
test('blocked storage keeps the session usable with an honest warning', () => {
  const m = new SaveManager({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } });
  assert.equal(m.write(), false); assert.equal(m.available, false); assert.ok(m.warning);
  const day = new DaySession(); day.serve(waiting(day), prepare()); m.completeDay(day.summary());
  assert.equal(m.data.day, 2); assert.equal(m.data.balance, 15000); assert.equal(m.completeDay(day.summary()), false);
});
test('settings and reset persist without changing a running economy', () => {
  const storage = memoryStorage(); const m = new SaveManager(storage); m.settings({ sound: false, reducedMotion: true });
  assert.equal(new SaveManager(storage).data.settings.sound, false); m.reset(); assert.deepEqual(m.data, freshSave());
});
