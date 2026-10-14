# PHASE 03 — CUSTOMER MANAGEMENT & GAMEPLAY LOOP

Continue the existing Phaser 3 coffee shop game.

Preserve all interactive drink preparation features from Phases 01 and 02. Do not rewrite or replace them with button-based interactions.

## GOAL

Build a complete, engaging café-management gameplay loop around the existing coffee-making mechanics.

## DAY SYSTEM

One day runs from 06:00 to 10:00 in-game.

Target duration: approximately 180 real seconds.

Create:
- Animated clock
- Opening sequence
- Customer spawning
- Morning rush hour
- End-of-day summary
- Next-day transition

Pause the game fairly when the browser tab becomes hidden.

## CUSTOMER SYSTEM

Create five character archetypes:
- Office worker
- Motorbike taxi driver
- Student
- Elderly uncle
- Tourist

Each must have:
- Distinct 2D appearance
- Walking animation
- Idle behavior
- Order bubble
- Patience bar
- Happy reaction
- Angry reaction
- Unique Vietnamese dialogue

Use clear customer states:
ARRIVING, WALKING, SEATED, ORDERING, WAITING, SERVED, LEAVING.

Support multiple customers at the same time.

## CUSTOMER PATIENCE

Patience varies by customer type.

Show clear visual feedback:
- Green: relaxed
- Yellow: waiting
- Red: impatient
- Pulsing: near timeout

Customers can become impatient and leave.

Ensure timers are fair for manual coffee preparation.

Avoid unavoidable losses caused by excessive customer spawning.

## MULTITASKING GAMEPLAY

This is essential.

Coffee brews automatically after the player finishes physically preparing the phin.

While coffee is dripping, the player can:
- Prepare ingredients
- Use another brewing station
- Check customer orders
- Assemble another drink
- Serve a completed drink

Never block the entire interface while one cup is brewing.

Use independent preparation states for each active drink.

## RUSH HOUR

Between 07:00 and 08:30:
- More frequent customer arrivals
- Slightly more energetic ambient sound
- Animated rush-hour banner
- Increased pressure without unfair overload

Normal and rush-hour spawn rates must be configurable.

## COMBO SYSTEM

Implement streak-based rewards.

3 correct orders: COMBO x3

5 correct orders: SUPER COMBO

10 correct orders: HUYỀN THOẠI PHA PHIN

Each milestone needs:
- Special visual animation
- Floating reward text
- Distinct sound
- Bonus tips or money

Wrong orders or lost customers interrupt the streak.

## TIPS AND REVIEWS

Correct orders earn the listed menu price.

Drink quality affects tips.

Track:
- Revenue
- Tips
- Served customers
- Lost customers
- Perfect brews
- Best combo
- Reputation

Use a reasonable reputation model instead of instantly losing one full star for every mistake.

## DAY END SCREEN

Show:
- Revenue
- Tips
- Successful orders
- Lost customers
- Average rating
- Best combo
- Funny Vietnamese customer review

Allow the player to start the next day.

## BALANCING

Days 1–2 should be easy.

Introduce more simultaneous orders gradually.

Manual preparation should feel rewarding, not exhausting.

Test the relationship between brewing time, customer patience, and spawn intervals.

## ACCEPTANCE CRITERIA

- Several customers can appear simultaneously.
- Orders and patience work independently.
- Coffee preparation remains fully interactive.
- Multiple active drinks do not overwrite each other's state.
- Rush hour is noticeable.
- Combos calculate correctly.
- Daily results are accurate.
- Next-day transitions work.
- No duplicate serving rewards.
- No duplicate customer exits or reviews.

Make this a playable time-management game, not merely a drink-making sandbox.