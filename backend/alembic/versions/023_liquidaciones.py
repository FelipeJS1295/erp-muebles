"""liquidaciones marketplace

Revision ID: 023
Revises: 022
Create Date: 2026-04-20

"""
from alembic import op
import sqlalchemy as sa

revision = '023'
down_revision = '022'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'liquidaciones',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('marketplace', sa.String(50), nullable=False),
        sa.Column('nro_suborden', sa.String(100), nullable=True),
        sa.Column('orden_id', sa.Integer(), sa.ForeignKey('ordenes.id'), nullable=True),
        sa.Column('descripcion', sa.String(500), nullable=True),
        sa.Column('tipo', sa.Enum(
            'venta', 'cobro_despacho', 'devolucion', 'despacho',
            name='tipoliquidacionenum'
        ), nullable=False),
        sa.Column('monto', sa.Float(), nullable=True),
        sa.Column('comision_pct', sa.Float(), nullable=True),
        sa.Column('monto_a_pagar', sa.Float(), nullable=True),
        sa.Column('fecha_transaccion', sa.Date(), nullable=True),
        sa.Column('archivo_origen', sa.String(300), nullable=True),
        sa.Column('nro_solicitud', sa.String(100), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_liquidaciones_marketplace', 'liquidaciones', ['marketplace'])
    op.create_index('ix_liquidaciones_nro_suborden', 'liquidaciones', ['nro_suborden'])
    op.create_index('ix_liquidaciones_orden_id', 'liquidaciones', ['orden_id'])
    op.create_index('ix_liquidaciones_tipo', 'liquidaciones', ['tipo'])
    op.create_index('ix_liquidaciones_fecha', 'liquidaciones', ['fecha_transaccion'])


def downgrade() -> None:
    op.drop_index('ix_liquidaciones_fecha', 'liquidaciones')
    op.drop_index('ix_liquidaciones_tipo', 'liquidaciones')
    op.drop_index('ix_liquidaciones_orden_id', 'liquidaciones')
    op.drop_index('ix_liquidaciones_nro_suborden', 'liquidaciones')
    op.drop_index('ix_liquidaciones_marketplace', 'liquidaciones')
    op.drop_table('liquidaciones')
    op.execute("DROP TYPE IF EXISTS tipoliquidacionenum")