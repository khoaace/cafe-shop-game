import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MILESTONES, milestonesCrossed, finalCountdown, dayProgress, GAME_MINUTES_PER_SECOND } from '../src/logic/dayClock.js';
import { RULES } from '../src/config.js';

test('a 180-second shift covers 240 in-game minutes', () => {
  assert.equal(GAME_MINUTES_PER_SECOND * RULES.daySeconds, 240);
});

test('milestones are ordered inside the shift and name their clock time', () => {
  const times = DAY_MILESTONES.map(m => m.at);
  assert.deepEqual([...times].sort((a, b) => a - b), times);
  assert.ok(times.every(t => t > 0 && t < RULES.daySeconds));
  assert.match(DAY_MILESTONES.find(m => m.id === 'lastCall').message, /^09:30/);
  assert.match(DAY_MILESTONES.find(m => m.id === 'rushSoon').message, /^07:00/);
});

test('each milestone fires exactly once across frames, even a long one', () => {
  const fired = [];
  for (let t = 0; t < RULES.daySeconds; t += 0.1) fired.push(...milestonesCrossed(t, t + 0.1).map(m => m.id));
  assert.deepEqual(fired, DAY_MILESTONES.map(m => m.id));
  assert.deepEqual(milestonesCrossed(0, RULES.daySeconds).map(m => m.id), DAY_MILESTONES.map(m => m.id));
  assert.equal(milestonesCrossed(RULES.lastArrival, RULES.lastArrival + 1).length, 0);
});

test('final countdown shows 5…1 only in the last five seconds', () => {
  assert.equal(finalCountdown(RULES.daySeconds - 6), null);
  assert.equal(finalCountdown(RULES.daySeconds - 5), 5);
  assert.equal(finalCountdown(RULES.daySeconds - 0.5), 1);
  assert.equal(finalCountdown(RULES.daySeconds), null);
});

test('day progress is clamped', () => {
  assert.equal(dayProgress(-1), 0); assert.equal(dayProgress(90), 0.5); assert.equal(dayProgress(999), 1);
});
