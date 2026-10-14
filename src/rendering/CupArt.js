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
    const salted = d.recipeId === 'muoi', coconut = d.recipeId === 'cotdua';
    glass.setVisible(!salted && !coconut);
    if (coconut) return paintCoconut(root, d, t, { layerView, liquid, ice, extraIce, glass: saltedGlass, phin, press, grounds, details });
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

// Cà phê cốt dừa: creamy coconut slush in a clear glass; poured coffee seeps down in marbled ribbons.
function paintCoconut(root, d, t, parts) {
  const { layerView, liquid, ice, extraIce, glass, phin, press, grounds, details } = parts;
  const p = d.preparation, a = p?.amounts || {};
  ice.setVisible(false); extraIce.setVisible(false);
  glass.fillStyle(0xd6ece3, 0.07); glass.fillRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.5, 0x648c81, 0.8); glass.strokeRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.2, 0xfffdf3, 0.9); glass.strokeEllipse(0, -32, 45, 6); glass.strokeEllipse(0, 26, 37, 4);
  const slush = ((a.coconutCream || 0) + (a.condensed || 0) * 15 + (a.ice || 0) * 8) / 130 * 50;
  const coffee = (a.brewedCoffee || 0) * 40 / 130 * 50;
  // Time since coffee first touched the coconut drives how far it has seeped down.
  if (coffee > 0 && root.coconutCoffeeAt === undefined) root.coconutCoffeeAt = t;
  if (coffee <= 0) root.coconutCoffeeAt = undefined;
  const reduced = d.reduced ?? root.scene?.game?.save?.data.settings.reducedMotion;
  const seep = coffee <= 0 ? 0 : reduced || !t ? 1 : Math.min(1, Math.max(0, (t - root.coconutCoffeeAt) / 2600));
  const technique = p?.blendTechnique ?? 1, crush = p?.crush ?? 1;
  // Warm ivory rather than paper white, so the slush reads against the cream counter.
  const cream = technique < 0.6 && (p?.blendTime || 0) >= 5.6 ? 0xe2d8c2 : 0xebdcbc;
  const layers = [
    { amount: coffee * 0.55 * seep, color: 0x4a2a1c, opacity: 0.95 },
    { amount: slush, color: cream, opacity: 0.98 },
    { amount: coffee * (1 - 0.55 * seep), color: 0x5a3322, opacity: 0.93 },
  ];
  const filled = layerView.render(layers, t, 0, 0);
  root.liquidLevel = filled;
  const bottom = 24, slushBottom = bottom - layers[0].amount * Math.min(1, 54 / (layers.reduce((n, l) => n + l.amount, 0) || 1)), slushTop = bottom - filled + layers[2].amount * Math.min(1, 54 / (layers.reduce((n, l) => n + l.amount, 0) || 1));
  const g = liquid, motion = reduced ? 0 : t;
  if (slush > 0) {
    // Ice fines: tiny sparkles when smooth, visible chunks when under-blended.
    const chunk = technique < 0.6 && (p?.blendTime || 0) < 2.4 ? 2.6 : crush < 1 ? 1.6 : 0.8;
    for (let i = 0; i < 16; i++) { const y = slushTop + 2 + (i * 7) % Math.max(3, slushBottom - slushTop - 3); g.fillStyle(0xffffff, 0.55); g.fillCircle(-17 + (i * 11) % 34, y, chunk * (i % 3 ? 0.7 : 1)); }
    if (coffee > 0) {
      // Brown-white marbling: ribbons of coffee curl down through the coconut as it seeps.
      const depth = (slushBottom - slushTop) * Math.min(1, 0.25 + seep);
      // Coffee tints the top of the slush, fading downward.
      for (let k = 0; k < 6; k++) { g.fillStyle(0x8a5a3a, 0.3 * (1 - k / 6) * Math.min(1, seep + 0.3)); g.fillRect(-20, slushTop + k * 1.6, 40, 1.7); }
      const vein = (x0, reach, phase, width, color, alpha) => {
        const x = n => Math.max(-19, Math.min(19, x0 + Math.sin(phase + n * 0.55) * 3.2 + Math.sin(phase * 1.7 + n * 1.3) * 1.4 + Math.sin(motion / 1100 + x0) * 1.1));
        for (let k = 0; k < 10; k++) {
          g.lineStyle(Math.max(0.6, width * (1 - k * 0.07)), color, alpha * (1 - k * 0.06));
          g.beginPath(); g.moveTo(x(k), slushTop + reach * k / 10); g.lineTo(x(k + 1), slushTop + reach * (k + 1) / 10); g.strokePath();
        }
      };
      // Soft caramel clouds first, then fine dark veins through them: brown-white marble.
      for (let i = 0; i < 3; i++) vein([-11, 2, 12][i], depth * [0.9, 0.7, 1][i], i * 2.1 + motion / 900, 7, 0xb08458, 0.22);
      for (let i = 0; i < 6; i++) vein([-15, -8, -2, 5, 10, 15][i], depth * [0.8, 1, 0.55, 0.9, 0.65, 0.75][i], i * 1.9 + motion / 760, [2.2, 1.4, 2.8, 1.6, 2.2, 1.2][i], [0x5a3322, 0x7b4a2d, 0x4a2a1c, 0x8a5a3a, 0x6b3d25, 0x7b4a2d][i], 0.5);
      // Small swirls drifting where the layers meet.
      for (let i = 0; i < 3; i++) {
        const cx = Math.sin(motion / 900 + i * 2.1) * 9, cy = slushTop + 4 + i * depth / 3.5;
        g.lineStyle(1.2, 0xc79a6b, 0.55); g.strokeEllipse(cx, cy, 9 - i, 3);
        g.lineStyle(1, 0xfff4e2, 0.5); g.strokeEllipse(cx + 2, cy + 1, 5, 1.8);
      }
      g.fillStyle(0xb68456, 0.35); g.fillEllipse(0, slushTop + 1, 38, 3.5);
    } else if ((p?.foam || 0) > 0.05) {
      for (let i = 0; i < 10; i++) { g.fillStyle(0xffffff, 0.8); g.fillCircle(-16 + i * 3.6, slushTop + Math.sin(i * 2.3) * 1.2, 1 + (i % 2) * 0.6); }
    }
  }
  // Soft highlights on the clear glass.
  glass.fillStyle(0xffffff, 0.26); glass.fillRoundedRect(-19, -25, 2.5, 42, 1);
  glass.fillStyle(0xffffff, 0.14); glass.fillRoundedRect(14, -20, 2, 28, 1);
  glass.lineStyle(1, 0xffffff, 0.3 + (reduced ? 0 : 0.1 * Math.sin(t / 600))); glass.beginPath(); glass.arc(0, -10, 18, -0.4, 0.2); glass.strokePath();
  const filtering = ['PHIN', 'PRESSED', 'POURING', 'BREWING'].includes(d.state);
  phin.setVisible(filtering); press.setVisible(filtering && d.press > 0);
  if (filtering && d.grounds > 0) {
    grounds.fillStyle(0x51301b); grounds.fillEllipse(-2, -65, 34, 8);
    for (let i = 0; i < 23; i++) { grounds.fillStyle(i % 2 ? 0xa87949 : 0x72482a); grounds.fillCircle(-16 + (i * 7 % 29), -65 + Math.sin(i * 2) * 2.2, 0.55); }
  }
  if (d.state === 'BREWING') { details.fillStyle(0x492a1c); details.fillEllipse(0, -32 + (t % 750) / 750 * 30, 3, 5); }
  return root;
}
