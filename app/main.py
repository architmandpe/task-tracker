from fastapi import FastAPI

app = FastAPI(title="Task Tracker")

@app.get("/health")
async def health() -> dict[str, str]:
    # A liveness probe. Returns 200 + a tiny body so a load balancer
    # (or you) can ask "is this process alive and answering?"
    return {"status": "ok"}