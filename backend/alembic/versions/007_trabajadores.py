"""trabajadores

Revision ID: 007
Revises: 006
Create Date: 2026-04-14

"""
from alembic import op
import sqlalchemy as sa


revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'trabajadores',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('rut', sa.String(12), nullable=False),
        sa.Column('nombre_completo', sa.String(200), nullable=False),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('password_hash', sa.String(200), nullable=True),
        sa.Column('cargo', sa.Enum(
            'cortador', 'costurero', 'tapicero', 'terminaciones', 'bodega', 'otro',
            name='cargoenum'
        ), nullable=True),
        sa.Column('activo', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('rut'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_trabajadores_rut', 'trabajadores', ['rut'])
    op.create_index('ix_trabajadores_email', 'trabajadores', ['email'])


def downgrade() -> None:
    op.drop_index('ix_trabajadores_rut', 'trabajadores')
    op.drop_index('ix_trabajadores_email', 'trabajadores')
    op.drop_table('trabajadores')
    op.execute("DROP TYPE IF EXISTS cargoenum")