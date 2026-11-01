# Creatures asset contract

Status: draft (2026-11-01, crawl-wup.1), under the approved
[ART_DIRECTION.md](../ART_DIRECTION.md). The orchestrator reviews it with the
first accepted set (`art/sets/creatures`).

## Inventory

The game draws every creature as a 16x16 cell. Kept cells come from the
third-party atlas `assets/tileset.png` (coordinates in `scripts/sprites.js`);
replaced cells are baked to `assets/sprites/<sprite_name>.png` and listed in
`assets/sprites/manifest.json`, which the override loader (crawl-wup.4) reads.

| Sprite | Source | Notes |
| --- | --- | --- |
| player, assassin, frog, mad_frog, rat, scorpion, cobra, audrey_2, imp, reaper, skeleton, orc, unicorn | atlas (kept) | the consistency bar for this class |
| flaming_horse, ninja, ghost, troll, zombie | `assets/sprites/<name>.png` from `art/sets/creatures` | replaced in crawl-wup.1 (misfits in ASSET_INVENTORY.md "Refresh notes") |

## Geometry

- Canvas 16x16, transparent, hard 1-bit alpha. No ground plate or shadow.
- Humanoids stand upright facing the viewer, about 11-15 px tall, feet on
  row 14 or 15, centred horizontally. Quadrupeds are seen from the side,
  facing **left** like the pack's unicorn, using the full 16 px width.
- Keep 1 px of air where the silhouette allows; a raised weapon, horn or
  flame may touch the edge (the pack's unicorn horn and reaper scythe do).

## Readability

- The game floor is near-black: `dirt18` (half-transparent specks) over the
  ROT display's black background, drawn x1.6 by CSS; the themed floors of
  crawl-wup.2/.4 (for example `floor_graveyard_*`) are similarly dark. Judge
  every sprite at x1 on that floor, not on the 32 px take, and once in the
  running game (`?debug`, `Game.nextLevel()`, music muted).
- The pack is **lineless**: it has no full dark contour (frog, skeleton,
  unicorn); the darkest tones `#332745`, `#374a7c` and `#5e2f58` appear only
  as shade, eyes and gaps. A dark outline disappears on the floor anyway, so
  the body must read by its own mid and light tones. This is how the class
  applies the direction's "single dark outline" rule: the outline colour is
  the pack's `#332745`, used selectively (eyes, shade side, separations), not
  as a full ring.
- Eyes are 1 px wide (1x1 or 1x2) dark pixels on a light face, or light on a
  dark mask; every creature has a readable face or head at x1.
- Colours come from the pack palette (25 colours measured from the kept
  sprites): `#fcfff1 #e3e8c5 #95b9d6 #68a3c9 #5b83a8 #4d5e84 #374a7c #2782b3
  #332745 #493c5c #6e5a5d #858971 #b5578d #934959 #7b3c58 #5e2f58 #6e4e98
  #ff8563 #ffbd51 #ffe250 #f1ab7a #cd8668 #b07d6a #63de53 #54ac8b`, plus the
  atlas red `#e3676e` (the old ninja's colour) for accents. About 4-6 colours
  per creature.
- Distinct from neighbours: the ninja is warm grey with a red scarf (the
  assassin is blue); the troll is olive grey-green with a club (the orc is
  bright green); the zombie is pale green with light clothes.

## Recipe

- Fragments `style` + `class-creatures` (+ `class-creatures.negative`).
- What worked: `generate-image-v2` at 32x32 with a kept pack sprite scaled x2
  as `styleImage` (`styleOptions.color_palette: false`) and the pack palette
  as `target_palette` (recipe `options`). It returns 64 candidates per call,
  already in the pack's proportions and palette (each candidate needs a
  verdict; reject the siblings with the reason they lost). A call takes 3-8
  minutes. References are scratch crops outside the repository; records
  keep their sha256. `target_palette` with `styleOptions.color_palette: true`
  is refused (HTTP 422).
- What did not: `create-image-pixen` at 32x32 draws big-headed chibis with a
  heavy black outline that halve into mud; `view: side` on pixen still stood
  the horse up on two legs.
- Deriving 16x16: the tool's `downscale` (alpha-weighted mean) blends the
  32 px outline into every edge block, so the 16 px game file is the
  downscale plus recorded `edits` that hand-pixel the result in the pack
  palette (silhouette from the take, eyes, legs, lighter tones for the dark
  floor). In practice the edits redraw most pixels: treat the 16 px file as
  hand-finished art guided by the take, and review it, not the take.

## Acceptance

Beyond the shared checklist:

- Identifiable at x1 on the dirt18 floor, next to the kept sprites, with no
  body part lost in the dark (legs, dark clothes).
- Pack palette only (plus `#e3676e`), lineless look, no stray or
  semi-transparent pixels.
- Same scale as the kept creature it resembles most (unicorn for the horse,
  orc/skeleton for humanoids).
