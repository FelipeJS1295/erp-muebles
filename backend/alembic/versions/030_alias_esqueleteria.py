"""alias esqueleteria maestra

Revision ID: 030
Revises: 029
Create Date: 2026-01-01

"""
from alembic import op
import sqlalchemy as sa

revision = '030'
down_revision = '029'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'alias_esqueleteria',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('sku', sa.String(200), nullable=False),
        sa.Column('nombre_original', sa.String(500), nullable=False),
        sa.Column('alias', sa.String(500), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_alias_esqueleteria_sku', 'alias_esqueleteria', ['sku'])


def downgrade() -> None:
    op.drop_index('ix_alias_esqueleteria_sku', 'alias_esqueleteria')
    op.drop_table('alias_esqueleteria')