"""orden soft delete

Revision ID: 026
Revises: 025
Create Date: 2026-04-24

"""
from alembic import op
import sqlalchemy as sa

revision = '026'
down_revision = '025'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('ordenes', sa.Column('eliminada', sa.Integer(), nullable=False, server_default='0'))
    op.create_index('ix_ordenes_eliminada', 'ordenes', ['eliminada'])


def downgrade() -> None:
    op.drop_index('ix_ordenes_eliminada', 'ordenes')
    op.drop_column('ordenes', 'eliminada')