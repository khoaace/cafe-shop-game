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
    const salted = d.recipeId === 'muoi', coconut = d.recipeId === 'cotdua', tratac = d.recipeId === 'tratac', tradao = d.recipeId === 'tradao', travai = d.recipeId === 'travai', cacao = d.recipeId === 'cacao', matcha = d.recipeId === 'matcha';
    glass.setVisible(!salted && !coconut && !tratac && !tradao && !travai && !cacao && !matcha);
    if (coconut) return paintCoconut(root, d, t, { layerView, liquid, ice, extraIce, glass: saltedGlass, phin, press, grounds, details });
    if (tratac) return paintTraTac(root, d, t, { layerView, liquid, ice, extraIce, glass: saltedGlass, phin, press, grounds, details });
    if (tradao) return paintTraDao(root, d, t, { layerView, liquid, ice, extraIce, glass: saltedGlass, phin, press, grounds, details });
    if (travai) return paintTraVai(root, d, t, { layerView, liquid, ice, extraIce, glass: saltedGlass, phin, press, grounds, details });
    if (cacao) return paintCacao(root, d, t, { layerView, liquid, ice, extraIce, glass: saltedGlass, phin, press, grounds, details });
    if (matcha) return paintMatcha(root, d, t, { layerView, liquid, ice, extraIce, glass: saltedGlass, phin, press, grounds, details });
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
    if (salted && iceQuantity) for (let i = 0; i < 6 && i < iceQuantity; i++) {
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

// Trà tắc: luminous golden iced tea with syrup ribbons, colliding ice cubes, floating cut kumquat slices, rising micro-bubbles, and surface ripples.
function paintTraTac(root, d, t, parts) {
  const { layerView, liquid, ice, extraIce, glass, phin, press, grounds, details } = parts;
  const p = d.preparation, a = p?.amounts || {};
  ice.setVisible(false); extraIce.setVisible(false); phin.setVisible(false); press.setVisible(false);
  const reduced = d.reduced ?? root.scene?.game?.save?.data.settings.reducedMotion;
  const motion = reduced ? 0 : t;

  // Tall clear street-style glass with cool condensation.
  glass.fillStyle(0xe2f4ec, 0.08); glass.fillRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.5, 0x699488, 0.82); glass.strokeRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.2, 0xfffdf3, 0.9); glass.strokeEllipse(0, -32, 45, 6); glass.strokeEllipse(0, 26, 37, 4);

  const mixing = Math.min(1, p?.mixing || 0);
  const teaAmt = (a.tea || 0) / 230 * 50;
  const juiceAmt = (a.citrusJuice || 0) * 1.4 / 230 * 50;
  const syrupAmt = (a.syrup || 0) * 1.4 / 230 * 50;
  const iceCubes = a.ice || 0;
  const iceAmt = iceCubes * 12 / 230 * 50;

  const layers = [
    { amount: syrupAmt, color: 0xe09b2d, opacity: 0.94 },
    { amount: teaAmt + iceAmt * 0.55, color: mixing > 0.35 ? 0xcf831f : 0xc26e1a, opacity: 0.88 },
    { amount: juiceAmt, color: 0xe8be32, opacity: 0.9 },
  ];
  const filled = layerView.render(layers, t, mixing, 0);
  root.liquidLevel = filled;
  const bottom = 24, topY = bottom - filled;

  if (filled > 2) {
    // Golden internal glow and blended citrus gradient when stirred.
    liquid.fillStyle(mixing > 0.5 ? 0xf2c14e : 0xe39c2b, 0.18 + mixing * 0.14);
    liquid.fillRoundedRect(-19, topY + 2, 38, Math.max(4, filled - 4), 3);

    // Syrup ribbons at the bottom before/during stirring.
    if ((a.syrup || 0) > 0.5 && mixing < 0.98) {
      const ribbonAlpha = (1 - mixing * 0.85) * 0.65;
      for (let i = 0; i < 3; i++) {
        const y0 = bottom - 3 - i * 3.2;
        liquid.lineStyle(2.2 - i * 0.4, i % 2 ? 0xf7cf68 : 0xd48317, ribbonAlpha);
        liquid.beginPath();
        for (let step = 0; step <= 8; step++) {
          const rx = -15 + step * 3.75;
          const ry = y0 + Math.sin(step * 0.85 + i * 1.6 + motion / 360) * (1.8 - mixing * 1.1);
          if (step === 0) liquid.moveTo(rx, ry); else liquid.lineTo(rx, ry);
        }
        liquid.strokePath();
      }
    }

    // Small rising bubbles & citrus pulp flecks throughout the golden tea.
    const bubbleCount = Math.min(12, Math.max(4, Math.round(((a.tea || 0) + (a.citrusJuice || 0) * 2) / 18)));
    for (let i = 0; i < bubbleCount; i++) {
      const cycle = ((motion / (420 + (i % 3) * 90)) + i * 0.27) % 1;
      const bx = -15 + ((i * 9 + Math.sin(motion / 500 + i) * 2) % 30);
      const by = bottom - 3 - cycle * Math.max(6, filled - 6);
      details.fillStyle(i % 3 === 0 ? 0xfff3b0 : 0xffffff, 0.45 * (1 - cycle * 0.4));
      details.fillCircle(bx, by, i % 2 ? 0.9 : 1.3);
    }

    // Translucent ice cubes with subtle bobbing & collision ripples.
    if (iceCubes > 0) {
      const shownCubes = Math.min(5, Math.ceil(iceCubes));
      for (let i = 0; i < shownCubes; i++) {
        const row = Math.floor(i / 3), col = i % 3;
        const bob = Math.sin(motion / 340 + i * 1.8) * 1.1;
        const jiggle = Math.cos(motion / 260 + i * 2.3) * 0.7;
        const ix = -11 + col * 11 + (row ? 5 : 0) + jiggle;
        const iy = Math.min(bottom - 7, Math.max(-26, topY + 6 + row * 8 + bob));
        details.fillStyle(0xdff6f5, 0.56);
        details.fillRoundedRect(ix - 4.8, iy - 4.5, 9.6, 9, 2.2);
        details.lineStyle(1, 0xffffff, 0.75);
        details.strokeRoundedRect(ix - 4.8, iy - 4.5, 9.6, 9, 2.2);
        details.fillStyle(0xffffff, 0.45);
        details.fillRect(ix - 3, iy - 3, 3.2, 1.5);
      }
    }

    // Floating cut kumquat halves/slices with green-gold rind, pith, segments, and seeds.
    const sliceCount = Math.min(4, Math.max((p?.garnishes?.length || 0), (a.kumquat || 0) >= 1 ? Math.round((a.kumquat || 0) * 2) : (a.citrusJuice || 0) >= 5 ? 2 : 0));
    const slicePositions = [[-11, 4], [10, 5], [-2, 11], [6, 15]];
    for (let i = 0; i < sliceCount; i++) {
      const [sx0, syOff] = slicePositions[i % slicePositions.length];
      const sx = sx0 + Math.sin(motion / 480 + i * 1.5) * 1.1;
      const sy = Math.min(bottom - 6, Math.max(-25, topY + syOff + Math.cos(motion / 410 + i * 1.9) * 0.9));
      details.fillStyle(0x4d8a31, 0.96); details.fillCircle(sx, sy, 5.2);
      details.fillStyle(0xf8f0d0, 0.95); details.fillCircle(sx, sy, 4.1);
      details.fillStyle(0xf39c22, 0.96); details.fillCircle(sx, sy, 3.4);
      details.lineStyle(0.7, 0xfff3c4, 0.75);
      for (let k = 0; k < 3; k++) {
        const ang = k * Math.PI / 3 + (i * 0.4);
        details.beginPath();
        details.moveTo(sx - Math.cos(ang) * 3.1, sy - Math.sin(ang) * 3.1);
        details.lineTo(sx + Math.cos(ang) * 3.1, sy + Math.sin(ang) * 3.1);
        details.strokePath();
      }
      details.fillStyle(0xfffbe0, 0.9); details.fillCircle(sx + 0.8, sy - 0.6, 0.65);
    }

    // Liquid surface ripples at the top meniscus.
    const ripplePulse = Math.sin(motion / 290) * 1.5;
    details.lineStyle(1.1, 0xfff4c8, 0.62);
    details.strokeEllipse(0, topY + 0.5, 38, 3.6);
    details.lineStyle(0.9, 0xffe28a, 0.48);
    details.strokeEllipse(ripplePulse * 0.8, topY + 0.6, 22 + ripplePulse * 2, 2.1);
  }

  // Soft highlights & condensation beads on the clear glass.
  glass.fillStyle(0xffffff, 0.25); glass.fillRoundedRect(-19, -25, 2.5, 42, 1);
  glass.fillStyle(0xffffff, 0.14); glass.fillRoundedRect(14, -20, 2, 28, 1);
  if (iceCubes > 0) for (let i = 0; i < 5; i++) {
    glass.fillStyle(0xe8fbf8, 0.45);
    glass.fillCircle(-15 + (i * 8) % 30, -10 + (i * 9) % 28, 1);
  }
  return root;
}

// Trà đào cam sả: golden-amber tea with soft orange highlights, amber-orange swirling, curved peach slices, green lemongrass stalk, ice cubes, orange garnish, and surface ripples — all inside the glass mask.
function paintTraDao(root, d, t, parts) {
  const { layerView, liquid, ice, extraIce, glass, phin, press } = parts;
  const p = d.preparation, a = p?.amounts || {};
  ice.setVisible(false); extraIce.setVisible(false); phin.setVisible(false); press.setVisible(false);
  const reduced = d.reduced ?? root.scene?.game?.save?.data.settings.reducedMotion;
  const motion = reduced ? 0 : t;

  glass.fillStyle(0xe5f4ec, 0.08); glass.fillRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.5, 0x699488, 0.82); glass.strokeRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.2, 0xfffdf3, 0.9); glass.strokeEllipse(0, -32, 45, 6); glass.strokeEllipse(0, 26, 37, 4);

  const teaAmt = (a.tea || 0) / 250 * 48;
  const syrupAmt = (a.peachSyrup || 0) * 1.4 / 250 * 48;
  const juiceAmt = (a.orangeJuice || 0) * 1.35 / 250 * 48;
  const peachCount = Math.min(4, Math.round(a.peach || 0));
  const hasLemongrass = (a.lemongrass || 0) >= 1;
  const hasGarnish = (a.orange || 0) >= 1;
  const iceCubes = a.ice || 0;
  const solidAmt = (peachCount * 5 + (hasLemongrass ? 4 : 0) + iceCubes * 10) / 250 * 48;

  const layers = [
    { amount: syrupAmt, color: 0xe27b2b, opacity: 0.94 },
    { amount: teaAmt + solidAmt * 0.55, color: 0xc9761e, opacity: 0.89 },
    { amount: juiceAmt, color: 0xf59d2a, opacity: 0.9 },
  ];
  const filled = layerView.render(layers, t, 0.25, 0);
  root.liquidLevel = filled;
  const bottom = 24, topY = bottom - Math.max(8, filled);

  // Draw all internal ingredients onto `liquid` so they remain strictly inside the glass geometry mask.
  if (filled > 1 || peachCount > 0 || hasLemongrass || iceCubes > 0 || hasGarnish) {
    if (filled > 2) {
      // Soft orange highlights & warm amber-orange swirling when orange juice is present.
      liquid.fillStyle(0xffad42, 0.2);
      liquid.fillRoundedRect(-17, topY + 2, 34, Math.max(4, filled - 4), 3);
      if ((a.orangeJuice || 0) > 1) {
        for (let i = 0; i < 3; i++) {
          const sy = topY + 5 + i * Math.max(4, (filled - 8) / 3);
          const sx = Math.sin(motion / 380 + i * 1.7) * 3;
          liquid.lineStyle(1.8 - i * 0.3, i % 2 ? 0xffbf5e : 0xe87b1e, 0.62);
          liquid.strokeEllipse(sx, sy, 24 - i * 3, 3.6);
        }
      }
    }

    // Green bruised lemongrass stalk leaning naturally inside the glass.
    if (hasLemongrass) {
      liquid.save();
      liquid.translateCanvas(8, 3);
      liquid.rotateCanvas(0.18);
      liquid.fillStyle(0x6c9c43, 0.95);
      liquid.fillRoundedRect(-2.6, -24, 5.2, 42, 2.4);
      liquid.fillStyle(0x9bc468, 0.95);
      liquid.fillRoundedRect(-1.8, -22, 3.4, 38, 1.6);
      liquid.fillStyle(0xdce8a8, 0.96);
      liquid.fillRoundedRect(-2.8, 5, 5.6, 13, 2.5);
      liquid.restore();
    }

    // Recognizable curved golden-coral peach slices settled inside the glass.
    const peachCoords = [[-8, 15, -0.24], [5, 16, 0.22], [-2, 8, -0.08], [6, 9, 0.16]];
    for (let i = 0; i < peachCount; i++) {
      const [px0, py0, ang] = peachCoords[i % peachCoords.length];
      const py = Math.min(bottom - 5, Math.max(topY + 4, py0 + Math.sin(motion / 460 + i) * 0.7));
      liquid.save();
      liquid.translateCanvas(px0, py);
      liquid.rotateCanvas(ang);
      liquid.fillStyle(0xd9651c, 0.96);
      liquid.fillEllipse(0, 0, 14, 7.6);
      liquid.fillStyle(0xffae42, 0.96);
      liquid.fillEllipse(0, -0.8, 11.6, 5.6);
      liquid.fillStyle(0xffe09e, 0.65);
      liquid.fillEllipse(-1.5, -1.4, 6.5, 2.4);
      liquid.restore();
    }

    // Translucent ice cubes floating near the top of the liquid.
    if (iceCubes > 0) {
      const shownCubes = Math.min(5, Math.ceil(iceCubes));
      for (let i = 0; i < shownCubes; i++) {
        const row = Math.floor(i / 3), col = i % 3;
        const bob = Math.sin(motion / 350 + i * 1.7) * 0.9;
        const ix = -11 + col * 10 + (row ? 4 : 0);
        const iy = Math.min(bottom - 8, Math.max(-24, topY + 6 + row * 7.5 + bob));
        liquid.fillStyle(0xdff6f5, 0.54);
        liquid.fillRoundedRect(ix - 4.5, iy - 4.2, 9, 8.4, 2);
        liquid.lineStyle(1, 0xffffff, 0.72);
        liquid.strokeRoundedRect(ix - 4.5, iy - 4.2, 9, 8.4, 2);
      }
    }

    // Prepared orange wheel garnish tucked inside the upper glass rim.
    if (hasGarnish) {
      const gx = -7, gy = Math.min(8, Math.max(-21, topY + 3));
      liquid.fillStyle(0xe87b1e, 0.96); liquid.fillCircle(gx, gy, 7.2);
      liquid.fillStyle(0xfff4d2, 0.95); liquid.fillCircle(gx, gy, 5.9);
      liquid.fillStyle(0xf59d2a, 0.96); liquid.fillCircle(gx, gy, 4.9);
      liquid.lineStyle(0.75, 0xfff4d2, 0.8);
      for (let k = 0; k < 4; k++) {
        const ang = k * Math.PI / 4;
        liquid.beginPath();
        liquid.moveTo(gx - Math.cos(ang) * 4.7, gy - Math.sin(ang) * 4.7);
        liquid.lineTo(gx + Math.cos(ang) * 4.7, gy + Math.sin(ang) * 4.7);
        liquid.strokePath();
      }
    }

    // Surface ripples at the liquid meniscus.
    if (filled > 2) {
      const ripple = Math.sin(motion / 300) * 1.4;
      liquid.lineStyle(1.1, 0xfff2c2, 0.62);
      liquid.strokeEllipse(0, topY + 0.6, 36, 3.4);
      liquid.lineStyle(0.9, 0xffc978, 0.48);
      liquid.strokeEllipse(ripple * 0.7, topY + 0.7, 21 + ripple * 1.8, 2);
    }
  }

  glass.fillStyle(0xffffff, 0.25); glass.fillRoundedRect(-19, -25, 2.5, 42, 1);
  glass.fillStyle(0xffffff, 0.14); glass.fillRoundedRect(14, -20, 2, 28, 1);
  return root;
}

// Trà vải: pale amber tea, recognizable translucent white lychees, clear ice cubes, gentle bubbles, and light reflections inside the glass mask.
function paintTraVai(root, d, t, parts) {
  const { layerView, liquid, ice, extraIce, glass, phin, press } = parts;
  const p = d.preparation, a = p?.amounts || {};
  ice.setVisible(false); extraIce.setVisible(false); phin.setVisible(false); press.setVisible(false);
  const reduced = d.reduced ?? root.scene?.game?.save?.data.settings.reducedMotion;
  const motion = reduced ? 0 : t;

  glass.fillStyle(0xedf7f2, 0.08); glass.fillRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.5, 0x678f84, 0.82); glass.strokeRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.2, 0xfffdf3, 0.9); glass.strokeEllipse(0, -32, 45, 6); glass.strokeEllipse(0, 26, 37, 4);

  const mixing = Math.min(1, p?.mixing || 0);
  const teaAmt = (a.tea || 0) / 240 * 50;
  const syrupAmt = (a.lycheeSyrup || 0) * 1.4 / 240 * 50;
  const lycheeCount = Math.min(5, Math.round(a.lychee || 0));
  const iceCubes = Math.min(6, Math.round(a.ice || 0));
  const solidAmt = (lycheeCount * 5 + iceCubes * 9) / 240 * 50;

  // Pale golden-amber tea distinct from dark orange-amber trà đào and bright citrus trà tắc.
  const layers = [
    { amount: syrupAmt, color: 0xf0c987, opacity: 0.92 },
    { amount: teaAmt + solidAmt * 0.55, color: mixing > 0.3 ? 0xe5b85c : 0xdca242, opacity: 0.84 },
  ];
  const filled = layerView.render(layers, t, mixing * 0.78, 0);
  root.liquidLevel = filled;
  const bottom = 24;
  const topY = bottom - Math.max(6, filled);

  if (filled > 1 || lycheeCount > 0 || iceCubes > 0) {
    // Pale lychee syrup shimmer ribbons near the base before full mixing.
    if (syrupAmt > 0.4 && mixing < 0.95) {
      const fade = (1 - mixing * 0.72) * 0.5;
      for (let i = 0; i < 3; i++) {
        const rx = -9 + i * 9 + Math.sin(motion / 540 + i) * 2.2;
        const ry = bottom - 3 - i * 3;
        liquid.lineStyle(1.6, 0xfff3d1, fade);
        liquid.strokeEllipse(rx, Math.max(topY + 3, ry), 12, 3.2);
      }
    }

    // Clear ice cubes floating and nestled among the lychees.
    for (let i = 0; i < iceCubes; i++) {
      const bob = Math.sin(motion / 430 + i * 1.6) * 1.1;
      const cx = -11 + (i % 3) * 11 + (i >= 3 ? 2 : 0);
      const cy = Math.min(bottom - 7, Math.max(-22, topY + 6 + Math.floor(i / 3) * 8.5 + bob));
      liquid.fillStyle(0xdcf5f4, 0.58);
      liquid.fillRoundedRect(cx - 5.2, cy - 4.8, 10.4, 9.6, 2.4);
      liquid.lineStyle(1, 0xffffff, 0.78);
      liquid.strokeRoundedRect(cx - 5.2, cy - 4.8, 10.4, 9.6, 2.4);
      liquid.fillStyle(0xffffff, 0.42);
      liquid.fillRect(cx - 3.5, cy - 3.3, 4.2, 2);
    }

    // Recognizable translucent white peeled lychee fruits (floating when tea is present, settled at base when dry).
    const rimGarnish = Boolean(p?.lycheeGarnish);
    const inCupCount = rimGarnish && p?.lycheeGarnishFromAllocated && lycheeCount > 0 ? Math.max(1, lycheeCount - 1) : lycheeCount;
    for (let i = 0; i < inCupCount; i++) {
      const sway = Math.sin(motion / 500 + i * 1.9) * 1.2;
      const floatBase = filled > 12 ? Math.max(topY + 7, bottom - 14 - (i % 2) * 6) : bottom - 6 - i * 4;
      const lx = -10 + (i % 3) * 10 + sway * 0.45;
      const ly = Math.min(bottom - 5, Math.max(topY + 4, floatBase + sway * 0.55));
      // Outer pearlescent flesh
      liquid.fillStyle(0xe5ddd0, 0.92);
      liquid.fillEllipse(lx, ly, 12.5, 10.5);
      liquid.fillStyle(0xfdfaf4, 0.95);
      liquid.fillEllipse(lx - 0.5, ly - 0.5, 10.6, 8.8);
      // Translucent dark-brown seed visible faintly inside the center
      liquid.fillStyle(0x6e3d2c, 0.34);
      liquid.fillEllipse(lx + 0.8, ly + 0.6, 4.6, 3.6);
      // Juicy white specular highlight
      liquid.fillStyle(0xffffff, 0.85);
      liquid.fillCircle(lx - 2.4, ly - 2, 1.7);
    }

    // Optional rim garnish lychee (tucked inside the upper glass edge with a tiny crimson shell accent).
    if (rimGarnish) {
      const gx = 10, gy = Math.min(6, Math.max(-21, topY + 2));
      liquid.fillStyle(0xc94a52, 0.92);
      liquid.fillCircle(gx + 3, gy - 2, 4.6);
      liquid.fillStyle(0xfdfaf4, 0.97);
      liquid.fillEllipse(gx, gy, 11, 9.2);
      liquid.fillStyle(0x6e3d2c, 0.36);
      liquid.fillCircle(gx + 0.8, gy + 0.6, 2.1);
      liquid.fillStyle(0xffffff, 0.88);
      liquid.fillCircle(gx - 2, gy - 1.8, 1.5);
    }

    // Gentle rising bubbles and surface ripples.
    if (filled > 4) {
      for (let i = 0; i < 6; i++) {
        const span = Math.max(6, filled - 4);
        const progress = ((motion / 24 + i * 9) % span) / span;
        const bx = -13 + (i * 9) % 26 + Math.sin(motion / 310 + i) * 1.3;
        const by = bottom - 3 - progress * (filled - 4);
        liquid.fillStyle(0xfffdf5, 0.52);
        liquid.fillCircle(bx, by, i % 2 ? 1.2 : 0.85);
      }
      const ripple = Math.sin(motion / 320) * 1.3;
      liquid.lineStyle(1.1, 0xfff8dc, 0.65);
      liquid.strokeEllipse(0, topY + 0.6, 36, 3.3);
      liquid.lineStyle(0.9, 0xf7d894, 0.5);
      liquid.strokeEllipse(ripple * 0.7, topY + 0.7, 20 + ripple * 1.6, 1.9);
    }
  }

  glass.fillStyle(0xffffff, 0.27); glass.fillRoundedRect(-19, -25, 2.5, 42, 1);
  glass.fillStyle(0xffffff, 0.15); glass.fillRoundedRect(14, -20, 2, 28, 1);
  return root;
}

// Cacao sữa đá: dry cocoa powder mound & dust -> wet dark clumps with hot water -> glossy dark chocolate when stirred -> white milk ribbons & rich chocolate-milk gradient -> ice cubes & surface reflections.
function paintCacao(root, d, t, parts) {
  const { layerView, liquid, ice, extraIce, glass, phin, press } = parts;
  const p = d.preparation, a = p?.amounts || {};
  ice.setVisible(false); extraIce.setVisible(false); phin.setVisible(false); press.setVisible(false);
  const reduced = d.reduced ?? root.scene?.game?.save?.data.settings.reducedMotion;
  const motion = reduced ? 0 : t;

  glass.fillStyle(0xebf4ee, 0.08); glass.fillRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.5, 0x678f84, 0.82); glass.strokeRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.2, 0xfffdf3, 0.9); glass.strokeEllipse(0, -32, 45, 6); glass.strokeEllipse(0, 26, 37, 4);

  const cacaoGrams = a.cacao || 0;
  const waterMl = a.water || 0;
  const condensedMl = a.condensed || 0;
  const milkMl = a.milk || 0;
  const iceCubes = Math.min(6, Math.round(a.ice || 0));
  const dissolve = Math.min(1, p?.cacaoDissolveProgress || 0);
  const mixing = Math.min(1, p?.mixing || dissolve * 0.85);

  const waterAmt = (waterMl + Math.min(20, cacaoGrams) * 0.45) / 210 * 48;
  const condensedAmt = condensedMl * 1.15 / 210 * 48;
  const milkAmt = milkMl * 0.95 / 210 * 48;
  const iceAmt = iceCubes * 8 / 210 * 48;

  const hasMilk = condensedMl > 0 || milkMl > 0;
  const baseCocoaColor = dissolve >= 0.92 ? 0x4b2817 : dissolve >= 0.65 ? 0x562f1c : 0x633822;
  const blendedCocoaColor = milkMl >= 50 ? 0x7b4b31 : condensedMl > 0 ? 0x683c24 : baseCocoaColor;

  const layers = [];
  if (condensedAmt > 0.1) layers.push({ amount: condensedAmt, color: 0xf3dfb3, opacity: 0.96 });
  if (waterAmt > 0.1 && (waterMl > 0 || hasMilk)) {
    layers.push({ amount: waterAmt + iceAmt * 0.45, color: hasMilk && mixing > 0.4 ? blendedCocoaColor : baseCocoaColor, opacity: 0.96 });
  }
  if (milkAmt > 0.1) {
    layers.push({ amount: milkAmt + iceAmt * 0.35, color: mixing > 0.55 ? 0x8f5b3d : 0xfbf3e4, opacity: 0.95 });
  }

  const filled = layers.length ? layerView.render(layers, t, hasMilk ? 0.52 : dissolve * 0.8, 0) : 0;
  root.liquidLevel = filled;
  const bottom = 24;
  const topY = bottom - Math.max(6, filled);

  // Step 1: Dry cocoa powder accumulating at bottom with soft shadow and fine dust before hot water is added.
  if (cacaoGrams > 0 && waterMl <= 0.5 && !hasMilk) {
    const moundH = Math.min(14, 4 + cacaoGrams * 0.45);
    liquid.fillStyle(0x2d170d, 0.45);
    liquid.fillEllipse(0, bottom - 1, 34, 6);
    liquid.fillStyle(0x5b321d, 0.96);
    liquid.fillEllipse(0, bottom - moundH * 0.38, 32, moundH);
    liquid.fillStyle(0x7c472b, 0.9);
    liquid.fillEllipse(-1, bottom - moundH * 0.52, 24, moundH * 0.72);
    for (let i = 0; i < 9; i++) {
      const dx = -14 + (i * 7) % 28;
      const dy = bottom - 2 - (i % 4) * 2.4;
      liquid.fillStyle(i % 2 ? 0x8e5436 : 0x432314, 0.85);
      liquid.fillCircle(dx, dy, 1 + (i % 2) * 0.5);
    }
  }

  if (filled > 1) {
    // Rich dark-to-light brown gradient & white milk ribbons when condensed/fresh milk is poured into cocoa.
    if (hasMilk) {
      liquid.fillStyle(0x6b3e26, 0.28);
      liquid.fillRoundedRect(-18, topY + 2, 36, Math.max(4, filled - 4), 3);
      for (let i = 0; i < 4; i++) {
        const wy = topY + 4 + i * Math.max(3.5, (filled - 7) / 4);
        const wave = Math.sin(motion / 390 + i * 1.5) * 3.2;
        liquid.lineStyle(2 - i * 0.25, i % 2 === 0 ? 0xfff5e4 : 0xd4a97d, 0.62);
        liquid.beginPath();
        liquid.moveTo(-14, wy);
        liquid.lineTo(wave, wy + 1.6);
        liquid.lineTo(14, wy - 0.8);
        liquid.strokePath();
      }
    }

    // Step 2 & 3: Wet cocoa clumps that shrink and smooth out as circular stirring progresses.
    if (cacaoGrams > 0 && dissolve < 0.92) {
      const clumpFactor = 1 - dissolve;
      const clumpCount = Math.max(1, Math.ceil(clumpFactor * 7));
      for (let i = 0; i < clumpCount; i++) {
        const angle = (motion / 340) + i * 1.15;
        const radius = (3 + (i % 3) * 3.8) * (0.4 + clumpFactor * 0.6);
        const cx = Math.cos(angle) * radius;
        const cy = Math.min(bottom - 4, Math.max(topY + 4, topY + 5 + (i % 3) * 4.5 + Math.sin(angle) * 1.5));
        const cr = (1.1 + (i % 2) * 0.8) * (0.45 + clumpFactor * 0.75);
        liquid.fillStyle(0x28130a, 0.92);
        liquid.fillCircle(cx, cy, cr);
        liquid.fillStyle(0x7c462a, 0.78);
        liquid.fillCircle(cx - 0.5, cy - 0.5, cr * 0.55);
      }
    }

    // Circular liquid movement, glossy chocolate sheen, and tiny bubbles when stirred.
    if (dissolve > 0.15) {
      const glossAlpha = Math.min(0.68, 0.2 + dissolve * 0.48);
      const swirlX = Math.sin(motion / 280) * 2.2;
      liquid.lineStyle(1.4, hasMilk ? 0xffeacc : 0xdba06f, glossAlpha);
      liquid.strokeEllipse(swirlX, topY + 2.5, 24, 3.4);
      if (dissolve >= 0.65) {
        liquid.lineStyle(1, 0xfff5e0, glossAlpha * 0.85);
        liquid.strokeEllipse(-swirlX * 0.7, topY + 5, 15, 2.2);
      }
      for (let i = 0; i < 6; i++) {
        const bx = -13 + (i * 5) + Math.sin(motion / 310 + i) * 1.2;
        const by = topY + 2 + (i % 2) * 2.2;
        liquid.fillStyle(0xffe7c2, 0.58);
        liquid.fillCircle(bx, by, i % 2 ? 1.1 : 0.8);
      }
    }

    // Step 5: Ice cubes floating in the cocoa milk with surface reflections.
    for (let i = 0; i < iceCubes; i++) {
      const bob = Math.sin(motion / 400 + i * 1.7) * 1.1;
      const ix = -11 + (i % 3) * 11 + (i >= 3 ? 2 : 0);
      const iy = Math.min(bottom - 7, Math.max(-22, topY + 5.5 + Math.floor(i / 3) * 8 + bob));
      liquid.fillStyle(0xe2f6f5, 0.64);
      liquid.fillRoundedRect(ix - 5, iy - 4.5, 10, 9, 2.3);
      liquid.lineStyle(1, 0xffffff, 0.82);
      liquid.strokeRoundedRect(ix - 5, iy - 4.5, 10, 9, 2.3);
      liquid.fillStyle(0xffffff, 0.48);
      liquid.fillRect(ix - 3.3, iy - 3.1, 4, 1.8);
    }

    // Gentle surface waves at the meniscus.
    const ripple = Math.sin(motion / 310) * 1.3;
    liquid.lineStyle(1.1, 0xfff3dc, 0.65);
    liquid.strokeEllipse(0, topY + 0.6, 36, 3.3);
    liquid.lineStyle(0.9, 0xd8a172, 0.48);
    liquid.strokeEllipse(ripple * 0.7, topY + 0.7, 20 + ripple * 1.5, 1.9);
  }

  glass.fillStyle(0xffffff, 0.27); glass.fillRoundedRect(-19, -25, 2.5, 42, 1);
  glass.fillStyle(0xffffff, 0.15); glass.fillRoundedRect(14, -20, 2, 28, 1);
  return root;
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

// Matcha latte đá: tall clear glass, white milk base, floating ice cubes, vivid green matcha top layer, green-white swirling interface, and fine emerald microfoam.
function paintMatcha(root, d, t, parts) {
  const { layerView, liquid, ice, extraIce, glass, phin, press } = parts;
  const p = d.preparation, a = p?.amounts || {};
  ice.setVisible(false); extraIce.setVisible(false); phin.setVisible(false); press.setVisible(false);
  const reduced = d.reduced ?? root.scene?.game?.save?.data.settings.reducedMotion;
  const motion = reduced ? 0 : t;

  glass.fillStyle(0xe5f4ec, 0.08); glass.fillRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.5, 0x699488, 0.82); glass.strokeRoundedRect(-23, -33, 46, 60, 5);
  glass.lineStyle(1.2, 0xfffdf3, 0.9); glass.strokeEllipse(0, -32, 45, 6); glass.strokeEllipse(0, 26, 37, 4);

  const milkMl = a.milk || 0;
  const syrupMl = a.syrup || 0;
  const matchaGrams = a.matcha || 0;
  const waterMl = a.water || 0;
  const iceCubes = Math.min(4, Math.round(a.ice || 0));
  const whiskProg = Math.min(1, p?.steps?.whisk?.amount || 0);
  const microfoam = Math.min(1, p?.foam || 0);

  const syrupAmt = syrupMl / 290 * 48;
  const milkAmt = milkMl / 290 * 48;
  const iceAmt = (iceCubes * 26) / 290 * 48;
  const matchaVol = waterMl + matchaGrams * 2.5;
  const matchaAmt = matchaVol / 290 * 48;

  const matchaColor = whiskProg >= 0.92 ? 0x458b32 : whiskProg >= 0.62 ? 0x3b7a2a : 0x2f6321;
  const layers = [];
  if (syrupAmt > 0.1) layers.push({ amount: syrupAmt, color: 0xf7edd2, opacity: 0.92 });
  if (milkAmt > 0.1 || iceAmt > 0.1) {
    layers.push({ amount: milkAmt + iceAmt * 0.55, color: 0xfbf8ef, opacity: 0.96 });
  }
  if (matchaAmt > 0.1) {
    layers.push({ amount: matchaAmt + iceAmt * 0.25, color: matchaColor, opacity: 0.95 });
  }

  const filled = layers.length ? layerView.render(layers, t, 0.12, microfoam * 0.35) : 0;
  root.liquidLevel = filled;
  const bottom = 24;
  const topY = bottom - Math.max(6, filled);

  if (filled > 1 || iceCubes > 0) {
    // Green-white swirling interface where poured matcha meets the cold milk layer.
    if (milkMl > 10 && matchaVol > 4) {
      const interfaceY = Math.min(bottom - 6, Math.max(topY + 4, topY + Math.max(5, matchaAmt * 0.85)));
      liquid.fillStyle(0x7ab85c, 0.32);
      liquid.fillRoundedRect(-18, interfaceY - 3, 36, 7, 3);
      for (let i = 0; i < 4; i++) {
        const wy = interfaceY - 2 + i * 2.1;
        const wave = Math.sin(motion / 370 + i * 1.6) * 3.4;
        liquid.lineStyle(1.9 - i * 0.25, i % 2 === 0 ? 0xdff2c9 : 0x569c3c, 0.68);
        liquid.beginPath();
        liquid.moveTo(-15, wy);
        liquid.lineTo(wave, wy + 1.8);
        liquid.lineTo(15, wy - 0.9);
        liquid.strokePath();
      }
    }

    // Clear floating ice cubes sitting across the milk/matcha boundary.
    for (let i = 0; i < iceCubes; i++) {
      const bob = Math.sin(motion / 390 + i * 1.7) * 1.1;
      const ix = -11 + (i % 3) * 11 + (i >= 3 ? 2 : 0);
      const iy = Math.min(bottom - 7, Math.max(-22, topY + 6 + Math.floor(i / 3) * 8 + bob));
      liquid.fillStyle(0xe6f8f5, 0.64);
      liquid.fillRoundedRect(ix - 5, iy - 4.5, 10, 9, 2.3);
      liquid.lineStyle(1, 0xffffff, 0.84);
      liquid.strokeRoundedRect(ix - 5, iy - 4.5, 10, 9, 2.3);
      liquid.fillStyle(0xffffff, 0.5);
      liquid.fillRect(ix - 3.2, iy - 3, 3.8, 1.7);
    }

    // Fine emerald microfoam crest & tiny bubbles at the top when whisked matcha is poured.
    if (matchaVol > 4) {
      const foamAlpha = Math.min(0.88, 0.35 + whiskProg * 0.52);
      liquid.fillStyle(0x8fd16a, foamAlpha * 0.72);
      liquid.fillEllipse(0, topY + 1.4, 36, 4.2);
      liquid.lineStyle(1.2, 0xc8f0a8, foamAlpha);
      liquid.strokeEllipse(0, topY + 0.8, 35, 3.2);
      const bubbleCount = whiskProg >= 0.92 ? 9 : whiskProg >= 0.62 ? 5 : 2;
      for (let i = 0; i < bubbleCount; i++) {
        const bx = -13 + (i * 3.3) + Math.sin(motion / 320 + i) * 0.9;
        const by = topY + 1.2 + (i % 2) * 1.3;
        liquid.fillStyle(0xe5fad1, 0.78);
        liquid.fillCircle(bx, by, i % 2 ? 0.95 : 0.75);
      }
    }
  }

  glass.fillStyle(0xffffff, 0.27); glass.fillRoundedRect(-19, -25, 2.5, 42, 1);
  glass.fillStyle(0xffffff, 0.15); glass.fillRoundedRect(14, -20, 2, 28, 1);
  return root;
}

