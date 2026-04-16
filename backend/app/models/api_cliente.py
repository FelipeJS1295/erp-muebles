"""
Modelo API Cliente
==================
Credenciales de marketplace por cliente externo.
"""
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class ApiCliente(Base):
    __tablename__ = "api_clientes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey('clientes_ventas.id'), nullable=False)
    marketplace = Column(String(50), nullable=False)
    activo = Column(Integer, default=1)
    api_key = Column(String(500), nullable=True)
    api_secret = Column(String(500), nullable=True)
    client_id = Column(String(500), nullable=True)
    seller_id = Column(String(500), nullable=True)
    base_url = Column(String(500), nullable=True)
    extra = Column(JSON, nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<ApiCliente {self.marketplace} - cliente_id={self.cliente_id}>"