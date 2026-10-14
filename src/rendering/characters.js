import { person as legacyPerson } from './legacyCharacters.js';
import { hasWorldArt, worldImage } from './worldAssets.js';

// Same contract as the procedural rig; joints remain in gameplay units.
export function person(scene, type, x, y, scale = 1, shopkeeper = false) {
  const id = shopkeeper ? 'keeper' : type.id;
  if (!hasWorldArt(scene, id)) return legacyPerson(scene, type, x, y, scale, shopkeeper);
  const root = scene.add.container(x, y).setScale(scale);
  const shadow = scene.add.ellipse(0, 48, 51, 9, 0x243b31, 0.2);
  const leftLeg = worldImage(scene, id, 'leftLeg', -9, 17);
  const rightLeg = worldImage(scene, id, 'rightLeg', 9, 17);
  const leftArm = worldImage(scene, id, 'leftArm', -18, -11);
  const rightArm = worldImage(scene, id, 'rightArm', 18, -11);
  const body = worldImage(scene, id, 'body', 0, -22);
  const bodyScaleY = body.scaleY;
  const head = worldImage(scene, id, 'idle', 0, -18);
  root.add([shadow, leftLeg, rightLeg, leftArm, rightArm, body, head]);
  let currentMood = 'idle', lastFace = 'idle';
  const drawFace = (mood = 'idle', closed = false) => {
    currentMood = ['idle', 'happy', 'angry'].includes(mood) ? mood : 'idle';
    const next = currentMood === 'idle' && closed ? 'blink' : currentMood;
    if (next !== lastFace) { head.setFrame(next); head.setDisplaySize(50, 57); lastFace = next; }
  };
  return { root, drawFace, parts: { head, body, leftArm, rightArm, leftLeg, rightLeg }, update(t, walking = false, mood = currentMood, seated = false, ordering = false) {
    const motion = scene.game.save.data.settings.reducedMotion ? 0 : 1;
    const sway = Math.sin(t * 0.002) * motion;
    head.y = -18 + sway * 0.6;
    head.x = mood === 'angry' ? Math.sin(t / 95) * 1.1 * motion : 0;
    body.scaleY = bodyScaleY * (1 + sway * 0.009);
    const step = walking ? Math.sin(t * 0.012) * 0.22 * motion : sway * 0.015;
    leftLeg.rotation = seated ? -0.22 : step; rightLeg.rotation = seated ? 0.22 : -step;
    leftLeg.y = rightLeg.y = seated ? 15 : 17;
    leftArm.rotation = -step * 0.8;
    rightArm.rotation = ordering ? -1.05 : mood === 'happy' ? -0.85 + Math.sin(t * 0.009) * 0.12 * motion : step * 0.8;
    drawFace(mood, !!motion && t % 4700 > 4550);
  } };
}
