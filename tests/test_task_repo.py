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

def test_delete_is_soft_and_hides_the_task(session):
    user = User(email="soft@b.com", password_hash="x")
    session.add(user); session.commit()
    repo = TaskRepository(session)
    task = repo.create(title="ship it", owner_id=user.id)

    assert repo.delete(task.id, user.id) is True

    assert repo.list_for_user(user.id) == []
    assert repo.get(task.id, user.id) is None
    # The row survives, which is what makes undo possible.
    assert session.get(Task, task.id) is not None
    assert repo.get(task.id, user.id, include_deleted=True).deleted_at is not None

def test_restore_brings_back_the_same_task(session):
    user = User(email="undo@b.com", password_hash="x")
    session.add(user); session.commit()
    repo = TaskRepository(session)
    task = repo.create(title="ship it", owner_id=user.id, priority="high")
    original_id, created_at = task.id, task.created_at
    repo.delete(task.id, user.id)

    restored = repo.restore(original_id, user.id)

    assert restored is not None
    assert restored.id == original_id
    assert restored.created_at == created_at
    assert restored.priority == "high"
    assert restored.deleted_at is None
    assert [t.id for t in repo.list_for_user(user.id)] == [original_id]

def test_restore_ignores_a_task_that_was_never_deleted(session):
    user = User(email="live@b.com", password_hash="x")
    session.add(user); session.commit()
    repo = TaskRepository(session)
    task = repo.create(title="ship it", owner_id=user.id)

    assert repo.restore(task.id, user.id) is None

def test_deleted_task_cannot_be_updated_or_deleted_again(session):
    user = User(email="gone@b.com", password_hash="x")
    session.add(user); session.commit()
    repo = TaskRepository(session)
    task = repo.create(title="ship it", owner_id=user.id)
    repo.delete(task.id, user.id)

    assert repo.update(task.id, user.id, title="changed") is None
    assert repo.delete(task.id, user.id) is False

def test_another_user_cannot_restore_your_task(session):
    owner = User(email="owner@b.com", password_hash="x")
    other = User(email="other@b.com", password_hash="x")
    session.add_all([owner, other]); session.commit()
    repo = TaskRepository(session)
    task = repo.create(title="private", owner_id=owner.id)
    repo.delete(task.id, owner.id)

    assert repo.restore(task.id, other.id) is None
    assert repo.restore(task.id, owner.id) is not None
