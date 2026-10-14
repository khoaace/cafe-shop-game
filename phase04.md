# PHASE 04 — PREMIUM 2D ANIMATION & GAME FEEL

Continue improving the existing Phaser 3 game.

Do not remove working gameplay systems.

Focus on making every action feel satisfying, fluid, expressive, and visually polished.

## ART DIRECTION

Use a coherent cozy Vietnamese 2D art style.

Warm palette, charming characters, rounded silhouettes, soft shadows, and detailed street scenery.

Replace crude placeholder visuals with polished reusable graphics.

Avoid mixing incompatible pixel-art and vector styles.

## CHARACTER ANIMATION

Every customer should have:

1. Walk
   - Alternating leg movement
   - Moving arms
   - Small body bounce
   - Smooth easing

2. Idle
   - Breathing
   - Blinking
   - Occasional head movement

3. Sit
   - Approach stool
   - Smooth transition into seated pose

4. Order
   - Gesture
   - Speech bubble pop animation

5. Happy
   - Smile
   - Short celebration
   - Hearts and sparkle particles

6. Angry
   - Head shake
   - Disappointed expression
   - Small frustration effect

Animate the shopkeeper's reactions too.

## COFFEE ANIMATION

Polish the existing physical brewing system.

Add:
- Detailed coffee-ground particles
- Kettle rotation following the player's gesture
- Continuous animated water stream
- Realistic coffee droplet timing
- Liquid filling with curved surface
- Soft steam rising
- Ice collisions and splashes
- Condensed milk viscous flowing effect
- Milk blending transitions
- Whisk and spoon rotation tied to input
- Smooth ready-to-serve animation

These are visual enhancements to actual gameplay states.

Do not simulate gameplay solely with pre-scripted animations.

## INTERACTION FEEDBACK

For dragging:
- Small lift animation
- Shadow
- Slight scaling
- Highlight valid target
- Smooth snap
- Bouncy return on invalid release

For rewards:
- Floating Vietnamese currency
- Tiny coin particles
- Combo flash
- Customer celebrations

For mistakes:
- Brief gentle shake
- Clear error feedback
- No excessive punishment

## ENVIRONMENT

Animate:
- Tree leaves
- Hanging plants
- Morning sunlight
- Occasional passing motorbikes
- Birds
- Coffee steam
- Shop signage
- Fan when available

Use subtle layered parallax.

## SOUND

Use WebAudio or lightweight local/generated sounds.

Create distinct feedback for:
- Coffee dripping
- Water pouring
- Milk pouring
- Ice falling
- Stirring
- Ready coffee
- Correct order
- Incorrect order
- Money
- Combo
- UI interactions

Add ambient Vietnamese morning street sounds.

Provide sound and music controls.

## UI ANIMATIONS

Use animated:
- Order bubbles
- Patience bars
- Money counter
- Combo indicators
- Screen transitions
- Day-end statistics
- Tutorial highlights

Use appropriate Phaser easing functions.

## PERFORMANCE

Target smooth gameplay on ordinary smartphones.

Avoid excessive particle counts and expensive redraws.

Clean up animations and timers.

Include reduced-motion support when feasible.

## ACCEPTANCE CRITERIA

- Animations remain smooth while multiple customers and phins are active.
- Every brewing interaction has visual feedback.
- Characters visibly react to events.
- Effects communicate actual gameplay outcomes.
- Sound can be muted.
- Layout remains clear.
- Game remains fully playable.
- No major frame-rate regression.

Deliver genuine game feel rather than decorative effects alone.