import { MotionGesture } from './MotionGesture.js';
export class WhiskSystem {
  constructor() { this.gestures = new Map(); }
  move(key, state, point, center, target = 950) {
    const entry = this.gestures.get(key);
    if (!entry || entry.state !== state) this.gestures.set(key, { state, gesture: new MotionGesture() });
    const amount = this.gestures.get(key).gesture.sample(point, center, 'whisk');
    const added = state.record('whisk', amount, target);
    state.foam = Math.min(1, (state.steps.whisk?.amount || 0) / target);
    return added;
  }
  moveCircular(key, state, point, center) {
    const entry = this.gestures.get(key);
    if (!entry || entry.state !== state) this.gestures.set(key, { state, gesture: new MotionGesture() });
    return state.whip(this.gestures.get(key).gesture.sample(point, center, 'circular'));
  }
  moveMatcha(key, state, point, center, target = 680) {
    const entry = this.gestures.get(key);
    if (!entry || entry.state !== state) this.gestures.set(key, { state, gesture: new MotionGesture() });
    const amount = this.gestures.get(key).gesture.sample(point, center, 'matchaWhisk');
    if (typeof state.whisk === 'function') return state.whisk(amount);
    const added = state.record('whisk', amount, target);
    state.foam = Math.min(1, (state.steps.whisk?.amount || 0) / target);
    return added;
  }
  end(key) { this.gestures.delete(key); }
}
