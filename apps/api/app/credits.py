from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Credit, CreditTransaction, Rewrite, User

FREE_SIGNUP_WORDS = 500
PRO_MONTHLY_WORDS = 15_000
CREDIT_PACK_WORDS = 5_000


def ensure_credit_account(db: Session, user: User) -> Credit:
    credit = db.scalar(select(Credit).where(Credit.user_id == user.id))
    if credit:
        return credit

    credit = Credit(user_id=user.id, balance_words=FREE_SIGNUP_WORDS)
    db.add(credit)
    db.flush()
    db.add(
        CreditTransaction(
            user_id=user.id,
            delta_words=FREE_SIGNUP_WORDS,
            reason="signup_bonus",
        )
    )
    db.commit()
    db.refresh(credit)
    return credit


def get_balance(db: Session, user: User) -> int:
    return ensure_credit_account(db, user).balance_words


def has_sufficient_credits(db: Session, user: User, words: int) -> bool:
    if user.plan == "unlimited":
        return True
    return get_balance(db, user) >= words


def assert_sufficient_credits(db: Session, user: User, words: int) -> None:
    from fastapi import HTTPException, status

    if not has_sufficient_credits(db, user, words):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient word balance. Please upgrade or buy more credits.",
        )


def add_words(
    db: Session,
    user: User,
    words: int,
    reason: str,
    stripe_payment_id: str | None = None,
) -> Credit:
    credit = ensure_credit_account(db, user)
    credit.balance_words += words
    db.add(
        CreditTransaction(
            user_id=user.id,
            delta_words=words,
            reason=reason,
            stripe_payment_id=stripe_payment_id,
        )
    )
    db.commit()
    db.refresh(credit)
    return credit


def deduct_words(
    db: Session,
    user: User,
    words: int,
    reason: str = "rewrite_completed",
) -> Credit:
    credit = ensure_credit_account(db, user)
    if user.plan != "unlimited":
        credit.balance_words -= words
    db.add(CreditTransaction(user_id=user.id, delta_words=-words, reason=reason))
    db.commit()
    db.refresh(credit)
    return credit


def record_rewrite(
    db: Session,
    user: User,
    original_text: str,
    rewritten_text: str,
    mode: str,
    naturalness_score: float | None,
    words_used: int,
) -> Rewrite:
    rewrite = Rewrite(
        user_id=user.id,
        original_text=original_text,
        rewritten_text=rewritten_text,
        mode=mode,
        naturalness_score=naturalness_score,
        words_used=words_used,
    )
    db.add(rewrite)
    db.commit()
    db.refresh(rewrite)
    return rewrite
