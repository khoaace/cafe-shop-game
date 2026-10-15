import { EVENTS } from '../logic/dayPlan.js';
import { label, round } from '../rendering/art.js';
import { button } from './widgets.js';
import { clockText, COLORS as C, RULES, money } from '../config.js';
export class HUD {
  constructor(scene) {
    this.scene = scene;
    const before = new Set(scene.children.list);
    const g = scene.add.graphics(); this.background = g; g.fillStyle(C.dark); g.fillRect(0, 0, 480, 74);
    round(g, 17, 17, 30, 30, 0xb99454, 15); label(scene, 32, 32, 'đ', 20, '#fff0c4', { fontStyle: 'bold' });
    this.balance = label(scene, 57, 27, '', 19, '#fff2d7', { fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.day = label(scene, 20, 54, '', 10, '#b8c8ad').setOrigin(0, 0.5);
    this.clock = label(scene, 267, 29, '', 23, '#ffebc4', { fontFamily: 'Georgia, serif' });
    this.phase = label(scene, 267, 53, '', 9, '#bdcbaa', { letterSpacing: 1 });
    this.book = button(scene, 375, 34, 64, 42, 'Sổ món', () => scene.openBook(), { size: 12, fill: 0x3b5645 });
    this.pause = button(scene, 445, 34, 42, 42, 'Ⅱ', () => scene.openPause(), { size: 18, fill: 0x3b5645 });
    const strip = scene.add.graphics().setDepth(3); round(strip, 67, 83, 345, 79, C.cream, 8);
    this.event = label(scene, 240, 100, '', 14, '#395741', { fontStyle: 'bold' }).setDepth(4);
    this.challenge = label(scene, 240, 123, '', 10, '#76603f', { wordWrap: { width: 325 }, align: 'center' }).setDepth(4);
    // Daily ★ goals: always visible so every shift has a concrete target.
    this.goals = scene.session.starGoals.map((goal, i) => label(scene, 125 + i * 115, 149, '', 9.5, '#2b4c3c', { fontStyle: 'bold' }).setDepth(4));
    this.goalDone = this.goals.map(() => false);
    this.strip = strip;
    // Combo badge floats on the strip corner and pulses on every new streak step.
    this.comboBadge = scene.add.container(412, 90).setDepth(6).setVisible(false);
    const badgeBg = scene.add.graphics(); this.comboBg = badgeBg;
    this.comboText = label(scene, 0, 0, '', 11, '#3a2a12', { fontStyle: 'bold' });
    this.comboBadge.add([badgeBg, this.comboText]);
    this.tutorialLine = label(scene, 240, 149, '', 9, '#2b4c3c', { fontStyle: 'bold' }).setDepth(4);
    this.root = scene.add.container(0, 0).setDepth(40);
    this.root.add(scene.children.list.filter(o => o !== this.root && !before.has(o)));
    this.previous = ''; this.shownMoney = null; this.lastCombo = 0; this.lastSecond = -1;
  }
  get motion() { return !this.scene.game.save.data.settings.reducedMotion; }
  relayout() {
    const l = this.scene.layout, desktop = l.desktop, w = l.width;
    this.background.clear().fillStyle(C.dark).fillRect(0, 0, w, 74);
    round(this.background, 17, 17, 30, 30, 0xb99454, 15);
    this.strip.setVisible(!desktop);
    this.book.setPosition(desktop ? w - 150 : 375, 34).resize(desktop ? 100 : 64, 42);
    this.pause.setPosition(desktop ? w - 52 : 445, 34);
    this.clock.setPosition(desktop ? w - 292 : 267, 28);
    this.phase.setPosition(desktop ? w - 292 : 267, 53);
    this.event.setPosition(desktop ? w * 0.43 : 240, desktop ? 26 : 100);
    this.challenge.setPosition(desktop ? w * 0.43 : 240, desktop ? 50 : 123).setWordWrapWidth(desktop ? Math.min(370, w * 0.27) : 325);
    // Desktop: goals sit between the "BÀN PHA" title and the P1–P4 buttons.
    // Narrow desktops trade the decorative title for room to keep all three goals readable.
    this.compact = desktop && l.board.w < 720;
    if (this.compact && !this.scene.session.tutorial) this.scene.desktopUI?.boardTitle.setVisible(false);
    const goalStart = this.compact ? 20 : 140, goalStep = this.compact ? (l.board.w - 290 - goalStart) / 3 : desktop ? Math.min(150, (l.board.w - 430) / 3) : 115;
    this.goals.forEach((goal, i) => goal.setOrigin(desktop ? 0 : 0.5, 0.5).setPosition(desktop ? l.board.x + goalStart + i * goalStep : 125 + i * 115, desktop ? l.board.y + 23 : 149).setFontSize(this.compact ? 10.5 : desktop ? 12 : 9.5));
    this.comboBadge.setPosition(desktop ? l.customers.x + l.customers.w - 100 : 412, desktop ? l.customers.y + 24 : 90);
    this.tutorialLine.setPosition(240, 149).setVisible(!desktop && this.scene.session.tutorial);
    this.event.setColor(desktop ? '#e9e4c7' : '#395741'); this.challenge.setColor(desktop ? '#cabb96' : '#76603f');
    this.previous = '';
  }
  pop(target, from = 1.35, to = 1) {
    if (!this.motion) return;
    this.scene.tweens.killTweensOf(target); target.setScale(from);
    this.scene.tweens.add({ targets: target, scale: to, duration: 320, ease: 'Back.Out' });
  }
  drawCombo(combo) {
    const text = `${combo >= 10 ? '🔥 HUYỀN THOẠI' : combo >= 5 ? '🔥 SUPER' : 'COMBO'} ×${combo}`;
    this.comboText.setText(text);
    const w = this.comboText.width + 18, fill = combo >= 10 ? 0xe0704f : combo >= 5 ? 0xf0a640 : C.gold;
    this.comboBg.clear(); round(this.comboBg, -w / 2, -11, w, 25, 0x1d3029, 12, 0.25); round(this.comboBg, -w / 2, -13, w, 25, fill, 12);
    this.comboText.setColor(combo >= 10 ? '#fff4de' : '#3a2a12');
  }
  updateGoals(session) {
    const progress = session.stars.results;
    progress.forEach((goal, i) => {
      const view = this.goals[i];
      const text = goal.id === 'served' ? `${session.served}/${goal.target} khách`
        : goal.id === 'earnings' ? `${Math.floor(session.earnings / 1000)}k/${goal.target / 1000}k`
          : goal.failed ? (this.compact ? 'Có bỏ về' : 'Có khách bỏ về') : this.compact ? '0 bỏ về' : 'Không ai bỏ về';
      const done = goal.complete || (goal.id === 'noLoss' && !goal.failed && session.served > 0);
      view.setText(`${goal.failed ? '✗' : done ? '★' : '○'} ${text}`).setColor(goal.failed ? '#a2523d' : done ? (this.scene.layout?.desktop ? '#f2c66d' : '#a06b16') : this.scene.layout?.desktop ? '#c9d2b6' : '#2b4c3c');
      if (goal.complete && !this.goalDone[i]) {
        this.goalDone[i] = true; this.pop(view, 1.6);
        this.scene.appendToast(`★ ${goal.label}!`); this.scene.game.audio.play('perfect');
        const m = view.getWorldTransformMatrix(); this.scene.particles(m.tx, m.ty, C.gold, 10);
      }
    });
  }
  update() {
    const { session, game } = this.scene;
    // Count the balance up smoothly so every sale feels like money landing in the till.
    const target = (session.tutorial ? 0 : game.save.data.balance) + session.earnings;
    if (this.shownMoney === null) this.shownMoney = target;
    if (this.shownMoney !== target) {
      const gain = target > this.shownMoney;
      this.shownMoney = gain ? Math.min(target, this.shownMoney + Math.max(100, Math.ceil((target - this.shownMoney) * 0.12 / 100) * 100)) : target;
      this.balance.setText(money(this.shownMoney)).setColor(this.shownMoney === target ? '#fff2d7' : '#ffd77a');
      if (gain && this.shownMoney === target) this.pop(this.balance, 1.25);
    }
    const closing = !session.tutorial && session.elapsed >= RULES.lastArrival;
    const second = Math.floor(session.elapsed);
    if (closing && second !== this.lastSecond && this.motion) this.pop(this.clock, 1.12);
    this.lastSecond = second;
    if (session.combo !== this.lastCombo) {
      if (session.combo >= 3) { this.drawCombo(session.combo); this.comboBadge.setVisible(true); this.pop(this.comboBadge, 1.5); }
      else this.comboBadge.setVisible(false);
      this.lastCombo = session.combo;
    }
    const key = [second, session.earnings, session.combo, session.served, session.lost].join('/');
    if (key === this.previous) return; this.previous = key;
    if (this.shownMoney === target) this.balance.setText(money(target));
    this.day.setText(session.tutorial ? `LÀM QUEN QUÁN  ·  ${session.served}/3 LY` : `NGÀY ${session.day}  ·  ${game.save.reputation.toFixed(1)} ★  ·  ${session.served} KHÁCH`);
    this.clock.setText(session.tutorial ? 'Thong thả' : clockText(session.elapsed)).setFontSize(session.tutorial ? 17 : 23).setColor(closing ? '#ff9f7a' : '#ffebc4');
    this.phase.setText(session.tutorial ? 'KHÔNG GIỚI HẠN GIỜ' : session.rush ? 'GIỜ CAO ĐIỂM' : closing ? `SẮP ĐÓNG CỬA · ${Math.max(0, Math.ceil(RULES.daySeconds - session.elapsed))}s` : 'BUỔI SÁNG AN LÀNH').setColor(closing ? '#ffb796' : session.rush ? '#f2c66d' : '#bdcbaa');
    const ch = session.challenge;
    this.event.setText(session.powerOut ? 'MẤT ĐIỆN · QUẠT TẠM NGHỈ' : EVENTS[session.event]?.name || 'Một sáng ở góc phố');
    this.challenge.setText(session.tutorial ? 'Luyện tay pha phin · không tính vào tiến trình' : `${ch.complete ? '✓ ' : ''}${session.plan.challenge.label}: ${Math.min(ch.value, ch.target)}/${ch.target} · +${money(session.plan.challenge.reward)}`);
    this.tutorialLine.setText('MỘT LY CÀ PHÊ · MỘT CHÚT NIỀM VUI');
    if (!session.tutorial) this.updateGoals(session);
  }
}
