export class IceSystem {
  constructor(effects) { this.effects = effects; }
  drop(state, quantity, point) {
    if (!Number.isInteger(quantity) || quantity <= 0) return 0;
    const accepted = Math.min(quantity, Math.max(0, 12 - (state.amounts.ice || 0)));
    if (!accepted) return 0;
    state.add('ice', accepted);
    for (let i = 0; i < accepted; i++) {
      state.ice.push({ x: (i * 13 % 30) - 15, y: -12 + i % 3 * 8 });
      this.effects?.ice(point.x + (i - (accepted - 1) / 2) * 10, point.y, i * 45);
    }
    this.effects?.splash(point.x, point.y, 0xd6ece3, accepted); return accepted;
  }
}
