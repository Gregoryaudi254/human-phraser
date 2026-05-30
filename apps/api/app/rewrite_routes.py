from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.cache import get_cached_rewrite, set_cached_rewrite
from app.credits import assert_sufficient_credits, deduct_words, record_rewrite
from app.database import get_db
from app.models import User
from app.observability import capture_event
from app.rewriter import RewriteResult, count_words, rewrite_light
from app.security import limiter, sanitize_text
from app.config import settings

router = APIRouter()

RewriteMode = Literal["light", "standard", "deep"]


class RewriteRequest(BaseModel):
    text: str = Field(min_length=1, max_length=120000)
    mode: RewriteMode


def _sse(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _stream_tokens(text: str) -> AsyncGenerator[str, None]:
    for token in _split_stream_tokens(text):
        yield _sse("token", {"text": token})


def _split_stream_tokens(text: str) -> list[str]:
    tokens: list[str] = []
    current = []
    for char in text:
        current.append(char)
        if char.isspace():
            tokens.append("".join(current))
            current = []
    if current:
        tokens.append("".join(current))
    return tokens


def _validate_word_limit(text: str) -> int:
    words_used = count_words(text)
    if words_used > 5000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rewrite requests are limited to 5,000 words.",
        )
    return words_used


def _serialize_result(result: RewriteResult, words_used: int) -> dict[str, Any]:
    return {
        "rewritten_text": result.text,
        "naturalness_score": result.score,
        "attempts": result.attempts,
        "words_used": words_used,
        "perplexity": result.perplexity,
        "score_breakdown": result.score_breakdown,
    }


@router.post("/rewrite", response_model=None)
@limiter.limit(settings.rewrite_rate_limit)
async def create_rewrite(
    request: Request,
    payload: RewriteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sanitized_text = sanitize_text(payload.text)
    words_used = _validate_word_limit(sanitized_text)
    cached = get_cached_rewrite(sanitized_text, payload.mode)
    capture_event(
        current_user.clerk_user_id,
        "rewrite_started",
        {"mode": payload.mode, "words_used": words_used},
    )
    if cached is None:
        assert_sufficient_credits(db, current_user, words_used)

    if payload.mode == "light":
        async def event_stream() -> AsyncGenerator[str, None]:
            try:
                result_payload = cached
                if result_payload is None:
                    rewritten = await rewrite_light(sanitized_text)
                    result_payload = _serialize_result(
                        RewriteResult(text=rewritten, score=None, attempts=1),
                        words_used,
                    )
                    set_cached_rewrite(sanitized_text, payload.mode, result_payload)
                    deduct_words(db, current_user, words_used)
                    record_rewrite(
                        db,
                        current_user,
                        original_text=sanitized_text,
                        rewritten_text=rewritten,
                        mode=payload.mode,
                        naturalness_score=None,
                        words_used=words_used,
                    )
                    capture_event(current_user.clerk_user_id, "rewrite_completed", {"mode": payload.mode, "words_used": words_used})

                async for event in _stream_tokens(str(result_payload["rewritten_text"])):
                    yield event
                yield _sse("done", {**result_payload, "cached": cached is not None})
            except HTTPException as exc:
                yield _sse("error", {"message": exc.detail, "status_code": exc.status_code})
            except RuntimeError as exc:
                yield _sse("error", {"message": str(exc), "status_code": 503})

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    if cached is not None:
        return JSONResponse({"cached": True, "result": cached})

    try:
        from app.tasks import rewrite_deep_task, rewrite_standard_task
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Celery dependencies are not installed. Rebuild the backend image.",
        ) from exc

    if payload.mode == "standard":
        task = rewrite_standard_task.delay(sanitized_text, current_user.id, payload.mode)
    else:
        task = rewrite_deep_task.delay(sanitized_text, current_user.id, payload.mode)

    return JSONResponse({"job_id": task.id, "cached": False}, status_code=status.HTTP_202_ACCEPTED)


@router.get("/job/{job_id}")
async def read_job(
    job_id: str,
    _current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        from celery.result import AsyncResult

        from app.celery_app import celery_app
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Celery dependencies are not installed. Rebuild the backend image.",
        ) from exc

    result = AsyncResult(job_id, app=celery_app)

    if result.state == "PENDING":
        return {"job_id": job_id, "status": "pending", "progress": None, "result": None}

    if result.state in {"STARTED", "PROGRESS"}:
        return {
            "job_id": job_id,
            "status": "processing",
            "progress": result.info if isinstance(result.info, dict) else None,
            "result": None,
        }

    if result.state == "SUCCESS":
        return {"job_id": job_id, "status": "complete", "progress": None, "result": result.result}

    return {
        "job_id": job_id,
        "status": "failed",
        "progress": None,
        "result": None,
        "error": str(result.info),
    }
