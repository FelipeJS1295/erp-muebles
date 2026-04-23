"""anticipos estado y tipo pago

Revision ID: 025
Revises: 024
Create Date: 2026-04-22

"""
from alembic import op
import sqlalchemy as sa

revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('anticipos', sa.Column('estado', sa.Enum(
        'pendiente', 'pagado', 'rechazado',
        name='estadoanticipooenum'
    ), nullable=False, server_default='pendiente'))
    op.add_column('anticipos', sa.Column('tipo_pago', sa.Enum(
        'efectivo', 'cheque', 'transferencia',
        name='tipopagoanticipooenum'
    ), nullable=True))
    op.add_column('anticipos', sa.Column('fecha_pago', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('anticipos', 'fecha_pago')
    op.drop_column('anticipos', 'tipo_pago')
    op.drop_column('anticipos', 'estado')
    op.execute("DROP TYPE IF EXISTS estadoanticipooenum")
    op.execute("DROP TYPE IF EXISTS tipopagoanticipooenum")