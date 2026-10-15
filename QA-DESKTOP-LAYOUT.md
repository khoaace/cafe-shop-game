# Desktop layout verification

Desktop game and tutorial use the available viewport from 1024 × 640. Workstations appear together on the left; ten tool tabs and the ingredient grid occupy a separate right column. Smaller viewports retain the portrait layout.

## Validation

- `npm test`: 174 passed, zero failed.
- `npm run build`: passed.
- `scripts/qa-desktop-layout.js`: passed at 1024×640, 1280×720, 1366×768, 1920×1080, 2560×1440, and mobile 390×844; preserves cup IDs, cancels active drags on resize, and keeps dialogs usable.
- Preparation gestures: cream pouring/whipping, coconut blender docking/lid/blending, kumquat cutting/squeezing, and matcha W whisking passed.
- `scripts/qa-desktop-workflow.js`: passed full coffee brewing, moving to station four, serving a customer, trash, column scrolling, and scene lifecycle with one through four stations. No browser errors or retained preparation sprites/listeners after shutdown.
- `scripts/qa-expanded-items-touch.js`: passed mobile touch regression.

## Screenshots

- [Desktop 1920×1080](output/desktop-layout/resize-1920.png)
- [Single workstation](output/desktop-layout/stations-1.png)
- [Recipe book](output/desktop-layout/book-1440.png)
- [Short desktop](output/desktop-layout/resize-1024.png)

Machine-readable results and logs are in `output/desktop-layout/`.
