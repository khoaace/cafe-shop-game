import { seatPosition } from '../logic/layout.js';
import { RECIPES, COLORS as C } from '../config.js';
import { label, round, person, drawCup, createCupArt } from './art.js';
export class CustomerView {
  constructor(scene, model) {
    this.scene = scene; this.model = model; this.layout = seatPosition(model.seat, scene.session.upgrades.seats); this.x = this.layout.x; this.compact = scene.session.upgrades.seats > 3;
    this.y = this.layout.bubbleY - (this.compact && model.seat >= 3 ? 4 : 0);
    this.character = person(scene, model.type, -50, this.layout.y, this.layout.scale);
    this.character.root.setDepth(10 + Math.floor(model.seat / 3));
    this.root = scene.add.container(this.x, this.y);
    const bg = scene.add.graphics();
    round(bg, -65, -15, 130, this.compact ? 33 : 42, 0x65513b, 12, 0.13); round(bg, -65, -19, 130, this.compact ? 33 : 42, C.cream, 12);
    bg.fillStyle(C.cream); if (!this.compact) bg.fillTriangle(-6, 23, 6, 23, 0, 29);
    const recipe = RECIPES[model.recipeId];
    this.name = label(scene, 0, this.compact ? -10 : -8, model.type.name, 10, '#715936');
    this.icon = scene.add.graphics(); if (model.recipeId === 'muoi') { this.icon.fillStyle(0x48281b); this.icon.fillRoundedRect(-57, -3, 10, 14, 2); this.icon.fillStyle(0xfff7e8); this.icon.fillRoundedRect(-57, -7, 10, 6, 2); }
    if (model.recipeId === 'cotdua') { this.icon.fillStyle(0xf6eddb); this.icon.fillRoundedRect(-57, -6, 10, 17, 2); this.icon.lineStyle(1.5, 0x6b3d25); this.icon.beginPath(); this.icon.moveTo(-55, -5); this.icon.lineTo(-51, 0); this.icon.lineTo(-54, 5); this.icon.lineTo(-50, 10); this.icon.strokePath(); this.icon.fillStyle(0x5a3322); this.icon.fillRoundedRect(-57, -8, 10, 3, 1); }
    this.order = label(scene, 0, this.compact ? 4 : 8, recipe.short, 14, '#324b38', { fontStyle: 'bold' });
    this.bar = scene.add.graphics();
    this.root.add([bg, this.icon, this.name, this.order, this.bar]);
    this.root.setDepth(20);
    if (this.compact) this.root.setScale(0.88);
    if (model.vip) { this.name.setColor('#985098'); this.order.setColor('#73518a'); }
    this.root.setSize(130, 77);
    this.lastState = ''; this.update(0);
  }
  update(t) {
    const c = this.model;
    const walking = c.state === 'ARRIVING' || c.state === 'WALKING' || c.state === 'LEAVING';
    if (c.state === 'WALKING') this.character.root.x = -50 + (this.x + 50) * Math.min(1, c.stateTime / 1.1);
    else if (c.state === 'LEAVING') this.character.root.x = this.x + (540 - this.x) * Math.min(1, c.stateTime / 1.2);
    else this.character.root.x = this.x;
    const seated = ['SEATED', 'ORDERING', 'WAITING', 'SERVED'].includes(c.state);
    const baseY = this.layout.y - (this.compact && c.seat >= 3 ? 8 : 0);
    this.character.root.y = seated ? baseY : baseY - 7 + (this.scene.game.save.data.settings.reducedMotion ? 0 : Math.sin(t * 0.012) * 2);
    const mood = c.outcome === 'served' ? 'happy' : c.outcome === 'lost' || this.feedbackUntil > t ? 'angry' : 'idle';
    this.character.update(t, walking, mood, seated, c.state === 'ORDERING');
    if (this.lastState !== c.state) {
      this.lastState = c.state; this.character.drawFace(mood);
      if (c.state === 'SERVED' && ['muoi', 'cotdua'].includes(c.recipeId)) {
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
    round(this.bar, -48, this.compact ? 16 : 25, 96, 4, 0xd9d5ba, 2);
    const color = c.ratio > 0.5 ? C.green : c.ratio > 0.25 ? 0xdba34a : 0xbe654d;
    round(this.bar, -48, this.compact ? 16 : 25, Math.max(2, 96 * c.ratio), 4, color, 2, c.ratio < 0.15 ? 0.65 + Math.sin(t * 0.012) * 0.35 : 1);
  }
  contains(x, y) { return Math.abs(x - this.x) < 65 && y >= this.layout.top && y <= this.layout.bottom; }
  destroy() { this.root.destroy(); this.character.root.destroy(); }
}
