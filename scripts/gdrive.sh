#!/usr/bin/env bash
# Google Drive for Lumin Studio: every take, render, export and repo backup lives in the channel's own top-level
# Drive folder "Lumin-Studio" (id below; created 23 NOV 2026). Nothing heavy is ever committed to git.
#
#   scripts/gdrive.sh up   [--sub <path>] FILE [FILE ...]   upload into Lumin-Studio/<path>/, prints a view link each
#   scripts/gdrive.sh pull <path> <local dir>               copy Lumin-Studio/<path>/ down
#   scripts/gdrive.sh sync <local dir> <path>               mirror a local folder up (text folders of an episode)
#   scripts/gdrive.sh ls   [<path>]
#
# Layout: Lumin-Studio/episodes/<id>/{blocks,audio,renders,repo}/ · Lumin-Studio/_Backups/lumin-studio/
# Needs GDRIVE_RCLONE_TOKEN (the JSON `rclone authorize "drive"` prints). Session: an environment variable. GitHub:
# the repo secret of the same name (Termux one-liner in CLAUDE.md §2A). rclone is a pinned binary cached in .cache/.
set -euo pipefail
RCLONE_VER=v1.71.1
ROOT=$(cd "$(dirname "$0")/.." && pwd)
CACHE="$ROOT/.cache/rclone"
FOLDER_ID=${LUMIN_DRIVE_FOLDER_ID:-1d6YOipH7yiKxiBOZTNzNhBF2X229XZsC}
cmd=${1:-}; shift || true
[[ -n ${GDRIVE_RCLONE_TOKEN:-} ]] || { echo "GDRIVE_RCLONE_TOKEN is not set (CLAUDE.md §2A)" >&2; exit 3; }
RCLONE="$CACHE/rclone-$RCLONE_VER-linux-amd64/rclone"
if [[ ! -x $RCLONE ]]; then
  mkdir -p "$CACHE"
  curl -sSL -m 300 -o "$CACHE/rclone.zip" "https://downloads.rclone.org/$RCLONE_VER/rclone-$RCLONE_VER-linux-amd64.zip"
  (cd "$CACHE" && unzip -q -o rclone.zip && rm rclone.zip)
fi
# A token pasted through an app's secret field can lose its JSON wrapping; rebuild it (only the refresh token matters).
TOKEN=$(python3 - <<'PY'
import json, os, re
t = os.environ["GDRIVE_RCLONE_TOKEN"].strip()
try:
    json.loads(t); print(t)
except ValueError:
    rt = re.search(r'refresh_token"?\s*:\s*"?([^",}\s]+)', t)
    if not rt:
        raise SystemExit("GDRIVE_RCLONE_TOKEN has no refresh_token; run rclone authorize again")
    print(json.dumps({"access_token": "", "token_type": "Bearer", "refresh_token": rt.group(1),
                      "expiry": "2000-01-01T00:00:00Z"}))
PY
)
export RCLONE_CONFIG_GD_TYPE=drive RCLONE_CONFIG_GD_SCOPE=drive RCLONE_CONFIG_GD_TOKEN="$TOKEN"
export RCLONE_CONFIG_GD_ROOT_FOLDER_ID="$FOLDER_ID" RCLONE_CONFIG=/dev/null
R=("$RCLONE" --retries 4 --low-level-retries 10 --stats-one-line --stats 30s)
case "$cmd" in
  up)
    SUB=""; if [[ ${1:-} == --sub ]]; then SUB=$2; shift 2; fi
    [[ $# -ge 1 ]] || { echo "nothing to upload" >&2; exit 2; }
    for f in "$@"; do
      name=$(basename "$f")
      "${R[@]}" copyto --drive-chunk-size 64M "$f" "gd:${SUB}/$name" >&2
      id=$("$RCLONE" lsjson --stat --no-mimetype "gd:${SUB}/$name" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ID"])')
      echo "$name  https://drive.google.com/file/d/$id/view"
    done ;;
  pull) mkdir -p "$2"; "${R[@]}" copy "gd:$1" "$2"; ls -la "$2" ;;
  sync) "${R[@]}" sync --exclude "assets/**" --exclude "audio/**" "$1" "gd:$2" ;;
  ls)   "$RCLONE" lsf "gd:${1:-}" ;;
  *)    sed -n 2,13p "$0"; exit 2 ;;
esac
