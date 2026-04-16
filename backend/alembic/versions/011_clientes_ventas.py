"""clientes ventas y orden manual

Revision ID: 011
Revises: 010
Create Date: 2026-04-16

"""
from alembic import op
import sqlalchemy as sa

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabla clientes ventas
    op.create_table(
        'clientes_ventas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('rut', sa.String(20), nullable=True),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('telefono', sa.String(20), nullable=True),
        sa.Column('activo', sa.Integer(), default=1),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_clientes_ventas_rut', 'clientes_ventas', ['rut'])
    op.create_index('ix_clientes_ventas_nombre', 'clientes_ventas', ['nombre'])

    # Agregar 'manual' al enum de marketplace
    op.execute("ALTER TYPE marketplaceenum ADD VALUE IF NOT EXISTS 'manual'")

    # Agregar columna cliente_id a ordenes
    op.add_column('ordenes', sa.Column('cliente_id', sa.Integer(), sa.ForeignKey('clientes_ventas.id'), nullable=True))
    op.add_column('ordenes', sa.Column('notas', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('ordenes', 'notas')
    op.drop_column('ordenes', 'cliente_id')
    op.drop_index('ix_clientes_ventas_nombre', 'clientes_ventas')
    op.drop_index('ix_clientes_ventas_rut', 'clientes_ventas')
    op.drop_table('clientes_ventas')