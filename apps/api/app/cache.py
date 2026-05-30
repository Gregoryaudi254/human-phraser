from __future__ import annotations

import hashlib
import json
from typing import Any

from app.config import settings

CACHE_TTL_SECONDS = 60 * 60


def get_redis():
    import redis

    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def rewrite_cache_key(text: str, mode: str) -> str:
    digest = hashlib.sha256(f"{text}:{mode}".encode("utf-8")).hexdigest()
    return f"rewrite:{digest}"


def get_cached_rewrite(text: str, mode: str) -> dict[str, Any] | None:
    cached = get_redis().get(rewrite_cache_key(text, mode))
    if not cached:
        return None
    return json.loads(cached)


def set_cached_rewrite(text: str, mode: str, result: dict[str, Any]) -> None:
    get_redis().setex(rewrite_cache_key(text, mode), CACHE_TTL_SECONDS, json.dumps(result))
