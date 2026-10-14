// Event samples only: holding a tool never creates progress.
export class MotionGesture {
  constructor() { this.reset(); }
  reset() { this.last = null; this.lastAngle = null; this.turn = 0; this.dx = 0; this.dy = 0; this.stroke = 0; }
  sample(point, center, mode = 'stir') {
    const previous = this.last; this.last = { ...point };
    if (!previous) return 0;
    const dx = point.x - previous.x, dy = point.y - previous.y, distance = Math.hypot(dx, dy);
    const ms = point.time - previous.time;
    if (ms <= 0 || distance < 2 || distance > 90 || distance / Math.max(ms, 8) > 4 || ms > 300) { this.lastAngle = null; this.turn = 0; this.stroke = 0; return 0; }
    const radius = Math.hypot(point.x - center.x, point.y - center.y);
    const oldRadius = Math.hypot(previous.x - center.x, previous.y - center.y);
    let circular = 0;
    if (radius >= 10 && radius <= (center.radius || 64) && oldRadius >= 10 && Math.abs(radius - oldRadius) < 15) {
      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      const old = Math.atan2(previous.y - center.y, previous.x - center.x);
      const delta = Math.atan2(Math.sin(angle - old), Math.cos(angle - old));
      if (Math.abs(delta) >= 0.025 && Math.abs(delta) <= 0.65) {
        circular = Math.abs(delta);
        if (mode === 'circular') {
          this.turn = Math.sign(this.turn) === Math.sign(delta) ? this.turn + delta : delta;
          // A sustained quarter turn establishes a circle; tiny reversals cannot farm foam.
          if (Math.abs(this.turn) < Math.PI / 2) circular = 0;
        }
      } else if (mode === 'circular') this.turn = 0;
    }
    if (mode === 'circular' && (radius < 10 || radius > (center.radius || 64) || Math.abs(radius - oldRadius) >= 15)) this.turn = 0;
    // A stroke needs at least 14px of travel before its reversal is credited.
    const axis = Math.abs(dy) > Math.abs(dx) ? 'dy' : 'dx';
    const direction = Math.sign(axis === 'dy' ? dy : dx);
    const reversed = this[axis] && this[axis] !== direction && this.stroke >= 14;
    const diagonal = Math.abs(dx) > 1.5 && Math.abs(dy) > 1.5;
    const strokeCredit = reversed && (mode !== 'whisk' || diagonal) ? Math.min(60, this.stroke) : 0;
    if (this[axis] && this[axis] !== direction) this.stroke = 0;
    this[axis] = direction; this.stroke += distance;
    return mode === 'circular' ? circular : mode === 'whisk' ? Math.max(circular * radius, strokeCredit) : Math.max(circular, strokeCredit / 30);
  }
}
