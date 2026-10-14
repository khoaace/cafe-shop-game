import { BrewingStation } from './BrewingStation.js';
export class StationManager {
  constructor(count = 1) { this.models = Array.from({ length: Math.max(1, Math.min(4, count)) }, (_, i) => new BrewingStation(`station-${i + 1}`)); this.page = 0; }
  visible(id) { const i = this.models.findIndex(m => m.id === id); return i >= 0 && Math.floor(i / 2) === this.page; }
  setPage(page) { if (!Number.isInteger(page) || page < 0 || page >= Math.ceil(this.models.length / 2)) return false; this.page = page; return true; }
  update(seconds) { return this.models.filter(model => model.update(seconds)); }
}
