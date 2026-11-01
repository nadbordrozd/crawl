# crawl agent instructions

<!-- studio:begin (managed by the /studio skill: rerun /studio to update this block in place; put project-specific rules outside it) -->

## Studio workflow

This repository runs the studio workflow: one root orchestrator, one worker
per bead, Beads for tracking, a serial background integrator, and a
recipe-driven PixelLab asset pipeline. Durable orchestration files live in
the repository (`tools/orchestration/`, `tools/art/`, `docs/art/`), never only
in a temporary or scratchpad folder; local state goes to `.orchestration/`
(git-ignored).

### Roles

- **Orchestrator (the root session).** Owns task decomposition, Beads state,
  delegation, review, validation and publication. It does not implement game
  code, assets or documentation itself: each implementation bead goes to a
  worker. It makes design, naming and art calls itself instead of asking,
  records each call in the bead or a doc, and mentions notable ones in one
  line so the user can overrule. It keeps its own turns short so the chat
  stays free; long work runs in workers and background commands.
- **Workers.** Spawned with the Agent tool, `isolation: "worktree"`, a branch
  `w/<bead-id>`, and a prompt that says: read
  `tools/orchestration/WORKER_BRIEF.md` first; the bead id; scope and
  acceptance criteria; the exact focused tests; whether simulations are
  authorised (normally not); and the user's request **pasted verbatim**.
  Workers do not spawn agents, push, merge, or touch Beads state.
  Independent beads may run in parallel in separate worktrees; integration is
  serialised.

### Loop

1. Start of session: `bd prime`, then `bd dolt pull` if a Dolt remote is
   configured; inspect in-progress, ready and blocked work.
2. Resume an actionable in-progress leaf first, else the highest-priority
   ready one. Before delegating, give the bead concrete scope, acceptance
   criteria, dependencies and a validation block, then `bd update <id> --claim`.
3. Spawn the worker; when it reports, review its diff (`git -C <worktree>
   diff main...`), outputs and evidence yourself. Corrections go
   back to the same worker (SendMessage); the next bead gets a fresh worker.
4. Publish in the background: run with `run_in_background`
   `tools/orchestration/integrate.sh <worktree> <branch> <bead-id> "<message>" [focused test files]`.
   It queues on a lock, merges main into the branch, runs the
   checks, squash-publishes to main, pushes, verifies the remote,
   closes the bead and pushes the tracker. Read the one-line outcome in
   `.orchestration/integrate.log`:
   `PUBLISHED` done; `CONFLICT` or `FAIL` goes back to the worker. When two
   workers claim the same version or identity number, publish one and have
   the other re-bump.
5. Never start dependent work before its prerequisite is PUBLISHED. Open
   follow-up beads for discovered work instead of widening a worker's scope;
   record dependencies with `bd dep add`.

### Validation

Standing rule: **no simulations unless the user asks** (whole-game or AI
runs, long play-throughs, release validators, browser smokes that play the
game). Per bead, the worker runs focused checks; the integrator runs
`INTEGRATE_STEPS` from `tools/orchestration/config.sh`; the whole unit tier
and heavier gates run as a deliberate batch gate across several changes, in
the background, and the orchestrator says when it last ran.

Commands for this repo (source of truth: `tools/orchestration/config.sh`):
format `(none configured)`, lint `(none configured)`, typecheck
`(none configured)`, unit tier `(none configured)`, build `(none configured)`,
focused tests `(none configured) <files>`, assets
`node tools/art/studio-art.mjs validate`.

Each bead names one profile, in its design or notes:

```text
Validation profile: <docs/tracker | asset-only | ui | logic | cross-cutting>
Worker focused checks: <exact commands>
Conditional final gates: <exact commands and trigger, or none>
```

| Profile        | Scope                                                         | Gates before publishing                                                                                 |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `docs/tracker` | Beads-only changes, prose and decision docs                   | format check of changed files; links and command examples verified                                      |
| `asset-only`   | Rasters, sounds, recipes, records, review evidence            | `node tools/art/studio-art.mjs validate` (and `sfx.mjs validate`); contact sheet reviewed by the orchestrator |
| `ui`           | Layout, rendering, input, accessibility, animation            | format, lint, typecheck, focused tests, build; a muted browser screenshot check when visible behaviour changed |
| `logic`        | Rules, state, data, persistence, APIs                         | format, lint, typecheck, focused tests, build; the unit tier when the change is broad                  |
| `cross-cutting`| Dependencies, lockfiles, toolchain, CI, security, releases    | everything above plus the unit tier; simulations and audits only when the user authorises them         |

Every profile includes the orchestrator's own review of the diff, changed
outputs, `git status --short` and `git diff --check`, and a check that no
credential, secret or unrelated user work is included. Changed visuals get
the orchestrator's own look at native size and enlarged. Record unexpected
catches as a bead comment:
`bd comments add <id> 'VALIDATION_CATCH detector="<worker|root-diff|integrator|browser>" defect="..." regression="..." follow_up="<bead-id|none:fixed-here>"'`.

### Publishing

Always publish completed work: after review and gates, the integrator
squash-commits on main, pushes with `git push origin main`,
and verifies the remote resolves to the new commit. Work is not complete,
and dependent work does not start, until that push succeeds. A failed push
keeps its local commit and is retried after fixing the cause; never
force-push or rewrite shared history unless the user asks. Stage only the
bead's reviewed scope; never include unrelated user changes.

### Tracker

Beads (`bd`) holds all durable task state: no markdown TODO lists, no ad hoc
memory files (`bd remember` for durable notes). The tracker is local (no Dolt remote yet); rerun /studio after adding a git remote to wire sync. The
orchestrator alone claims, closes, changes dependencies and syncs
(`bd dolt pull` at session start, `bd dolt push` after tracker changes).
Never force-push the tracker; on a conflict, stop and surface it.

### Assets

- Direction has two levels: `docs/art/ART_DIRECTION.md` (shared by every
  asset) and `docs/art/classes/<class>.md` (may specialise, never
  contradict). Until the user approves a direction, explore but do not
  invent a canonical style.
- Production assets come only from the checked-in tools: `tools/art/studio-art.mjs`
  (PixelLab) and `tools/art/sfx.mjs` (ElevenLabs); see `docs/art/PIPELINE.md`.
  Keys come from the environment (PIXELLAB_API_KEY, ELEVENLAB_API_KEY) and
  are never read from shell rc files, printed or stored.
- Every request is a recipe (prompt layers, size, seed, options); records
  keep the exact credential-free request, job id, cost and candidate hashes;
  raw takes stay outside the repository; verdicts are recorded with a reason;
  accepted masters are byte-identical to their recorded take; game files are
  derived from masters and `validate` re-derives them.
- A successful generation is not acceptance. Sample about three per class,
  review each at native size and enlarged on light and dark, batch only once
  the recipe is stable, review batches as contact sheets, and inspect
  suspects individually. The orchestrator reviews accepted outputs before
  the bead closes.

### Working preferences (the user's standing rules)

- Decide design and art questions yourself; record them; one-line notice.
- Per-task tests take minutes; heavy gates are batched and run on purpose.
- No simulations unless asked. Headless browsers always `--mute-audio`.
- Open-ended work runs in iterations of at most 2-3 hours that each publish.
- Admin work (merging, publishing, syncing) runs in the background.
<!-- studio:end -->

## Project rules (Vibe Crawler)

- **Publishing is local-only.** `origin` (github.com/nadbordrozd/crawl) serves
  the live game on GitHub Pages, so `REMOTE=""` in
  `tools/orchestration/config.sh`: the integrator commits to local `main` and
  never pushes. The user pushes by hand. This overrides "pushes with
  `git push origin main`" in the studio block above.
- **The tracker is local.** The Beads database has no Dolt remote on purpose;
  do not add one, and do not run `bd dolt push`. Rerunning `/studio` without
  `--no-beads` would wire and push one, so always pass `--no-beads`.
- The game is static vanilla JS (no build). Open `index.html` through a local
  static server to test; headless browsers stay muted.
