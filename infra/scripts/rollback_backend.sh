#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/opt/devdistro"
NGINX_ACTIVE="${DEPLOY_DIR}/nginx/active"
NGINX_CONF_DIR="${DEPLOY_DIR}/nginx"
RELEASES_DIR="${DEPLOY_DIR}/backend/releases"

# ── Find previous release ─────────────────────────────────────────────────────
LATEST=$(ls -t "${RELEASES_DIR}" | head -1)
PREVIOUS=$(ls -t "${RELEASES_DIR}" | sed -n '2p')

if [[ -z "${PREVIOUS}" ]]; then
  echo "ERROR: No previous release found"
  exit 1
fi

PREV_COLOR=$(cat "${RELEASES_DIR}/${PREVIOUS}/active_color")
CURR_COLOR=$(cat "${RELEASES_DIR}/${LATEST}/active_color")
PREV_IMAGE=$(cat "${RELEASES_DIR}/${PREVIOUS}/image")
ENV_FILE="${DEPLOY_DIR}/config/backend.env"

if [[ "${PREV_COLOR}" == "blue" ]]; then
  PREV_PORT=3101
else
  PREV_PORT=3102
fi

echo "==> Rolling back: ${CURR_COLOR} → ${PREV_COLOR}"
echo "==> Previous image: ${PREV_IMAGE}"

# ── Pull previous image ───────────────────────────────────────────────────────
docker pull "${PREV_IMAGE}"

# ── Start previous colour container ──────────────────────────────────────────
docker stop "backend-${PREV_COLOR}" 2>/dev/null && \
  docker rm  "backend-${PREV_COLOR}" 2>/dev/null || true
docker run -d \
  --name "backend-${PREV_COLOR}" \
  --network devdistro-internal \
  --restart unless-stopped \
  -p "127.0.0.1:${PREV_PORT}:3000" \
  --env-file "${ENV_FILE}" \
  "${PREV_IMAGE}"

# ── Wait for health ───────────────────────────────────────────────────────────
echo "==> Waiting for /readyz on port ${PREV_PORT}..."
MAX=30; N=0
until curl -sf "http://127.0.0.1:${PREV_PORT}/readyz" > /dev/null 2>&1; do
  N=$((N+1))
  if (( N >= MAX )); then echo "ERROR: rollback container unhealthy"; exit 1; fi
  sleep 2
done

# ── Switch Nginx ──────────────────────────────────────────────────────────────
ln -sfn "${NGINX_CONF_DIR}/upstream-${PREV_COLOR}.conf" "${NGINX_ACTIVE}"
sudo nginx -s reload
echo "==> Nginx switched back to ${PREV_COLOR}"

sleep 10

# ── Stop current container ────────────────────────────────────────────────────
docker stop "backend-${CURR_COLOR}" && docker rm "backend-${CURR_COLOR}" || true

# ── Rollback worker ───────────────────────────────────────────────────────────
docker stop backend-worker && docker rm backend-worker || true
docker run -d \
  --name backend-worker \
  --network devdistro-internal \
  --restart unless-stopped \
  --env-file "${ENV_FILE}" \
  "${PREV_IMAGE}" \
  node dist/worker.js

echo "==> Rollback complete. Active slot: ${PREV_COLOR}"
