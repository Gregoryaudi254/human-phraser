from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.database import get_db
from app.main import app
from app.models import User


class FakeDb:
    pass


def test_rewrite_requires_word_limit(monkeypatch) -> None:
    user = User(id=1, clerk_user_id="user_test", email="test@example.com", plan="unlimited")

    def fake_user() -> User:
        return user

    def fake_db():
        yield FakeDb()

    app.dependency_overrides[get_current_user] = fake_user
    app.dependency_overrides[get_db] = fake_db
    monkeypatch.setattr("app.rewrite_routes.get_cached_rewrite", lambda text, mode: None)

    client = TestClient(app)
    response = client.post("/rewrite", json={"text": "word " * 5001, "mode": "light"})

    assert response.status_code == 422
    assert response.json()["detail"] == "Rewrite requests are limited to 5,000 words."
    app.dependency_overrides.clear()
