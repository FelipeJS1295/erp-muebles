"""gasto pagos

Revision ID: 016
Revises: 015
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa

revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar columna estado y monto_pagado a gastos
    op.add_column('gastos', sa.Column('estado', sa.String(20), nullable=False, server_default='pendiente'))
    op.add_column('gastos', sa.Column('monto_pagado', sa.Float(), nullable=False, server_default='0'))

    # Crear tabla de pagos
    op.create_table(
        'gasto_pagos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('gasto_id', sa.Integer(), sa.ForeignKey('gastos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('tipo', sa.Enum(
            'transferencia', 'cheque', 'efectivo', 'tarjeta', 'otro',
            name='tipopagoenum'
        ), nullable=False),
        sa.Column('comprobante', sa.String(200), nullable=True),
        sa.Column('monto', sa.Float(), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gasto_pagos_gasto_id', 'gasto_pagos', ['gasto_id'])


def downgrade() -> None:
    op.drop_index('ix_gasto_pagos_gasto_id', 'gasto_pagos')
    op.drop_table('gasto_pagos')
    op.execute("DROP TYPE IF EXISTS tipopagoenum")
    op.drop_column('gastos', 'monto_pagado')
    op.drop_column('gastos', 'estado')