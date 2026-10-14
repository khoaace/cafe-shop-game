export const INITIAL_UPGRADES = { phins: 1, seats: 3, premium: false, fan: false, decor: false };
export const UPGRADES = {
  phins: { name: 'Thêm phin nhôm', icon: 'phin', min: 1, max: 4, prices: [25000, 50000, 85000], description: 'Một trạm độc lập. Tối đa 4 phin, hai trang bàn pha.' },
  seats: { name: 'Thêm ghế nhựa', icon: 'seat', min: 3, max: 6, prices: [30000, 45000, 65000], description: 'Thêm chỗ đón khách. Tối đa 6 ghế, hai hàng.' },
  premium: { name: 'Sữa đặc cao cấp', icon: 'condensed', price: 20000, description: 'Tip sữa đá và bạc xỉu tăng 20%. Vẫn tự tay rót.' },
  fan: { name: 'Quạt mát góc phố', icon: 'fan', price: 15000, description: 'Khách mất kiên nhẫn chậm hơn 15% khi có điện.' },
  decor: { name: 'Chút xanh, chút đèn', icon: 'plant', price: 40000, description: 'Mỗi đơn đúng thêm 0,1 sao, tối đa 5 sao.' },
};
export function normalizeUpgrades(raw = {}, legacy = false) {
  const value = (key, min, max) => Number.isFinite(raw?.[key]) ? Math.max(min, Math.min(max, Math.floor(raw[key]))) : min;
  return { phins: legacy ? 2 : value('phins', 1, 4), seats: value('seats', 3, 6), premium: raw?.premium === true, fan: raw?.fan === true, decor: raw?.decor === true };
}
export function quoteUpgrade(upgrades, key) {
  const spec = UPGRADES[key];
  if (!spec) return null;
  const current = upgrades[key];
  if (spec.prices) return current >= spec.max ? null : { key, current, next: current + 1, price: spec.prices[current - spec.min] };
  return current ? null : { key, current: false, next: true, price: spec.price };
}
export function difficulty(day, upgrades) {
  const tier = day <= 2 ? 0 : day <= 5 ? 1 : day <= 9 ? 2 : 3;
  return { tier, capacity: Math.min(upgrades.seats, upgrades.phins * 2, [2, 3, 4, 6][tier]), normalInterval: [30, 28, 26, 24][tier], rushInterval: [24, 23, 21, 19][tier] };
}
