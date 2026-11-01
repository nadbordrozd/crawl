#!/bin/bash
# studio-managed: installed by the /studio skill; rerunning /studio updates this file.
# Remove this line to keep local edits.
#
# SessionStart hook for Claude Code cloud sessions (CLAUDE_CODE_REMOTE=true).
# Every cloud container starts from a fresh clone, so this prepares it:
#   1. project dependencies (INSTALL_CMD from tools/orchestration/config.sh),
#   2. the Beads CLI when it is missing (npm install -g @beads/bd),
#   3. local Beads settings (beads.role, .beads permissions),
#   4. the tracker database, cloned with `bd bootstrap` only when no local
#      database exists (bootstrap seeds from the remote's refs/dolt/data),
#   5. the tracker sync branch: the Dolt origin remote gets
#      git_ref=refs/heads/beads-data (cloud sessions cannot push refs/dolt/*),
#      then `bd dolt pull`.
# Idempotent, non-interactive, never deletes a tracker database, never pushes,
# never prints environment variables. Local sessions exit at once.
set -uo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}" || exit 0
log() { echo "[session-start] $*"; }
status=0
BD_VERSION="${BD_VERSION:-1.3.1}"
DATA_REF="refs/heads/beads-data"

if [ -f tools/orchestration/config.sh ]; then
  # shellcheck source=/dev/null
  . tools/orchestration/config.sh
  if [ -n "${INSTALL_CMD:-}" ]; then
    log "dependencies: $INSTALL_CMD"
    bash -c "$INSTALL_CMD" > /dev/null 2>&1 || { log "dependency install failed"; status=1; }
  fi
fi

if ! command -v bd > /dev/null 2>&1 && command -v npm > /dev/null 2>&1; then
  log "installing @beads/bd@$BD_VERSION"
  npm install -g --no-audit --no-fund "@beads/bd@$BD_VERSION" > /dev/null 2>&1 || status=1
fi
command -v bd > /dev/null 2>&1 || { log "bd unavailable; tracker not prepared"; exit "$status"; }
[ -d .beads ] || exit "$status"

git config beads.role maintainer
chmod 700 .beads

db="$(node -e 'try{const m=require("./.beads/metadata.json");process.stdout.write(m.dolt_database||"")}catch{}' 2>/dev/null)"
dbdir=".beads/embeddeddolt/${db:-x}"
if [ -z "$db" ] || [ ! -d "$dbdir" ]; then
  log "restoring tracker (bd bootstrap)"
  bd bootstrap --yes > /dev/null 2>&1 || { log "bd bootstrap failed"; status=1; }
  db="$(node -e 'try{const m=require("./.beads/metadata.json");process.stdout.write(m.dolt_database||"")}catch{}' 2>/dev/null)"
  dbdir=".beads/embeddeddolt/${db:-x}"
fi

state="$dbdir/.dolt/repo_state.json"
if [ -f "$state" ]; then
  if node -e '
    const fs = require("fs");
    const [file, ref] = process.argv.slice(1);
    const s = JSON.parse(fs.readFileSync(file, "utf8"));
    const o = s.remotes && s.remotes.origin;
    if (!o) process.exit(3);
    if (o.params && o.params.git_ref === ref) process.exit(0);
    o.params = { ...(o.params || {}), git_ref: ref };
    fs.writeFileSync(file + ".tmp", JSON.stringify(s, null, 2));
    fs.renameSync(file + ".tmp", file);
  ' "$state" "$DATA_REF"; then
    if out="$(bd dolt pull 2>&1)"; then log "tracker pulled from $DATA_REF"
    elif echo "$out" | grep -q "no branches found in remote"; then log "$DATA_REF not on the remote yet"
    else log "bd dolt pull failed: $(echo "$out" | tail -n 3 | tr '\n' ' ')"; status=1; fi
  else
    log "no Dolt origin remote; tracker stays local"
  fi
fi
exit "$status"
