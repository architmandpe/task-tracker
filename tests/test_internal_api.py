import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
HEADERS = {"X-Internal-Secret": os.environ["INTERNAL_SECRET"]}


def make_user(email: str) -> int:
    client.post("/auth/signup", json={"email": email, "password": "supersecret"})
    resp = client.post("/auth/login", json={"email": email, "password": "supersecret"})
    assert resp.status_code == 200
    return client.get("/auth/me").json()["id"]


def test_bulk_create_applies_shared_due_date_and_priority():
    """Subtasks broken out of a dated parent have to land on the parent's date -
    without this they were created undated and stranded under Unscheduled."""
    user_id = make_user("bulk1@x.com")
    resp = client.post(
        f"/internal/tasks/{user_id}/bulk",
        json={
            "titles": ["Book flights", "Pack essentials"],
            "due_at": "2026-08-07T00:00:00",
            "priority": "high",
        },
        headers=HEADERS,
    )
    assert resp.status_code == 201
    tasks = resp.json()
    assert len(tasks) == 2
    for task in tasks:
        assert task["due_at"].startswith("2026-08-07")
        assert task["priority"] == "high"


def test_bulk_create_without_shared_fields_still_works():
    user_id = make_user("bulk2@x.com")
    resp = client.post(
        f"/internal/tasks/{user_id}/bulk",
        json={"titles": ["Think about the pricing page"]},
        headers=HEADERS,
    )
    assert resp.status_code == 201
    task = resp.json()[0]
    assert task["due_at"] is None
    assert task["priority"] == "normal"
