import os
import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.deps import get_current_user
from app.schemas import TaskDraft

router = APIRouter(prefix="/assistant", tags=["assistant"])

COPILOT_URL = os.environ.get("COPILOT_URL", "http://localhost:8001")
INTERNAL_SECRET = os.environ["INTERNAL_SECRET"]

class ParseIn(BaseModel):
    sentence: str

@router.post("/parse", response_model=TaskDraft)
def parse_assistant(body: ParseIn, user=Depends(get_current_user)) -> TaskDraft:
    resp = httpx.post(
        f"{COPILOT_URL}/parse",
        json={"sentence": body.sentence},
        headers={"X-Internal-Secret": INTERNAL_SECRET},
    )
    resp.raise_for_status()
    return resp.json()


class AskIn(BaseModel):
    question: str

@router.post("/ask")
def ask_assistant(body: AskIn, user=Depends(get_current_user)) -> dict:
    resp = httpx.post(
        f"{COPILOT_URL}/ask",
        json={"user_id": user.id, "question": body.question},
        headers={"X-Internal-Secret": INTERNAL_SECRET},
    )
    resp.raise_for_status()
    return resp.json()
