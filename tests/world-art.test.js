import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(new URL('../src/rendering/worldManifest.json', import.meta.url)));

test('world art has all nine identities and independently animated character parts', () => {
  assert.deepEqual([...manifest.characters].sort(), ['keeper','office','driver','student','uncle','tourist','reviewer','celebrity','creator'].sort());
  for (const id of manifest.characters) {
    const frames=manifest.assets[id].frames;
    assert.deepEqual(Object.keys(frames).sort(), ['idle','blink','happy','angry','body','leftArm','rightArm','leftLeg','rightLeg'].sort());
    assert.equal(new Set(Object.values(frames).map(p=>p.rect.join(','))).size,9, `${id}: no duplicated part frames`);
    for(const mood of ['blink','happy','angry']) {
      assert.deepEqual(frames[mood].size,frames.idle.size);
      assert.deepEqual(frames[mood].origin,frames.idle.origin);
    }
  }
});
test('every world frame fits its actual source PNG and has bounded logical size and pivot', () => {
  for(const [id,asset] of Object.entries(manifest.assets)) {
    const png=readFileSync(new URL(`../public/assets/world/${asset.file}`,import.meta.url));
    assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
    const actual=[png.readUInt32BE(16),png.readUInt32BE(20)]; assert.deepEqual(asset.sourceSize,actual,id);
    assert.ok(asset.maxSize>0&&asset.maxSize<=2048);
    for(const [name,part] of Object.entries(asset.frames)) {
      const [x,y,w,h]=part.rect;
      assert.ok([x,y,w,h].every(Number.isInteger)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=actual[0]&&y+h<=actual[1],`${id}/${name}`);
      assert.ok(part.size.every(v=>v>0&&v<=800));assert.ok(part.origin.every(v=>v>=0&&v<=1));
    }
  }
});
test('plants have separate pots and leaves; scenery includes all shared shop furnishings', () => {
  for(const id of ['plant-terra','plant-ceramic','plant-hanging'])assert.deepEqual(Object.keys(manifest.assets[id].frames).sort(),['leaves','pot']);
  for(const id of ['facade','awning','pavement','table','stool','sign','motorbike','festival'])assert.ok(manifest.assets[id].frames.main,id);
  assert.deepEqual(Object.keys(manifest.assets.fan.frames).sort(),['blades','body']);
});
