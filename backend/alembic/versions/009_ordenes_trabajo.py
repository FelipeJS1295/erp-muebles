"""ordenes de trabajo

Revision ID: 009
Revises: 008
Create Date: 2026-04-15

"""
from alembic import op
import sqlalchemy as sa

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'ordenes_trabajo',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('numero_ot', sa.String(50), nullable=False, index=True),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('trabajador_id', sa.Integer(), sa.ForeignKey('trabajadores.id'), nullable=False),
        sa.Column('producto_interno_id', sa.Integer(), sa.ForeignKey('productos_internos.id'), nullable=False),
        sa.Column('descripcion', sa.String(500), nullable=True),
        sa.Column('cargo_trabajador', sa.String(50), nullable=False),
        sa.Column('precio_aplicado', sa.Float(), nullable=False),
        sa.Column('estado', sa.String(50), default='pendiente'),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ordenes_trabajo_numero_ot', 'ordenes_trabajo', ['numero_ot'])
    op.create_index('ix_ordenes_trabajo_trabajador', 'ordenes_trabajo', ['trabajador_id'])
    op.create_index('ix_ordenes_trabajo_fecha', 'ordenes_trabajo', ['fecha'])


def downgrade() -> None:
    op.drop_index('ix_ordenes_trabajo_numero_ot', 'ordenes_trabajo')
    op.drop_index('ix_ordenes_trabajo_trabajador', 'ordenes_trabajo')
    op.drop_index('ix_ordenes_trabajo_fecha', 'ordenes_trabajo')
    op.drop_table('ordenes_trabajo')