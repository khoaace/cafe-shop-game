# PHASE 02 — INTERACTIVE DRINK RECIPES & PREPARATION

Continue developing the existing "Tiệm Cà Phê Phin Vỉa Hè" Phaser 3 game.

Read the existing code and preserve all working gameplay from Phase 01.

DO NOT rebuild the project from scratch.

## GOAL

Expand the physical coffee preparation system into a satisfying, multi-step drink-making experience.

Support four recipes:

1. Cà phê đen đá — 12.000đ
   - Coffee + ice

2. Cà phê sữa đá — 15.000đ
   - Coffee + condensed milk + ice

3. Bạc xỉu — 18.000đ
   - Small amount of coffee + fresh milk + condensed milk + ice

4. Cà phê trứng — 25.000đ
   - Coffee + egg foam, no ice

## REQUIREMENT: PHYSICAL INGREDIENT INTERACTIONS

Never implement recipe preparation as a sequence of ordinary buttons.

### Condensed milk

Player grabs or drags the condensed milk container.

When tilted over the glass:
- Thick milk flows into the glass
- Liquid level increases
- Milk forms a visible layer
- Player controls the amount by holding and releasing

Show a subtle target quantity indicator.

Pouring too much should reduce drink quality rather than immediately invalidate the recipe.

### Fresh milk

Implement a separate milk pitcher.

Player drags and tilts the pitcher.

Animate:
- White milk stream
- Liquid level rising
- Coffee/milk layering
- Small splash

Use ingredient quantity thresholds.

### Ice cubes

Improve the Phase 01 ice interaction.

Allow the player to drag an ice scoop or individual cubes into the glass.

Animate falling cubes, collisions, splashes, and small glass movement.

Ice quantity must be tracked in actual game state.

### Egg foam

Create a special interactive preparation step.

Player performs a short whisking minigame.

Detect actual circular or back-and-forth pointer movement.

Display foam visibly growing as the whisk moves.

Do not count stationary holding as whisking.

After reaching the desired foam consistency, the player drags the bowl to pour foam onto the coffee.

Display a thick golden foam layer.

### Stirring

Introduce a spoon.

Player drags the spoon inside the glass and performs circular gestures.

Track pointer angle around the glass center and accumulate actual rotational movement.

After sufficient stirring:
- Liquid layers blend
- Small bubbles appear
- The spoon follows the gesture
- A completion animation plays

Provide forgiving gesture recognition on mobile.

Do not use a generic click-to-stir interaction.

## VISUAL DRINK SYSTEM

Build a reusable layered-liquid renderer.

Each glass should visually represent:
- Coffee
- Condensed milk
- Fresh milk
- Egg foam
- Ice
- Liquid quantity
- Mixing progress

A bạc xỉu must visually look different from cà phê đen đá.

Smoothly animate layer changes.

## DRINK QUALITY

Calculate drink quality from:
- Water-pouring accuracy
- Ingredient quantity accuracy
- Required preparation steps
- Stirring quality when applicable

Results:
- PERFECT
- GOOD
- ACCEPTABLE
- INCORRECT

Distinguish between a valid recipe with imperfect quality and an actually incorrect recipe.

Do not make players fail simply because they added ingredients in a harmless different order.

## RECIPE BOOK

Add an interactive Vietnamese recipe book.

Show:
- Drink illustration
- Required ingredients
- Recommended quantities
- Preparation hints

The recipe book must pause the game clock while open.

## PLAYER FEEDBACK

Show short, helpful indicators:
- "Chuẩn luôn!"
- "Hơi nhiều sữa!"
- "Thiếu đá rồi!"
- "Khuấy thêm chút nữa!"
- "Tuyệt vời! Perfect Brew!"

Use animations and sounds, not only text.

## IMPORTANT GAME DESIGN

Avoid making every drink excessively tedious.

Simple drinks should require fewer gestures.

Complex drinks should be more profitable and require more mastery.

Automated coffee dripping must continue while the player is preparing ingredients or operating another station.

Ensure dragging, pouring and stirring do not conflict with one another.

## ACCEPTANCE CRITERIA

- All four drink recipes work.
- Ingredients are applied through real interactions.
- Pouring depends on player input.
- Whisking requires movement.
- Stirring requires circular gestures.
- Liquid layers are visibly different.
- Recipes are validated correctly.
- Wrong ingredients can be corrected by discarding the cup.
- No dead-end states.
- Existing Phase 01 functionality still works.

Implement and verify the complete Phase 02 before proceeding.