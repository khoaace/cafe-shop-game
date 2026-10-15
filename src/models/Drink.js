import { INGREDIENT_NAMES, PITCHER_RECIPES, RECIPES, RULES } from '../config.js';
import { CoconutBlend } from './CoconutBlend.js';
import { KumquatPrep, KUMQUAT_FRUITS, JUICE_TARGET, modifierTargets, normalizeModifiers, formatModifierLabel } from './KumquatPrep.js';
import { TraDaoPrep, ORANGE_JUICE_TARGET, traDaoTargets, normalizeTraDaoModifiers, formatTraDaoModifierLabel } from './TraDaoPrep.js';
import { traVaiTargets, normalizeTraVaiModifiers, formatTraVaiModifierLabel } from './TraVaiPrep.js';
import { CACAO_STIR_RADIANS, cacaoDissolveStage, cacaoTargets, normalizeCacaoModifiers, formatCacaoModifierLabel } from './CacaoPrep.js';
import { MatchaBowl, MATCHA_WHISK_TARGET, matchaWhiskStage, matchaWhiskTechnique, matchaTargets, normalizeMatchaModifiers, formatMatchaModifierLabel } from './MatchaBowl.js';
import { PreparationState } from './PreparationState.js';
import { INGREDIENT_DEFINITIONS } from '../data/drinkEngine.js';
import { evaluatePreparation } from '../logic/drinkQuality.js';
let nextId = 0;
export class Drink {
  constructor(recipeId = 'den', modifiers = null) {
    this.id = `cup-${++nextId}`;
    this.recipeId = recipeId;
    this.modifiers = recipeId === 'tratac' ? normalizeModifiers(modifiers) : recipeId === 'tradao' ? normalizeTraDaoModifiers(modifiers) : recipeId === 'travai' ? normalizeTraVaiModifiers(modifiers) : recipeId === 'cacao' ? normalizeCacaoModifiers(modifiers) : recipeId === 'matcha' ? normalizeMatchaModifiers(modifiers) : null;
    this.state = 'GLASS';
    this.grounds = 0;
    this.press = 0;
    this.water = 0;
    this.brewElapsed = 0;
    this.coffee = 0;
    this.condensed = 0;
    this.milk = 0;
    this.foam = 0;
    this.ice = 0;
    this.stir = 0;
    this.consumed = false;
    this.timedSteps = new Set();
    this.coffeeSource = new PreparationState(`${this.id}-phin-collection`, 3);
    this.creamTechniqueTotal = 0; this.creamMovementTotal = 0;
    this.blendTechniqueTotal = 0; this.blendTimeTotal = 0; this.blendedCoconut = 0;
    this.kumquatTechniqueTotal = 0; this.kumquatJuiceTotal = 0;
    this.orangeTechniqueTotal = 0; this.orangeJuiceTotal = 0;
    this.matchaTechniqueTotal = 0; this.matchaWaterTotal = 0; this.matchaWhiskDistanceTotal = 0;
    this.preparation = new PreparationState(this.id, RECIPES[recipeId]?.visual.capacity || 300, Object.fromEntries((RECIPES[recipeId]?.ingredients || []).filter(i => i.volumePerUnit).map(i => [i.id, i.volumePerUnit])));
    if (recipeId === 'cacao') {
      this.preparation.cacaoDissolveRadians = 0;
      this.preparation.cacaoDissolveProgress = 0;
      this.preparation.cacaoDissolveStage = 'CLUMPY';
    }
    if (recipeId === 'matcha') {
      this.preparation.matchaWhiskDistance = 0;
      this.preparation.matchaWhiskProgress = 0;
      this.preparation.matchaWhiskStage = 'CLUMPY';
    }
  }
  placePhin() {
    if (RECIPES[this.recipeId]?.engine !== 'phin') return false;
    if (this.state !== 'GLASS') return false;
    this.state = 'PHIN'; return true;
  }
  addGrounds(amount) {
    if (this.state !== 'PHIN' || !Number.isFinite(amount) || amount <= 0) return false;
    this.grounds = Math.min(2, this.grounds + amount); return true;
  }
  compress(seconds) {
    if (this.state !== 'PHIN' || this.grounds <= 0) return false;
    this.press = Math.min(RULES.pressSeconds, this.press + Math.max(0, seconds));
    if (this.press >= RULES.pressSeconds - 1e-9) this.state = 'PRESSED';
    return true;
  }
  pourWater(seconds) {
    if (!['PRESSED', 'POURING'].includes(this.state) || seconds <= 0) return false;
    this.state = 'POURING';
    this.water = Math.min(2, this.water + seconds * RULES.waterRate); return true;
  }
  finishWater() {
    if (this.state !== 'POURING' || this.water <= 0) return false;
    this.state = 'BREWING'; return true;
  }
  startTimedSteps() {
    const recipe = RECIPES[this.recipeId];
    if (recipe?.engine !== 'gesture') return;
    for (const step of recipe.steps) if (step.action === 'brew' && step.after?.length && this.preparation.canStep(recipe, step.id) && (this.preparation.steps[step.id]?.amount || 0) < step.target) this.timedSteps.add(step.id);
  }
  update(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || this.consumed) return false;
    if (RECIPES[this.recipeId]?.engine === 'gesture') {
      let completed = false;
      for (const id of [...this.timedSteps]) {
        const step = RECIPES[this.recipeId].steps.find(s => s.id === id);
        this.preparation.record(id, seconds, step.target);
        if (this.preparation.steps[id].amount >= step.target) { this.timedSteps.delete(id); completed = true; }
      }
      this.startTimedSteps(); return completed;
    }
    if (this.state !== 'BREWING') return false;
    this.brewElapsed = Math.min(RULES.brewSeconds, this.brewElapsed + Math.max(0, seconds));
    this.coffee = this.water * this.brewElapsed / RULES.brewSeconds;
    if (this.brewElapsed >= RULES.brewSeconds) { this.state = 'BREWED'; if (PITCHER_RECIPES.includes(this.recipeId)) this.coffeeSource.add('brewedCoffee', this.coffee); return true; }
    return false;
  }
  addMeasuredIngredient(kind, amount) {
    if (this.consumed || !INGREDIENT_DEFINITIONS[kind] || !Number.isFinite(amount) || amount <= 0) return 0;
    if (RECIPES[this.recipeId]?.engine !== 'phin') {
      if (this.recipeId === 'tratac' && !['tea', 'syrup', 'ice'].includes(kind)) return 0;
      if (this.recipeId === 'tradao' && !['tea', 'peachSyrup', 'orangeJuice', 'peach', 'lemongrass', 'orange', 'ice'].includes(kind)) return 0;
      if (this.recipeId === 'travai' && !['tea', 'lycheeSyrup', 'lychee', 'ice'].includes(kind)) return 0;
      if (this.recipeId === 'cacao' && !['cacao', 'water', 'condensed', 'milk', 'ice'].includes(kind)) return 0;
      if (this.recipeId === 'matcha' && !['matcha', 'water', 'milk', 'syrup', 'ice'].includes(kind)) return 0;
      const prevCacao = this.preparation.amounts.cacao || 0;
      const maxIce = 12 - (this.preparation.amounts.ice || 0);
      const requested = kind === 'ice' ? Math.min(amount, Math.max(0, maxIce)) : amount;
      const accepted = this.preparation.add(kind, requested);
      if (accepted && kind === 'ice') {
        while (this.preparation.ice.length < Math.min(12, Math.round(this.preparation.amounts.ice || 0))) {
          const i = this.preparation.ice.length;
          this.preparation.ice.push({ x: (i * 11 % 28) - 14, y: -10 + (i % 3) * 7, spin: (i - 1.5) * 0.22 });
        }
      }
      if (accepted && this.recipeId === 'tratac') {
        const targets = modifierTargets(this.modifiers);
        if (kind === 'tea') this.preparation.record('tea', accepted, targets.tea);
        if (kind === 'syrup') this.preparation.record('syrup', accepted, targets.syrup);
        if (kind === 'ice') this.preparation.record('ice', accepted, targets.ice);
      }
      if (accepted && this.recipeId === 'tradao') {
        const targets = traDaoTargets(this.modifiers);
        if (kind === 'tea') this.preparation.record('tea', accepted, targets.tea);
        if (kind === 'peachSyrup') this.preparation.record('peachSyrup', accepted, targets.peachSyrup);
        if (kind === 'peach') this.preparation.record('peach', accepted, targets.peach);
        if (kind === 'lemongrass') {
          this.preparation.record('lemongrass-prep', 1, 1);
          this.preparation.record('lemongrass', accepted, targets.lemongrass);
        }
        if (kind === 'orange') {
          this.preparation.record('orange-cut', 1, 1);
          this.preparation.record('orange-garnish', accepted, targets.orange);
        }
        if (kind === 'orangeJuice') {
          this.preparation.record('orange-cut', 1, 1);
          this.preparation.record('orange-squeeze', accepted, targets.orangeJuice);
          this.preparation.record('orangeJuice', accepted, targets.orangeJuice);
        }
        if (kind === 'ice') this.preparation.record('ice', accepted, targets.ice);
      }
      if (accepted && this.recipeId === 'travai') {
        const targets = traVaiTargets(this.modifiers);
        if (kind === 'tea') this.preparation.record('tea', accepted, targets.tea);
        if (kind === 'lycheeSyrup') this.preparation.record('lycheeSyrup', accepted, targets.lycheeSyrup);
        if (kind === 'lychee') {
          this.preparation.record('lychee', accepted, targets.lychee);
          const totalLychee = Math.round(this.preparation.amounts.lychee || 0);
          while (this.preparation.garnishes.length < Math.min(5, totalLychee)) {
            const i = this.preparation.garnishes.length;
            this.preparation.garnishes.push({ id: 'lychee', x: -10 + (i % 3) * 10, y: 8 - Math.floor(i / 2) * 8, color: 0xf8f3eb, angle: (i - 1) * 0.25 });
          }
        }
        if (kind === 'ice') this.preparation.record('ice', accepted, targets.ice);
      }
      if (accepted && this.recipeId === 'cacao') {
        const targets = cacaoTargets(this.modifiers);
        if (kind === 'cacao') {
          this.preparation.record('cacao', accepted, targets.cacao);
          const newCacao = this.preparation.amounts.cacao || 0;
          if (prevCacao > 0 && (this.preparation.cacaoDissolveRadians || 0) > 0 && newCacao > prevCacao) {
            this.preparation.cacaoDissolveRadians *= prevCacao / newCacao;
            this.preparation.cacaoDissolveProgress = Math.min(1, this.preparation.cacaoDissolveRadians / CACAO_STIR_RADIANS);
            this.preparation.cacaoDissolveStage = cacaoDissolveStage(this.preparation.cacaoDissolveProgress).id;
          } else if (!this.preparation.cacaoDissolveStage) {
            this.preparation.cacaoDissolveStage = 'CLUMPY';
          }
        }
        if (kind === 'water') {
          this.preparation.record('water', accepted, targets.water);
          if (!this.preparation.cacaoDissolveStage) this.preparation.cacaoDissolveStage = 'CLUMPY';
        }
        if (kind === 'condensed') this.preparation.record('condensed', accepted, targets.condensed);
        if (kind === 'milk') this.preparation.record('milk', accepted, targets.milk);
        if (kind === 'ice') this.preparation.record('ice', accepted, targets.ice);
        // Preserve already dissolved cocoa state when pouring milk after stirring.
        if ((this.preparation.cacaoDissolveRadians || 0) > 0) {
          this.preparation.steps.stir = {
            amount: this.preparation.cacaoDissolveRadians,
            technique: this.preparation.cacaoDissolveProgress || 0,
          };
          this.preparation.mixing = Math.max(this.preparation.mixing || 0, (this.preparation.cacaoDissolveProgress || 0) * 0.85);
        }
        return accepted;
      }
      if (accepted && this.recipeId === 'matcha') {
        const targets = matchaTargets(this.modifiers);
        if (kind === 'matcha') {
          this.preparation.record('matcha', accepted, targets.matcha);
          this.preparation.record('pourMatcha', accepted, targets.matcha);
        }
        if (kind === 'water') this.preparation.record('water', accepted, targets.water);
        if (kind === 'milk') this.preparation.record('milk', accepted, targets.milk);
        if (kind === 'syrup') this.preparation.record('syrup', accepted, Math.max(1, targets.syrup));
        if (kind === 'ice') this.preparation.record('ice', accepted, targets.ice);
        this.preparation.mixing = 0;
        return accepted;
      }
      if (accepted && INGREDIENT_DEFINITIONS[kind].liquid) for (const step of RECIPES[this.recipeId]?.steps || []) if (step.action === 'stir') delete this.preparation.steps[step.id];
      return accepted;
    }
    if (this.recipeId === 'muoi' && ['cream', 'salt', 'brewedCoffee'].includes(kind)) return this.preparation.add(kind, amount);
    // Coconut coffee receives milk and ice only through the blender jar, and coffee only from its pitcher.
    if (this.recipeId === 'cotdua') return 0;
    if (!Object.hasOwn(INGREDIENT_NAMES, kind)) return 0;
    const accepted = Math.min(amount, Math.max(0, (kind === 'ice' ? 9 : 5) - this[kind]));
    this[kind] += accepted;
    if (accepted && (kind === 'milk' || kind === 'condensed')) { this.stir = 0; delete this.preparation.steps.stir; this.preparation.mixing = 0; }
    if (accepted) this.preparation.revision++;
    return accepted;
  }
  placeLycheeGarnish(fromAllocated = true) {
    if (this.consumed || this.recipeId !== 'travai') return false;
    this.preparation.lycheeGarnish = true;
    this.preparation.lycheeGarnishFromAllocated = Boolean(fromAllocated);
    this.preparation.revision++;
    return true;
  }
  addIngredient(kind, amount) { return this.addMeasuredIngredient(kind, amount) > 0; }
  getAmounts() {
    return RECIPES[this.recipeId]?.engine === 'phin'
      ? this.recipeId === 'cotdua' ? { coffee: this.grounds, water: this.water, ...this.preparation.amounts }
        : { coffee: this.grounds, water: this.water, condensed: this.condensed, milk: this.milk, foam: this.foam, ice: this.ice, ...(this.recipeId === 'muoi' ? this.preparation.amounts : {}) }
      : { ...this.preparation.amounts };
  }
  acceptPreparedMixture(mixture, source) {
    if (this.recipeId === 'cotdua') return this.acceptCoconutPour(mixture, source);
    if (this.recipeId === 'tratac') return this.acceptKumquatPour(mixture, source);
    if (this.recipeId === 'tradao') return this.acceptTraDaoPour(mixture, source);
    if (this.recipeId === 'matcha') return this.acceptMatchaPour(mixture, source);
    if (this.recipeId !== 'muoi' || this.consumed || this.state !== 'BREWED') return 0;
    const coffee = mixture.brewedCoffee || 0, cream = mixture.cream || 0;
    if (coffee && source !== this.coffeeSource || !coffee && (!cream || !source?.whipping)) return 0;
    if (Object.keys(mixture).some(id => !['brewedCoffee', 'cream', 'salt'].includes(id))) return 0;
    const volume = coffee + cream, fraction = Math.min(1, Math.max(0, (this.preparation.capacity - this.preparation.volume) / (volume || 1)));
    for (const [id, n] of Object.entries(mixture)) this.addMeasuredIngredient(id, n * fraction);
    if (cream * fraction > 0) {
      this.creamTechniqueTotal += cream * fraction * source.consistency;
      this.creamMovementTotal += cream * fraction * Math.min(Math.PI * 6, source.whipping);
      this.preparation.creamTechnique = this.creamTechniqueTotal / this.preparation.amounts.cream;
      this.preparation.foam = source.foam;
      this.preparation.steps.whisk = { amount: this.creamMovementTotal / this.preparation.amounts.cream, technique: this.preparation.creamTechnique };
      this.preparation.revision++;
    }
    return fraction;
  }
  // Kumquat juice and floating cut halves transfer from the squeezing station's measuring cup without charging fruit again.
  acceptKumquatPour(mixture, source) {
    if (this.consumed || !source || !(source instanceof KumquatPrep || source.sliced)) return 0;
    const p = this.preparation, ids = Object.keys(mixture);
    const juice = mixture.citrusJuice || 0;
    if (!(juice > 0) || ids.some(id => !['citrusJuice', 'kumquat'].includes(id))) return 0;
    const room = Math.max(0, p.capacity - p.volume) / (p.volumePerUnit.citrusJuice || 1);
    const fraction = Math.min(1, room / juice);
    if (!(fraction > 0)) return 0;
    for (const id of ids) p.add(id, mixture[id] * fraction);
    const addedJuice = juice * fraction;
    const technique = source.technique ?? 1;
    this.kumquatJuiceTotal += addedJuice;
    this.kumquatTechniqueTotal += addedJuice * technique;
    p.kumquatTechnique = this.kumquatTechniqueTotal / this.kumquatJuiceTotal;
    const totalJuice = p.amounts.citrusJuice || 0;
    if (totalJuice >= JUICE_TARGET * 0.5) p.amounts.kumquat = Math.max(KUMQUAT_FRUITS, Math.round(p.amounts.kumquat || 0));
    const totalFruit = p.amounts.kumquat || 0;
    p.steps.place = { amount: Math.min(2, totalFruit), technique: 1 };
    p.steps.slice = { amount: totalFruit > 0 ? 1 : 0, technique: 1 };
    p.steps.squeeze = { amount: Math.min(JUICE_TARGET, totalJuice), technique: p.kumquatTechnique };
    p.steps.juice = { amount: Math.min(JUICE_TARGET, totalJuice), technique: p.kumquatTechnique };
    const targetSlices = Math.min(4, Math.max(1, Math.round(totalFruit * 2)));
    while (p.garnishes.length < targetSlices) {
      const i = p.garnishes.length;
      p.garnishes.push({ id: 'kumquat', x: -12 + i * 8, y: -14 + (i % 2) * 5, color: 0xe8ac30, angle: (i - 1.5) * 0.35 });
    }
    p.revision++;
    return fraction;
  }
  // Prepared orange juice transfers from the squeezing station's cup without charging another orange.
  acceptTraDaoPour(mixture, source) {
    if (this.consumed || !source || !(source instanceof TraDaoPrep || source.orangeSliced)) return 0;
    const p = this.preparation, ids = Object.keys(mixture);
    const juice = mixture.orangeJuice || 0;
    if (!(juice > 0) || ids.some(id => id !== 'orangeJuice')) return 0;
    const room = Math.max(0, p.capacity - p.volume) / (p.volumePerUnit.orangeJuice || 1);
    const fraction = Math.min(1, room / juice);
    if (!(fraction > 0)) return 0;
    p.add('orangeJuice', juice * fraction);
    const addedJuice = juice * fraction;
    const technique = source.orangeTechnique ?? 1;
    this.orangeJuiceTotal += addedJuice;
    this.orangeTechniqueTotal += addedJuice * technique;
    p.orangeTechnique = this.orangeTechniqueTotal / this.orangeJuiceTotal;
    const totalJuice = p.amounts.orangeJuice || 0;
    p.steps['orange-cut'] = { amount: 1, technique: 1 };
    p.steps['orange-squeeze'] = { amount: Math.min(ORANGE_JUICE_TARGET, totalJuice), technique: p.orangeTechnique };
    p.steps.orangeJuice = { amount: Math.min(ORANGE_JUICE_TARGET, totalJuice), technique: p.orangeTechnique };
    p.revision++;
    return fraction;
  }
  // Prepared matcha mixture transfers from the whisking bowl into the glass without deducting matcha powder again.
  acceptMatchaPour(mixture, source) {
    if (this.consumed || !source || !(source instanceof MatchaBowl || source.whisking !== undefined)) return 0;
    const p = this.preparation, ids = Object.keys(mixture);
    const matcha = mixture.matcha || 0, water = mixture.water || 0;
    if (!(matcha > 0) || !(water > 0) || ids.some(id => !['matcha', 'water'].includes(id))) return 0;
    const room = Math.max(0, p.capacity - p.volume) / (p.volumePerUnit.water || 1);
    const fraction = Math.min(1, room / water);
    if (!(fraction > 0)) return 0;
    for (const id of ids) p.add(id, mixture[id] * fraction);
    const addedWater = water * fraction;
    const srcProgress = source.whiskProgress ?? Math.min(1, (source.whisking || 0) / MATCHA_WHISK_TARGET);
    const srcDistance = source.whisking ?? (srcProgress * MATCHA_WHISK_TARGET);
    this.matchaWaterTotal += addedWater;
    this.matchaTechniqueTotal += addedWater * srcProgress;
    this.matchaWhiskDistanceTotal += addedWater * srcDistance;
    p.matchaWhiskProgress = this.matchaTechniqueTotal / this.matchaWaterTotal;
    p.matchaWhiskDistance = this.matchaWhiskDistanceTotal / this.matchaWaterTotal;
    p.matchaWhiskStage = matchaWhiskStage(p.matchaWhiskProgress).id;
    p.foam = Math.min(1, p.matchaWhiskProgress);
    p.consistency = matchaWhiskTechnique(p.matchaWhiskProgress);
    const targets = matchaTargets(this.modifiers);
    p.steps.matcha = { amount: p.amounts.matcha || 0, technique: 1 };
    p.steps.water = { amount: p.amounts.water || 0, technique: 1 };
    p.steps.whisk = { amount: p.matchaWhiskDistance, technique: 1 };
    p.steps.pourMatcha = { amount: Math.min(targets.matcha, p.amounts.matcha || 0), technique: 1 };
    // Preserve green-over-white layering in the final glass.
    p.mixing = 0;
    p.revision++;
    return fraction;
  }
  whiskBy(distance) {
    if (this.consumed || !Number.isFinite(distance) || distance <= 0) return false;
    if (this.recipeId === 'matcha') {
      const matcha = this.preparation.amounts.matcha || 0;
      const water = this.preparation.amounts.water || 0;
      if (matcha <= 0 || water <= 0) return false;
      this.preparation.matchaWhiskDistance = Math.min(MATCHA_WHISK_TARGET * 1.35, (this.preparation.matchaWhiskDistance || 0) + distance);
      this.preparation.matchaWhiskProgress = Math.min(1, this.preparation.matchaWhiskDistance / MATCHA_WHISK_TARGET);
      this.preparation.matchaWhiskStage = matchaWhiskStage(this.preparation.matchaWhiskProgress).id;
      this.preparation.foam = Math.min(1, this.preparation.matchaWhiskProgress);
      this.preparation.consistency = matchaWhiskTechnique(this.preparation.matchaWhiskProgress);
      this.preparation.steps.whisk = { amount: this.preparation.matchaWhiskDistance, technique: 1 };
      this.preparation.revision++;
      return true;
    }
    return false;
  }
  // Coffee is collected from this cup's own phin only after a blended coconut base is in the glass.
  acceptCoconutPour(mixture, source) {
    if (this.consumed || !source) return 0;
    const p = this.preparation, ids = Object.keys(mixture);
    if (source === this.coffeeSource) {
      if (this.state !== 'BREWED' || !((p.amounts.coconutCream || 0) > 0) || ids.some(id => id !== 'brewedCoffee')) return 0;
      const coffee = mixture.brewedCoffee || 0, room = Math.max(0, p.capacity - p.volume) / (p.volumePerUnit.brewedCoffee || 1);
      const fraction = Math.min(1, room / (coffee || 1));
      if (!(fraction > 0)) return 0;
      p.add('brewedCoffee', coffee * fraction); return fraction;
    }
    if (!(source instanceof CoconutBlend) || !(source.blendTime > 0) || !['GLASS', 'BREWED'].includes(this.state)) return 0;
    if (ids.some(id => !['coconutCream', 'condensed', 'ice'].includes(id))) return 0;
    const volume = ids.reduce((sum, id) => sum + (id === 'ice' ? 0 : mixture[id] * (p.volumePerUnit[id] || 1)), 0);
    const fraction = Math.min(1, Math.max(0, (p.capacity - p.volume) / (volume || 1)));
    if (!(fraction > 0)) return 0;
    for (const id of ids) p.add(id, mixture[id] * fraction);
    // Crushed ice is part of the slush, not loose cubes.
    p.ice = [];
    const coconut = (mixture.coconutCream || 0) * fraction;
    if (coconut > 0) {
      this.blendedCoconut += coconut; this.blendTechniqueTotal += coconut * source.technique; this.blendTimeTotal += coconut * source.blendTime;
      p.blendTechnique = this.blendTechniqueTotal / this.blendedCoconut; p.blendTime = this.blendTimeTotal / this.blendedCoconut;
      p.steps.blend = { amount: Math.min(4, p.blendTime), technique: p.blendTechnique };
      p.foam = source.foam; p.crush = source.crush; p.revision++;
    }
    return fraction;
  }
  recordAction(action, amount, technique = 1) {
    const recipe = RECIPES[this.recipeId];
    const step = recipe?.steps.find(s => s.action === action && this.preparation.canStep(recipe, s.id));
    return step ? this.preparation.record(step.id, amount, step.target, technique) : 0;
  }
  stirBy(radians) {
    if (this.consumed || !Number.isFinite(radians) || radians <= 0) return false;
    if (this.recipeId === 'cacao') {
      const cacao = this.preparation.amounts.cacao || 0;
      const water = this.preparation.amounts.water || 0;
      if (cacao <= 0 || water <= 0) {
        delete this.preparation.steps.stir;
        this.preparation.mixing = 0;
        return false;
      }
      const waterFactor = water >= 15 ? 1 : Math.max(0.25, water / 15);
      const delta = radians * waterFactor;
      this.preparation.cacaoDissolveRadians = Math.min(CACAO_STIR_RADIANS, (this.preparation.cacaoDissolveRadians || 0) + delta);
      this.preparation.cacaoDissolveProgress = Math.min(1, this.preparation.cacaoDissolveRadians / CACAO_STIR_RADIANS);
      this.preparation.cacaoDissolveStage = cacaoDissolveStage(this.preparation.cacaoDissolveProgress).id;
      this.preparation.steps.stir = {
        amount: this.preparation.cacaoDissolveRadians,
        technique: this.preparation.cacaoDissolveProgress,
      };
      this.preparation.mixing = Math.min(1, Math.max(this.preparation.cacaoDissolveProgress, (this.preparation.mixing || 0) + radians / CACAO_STIR_RADIANS));
      this.stir = this.preparation.cacaoDissolveRadians;
      this.preparation.revision++;
      return true;
    }
    if (RECIPES[this.recipeId]?.engine !== 'phin') {
      if (this.preparation.volume <= 0) return false;
      this.preparation.record('stir', radians, RULES.stirRadians);
      this.preparation.mixing = Math.min(1, (this.preparation.steps.stir?.amount || 0) / RULES.stirRadians);
      this.stir = this.preparation.steps.stir?.amount || 0;
      return true;
    }
    if (this.state !== 'BREWED' || this.milk + this.condensed <= 0) return false;
    this.stir = Math.min(RULES.stirRadians, this.stir + Math.max(0, radians)); return true;
  }
  evaluate(recipeId, orderModifiers = undefined) {
    const recipe = RECIPES[recipeId];
    if (!recipe || this.consumed) return { valid: false, quality: 'INCORRECT', finalQuality: 'INCORRECT', recipeCorrectness: false, amountAccuracy: 0, preparationTechnique: 0, message: 'Ly này đã phục vụ rồi.' };
    if (recipeId === 'tratac') return this.evaluateTraTac(recipe, orderModifiers);
    if (recipeId === 'tradao') return this.evaluateTraDao(recipe, orderModifiers);
    if (recipeId === 'travai') return this.evaluateTraVai(recipe, orderModifiers);
    if (recipeId === 'cacao') return this.evaluateCacao(recipe, orderModifiers);
    if (recipeId === 'matcha') return this.evaluateMatcha(recipe, orderModifiers);
    if (recipe.engine !== 'phin') return evaluatePreparation(recipe, this.getAmounts(), this.preparation.steps);
    const steps = {};
    const values = { ...Object.fromEntries(Object.entries(this.preparation.steps).map(([id, step]) => [id, step.amount])), collect: this.preparation.amounts.brewedCoffee || 0, 'cream-pour': this.preparation.amounts.cream || 0, salt: this.preparation.amounts.salt || 0, phin: this.state !== 'GLASS' ? 1 : 0, grounds: this.grounds, press: this.press, water: this.water, brew: this.brewElapsed, mix: this.stir, foam: this.foam * RULES.whiskDistance };
    for (const step of recipe.steps) steps[step.id] = { amount: values[step.id] || 0, technique: 1 };
    if (this.recipeId === 'muoi' && recipe.id === 'muoi') steps.whisk = this.preparation.steps.whisk || { amount: 0, technique: 0 };
    if (recipe.id === 'cotdua') {
      const a = this.preparation.amounts, blended = this.recipeId === 'cotdua' && (a.coconutCream || 0) > 0;
      Object.assign(steps, { coconut: { amount: a.coconutCream || 0, technique: 1 }, condensed: { amount: a.condensed || 0, technique: 1 }, ice: { amount: a.ice || 0, technique: 1 }, lid: { amount: blended ? 1 : 0, technique: 1 }, mixture: { amount: a.coconutCream || 0, technique: 1 }, collect: { amount: a.brewedCoffee || 0, technique: 1 }, blend: blended && this.preparation.steps.blend || { amount: 0, technique: 0 } });
    }
    const result = evaluatePreparation(recipe, this.getAmounts(), steps, this.state === 'BREWED');
    if (recipe.id === 'muoi') {
      const technique = this.preparation.creamTechnique || 0;
      result.perfectCream = technique >= 0.99;
      result.tipMultiplier = result.valid && result.perfectCream ? 1.15 : 1;
      if (result.valid && technique < 0.95 && result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; result.message = 'Kem hơi lệch độ bông, ly vẫn ngon!'; }
      if (result.valid && technique < 0.6) { result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.4; result.message = 'Kem chưa mịn hoặc quá bông rồi.'; }
      if (result.valid && (this.preparation.amounts.salt || 0) > 0.405) result.message = 'Hơi mặn rồi!';
    }
    if (recipe.id === 'cotdua' && this.recipeId === 'cotdua') {
      const technique = this.preparation.blendTechnique || 0, time = this.preparation.blendTime || 0;
      result.perfectBlend = technique >= 0.99;
      result.tipMultiplier = result.valid && result.perfectBlend ? 1.15 : 1;
      if (result.valid && technique < 0.95 && result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; result.message = 'Dừa xay mịn vừa, ly vẫn ngon!'; }
      if (result.valid && technique < 0.6) { result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.4; result.message = time >= 5.6 ? 'Xay quá nhuyễn, dừa hơi loãng rồi.' : 'Dừa còn lợn cợn đá, xay thêm chút nha.'; }
      if (!result.valid && result.recipeCorrectness && (this.preparation.steps.blend?.amount || 0) < 0.4 && (this.preparation.amounts.coconutCream || 0) > 0) result.message = 'Cốt dừa chưa được xay!';
    }
    if (this.state !== 'BREWED') { result.message = this.nextStep(); return result; }
    if (recipe.stir && this.stir < RULES.stirRadians * 0.05 && result.recipeCorrectness) {
      return { ...result, valid: false, quality: 'INCORRECT', finalQuality: 'INCORRECT', score: 0, message: 'Khuấy thêm chút nữa! Vẽ vòng tròn trong ly.' };
    }
    return result;
  }
  evaluateTraTac(recipe, orderModifiers = undefined) {
    const mod = normalizeModifiers(orderModifiers !== undefined ? orderModifiers : null);
    const targets = modifierTargets(mod);
    const effectiveRecipe = {
      ...recipe,
      ingredients: recipe.ingredients.map(i => i.id === 'syrup' ? { ...i, target: targets.syrup } : i.id === 'ice' ? { ...i, target: targets.ice } : i),
      steps: recipe.steps.map(s => s.id === 'syrup' ? { ...s, target: targets.syrup } : s.id === 'ice' ? { ...s, target: targets.ice } : s),
    };
    const a = this.getAmounts();
    const p = this.preparation;
    const preparedFruit = this.recipeId === 'tratac' && (a.citrusJuice || 0) > 0 && (a.kumquat || 0) > 0;
    const kumquatTech = p.kumquatTechnique ?? (preparedFruit ? Math.min(1, (a.citrusJuice || 0) / (JUICE_TARGET * 0.9)) : 0);
    const steps = {
      place: preparedFruit ? (p.steps.place || { amount: a.kumquat || 0, technique: 1 }) : { amount: 0, technique: 0 },
      slice: preparedFruit ? (p.steps.slice || { amount: 1, technique: 1 }) : { amount: 0, technique: 0 },
      squeeze: preparedFruit ? (p.steps.squeeze || { amount: a.citrusJuice || 0, technique: kumquatTech }) : { amount: 0, technique: 0 },
      juice: preparedFruit ? (p.steps.juice || { amount: a.citrusJuice || 0, technique: kumquatTech }) : { amount: 0, technique: 0 },
      tea: { amount: a.tea || 0, technique: 1 },
      syrup: { amount: a.syrup || 0, technique: 1 },
      ice: { amount: a.ice || 0, technique: 1 },
      stir: p.steps.stir || { amount: 0, technique: 1 },
    };
    const result = evaluatePreparation(effectiveRecipe, a, steps, true);
    if (!result.valid) {
      if (result.recipeCorrectness && (steps.stir?.amount || 0) < RULES.stirRadians * 0.2) {
        result.message = 'Khuấy thêm cho đều vị trà tắc nhé!';
      } else if (!preparedFruit && (a.tea || 0) > 0) {
        result.message = 'Cắt và vắt 2 quả tắc ở khay 06 rồi rót vào ly nhé!';
      }
      return result;
    }
    const syrup = a.syrup || 0;
    const juice = a.citrusJuice || 0;
    const stirAmount = steps.stir?.amount || 0;
    if (syrup > targets.syrup * 1.4) {
      result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.4; result.message = 'Hơi ngọt quá rồi!';
    } else if (syrup > targets.syrup * 1.2) {
      if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
      result.message = 'Hơi ngọt quá rồi!';
    } else if (syrup < targets.syrup * 0.8) {
      if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
      result.message = 'Chưa đủ độ ngọt, thêm chút siro nhé!';
    }
    if (juice < JUICE_TARGET * 0.72 || kumquatTech < 0.65) {
      result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.4; result.message = 'Chưa vắt đủ nước tắc!';
    } else if ((juice < JUICE_TARGET * 0.9 || kumquatTech < 0.95) && result.quality === 'PERFECT') {
      result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; result.message = 'Chưa vắt đủ nước tắc!';
    }
    if (stirAmount < RULES.stirRadians * 0.85 && result.quality === 'PERFECT') {
      result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; result.message = 'Khuấy thêm cho đều vị trà tắc nhé!';
    }
    result.perfectCitrus = result.valid && result.quality === 'PERFECT' && kumquatTech >= 0.95;
    result.tipMultiplier = result.perfectCitrus ? 1.15 : 1;
    return result;
  }
  evaluateTraDao(recipe, orderModifiers = undefined) {
    if (this.recipeId !== 'tradao') {
      return { valid: false, quality: 'INCORRECT', finalQuality: 'INCORRECT', recipeCorrectness: false, amountAccuracy: 0, preparationTechnique: 0, score: 0, message: 'Chưa đúng công thức món khách gọi.' };
    }
    const mod = normalizeTraDaoModifiers(orderModifiers !== undefined ? orderModifiers : null);
    const targets = traDaoTargets(mod);
    const a = this.getAmounts();
    const p = this.preparation;
    const hasCore = (a.tea || 0) >= 60 && (a.peachSyrup || 0) >= 6 && (a.orangeJuice || 0) >= 12 && (a.peach || 0) >= 1 && (a.lemongrass || 0) >= 1 && (a.ice || 0) >= 1;
    const orangeTech = p.orangeTechnique ?? ((a.orangeJuice || 0) > 0 ? Math.min(1, (a.orangeJuice || 0) / (ORANGE_JUICE_TARGET * 0.9)) : 0);
    // Do not treat missing orange garnish slice or minor peach slice difference as an invalid recipe if all core ingredients are present.
    const effectiveGarnish = (a.orange || 0) >= 1 ? a.orange : hasCore ? 1 : 0;
    const effectiveRecipe = {
      ...recipe,
      ingredients: recipe.ingredients.map(i => i.id === 'peach' ? { ...i, target: targets.peach } : i),
      steps: recipe.steps.map(s => s.id === 'peach' ? { ...s, target: targets.peach } : s),
    };
    const evalAmounts = { ...a, orange: effectiveGarnish, peach: hasCore && (a.peach || 0) >= 1 ? Math.max(a.peach || 0, Math.ceil(targets.peach * 0.6)) : a.peach || 0 };
    const steps = {
      'orange-cut': (a.orangeJuice || 0) > 0 || (a.orange || 0) > 0 ? { amount: 1, technique: 1 } : { amount: 0, technique: 0 },
      'orange-squeeze': (a.orangeJuice || 0) > 0 ? { amount: a.orangeJuice || 0, technique: orangeTech } : { amount: 0, technique: 0 },
      'lemongrass-prep': (a.lemongrass || 0) > 0 ? { amount: 1, technique: 1 } : { amount: 0, technique: 0 },
      lemongrass: (a.lemongrass || 0) > 0 ? { amount: a.lemongrass || 0, technique: 1 } : { amount: 0, technique: 0 },
      peach: (a.peach || 0) > 0 ? { amount: evalAmounts.peach, technique: 1 } : { amount: 0, technique: 0 },
      tea: { amount: a.tea || 0, technique: 1 },
      peachSyrup: { amount: a.peachSyrup || 0, technique: 1 },
      orangeJuice: (a.orangeJuice || 0) > 0 ? { amount: a.orangeJuice || 0, technique: orangeTech } : { amount: 0, technique: 0 },
      ice: { amount: a.ice || 0, technique: 1 },
      'orange-garnish': { amount: effectiveGarnish, technique: (a.orange || 0) >= 1 ? 1 : 0.75 },
    };
    const result = evaluatePreparation(effectiveRecipe, evalAmounts, steps, true);
    if (!result.valid) return result;
    const peachCount = Math.round(a.peach || 0);
    const hasGarnish = (a.orange || 0) >= 1;
    const syrup = a.peachSyrup || 0;
    const juice = a.orangeJuice || 0;
    if (!hasGarnish) {
      if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.2; }
      result.message = 'Thiếu lát cam trang trí trên miệng ly, nhưng vị trà đào vẫn ngon!';
    }
    if (peachCount !== targets.peach) {
      if (Math.abs(peachCount - targets.peach) >= 2) {
        result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.5;
        result.message = peachCount < targets.peach ? 'Hơi ít đào so với khách dặn!' : 'Hơi nhiều đào quá tay rồi!';
      } else {
        if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
        result.message = peachCount < targets.peach ? 'Thêm 1 miếng đào nữa là chuẩn ý khách!' : 'Dư 1 miếng đào nhưng ly vẫn ngon!';
      }
    }
    if (syrup > targets.peachSyrup * 1.4 || syrup < targets.peachSyrup * 0.65) {
      result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.4;
      result.message = syrup > targets.peachSyrup ? 'Siro đào hơi ngọt quá tay rồi!' : 'Chưa đủ siro đào, vị còn hơi nhạt!';
    } else if (syrup > targets.peachSyrup * 1.2 || syrup < targets.peachSyrup * 0.8) {
      if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
      result.message = syrup > targets.peachSyrup ? 'Hơi nhiều siro đào một chút!' : 'Thêm chút siro đào cho dậy mùi nhé!';
    }
    if (juice < ORANGE_JUICE_TARGET * 0.7 || orangeTech < 0.65) {
      result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.4;
      result.message = 'Chưa vắt đủ nước cam tươi!';
    } else if ((juice < ORANGE_JUICE_TARGET * 0.9 || orangeTech < 0.95) && result.quality === 'PERFECT') {
      result.quality = result.finalQuality = 'GOOD'; result.score = 4.3;
      result.message = 'Vắt cam kỹ hơn chút nữa là tròn vị!';
    }
    result.perfectPeachTea = result.valid && result.quality === 'PERFECT' && hasGarnish && peachCount === targets.peach && orangeTech >= 0.95;
    result.tipMultiplier = result.perfectPeachTea ? 1.15 : 1;
    return result;
  }
  evaluateTraVai(recipe, orderModifiers = undefined) {
    if (this.recipeId !== 'travai') {
      return { valid: false, quality: 'INCORRECT', finalQuality: 'INCORRECT', recipeCorrectness: false, amountAccuracy: 0, preparationTechnique: 0, score: 0, message: 'Chưa đúng công thức món khách gọi.' };
    }
    const mod = normalizeTraVaiModifiers(orderModifiers !== undefined ? orderModifiers : null);
    const targets = traVaiTargets(mod);
    const a = this.getAmounts();
    const p = this.preparation;
    const hasCore = (a.tea || 0) >= 65 && (a.lycheeSyrup || 0) >= 4 && (a.lychee || 0) >= 1 && (a.ice || 0) >= 1;
    const rawLychee = Math.round(a.lychee || 0);
    // If an extra fruit was explicitly consumed for optional garnish on top of the target count, count the drink's base fruit as targets.lychee.
    const effectiveLychee = p.lycheeGarnish && !p.lycheeGarnishFromAllocated && rawLychee === targets.lychee + 1 ? targets.lychee : rawLychee;
    const effectiveRecipe = {
      ...recipe,
      ingredients: recipe.ingredients.map(i => i.id === 'lychee' ? { ...i, target: targets.lychee } : i.id === 'lycheeSyrup' ? { ...i, target: targets.lycheeSyrup } : i.id === 'ice' ? { ...i, target: targets.ice } : i),
      steps: recipe.steps.map(s => s.id === 'lychee' ? { ...s, target: targets.lychee } : s.id === 'lycheeSyrup' ? { ...s, target: targets.lycheeSyrup } : s.id === 'ice' ? { ...s, target: targets.ice } : s),
    };
    const evalAmounts = {
      ...a,
      lychee: hasCore && effectiveLychee >= 1 ? Math.max(effectiveLychee, Math.ceil(targets.lychee * 0.6)) : effectiveLychee,
    };
    const steps = {
      lychee: (a.lychee || 0) > 0 ? { amount: evalAmounts.lychee, technique: 1 } : { amount: 0, technique: 0 },
      lycheeSyrup: { amount: a.lycheeSyrup || 0, technique: 1 },
      tea: { amount: a.tea || 0, technique: 1 },
      ice: { amount: a.ice || 0, technique: 1 },
      stir: p.steps.stir || { amount: Math.PI * 2, technique: 1 },
    };
    const result = evaluatePreparation(effectiveRecipe, evalAmounts, steps, true);
    if (!result.valid) return result;
    const syrup = a.lycheeSyrup || 0;
    const iceCubes = Math.round(a.ice || 0);
    if (effectiveLychee !== targets.lychee) {
      if (Math.abs(effectiveLychee - targets.lychee) >= 2) {
        result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.5;
        result.message = effectiveLychee < targets.lychee ? 'Hơi ít trái vải so với khách dặn!' : 'Hơi nhiều vải quá tay rồi!';
      } else {
        if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
        result.message = effectiveLychee < targets.lychee ? 'Thêm 1 trái vải nữa là chuẩn ý khách!' : 'Dư 1 trái vải nhưng ly vẫn ngon!';
      }
    }
    if (syrup > targets.lycheeSyrup * 1.4 || syrup < targets.lycheeSyrup * 0.65) {
      result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.4;
      result.message = syrup > targets.lycheeSyrup ? 'Siro vải hơi ngọt quá tay rồi!' : 'Chưa đủ siro vải, vị còn hơi nhạt!';
    } else if (syrup > targets.lycheeSyrup * 1.2 || syrup < targets.lycheeSyrup * 0.8) {
      if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
      result.message = syrup > targets.lycheeSyrup ? 'Hơi nhiều siro vải một chút!' : 'Thêm chút siro vải cho thơm nhé!';
    }
    if (iceCubes !== targets.ice) {
      if (Math.abs(iceCubes - targets.ice) >= 2) {
        result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.5;
        result.message = iceCubes < targets.ice ? 'Chưa đủ đá theo ý khách!' : 'Hơi nhiều đá quá rồi!';
      } else if (result.quality === 'PERFECT') {
        result.quality = result.finalQuality = 'GOOD'; result.score = 4.3;
        result.message = iceCubes < targets.ice ? 'Thêm 1 viên đá nữa là vừa chuẩn!' : 'Hơi dư 1 viên đá nhưng vẫn mát ngon!';
      }
    }
    result.perfectLycheeTea = result.valid && result.quality === 'PERFECT' && effectiveLychee === targets.lychee && iceCubes === targets.ice;
    result.tipMultiplier = result.perfectLycheeTea ? 1.15 : 1;
    return result;
  }
  evaluateCacao(recipe, orderModifiers = undefined) {
    if (this.recipeId !== 'cacao') {
      return { valid: false, quality: 'INCORRECT', finalQuality: 'INCORRECT', recipeCorrectness: false, amountAccuracy: 0, preparationTechnique: 0, score: 0, message: 'Chưa đúng công thức món khách gọi.' };
    }
    const mod = normalizeCacaoModifiers(orderModifiers !== undefined ? orderModifiers : null);
    const targets = cacaoTargets(mod);
    const a = this.getAmounts();
    const p = this.preparation;
    const dissolveProgress = p.cacaoDissolveProgress ?? 0;
    const stage = cacaoDissolveStage(dissolveProgress);
    if ((a.cacao || 0) >= 5 && (a.water || 0) >= 10 && dissolveProgress < 0.25) {
      return {
        valid: false,
        quality: 'INCORRECT',
        finalQuality: 'INCORRECT',
        recipeCorrectness: false,
        amountAccuracy: 0,
        preparationTechnique: dissolveProgress,
        score: 0,
        dissolveStage: stage.id,
        message: 'Bột cacao còn vón cục! Hãy dùng muỗng khuấy xoay tròn cho tan nhé.',
      };
    }
    const effectiveRecipe = {
      ...recipe,
      ingredients: recipe.ingredients.map(i =>
        i.id === 'cacao' ? { ...i, target: targets.cacao }
          : i.id === 'water' ? { ...i, target: targets.water }
            : i.id === 'condensed' ? { ...i, target: targets.condensed }
              : i.id === 'milk' ? { ...i, target: targets.milk }
                : i.id === 'ice' ? { ...i, target: targets.ice } : i
      ),
      steps: recipe.steps.map(s =>
        s.id === 'cacao' ? { ...s, target: targets.cacao }
          : s.id === 'water' ? { ...s, target: targets.water }
            : s.id === 'condensed' ? { ...s, target: targets.condensed }
              : s.id === 'milk' ? { ...s, target: targets.milk }
                : s.id === 'ice' ? { ...s, target: targets.ice } : s
      ),
    };
    const hasCore = (a.cacao || 0) >= 10 && (a.water || 0) >= 15 && (a.condensed || 0) >= 5 && (a.milk || 0) >= 40 && (a.ice || 0) >= 1;
    const evalAmounts = {
      ...a,
      cacao: hasCore && (a.cacao || 0) >= 10 ? Math.max(a.cacao || 0, Math.ceil(targets.cacao * 0.6)) : a.cacao || 0,
    };
    const steps = {
      cacao: (a.cacao || 0) > 0 ? { amount: evalAmounts.cacao, technique: 1 } : { amount: 0, technique: 0 },
      water: { amount: a.water || 0, technique: 1 },
      stir: { amount: p.cacaoDissolveRadians || (dissolveProgress * CACAO_STIR_RADIANS), technique: 1 },
      condensed: { amount: a.condensed || 0, technique: 1 },
      milk: { amount: a.milk || 0, technique: 1 },
      ice: { amount: a.ice || 0, technique: 1 },
    };
    const result = evaluatePreparation(effectiveRecipe, evalAmounts, steps, true);
    result.dissolveStage = stage.id;
    if (!result.valid) return result;
    const cacao = a.cacao || 0;
    const water = a.water || 0;
    const condensed = a.condensed || 0;
    const milk = a.milk || 0;
    const iceCubes = Math.round(a.ice || 0);
    const cacaoDiff = Math.abs(cacao - targets.cacao);

    if (stage.id === 'PARTIAL') {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = 'Cacao chưa tan hết, uống còn hơi lợn cợn bột!';
    } else if (stage.id === 'SMOOTH' && result.quality === 'PERFECT') {
      result.quality = result.finalQuality = 'GOOD';
      result.score = 4.3;
      result.message = 'Cacao sánh mịn vừa, khuấy thêm chút nữa là hoàn hảo!';
    }

    if (cacaoDiff >= 10) {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = cacao > targets.cacao ? 'Quá nhiều bột cacao, vị hơi đắng đặc!' : 'Thiếu bột cacao so với khách dặn, vị hơi nhạt!';
    } else if (cacaoDiff >= 4) {
      if (result.quality === 'PERFECT') {
        result.quality = result.finalQuality = 'GOOD';
        result.score = 4.2;
      }
      result.message = cacao > targets.cacao ? 'Hơi dư bột cacao một chút!' : 'Thêm 1 muỗng bột cacao nữa là đúng độ đậm khách dặn!';
    }

    if (water > targets.water * 1.4 || water < targets.water * 0.65) {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = water > targets.water ? 'Nhiều nước nóng quá làm cacao bị loãng!' : 'Ít nước nóng quá làm cacao khó tan đều!';
    }

    if (condensed > targets.condensed * 1.4 || condensed < targets.condensed * 0.65) {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = condensed > targets.condensed ? 'Sữa đặc hơi nhiều, cacao ngọt gắt quá!' : 'Thiếu sữa đặc, cacao chưa đủ độ béo ngọt!';
    } else if (condensed > targets.condensed * 1.2 || condensed < targets.condensed * 0.8) {
      if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
      result.message = condensed > targets.condensed ? 'Hơi dư sữa đặc một chút!' : 'Thêm chút sữa đặc cho tròn vị nhé!';
    }

    if (milk > targets.milk * 1.35 || milk < targets.milk * 0.65) {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = milk > targets.milk ? 'Quá nhiều sữa tươi làm át vị cacao!' : 'Chưa đủ sữa tươi!';
    } else if (milk > targets.milk * 1.18 || milk < targets.milk * 0.82) {
      if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
      result.message = milk > targets.milk ? 'Hơi nhiều sữa tươi một chút!' : 'Thêm chút sữa tươi nữa là vừa chuẩn!';
    }

    if (iceCubes !== targets.ice) {
      if (Math.abs(iceCubes - targets.ice) >= 2) {
        result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.5;
        result.message = iceCubes < targets.ice ? 'Hơi ít đá!' : 'Hơi nhiều đá quá rồi!';
      } else if (result.quality === 'PERFECT') {
        result.quality = result.finalQuality = 'GOOD'; result.score = 4.3;
        result.message = 'Lệch 1 viên đá nhưng cacao vẫn ngon!';
      }
    }

    result.perfectCacao = result.valid && result.quality === 'PERFECT' && stage.id === 'DISSOLVED' && cacaoDiff < 2;
    result.tipMultiplier = result.perfectCacao ? 1.15 : 1;
    return result;
  }
  evaluateMatcha(recipe, orderModifiers = undefined) {
    if (this.recipeId !== 'matcha') {
      return { valid: false, quality: 'INCORRECT', finalQuality: 'INCORRECT', recipeCorrectness: false, amountAccuracy: 0, preparationTechnique: 0, score: 0, message: 'Chưa đúng công thức món khách gọi.' };
    }
    const mod = normalizeMatchaModifiers(orderModifiers !== undefined ? orderModifiers : this.modifiers);
    const targets = matchaTargets(mod);
    const a = this.getAmounts();
    const p = this.preparation;
    const whiskProgress = p.matchaWhiskProgress ?? Math.min(1, (p.steps.whisk?.amount || 0) / MATCHA_WHISK_TARGET);
    const stage = matchaWhiskStage(whiskProgress);
    if ((a.matcha || 0) >= 1 && (a.water || 0) >= 10 && whiskProgress < 0.25) {
      return {
        valid: false,
        quality: 'INCORRECT',
        finalQuality: 'INCORRECT',
        recipeCorrectness: false,
        amountAccuracy: 0,
        preparationTechnique: whiskProgress,
        score: 0,
        whiskStage: stage.id,
        message: 'Matcha còn vón cục! Hãy dùng chổi tre chasen đánh chữ W cho tan và lên bọt mịn nhé.',
      };
    }
    const needsSyrup = targets.syrup > 0;
    const effectiveIngredients = recipe.ingredients
      .filter(i => needsSyrup || i.id !== 'syrup')
      .map(i =>
        i.id === 'matcha' ? { ...i, target: targets.matcha }
          : i.id === 'water' ? { ...i, target: targets.water }
            : i.id === 'milk' ? { ...i, target: targets.milk }
              : i.id === 'syrup' ? { ...i, target: targets.syrup }
                : i.id === 'ice' ? { ...i, target: targets.ice } : i
      );
    const effectiveSteps = recipe.steps
      .filter(s => needsSyrup || s.id !== 'syrup')
      .map(s =>
        s.id === 'matcha' || s.id === 'pourMatcha' ? { ...s, target: targets.matcha }
          : s.id === 'water' ? { ...s, target: targets.water }
            : s.id === 'milk' ? { ...s, target: targets.milk }
              : s.id === 'syrup' ? { ...s, target: targets.syrup, required: true }
                : s.id === 'ice' ? { ...s, target: targets.ice } : s
      );
    const effectiveRecipe = { ...recipe, ingredients: effectiveIngredients, steps: effectiveSteps };
    const hasCore = (a.matcha || 0) >= 2 && (a.water || 0) >= 18 && (a.milk || 0) >= 65 && (a.ice || 0) >= 1 && (!needsSyrup || (a.syrup || 0) >= 3);
    const evalAmounts = {
      ...a,
      matcha: hasCore && (a.matcha || 0) >= 2 ? Math.max(a.matcha || 0, Math.ceil(targets.matcha * 0.6)) : a.matcha || 0,
    };
    if (!needsSyrup && (a.syrup || 0) > 0) {
      delete evalAmounts.syrup;
    }
    const whiskAmount = p.matchaWhiskDistance ?? (whiskProgress * MATCHA_WHISK_TARGET);
    const steps = {
      matcha: (a.matcha || 0) > 0 ? { amount: evalAmounts.matcha, technique: 1 } : { amount: 0, technique: 0 },
      water: { amount: a.water || 0, technique: 1 },
      whisk: { amount: whiskAmount, technique: 1 },
      ice: { amount: a.ice || 0, technique: 1 },
      milk: { amount: a.milk || 0, technique: 1 },
      syrup: { amount: a.syrup || 0, technique: 1 },
      pourMatcha: (a.matcha || 0) > 0 ? { amount: evalAmounts.matcha, technique: 1 } : { amount: 0, technique: 0 },
    };
    const result = evaluatePreparation(effectiveRecipe, evalAmounts, steps, true);
    result.whiskStage = stage.id;
    if (!result.valid) {
      if ((a.milk || 0) > 0 && (a.matcha || 0) <= 0) {
        result.message = 'Hãy đánh matcha ở bát rồi nghiêng bát rót lên lớp sữa tươi nhé!';
      }
      return result;
    }
    const matcha = a.matcha || 0;
    const water = a.water || 0;
    const milk = a.milk || 0;
    const syrup = a.syrup || 0;
    const iceCubes = Math.round(a.ice || 0);
    const matchaDiff = Math.abs(matcha - targets.matcha);

    if (stage.id === 'MIXING') {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = 'Matcha chưa tan hết bọt, uống còn hơi vón bột!';
    } else if (stage.id === 'SMOOTH' && result.quality === 'PERFECT') {
      result.quality = result.finalQuality = 'GOOD';
      result.score = 4.3;
      result.message = 'Matcha mịn vừa, đánh thêm chút nữa là lên lớp bọt mịn hoàn hảo!';
    }

    if (matchaDiff >= 3) {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = matcha > targets.matcha ? 'Quá nhiều bột matcha, vị chát đắng quá tay!' : 'Thiếu bột matcha, vị trà xanh còn nhạt!';
    } else if (matchaDiff >= 1.5) {
      if (result.quality === 'PERFECT') {
        result.quality = result.finalQuality = 'GOOD';
        result.score = 4.2;
      }
      result.message = matcha > targets.matcha ? 'Hơi dư bột matcha một chút!' : 'Thêm 1 muỗng bột matcha nữa là chuẩn vị khách dặn!';
    }

    if (water > targets.water * 1.4 || water < targets.water * 0.65) {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = water > targets.water ? 'Nhiều nước ấm quá làm lớp matcha bị loãng!' : 'Ít nước ấm quá làm bột matcha khó tan đều!';
    }

    if (milk > targets.milk * 1.35 || milk < targets.milk * 0.65) {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = milk > targets.milk ? 'Quá nhiều sữa tươi làm át vị matcha!' : 'Chưa đủ sữa tươi!';
    } else if (milk > targets.milk * 1.18 || milk < targets.milk * 0.82) {
      if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
      result.message = milk > targets.milk ? 'Hơi nhiều sữa tươi một chút!' : 'Thêm chút sữa tươi nữa là vừa chuẩn!';
    }

    if (!needsSyrup && syrup > 2) {
      result.quality = result.finalQuality = 'ACCEPTABLE';
      result.score = 3.4;
      result.message = 'Khách dặn không đường mà lỡ cho siro rồi!';
    } else if (needsSyrup) {
      if (syrup > targets.syrup * 1.45 || syrup < targets.syrup * 0.6) {
        result.quality = result.finalQuality = 'ACCEPTABLE';
        result.score = 3.4;
        result.message = syrup > targets.syrup ? 'Hơi nhiều siro đường so với khách dặn ít ngọt!' : 'Chưa đủ siro đường!';
      } else if (syrup > targets.syrup * 1.2 || syrup < targets.syrup * 0.8) {
        if (result.quality === 'PERFECT') { result.quality = result.finalQuality = 'GOOD'; result.score = 4.3; }
        result.message = syrup > targets.syrup ? 'Hơi dư chút siro đường!' : 'Thêm chút siro đường nữa là vừa vị!';
      }
    }

    if (iceCubes !== targets.ice) {
      if (Math.abs(iceCubes - targets.ice) >= 2) {
        result.quality = result.finalQuality = 'ACCEPTABLE'; result.score = 3.5;
        result.message = iceCubes < targets.ice ? 'Hơi ít đá!' : 'Hơi nhiều đá quá rồi!';
      } else if (result.quality === 'PERFECT') {
        result.quality = result.finalQuality = 'GOOD'; result.score = 4.3;
        result.message = 'Lệch 1 viên đá nhưng matcha latte vẫn ngon!';
      }
    }

    result.perfectMatcha = result.valid && result.quality === 'PERFECT' && stage.id === 'MICROFOAM' && matchaDiff < 1;
    result.tipMultiplier = result.perfectMatcha ? 1.15 : 1;
    return result;
  }
  nextStep(orderModifiers = undefined) {
    const recipe = RECIPES[this.recipeId];
    if (this.recipeId === 'tratac') {
      const mod = normalizeModifiers(orderModifiers !== undefined ? orderModifiers : this.modifiers);
      const targets = modifierTargets(mod);
      const a = this.preparation.amounts;
      const modNote = formatModifierLabel(mod);
      if (!((a.citrusJuice || 0) >= JUICE_TARGET * 0.5)) return 'Cắt & vắt 2 quả tắc ở khay 06, rồi rót nước tắc vào ly.';
      if (!((a.tea || 0) >= targets.tea * 0.8)) return `Nghiêng bình trà rót ${targets.tea} ml trà vào ly.`;
      if (!((a.syrup || 0) >= targets.syrup * 0.7)) return `Nghiêng chai siro rót ${targets.syrup} ml${modNote ? ` (${modNote})` : ''}.`;
      if (!((a.ice || 0) >= targets.ice)) return `Xúc ${targets.iceGrams} g đá (${targets.ice} viên) thả vào ly.`;
      if (!((this.preparation.steps.stir?.amount || 0) >= RULES.stirRadians * 0.2)) return 'Khuấy vòng tròn trong ly cho đều vị trà tắc.';
      const result = this.evaluate('tratac', mod);
      return result.valid ? 'Kéo ly trà tắc đến khách.' : result.message;
    }
    if (this.recipeId === 'tradao') {
      const mod = normalizeTraDaoModifiers(orderModifiers !== undefined ? orderModifiers : this.modifiers);
      const targets = traDaoTargets(mod);
      const a = this.preparation.amounts;
      const modNote = formatTraDaoModifierLabel(mod);
      if (!((a.lemongrass || 0) >= 1)) return 'Đập dập 1 nhánh sả trên thớt khay 07 rồi thả vào ly.';
      if (!((a.peach || 0) >= targets.peach)) return `Dùng kẹp gắp ${targets.peach} miếng đào ngâm thả vào ly${modNote ? ` (${modNote})` : ''}.`;
      if (!((a.tea || 0) >= targets.tea * 0.8)) return `Nghiêng bình trà rót ${targets.tea} ml trà vào ly.`;
      if (!((a.peachSyrup || 0) >= targets.peachSyrup * 0.75)) return `Nghiêng chai siro đào rót ${targets.peachSyrup} ml vào ly.`;
      if (!((a.orangeJuice || 0) >= ORANGE_JUICE_TARGET * 0.6)) return 'Cắt & vắt cam tươi ở khay 07, rồi rót nước cam vào ly.';
      if (!((a.ice || 0) >= targets.ice)) return `Xúc ${targets.iceGrams} g đá (${targets.ice} viên) thả vào ly.`;
      if (!((a.orange || 0) >= 1)) return 'Kéo lát cam tươi từ thớt gắn lên miệng ly trang trí.';
      const result = this.evaluate('tradao', mod);
      return result.valid ? 'Kéo ly trà đào cam sả đến khách.' : result.message;
    }
    if (this.recipeId === 'travai') {
      const mod = normalizeTraVaiModifiers(orderModifiers !== undefined ? orderModifiers : this.modifiers);
      const targets = traVaiTargets(mod);
      const a = this.preparation.amounts;
      const modNote = formatTraVaiModifierLabel(mod);
      if (!((a.lychee || 0) >= targets.lychee)) return `Dùng muỗng múc ${targets.lychee} trái vải ngâm thả vào ly${modNote ? ` (${modNote})` : ''}.`;
      if (!((a.lycheeSyrup || 0) >= targets.lycheeSyrup * 0.75)) return `Nghiêng bình siro vải rót ${targets.lycheeSyrup} ml vào ly.`;
      if (!((a.tea || 0) >= targets.tea * 0.8)) return `Nghiêng bình trà rót ${targets.tea} ml trà vàng nhạt vào ly.`;
      if (!((a.ice || 0) >= targets.ice)) return `Xúc ${targets.iceGrams} g đá (${targets.ice} viên) thả vào ly.`;
      const result = this.evaluate('travai', mod);
      return result.valid ? 'Kéo ly trà vải đến khách (hoặc gắn vải trang trí tùy chọn).' : result.message;
    }
    if (this.recipeId === 'cacao') {
      const mod = normalizeCacaoModifiers(orderModifiers !== undefined ? orderModifiers : this.modifiers);
      const targets = cacaoTargets(mod);
      const a = this.preparation.amounts;
      const modNote = formatCacaoModifierLabel(mod);
      const stage = cacaoDissolveStage(this.preparation.cacaoDissolveProgress || 0);
      if (!((a.cacao || 0) >= targets.cacao)) return `Dùng muỗng múc bột cacao thả vào ly (${Math.round(a.cacao || 0)}/${targets.cacao} g · ${targets.cacaoScoops} muỗng${modNote ? ` · ${modNote}` : ''}).`;
      if (!((a.water || 0) >= targets.water * 0.8)) return `Kéo ấm nước nóng nghiêng rót ${targets.water} ml làm ướt bột cacao.`;
      if ((this.preparation.cacaoDissolveProgress || 0) < 0.92) return `Khuấy vòng tròn trong ly cho cacao tan hết vón cục (${stage.label}).`;
      if (!((a.condensed || 0) >= targets.condensed * 0.8)) return `Nghiêng lon rót ${targets.condensed} ml sữa đặc vào cacao.`;
      if (!((a.milk || 0) >= targets.milk * 0.85)) return `Nghiêng bình rót ${targets.milk} ml sữa tươi hòa quyện.`;
      if (!((a.ice || 0) >= targets.ice)) return `Xúc ${targets.iceGrams} g đá (${targets.ice} viên) thả vào ly.`;
      const result = this.evaluate('cacao', mod);
      return result.valid ? 'Kéo ly cacao sữa đá đến khách.' : result.message;
    }
    if (this.recipeId === 'matcha') {
      const mod = normalizeMatchaModifiers(orderModifiers !== undefined ? orderModifiers : this.modifiers);
      const targets = matchaTargets(mod);
      const a = this.preparation.amounts;
      const modNote = formatMatchaModifierLabel(mod);
      if (!((a.ice || 0) >= targets.ice)) return `Xúc ${targets.iceGrams} g đá (${targets.ice} viên) thả vào ly.`;
      if (!((a.milk || 0) >= targets.milk * 0.85)) return `Nghiêng bình rót ${targets.milk} ml sữa tươi vào ly đá.`;
      if (targets.syrup > 0 && !((a.syrup || 0) >= targets.syrup * 0.75)) return `Nghiêng chai siro đường rót ${targets.syrup} ml (${modNote}).`;
      if (!((a.matcha || 0) >= targets.matcha * 0.8)) return `Múc ${targets.matcha} g bột matcha + ${targets.water} ml nước ấm vào bát ở khay 10, đánh chổi tre chữ W rồi rót lên mặt sữa.`;
      const result = this.evaluate('matcha', mod);
      return result.valid ? 'Kéo ly matcha latte đá đến khách.' : result.message;
    }
    if (recipe?.engine !== 'phin') return recipe?.steps.find(s => (this.preparation.steps[s.id]?.amount || 0) < s.target)?.instruction || 'Kéo ly đến khách.';
    if (this.recipeId === 'cotdua' && this.state === 'GLASS') return (this.preparation.amounts.coconutCream || 0) > 0 ? 'Đã có dừa xay. Kéo phin lên ly để pha cà phê.' : 'Xay cốt dừa ở khay 05 rồi rót vào ly, hoặc đặt phin trước.';
    if (this.state === 'GLASS') return 'Kéo phin lên ly.';
    if (this.state === 'PHIN') return this.grounds ? 'Kéo lõi vào phin, giữ để nén.' : 'Kéo muỗng vào hũ bột, rồi vào phin.';
    if (this.state === 'PRESSED') return 'Kéo ấm vào phin, giữ rót rồi thả.';
    if (this.state === 'POURING') return 'Thả tay khi nước chạm vạch xanh.';
    if (this.state === 'BREWING') return 'Phin đang nhỏ giọt, chờ một chút nhé.';
    if (this.recipeId === 'muoi') { const result = this.evaluate('muoi'); return result.valid ? 'Kéo ly cà phê muối đến khách.' : result.message; }
    if (this.recipeId === 'cotdua') {
      if (!((this.preparation.amounts.coconutCream || 0) > 0)) return 'Rót cốt dừa đã xay từ cối vào ly (khay 05).';
      if (this.coffeeSource.volume > 0.01) return 'Kéo ca phin vào ly, nghiêng rót cà phê lên lớp dừa.';
      const result = this.evaluate('cotdua'); return result.valid ? 'Kéo ly cà phê cốt dừa đến khách.' : result.message;
    }
    return 'Thêm nguyên liệu, rồi kéo ly đến khách.';
  }
}
