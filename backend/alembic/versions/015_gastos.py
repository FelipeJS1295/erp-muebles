"""gastos mensuales

Revision ID: 015
Revises: 014
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa

revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'gastos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('tipo', sa.Enum(
            'arriendo', 'servicios', 'remuneraciones', 'insumos',
            'logistica', 'marketing', 'equipamiento', 'mantencion',
            'impuestos', 'otros',
            name='tipogastoenum'
        ), nullable=False),
        sa.Column('descripcion', sa.String(500), nullable=False),
        sa.Column('monto', sa.Float(), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gastos_fecha', 'gastos', ['fecha'])
    op.create_index('ix_gastos_tipo', 'gastos', ['tipo'])


def downgrade() -> None:
    op.drop_index('ix_gastos_tipo', 'gastos')
    op.drop_index('ix_gastos_fecha', 'gastos')
    op.drop_table('gastos')
    op.execute("DROP TYPE IF EXISTS tipogastoenum")