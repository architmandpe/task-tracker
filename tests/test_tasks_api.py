from fastapi.testclient import TestClient
from app.main import app
import datetime as dt
from jose import jwt
from app.security import SECRET, ALGORITHM

client = TestClient(app)

def register_and_login(client: TestClient, email: str, password: str = "supersecret"):
    client.post("/auth/signup", json={"email": email, "password": password})
    client.post("/auth/login", json={"email": email, "password": password})

def test_create_task_returns_201_and_body():
    register_and_login(client, "u1@x.com")
    resp = client.post("/tasks", json={"title": "write the spec"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "write the spec"
    assert body["status"] == "todo"
    assert "id" in body

def test_create_task_rejects_empty_title():
    register_and_login(client, "u2@x.com")
    resp = client.post("/tasks", json={"title": ""})
    assert resp.status_code == 422

def test_get_missing_task_returns_404():
    register_and_login(client, "u3@x.com")
    assert client.get("/tasks/99999").status_code == 404

def test_patch_task_updates_only_given_fields():
    register_and_login(client, "u4@x.com")
    resp = client.post("/tasks", json={"title": "write the spec"})
    body = resp.json()
    resp = client.patch(f"/tasks/{body['id']}", json={"description": "done"})
    body = resp.json()
    assert body["description"] == "done"
    assert body["title"] == "write the spec"

def test_delete_task_returns_204():
    register_and_login(client, "u5@x.com")
    resp = client.post("/tasks", json={"title": "write the spec"})
    body = resp.json()
    resp = client.delete(f"/tasks/{body['id']}")
    assert resp.status_code == 204
    resp = client.get(f"/tasks/{body['id']}")
    assert resp.status_code == 404

def test_delete_missing_task_returns_404():
    register_and_login(client, "u6@x.com")
    resp = client.delete("/tasks/99999")
    assert resp.status_code == 404

def test_list_tasks_returns_all():
    register_and_login(client, "u7@x.com")
    client.post("/tasks", json={"title": "write the spec"})
    client.post("/tasks", json={"title": "done"})
    resp = client.get("/tasks")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2

def test_list_tasks_filters_by_status():
    register_and_login(client, "u8@x.com")
    resp = client.get("/tasks?status=nonexistent_status_xyz")
    assert resp.status_code == 200
    assert resp.json() == []

def test_user_cannot_see_others_tasks():
    client_a = TestClient(app)
    client_b = TestClient(app)
    register_and_login(client_a, "a@iso.com")
    register_and_login(client_b, "b@iso.com")

    resp = client_a.post("/tasks", json={"title": "a's secret"})
    task_id = resp.json()["id"]

    resp = client_b.get("/tasks")
    titles = [t["title"] for t in resp.json()]
    assert "a's secret" not in titles

    resp = client_b.get(f"/tasks/{task_id}")
    assert resp.status_code == 404

def test_expired_token_returns_401():
    expired_claims = {
        "sub": "1",
        "iat": dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=13),
        "exp": dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1),
    }
    expired_token = jwt.encode(expired_claims, SECRET, algorithm=ALGORITHM)
    resp = client.get("/tasks", cookies={"access_token": expired_token})
    assert resp.status_code == 401
