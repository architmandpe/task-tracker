from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import tasks
from app.routers import auth
from app.routers import assistant

app = FastAPI(title="Task Tracker")
app.include_router(assistant.router)
app.include_router(tasks.router)
app.include_router(auth.router)
app.mount("/app", StaticFiles(directory="static", html=True), name="static")

@app.get("/health")
async def health() -> dict[str, str]:
    # A liveness probe. Returns 200 + a tiny body so a load balancer
    # (or you) can ask "is this process alive and answering?"
    return {"status": "ok"}

@app.get("/version")
async def version() -> dict[str, str]:
    return {"version": "0.1.0"}

@app.get("/health/db")
async def db() -> dict[str, str]:
    return {"db": "not wired yet"}