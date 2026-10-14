import { loadItemAssets, prepareItemAssets } from '../rendering/itemAssets.js';
import { loadWorldAssets, prepareWorldAssets } from '../rendering/worldAssets.js';
import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager.js';
import { AudioManager } from '../systems/AudioManager.js';
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.game.rendering?.attach(this);
    const title = this.add.text(240, 349, 'Phin góc phố', { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#fff1d4' }).setOrigin(0.5);
    const note = this.add.text(240, 394, 'Đang bày dụng cụ lên bàn…', { fontFamily: 'Arial', fontSize: '13px', color: '#d6dfc5' }).setOrigin(0.5);
    const track = this.add.rectangle(240, 430, 200, 5, 0x526e5e);
    const progress = this.add.rectangle(140, 430, 1, 5, 0xe0b570).setOrigin(0, 0.5);
    const update = value => progress.width = Math.max(1, value * 200);
    this.load.on('progress', update);
    this.load.once('complete', () => {
      this.load.off('progress', update);
      for (const object of [title, note, track, progress]) object.destroy();
    });
    loadItemAssets(this);
    loadWorldAssets(this);
  }
  create() {
    prepareItemAssets(this);
    prepareWorldAssets(this);
    this.game.rendering?.attach(this);
    this.game.save = new SaveManager(); this.game.audio = new AudioManager(this.game.save);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.game.save.data.settings.reducedMotion = true;
    this.scene.start('Menu');
  }
}
