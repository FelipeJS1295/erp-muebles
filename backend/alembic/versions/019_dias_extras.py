"""dias extras

Revision ID: 019
Revises: 018
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa

revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'dias_extras',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('trabajador_id', sa.Integer(), sa.ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('tipo_dia', sa.Enum(
            'sabado', 'domingo',
            name='tipodiaextraenum'
        ), nullable=False),
        sa.Column('monto', sa.Float(), nullable=False),
        sa.Column('observacion', sa.String(300), nullable=True),
        sa.Column('estado', sa.Enum(
            'pendiente', 'aprobada', 'rechazada',
            name='estadodiaextraenum'
        ), nullable=False, server_default='pendiente'),
        sa.Column('aprobado_por', sa.String(100), nullable=True),
        sa.Column('fecha_aprobacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dias_extras_trabajador_id', 'dias_extras', ['trabajador_id'])
    op.create_index('ix_dias_extras_estado', 'dias_extras', ['estado'])
    op.create_index('ix_dias_extras_fecha', 'dias_extras', ['fecha'])


def downgrade() -> None:
    op.drop_index('ix_dias_extras_fecha', 'dias_extras')
    op.drop_index('ix_dias_extras_estado', 'dias_extras')
    op.drop_index('ix_dias_extras_trabajador_id', 'dias_extras')
    op.drop_table('dias_extras')
    op.execute("DROP TYPE IF EXISTS tipodiaextraenum")
    op.execute("DROP TYPE IF EXISTS estadodiaextraenum")