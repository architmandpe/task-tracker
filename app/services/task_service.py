from sqlalchemy.orm import Session
from app.repositories.task_repo import TaskRepository

class TaskService:
    def __init__(self, session: Session):
        self.repo = TaskRepository(session)

    def create_task(self, *, title: str, description: str | None, owner_id: int):
        return self.repo.create(title=title, description=description, owner_id=owner_id)
    
    def get_task(self, task_id: int):
        return self.repo.get(task_id)
    
    def update_task(self, task_id: int, **fields):
        return self.repo.update(task_id, **fields)
    
    def delete_task(self, task_id: int) -> bool:
        return self.repo.delete(task_id)
    
    def list_tasks(self, owner_id: int, status: str | None = None):
        return self.repo.list_for_user(owner_id, status=status)


