"""alias transporte maestra

Revision ID: 031
Revises: 030
Create Date: 2026-01-01

"""
from alembic import op
import sqlalchemy as sa

revision = '031'
down_revision = '030'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'alias_transporte',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('sku', sa.String(200), nullable=False),
        sa.Column('nombre_original', sa.String(500), nullable=False),
        sa.Column('alias', sa.String(500), nullable=False),
        sa.Column('hora_despacho', sa.String(10), nullable=True),
        sa.Column('transporte', sa.String(200), nullable=True),
        sa.Column('empresa', sa.String(200), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_alias_transporte_sku', 'alias_transporte', ['sku'])


def downgrade() -> None:
    op.drop_index('ix_alias_transporte_sku', 'alias_transporte')
    op.drop_table('alias_transporte')