import frames from './itemFrames.json';

export function loadItemAssets(scene) {
  for (const name of Object.keys(frames)) scene.load.image(`item-source-${name}`, `${import.meta.env.BASE_URL}assets/items/${name}.png`);
}
// Build each GPU texture once. Original PNGs remain untouched; no resize-time allocations.
export function prepareItemAssets(scene) {
  for (const [name, { frame }] of Object.entries(frames)) {
    const source = `item-source-${name}`, key = `item-${name}`;
    if (!scene.textures.exists(source)) continue;
    if (scene.textures.exists(key)) { scene.textures.remove(source); continue; }
    const [x, y, right, bottom] = frame, w = right - x, h = bottom - y;
    const ratio = Math.min(1, 512 / Math.max(w, h));
    const texture = scene.textures.createCanvas(key, Math.ceil(w * ratio), Math.ceil(h * ratio));
    texture.context.imageSmoothingEnabled = true;
    texture.context.imageSmoothingQuality = 'high';
    texture.context.drawImage(scene.textures.get(source).getSourceImage(), x, y, w, h, 0, 0, texture.width, texture.height);
    texture.refresh(); scene.textures.remove(source);
  }
}
export const ITEM_SIZES = {
  glass: [40, 65], phin: [69, 59], spoon: [39, 65], stir: [39, 65], grounds: [53, 60],
  press: [52, 49], kettle: [78, 60], condensed: [47, 61], 'condensed-premium': [49, 61],
  milk: [62, 58], ice: [59, 55], bowl: [73, 53], whisk: [52, 66], trash: [49, 57], coaster: [88, 23],
};
export function itemImage(scene, name, x = 0, y = 0, width, height) {
  const size = ITEM_SIZES[name];
  return scene.add.image(x, y, `item-${name === 'stir' ? 'spoon' : name}`).setDisplaySize(width ?? size[0], height ?? size[1]);
}
