from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)  # wraps the app; no network, no port — calls it directly

def test_health_returns_ok():
    response = client.get("/health")          # act: make a GET request
    assert response.status_code == 200         # the HTTP contract
    assert response.json() == {"status": "ok"} # the body contract