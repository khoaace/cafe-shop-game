# Phase 10 — Cà phê muối

Cà phê muối costs **22.000đ** and unlocks on **day 4**, after the original four drinks. The other six planned drinks remain unimplemented. The existing save key/version, economy, original recipes, upgrades and day progression are retained.

## Physical preparation

1. Select Cà phê muối through the station recipe book; drag a glass and phin onto the counter.
2. Scoop one portion of grounds, hold the press, pour water to 100%, then release to begin the eight-second brew. Each phin advances independently, including while the cream station is active.
3. Add one portion of condensed milk and three ice cubes through the original milk tray.
4. Open **04 KEM MUỐI**. Drag the cream jug into the bowl, move left to level it, then right to tilt. Release at **40 ml**.
5. Drag the measuring spoon onto the bowl twice: **0.15 g per spoon**, **0.3 g total**. Excess salt visibly displays “Hơi mặn rồi!”.
6. Drag the whisk into the bowl and draw circles. Stationary holds, jitter, teleports and small reversing strokes earn no progress. Watch the five stages and stop in the wide green Perfect zone. Perfect cream emits a sparkle, “KEM BÔNG HOÀN HẢO!” and a soft chime. Continued movement causes overwhipping.
7. After the phin finishes, drag **Ca phin** onto its own glass and tilt to collect its actual brewed coffee. The pitcher cannot create coffee or borrow another cup’s brew.
8. Drag the cream bowl onto the glass and tilt. The white ribbon flows continuously while held, with its spout following the tilted bowl and its landing point following the liquid surface. Release controls the portion immediately.
9. Drag the completed drink to a customer ordering Cà phê muối.

A clear glass displays warm condensed milk, dark coffee, translucent floating ice and thick white cream. Cream spreads across the coffee surface and settles with interface swirls, bubbles, reflections and a damped wobble. Adding cream does not mix the layers.

The bowl survives tray switches. “Dọn tô” clears a failed batch without refunding already consumed ingredients. Cancellation returns tools safely; a cancelled spoon adds nothing, and already poured liquid stays in its container. Transporting the bowl reserves its source station, preventing another pointer from whisking it at the same time.

## Implementation

- `config.js`: immutable structured recipe, equipment, quantities, gesture instructions, quality thresholds, visual appearance and unlock rule.
- `models/SaltedCream.js`: independent bowl state, five stages, circular motion, salt concentration, fresh-cream dilution and cream technique.
- `rendering/SaltedCreamStation.js`: persistent Phaser bowl, jug, measured spoon, whisk, coffee pitcher, progress gauge, bubbles, peaks, feedback and tool registration.
- `Drink.js`: existing physical phin pipeline plus a per-cup brewed-coffee reservoir and manually accepted cream/coffee mixtures. Transfers conserve salt and cream; preprocessing progress and technique are weighted by the actual accepted cream portion.
- `LiquidPourSystem`, `InteractiveDrinkEngine`, `MotionGesture`, `WhiskSystem`: target-aware source containers, source ownership, left-to-right tilt recovery, circular-only whisking, safe cancellation and live surface/spout coordinates. Input remains owned by the existing DragController.
- `CupArt`, `LiquidLayerSystem`: masked gradients, slow foam spreading, interface swirls, settling waves, clear glass and visible individual ice cubes.
- `AudioManager`: cream pouring, whisking, foam bubbles, landing and Perfect chime, using the existing audio lifecycle and mute settings.

Recipe correctness, amount accuracy, technique and final quality remain separate. Coffee grounds/water and brew completion, salt quantity, cream portion and transferred whisk technique all affect evaluation. Minor salt and technique deviations remain serveable at lower quality. Missing ingredients and absent physical preparation still prevent serving. Perfect cream increases tip potential by 15%; an otherwise Perfect salted coffee earns a **6.300đ** base tip.

The shared recipe registry drives orders, menu price, book pages, validation, revenue, mastery and statistics. Salted-coffee customers use the requested Vietnamese order dialogue, a layered drink icon, and a sip/smile reaction with “Trời ơi, béo mặn vừa đủ, đỉnh quá!”. Cream and salt are purchased in the existing shop. Old saves receive starter defaults for the new pantry/mastery fields while preserving their existing values.

## Validation

- `npm test`: **103 tests passing**, including all original recipe/economy/save regressions and new circular movement, five-stage whisking, quantity conservation, independent cups/batches, excess salt, imperfect technique, source ownership behavior, sound/muting and transfer checks.
- `npm run build`: successful production build.
- `scripts/qa-salted-coffee.js`: real browser mouse gestures prepare an original black coffee and salted coffee; both are accepted. Combined revenue is **34.000đ**, combined tips **9.300đ**, and the salted recipe count increments once.
- `scripts/qa-salted-coffee-touch.js`: Chromium touch emulation at **390×844** completes the salted drink with Perfect quality; checks cancelled salt application, stationary holding, release stopping flow, excess salt and an overwhipped second batch that cannot alter the first cup.
- Input listener counts remain **[1, 1, 1, 1]**. Touch gestures do not scroll the page.

Browser logs and screenshots are under `output/playwright/phase10-*`. Tests seed an isolated browser save before using actual gestures; the development snapshot API is read-only and absent from production. Physical mobile hardware was not available in this session.
