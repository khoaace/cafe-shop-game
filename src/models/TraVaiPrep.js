export const TRAVAI_TEA_TARGET = 150;
export const TRAVAI_SYRUP_TARGET = 20;
export const TRAVAI_LYCHEE_TARGET = 2;
export const TRAVAI_ICE_TARGET = 3; // 3 cubes = 90 g
export const LYCHEE_FRUITS_PER_PACK_UNIT = 4; // 1 lon = 4 trái vải

export const TRAVAI_MODIFIERS = Object.freeze({
  lychee: Object.freeze({
    normal: { id: 'normal', label: 'vừa vải', fruits: 2 },
    more: { id: 'more', label: 'nhiều vải', fruits: 3 },
  }),
  sweetness: Object.freeze({
    less: { id: 'less', label: 'ít ngọt', syrup: 10, range: [7, 13] },
    normal: { id: 'normal', label: 'vừa ngọt', syrup: 20, range: [16, 24] },
    more: { id: 'more', label: 'nhiều ngọt', syrup: 28, range: [24, 32] },
  }),
  ice: Object.freeze({
    less: { id: 'less', label: 'ít đá', cubes: 2, grams: 60 },
    normal: { id: 'normal', label: 'vừa đá', cubes: 3, grams: 90 },
    more: { id: 'more', label: 'nhiều đá', cubes: 4, grams: 120 },
  }),
});

export function normalizeTraVaiModifiers(raw = null) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const text = raw.toLowerCase();
    const lychee = text.includes('nhiều vải') || text.includes('nhiều trái') ? 'more' : 'normal';
    const sweetness = text.includes('ít ngọt') ? 'less' : text.includes('nhiều ngọt') ? 'more' : 'normal';
    const ice = text.includes('ít đá') ? 'less' : text.includes('nhiều đá') ? 'more' : 'normal';
    return { lychee, sweetness, ice };
  }
  const lychee = Object.hasOwn(TRAVAI_MODIFIERS.lychee, raw.lychee) ? raw.lychee : 'normal';
  const sweetness = Object.hasOwn(TRAVAI_MODIFIERS.sweetness, raw.sweetness) ? raw.sweetness : 'normal';
  const ice = Object.hasOwn(TRAVAI_MODIFIERS.ice, raw.ice) ? raw.ice : 'normal';
  return { lychee, sweetness, ice };
}

export function traVaiTargets(modifiers = null) {
  const m = normalizeTraVaiModifiers(modifiers);
  const lycheeSpec = TRAVAI_MODIFIERS.lychee[m?.lychee || 'normal'];
  const sweetSpec = TRAVAI_MODIFIERS.sweetness[m?.sweetness || 'normal'];
  const iceSpec = TRAVAI_MODIFIERS.ice[m?.ice || 'normal'];
  return {
    tea: TRAVAI_TEA_TARGET,
    lychee: lycheeSpec.fruits,
    lycheeSyrup: sweetSpec.syrup,
    syrupRange: sweetSpec.range,
    ice: iceSpec.cubes,
    iceGrams: iceSpec.grams,
    lycheeLabel: lycheeSpec.label,
    sweetnessLabel: sweetSpec.label,
    iceLabel: iceSpec.label,
  };
}

export function formatTraVaiModifierLabel(modifiers = null) {
  const m = normalizeTraVaiModifiers(modifiers);
  if (!m) return '';
  const parts = [];
  if (m.lychee && m.lychee !== 'normal') parts.push(TRAVAI_MODIFIERS.lychee[m.lychee].label);
  if (m.sweetness && m.sweetness !== 'normal') parts.push(TRAVAI_MODIFIERS.sweetness[m.sweetness].label);
  if (m.ice && m.ice !== 'normal') parts.push(TRAVAI_MODIFIERS.ice[m.ice].label);
  return parts.join(', ');
}
