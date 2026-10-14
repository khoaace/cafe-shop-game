import { PreparationState } from './PreparationState.js';

// Artwork-only sample; never creates or modifies a gameplay Drink.
export function recipePreview(recipe) {
  if (recipe.id === 'muoi') { const preparation = new PreparationState('preview-muoi'); preparation.add('brewedCoffee', 1); preparation.add('cream', 40); preparation.foam = 1; return { ...recipe, recipeId: recipe.id, state: 'BREWED', coffee: 1, stir: 0, preparation }; }
  if (recipe.engine === 'phin') return { ...recipe, recipeId: recipe.id, state: 'BREWED', coffee: recipe.water, stir: 0 };
  const preparation = new PreparationState(`preview-${recipe.id}`, recipe.visual.capacity || 300, Object.fromEntries(recipe.ingredients.filter(i => i.volumePerUnit).map(i => [i.id, i.volumePerUnit])));
  for (const ingredient of recipe.ingredients) preparation.add(ingredient.id, ingredient.target);
  return { recipeId: recipe.id, state: 'BREWED', preparation };
}
