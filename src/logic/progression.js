import { RECIPES } from '../config.js';
export const ACHIEVEMENTS = [
  { id: 'first', name: 'Ly cà phê đầu tiên', description: 'Phục vụ thành công 1 ly.', test: (d) => d.stats.served >= 1 },
  { id: 'perfect10', name: 'Phù thủy pha phin', description: 'Tích lũy 10 ly Perfect.', test: d => d.stats.perfect >= 10 },
  { id: 'served50', name: 'Khách quen của phố', description: 'Phục vụ 50 khách.', test: d => d.stats.served >= 50 },
  { id: 'rush', name: 'Ông hoàng giờ cao điểm', description: 'Có phục vụ trong cao điểm, không mất khách lúc đó.', test: (d, s) => s.rushServed > 0 && s.rushLost === 0 && s.elapsed >= 112.5 },
  { id: 'five', name: 'Quán ruột 5 sao', description: 'Ngày ≥ 4,8 sao và phục vụ ít nhất 5 khách.', test: (d, s) => s.served >= 5 && s.rating >= 4.8 },
  { id: 'stars3', name: 'Ba sao rực rỡ', description: 'Đạt đủ 3 ★ mục tiêu trong một ngày.', test: (d, s) => s.stars >= 3 },
  { id: 'speedy', name: 'Tay pha thần tốc', description: '5 ly “Nhanh tay” trong một ngày.', test: (d, s) => s.fastServes >= 5 },
  { id: 'wealth', name: 'Đại gia vỉa hè', description: 'Tích lũy 500.000đ thu nhập, trước chi nâng cấp.', test: d => d.stats.lifetimeEarnings >= 500000 },
];
export const STORIES = {
  driver: { name: 'Chú Ba', chapters: ['Chú chạy từ lúc trời chưa sáng. Dành dụm chút, sửa chiếc xe cũ cho êm.', 'Mấy bữa nay nhiều khách quen gọi chú. Hũ tiền mua xe cũng đầy thêm rồi!', 'Chú mua được xe mới rồi! Ly cà phê sáng ở đây vẫn là món chú không đổi.'] },
  office: { name: 'Lan', chapters: ['Hôm nay lại họp sớm. May có góc quán này để thở một chút.', 'Dự án khó nhất cũng gần xong. Cả đội khen bản thuyết trình của chị đó!', 'Chị được thăng chức rồi! Sáng mai dẫn đồng nghiệp tới uống mừng nha.'] },
  student: { name: 'Minh', chapters: ['Em ôn thi mấy hôm rồi. Ngồi góc này học bài thấy dễ nhớ hơn.', 'Bài thi thử tốt lên rồi! Cảm ơn quán đã cho em một góc yên tĩnh.', 'Em đậu rồi! Học bổng nữa cô ơi. Ly hôm nay ngon hơn mọi ngày!'] },
};
export const emptyRecipes = () => Object.fromEntries(Object.keys(RECIPES).map(id => [id, 0]));
export const emptyStories = () => Object.fromEntries(Object.keys(STORIES).map(id => [id, { encounters: 0, chapter: 0, lastDay: 0 }]));
export function storyAfter(story, day) {
  const next = { ...story, encounters: story.encounters + (story.lastDay === day ? 0 : 1), lastDay: day };
  if (next.chapter < 3 && day >= [2, 4, 7][next.chapter] && next.encounters >= [1, 3, 5][next.chapter]) next.chapter++;
  return next;
}
export function mastery(count) { return count >= 30 ? 'Bậc thầy' : count >= 15 ? 'Giỏi' : count >= 5 ? 'Khá' : 'Mới học'; }
export function challengeProgress(challenge, s) {
  if (!challenge) return { value: 0, target: 0, complete: false };
  const value = challenge.kind === 'recipe' ? s.recipes?.[challenge.recipe] || 0
    : challenge.kind === 'combo' ? s.bestCombo : challenge.kind === 'noLoss' ? (s.ended && s.lost === 0 && s.served >= challenge.target ? challenge.target : Math.min(s.served, challenge.target - 1)) : s[challenge.kind] || 0;
  return { value, target: challenge.target, complete: value >= challenge.target && (challenge.kind !== 'noLoss' || s.lost === 0) };
}
