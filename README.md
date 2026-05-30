# Humaniser Platform

Production-oriented scaffold for a writing quality SaaS platform.

## Stage 1

This stage contains:

- Next.js 14 App Router frontend in `apps/web`
- Clerk authentication pages and route protection
- FastAPI backend in `apps/api`
- Clerk JWT verification for protected backend routes
- PostgreSQL, Redis, SQLAlchemy, and Alembic
- `/health` and protected `/api/me` endpoints
- Docker Compose for local backend services
- Switchable Gemini, Grok/xAI, and Anthropic Light, Standard, and Deep rewrite modes
- GPT-2 perplexity scoring for Standard and Deep mode quality checks
- GPTZero and Originality.ai aggregate naturalness scoring with a dashboard breakdown
- SSE streaming from `/rewrite` into the dashboard editor
- Celery worker for Standard and Deep rewrite jobs
- Redis result backend and one-hour rewrite cache
- Credit balances, Flutterwave checkout, and Clerk/Flutterwave webhooks
- Sentry error/performance monitoring hooks
- PostHog product events for rewrite and billing flows
- Authenticated rewrite rate limiting and LLM input sanitization
- Basic pytest suite for security, credits, and rewrite request validation
- Launch-readiness CI/CD, backups, restore tooling, and a 50-concurrency smoke load test

## Local Setup

1. Copy `.env.example` to `.env` and fill in Clerk values.
2. Install frontend dependencies:

   ```bash
   npm --prefix apps/web install
   ```

3. Start the backend stack:

   ```bash
   docker compose up --build
   ```

   This starts FastAPI, Postgres, Redis, and the Celery worker.

4. Start the frontend:

   ```bash
   npm --prefix apps/web run dev
   ```

5. Open `http://localhost:3000`.

## Verification

Run the local checks before pushing:

```bash
npm --prefix apps/web run lint
npm --prefix apps/web run build
python -m pytest apps/api
```

Run the launch smoke load test against a running backend:

```bash
python scripts/load_test.py --base-url http://localhost:8000 --concurrency 50 --requests 50
```

## Clerk Setup

- Create a Clerk application.
- Enable Google as a social login provider in Clerk.
- Set sign-in URL to `/sign-in` and sign-up URL to `/sign-up`.
- Add `http://localhost:3000` as an allowed origin.
- Set `CLERK_JWKS_URL` and `CLERK_ISSUER` in `.env` using your Clerk frontend API domain.
- Set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` in `.env` before using the rewrite endpoint.
- To switch to Grok, set `LLM_PROVIDER=grok` and `XAI_API_KEY`.
- To switch to Groq (free tier at [console.groq.com](https://console.groq.com/)), set `LLM_PROVIDER=groq` and `GROQ_API_KEY`. Default model `llama-3.3-70b-versatile` is free; for higher daily limits use `llama-3.1-8b-instant`.
- To switch back to Anthropic later, set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`.
- Set `GPTZERO_API_KEY` and `ORIGINALITY_API_KEY` for Standard and Deep scoring.
- Configure Flutterwave and set the `FLUTTERWAVE_*` variables in `.env`.
- Configure a Clerk `user.created` webhook pointing to `/webhooks/clerk` and a Flutterwave webhook pointing to `/billing/webhook`.
- Configure Sentry DSNs and set an alert for error rate > 1% or p95 `/rewrite` latency > 10s.
- Configure PostHog with funnel steps: landing, sign up, first rewrite, upgrade.

## Cloudflare Setup

- Put the backend domain behind Cloudflare proxy.
- Enable DDoS protection and managed WAF rules.
- Add WAF rules for common SQLi/XSS patterns and high request bursts.
- Cache static frontend assets at the edge; bypass cache for API routes.

## Deployment

- Deploy `apps/web` to Vercel.
- Deploy the backend Docker image to Railway or AWS ECS.
- Run one backend API service and one Celery worker service from the same image.
- Set all variables from `.env.example` in the hosting provider's secret store.
- Use `docs/launch-readiness.md` for CI/CD, backup, restore, uptime, and pre-launch steps.
