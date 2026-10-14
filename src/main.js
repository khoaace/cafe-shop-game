import Phaser from 'phaser';
import './style.css';
import { ResolutionManager } from './rendering/ResolutionManager.js';
import { SIZE } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene, TutorialScene } from './scenes/GameScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { NotebookScene } from './scenes/NotebookScene.js';
import { SummaryScene } from './scenes/SummaryScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game', width: SIZE.width, height: SIZE.height,
  backgroundColor: '#243f35',
  antialias: true, roundPixels: false,
  audio: { noAudio: true }, // Custom AudioManager owns the only WebAudio context.
  scale: { mode: Phaser.Scale.FIT, resizeInterval: 100, autoCenter: Phaser.Scale.CENTER_BOTH, width: SIZE.width, height: SIZE.height },
  input: { activePointers: 2, touch: { capture: false }, mouse: { preventDefaultWheel: true } },
  render: { powerPreference: 'low-power' },
  callbacks: { postBoot: (instance) => {
    instance.rendering = new ResolutionManager(instance);
    const hidden = () => { if (document.hidden) instance.audio?.pause(); };
    document.addEventListener('visibilitychange', hidden);
    instance.events.once('destroy', () => { document.removeEventListener('visibilitychange', hidden); });
    // Phaser 3.90's touchcancel handler calls preventDefault even for non-cancelable
    // events. Guard normal touch events ourselves; CSS touch-action also blocks scrolling.
    for (const type of ['touchstart', 'touchmove', 'touchend']) {
      instance.canvas.addEventListener(type, event => {
        if (event.cancelable) event.preventDefault();
      }, { passive: false });
    }
  } },
  scene: [BootScene, MenuScene, TutorialScene, GameScene, SummaryScene, ShopScene, NotebookScene],
});
// Read-only snapshots expose actual state for manual QA without bypassing gestures.
// No production shortcuts for brewing, serving, money or advancing the clock.
if (import.meta.env.DEV) {
  window.__PHIN_QA__ = {
    snapshot: () => {
      const scene = game.scene.getScenes(true)[0];
      return {
        scene: scene?.sys.settings.key, render: game.rendering?.metrics(), save: JSON.parse(JSON.stringify(game.save?.data ?? null)),
        paused: scene?.paused ?? false,
        session: scene?.session ? { ...scene.session.summary(), elapsed: scene.session.elapsed, rush: scene.session.rush, ended: scene.session.ended, powerOut: scene.session.powerOut, fanActive: scene.session.fanActive } : null,
        customers: scene?.session?.customers.map(c => ({ id: c.id, name: c.type.name, recipe: c.recipeId, state: c.state, ratio: c.ratio, seat: c.seat, vip: c.vip, type: c.type.id })) ?? [],
        stations: scene?.stations?.map(s => ({ id: s.model.id, visible: s.visible, page: Math.floor(s.index / 2), x: s.x, y: s.y, recipeId: s.model.recipeId, evaluation: s.model.drink?.evaluate(s.model.recipeId) || null, drink: s.model.drink ? JSON.parse(JSON.stringify(s.model.drink)) : null })) ?? [],
        liquidDiagnostics: scene?.stations?.map(s => { const liquid = s.cup.list[0]?.list[0]; return { commands: liquid?.commandBuffer?.length, clip: liquid?.mask?.geometryMask?.commandBuffer?.slice(), x: s.cup.x, y: s.cup.y }; }) ?? [],
        diagnostics: scene ? { objects: scene.children.length, tweens: scene.tweens.getTweens().length, timers: (scene.time._active?.length ?? 0), fps: Math.round(game.loop.actualFps), inputListeners: ['pointerdown', 'pointermove', 'pointerup', 'pointerupoutside'].map(event => scene.input.listenerCount(event)), scaleListeners: game.scale.listenerCount('resize') } : null,
        saltedCream: scene?.saltedCream ? JSON.parse(JSON.stringify(scene.saltedCream.state)) : null,
        engine: scene?.drinkEngine ? { active: scene.drinkEngine.active.size, owners: [...scene.drinkEngine.owners.keys()] } : null,
        gesture: scene?.drag ? { active: scene.drag.active?.kind ?? null, foam: scene.drag.whiskProgress, loaded: scene.drag.spoonLoaded } : null,
      };
    },
  };
}
