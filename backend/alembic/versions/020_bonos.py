"""bonos

Revision ID: 020
Revises: 019
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa

revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'bonos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('trabajador_id', sa.Integer(), sa.ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('monto', sa.Float(), nullable=False),
        sa.Column('descripcion', sa.String(300), nullable=True),
        sa.Column('estado', sa.Enum(
            'pendiente', 'aprobado', 'rechazado',
            name='estadobonoenum'
        ), nullable=False, server_default='pendiente'),
        sa.Column('aprobado_por', sa.String(100), nullable=True),
        sa.Column('fecha_aprobacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_bonos_trabajador_id', 'bonos', ['trabajador_id'])
    op.create_index('ix_bonos_estado', 'bonos', ['estado'])
    op.create_index('ix_bonos_fecha', 'bonos', ['fecha'])


def downgrade() -> None:
    op.drop_index('ix_bonos_fecha', 'bonos')
    op.drop_index('ix_bonos_estado', 'bonos')
    op.drop_index('ix_bonos_trabajador_id', 'bonos')
    op.drop_table('bonos')
    op.execute("DROP TYPE IF EXISTS estadobonoenum")