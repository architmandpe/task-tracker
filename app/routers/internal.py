import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.deps import get_session, verify_internal_secret
from app.repositories.task_repo import TaskRepository
from app.repositories.agent_action_repo import AgentActionRepository
from app.schemas import TaskInternal, InternalTaskUpdate, AgentActionCreate

router = APIRouter(
    prefix="/internal",
    tags=["internal"],
    dependencies=[Depends(verify_internal_secret)],
)

@router.get("/tasks/{user_id}", response_model=list[TaskInternal])
def internal_list_tasks(user_id: int, session: Session = Depends(get_session)) -> list[TaskInternal]:
    return TaskRepository(session).list_for_user(user_id)


class InternalTaskCreate(BaseModel):
    title: str
    description: str | None = None
    priority: str | None = None
    due_at: dt.datetime | None = None
    recurrence: str | None = None

@router.post("/tasks/{user_id}", response_model=TaskInternal, status_code=status.HTTP_201_CREATED)
def internal_create_task(user_id: int, body: InternalTaskCreate, session: Session = Depends(get_session)) -> TaskInternal:
    fields = body.model_dump(exclude_unset=True, exclude_none=True, exclude={"title"})
    return TaskRepository(session).create(title=body.title, owner_id=user_id, **fields)


class InternalBulkCreate(BaseModel):
    titles: list[str]

@router.post("/tasks/{user_id}/bulk", response_model=list[TaskInternal], status_code=status.HTTP_201_CREATED)
def internal_create_tasks(user_id: int, body: InternalBulkCreate, session: Session = Depends(get_session)) -> list[TaskInternal]:
    repo = TaskRepository(session)
    return [repo.create(title=title, owner_id=user_id) for title in body.titles]


class InternalBulkUpdate(InternalTaskUpdate):
    task_ids: list[int]

@router.patch("/tasks/{user_id}/bulk")
def internal_update_tasks(user_id: int, body: InternalBulkUpdate, session: Session = Depends(get_session)) -> dict:
    fields = body.model_dump(exclude_unset=True, exclude={"task_ids"})
    repo = TaskRepository(session)
    updated = []
    not_found = []
    for tid in body.task_ids:
        task = repo.update(tid, owner_id=user_id, **fields)
        if task is None:
            not_found.append(tid)
        else:
            updated.append(TaskInternal.model_validate(task))
    return {"updated": updated, "not_found": not_found}


@router.patch("/tasks/{user_id}/{task_id}", response_model=TaskInternal)
def internal_update_task(user_id: int, task_id: int, body: InternalTaskUpdate, session: Session = Depends(get_session)) -> TaskInternal:
    fields = body.model_dump(exclude_unset=True)
    task = TaskRepository(session).update(task_id, owner_id=user_id, **fields)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "task not found")
    return task


@router.delete("/tasks/{user_id}/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def internal_delete_task(user_id: int, task_id: int, session: Session = Depends(get_session)) -> None:
    deleted = TaskRepository(session).delete(task_id, owner_id=user_id)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "task not found")


class InternalBulkDelete(BaseModel):
    task_ids: list[int]

@router.delete("/tasks/{user_id}")
def internal_delete_tasks(user_id: int, body: InternalBulkDelete, session: Session = Depends(get_session)) -> dict:
    repo = TaskRepository(session)
    deleted = [tid for tid in body.task_ids if repo.delete(tid, owner_id=user_id)]
    not_found = [tid for tid in body.task_ids if tid not in deleted]
    return {"deleted": deleted, "not_found": not_found}


@router.post("/audit/{user_id}", status_code=status.HTTP_201_CREATED)
def internal_log_action(user_id: int, body: AgentActionCreate, session: Session = Depends(get_session)) -> None:
    AgentActionRepository(session).create(owner_id=user_id, action=body.action, summary=body.summary)
