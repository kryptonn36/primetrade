import pytest
from fastapi.testclient import TestClient

from main import app
from app.db.database import Base, engine, init_db


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    init_db()
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_register_success():
    res = client.post("/api/v1/auth/register", json={
        "username": "alice",
        "email": "alice@example.com",
        "password": "securepass",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == "alice"
    assert data["role"] == "user"
    assert "hashed_pw" not in data


def test_register_duplicate_username():
    payload = {"username": "bob", "email": "bob@example.com", "password": "securepass"}
    client.post("/api/v1/auth/register", json=payload)
    res = client.post("/api/v1/auth/register", json={**payload, "email": "bob2@example.com"})
    assert res.status_code == 400
    assert "username" in res.json()["detail"]


def test_register_short_password():
    res = client.post("/api/v1/auth/register", json={
        "username": "charlie",
        "email": "charlie@example.com",
        "password": "short",
    })
    assert res.status_code == 422


def test_login_success():
    client.post("/api/v1/auth/register", json={
        "username": "dana",
        "email": "dana@example.com",
        "password": "mypassword",
    })
    res = client.post("/api/v1/auth/login", json={"username": "dana", "password": "mypassword"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password():
    client.post("/api/v1/auth/register", json={
        "username": "eve",
        "email": "eve@example.com",
        "password": "correctpass",
    })
    res = client.post("/api/v1/auth/login", json={"username": "eve", "password": "wrongpass"})
    assert res.status_code == 401


def test_login_nonexistent_user():
    res = client.post("/api/v1/auth/login", json={"username": "ghost", "password": "anything"})
    assert res.status_code == 401


def test_protected_without_token():
    res = client.get("/api/v1/users/me")
    assert res.status_code == 403
