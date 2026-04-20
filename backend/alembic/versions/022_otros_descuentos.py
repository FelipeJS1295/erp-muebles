"""otros descuentos

Revision ID: 022
Revises: 021
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa

revision = '022'
down_revision = '021'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'otros_descuentos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('trabajador_id', sa.Integer(), sa.ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tipo', sa.Enum(
            'compras', 'horas', 'otro',
            name='tipootrodescuentoenum'
        ), nullable=False),
        sa.Column('documento', sa.String(200), nullable=True),
        sa.Column('monto_total', sa.Float(), nullable=False),
        sa.Column('cuotas', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('monto_cuota', sa.Float(), nullable=True),
        sa.Column('cuotas_pagadas', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('horas', sa.Float(), nullable=True),
        sa.Column('valor_hora', sa.Float(), nullable=True),
        sa.Column('descripcion', sa.String(300), nullable=True),
        sa.Column('activo', sa.Integer(), server_default='1'),
        sa.Column('fecha_inicio', sa.Date(), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_otros_descuentos_trabajador_id', 'otros_descuentos', ['trabajador_id'])
    op.create_index('ix_otros_descuentos_activo', 'otros_descuentos', ['activo'])


def downgrade() -> None:
    op.drop_index('ix_otros_descuentos_activo', 'otros_descuentos')
    op.drop_index('ix_otros_descuentos_trabajador_id', 'otros_descuentos')
    op.drop_table('otros_descuentos')
    op.execute("DROP TYPE IF EXISTS tipootrodescuentoenum")