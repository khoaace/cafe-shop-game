# Phase 09 — interactive drink engine foundation

The four original drinks remain playable. The seven requested drinks are planning metadata in `PLANNED_DRINKS`, **not registered recipes**. They have no invented quantities, prices, unlock dates or customer requests in this phase.

## Data and integration

- `src/data/drinkEngine.js`: ingredient identities, explicit units, validated immutable recipe schema and the original recipe adapters.
- `config.registerRecipe(raw)`: register a complete recipe before scene/save creation. The shared `RECIPES` registry drives orders, book pages, menu guides, prices, tips, day statistics and mastery. Duplicate IDs, unknown ingredients, incompatible units, invalid quantities and forward/cyclic step dependencies are rejected.
- `inventory.registerSupply(id, spec, initial = 0)`: register future pantry supplies before save creation. A supply specifies its purchase unit, pack quantity, price and existing artwork icon. Recipes declare `supplies` separately from served quantities; e.g. the original three ice cubes consume one pantry portion. Unknown supplies cannot be ordered.
- `unlock: { day, upgrades: { upgradeId: minimumLevel } }` and `enabled: false` are checked before generating orders. The planned catalog never enters the registry.
- Save key/version stays `phin-goc-pho:v3`. Existing v1/v2/v3 normalization is retained; missing registered mastery/stock entries receive safe defaults. In-progress cups remain ephemeral, matching existing end-of-day saving.

A structured recipe defines `id`, Vietnamese `name`, `short`, `price`, `equipment`, `ingredients: [{ id, target, unit }]`, `supplies`, `steps`, `quality`, `visual` and `unlock`. Steps define `id`, a physical `action`, `target`, an instruction, optional `ingredient`, `after` dependencies, `required`, `minimumProgress` and `technique`. `visual.capacity` uses container volume units. An ingredient can define `volumePerUnit` to convert its quantity unit into container volume (e.g. a milk portion into ml); otherwise the conversion is 1. Quantity scoring still uses the original ingredient unit. Techniques and amount accuracy are evaluated separately; quality thresholds can be overridden per recipe.

`evaluate()` retains the existing `valid`, `quality`, `score`, `message` contract and adds `recipeCorrectness`, `amountAccuracy`, `preparationTechnique`, `finalQuality`. Missing/wrong ingredients are distinguished from unfinished preparation. Minor technique errors lower quality to GOOD or ACCEPTABLE and do not make the ingredients incorrect. Completely absent required physical actions still need preparation before serving.

## Input ownership

`DragController` remains the single subscriber to Phaser pointerdown/move/up/upoutside. It forwards events to `scene.drinkEngine`. The new engine adds **zero pointer listeners**. It owns pointer sessions, individual tools and station reservations; independent tools can be used by different touch pointers. Legacy gestures retain their original single-tool behavior, while all phins continue brewing independently.

Register physical Phaser GameObjects with:

```js
const removeTool = scene.drinkEngine.registerTool('tea-pitcher', pitcherObject, {
  action: 'pour', ingredient: 'tea', rate: 25, hitSize: 56,
  stepId: 'pour-tea', instruction: 'Kéo bình vào ly, di chuyển sang phải để nghiêng.',
});
```

This is a tool registration example, not a recipe. The corresponding cup recipe must be registered separately. The default hit size is 48 logical pixels. Configure `quantity` for drop actions and `progressTarget` for equipment without a recipe (950 for whisking, radians for stirring, seconds for blending). Tools have no click-to-complete behavior. Source containers can provide `sourceState: () => state`; set `sourceType: 'blender'` to require blend progress before manual pouring. Recipe preprocessing progress is carried into the receiving cup.

Cup targets are registered by GameScene. To add an independent board, bowl or blender, instantiate `PreparationStationView` with `{ id, type: 'board' | 'bowl' | 'blender', x, y, capacity, takeIngredient, refundIngredient }`. Then register knife, citrus, whisk, ingredient, lid, switch and pitcher GameObjects with the engine. A switch uses `action: 'blend'`; a lid uses `action: 'lid'`. Removing a lid allows safe reuse after pouring. Call `.destroy()` when removing equipment.

Custom targets use `registerTarget(id, { accepts, visible, contains, center, getState, recipeId?, acceptIngredient, takeIngredient, acceptMixture?, onChange?, render? })`. Ingredient callbacks return **actual accepted quantity**, not requested quantity. `takeIngredient` for ice and garnish must return whole item counts. Supplies already consumed in a bowl/blender are transferred without charging them twice. `acceptMixture` returns the accepted fraction and must transfer that same fraction of every constituent atomically.

Cancel, resize, visibility loss, tray changes, station paging, pause and scene shutdown release ownership. A cancelled drop creates no ingredient; already poured liquid and actual preparation movement remain. Tools return safely to their homes. Frame updates and cup timers never acquire a counter-wide lock.

## Reusable systems

| System | State and behavior |
| --- | --- |
| LiquidPourSystem | Movement controls tilt; continuous flow requires an owned gesture and valid target. Quantity is the amount accepted. Ending a session stops immediately. Transfers retain ingredient identities. |
| LiquidLayerSystem | World-transformed glass masks, animated levels, gradient strips, weighted color blending, swirls, waves, foam and reflections. Original cup art uses it too. |
| WhiskSystem | Actual circular and W strokes; stationary input, teleports and stale gesture segments add no progress. Foam follows earned movement. |
| FruitPreparationSystem | Fruit placement, center-crossing knife swipe, movement-based squeeze, bounded juice extraction and droplets. |
| BlenderSystem | Ingredient insertion, lid placement/removal, independent hold switches, consistency, running-state safeguards and proportionate manual transfers. |
| StirringSystem | Actual circles and back-and-forth strokes; mixing follows earned progress. Original milk drinks use this system. |
| IceSystem | Accepted cube count, bounded per-cup placement, pooled falling/bouncing cubes and impact splashes. |
| GarnishSystem | Accepted decoration count, clamped landing positions and landing animation. |

`PreparationState` belongs to one container: quantities, layers, steps, foam, mixing, fruit, ice, garnish and blender properties are never shared across cups. Pouring into a mixed cup resets its stirring progress. Gesture histories belong to a pointer and target and reset when changing target. `Drink.startTimedSteps()` starts eligible dependent brew steps, and StationManager advances all cups, including hidden pages.

`PreparationEffects` has a bounded pool, live streams, splashes, ice collisions, landing motion, perfect sparkle and floating reward helpers. It respects reduced motion. BlenderStation visuals show the actual lid, inserted solids, active vibration/vortex and consistency; bowl and board visuals follow foam and fruit state.

The interface remains 480 × 800. Recipe and supply lists paginate; brewing countdowns remain visible in station buttons, even for hidden stations. Active equipment gets an outline, and registered tools reveal valid drop zones. The original recipe book pause behavior is retained.

## Validation

Existing regression tests and focused engine tests cover gesture movement, quantity conservation, independent states, wrong units/dependencies, partial technique, unlocks, serving/revenue/statistics and old-save defaults. Browser checks exercise real mouse/touch input and inspect rendering/cancellation/listener counts. The production build remains Vite/Phaser 3.

Final checks: `npm test` **90/90 passing**; `npm run build` successful. Real browser gestures served an original drink with mouse and with touch; touch stirring reached 9.4248 radians, whisking reached 950 movement units, and a stationary hold earned zero foam. Cancellation, invalid drops, incomplete serving, discard and page-scroll prevention passed. Input listeners remained `[1, 1, 1, 1]`. Final browser console reported no errors or warnings. Illustrative browser artifacts are in `output/playwright/phase09-*.png`.

Fruit/blender/garnish and concurrent generic-tool behavior are covered by system tests. Their equipment views are extension components for the next recipe phase, and are not added to the current counter without a recipe/layout registration. Browser automation is desktop Chromium with touch emulation; physical mobile hardware was not available in this session.
