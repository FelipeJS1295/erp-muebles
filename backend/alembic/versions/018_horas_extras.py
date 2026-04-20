"""horas extras

Revision ID: 018
Revises: 017
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa

revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'horas_extras',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('trabajador_id', sa.Integer(), sa.ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('horas', sa.Float(), nullable=False),
        sa.Column('sueldo_base', sa.Float(), nullable=False),
        sa.Column('valor_hora', sa.Float(), nullable=False),
        sa.Column('monto_total', sa.Float(), nullable=False),
        sa.Column('observacion', sa.String(300), nullable=True),
        sa.Column('estado', sa.Enum(
            'pendiente', 'aprobada', 'rechazada',
            name='estadohoraextraenum'
        ), nullable=False, server_default='pendiente'),
        sa.Column('aprobado_por', sa.String(100), nullable=True),
        sa.Column('fecha_aprobacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_horas_extras_trabajador_id', 'horas_extras', ['trabajador_id'])
    op.create_index('ix_horas_extras_estado', 'horas_extras', ['estado'])
    op.create_index('ix_horas_extras_fecha', 'horas_extras', ['fecha'])


def downgrade() -> None:
    op.drop_index('ix_horas_extras_fecha', 'horas_extras')
    op.drop_index('ix_horas_extras_estado', 'horas_extras')
    op.drop_index('ix_horas_extras_trabajador_id', 'horas_extras')
    op.drop_table('horas_extras')
    op.execute("DROP TYPE IF EXISTS estadohoraextraenum")