import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.models import User, Task
from app.repositories.task_repo import TaskRepository

@pytest.fixture
def session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    s = sessionmaker(bind=engine)()
    yield s
    s.close()

def test_create_and_list(session):
    user = User(email="a@b.com", password_hash="x")
    session.add(user); session.commit()
    repo = TaskRepository(session)

    repo.create(title="ship it", owner_id=user.id)

    tasks = repo.list_for_user(user.id)
    assert len(tasks) == 1
    assert tasks[0].title == "ship it"
    assert tasks[0].status == "todo"

def test_list_for_user(session):
    user_a = User(email="a@b.com", password_hash="x")
    session.add(user_a); session.commit()
    repo = TaskRepository(session)
    repo.create(title="ship it", owner_id=user_a.id)
    repo.create(title="on the way to ship", owner_id=user_a.id)
    tasks_a = repo.list_for_user(user_a.id)
    assert len(tasks_a) == 2
    assert tasks_a[0].title == "ship it"
    assert tasks_a[1].title == "on the way to ship"


    user_b = User(email="b@b.com", password_hash="x")
    session.add(user_b); session.commit()
    repo = TaskRepository(session)
    repo.create(title="Done", owner_id=user_b.id)
    tasks_b = repo.list_for_user(user_b.id)
    assert len(tasks_b) == 1
    assert tasks_b[0].title == "Done"
