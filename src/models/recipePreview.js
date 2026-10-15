import { PreparationState } from './PreparationState.js';

// Artwork-only sample; never creates or modifies a gameplay Drink.
export function recipePreview(recipe) {
  if (recipe.id === 'muoi') { const preparation = new PreparationState('preview-muoi'); preparation.add('brewedCoffee', 1); preparation.add('cream', 40); preparation.foam = 1; return { ...recipe, recipeId: recipe.id, state: 'BREWED', coffee: 1, stir: 0, preparation }; }
  if (recipe.id === 'cotdua') {
    const preparation = new PreparationState('preview-cotdua', 200, { condensed: 15, brewedCoffee: 40 });
    for (const [id, n] of [['condensed', 1], ['coconutCream', 60], ['ice', 3], ['brewedCoffee', 1]]) preparation.add(id, n);
    Object.assign(preparation, { blendTechnique: 1, blendTime: 4.5, crush: 1, foam: 0.8 });
    return { ...recipe, recipeId: recipe.id, state: 'BREWED', coffee: 1, stir: 0, reduced: true, preparation };
  }
  if (recipe.id === 'tratac') {
    const preparation = new PreparationState('preview-tratac', 260);
    for (const [id, n] of [['syrup', 15], ['tea', 150], ['citrusJuice', 20], ['kumquat', 2], ['ice', 3]]) preparation.add(id, n);
    preparation.mixing = 1;
    preparation.kumquatTechnique = 1;
    for (let i = 0; i < 4; i++) preparation.garnishes.push({ id: 'kumquat', x: -12 + i * 8, y: -14 + (i % 2) * 5, color: 0xe8ac30, angle: (i - 1.5) * 0.35 });
    return { ...recipe, recipeId: recipe.id, state: 'BREWED', reduced: true, preparation };
  }
  if (recipe.id === 'tradao') {
    const preparation = new PreparationState('preview-tradao', 270);
    for (const [id, n] of [['peachSyrup', 20], ['tea', 140], ['orangeJuice', 30], ['peach', 2], ['orange', 1], ['lemongrass', 1], ['ice', 3]]) preparation.add(id, n);
    preparation.mixing = 0.7;
    preparation.orangeTechnique = 1;
    preparation.garnishes.push({ id: 'orange', x: 9, y: -15, color: 0xf39735, angle: 0.25 });
    return { ...recipe, recipeId: recipe.id, state: 'BREWED', reduced: true, preparation };
  }
  if (recipe.id === 'travai') {
    const preparation = new PreparationState('preview-travai', 270);
    for (const [id, n] of [['lycheeSyrup', 20], ['tea', 150], ['lychee', 2], ['ice', 3]]) preparation.add(id, n);
    preparation.mixing = 0.85;
    preparation.garnishes.push({ id: 'lychee', x: -8, y: -12, color: 0xf8f3eb, angle: -0.2 }, { id: 'lychee', x: 8, y: -10, color: 0xf8f3eb, angle: 0.2 });
    return { ...recipe, recipeId: recipe.id, state: 'BREWED', reduced: true, preparation };
  }
  if (recipe.id === 'cacao') {
    const preparation = new PreparationState('preview-cacao', 250);
    for (const [id, n] of [['cacao', 15], ['water', 30], ['condensed', 15], ['milk', 100], ['ice', 3]]) preparation.add(id, n);
    preparation.mixing = 1;
    preparation.cacaoDissolveProgress = 1;
    preparation.cacaoDissolveStage = 'DISSOLVED';
    return { ...recipe, recipeId: recipe.id, state: 'BREWED', reduced: true, preparation };
  }
  if (recipe.id === 'matcha') {
    const preparation = new PreparationState('preview-matcha', 280);
    for (const [id, n] of [['ice', 3], ['syrup', 10], ['milk', 150], ['water', 40], ['matcha', 4]]) preparation.add(id, n);
    preparation.mixing = 0;
    preparation.foam = 1;
    preparation.consistency = 1;
    preparation.matchaWhiskProgress = 1;
    preparation.matchaWhiskStage = 'MICROFOAM';
    preparation.steps.whisk = { amount: 1, technique: 1 };
    return { ...recipe, recipeId: recipe.id, state: 'BREWED', reduced: true, preparation };
  }
  if (recipe.engine === 'phin') return { ...recipe, recipeId: recipe.id, state: 'BREWED', coffee: recipe.water, stir: 0 };
  const preparation = new PreparationState(`preview-${recipe.id}`, recipe.visual.capacity || 300, Object.fromEntries(recipe.ingredients.filter(i => i.volumePerUnit).map(i => [i.id, i.volumePerUnit])));
  for (const ingredient of recipe.ingredients) preparation.add(ingredient.id, ingredient.target);
  return { recipeId: recipe.id, state: 'BREWED', preparation };
}
