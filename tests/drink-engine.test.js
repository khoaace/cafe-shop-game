import test from 'node:test';
import assert from 'node:assert/strict';
import { defineRecipe, PLANNED_DRINKS } from '../src/data/drinkEngine.js';
import { RECIPES, registerRecipe, unlockedRecipes, RULES } from '../src/config.js';
import { Drink } from '../src/models/Drink.js';
import { PreparationState } from '../src/models/PreparationState.js';
import { LiquidPourSystem } from '../src/systems/preparation/LiquidPourSystem.js';
import { WhiskSystem } from '../src/systems/preparation/WhiskSystem.js';
import { StirringSystem } from '../src/systems/preparation/StirringSystem.js';
import { FruitPreparationSystem } from '../src/systems/preparation/FruitPreparationSystem.js';
import { BlenderSystem } from '../src/systems/preparation/BlenderSystem.js';
import { IceSystem } from '../src/systems/preparation/IceSystem.js';
import { GarnishSystem } from '../src/systems/preparation/GarnishSystem.js';
import { DaySession } from '../src/models/DaySession.js';
import { SaveManager, freshSave } from '../src/systems/SaveManager.js';

const fixture = () => ({ id: 'fixture', name: 'Ly kiểm tra', price: 10000, equipment: ['glass', 'milk', 'stir'], supplies: { milk: 1 },
  ingredients: [{ id: 'milk', target: 1, unit: 'phần' }], visual: { capacity: 3 }, unlock: { day: 50, upgrades: { phins: 2 } },
  steps: [{ id: 'fill', action: 'pour', ingredient: 'milk', target: 1, instruction: 'Rót sữa.' }, { id: 'mix', action: 'stir', target: 10, after: ['fill'], instruction: 'Khuấy.' }] });

test('planned drinks are metadata only; schema rejects units and invalid dependencies', () => {
  assert.equal(PLANNED_DRINKS.length, 5);
  for (const planned of PLANNED_DRINKS) assert.equal(RECIPES[planned.id], undefined);
  const bad = fixture(); bad.ingredients[0].unit = 'ml'; assert.throws(() => defineRecipe(bad));
  const dependency = fixture(); dependency.steps[0].after = ['mix']; assert.throws(() => defineRecipe(dependency));
  const valid = defineRecipe(fixture()); assert.ok(Object.isFrozen(valid.steps[0]));
});

test('tilt, accepted volume, pointer release and per-pointer pour sessions', () => {
  const pour = new LiquidPourSystem(); const a = new PreparationState('a', 1), b = new PreparationState('b', 10);
  pour.begin(1, { x: 0, y: 0 }, { rate: 10 }); pour.begin(2, { x: 0, y: 0 }, { rate: 10 });
  assert.equal(pour.update(1, 0.1, a, n => a.add('milk', n)), 0);
  pour.move(1, { x: 48, y: 0 }); pour.move(2, { x: 24, y: 0 });
  assert.equal(pour.update(1, 0.1, a, n => a.add('milk', n)), 1);
  assert.equal(pour.update(1, 0.1, a, n => a.add('milk', n)), 0);
  assert.equal(pour.update(2, 0.1, b, n => b.add('milk', n)), 0.5);
  assert.equal(pour.end(1), 1); assert.equal(pour.update(1, 0.1, a, n => a.add('milk', n)), 0);
  assert.ok(pour.sessions.has(2));
});

test('whisk and stir require motion; circular, W and back-and-forth gestures earn progress', () => {
  const whisk = new WhiskSystem(), stir = new StirringSystem();
  const a = new PreparationState('a'), b = new PreparationState('b');
  for (let i = 0; i < 30; i++) { whisk.move(1, a, { x: 30, y: 0, time: i * 16 }, { x: 0, y: 0 }); stir.move(2, b, { x: 30, y: 0, time: i * 16 }, { x: 0, y: 0 }); }
  assert.equal(a.foam, 0); assert.equal(b.mixing, 0); whisk.end(1); stir.end(2);
  for (let i = 0; i < 100; i++) { const angle = i * 0.15; const p = { x: Math.cos(angle) * 30, y: Math.sin(angle) * 30, time: i * 16 }; whisk.move(1, a, p, { x: 0, y: 0 }); stir.move(2, b, p, { x: 0, y: 0 }); }
  assert.ok(a.foam > 0.3); assert.equal(b.mixing, 1);
  const w = new PreparationState('w'); whisk.end(1);
  const points = [[-30, -20], [-20, 20], [-10, -20], [0, 20], [10, -20]];
  points.forEach(([x, y], i) => whisk.move(1, w, { x, y, time: i * 30 }, { x: 0, y: 0 }));
  assert.ok(w.foam > 0);
  const strokes = new PreparationState('strokes'); stir.end(2);
  [-25, -5, 15, 25, 5, -15, -25].forEach((x, i) => stir.move(2, strokes, { x, y: 5, time: i * 25 }, { x: 0, y: 0 })); assert.ok(strokes.mixing > 0);
});

test('fruit slicing must cross center; squeezed juice is finite and survives gesture release', () => {
  const system = new FruitPreparationSystem(), state = new PreparationState('board');
  assert.ok(system.place(state, 'kumquat', 1, 5)); assert.equal(system.place(state, 'orange'), false);
  system.move(1, state, { x: -30, y: 0, time: 0 }, { x: 0, y: 0 });
  assert.equal(system.move(1, state, { x: 30, y: 0, time: 30 }, { x: 0, y: 0 }), 1);
  system.end(1); for (let i = 0; i < 20; i++) system.move(1, state, { x: i % 2 ? 20 : 0, y: 0, time: 100 + i * 30 }, { x: 0, y: 0 }, 'squeeze');
  assert.equal(state.fruit.extracted, 5); assert.equal(state.amounts.citrusJuice, 5);
});

test('blender needs ingredients, lid and held switch; manual transfer conserves each ingredient', () => {
  const blender = new BlenderSystem(), source = new PreparationState('blender'), target = new PreparationState('cup');
  assert.equal(blender.begin(1, source), false); assert.equal(blender.placeLid(source), false);
  blender.insert(source, 'milk', 2); blender.insert(source, 'cacao', 1); assert.ok(blender.placeLid(source)); assert.equal(blender.insert(source, 'milk', 2), 0);
  assert.ok(blender.begin(1, source)); for (let i = 0; i < 40; i++) blender.update(0.1);
  assert.ok(source.consistency > 0.99); assert.equal(blender.pour(source, 1, () => 1), 0); blender.end(1);
  const before = source.consistency; blender.update(1); assert.equal(source.consistency, before);
  const amount = blender.pour(source, 1.5, mixture => { for (const [id, n] of Object.entries(mixture)) target.add(id, n); return 1; });
  assert.equal(amount, 1.5); assert.equal(target.amounts.milk, 1); assert.equal(target.amounts.cacao, 0.5); assert.equal(source.amounts.milk, 1);
});

test('ice and garnish quantity limits preserve independent cup state', () => {
  const a = new PreparationState('a'), b = new PreparationState('b'); const ice = new IceSystem(), garnish = new GarnishSystem();
  assert.equal(ice.drop(a, 3, { x: 0, y: 0 }), 3); assert.equal(ice.drop(a, 15, { x: 0, y: 0 }), 9); assert.equal(a.ice.length, 12); assert.deepEqual(b.amounts, {});
  assert.equal(garnish.drop(a, 'peach', 2, { x: 100, y: 100 }, { x: 0, y: 0 }), 2); assert.equal(a.garnishes[0].x, 18); assert.equal(b.garnishes.length, 0);
});

test('slightly incomplete original stirring reduces quality while preserving recipe correctness', () => {
  const d = new Drink('sua'); d.placePhin(); d.addGrounds(1); d.compress(1); d.pourWater(1 / RULES.waterRate); d.finishWater(); d.update(8);
  d.addIngredient('condensed', 1); d.addIngredient('ice', 3); d.stirBy(RULES.stirRadians * 0.75);
  const result = d.evaluate('sua'); assert.equal(result.valid, true); assert.equal(result.recipeCorrectness, true); assert.ok(result.preparationTechnique < 1); assert.notEqual(result.quality, 'PERFECT');
});

test('registered structured recipe integrates with unlocks, orders, money, stats and old saves', () => {
  registerRecipe(fixture());
  try {
    assert.ok(!unlockedRecipes(49, { phins: 2 }).includes('fixture')); assert.ok(!unlockedRecipes(50, { phins: 1 }).includes('fixture')); assert.ok(unlockedRecipes(50, { phins: 2 }).includes('fixture'));
    const session = new DaySession(50, false, () => 0, { upgrades: { phins: 2 } });
    const drink = new Drink('fixture'); assert.equal(drink.preparation.canStep(RECIPES.fixture, 'mix'), false);
    drink.addIngredient('milk', 1); drink.preparation.record('fill', 1, 1); drink.preparation.record('mix', 8, 10, 0.8);
    const quality = drink.evaluate('fixture'); assert.ok(quality.valid); assert.equal(quality.recipeCorrectness, true); assert.ok(quality.preparationTechnique < 1);
    const customer = session.spawn(); customer.recipeId = 'fixture'; for (const state of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) customer.transition(state);
    assert.ok(session.serve(customer, drink).valid); assert.equal(session.revenue, 10000); assert.equal(session.summary().recipes.fixture, 1);
    const old = freshSave(); delete old.mastery.fixture; const storage = { getItem: () => JSON.stringify(old), setItem() {} }; const save = new SaveManager(storage); assert.equal(save.data.mastery.fixture, 0); assert.equal(save.data.version, 3);
  } finally { delete RECIPES.fixture; }
});

test('inventory pays for accepted amount only when a legacy cup reaches capacity', () => {
  const session = new DaySession(), d = new Drink('sua'); d.addIngredient('condensed', 4.9);
  const before = session.inventory.condensed; const accepted = session.pourIngredient(d, 'condensed', 0.5);
  assert.ok(Math.abs(accepted - 0.1) < 1e-6); assert.ok(Math.abs(before - session.inventory.condensed - 0.1) < 1e-6);
});

test('router owns separate pointers/stations without listeners; cancellation returns tools and stops flow', async () => {
  const { InteractiveDrinkEngine } = await import('../src/systems/InteractiveDrinkEngine.js');
  const graphics = () => { const g = {}; for (const key of ['setDepth', 'clear', 'lineStyle', 'strokeCircle', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'destroy']) g[key] = () => g; return g; };
  const scene = { paused: false, finishing: false, cameras: { main: { getWorldPoint: (x, y, out) => Object.assign(out, { x, y }) } },
    game: { save: { data: { settings: { reducedMotion: true } } }, audio: { unlock() {} } }, add: { graphics }, tweens: { killTweensOf() {} }, setLiveHint() {}, input: { on() { throw new Error('Engine added an input listener'); } } };
  const tool = (x, y) => ({ x, y, active: true, visible: true, scaleX: 0.8, scaleY: 0.8, rotation: 0, setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }, setPosition(x, y) { this.x = x; this.y = y; return this; }, setRotation(n) { this.rotation = n; return this; }, getWorldTransformMatrix() { return { a: 1, b: 0, c: 0, d: 1, tx: this.x, ty: this.y }; } });
  const engine = new InteractiveDrinkEngine(scene), a = new PreparationState('a'), b = new PreparationState('b'); const first = tool(10, 0), second = tool(20, 50);
  engine.registerTool('first', first, { action: 'pour', ingredient: 'milk', rate: 10 }); engine.registerTool('second', second, { action: 'pour', ingredient: 'milk', rate: 10 });
  for (const [id, state, x] of [['a', a, 100], ['b', b, 200]]) engine.registerTarget(id, { accepts: ['pour'], getState: () => state, center: () => ({ x, y: 100 }), contains: (px, py) => Math.abs(px - x) <= 60 && Math.abs(py - 100) < 20, acceptIngredient: (ingredient, n) => state.add(ingredient, n) });
  const pointer = (id, x, y) => ({ id, x, y });
  assert.ok(engine.down(pointer(1, 10, 0))); engine.move(pointer(1, 100, 100)); engine.move(pointer(1, 148, 100));
  assert.ok(engine.down(pointer(2, 20, 50))); engine.move(pointer(2, 200, 100)); engine.move(pointer(2, 248, 100));
  engine.update(0.1, 100); assert.equal(a.amounts.milk, 1); assert.equal(b.amounts.milk, 1); assert.equal(engine.owners.size, 2);
  engine.up(pointer(1, 148, 100)); engine.update(0.1, 200); assert.equal(a.amounts.milk, 1); assert.equal(b.amounts.milk, 2);
  engine.cancel(); engine.update(0.1, 300); assert.equal(engine.owners.size, 0); assert.equal(engine.active.size, 0); assert.equal(b.amounts.milk, 2); assert.equal(second.x, 20); assert.equal(second.scaleX, 0.8);
  const carrier = tool(80, 0), whiskTool = tool(20, 50);
  engine.registerTarget('source', { accepts: ['whisk'], getState: () => a, center: () => ({ x: 100, y: 200 }), contains: (x, y) => Math.abs(x - 100) < 60 && Math.abs(y - 200) < 40 });
  engine.registerTool('carrier', carrier, { action: 'pour', sourceTarget: 'source', sourceState: () => a });
  engine.registerTool('source-whisk', whiskTool, { action: 'whisk' });
  assert.ok(engine.down(pointer(3, 80, 0))); engine.update(0.1, 400);
  assert.ok(engine.active.has(3), 'Pickup survives frames before reaching a target'); assert.equal(engine.owners.get('source'), 'carrier');
  assert.ok(engine.down(pointer(4, 20, 50))); engine.move(pointer(4, 100, 200));
  assert.equal(engine.active.get(4).target, undefined, 'Carried source cannot be whisked by another pointer');
  engine.cancel(); assert.equal(engine.owners.size, 0);
  scene.drag = { active: { source: { model: { id: 'a' } }, x: 400, y: 400 } };
  assert.equal(engine.targetAt({ x: 100, y: 100 }, engine.tools.get('first')), undefined, 'Carried cups cannot receive ingredients at an empty coaster'); scene.drag.active = null;
  carrier.parentContainer = { visible: false, active: true }; assert.equal(engine.down(pointer(5, 80, 0)), false, 'Hidden ancestor tools cannot steal input');
  engine.destroy();
});

test('declared ingredient units convert to container volume without changing quantity scoring', () => {
  const state = new PreparationState('cup', 100, { milk: 30, syrup: 1 });
  assert.equal(state.add('milk', 2), 2); assert.equal(state.volume, 60);
  assert.equal(state.add('syrup', 50), 40); assert.equal(state.volume, 100);
  assert.equal(state.remove('milk', 1), 1); assert.equal(state.volume, 70); assert.equal(state.amounts.milk, 1);
});
