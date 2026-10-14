import { MotionGesture } from './MotionGesture.js';
export class StirringSystem {
  constructor() { this.gestures = new Map(); }
  move(key, state, point, center, target = Math.PI * 3) {
    const entry = this.gestures.get(key);
    if (!entry || entry.state !== state) this.gestures.set(key, { state, gesture: new MotionGesture() });
    const amount = this.gestures.get(key).gesture.sample(point, center, 'stir');
    const added = state.record('stir', amount, target);
    state.mixing = Math.min(1, (state.steps.stir?.amount || 0) / target);
    return added;
  }
  end(key) { this.gestures.delete(key); }
}
