#!/usr/bin/env bash
set -euo pipefail

BUCKET="${MONGO_BACKUP_BUCKET:?Set MONGO_BACKUP_BUCKET env var}"
PREFIX="devdistro/mongodb"
MAX_SNAPSHOTS=4
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_KEY="${PREFIX}/backup-${TIMESTAMP}.archive.gz"

echo "==> Starting MongoDB backup: ${ARCHIVE_KEY}"
docker exec mongo mongodump \
  --archive \
  --gzip | \
  aws s3 cp - "s3://${BUCKET}/${ARCHIVE_KEY}" \
    --region ap-south-1

echo "==> Backup uploaded. Rotating snapshots (keep ${MAX_SNAPSHOTS})..."
SNAPSHOTS=$(aws s3 ls "s3://${BUCKET}/${PREFIX}/" \
  --region ap-south-1 | sort | awk '{print $4}' | grep '\.archive\.gz$')

COUNT=$(echo "${SNAPSHOTS}" | grep -c '.' 2>/dev/null || true)
DELETE_COUNT=$((COUNT - MAX_SNAPSHOTS))

if (( DELETE_COUNT > 0 )); then
  echo "${SNAPSHOTS}" | head -n "${DELETE_COUNT}" | while IFS= read -r key; do
    aws s3 rm "s3://${BUCKET}/${PREFIX}/${key}" --region ap-south-1
    echo "==> Deleted old snapshot: ${key}"
  done
fi

echo "==> Backup complete. ${COUNT} snapshots, kept newest ${MAX_SNAPSHOTS}."
