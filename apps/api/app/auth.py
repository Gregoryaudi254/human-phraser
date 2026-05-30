from typing import Annotated, Any

import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.credits import ensure_credit_account
from app.database import get_db
from app.models import User


class ClerkClaims(dict[str, Any]):
    @property
    def clerk_user_id(self) -> str:
        subject = self.get("sub")
        if not isinstance(subject, str) or not subject:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
        return subject

    @property
    def email_from_claims(self) -> str | None:
        email = self.get("email")
        if isinstance(email, str) and email:
            return email

        email_addresses = self.get("email_addresses")
        if isinstance(email_addresses, list) and email_addresses:
            first = email_addresses[0]
            if isinstance(first, dict) and isinstance(first.get("email_address"), str):
                return first["email_address"]

        primary_email = self.get("primary_email_address")
        if isinstance(primary_email, str) and primary_email:
            return primary_email

        return None


def _extract_bearer_token(request: Request) -> str:
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")

    return token


def verify_clerk_jwt(request: Request) -> ClerkClaims:
    if settings.clerk_jwks_url is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CLERK_JWKS_URL is not configured",
        )

    token = _extract_bearer_token(request)
    try:
        jwks_client = PyJWKClient(str(settings.clerk_jwks_url))
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    return ClerkClaims(payload)


def _fetch_clerk_email(clerk_user_id: str) -> str:
    if settings.clerk_secret_key is None:
        return f"{clerk_user_id}@clerk.local"

    try:
        with httpx.Client(timeout=5) as client:
            response = client.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError:
        return f"{clerk_user_id}@clerk.local"

    email_addresses = payload.get("email_addresses", [])
    primary_id = payload.get("primary_email_address_id")
    if isinstance(email_addresses, list):
        for email_address in email_addresses:
            if (
                isinstance(email_address, dict)
                and email_address.get("id") == primary_id
                and isinstance(email_address.get("email_address"), str)
            ):
                return email_address["email_address"]

        for email_address in email_addresses:
            if isinstance(email_address, dict) and isinstance(email_address.get("email_address"), str):
                return email_address["email_address"]

    return f"{clerk_user_id}@clerk.local"


def get_current_user(
    claims: Annotated[ClerkClaims, Depends(verify_clerk_jwt)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    email = claims.email_from_claims or _fetch_clerk_email(claims.clerk_user_id)
    user = db.scalar(select(User).where(User.clerk_user_id == claims.clerk_user_id))
    if user:
        if user.email != email:
            user.email = email
            db.commit()
            db.refresh(user)
        ensure_credit_account(db, user)
        return user

    user = User(clerk_user_id=claims.clerk_user_id, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_credit_account(db, user)
    return user
