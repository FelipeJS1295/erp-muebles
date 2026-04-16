"""boletas

Revision ID: 013
Revises: 012
Create Date: 2026-04-16

"""
from alembic import op
import sqlalchemy as sa

revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'boletas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('orden_id', sa.Integer(), sa.ForeignKey('ordenes.id'), nullable=True),
        sa.Column('marketplace', sa.String(50), nullable=True),
        sa.Column('orden_id_marketplace', sa.String(100), nullable=True),
        sa.Column('folio', sa.Integer(), nullable=True),
        sa.Column('rut_cliente', sa.String(20), nullable=True),
        sa.Column('nombre_cliente', sa.String(200), nullable=True),
        sa.Column('total', sa.Float(), nullable=True),
        sa.Column('monto_neto', sa.Float(), nullable=True),
        sa.Column('iva', sa.Float(), nullable=True),
        sa.Column('url_boleta', sa.String(500), nullable=True),
        sa.Column('estado', sa.String(50), default='emitida'),
        sa.Column('enviada_marketplace', sa.Integer(), default=0),
        sa.Column('fecha_emision', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_boletas_orden_id', 'boletas', ['orden_id'])
    op.create_index('ix_boletas_folio', 'boletas', ['folio'])


def downgrade() -> None:
    op.drop_index('ix_boletas_folio', 'boletas')
    op.drop_index('ix_boletas_orden_id', 'boletas')
    op.drop_table('boletas')