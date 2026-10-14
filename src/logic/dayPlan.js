import { unlockedRecipes, RECIPES } from '../config.js';
import { difficulty } from './upgrades.js';
export const EVENTS = {
  rain: { name: 'Mưa đầu hẻm', description: 'Khách đến thưa hơn 25% · tip +20%' },
  reviewer: { name: 'Người sành cà phê', description: 'Reviewer ghé quán · Perfect thưởng 10.000đ và 5 sao' },
  outage: { name: 'Phố tạm mất điện', description: '07:00 mất điện 30 giây · phin vẫn nhỏ bình thường' },
  festival: { name: 'Lễ hội góc phố', description: 'Khách đến nhanh hơn 15% · vẫn đủ ghế mới nhận' },
  lucky: { name: 'Buổi sáng may mắn', description: 'Mỗi ly cà phê, thêm một niềm vui · tip +25%' },
};
export const VIPS = [
  { id: 'reviewer', name: 'Cô An · Reviewer', role: 'Người đánh giá', color: 0x806791, hair: 0x30272e, patience: 110, line: 'Tôi đi tìm hương vị phin thật khéo. Cho tôi thử một ly nhé!', happy: 'Một quán nhỏ đáng ghi vào sổ!', angry: 'Tiếc quá, hẹn lần đánh giá sau.' },
  { id: 'celebrity', name: 'Anh Khoa · VIP', role: 'Ca sĩ khu phố', color: 0x437b91, hair: 0x262630, patience: 105, line: 'Hát ở lễ hội xong, ghé quán mình nạp năng lượng!', happy: 'Mai anh rủ cả ban nhạc ghé!', angry: 'Anh phải ra sân khấu rồi.' },
  { id: 'creator', name: 'Vy · Sáng tạo', role: 'Nhà sáng tạo', color: 0xbd6784, hair: 0x683929, patience: 100, line: 'Góc quán xinh quá! Em quay một buổi sáng pha phin nhé.', happy: 'Clip hôm nay thơm mùi cà phê!', angry: 'Em phải đi quay chỗ khác rồi.' },
];
export function seededRandom(seed) { let state = seed >>> 0; return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function createDayPlan(day, upgrades, seed) {
  const random = seededRandom(seed);
  let event = null;
  const eligible = ['rain', 'reviewer', 'lucky', ...(upgrades.fan ? ['outage'] : []), ...(day >= 5 ? ['festival'] : [])];
  if (day >= 3 && random() < 0.35) event = eligible[Math.floor(random() * eligible.length)];
  const vip = event === 'reviewer' ? 'reviewer' : day >= 4 && random() < 0.25 ? VIPS[1 + Math.floor(random() * 2)].id : null;
  const diff = difficulty(day, upgrades), recipes = unlockedRecipes(day, upgrades);
  // Conservative reachable orders: includes manual prep + limited simultaneous capacity.
  const interval = diff.normalInterval * (event === 'rain' ? 1.25 : event === 'festival' ? 0.85 : 1);
  const expected = Math.max(3, Math.min(Math.floor(157.5 / interval) + 1, diff.capacity * 3));
  const target = Math.min(day < 3 ? 3 : day < 6 ? 4 : 5, expected - 1);
  const level = day < 3 ? 0 : day < 6 ? 1 : 2, reward = [5000, 10000, 15000][level];
  const recipe = recipes[Math.floor(random() * recipes.length)];
  const recipeTarget = Math.max(1, Math.min(2, Math.floor(expected / recipes.length)));
  const choices = [
    { kind: 'served', target, label: `Phục vụ ${target} khách` },
    { kind: 'combo', target: Math.min(target, 3 + level), label: `Đạt combo ×${Math.min(target, 3 + level)}` },
    { kind: 'perfect', target: Math.min(target, 2 + level), label: `Pha ${Math.min(target, 2 + level)} ly Perfect` },
    { kind: 'revenue', target: target * 12000, label: `Bán ${target * 12}.000đ cà phê` },
    { kind: 'recipe', recipe, target: recipeTarget, label: `Phục vụ ${recipeTarget} ${RECIPES[recipe].short.toLowerCase()}` },
    { kind: 'noLoss', target: Math.min(target, 3), label: `Ít nhất ${Math.min(target, 3)} khách, không ai bỏ về` },
  ];
  return { day, seed: seed >>> 0, event, vip, vipAt: 1, expectedOrders: expected, challenge: { ...choices[Math.floor(random() * choices.length)], reward } };
}
