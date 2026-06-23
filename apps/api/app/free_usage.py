from __future__ import annotations

import hashlib

from fastapi import Request

from app.cache import get_redis
from app.config import settings

FREE_DAILY_ATTEMPTS = 3
FREE_ATTEMPT_MAX_WORDS = 200
FREE_ATTEMPT_TTL_SECONDS = 60 * 60 * 24


def is_unlimited_email(email: str | None) -> bool:
    if not email:
        return False

    allowed = {
        item.strip().lower()
        for item in settings.unlimited_access_emails.split(",")
        if item.strip()
    }
    return email.strip().lower() in allowed


def demo_identity(request: Request, fingerprint: str | None) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    ip = forwarded_for.split(",")[0].strip() or (request.client.host if request.client else "unknown")
    raw = f"{ip}:{fingerprint or request.headers.get('user-agent', '')}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"free:anon:{digest}"


def signed_identity(clerk_user_id: str) -> str:
    digest = hashlib.sha256(clerk_user_id.encode("utf-8")).hexdigest()
    return f"free:user:{digest}"


def consume_daily_attempt(identity: str) -> int:
    redis_client = get_redis()
    key = _daily_key(identity)
    count = redis_client.incr(key)
    if count == 1:
        redis_client.expire(key, FREE_ATTEMPT_TTL_SECONDS)
    return max(FREE_DAILY_ATTEMPTS - int(count), 0)


def has_daily_attempt(identity: str) -> bool:
    redis_client = get_redis()
    count = redis_client.get(_daily_key(identity))
    return int(count or 0) < FREE_DAILY_ATTEMPTS


def remaining_daily_attempts(identity: str) -> int:
    redis_client = get_redis()
    count = redis_client.get(_daily_key(identity))
    return max(FREE_DAILY_ATTEMPTS - int(count or 0), 0)


def _daily_key(identity: str) -> str:
    return f"{identity}:daily-attempts"
