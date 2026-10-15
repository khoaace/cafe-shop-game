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
RECIPES.cotdua = defineRecipe({
  id: 'cotdua', name: 'Cà phê cốt dừa', short: 'Cà phê dừa', price: 30000, engine: 'phin',
  coffee: 1, water: 1, condensed: 1, milk: 0, foam: 0, ice: 3, stir: false, color: 0xf3e6cf,
  hint: 'Máy xay: 60 ml cốt dừa · 15 ml sữa đặc · 100 g đá · xay mịn · rót vào ly · rót cà phê phin lên trên',
  equipment: ['glass', 'phin', 'spoon', 'press', 'kettle', 'coffee-pitcher', 'blender', 'blender-jar', 'blender-lid', 'coconut-cream', 'condensed', 'ice-scoop'],
  // Project units: 1 muỗng bột ≈ 18 g, 1 phần sữa đặc = 15 ml, 3 viên đá ≈ 100 g, 1 phần cà phê phin ≈ 40 ml.
  ingredients: [
    { id: 'coffee', target: 1, unit: 'muỗng', label: '18 g (1 muỗng)' }, { id: 'water', target: 1, unit: 'phần', label: '100%' },
    { id: 'brewedCoffee', target: 1, unit: 'phần', volumePerUnit: 40, label: '1 phần phin (~40 ml)' }, { id: 'coconutCream', target: 60, unit: 'ml', label: '60 ml' },
    { id: 'condensed', target: 1, unit: 'phần', volumePerUnit: 15, label: '15 ml' }, { id: 'ice', target: 3, unit: 'viên', label: '100 g (3 viên)' },
  ], supplies: { coffee: 1, condensed: 1, ice: 1, coconutCream: 60 },
  steps: [
    { id: 'phin', action: 'place', target: 1, instruction: 'Kéo ly, phin; xúc 1 muỗng bột (18 g).' },
    { id: 'grounds', action: 'scoop', target: 1, instruction: 'Muỗng → hũ bột → phin.' },
    { id: 'press', action: 'press', target: 0.65, instruction: 'Giữ lõi để nén bột.' },
    { id: 'water', action: 'pour', ingredient: 'water', target: 1, instruction: 'Rót nước 100%, thả tay để ủ.' },
    { id: 'brew', action: 'brew', target: 8, instruction: 'Chờ 8 giây; xay cốt dừa trong lúc phin nhỏ.' },
    { id: 'coconut', action: 'pour', ingredient: 'coconutCream', target: 60, instruction: 'Đặt cối lên máy xay, nghiêng hộp rót 60 ml cốt dừa.' },
    { id: 'condensed', action: 'pour', ingredient: 'condensed', target: 1, instruction: 'Rót từ từ 15 ml sữa đặc vào cối.' },
    { id: 'ice', action: 'ice', target: 3, instruction: 'Xúc 100 g đá, thả vào cối.' },
    { id: 'lid', action: 'lid', target: 1, instruction: 'Kéo nắp lên cối cho khớp.' },
    { id: 'blend', action: 'blend', target: 4, instruction: 'Giữ công tắc để xay; thả tay ở vùng Hoàn hảo.', minimumProgress: 0.1 },
    { id: 'mixture', action: 'pour', ingredient: 'coconutCream', target: 60, instruction: 'Mở nắp, kéo cối lên ly, nghiêng rót cốt dừa xay.' },
    { id: 'collect', action: 'pour', ingredient: 'brewedCoffee', target: 1, instruction: 'Kéo ca phin vào ly, rót cà phê lên lớp dừa.' },
  ], visual: { capacity: 200, color: 0xf3e6cf, glass: 'glass', coconut: true }, unlock: { day: 5, upgrades: { blender: 1 } },
});
RECIPES.tratac = defineRecipe({
  id: 'tratac', name: 'Trà tắc', short: 'Trà tắc', price: 12000, engine: 'gesture',
  color: 0xd89b38,
  hint: 'Cắt 2 quả tắc · vắt 20 ml nước tắc · 150 ml trà · 15 ml siro · 90 g đá · khuấy đều',
  equipment: ['glass', 'board', 'knife', 'squeezer', 'measuring-cup', 'tea-pitcher', 'syrup-bottle', 'ice-scoop', 'stir'],
  ingredients: [
    { id: 'tea', target: 150, unit: 'ml', label: '150 ml' },
    { id: 'kumquat', target: 2, unit: 'quả', label: '2 quả' },
    { id: 'citrusJuice', target: 20, unit: 'ml', label: '20 ml (từ 2 quả)' },
    { id: 'syrup', target: 15, unit: 'ml', label: '15 ml' },
    { id: 'ice', target: 3, unit: 'viên', label: '90 g (3 viên)' },
  ],
  supplies: { tea: 150, kumquat: 2, syrup: 15, ice: 1 },
  steps: [
    { id: 'place', action: 'place', ingredient: 'kumquat', target: 2, instruction: 'Kéo 2 quả tắc lên thớt.' },
    { id: 'slice', action: 'slice', target: 1, instruction: 'Vuốt qua quả tắc trên thớt để cắt đôi.' },
    { id: 'squeeze', action: 'squeeze', target: 20, instruction: 'Kéo tắc đã cắt sang khu vắt, nhấn và kéo để ép 20 ml nước cốt.' },
    { id: 'juice', action: 'pour', ingredient: 'citrusJuice', target: 20, instruction: 'Kéo ly đong nước tắc rót vào ly.' },
    { id: 'tea', action: 'pour', ingredient: 'tea', target: 150, instruction: 'Nghiêng bình rót 150 ml trà vào ly.' },
    { id: 'syrup', action: 'pour', ingredient: 'syrup', target: 15, instruction: 'Nghiêng chai siro đường rót đúng khoảng ngọt.' },
    { id: 'ice', action: 'ice', target: 3, instruction: 'Xúc 90 g đá (3 viên) thả vào ly.' },
    { id: 'stir', action: 'stir', target: Math.PI * 3, instruction: 'Khuấy vòng tròn trong ly cho trà tắc hòa quyện.', minimumProgress: 0.2 },
  ],
  visual: { capacity: 260, color: 0xd89b38, glass: 'glass', tratac: true },
  unlock: { day: 3 },
});
RECIPES.tradao = defineRecipe({
  id: 'tradao', name: 'Trà đào cam sả', short: 'Trà đào', price: 25000, engine: 'gesture',
  color: 0xd97d2e,
  hint: 'Cắt 1 quả cam (vắt 30 ml nước + 1 lát cam) · đập 1 nhánh sả · gắp đào · 140 ml trà · 20 ml siro đào · 90 g đá',
  equipment: ['glass', 'board', 'knife', 'squeezer', 'orange-cup', 'tongs', 'tea-pitcher', 'peach-syrup', 'ice-scoop'],
  ingredients: [
    { id: 'tea', target: 140, unit: 'ml', label: '140 ml' },
    { id: 'peach', target: 2, unit: 'miếng', label: '2 miếng (hoặc 3 miếng khi nhiều đào)' },
    { id: 'orangeJuice', target: 30, unit: 'ml', label: '30 ml (vắt từ ½ quả cam)' },
    { id: 'orange', target: 1, unit: 'miếng', label: '1 lát cam tươi (từ cùng quả cam)' },
    { id: 'lemongrass', target: 1, unit: 'nhánh', label: '1 nhánh sả đập dập' },
    { id: 'peachSyrup', target: 20, unit: 'ml', label: '20 ml' },
    { id: 'ice', target: 3, unit: 'viên', label: '90 g (3 viên)' },
  ],
  supplies: { tea: 140, peach: 0.5, orange: 1, lemongrass: 1, peachSyrup: 20, ice: 1 },
  steps: [
    { id: 'orange-cut', action: 'slice', target: 1, instruction: 'Đặt 1 quả cam lên thớt, vuốt cắt đôi thành phần vắt & lát cam decor.' },
    { id: 'orange-squeeze', action: 'squeeze', target: 30, instruction: 'Nhấn & kéo ép nửa quả cam lấy 30 ml nước cam tươi.' },
    { id: 'lemongrass-prep', action: 'press', target: 1, instruction: 'Đặt nhánh sả lên thớt, nhấn & lăn nhẹ cho dậy hương rồi cho vào ly.' },
    { id: 'lemongrass', action: 'place', ingredient: 'lemongrass', target: 1, instruction: 'Kéo nhánh sả đã đập dập vào ly.' },
    { id: 'peach', action: 'scoop', ingredient: 'peach', target: 2, instruction: 'Dùng kẹp gắp từng miếng đào ngâm thả vào ly.' },
    { id: 'tea', action: 'pour', ingredient: 'tea', target: 140, instruction: 'Nghiêng bình rót 140 ml trà vàng óng vào ly.' },
    { id: 'peachSyrup', action: 'pour', ingredient: 'peachSyrup', target: 20, instruction: 'Rót 20 ml siro đào vào ly.' },
    { id: 'orangeJuice', action: 'pour', ingredient: 'orangeJuice', target: 30, instruction: 'Rót 30 ml nước cam đã vắt vào ly.' },
    { id: 'ice', action: 'ice', target: 3, instruction: 'Xúc 90 g đá (3 viên) thả vào ly.' },
    { id: 'orange-garnish', action: 'garnish', ingredient: 'orange', target: 1, instruction: 'Kéo lát cam tươi từ thớt lên miệng ly trang trí.' },
  ],
  visual: { capacity: 270, color: 0xd97d2e, glass: 'glass', tradao: true },
  unlock: { day: 4 },
});
RECIPES.travai = defineRecipe({
  id: 'travai', name: 'Trà vải', short: 'Trà vải', price: 24000, engine: 'gesture',
  color: 0xe2ae55,
  hint: 'Múc 2 trái vải ngâm · 20 ml siro vải · 150 ml trà ủ sẵn · 90 g đá · trang trí tùy chọn',
  equipment: ['glass', 'lychee-scoop', 'lychee-syrup', 'tea-pitcher', 'ice-scoop', 'stir'],
  ingredients: [
    { id: 'tea', target: 150, unit: 'ml', label: '150 ml' },
    { id: 'lychee', target: 2, unit: 'quả', label: '2 trái (hoặc 3 trái khi nhiều vải)' },
    { id: 'lycheeSyrup', target: 20, unit: 'ml', label: '20 ml (10 ml khi ít ngọt)' },
    { id: 'ice', target: 3, unit: 'viên', label: '90 g (3 viên, 4 viên khi nhiều đá)' },
  ],
  supplies: { tea: 150, lychee: 0.5, lycheeSyrup: 20, ice: 1 },
  steps: [
    { id: 'lychee', action: 'scoop', ingredient: 'lychee', target: 2, instruction: 'Kéo muỗng múc vải từ lon thả vào ly.' },
    { id: 'lycheeSyrup', action: 'pour', ingredient: 'lycheeSyrup', target: 20, instruction: 'Nghiêng bình siro vải rót đúng vạch ngọt.' },
    { id: 'tea', action: 'pour', ingredient: 'tea', target: 150, instruction: 'Nghiêng bình rót 150 ml trà vàng nhạt vào ly.' },
    { id: 'ice', action: 'ice', target: 3, instruction: 'Xúc 90 g đá (3 viên) thả vào ly.' },
    { id: 'stir', action: 'stir', target: Math.PI * 2, instruction: 'Khuấy nhẹ hoặc gắn vải trang trí miệng ly để hoàn tất.', minimumProgress: 0 },
  ],
  visual: { capacity: 270, color: 0xe2ae55, glass: 'glass', travai: true },
  unlock: { day: 4 },
});
RECIPES.cacao = defineRecipe({
  id: 'cacao', name: 'Cacao sữa đá', short: 'Cacao sữa', price: 22000, engine: 'gesture',
  color: 0x6b3e26,
  hint: 'Múc 15 g bột cacao · 30 ml nước nóng · khuấy tan vón cục · 15 ml sữa đặc · 100 ml sữa tươi · 90 g đá',
  equipment: ['glass', 'cacao-spoon', 'kettle', 'stir', 'condensed', 'milk', 'ice-scoop'],
  ingredients: [
    { id: 'cacao', target: 15, unit: 'g', label: '15 g (3 muỗng 5 g)' },
    { id: 'water', target: 30, unit: 'phần', label: '30 ml nước nóng' },
    { id: 'condensed', target: 15, unit: 'phần', label: '15 ml (1 phần)' },
    { id: 'milk', target: 100, unit: 'phần', label: '100 ml (2 phần)' },
    { id: 'ice', target: 3, unit: 'viên', label: '90 g (3 viên)' },
  ],
  supplies: { cacao: 15, condensed: 1, milk: 2, ice: 1 },
  steps: [
    { id: 'cacao', action: 'scoop', ingredient: 'cacao', target: 15, instruction: 'Dùng muỗng đong 5 g múc bột cacao thả vào ly (3 lần = 15 g).' },
    { id: 'water', action: 'pour', ingredient: 'water', target: 30, instruction: 'Kéo ấm nước nóng nghiêng rót 30 ml làm ướt bột cacao.' },
    { id: 'stir', action: 'stir', target: Math.PI * 3.2, instruction: 'Kéo muỗng khuấy xoay vòng tròn cho bột cacao tan hết vón cục.', minimumProgress: 0.25 },
    { id: 'condensed', action: 'pour', ingredient: 'condensed', target: 15, instruction: 'Nghiêng lon rót 15 ml sữa đặc vào cacao đã hòa tan.' },
    { id: 'milk', action: 'pour', ingredient: 'milk', target: 100, instruction: 'Nghiêng bình rót 100 ml sữa tươi hòa quyện.' },
    { id: 'ice', action: 'ice', target: 3, instruction: 'Xúc 90 g đá (3 viên) thả vào ly cacao sữa đá.' },
  ],
  visual: { capacity: 250, color: 0x6b3e26, glass: 'glass', cacao: true },
  unlock: { day: 5 },
});
RECIPES.matcha = defineRecipe({
  id: 'matcha', name: 'Matcha latte đá', short: 'Matcha latte', price: 28000, engine: 'gesture',
  color: 0x5c8e3e,
  hint: 'Múc 4 g bột matcha vào bát · 40 ml nước ấm · đánh chổi tre chữ W tạo bọt mịn · 90 g đá · 150 ml sữa tươi (+ 10 ml siro đường) · rót matcha lên mặt',
  equipment: ['glass', 'matcha-spoon', 'kettle', 'chasen', 'matcha-bowl', 'milk', 'syrup', 'ice-scoop'],
  ingredients: [
    { id: 'matcha', target: 4, unit: 'g', label: '4 g (2 muỗng tre 2 g)' },
    { id: 'water', target: 40, unit: 'phần', label: '40 ml nước ấm' },
    { id: 'milk', target: 150, unit: 'phần', label: '150 ml (3 phần)' },
    { id: 'syrup', target: 10, unit: 'ml', label: '10 ml siro đường (ít ngọt)' },
    { id: 'ice', target: 3, unit: 'viên', label: '90 g (3 viên)' },
  ],
  supplies: { matcha: 4, milk: 3, ice: 1, syrup: 10 },
  steps: [
    { id: 'matcha', action: 'scoop', ingredient: 'matcha', target: 4, instruction: 'Dùng muỗng tre múc 4 g bột matcha (2 muỗng × 2 g) thả vào bát đánh.' },
    { id: 'water', action: 'pour', ingredient: 'water', target: 40, instruction: 'Kéo ấm nước ấm nghiêng rót 40 ml vào bát matcha.' },
    { id: 'whisk', action: 'whisk', target: 680, instruction: 'Kéo chổi tre chasen vào bát, đánh qua lại hình chữ W cho tan vón cục và lên bọt mịn.', minimumProgress: 0.25 },
    { id: 'ice', action: 'ice', target: 3, instruction: 'Xúc 90 g đá (3 viên) thả vào ly.' },
    { id: 'milk', action: 'pour', ingredient: 'milk', target: 150, instruction: 'Nghiêng bình rót 150 ml sữa tươi vào ly đá.' },
    { id: 'syrup', action: 'pour', ingredient: 'syrup', target: 10, instruction: 'Nghiêng chai siro đường rót 10 ml (theo độ ngọt khách dặn).', required: false },
    { id: 'pourMatcha', action: 'pour', ingredient: 'matcha', target: 4, instruction: 'Nghiêng bát matcha đã đánh bông rót nhẹ lên lớp sữa tươi tạo 2 tầng xanh – trắng.' },
  ],
  visual: { capacity: 280, color: 0x5c8e3e, glass: 'glass', matcha: true },
  unlock: { day: 6 },
});
// Recipes whose phin drips into a per-cup pitcher, poured by hand after other preparation.
export const PITCHER_RECIPES = Object.freeze(['muoi', 'cotdua']);
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
