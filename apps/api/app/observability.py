from __future__ import annotations

from typing import Any

from app.config import settings


def init_sentry() -> None:
    if not settings.sentry_dsn:
        return

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        integrations=[FastApiIntegration(transaction_style="endpoint")],
        environment=settings.environment,
    )


def capture_event(user_id: str, event: str, properties: dict[str, Any] | None = None) -> None:
    if not settings.posthog_api_key:
        return

    from posthog import Posthog

    client = Posthog(project_api_key=settings.posthog_api_key, host=settings.posthog_host)
    client.capture(distinct_id=user_id, event=event, properties=properties or {})
    client.flush()
