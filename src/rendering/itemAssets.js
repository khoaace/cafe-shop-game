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
  coconut: [48, 61], tea: [61, 62], syrup: [40, 65], scoop: [59, 61],
  kumquat: [29, 32], 'kumquat-half': [26, 25], orange: [39, 43], 'orange-wheel': [32, 31],
  lemongrass: [12, 66], 'lemongrass-prepared': [64, 14], 'peach-piece': [30, 20], 'lychee-fruit': [26, 26],
  peachSyrup: [40, 65], lycheeSyrup: [40, 65], 'cacao-tin': [52, 48], 'matcha-tin': [44, 47],
  chasen: [42, 65], chashaku: [39, 65], tongs: [37, 64], 'fruit-scoop': [43, 65],
  'mixing-bowl': [96, 49], board: [72, 54], squeezer: [54, 46], 'measuring-cup': [39, 38],
  'blender-base': [64, 44], 'blender-jar': [67, 74], 'blender-lid': [54, 19], 'lychee-container': [65, 42],
  glass: [40, 65], phin: [69, 59], spoon: [39, 65], stir: [39, 65], grounds: [53, 60],
  press: [52, 49], kettle: [78, 60], condensed: [47, 61], 'condensed-premium': [49, 61],
  milk: [62, 58], ice: [59, 55], bowl: [73, 53], whisk: [52, 66], trash: [49, 57], coaster: [88, 23],
};
export function itemImage(scene, name, x = 0, y = 0, width, height) {
  const size = ITEM_SIZES[name];
  return scene.add.image(x, y, `item-${name === 'stir' ? 'spoon' : name}`).setDisplaySize(width ?? size[0], height ?? size[1]);
}
