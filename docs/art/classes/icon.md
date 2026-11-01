# Icon (favicon) asset contract

Status: draft (2026-11-01, crawl-wup.3), under the approved
[ART_DIRECTION.md](../ART_DIRECTION.md). Set: `art/sets/favicon`.

- Files: `assets/favicon-16.png`, `-32.png`, `-48.png` (transparent) and
  `assets/apple-touch-icon.png` (180x180, opaque `#332745` plate), linked from
  `index.html`. No ICO.
- Specialisation of the direction: a favicon keeps a full dark outline (the
  take's `#17013d`) because a lineless light shape vanishes on a light browser
  tab; it must read at 16 px on `#f2f2f2` and `#202124`.
- Recipe: `create-image-pixen` 32x32, fragment `class-icon`. The 32 is the take
  as is; the 16 is `downscale` 2 plus recorded `edits` that redraw it in 10
  colours (eyes, glint, teeth); the 48 is the 16 at x3; the 180 is the 32 at x5
  on the plate.
- Accepted: `skull-a#0` (cute skull). Rejected keys: wider than tall, they
  shrink to a thin diagonal at 16 px.
