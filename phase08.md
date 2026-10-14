# PHASE 08 — FINAL POLISH, QA & DEPLOYMENT

Act as a senior Phaser 3 game engineer and quality assurance specialist.

Review and polish the complete existing "Tiệm Cà Phê Phin Vỉa Hè" game.

Preserve all existing features.

## GOAL

Deliver a reliable, visually polished, playable, mobile-friendly game suitable for public testing.

## INTERACTION QUALITY

Audit every manual preparation gesture:
- Dragging glasses
- Placing phin
- Adding coffee grounds
- Pressing the filter
- Tilting the kettle
- Controlling water quantity
- Pouring milk
- Adding ice
- Whisking egg foam
- Stirring coffee
- Dragging drinks to customers

Verify interactions using mouse and touch.

Fix:
- Missed pointer events
- Overlapping hit areas
- Objects getting stuck during dragging
- Incorrect snap targets
- Duplicate gesture completion
- Unintended page scrolling
- Inconsistent drag behavior on mobile

Provide a forgiving touch-target system without removing real physical interaction.

## VISUAL POLISH

Improve:
- UI consistency
- Typography
- Object shadows
- Coffee animations
- Character expressions
- Transitions
- Ingredient feedback
- Particle timing
- Upgrade visuals

Remove obvious placeholders and broken graphics.

## PERFORMANCE

Target smooth gameplay on normal mobile devices.

Review:
- Animation counts
- Timers
- Object destruction
- Particle cleanup
- Memory growth
- Scene transitions
- Visibility changes
- Touch responsiveness

Use object pooling where useful.

Avoid expensive per-frame operations.

## RESPONSIVE TESTING

Validate layout at:
- 360x800
- 390x844
- 430x932
- 480x800
- Common desktop browser sizes

Handle safe areas and browser resizing.

Prevent essential gameplay elements from being clipped.

## GAMEPLAY TESTS

Verify a complete sequence:

1. Open game.
2. Start new save.
3. Accept customer.
4. Manually prepare coffee.
5. Serve correctly.
6. Serve another recipe.
7. Earn tips and combo.
8. Finish the day.
9. Buy a phin.
10. Begin the next day.
11. Use both phins independently.
12. Trigger an event.
13. Complete a challenge.
14. Reload the game.
15. Continue with correct saved progress.

Check invalid preparation and timeout cases as well.

## ERROR HANDLING

Handle:
- Corrupted localStorage
- Tab switching
- Browser resize
- Audio autoplay restrictions
- Repeated button taps
- Drag cancellation
- Unexpected scene changes
- Unsupported or interrupted audio
- Missing optional artwork

Do not leave the player stuck.

## BUILD & DEPLOYMENT

Verify:
- npm install
- npm run dev
- npm run build
- Production preview
- Correct static asset paths
- No browser console errors

Prepare the project for deployment to:
- Cloudflare Pages
- Netlify
- GitHub Pages

Provide accurate build and deployment instructions.

## FINAL REQUIREMENTS

- Complete playable game
- Responsive mobile gameplay
- Beautiful visual feedback
- Genuine hands-on preparation
- Reliable saves
- Correct economy
- Smooth scene transitions
- Functional upgrades
- No obvious dead ends
- No fake buttons

Test the actual game where execution and browser testing are available.

Fix issues that are found instead of simply declaring that testing passed.

Provide a short summary of verified functionality, remaining limitations, and deployment steps.