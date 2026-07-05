from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)  # wraps the app; no network, no port — calls it directly

def test_health_returns_ok():
    response = client.get("/health")          # act: make a GET request
    assert response.status_code == 200         # the HTTP contract
    assert response.json() == {"status": "ok"} # the body contract

def test_version():
    response = client.get("/version")
    assert response.status_code == 200
    assert response.json() == {"version": "0.1.0"}

def test_db():
    response = client.get("/health/db")
    assert response.status_code == 200
    assert response.json() == {"db": "not wired yet"}
