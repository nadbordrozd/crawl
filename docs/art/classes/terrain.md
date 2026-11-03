# Terrain (floors) asset contract

Status: draft (2026-11-01, crawl-wup.2), under the approved
[ART_DIRECTION.md](../ART_DIRECTION.md). Set: `art/sets/floors`.

**2026-11-03 (crawl-9b1):** the user preferred the original `dirt18` floor, so
only the graveyard floors are live. The dungeon, egypt and cave variants were
withdrawn: their names are not in the manifest, so they keep the `dirt18`
fallback (their masters stay; derivations are in the set's `withdrawnOutputs`).

## Inventory

`scripts/sprites.js` `FLOOR_THEMES` names three variants per theme; each level
picks one at random per floor cell. Files: `assets/sprites/floor_<theme>_<n>.png`
(16x16, opaque), listed in `assets/sprites/manifest.json`.

| Theme | Level | Walls | Look |
| --- | --- | --- | --- |
| dungeon | most levels | DEFAULT (slate blue) | `dirt18` (generated dark slate cobbles withdrawn 2026-11-03) |
| graveyard | ZombieLevel | DEFAULT | near-black soil, sparse dark grass tufts (live) |
| egypt | CobraLevel | EGYPT (sandstone) | `dirt18` (generated dim ochre sand withdrawn 2026-11-03) |
| cave | TrollLevel | PREHISTORIC (purple-brown) | `dirt18` (generated dark purple rock withdrawn 2026-11-03) |

## Rules

- Dark and low contrast: the darkest tones sit near the old `dirt18` floor and
  the lightest stay below the walls' darkest mid tone, so every creature and
  item keeps reading and the fog cell (`darker_black`, black at 60 %) still
  visibly darkens the floor.
- The three variants of a theme share one set of tones (same base colour), so
  mixed variants show no tile grid; seams are checked in a 3x3 repeat and in a
  randomly mixed patch, not on a single tile.
- Detail is sparse: tufts, pebbles or cracks inside the tile, off its edges.

## Recipe (what worked)

- `generate-image-v2` at 32x32, opaque (`noBackground: false`), with the
  theme's wall cell scaled x2 as `styleImage` (`art/refs/wall-*-x2.png`,
  `color_palette: false`) and a 6-tone dark `target_palette` per theme
  (`shared.palettes`). One call returns 64 textures in one style at the pack's
  pixel size (1 px details).
- Deriving 16x16: `crop` a 16x16 window inside the take (the takes have a
  darker frame on their outer edge), then recorded `edits` that recolour the
  crop to the theme's final tones (graveyard lifted a step, egypt moved from
  red-brown to ochre and unified across variants) and fix seams or move
  details off the edge.
- What did not: `create-image-pixflux` (32 and 64 px, forced palette) draws a
  framed tile or panel with a border, vignette and centre motif, never an
  even field.
- Evidence: review sheet and in-game screenshots in the bead report.
