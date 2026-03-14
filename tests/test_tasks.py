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


def register_and_login(username="user1", email="user1@example.com", password="testpass1"):
    client.post("/api/v1/auth/register", json={"username": username, "email": email, "password": password})
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    return res.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_create_task():
    token = register_and_login()
    res = client.post("/api/v1/tasks/", json={"title": "buy milk"}, headers=auth_headers(token))
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "buy milk"
    assert data["status"] == "todo"


def test_list_tasks_only_own():
    t1 = register_and_login("owner1", "o1@example.com")
    t2 = register_and_login("owner2", "o2@example.com")

    client.post("/api/v1/tasks/", json={"title": "task A"}, headers=auth_headers(t1))
    client.post("/api/v1/tasks/", json={"title": "task B"}, headers=auth_headers(t2))

    res1 = client.get("/api/v1/tasks/", headers=auth_headers(t1))
    res2 = client.get("/api/v1/tasks/", headers=auth_headers(t2))

    assert len(res1.json()) == 1
    assert res1.json()[0]["title"] == "task A"
    assert len(res2.json()) == 1
    assert res2.json()[0]["title"] == "task B"


def test_get_task():
    token = register_and_login()
    created = client.post("/api/v1/tasks/", json={"title": "read a book"}, headers=auth_headers(token)).json()
    res = client.get(f"/api/v1/tasks/{created['id']}", headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json()["title"] == "read a book"


def test_get_task_not_found():
    token = register_and_login()
    res = client.get("/api/v1/tasks/doesnotexist", headers=auth_headers(token))
    assert res.status_code == 404


def test_update_task():
    token = register_and_login()
    task = client.post("/api/v1/tasks/", json={"title": "draft email"}, headers=auth_headers(token)).json()
    res = client.patch(f"/api/v1/tasks/{task['id']}", json={"status": "done"}, headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json()["status"] == "done"


def test_cannot_update_another_users_task():
    t1 = register_and_login("u1", "u1@example.com")
    t2 = register_and_login("u2", "u2@example.com")
    task = client.post("/api/v1/tasks/", json={"title": "private"}, headers=auth_headers(t1)).json()
    res = client.patch(f"/api/v1/tasks/{task['id']}", json={"title": "hacked"}, headers=auth_headers(t2))
    assert res.status_code == 404


def test_delete_task():
    token = register_and_login()
    task = client.post("/api/v1/tasks/", json={"title": "delete me"}, headers=auth_headers(token)).json()
    res = client.delete(f"/api/v1/tasks/{task['id']}", headers=auth_headers(token))
    assert res.status_code == 204
    assert client.get(f"/api/v1/tasks/{task['id']}", headers=auth_headers(token)).status_code == 404


def test_create_task_blank_title():
    token = register_and_login()
    res = client.post("/api/v1/tasks/", json={"title": "   "}, headers=auth_headers(token))
    assert res.status_code == 422
