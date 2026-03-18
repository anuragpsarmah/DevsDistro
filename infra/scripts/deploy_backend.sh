#!/usr/bin/env bash
set -euo pipefail

SHA="${1:?Usage: deploy_backend.sh <git-sha>}"
IMAGE="ghcr.io/anuragpsarmah/devdistro-backend:${SHA}"
DEPLOY_DIR="/opt/devdistro"
ENV_FILE="${DEPLOY_DIR}/config/backend.env"
NGINX_ACTIVE="${DEPLOY_DIR}/nginx/active"
NGINX_CONF_DIR="${DEPLOY_DIR}/nginx"

echo "==> Deploy started: ${SHA}"

# ── Determine active/inactive colour ─────────────────────────────────────────
ACTIVE=$(readlink "${NGINX_ACTIVE}" 2>/dev/null | grep -oP '(blue|green)') || ACTIVE="blue"
if [[ "${ACTIVE}" == "blue" ]]; then
  INACTIVE="green"; INACTIVE_PORT=3102; ACTIVE_PORT=3101
else
  INACTIVE="blue";  INACTIVE_PORT=3101; ACTIVE_PORT=3102
fi
echo "==> Active: ${ACTIVE} (${ACTIVE_PORT})  →  Candidate: ${INACTIVE} (${INACTIVE_PORT})"

# ── Pull image ────────────────────────────────────────────────────────────────
docker pull "${IMAGE}"

# ── Remove stale candidate container if present ──────────────────────────────
docker stop "backend-${INACTIVE}" 2>/dev/null && \
  docker rm  "backend-${INACTIVE}" 2>/dev/null || true

# ── Start candidate container ─────────────────────────────────────────────────
docker run -d \
  --name "backend-${INACTIVE}" \
  --network devdistro-internal \
  --restart unless-stopped \
  -p "127.0.0.1:${INACTIVE_PORT}:3000" \
  --env-file "${ENV_FILE}" \
  "${IMAGE}"

# ── Poll /readyz ──────────────────────────────────────────────────────────────
echo "==> Waiting for /readyz on port ${INACTIVE_PORT}..."
MAX=30; N=0
until curl -sf "http://127.0.0.1:${INACTIVE_PORT}/readyz" > /dev/null 2>&1; do
  N=$((N+1))
  if (( N >= MAX )); then
    echo "ERROR: /readyz never became healthy — aborting"
    docker stop "backend-${INACTIVE}" && docker rm "backend-${INACTIVE}"
    exit 1
  fi
  sleep 2
done
echo "==> Candidate is healthy"

# ── Atomic Nginx switch ───────────────────────────────────────────────────────
ln -sfn "${NGINX_CONF_DIR}/upstream-${INACTIVE}.conf" "${NGINX_ACTIVE}"
sudo nginx -s reload
echo "==> Nginx switched to ${INACTIVE}"

# ── Save release metadata ─────────────────────────────────────────────────────
RELEASE_DIR="${DEPLOY_DIR}/backend/releases/$(date +%Y%m%d-%H%M%S)-${SHA}"
mkdir -p "${RELEASE_DIR}"
echo "${INACTIVE}"  > "${RELEASE_DIR}/active_color"
echo "${ACTIVE}"    > "${RELEASE_DIR}/previous_color"
echo "${IMAGE}"     > "${RELEASE_DIR}/image"
echo "${SHA}"       > "${RELEASE_DIR}/sha"

# ── Drain window (let in-flight requests finish) ─────────────────────────────
sleep 10

# ── Stop old API container ────────────────────────────────────────────────────
docker stop "backend-${ACTIVE}" && docker rm "backend-${ACTIVE}" || true
echo "==> Stopped old container backend-${ACTIVE}"

# ── Recreate worker singleton on new image ────────────────────────────────────
docker stop backend-worker && docker rm backend-worker || true
docker run -d \
  --name backend-worker \
  --network devdistro-internal \
  --restart unless-stopped \
  --env-file "${ENV_FILE}" \
  "${IMAGE}" \
  node dist/worker.js
echo "==> Worker restarted on ${IMAGE}"

echo "==> Deploy complete. Active slot: ${INACTIVE}"
