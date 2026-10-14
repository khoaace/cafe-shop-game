export class LiquidPourSystem {
  constructor() { this.sessions = new Map(); }
  begin(key, point, options = {}) {
    this.end(key);
    this.sessions.set(key, { origin: { ...point }, point: { ...point }, tilt: options.initialTilt ?? 0, poured: 0, rate: options.rate ?? 25, ...options });
  }
  move(key, point) {
    const s = this.sessions.get(key); if (!s) return;
    s.point = { ...point };
    // Moving a level vessel left establishes its neutral position before tilting right.
    if (!(s.initialTilt > 0) && point.x < s.origin.x) s.origin.x = point.x;
    // Relative movement controls the tilt; no gyroscope and no frame-dependent rotation.
    s.tilt = Math.max(0, Math.min(1, (s.initialTilt ?? 0) + (point.x - s.origin.x) / (s.tiltDistance ?? 48)));
  }
  update(key, seconds, target, accept) {
    const s = this.sessions.get(key);
    if (!s || !target || !Number.isFinite(seconds) || seconds <= 0 || s.tilt < 0.15) return 0;
    const requested = Math.min(seconds, 0.1) * s.rate * s.tilt;
    const accepted = accept(requested);
    const amount = Number.isFinite(accepted) ? Math.max(0, Math.min(requested, accepted)) : 0;
    s.poured += amount; return amount;
  }
  transfer(source, requested, accept) {
    if (!source || !Number.isFinite(requested) || requested <= 0) return 0;
    const total = Object.values(source.amounts).reduce((sum, n) => sum + n, 0);
    if (!total) return 0;
    const ratio = Math.min(1, requested / total);
    const mixture = Object.fromEntries(Object.entries(source.amounts).map(([id, n]) => [id, n * ratio]));
    const accepted = Math.max(0, Math.min(1, accept(mixture, source.consistency || source.foam || 0)));
    let amount = 0; for (const [id, n] of Object.entries(mixture)) amount += source.remove(id, n * accepted);
    return amount;
  }
  end(key) { const s = this.sessions.get(key); this.sessions.delete(key); return s?.poured || 0; }
  cancelAll() { this.sessions.clear(); }
}
