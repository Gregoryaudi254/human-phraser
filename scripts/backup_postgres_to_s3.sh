#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BACKUP_DATABASE_URL:-}" ]]; then
  echo "BACKUP_DATABASE_URL is required" >&2
  exit 1
fi

if [[ -z "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "BACKUP_S3_BUCKET is required, for example s3://humaniser-prod-backups" >&2
  exit 1
fi

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
backup_name="humaniser-${ENVIRONMENT:-production}-${timestamp}.dump"
tmp_path="/tmp/${backup_name}"

pg_dump "${BACKUP_DATABASE_URL}" --format=custom --no-owner --no-acl --file="${tmp_path}"
aws s3 cp "${tmp_path}" "${BACKUP_S3_BUCKET%/}/${backup_name}"
rm -f "${tmp_path}"

echo "Uploaded ${BACKUP_S3_BUCKET%/}/${backup_name}"
