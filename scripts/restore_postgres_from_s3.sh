#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RESTORE_DATABASE_URL:-}" ]]; then
  echo "RESTORE_DATABASE_URL is required" >&2
  exit 1
fi

if [[ -z "${BACKUP_S3_URI:-}" ]]; then
  echo "BACKUP_S3_URI is required, for example s3://humaniser-prod-backups/humaniser-prod.dump" >&2
  exit 1
fi

tmp_path="/tmp/$(basename "${BACKUP_S3_URI}")"

aws s3 cp "${BACKUP_S3_URI}" "${tmp_path}"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="${RESTORE_DATABASE_URL}" "${tmp_path}"
rm -f "${tmp_path}"

echo "Restored ${BACKUP_S3_URI}"
