import { PreparationState } from './PreparationState.js';

export const MATCHA_POWDER_TARGET = 4; // grams (2 scoops x 2g)
export const MATCHA_SCOOP_GRAMS = 2; // 2g per bamboo scoop (chashaku)
export const MATCHA_WATER_TARGET = 40; // ml warm water in bowl
export const MATCHA_MILK_TARGET = 150; // ml fresh milk in glass (3 phần x 50ml)
export const MATCHA_ICE_TARGET = 3; // 3 cubes = 90g (1 phần đá)
export const MATCHA_SYRUP_TARGET = 10; // ml sugar syrup (default "ít ngọt")
export const MATCHA_WHISK_TARGET = 680; // W/zigzag stroke distance for microfoam
export const MILK_ML_PER_PORTION = 50;

export const MATCHA_WHISK_STAGES = Object.freeze({
  CLUMPY: { id: 'CLUMPY', label: 'Vón cục' },
  MIXING: { id: 'MIXING', label: 'Đang hòa' },
  SMOOTH: { id: 'SMOOTH', label: 'Mịn sánh' },
  MICROFOAM: { id: 'MICROFOAM', label: 'Bọt mịn hoàn hảo' },
});

export function matchaWhiskStage(progress = 0) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  if (p >= 0.92) return MATCHA_WHISK_STAGES.MICROFOAM;
  if (p >= 0.62) return MATCHA_WHISK_STAGES.SMOOTH;
  if (p >= 0.25) return MATCHA_WHISK_STAGES.MIXING;
  return MATCHA_WHISK_STAGES.CLUMPY;
}

export function matchaWhiskTechnique(progress = 0) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  if (p >= 0.92) return 1;
  if (p >= 0.62) return 0.72 + (p - 0.62) / 0.30 * 0.23;
  if (p >= 0.25) return 0.40 + (p - 0.25) / 0.37 * 0.30;
  return p * 1.2;
}

export const MATCHA_MODIFIERS = Object.freeze({
  sweetness: Object.freeze({
    none: { id: 'none', label: 'không đường', syrupMl: 0, range: [0, 0] },
    less: { id: 'less', label: 'ít ngọt', syrupMl: 10, range: [8, 12] },
    normal: { id: 'normal', label: 'ngọt vừa', syrupMl: 15, range: [12, 18] },
  }),
  matcha: Object.freeze({
    normal: { id: 'normal', label: 'vừa matcha', grams: 4, scoops: 2, range: [3.5, 4.5] },
    strong: { id: 'strong', label: 'đậm matcha', grams: 6, scoops: 3, range: [5.5, 6.5] },
  }),
  milk: Object.freeze({
    less: { id: 'less', label: 'ít sữa', ml: 110, range: [100, 120] },
    normal: { id: 'normal', label: 'vừa sữa', ml: 150, range: [135, 165] },
    more: { id: 'more', label: 'nhiều sữa', ml: 180, range: [165, 195] },
  }),
});

export function normalizeMatchaModifiers(raw = null) {
  if (!raw) return { sweetness: 'less', matcha: 'normal', milk: 'normal' };
  if (typeof raw === 'string') {
    const text = raw.toLowerCase();
    const sweetness = text.includes('không đường') || text.includes('không ngọt')
      ? 'none'
      : text.includes('ngọt vừa') || text.includes('vừa ngọt') || text.includes('nhiều ngọt')
        ? 'normal'
        : 'less';
    const matcha = text.includes('đậm matcha') || text.includes('nhiều matcha') ? 'strong' : 'normal';
    const milk = text.includes('ít sữa') ? 'less' : text.includes('nhiều sữa') ? 'more' : 'normal';
    return { sweetness, matcha, milk };
  }
  const sweetness = Object.hasOwn(MATCHA_MODIFIERS.sweetness, raw.sweetness) ? raw.sweetness : 'less';
  const matcha = Object.hasOwn(MATCHA_MODIFIERS.matcha, raw.matcha) ? raw.matcha : 'normal';
  const milk = Object.hasOwn(MATCHA_MODIFIERS.milk, raw.milk) ? raw.milk : 'normal';
  return { sweetness, matcha, milk };
}

export function matchaTargets(modifiers = null) {
  const m = normalizeMatchaModifiers(modifiers);
  const sweetSpec = MATCHA_MODIFIERS.sweetness[m.sweetness];
  const matchaSpec = MATCHA_MODIFIERS.matcha[m.matcha];
  const milkSpec = MATCHA_MODIFIERS.milk[m.milk];
  return {
    matcha: matchaSpec.grams,
    matchaScoops: matchaSpec.scoops,
    matchaRange: matchaSpec.range,
    water: MATCHA_WATER_TARGET,
    waterRange: [34, 46],
    milk: milkSpec.ml,
    milkRange: milkSpec.range,
    syrup: sweetSpec.syrupMl,
    syrupRange: sweetSpec.range,
    ice: MATCHA_ICE_TARGET,
    iceGrams: MATCHA_ICE_TARGET * 30,
    whiskTarget: MATCHA_WHISK_TARGET,
    sweetnessLabel: sweetSpec.label,
    matchaLabel: matchaSpec.label,
    milkLabel: milkSpec.label,
    iceLabel: '3 viên · 90g',
  };
}

export function formatMatchaModifierLabel(modifiers = null) {
  const m = normalizeMatchaModifiers(modifiers);
  const parts = [];
  if (m.matcha && m.matcha !== 'normal') parts.push(MATCHA_MODIFIERS.matcha[m.matcha].label);
  if (m.sweetness) parts.push(MATCHA_MODIFIERS.sweetness[m.sweetness].label);
  if (m.milk && m.milk !== 'normal') parts.push(MATCHA_MODIFIERS.milk[m.milk].label);
  return parts.join(', ');
}

export function matchaStockWarnings(inventory = {}, modifiers = null) {
  const targets = matchaTargets(modifiers);
  const matchaGrams = Number(inventory?.matcha) || 0;
  const milkPortions = Number(inventory?.milk) || 0;
  const milkMl = milkPortions * MILK_ML_PER_PORTION;
  const syrupMl = Number(inventory?.syrup) || 0;
  const icePortions = Number(inventory?.ice) || 0;
  const warnings = [];
  if (matchaGrams + 1e-9 < targets.matcha) {
    warnings.push('Hết bột matcha!');
  } else if (matchaGrams < targets.matcha * 2) {
    warnings.push('Matcha chỉ còn đủ 1 ly!');
  }
  if (milkMl + 1e-9 < targets.milk) {
    warnings.push('Không đủ sữa tươi!');
  }
  if (targets.syrup > 0 && syrupMl + 1e-9 < targets.syrup) {
    warnings.push('Không đủ siro đường!');
  }
  if (icePortions * 3 + 1e-9 < targets.ice) {
    warnings.push('Hết đá viên!');
  }
  return warnings;
}

export class MatchaBowl extends PreparationState {
  constructor(id = 'matcha-bowl') {
    super(id, 120);
    this.whisking = 0;
    this.whiskProgress = 0;
    this.stage = 'CLUMPY';
    this.perfectAnnounced = false;
    this.consumedMatcha = 0;
  }

  get empty() {
    return (this.amounts.matcha || 0) <= 1e-6 && (this.amounts.water || 0) <= 1e-6;
  }

  add(id, amount) {
    if (!['matcha', 'water'].includes(id) || !Number.isFinite(amount) || amount <= 0) return 0;
    if (this.empty) {
      this.amounts = {};
      this.layers = [];
      this.steps = {};
      this.whisking = 0;
      this.whiskProgress = 0;
      this.stage = 'CLUMPY';
      this.perfectAnnounced = false;
      this.consumedMatcha = 0;
    }
    const prevMatcha = this.amounts.matcha || 0;
    const prevWater = this.amounts.water || 0;
    const capped = id === 'matcha' ? Math.min(amount, Math.max(0, 16 - prevMatcha)) : amount;
    const accepted = super.add(id, capped);
    if (!accepted) return 0;
    if (id === 'matcha') {
      this.consumedMatcha += accepted;
      this.steps.matcha = { amount: this.amounts.matcha, technique: 1 };
      if (prevMatcha > 0 && this.whisking > 0) {
        this.whisking *= prevMatcha / (prevMatcha + accepted);
      }
    }
    if (id === 'water') {
      this.steps.water = { amount: this.amounts.water, technique: 1 };
      if (prevWater > 0 && this.whisking > 0) {
        this.whisking *= prevWater / (prevWater + accepted * 0.5);
      }
    }
    this.refresh();
    return accepted;
  }

  whisk(distance) {
    const matcha = this.amounts.matcha || 0;
    const water = this.amounts.water || 0;
    if (matcha <= 0 || water <= 0 || !Number.isFinite(distance) || distance <= 0) return 0;
    const waterFactor = water >= 20 ? 1 : Math.max(0.3, water / 20);
    const added = Math.min(distance * waterFactor, MATCHA_WHISK_TARGET * 1.35 - this.whisking);
    if (added <= 0) return 0;
    this.whisking += added;
    this.refresh();
    this.revision++;
    return added;
  }

  refresh() {
    this.whiskProgress = Math.min(1, this.whisking / MATCHA_WHISK_TARGET);
    this.stage = matchaWhiskStage(this.whiskProgress).id;
    this.foam = Math.min(1, this.whiskProgress);
    this.consistency = matchaWhiskTechnique(this.whiskProgress);
    if (this.whisking > 0) {
      this.steps.whisk = { amount: this.whisking, technique: this.consistency };
    }
  }

  stock() {
    const remainingMatcha = this.amounts.matcha || 0;
    return { matcha: remainingMatcha > 0 ? remainingMatcha : 0 };
  }

  clear() {
    this.amounts = {};
    this.layers = [];
    this.steps = {};
    this.whisking = 0;
    this.whiskProgress = 0;
    this.stage = 'CLUMPY';
    this.foam = 0;
    this.consistency = 0;
    this.perfectAnnounced = false;
    this.consumedMatcha = 0;
    this.revision++;
  }
}
