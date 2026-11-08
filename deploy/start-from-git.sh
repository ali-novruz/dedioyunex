#!/bin/sh
# Runs inside node:24-bookworm on the VPS: fetch the repo, build once per commit (cached in /app volume), start.
# Started by the entrypoint in deploy/docker-compose.hostinger.yml.
set -eu
REPO="${GIT_REPO:-https://github.com/ali-novruz/dedioyunex}"
REF="${GIT_REF:-main}"
WHAT="${1:?platform|demo}"
SRC=/app/src

if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch --depth 1 origin "$REF"
  git -C "$SRC" reset --hard FETCH_HEAD
else
  git clone --depth 1 --branch "$REF" "$REPO" "$SRC"
fi
REV="$(git -C "$SRC" rev-parse HEAD)"
echo "[start] $WHAT @ $REV"

if [ "$WHAT" = "demo" ]; then
  exec node "$SRC/demo-partner/serve.mjs"
fi

OUT="$SRC/platform/.next/standalone/platform"
if [ "$(cat /app/built-rev 2>/dev/null || true)" != "$REV" ] || [ ! -f "$OUT/server.js" ]; then
  echo "[start] building $REV"
  cd "$SRC/platform"
  npm ci --ignore-scripts --no-audit --no-fund
  npm run build
  cp -r public "$OUT/"
  mkdir -p "$OUT/.next"
  cp -r .next/static "$OUT/.next/"
  echo "$REV" > /app/built-rev
fi
cd "$OUT"
export NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
exec node server.js
