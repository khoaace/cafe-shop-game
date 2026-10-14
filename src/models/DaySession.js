import { ARCHETYPES, RECIPES, RULES, unlockedRecipes } from '../config.js';
import { Customer } from './Customer.js';
import { normalizeUpgrades, difficulty } from '../logic/upgrades.js';
import { VIPS, seededRandom } from '../logic/dayPlan.js';
import { emptyRecipes, emptyStories, STORIES, storyAfter, challengeProgress } from '../logic/progression.js';
import { INGREDIENTS, INITIAL_INVENTORY, emptyIngredientTotals, normalizeInventory, canPrepareRecipe, ingredientValue } from '../logic/inventory.js';
export class DaySession {
  constructor(day = 1, tutorial = false, random = Math.random, options = {}) {
    this.day = day; this.tutorial = tutorial; this.plan = tutorial ? null : options.plan || null;
    this.random = this.plan ? seededRandom(this.plan.seed) : random; this.elapsed = 0;
    this.upgrades = normalizeUpgrades(tutorial ? {} : options.upgrades || { phins: 2 });
    this.difficulty = difficulty(day, this.upgrades); this.stories = options.stories || emptyStories();
    this.customers = []; this.nextSpawn = 0; this.spawnCount = 0; this.ended = false;
    this.revenue = 0; this.tips = 0; this.bonuses = 0; this.served = 0; this.lost = 0;
    this.perfect = 0; this.combo = 0; this.bestCombo = 0; this.ratings = []; this.review = '';
    this.recipes = emptyRecipes(); this.storyEncounters = new Set(); this.storyMessages = [];
    this.rushServed = 0; this.rushLost = 0; this.vipSpawned = false; this.wrongOrders = 0;
    this.openingInventory = normalizeInventory(options.inventory || INITIAL_INVENTORY); this.inventory = normalizeInventory(this.openingInventory);
    this.ingredientUsed = emptyIngredientTotals(); this.ingredientWasted = emptyIngredientTotals(); this.preparedRecipeProvider = () => [];
    this.stockout = false; this.endReason = null;
    this.maxCustomers = tutorial ? 1 : this.difficulty.capacity;
  }
  get event() { return this.plan?.event || null; }
  get rush() { return !this.tutorial && this.elapsed >= RULES.rushStart && this.elapsed < RULES.rushEnd; }
  get powerOut() { return this.event === 'outage' && this.elapsed >= 45 && this.elapsed < 75; }
  get fanActive() { return this.upgrades.fan && !this.powerOut; }
  get earnings() { return this.revenue + this.tips + this.bonuses; }
  get rating() { return this.ratings.length ? this.ratings.reduce((a, b) => a + b, 0) / this.ratings.length : 0; }
  get challenge() { return challengeProgress(this.plan?.challenge, this); }
  arrivalInterval() { return (this.rush ? this.difficulty.rushInterval : this.difficulty.normalInterval) * (this.event === 'rain' ? 1.25 : this.event === 'festival' ? 0.85 : 1); }
  setPreparedRecipeProvider(provider) { this.preparedRecipeProvider = typeof provider === 'function' ? provider : () => []; }
  canPrepare(recipeId) { return this.tutorial || canPrepareRecipe(this.inventory, recipeId); }
  availableRecipes() {
    if (this.tutorial) return ['den'];
    const prepared = new Set(this.preparedRecipeProvider() || []);
    return unlockedRecipes(this.day, this.upgrades).filter(id => this.canPrepare(id) || prepared.has(id));
  }
  consumeIngredient(id, amount) {
    if (!Object.hasOwn(INGREDIENTS, id) || !Number.isFinite(amount) || amount <= 0) return 0;
    if (this.tutorial) return amount;
    const used = Math.min(this.inventory[id], amount);
    if (used <= 1e-9) return 0;
    this.inventory[id] = Math.max(0, Math.round((this.inventory[id] - used) * 1000) / 1000);
    this.ingredientUsed[id] = Math.round((this.ingredientUsed[id] + used) * 1000) / 1000;
    return used;
  }
  refundIngredient(id, amount) {
    if (this.tutorial || !Object.hasOwn(INGREDIENTS, id) || !Number.isFinite(amount) || amount <= 0) return;
    this.inventory[id] = Math.round((this.inventory[id] + amount) * 1000) / 1000;
    this.ingredientUsed[id] = Math.max(0, Math.round((this.ingredientUsed[id] - amount) * 1000) / 1000);
  }
  // Discarded preparations stay consumed; the amounts are reported as waste (stock units).
  recordWaste(amounts) {
    if (this.tutorial || !amounts) return 0;
    let total = 0;
    for (const [id, amount] of Object.entries(amounts)) if (Object.hasOwn(INGREDIENTS, id) && Number.isFinite(amount) && amount > 0) {
      const wasted = Math.min(amount, this.ingredientUsed[id] - this.ingredientWasted[id]);
      if (wasted > 1e-9) { this.ingredientWasted[id] = Math.round((this.ingredientWasted[id] + wasted) * 1000) / 1000; total += wasted; }
    }
    return total;
  }
  recordDrinkWaste(drink) {
    if (!drink || drink.consumed) return 0;
    const a = drink.getAmounts();
    return this.recordWaste({ coffee: a.coffee, condensed: a.condensed, milk: a.milk, egg: a.foam, ice: (a.ice || 0) / 3, cream: a.cream, salt: a.salt, coconutCream: a.coconutCream });
  }
  addGrounds(drink, amount) {
    if (!drink || drink.state !== 'PHIN') return 0;
    const used = this.consumeIngredient('coffee', amount);
    if (!used || !drink.addGrounds(used)) { this.refundIngredient('coffee', used); return 0; }
    return used;
  }
  pourIngredient(drink, kind, amount) {
    if (!drink || !Object.hasOwn(INGREDIENTS, kind) || drink.consumed) return 0;
    const used = this.consumeIngredient(kind, amount);
    const accepted = used ? drink.addMeasuredIngredient(kind, used) : 0;
    this.refundIngredient(kind, used - accepted);
    return accepted;
  }
  // Blender jar: stock is charged exactly when an ingredient enters the jar; blending and serving never charge again.
  pourIntoBlender(jar, kind, amount) {
    if (!jar || jar.lid || !['coconutCream', 'condensed'].includes(kind)) return 0;
    const used = this.consumeIngredient(kind, amount), accepted = used ? jar.add(kind, used) : 0;
    this.refundIngredient(kind, used - accepted); return accepted;
  }
  scoopIceIntoBlender(jar, cubes = 3) {
    if (!jar || jar.lid) return 0;
    const wanted = Math.min(cubes, 12 - (jar.amounts.ice || 0)), taken = wanted > 0 ? this.tutorial ? wanted : this.consumeIngredient('ice', wanted / 3) * 3 : 0;
    const accepted = Math.floor(taken + 1e-9) ? jar.add('ice', Math.floor(taken + 1e-9)) : 0;
    this.refundIngredient('ice', (taken - accepted) / 3); return accepted;
  }
  addIce(drink) {
    if (!drink || drink.consumed || (!this.tutorial && this.inventory.ice < 1)) return false;
    const used = this.consumeIngredient('ice', 1);
    if ((!used && !this.tutorial) || !drink.addIngredient('ice', 3)) { this.refundIngredient('ice', used); return false; }
    return true;
  }
  ingredientSummary() {
    const used = normalizeInventory(this.ingredientUsed, emptyIngredientTotals());
    const wasted = normalizeInventory(this.ingredientWasted, emptyIngredientTotals());
    return { opening: { ...this.openingInventory }, remaining: { ...this.inventory }, used, cost: ingredientValue(used), wasted, wasteCost: ingredientValue(wasted) };
  }
  spawn() {
    const occupied = new Set(this.customers.map(c => c.seat));
    const seat = Array.from({ length: this.upgrades.seats }, (_, i) => i).find(s => !occupied.has(s));
    if (seat === undefined || this.customers.filter(c => !c.resolved).length >= this.maxCustomers) return null;
    const unlocked = unlockedRecipes(this.day, this.upgrades), recipes = this.availableRecipes();
    if (!recipes.length) { this.stockout = true; return null; }
    const scheduled = unlocked[this.spawnCount % unlocked.length];
    const start = unlocked.indexOf(scheduled);
    const recipeId = Array.from({ length: unlocked.length }, (_, i) => unlocked[(start + i) % unlocked.length]).find(id => recipes.includes(id));
    let archetype = ARCHETYPES[this.spawnCount % ARCHETYPES.length], vip = false;
    if (this.plan?.vip && !this.vipSpawned && this.spawnCount >= this.plan.vipAt) {
      archetype = VIPS.find(v => v.id === this.plan.vip) || archetype; vip = true; this.vipSpawned = true;
    }
    const c = new Customer(archetype, recipeId, seat, this.tutorial);
    c.vip = vip; c.wrongOrders = 0;
    this.customers.push(c); this.spawnCount++; return c;
  }
  update(seconds) {
    if (this.ended) return [];
    const events = []; seconds = Math.max(0, seconds);
    const before = this.elapsed; this.elapsed += seconds;
    // Integrate the fan over the outage boundary rather than applying a whole long frame incorrectly.
    const outageOverlap = this.event === 'outage' ? Math.max(0, Math.min(this.elapsed, 75) - Math.max(before, 45)) : 0;
    const patienceSeconds = this.upgrades.fan ? seconds * 0.85 + outageOverlap * 0.15 : seconds;
    for (const customer of [...this.customers]) {
      customer.update(seconds, patienceSeconds);
      if (customer.state === 'WAITING' && customer.ratio <= 0) {
        if (this.lose(customer)) events.push({ type: 'lost', customer });
      }
      if (customer.state === 'LEAVING' && customer.stateTime > 1.2) this.customers = this.customers.filter(c => c.id !== customer.id);
    }
    if (!this.tutorial && !this.customers.some(c => !c.resolved) && this.availableRecipes().length === 0) {
      this.stockout = true; this.ended = true; this.endReason = 'stockout'; events.push({ type: 'end', reason: 'stockout' }); return events;
    }
    if (!this.tutorial && this.elapsed >= RULES.daySeconds) {
      for (const c of this.customers) if (!c.resolved) {
        if (c.state !== 'WAITING') { c.state = 'WAITING'; c.stateTime = 0; }
        if (this.lose(c)) events.push({ type: 'lost', customer: c });
      }
      this.ended = true; this.endReason = 'closing'; events.push({ type: 'end', reason: 'closing' }); return events;
    }
    if (this.tutorial && this.served >= 3) { this.ended = true; events.push({ type: 'end' }); return events; }
    if ((this.tutorial || this.elapsed < RULES.lastArrival) && this.elapsed >= this.nextSpawn) {
      const customer = this.spawn();
      if (customer) { events.push({ type: 'arrived', customer }); this.nextSpawn = this.elapsed + (this.tutorial ? 1 : this.arrivalInterval()); }
      else if (!this.tutorial && this.stockout && !this.customers.some(c => !c.resolved)) {
        this.ended = true; this.endReason = 'stockout'; events.push({ type: 'end', reason: 'stockout' }); return events;
      }
    }
    return events;
  }
  lose(customer) {
    if (!this.customers.includes(customer) || !customer.resolve('lost')) return false;
    this.lost++; this.combo = 0; this.ratings.push(2); if (this.rush) this.rushLost++;
    this.setReview(['Cà phê thơm mà chờ lâu quá, hẹn quán lần sau.', 'Ghế còn ấm mà phải đi rồi. Mai quán pha nhanh hơn nha.']); return true;
  }
  setReview(lines) {
    const choices = lines.filter(line => line !== this.review);
    this.review = choices[Math.floor(this.random() * choices.length)] || lines[0];
  }
  serve(customer, drink) {
    if (this.ended || !customer || !this.customers.includes(customer) || customer.resolved || customer.state !== 'WAITING' || !drink || drink.consumed) return { valid: false, ignored: true, message: 'Khách chưa gọi món hoặc đã rời đi.' };
    const result = drink.evaluate(customer.recipeId);
    if (!result.valid) { this.combo = 0; customer.wrongOrders++; this.wrongOrders++; this.setReview(['Gọi một món, đưa một món khác. Quán xem lại sổ nha!', 'Ly này chưa đúng món của mình, nhờ quán pha lại nhé.']); return result; }
    if (!customer.resolve('served')) return { valid: false, ignored: true };
    drink.consumed = true;
    if (customer.recipeId === 'muoi') { customer.servedDrink = drink; if (result.quality === 'ACCEPTABLE') customer.type = { ...customer.type, happy: 'Kem hơi lệch vị, lần sau pha khéo hơn nha.' }; }
    if (customer.recipeId === 'cotdua') { customer.servedDrink = drink; if (result.quality === 'ACCEPTABLE') customer.type = { ...customer.type, happy: result.message.includes('loãng') ? 'Dừa hơi loãng, lần sau xay vừa thôi nha.' : 'Còn hơi lợn cợn đá, lần sau xay mịn hơn nha.' }; }
    const price = RECIPES[customer.recipeId].price;
    const premium = this.upgrades.premium && ['sua', 'bac'].includes(customer.recipeId) ? 1.2 : 1;
    const eventTip = this.event === 'rain' ? 1.2 : this.event === 'lucky' ? 1.25 : 1;
    const tip = Math.round(price * RULES.tipRates[result.quality] * (result.tipMultiplier || 1) * premium * eventTip * (customer.vip ? 1.5 : 1) / 100) * 100;
    this.revenue += price; this.tips += tip; this.served++; this.combo++; this.recipes[customer.recipeId] = (this.recipes[customer.recipeId] || 0) + 1;
    if (this.rush) this.rushServed++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const reviewerBonus = customer.type.id === 'reviewer' && result.quality === 'PERFECT' ? 10000 : 0;
    const bonus = (RULES.comboRewards[this.combo] || 0) + reviewerBonus;
    this.bonuses += bonus;
    if (result.quality === 'PERFECT') this.perfect++;
    const rating = Math.min(5, Math.max(3, result.score - (customer.ratio < 0.25 ? 0.4 : 0) - (customer.wrongOrders ? 0.2 : 0) + (this.upgrades.decor ? 0.1 : 0)));
    this.ratings.push(rating); if (reviewerBonus) this.ratings.push(5);
    const id = customer.type.id;
    let story = null;
    if (!this.tutorial && STORIES[id] && !this.storyEncounters.has(id)) {
      this.storyEncounters.add(id);
      const previous = this.stories[id] || emptyStories()[id], next = storyAfter(previous, this.day);
      if (next.chapter > previous.chapter) {
        story = { id, chapter: next.chapter, name: STORIES[id].name, text: STORIES[id].chapters[next.chapter - 1] }; this.storyMessages.push(story);
      }
    }
    const lines = customer.wrongOrders ? ['Pha lại đúng rồi! Nhớ nhìn đơn trước nha quán.', 'Hơi lộn món lúc đầu, nhưng quán sửa rất dễ thương.']
      : customer.ratio < 0.25 ? ['Cà phê ổn, mà ngồi chờ tới thuộc bài nhạc luôn.', 'Ngon đó, lần sau pha nhanh chút cho kịp giờ làm nha.']
        : result.quality === 'PERFECT' ? ['Cà phê ngon, ghế nhựa hơi thấp mà lòng vui quá!', 'Một ngụm là thấy Sài Gòn dễ thương liền!', 'Phin nhỏ từng giọt, niềm vui đầy cả ly.']
          : ['Quán nhỏ mà có gu. Mai ghé tiếp!', 'Cà phê vừa miệng, buổi sáng vừa vui.'];
    this.setReview(lines);
    return { ...result, price, tip, bonus, reviewerBonus, story, total: price + tip + bonus };
  }
  summary() {
    return { day: this.day, tutorial: this.tutorial, revenue: this.revenue, tips: this.tips, bonuses: this.bonuses, earnings: this.earnings,
      served: this.served, lost: this.lost, perfect: this.perfect, bestCombo: this.bestCombo, elapsed: this.elapsed, ended: this.ended,
      event: this.event, challenge: this.plan?.challenge, challengeComplete: this.challenge.complete,
      recipes: { ...this.recipes }, storyEncounters: [...this.storyEncounters], rushServed: this.rushServed, rushLost: this.rushLost, wrongOrders: this.wrongOrders,
      ingredients: this.ingredientSummary(), endReason: this.endReason,
      rating: this.rating, ratings: [...this.ratings], review: this.review || 'Một buổi sáng yên tĩnh. Ngày mai mình thử lại nhé!' };
  }
}
