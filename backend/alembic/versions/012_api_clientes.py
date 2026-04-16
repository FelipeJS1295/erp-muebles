"""api clientes marketplace

Revision ID: 012
Revises: 011
Create Date: 2026-04-16

"""
from alembic import op
import sqlalchemy as sa

revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'api_clientes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('cliente_id', sa.Integer(), sa.ForeignKey('clientes_ventas.id'), nullable=False),
        sa.Column('marketplace', sa.String(50), nullable=False),
        sa.Column('activo', sa.Integer(), default=1),
        # Credenciales genéricas
        sa.Column('api_key', sa.String(500), nullable=True),
        sa.Column('api_secret', sa.String(500), nullable=True),
        sa.Column('client_id', sa.String(500), nullable=True),
        sa.Column('seller_id', sa.String(500), nullable=True),
        sa.Column('base_url', sa.String(500), nullable=True),
        sa.Column('extra', sa.JSON(), nullable=True),  # Para campos adicionales
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_api_clientes_cliente_id', 'api_clientes', ['cliente_id'])
    op.create_index('ix_api_clientes_marketplace', 'api_clientes', ['marketplace'])


def downgrade() -> None:
    op.drop_index('ix_api_clientes_marketplace', 'api_clientes')
    op.drop_index('ix_api_clientes_cliente_id', 'api_clientes')
    op.drop_table('api_clientes')