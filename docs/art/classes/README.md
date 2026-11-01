# Asset class contracts

One file per asset class (for example `units.md`, `terrain-tiles.md`,
`ui.md`, `effects.md`, `portraits.md`). A class file adds constraints to
[`../ART_DIRECTION.md`](../ART_DIRECTION.md) and may specialise, never
contradict, it. **Status: awaiting user direction**: create a class file
when its first set is planned, from this outline:

```markdown
# <Class> asset contract

Status: draft | approved (date, by the user)

## Inventory
Every asset of the class, its native size, where the game loads it.

## Geometry
Canvas, content box, anchor, how it sits on the board or screen.

## Readability
Silhouette at native size, smallest display size, light and dark backgrounds.

## Recipe
Endpoint, options (outline, detail, view, direction), fragments, negatives,
what worked and what did not (keep this list short and current).

## Acceptance
Class-specific checks beyond the shared ones (tiles: seamless 3x3 repeat;
icons: legible at the smallest size; sprites: no ground plate).
```
