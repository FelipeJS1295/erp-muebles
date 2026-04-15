"""usuarios

Revision ID: 008
Revises: 007
Create Date: 2026-04-15

"""
from alembic import op
import sqlalchemy as sa


revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'usuarios',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre_usuario', sa.String(100), nullable=False),
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('password_hash', sa.String(200), nullable=False),
        sa.Column('rol', sa.Enum(
            'admin_master', 'admin', 'user', 'view',
            name='rolenum'
        ), nullable=False),
        sa.Column('activo', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre_usuario'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_usuarios_nombre_usuario', 'usuarios', ['nombre_usuario'])
    op.create_index('ix_usuarios_email', 'usuarios', ['email'])


def downgrade() -> None:
    op.drop_index('ix_usuarios_nombre_usuario', 'usuarios')
    op.drop_index('ix_usuarios_email', 'usuarios')
    op.drop_table('usuarios')
    op.execute("DROP TYPE IF EXISTS rolenum")