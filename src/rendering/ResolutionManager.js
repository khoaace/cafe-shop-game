import { SIZE } from '../config.js';
import { renderFactor } from './resolution.js';

export class ResolutionManager {
  constructor(game) {
    this.game = game; this.factor = 1; this.texts = new Set(); this.scenes = new Set();
    const gl = game.renderer.gl;
    this.limit = gl ? Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), ...gl.getParameter(gl.MAX_VIEWPORT_DIMS)) : 4096;
    this.parent = document.getElementById('game');
    this.refresh = () => this.resize();
    this.observer = new ResizeObserver(this.refresh); this.observer.observe(this.parent);
    window.addEventListener('resize', this.refresh);
    // Some browsers change DPR without a resize or media-query notification.
    // One scalar comparison per frame; no extra timers or texture allocation.
    this.checkDensity = () => { if (this.dpr !== window.devicePixelRatio) { this.watchDensity(); this.resize(); } };
    game.events.on('prestep', this.checkDensity);
    this.watchDensity(); this.resize();
    game.events.once('destroy', () => {
      this.observer.disconnect(); window.removeEventListener('resize', this.refresh);
      game.events.off('prestep', this.checkDensity);
      this.media?.removeEventListener('change', this.densityChanged); this.texts.clear(); this.scenes.clear();
    });
  }
  watchDensity() {
    this.media?.removeEventListener('change', this.densityChanged);
    this.media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    this.densityChanged = () => { this.watchDensity(); this.resize(); };
    this.media.addEventListener('change', this.densityChanged);
  }
  attach(scene) {
    if (!this.scenes.has(scene)) {
      this.scenes.add(scene);
      scene.events.once('destroy', () => this.scenes.delete(scene));
    }
    this.camera(scene);
  }
  camera(scene) {
    const camera = scene.cameras?.main; if (!camera) return;
    camera.setViewport(0, 0, SIZE.width * this.factor, SIZE.height * this.factor);
    camera.setZoom(this.factor).centerOn(SIZE.width / 2, SIZE.height / 2);
  }
  text(object) {
    object.setResolution(this.factor); this.texts.add(object);
    object.once('destroy', () => this.texts.delete(object)); return object;
  }
  resize() {
    const { width, height } = this.parent.getBoundingClientRect(); if (!width || !height) return;
    this.dpr = window.devicePixelRatio;
    const factor = renderFactor(width, height, this.dpr, this.limit);
    for (const scene of this.scenes) scene.drag?.cancel();
    this.factor = factor;
    this.game.scale.setParentSize(width, height);
    if (this.game.canvas.width !== SIZE.width * factor || this.game.canvas.height !== SIZE.height * factor) {
      this.game.scale.setGameSize(SIZE.width * factor, SIZE.height * factor);
    }
    for (const scene of this.scenes) this.camera(scene);
    for (const object of this.texts) if (object.style.resolution !== factor) object.setResolution(factor);
  }
  metrics() {
    const text = [...this.texts][0];
    return { factor: this.factor, canvas: [this.game.canvas.width, this.game.canvas.height], textCount: this.texts.size,
      textResolution: text?.style.resolution, textPixels: text ? [text.canvas.width, text.canvas.height] : null,
      textLogical: text ? [text.width, text.height] : null, textureCount: this.game.textures.getTextureKeys().length };
  }
}
