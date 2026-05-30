from __future__ import annotations

import asyncio
from typing import Any

from app.cache import set_cached_rewrite
from app.celery_app import celery_app
from app.credits import deduct_words, record_rewrite
from app.database import SessionLocal
from app.models import User
from app.observability import capture_event
from app.rewriter import RewriteResult, count_words, rewrite_deep, rewrite_standard


def _serialize_result(result: RewriteResult, words_used: int) -> dict[str, Any]:
    return {
        "rewritten_text": result.text,
        "naturalness_score": result.score,
        "attempts": result.attempts,
        "words_used": words_used,
        "perplexity": result.perplexity,
        "score_breakdown": result.score_breakdown,
    }


def _finalize_paid_rewrite(user_id: int, text: str, mode: str, payload: dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if user is None:
            raise RuntimeError("User not found while finalizing rewrite.")
        words_used = int(payload["words_used"])
        deduct_words(db, user, words_used)
        record_rewrite(
            db,
            user,
            original_text=text,
            rewritten_text=str(payload["rewritten_text"]),
            mode=mode,
            naturalness_score=payload.get("naturalness_score"),
            words_used=words_used,
        )
        capture_event(user.clerk_user_id, "rewrite_completed", {"mode": mode, "words_used": words_used})
    finally:
        db.close()


@celery_app.task(bind=True, name="rewrite.standard")
def rewrite_standard_task(self, text: str, user_id: int, mode: str = "standard") -> dict[str, Any]:
    self.update_state(state="PROGRESS", meta={"message": "Improving writing...", "current": 1, "total": 2})
    result = asyncio.run(rewrite_standard(text))
    payload = _serialize_result(result, count_words(text))
    self.update_state(state="PROGRESS", meta={"message": "Caching result...", "current": 2, "total": 2})
    set_cached_rewrite(text, mode, payload)
    _finalize_paid_rewrite(user_id, text, mode, payload)
    return payload


@celery_app.task(bind=True, name="rewrite.deep")
def rewrite_deep_task(self, text: str, user_id: int, mode: str = "deep") -> dict[str, Any]:
    def report_progress(current: int, total: int) -> None:
        self.update_state(
            state="PROGRESS",
            meta={
                "message": f"Checking naturalness... pass {current} of {total}",
                "current": current,
                "total": total,
            },
        )

    result = asyncio.run(rewrite_deep(text, progress_callback=report_progress))
    payload = _serialize_result(result, count_words(text))
    set_cached_rewrite(text, mode, payload)
    _finalize_paid_rewrite(user_id, text, mode, payload)
    return payload
