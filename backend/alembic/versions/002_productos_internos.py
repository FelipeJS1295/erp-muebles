"""productos internos

Revision ID: 002
Revises: 89d46bb07139
Create Date: 2026-04-14

"""
from alembic import op
import sqlalchemy as sa


revision = '002'
down_revision = '89d46bb07139'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'productos_internos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('sku_padre', sa.String(100), nullable=False),
        sa.Column('sku', sa.String(100), nullable=False),
        sa.Column('descripcion', sa.String(500), nullable=False),
        sa.Column('tipo_producto', sa.Enum('sofa','seccional','modular','poltrona','cojineria','cama', name='tipoproductoenum'), nullable=False),
        sa.Column('precio_venta', sa.Float(), nullable=False),
        sa.Column('precio_venta_descuento', sa.Float(), nullable=False),
        sa.Column('precio_costura', sa.Float(), nullable=False),
        sa.Column('precio_esqueleteria', sa.Float(), nullable=False),
        sa.Column('precio_tapiceria', sa.Float(), nullable=False),
        sa.Column('color', sa.String(100), nullable=True),
        sa.Column('material', sa.String(200), nullable=True),
        sa.Column('peso', sa.Float(), nullable=True),
        sa.Column('dimensiones', sa.JSON(), nullable=True),
        sa.Column('imagenes', sa.JSON(), nullable=True),
        sa.Column('activo', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sku'),
    )
    op.create_index('ix_productos_internos_sku', 'productos_internos', ['sku'])
    op.create_index('ix_productos_internos_sku_padre', 'productos_internos', ['sku_padre'])


def downgrade() -> None:
    op.drop_index('ix_productos_internos_sku', 'productos_internos')
    op.drop_index('ix_productos_internos_sku_padre', 'productos_internos')
    op.drop_table('productos_internos')
    op.execute("DROP TYPE IF EXISTS tipoproductoenum")