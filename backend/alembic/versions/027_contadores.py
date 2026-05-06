"""crear tabla contadores

Revision ID: 027
Revises: 026
Create Date: 2026-05-06
"""
from alembic import op
import sqlalchemy as sa

revision = '027'
down_revision = '026'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'contadores',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('nombre', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('activo', sa.Boolean(), default=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('contadores')