#!/usr/bin/env bash
# Run from your local machine: bash infra/scripts/pull_logs.sh
set -euo pipefail

REMOTE="anurag@161.97.91.246"
KEY="${HOME}/.ssh/contabo-server"
OUT="./logs-$(date +%Y%m%d-%H%M%S)"
SINCE="48h"

mkdir -p "${OUT}"

echo "==> Pulling backend API logs (last ${SINCE})..."
ssh -i "${KEY}" "${REMOTE}" \
  "docker logs --since='${SINCE}' backend-blue 2>&1 || docker logs --since='${SINCE}' backend-green 2>&1" \
  > "${OUT}/backend-api.log" 2>&1 || echo "WARNING: Could not pull API logs"

echo "==> Pulling worker logs..."
ssh -i "${KEY}" "${REMOTE}" \
  "docker logs --since='${SINCE}' backend-worker 2>&1" \
  > "${OUT}/backend-worker.log" 2>&1 || echo "WARNING: Could not pull worker logs"

echo "==> Pulling cities logs..."
ssh -i "${KEY}" "${REMOTE}" \
  "docker logs --since='${SINCE}' cities 2>&1" \
  > "${OUT}/cities.log" 2>&1 || echo "WARNING: Could not pull cities logs"

echo "==> Pulling Nginx logs..."
ssh -i "${KEY}" "${REMOTE}" \
  "journalctl -u nginx --since='48 hours ago' --no-pager 2>/dev/null; \
   tail -n +1 /var/log/nginx/access.log /var/log/nginx/error.log 2>/dev/null || true" \
  > "${OUT}/nginx.log" 2>&1 || echo "WARNING: Could not pull Nginx logs"

echo "==> Done. Logs saved to ${OUT}/"
ls -lh "${OUT}/"
