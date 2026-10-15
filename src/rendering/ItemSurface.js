import { itemImage } from './itemAssets.js';

// Persistent sprite layers with a Graphics overlay for measured contents and FX.
// Repainting reuses children; it never allocates textures or per-frame images.
export function itemSurface(scene) {
  const surface = scene.add.container(0, 0);
  const graphics = scene.add.graphics();
  const sprites = new Map();
  let cursor = 0;
  surface.add(graphics);
  Object.defineProperty(surface, 'itemSpriteCount', { get: () => sprites.size });
  for (const method of ['fillStyle', 'lineStyle', 'fillEllipse', 'strokeEllipse', 'fillCircle', 'strokeCircle', 'fillRect', 'strokeRect', 'fillRoundedRect', 'strokeRoundedRect', 'fillTriangle', 'fillPoints', 'strokePoints', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'save', 'restore', 'translateCanvas', 'scaleCanvas', 'rotateCanvas']) {
    surface[method] = (...args) => { graphics[method](...args); return surface; };
  }
  surface.clear = () => {
    graphics.clear();
    cursor = 0;
    for (const sprite of sprites.values()) sprite.setVisible(false);
    return surface;
  };
  surface.item = (name, x, y, width, height, key = `${name}:${cursor++}`, options = {}) => {
    let sprite = sprites.get(key);
    if (!sprite) {
      sprite = itemImage(scene, name, x, y, width, height);
      surface.addAt(sprite, options.front ? surface.length : surface.list.indexOf(graphics));
      sprites.set(key, sprite);
    }
    const texture = `item-${name === 'stir' ? 'spoon' : name}`;
    if (sprite.texture.key !== texture) sprite.setTexture(texture);
    sprite.setPosition(x, y).setDisplaySize(width, height).setRotation(options.rotation || 0)
      .setAlpha(options.alpha ?? 1).setVisible(true);
    return sprite;
  };
  return surface;
}
