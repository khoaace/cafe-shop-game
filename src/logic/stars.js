// Three independent daily goals give every shift a clear, visible target (1–3 ★).
export function starGoals(plan) {
  const expected = Math.max(3, Math.floor(plan?.expectedOrders || 3));
  const served = Math.max(2, Math.ceil(expected * 0.5));
  return [
    { id: 'served', label: `Phục vụ ${served} khách`, short: `${served} khách`, target: served },
    { id: 'earnings', label: `Thu ${(served * 15).toLocaleString('vi-VN')}.000đ`, short: `${served * 15}k`, target: served * 15000 },
    { id: 'noLoss', label: 'Không ai bỏ về', short: 'Không ai bỏ về', target: 1 },
  ];
}

// `final` marks the shift as closed: "no one left" can only be confirmed at the end.
export function goalProgress(goal, s, final = false) {
  if (goal.id === 'served') return { value: Math.min(s.served, goal.target), complete: s.served >= goal.target };
  if (goal.id === 'earnings') return { value: Math.min(s.earnings, goal.target), complete: s.earnings >= goal.target };
  const complete = s.lost === 0 && s.served >= 1;
  return { value: complete ? 1 : 0, complete: final && complete, failed: s.lost > 0 };
}

export function dayStars(goals, s, final = true) {
  const results = goals.map(goal => ({ ...goal, ...goalProgress(goal, s, final) }));
  return { stars: results.filter(r => r.complete).length, results };
}

export const SPEED_BONUS = { ratio: 0.7, rate: 0.1 };
export function speedBonus(price, ratio, tutorial = false) {
  if (tutorial || !(ratio >= SPEED_BONUS.ratio)) return 0;
  return Math.round(price * SPEED_BONUS.rate / 100) * 100;
}
