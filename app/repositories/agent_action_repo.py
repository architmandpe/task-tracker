from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import AgentAction

class AgentActionRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, *, owner_id: int, action: str, summary: str) -> AgentAction:
        entry = AgentAction(owner_id=owner_id, action=action, summary=summary)
        self.session.add(entry)
        self.session.commit()
        self.session.refresh(entry)
        return entry

    def list_for_user(self, owner_id: int, limit: int = 50) -> list[AgentAction]:
        stmt = (
            select(AgentAction)
            .where(AgentAction.owner_id == owner_id)
            .order_by(AgentAction.created_at.desc())
            .limit(limit)
        )
        return list(self.session.scalars(stmt))
