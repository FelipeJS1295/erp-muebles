"""insumos

Revision ID: 003
Revises: 002
Create Date: 2026-04-14

"""
from alembic import op
import sqlalchemy as sa


revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'insumos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('codigo', sa.String(100), nullable=False),
        sa.Column('nombre', sa.String(300), nullable=False),
        sa.Column('unidad_medida', sa.Enum(
            'kg', 'metros', 'centimetros', 'unidades', 'litros', 'gramos', 'metros2',
            name='unidadmedidaenum'
        ), nullable=False),
        sa.Column('precio_costo', sa.Float(), nullable=False),
        sa.Column('precio_venta', sa.Float(), nullable=False),
        sa.Column('activo', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('codigo'),
    )
    op.create_index('ix_insumos_codigo', 'insumos', ['codigo'])


def downgrade() -> None:
    op.drop_index('ix_insumos_codigo', 'insumos')
    op.drop_table('insumos')
    op.execute("DROP TYPE IF EXISTS unidadmedidaenum")