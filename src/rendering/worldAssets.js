import manifest from './worldManifest.json';
export { manifest as WORLD_ART };
export function loadWorldAssets(scene) {
  for (const [id, entry] of Object.entries(manifest.assets)) {
    if (!scene.textures.exists(`world-${id}`)) scene.load.image(`world-source-${id}`, `${import.meta.env.BASE_URL}assets/world/${entry.file}`);
  }
}
export function prepareWorldAssets(scene) {
  for (const [id, entry] of Object.entries(manifest.assets)) {
    const source = `world-source-${id}`, key = `world-${id}`;
    if (!scene.textures.exists(source)) continue;
    if (scene.textures.exists(key)) { scene.textures.remove(source); continue; }
    const image = scene.textures.get(source).getSourceImage();
    const ratio = Math.min(1, entry.maxSize / Math.max(image.width, image.height));
    const texture = scene.textures.createCanvas(key, Math.ceil(image.width * ratio), Math.ceil(image.height * ratio));
    texture.context.imageSmoothingEnabled = true; texture.context.imageSmoothingQuality = 'high';
    texture.context.drawImage(image, 0, 0, texture.width, texture.height); texture.refresh();
    for (const [name, part] of Object.entries(entry.frames)) {
      const [x, y, w, h] = part.rect;
      texture.add(name, 0, Math.floor(x * ratio), Math.floor(y * ratio), Math.max(1, Math.floor(w * ratio)), Math.max(1, Math.floor(h * ratio)));
    }
    scene.textures.remove(source);
  }
}
export function hasWorldArt(scene, id) {
  const entry = manifest.assets[id];
  return !!entry && scene.textures.exists(`world-${id}`) && Object.keys(entry.frames).every(frame => scene.textures.get(`world-${id}`).has(frame));
}
export function worldImage(scene, id, frame = 'main', x = 0, y = 0) {
  if (!hasWorldArt(scene, id)) return null;
  const part = manifest.assets[id].frames[frame];
  return scene.add.image(x, y, `world-${id}`, frame).setOrigin(...part.origin).setDisplaySize(...part.size);
}
