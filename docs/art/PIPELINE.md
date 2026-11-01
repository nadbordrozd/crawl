<!-- studio-managed: installed by the /studio skill; rerunning /studio updates this file. Remove this line to keep local edits. -->

# Asset pipeline

How assets are made here. The direction (what they look like) is in
[ART_DIRECTION.md](ART_DIRECTION.md) and [classes/](classes/); the current
assets are listed in [ASSET_INVENTORY.md](ASSET_INVENTORY.md) when the
project had graphics before the studio was set up.

The tools are zero-dependency Node scripts in `tools/art/` (Node 18+); they
never add packages to the project. Keys come from the environment only:
`PIXELLAB_API_KEY` for art, `ELEVENLAB_API_KEY` (no S) for sound.

## Files

| Path | What | In git |
| --- | --- | --- |
| `art/fragments/<name>.txt`, `<name>.negative.txt` | prompt layers: `style` (from the approved direction), `class-<class>`, light, camera | yes |
| `art/sets/<set>/recipes.json` | the requests: id, concept, endpoint, size, seed, fragments, subject, negatives, options, references, outputs | yes |
| `art/sets/<set>/records.json` | written by `generate`: the exact credential-free request, job id, cost, every candidate's hash | yes |
| `art/sets/<set>/verdicts.json` | `accept` / `reject` with a one-line reason per take | yes |
| `art/masters/<set>/<id>-<n>.png` | accepted takes, byte-identical to the recorded candidate | yes |
| `art/costs.jsonl` | one line per provider call with its US$ cost | yes |
| `~/.studio-raw/<repo> (or $STUDIO_RAW_DIR)/<set>/` | every raw take, lossless | **no** (outside the repo) |
| the game's own paths (`outputs[].path`) | files derived from masters by `bake` | yes |

## Commands

```sh
node tools/art/studio-art.mjs new-set hero --class characters
node tools/art/studio-art.mjs prompt hero hero-a          # the exact text PixelLab gets
node tools/art/studio-art.mjs generate hero hero-a hero-b hero-c --dry-run
node tools/art/studio-art.mjs generate hero hero-a hero-b hero-c   # calls PixelLab (max 4 per run unless --max)
node tools/art/studio-art.mjs sheet /tmp/hero.png --set hero       # native + enlarged, light + dark
node tools/art/studio-art.mjs accept hero hero-b 0 --notes "clearest silhouette"
node tools/art/studio-art.mjs reject hero hero-a 0 --notes "ground plate under the feet"
node tools/art/studio-art.mjs bake hero                            # derive outputs[] into the game
node tools/art/studio-art.mjs validate                             # hashes, verdicts, derivations, no keys
node tools/art/studio-art.mjs plan                                 # status and spend of every set
node tools/art/studio-art.mjs inventory --write docs/art/ASSET_INVENTORY.md
node tools/art/sfx.mjs plan | generate --only ui.click | accept ui.click 1 --notes "..." | validate
```

`generate` never repeats a recorded recipe: to try again, add a new recipe
id with a new seed (a new take is a new id; history stays). An interrupted
asynchronous job is finished with `resume <set> <id>`.

## Recipes

```json
{
  "set": "hero",
  "class": "characters",
  "exploration": false,
  "shared": { "opts": { "outline": "single color black outline", "detail": "low detail", "view": "side", "direction": "south-east" } },
  "defaults": { "endpoint": "create-image-pixen", "fragments": ["style", "class-characters"], "noBackground": true, "options": "@opts", "negative": "text, frame, ground plate" },
  "recipes": [
    { "id": "hero-a", "concept": "HERO", "width": 64, "height": 64, "seed": 1001, "subject": "Subject: ..." },
    { "id": "hero-a-edit", "endpoint": "edit-image-pixen", "fragments": [], "width": 64, "height": 64, "seed": 1, "edit": { "take": "hero-a#0" }, "subject": "Remove the ground under the feet" },
    { "id": "hero-v2", "endpoint": "generate-image-v2", "width": 64, "height": 64, "seed": 7, "styleImage": { "take": "hero-a#0", "usage": "copy palette and outline only" }, "subject": "..." }
  ],
  "outputs": [
    { "path": "assets/sprites/hero.png", "from": "hero-a#0" },
    { "path": "assets/sprites/hero-small.png", "from": "hero-a#0", "steps": [{ "op": "downscale", "factor": 2 }, { "op": "edits", "pixels": [[9, 3, "#311b0e"]] }], "width": 32, "height": 32 }
  ]
}
```

`"@name"` values come from `shared`. The description is the fragments, then
the subject, then `Must not include: <negatives>` (no endpoint honours a
separate negative field). Output steps: `crop {x,y,width,height}`,
`scale {factor}` (nearest), `downscale {factor}` (pixel-art aware),
`edits {pixels: [[x,y,"#rrggbb"|"transparent"]]}`, `plate {size,scale,background}`,
`pad {width,height,anchor}`, `flipX`. Only PNG outputs are derived.

## PixelLab endpoints (v2, `https://api.pixellab.ai/v2`, docs at `/v2/llms.txt`)

| Endpoint | Use | Limits |
| --- | --- | --- |
| `create-image-pixen` | default for sprites, icons, buildings; synchronous; options `outline`, `detail`, `view` (side, low top-down, high top-down), `direction` | sides multiple of 4, 16..512x512 area, square below 32, transparent up to 65,536 px |
| `edit-image-pixen` | change an accepted take ("remove the ground plate") | async job, sides multiple of 4, max 256x256 |
| `create-image-pixflux` | flat-shaded fields and terrain; `shading`, `color_image` forced palette (`colorImage`) | max 400 px a side; not deterministic |
| `generate-image-v2` | style transfer from an accepted take (`styleImage`), up to 4 `references` | async job |
| `GET /balance` | remaining credits (`balance`) | |

Typical cost: under US$0.01 per small Pixen image (2026-10).

## Workflow for a class

1. **Explore** (direction not approved): 2-3 concepts x 2-3 seeds in an
   exploration set; one contact sheet; the orchestrator (or user, when the
   direction is theirs to set) picks.
2. **Record the direction**: the paragraph in ART_DIRECTION.md, the class
   file, and the same words in `fragments/style.txt` and `class-<class>.txt`.
3. **Sample**: about 3 representative assets of the class, each reviewed at
   native size and enlarged on light and dark; reject and re-roll (new id,
   new seed or adjusted subject) until at least 3 pass.
4. **Batch**: small coherent families with the stable recipe; review the
   batch as one contact sheet; inspect suspects individually.
5. **Wire in**: `outputs[]` + `bake`, then look at it in the running game.
6. **Validate**: `validate` must pass before publishing.
