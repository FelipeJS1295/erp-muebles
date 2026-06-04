"""agregar hites a marketplace enum

Revision ID: 028
Revises: 027
Create Date: 2026-06-04

"""
from alembic import op

revision = '028'
down_revision = '027'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE marketplaceenum ADD VALUE IF NOT EXISTS 'hites'")


def downgrade() -> None:
    pass