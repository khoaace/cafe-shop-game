import { EVENTS } from '../logic/dayPlan.js';
import { label, round } from '../rendering/art.js';
import { button } from './widgets.js';
import { clockText, COLORS as C, money } from '../config.js';
export class HUD {
  constructor(scene) {
    this.scene = scene;
    const g = scene.add.graphics(); g.fillStyle(C.dark); g.fillRect(0, 0, 480, 74);
    round(g, 17, 17, 30, 30, 0xb99454, 15); label(scene, 32, 32, 'đ', 20, '#fff0c4', { fontStyle: 'bold' });
    this.balance = label(scene, 57, 27, '', 19, '#fff2d7', { fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.day = label(scene, 20, 54, '', 10, '#b8c8ad').setOrigin(0, 0.5);
    this.clock = label(scene, 267, 29, '', 23, '#ffebc4', { fontFamily: 'Georgia, serif' });
    this.phase = label(scene, 267, 53, '', 9, '#bdcbaa', { letterSpacing: 1 });
    button(scene, 375, 34, 64, 42, 'Sổ món', () => scene.openBook(), { size: 12, fill: 0x3b5645 });
    button(scene, 445, 34, 42, 42, 'Ⅱ', () => scene.openPause(), { size: 18, fill: 0x3b5645 });
    const strip = scene.add.graphics().setDepth(3); round(strip, 67, 83, 345, 79, C.cream, 8);
    this.event = label(scene, 240, 100, '', 14, '#395741', { fontStyle: 'bold' }).setDepth(4);
    this.challenge = label(scene, 240, 123, '', 10, '#76603f', { wordWrap: { width: 325 }, align: 'center' }).setDepth(4);
    this.combo = label(scene, 240, 149, '', 9, '#2b4c3c', { fontStyle: 'bold' }).setDepth(4);
    this.previous = '';
  }
  update() {
    const { session, game } = this.scene;
    const key = [Math.floor(session.elapsed), session.earnings, session.combo, session.served].join('/');
    if (key === this.previous) return; this.previous = key;
    this.balance.setText(money((session.tutorial ? 0 : game.save.data.balance) + session.earnings));
    this.day.setText(session.tutorial ? `LÀM QUEN QUÁN  ·  ${session.served}/3 LY` : `NGÀY ${session.day}  ·  ${game.save.reputation.toFixed(1)} ★  ·  ${session.served} KHÁCH`);
    this.clock.setText(session.tutorial ? 'Thong thả' : clockText(session.elapsed)).setFontSize(session.tutorial ? 17 : 23);
    this.phase.setText(session.tutorial ? 'KHÔNG GIỚI HẠN GIỜ' : session.rush ? 'GIỜ CAO ĐIỂM' : session.elapsed >= 157.5 ? 'SẮP ĐÓNG CỬA' : 'BUỔI SÁNG AN LÀNH');
    const ch = session.challenge;
    this.event.setText(session.powerOut ? 'MẤT ĐIỆN · QUẠT TẠM NGHỈ' : EVENTS[session.event]?.name || 'Một sáng ở góc phố');
    this.challenge.setText(session.tutorial ? 'Luyện tay pha phin · không tính vào tiến trình' : `${ch.complete ? '✓ ' : ''}${session.plan.challenge.label}: ${Math.min(ch.value, ch.target)}/${ch.target} · +${money(session.plan.challenge.reward)}`);
    this.combo.setText(session.combo >= 3 ? `${session.combo >= 10 ? 'HUYỀN THOẠI PHA PHIN' : session.combo >= 5 ? 'SUPER COMBO' : 'COMBO'} ×${session.combo}` : session.rush ? '✦  PHỐ ĐÔNG RỒI, CÙNG PHA THÔI!  ✦' : 'MỘT LY CÀ PHÊ · MỘT CHÚT NIỀM VUI');
  }
}
