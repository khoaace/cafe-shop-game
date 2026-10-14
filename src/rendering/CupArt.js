import { LiquidLayerSystem } from '../systems/preparation/LiquidLayerSystem.js';
import { RECIPES } from '../config.js';
import { itemImage } from './itemAssets.js';
import { RULES, COLORS as C } from '../config.js';
import { line } from './primitives.js';

// Artwork and ingredients are separate layers: an image never implies a gameplay step.
export function createCupArt(scene, drink = null, x = 0, y = 0, scale = 1) {
  const root = scene.add.container(x, y).setScale(scale);
  const content = scene.add.container(); root.add(content);
  const layerView = new LiquidLayerSystem(scene, root);
  const liquid = layerView.graphics, ice = itemImage(scene, 'ice', 0, 0, 35, 24);
  const extraIce = itemImage(scene, 'ice', 0, 0, 30, 21);
  const saltedGlass = scene.add.graphics();
  const glass = itemImage(scene, 'glass', 0, -3, 48, 70);
  const phin = itemImage(scene, 'phin', 2, -57, 66, 48);
  const grounds = scene.add.graphics(), press = itemImage(scene, 'press', -2, -70, 31, 23);
  const details = scene.add.graphics();
  content.add([liquid, ice, extraIce, glass, saltedGlass, phin, grounds, press, details]);
  root.details = details;
  root.paint = (d, t = 0) => {
    content.setVisible(Boolean(d)); liquid.clear(); grounds.clear(); details.clear(); saltedGlass.clear();
    if (!d) return root;
    const quantities = [(d.condensed || 0) * 7, (d.milk || 0) * 10, (d.coffee || 0) * 27, (d.foam || 0) * 13];
    const colors = [0xe6c98c, 0xf9e9ce, 0x48281b, 0xecc572];
    const salted = d.recipeId === 'muoi';
    glass.setVisible(!salted);
    if (salted) {
      // A clear glass and translucent individual cubes keep all three served layers readable.
      saltedGlass.fillStyle(0xd6ece3, 0.06); saltedGlass.fillRoundedRect(-23, -33, 46, 60, 5);
      saltedGlass.lineStyle(1.5, 0x648c81, 0.8); saltedGlass.strokeRoundedRect(-23, -33, 46, 60, 5);
      saltedGlass.lineStyle(1.2, 0xfffdf3, 0.9); saltedGlass.strokeEllipse(0, -32, 45, 6); saltedGlass.strokeEllipse(0, 26, 37, 4);
      saltedGlass.fillStyle(0xffffff, 0.2); saltedGlass.fillRoundedRect(-19, -24, 2, 39, 1);
      quantities[2] = (d.preparation?.amounts.brewedCoffee || 0) * 27; quantities[3] = (d.preparation?.amounts.cream || 0) / 40 * 17; colors[3] = 0xfffcf4; }
    const structured = RECIPES[d.recipeId]?.engine === 'gesture' && d.preparation;
    const layers = structured ? d.preparation.layers.map(l => ({ ...l, amount: l.amount * (d.preparation.volumePerUnit[l.id] || 1) / d.preparation.capacity * 51 })) : quantities.map((amount, i) => ({ amount, color: colors[i], foam: i === 3 && amount > 0, slowSpread: salted && i === 3 }));
    const mixing = structured ? d.preparation.mixing : Math.min(1, (d.stir || 0) / RULES.stirRadians);
    const filled = layerView.render(layers, t, mixing, structured || salted ? d.preparation.foam : 0);
    root.liquidLevel = filled;
    const iceQuantity = structured ? d.preparation.amounts.ice || 0 : d.ice;
    ice.setVisible(!salted && iceQuantity > 0).setY(22 - Math.max(14, filled) + (salted ? quantities[3] + 8 : 10));
    extraIce.setVisible(!salted && iceQuantity > 3).setY(22 - Math.max(20, filled) + 21);
    if (salted && iceQuantity) for (let i = 0; i < Math.min(6, iceQuantity); i++) {
      const x = -12 + i % 3 * 12, y = Math.min(21, Math.min(14, 22 - filled + quantities[3] + 8) + Math.floor(i / 3) * 10);
      details.fillStyle(0xc6e8e6, 0.55); details.fillRoundedRect(x - 4.5, y - 4.5, 9, 9, 2);
      details.lineStyle(1, 0xffffff, 0.65); details.strokeRoundedRect(x - 4.5, y - 4.5, 9, 9, 2);
    }
    if (structured) for (const garnish of d.preparation.garnishes) {
      details.fillStyle(garnish.color, 0.95); details.fillCircle(garnish.x, garnish.y, 5);
      details.lineStyle(1, 0xfff4de, 0.55); details.strokeCircle(garnish.x, garnish.y, 3);
    }
    const filtering = ['PHIN', 'PRESSED', 'POURING', 'BREWING'].includes(d.state);
    phin.setVisible(filtering); press.setVisible(filtering && d.press > 0);
    if (filtering && d.grounds > 0) {
      grounds.fillStyle(0x51301b); grounds.fillEllipse(-2, -65, 34, 8);
      for (let i = 0; i < 23; i++) { grounds.fillStyle(i % 2 ? 0xa87949 : 0x72482a); grounds.fillCircle(-16 + (i * 7 % 29), -65 + Math.sin(i * 2) * 2.2, 0.55); }
    }
    if (d.state === 'BREWING') { details.fillStyle(C.coffee); details.fillEllipse(0, -32 + (t % 750) / 750 * 30, 3, 5); }
    if (d.state === 'BREWED' && !iceQuantity) for (let i = 0; i < 3; i++) {
      const dy = (t / 45 + i * 9) % 25;
      line(details, [[-10 + i * 10, -39 - dy], [-7 + i * 10, -46 - dy]], 0xffffff, 2, 0.35 * (1 - dy / 25));
    }
    return root;
  };
  return root.paint(drink);
}
