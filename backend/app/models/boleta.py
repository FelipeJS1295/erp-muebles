"""
Modelo Boleta
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class Boleta(Base):
    __tablename__ = "boletas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    orden_id = Column(Integer, ForeignKey('ordenes.id'), nullable=True)
    marketplace = Column(String(50), nullable=True)
    orden_id_marketplace = Column(String(100), nullable=True)
    folio = Column(Integer, nullable=True)
    rut_cliente = Column(String(20), nullable=True)
    nombre_cliente = Column(String(200), nullable=True)
    total = Column(Float, nullable=True)
    monto_neto = Column(Float, nullable=True)
    iva = Column(Float, nullable=True)
    url_boleta = Column(String(500), nullable=True)
    estado = Column(String(50), default='emitida')
    enviada_marketplace = Column(Integer, default=0)
    fecha_emision = Column(DateTime, server_default=func.now())