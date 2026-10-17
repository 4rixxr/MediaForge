#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
for bin in node npm yt-dlp ffmpeg; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing $bin. See SETUP_LOCAL.md" >&2
    exit 1
  fi
done
[ -d node_modules ] || npm install
[ -d dist ] || npm run build
printf 'MediaForge available at http://127.0.0.1:8787\n'
node server.js
