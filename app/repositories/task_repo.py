from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Task

class TaskRepository:
    def __init__(self,session: Session):
        self.session =session

    def create(self, *, title: str, owner_id: int, description:str | None = None) -> Task:
        task = Task(title=title, owner_id=owner_id, description=description)
        self.session.add(task)
        self.session.commit()
        self.session.refresh(task)
        return task
    
    def get(self, task_id: int) -> Task | None:
        return self.session.get(Task, task_id)
    
    def list_for_user(self, owner_id: int, status: str | None = None) -> list[Task]:
        stmt = select(Task).where(Task.owner_id == owner_id)
        if status is not None:
            stmt = stmt.where(Task.status == status)
        stmt = stmt.order_by(Task.created_at.desc())
        return list(self.session.scalars(stmt))

    
    def update(self, task_id: int, **fields) -> Task | None:
        task = self.session.get(Task, task_id)
        if task is None:
            return None
        for key, value in fields.items():
            setattr(task, key, value)
        self.session.commit()
        self.session.refresh(task)
        return task
    
    def delete(self, task_id: int) -> bool:
        task = self.session.get(Task, task_id)
        if task is None:
            return False
        self.session.delete(task)
        self.session.commit()
        return True