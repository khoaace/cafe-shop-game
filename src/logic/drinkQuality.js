import { DEFAULT_THRESHOLDS, INGREDIENT_DEFINITIONS } from '../data/drinkEngine.js';

export function evaluatePreparation(recipe, amounts, steps = {}, ready = true) {
  const q = { ...DEFAULT_THRESHOLDS, ...recipe.quality };
  const expected = new Map(recipe.ingredients.map(i => [i.id, i]));
  const missing = recipe.ingredients.find(i => (amounts[i.id] || 0) < i.target * q.minimumAmount);
  const unexpected = Object.keys(amounts).find(id => !expected.has(id) && amounts[id] > q.unexpectedAmount);
  const recipeCorrectness = !missing && !unexpected;
  const errors = recipe.ingredients.map(i => Math.abs((amounts[i.id] || 0) / i.target - 1));
  const error = errors.reduce((sum, v) => sum + Math.min(1, v), 0) / errors.length;
  const amountAccuracy = Math.max(0, 1 - error);
  const techniqueSteps = recipe.steps.filter(s => s.technique !== false);
  const technique = techniqueSteps.length ? techniqueSteps.reduce((sum, s) => sum + Math.min(1, (steps[s.id]?.amount || 0) / s.target) * (steps[s.id]?.technique ?? 1), 0) / techniqueSteps.length : 1;
  const incomplete = recipe.steps.find(s => s.required !== false && (steps[s.id]?.amount || 0) < s.target * (s.minimumProgress ?? 0.01));
  const valid = recipeCorrectness && ready && !incomplete;
  const quality = !valid ? 'INCORRECT' : error <= q.perfectError && Math.max(...errors) <= q.perfectMaxError && technique >= q.perfectTechnique ? 'PERFECT' : error <= q.goodError && Math.max(...errors) <= q.goodMaxError && technique >= q.goodTechnique ? 'GOOD' : 'ACCEPTABLE';
  const message = missing ? `Thiếu ${INGREDIENT_DEFINITIONS[missing.id].name} rồi!` : unexpected ? `Món này không có ${INGREDIENT_DEFINITIONS[unexpected]?.name || unexpected}. Bỏ ly để pha lại nhé.` : !ready || incomplete ? incomplete?.instruction || 'Tiếp tục chuẩn bị ly.' : quality === 'PERFECT' ? 'Tuyệt vời! Perfect Brew!' : quality === 'GOOD' ? 'Chuẩn luôn!' : 'Ổn rồi, lần sau cân lượng nhé!';
  return { valid, recipeCorrectness, amountAccuracy, preparationTechnique: technique, finalQuality: quality, quality, score: quality === 'PERFECT' ? 5 : quality === 'GOOD' ? 4.3 : quality === 'ACCEPTABLE' ? 3.4 : 0, message };
}
