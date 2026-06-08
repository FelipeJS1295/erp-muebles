"""alias productos maestra

Revision ID: 029
Revises: 028
Create Date: 2026-01-01

"""
from alembic import op
import sqlalchemy as sa

revision = '029'
down_revision = '028'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'alias_productos_maestra',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('sku', sa.String(200), nullable=False),
        sa.Column('nombre_original', sa.String(500), nullable=False),
        sa.Column('alias', sa.String(500), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_alias_sku', 'alias_productos_maestra', ['sku'])


def downgrade() -> None:
    op.drop_index('ix_alias_sku', 'alias_productos_maestra')
    op.drop_table('alias_productos_maestra')