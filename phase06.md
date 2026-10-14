# PHASE 06 — RANDOM EVENTS, VIP CUSTOMERS & STORY

Continue the existing Phaser 3 coffee shop game.

Keep all implemented gameplay intact.

## GOAL

Create variety, surprise, personality, and memorable moments.

## RANDOM DAILY EVENTS

Implement events that affect actual gameplay.

### Rainy Morning
- Animated rain particles
- Darker ambient lighting
- Rain sound
- Lower customer arrival rate
- Increased tip potential

### Food Reviewer
- Special customer arrives
- Unique order dialogue
- Distinct animation
- Excellent service gives bonus reputation and money

### Power Outage
- Electric fan temporarily stops
- Lighting changes subtly
- Customers may become less patient
- Traditional phin brewing continues normally

### Neighborhood Festival
- Decorations appear
- More customers
- Cheerful ambience
- Higher rush-hour intensity

### Lucky Morning
- Increased tip chance
- Positive morning dialogue
- Small reward animation

Allow at most one major event per day initially.

Avoid unfair event combinations.

## VIP CUSTOMERS

Add special customer types:
- Food reviewer
- Local celebrity
- Popular content creator

Each VIP requires:
- Distinct appearance
- Unique entrance animation
- Special dialogue
- Clear visual indicator
- Higher rewards
- Appropriate patience

Serving a VIP should still require the standard physical drink preparation mechanics.

## RECURRING CHARACTERS

Implement three customers with multi-day stories.

### Chú Ba xe ôm
A hardworking driver who eventually saves enough money for a newer motorbike.

### Lan văn phòng
An office worker dealing with stressful meetings who eventually receives a promotion.

### Minh sinh viên
A student studying for exams who eventually shares good news.

Story progression depends on completed days and encounters.

Short conversations should appear naturally, without blocking the café workflow.

Provide skip controls for dialogue.

## FUNNY VIETNAMESE REVIEWS

Generate context-sensitive reviews based on:
- Drink quality
- Waiting time
- Accuracy
- Customer happiness

Examples:

5 stars:
"Cà phê ngon, ghế nhựa hơi thấp mà lòng vui quá!"

3 stars:
"Cà phê ổn, nhưng ngồi chờ tới thuộc bài nhạc luôn."

1 star:
"Tui gọi bạc xỉu mà sao uống giống đen đá vậy trời?"

Avoid repetitive dialogue by selecting from a variety of appropriate lines.

## ACCEPTANCE CRITERIA

- Events visibly alter the environment.
- Events actually modify gameplay values.
- VIP rewards work.
- Story progression persists.
- Dialogue can be skipped.
- Reviews reflect actual customer experience.
- Events do not break brewing or customer state.
- Existing game loop works normally.

Keep the atmosphere cozy, humorous, and distinctly Vietnamese.