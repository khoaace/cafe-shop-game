import test from 'node:test';
import assert from 'node:assert/strict';
import { gameLayout, stationPosition, seatPosition, toolCell } from '../src/logic/layout.js';
import { desktopRenderFactor } from '../src/rendering/resolution.js';

test('desktop profile uses the viewport and preserves portrait geometry below the breakpoint and outside gameplay', () => {
  for (const [w, h] of [[360, 800], [430, 932], [1023, 900], [1440, 639]]) assert.equal(gameLayout(w, h).desktop, false);
  assert.equal(gameLayout(1920, 1080, false).desktop, false);
  assert.deepEqual(stationPosition(3, 4), { page: 1, x: 354, y: 517 });
  assert.equal(gameLayout(1024, 640).desktop, true);
});
test('all purchased stations fit the desk and remain separate at every desktop size', () => {
  for (const [w, h] of [[1024, 640], [1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) {
    const l = gameLayout(w, h);
    assert.equal(l.width, w); assert.equal(l.height, h);
    assert.ok(l.board.x + l.board.w < l.tools.x);
    for (let count = 1; count <= 4; count++) {
      const stations = Array.from({ length: count }, (_, i) => stationPosition(i, count, l));
      for (const { rect: r, x, y } of stations) {
        assert.ok(r.x >= l.board.x && r.y >= l.board.y && r.x + r.w <= l.board.x + l.board.w && r.y + r.h < l.board.y + l.board.h);
        assert.ok(x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);
      }
      for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
        const a = stations[i].rect, b = stations[j].rect;
        assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
      }
    }
    const seats = Array.from({ length: 6 }, (_, i) => seatPosition(i, 6, l));
    for (let i = 1; i < seats.length; i++) assert.ok(seats[i].x - seats[i - 1].x >= 130);
    for (let i = 0; i < 6; i++) { const c = toolCell(l, i, 6); assert.ok(c.x >= l.tools.x && c.x + c.w <= l.tools.x + l.tools.w + 0.001); }
  }
});
test('desktop density supports fractional GPU caps without changing logical pointer geometry', () => {
  assert.equal(desktopRenderFactor(1440, 900, 2), 2);
  assert.equal(desktopRenderFactor(2560, 1440, 2), 1.6);
  for (const dpr of [1, 1.25, 2, 3]) {
    const f = desktopRenderFactor(3840, 2160, dpr);
    assert.ok(f <= 2 && 3840 * f <= 4096 && 2160 * f <= 4096);
  }
});
