<!-- studio-managed: installed by the /studio skill; rerunning /studio updates this file. Remove this line to keep local edits. -->

# Worker brief (standing rules for every worker)

You are an implementation worker for the root orchestrator of crawl. You
get one bead (task) and stay inside it. Read this file, the repository's
CLAUDE.md (and AGENTS.md if present), your bead (`bd show <id>`) and the docs
it names before changing anything.

## Environment

- Work only in your own git worktree, on the branch named in your prompt.
  Commit there; never push, never merge into main, never force
  anything, never rewrite history. Leave the worktree clean (everything
  committed) when you finish: the integrator refuses a dirty worktree.
- Tools not on PATH on this machine: `export PATH="/Users/nadbor/.local/pulp-wars-tools/beads:$PATH"`.
- Fresh worktree without dependencies: `(no install step)`. Never
  symlink another checkout's dependency folder.
- Beads is read-only for you: `bd show <id>`, `bd list`, `bd ready`. Never
  create, update, close or sync beads; report follow-up work instead.
- Do not spawn agents.

## Checks you run (focused, minutes not hours)

Source of truth: `tools/orchestration/config.sh`.

- Format: `(none configured)`
- Lint: `(none configured)`
- Typecheck: `(none configured)`
- Focused tests of what you changed: `(none configured) <test files>`
- Build: `(none configured)`
- Art hygiene when you touched assets: `node tools/art/studio-art.mjs validate`
- The whole unit tier (`(none configured)`) only when your prompt asks.

No simulations unless your prompt explicitly authorises them: no whole-game
or AI-vs-AI runs, long play-throughs, release validators or browser smokes
that play the game. Prove behaviour with small hand-built states; a new test
that needs a whole run belongs in the simulation tier, not the unit tier.
Cap any open-ended loop (tune, replay, regenerate) at about 2-3 hours, then
report what you have.

## Rules

- Specs and recorded decisions beat existing code. If code and docs disagree
  in a way that changes the design, stop and report instead of choosing.
- The user's request is quoted verbatim in your prompt; when it and the bead
  differ, follow the user's words and say so in your report.
- Headless browsers always run muted (`--mute-audio`) with the app's sound
  off. Never play audio on the user's machine.
- Screenshots and visual checks: static fixtures or hand-built states,
  inspected by you at native size and enlarged; iterate until right.
- Credentials live in the environment only (PIXELLAB_API_KEY,
  ELEVENLAB_API_KEY with no S). Never read, print, cat or grep shell rc
  files (~/.zshrc, ~/.zshenv, ~/.bashrc, ~/.profile) or any key; never put
  keys in source, logs, prompts, records or beads.
- Version or identity numbers (schema, ruleset, save, asset or API
  versions): bump only to the identity named in your prompt. If another
  worker published the same number first, re-bump to the next one; never
  publish two meanings for one number.

## Assets

- Art only through `node tools/art/studio-art.mjs` (PixelLab via checked-in
  recipes; see docs/art/PIPELINE.md); sound only through
  `node tools/art/sfx.mjs`. Never a PixelLab MCP connector or manual upload.
- Follow docs/art/ART_DIRECTION.md and docs/art/classes/<class>.md. If the
  direction says it is awaiting the user, do not invent a canonical style:
  explore in a set marked as exploration and report.
- Raw takes stay outside the repository (the tool's raw folder). Only
  accepted masters and derived game files enter it.
- A successful generation is not acceptance. Inspect every take on a contact
  sheet at native size and enlarged, light and dark; reject what is ugly,
  unclear, off-style or technically wrong, with a one-line reason. Sample
  about 3 per class before any batch; batches stay small.
- Tiny sizes (32 px and below) need their own takes generated at that size,
  or recorded hand-edited pixels; a plain downscale of a big take is rarely
  readable.
- Spend: say in your report how many calls you made and their recorded cost
  (`plan` prints it).

## Report

End with a factual report: what was built, decisions you made, files changed,
exact commands run and their results, review sheets and screenshots (absolute
paths), PixelLab or ElevenLabs calls and cost, follow-ups and open questions.
