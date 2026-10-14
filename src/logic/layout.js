export function stationPosition(index, count) { return { page: Math.floor(index / 2), x: count === 1 ? 240 : index % 2 ? 354 : 126, y: 517 }; }
export function seatPosition(seat, count) {
  const compact = count > 3;
  return { x: [90, 240, 390][seat % 3], y: compact ? 252 + Math.floor(seat / 3) * 99 : 305,
    bubbleY: compact ? 200 + Math.floor(seat / 3) * 99 : 218, scale: compact ? 0.52 : 0.88,
    top: compact ? 190 + Math.floor(seat / 3) * 99 : 198, bottom: compact ? 282 + Math.floor(seat / 3) * 99 : 340 };
}
