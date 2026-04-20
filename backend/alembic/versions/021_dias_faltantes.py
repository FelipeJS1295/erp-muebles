"""dias faltantes

Revision ID: 021
Revises: 020
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa

revision = '021'
down_revision = '020'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'dias_faltantes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('trabajador_id', sa.Integer(), sa.ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('sueldo_base', sa.Float(), nullable=False),
        sa.Column('monto_descuento', sa.Float(), nullable=False),
        sa.Column('observacion', sa.String(300), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dias_faltantes_trabajador_id', 'dias_faltantes', ['trabajador_id'])
    op.create_index('ix_dias_faltantes_fecha', 'dias_faltantes', ['fecha'])


def downgrade() -> None:
    op.drop_index('ix_dias_faltantes_fecha', 'dias_faltantes')
    op.drop_index('ix_dias_faltantes_trabajador_id', 'dias_faltantes')
    op.drop_table('dias_faltantes')