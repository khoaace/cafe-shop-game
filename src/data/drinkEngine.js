// Quantities use the declared unit. Stock conversion is explicit (three cubes per ice pack portion).
export const INGREDIENT_DEFINITIONS = {
  coffee: { name: 'bột cà phê', unit: 'muỗng', color: 0x492a1c, liquid: false },
  water: { name: 'nước', unit: 'phần', color: 0xd0e6d6, liquid: true, opacity: 0.55 },
  brewedCoffee: { name: 'cà phê', unit: 'phần', color: 0x48281b, liquid: true },
  condensed: { name: 'sữa đặc', unit: 'phần', color: 0xe6c98c, liquid: true },
  milk: { name: 'sữa tươi', unit: 'phần', color: 0xf9e9ce, liquid: true },
  foam: { name: 'bọt trứng', unit: 'phần', color: 0xecc572, foam: true },
  ice: { name: 'đá', unit: 'viên', color: 0xd6ece3 },
  tea: { name: 'trà', unit: 'ml', color: 0xad702c, liquid: true, opacity: 0.8 },
  syrup: { name: 'siro', unit: 'ml', color: 0xe4a557, liquid: true, opacity: 0.75 },
  coconutCream: { name: 'cốt dừa', unit: 'ml', color: 0xfff6e6, liquid: true },
  salt: { name: 'muối', unit: 'g', color: 0xffffff },
  cream: { name: 'kem', unit: 'ml', color: 0xfff5d8, liquid: true },
  kumquat: { name: 'tắc', unit: 'quả', color: 0xe8ac30, fruit: true },
  orange: { name: 'cam', unit: 'miếng', color: 0xf39735, fruit: true },
  peach: { name: 'đào', unit: 'miếng', color: 0xf3b875, fruit: true },
  lychee: { name: 'vải', unit: 'quả', color: 0xf6e6d8, fruit: true },
  citrusJuice: { name: 'nước quả', unit: 'ml', color: 0xf5c850, liquid: true },
  lemongrass: { name: 'sả', unit: 'nhánh', color: 0xb3c477 },
  cacao: { name: 'cacao', unit: 'g', color: 0x673b27 },
  matcha: { name: 'matcha', unit: 'g', color: 0x7d9a45 },
};

// Planning metadata only: no recipe quantities, unlocks or customer orders yet.
export const PLANNED_DRINKS = Object.freeze([
  ['tratac', 'Trà tắc'],
  ['tradao', 'Trà đào cam sả'], ['travai', 'Trà vải'], ['cacao', 'Cacao sữa đá'], ['matcha', 'Matcha latte đá'],
].map(([id, name]) => Object.freeze({ id, name, status: 'planned' })));

export const GESTURE_ACTIONS = ['place', 'scoop', 'press', 'pour', 'brew', 'whisk', 'slice', 'squeeze', 'blend', 'lid', 'stir', 'ice', 'garnish'];
export const DEFAULT_THRESHOLDS = { minimumAmount: 0.45, unexpectedAmount: 0.05, perfectError: 0.12, perfectMaxError: 0.25, goodError: 0.30, goodMaxError: 0.60, perfectTechnique: 0.95, goodTechnique: 0.65 };

export function defineRecipe(raw) {
  if (!raw || !/^[a-z][a-z0-9_-]*$/.test(raw.id) || !raw.name || !Number.isFinite(raw.price) || raw.price <= 0) throw new Error('Invalid drink identity/price');
  if (!Array.isArray(raw.ingredients) || !raw.ingredients.length || !Array.isArray(raw.steps) || !raw.steps.length || !Array.isArray(raw.equipment)) throw new Error('Recipe requires ingredients, equipment and physical steps');
  const seen = new Set();
  for (const ingredient of raw.ingredients) {
    const spec = INGREDIENT_DEFINITIONS[ingredient.id];
    if (!spec || seen.has(ingredient.id) || !Number.isFinite(ingredient.target) || ingredient.target <= 0 || ingredient.unit !== spec.unit) throw new Error(`Invalid ingredient: ${ingredient.id}`);
    if (ingredient.volumePerUnit !== undefined && (!Number.isFinite(ingredient.volumePerUnit) || ingredient.volumePerUnit <= 0)) throw new Error('Invalid volume conversion');
    seen.add(ingredient.id);
  }
  const steps = new Set();
  for (const step of raw.steps) {
    if (!step.id || steps.has(step.id) || !GESTURE_ACTIONS.includes(step.action) || !step.instruction || !Number.isFinite(step.target) || step.target <= 0) throw new Error('Invalid gesture step');
    if ((step.after || []).some(id => !steps.has(id))) throw new Error('Step dependencies must precede the step');
    steps.add(step.id);
  }
  if (!raw.supplies || Object.values(raw.supplies).some(n => !Number.isFinite(n) || n < 0)) throw new Error('Recipe requires explicit stock quantities');
  if (raw.unlock?.day !== undefined && (!Number.isInteger(raw.unlock.day) || raw.unlock.day < 1)) throw new Error('Invalid unlock day');
  if (raw.visual?.capacity !== undefined && (!Number.isFinite(raw.visual.capacity) || raw.visual.capacity <= 0)) throw new Error('Invalid glass capacity');
  const quality = { ...DEFAULT_THRESHOLDS, ...raw.quality };
  if (Object.values(quality).some(v => !Number.isFinite(v) || v < 0 || v > 1)) throw new Error('Invalid quality thresholds');
  const recipe = structuredClone({ ...raw, steps: raw.steps.map(s => ({ ...s, technique: s.technique ?? ['press', 'whisk', 'slice', 'squeeze', 'blend', 'stir'].includes(s.action) })), short: raw.short || raw.name, hint: raw.hint || raw.steps.map(s => s.instruction).join(' · '), quality, visual: raw.visual || {}, unlock: raw.unlock || { day: 1 }, engine: raw.engine || 'gesture' });
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  return freeze(recipe);
}

export function adaptPhinRecipe(r, day) {
  return defineRecipe({ ...r, engine: 'phin', equipment: ['glass', 'phin', 'spoon', 'press', 'kettle', ...(r.stir ? ['stir'] : []), ...(r.foam ? ['bowl', 'whisk'] : [])],
    ingredients: [['coffee', r.coffee], ['water', r.water], ['condensed', r.condensed], ['milk', r.milk], ['foam', r.foam], ['ice', r.ice]].filter(([, n]) => n > 0).map(([id, target]) => ({ id, target, unit: INGREDIENT_DEFINITIONS[id].unit })),
    supplies: { coffee: r.coffee, condensed: r.condensed, milk: r.milk, egg: r.foam ? 1 : 0, ice: r.ice / 3 },
    steps: [
      { id: 'phin', action: 'place', target: 1, instruction: 'Kéo phin lên ly.' },
      { id: 'grounds', action: 'scoop', target: r.coffee, instruction: 'Muỗng → hũ bột → phin.' },
      { id: 'press', action: 'press', target: 0.65, instruction: 'Giữ lõi để nén bột.' },
      { id: 'water', action: 'pour', target: r.water, instruction: 'Kéo ấm, nghiêng bằng chuyển động, thả để ủ.' },
      { id: 'brew', action: 'brew', target: 8, instruction: 'Chờ phin nhỏ; có thể pha ly khác.' },
      ...(r.stir ? [{ id: 'mix', action: 'stir', target: Math.PI * 3, instruction: 'Khuấy vòng tròn trong ly.' }] : []),
      ...(r.foam ? [{ id: 'foam', action: 'whisk', target: 950, instruction: 'Đánh vòng tròn hoặc nét W trong tô.' }] : []),
    ], visual: { color: r.color, capacity: 5, glass: 'glass' }, unlock: { day },
  });
}
