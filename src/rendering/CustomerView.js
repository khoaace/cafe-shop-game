import { seatPosition } from '../logic/layout.js';
import { RECIPES, COLORS as C } from '../config.js';
import { SPEED_BONUS } from '../logic/stars.js';
import { label, round, person, drawCup, createCupArt } from './art.js';
export class CustomerView {
  constructor(scene, model) {
    this.scene = scene; this.model = model; this.layout = seatPosition(model.seat, scene.session.upgrades.seats, scene.layout); this.x = this.layout.x; this.compact = !scene.layout?.desktop && scene.session.upgrades.seats > 3;
    this.y = this.layout.bubbleY - (this.compact && model.seat >= 3 ? 4 : 0);
    this.character = person(scene, model.type, -50, this.layout.y, this.layout.scale);
    this.character.root.setDepth(10 + Math.floor(model.seat / 3));
    this.root = scene.add.container(this.x, this.y);
    const bg = scene.add.graphics(); this.bg = bg;
    const recipe = RECIPES[model.recipeId];
    const headerText = model.modifierLabel ? `${model.type.name} · ${model.modifierLabel}` : model.type.name;
    this.name = label(scene, 0, this.compact ? -10 : -8, headerText, model.modifierLabel ? 8.5 : 10, '#715936');
    this.icon = scene.add.graphics(); if (model.recipeId === 'muoi') { this.icon.fillStyle(0x48281b); this.icon.fillRoundedRect(-57, -3, 10, 14, 2); this.icon.fillStyle(0xfff7e8); this.icon.fillRoundedRect(-57, -7, 10, 6, 2); }
    if (model.recipeId === 'cotdua') { this.icon.fillStyle(0xf6eddb); this.icon.fillRoundedRect(-57, -6, 10, 17, 2); this.icon.lineStyle(1.5, 0x6b3d25); this.icon.beginPath(); this.icon.moveTo(-55, -5); this.icon.lineTo(-51, 0); this.icon.lineTo(-54, 5); this.icon.lineTo(-50, 10); this.icon.strokePath(); this.icon.fillStyle(0x5a3322); this.icon.fillRoundedRect(-57, -8, 10, 3, 1); }
    if (model.recipeId === 'tratac') { this.icon.fillStyle(0xd88c24); this.icon.fillRoundedRect(-57, -5, 10, 16, 2); this.icon.fillStyle(0x4d8a31); this.icon.fillCircle(-48, -4, 3.2); this.icon.fillStyle(0xf39c22); this.icon.fillCircle(-48, -4, 2); }
    if (model.recipeId === 'tradao') { this.icon.fillStyle(0xcf7820); this.icon.fillRoundedRect(-57, -5, 10, 16, 2); this.icon.fillStyle(0xf59d2a); this.icon.fillCircle(-48, -4, 3.4); this.icon.fillStyle(0x7ca84b); this.icon.fillRect(-55, -9, 2, 14); }
    if (model.recipeId === 'travai') { this.icon.fillStyle(0xe2ae55); this.icon.fillRoundedRect(-57, -5, 10, 16, 2); this.icon.fillStyle(0xfdfaf4); this.icon.fillCircle(-50, 1, 3.2); this.icon.fillStyle(0xc94a52); this.icon.fillCircle(-48, -5, 2.4); }
    if (model.recipeId === 'cacao') { this.icon.fillStyle(0x6b3e26); this.icon.fillRoundedRect(-57, -5, 10, 16, 2); this.icon.fillStyle(0xfbf3e4); this.icon.fillRoundedRect(-56, -2, 8, 5, 1.5); this.icon.fillStyle(0x4b2817); this.icon.fillRoundedRect(-57, 3, 10, 8, 2); }
    if (model.recipeId === 'matcha') { this.icon.fillStyle(0xfbf8ef); this.icon.fillRoundedRect(-57, -5, 10, 16, 2); this.icon.fillStyle(0x458b32); this.icon.fillRoundedRect(-57, -5, 10, 7, 2); this.icon.fillStyle(0x9bd678); this.icon.fillRoundedRect(-56, -5, 8, 2.5, 1); }
    this.order = label(scene, 0, this.compact ? 4 : 8, recipe.short, 14, '#324b38', { fontStyle: 'bold' });
    this.bar = scene.add.graphics();
    // ⚡ marks the quick-service window (bonus); "!" warns that the guest is about to leave.
    this.fast = label(scene, 60, 26, '⚡', 12, '#d18a12', { fontStyle: 'bold' });
    this.alert = label(scene, 0, -40, '!', 20, '#fff4de', { fontStyle: 'bold', backgroundColor: '#be654d', padding: { x: 7, y: 0 } }).setVisible(false);
    this.root.add([bg, this.icon, this.name, this.order, this.bar, this.fast, this.alert]);
    this.root.setDepth(20);
    if (this.compact) this.root.setScale(0.88);
    if (model.vip) { this.name.setColor('#985098'); this.order.setColor('#73518a'); }
    this.root.setSize(130, 77);
    this.lastState = ''; this.relayout(); this.update(0);
  }
  update(t) {
    const c = this.model;
    const walking = c.state === 'ARRIVING' || c.state === 'WALKING' || c.state === 'LEAVING';
    if (c.state === 'WALKING') this.character.root.x = -50 + (this.x + 50) * Math.min(1, c.stateTime / 1.1);
    else if (c.state === 'LEAVING') this.character.root.x = this.x + ((this.scene.layout?.width || 480) + 60 - this.x) * Math.min(1, c.stateTime / 1.2);
    else this.character.root.x = this.x;
    const seated = ['SEATED', 'ORDERING', 'WAITING', 'SERVED'].includes(c.state);
    const baseY = this.layout.y - (this.compact && c.seat >= 3 ? 8 : 0);
    this.character.root.y = seated ? baseY : baseY - 7 + (this.scene.game.save.data.settings.reducedMotion ? 0 : Math.sin(t * 0.012) * 2);
    const mood = c.outcome === 'served' ? 'happy' : c.outcome === 'lost' || this.feedbackUntil > t ? 'angry' : 'idle';
    this.character.update(t, walking, mood, seated, c.state === 'ORDERING');
    if (this.lastState !== c.state) {
      this.lastState = c.state; this.character.drawFace(mood);
      if (c.state === 'SERVED' && ['muoi', 'cotdua', 'tratac', 'tradao', 'travai', 'cacao', 'matcha'].includes(c.recipeId)) {
        this.sipCup = createCupArt(this.scene, c.servedDrink, 12, -4, 0.42); this.character.root.add(this.sipCup);
        this.scene.time.delayedCall(650, () => { if (c.state === 'SERVED' && this.character.root.active) { this.scene.game.audio.play('talk', 0.02); this.scene.showDialogue(c.type.name, c.type.happy); } });
      }
      if (c.state === 'ORDERING' && !this.scene.game.save.data.settings.reducedMotion) {
        this.root.setScale(0.75); this.scene.tweens.add({ targets: this.root, scale: this.compact ? 0.88 : 1, duration: 250, ease: 'Back.Out' });
      }
    }
    if (this.sipCup) {
      this.sipCup.setVisible(c.state === 'SERVED');
      const reduced = this.scene.game.save.data.settings.reducedMotion;
      const lift = reduced ? 1 : c.stateTime < 0.95 ? Math.sin(Math.min(1, c.stateTime / 0.45) * Math.PI / 2) : Math.max(0, 1 - (c.stateTime - 0.95) / 0.4);
      this.sipCup.setPosition(12 - 8 * lift, -4 - 24 * lift).setRotation(-0.2 * lift).paint(c.servedDrink, reduced ? 0 : t);
      if (this.character.parts?.rightArm && c.state === 'SERVED') this.character.parts.rightArm.rotation = -0.8 - lift * 0.3;
    }
    this.root.setVisible(['ORDERING', 'WAITING', 'SERVED'].includes(c.state));
    this.order.setText(c.state === 'SERVED' ? 'Cảm ơn quán! ♥' : RECIPES[c.recipeId].short);
    this.bar.clear();
    const barY = this.compact ? 16 : 25, waiting = c.state === 'WAITING' && !c.tutorial;
    const fast = waiting && c.ratio >= SPEED_BONUS.ratio, urgent = waiting && c.ratio < 0.25;
    round(this.bar, -48, barY, 96, 4, 0xd9d5ba, 2);
    const color = fast ? 0xe0a83a : c.ratio > 0.5 ? C.green : c.ratio > 0.25 ? 0xdba34a : 0xbe654d;
    round(this.bar, -48, barY, Math.max(2, 96 * c.ratio), 4, color, 2, c.ratio < 0.15 ? 0.65 + Math.sin(t * 0.012) * 0.35 : 1);
    if (waiting) { this.bar.fillStyle(0x6d5a3a, 0.75); this.bar.fillRect(-48 + 96 * SPEED_BONUS.ratio - 0.5, barY - 2, 1.5, 8); }
    const motion = !this.scene.game.save.data.settings.reducedMotion;
    this.fast.setVisible(fast).setY(barY + 1).setAlpha(motion ? 0.75 + Math.sin(t * 0.01) * 0.25 : 1);
    this.alert.setVisible(urgent).setScale(motion ? 1 + Math.max(0, Math.sin(t * 0.014)) * 0.18 : 1);
    this.root.setRotation(urgent && motion ? Math.sin(t * 0.03) * 0.035 : 0);
  }
  relayout() {
    this.layout = seatPosition(this.model.seat, this.scene.session.upgrades.seats, this.scene.layout);
    this.compact = !this.scene.layout?.desktop && this.scene.session.upgrades.seats > 3;
    this.x = this.layout.x; this.y = this.layout.bubbleY - (this.compact && this.model.seat >= 3 ? 4 : 0);
    this.root.setPosition(this.x, this.y).setScale(this.compact ? 0.88 : 1);
    const bg = this.bg, width = this.scene.layout?.desktop ? Math.min(188, this.scene.layout.customers.w / this.scene.session.upgrades.seats - 18) : 130; bg.clear();
    round(bg, -width / 2, -15, width, this.compact ? 33 : 42, 0x65513b, 12, 0.13); round(bg, -width / 2, -19, width, this.compact ? 33 : 42, C.cream, 12);
    bg.fillStyle(C.cream); if (!this.compact) bg.fillTriangle(-6, 23, 6, 23, 0, 29);
    this.name.setY(this.compact ? -10 : -8).setFontSize(this.scene.layout?.desktop ? this.model.modifierLabel ? 10 : 12 : this.model.modifierLabel ? 8.5 : 10); this.order.setY(this.compact ? 4 : 8).setFontSize(this.scene.layout?.desktop ? 16 : 14);
    this.character.root.setScale(this.layout.scale);
  }
  contains(x, y) { return Math.abs(x - this.x) < 65 && y >= this.layout.top && y <= this.layout.bottom; }
  destroy() { this.root.destroy(); this.character.root.destroy(); }
}
