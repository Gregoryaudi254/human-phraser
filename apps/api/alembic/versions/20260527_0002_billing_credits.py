"""add billing and credits tables

Revision ID: 20260527_0002
Revises: 20260525_0001
Create Date: 2026-05-27 16:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260527_0002"
down_revision: str | None = "20260525_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("plan", sa.String(length=50), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("plan_renews_at", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint("uq_users_stripe_customer_id", "users", ["stripe_customer_id"])

    op.create_table(
        "credits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("balance_words", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", name="uq_credits_user_id"),
    )

    op.create_table(
        "credit_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delta_words", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=100), nullable=False),
        sa.Column("stripe_payment_id", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_credit_transactions_user_id", "credit_transactions", ["user_id"])

    op.create_table(
        "rewrites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("rewritten_text", sa.Text(), nullable=False),
        sa.Column("mode", sa.String(length=30), nullable=False),
        sa.Column("naturalness_score", sa.Float(), nullable=True),
        sa.Column("words_used", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_rewrites_user_id_created_at", "rewrites", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_rewrites_user_id_created_at", table_name="rewrites")
    op.drop_table("rewrites")
    op.drop_index("ix_credit_transactions_user_id", table_name="credit_transactions")
    op.drop_table("credit_transactions")
    op.drop_table("credits")
    op.drop_constraint("uq_users_stripe_customer_id", "users", type_="unique")
    op.drop_column("users", "plan_renews_at")
    op.drop_column("users", "plan")
    op.drop_column("users", "stripe_customer_id")
