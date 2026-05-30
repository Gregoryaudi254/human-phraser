from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.credits import deduct_words, ensure_credit_account
from app.models import Base, User


def test_credit_account_seed_and_deduction() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    user = User(clerk_user_id="user_test", email="test@example.com")
    db.add(user)
    db.commit()
    db.refresh(user)

    credit = ensure_credit_account(db, user)
    assert credit.balance_words == 500

    updated = deduct_words(db, user, 120)
    assert updated.balance_words == 380
