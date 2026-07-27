import os
import time
from collections import defaultdict
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.deps import get_current_user, get_session
from app.schemas import TaskDraft, AgentActionRead
from app.repositories.agent_action_repo import AgentActionRepository

router = APIRouter(prefix="/assistant", tags=["assistant"])

COPILOT_URL = os.environ.get("COPILOT_URL", "http://localhost:8001")
INTERNAL_SECRET = os.environ["INTERNAL_SECRET"]

MAX_MESSAGE_LENGTH = 500
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60
_request_log: dict[int, list[float]] = defaultdict(list)

def enforce_message_guardrails(user_id: int, message: str | None) -> None:
    if message is not None and len(message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"message too long (max {MAX_MESSAGE_LENGTH} characters)",
        )
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    _request_log[user_id] = [t for t in _request_log[user_id] if t > window_start]
    if len(_request_log[user_id]) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "rate limit exceeded, try again shortly",
        )
    _request_log[user_id].append(now)

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


class SearchIn(BaseModel):
    query: str

@router.post("/search")
def search_assistant(body: SearchIn, user=Depends(get_current_user)) -> list[dict]:
    resp = httpx.post(
        f"{COPILOT_URL}/search",
        json={"user_id": user.id, "query": body.query},
        headers={"X-Internal-Secret": INTERNAL_SECRET},
    )
    resp.raise_for_status()
    return resp.json()


class ChatIn(BaseModel):
    message: str | None = None
    confirm: bool | None = None

@router.post("/chat")
def chat_assistant(body: ChatIn, user=Depends(get_current_user)) -> dict:
    enforce_message_guardrails(user.id, body.message)
    resp = httpx.post(
        f"{COPILOT_URL}/chat",
        json={
            "user_id": user.id,
            "thread_id": str(user.id),
            "message": body.message,
            "confirm": body.confirm,
        },
        headers={"X-Internal-Secret": INTERNAL_SECRET},
    )
    resp.raise_for_status()
    return resp.json()


@router.get("/audit", response_model=list[AgentActionRead])
def audit_log(user=Depends(get_current_user), session: Session = Depends(get_session)) -> list[AgentActionRead]:
    return AgentActionRepository(session).list_for_user(user.id)


@router.post("/stream")
def stream_assistant(body: ChatIn, user=Depends(get_current_user)) -> StreamingResponse:
    enforce_message_guardrails(user.id, body.message)

    def event_stream():
        try:
            with httpx.stream(
                "POST",
                f"{COPILOT_URL}/stream",
                json={
                    "user_id": user.id,
                    "thread_id": str(user.id),
                    "message": body.message,
                    "confirm": body.confirm,
                },
                headers={"X-Internal-Secret": INTERNAL_SECRET},
                timeout=httpx.Timeout(60.0, connect=10.0),
            ) as resp:
                for chunk in resp.iter_bytes():
                    yield chunk
        except Exception:
            yield b"data: I'm having trouble reaching the assistant right now. Please try again in a moment.\n\n"
            yield b"data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
