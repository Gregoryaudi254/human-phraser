from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.credits import FREE_SIGNUP_WORDS
from app.free_usage import (
    FREE_ATTEMPT_MAX_WORDS,
    FREE_DAILY_ATTEMPTS,
    consume_daily_attempt,
    demo_identity,
    has_daily_attempt,
)
from app.rewriter import count_words, rewrite_light
from app.security import sanitize_text

router = APIRouter()

class DemoRewriteRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    fingerprint: str | None = Field(default=None, max_length=255)


@router.post("/demo/rewrite")
async def demo_rewrite(payload: DemoRewriteRequest, request: Request) -> dict[str, object]:
    text = sanitize_text(payload.text)
    words_used = count_words(text)
    if words_used > FREE_ATTEMPT_MAX_WORDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Free attempts are limited to {FREE_ATTEMPT_MAX_WORDS} words.",
        )

    identity = demo_identity(request, payload.fingerprint)
    if not has_daily_attempt(identity):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You've used your {FREE_DAILY_ATTEMPTS} free attempts for today. Try again tomorrow.",
        )

    remaining_attempts = consume_daily_attempt(identity)
    rewritten = await rewrite_light(text)
    return {
        "rewritten_text": rewritten,
        "words_used": words_used,
        "free_attempts_remaining": remaining_attempts,
        "signup_prompt": f"Sign up to save this rewrite and get {FREE_SIGNUP_WORDS} free words.",
    }
