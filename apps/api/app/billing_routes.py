from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.credits import CREDIT_PACK_WORDS, FREE_SIGNUP_WORDS, PRO_MONTHLY_WORDS, add_words, ensure_credit_account
from app.database import get_db
from app.models import User

router = APIRouter()

CheckoutKind = Literal["pro", "unlimited", "credits"]


class CheckoutRequest(BaseModel):
    kind: CheckoutKind


def _flutterwave_ready() -> None:
    if not settings.flutterwave_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FLUTTERWAVE_SECRET_KEY is not configured.",
        )


def _product_for_kind(kind: CheckoutKind) -> tuple[Decimal, str]:
    if kind == "pro":
        return settings.flutterwave_pro_amount, "Pro monthly plan"
    if kind == "unlimited":
        return settings.flutterwave_unlimited_amount, "Unlimited monthly plan"
    return settings.flutterwave_credit_pack_amount, "5,000 word credit pack"


def _tx_ref(kind: CheckoutKind, user: User) -> str:
    return f"humany:{kind}:{user.id}:{uuid4().hex}"


@router.get("/billing/account")
def read_billing_account(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    credit = ensure_credit_account(db, current_user)
    return {
        "plan": current_user.plan,
        "balance_words": credit.balance_words,
        "renewal_date": current_user.plan_renews_at,
        "free_monthly_words": FREE_SIGNUP_WORDS,
        "pro_monthly_words": PRO_MONTHLY_WORDS,
    }


@router.post("/billing/create-checkout")
async def create_checkout(
    payload: CheckoutRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    _flutterwave_ready()
    amount, title = _product_for_kind(payload.kind)
    tx_ref = _tx_ref(payload.kind, current_user)

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{settings.flutterwave_base_url.rstrip('/')}/payments",
            headers={
                "Authorization": f"Bearer {settings.flutterwave_secret_key}",
                "Content-Type": "application/json",
            },
            json={
                "tx_ref": tx_ref,
                "amount": str(amount),
                "currency": settings.flutterwave_currency,
                "redirect_url": settings.flutterwave_redirect_url,
                "customer": {
                    "email": current_user.email,
                    "name": current_user.email,
                },
                "customizations": {
                    "title": "Humaniser",
                    "description": title,
                },
                "meta": {
                    "user_id": current_user.id,
                    "kind": payload.kind,
                },
            },
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_flutterwave_error(response),
        )

    body = response.json()
    link = ((body.get("data") or {}).get("link") if isinstance(body, dict) else None)
    if not isinstance(link, str):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Flutterwave did not return a checkout link.",
        )

    return {"url": link}


@router.post("/billing/create-portal")
def create_portal() -> dict[str, str]:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Flutterwave does not provide a Stripe-style customer portal for this flow.",
    )


@router.post("/billing/webhook")
async def flutterwave_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    verif_hash: Annotated[str | None, Header(alias="verif-hash")] = None,
) -> dict[str, str]:
    if not settings.flutterwave_webhook_secret_hash:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FLUTTERWAVE_WEBHOOK_SECRET_HASH is not configured.",
        )
    if verif_hash != settings.flutterwave_webhook_secret_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Flutterwave webhook signature.")

    payload = await request.json()
    data = payload.get("data") if isinstance(payload, dict) else None
    transaction_id = data.get("id") if isinstance(data, dict) else None
    if transaction_id is None:
        return {"status": "ignored"}

    verified = await _verify_flutterwave_transaction(str(transaction_id))
    if verified.get("status") != "successful":
        return {"status": "ignored"}

    tx_ref = verified.get("tx_ref")
    amount = Decimal(str(verified.get("amount", "0")))
    currency = verified.get("currency")
    parsed = _parse_tx_ref(tx_ref)
    if parsed is None:
        return {"status": "ignored"}

    kind, user_id = parsed
    expected_amount, _title = _product_for_kind(kind)
    if amount != expected_amount or currency != settings.flutterwave_currency:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Flutterwave transaction mismatch.")

    user = db.get(User, user_id)
    if user is None:
        return {"status": "ignored"}

    _apply_successful_payment(db, user, kind, str(verified.get("id") or transaction_id))
    return {"status": "ok"}


async def _verify_flutterwave_transaction(transaction_id: str) -> dict[str, Any]:
    _flutterwave_ready()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            f"{settings.flutterwave_base_url.rstrip('/')}/transactions/{transaction_id}/verify",
            headers={"Authorization": f"Bearer {settings.flutterwave_secret_key}"},
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=_flutterwave_error(response))

    body = response.json()
    data = body.get("data") if isinstance(body, dict) else None
    if not isinstance(data, dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Flutterwave verification returned no transaction data.")
    return data


def _parse_tx_ref(tx_ref: Any) -> tuple[CheckoutKind, int] | None:
    if not isinstance(tx_ref, str):
        return None
    parts = tx_ref.split(":")
    if len(parts) != 4 or parts[0] != "humany":
        return None
    kind = parts[1]
    if kind not in {"pro", "unlimited", "credits"}:
        return None
    try:
        user_id = int(parts[2])
    except ValueError:
        return None
    return kind, user_id


def _apply_successful_payment(db: Session, user: User, kind: CheckoutKind, payment_id: str) -> None:
    if kind == "credits":
        add_words(db, user, CREDIT_PACK_WORDS, "flutterwave_credit_pack", stripe_payment_id=payment_id)
        return

    user.plan = kind
    db.commit()
    if kind == "pro":
        add_words(db, user, PRO_MONTHLY_WORDS, "flutterwave_pro_payment", stripe_payment_id=payment_id)


def _flutterwave_error(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return f"Flutterwave returned HTTP {response.status_code}."

    if isinstance(body, dict) and isinstance(body.get("message"), str):
        return body["message"]

    return f"Flutterwave returned HTTP {response.status_code}."
