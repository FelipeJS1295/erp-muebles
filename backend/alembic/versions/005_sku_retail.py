"""sku retail

Revision ID: 005
Revises: 004
Create Date: 2026-04-14

"""
from alembic import op
import sqlalchemy as sa


revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'sku_retail',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('producto_interno_id', sa.Integer(), sa.ForeignKey('productos_internos.id'), nullable=False),
        sa.Column('sku_walmart', sa.String(100), nullable=True),
        sa.Column('sku_paris', sa.String(100), nullable=True),
        sa.Column('sku_falabella', sa.String(100), nullable=True),
        sa.Column('sku_ripley', sa.String(100), nullable=True),
        sa.Column('sku_hites', sa.String(100), nullable=True),
        sa.Column('otros_retail', sa.JSON(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('producto_interno_id'),
    )
    op.create_index('ix_sku_retail_producto', 'sku_retail', ['producto_interno_id'])
    op.create_index('ix_sku_retail_walmart', 'sku_retail', ['sku_walmart'])
    op.create_index('ix_sku_retail_paris', 'sku_retail', ['sku_paris'])
    op.create_index('ix_sku_retail_falabella', 'sku_retail', ['sku_falabella'])
    op.create_index('ix_sku_retail_ripley', 'sku_retail', ['sku_ripley'])
    op.create_index('ix_sku_retail_hites', 'sku_retail', ['sku_hites'])


def downgrade() -> None:
    op.drop_index('ix_sku_retail_producto', 'sku_retail')
    op.drop_index('ix_sku_retail_walmart', 'sku_retail')
    op.drop_index('ix_sku_retail_paris', 'sku_retail')
    op.drop_index('ix_sku_retail_falabella', 'sku_retail')
    op.drop_index('ix_sku_retail_ripley', 'sku_retail')
    op.drop_index('ix_sku_retail_hites', 'sku_retail')
    op.drop_table('sku_retail')