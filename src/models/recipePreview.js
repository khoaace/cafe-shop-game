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
  if (recipe.engine === 'phin') return { ...recipe, recipeId: recipe.id, state: 'BREWED', coffee: recipe.water, stir: 0 };
  const preparation = new PreparationState(`preview-${recipe.id}`, recipe.visual.capacity || 300, Object.fromEntries(recipe.ingredients.filter(i => i.volumePerUnit).map(i => [i.id, i.volumePerUnit])));
  for (const ingredient of recipe.ingredients) preparation.add(ingredient.id, ingredient.target);
  return { recipeId: recipe.id, state: 'BREWED', preparation };
}
