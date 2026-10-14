# PHASE 01 — INTERACTIVE COFFEE BREWING VERTICAL SLICE

You are a senior Phaser 3 game developer specializing in interactive, polished 2D mobile games.

Build Phase 01 of a Vietnamese coffee shop management game named "Tiệm Cà Phê Phin Vỉa Hè".

This is the foundation of a larger game. Prioritize actual interactive gameplay, beautiful composition, and maintainable architecture.

## TECH STACK

- Phaser 3 with JavaScript ES modules
- Vite for local development and static builds
- HTML5 Canvas/WebGL through Phaser
- CSS for the webpage shell only
- Mobile-first portrait resolution 480x800
- Mouse and touch support
- Vietnamese interface
- No backend
- localStorage for initial progress
- No paid external assets

## VISUAL DIRECTION

Create a cozy 2D Vietnamese sidewalk coffee shop:
- Warm morning sunlight
- Coffee preparation counter
- Traditional aluminum phin filters
- Transparent coffee glasses
- Stainless steel table
- Blue plastic chairs
- Tiled sidewalk
- Vietnamese shop sign
- Plants and street scenery
- Cute Vietnamese shopkeeper
- At least one cute animated customer

Use polished, cohesive 2D illustrations built from Phaser Graphics or available project assets.

Avoid plain geometric placeholders.

Create a proper portrait layout:
- Upper area: money and day information
- Middle: sidewalk and customer
- Lower area: interactive coffee preparation counter

## THE MAIN REQUIREMENT — PHYSICAL INTERACTION

The player must actively prepare coffee using gestures, not simply click buttons that generate finished drinks.

Implement ONE fully interactive drink: Cà phê đen đá.

### STEP 1 — PLACE GLASS

Show empty glasses on a tray.

Player drags a glass to the brewing station.

The glass:
- Follows the pointer or finger
- Slightly scales up while dragging
- Casts a subtle shadow
- Snaps into the correct station
- Bounces gently when released

Invalid placement returns the glass smoothly to its previous position.

### STEP 2 — PREPARE THE PHIN

Player drags the aluminum phin onto the glass.

Player then drags a spoon into ground coffee.

The spoon visually fills with coffee grounds.

Player drags the filled spoon to the phin to add coffee.

Show falling coffee-ground particles.

Next, player drags the inner phin press into place and presses down briefly.

Use a visible compression animation.

These actions must update real preparation state.

### STEP 3 — POUR HOT WATER

Create an interactive kettle.

Player drags or tilts the kettle toward the phin.

Holding the pointer pours water continuously.

Display:
- Animated water stream
- Filling/progress gauge
- Highlighted ideal pouring range
- Visual response to increasing water volume

Evaluate:
- PERFECT when the player stops inside the ideal range
- GOOD when close
- BAD when far outside

Do not generate coffee with a single button click.

The water-pouring mechanic must work with touch input and mouse input.

### STEP 4 — BREWING

Coffee automatically brews for approximately 8 seconds.

During brewing:
- Dark drops fall individually
- Glass gradually fills
- Progress is visually represented
- Phin cannot be used again until completion
- Steam and a subtle glow appear when ready

Animate the coffee liquid inside the glass.

### STEP 5 — ADD ICE

Display individual ice cubes or a small ice scoop.

Player drags ice into the coffee glass.

Ice cubes:
- Follow the pointer
- Drop into the glass
- Bounce with a small splash
- Become visible within the liquid

Add the required quantity of ice.

Do not substitute the interaction with a generic "Add Ice" button.

### STEP 6 — SERVE CUSTOMER

The customer displays an order bubble for cà phê đen đá.

Player drags the finished drink toward the customer.

If correct:
- Customer smiles and celebrates
- Money reward floats upward: +12.000đ
- Small heart particles appear
- Money counter updates

If incomplete:
- Explain which required preparation step is missing
- Return the drink safely to the counter

Prevent serving the same drink twice.

## SIMPLE PLAYABLE LOOP

- Start screen
- One customer arrives
- Customer orders cà phê đen đá
- Player prepares the drink manually
- Player serves
- Customer reacts
- Money increases
- Another customer can arrive
- Simple end-of-day result after 3 successful customers

Implement an easy reset/retry flow.

## ARCHITECTURE

Create separate reusable modules for:
- Game configuration
- Boot/Menu/Game scenes
- Customer
- BrewingStation
- Cup/Drink
- Drag interaction handling
- UI/HUD
- SaveManager

Model preparation with explicit states and valid transitions.

Use normalized data for ingredient quantities and recipe validity.

Do not rely on animation completion alone to determine gameplay state.

## ANIMATION QUALITY

Even in Phase 01, implement:
- Smooth dragging
- Snapping and bouncing
- Liquid filling
- Coffee drops
- Steam
- Customer walking
- Idle breathing
- Serving celebration
- Floating money text

Use easing and squash/stretch where appropriate.

## SCOPE RESTRICTIONS

Do NOT implement:
- Multiple drink recipes
- Shop upgrades
- VIP customers
- Random events
- Achievements
- Large story systems

Focus on building one genuinely enjoyable interaction loop.

## DEFINITION OF DONE

Phase 01 is complete only if:

1. The game runs with npm run dev.
2. The UI fits a portrait mobile screen.
3. A customer can arrive and order.
4. The player can physically drag a glass.
5. The player can prepare the phin using gestures.
6. The player can manually pour water.
7. Coffee visibly drips into the glass.
8. The player can drag ice into the glass.
9. The completed drink can be dragged to a customer.
10. The customer reacts and money is awarded.
11. There are no blocking controls or dead-end states.
12. Game state and presentation remain synchronized.

Use a real playable game rather than a mockup.

Create all required files in the existing project and provide concise instructions to run it.