from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_task_returns_201_and_body():
    resp = client.post("/tasks", json={"title": "write the spec"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "write the spec"
    assert body["status"] == "todo"
    assert "id" in body

def test_create_task_rejects_empty_title():
    resp = client.post("/tasks", json={"title":""})
    assert resp.status_code == 422

def test_get_missing_task_returns_404():
    assert client.get("/tasks/99999").status_code == 404

def test_patch_task_updates_only_given_fields():
    resp = client.post("/tasks", json={"title": "write the spec"})
    body = resp.json() 
    resp = client.patch(f"/tasks/{body['id']}", json={"description": "done"})
    body = resp.json()
    assert body["description"] == "done"
    assert body["title"] == "write the spec"

def test_delete_task_returns_204():
    resp = client.post("/tasks", json={"title": "write the spec"})
    body = resp.json()
    resp = client.delete(f"/tasks/{body['id']}")
    assert resp.status_code == 204
    resp = client.get(f"/tasks/{body['id']}")
    assert resp.status_code == 404

def test_delete_missing_task_returns_404():
    resp = client.delete("/tasks/99999")
    assert resp.status_code == 404

def test_list_tasks_returns_all():
    resp = client.post("/tasks", json={"title": "write the spec"})
    resp = client.post("/tasks", json={"title": "done"})
    resp = client.get("/tasks")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2

def test_list_tasks_filters_by_status():
    resp = client.get("/tasks?status=nonexistent_status_xyz")
    assert resp.status_code == 200
    assert resp.json() == []
