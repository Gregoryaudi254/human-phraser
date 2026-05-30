# Launch Readiness

This checklist is the operating runbook for taking Humaniser from local/staging into production.

## CI/CD

- GitHub Actions runs on pull requests and pushes to `main`.
- The web job installs dependencies, lints, and builds `apps/web`.
- The API job installs Python dependencies, runs Alembic migrations against Postgres, runs pytest, and builds the backend image.
- Pushes to `main` deploy the frontend to Vercel and the API to Railway when the required repository secrets are present.

Required GitHub secrets:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RAILWAY_TOKEN`
- `RAILWAY_API_SERVICE`

## Environments

Use three separate env groups: local, staging, and production. Keep all secrets in the platform secret store, never in git.

Frontend:

- Vercel project root: `apps/web`
- Build command: `npm run build`
- Output: Next.js default
- Required public variables are listed in `.env.example`.

Backend:

- Railway service should use `apps/api/Dockerfile`.
- Run one API service and one worker service from the same image.
- API start command is the Dockerfile default.
- Worker start command: `celery -A app.celery_app.celery_app worker --loglevel=info`
- Required private variables are listed in `.env.example`.

## Backups

The scheduled `Database Backup` workflow runs daily at 02:17 UTC and uploads a custom-format `pg_dump` to S3.

Required backup secrets:

- `BACKUP_DATABASE_URL`
- `BACKUP_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

Restore test:

```bash
BACKUP_S3_URI=s3://bucket/humaniser-production-YYYYMMDDTHHMMSSZ.dump \
RESTORE_DATABASE_URL=postgresql://user:pass@host:5432/humaniser_restore \
bash scripts/restore_postgres_from_s3.sh
```

Run a restore test before launch and after any schema-heavy release.

## Uptime Monitoring

Create an UptimeRobot or Better Stack monitor:

- URL: `https://api.yourdomain.com/health`
- Interval: 60 seconds
- Alert channel: email or PagerDuty
- Expected response: `200` with `{ "status": "ok" }`

## Load Test

Run the basic 50-concurrent-user health check against staging after deploying:

```bash
python scripts/load_test.py --base-url https://api-staging.yourdomain.com --concurrency 50 --requests 50
```

The launch target is zero failed requests with p95 latency under 10 seconds for this smoke load.

For a paid-provider end-to-end demo check, add `--target demo`. That intentionally calls the rewrite provider, so use it sparingly.

## Pre-Launch Checklist

- [ ] Custom domain configured with SSL.
- [ ] Cloudflare proxy enabled for the backend domain.
- [ ] Clerk production instance configured.
- [ ] Flutterwave live account and webhook configured.
- [ ] All API keys are production keys.
- [ ] Sentry frontend and backend DSNs configured.
- [ ] Sentry error-rate and p95 latency alerts tested.
- [ ] PostHog production project and funnel configured.
- [ ] Database backup workflow has completed successfully.
- [ ] Restore procedure tested into a non-production database.
- [ ] Uptime monitor is active and alerting is tested.
- [ ] Load test passes with 50 concurrent users.
