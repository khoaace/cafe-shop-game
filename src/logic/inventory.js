import { RECIPES, unlockedRecipes } from '../config.js';

export const INGREDIENTS = {
  coffee: { id: 'coffee', name: 'Bột cà phê', unit: 'muỗng', pack: 10, price: 20000, icon: 'grounds' },
  condensed: { id: 'condensed', name: 'Sữa đặc', unit: 'phần', pack: 8, price: 12000, icon: 'condensed' },
  milk: { id: 'milk', name: 'Sữa tươi', unit: 'phần', pack: 10, price: 15000, icon: 'milk' },
  egg: { id: 'egg', name: 'Trứng gà', unit: 'quả', pack: 6, price: 15000, icon: 'bowl' },
  ice: { id: 'ice', name: 'Đá viên', unit: 'phần 3 viên', pack: 12, price: 6000, icon: 'ice' },
  cream: { id: 'cream', name: 'Kem béo', unit: 'ml', pack: 240, price: 24000, icon: 'milk' },
  salt: { id: 'salt', name: 'Muối mịn', unit: 'g', pack: 6, price: 2000, icon: 'spoon' },
  coconutCream: { id: 'coconutCream', name: 'Cốt dừa', unit: 'ml', pack: 400, price: 28000, icon: 'coconut', packLabel: 'lon 400 ml' },
  tea: { id: 'tea', name: 'Trà ủ sẵn', unit: 'ml', pack: 600, price: 12000, icon: 'tea', packLabel: 'bình 600 ml' },
  kumquat: { id: 'kumquat', name: 'Tắc tươi', unit: 'quả', pack: 10, price: 10000, icon: 'kumquat', packLabel: 'rổ 10 quả' },
  syrup: { id: 'syrup', name: 'Siro đường', unit: 'ml', pack: 150, price: 10000, icon: 'syrup', packLabel: 'chai 150 ml' },
  peach: { id: 'peach', name: 'Đào ngâm', unit: 'hộp 4 miếng', pack: 2, price: 16000, icon: 'peach', packLabel: 'lốc 2 hộp (8 miếng)', portionUnit: 'miếng', portionsPerUnit: 4 },
  orange: { id: 'orange', name: 'Cam tươi', unit: 'quả', pack: 6, price: 15000, icon: 'orange', packLabel: 'rổ 6 quả' },
  lemongrass: { id: 'lemongrass', name: 'Sả tươi', unit: 'nhánh', pack: 8, price: 8000, icon: 'lemongrass', packLabel: 'bó 8 nhánh' },
  peachSyrup: { id: 'peachSyrup', name: 'Siro đào', unit: 'ml', pack: 160, price: 16000, icon: 'peachSyrup', packLabel: 'chai 160 ml' },
  lychee: { id: 'lychee', name: 'Vải ngâm', unit: 'lon 4 trái', pack: 2, price: 16000, icon: 'lychee', packLabel: 'lốc 2 lon (8 trái)', portionUnit: 'trái', portionsPerUnit: 4 },
  lycheeSyrup: { id: 'lycheeSyrup', name: 'Siro vải', unit: 'ml', pack: 160, price: 16000, icon: 'lycheeSyrup', packLabel: 'chai 160 ml' },
  cacao: { id: 'cacao', name: 'Bột cacao', unit: 'g', pack: 120, price: 18000, icon: 'cacao', packLabel: 'hộp 120 g' },
  matcha: { id: 'matcha', name: 'Bột matcha', unit: 'g', pack: 40, price: 28000, icon: 'matcha', packLabel: 'hộp 40 g' },
};

export function registerSupply(id, spec, initial = 0) {
  if (Object.hasOwn(INGREDIENTS, id) || !spec?.name || !spec.unit || !Number.isFinite(spec.pack) || spec.pack <= 0 || !Number.isFinite(spec.price) || spec.price <= 0) throw new Error(`Invalid supply: ${id}`);
  INGREDIENTS[id] = { ...spec, id }; INITIAL_INVENTORY[id] = safeAmount(initial);
}

export function configureIngredientPrice(id, price) {
  if (!Object.hasOwn(INGREDIENTS, id) || !Number.isFinite(price) || price <= 0) throw new Error(`Invalid price for ${id}`);
  INGREDIENTS[id] = { ...INGREDIENTS[id], price: Math.round(price) };
  return INGREDIENTS[id].price;
}

export const INITIAL_INVENTORY = { coffee: 10, condensed: 6, milk: 6, egg: 4, ice: 12, cream: 240, salt: 3, coconutCream: 240, tea: 450, kumquat: 8, syrup: 90, peach: 2, orange: 5, lemongrass: 6, peachSyrup: 100, lychee: 2, lycheeSyrup: 100, cacao: 90, matcha: 28 };
export const emptyIngredientTotals = () => Object.fromEntries(Object.keys(INGREDIENTS).map(id => [id, 0]));

export const STANDARD_SERVING_UNITS = Object.freeze({
  coffee: 1,
  condensed: 1,
  milk: 2,
  egg: 1,
  ice: 1,
  cream: 40,
  salt: 0.3,
  coconutCream: 60,
  tea: 150,
  kumquat: 2,
  syrup: 15,
  peach: 0.5,
  orange: 1,
  lemongrass: 1,
  peachSyrup: 20,
  lychee: 0.5,
  lycheeSyrup: 20,
  cacao: 15,
  matcha: 4,
});

export function standardServingSize(id) {
  return STANDARD_SERVING_UNITS[id] || 1;
}

export function standardServingsAvailable(inventory, id) {
  if (!Object.hasOwn(INGREDIENTS, id)) return 0;
  const perServing = standardServingSize(id);
  return Math.floor((safeAmount(inventory?.[id], id) + 1e-9) / perServing);
}

// Converts package/stock units into usable preparation portions (e.g., 1 hộp đào = 4 miếng, 1 phần đá = 3 viên).
export function usablePortions(inventory, id) {
  const spec = INGREDIENTS[id];
  if (!spec) return 0;
  const factor = id === 'ice' ? 3 : spec.portionsPerUnit || 1;
  return Math.floor(safeAmount(inventory?.[id], id) * factor + 1e-9);
}

const maxAmount = id => Math.max(999, (INGREDIENTS[id]?.pack || 0) * 6);
const safeAmount = (value, id = null) => Number.isFinite(value) && value >= 0 ? Math.min(maxAmount(id), Math.round(value * 1000) / 1000) : 0;

export function normalizeInventory(raw, fallback = INITIAL_INVENTORY) {
  const source = raw && typeof raw === 'object' ? raw : fallback;
  return Object.fromEntries(Object.keys(INGREDIENTS).map(id => [id, safeAmount(source?.[id] ?? fallback?.[id], id)]));
}

export function recipeNeeds(recipeId) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return null;
  return { ...emptyIngredientTotals(), ...recipe.supplies };
}

export function recipeNeedsForModifiers(recipeId, modifiers = null) {
  const needs = recipeNeeds(recipeId);
  if (!needs || !modifiers || typeof modifiers !== 'object') return needs;
  if (recipeId === 'tratac') {
    if (modifiers.sweetness === 'less') needs.syrup = 10;
    else if (modifiers.sweetness === 'more') needs.syrup = 20;
    if (modifiers.ice === 'less') needs.ice = 2 / 3;
    else if (modifiers.ice === 'more') needs.ice = 4 / 3;
  } else if (recipeId === 'tradao') {
    if (modifiers.peach === 'more' || modifiers.peach === 'extra') needs.peach = 0.75;
    if (modifiers.sweetness === 'less') needs.peachSyrup = 14;
    else if (modifiers.sweetness === 'more') needs.peachSyrup = 26;
    if (modifiers.ice === 'less') needs.ice = 2 / 3;
    else if (modifiers.ice === 'more') needs.ice = 4 / 3;
  } else if (recipeId === 'travai') {
    if (modifiers.lychee === 'more' || modifiers.lychee === 'extra') needs.lychee = 0.75;
    if (modifiers.sweetness === 'less') needs.lycheeSyrup = 10;
    else if (modifiers.sweetness === 'more') needs.lycheeSyrup = 28;
    if (modifiers.ice === 'less') needs.ice = 2 / 3;
    else if (modifiers.ice === 'more') needs.ice = 4 / 3;
  } else if (recipeId === 'cacao') {
    if (modifiers.cacao === 'strong') needs.cacao = 20;
    if (modifiers.sweetness === 'less') needs.condensed = 10 / 15;
    else if (modifiers.sweetness === 'sweet') needs.condensed = 20 / 15;
    if (modifiers.milk === 'less') needs.milk = 70 / 50;
    else if (modifiers.milk === 'more') needs.milk = 130 / 50;
  } else if (recipeId === 'matcha') {
    if (modifiers.matcha === 'strong') needs.matcha = 6;
    if (modifiers.sweetness === 'none') needs.syrup = 0;
    else if (modifiers.sweetness === 'less') needs.syrup = 10;
    else if (modifiers.sweetness === 'normal') needs.syrup = 15;
    if (modifiers.milk === 'less') needs.milk = 110 / 50;
    else if (modifiers.milk === 'more') needs.milk = 180 / 50;
  }
  return needs;
}

export function feasibleModifiersFor(recipeId, inventory = {}) {
  if (recipeId === 'tratac') {
    const ice = safeAmount(inventory?.ice, 'ice') + 1e-9 >= 4 / 3 ? 'more' : 'normal';
    const sweetness = safeAmount(inventory?.syrup, 'syrup') + 1e-9 >= 15 ? 'less' : 'less';
    return { sweetness, ice };
  }
  if (recipeId === 'tradao') {
    return { peach: safeAmount(inventory?.peach, 'peach') + 1e-9 >= 0.75 ? 'more' : 'normal' };
  }
  if (recipeId === 'travai') {
    return { lychee: safeAmount(inventory?.lychee, 'lychee') + 1e-9 >= 0.75 ? 'more' : 'normal' };
  }
  if (recipeId === 'cacao') {
    return { cacao: safeAmount(inventory?.cacao, 'cacao') + 1e-9 >= 20 ? 'strong' : 'normal' };
  }
  if (recipeId === 'matcha') {
    return { sweetness: safeAmount(inventory?.syrup, 'syrup') + 1e-9 >= 10 ? 'less' : 'none' };
  }
  return undefined;
}

export function canPrepareRecipe(inventory, recipeId, modifiers = null) {
  const needs = modifiers ? recipeNeedsForModifiers(recipeId, modifiers) : recipeNeeds(recipeId);
  if (!needs || Object.keys(needs).some(id => !Object.hasOwn(INGREDIENTS, id))) return false;
  return Object.keys(INGREDIENTS).every(id => safeAmount(inventory?.[id], id) + 1e-9 >= (needs[id] || 0));
}

export function drinkHasRecipeMaterials(drink, recipeId) {
  const recipe = RECIPES[recipeId];
  if (!drink || drink.consumed || !recipe || drink.recipeId !== recipeId) return false;
  const amounts = drink.getAmounts();
  for (const ingredient of recipe.ingredients) if ((amounts[ingredient.id] || 0) + 1e-9 < ingredient.target * recipe.quality.minimumAmount) return false;
  for (const [id, amount] of Object.entries(amounts)) if (amount > recipe.quality.unexpectedAmount && !recipe.ingredients.some(i => i.id === id)) return false;
  return true;
}

export function estimateDemand(day, expectedOrders, upgrades = {}) {
  const recipes = unlockedRecipes(day, upgrades);
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

export function createSupplyPlan(inventory, day, expectedOrders, upgrades = {}) {
  const target = estimateDemand(day, expectedOrders, upgrades);
  const items = [];
  for (const [id, spec] of Object.entries(INGREDIENTS)) {
    const missing = Math.max(0, target[id] - safeAmount(inventory?.[id], id));
    const packs = Math.ceil((missing - 1e-9) / spec.pack);
    if (packs > 0) items.push({ id, packs, quantity: packs * spec.pack, price: packs * spec.price });
  }
  return { target, items, price: items.reduce((sum, item) => sum + item.price, 0) };
}

export function ingredientValue(amounts) {
  return Math.round(Object.entries(INGREDIENTS).reduce((sum, [id, spec]) => sum + safeAmount(amounts?.[id], id) * spec.price / spec.pack, 0) / 100) * 100;
}

export function inventoryShortage(inventory, day, expectedOrders, upgrades = {}) {
  const plan = createSupplyPlan(inventory, day, expectedOrders, upgrades);
  return plan.items.length ? `Kho dự kiến thiếu ${plan.items.map(item => INGREDIENTS[item.id].name.toLowerCase()).join(', ')}.` : 'Kho đủ cho ca tới và một lượt pha dự phòng.';
}
