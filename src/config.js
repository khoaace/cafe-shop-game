import { adaptPhinRecipe, defineRecipe } from './data/drinkEngine.js';
export const SIZE = { width: 480, height: 800 };
export const COLORS = {
  ink: 0x283d34, dark: 0x243f35, green: 0x517357, sage: 0x97a67e,
  cream: 0xfff4de, paper: 0xf6e8cb, gold: 0xe8b46b, terra: 0xbe6649,
  brown: 0x583522, coffee: 0x492a1c, steel: 0xb8c8c2, blue: 0x3d8090,
};
const PHIN_RECIPES = {
  den: { id: 'den', name: 'Cà phê đen đá', short: 'Đen đá', price: 12000, coffee: 1, water: 1, condensed: 0, milk: 0, foam: 0, ice: 3, stir: false, color: 0x563020, hint: '1 muỗng bột · nước 100% · 3 viên đá' },
  sua: { id: 'sua', name: 'Cà phê sữa đá', short: 'Sữa đá', price: 15000, coffee: 1, water: 1, condensed: 1, milk: 0, foam: 0, ice: 3, stir: true, color: 0xa46d3c, hint: '1 bột · 1 phần sữa đặc · 3 đá · khuấy' },
  bac: { id: 'bac', name: 'Bạc xỉu', short: 'Bạc xỉu', price: 18000, coffee: 0.5, water: 0.5, condensed: 1, milk: 2, foam: 0, ice: 3, stir: true, color: 0xd9bc88, hint: '½ bột · nước 50% · 1 sữa đặc · 2 sữa tươi · 3 đá' },
  trung: { id: 'trung', name: 'Cà phê trứng', short: 'Cà phê trứng', price: 25000, coffee: 1, water: 1, condensed: 0, milk: 0, foam: 1, ice: 0, stir: false, color: 0xe5bf68, hint: '1 muỗng bột · nước 100% · bọt trứng · không đá' },
};
export const RECIPES = Object.fromEntries(Object.entries(PHIN_RECIPES).map(([id, r]) => [id, adaptPhinRecipe(r, id === 'bac' ? 2 : id === 'trung' ? 3 : 1)]));
RECIPES.muoi = defineRecipe({
  id: 'muoi', name: 'Cà phê muối', short: 'Cà phê muối', price: 22000, engine: 'phin',
  coffee: 1, water: 1, condensed: 1, milk: 0, foam: 0, ice: 3, stir: false, color: 0xfff7e8,
  hint: 'Phin thật · 1 sữa đặc · 3 đá · 40 ml kem · 0,3 g muối · đánh tròn',
  equipment: ['glass', 'phin', 'spoon', 'press', 'kettle', 'coffee-pitcher', 'salted-bowl', 'cream', 'salt-spoon', 'whisk'],
  ingredients: [
    { id: 'coffee', target: 1, unit: 'muỗng' }, { id: 'water', target: 1, unit: 'phần' },
    { id: 'brewedCoffee', target: 1, unit: 'phần' }, { id: 'condensed', target: 1, unit: 'phần' },
    { id: 'ice', target: 3, unit: 'viên' }, { id: 'cream', target: 40, unit: 'ml' }, { id: 'salt', target: 0.3, unit: 'g' },
  ], supplies: { coffee: 1, condensed: 1, ice: 1, cream: 40, salt: 0.3 },
  steps: [
    { id: 'phin', action: 'place', target: 1, instruction: 'Kéo ly, phin; xúc 1 muỗng bột.' },
    { id: 'grounds', action: 'scoop', target: 1, instruction: 'Muỗng → hũ bột → phin.' },
    { id: 'press', action: 'press', target: 0.65, instruction: 'Giữ lõi để nén bột.' },
    { id: 'water', action: 'pour', ingredient: 'water', target: 1, instruction: 'Rót nước 100%, thả tay để ủ.' },
    { id: 'brew', action: 'brew', target: 8, instruction: 'Chờ 8 giây; đánh kem khi phin nhỏ.' },
    { id: 'collect', action: 'pour', ingredient: 'brewedCoffee', target: 1, instruction: 'Kéo ca phin vào đúng ly, nghiêng để rót cà phê đã ủ.' },
    { id: 'cream-pour', action: 'pour', ingredient: 'cream', target: 40, instruction: 'Rót 40 ml kem vào tô ở khay KEM MUỐI.' },
    { id: 'salt', action: 'scoop', ingredient: 'salt', target: 0.3, instruction: 'Kéo muỗng muối vào tô 2 lần (0,15 g/lần).' },
    { id: 'whisk', action: 'whisk', target: Math.PI * 6, instruction: 'Đánh vòng tròn trong tô đến vùng xanh; dừng trước quá bông.', minimumProgress: 0.1 },
  ], visual: { capacity: 80, color: 0xfff7e8, glass: 'glass', saltedCream: true }, unlock: { day: 4 },
});
// Register before creating a scene/save. Planned drinks are deliberately absent.
export function registerRecipe(raw) {
  const recipe = defineRecipe(raw);
  if (Object.hasOwn(RECIPES, recipe.id)) throw new Error(`Duplicate recipe: ${recipe.id}`);
  RECIPES[recipe.id] = recipe;
  return recipe;
}
export const INGREDIENT_NAMES = { condensed: 'sữa đặc', milk: 'sữa tươi', foam: 'bọt trứng', ice: 'đá' };
export const RULES = {
  brewSeconds: 8, pressSeconds: 0.65, waterRate: 0.48, milkRate: 0.60,
  stirRadians: Math.PI * 3, whiskDistance: 950,
  daySeconds: 180, rushStart: 45, rushEnd: 112.5, lastArrival: 157.5,
  normalInterval: 30, rushInterval: 24,
  comboRewards: { 3: 3000, 5: 7000, 10: 15000 },
  tipRates: { PERFECT: 0.25, GOOD: 0.12, ACCEPTABLE: 0.03 },
};
export const ARCHETYPES = [
  { id: 'office', name: 'Chị Lan', role: 'Văn phòng', color: 0xc8876b, patience: 85, hair: 0x342c27, line: 'Một ly cho tỉnh họp nha!', happy: 'Tỉnh cả buổi sáng luôn!', angry: 'Trễ họp mất rồi…' },
  { id: 'driver', name: 'Chú Ba', role: 'Xe ôm', color: 0x4c8b77, patience: 90, hair: 0x33312a, line: 'Pha chú ly đậm đà nghen!', happy: 'Ngon! Chạy thêm cuốc nữa!', angry: 'Chú có khách gọi rồi.' },
  { id: 'student', name: 'Minh', role: 'Sinh viên', color: 0xdaa855, patience: 95, hair: 0x342d28, line: 'Cho em nạp chút năng lượng!', happy: 'Mười điểm, cô chủ ơi!', angry: 'Em phải vào lớp rồi…' },
  { id: 'uncle', name: 'Bác Tư', role: 'Khách quen', color: 0x7195a1, patience: 100, hair: 0xc1b9a5, line: 'Ngồi đây nghe phố thức giấc.', happy: 'Đúng vị của buổi sáng!', angry: 'Bác đi dạo trước vậy.' },
  { id: 'tourist', name: 'Alex', role: 'Du khách', color: 0xb57658, patience: 75, hair: 0xa87b45, line: 'Một cà phê Việt Nam nhé!', happy: 'Ngon quá! Cảm ơn bạn!', angry: 'Hẹn quán lần sau nhé.' },
];
export const money = n => `${Math.round(n).toLocaleString('vi-VN')}đ`;
export const unlockedRecipes = (day, upgrades = {}) => Object.values(RECIPES).filter(r => r.enabled !== false && day >= (r.unlock.day ?? 1) && Object.entries(r.unlock.upgrades || {}).every(([id, level]) => (upgrades[id] || 0) >= level)).map(r => r.id);
export const clockText = elapsed => {
  const minutes = Math.min(600, 360 + Math.floor(elapsed / RULES.daySeconds * 240));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};
