from __future__ import annotations

import re

import bleach
from fastapi import Request
from slowapi import Limiter


def sanitize_text(text: str) -> str:
    cleaned = bleach.clean(text, tags=[], attributes={}, strip=True)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
    return cleaned.strip()


def rate_limit_key(request: Request) -> str:
    authorization = request.headers.get("authorization")
    if authorization:
        return authorization
    client = request.client
    return client.host if client else "unknown"


limiter = Limiter(key_func=rate_limit_key)
