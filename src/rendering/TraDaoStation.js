import { itemSurface } from './ItemSurface.js';
import {
  TraDaoPrep,
  TRADAO_TEA_TARGET,
  TRADAO_ORANGE_JUICE_TARGET,
  traDaoTargets,
} from '../models/TraDaoPrep.js';
import { usablePortions as inventoryUsablePortions } from '../logic/inventory.js';
import { ICE_GRAMS_PER_CUBE } from '../models/KumquatPrep.js';
import { button } from '../ui/widgets.js';
import { toolArt, label, round, line } from './art.js';

const PANEL = { x: 6, y: 674, w: 196, h: 120 };
const BOARD = { x: 46, y: 726 };
const SQUEEZER = { x: 112, y: 724 };
const CUP_HOME = { x: 168, y: 728 };
const TONE = {
  done: [0x3f6a45, '#d6f0bb'],
  active: [0x7a5a2c, '#ffe2a6'],
  warn: [0x6e3f31, '#ffc3a8'],
  idle: [0x2b4438, '#a9bba0'],
};

export class TraDaoStation {
  constructor(scene) {
    this.scene = scene;
    this.state = new TraDaoPrep();
    this.removers = [];
    this.tiles = [];
    this.cache = new Map();
    this.droplets = [];
    this.aromaWisps = [];
    this.fallingPeaches = [];
    this.lastTime = null;
    const engine = scene.drinkEngine;

    this.root = scene.add.container(0, 0).setDepth(45).setVisible(false);
    this.panel = scene.add.graphics();
    this.boardArt = itemSurface(scene);
    this.squeezerArt = itemSurface(scene);
    this.fxArt = itemSurface(scene);
    this.root.add([this.panel, this.boardArt, this.squeezerArt, this.fxArt]);

    this.chip = label(scene, 104, 683, '', 8.5, '#fff4de', { fontStyle: 'bold' });
    this.subLabel = label(scene, 78, 781, '', 8, '#d6e5c9');
    this.root.add([this.chip, this.subLabel]);

    // Interactive handles on the cutting/prep board, squeezer, and orange juice cup.
    this.orangeBoardHandle = scene.add.container(BOARD.x - 10, BOARD.y - 8);
    this.orangeBoardArt = itemSurface(scene);
    this.orangeBoardHandle.add(this.orangeBoardArt);

    this.lemongrassBoardHandle = scene.add.container(BOARD.x + 2, BOARD.y + 12);
    this.lemongrassBoardArt = itemSurface(scene);
    this.lemongrassBoardHandle.add(this.lemongrassBoardArt);

    this.squeezerHandle = scene.add.container(SQUEEZER.x, SQUEEZER.y);
    this.squeezerHandleArt = itemSurface(scene);
    this.squeezerHandle.add(this.squeezerHandleArt);

    this.measuringCup = scene.add.container(CUP_HOME.x, CUP_HOME.y);
    this.cupArt = itemSurface(scene);
    this.measuringCup.add(this.cupArt);

    this.root.add([this.orangeBoardHandle, this.lemongrassBoardHandle, this.squeezerHandle, this.measuringCup]);

    const boardOnly = t => t.id === 'tradao-board';
    const squeezerOnly = t => t.id === 'tradao-squeezer';
    const cupOnly = t => t.recipeId?.() === 'tradao';
    const stock = id => scene.tutorial ? Infinity : scene.session.inventory[id] || 0;

    this.removers.push(engine.registerTarget('tradao-board', {
      accepts: ['place', 'slice', 'roll'],
      radius: 40,
      visible: () => this.root.visible && this.root.active,
      contains: (x, y) => Math.abs(x - BOARD.x) <= 42 && Math.abs(y - BOARD.y) <= 42,
      center: () => ({ x: BOARD.x, y: BOARD.y, radius: 28 }),
      getState: () => this.state,
      takeIngredient: (id, amount) => {
        if (id === 'orange') return scene.session.stageOrange(this.state);
        if (id === 'lemongrass') return scene.session.stageLemongrass(this.state);
        return 0;
      },
      onChange: (action, amount) => {
        if (action === 'place' && amount > 0) {
          scene.game.audio.play('place');
          if (this.state.orangeOnBoard && !this.state.orangeSliced) {
            scene.toast('Đã đặt cam tươi lên thớt. Vuốt qua quả cam để bổ đôi.');
          } else if (this.state.lemongrassOnBoard && !this.state.lemongrassPrepared) {
            scene.toast('Đã đặt nhánh sả lên thớt. Nhấn và lăn trên nhánh sả để đập dập.');
          }
        }
        if (action === 'slice' && amount > 0) {
          scene.session.cutOrange(this.state);
          scene.game.audio.play('grounds');
          this.spawnDroplets(BOARD.x - 8, BOARD.y - 8, 6);
          scene.toast('Đã bổ cam (-1 quả): tạo 1 phần vắt nước & 1 lát cam trang trí!');
        }
        if (action === 'roll' && amount > 0) {
          scene.session.prepareLemongrass(this.state, 0);
          scene.game.audio.play('press');
          this.spawnAroma(BOARD.x + 4, BOARD.y + 8, 3);
          if (this.state.lemongrassPrepared) {
            scene.toast('Nhánh sả đã dậy mùi thơm (-1 nhánh)! Kéo nhánh sả thả vào ly.');
          }
        }
      },
      render: (_, time) => this.render(time),
    }));

    this.removers.push(engine.registerTarget('tradao-squeezer', {
      accepts: ['squeeze'],
      radius: 38,
      visible: () => this.root.visible && this.root.active,
      contains: (x, y) => Math.abs(x - SQUEEZER.x) <= 38 && Math.abs(y - SQUEEZER.y) <= 40,
      center: () => ({ x: SQUEEZER.x, y: SQUEEZER.y, radius: 26 }),
      getState: () => this.state,
      onChange: (action, amount) => {
        if (action === 'squeeze' && amount > 0) {
          scene.game.audio.play('drop');
          this.spawnDroplets(SQUEEZER.x, SQUEEZER.y + 5, 4);
          if (this.state.extractedJuice >= TRADAO_ORANGE_JUICE_TARGET - 0.1 && !this.state.perfectAnnounced) {
            this.state.perfectAnnounced = true;
            scene.drinkEngine.effects.perfect(CUP_HOME.x, CUP_HOME.y - 10);
            scene.game.audio.play('creamPerfect', 0.024);
            scene.toast('ĐÃ VẮT ĐỦ 30 ML NƯỚC CAM! Kéo ca nước cam rót vào ly.');
          }
        }
      },
    }));

    // Swipe gesture on the cutting board slices the staged whole orange.
    this.removers.push(engine.registerTool('tradao-orange-slice', this.orangeBoardHandle, {
      action: 'slice',
      hitSize: 56,
      canTarget: boardOnly,
      enabled: () => this.state.orangeOnBoard && !this.state.orangeSliced,
      hint: () => 'Vuốt ngang qua quả cam trên thớt để cắt đôi',
      release: () => { this.orangeBoardHandle.setPosition(BOARD.x - 10, BOARD.y - 8).setRotation(0); },
    }));

    // Dragging the prepared orange garnish slice from the board onto the glass.
    this.removers.push(engine.registerTool('tradao-orange-garnish', this.orangeBoardHandle, {
      action: 'garnish',
      stepId: 'orange-garnish',
      hitSize: 54,
      canTarget: cupOnly,
      enabled: () => this.state.orangeSliced && this.state.garnishSlices > 0,
      hint: () => 'Kéo lát cam tươi đã cắt lên miệng ly để trang trí (không tốn thêm cam)',
      release: ({ target, canceled, matched }) => {
        this.orangeBoardHandle.setPosition(BOARD.x - 10, BOARD.y - 8).setRotation(0);
        if (canceled || !matched || target?.recipeId?.() !== 'tradao') return;
        const station = scene.stations.find(s => s.model.id === target.id);
        const drink = station?.model.drink;
        if (drink && scene.session.placeOrangeGarnishIntoGlass(drink, this.state) > 0) {
          scene.game.audio.play('place');
          scene.toast('Đã gắn lát cam tươi trang trí lên miệng ly!');
        }
      },
    }));

    // Short press-and-roll gesture on the lemongrass stalk on the board.
    this.removers.push(engine.registerTool('tradao-lemongrass-roll', this.lemongrassBoardHandle, {
      action: 'roll',
      hitSize: 56,
      canTarget: boardOnly,
      enabled: () => this.state.lemongrassOnBoard && !this.state.lemongrassPrepared,
      hint: () => `Đập & lăn nhánh sả (${Math.round(this.state.lemongrassProgress * 100)}%) cho dậy hương thơm`,
      release: () => { this.lemongrassBoardHandle.setPosition(BOARD.x + 2, BOARD.y + 12).setRotation(0); },
    }));

    // Dragging the prepared lemongrass stalk from the board into the glass.
    this.removers.push(engine.registerTool('tradao-lemongrass-move', this.lemongrassBoardHandle, {
      action: 'garnish',
      stepId: 'lemongrass',
      hitSize: 56,
      canTarget: cupOnly,
      enabled: () => this.state.lemongrassPrepared && this.state.lemongrassAvailable > 0,
      hint: () => 'Kéo nhánh sả đã đập dập thả vào ly',
      release: ({ target, canceled, matched }) => {
        this.lemongrassBoardHandle.setPosition(BOARD.x + 2, BOARD.y + 12).setRotation(0);
        if (canceled || !matched || target?.recipeId?.() !== 'tradao') return;
        const station = scene.stations.find(s => s.model.id === target.id);
        const drink = station?.model.drink;
        if (drink && scene.session.placeLemongrassIntoGlass(drink, this.state) > 0) {
          scene.game.audio.play('place');
          this.spawnAroma(station.x, station.y - 24, 4);
          scene.toast('Đã đặt nhánh sả thơm vào ly!');
        }
      },
    }));

    // Pressing and dragging on the squeezer extracts orange juice into the cup without deducting another orange.
    this.removers.push(engine.registerTool('tradao-squeezer-press', this.squeezerHandle, {
      action: 'squeeze',
      hitSize: 60,
      canTarget: squeezerOnly,
      enabled: () => this.state.orangeSliced && this.state.squeezePortions > 0 && this.state.extractedJuice < TRADAO_ORANGE_JUICE_TARGET - 0.01,
      hint: () => `Nước cam ${this.state.extractedJuice.toFixed(0)}/${TRADAO_ORANGE_JUICE_TARGET} ml · nhấn và kéo để vắt cam (không tốn thêm quả)`,
      release: () => { this.squeezerHandle.setPosition(SQUEEZER.x, SQUEEZER.y).setRotation(0); },
    }));

    // Pouring extracted orange juice from the measuring cup into the glass.
    this.removers.push(engine.registerTool('tradao-orange-juice-cup', this.measuringCup, {
      action: 'pour',
      ingredient: 'orangeJuice',
      stepId: 'orangeJuice',
      rate: 32,
      hitSize: 54,
      sourceTarget: 'tradao-squeezer',
      spout: { x: -14, y: -16 },
      pourOffset: { x: 20, y: -62 },
      canTarget: cupOnly,
      enabled: () => (this.state.amounts.orangeJuice || 0) > 0.1 || (this.state.orangeSliced && this.state.squeezePortions > 0),
      blocked: () => !(this.state.amounts.orangeJuice > 0.1) ? 'Nhấn và kéo ở khu vắt để ép nước cam vào ca đong trước.' : null,
      sourceState: () => (this.state.amounts.orangeJuice || 0) > 0.1 ? this.state : null,
      emptyHint: 'Chưa có nước cam trong ca đong.',
      hint: state => `Nước cam ${(state.amounts.orangeJuice || 0).toFixed(0)}/${TRADAO_ORANGE_JUICE_TARGET} ml · nghiêng ca đong rót vào ly`,
      onPour: () => scene.game.audio.play('pour'),
      release: () => {
        if ((this.state.amounts.orangeJuice || 0) <= 0.1 && this.state.extractedJuice >= 10) {
          scene.toast('Đã rót nước cam tươi vàng óng vào ly!');
        }
      },
    }));

    const addTool = (key, id, kind, x, name, options) => {
      const art = toolArt(scene, kind, x, 715).setScale(0.62);
      const tile = {
        key, x, art,
        name: label(scene, x, 752, name, 8.5, '#e9e4c7', { fontStyle: 'bold' }),
        badge: label(scene, x, 777, '', 7.5, '#fff4de', { fontStyle: 'bold' }),
        stock: label(scene, x + 18, 684, '', 7.5, '#fff4d5', { fontStyle: 'bold' }).setOrigin(1, 0.5),
      };
      this.tiles.push(tile);
      this.root.add([tile.name, tile.badge, tile.stock, art]);
      this.removers.push(engine.registerTool(id, art, { hitSize: 42, ...options }));
      return art;
    };

    addTool('orange', 'tradao-orange-fruit', 'orange', 226, 'Cam tươi', {
      action: 'place',
      ingredient: 'orange',
      quantity: 1,
      canTarget: boardOnly,
      blocked: () => (this.state.orangeOnBoard || this.state.orangeSliced)
        ? 'Trên thớt đang có cam đã chuẩn bị.'
        : stock('orange') < 1 ? 'Thiếu nguyên liệu: Hết cam tươi! Hãy mua thêm ở cửa hàng.' : null,
      hint: () => 'Thả 1 quả cam tươi lên thớt để bổ đôi',
    });

    addTool('lemongrass', 'tradao-lemongrass-stalk', 'lemongrass', 271, 'Sả tươi', {
      action: 'place',
      ingredient: 'lemongrass',
      quantity: 1,
      canTarget: boardOnly,
      blocked: () => (this.state.lemongrassOnBoard || this.state.lemongrassPrepared)
        ? 'Trên thớt đang có nhánh sả.'
        : stock('lemongrass') < 1 ? 'Thiếu nguyên liệu: Hết sả tươi! Hãy mua thêm ở cửa hàng.' : null,
      hint: () => 'Thả 1 nhánh sả tươi lên thớt để đập dập',
    });

    addTool('peach', 'tradao-peach-tongs', 'peach', 316, 'Gắp đào', {
      action: 'garnish',
      stepId: 'peach',
      canTarget: cupOnly,
      blocked: () => stock('peach') + 1e-9 < 0.25 ? 'Thiếu nguyên liệu: Hết đào ngâm! Hãy mua thêm ở cửa hàng.' : null,
      onPickup: () => {
        if (!scene.session.pickPeachWithTongs(1)) {
          scene.toast('Thiếu nguyên liệu: Hết đào ngâm!');
          return false;
        }
        return true;
      },
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const count = Math.round(state.amounts.peach || 0);
        return `Đào ${count}/${targets.peach} miếng (${targets.peachLabel}) · thả kẹp đào vào ly (+1 miếng)`;
      },
      release: ({ target, canceled, matched }) => {
        if (canceled || !matched || target?.recipeId?.() !== 'tradao') {
          scene.session.cancelPeachDrag();
          return;
        }
        const station = scene.stations.find(s => s.model.id === target.id);
        const drink = station?.model.drink;
        if (!drink) {
          scene.session.cancelPeachDrag();
          return;
        }
        const accepted = scene.session.pickPeachSliceIntoGlass(drink, 1);
        if (accepted > 0) {
          scene.game.audio.play('ice');
          this.spawnFallingPeach(station.x, station.y - 34, station.y + 8);
          scene.drinkEngine.effects.splash(station.x, station.y + 2, 0xf59d2a);
        } else {
          scene.session.cancelPeachDrag();
        }
      },
    });

    addTool('tea', 'tradao-tea-pitcher', 'tea', 361, 'Bình trà', {
      action: 'pour',
      ingredient: 'tea',
      stepId: 'tea',
      rate: 55,
      spout: { x: -20, y: -18 },
      pourOffset: { x: 22, y: -64 },
      canTarget: cupOnly,
      blocked: () => stock('tea') < 1 ? 'Thiếu nguyên liệu: Hết trà ủ sẵn! Hãy mua thêm ở cửa hàng.' : null,
      hint: state => `Trà ${(state.amounts.tea || 0).toFixed(0)}/${TRADAO_TEA_TARGET} ml · nghiêng bình rót trà vàng hổ phách`,
      onPour: () => scene.game.audio.play('pour'),
    });

    addTool('peachSyrup', 'tradao-syrup-bottle', 'peachSyrup', 406, 'Siro đào', {
      action: 'pour',
      ingredient: 'peachSyrup',
      stepId: 'peachSyrup',
      rate: 9,
      spout: { x: -6, y: -28 },
      pourOffset: { x: 16, y: -62 },
      canTarget: cupOnly,
      blocked: () => stock('peachSyrup') < 0.5 ? 'Thiếu nguyên liệu: Hết siro đào! Hãy mua thêm ở cửa hàng.' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const ml = state.amounts.peachSyrup || 0;
        return `Siro đào ${ml.toFixed(0)}/${targets.peachSyrup} ml · nghiêng chai rót siro đào thơm dịu`;
      },
      onPour: () => scene.game.audio.play('condensed'),
    });

    addTool('ice', 'tradao-ice-scoop', 'scoop', 451, 'Xúc đá', {
      action: 'iceScoopCup',
      stepId: 'ice',
      canTarget: cupOnly,
      blocked: () => stock('ice') * 3 < 1 ? 'Thiếu nguyên liệu: Hết đá viên! Hãy mua thêm ở cửa hàng.' : null,
      hint: (state, target) => {
        const targets = this.activeTargets(target);
        const grams = Math.round((state.amounts.ice || 0) * ICE_GRAMS_PER_CUBE);
        return `Đá ${grams}/${targets.iceGrams} g · thả muỗng đá vào ly (+30 g/lần)`;
      },
      release: ({ target, canceled, matched }) => {
        if (canceled || !matched || target?.recipeId?.() !== 'tradao') return;
        const station = scene.stations.find(s => s.model.id === target.id);
        const drink = station?.model.drink;
        if (!drink) return;
        const accepted = scene.session.scoopIceIntoGlass(drink, 1);
        if (accepted > 0) {
          scene.dropIce(station);
          scene.game.audio.play('ice');
          engine.effects.ice(station.x, station.y - 6, 0);
        }
      },
    });

    this.reset = button(scene, 166, 782, 62, 18, 'Dọn thớt', () => this.discard(), { size: 8, fill: 0x4c6a5a, color: '#f6efd9', radius: 5 });
    this.root.add(this.reset);
  }

  activeDrink() {
    const d = this.scene.stations[this.scene.selectedStation]?.model.drink;
    return d?.recipeId === 'tradao' && !d.consumed ? d : null;
  }

  activeTargets(target = null) {
    const station = target ? this.scene.stations.find(s => s.model.id === target.id) : this.scene.stations[this.scene.selectedStation];
    const waitingCustomer = this.scene.session?.customers.find(c => !c.resolved && c.recipeId === 'tradao');
    const mod = station?.model.modifiers || station?.model.drink?.modifiers || waitingCustomer?.modifiers || null;
    return traDaoTargets(mod);
  }

  spawnDroplets(x, y, count = 5) {
    if (this.scene.game.save?.data.settings.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      this.droplets.push({
        x: x + (i - (count - 1) / 2) * 5,
        y,
        vx: (i - (count - 1) / 2) * 14,
        vy: -22 - (i % 3) * 10,
        alpha: 1,
      });
    }
  }

  spawnAroma(x, y, count = 3) {
    if (this.scene.game.save?.data.settings.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      this.aromaWisps.push({
        x: x + (i - 1) * 7,
        y,
        vy: -18 - i * 4,
        phase: i * 1.4,
        alpha: 0.9,
      });
    }
  }

  spawnFallingPeach(x, startY, targetY) {
    if (this.scene.game.save?.data.settings.reducedMotion) return;
    this.fallingPeaches.push({
      x,
      y: startY,
      targetY,
      vy: 65,
      angle: -0.35,
      vAngle: 1.6,
      alpha: 1,
      settled: false,
    });
  }

  discard() {
    const scene = this.scene;
    scene.drag.cancel();
    scene.session.cancelPeachDrag();
    if (!this.state.empty) {
      scene.session.discardTraDaoPrep(this.state);
      scene.toast('Đã dọn thớt; cam và sả đã sơ chế không hoàn lại kho.');
      scene.game.audio.play('trash');
    } else {
      this.state.clear();
    }
    this.measuringCup.setPosition(CUP_HOME.x, CUP_HOME.y).setRotation(0);
  }

  setVisible(visible) {
    this.root.setVisible(visible);
    this.orangeBoardHandle.setVisible(visible);
    this.lemongrassBoardHandle.setVisible(visible);
    this.squeezerHandle.setVisible(visible);
    this.measuringCup.setVisible(visible);
    this.reset.input.enabled = visible;
    for (const tile of this.tiles) {
      tile.art.setVisible(visible);
      tile.name.setVisible(visible);
      tile.badge.setVisible(visible);
      tile.stock.setVisible(visible);
    }
  }

  text(object, text, color) {
    const key = `${text}|${color}`;
    if (this.cache.get(object) === key) return;
    this.cache.set(object, key);
    object.setText(text).setColor(color);
  }

  render(time) {
    if (!this.root.visible) return;
    const dt = this.lastTime === null ? 0 : Math.max(0, Math.min(0.1, (time - this.lastTime) / 1000));
    this.lastTime = time;
    const s = this.state;
    const reduced = this.scene.game.save.data.settings.reducedMotion;
    const pulse = reduced ? 1 : 0.65 + 0.35 * Math.sin(time / 180);

    if (s.sliceBounce > 0) s.sliceBounce = Math.max(0, s.sliceBounce - dt * 3.0);
    if (s.orangeSliced && s.sliceRotation < 0.6) s.sliceRotation = Math.min(0.6, s.sliceRotation + dt * 0.9);
    if (s.orangeCompression > 0 && !this.scene.drinkEngine.owners.has('tradao-squeezer')) {
      s.orangeCompression = Math.max(0.1, s.orangeCompression - dt * 2.2);
    }

    for (const drop of this.droplets) {
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.vy += 120 * dt;
      drop.alpha = Math.max(0, drop.alpha - dt * 2.2);
    }
    this.droplets = this.droplets.filter(d => d.alpha > 0.05);

    for (const wisp of this.aromaWisps) {
      wisp.y += wisp.vy * dt;
      wisp.phase += dt * 4;
      wisp.alpha = Math.max(0, wisp.alpha - dt * 1.1);
    }
    this.aromaWisps = this.aromaWisps.filter(w => w.alpha > 0.05);

    for (const p of this.fallingPeaches) {
      if (p.y < p.targetY) {
        p.y = Math.min(p.targetY, p.y + p.vy * dt);
        p.vy += 150 * dt;
        p.angle += p.vAngle * dt;
      } else {
        p.alpha = Math.max(0, p.alpha - dt * 2.8);
      }
    }
    this.fallingPeaches = this.fallingPeaches.filter(p => p.alpha > 0.05);

    const d = this.activeDrink();
    const a = d?.preparation.amounts || {};
    const targets = this.activeTargets();
    const teaMl = a.tea || 0;
    const syrupMl = a.peachSyrup || 0;
    const juiceInCup = a.orangeJuice || 0;
    const peachSlices = Math.round(a.peach || 0);
    const lemongrassInCup = Math.round(a.lemongrass || 0);
    const garnishInCup = Math.round(a.orange || 0);
    const iceCubes = a.ice || 0;
    const iceGrams = Math.round(iceCubes * ICE_GRAMS_PER_CUBE);

    const next = !s.orangeOnBoard && !s.orangeSliced && juiceInCup < TRADAO_ORANGE_JUICE_TARGET - 2 ? 'orange'
      : s.orangeOnBoard && !s.orangeSliced ? 'sliceOrange'
      : s.orangeSliced && s.squeezePortions > 0 && s.extractedJuice < TRADAO_ORANGE_JUICE_TARGET - 1 ? 'squeezeOrange'
      : !s.lemongrassOnBoard && !s.lemongrassPrepared && lemongrassInCup < 1 ? 'lemongrass'
      : s.lemongrassOnBoard && !s.lemongrassPrepared ? 'rollLemongrass'
      : s.lemongrassPrepared && lemongrassInCup < 1 ? 'moveLemongrass'
      : peachSlices < targets.peach ? 'peach'
      : teaMl < targets.tea - 10 ? 'tea'
      : syrupMl < targets.syrupRange[0] ? 'peachSyrup'
      : (s.amounts.orangeJuice || 0) > 0.5 && juiceInCup < TRADAO_ORANGE_JUICE_TARGET - 2 ? 'pourJuice'
      : iceCubes < targets.ice ? 'ice'
      : garnishInCup < 1 && s.garnishSlices > 0 ? 'garnishOrange'
      : null;

    const p = this.panel; p.clear();
    round(p, PANEL.x, PANEL.y + 3, PANEL.w, PANEL.h, 0x122f29, 12, 0.3);
    round(p, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x365448, 12);
    p.lineStyle(1, 0x99b299, 0.35);
    p.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);

    const stepText = {
      orange: '1 · Kéo 1 quả cam lên thớt',
      sliceOrange: '2 · Vuốt qua cam để bổ đôi',
      squeezeOrange: `3 · Vắt cam (${s.extractedJuice.toFixed(0)}/30 ml)`,
      lemongrass: '4 · Kéo 1 nhánh sả lên thớt',
      rollLemongrass: '5 · Nhấn & lăn đập dập sả',
      moveLemongrass: '6 · Kéo sả đã đập vào ly',
      peach: `7 · Gắp ${targets.peach} miếng đào (${targets.peachLabel})`,
      tea: `8 · Rót ${targets.tea} ml trà`,
      peachSyrup: `9 · Rót ${targets.peachSyrup} ml siro đào`,
      pourJuice: '10 · Rót ca nước cam vào ly',
      ice: `11 · Xúc ${targets.iceGrams} g đá`,
      garnishOrange: '12 · Kéo lát cam trang trí lên ly',
    }[next] || (d ? '✓ Trà đào cam sả sẵn sàng' : 'Đặt ly lên trạm để pha Trà đào');

    const chipTone = !next && d ? 'done' : 'active';
    const chipWidth = Math.min(188, stepText.length * 4.6 + 14);
    round(p, 104 - chipWidth / 2, 676, chipWidth, 15, TONE[chipTone][0], 7, chipTone === 'active' ? pulse : 1);
    this.text(this.chip, stepText, TONE[chipTone][1]);
    this.text(
      this.subLabel,
      s.garnishSlices > 0 ? 'Lát cam: sẵn trên thớt' : garnishInCup > 0 ? 'Đã gắn lát cam' : 'Thớt cam & sả',
      '#c8dcc0'
    );

    this.drawBoard(time, pulse, next);
    this.drawSqueezerAndCup(time, pulse, next);
    this.drawEffects();

    const stockText = id => {
      if (this.scene.tutorial) return '';
      if (id === 'peach') return `${inventoryUsablePortions(this.scene.session.inventory, 'peach')}m`;
      const n = this.scene.session.inventory[id] || 0;
      return id === 'tea' || id === 'peachSyrup' ? `${Math.round(n)}ml` : `×${Number.isInteger(n) ? n : n.toFixed(1)}`;
    };

    const badges = {
      orange: [
        juiceInCup >= 25 && garnishInCup >= 1 ? '✓ 1 quả' : s.orangeSliced ? 'Đã cắt' : '1 quả',
        (juiceInCup >= 25 && garnishInCup >= 1) || s.orangeSliced ? 'done' : next === 'orange' ? 'active' : 'idle',
        'orange',
        1,
      ],
      lemongrass: [
        lemongrassInCup >= 1 ? '✓ 1 nhánh' : s.lemongrassPrepared ? 'Đã đập' : '1 nhánh',
        lemongrassInCup >= 1 || s.lemongrassPrepared ? 'done' : next === 'lemongrass' ? 'active' : 'idle',
        'lemongrass',
        1,
      ],
      peach: [
        `${peachSlices}/${targets.peach} miếng`,
        peachSlices > targets.peach ? 'warn' : peachSlices === targets.peach ? 'done' : next === 'peach' ? 'active' : 'idle',
        'peach',
        0.25,
      ],
      tea: [
        `${teaMl.toFixed(0)}/${targets.tea}`,
        teaMl > targets.tea + 20 ? 'warn' : Math.abs(teaMl - targets.tea) <= 15 ? 'done' : next === 'tea' ? 'active' : 'idle',
        'tea',
        10,
      ],
      peachSyrup: [
        `${syrupMl.toFixed(0)}/${targets.peachSyrup}ml`,
        syrupMl > targets.syrupRange[1] + 3 ? 'warn' : syrupMl >= targets.syrupRange[0] && syrupMl <= targets.syrupRange[1] ? 'done' : next === 'peachSyrup' ? 'active' : 'idle',
        'peachSyrup',
        1,
      ],
      ice: [
        `${iceGrams}/${targets.iceGrams}g`,
        iceCubes > targets.ice ? 'warn' : iceCubes === targets.ice ? 'done' : next === 'ice' ? 'active' : 'idle',
        'ice',
        0.34,
      ],
    };

    for (const tile of this.tiles) {
      const [text, tone, stockId, minStock] = badges[tile.key];
      const active = next === tile.key;
      const x = tile.x - 20;
      const empty = stockId && !this.scene.tutorial && (this.scene.session.inventory[stockId] || 0) + 1e-9 < minStock;
      round(p, x, 676, 40, 116, active ? 0x52704f : 0x46604c, 8);
      if (active) {
        p.lineStyle(2, 0xe8b46b, pulse);
        p.strokeRoundedRect(x, 676, 40, 116, 8);
      }
      const [fill, color] = TONE[empty ? 'warn' : tone];
      round(p, tile.x - 18, 769, 36, 16, fill, 7);
      this.text(tile.badge, empty ? 'Hết' : text, color);
      tile.art.setAlpha(empty ? 0.35 : 1);
      if (stockId) this.text(tile.stock, stockText(stockId), empty ? '#ffc3a8' : '#fff4d5');
    }
  }

  drawBoard(time, pulse, next) {
    const g = this.boardArt, s = this.state; g.clear();
    g.item('board', BOARD.x, BOARD.y - 1, 68, 54);
    if (['orange', 'sliceOrange', 'lemongrass', 'rollLemongrass', 'moveLemongrass', 'garnishOrange'].includes(next)) {
      g.lineStyle(2, 0xe8b46b, pulse);
      g.strokeRoundedRect(BOARD.x - 34, BOARD.y - 28, 68, 54, 8);
    }

    const og = this.orangeBoardArt; og.clear();
    const bounce = Math.sin((s.sliceBounce || 0) * Math.PI) * 3.5;
    if (s.orangeOnBoard && !s.orangeSliced) {
      og.item('orange', 0, -bounce, 24, 26);
      og.lineStyle(1.4, 0xfff4de, pulse);
      og.beginPath(); og.moveTo(-14, -6); og.lineTo(14, 6); og.strokePath();
    } else if (s.orangeSliced && s.garnishSlices > 0) {
      this.drawOrangeWheel(og, 0, -bounce, 10, s.sliceRotation || 0);
    }

    const lg = this.lemongrassBoardArt; lg.clear();
    if (s.lemongrassOnBoard || s.lemongrassPrepared) {
      const bend = (s.stalkBend || 0) * 4;
      lg.item(s.lemongrassPrepared ? 'lemongrass-prepared' : 'lemongrass', 0, bend * 0.2, s.lemongrassPrepared ? 43 : 7, s.lemongrassPrepared ? 9 : 43, 'stalk', { rotation: s.lemongrassPrepared ? 0 : Math.PI / 2 - 0.1 + (s.stalkBend || 0) * 0.14 });

    }
  }

  drawOrangeWheel(g, x, y, r, angle = 0, scaleX = 1, scaleY = 1) {
    g.item('orange-wheel', x, y, r * 2 * scaleX, r * 2 * scaleY, undefined, { rotation: angle });
  }

  drawSqueezerAndCup(time, pulse, next) {
    const g = this.squeezerArt, s = this.state; g.clear();
    g.item('squeezer', SQUEEZER.x, SQUEEZER.y, 50, 44);
    line(g, [[SQUEEZER.x + 16, SQUEEZER.y + 4], [CUP_HOME.x - 14, CUP_HOME.y - 5]], 0xf59d2a, s.extractedJuice > 0 ? 2 : 1, s.extractedJuice > 0 ? 0.8 : 0.25);

    if (next === 'squeezeOrange') {
      g.lineStyle(2, 0xe8b46b, pulse);
      g.strokeRoundedRect(SQUEEZER.x - 24, SQUEEZER.y - 23, 48, 44, 9);
    }

    const sg = this.squeezerHandleArt; sg.clear();
    if (s.orangeSliced && s.squeezePortions > 0) {
      const comp = s.orangeCompression || 0;
      const sx = 1 + comp * 0.22, sy = 1 - comp * 0.28;
      this.drawOrangeWheel(sg, 0, 0, 11, s.sliceRotation, sx, sy);
      if (comp > 0.2) {
        sg.fillStyle(0xf59d2a, 0.78);
        sg.fillEllipse(0, 9, 20 * sx, 5.5);
      }
    }

    const cg = this.cupArt; cg.clear();
    const juice = s.amounts.orangeJuice || 0;
    const fillH = Math.min(26, (juice / TRADAO_ORANGE_JUICE_TARGET) * 24);
    cg.fillStyle(0x122f29, 0.25); cg.fillEllipse(0, 21, 34, 8);
    if (fillH > 0.5) {
      round(cg, -12, 17 - fillH, 24, fillH, 0xf28b29, 4, 0.93);
      cg.fillStyle(0xffbf66, 0.9); cg.fillEllipse(0, 17 - fillH, 23, 4);
    }
    cg.item('measuring-cup', 3, 2, 36, 36, 'cup', { front: true });
    if (next === 'pourJuice') { cg.lineStyle(1.5, 0xe8b46b, pulse); cg.strokeRoundedRect(-15, -16, 36, 37, 6); }
  }

  drawEffects() {
    const g = this.fxArt; g.clear();
    for (const drop of this.droplets) {
      g.fillStyle(0xf59d2a, drop.alpha);
      g.fillCircle(drop.x, drop.y, 2.2);
    }
    for (const wisp of this.aromaWisps) {
      const dx = Math.sin(wisp.phase) * 3;
      line(g, [[wisp.x + dx, wisp.y], [wisp.x - dx, wisp.y - 8]], 0xcfe89b, 1.6, wisp.alpha);
    }
    for (const p of this.fallingPeaches) {
      g.item('peach-piece', p.x, p.y, 16, 10, undefined, { rotation: p.angle, alpha: p.alpha });

    }
  }

  destroy() {
    for (const remove of this.removers) remove();
    this.root.destroy();
  }
}
