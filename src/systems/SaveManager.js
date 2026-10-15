import { normalizeUpgrades, quoteUpgrade } from '../logic/upgrades.js';
import { createDayPlan, EVENTS, VIPS } from '../logic/dayPlan.js';
import { ACHIEVEMENTS, emptyRecipes, emptyStories, storyAfter, challengeProgress } from '../logic/progression.js';
import { INGREDIENTS, INITIAL_INVENTORY, emptyIngredientTotals, normalizeInventory, createSupplyPlan, ingredientValue } from '../logic/inventory.js';
export const SAVE_KEY = 'phin-goc-pho:v3';
export const PREVIOUS_KEY = 'phin-goc-pho:v2';
export const LEGACY_KEY = 'phin-goc-pho:v1';
export const freshSave = () => ({ version: 3, day: 1, balance: 0, ratingSum: 20, ratingCount: 5, tutorialDone: false,
  upgrades: normalizeUpgrades(), dayPlan: null, lastCommittedDay: 0, achievements: [], stories: emptyStories(), mastery: emptyRecipes(),
  inventory: normalizeInventory(INITIAL_INVENTORY), ingredientsUsed: emptyIngredientTotals(),
  stats: { served: 0, lost: 0, perfect: 0, bestCombo: 0, lifetimeRevenue: 0, lifetimeTips: 0, lifetimeBonuses: 0, lifetimeEarnings: 0, upgradeExpenses: 0, ingredientExpenses: 0, bestDay: 0, sessions: 0, totalStars: 0, threeStarDays: 0 },
  settings: { sound: true, music: true, reducedMotion: false } });
const safeNumber = (n, fallback = 0) => Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER ? n : fallback;
const integer = (n, fallback = 0) => Math.floor(safeNumber(n, fallback));
function normalize(parsed) {
  if (!parsed || ![1, 2, 3].includes(parsed.version)) throw new Error('version');
  const base = freshSave(), legacy = parsed.version === 1, current = parsed.version === 3;
  const data = { ...base, day: Math.max(1, integer(parsed.day, 1)), balance: integer(parsed.balance),
    ratingSum: safeNumber(parsed.ratingSum, 20), ratingCount: Math.max(1, safeNumber(parsed.ratingCount, 5)), tutorialDone: parsed.tutorialDone === true,
    settings: { sound: parsed.settings?.sound !== false, music: parsed.settings?.music !== false, reducedMotion: parsed.settings?.reducedMotion === true },
    upgrades: normalizeUpgrades(parsed.upgrades, legacy),
    inventory: current ? normalizeInventory(parsed.inventory) : normalizeInventory(INITIAL_INVENTORY),
    ingredientsUsed: current ? normalizeInventory(parsed.ingredientsUsed, emptyIngredientTotals()) : emptyIngredientTotals() };
  for (const key of Object.keys(data.stats)) data.stats[key] = integer(parsed.stats?.[key]);
  // V1 recorded sales, but not tip/bonus history. Preserve the known sales baseline only.
  if (legacy) data.stats.lifetimeEarnings = data.stats.lifetimeRevenue;
  if (!legacy) {
    for (const key of Object.keys(data.mastery)) data.mastery[key] = integer(parsed.mastery?.[key]);
    for (const key of Object.keys(data.stories)) {
      const s = parsed.stories?.[key];
      data.stories[key] = { encounters: integer(s?.encounters), chapter: Math.min(3, integer(s?.chapter)), lastDay: Math.min(data.day, integer(s?.lastDay)) };
    }
    data.achievements = [...new Set((Array.isArray(parsed.achievements) ? parsed.achievements : []).filter(id => ACHIEVEMENTS.some(a => a.id === id)))];
    data.lastCommittedDay = Math.min(data.day - 1, integer(parsed.lastCommittedDay));
    const p = parsed.dayPlan;
    if (p?.day === data.day && Number.isInteger(p.seed) && p.seed >= 0) {
      const c = p.challenge;
      const validChallenge = c && ['served', 'combo', 'perfect', 'revenue', 'recipe', 'noLoss'].includes(c.kind) && Number.isInteger(c.target) && c.target > 0 && c.target <= 1000000 && [5000, 10000, 15000].includes(c.reward) && typeof c.label === 'string' && c.label.length <= 100 && (c.kind !== 'recipe' || Object.hasOwn(data.mastery, c.recipe));
      if (validChallenge && (p.event === null || Object.hasOwn(EVENTS, p.event)) && (p.vip === null || VIPS.some(v => v.id === p.vip))) {
        data.dayPlan = { day: p.day, seed: p.seed >>> 0, event: p.event, vip: p.vip, vipAt: 1, expectedOrders: Math.min(12, Math.max(3, integer(p.expectedOrders, 6))), challenge: { kind: c.kind, target: c.target, reward: c.reward, label: c.label, ...(c.kind === 'recipe' ? { recipe: c.recipe } : {}) } };
      }
    }
  }
  return data;
}
export class SaveManager {
  constructor(storage) {
    this.available = true; this.warning = ''; this.inShift = false;
    try { this.storage = storage === undefined ? window.localStorage : storage; }
    catch { this.available = false; this.warning = 'Không thể lưu trên trình duyệt này.'; }
    this.data = this.load();
    if (this.migrated) this.write(); // Keep v1 as a recovery copy even after successful migration.
  }
  load() {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (raw) {
        try { const parsed = JSON.parse(raw); const data = normalize(parsed); this.migrated = parsed.version !== 3; return data; }
        catch { this.warning = 'Bản lưu mới bị hỏng; đang tìm bản dự phòng.'; }
      }
      const previous = this.storage?.getItem(PREVIOUS_KEY);
      if (previous) {
        try { const parsed = JSON.parse(previous); if (parsed.version !== 2) throw new Error('previous'); this.migrated = true; return normalize(parsed); }
        catch { this.warning = 'Bản lưu v2 bị hỏng; đang tìm bản dự phòng cũ.'; }
      }
      const legacy = this.storage?.getItem(LEGACY_KEY);
      if (legacy) { const parsed = JSON.parse(legacy); if (parsed.version !== 1) throw new Error('legacy'); this.migrated = true; return normalize(parsed); }
      return freshSave();
    } catch { this.warning = 'Dữ liệu lưu không đọc được. Đã tạo tiến trình an toàn.'; return freshSave(); }
  }
  write() {
    try {
      if (!this.storage) throw new Error('storage unavailable');
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data)); this.available = true; return true;
    } catch { this.available = false; this.warning = 'Không thể lưu. Tiến trình chỉ giữ trong phiên này.'; return false; }
  }
  prepareDay(seed = Math.floor(Math.random() * 4294967296)) {
    if (!this.data.dayPlan || this.data.dayPlan.day !== this.data.day) {
      this.data.dayPlan = createDayPlan(this.data.day, this.data.upgrades, seed); this.write();
    }
    return structuredClone(this.data.dayPlan);
  }
  beginDay() { const plan = this.prepareDay(); this.inShift = true; this.data.stats.sessions++; this.write(); return plan; }
  purchase(key, expectedCurrent) {
    if (this.inShift) return { ok: false, message: 'Chỉ mua nâng cấp khi quán đã nghỉ ca.' };
    const q = quoteUpgrade(this.data.upgrades, key);
    if (!q || q.current !== expectedCurrent) return { ok: false, message: 'Nâng cấp đã thay đổi hoặc đạt tối đa.' };
    if (this.data.balance < q.price) return { ok: false, message: 'Chưa đủ tiền. Mình pha thêm vài ly nhé!' };
    const next = structuredClone(this.data);
    next.balance -= q.price; next.upgrades[key] = q.next; next.stats.upgradeExpenses += q.price;
    this.data = next; const saved = this.write();
    return { ok: true, saved, price: q.price, message: saved ? 'Đã sắm đồ mới cho quán!' : this.warning };
  }
  purchaseIngredient(id, expectedQuantity) {
    if (this.inShift) return { ok: false, message: 'Chỉ nhập nguyên liệu khi quán đã nghỉ ca.' };
    const spec = INGREDIENTS[id], current = this.data.inventory[id];
    if (!spec || !Number.isFinite(expectedQuantity) || Math.abs(current - expectedQuantity) > 1e-6) return { ok: false, message: 'Tồn kho vừa thay đổi. Mình kiểm tra lại nhé.' };
    if (current + spec.pack > Math.max(999, spec.pack * 6)) return { ok: false, message: 'Kho nguyên liệu này đã đầy.' };
    if (this.data.balance < spec.price) return { ok: false, message: 'Quỹ quán chưa đủ để nhập gói này.' };
    const next = structuredClone(this.data);
    next.balance -= spec.price; next.inventory[id] = Math.min(Math.max(999, spec.pack * 6), next.inventory[id] + spec.pack); next.stats.ingredientExpenses += spec.price;
    this.data = next; const saved = this.write();
    return { ok: true, saved, price: spec.price, quantity: spec.pack, message: saved ? `Đã nhập ${spec.pack} ${spec.unit} ${spec.name.toLowerCase()}.` : this.warning };
  }
  supplyPlan() {
    const plan = this.prepareDay();
    return createSupplyPlan(this.data.inventory, this.data.day, plan.expectedOrders, this.data.upgrades);
  }
  purchaseSupplyPlan(expectedInventory) {
    if (this.inShift) return { ok: false, message: 'Chỉ nhập nguyên liệu khi quán đã nghỉ ca.' };
    const expected = normalizeInventory(expectedInventory, emptyIngredientTotals());
    if (Object.keys(INGREDIENTS).some(id => Math.abs(expected[id] - this.data.inventory[id]) > 1e-6)) return { ok: false, message: 'Tồn kho vừa thay đổi. Mình tính lại ca tới nhé.' };
    const plan = this.supplyPlan();
    if (!plan.items.length) return { ok: false, message: 'Kho đã đủ cho ca tới và một lượt pha dự phòng.' };
    if (this.data.balance < plan.price) return { ok: false, message: `Cần thêm ${(plan.price - this.data.balance).toLocaleString('vi-VN')}đ để nhập đủ ca tới.` };
    const next = structuredClone(this.data);
    next.balance -= plan.price; next.stats.ingredientExpenses += plan.price;
    for (const item of plan.items) next.inventory[item.id] = Math.min(Math.max(999, INGREDIENTS[item.id].pack * 6), next.inventory[item.id] + item.quantity);
    this.data = next; const saved = this.write();
    return { ok: true, saved, price: plan.price, items: plan.items, message: saved ? 'Đã nhập đủ nguyên liệu dự kiến cho ca tới!' : this.warning };
  }
  completeDay(summary) {
    if (summary.tutorial) { this.data.tutorialDone = true; return this.write(); }
    if (summary.day !== this.data.day || this.data.lastCommittedDay >= summary.day) return false;
    const d = structuredClone(this.data), s = summary;
    const reward = challengeProgress(d.dayPlan?.challenge, { ...s, ended: true }).complete ? d.dayPlan.challenge.reward : 0;
    const income = integer(s.revenue) + integer(s.tips) + integer(s.bonuses) + reward;
    const used = normalizeInventory(s.ingredients?.used, emptyIngredientTotals());
    const wasted = normalizeInventory(s.ingredients?.wasted, emptyIngredientTotals());
    for (const id of Object.keys(INGREDIENTS)) {
      used[id] = Math.min(used[id], d.inventory[id]);
      wasted[id] = Math.min(wasted[id], used[id]);
    }
    d.balance += income; d.day++; d.lastCommittedDay = s.day;
    const ratings = (s.ratings || []).filter(n => Number.isFinite(n) && n >= 0 && n <= 5);
    d.ratingSum += ratings.reduce((sum, n) => sum + n, 0); d.ratingCount += ratings.length;
    for (const key of ['served', 'lost', 'perfect']) d.stats[key] += integer(s[key]);
    d.stats.lifetimeRevenue += integer(s.revenue); d.stats.lifetimeTips += integer(s.tips); d.stats.lifetimeBonuses += integer(s.bonuses) + reward;
    d.stats.lifetimeEarnings += income;
    for (const id of Object.keys(INGREDIENTS)) { d.inventory[id] = Math.max(0, d.inventory[id] - used[id]); d.ingredientsUsed[id] += used[id]; }
    const stars = Math.min(3, integer(s.stars));
    summary.newRecord = income > d.stats.bestDay && d.stats.sessions > 1;
    d.stats.totalStars += stars; if (stars === 3) d.stats.threeStarDays++;
    d.stats.bestCombo = Math.max(d.stats.bestCombo, integer(s.bestCombo)); d.stats.bestDay = Math.max(d.stats.bestDay, income);
    for (const id of Object.keys(d.mastery)) d.mastery[id] += integer(s.recipes?.[id]);
    for (const id of new Set(s.storyEncounters || [])) if (d.stories[id]) d.stories[id] = storyAfter(d.stories[id], s.day);
    const unlocked = ACHIEVEMENTS.filter(a => !d.achievements.includes(a.id) && a.test(d, s)).map(a => a.id);
    d.achievements.push(...unlocked); d.dayPlan = null;
    this.data = d; this.inShift = false;
    summary.challengeReward = reward; summary.earnings = income; summary.unlocked = unlocked;
    summary.ingredientCost = ingredientValue(used); summary.wasteCost = ingredientValue(wasted);
    summary.grossProfit = income - summary.ingredientCost;
    return this.write();
  }
  reset() { this.data = freshSave(); this.inShift = false; this.write(); }
  settings(patch) { for (const key of Object.keys(this.data.settings)) if (typeof patch[key] === 'boolean') this.data.settings[key] = patch[key]; this.write(); }
  get reputation() { return Math.min(5, this.data.ratingSum / this.data.ratingCount); }
}
