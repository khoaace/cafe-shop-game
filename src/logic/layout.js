const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function gameLayout(width = 480, height = 800, enabled = true) {
  if (!enabled || width < 1024 || height < 640) return { desktop: false, width: 480, height: 800, trash: { x: 406, y: 589, w: 74, h: 48 } };
  const pad = width >= 1440 ? 24 : 16, gap = pad;
  const customers = { x: pad, y: 80, w: width - pad * 2, h: clamp(height * 0.23, 160, 240) };
  const top = customers.y + customers.h + gap, bottom = height - pad;
  const toolWidth = clamp(width * 0.38, 440, 640);
  const tools = { x: width - pad - toolWidth, y: top, w: toolWidth, h: bottom - top };
  const board = { x: pad, y: top, w: tools.x - gap - pad, h: bottom - top };
  const tabs = { x: tools.x + 12, y: top + 44, w: tools.w - 24, h: 86 };
  const preparation = { x: tools.x + 16, y: top + 148, w: tools.w - 32, h: clamp(tools.h * 0.25, 112, 160) };
  const itemGrid = { x: tools.x + 12, y: preparation.y + preparation.h + 16, w: tools.w - 24, h: 0 };
  itemGrid.h = Math.max(144, bottom - 16 - itemGrid.y);
  const trash = { x: board.x + board.w - 56, y: bottom - 45, w: 44, h: 36 };
  return { desktop: true, width, height, pad, gap, customers, tools, board, tabs, preparation, itemGrid, trash };
}
export function toolCell(layout, index, count, hasPreparation = true, scroll = 0) {
  const grid = hasPreparation ? layout.itemGrid : { x: layout.tools.x + 12, y: layout.tabs.y + layout.tabs.h + 20, w: layout.tools.w - 24, h: layout.tools.h - 160 };
  const cols = Math.min(3, count), rows = Math.ceil(count / cols), gap = 10;
  const w = (grid.w - gap * (cols - 1)) / cols, h = clamp((grid.h - gap * (rows - 1)) / rows, 112, 160);
  return { x: grid.x + index % cols * (w + gap), y: grid.y + Math.floor(index / cols) * (h + gap) - scroll, w, h };
}
export function stationPosition(index, count, layout) {
  if (!layout?.desktop) return { page: Math.floor(index / 2), x: count === 1 ? 240 : index % 2 ? 354 : 126, y: 517 };
  const board = layout.board, cols = count === 1 ? 1 : 2, rows = count > 2 ? 2 : 1, gap = 12;
  const w = (board.w - 32 - gap * (cols - 1)) / cols, h = (board.h - 88 - gap * (rows - 1)) / rows;
  const rect = { x: board.x + 16 + index % cols * (w + gap), y: board.y + 42 + Math.floor(index / cols) * (h + gap), w, h };
  const guide = count <= 2 && w > 540 && h > 230;
  return { page: 0, rect, guide, x: rect.x + rect.w * (guide ? 0.34 : 0.5), y: rect.y + 38 + (rect.h - 92) * 0.5,
    cupScale: clamp((h - 90) / 110, 0.58, count === 1 ? 2 : 1.45) };
}
export function seatPosition(seat, count, layout) {
  if (layout?.desktop) {
    const r = layout.customers, x = r.x + (seat + 0.5) * r.w / count;
    return { x, y: r.y + r.h - 48, bubbleY: r.y + 35, scale: Math.min(0.9, (r.h - 70) / 130), top: r.y + 8, bottom: r.y + r.h - 6 };
  }
  const compact = count > 3;
  return { x: [90, 240, 390][seat % 3], y: compact ? 252 + Math.floor(seat / 3) * 99 : 305,
    bubbleY: compact ? 200 + Math.floor(seat / 3) * 99 : 218, scale: compact ? 0.52 : 0.88,
    top: compact ? 190 + Math.floor(seat / 3) * 99 : 198, bottom: compact ? 282 + Math.floor(seat / 3) * 99 : 340 };
}
