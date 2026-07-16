from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def register_and_login(email: str, password: str = "supersecret") -> str:
    client.post("/auth/signup", json={"email": email, "password": password})
    resp = client.post("/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

def test_create_task_returns_201_and_body():
    token = register_and_login("u1@x.com")
    resp = client.post("/tasks", json={"title": "write the spec"}, headers=auth(token))
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "write the spec"
    assert body["status"] == "todo"
    assert "id" in body

def test_create_task_rejects_empty_title():
    token = register_and_login("u2@x.com")
    resp = client.post("/tasks", json={"title": ""}, headers=auth(token))
    assert resp.status_code == 422

def test_get_missing_task_returns_404():
    token = register_and_login("u3@x.com")
    assert client.get("/tasks/99999", headers=auth(token)).status_code == 404

def test_patch_task_updates_only_given_fields():
    token = register_and_login("u4@x.com")
    resp = client.post("/tasks", json={"title": "write the spec"}, headers=auth(token))
    body = resp.json()
    resp = client.patch(f"/tasks/{body['id']}", json={"description": "done"}, headers=auth(token))
    body = resp.json()
    assert body["description"] == "done"
    assert body["title"] == "write the spec"

def test_delete_task_returns_204():
    token = register_and_login("u5@x.com")
    resp = client.post("/tasks", json={"title": "write the spec"}, headers=auth(token))
    body = resp.json()
    resp = client.delete(f"/tasks/{body['id']}", headers=auth(token))
    assert resp.status_code == 204
    resp = client.get(f"/tasks/{body['id']}", headers=auth(token))
    assert resp.status_code == 404

def test_delete_missing_task_returns_404():
    token = register_and_login("u6@x.com")
    resp = client.delete("/tasks/99999", headers=auth(token))
    assert resp.status_code == 404

def test_list_tasks_returns_all():
    token = register_and_login("u7@x.com")
    client.post("/tasks", json={"title": "write the spec"}, headers=auth(token))
    client.post("/tasks", json={"title": "done"}, headers=auth(token))
    resp = client.get("/tasks", headers=auth(token))
    assert resp.status_code == 200
    assert len(resp.json()) >= 2

def test_list_tasks_filters_by_status():
    token = register_and_login("u8@x.com")
    resp = client.get("/tasks?status=nonexistent_status_xyz", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json() == []

def test_user_cannot_see_others_tasks():
    token_a = register_and_login("a@iso.com")
    token_b = register_and_login("b@iso.com")

    resp = client.post("/tasks", json={"title": "a's secret"}, headers=auth(token_a))
    task_id = resp.json()["id"]

    resp = client.get("/tasks", headers=auth(token_b))
    titles = [t["title"] for t in resp.json()]
    assert "a's secret" not in titles

    resp = client.get(f"/tasks/{task_id}", headers=auth(token_b))
    assert resp.status_code == 404
