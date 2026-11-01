# Art Direction

**Status: approved 2026-11-01 by the user** ("many of the assets are great and
cute but some are just random whatever I could find"): keep the existing
16x16 pack and make every new asset look like it belongs in it.

This file is the single shared direction for every visual asset. Class files
under [`classes/`](classes/) add constraints for one class and may specialise,
never contradict, this file. How assets are made is in
[PIPELINE.md](PIPELINE.md).

## 1. The style in one paragraph

Cute, chunky 16x16 fantasy-dungeon pixel art in the style of the game's
existing tileset (backterria's pack): small chibi creatures with big readable
heads and clear silhouettes, a single dark outline (near-black purple-brown,
not pure black) around every sprite, flat colour with one or two shade steps
per material, light from the upper left, saturated but not neon colours, no
dithering noise, no anti-aliased edges, transparent background, no ground
shadow or plate. Creatures face the viewer or slightly right in a 3/4 front
view and fill most of the 16x16 cell with 1px breathing room.

## 2. Shared rules for every asset

- Palette: saturated mid-tones with a darker and a lighter step per material;
  outlines `#1b1424`-ish; keep a creature to about 4-6 colours plus outline.
- Shading: flat with one shade step, light upper-left; no gradients.
- Readability first: each creature must be identifiable at native 16 px on the
  game's dark floor (`dirt18`, very dark blue-grey) and inside the fog overlay.
- Transparency: hard 1-bit alpha, no halo, no stray pixels.
- Mood: cheerful-spooky, never gory.

## 3. Geometry and resolution

- Native size 16x16 for creatures, items and tiles; the game draws them on a
  16 px grid scaled x1.6 by CSS.
- PixelLab cannot draw at 16 px (noise). Generate at 32x32 with
  `create-image-pixen` and derive 16x16 with `downscale` factor 2 plus
  recorded `edits` (eyes, outline gaps). Review the 16 px result, not the 32.
- Baked game files go to `assets/sprites/<sprite_name>.png`; a runtime loader
  (bead crawl-wup.4) overrides the matching `SPRITES` entry.
- Effects (explosions, hits, status) are drawn in code on a canvas layer
  (bead crawl-wup.5), using colours from this palette.

## 4. Decisions

| Date | Decision | Evidence |
| ---- | -------- | -------- |
| 2026-11-01 | Keep the existing pack; replace only sprites that fail the review in ASSET_INVENTORY.md "Refresh notes" | user request; contact sheet of all 127 used sprites |
| 2026-11-01 | Stay on the 16 px grid (no 32 px re-tile): mixing resolutions would clash with the kept sprites | ART_DIRECTION section 3 |
| 2026-11-01 | Effects are procedural canvas animation, not sprite frames | smoother at x1.6 CSS scale; no extra atlas frames |
