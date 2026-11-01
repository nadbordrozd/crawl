# tools/orchestration/config.sh: studio orchestration settings for this repository.
# Owned by the project: /studio writes it once and never overwrites it (rerun
# /studio --refresh-config to regenerate it from detection). Sourced by
# integrate.sh, publish.sh and the session-start hook. No secrets here.
#
# Every CHECK_* command runs from the worktree root with `bash -c`; empty means
# "this repo has no such check" and the step is skipped.

MAIN_BRANCH="main"
REMOTE=""  # local-only on purpose: origin is the live GitHub Pages site; push by hand

# Dependencies for a fresh worktree: INSTALL_CMD runs when INSTALL_MARKER is missing.
INSTALL_CMD=""
INSTALL_MARKER=""

CHECK_FORMAT=""
CHECK_LINT=""
CHECK_TYPECHECK=""
# The routine unit tier: fast, never whole-game simulations.
CHECK_UNIT=""
CHECK_BUILD=""
# Focused tests: the test files named for a bead are appended to this command.
FOCUSED_TEST_CMD=""
# Asset hygiene: hash-checked masters and derived files (zero dependencies).
CHECK_ART="node tools/art/studio-art.mjs validate"

# What integrate.sh runs before publishing, in order (names of the checks above
# plus "focused"). Add "unit" for risky work; the whole unit tier otherwise
# runs as a deliberate batch gate.
INTEGRATE_STEPS="format lint typecheck focused art build"

# Where Claude Code's Agent tool puts worktrees (isolation: "worktree").
WORKTREE_ROOT=".claude/worktrees"

# Appended to every published commit message. Update it to the model in use.
COMMIT_TRAILER="Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# Extra PATH entries for tools that are not on PATH on this machine (node, bd).
# Entries that do not exist are harmless, so cloud sessions can share this file.
EXTRA_PATH="$HOME/.local/pulp-wars-tools/beads"
