import { RECIPES, RULES, COLORS as C } from '../config.js';
import { label, round, createCupArt } from './art.js';
import { itemImage } from './itemAssets.js';
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
    this.render(0);
  }
  setVisible(value) {
    this.visible = value;
    for (const obj of [this.base, this.recipe, this.coaster, this.cup, this.gauge, this.status, this.amounts]) obj.setVisible(value);
    this.recipe.input.enabled = value;
  }
  contains(x, y) { return this.visible && Math.abs(x - this.x) < 92 && y >= 451 && y <= 589; }
  render(t, highlight = false) {
    if (!this.visible) return;
    const drink = this.model.drink; const recipe = RECIPES[this.model.recipeId];
    if (this.lastBase !== highlight) {
    this.lastBase = highlight; this.base.clear();
    round(this.base, this.x - 102, 416, 204, 179, 0x73816d, 13, 0.2);
    round(this.base, this.x - 100, 414, 200, 178, 0xf7edd8, 12);
    if (highlight) { this.base.lineStyle(2, C.green); this.base.strokeRoundedRect(this.x - 100, 414, 200, 178, 12); }

    }
    this.recipe.title.setText(`0${this.index + 1}  ·  ${recipe.short}${(this.scene.game.save.data.mastery[recipe.id] || 0) >= 5 ? " ★" : ""}  ▾`);
    const motion = !this.scene.game.save.data.settings.reducedMotion;
    const cupKey = [drink?.id, drink?.state, drink?.grounds, drink?.press, drink?.coffee, drink?.condensed, drink?.milk, drink?.foam, drink?.ice, drink?.stir, drink?.preparation.revision, this.draggingCup,
      drink ? Math.floor(t / 33) : 0,
      motion && (drink?.state === 'BREWING' || (drink?.state === 'BREWED' && !drink.ice)) ? Math.floor(t / 33) : 0, this.kick > 0].join('/');
    if (cupKey !== this.lastCup) {
      this.lastCup = cupKey;
      this.cup.setPosition(this.x + Math.sin(t / 24) * this.kick * 2, this.y).setScale(recipe.id === 'muoi' ? 1.04 : 0.78);
      this.cup.paint(this.draggingCup ? null : drink, motion ? t : 0);
      const level = this.scene.game.save.data.mastery[this.model.recipeId] || 0;
      if (!this.draggingCup && drink?.state === 'BREWED' && level >= 15) { this.cup.details.lineStyle(2, level >= 30 ? C.gold : C.green, 0.7); this.cup.details.strokeEllipse(0, 35, 70, 13); }
    }
    this.gauge.clear();
    this.kick = Math.max(0, this.kick - 0.06);
    if (!drink) {
      this.status.setText('Kéo ly vào đây'); this.amounts.setText('TRẠM PHA SẴN SÀNG'); return;
    }
    this.cup.setAlpha(1);
    let status = '';
    if (recipe.engine !== 'phin') status = drink.evaluate(recipe.id).valid ? '✓ Sẵn sàng · kéo ly đến khách' : drink.nextStep();
    if (recipe.engine === 'phin' && drink.state === 'GLASS') status = '1. Đặt phin lên ly';
    if (drink.state === 'PHIN') status = drink.grounds ? '3. Đặt lõi & giữ để nén' : '2. Muỗng → hũ bột → phin';
    if (drink.state === 'PRESSED') status = '4. Kéo ấm đến phin & giữ rót';
    if (drink.state === 'POURING') status = 'Thả tay ở vạch xanh';
    if (drink.state === 'BREWING') status = `Đang pha… ${Math.ceil(RULES.brewSeconds - drink.brewElapsed)} giây`;
    if (drink.state === 'BREWED') {
      const result = drink.evaluate(this.model.recipeId);
      status = result.valid ? '✓ Sẵn sàng · kéo ly đến khách' : result.message.replace(' Vẽ vòng tròn trong ly.', '').replace(' rồi!', '');
      if (status.length > 37) status = 'Thêm đúng nguyên liệu theo sổ';
    }
    this.status.setText(status).setColor(drink.state === 'BREWED' ? '#365f43' : '#3d5b48');
    const a = [];
    if (drink.grounds) a.push(`${drink.grounds} bột`);
    if (drink.condensed) a.push(`${drink.condensed.toFixed(1)} đặc`);
    if (drink.milk) a.push(`${drink.milk.toFixed(1)} tươi`);
    if (drink.ice) a.push(`${drink.ice} đá`);
    if (recipe.id === 'muoi') { a.push(`${(drink.preparation.amounts.brewedCoffee || 0).toFixed(1)} phin`); a.push(`${(drink.preparation.amounts.cream || 0).toFixed(0)}ml kem`); }
    if (drink.foam) a.push('bọt trứng');
    if (recipe.engine !== 'phin') for (const ingredient of recipe.ingredients) { const amount = drink.preparation.amounts[ingredient.id] || 0; if (amount) a.push(`${amount.toFixed(1)} ${ingredient.unit}`); }
    this.amounts.setText(a.join(' · '));
    if (['POURING', 'BREWING', 'PRESSED'].includes(drink.state)) {
      const brewing = drink.state === 'BREWING';
      const value = brewing ? drink.brewElapsed / RULES.brewSeconds : drink.water / 1.5;
      round(this.gauge, this.x - 65, 543, 130, 6, 0xd1d5b9, 3);
      if (!brewing) round(this.gauge, this.x - 65 + (recipe.water * 0.85 / 1.5) * 130, 541, (recipe.water * 0.3 / 1.5) * 130, 10, 0x8bac75, 2);
      round(this.gauge, this.x - 65, 543, Math.max(1, Math.min(130, value * 130)), 6, brewing ? C.brown : C.blue, 3);
    }
  }
}
