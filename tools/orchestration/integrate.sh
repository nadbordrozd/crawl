#!/bin/bash
# studio-managed: installed by the /studio skill; rerunning /studio updates this file.
# Remove this line to keep local edits.
#
# integrate.sh <worktree> <branch> <bead-id|none> <commit message> [focused test files...]
#
# The serial background integrator. Run it from the main checkout with the
# Bash tool's run_in_background, one call per finished worker; calls queue on a
# lock so publications never interleave. It merges main into the worker
# branch (inside the worker's worktree), runs INTEGRATE_STEPS from config.sh,
# then publish.sh squash-publishes to main, pushes, verifies the remote, closes
# the bead and syncs the tracker. One line per outcome goes to
# .orchestration/integrate.log; full check output to .orchestration/out/.
#
# Exit codes: 0 PUBLISHED, 1 setup problem, 2 CONFLICT (send back to the
# worker: merge main and resolve), 3 a check FAILED (send back to the worker),
# 4 publish failed (see the message; the local commit is kept when the push failed).
# SKIP_CHECKS=1 skips the checks (the branch was already checked on this main).
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
. "$HERE/config.sh"
export PATH="${EXTRA_PATH:+$EXTRA_PATH:}$PATH"
COMMON="$(git -C "$HERE" rev-parse --path-format=absolute --git-common-dir)" || exit 1
MAIN_REPO="$(dirname "$COMMON")"
STATE="${STUDIO_STATE_DIR:-$MAIN_REPO/.orchestration}"
mkdir -p "$STATE/out"
LOG="$STATE/integrate.log"

[ "$#" -ge 4 ] || { echo "usage: integrate.sh <worktree> <branch> <bead-id|none> <message> [tests...]"; exit 1; }
WT="$1"; BR="$2"; BEAD="$3"; MSG="$4"; shift 4
case "$WT" in
  /*) W="$WT" ;;
  */*) W="$MAIN_REPO/$WT" ;;
  *) W="$MAIN_REPO/$WORKTREE_ROOT/$WT" ;;
esac
SAFE_BR="$(echo "$BR" | tr '/ ' '__')"
OUT="$STATE/out/integrate-$SAFE_BR.out"
say() { echo "$(date '+%Y-%m-%d %H:%M:%S') $BR $*" >> "$LOG"; echo "$BR $*"; }

# Serial queue: one integration at a time. A lock left by a dead process is broken.
LOCK="$STATE/integrate.lock"
until mkdir "$LOCK" 2>/dev/null; do
  holder="$(cat "$LOCK/pid" 2>/dev/null || true)"
  if [ -n "$holder" ] && ! kill -0 "$holder" 2>/dev/null; then rm -rf "$LOCK"; continue; fi
  sleep 5
done
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT

cd "$W" 2>/dev/null || { say "FAIL no worktree at $W"; exit 1; }
[ "$(git branch --show-current)" = "$BR" ] || { say "FAIL worktree $W is not on branch $BR"; exit 1; }
if [ -n "$(git status --short | grep -v '^??')" ]; then say "FAIL dirty worktree (worker must commit everything)"; exit 1; fi
if ! git merge -q --no-ff --no-edit "$MAIN_BRANCH" > "$OUT" 2>&1; then
  FILES="$(git diff --name-only --diff-filter=U | tr '\n' ' ')"
  git merge --abort 2>/dev/null
  say "CONFLICT $FILES(merge $MAIN_BRANCH into $BR and resolve in the worktree, then integrate again)"
  exit 2
fi

run_step() {
  local name="$1" cmd="$2"
  [ -n "$cmd" ] || return 0
  if ! bash -c "$cmd" > "$OUT" 2>&1; then
    say "FAIL $name: $(grep -m 3 -iE 'error|fail|✗|×' "$OUT" | tr '\n' ' ' | cut -c1-300) (full output: $OUT)"
    exit 3
  fi
}

if [ "${SKIP_CHECKS:-0}" != 1 ]; then
  if [ -n "$INSTALL_CMD" ] && [ -n "$INSTALL_MARKER" ] && [ ! -e "$INSTALL_MARKER" ]; then
    bash -c "$INSTALL_CMD" > "$OUT" 2>&1 || { say "FAIL install ($INSTALL_CMD)"; exit 3; }
  fi
  for step in $INTEGRATE_STEPS; do
    case "$step" in
      format) run_step format "$CHECK_FORMAT" ;;
      lint) run_step lint "$CHECK_LINT" ;;
      typecheck) run_step typecheck "$CHECK_TYPECHECK" ;;
      unit) run_step unit "$CHECK_UNIT" ;;
      build) run_step build "$CHECK_BUILD" ;;
      art) [ -f tools/art/studio-art.mjs ] && run_step art "$CHECK_ART" ;;
      focused)
        if [ "$#" -gt 0 ] && [ -n "$FOCUSED_TEST_CMD" ]; then
          if ! bash -c "$FOCUSED_TEST_CMD \"\$@\"" focused "$@" > "$OUT" 2>&1; then
            say "FAIL focused tests: $(grep -m 3 -iE 'fail|error' "$OUT" | tr '\n' ' ' | cut -c1-300) (full output: $OUT)"
            exit 3
          fi
        fi ;;
      *) say "FAIL unknown INTEGRATE_STEPS entry $step"; exit 1 ;;
    esac
  done
fi

RESULT="$("$HERE/publish.sh" "$BR" "$BEAD" "$MSG" 2>&1)"
if echo "$RESULT" | grep -q "^HEAD="; then
  say "PUBLISHED $(echo "$RESULT" | grep '^HEAD=')"
else
  say "FAIL publish: $(echo "$RESULT" | tail -2 | tr '\n' ' ')"
  exit 4
fi
