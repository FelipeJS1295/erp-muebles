"""remuneraciones

Revision ID: 017
Revises: 016
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa

revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'remuneraciones',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('trabajador_id', sa.Integer(), sa.ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sueldo_base', sa.Float(), nullable=False),
        sa.Column('tipo', sa.Enum(
            'contrato', 'boleta', 'sin_contrato',
            name='tipocontratoenum'
        ), nullable=False),
        sa.Column('activo', sa.Integer(), default=1),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('trabajador_id'),
    )
    op.create_index('ix_remuneraciones_trabajador_id', 'remuneraciones', ['trabajador_id'])


def downgrade() -> None:
    op.drop_index('ix_remuneraciones_trabajador_id', 'remuneraciones')
    op.drop_table('remuneraciones')
    op.execute("DROP TYPE IF EXISTS tipocontratoenum")