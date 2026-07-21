import os
import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.deps import get_current_user
from app.schemas import TaskDraft

router = APIRouter(prefix="/assistant", tags=["assistant"])

COPILOT_URL = os.environ.get("COPILOT_URL", "http://localhost:8001")

class ParseIn(BaseModel):
    sentence: str

@router.post("/parse", response_model=TaskDraft)
def parse_assistant(body: ParseIn, user=Depends(get_current_user)) -> TaskDraft:
    resp = httpx.post(f"{COPILOT_URL}/parse", json={"sentence": body.sentence})
    resp.raise_for_status()
    return resp.json()
