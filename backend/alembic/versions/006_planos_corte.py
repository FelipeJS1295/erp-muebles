"""planos de corte

Revision ID: 006
Revises: 005
Create Date: 2026-04-14

"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'planos_corte',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('producto_interno_id', sa.Integer(), sa.ForeignKey('productos_internos.id'), nullable=False),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('meson_largo', sa.Float(), nullable=False),
        sa.Column('meson_ancho', sa.Float(), nullable=False),
        sa.Column('piezas', sa.JSON(), nullable=True),
        sa.Column('activo', sa.Integer(), default=1),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_planos_corte_producto', 'planos_corte', ['producto_interno_id'])


def downgrade() -> None:
    op.drop_index('ix_planos_corte_producto', 'planos_corte')
    op.drop_table('planos_corte')