import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import tasks
from app.routers import auth
from app.routers import assistant
from app.routers import internal

app = FastAPI(title="Task Tracker")
app.include_router(assistant.router)
app.include_router(tasks.router)
app.include_router(auth.router)
app.include_router(internal.router)

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

# The production frontend build (frontend/dist, copied to frontend_dist in the
# Docker image). Mounted last - Starlette matches routes in registration
# order, so this catch-all must come after every real route above it, or it
# shadows them (e.g. /health would 404 from the static mount instead of ever
# reaching the route above). Only mounted when the build actually exists -
# it's absent on the host (e.g. running tests) unless `npm run build` was run
# manually.
if os.path.isdir("frontend_dist"):
    app.mount("/", StaticFiles(directory="frontend_dist", html=True), name="frontend")