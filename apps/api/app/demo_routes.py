from __future__ import annotations

import hashlib

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.cache import get_redis
from app.rewriter import count_words, rewrite_light
from app.security import sanitize_text

router = APIRouter()

DEMO_TTL_SECONDS = 60 * 60 * 24


class DemoRewriteRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    fingerprint: str | None = Field(default=None, max_length=255)


@router.post("/demo/rewrite")
async def demo_rewrite(payload: DemoRewriteRequest, request: Request) -> dict[str, object]:
    text = sanitize_text(payload.text)
    words_used = count_words(text)
    if words_used > 200:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The free demo is limited to 200 words.",
        )

    identity = _demo_identity(request, payload.fingerprint)
    redis_client = get_redis()
    count = redis_client.incr(identity)
    if count == 1:
        redis_client.expire(identity, DEMO_TTL_SECONDS)
    if count > 1:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You've used the free demo for today. Sign up to keep rewriting.",
        )

    rewritten = await rewrite_light(text)
    return {
        "rewritten_text": rewritten,
        "words_used": words_used,
        "signup_prompt": "Sign up to save this rewrite and get 500 free words.",
    }


def _demo_identity(request: Request, fingerprint: str | None) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    ip = forwarded_for.split(",")[0].strip() or (request.client.host if request.client else "unknown")
    raw = f"{ip}:{fingerprint or request.headers.get('user-agent', '')}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"demo:{digest}"
