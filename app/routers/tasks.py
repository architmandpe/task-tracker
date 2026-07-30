from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_session, get_current_user
from app.schemas import TaskCreate, TaskRead
from app.services.task_service import TaskService
from app.schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, user=Depends(get_current_user), session: Session = Depends(get_session)) -> TaskRead:
    service = TaskService(session)
    fields = payload.model_dump(exclude_unset=True, exclude_none=True, exclude={"title", "description"})
    task = service.create_task(title=payload.title, description=payload.description, owner_id=user.id, **fields)
    return task

@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, user=Depends(get_current_user), session: Session = Depends(get_session)) -> TaskRead:
    task = TaskService(session).get_task(task_id, user.id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="task not found")
    return task

@router.patch("/{task_id}", response_model=TaskRead)
def patch_task(task_id: int, payload: TaskUpdate, user=Depends(get_current_user), session: Session = Depends(get_session)) -> TaskRead:
    fields = payload.model_dump(exclude_unset=True)
    task = TaskService(session).update_task(task_id, user.id, **fields)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="task not found")
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, user=Depends(get_current_user), session: Session = Depends(get_session)) -> None:
    deleted = TaskService(session).delete_task(task_id, user.id)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="task not found")


@router.post("/{task_id}/restore", response_model=TaskRead)
def restore_task(task_id: int, user=Depends(get_current_user), session: Session = Depends(get_session)) -> TaskRead:
    """Undo a delete. The task comes back with its original id and history."""
    task = TaskService(session).restore_task(task_id, user.id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="task not found")
    return task


@router.get("", response_model=list[TaskRead])
def list_tasks(status: str | None = None, user=Depends(get_current_user), session: Session = Depends(get_session)) -> list[TaskRead]:
    return TaskService(session).list_tasks(owner_id=user.id, status=status)
