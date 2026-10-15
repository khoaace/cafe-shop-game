import { RECIPES, RULES, COLORS as C } from '../config.js';
import { label, round, createCupArt } from './art.js';
import { itemImage } from './itemAssets.js';
import { stationPosition } from '../logic/layout.js';
import { button } from '../ui/widgets.js';
export class StationView {
  constructor(scene, model, index, x) {
    this.scene = scene; this.index = index; this.x = x; this.y = 517;
    this.model = model; this.visible = true; this.lastBase = null;
    this.base = scene.add.graphics();
    this.recipe = button(scene, x, 433, 186, 30, '01  ·  Đen đá  ▾', () => scene.openBook(this.model.recipeId, index), { size: 12, fill: 0x345f50, color: '#fff2d4', radius: 7 });
    this.coaster = itemImage(scene, 'coaster', x, this.y + 32 * 0.78).setDepth(34);
    this.cup = createCupArt(scene).setDepth(35);
    this.gauge = scene.add.graphics().setDepth(36);
    this.status = label(scene, x, 579, 'Kéo ly vào đây', 11, '#3d5b48');
    this.amounts = label(scene, x, 559, '', 10, '#405643');
    this.draggingCup = false; this.kick = 0;
    this.guide = label(scene, 0, 0, '', 16, '#56644c', { wordWrap: { width: 260 }, align: 'left', lineSpacing: 8 }).setOrigin(0, 0);
    this.relayout(); this.render(0);
  }
  relayout() {
    const p = stationPosition(this.index, this.scene.stations?.length || this.scene.stationManager.models.length, this.scene.layout);
    this.x = p.x; this.y = p.y; this.geometry = p; this.lastBase = null; this.lastCup = null;
    const r = p.rect;
    this.recipe.setPosition(r ? r.x + r.w / 2 : this.x, r ? r.y + 22 : 433);
    this.recipe.setScale(r ? Math.min(1.25, (r.w - 20) / 186) : 1);
    this.coaster.setPosition(this.x, this.y + 25 * (p.cupScale || 0.78)).setDisplaySize(88 * (r ? p.cupScale : 1), 23 * (r ? p.cupScale : 1));
    this.status.setPosition(r ? r.x + r.w / 2 : this.x, r ? r.y + r.h - 16 : 579).setFontSize(r ? 14 : 11);
    this.status.setWordWrapWidth(r ? r.w - 20 : 200);
    this.amounts.setPosition(r ? r.x + r.w / 2 : this.x, r ? r.y + r.h - 40 : 559).setFontSize(r ? 13 : 10).setWordWrapWidth(r ? r.w - 20 : 200);
    this.guide.setPosition(r ? r.x + r.w * 0.57 : 0, r ? r.y + 64 : 0).setVisible(!!p.guide && this.visible);
    if (r) this.guide.setWordWrapWidth(r.w * 0.4 - 16);
  }
  setVisible(value) {
    this.visible = value;
    for (const obj of [this.base, this.recipe, this.coaster, this.cup, this.gauge, this.status, this.amounts]) obj.setVisible(value);
    this.recipe.input.enabled = value; this.guide.setVisible(value && !!this.geometry?.guide);
  }
  contains(x, y) { const r = this.geometry?.rect; return this.visible && (r ? x >= r.x && x <= r.x + r.w && y >= r.y + 42 && y <= r.y + r.h : Math.abs(x - this.x) < 92 && y >= 451 && y <= 589); }
  render(t, highlight = false) {
    if (!this.visible) return;
    const drink = this.model.drink; const recipe = RECIPES[this.model.recipeId];
    if (this.lastBase !== highlight) {
    this.lastBase = highlight; this.base.clear();
    const r = this.geometry?.rect;
    round(this.base, r ? r.x : this.x - 102, r ? r.y : 416, r ? r.w : 204, r ? r.h : 179, 0x73816d, 13, 0.2);
    round(this.base, r ? r.x : this.x - 100, r ? r.y : 414, r ? r.w : 200, r ? r.h : 178, 0xf7edd8, 12);
    if (highlight) { this.base.lineStyle(2, C.green); this.base.strokeRoundedRect(r ? r.x : this.x - 100, r ? r.y : 414, r ? r.w : 200, r ? r.h : 178, 12); }

    }
    this.recipe.title.setText(`0${this.index + 1}  ·  ${recipe.short}${(this.scene.game.save.data.mastery[recipe.id] || 0) >= 5 ? " ★" : ""}  ▾`);
    const motion = !this.scene.game.save.data.settings.reducedMotion;
    const cupKey = [drink?.id, drink?.state, drink?.grounds, drink?.press, drink?.coffee, drink?.condensed, drink?.milk, drink?.foam, drink?.ice, drink?.stir, drink?.preparation.revision, this.draggingCup,
      drink ? Math.floor(t / 33) : 0,
      motion && (drink?.state === 'BREWING' || (drink?.state === 'BREWED' && !drink.ice) || ['tratac', 'tradao', 'travai', 'cacao', 'matcha'].includes(recipe.id)) ? Math.floor(t / 33) : 0, this.kick > 0].join('/');
    if (cupKey !== this.lastCup) {
      this.lastCup = cupKey;
      this.cup.setPosition(this.x + Math.sin(t / 24) * this.kick * 2, this.y).setScale(this.geometry?.cupScale || (['muoi', 'cotdua', 'tratac', 'tradao', 'travai', 'cacao', 'matcha'].includes(recipe.id) ? 1.04 : 0.78));
      this.cup.paint(this.draggingCup ? null : drink, motion ? t : 0);
      const level = this.scene.game.save.data.mastery[this.model.recipeId] || 0;
      if (!this.draggingCup && drink?.state === 'BREWED' && level >= 15) { this.cup.details.lineStyle(2, level >= 30 ? C.gold : C.green, 0.7); this.cup.details.strokeEllipse(0, 35, 70, 13); }
    }
    this.guide.setText(this.geometry?.guide ? 'CÁCH PHA\n\n' + recipe.steps.slice(0, 4).map((step, i) => `${i + 1}. ${step.instruction}`).join('\n') + (recipe.steps.length > 4 ? '\n… Xem thêm trong Sổ món.' : '') : '');
    this.gauge.clear();
    this.kick = Math.max(0, this.kick - 0.06);
    if (!drink) {
      this.status.setText('Kéo ly vào đây'); this.amounts.setText('TRẠM PHA SẴN SÀNG'); return;
    }
    this.cup.setAlpha(1);
    let status = '';
    if (recipe.engine !== 'phin') status = drink.evaluate(recipe.id, this.model.modifiers).valid ? '✓ Sẵn sàng · kéo ly đến khách' : drink.nextStep(this.model.modifiers);
    if (recipe.engine === 'phin' && drink.state === 'GLASS') status = '1. Đặt phin lên ly';
    if (drink.state === 'PHIN') status = drink.grounds ? '3. Đặt lõi & giữ để nén' : '2. Muỗng → hũ bột → phin';
    if (drink.state === 'PRESSED') status = '4. Kéo ấm đến phin & giữ rót';
    if (drink.state === 'POURING') status = 'Thả tay ở vạch xanh';
    if (drink.state === 'BREWING') status = `Đang pha… ${Math.ceil(RULES.brewSeconds - drink.brewElapsed)} giây`;
    if (drink.state === 'BREWED') {
      const result = drink.evaluate(this.model.recipeId, this.model.modifiers);
      status = result.valid ? '✓ Sẵn sàng · kéo ly đến khách' : result.message.replace(' Vẽ vòng tròn trong ly.', '').replace(' rồi!', '');
      if (!result.valid && recipe.id === 'cotdua' && drink.recipeId === 'cotdua') status = !(drink.preparation.amounts.coconutCream > 0) ? '5. Rót dừa xay từ cối (khay 05)' : drink.coffeeSource.volume > 0.01 ? '6. Rót cà phê từ ca phin' : status;
      if (status.length > 37) status = 'Thêm đúng nguyên liệu theo sổ';
    }
    if (this.geometry?.rect && status.length > 65) status = status.slice(0, 62) + '…';
    this.status.setText(status).setColor(drink.state === 'BREWED' ? '#365f43' : '#3d5b48');
    const a = [];
    if (drink.grounds) a.push(`${drink.grounds} bột`);
    if (drink.condensed) a.push(`${drink.condensed.toFixed(1)} đặc`);
    if (drink.milk) a.push(`${drink.milk.toFixed(1)} tươi`);
    if (drink.ice) a.push(`${drink.ice} đá`);
    if (recipe.id === 'cotdua') { a.push(`${(drink.preparation.amounts.coconutCream || 0).toFixed(0)}ml dừa`); a.push(`${(drink.preparation.amounts.brewedCoffee || 0).toFixed(1)} phin`); }
    if (recipe.id === 'muoi') { a.push(`${(drink.preparation.amounts.brewedCoffee || 0).toFixed(1)} phin`); a.push(`${(drink.preparation.amounts.cream || 0).toFixed(0)}ml kem`); }
    if (drink.foam) a.push('bọt trứng');
    if (recipe.id === 'tratac') {
      const p = drink.preparation.amounts;
      if (p.tea) a.push(`${p.tea.toFixed(0)}ml trà`);
      if (p.citrusJuice) a.push(`${p.citrusJuice.toFixed(0)}ml tắc`);
      if (p.syrup) a.push(`${p.syrup.toFixed(0)}ml siro`);
      if (p.ice) a.push(`${Math.round(p.ice * 30)}g đá`);
    } else if (recipe.id === 'tradao') {
      const p = drink.preparation.amounts;
      if (p.tea) a.push(`${p.tea.toFixed(0)}ml trà`);
      if (p.peach) a.push(`${Math.round(p.peach)} đào`);
      if (p.orangeJuice) a.push(`${p.orangeJuice.toFixed(0)}ml cam`);
      if (p.lemongrass) a.push('1 sả');
      if (p.peachSyrup) a.push(`${p.peachSyrup.toFixed(0)}ml siro`);
      if (p.ice) a.push(`${Math.round(p.ice * 30)}g đá`);
    } else if (recipe.id === 'travai') {
      const p = drink.preparation.amounts;
      if (p.lychee) a.push(`${Math.round(p.lychee)} vải`);
      if (p.lycheeSyrup) a.push(`${p.lycheeSyrup.toFixed(0)}ml siro`);
      if (p.tea) a.push(`${p.tea.toFixed(0)}ml trà`);
      if (p.ice) a.push(`${Math.round(p.ice * 30)}g đá`);
    } else if (recipe.id === 'cacao') {
      const p = drink.preparation.amounts;
      if (p.cacao) a.push(`${Math.round(p.cacao)}g cacao`);
      if (p.water) a.push(`${p.water.toFixed(0)}ml nước`);
      if (p.condensed) a.push(`${p.condensed.toFixed(0)}ml đặc`);
      if (p.milk) a.push(`${p.milk.toFixed(0)}ml tươi`);
      if (p.ice) a.push(`${Math.round(p.ice * 30)}g đá`);
    } else if (recipe.id === 'matcha') {
      const p = drink.preparation.amounts;
      if (p.ice) a.push(`${Math.round(p.ice * 30)}g đá`);
      if (p.milk) a.push(`${p.milk.toFixed(0)}ml sữa`);
      if (p.syrup) a.push(`${p.syrup.toFixed(0)}ml siro`);
      if (p.matcha) a.push(`${p.matcha.toFixed(1)}g matcha`);
      if (p.water) a.push(`${p.water.toFixed(0)}ml nước`);
    } else if (recipe.engine !== 'phin') {
      for (const ingredient of recipe.ingredients) { const amount = drink.preparation.amounts[ingredient.id] || 0; if (amount) a.push(`${amount.toFixed(1)} ${ingredient.unit}`); }
    }
    this.amounts.setText(a.join(' · '));
    if (['POURING', 'BREWING', 'PRESSED'].includes(drink.state)) {
      const brewing = drink.state === 'BREWING';
      const value = brewing ? drink.brewElapsed / RULES.brewSeconds : drink.water / 1.5;
      round(this.gauge, this.x - 65, this.y + 26, 130, 6, 0xd1d5b9, 3);
      if (!brewing) round(this.gauge, this.x - 65 + (recipe.water * 0.85 / 1.5) * 130, this.y + 24, (recipe.water * 0.3 / 1.5) * 130, 10, 0x8bac75, 2);
      round(this.gauge, this.x - 65, this.y + 26, Math.max(1, Math.min(130, value * 130)), 6, brewing ? C.brown : C.blue, 3);
    }
  }
}
