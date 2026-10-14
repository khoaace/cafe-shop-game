import { PreparationState } from './PreparationState.js';

export const COCONUT_TARGET = 60;
export const CONDENSED_ML = 15;
export const ICE_SCOOP = 3; // One scoop = 3 cubes ≈ 100 g = one ice stock portion.
export const ICE_GRAMS = 100 / 3;
// Seconds of held switch. The motor never stops itself; the player releases.
export const BLEND = { good: 2.4, perfect: 4, over: 5.6, max: 8 };
export const BLEND_STAGES = { COARSE: 'Còn lợn cợn', GOOD: 'Mịn vừa', PERFECT: 'Hoàn hảo', OVERBLENDED: 'Quá nhuyễn' };
const INGREDIENTS = ['coconutCream', 'condensed', 'ice'];

export function blendStage(seconds) {
  return seconds >= BLEND.over ? 'OVERBLENDED' : seconds >= BLEND.perfect ? 'PERFECT' : seconds >= BLEND.good ? 'GOOD' : 'COARSE';
}
export function blendTechnique(seconds) {
  if (seconds <= 0) return 0;
  if (seconds >= BLEND.over) return Math.max(0.35, 0.58 - (seconds - BLEND.over) / 8);
  if (seconds >= BLEND.perfect) return 1;
  if (seconds >= BLEND.good) return 0.8;
  return 0.2 + 0.35 * seconds / BLEND.good;
}

// Blender jar contents. Stock is charged by the station when an ingredient enters the jar, never here.
export class CoconutBlend extends PreparationState {
  constructor(id = 'coconut-blend') { super(id, 300, { condensed: CONDENSED_ML }); this.blendTime = 0; this.perfectAnnounced = false; this.refresh(); }
  get load() { return (this.amounts.coconutCream || 0) + (this.amounts.condensed || 0) * CONDENSED_ML + (this.amounts.ice || 0) * ICE_GRAMS; }
  get empty() { return this.load < 1e-6; }
  get canBlend() { return this.lid && (this.amounts.coconutCream || 0) > 0; }
  add(id, amount) {
    if (!INGREDIENTS.includes(id) || this.lid) return 0;
    if (this.empty) { this.amounts = {}; this.layers = []; this.ice = []; this.steps = {}; this.blendTime = 0; this.perfectAnnounced = false; }
    const before = this.load, accepted = super.add(id, amount);
    // Fresh, unblended ingredients dilute the texture already earned.
    if (accepted && before > 0) this.blendTime *= before / this.load;
    if (accepted && id === 'ice') for (let i = 0; i < accepted; i++) this.ice.push({ x: (this.ice.length * 11 % 26) - 13, y: this.ice.length % 3 * 6, spin: this.ice.length * 0.7 });
    this.refresh(); return accepted;
  }
  remove(id, amount) {
    const removed = super.remove(id, amount);
    if (id === 'ice') this.ice.length = Math.ceil(this.amounts.ice || 0);
    return removed;
  }
  blend(seconds) {
    if (!this.canBlend || !Number.isFinite(seconds) || seconds <= 0) return 0;
    const added = Math.min(seconds, 0.1, BLEND.max + 4 - this.blendTime);
    if (added <= 0) return 0;
    this.blendTime += added; this.refresh(); this.revision++; return added;
  }
  refresh() {
    this.stage = blendStage(this.blendTime); this.technique = blendTechnique(this.blendTime);
    // BlenderSystem.pour only releases a mixture that has been blended at all.
    this.consistency = this.technique; this.mixing = Math.min(1, this.blendTime / BLEND.perfect);
    this.crush = Math.min(1, this.blendTime / BLEND.perfect); this.foam = Math.min(1, this.blendTime / BLEND.over);
    this.steps.blend = { amount: this.blendTime, technique: this.technique };
  }
  // Stock-unit view of the jar contents, for waste accounting.
  stock() { return { coconutCream: this.amounts.coconutCream || 0, condensed: this.amounts.condensed || 0, ice: (this.amounts.ice || 0) / ICE_SCOOP }; }
}
