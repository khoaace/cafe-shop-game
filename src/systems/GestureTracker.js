export class GestureTracker {
  constructor() { this.previous = null; this.direction = 0; }
  reset() { this.previous = null; this.direction = 0; }
  whisk(x, y, time) {
    const last = this.previous; this.previous = { x, y, time };
    if (!last) return 0;
    const distance = Math.hypot(x - last.x, y - last.y);
    const elapsed = Math.max(8, time - last.time);
    if (distance < 2 || distance > 100 || distance / elapsed > 4) return 0;
    return distance;
  }
  stir(x, y, cx, cy) {
    const radius = Math.hypot(x - cx, y - cy);
    if (radius < 10 || radius > 61) { this.previous = null; return 0; }
    const angle = Math.atan2(y - cy, x - cx);
    const last = this.previous; this.previous = { angle };
    if (!last || last.angle === undefined) return 0;
    let delta = angle - last.angle;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    // Ignore jumps and angle jitter; both rotation directions are supported.
    if (Math.abs(delta) > 0.65 || Math.abs(delta) < 0.025) return 0;
    const direction = Math.sign(delta);
    if (this.direction && direction !== this.direction) { this.direction = direction; return 0; }
    this.direction = direction; return Math.abs(delta);
  }
}
