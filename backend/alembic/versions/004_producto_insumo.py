"""producto insumo relacion

Revision ID: 004
Revises: 003
Create Date: 2026-04-14

"""
from alembic import op
import sqlalchemy as sa


revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'producto_insumos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('producto_interno_id', sa.Integer(), sa.ForeignKey('productos_internos.id'), nullable=False),
        sa.Column('insumo_id', sa.Integer(), sa.ForeignKey('insumos.id'), nullable=False),
        sa.Column('cantidad', sa.Float(), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_producto_insumos_producto', 'producto_insumos', ['producto_interno_id'])
    op.create_index('ix_producto_insumos_insumo', 'producto_insumos', ['insumo_id'])


def downgrade() -> None:
    op.drop_index('ix_producto_insumos_producto', 'producto_insumos')
    op.drop_index('ix_producto_insumos_insumo', 'producto_insumos')
    op.drop_table('producto_insumos')