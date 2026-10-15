import { SIZE } from '../config.js';
import { renderFactor, desktopRenderFactor } from './resolution.js';
import { gameLayout } from '../logic/layout.js';

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
    this.activeScene = scene;
    this.resize();
    this.camera(scene);
  }
  camera(scene) {
    const camera = scene.cameras?.main; if (!camera) return;
    const { width, height } = this.layout || SIZE;
    camera.setViewport(0, 0, Math.round(width * this.factor), Math.round(height * this.factor));
    camera.setZoom(this.factor).centerOn(width / 2, height / 2);
  }
  text(object) {
    object.setResolution(this.factor); this.texts.add(object);
    object.once('destroy', () => this.texts.delete(object)); return object;
  }
  resize() {
    const { width, height } = this.parent.getBoundingClientRect(); if (!width || !height) return;
    this.dpr = window.devicePixelRatio;
    const scene = this.activeScene;
    const layout = gameLayout(Math.round(width), Math.round(height), ['Boot', 'Menu', 'Game', 'Tutorial'].includes(scene?.sys.settings.key));
    const changed = !this.layout || layout.width !== this.layout.width || layout.height !== this.layout.height || layout.desktop !== this.layout.desktop;
    const factor = layout.desktop ? desktopRenderFactor(width, height, this.dpr, this.limit) : renderFactor(width, height, this.dpr, this.limit);
    if (changed || factor !== this.factor) scene?.drag?.cancel();
    this.layout = layout; this.factor = factor;
    this.game.scale.setParentSize(width, height);
    const pixelWidth = Math.round(layout.width * factor), pixelHeight = Math.round(layout.height * factor);
    if (this.game.canvas.width !== pixelWidth || this.game.canvas.height !== pixelHeight) this.game.scale.setGameSize(pixelWidth, pixelHeight);
    if (scene) { scene.layout = layout; this.camera(scene); }
    if (changed) scene?.relayout?.();
    for (const object of this.texts) if (object.style.resolution !== factor) object.setResolution(factor);
  }
  metrics() {
    const text = [...this.texts][0];
    return { desktop: !!this.layout?.desktop, logical: [this.layout?.width || 480, this.layout?.height || 800], factor: this.factor, canvas: [this.game.canvas.width, this.game.canvas.height], textCount: this.texts.size,
      textResolution: text?.style.resolution, textPixels: text ? [text.canvas.width, text.canvas.height] : null,
      textLogical: text ? [text.width, text.height] : null, textureCount: this.game.textures.getTextureKeys().length };
  }
}
