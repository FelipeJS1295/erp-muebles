"""anticipos

Revision ID: 024
Revises: 023
Create Date: 2026-04-22

"""
from alembic import op
import sqlalchemy as sa

revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'anticipos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('trabajador_id', sa.Integer(), sa.ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('monto', sa.Float(), nullable=False),
        sa.Column('observacion', sa.String(300), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_anticipos_trabajador_id', 'anticipos', ['trabajador_id'])
    op.create_index('ix_anticipos_fecha', 'anticipos', ['fecha'])


def downgrade() -> None:
    op.drop_index('ix_anticipos_fecha', 'anticipos')
    op.drop_index('ix_anticipos_trabajador_id', 'anticipos')
    op.drop_table('anticipos')