export const KUMQUAT_FRUITS = 2;
export const JUICE_PER_FRUIT = 10;
export const JUICE_TARGET = KUMQUAT_FRUITS * JUICE_PER_FRUIT; // 20 ml from 2 fruits
export const TEA_TARGET = 150;
export const SYRUP_TARGET = 15;
export const ICE_TARGET = 3; // 3 cubes = 90 g (30 g / cube)
export const ICE_GRAMS_PER_CUBE = 30;

export const TRATAC_MODIFIERS = Object.freeze({
  sweetness: Object.freeze({
    less: { id: 'less', label: 'ít ngọt', syrup: 10, range: [8, 12] },
    normal: { id: 'normal', label: 'vừa ngọt', syrup: 15, range: [13, 17] },
    more: { id: 'more', label: 'nhiều ngọt', syrup: 20, range: [18, 22] },
  }),
  ice: Object.freeze({
    less: { id: 'less', label: 'ít đá', cubes: 2, grams: 60 },
    normal: { id: 'normal', label: 'vừa đá', cubes: 3, grams: 90 },
    more: { id: 'more', label: 'nhiều đá', cubes: 4, grams: 120 },
  }),
});

export function normalizeModifiers(raw = null) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const text = raw.toLowerCase();
    const sweetness = text.includes('ít ngọt') ? 'less' : text.includes('nhiều ngọt') ? 'more' : 'normal';
    const ice = text.includes('ít đá') ? 'less' : text.includes('nhiều đá') ? 'more' : 'normal';
    return { sweetness, ice };
  }
  const sweetness = Object.hasOwn(TRATAC_MODIFIERS.sweetness, raw.sweetness) ? raw.sweetness : 'normal';
  const ice = Object.hasOwn(TRATAC_MODIFIERS.ice, raw.ice) ? raw.ice : 'normal';
  return { sweetness, ice };
}

export function modifierTargets(modifiers = null) {
  const m = normalizeModifiers(modifiers);
  const sweetSpec = TRATAC_MODIFIERS.sweetness[m?.sweetness || 'normal'];
  const iceSpec = TRATAC_MODIFIERS.ice[m?.ice || 'normal'];
  return {
    tea: TEA_TARGET,
    kumquat: KUMQUAT_FRUITS,
    citrusJuice: JUICE_TARGET,
    syrup: sweetSpec.syrup,
    syrupRange: sweetSpec.range,
    ice: iceSpec.cubes,
    iceGrams: iceSpec.grams,
    sweetnessLabel: sweetSpec.label,
    iceLabel: iceSpec.label,
  };
}

export function formatModifierLabel(modifiers = null) {
  const m = normalizeModifiers(modifiers);
  if (!m || (m.sweetness === 'normal' && m.ice === 'normal')) return '';
  const parts = [];
  if (m.sweetness !== 'normal') parts.push(TRATAC_MODIFIERS.sweetness[m.sweetness].label);
  if (m.ice !== 'normal') parts.push(TRATAC_MODIFIERS.ice[m.ice].label);
  return parts.join(', ');
}

export class KumquatPrep {
  constructor() {
    this.id = 'kumquat-prep';
    this.fruits = 0;
    this.halves = 0;
    this.sliced = false;
    this.inSqueezer = false;
    this.extracted = 0;
    this.juiceCapacity = JUICE_TARGET;
    this.amounts = {};
    this.steps = {};
    this.compression = 0;
    this.sliceBounce = 0;
    this.squeezeCount = 0;
    this.revision = 0;
    this.perfectAnnounced = false;
  }

  get empty() {
    return this.fruits <= 0 && (this.amounts.citrusJuice || 0) <= 1e-6;
  }

  get stage() {
    if (this.fruits <= 0 && (this.amounts.citrusJuice || 0) <= 1e-6) return 'EMPTY';
    if (!this.sliced) return 'WHOLE';
    if (!this.inSqueezer && this.extracted <= 1e-6) return 'SLICED';
    const cap = this.juiceCapacity || JUICE_TARGET;
    if (this.extracted < cap - 0.5) return 'SQUEEZING';
    return 'READY';
  }

  get consistency() {
    if (this.extracted <= 0) return 0;
    const cap = this.juiceCapacity || JUICE_TARGET;
    return Math.min(1, this.extracted / cap);
  }

  get technique() {
    const cap = this.juiceCapacity || JUICE_TARGET;
    if (this.extracted >= cap * 0.9) return 1;
    if (this.extracted <= 0) return 0;
    return Math.max(0.3, this.extracted / (cap * 0.9));
  }

  place(count = KUMQUAT_FRUITS) {
    if (!this.empty || !Number.isFinite(count) || count <= 0) return 0;
    this.fruits = count;
    this.halves = 0;
    this.sliced = false;
    this.inSqueezer = false;
    this.extracted = 0;
    this.juiceCapacity = count * JUICE_PER_FRUIT;
    this.amounts = { kumquat: count };
    this.steps = { place: { amount: count, technique: 1 } };
    this.compression = 0;
    this.sliceBounce = 1;
    this.squeezeCount = 0;
    this.perfectAnnounced = false;
    this.revision++;
    return count;
  }

  slice() {
    if (this.fruits <= 0 || this.sliced) return 0;
    this.sliced = true;
    this.halves = this.fruits * 2;
    this.sliceBounce = 1;
    this.steps.slice = { amount: 1, technique: 1 };
    this.revision++;
    return 1;
  }

  moveToSqueezer() {
    if (!this.sliced || this.inSqueezer) return false;
    this.inSqueezer = true;
    this.compression = 0.15;
    this.revision++;
    return true;
  }

  squeeze(distance) {
    if (!this.sliced || !Number.isFinite(distance) || distance <= 0) return 0;
    if (!this.inSqueezer) this.inSqueezer = true;
    const remaining = Math.max(0, this.juiceCapacity - this.extracted);
    if (remaining <= 1e-6) {
      this.compression = Math.min(1, this.compression + 0.15);
      return 0;
    }
    // Fast drink balance: ~2-3 meaningful squeeze strokes (~75px total) extract the full 20 ml.
    const gained = Math.min(remaining, distance * 0.28);
    if (gained <= 0) return 0;
    this.extracted = Math.min(this.juiceCapacity, Math.round((this.extracted + gained) * 1000) / 1000);
    this.amounts.citrusJuice = this.extracted;
    this.compression = Math.min(1, 0.3 + (this.extracted / this.juiceCapacity) * 0.7);
    this.squeezeCount++;
    this.steps.squeeze = { amount: this.extracted, technique: this.technique };
    this.revision++;
    return gained;
  }

  remove(id, requested) {
    if (!Number.isFinite(requested) || requested <= 0) return 0;
    const used = Math.min(this.amounts[id] || 0, requested);
    this.amounts[id] = Math.max(0, (this.amounts[id] || 0) - used);
    if (this.amounts[id] <= 1e-6) delete this.amounts[id];
    if ((this.amounts.citrusJuice || 0) <= 1e-6) {
      this.fruits = 0;
      this.halves = 0;
      this.sliced = false;
      this.inSqueezer = false;
      this.extracted = 0;
      this.compression = 0;
      delete this.amounts.kumquat;
      delete this.amounts.citrusJuice;
    }
    if (used > 0) this.revision++;
    return used;
  }

  record(step, amount, target = 1, technique = 1) {
    if (!step || !Number.isFinite(amount) || amount <= 0) return 0;
    const state = this.steps[step] ||= { amount: 0, technique: 1 };
    const added = Math.min(amount, Math.max(0, target - state.amount));
    if (added > 0) {
      state.technique = (state.technique * state.amount + Math.max(0, Math.min(1, technique)) * added) / (state.amount + added);
      state.amount += added;
      this.revision++;
    }
    return added;
  }

  canStep() { return true; }

  stock() {
    // Only unpoured fruit on the board/cup counts as station waste when discarded.
    return this.fruits > 0 ? { kumquat: this.fruits } : {};
  }
}
