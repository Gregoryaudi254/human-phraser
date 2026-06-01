from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.credits import FREE_SIGNUP_WORDS, PRO_MONTHLY_WORDS
from app.models import Rewrite, User

router = APIRouter()


def _serialize_rewrite(rewrite: Rewrite) -> dict[str, Any]:
    return {
        "id": rewrite.id,
        "original_text": rewrite.original_text,
        "rewritten_text": rewrite.rewritten_text,
        "mode": rewrite.mode,
        "naturalness_score": rewrite.naturalness_score,
        "words_used": rewrite.words_used,
        "created_at": rewrite.created_at,
    }


@router.get("/rewrites")
def list_rewrites(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
) -> dict[str, Any]:
    total = db.scalar(select(func.count(Rewrite.id)).where(Rewrite.user_id == current_user.id)) or 0
    rewrites = db.scalars(
        select(Rewrite)
        .where(Rewrite.user_id == current_user.id)
        .order_by(Rewrite.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "items": [_serialize_rewrite(rewrite) for rewrite in rewrites],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.delete("/rewrites/{rewrite_id}")
def delete_rewrite(
    rewrite_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    rewrite = db.get(Rewrite, rewrite_id)
    if rewrite is None or rewrite.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rewrite not found.")

    db.delete(rewrite)
    db.commit()
    return {"status": "deleted"}


@router.get("/dashboard/stats")
def dashboard_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    now = datetime.now(tz=UTC)
    month_filter = (
        Rewrite.user_id == current_user.id,
        extract("year", Rewrite.created_at) == now.year,
        extract("month", Rewrite.created_at) == now.month,
    )

    total_rewrites = db.scalar(select(func.count(Rewrite.id)).where(*month_filter)) or 0
    average_score = db.scalar(select(func.avg(Rewrite.naturalness_score)).where(*month_filter))
    words_used = db.scalar(select(func.coalesce(func.sum(Rewrite.words_used), 0)).where(*month_filter)) or 0

    plan_limit = None
    if current_user.plan == "free":
        plan_limit = FREE_SIGNUP_WORDS
    elif current_user.plan == "pro":
        plan_limit = PRO_MONTHLY_WORDS

    return {
        "total_rewrites_month": total_rewrites,
        "average_naturalness_score": round(float(average_score), 2) if average_score is not None else None,
        "words_used_month": int(words_used),
        "plan_limit_words": plan_limit,
    }
