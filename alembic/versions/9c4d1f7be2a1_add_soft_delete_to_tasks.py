"""add soft delete to tasks

Revision ID: 9c4d1f7be2a1
Revises: 237b687e58a0
Create Date: 2026-07-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c4d1f7be2a1'
down_revision: Union[str, Sequence[str], None] = '237b687e58a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tasks', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.create_index(op.f('ix_tasks_deleted_at'), 'tasks', ['deleted_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_tasks_deleted_at'), table_name='tasks')
    op.drop_column('tasks', 'deleted_at')
