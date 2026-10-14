let nextId = 0;
const transitions = {
  ARRIVING: ['WALKING'], WALKING: ['SEATED'], SEATED: ['ORDERING'], ORDERING: ['WAITING'],
  WAITING: ['SERVED', 'LEAVING'], SERVED: ['LEAVING'], LEAVING: [],
};
export class Customer {
  constructor(archetype, recipeId, seat, tutorial = false) {
    this.id = `customer-${++nextId}`; this.type = archetype; this.recipeId = recipeId; this.seat = seat;
    if (recipeId === 'muoi') this.type = { ...archetype, line: 'Cho chị ly cà phê muối, lớp kem dày dày nha!', happy: 'Trời ơi, béo mặn vừa đủ, đỉnh quá!' };
    this.state = 'ARRIVING'; this.stateTime = 0; this.waited = 0;
    this.patience = archetype.patience; this.tutorial = tutorial; this.resolved = false; this.outcome = null;
  }
  transition(to) {
    if (!transitions[this.state].includes(to)) return false;
    this.state = to; this.stateTime = 0; return true;
  }
  update(seconds, patienceSeconds = seconds) {
    this.stateTime += seconds;
    if (this.state === 'ARRIVING') this.transition('WALKING');
    else if (this.state === 'WALKING' && this.stateTime >= 1.1) this.transition('SEATED');
    else if (this.state === 'SEATED' && this.stateTime >= 0.3) this.transition('ORDERING');
    else if (this.state === 'ORDERING' && this.stateTime >= 0.45) this.transition('WAITING');
    else if (this.state === 'SERVED' && this.stateTime >= 1.4) this.transition('LEAVING');
    if (this.state === 'WAITING' && !this.tutorial) this.waited += patienceSeconds;
  }
  resolve(outcome) {
    if (this.resolved || this.state !== 'WAITING') return false;
    this.resolved = true; this.outcome = outcome;
    this.transition(outcome === 'served' ? 'SERVED' : 'LEAVING'); return true;
  }
  get ratio() { return this.tutorial ? 1 : Math.max(0, 1 - this.waited / this.patience); }
}
