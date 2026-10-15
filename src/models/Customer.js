import { normalizeModifiers, formatModifierLabel } from './KumquatPrep.js';
import { normalizeTraDaoModifiers, formatTraDaoModifierLabel } from './TraDaoPrep.js';
import { normalizeTraVaiModifiers, formatTraVaiModifierLabel } from './TraVaiPrep.js';
import { normalizeCacaoModifiers, formatCacaoModifierLabel } from './CacaoPrep.js';
import { normalizeMatchaModifiers, formatMatchaModifierLabel } from './MatchaBowl.js';

let nextId = 0;
const transitions = {
  ARRIVING: ['WALKING'], WALKING: ['SEATED'], SEATED: ['ORDERING'], ORDERING: ['WAITING'],
  WAITING: ['SERVED', 'LEAVING'], SERVED: ['LEAVING'], LEAVING: [],
};
export class Customer {
  constructor(archetype, recipeId, seat, tutorial = false, modifiers = undefined) {
    this.id = `customer-${++nextId}`; this.type = archetype; this.recipeId = recipeId; this.seat = seat;
    this.modifiers = null;
    if (recipeId === 'muoi') this.type = { ...archetype, line: 'Cho chị ly cà phê muối, lớp kem dày dày nha!', happy: 'Trời ơi, béo mặn vừa đủ, đỉnh quá!' };
    if (recipeId === 'cotdua') this.type = { ...archetype, line: 'Cho em cà phê dừa xay mịn, béo béo nha!', happy: 'Mịn mát, béo thơm mùi dừa, ghiền luôn!' };
    if (recipeId === 'tratac') {
      this.setModifiers(modifiers === undefined ? { sweetness: 'less', ice: 'more' } : modifiers);
    }
    if (recipeId === 'tradao') {
      this.setModifiers(modifiers === undefined ? { peach: 'more' } : modifiers);
    }
    if (recipeId === 'travai') {
      this.setModifiers(modifiers === undefined ? { lychee: 'more' } : modifiers);
    }
    if (recipeId === 'cacao') {
      this.setModifiers(modifiers === undefined ? { cacao: 'strong' } : modifiers);
    }
    if (recipeId === 'matcha') {
      this.setModifiers(modifiers === undefined ? { sweetness: 'less' } : modifiers);
    }
    this.state = 'ARRIVING'; this.stateTime = 0; this.waited = 0;
    this.patience = archetype.patience; this.tutorial = tutorial; this.resolved = false; this.outcome = null;
  }
  setModifiers(modifiers = null) {
    if (this.recipeId === 'tratac') {
      this.modifiers = normalizeModifiers(modifiers);
      const label = formatModifierLabel(this.modifiers);
      const line = !label || label === 'ít ngọt, nhiều đá'
        ? 'Cho anh trà tắc ít ngọt, nhiều đá nha!'
        : `Cho anh trà tắc ${label} nha!`;
      this.type = { ...this.type, line, happy: 'Chua thanh mát lạnh, đúng ý anh luôn!' };
    } else if (this.recipeId === 'tradao') {
      this.modifiers = normalizeTraDaoModifiers(modifiers);
      const label = formatTraDaoModifierLabel(this.modifiers);
      const line = !label || label === 'nhiều đào'
        ? 'Cho chị trà đào cam sả, nhiều đào nha!'
        : `Cho chị trà đào cam sả, ${label} nha!`;
      this.type = { ...this.type, line, happy: 'Đào giòn ngọt, thơm mùi cam sả mê ly luôn!' };
    } else if (this.recipeId === 'travai') {
      this.modifiers = normalizeTraVaiModifiers(modifiers);
      const label = formatTraVaiModifierLabel(this.modifiers);
      const line = !label || label === 'nhiều vải'
        ? 'Cho em trà vải nhiều trái nha!'
        : `Cho em trà vải ${label} nha!`;
      this.type = { ...this.type, line, happy: 'Vải thơm ngọt quá, uống mát ghê!' };
    } else if (this.recipeId === 'cacao') {
      this.modifiers = normalizeCacaoModifiers(modifiers);
      const label = formatCacaoModifierLabel(this.modifiers);
      const line = !label || label === 'đậm cacao'
        ? 'Cho em cacao sữa đá, đậm cacao nha!'
        : `Cho em cacao sữa đá, ${label} nha!`;
      this.type = { ...this.type, line, happy: 'Cacao đậm đà, béo mịn đã miệng quá!' };
    } else if (this.recipeId === 'matcha') {
      this.modifiers = normalizeMatchaModifiers(modifiers);
      const label = formatMatchaModifierLabel(this.modifiers);
      const line = !label || label === 'ít ngọt'
        ? 'Cho em matcha latte, ít ngọt thôi nha!'
        : `Cho em matcha latte, ${label} nha!`;
      this.type = { ...this.type, line, happy: 'Matcha mịn ghê, đẹp quá không nỡ uống!' };
    } else {
      this.modifiers = null;
    }
    return this;
  }
  get modifierLabel() {
    if (this.recipeId === 'tratac') return formatModifierLabel(this.modifiers);
    if (this.recipeId === 'tradao') return formatTraDaoModifierLabel(this.modifiers);
    if (this.recipeId === 'travai') return formatTraVaiModifierLabel(this.modifiers);
    if (this.recipeId === 'cacao') return formatCacaoModifierLabel(this.modifiers);
    if (this.recipeId === 'matcha') return formatMatchaModifierLabel(this.modifiers);
    return '';
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
