import test from 'node:test';
import assert from 'node:assert/strict';
import { starGoals, dayStars, goalProgress, speedBonus } from '../src/logic/stars.js';
import { DaySession } from '../src/models/DaySession.js';
import { SaveManager } from '../src/systems/SaveManager.js';
import { Drink } from '../src/models/Drink.js';
import { RECIPES, RULES } from '../src/config.js';

function memory() { const map = new Map(); return { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v) }; }
function drink(id = 'den') { const r = RECIPES[id], d = new Drink(id); d.placePhin(); d.addGrounds(r.coffee); d.compress(1); d.pourWater(r.water / RULES.waterRate); d.finishWater(); d.update(8); for (const key of ['condensed', 'milk', 'ice', 'foam']) if (r[key]) d.addIngredient(key, r[key]); if (r.stir) d.stirBy(RULES.stirRadians); return d; }
function waiting(s, recipe = 'den') { s.customers = s.customers.filter(c => !c.resolved); const c = s.spawn(); assert.ok(c); c.recipeId = recipe; for (const state of ['WALKING', 'SEATED', 'ORDERING', 'WAITING']) c.transition(state); return c; }

test('star goals scale with the expected orders of the day plan', () => {
  assert.deepEqual(starGoals({ expectedOrders: 6 }).map(g => g.target), [3, 45000, 1]);
  assert.deepEqual(starGoals({ expectedOrders: 12 }).map(g => g.target), [6, 90000, 1]);
  assert.deepEqual(starGoals(null).map(g => g.target), [2, 30000, 1]);
});

test('"no one left" only completes once the shift has closed and someone was served', () => {
  const goal = starGoals({ expectedOrders: 6 })[2];
  assert.equal(goalProgress(goal, { served: 3, lost: 0 }, false).complete, false);
  assert.equal(goalProgress(goal, { served: 3, lost: 0 }, true).complete, true);
  assert.equal(goalProgress(goal, { served: 0, lost: 0 }, true).complete, false);
  assert.equal(goalProgress(goal, { served: 3, lost: 1 }, true).failed, true);
});

test('day stars count independent goals', () => {
  const goals = starGoals({ expectedOrders: 6 });
  assert.equal(dayStars(goals, { served: 3, earnings: 45000, lost: 0 }).stars, 3);
  assert.equal(dayStars(goals, { served: 3, earnings: 44000, lost: 1 }).stars, 1);
  assert.equal(dayStars(goals, { served: 1, earnings: 50000, lost: 2 }).stars, 1);
});

test('speed bonus rewards quick service only outside the tutorial', () => {
  assert.equal(speedBonus(15000, 0.9), 1500);
  assert.equal(speedBonus(15000, 0.7), 1500);
  assert.equal(speedBonus(15000, 0.69), 0);
  assert.equal(speedBonus(15000, 1, true), 0);
});

test('slow service earns no speed bonus; fast service is tracked in the summary', () => {
  const day = new DaySession(1, false, () => 0, { plan: { seed: 1, expectedOrders: 6 } });
  const slow = waiting(day); slow.waited = slow.patience * 0.5;
  assert.equal(day.serve(slow, drink()).speedBonus, 0);
  const fast = waiting(day); assert.equal(day.serve(fast, drink()).speedBonus, 1200);
  const s = day.summary(); assert.equal(s.fastServes, 1); assert.equal(s.speedBonuses, 1200); assert.equal(s.starGoals.length, 3);
});

test('stars are settled once into lifetime stats and unlock the three-star badge', () => {
  const save = new SaveManager(memory()); const plan = save.beginDay();
  const day = new DaySession(1, false, () => 0, { plan });
  const goals = day.starGoals;
  for (let i = 0; i < goals[0].target + 1; i++) day.serve(waiting(day, 'sua'), drink('sua'));
  day.elapsed = RULES.daySeconds; day.ended = true;
  const summary = day.summary(); assert.equal(summary.stars, 3);
  assert.equal(save.completeDay(summary), true); assert.equal(save.completeDay(summary), false);
  assert.equal(save.data.stats.totalStars, 3); assert.equal(save.data.stats.threeStarDays, 1);
  assert.ok(save.data.achievements.includes('stars3'));
});

test('tutorial has no star goals', () => {
  const day = new DaySession(1, true); assert.equal(day.starGoals.length, 0); assert.equal(day.summary().stars, 0);
});
