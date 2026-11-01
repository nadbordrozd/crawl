#!/bin/bash
# studio-managed: installed by the /studio skill; rerunning /studio updates this file.
# Remove this line to keep local edits.
#
# publish.sh <branch> <bead-id|none> <commit message>
#
# Squash-merges a worker branch that already contains main onto main in the
# main checkout, commits with COMMIT_TRAILER, pushes, verifies that the remote
# main is the new commit, closes the bead and pushes the tracker. Without a git
# remote it commits locally and says so. Prints "HEAD=<sha> ..." on success.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
. "$HERE/config.sh"
export PATH="${EXTRA_PATH:+$EXTRA_PATH:}$PATH"
COMMON="$(git -C "$HERE" rev-parse --path-format=absolute --git-common-dir)" || exit 1
MAIN_REPO="$(dirname "$COMMON")"
[ "$#" -eq 3 ] || { echo "usage: publish.sh <branch> <bead-id|none> <message>"; exit 1; }
BR="$1"; BEAD="$2"; MSG="$3"
cd "$MAIN_REPO" || exit 1

[ "$(git branch --show-current)" = "$MAIN_BRANCH" ] || { echo "MAIN NOT CHECKED OUT in $MAIN_REPO"; exit 1; }
[ -z "$(git status --short | grep -v '^??')" ] || { echo "MAIN DIRTY (tracked changes in $MAIN_REPO)"; exit 1; }
HAS_REMOTE=0
git remote get-url "$REMOTE" > /dev/null 2>&1 && HAS_REMOTE=1
if [ "$HAS_REMOTE" = 1 ]; then
  git fetch -q "$REMOTE" || { echo "FETCH FAILED"; exit 1; }
  if git rev-parse -q --verify "$REMOTE/$MAIN_BRANCH" > /dev/null; then
    [ "$(git rev-parse "$MAIN_BRANCH")" = "$(git rev-parse "$REMOTE/$MAIN_BRANCH")" ] || { echo "MAIN DIFFERS FROM $REMOTE/$MAIN_BRANCH (pull or push first)"; exit 1; }
  fi
fi
[ "$(git merge-base "$MAIN_BRANCH" "$BR")" = "$(git rev-parse "$MAIN_BRANCH")" ] || { echo "BRANCH DOES NOT CONTAIN $MAIN_BRANCH (integrate.sh merges it first)"; exit 1; }
git merge -q --squash "$BR" || { git reset -q --hard HEAD; echo "SQUASH FAILED"; exit 1; }
if git diff --cached --quiet; then echo "NOTHING TO PUBLISH ($BR adds no change)"; exit 1; fi
git commit -q -m "$MSG

$COMMIT_TRAILER" || { echo "COMMIT FAILED"; exit 1; }
H="$(git rev-parse --short HEAD)"
if [ "$HAS_REMOTE" = 1 ]; then
  git push -q "$REMOTE" "$MAIN_BRANCH" || { echo "PUSH FAILED (local commit $H kept; fix and git push $REMOTE $MAIN_BRANCH)"; exit 1; }
  git fetch -q "$REMOTE"
  O="$(git rev-parse --short "$REMOTE/$MAIN_BRANCH")"
  [ "$H" = "$O" ] || { echo "REMOTE MISMATCH HEAD=$H $REMOTE/$MAIN_BRANCH=$O"; exit 1; }
  WHERE="$REMOTE/$MAIN_BRANCH=$O"
else
  WHERE="(no git remote: committed locally only)"
fi
TRACKER=""
if [ "$BEAD" != none ]; then
  if command -v bd > /dev/null 2>&1; then
    bd close "$BEAD" > /dev/null 2>&1 && TRACKER="closed $BEAD" || TRACKER="could not close $BEAD"
    if [ -n "$(bd dolt remote list 2>/dev/null | grep -v '^$')" ]; then
      bd dolt push > /dev/null 2>&1 && TRACKER="$TRACKER, tracker pushed" || TRACKER="$TRACKER, TRACKER PUSH FAILED (run bd dolt push)"
    fi
  else
    TRACKER="bd not found: close $BEAD by hand"
  fi
fi
echo "HEAD=$H $WHERE${TRACKER:+ ($TRACKER)}"
