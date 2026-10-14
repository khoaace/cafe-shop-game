import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../src/systems/AudioManager.js';

function save(settings = { sound: true, music: true }) {
  return {
    data: { settings: { ...settings } },
    settings(patch) { Object.assign(this.data.settings, patch); },
  };
}

function fakeContext() {
  const started = [];
  const ctx = {
    state: 'running',
    currentTime: 0,
    sampleRate: 4000,
    destination: {},
    createGain() {
      return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() {}, disconnect() {} };
    },
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
        connect() {}, disconnect() {},
        start(time) { started.push(time); },
        stop() {},
      };
    },
    createBuffer() { return { getChannelData: () => new Float32Array(ctx.sampleRate) }; },
    createBufferSource() {
      return { buffer: null, loop: false, connect() {}, start() { started.push('noise'); }, stop() {}, disconnect() {} };
    },
    createBiquadFilter() {
      return {
        type: 'lowpass', Q: { value: 0 }, connect() {}, disconnect() {},
        frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
      };
    },
  };
  return { ctx, started };
}

test('audio stays silent until a gesture unlocks it', () => {
  const audio = new AudioManager(save());
  assert.equal(audio.context, null);
  audio.play('success');
  audio.ambient(1, true, 'festival');
  audio.pause();
  audio.resumeIfUnlocked();
  assert.equal(audio.context, null);
});

test('sound and music toggles stay independent', () => {
  const stored = save();
  const audio = new AudioManager(stored);
  audio.toggle('music');
  audio.toggle('nope');
  assert.equal(stored.data.settings.music, false);
  assert.equal(stored.data.settings.sound, true);
  audio.toggle('sound');
  assert.equal(stored.data.settings.sound, false);
  assert.equal(audio.context, null);
});

test('a running shift schedules a melody and a continuous pour', () => {
  const audio = new AudioManager(save());
  const { ctx, started } = fakeContext();
  audio.context = ctx;
  audio.birdIn = 30;
  audio.bikeIn = 30;
  for (let i = 0; i < 20; i++) audio.ambient(0.1, false);
  const notes = started.filter(item => item !== 'noise').length;
  assert.ok(notes >= 6, `expected a melody, got ${notes} tones`);
  audio.play('pour');
  audio.play('pour');
  assert.equal(audio.streams.size, 1);
  audio.streams.get('pour').at = -1;
  audio.ambient(0.016, false);
  assert.equal(audio.streams.get('pour').releasing, true);
});

test('every brew action has its own sound', () => {
  const audio = new AudioManager(save());
  const { ctx, started } = fakeContext();
  audio.context = ctx;
  audio.play('condensed');
  assert.equal(audio.streams.has('condensed'), true);
  const kinds = ['pickup', 'place', 'glass', 'phin', 'grounds', 'press', 'lock', 'ice', 'stir', 'whisk', 'foam', 'trash', 'talk', 'done', 'perfect', 'good', 'miss', 'error'];
  for (const kind of kinds) audio.play(kind);
  assert.ok(started.length >= kinds.length, `expected a voice per action, got ${started.length}`);
});

test('muted music does not schedule tones', () => {
  const audio = new AudioManager(save({ sound: true, music: false }));
  const { ctx, started } = fakeContext();
  audio.context = ctx;
  audio.birdIn = 30;
  audio.bikeIn = 30;
  for (let i = 0; i < 12; i++) audio.ambient(0.1, true, 'festival');
  assert.equal(started.filter(item => item !== 'noise').length, 0);
  audio.play('ice');
  assert.ok(started.filter(item => item !== 'noise').length >= 3);
});

test('salted cream sound effects share the audio lifecycle and respect muting', () => {
  const stored = save(), audio = new AudioManager(stored), { ctx, started } = fakeContext(); ctx.suspend = async () => {}; audio.context = ctx;
  for (const kind of ['creamPour', 'creamWhisk', 'foamBubble', 'creamLanding', 'creamPerfect']) { ctx.currentTime += 1; audio.play(kind); }
  assert.ok(audio.streams.has('creamPour')); assert.ok(started.length >= 8);
  const before = started.length; stored.data.settings.sound = false;
  for (const kind of ['creamPour', 'creamWhisk', 'foamBubble', 'creamLanding', 'creamPerfect']) audio.play(kind);
  assert.equal(started.length, before); audio.pause(); assert.equal(audio.streams.size, 0);
});
