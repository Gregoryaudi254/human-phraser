"""Reduce free signup words to 200.

Revision ID: 20260601_0003
Revises: 20260527_0002
Create Date: 2026-06-01 15:05:00.000000
"""

from alembic import op


revision = "20260601_0003"
down_revision = "20260527_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE credits
        SET balance_words = GREATEST(balance_words - 300, 0)
        WHERE EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = credits.user_id
              AND users.plan = 'free'
        )
          AND EXISTS (
            SELECT 1
            FROM credit_transactions
            WHERE credit_transactions.user_id = credits.user_id
              AND credit_transactions.reason = 'signup_bonus'
              AND credit_transactions.delta_words = 500
        )
          AND NOT EXISTS (
            SELECT 1
            FROM credit_transactions
            WHERE credit_transactions.user_id = credits.user_id
              AND credit_transactions.reason != 'signup_bonus'
              AND credit_transactions.delta_words > 0
        )
        """
    )
    op.execute(
        """
        UPDATE credit_transactions
        SET delta_words = 200
        WHERE reason = 'signup_bonus'
          AND delta_words = 500
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE credits
        SET balance_words = balance_words + 300
        WHERE EXISTS (
            SELECT 1
            FROM credit_transactions
            WHERE credit_transactions.user_id = credits.user_id
              AND credit_transactions.reason = 'signup_bonus'
              AND credit_transactions.delta_words = 200
        )
          AND NOT EXISTS (
            SELECT 1
            FROM credit_transactions
            WHERE credit_transactions.user_id = credits.user_id
              AND credit_transactions.reason != 'signup_bonus'
              AND credit_transactions.delta_words > 0
        )
        """
    )
    op.execute(
        """
        UPDATE credit_transactions
        SET delta_words = 500
        WHERE reason = 'signup_bonus'
          AND delta_words = 200
        """
    )
