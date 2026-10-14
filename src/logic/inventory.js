import { RECIPES, unlockedRecipes } from '../config.js';

export const INGREDIENTS = {
  coffee: { id: 'coffee', name: 'Bột cà phê', unit: 'muỗng', pack: 10, price: 20000, icon: 'grounds' },
  condensed: { id: 'condensed', name: 'Sữa đặc', unit: 'phần', pack: 8, price: 12000, icon: 'condensed' },
  milk: { id: 'milk', name: 'Sữa tươi', unit: 'phần', pack: 10, price: 15000, icon: 'milk' },
  egg: { id: 'egg', name: 'Trứng gà', unit: 'quả', pack: 6, price: 15000, icon: 'bowl' },
  ice: { id: 'ice', name: 'Đá viên', unit: 'phần 3 viên', pack: 12, price: 6000, icon: 'ice' },
  cream: { id: 'cream', name: 'Kem béo', unit: 'ml', pack: 240, price: 24000, icon: 'milk' },
  salt: { id: 'salt', name: 'Muối mịn', unit: 'g', pack: 6, price: 2000, icon: 'spoon' },
};

export function registerSupply(id, spec, initial = 0) {
  if (Object.hasOwn(INGREDIENTS, id) || !spec?.name || !spec.unit || !Number.isFinite(spec.pack) || spec.pack <= 0 || !Number.isFinite(spec.price) || spec.price <= 0) throw new Error(`Invalid supply: ${id}`);
  INGREDIENTS[id] = Object.freeze({ ...spec, id }); INITIAL_INVENTORY[id] = safeAmount(initial);
}

export const INITIAL_INVENTORY = { coffee: 10, condensed: 6, milk: 6, egg: 4, ice: 12, cream: 240, salt: 3 };
export const emptyIngredientTotals = () => Object.fromEntries(Object.keys(INGREDIENTS).map(id => [id, 0]));

const safeAmount = value => Number.isFinite(value) && value >= 0 ? Math.min(999, Math.round(value * 1000) / 1000) : 0;

export function normalizeInventory(raw, fallback = INITIAL_INVENTORY) {
  const source = raw && typeof raw === 'object' ? raw : fallback;
  return Object.fromEntries(Object.keys(INGREDIENTS).map(id => [id, safeAmount(source?.[id] ?? fallback?.[id])]));
}

export function recipeNeeds(recipeId) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return null;
  return { ...emptyIngredientTotals(), ...recipe.supplies };
}

export function canPrepareRecipe(inventory, recipeId) {
  const needs = recipeNeeds(recipeId);
  if (!needs || Object.keys(needs).some(id => !Object.hasOwn(INGREDIENTS, id))) return false;
  return Object.keys(INGREDIENTS).every(id => safeAmount(inventory?.[id]) + 1e-9 >= (needs[id] || 0));
}

export function drinkHasRecipeMaterials(drink, recipeId) {
  const recipe = RECIPES[recipeId];
  if (!drink || drink.consumed || !recipe || drink.recipeId !== recipeId) return false;
  const amounts = drink.getAmounts();
  for (const ingredient of recipe.ingredients) if ((amounts[ingredient.id] || 0) + 1e-9 < ingredient.target * recipe.quality.minimumAmount) return false;
  for (const [id, amount] of Object.entries(amounts)) if (amount > recipe.quality.unexpectedAmount && !recipe.ingredients.some(i => i.id === id)) return false;
  return true;
}

export function estimateDemand(day, expectedOrders) {
  const recipes = unlockedRecipes(day);
  if (!recipes.length) return emptyIngredientTotals();
  const demand = emptyIngredientTotals();
  const add = id => {
    const needs = recipeNeeds(id);
    for (const key of Object.keys(INGREDIENTS)) demand[key] += needs[key] || 0;
  };
  for (let i = 0; i < Math.max(0, Math.floor(expectedOrders)); i++) add(recipes[i % recipes.length]);
  for (const id of recipes) add(id); // One complete pass is the mistake/waste buffer.
  return normalizeInventory(demand, emptyIngredientTotals());
}

export function createSupplyPlan(inventory, day, expectedOrders) {
  const target = estimateDemand(day, expectedOrders);
  const items = [];
  for (const [id, spec] of Object.entries(INGREDIENTS)) {
    const missing = Math.max(0, target[id] - safeAmount(inventory?.[id]));
    const packs = Math.ceil((missing - 1e-9) / spec.pack);
    if (packs > 0) items.push({ id, packs, quantity: packs * spec.pack, price: packs * spec.price });
  }
  return { target, items, price: items.reduce((sum, item) => sum + item.price, 0) };
}

export function ingredientValue(amounts) {
  return Math.round(Object.entries(INGREDIENTS).reduce((sum, [id, spec]) => sum + safeAmount(amounts?.[id]) * spec.price / spec.pack, 0) / 100) * 100;
}

export function inventoryShortage(inventory, day, expectedOrders) {
  const plan = createSupplyPlan(inventory, day, expectedOrders);
  return plan.items.length ? `Kho dự kiến thiếu ${plan.items.map(item => INGREDIENTS[item.id].name.toLowerCase()).join(', ')}.` : 'Kho đủ cho ca tới và một lượt pha dự phòng.';
}
