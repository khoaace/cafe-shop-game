export const CACAO_POWDER_TARGET = 15; // grams (3 scoops x 5g)
export const CACAO_SCOOP_GRAMS = 5;
export const CACAO_WATER_TARGET = 30; // ml hot water
export const CACAO_CONDENSED_TARGET = 15; // ml condensed milk (1 phần = 15ml)
export const CACAO_MILK_TARGET = 100; // ml fresh milk (1 phần = 50ml -> 100ml = 2 phần)
export const CACAO_ICE_TARGET = 3; // 3 cubes = 90g
export const CACAO_STIR_RADIANS = Math.PI * 3.2; // Circular radians to dissolve cocoa
export const CONDENSED_ML_PER_PORTION = 15;
export const MILK_ML_PER_PORTION = 50;

export const CACAO_STIR_STAGES = Object.freeze({
  CLUMPY: { id: 'CLUMPY', label: 'Vón cục' },
  PARTIAL: { id: 'PARTIAL', label: 'Đang tan' },
  SMOOTH: { id: 'SMOOTH', label: 'Sánh mịn' },
  DISSOLVED: { id: 'DISSOLVED', label: 'Tan hoàn toàn' },
});

export function cacaoDissolveStage(progress = 0) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  if (p >= 0.92) return CACAO_STIR_STAGES.DISSOLVED;
  if (p >= 0.65) return CACAO_STIR_STAGES.SMOOTH;
  if (p >= 0.25) return CACAO_STIR_STAGES.PARTIAL;
  return CACAO_STIR_STAGES.CLUMPY;
}

export const CACAO_MODIFIERS = Object.freeze({
  cacao: Object.freeze({
    normal: { id: 'normal', label: 'vừa cacao', grams: 15, scoops: 3 },
    strong: { id: 'strong', label: 'đậm cacao', grams: 20, scoops: 4 },
  }),
  milk: Object.freeze({
    less: { id: 'less', label: 'ít sữa', ml: 70, range: [62, 78] },
    normal: { id: 'normal', label: 'vừa sữa', ml: 100, range: [90, 110] },
    more: { id: 'more', label: 'nhiều sữa', ml: 125, range: [115, 135] },
  }),
  sweetness: Object.freeze({
    less: { id: 'less', label: 'ít ngọt', condensedMl: 10, range: [8, 12] },
    normal: { id: 'normal', label: 'vừa ngọt', condensedMl: 15, range: [12, 18] },
    more: { id: 'more', label: 'nhiều ngọt', condensedMl: 20, range: [17, 23] },
  }),
});

export function normalizeCacaoModifiers(raw = null) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const text = raw.toLowerCase();
    const cacao = text.includes('đậm cacao') || text.includes('nhiều cacao') ? 'strong' : 'normal';
    const milk = text.includes('ít sữa') ? 'less' : text.includes('nhiều sữa') ? 'more' : 'normal';
    const sweetness = text.includes('ít ngọt') ? 'less' : text.includes('nhiều ngọt') ? 'more' : 'normal';
    return { cacao, milk, sweetness };
  }
  const cacao = Object.hasOwn(CACAO_MODIFIERS.cacao, raw.cacao) ? raw.cacao : 'normal';
  const milk = Object.hasOwn(CACAO_MODIFIERS.milk, raw.milk) ? raw.milk : 'normal';
  const sweetness = Object.hasOwn(CACAO_MODIFIERS.sweetness, raw.sweetness) ? raw.sweetness : 'normal';
  return { cacao, milk, sweetness };
}

export function cacaoTargets(modifiers = null) {
  const m = normalizeCacaoModifiers(modifiers);
  const cacaoSpec = CACAO_MODIFIERS.cacao[m?.cacao || 'normal'];
  const milkSpec = CACAO_MODIFIERS.milk[m?.milk || 'normal'];
  const sweetSpec = CACAO_MODIFIERS.sweetness[m?.sweetness || 'normal'];
  return {
    cacao: cacaoSpec.grams,
    cacaoScoops: cacaoSpec.scoops,
    water: CACAO_WATER_TARGET,
    condensed: sweetSpec.condensedMl,
    condensedRange: sweetSpec.range,
    milk: milkSpec.ml,
    milkRange: milkSpec.range,
    ice: CACAO_ICE_TARGET,
    iceGrams: CACAO_ICE_TARGET * 30,
    stirRadians: CACAO_STIR_RADIANS,
    cacaoLabel: cacaoSpec.label,
    milkLabel: milkSpec.label,
    sweetnessLabel: sweetSpec.label,
    condensedLabel: sweetSpec.label,
    iceLabel: '3 viên · 90g',
  };
}

export function formatCacaoModifierLabel(modifiers = null) {
  const m = normalizeCacaoModifiers(modifiers);
  if (!m) return '';
  const parts = [];
  if (m.cacao && m.cacao !== 'normal') parts.push(CACAO_MODIFIERS.cacao[m.cacao].label);
  if (m.sweetness && m.sweetness !== 'normal') parts.push(CACAO_MODIFIERS.sweetness[m.sweetness].label);
  if (m.milk && m.milk !== 'normal') parts.push(CACAO_MODIFIERS.milk[m.milk].label);
  return parts.join(', ');
}
