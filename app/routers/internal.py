from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.deps import get_session, verify_internal_secret
from app.repositories.task_repo import TaskRepository
from app.schemas import TaskInternal

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

@router.post("/tasks/{user_id}", response_model=TaskInternal, status_code=status.HTTP_201_CREATED)
def internal_create_task(user_id: int, body: InternalTaskCreate, session: Session = Depends(get_session)) -> TaskInternal:
    return TaskRepository(session).create(title=body.title, owner_id=user_id, description=body.description)


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
