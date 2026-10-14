import { PreparationState } from './PreparationState.js';

export const CREAM_TARGET = 40;
export const SALT_TARGET = 0.3;
export const CREAM_PERFECT = { start: Math.PI * 6, end: Math.PI * 9 };
export function creamStage(movement) {
  return movement >= CREAM_PERFECT.end ? 'OVERWHIPPED' : movement >= CREAM_PERFECT.start ? 'PERFECT CREAM' : movement >= Math.PI * 4 ? 'SOFT FOAM' : movement >= Math.PI * 1.5 ? 'SMALL BUBBLES' : 'LIQUID';
}
export function creamTechnique(movement) {
  if (movement >= CREAM_PERFECT.start && movement < CREAM_PERFECT.end) return 1;
  if (movement >= CREAM_PERFECT.end) return Math.max(0.35, 1 - (movement - CREAM_PERFECT.end) / (Math.PI * 8) - 0.2);
  return Math.min(0.9, movement / CREAM_PERFECT.start);
}
export class SaltedCream extends PreparationState {
  constructor(id = 'salted-cream') { super(id, 80); this.whipping = 0; this.perfectAnnounced = false; }
  add(id, amount) {
    if (!['cream', 'salt'].includes(id) || id === 'salt' && !(this.amounts.cream > 0)) return 0;
    if (id === 'cream' && (this.amounts.cream || 0) < 1e-6) { this.amounts = {}; this.layers = []; this.steps = {}; this.whipping = 0; this.perfectAnnounced = false; }
    const oldCream = this.amounts.cream || 0, accepted = super.add(id, amount);
    // Fresh cream dilutes previously earned aeration; its preparation must be earned too.
    if (id === 'cream' && accepted) this.whipping *= oldCream / (oldCream + accepted);
    this.refresh(); return accepted;
  }
  whip(radians) {
    if (!(this.amounts.cream > 0) || !Number.isFinite(radians) || radians <= 0) return 0;
    const added = Math.min(radians, Math.PI * 18 - this.whipping);
    this.whipping += added; this.refresh(); this.revision++; return added;
  }
  refresh() {
    this.stage = creamStage(this.whipping); this.foam = Math.min(1, this.whipping / CREAM_PERFECT.start);
    this.consistency = creamTechnique(this.whipping);
    this.steps.whisk = { amount: this.whipping, technique: this.consistency };
  }
  get salty() { return (this.amounts.salt || 0) / (this.amounts.cream || 1) > SALT_TARGET / CREAM_TARGET * 1.35; }
}
