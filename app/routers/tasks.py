from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_session
from app.schemas import TaskCreate, TaskRead
from app.services.task_service import TaskService
from app.schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, session: Session = Depends(get_session)) -> TaskRead:
    service = TaskService(session)
    task = service.create_task(title=payload.title, description=payload.description, owner_id=1)
    return task

@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, session: Session = Depends(get_session)) -> TaskRead:
    task = TaskService(session).get_task(task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="task not found")
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def patch_task(task_id: int, payload: TaskUpdate, session: Session = Depends(get_session)) -> TaskRead:
    fields = payload.model_dump(exclude_unset=True)
    task = TaskService(session).update_task(task_id, **fields)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="task not found")
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, session: Session = Depends(get_session)) -> None:
    deleted = TaskService(session).delete_task(task_id)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="task not found")

@router.get("", response_model=list[TaskRead])
def list_tasks(status: str | None = None, session: Session = Depends(get_session)) -> list[TaskRead]:
    return TaskService(session).list_tasks(owner_id=1, status=status)
