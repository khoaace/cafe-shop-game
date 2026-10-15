import { RULES, clockText } from '../config.js';

// 06:00–10:00 (240 in-game minutes) plays in RULES.daySeconds real seconds.
export const GAME_MINUTES_PER_SECOND = 240 / RULES.daySeconds;

// Announced moments of a shift, in real seconds since opening.
export const DAY_MILESTONES = [
  { id: 'rushSoon', at: RULES.rushStart - 10, message: `${clockText(RULES.rushStart)} là giờ cao điểm — chuẩn bị sẵn ly và phin nhé!` },
  { id: 'rushEnd', at: RULES.rushEnd, message: `${clockText(RULES.rushEnd)} · Hết giờ cao điểm, khách thưa dần.` },
  { id: 'lastCall', at: RULES.lastArrival, message: `${clockText(RULES.lastArrival)} · Quán ngừng đón khách mới. Phục vụ nốt những ly cuối nhé!` },
  { id: 'closingSoon', at: RULES.daySeconds - 15, message: 'Còn 15 giây nữa là đóng cửa!' },
];

// Milestones whose moment lies in (before, after]; each fires once per shift.
export function milestonesCrossed(before, after) {
  return DAY_MILESTONES.filter(m => before < m.at && after >= m.at);
}

// Whole seconds left for the final on-screen countdown (5…1), otherwise null.
export function finalCountdown(elapsed, from = 5) {
  const left = Math.ceil(RULES.daySeconds - elapsed);
  return left >= 1 && left <= from ? left : null;
}

export function dayProgress(elapsed) {
  return Math.max(0, Math.min(1, elapsed / RULES.daySeconds));
}
