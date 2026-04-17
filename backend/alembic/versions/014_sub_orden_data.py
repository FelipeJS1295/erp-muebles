"""sub orden data

Revision ID: 014
Revises: 013
Create Date: 2026-04-16

"""
from alembic import op
import sqlalchemy as sa

revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'sub_orden_data',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('orden_id', sa.Integer(), sa.ForeignKey('ordenes.id'), nullable=False),
        sa.Column('orden_id_marketplace', sa.String(100), nullable=True),
        sa.Column('marketplace', sa.String(50), nullable=True),
        # Cliente
        sa.Column('cliente_nombre', sa.String(200), nullable=True),
        sa.Column('cliente_rut', sa.String(20), nullable=True),
        sa.Column('cliente_email', sa.String(200), nullable=True),
        sa.Column('cliente_telefono', sa.String(30), nullable=True),
        # Dirección facturación
        sa.Column('billing_direccion', sa.String(300), nullable=True),
        sa.Column('billing_ciudad', sa.String(100), nullable=True),
        sa.Column('billing_comuna', sa.String(100), nullable=True),
        # Dirección despacho
        sa.Column('shipping_direccion', sa.String(300), nullable=True),
        sa.Column('shipping_ciudad', sa.String(100), nullable=True),
        sa.Column('shipping_comuna', sa.String(100), nullable=True),
        # Costos
        sa.Column('costo_despacho', sa.Float(), nullable=True, default=0),
        sa.Column('subtotal_productos', sa.Float(), nullable=True, default=0),
        sa.Column('total', sa.Float(), nullable=True, default=0),
        # Tipo de documento
        sa.Column('tipo_documento', sa.String(50), nullable=True, default='boleta'),
        # Datos factura (cuando cliente pide factura)
        sa.Column('factura_rut', sa.String(20), nullable=True),
        sa.Column('factura_razon_social', sa.String(200), nullable=True),
        sa.Column('factura_giro', sa.String(200), nullable=True),
        sa.Column('factura_direccion', sa.String(300), nullable=True),
        sa.Column('factura_ciudad', sa.String(100), nullable=True),
        sa.Column('factura_comuna', sa.String(100), nullable=True),
        sa.Column('factura_email', sa.String(200), nullable=True),
        # Fechas
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_sub_orden_data_orden_id', 'sub_orden_data', ['orden_id'])
    op.create_index('ix_sub_orden_data_orden_id_marketplace', 'sub_orden_data', ['orden_id_marketplace'])


def downgrade() -> None:
    op.drop_index('ix_sub_orden_data_orden_id_marketplace', 'sub_orden_data')
    op.drop_index('ix_sub_orden_data_orden_id', 'sub_orden_data')
    op.drop_table('sub_orden_data')