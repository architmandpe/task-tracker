import datetime as dt
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Task

def _next_due_date(due_at: dt.datetime, recurrence: str) -> dt.datetime:
    if recurrence == "daily":
        return due_at + dt.timedelta(days=1)
    if recurrence == "weekly":
        return due_at + dt.timedelta(weeks=1)
    if recurrence == "monthly":
        year = due_at.year + (due_at.month // 12)
        month = due_at.month % 12 + 1
        day = min(due_at.day, 28)
        return due_at.replace(year=year, month=month, day=day)
    raise ValueError(f"unknown recurrence: {recurrence}")


class TaskRepository:
    def __init__(self,session: Session):
        self.session =session

    def create(
        self, *, title: str, owner_id: int, description: str | None = None,
        priority: str = "normal", due_at: dt.datetime | None = None,
        recurrence: str | None = None,
    ) -> Task:
        task = Task(
            title=title, owner_id=owner_id, description=description,
            priority=priority, due_at=due_at, recurrence=recurrence,
        )
        self.session.add(task)
        self.session.commit()
        self.session.refresh(task)
        return task

    def get(self, task_id: int, owner_id: int) -> Task | None:
        task = self.session.get(Task, task_id)
        if task is None or task.owner_id != owner_id:
            return None
        return task

    def list_for_user(self, owner_id: int, status: str | None = None) -> list[Task]:
        stmt = select(Task).where(Task.owner_id == owner_id)
        if status is not None:
            stmt = stmt.where(Task.status == status)
        stmt = stmt.order_by(Task.created_at.desc())
        return list(self.session.scalars(stmt))


    def update(self, task_id: int, owner_id: int, **fields) -> Task | None:
        task = self.session.get(Task, task_id)
        if task is None or task.owner_id != owner_id:
            return None
        completing = fields.get("status") == "done" and task.status != "done"
        for key, value in fields.items():
            setattr(task, key, value)
        self.session.commit()
        self.session.refresh(task)
        if completing and task.recurrence and task.due_at:
            self.create(
                title=task.title, owner_id=owner_id, description=task.description,
                priority=task.priority, recurrence=task.recurrence,
                due_at=_next_due_date(task.due_at, task.recurrence),
            )
        return task

    def delete(self, task_id: int, owner_id: int) -> bool:
        task = self.session.get(Task, task_id)
        if task is None or task.owner_id != owner_id:
            return False
        self.session.delete(task)
        self.session.commit()
        return True
