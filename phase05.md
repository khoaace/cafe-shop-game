# PHASE 05 — SHOP UPGRADES & ECONOMY

Continue developing the existing "Tiệm Cà Phê Phin Vỉa Hè" project.

Preserve the working interactive coffee preparation, customers, day cycle, animations, and combo system.

## GOAL

Implement meaningful upgrades and visual café progression.

Players earn money through serving customers and spend it between days.

Every purchased upgrade must affect gameplay and visibly appear in the café.

## UPGRADE SHOP

Create a polished Vietnamese upgrade screen with:
- Equipment illustrations
- Prices
- Upgrade levels
- Descriptions
- Purchase animations
- Insufficient-funds feedback
- Return-to-game navigation

## UPGRADES

### Additional Phin

Starting capacity: 1 phin.

First purchase: 25.000đ.

Maximum capacity: 4 phins.

Each additional phin creates another usable brewing station.

Each station has independent preparation and brewing states.

Players must be able to physically operate all purchased stations.

### Plastic Stools

Starting seats: 3.

First upgrade: 30.000đ.

Maximum: 6 seats.

Buying a stool adds a visible stool to the sidewalk and increases seating capacity.

Update customer pathing and placement to use the new seat.

### Premium Condensed Milk

Cost: 20.000đ.

Increase relevant tip potential by 20%.

Update the visible ingredient packaging.

Do not eliminate the manual milk-pouring interaction.

### Electric Fan

Cost: 15.000đ.

Reduce patience drain by 15%.

Show a rotating fan in the café.

Make its state clearly visible during gameplay.

### Decorations

Cost: 40.000đ.

Add plants, lights, signage, or prettier furniture.

Provide a small customer satisfaction or reputation bonus.

Decorations must actually appear in the scene.

## ECONOMY

Maintain separate values for:
- Current money balance
- Daily revenue
- Daily tips
- Upgrade expenses
- Lifetime earnings

Format amounts in Vietnamese đồng.

Prevent negative balances and repeated purchases.

Keep upgrade costs in a central configuration.

Balance progression so players can normally purchase an early upgrade after one or two successful days.

## VISUAL PROGRESSION

The café should visibly grow.

For each purchase:
- Play a purchase animation
- Deduct money
- Apply gameplay effect
- Update scenery
- Save progress

Avoid upgrades that only change hidden numbers.

## SAVE SYSTEM

Persist:
- Day count
- Money
- Upgrade levels
- Equipment quantity
- Seat count
- Reputation
- Best score
- Settings

Use versioned localStorage data.

Handle corrupted or missing saves safely.

## ACCEPTANCE CRITERIA

- Upgrades can be purchased correctly.
- Currency deductions are accurate.
- New phins are interactive and independent.
- Additional seats work with customer placement.
- Equipment appears visually.
- Perks affect actual gameplay.
- Save data survives reloads.
- No progression reset between scenes.
- Previously implemented gameplay still works.

Implement the full shop progression system without replacing the physical preparation mechanics.