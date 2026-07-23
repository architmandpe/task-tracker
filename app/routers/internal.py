from fastapi import APIRouter, Depends
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
