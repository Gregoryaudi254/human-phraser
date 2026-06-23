from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.auth import get_current_user
from app.billing_routes import router as billing_router
from app.cache import get_redis
from app.config import settings
from app.credits import get_balance
from app.database import engine, get_db
from app.demo_routes import router as demo_router
from app.free_usage import remaining_daily_attempts, signed_identity
from app.history_routes import router as history_router
from app.models import User
from app.observability import init_sentry
from app.rewrite_routes import router as rewrite_router
from app.schemas import UserResponse
from app.security import limiter

init_sentry()
app = FastAPI(title="Humaniser API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rewrite_router)
app.include_router(billing_router)
app.include_router(history_router)
app.include_router(demo_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
def readiness() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("select 1"))
    get_redis().ping()
    return {"status": "ready"}


@app.get("/api/me", response_model=UserResponse)
def read_current_user(
    current_user: Annotated[User, Depends(get_current_user)],
    db=Depends(get_db),
) -> dict[str, object]:
    return {
        "id": current_user.id,
        "clerk_user_id": current_user.clerk_user_id,
        "email": current_user.email,
        "plan": current_user.plan,
        "plan_renews_at": current_user.plan_renews_at,
        "balance_words": get_balance(db, current_user),
        "free_attempts_remaining": None
        if current_user.plan == "unlimited"
        else remaining_daily_attempts(signed_identity(current_user.clerk_user_id)),
        "created_at": current_user.created_at,
    }
