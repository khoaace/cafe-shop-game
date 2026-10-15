export const TRADAO_TEA_TARGET = 140;
export const TRADAO_SYRUP_TARGET = 20;
export const TRADAO_ORANGE_JUICE_TARGET = 30;
export const ORANGE_JUICE_TARGET = TRADAO_ORANGE_JUICE_TARGET;
export const TRADAO_PEACH_TARGET = 2;
export const TRADAO_LEMONGRASS_TARGET = 1;
export const TRADAO_ORANGE_GARNISH_TARGET = 1;
export const TRADAO_ICE_TARGET = 3; // 3 cubes = 90 g
export const PEACH_SLICES_PER_PACK_UNIT = 4; // 1 hộp = 4 miếng đào
export const LEMONGRASS_ROLL_DISTANCE = 32;

export const TRADAO_MODIFIERS = Object.freeze({
  peach: Object.freeze({
    normal: { id: 'normal', label: 'vừa đào', slices: 2 },
    more: { id: 'more', label: 'nhiều đào', slices: 3 },
  }),
  sweetness: Object.freeze({
    less: { id: 'less', label: 'ít ngọt', syrup: 14, range: [11, 17] },
    normal: { id: 'normal', label: 'vừa ngọt', syrup: 20, range: [17, 23] },
    more: { id: 'more', label: 'nhiều ngọt', syrup: 26, range: [23, 29] },
  }),
  ice: Object.freeze({
    less: { id: 'less', label: 'ít đá', cubes: 2, grams: 60 },
    normal: { id: 'normal', label: 'vừa đá', cubes: 3, grams: 90 },
    more: { id: 'more', label: 'nhiều đá', cubes: 4, grams: 120 },
  }),
});

export function normalizeTraDaoModifiers(raw = null) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const text = raw.toLowerCase();
    const peach = text.includes('nhiều đào') ? 'more' : 'normal';
    const sweetness = text.includes('ít ngọt') ? 'less' : text.includes('nhiều ngọt') ? 'more' : 'normal';
    const ice = text.includes('ít đá') ? 'less' : text.includes('nhiều đá') ? 'more' : 'normal';
    return { peach, sweetness, ice };
  }
  const peach = Object.hasOwn(TRADAO_MODIFIERS.peach, raw.peach) ? raw.peach : 'normal';
  const sweetness = Object.hasOwn(TRADAO_MODIFIERS.sweetness, raw.sweetness) ? raw.sweetness : 'normal';
  const ice = Object.hasOwn(TRADAO_MODIFIERS.ice, raw.ice) ? raw.ice : 'normal';
  return { peach, sweetness, ice };
}

export function traDaoTargets(modifiers = null) {
  const m = normalizeTraDaoModifiers(modifiers);
  const peachSpec = TRADAO_MODIFIERS.peach[m?.peach || 'normal'];
  const sweetSpec = TRADAO_MODIFIERS.sweetness[m?.sweetness || 'normal'];
  const iceSpec = TRADAO_MODIFIERS.ice[m?.ice || 'normal'];
  return {
    tea: TRADAO_TEA_TARGET,
    peach: peachSpec.slices,
    orange: TRADAO_ORANGE_GARNISH_TARGET,
    orangeJuice: TRADAO_ORANGE_JUICE_TARGET,
    lemongrass: TRADAO_LEMONGRASS_TARGET,
    peachSyrup: sweetSpec.syrup,
    syrupRange: sweetSpec.range,
    ice: iceSpec.cubes,
    iceGrams: iceSpec.grams,
    peachLabel: peachSpec.label,
    sweetnessLabel: sweetSpec.label,
    iceLabel: iceSpec.label,
  };
}

export function formatTraDaoModifierLabel(modifiers = null) {
  const m = normalizeTraDaoModifiers(modifiers);
  if (!m) return '';
  const parts = [];
  if (m.peach && m.peach !== 'normal') parts.push(TRADAO_MODIFIERS.peach[m.peach].label);
  if (m.sweetness && m.sweetness !== 'normal') parts.push(TRADAO_MODIFIERS.sweetness[m.sweetness].label);
  if (m.ice && m.ice !== 'normal') parts.push(TRADAO_MODIFIERS.ice[m.ice].label);
  return parts.join(', ');
}

export class TraDaoPrep {
  constructor() {
    this.id = 'tradao-prep';
    this.clear();
  }

  clear() {
    // Orange preparation state
    this.orangeOnBoard = false;
    this.orangeSliced = false;
    this.orangeConsumed = 0; // Whole oranges deducted from inventory for this board
    this.orangeStockDeducted = false;
    this.squeezePortions = 0; // 1 half for squeezing
    this.garnishSlices = 0; // 1 slice for garnish
    this.extractedJuice = 0; // 0..30 ml
    this.juiceCapacity = TRADAO_ORANGE_JUICE_TARGET;
    this.orangeCompression = 0;
    this.sliceRotation = 0;
    this.sliceBounce = 0;
    // Lemongrass preparation state
    this.lemongrassOnBoard = false;
    this.lemongrassRollDistance = 0;
    this.lemongrassPrepared = false;
    this.lemongrassAvailable = 0;
    this.lemongrassConsumed = 0;
    this.lemongrassStockDeducted = false;
    this.stalkBend = 0;
    // Shared pourable amounts (orangeJuice) & recorded gesture steps
    this.amounts = {};
    this.steps = {};
    this.revision = (this.revision || 0) + 1;
  }

  get empty() {
    return !this.orangeOnBoard && !this.orangeSliced && (this.amounts.orangeJuice || 0) <= 1e-6 && this.garnishSlices <= 0 && !this.lemongrassOnBoard && this.lemongrassAvailable <= 0;
  }

  get consistency() {
    if (this.extractedJuice <= 0) return 0;
    return Math.min(1, this.extractedJuice / TRADAO_ORANGE_JUICE_TARGET);
  }

  get orangeTechnique() {
    if (this.extractedJuice >= TRADAO_ORANGE_JUICE_TARGET * 0.9) return 1;
    if (this.extractedJuice <= 0) return 0;
    return Math.max(0.35, this.extractedJuice / (TRADAO_ORANGE_JUICE_TARGET * 0.9));
  }

  get lemongrassProgress() {
    return Math.min(1, this.lemongrassRollDistance / LEMONGRASS_ROLL_DISTANCE);
  }

  placeOrange() {
    if (this.orangeOnBoard || this.orangeSliced || this.garnishSlices > 0 || (this.amounts.orangeJuice || 0) > 1e-6) return false;
    this.orangeOnBoard = true;
    this.sliceRotation = 0;
    this.revision++;
    return true;
  }

  // Called once when the swipe-cut gesture slices the orange: creates 1 squeeze portion + 1 garnish slice from the single consumed fruit.
  sliceOrange() {
    if (!this.orangeOnBoard || this.orangeSliced) return 0;
    this.orangeOnBoard = false;
    this.orangeSliced = true;
    this.orangeConsumed = 1;
    this.squeezePortions = 1;
    this.garnishSlices = 1;
    this.extractedJuice = 0;
    this.orangeCompression = 0;
    this.sliceRotation = 0.28;
    this.sliceBounce = 1;
    this.steps['orange-cut'] = { amount: 1, technique: 1 };
    this.revision++;
    return 1;
  }

  squeezeOrange(distance = 16) {
    if (!this.orangeSliced || this.squeezePortions <= 0 || !Number.isFinite(distance) || distance <= 0) return 0;
    const remaining = Math.max(0, this.juiceCapacity - this.extractedJuice);
    if (remaining <= 1e-6) {
      this.orangeCompression = Math.min(1, this.orangeCompression + 0.12);
      return 0;
    }
    const gained = Math.min(remaining, distance * 0.42);
    if (gained <= 0) return 0;
    this.extractedJuice = Math.min(this.juiceCapacity, Math.round((this.extractedJuice + gained) * 1000) / 1000);
    this.amounts.orangeJuice = this.extractedJuice;
    this.orangeCompression = Math.min(1, 0.25 + (this.extractedJuice / this.juiceCapacity) * 0.75);
    this.steps['orange-squeeze'] = { amount: this.extractedJuice, technique: this.orangeTechnique };
    this.revision++;
    return gained;
  }

  takeJuice(requested = this.amounts.orangeJuice || 0) {
    const used = this.remove('orangeJuice', requested);
    return used > 0 ? { orangeJuice: used } : {};
  }

  // Consumes the prepared garnish slice from the board without touching orange inventory again.
  takeGarnishSlice() {
    if (!this.orangeSliced || this.garnishSlices <= 0) return 0;
    this.garnishSlices -= 1;
    this.steps['orange-garnish'] = { amount: 1, technique: 1 };
    this.cleanupOrangeIfEmpty();
    this.revision++;
    return 1;
  }

  placeLemongrass() {
    if (this.lemongrassOnBoard || this.lemongrassPrepared || this.lemongrassAvailable > 0) return false;
    this.lemongrassOnBoard = true;
    this.lemongrassRollDistance = 0;
    this.stalkBend = 0;
    this.revision++;
    return true;
  }

  // Press-and-roll gesture bruises the stalk and releases aroma. Returns true the moment it transitions to prepared.
  rollLemongrass(distance = LEMONGRASS_ROLL_DISTANCE) {
    if (!this.lemongrassOnBoard || this.lemongrassPrepared || !Number.isFinite(distance) || distance <= 0) return { progressed: 0, justPrepared: false };
    const before = this.lemongrassRollDistance;
    this.lemongrassRollDistance = Math.min(LEMONGRASS_ROLL_DISTANCE, this.lemongrassRollDistance + distance);
    const progressed = this.lemongrassRollDistance - before;
    this.stalkBend = Math.min(1, this.lemongrassRollDistance / LEMONGRASS_ROLL_DISTANCE);
    let justPrepared = false;
    if (this.lemongrassRollDistance >= LEMONGRASS_ROLL_DISTANCE && !this.lemongrassPrepared) {
      this.lemongrassPrepared = true;
      this.lemongrassAvailable = 1;
      this.lemongrassConsumed = 1;
      this.steps['lemongrass-prep'] = { amount: 1, technique: 1 };
      justPrepared = true;
    }
    if (progressed > 0) this.revision++;
    return { progressed, justPrepared };
  }

  takeLemongrass() {
    if (!this.lemongrassPrepared || this.lemongrassAvailable <= 0) return 0;
    this.lemongrassAvailable = 0;
    this.lemongrassOnBoard = false;
    this.lemongrassPrepared = false;
    this.lemongrassConsumed = 0;
    this.lemongrassStockDeducted = false;
    this.lemongrassRollDistance = 0;
    this.stalkBend = 0;
    this.revision++;
    return 1;
  }

  cleanupOrangeIfEmpty() {
    const juiceLeft = this.amounts.orangeJuice || 0;
    const squeezeDone = this.extractedJuice >= this.juiceCapacity - 0.5 && juiceLeft <= 1e-6;
    if (squeezeDone && this.garnishSlices <= 0) {
      this.orangeSliced = false;
      this.squeezePortions = 0;
      this.extractedJuice = 0;
      this.orangeCompression = 0;
      this.orangeConsumed = 0;
      this.orangeStockDeducted = false;
      delete this.amounts.orangeJuice;
    }
  }

  remove(id, requested) {
    if (!Number.isFinite(requested) || requested <= 0) return 0;
    const used = Math.min(this.amounts[id] || 0, requested);
    this.amounts[id] = Math.max(0, (this.amounts[id] || 0) - used);
    if (this.amounts[id] <= 1e-6) delete this.amounts[id];
    if (id === 'orangeJuice' && (this.amounts.orangeJuice || 0) <= 1e-6 && this.extractedJuice > 0) {
      this.squeezePortions = 0;
      this.orangeConsumed = 0;
      this.cleanupOrangeIfEmpty();
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

  // Reports unserved consumed stock sitting on the prep board when discarded.
  stock() {
    const out = {};
    if (this.orangeConsumed > 0) out.orange = this.orangeConsumed;
    if (this.lemongrassConsumed > 0) out.lemongrass = this.lemongrassConsumed;
    return out;
  }
}
